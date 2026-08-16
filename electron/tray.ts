/**
 * 系统托盘：左键/双击显示主窗口，右键菜单（显示主窗口/退出）。
 * 从 main.ts 拆出，避免窗口状态与托盘逻辑继续堆在同一文件。
 */
import { Menu, Tray, nativeImage } from 'electron';

export interface TrayActions {
  showMainWindow: () => void;
  quitApp: () => void;
}

export type TrayController = Tray;

export function createTray(iconPath: string, actions: TrayActions): TrayController {
  const tray = new Tray(nativeImage.createFromPath(iconPath));
  tray.setToolTip('dsh-gui — DeepSeek Harness 桌面客户端');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => actions.showMainWindow() },
      { type: 'separator' },
      { label: '退出', click: () => actions.quitApp() },
    ]),
  );
  tray.on('click', () => actions.showMainWindow());
  return tray;
}
