import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
/**
 * 路径 / 运行时解析：
 * - DHS_ROOT：DSH_ROOT 环境变量 > 打包版 userData/dhs（新布局）或 resources/dhs（兼容旧布局） > 开发态 ../deepseek-harness
 * - 打包版新装时把捆绑的 DHS 源码复制到 userData/dhs，避免往 .app/Resources 里写 node_modules
 *   （macOS /Applications、只读介质、App Translocation 下均不可写，还会破坏签名）。
 */
import { app } from 'electron';

/** 安装完成标记：依赖校验通过后由 installer 写入 */
export const INSTALL_MARKER = '.dsh-install-ok';

export function getDhsHome(): string {
  return process.env.DSH_HOME?.trim() || join(homedir(), '.dsh');
}

export function getDhsBin(root: string): string {
  return join(root, 'apps', 'cli', 'lib', 'bin.js');
}

export function getBundledDhsRoot(): string {
  return join(process.resourcesPath, 'dhs');
}

export function getInstalledDhsRoot(): string {
  return join(app.getPath('userData'), 'dhs');
}

/**
 * DHS 是否已可用。
 * 新布局以 `.dsh-install-ok` + bin.js 为准；旧版本（首次安装直接写 resources/dhs）
 * 没有标记，回退用 pnpm 成功安装必然存在的 node_modules/.pnpm/lock.yaml 判断。
 */
export function isDhsInstalledAt(root: string): boolean {
  if (!existsSync(join(root, 'package.json'))) return false;
  if (!existsSync(getDhsBin(root))) return false;
  if (existsSync(join(root, INSTALL_MARKER))) return true;
  return existsSync(join(root, 'node_modules', '.pnpm', 'lock.yaml'));
}

/**
 * 解析本次会话使用的 DHS 根目录（不执行复制）。
 * - 开发态：项目根 ../deepseek-harness，不再硬编码盘符
 * - 打包版：优先 userData/dhs；旧布局 resources/dhs 已安装则继续兼容；
 *   都没有时返回 userData/dhs 作为本次安装目标
 */
export function resolveDhsRootCandidate(): string {
  const fromEnv = process.env.DSH_ROOT?.trim();
  if (fromEnv) return fromEnv;
  if (!app.isPackaged) {
    return join(app.getAppPath(), '..', 'deepseek-harness');
  }
  const bundled = getBundledDhsRoot();
  const installed = getInstalledDhsRoot();
  if (isDhsInstalledAt(installed)) return installed;
  if (isDhsInstalledAt(bundled)) return bundled; // 兼容旧版已装好的布局
  return installed;
}

/**
 * 准备可写的 DHS 安装根目录。
 * 打包版全新安装时：resources/dhs 作为只读种子 → 复制到 userData/dhs → 在副本上 pnpm install。
 */
export function prepareDhsInstallRoot(log: (message: string) => void): string {
  const candidate = resolveDhsRootCandidate();
  if (!app.isPackaged) return candidate;

  const bundled = getBundledDhsRoot();
  const installed = getInstalledDhsRoot();
  if (isDhsInstalledAt(installed)) return installed;
  if (isDhsInstalledAt(bundled)) return bundled; // 旧布局迁移不强制，避免已有用户重装

  if (!existsSync(join(bundled, 'package.json'))) {
    throw new Error('打包资源中缺少 DHS 源码（resources/dhs/package.json）');
  }
  log(`将 DHS 运行环境复制到用户目录：${installed}`);
  if (existsSync(installed)) rmSync(installed, { recursive: true, force: true });
  mkdirSync(dirname(installed), { recursive: true });
  cpSync(bundled, installed, { recursive: true, errorOnExist: false, force: false });
  log(`DHS 源码复制完成：${installed}`);
  return installed;
}

/** Node 运行时：打包版用捆绑 node，开发态用系统 node（可用 DSH_NODE_BIN 覆盖） */
export function resolveNodeBin(): string {
  if (app.isPackaged) {
    const exe = process.platform === 'win32' ? 'node.exe' : 'node';
    return join(process.resourcesPath, 'runtime', 'node', exe);
  }
  return process.env.DSH_NODE_BIN?.trim() || 'node';
}

/** pnpm CLI：打包版用捆绑 pnpm，开发态用系统 pnpm */
export function resolvePnpmCli(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'runtime', 'pnpm', 'bin', 'pnpm.cjs');
  return process.env.DSH_PNPM_BIN?.trim() || 'pnpm';
}

/** 应用图标路径（开发态=项目根 resources/icon，打包态=asar 内 resources/icon） */
export function iconPath(name: string): string {
  return join(app.getAppPath(), 'resources', 'icon', name);
}

/** host 版本信息 env（dsh-about 插件读取并展示在设置 → 关于） */
export function resolveVersionEnv(dhsRoot: string): Record<string, string> {
  const readVersion = (p: string): string => {
    try {
      return (JSON.parse(readFileSync(p, 'utf8')) as { version?: string }).version ?? '';
    } catch {
      return '';
    }
  };
  const versions = process.versions as Record<string, string | undefined>;
  return {
    DSH_GUI_NAME: 'dsh-gui',
    DSH_GUI_VERSION: app.getVersion(),
    DSH_KERNEL_VERSION: readVersion(join(dhsRoot, 'apps', 'cli', 'package.json')),
    DSH_ELECTRON_VERSION: versions.electron ?? '',
    DSH_NODE_VERSION: versions.node ?? '',
  };
}

/** 粗略统计目录大小（跳过 node_modules/.git/tmp，限制深度，避免启动时 IO 尖峰） */
function dirSize(dir: string, depth: number): number {
  if (depth <= 0) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'tmp') continue;
    const full = join(dir, entry.name);
    try {
      const stat = statSync(full);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) total += dirSize(full, depth - 1);
      else total += stat.size;
    } catch {
      // 单个文件读不到不影响整体估算
    }
  }
  return total;
}

/**
 * 向导页展示的预估大小：捆绑 DHS 源码体积 + 依赖下载常量（120MB）。
 * 比固定写死的 220 更贴近实际；读不到目录时回退 220MB。
 */
export function estimateInstallSizeMb(root: string): number {
  try {
    if (!existsSync(root)) return 220;
    const sourceMb = Math.ceil(dirSize(root, 4) / 1024 / 1024);
    return Math.min(600, Math.max(120, sourceMb + 120));
  } catch {
    return 220;
  }
}
