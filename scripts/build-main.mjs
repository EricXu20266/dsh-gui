/**
 * dsh-gui main 进程打包 —— esbuild bundle 单文件 CJS
 * main.ts 仅依赖 electron + node 内置模块，打包干净；不涉及 DHS 包
 * （host 以子进程方式运行，无需 bundle cordis 相关）
 */
import { build } from 'esbuild'

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
