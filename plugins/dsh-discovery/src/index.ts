/**
 * dsh-discovery host entry: mounts a read-only registry route that lists
 * community DSH plugins from the GitHub `dsh-plugin` topic. Deliberately no
 * install / update / restart endpoints — installation is left to the user or
 * the host agent after reviewing a repository (dsh plugin add).
 */
import type { Context } from '@deepseek-ai/cordis'
import { mountDiscoveryRoutes, type DiscoveryHost } from './routes.ts'

export const name = 'dsh-discovery'

export function apply(ctx: Context): void {
  ctx.inject(['webServer', 'loader'], (hostCtx: Context) => {
    const host = hostCtx as unknown as DiscoveryHost
    host.effect(() => mountDiscoveryRoutes(host), 'dsh-discovery: http routes')
  })
}
