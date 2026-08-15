/**
 * dsh-gui preload —— 注入 IPC 桥：
 *  - setupAPI：首次安装向导（下载源/代理 → 阶段/进度/结果）
 *  - （P1 预留：原生对话框/通知等）
 */
import { contextBridge, ipcRenderer } from 'electron'

/** 安装配置（向导收集后传给主进程） */
export interface InstallConfig {
  /** npm registry 地址（用户选择的下载源） */
  registry: string
  /** 代理地址（代理模式时） */
  proxy: string
  /** 是否使用操作系统代理 */
  useSystemProxy: boolean
}

/** 向导页展示的静态信息 */
export interface SetupInfo {
  /** DHS 安装目录（应用 resources/dhs） */
  dhsRoot: string
  /** 预估下载大小（MB） */
  estimatedMb: number
}

/** 安装进度事件（主进程 → 向导页） */
export interface InstallProgress {
  /** bootstrap=准备 pnpm / download=下载依赖 / verify=校验 */
  stage: 'bootstrap' | 'download' | 'verify'
  /** 0-100 */
  percent: number
  message: string
}

/** 安装结果 */
export interface InstallResult {
  ok: boolean
  error?: string
}

const setupAPI = {
  /** 向导页初始化信息 */
  getInfo: (): Promise<SetupInfo> => ipcRenderer.invoke('setup:info'),
  /** 开始安装（返回结果；进度经 onProgress 回调） */
  startInstall: (config: InstallConfig): Promise<InstallResult> =>
    ipcRenderer.invoke('setup:install', config),
  /** 订阅进度，返回取消订阅函数 */
  onProgress: (cb: (p: InstallProgress) => void): (() => void) => {
    const listener = (_e: unknown, p: InstallProgress): void => cb(p)
    ipcRenderer.on('setup:progress', listener)
    return () => ipcRenderer.removeListener('setup:progress', listener)
  },
}

contextBridge.exposeInMainWorld('setupAPI', setupAPI)
