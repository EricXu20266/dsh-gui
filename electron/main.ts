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
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'

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
  if (app.isPackaged) {
    const exe = process.platform === 'win32' ? 'node.exe' : 'node'
    return join(process.resourcesPath, 'runtime', 'node', exe)
  }
  return 'node'
}

/** pnpm CLI：打包版用捆绑的 pnpm（resources/runtime/pnpm，纯 JS 包），开发态用系统 pnpm */
function resolvePnpmCli(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'runtime', 'pnpm', 'bin', 'pnpm.cjs')
  return 'pnpm'
}

const DHS_ROOT = resolveDhsRoot()
const DHS_HOME = process.env.DSH_HOME ?? '' // 让 host 子进程继承当前 DSH_HOME

/** 安装日志文件路径（打包版可查：%APPDATA%/dsh-gui/install.log，用户目录里 dsh-gui 文件夹下） */
let installLogPath = ''

/** 安装日志：同时写控制台 + 落盘文件（打包版无控制台，必须落盘用户才能看到） */
function logInstall(msg: string): void {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  if (installLogPath) {
    try {
      appendFileSync(installLogPath, line + '\n')
    } catch {
      // 日志写入失败不阻塞安装流程
    }
  }
}

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

/** 运行子进程直到退出；onLine 可逐行接收 stdout；env 可注入额外环境变量；输出同步落盘到安装日志 */
function runChild(
  bin: string,
  args: string[],
  cwd: string | undefined,
  onLine?: (line: string) => void,
  env?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    logInstall(`> ${bin} ${args.join(' ')}`)
    const p = spawn(bin, args, { cwd, windowsHide: true, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] })
    p.stdout?.on('data', (d) => {
      const text = d.toString()
      logInstall(`[out] ${text.trimEnd()}`)
      if (onLine) for (const line of text.split('\n')) if (line.trim()) onLine(line)
    })
    p.stderr?.on('data', (d) => logInstall(`[err] ${d.toString().trimEnd()}`))
    p.on('exit', (code) => {
      logInstall(`< exit ${code}`)
      code === 0 ? resolve() : reject(new Error(`子进程退出码 ${code}`))
    })
    p.on('error', (err) => {
      logInstall(`< spawn error: ${err.message}`)
      reject(err)
    })
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

/** 补协议前缀（注册表 ProxyServer 形如 `127.0.0.1:7897`，env 需要 `http://`） */
function normalizeProxyUrl(raw: string): string {
  const v = raw.trim()
  if (v === '') return ''
  return /^https?:\/\//i.test(v) ? v : `http://${v}`
}

/**
 * 读取 ~/.dsh/settings.yaml 的 proxy 节 → host 代理环境变量。
 * DHS 全链路（LLM / 搜索 / MCP client）走 Node 全局 fetch，Node 24 由
 * NODE_USE_ENV_PROXY 启用环境变量代理；本地回环与 DeepSeek API 直连。
 * 显式环境变量（HTTP_PROXY 等）已设置时尊重外部配置，不覆盖。
 */
function resolveHostProxyEnv(): Record<string, string> {
  if (process.env.HTTP_PROXY !== undefined || process.env.HTTPS_PROXY !== undefined) return {}
  const settingsPath = join(homedir(), '.dsh', 'settings.yaml')
  if (!existsSync(settingsPath)) return {}
  let doc: Record<string, unknown>
  try {
    doc = (yamlLoad(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>) ?? {}
  } catch {
    return {}
  }
  const proxy = (doc.proxy ?? {}) as Record<string, unknown>
  if (proxy.enabled !== true) return {}
  let url = ''
  if (proxy.mode === 'manual' && typeof proxy.url === 'string') url = normalizeProxyUrl(proxy.url)
  else url = normalizeProxyUrl(getSystemProxy())
  if (url === '') return {}
  return {
    NODE_USE_ENV_PROXY: '1',
    HTTP_PROXY: url,
    HTTPS_PROXY: url,
    NO_PROXY: 'localhost,127.0.0.1',
  }
}

/** 把语言偏好写入 DHS host 配置（~/.dsh/settings.yaml 的 locale.preference），host 启动即生效 */
function writeLocalePreference(locale: 'zh' | 'en'): void {
  const settingsPath = join(homedir(), '.dsh', 'settings.yaml')
  let doc: Record<string, unknown> = {}
  if (existsSync(settingsPath)) {
    try {
      doc = (yamlLoad(readFileSync(settingsPath, 'utf8')) as Record<string, unknown>) ?? {}
    } catch {
      doc = {}
    }
  } else {
    mkdirSync(join(homedir(), '.dsh'), { recursive: true })
  }
  const cur = (typeof doc.locale === 'object' && doc.locale !== null ? doc.locale : {}) as Record<string, unknown>
  doc.locale = { ...cur, preference: locale }
  writeFileSync(settingsPath, yamlDump(doc, { lineWidth: -1 }))
  console.log(`[dsh-gui] DHS locale preference set: ${locale}`)
}

/** 解析 pnpm --reporter=ndjson 事件 → 进度回调 */
function parsePnpmEvent(evt: Record<string, unknown>, onProgress: ProgressCb): void {
  const s = evt.stage
  if (s === 'resolution_started') onProgress({ stage: 'download', percent: 8, message: '解析依赖关系…' })
  else if (s === 'resolution_finished') onProgress({ stage: 'download', percent: 12, message: '依赖解析完成' })
  else if (s === 'fetching_started') onProgress({ stage: 'download', percent: 15, message: '开始下载依赖包…' })
  else if (s === 'fetching_progress') {
    // 下载阶段真实进度：fetched/requirement 是本次实际下载的包数（store 命中的不计入）
    const fetched = Number(evt.fetched ?? 0)
    const req = Number(evt.requirement ?? 1)
    const pct = req > 0 ? 15 + Math.round((fetched / req) * 65) : 15
    onProgress({ stage: 'download', percent: Math.min(pct, 80), message: `正在下载依赖 ${fetched}/${req}` })
  } else if (s === 'fetching_finished') {
    onProgress({ stage: 'download', percent: 82, message: '依赖下载完成，开始链接…' })
  } else if (s === 'importing_started') onProgress({ stage: 'download', percent: 85, message: '正在写入依赖…' })
  else if (s === 'importing_progress') {
    const imported = Number(evt.imported ?? 0)
    const req = Number(evt.requirement ?? 1)
    const pct = req > 0 ? 85 + Math.round((imported / req) * 10) : 85
    onProgress({ stage: 'download', percent: Math.min(pct, 95), message: `正在链接依赖 ${imported}/${req}` })
  } else if (s === 'importing_finished') {
    onProgress({ stage: 'download', percent: 95, message: '依赖安装完成' })
  } else if (s === 'done') {
    onProgress({ stage: 'download', percent: 96, message: '安装收尾中…' })
  }
}

/** 首次安装 DHS 依赖：按下载源配置 → bootstrap pnpm → pnpm install（ndjson 推进度） */
async function installDhsDeps(config: { registry: string; proxy: string; useSystemProxy: boolean; locale?: 'zh' | 'en' }, onProgress: ProgressCb): Promise<void> {
  // 初始化安装日志（打包版无控制台，安装全过程落盘到 userData/install.log）
  try {
    installLogPath = join(app.getPath('userData'), 'install.log')
    mkdirSync(dirname(installLogPath), { recursive: true })
    appendFileSync(installLogPath, `\n===== 安装开始 ${new Date().toISOString()} =====\n`)
  } catch {
    installLogPath = ''
  }
  logInstall(`DHS_ROOT=${DHS_ROOT}`)
  logInstall(`app.isPackaged=${app.isPackaged}`)

  const nodeBin = resolveNodeBin()
  const pnpmCli = resolvePnpmCli()

  // 语言偏好先写入 DHS host 配置（settings.yaml），host 启动后整个内核 UI 跟随
  if (config.locale !== undefined) writeLocalePreference(config.locale)

  const env: Record<string, string> = {}
  env.npm_config_registry = config.registry
  let proxy = config.proxy
  if (config.useSystemProxy) proxy = getSystemProxy()
  if (proxy) {
    env.npm_config_proxy = proxy
    env.npm_config_https_proxy = proxy
  }
  logInstall(`registry=${config.registry} proxy=${proxy ?? '无'}`)

  // pnpm 已捆绑（打包版 resources/runtime/pnpm；开发态用系统 pnpm），直接 install
  onProgress({ stage: 'download', percent: 8, message: '开始安装依赖…' })
  // Windows 深路径下 junction 创建可能被 Defender 实时防护随机中断（pnpm 报 done 但链接缺失），
  // 失败自动重试（最多 3 次）；完整性用「内核可运行性」验证（dsh CLI --version 能跑 = 依赖完整）。
  const MAX_ATTEMPTS = 3
  let installed = false
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !installed; attempt++) {
    if (attempt > 1) {
      onProgress({ stage: 'download', percent: 8, message: `安装中断，正在重试（${attempt}/${MAX_ATTEMPTS}）…` })
      logInstall(`>>> 第 ${attempt} 次安装尝试`)
      await new Promise((r) => setTimeout(r, 5000))
    }
    try {
      await runChild(nodeBin, [pnpmCli, 'install', '--no-frozen-lockfile', '--reporter=ndjson'], DHS_ROOT, (line) => {
        try {
          parsePnpmEvent(JSON.parse(line) as Record<string, unknown>, onProgress)
        } catch {
          // 非 JSON 行（warn 等）忽略
        }
      }, env)
      // 内核完整性验证：直接跑 dsh CLI --version（能跑 = apps/cli 依赖链接完整，比查单个链接可靠）
      try {
        const v = execFileSync(nodeBin, [join(DHS_ROOT, 'apps', 'cli', 'lib', 'bin.js'), '--version'], {
          encoding: 'utf8', cwd: DHS_ROOT, env: { ...process.env, ...env }, windowsHide: true, timeout: 60000,
        })
        installed = true
        logInstall(`内核验证通过（dsh ${v.trim()}）`)
      } catch (verr) {
        installed = false
        logInstall(`内核验证失败（链接不完整或 bin.js 缺依赖）: ${String(verr).slice(0, 300)}`)
      }
    } catch (err) {
      logInstall(`依赖安装尝试 ${attempt}/${MAX_ATTEMPTS} 失败: ${String(err)}`)
    }
  }
  if (!installed) throw new Error('依赖安装多次失败，请检查网络后重试（详情见安装日志）')

  // 打包版：把内置插件安装进 web profile（GUI 基础特色——插件搜索、技能管理、MCP 管理）
  // 容错：插件安装失败不阻断主流程（首次会初始化 profile 联网装 bundle，可能较慢/受网络影响），
  // 失败仅记录，主界面照常启动（插件可在后续应用内补装）。
  if (app.isPackaged) {
    const bundledPlugins = ['dsh-discovery', 'dsh-skillmanager', 'dsh-mcpmanager']
    const profileDir = join(DHS_HOME || join(homedir(), '.dsh'), 'profiles', 'web')
    for (const pluginName of bundledPlugins) {
      const pluginDir = join(process.resourcesPath, pluginName)
      if (!existsSync(join(pluginDir, 'package.json'))) {
        logInstall(`警告：resources/${pluginName}/package.json 不存在，跳过插件安装`)
        continue
      }
      onProgress({ stage: 'download', percent: 95, message: `安装内置组件 ${pluginName}…` })
      logInstall(`>>> 安装插件 ${pluginName}（${pluginDir}）`)

      // 自愈：清理 profile 中失效的 <plugin> file: 链接。
      // 背景：dev 环境 `dsh plugin add` 会把 file: 绝对路径写入 ~/.dsh/profiles/web/package.json，
      // 项目改名/迁移后旧路径失效（ENOENT），plugin add 解析 profile 现有依赖时会整体失败。
      const profilePkg = join(profileDir, 'package.json')
      if (existsSync(profilePkg)) {
        try {
          const doc = JSON.parse(readFileSync(profilePkg, 'utf8')) as { dependencies?: Record<string, string> }
          const dep = doc?.dependencies?.[pluginName]
          if (typeof dep === 'string' && dep.startsWith('file:')) {
            const target = dep.slice('file:'.length)
            if (!existsSync(join(target, 'package.json'))) {
              logInstall(`修复：profile 中 ${pluginName} 指向失效路径（${dep}），移除旧依赖后重装`)
              if (doc.dependencies) delete doc.dependencies[pluginName]
              writeFileSync(profilePkg, JSON.stringify(doc, null, 2))
              rmSync(join(profileDir, 'node_modules', pluginName), { recursive: true, force: true })
            }
          }
        } catch (e) {
          logInstall(`profile 失效依赖检查跳过: ${String(e)}`)
        }
      }

      try {
        await runChild(nodeBin, [
          join(DHS_ROOT, 'apps', 'cli', 'lib', 'bin.js'),
          'plugin', '--profile', 'web', 'add', pluginDir,
        ], DHS_ROOT, (line) => logInstall(`[plugin] ${line}`), env)
        logInstall(`插件 ${pluginName} 安装成功`)
      } catch (err) {
        logInstall(`插件 ${pluginName} 安装失败（不影响主流程）: ${String(err)}`)
      }
    }
  }

  // 校验
  onProgress({ stage: 'verify', percent: 96, message: '校验安装结果…' })
  if (!isDhsInstalled()) throw new Error('依赖安装后未找到 node_modules，请重试')
  if (!existsSync(join(DHS_ROOT, 'apps', 'cli', 'lib', 'bin.js'))) throw new Error('DHS 可执行文件缺失（apps/cli/lib/bin.js）')
  logInstall('===== 安装完成 =====')
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

/** 组装 host 版本信息 env（dsh-about 插件读取并展示在设置 → 关于） */
function resolveVersionEnv(): Record<string, string> {
  const readVersion = (p: string): string => {
    try {
      return (JSON.parse(readFileSync(p, 'utf8')) as { version?: string }).version ?? ''
    } catch {
      return ''
    }
  }
  return {
    DSH_GUI_NAME: 'dsh-gui',
    DSH_GUI_VERSION: app.getVersion(),
    DSH_KERNEL_VERSION: readVersion(join(DHS_ROOT, 'apps', 'cli', 'package.json')),
    DSH_ELECTRON_VERSION: process.versions.electron ?? '',
    DSH_NODE_VERSION: process.versions.node ?? '',
  }
}

/** 启动 DHS host 子进程，返回其监听端口 */
async function startHost(): Promise<number> {
  const proxyEnv = resolveHostProxyEnv()
  if (Object.keys(proxyEnv).length > 0) {
    console.log(`[dsh-gui] host proxy: ${proxyEnv.HTTP_PROXY} (NODE_USE_ENV_PROXY=1)`)
  }
  const versionEnv = resolveVersionEnv()
  hostProc = spawn(resolveNodeBin(), ['apps/cli/lib/bin.js', '--profile', 'web'], {
    cwd: DHS_ROOT,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...proxyEnv, ...versionEnv },
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
  // 默认语言跟随系统（Electron locale：zh* → 中文，其余 → 英文）
  defaultLocale: app.getLocale().toLowerCase().startsWith('zh') ? 'zh' : 'en',
}))

ipcMain.handle('setup:install', async (_e, config: { registry: string; proxy: string; useSystemProxy: boolean; locale?: 'zh' | 'en' }) => {
  try {
    await installDhsDeps(config, (p) => wizardWin?.webContents.send('setup:progress', p))
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[dsh-gui] install failed:', msg)
    const logHint = installLogPath ? `（详细日志：${installLogPath}）` : ''
    return { ok: false, error: `${msg}${logHint}` }
  }
})

app.whenReady().then(async () => {
  // 移除默认菜单栏（File/Edit/View/Window/Help）——桌面应用不需要
  Menu.setApplicationMenu(null)
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
