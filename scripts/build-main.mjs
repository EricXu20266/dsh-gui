/**
 * dsh-gui 构建 —— esbuild bundle：
 *  - main.cjs  主进程（main.ts）
 *  - preload.js preload 桥（preload.ts，IPC 载体）
 *  - dist/renderer/ 向导页面（首次安装用，纯静态 HTML）
 * main.ts 仅依赖 electron + node 内置模块，打包干净；不涉及 DHS 包
 * （host 以子进程方式运行，无需 bundle cordis 相关）
 */
import { build } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

await build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  outfile: 'dist/main.cjs',
  external: ['electron'],
  logLevel: 'info',
})

await build({
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  outfile: 'dist/preload.js',
  external: ['electron'],
  logLevel: 'info',
})

// 复制向导页面（首次安装向导）到 dist/renderer/
const rendererOut = join(root, 'dist', 'renderer')
mkdirSync(rendererOut, { recursive: true })
copyFileSync(
  join(root, 'electron', 'renderer', 'setup-wizard.html'),
  join(rendererOut, 'setup-wizard.html'),
)
