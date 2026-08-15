/**
 * dsh-about prepare: build host (tsc) + client bundle (tsdown) when installed
 * from git/npm without prebuilt artifacts.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(new URL('../', import.meta.url)))
const bin = (name) => join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name)

const needs = {
  host: !existsSync(join(root, 'lib', 'index.js')),
  client: !existsSync(join(root, 'client', 'client.js')),
}

if (needs.host) {
  spawnSync(bin('tsc'), ['-p', join(root, 'tsconfig.json')], { stdio: 'inherit' })
}
if (needs.client) {
  spawnSync(bin('tsdown'), [], { stdio: 'inherit', cwd: root })
}
