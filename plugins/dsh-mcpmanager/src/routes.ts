/**
 * dsh-mcpmanager host routes:
 *  - GET  /dsh-mcpmanager/list   — MCP server configs parsed from profile cordis.patch.yml
 *  - POST /dsh-mcpmanager/upsert — add or update one mcp-client instance
 *  - POST /dsh-mcpmanager/delete — remove one mcp-client instance by id
 * Writes preserve every non-MCP insert row (other patch entries untouched).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import { sendJson, sameOrigin } from './http.ts'

export interface WebServerService {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}

export interface McpManagerHost {
  webServer: WebServerService
  effect(callback: () => () => void, label: string): void
}

const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'

export interface McpServerEntry {
  id: string
  serverName: string
  transport: string
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}

/** Profile patch path: $DSH_HOME/profiles/web/cordis.patch.yml (or ~/.dsh). */
function resolvePatchPath(): string {
  const home = process.env.DSH_HOME !== undefined && process.env.DSH_HOME !== ''
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
  return join(home, 'profiles', 'web', 'cordis.patch.yml')
}

interface InsertRow {
  id?: string
  name?: string
  config?: Record<string, unknown>
}

function readPatch(): InsertRow[] {
  const path = resolvePatchPath()
  if (!existsSync(path)) return []
  try {
    const parsed = yamlLoad(readFileSync(path, 'utf8')) as unknown
    if (!Array.isArray(parsed)) return []
    const rows: InsertRow[] = []
    for (const item of parsed) {
      const insert = (item as { insert?: unknown }).insert
      if (Array.isArray(insert)) rows.push(...(insert as InsertRow[]))
    }
    return rows
  } catch {
    return []
  }
}

function writePatch(rows: InsertRow[]): void {
  const path = resolvePatchPath()
  mkdirSync(join(path, '..'), { recursive: true })
  // 保持 patch 顶层结构：全部放进单个 insert 列表（与原格式兼容）
  const doc = [{ insert: rows }]
  writeFileSync(path, yamlDump(doc, { lineWidth: -1 }))
}

function toEntry(row: InsertRow): McpServerEntry | null {
  if (row.name !== MCP_CLIENT || row.id === undefined) return null
  const config = (row.config ?? {}) as Record<string, unknown>
  return {
    id: row.id,
    serverName: typeof config.serverName === 'string' ? config.serverName : row.id,
    transport: typeof config.transport === 'string' ? config.transport : 'stdio',
    command: typeof config.command === 'string' ? config.command : undefined,
    args: Array.isArray(config.args) ? config.args.map(String) : undefined,
    env: typeof config.env === 'object' && config.env !== null ? config.env as Record<string, string> : undefined,
    cwd: typeof config.cwd === 'string' ? config.cwd : undefined,
  }
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (c: Buffer) => chunks.push(c))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

export function mountMcpManagerRoutes(host: McpManagerHost): () => void {
  const disposers = [
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-mcpmanager/list',
      handler: async (_request, response) => {
        try {
          const entries = readPatch().map(toEntry).filter((e): e is McpServerEntry => e !== null)
          sendJson(response, 200, { servers: entries, patchPath: resolvePatchPath() })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-mcpmanager/upsert',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const body = JSON.parse(await readBody(request)) as { id?: string; config?: Record<string, unknown> }
          if (body.id === undefined || body.config === undefined) {
            sendJson(response, 400, { error: 'id and config are required' })
            return
          }
          const rows = readPatch()
          const existing = rows.find((r) => r.id === body.id && r.name === MCP_CLIENT)
          if (existing !== undefined) {
            existing.config = body.config
          } else {
            rows.push({ id: body.id, name: MCP_CLIENT, config: body.config })
          }
          writePatch(rows)
          sendJson(response, 200, { ok: true, id: body.id, restartRequired: true })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-mcpmanager/delete',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const body = JSON.parse(await readBody(request)) as { id?: string }
          if (body.id === undefined) {
            sendJson(response, 400, { error: 'id is required' })
            return
          }
          const rows = readPatch().filter((r) => !(r.id === body.id && r.name === MCP_CLIENT))
          writePatch(rows)
          sendJson(response, 200, { ok: true, id: body.id, restartRequired: true })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}
