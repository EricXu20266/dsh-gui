/**
 * dsh-gui preload —— 注入 IPC 桥：
 *  - setupAPI：首次安装向导（下载源/代理 → 阶段/进度/结果）
 *  - （P1 预留：原生对话框/通知等）
 *
 * 类型统一定义在 electron/types.ts，主进程 / preload / 向导共用一份契约。
 */
import { type IpcRendererEvent, contextBridge, ipcRenderer } from 'electron';
import type { InstallConfig, InstallProgress, InstallResult, SetupInfo } from './types';

interface SetupAPI {
  /** 向导页初始化信息 */
  getInfo: () => Promise<SetupInfo>;
  /** 开始安装（返回结果；进度经 onProgress 回调） */
  startInstall: (config: InstallConfig) => Promise<InstallResult>;
  /** 订阅进度，返回取消订阅函数 */
  onProgress: (cb: (progress: InstallProgress) => void) => () => void;
}

const setupAPI: SetupAPI = {
  getInfo: () => ipcRenderer.invoke('setup:info'),
  startInstall: (config) => ipcRenderer.invoke('setup:install', config),
  onProgress: (cb) => {
    const listener = (_event: IpcRendererEvent, progress: InstallProgress): void => cb(progress);
    ipcRenderer.on('setup:progress', listener);
    return () => ipcRenderer.removeListener('setup:progress', listener);
  },
};

contextBridge.exposeInMainWorld('setupAPI', setupAPI);
