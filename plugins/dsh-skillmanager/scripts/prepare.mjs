/**
 * 条件构建：构建产物已存在（打包分发场景，resources 里无 node_modules）则跳过，
 * 否则执行完整构建（git 安装首次克隆无产物时）。
 * 直接用 node 调 tsc/tsdown 入口，绕开 npm/pnpm workspace 环境下 `npm run` 的解析问题。
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const hostBuilt = existsSync('lib/index.js')
const clientBuilt = existsSync('client/client.js')

if (hostBuilt && clientBuilt) {
  console.log('[dsh-skillmanager] 构建产物已存在（lib/ + client/），跳过 prepare 构建')
  process.exit(0)
}

console.log('[dsh-skillmanager] 未发现构建产物，执行构建…')
const nodeBin = process.execPath

function run(label, entry, args) {
  const r = spawnSync(nodeBin, [entry, ...args], { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error(`[dsh-skillmanager] ${label} failed (exit ${r.status})`)
    process.exit(r.status ?? 1)
  }
}

run('tsc', join('node_modules', 'typescript', 'bin', 'tsc'), ['-p', 'tsconfig.json'])
run('tsdown', join('node_modules', 'tsdown', 'dist', 'run.mjs'), [])
