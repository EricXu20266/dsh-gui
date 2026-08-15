/**
 * 条件构建：构建产物已存在（打包分发场景，resources 里无 node_modules）则跳过，
 * 否则执行完整构建（git 安装首次克隆无产物时）。
 */
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const hostBuilt = existsSync('lib/index.js')
const clientBuilt = existsSync('client/client.js')

if (hostBuilt && clientBuilt) {
  console.log('[dsh-discovery] 构建产物已存在（lib/ + client/），跳过 prepare 构建')
  process.exit(0)
}

console.log('[dsh-discovery] 未发现构建产物，执行构建…')
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
for (const script of ['build', 'bundle:client']) {
  const r = spawnSync(npmCmd, ['run', script], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
