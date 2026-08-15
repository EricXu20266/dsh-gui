/**
 * dhs-gui main process — P0-A: Electron 窗口 + DHS host 子进程。
 *
 * 为什么不用 in-process：
 * DHS 的 cordis loader 依赖 Node 内部 API（node-addon-require-builtin 获取
 * internal/modules/esm/loader）从 profile 目录解析插件。Electron 内置 Node
 * （24.18.1）的内部模块结构与官方 Node 不兼容，internal.import 解析失效
 * （系统 Node 24.15.0 正常）。DHS 官方 RFC 预留的 Electron in-process 路线
 * 在当前版本下不可行，需 DHS 侧改造 loader 才能支持。
 *
 * 当前形态：main 进程 spawn 系统 node 跑 DHS bin.js（host 子进程），
 * 窗口 loadURL http://127.0.0.1:<port>。GUI 形态达成，host 隔离、可独立升级。
 */
import { app, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import net from 'node:net'

/** DHS 仓库根（POC 硬编码；打包/分发时改为可配置） */
const DHS_ROOT = 'E:/AllinDeepSeek/deepseek-harness'
const DHS_HOME = process.env.DSH_HOME ?? '' // 让 host 子进程继承当前 DSH_HOME

let hostProc: ChildProcess | undefined

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
  hostProc = spawn('node', ['apps/cli/lib/bin.js', '--profile', 'web'], {
    cwd: DHS_ROOT,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  hostProc.stdout?.on('data', (d) => process.stdout.write(`[host] ${d}`))
  hostProc.stderr?.on('data', (d) => process.stderr.write(`[host:err] ${d}`))
  hostProc.on('exit', (code) => {
    console.log(`[dhs-gui] host exited with code ${code}`)
    if (hostProc === undefined) return
    hostProc = undefined
    // host 意外退出则关闭应用
    app.quit()
  })
  const port = 3080 // DHS web profile 默认端口
  await waitForPort(port)
  console.log(`[dhs-gui] host ready on ${port}`)
  return port
}

app.whenReady().then(async () => {
  try {
    const port = await startHost()
    const win = new BrowserWindow({
      width: 1440,
      height: 900,
      title: 'DHS GUI',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    })
    win.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[dhs-gui] load failed (${code}): ${desc} for ${url}`)
    })
    win.webContents.on('render-process-gone', (_e, details) => {
      console.error(`[dhs-gui] renderer gone: reason=${details.reason} exitCode=${details.exitCode}`)
    })
    win.on('close', () => console.log('[dhs-gui] window close event'))
    win.on('closed', () => console.log('[dhs-gui] window closed event'))
    await win.loadURL(`http://127.0.0.1:${port}`)
    console.log('[dhs-gui] window loaded')
  } catch (error) {
    console.error('[dhs-gui] start failed:', error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  console.log('[dhs-gui] window-all-closed')
  hostProc?.kill()
  app.quit()
})
app.on('before-quit', () => console.log('[dhs-gui] before-quit'))
app.on('quit', (_e, code) => console.log(`[dhs-gui] app quit code=${code}`))

process.on('uncaughtException', (err) => console.error('[dhs-gui] uncaught:', err))
process.on('unhandledRejection', (reason) => console.error('[dhs-gui] unhandledRejection:', reason))

app.on('window-all-closed', () => {
  hostProc?.kill()
  app.quit()
})

app.on('before-quit', () => {
  hostProc?.kill()
})
