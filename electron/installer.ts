/**
 * 首次安装器：
 * - 打包版先把捆绑 DHS 源码复制到可写的 userData/dhs
 * - pnpm install（ndjson 真实进度，失败自动重试）
 * - 内核可运行性验证（dsh --version）
 * - 写入安装完成标记，返回最终安装根目录
 * - 打包版安装全部 5 个内置插件（失败不阻断主流程）
 * - 进度与错误文案跟随向导语言（zh / en）
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runChild } from './child-process';
import { getInstallLogPath, logInstall, openInstallLog } from './log';
import { INSTALL_MARKER, getDhsBin, isDhsInstalledAt, prepareDhsInstallRoot } from './paths';
import { getSystemProxy, normalizeProxyUrl, writeLocalePreference } from './proxy';
import type { InstallConfig, InstallProgress, Locale } from './types';

type ProgressCb = (progress: InstallProgress) => void;

const MESSAGES: Record<Locale, Record<string, string>> = {
  zh: {
    preparingRuntime: '准备运行环境…',
    installing: '开始安装依赖…',
    retrying: '安装中断，正在重试（{0}/{1}）…',
    resolutionStarted: '解析依赖关系…',
    resolutionFinished: '依赖解析完成',
    fetchingStarted: '开始下载依赖包…',
    fetchingProgress: '正在下载依赖 {0}/{1}',
    fetchingFinished: '依赖下载完成，开始链接…',
    importingStarted: '正在写入依赖…',
    importingProgress: '正在链接依赖 {0}/{1}',
    importingFinished: '依赖安装完成',
    pnpmDone: '安装收尾中…',
    verifyingKernel: '校验内核可运行性…',
    installingPlugin: '安装内置组件 {0}…',
    pluginMissing: '警告：resources/{0}/package.json 不存在，跳过插件安装',
    staleLinkFixed: '修复：profile 中 {0} 指向失效路径（{1}），移除旧依赖后重装',
    staleLinkCheckFailed: 'profile 失效依赖检查跳过: {0}',
    finalChecking: '校验安装结果…',
    installDone: '安装完成',
    installFailed: '依赖安装多次失败，请检查网络后重试（详情见安装日志）',
    kernelVerifyFailed: '内核验证失败（链接不完整或 bin.js 缺依赖）',
  },
  en: {
    preparingRuntime: 'Preparing runtime…',
    installing: 'Starting dependency installation…',
    retrying: 'Install interrupted, retrying ({0}/{1})…',
    resolutionStarted: 'Resolving dependencies…',
    resolutionFinished: 'Dependency resolution finished',
    fetchingStarted: 'Downloading packages…',
    fetchingProgress: 'Downloading {0}/{1}',
    fetchingFinished: 'Download finished, linking…',
    importingStarted: 'Writing dependencies…',
    importingProgress: 'Linking dependencies {0}/{1}',
    importingFinished: 'Dependencies installed',
    pnpmDone: 'Finalizing…',
    verifyingKernel: 'Verifying kernel runtime…',
    installingPlugin: 'Installing built-in component {0}…',
    pluginMissing: 'Warning: resources/{0}/package.json missing, skipping plugin install',
    staleLinkFixed:
      'Repair: profile entry {0} points to a stale path ({1}), removing before reinstall',
    staleLinkCheckFailed: 'Profile stale-link check skipped: {0}',
    finalChecking: 'Verifying installation…',
    installDone: 'Installation complete',
    installFailed:
      'Dependency installation failed after several attempts. Check your network and retry (see install log).',
    kernelVerifyFailed: 'Kernel verification failed (broken links or missing bin.js dependencies)',
  },
};

function makeT(locale: Locale): (key: string, ...args: Array<string | number>) => string {
  const table = MESSAGES[locale] ?? MESSAGES.zh;
  return (key, ...args) => {
    let text = table[key] ?? MESSAGES.zh[key] ?? key;
    args.forEach((arg, index) => {
      text = text.replace(`{${index}}`, String(arg));
    });
    return text;
  };
}

/** 解析 pnpm --reporter=ndjson 事件 → 进度回调 */
function parsePnpmEvent(
  evt: Record<string, unknown>,
  onProgress: ProgressCb,
  t: ReturnType<typeof makeT>,
): void {
  const stage = evt.stage;
  if (stage === 'resolution_started') {
    onProgress({ stage: 'download', percent: 8, message: t('resolutionStarted') });
  } else if (stage === 'resolution_finished') {
    onProgress({ stage: 'download', percent: 12, message: t('resolutionFinished') });
  } else if (stage === 'fetching_started') {
    onProgress({ stage: 'download', percent: 15, message: t('fetchingStarted') });
  } else if (stage === 'fetching_progress') {
    const fetched = Number(evt.fetched ?? 0);
    const requirement = Number(evt.requirement ?? 1);
    const pct = requirement > 0 ? 15 + Math.round((fetched / requirement) * 65) : 15;
    onProgress({
      stage: 'download',
      percent: Math.min(pct, 80),
      message: t('fetchingProgress', fetched, requirement),
    });
  } else if (stage === 'fetching_finished') {
    onProgress({ stage: 'download', percent: 82, message: t('fetchingFinished') });
  } else if (stage === 'importing_started') {
    onProgress({ stage: 'download', percent: 85, message: t('importingStarted') });
  } else if (stage === 'importing_progress') {
    const imported = Number(evt.imported ?? 0);
    const requirement = Number(evt.requirement ?? 1);
    const pct = requirement > 0 ? 85 + Math.round((imported / requirement) * 10) : 85;
    onProgress({
      stage: 'download',
      percent: Math.min(pct, 95),
      message: t('importingProgress', imported, requirement),
    });
  } else if (stage === 'importing_finished') {
    onProgress({ stage: 'download', percent: 95, message: t('importingFinished') });
  } else if (stage === 'done') {
    onProgress({ stage: 'download', percent: 96, message: t('pnpmDone') });
  }
}

export interface InstallDepsOptions {
  dhsRootCandidate: string;
  dhsHome: string;
  nodeBin: string;
  pnpmCli: string;
  isPackaged: boolean;
  resourcesPath: string;
  installLogPath: string;
}

/** 首次安装 DHS 依赖；成功返回最终安装根目录 */
export async function installDhsDeps(
  config: InstallConfig,
  options: InstallDepsOptions,
  onProgress: ProgressCb,
): Promise<string> {
  const t = makeT(config.locale);
  openInstallLog(options.installLogPath);
  logInstall(`DHS_ROOT=${options.dhsRootCandidate}`);
  logInstall(`app.isPackaged=${options.isPackaged}`);

  // 语言偏好写入 DHS host 配置；写坏用户 settings.yaml 的风险比语言未生效更不可接受，失败只记录不阻断
  try {
    writeLocalePreference(config.locale);
  } catch (error) {
    logInstall(`语言偏好写入失败（不阻断安装）: ${String(error)}`);
  }

  // 打包版全新安装：把捆绑源码复制到 userData/dhs，再在副本上安装
  onProgress({ stage: 'bootstrap', percent: 4, message: t('preparingRuntime') });
  const dhsRoot = prepareDhsInstallRoot((message) => logInstall(message));
  logInstall(`DHS_ROOT(final)=${dhsRoot}`);

  const env: Record<string, string> = { npm_config_registry: config.registry };
  const proxy = config.useSystemProxy ? getSystemProxy() : normalizeProxyUrl(config.proxy);
  if (proxy) {
    env.npm_config_proxy = proxy;
    env.npm_config_https_proxy = proxy;
  }
  logInstall(`registry=${config.registry} proxy=${proxy || '无'}`);

  onProgress({ stage: 'download', percent: 8, message: t('installing') });
  // Windows 深路径下 junction 创建可能被 Defender 实时防护随机中断（pnpm 报 done 但链接缺失），
  // 失败自动重试（最多 3 次）；完整性用「内核可运行性」验证。
  const MAX_ATTEMPTS = 3;
  let kernelVersion = '';
  let installed = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !installed; attempt++) {
    if (attempt > 1) {
      onProgress({ stage: 'download', percent: 8, message: t('retrying', attempt, MAX_ATTEMPTS) });
      logInstall(`>>> ${t('retrying', attempt, MAX_ATTEMPTS)}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    try {
      await runChild(
        options.nodeBin,
        [options.pnpmCli, 'install', '--no-frozen-lockfile', '--reporter=ndjson'],
        {
          cwd: dhsRoot,
          env,
          onLine: (line) => {
            try {
              parsePnpmEvent(JSON.parse(line) as Record<string, unknown>, onProgress, t);
            } catch {
              // 非 JSON 行（warn 等）忽略
            }
          },
          onOutput: (text, kind) => logInstall(`[${kind}] ${text.trimEnd()}`),
        },
      );

      onProgress({ stage: 'download', percent: 96, message: t('verifyingKernel') });
      try {
        const version = execFileSync(options.nodeBin, [getDhsBin(dhsRoot), '--version'], {
          encoding: 'utf8',
          cwd: dhsRoot,
          env: { ...process.env, ...env },
          windowsHide: true,
          timeout: 60000,
        });
        kernelVersion = version.trim();
        installed = true;
        logInstall(`内核验证通过（dsh ${kernelVersion}）`);
      } catch (error) {
        logInstall(`${t('kernelVerifyFailed')}: ${String(error).slice(0, 300)}`);
      }
    } catch (error) {
      logInstall(`${t('retrying', attempt, MAX_ATTEMPTS)} 失败: ${String(error)}`);
    }
  }
  if (!installed) throw new Error(t('installFailed'));

  // 写入安装完成标记（仅打包版 userData 布局）；开发态安装的是 ../deepseek-harness 本体，
  // 遵循「内核仓库零改动」红线，回退用 node_modules/.pnpm/lock.yaml 判断
  if (options.isPackaged) {
    writeFileSync(
      join(dhsRoot, INSTALL_MARKER),
      JSON.stringify({ dshVersion: kernelVersion, installedAt: new Date().toISOString() }, null, 2),
    );
  }

  // 打包版：把 5 个内置插件安装进 web profile（失败仅记录，主界面照常启动）
  if (options.isPackaged) {
    const bundledPlugins = [
      'dsh-discovery',
      'dsh-skillmanager',
      'dsh-mcpmanager',
      'dsh-proxy',
      'dsh-about',
    ];
    const profileDir = join(options.dhsHome, 'profiles', 'web');
    for (const pluginName of bundledPlugins) {
      const pluginDir = join(options.resourcesPath, pluginName);
      if (!existsSync(join(pluginDir, 'package.json'))) {
        logInstall(t('pluginMissing', pluginName));
        continue;
      }
      onProgress({ stage: 'download', percent: 95, message: t('installingPlugin', pluginName) });
      logInstall(`>>> ${t('installingPlugin', pluginName)}（${pluginDir}）`);

      // 自愈：清理 profile 中失效的 <plugin> file: 链接（项目改名/迁移后旧绝对路径失效）
      const profilePkg = join(profileDir, 'package.json');
      if (existsSync(profilePkg)) {
        try {
          const doc = JSON.parse(readProfilePackage(profilePkg)) as {
            dependencies?: Record<string, string>;
          };
          const dep = doc?.dependencies?.[pluginName];
          if (typeof dep === 'string' && dep.startsWith('file:')) {
            const target = dep.slice('file:'.length);
            if (!existsSync(join(target, 'package.json'))) {
              logInstall(t('staleLinkFixed', pluginName, dep));
              if (doc.dependencies) delete doc.dependencies[pluginName];
              writeFileSync(profilePkg, JSON.stringify(doc, null, 2));
              rmNodeModule(profileDir, pluginName);
            }
          }
        } catch (error) {
          logInstall(t('staleLinkCheckFailed', String(error)));
        }
      }

      try {
        await runChild(
          options.nodeBin,
          [getDhsBin(dhsRoot), 'plugin', '--profile', 'web', 'add', pluginDir],
          {
            cwd: dhsRoot,
            env,
            onOutput: (text, kind) => logInstall(`[plugin:${kind}] ${text.trimEnd()}`),
          },
        );
        logInstall(`插件 ${pluginName} 安装成功`);
      } catch (error) {
        logInstall(`插件 ${pluginName} 安装失败（不影响主流程）: ${String(error)}`);
      }
    }
  }

  // 最终校验：三项真实结果随进度事件返回给向导页
  const depsOk = existsSync(join(dhsRoot, 'node_modules'));
  const binOk = existsSync(getDhsBin(dhsRoot));
  const nodeOk = installed && isDhsInstalledAt(dhsRoot);
  onProgress({
    stage: 'verify',
    percent: 100,
    message: t('finalChecking'),
    checks: { deps: depsOk, bin: binOk, node: nodeOk },
  });
  if (!depsOk || !binOk || !nodeOk) throw new Error(t('installFailed'));
  logInstall(t('installDone'));
  return dhsRoot;
}

function readProfilePackage(profilePkg: string): string {
  return readFileSync(profilePkg, 'utf8');
}

function rmNodeModule(profileDir: string, pluginName: string): void {
  rmSync(join(profileDir, 'node_modules', pluginName), { recursive: true, force: true });
}

/** 安装日志路径提示（供主进程错误返回拼接） */
export function getInstallerLogHint(): string {
  const path = getInstallLogPath();
  return path ? `（详细日志：${path}）` : '';
}
