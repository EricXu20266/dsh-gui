/**
 * dsh-mcpmanager host routes:
 *  - GET  /dsh-mcpmanager/list   — MCP server configs parsed from profile cordis.patch.yml
 *  - POST /dsh-mcpmanager/upsert — add or update one mcp-client instance (npx → bundled node auto-resolve)
 *  - POST /dsh-mcpmanager/delete — remove one mcp-client instance by id
 *  - POST /dsh-mcpmanager/toggle — enable/disable an instance (cordis patch `disabled: true` row)
 * Writes preserve every non-MCP insert row (other patch entries untouched).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
  /** 是否启用（cordis patch disabled 条目缺失 = 启用） */
  enabled: boolean
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

interface PatchFile {
  inserts: InsertRow[]
  disabledIds: Set<string>
}

function readPatch(): PatchFile {
  const patch: PatchFile = { inserts: [], disabledIds: new Set() }
  const path = resolvePatchPath()
  if (!existsSync(path)) return patch
  try {
    const parsed = yamlLoad(readFileSync(path, 'utf8')) as unknown
    if (!Array.isArray(parsed)) return patch
    for (const item of parsed) {
      const row = item as Record<string, unknown>
      const insert = row.insert
      if (Array.isArray(insert)) {
        patch.inserts.push(...(insert as InsertRow[]))
        continue
      }
      if (typeof row.id === 'string' && row.disabled === true) {
        patch.disabledIds.add(row.id)
      }
    }
  } catch {
    // 解析失败返回空，保持幂等
  }
  return patch
}

function writePatch(patch: PatchFile): void {
  const path = resolvePatchPath()
  mkdirSync(join(path, '..'), { recursive: true })
  const doc: unknown[] = []
  if (patch.inserts.length > 0) doc.push({ insert: patch.inserts })
  for (const id of [...patch.disabledIds].sort()) {
    doc.push({ id, disabled: true })
  }
  writeFileSync(path, yamlDump(doc, { lineWidth: -1 }))
}

function toEntry(row: InsertRow, patch: PatchFile): McpServerEntry | null {
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
    enabled: !patch.disabledIds.has(row.id),
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

/* ── npx → bundled node（保证打包版稳定性：host 用捆绑 node 运行，系统 PATH 无 npx）── */

function resolveBinEntry(pkgDir: string, pkg: string): string | null {
  const pkgJsonPath = join(pkgDir, 'node_modules', pkg, 'package.json')
  if (!existsSync(pkgJsonPath)) return null
  try {
    const doc = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as { bin?: string | Record<string, string> }
    const bin = doc.bin
    let entry: string | undefined
    if (typeof bin === 'string') entry = bin
    else if (bin !== null && typeof bin === 'object') entry = Object.values(bin)[0]
    if (entry === undefined) return null
    return join(pkgDir, 'node_modules', pkg, entry)
  } catch {
    return null
  }
}

/**
 * 把 `npx [-y] [--package ...] <pkg> [args...]` 解析为「当前 node + 包入口 js」。
 * 扫描 npx 缓存（npm-cache/_npx），命中则直调入口，跳过系统 PATH 依赖（打包版无 npx）。
 * 解析失败返回 null，保留原 npx 命令。
 */
function resolveNpxToBundledNode(npxArgs: string[]): { command: string; args: string[] } | null {
  let pkgIdx = 0
  for (; pkgIdx < npxArgs.length; pkgIdx++) {
    const arg = npxArgs[pkgIdx]
    if (arg !== undefined && !arg.startsWith('-')) break
  }
  if (pkgIdx >= npxArgs.length) return null
  const pkg = npxArgs[pkgIdx]
  const cacheRoot = process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'npm-cache', '_npx')
    : join(homedir(), '.npm', '_npx')
  if (!existsSync(cacheRoot)) return null
  try {
    for (const dir of readdirSync(cacheRoot)) {
      const pkgJsonPath = join(cacheRoot, dir, 'package.json')
      if (!existsSync(pkgJsonPath)) continue
      const doc = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as { dependencies?: Record<string, string> }
      if (doc.dependencies?.[pkg] !== undefined) {
        const entry = resolveBinEntry(join(cacheRoot, dir), pkg)
        if (entry !== null) {
          return { command: process.execPath, args: [entry, ...npxArgs.slice(pkgIdx + 1)] }
        }
      }
    }
  } catch {
    // 扫描失败 → fallback 原命令
  }
  return null
}

export function mountMcpManagerRoutes(host: McpManagerHost): () => void {
  const disposers = [
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-mcpmanager/list',
      handler: async (_request, response) => {
        try {
          const patch = readPatch()
          const entries = patch.inserts.map((r) => toEntry(r, patch)).filter((e): e is McpServerEntry => e !== null)
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
          const config = { ...body.config }
          let resolvedNpx = false
          // npx → 内置 node 直调（打包版稳定性）
          if (typeof config.command === 'string' && config.command === 'npx' && Array.isArray(config.args)) {
            const resolved = resolveNpxToBundledNode(config.args.map(String))
            if (resolved !== null) {
              config.command = resolved.command
              config.args = resolved.args
              resolvedNpx = true
            }
          }
          const patch = readPatch()
          const existing = patch.inserts.find((r) => r.id === body.id && r.name === MCP_CLIENT)
          if (existing !== undefined) {
            existing.config = config
          } else {
            patch.inserts.push({ id: body.id, name: MCP_CLIENT, config })
          }
          writePatch(patch)
          sendJson(response, 200, { ok: true, id: body.id, restartRequired: true, resolvedNpx })
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
          const patch = readPatch()
          patch.inserts = patch.inserts.filter((r) => !(r.id === body.id && r.name === MCP_CLIENT))
          patch.disabledIds.delete(body.id)
          writePatch(patch)
          sendJson(response, 200, { ok: true, id: body.id, restartRequired: true })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-mcpmanager/toggle',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const body = JSON.parse(await readBody(request)) as { id?: string; enabled?: boolean }
          if (body.id === undefined || typeof body.enabled !== 'boolean') {
            sendJson(response, 400, { error: 'id and enabled are required' })
            return
          }
          const patch = readPatch()
          const exists = patch.inserts.some((r) => r.id === body.id && r.name === MCP_CLIENT)
          if (!exists) {
            sendJson(response, 404, { error: `mcp server "${body.id}" not found` })
            return
          }
          if (body.enabled) patch.disabledIds.delete(body.id)
          else patch.disabledIds.add(body.id)
          writePatch(patch)
          sendJson(response, 200, { ok: true, id: body.id, enabled: body.enabled, restartRequired: true })
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
