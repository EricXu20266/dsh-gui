import type { ChildProcess } from 'node:child_process';
import { join } from 'node:path';
/**
 * dsh-gui main process — Electron 窗口 + DHS host 子进程。
 *
 * 为什么不用 in-process：
 * DHS 的 cordis loader 依赖 Node 内部 API（node-addon-require-builtin 获取
 * internal/modules/esm/loader）从 profile 目录解析插件。Electron 内置 Node
 * （24.18.1）的内部模块结构与官方 Node 不兼容，internal.import 解析失效
 * （系统 Node 24.15.0 正常）。DHS 官方 RFC 预留的 Electron in-process 路线
 * 在当前版本下不可行，需 DHS 侧改造 loader 才能支持。
 *
 * 当前形态：main 进程 spawn 独立 node 跑 DHS bin.js（host 子进程），
 * `dsh web --port 0` 由 OS 动态分配空闲端口，窗口 loadURL 到该 loopback 地址。
 *
 * 首次启动流程：打包版捆绑 DHS 源码（resources/dhs）但无 node_modules，
 * 启动时检测未安装则打开「安装向导」，安装器先把源码复制到 userData/dhs，
 * 再 pnpm install（进度 → 校验），完成后自动继续启动主界面。
 */
import { BrowserWindow, Menu, app, ipcMain, shell } from 'electron';
import { killTrackedChildren } from './child-process';
import { startHost, stopHost } from './host';
import { getInstallerLogHint, installDhsDeps } from './installer';
import { logInstall } from './log';
import {
  estimateInstallSizeMb,
  getDhsHome,
  iconPath,
  isDhsInstalledAt,
  resolveDhsRootCandidate,
  resolveNodeBin,
  resolvePnpmCli,
  resolveVersionEnv,
} from './paths';
import { resolveHostProxyEnv } from './proxy';
import { type TrayController, createTray } from './tray';
import type { InstallConfig, InstallProgress, InstallResult, SetupInfo } from './types';

// ── 应用状态 ────────────────────────────────────────────────────────────────

let dhsRoot = '';
let hostProc: ChildProcess | undefined;
let wizardWin: BrowserWindow | null = null;
let mainWin: BrowserWindow | null = null;
let tray: TrayController | null = null;
/** 退出流程已启动：before-quit 置位，放行窗口 close 真正关闭 */
let isQuitting = false;
/** launchMain 进行中：防止向导关闭 → window-all-closed 竞态误杀启动流程 */
let launchingMain = false;
/** setup:install 防重入 */
let installInProgress = false;
/** 向导展示的预估安装大小 */
let estimatedInstallMb = 220;

/** 显示并聚焦主窗口（托盘 / second-instance 共用） */
function showMainWindow(): void {
  if (mainWin === null || mainWin.isDestroyed()) return;
  if (mainWin.isMinimized()) mainWin.restore();
  mainWin.show();
  mainWin.focus();
}

/** 主动退出：before-quit 统一清理 host + 托管安装子进程 */
function quitApp(): void {
  isQuitting = true;
  app.quit();
}

/** host 子进程退出（崩溃 / 被 kill）回调 */
function handleHostExit(code: number | null): void {
  console.log(`[dsh-gui] host exited with code ${code}`);
  hostProc = undefined;
  if (!isQuitting) {
    console.log('[dsh-gui] host exited unexpectedly, quitting');
    app.quit();
  }
}

/** 主窗口安全基线：loopback 外导航拒绝、外链走系统浏览器、危险权限默认拒绝 */
function attachMainWindowSecurity(win: BrowserWindow, port: number): void {
  const allowedOrigin = `http://127.0.0.1:${port}`;
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== allowedOrigin && !url.startsWith(`${allowedOrigin}/`)) {
      event.preventDefault();
      console.warn(`[dsh-gui] blocked navigation to ${url}`);
    }
  });
  const allowedPermissions = new Set(['clipboard-read', 'clipboard-sanitized-write']);
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(allowedPermissions.has(permission));
  });
}

/** 启动主界面（host + BrowserWindow + 系统托盘） */
async function launchMain(): Promise<void> {
  if (launchingMain || mainWin !== null || isQuitting) return;
  launchingMain = true;
  try {
    const proxyEnv = resolveHostProxyEnv();
    if (Object.keys(proxyEnv).length > 0) {
      console.log(`[dsh-gui] host proxy: ${proxyEnv.HTTP_PROXY} (NODE_USE_ENV_PROXY=1)`);
    }
    const running = await startHost({
      dhsRoot,
      nodeBin: resolveNodeBin(),
      env: { ...proxyEnv, ...resolveVersionEnv(dhsRoot) },
      onExit: handleHostExit,
    });
    if (isQuitting) return;
    if (running.proc.exitCode === null && running.proc.signalCode === null) hostProc = running.proc;

    const win = new BrowserWindow({
      width: 1440,
      height: 900,
      title: 'DHS GUI',
      icon: iconPath('icon-256.png'),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    mainWin = win;
    attachMainWindowSecurity(win, running.port);

    // 关闭按钮（右上角 X）→ 最小化到系统托盘；真正退出走托盘「退出」/ 系统退出（before-quit 放行）
    win.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        win.hide();
        console.log('[dsh-gui] window hidden to tray');
      }
    });
    win.on('closed', () => {
      console.log('[dsh-gui] window closed event');
      if (mainWin === win) mainWin = null;
    });
    win.webContents.on('did-fail-load', (_event, code, description, url) => {
      console.error(`[dsh-gui] load failed (${code}): ${description} for ${url}`);
    });
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error(
        `[dsh-gui] renderer gone: reason=${details.reason} exitCode=${details.exitCode}`,
      );
    });

    await win.loadURL(`http://127.0.0.1:${running.port}`);
    console.log(`[dsh-gui] window loaded from http://127.0.0.1:${running.port}`);

    // 系统托盘（应用启动即常驻，关闭窗口不退出）
    if (tray === null) {
      tray = createTray(iconPath('tray-32.png'), { showMainWindow, quitApp });
    }
  } catch (error) {
    console.error('[dsh-gui] start failed:', error);
    if (!isQuitting) app.quit();
  } finally {
    launchingMain = false;
  }
}

/** 打开首次安装向导窗口 */
function openSetupWizard(): void {
  if (wizardWin !== null) return;
  wizardWin = new BrowserWindow({
    width: 620,
    height: 700,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: 'dsh-gui 首次启动安装',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void wizardWin.loadFile(join(__dirname, 'renderer', 'setup-wizard.html'));
  wizardWin.on('closed', () => {
    wizardWin = null;
    if (isQuitting) return;
    // 向导关闭：安装已完成则启动主界面，否则退出
    if (isDhsInstalledAt(dhsRoot)) {
      void launchMain();
    } else {
      app.quit();
    }
  });
}

/** 注册首次安装向导 IPC */
function registerSetupIpc(): void {
  ipcMain.handle(
    'setup:info',
    (): SetupInfo => ({
      dhsRoot,
      estimatedMb: estimatedInstallMb,
      // 默认语言跟随系统（Electron locale：zh* → 中文，其余 → 英文）
      defaultLocale: app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
    }),
  );

  ipcMain.handle('setup:install', async (_event, config: InstallConfig): Promise<InstallResult> => {
    if (installInProgress) {
      return { ok: false, error: '安装已在进行中，请勿重复提交' };
    }
    installInProgress = true;
    try {
      const safeConfig: InstallConfig = {
        ...config,
        locale: config.locale === 'en' ? 'en' : 'zh',
      };
      const finalRoot = await installDhsDeps(
        safeConfig,
        {
          dhsRootCandidate: dhsRoot,
          dhsHome: getDhsHome(),
          nodeBin: resolveNodeBin(),
          pnpmCli: resolvePnpmCli(),
          isPackaged: app.isPackaged,
          resourcesPath: process.resourcesPath,
          installLogPath: join(app.getPath('userData'), 'install.log'),
        },
        (progress: InstallProgress) => {
          if (wizardWin !== null && !wizardWin.isDestroyed()) {
            wizardWin.webContents.send('setup:progress', progress);
          }
        },
      );
      dhsRoot = finalRoot;
      logInstall(`[dsh-gui] install finished, dhsRoot=${finalRoot}`);
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[dsh-gui] install failed:', message);
      return { ok: false, error: `${message}${getInstallerLogHint()}` };
    } finally {
      installInProgress = false;
    }
  });
}

/** 启动入口：单实例 → 初始化路径 → 向导或主界面 */
async function bootstrap(): Promise<void> {
  // 移除默认菜单栏（File/Edit/View/Window/Help）——桌面应用不需要
  Menu.setApplicationMenu(null);
  dhsRoot = resolveDhsRootCandidate();
  registerSetupIpc();

  if (!isDhsInstalledAt(dhsRoot)) {
    estimatedInstallMb = estimateInstallSizeMb(
      app.isPackaged ? join(process.resourcesPath, 'dhs') : dhsRoot,
    );
    console.log(`[dsh-gui] DHS 依赖未安装（${dhsRoot}），打开安装向导`);
    openSetupWizard();
    return;
  }
  await launchMain();
}

// ── 生命周期 ────────────────────────────────────────────────────────────────

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  // 已有实例运行：退出本实例；已运行实例通过 second-instance 唤起主窗口
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWin !== null) showMainWindow();
    else if (wizardWin !== null) wizardWin.show();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    stopHost(hostProc);
    killTrackedChildren();
  });

  app.on('window-all-closed', () => {
    console.log('[dsh-gui] window-all-closed');
    // 仅显式退出时结束；向导关闭后的 launchMain / 托盘隐藏都不应触发退出
    if (isQuitting) {
      app.quit();
    } else if (!launchingMain && mainWin === null && wizardWin === null) {
      app.quit();
    }
  });

  app.on('quit', (_event, code) => console.log(`[dsh-gui] app quit code=${code}`));

  process.on('uncaughtException', (error) => console.error('[dsh-gui] uncaught:', error));
  process.on('unhandledRejection', (reason) =>
    console.error('[dsh-gui] unhandledRejection:', reason),
  );

  void app.whenReady().then(bootstrap);
}
