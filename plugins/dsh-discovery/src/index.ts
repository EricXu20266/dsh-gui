/**
 * dsh-discovery host entry: mounts a read-only registry route that lists
 * community DSH plugins from the GitHub `dsh-plugin` topic. Deliberately no
 * install / update / restart endpoints — installation is left to the user or
 * the host agent after reviewing a repository (dsh plugin add).
 */
import type { Context } from '@deepseek-ai/cordis'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { mountDiscoveryRoutes, type DiscoveryHost } from './routes.ts'

export const name = 'dsh-discovery'

/** 内置 bundle 插件（非用户安装），已安装标识中排除。 */
const BUILTIN_PLUGINS = new Set([
  '@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-headless',
])

/** 当前激活 profile 名（host 启动 argv：node bin.js --profile <name>）。 */
function resolveProfileName(): string {
  const idx = process.argv.indexOf('--profile')
  return idx >= 0 && process.argv[idx + 1] !== undefined ? process.argv[idx + 1] : 'web'
}

/** 读 profile manifest 的 dsh.profile.bundles，过滤内置，得到用户安装的插件包名。 */
function listInstalledPlugins(): string[] {
  try {
    const manifestPath = join(homedir(), '.dsh', 'profiles', resolveProfileName(), 'package.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      dsh?: { profile?: { bundles?: string[] } }
    }
    return (manifest.dsh?.profile?.bundles ?? []).filter((name) => !BUILTIN_PLUGINS.has(name))
  } catch {
    return []
  }
}

export function apply(ctx: Context): void {
  ctx.inject(['webServer', 'loader'], (hostCtx: Context) => {
    const host = hostCtx as unknown as DiscoveryHost
    host.effect(() => mountDiscoveryRoutes(host, listInstalledPlugins), 'dsh-discovery: http routes')
  })
}
