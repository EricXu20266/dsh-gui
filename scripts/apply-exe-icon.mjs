/**
 * 打包后处理：用 rcedit 把 icon.ico 嵌入打包出的 dsh-gui.exe（PE 资源图标）。
 * electron-builder 26 的 exe 图标编辑存在静默失败 bug（explorer 显示默认图标），
 * 手动 rcedit 是可靠路径。rcedit 位于 electron-builder 的 winCodeSign 缓存。
 * 用法：node scripts/apply-exe-icon.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const exe = join(ROOT, 'release', 'win-unpacked', 'dsh-gui.exe');
const ico = join(ROOT, 'resources', 'icon', 'icon.ico');
const rcedit = join(
  homedir(),
  '.cache',
  'electron-builder',
  'winCodeSign',
  'winCodeSign-2.6.0',
  'rcedit-x64.exe',
);

if (!existsSync(exe)) {
  console.error(`exe not found: ${exe}（先跑 electron-builder）`);
  process.exit(1);
}
if (!existsSync(rcedit)) {
  console.error(`rcedit not found: ${rcedit}（electron-builder 打包时需成功下载 winCodeSign）`);
  process.exit(1);
}

execFileSync(rcedit, [exe, '--set-icon', ico]);
console.log('exe icon applied →', exe);
