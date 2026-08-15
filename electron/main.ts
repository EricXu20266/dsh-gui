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
 * 窗口 loadURL http://127.0.0.1:<port>。GUI 形态达成，host 隔离、可独立升级。
 *
 * 首次启动流程：打包版捆绑 DHS 源码（resources/dhs）但无 node_modules，
 * 启动时检测未安装则打开「安装向导」窗口（下载源选择 → 下载进度 → 校验），
 * 完成后自动继续启动主界面。
 */
import { app, BrowserWindow, shell, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { spawn, execFileSync, type ChildProcess } from 'node:child_process'
import net from 'node:net'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * DHS 仓库根解析：
 *   1. 环境变量 DSH_ROOT（显式指定，优先级最高）
 *   2. 打包版：resources/dhs（electron-builder extraResources 捆绑的 DHS 源码）
 *   3. 开发态：本地 deepseek-harness
 */
function resolveDhsRoot(): string {
  if (process.env.DSH_ROOT !== undefined && process.env.DSH_ROOT !== '') return process.env.DSH_ROOT
  if (app.isPackaged) return join(process.resourcesPath, 'dhs')
  return 'E:/AllinDeepSeek/deepseek-harness'
}

/** Node 运行时：打包版用捆绑的 node（DHS loader 与 Electron 内置 Node 不兼容），开发态用系统 node */
function resolveNodeBin(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'runtime', 'node', 'node.exe')
  return 'node'
}

/** pnpm CLI：打包版用捆绑的 pnpm（resources/runtime/pnpm，纯 JS 包），开发态用系统 pnpm */
function resolvePnpmCli(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'runtime', 'pnpm', 'bin', 'pnpm.cjs')
  return 'pnpm'
}

const DHS_ROOT = resolveDhsRoot()
const DHS_HOME = process.env.DSH_HOME ?? '' // 让 host 子进程继承当前 DSH_HOME

let hostProc: ChildProcess | undefined
let wizardWin: BrowserWindow | null = null
let mainWin: BrowserWindow | null = null
let tray: Tray | null = null
/** 用户主动退出标志（托盘「退出」时置位，放行 close 真正退出） */
let isQuitting = false

/** 应用图标路径（开发态=项目根 resources/icon，打包态=asar 内 resources/icon） */
function iconPath(name: string): string {
  return join(app.getAppPath(), 'resources', 'icon', name)
}

/** 创建系统托盘：左键/双击显示主窗口，右键菜单（显示主窗口/退出） */
function createTray(): void {
  if (tray !== null) return
  tray = new Tray(nativeImage.createFromPath(iconPath('tray-32.png')))
  tray.setToolTip('dsh-gui — DeepSeek Harness 桌面客户端')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => showMainWindow() },
      { type: 'separator' },
      { label: '退出', click: () => quitApp() },
    ]),
  )
  tray.on('click', () => showMainWindow())
}

/** 显示并聚焦主窗口 */
function showMainWindow(): void {
  if (mainWin === null) return
  mainWin.show()
  mainWin.focus()
}

/** 主动退出：置位退出标志后走正常退出流程（before-quit 会 kill host） */
function quitApp(): void {
  isQuitting = true
  app.quit()
}

/** DHS 依赖是否已安装（捆绑版首次安装后 node_modules 就位） */
function isDhsInstalled(): boolean {
  return existsSync(join(DHS_ROOT, 'node_modules'))
}

/** 安装进度事件类型（与 preload 的 InstallProgress 对齐） */
interface ProgressEvent {
  stage: 'bootstrap' | 'download' | 'verify'
  percent: number
  message: string
}

type ProgressCb = (p: ProgressEvent) => void

/** 运行子进程直到退出；onLine 可逐行接收 stdout；env 可注入额外环境变量 */
function runChild(
  bin: string,
  args: string[],
  cwd: string | undefined,
  onLine?: (line: string) => void,
  env?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd, windowsHide: true, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    p.stdout?.on('data', (d) => {
      const text = d.toString()
      process.stdout.write(`[deps] ${text}`)
      if (onLine) for (const line of text.split('\n')) if (line.trim()) onLine(line)
    })
    p.stderr?.on('data', (d) => process.stderr.write(`[deps:err] ${d.toString()}`))
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`子进程退出码 ${code}`))))
    p.on('error', reject)
  })
}

/** 读取 Windows 系统代理（注册表 Internet Settings） */
function getSystemProxy(): string {
  try {
    const out = execFileSync(
      'reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings', '/v', 'ProxyServer'],
      { encoding: 'utf8', windowsHide: true },
    )
    const m = out.match(/ProxyServer\s+REG_SZ\s+(.+)/)
    return m ? m[1].trim() : ''
  } catch {
    return ''
  }
}

/** 解析 pnpm --reporter=ndjson 事件 → 进度回调 */
function parsePnpmEvent(evt: Record<string, unknown>, onProgress: ProgressCb): void {
  const s = evt.stage
  if (s === 'resolution_started') onProgress({ stage: 'download', percent: 10, message: '解析依赖关系…' })
  else if (s === 'resolution_finished') onProgress({ stage: 'download', percent: 22, message: '依赖解析完成，开始下载…' })
  else if (s === 'importing_started') onProgress({ stage: 'download', percent: 30, message: '下载依赖包…' })
  else if (s === 'importing_progress') {
    const imported = Number(evt.imported ?? 0)
    const req = Number(evt.requirement ?? 1)
    const pct = req > 0 ? 30 + Math.round((imported / req) * 60) : 30
    onProgress({ stage: 'download', percent: Math.min(pct, 92), message: `下载依赖 ${imported}/${req}` })
  } else if (s === 'importing_finished') {
    onProgress({ stage: 'download', percent: 92, message: '依赖下载完成，链接包…' })
  } else if (s === 'done') {
    onProgress({ stage: 'download', percent: 94, message: '安装收尾中…' })
  }
}

/** 首次安装 DHS 依赖：按下载源配置 → bootstrap pnpm → pnpm install（ndjson 推进度） */
async function installDhsDeps(config: { registry: string; proxy: string; useSystemProxy: boolean }, onProgress: ProgressCb): Promise<void> {
  const nodeBin = resolveNodeBin()
  const pnpmCli = resolvePnpmCli()

  const env: Record<string, string> = {}
  env.npm_config_registry = config.registry
  let proxy = config.proxy
  if (config.useSystemProxy) proxy = getSystemProxy()
  if (proxy) {
    env.npm_config_proxy = proxy
    env.npm_config_https_proxy = proxy
  }
  console.log(`[dsh-gui] 安装 DHS 依赖 registry=${config.registry} proxy=${proxy ?? '无'}`)

  // pnpm 已捆绑（打包版 resources/runtime/pnpm；开发态用系统 pnpm），直接 install
  onProgress({ stage: 'download', percent: 8, message: '开始安装依赖…' })
  await runChild(nodeBin, [pnpmCli, 'install', '--no-frozen-lockfile', '--reporter=ndjson'], DHS_ROOT, (line) => {
    try {
      parsePnpmEvent(JSON.parse(line) as Record<string, unknown>, onProgress)
    } catch {
      // 非 JSON 行（warn 等）忽略
    }
  }, env)

  // 校验
  onProgress({ stage: 'verify', percent: 96, message: '校验安装结果…' })
  if (!isDhsInstalled()) throw new Error('依赖安装后未找到 node_modules，请重试')
  if (!existsSync(join(DHS_ROOT, 'apps', 'cli', 'lib', 'bin.js'))) throw new Error('DHS 可执行文件缺失（apps/cli/lib/bin.js）')
  onProgress({ stage: 'verify', percent: 100, message: '安装完成' })
}

/** 等待端口可连 */
function waitForPort(port: number, timeoutMs = 30000): Promise<void> {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = net.connect({ port, host: '127.0.0.1' })
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() - start > timeoutMs) reject(new Error(`port ${port} 等待超时`))
        else setTimeout(tryConnect, 300)
      })
    }
    tryConnect()
  })
}

/** 启动 DHS host 子进程，返回其监听端口 */
async function startHost(): Promise<number> {
  hostProc = spawn(resolveNodeBin(), ['apps/cli/lib/bin.js', '--profile', 'web'], {
    cwd: DHS_ROOT,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  hostProc.stdout?.on('data', (d) => process.stdout.write(`[host] ${d}`))
  hostProc.stderr?.on('data', (d) => process.stderr.write(`[host:err] ${d}`))
  hostProc.on('exit', (code) => {
    console.log(`[dsh-gui] host exited with code ${code}`)
    if (hostProc === undefined) return
    hostProc = undefined
    // host 意外退出则关闭应用
    app.quit()
  })
  const port = 3080 // DHS web profile 默认端口
  await waitForPort(port)
  console.log(`[dsh-gui] host ready on ${port}`)
  return port
}

/** 启动主界面（host + BrowserWindow + 系统托盘） */
async function launchMain(): Promise<void> {
  try {
    const port = await startHost()
    mainWin = new BrowserWindow({
      width: 1440,
      height: 900,
      title: 'DHS GUI',
      icon: iconPath('icon-256.png'),
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    // 关闭按钮（右上角 X）→ 最小化到系统托盘；真正退出走托盘「退出」
    mainWin.on('close', (e) => {
      if (!isQuitting) {
        e.preventDefault()
        mainWin?.hide()
        console.log('[dsh-gui] window hidden to tray')
      }
    })
    // 外部链接（target=_blank / window.open）一律走系统默认浏览器，不在应用内开新窗口
    mainWin.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) shell.openExternal(url)
      return { action: 'deny' }
    })
    mainWin.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[dsh-gui] load failed (${code}): ${desc} for ${url}`)
    })
    mainWin.webContents.on('render-process-gone', (_e, details) => {
      console.error(`[dsh-gui] renderer gone: reason=${details.reason} exitCode=${details.exitCode}`)
    })
    mainWin.on('closed', () => console.log('[dsh-gui] window closed event'))
    await mainWin.loadURL(`http://127.0.0.1:${port}`)
    console.log('[dsh-gui] window loaded')
    // 系统托盘（应用启动即常驻，关闭窗口不退出）
    createTray()
  } catch (error) {
    console.error('[dsh-gui] start failed:', error)
    app.quit()
  }
}

/** 打开首次安装向导窗口 */
function openSetupWizard(): void {
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
    },
  })
  wizardWin.loadFile(join(__dirname, 'renderer', 'setup-wizard.html'))
  wizardWin.on('closed', () => {
    wizardWin = null
    // 向导关闭：安装已完成则启动主界面，否则退出
    if (isDhsInstalled()) {
      launchMain()
    } else {
      app.quit()
    }
  })
}

// ── 首次安装向导 IPC ──
ipcMain.handle('setup:info', () => ({
  dhsRoot: DHS_ROOT,
  estimatedMb: 220,
}))

ipcMain.handle('setup:install', async (_e, config: { registry: string; proxy: string; useSystemProxy: boolean }) => {
  try {
    await installDhsDeps(config, (p) => wizardWin?.webContents.send('setup:progress', p))
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[dsh-gui] install failed:', msg)
    return { ok: false, error: msg }
  }
})

app.whenReady().then(async () => {
  // 首次启动：DHS 依赖未就绪 → 打开安装向导；已就绪 → 直接启动主界面
  if (!isDhsInstalled()) {
    console.log('[dsh-gui] DHS 依赖未安装，打开安装向导')
    openSetupWizard()
    return
  }
  await launchMain()
})

app.on('window-all-closed', () => {
  console.log('[dsh-gui] window-all-closed')
  hostProc?.kill()
  app.quit()
})
app.on('before-quit', () => console.log('[dsh-gui] before-quit'))
app.on('quit', (_e, code) => console.log(`[dsh-gui] app quit code=${code}`))

process.on('uncaughtException', (err) => console.error('[dsh-gui] uncaught:', err))
process.on('unhandledRejection', (reason) => console.error('[dsh-gui] unhandledRejection:', reason))

app.on('window-all-closed', () => {
  hostProc?.kill()
  app.quit()
})

app.on('before-quit', () => {
  hostProc?.kill()
})
