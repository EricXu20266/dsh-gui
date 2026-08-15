/**
 * dsh-mcpmanager host entry: mounts MCP configuration routes that read/write
 * the profile's cordis.patch.yml (mcp-client plugin instances). Configuration
 * changes require a host restart — delegated to the host agent via prompts.
 */
import type { Context } from '@deepseek-ai/cordis'
import { mountMcpManagerRoutes, type McpManagerHost } from './routes.ts'

export const name = 'dsh-mcpmanager'

export function apply(ctx: Context): void {
  ctx.inject(['webServer', 'loader'], (hostCtx: Context) => {
    const host = hostCtx as unknown as McpManagerHost
    host.effect(() => mountMcpManagerRoutes(host), 'dsh-mcpmanager: http routes')
  })
}
