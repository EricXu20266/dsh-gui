/**
 * dsh-skillmanager host routes:
 *  - GET  /dsh-skillmanager/list   — ctx.skills.snapshot() summaries
 *  - GET  /dsh-skillmanager/get    — full definition (content/path) by name
 *  - POST /dsh-skillmanager/toggle — flip model/user invocation in SKILL.md frontmatter
 * Skill file edits invalidate the filesystem provider's watch automatically.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import type { Context } from '@deepseek-ai/cordis'
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'
import type { SkillSummary, SkillDefinition } from '@deepseek-ai/dsh-skill'
import { sendJson, sameOrigin } from './http.ts'

export interface WebServerService {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}

export interface SkillManagerHost {
  webServer: WebServerService
  effect(callback: () => () => void, label: string): void
}

interface FrontmatterDoc {
  data: Record<string, unknown>
  content: string
}

/** Parse a SKILL.md-style document: leading --- YAML frontmatter + body. */
function parseFrontmatter(raw: string): FrontmatterDoc {
  if (!raw.startsWith('---')) return { data: {}, content: raw }
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { data: {}, content: raw }
  const yamlText = raw.slice(3, end)
  const body = raw.slice(end + 4)
  let data: Record<string, unknown> = {}
  try {
    const parsed = yamlLoad(yamlText) as unknown
    if (parsed !== null && typeof parsed === 'object') data = parsed as Record<string, unknown>
  } catch {
    data = {}
  }
  return { data, content: body }
}

function renderFrontmatter(doc: FrontmatterDoc): string {
  const dataText = Object.keys(doc.data).length === 0 ? '' : `${yamlDump(doc.data, { lineWidth: -1 })}`
  return dataText === '' ? doc.content : `---\n${dataText}---\n${doc.content}`
}

export function mountSkillManagerRoutes(host: SkillManagerHost): () => void {
  const disposers = [
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/list',
      handler: async (_request, response) => {
        try {
          const ctx = host as unknown as Context
          const summaries = await ctx.skills.snapshot()
          sendJson(response, 200, { skills: summaries.skills })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/get',
      handler: async (request, response) => {
        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          const name = url.searchParams.get('name') ?? ''
          if (name === '') {
            sendJson(response, 400, { error: 'name is required' })
            return
          }
          const ctx = host as unknown as Context
          const skill = await ctx.skills.get(name)
          if (skill === undefined) {
            sendJson(response, 404, { error: `skill "${name}" not found` })
            return
          }
          sendJson(response, 200, { skill })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/toggle',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          const name = url.searchParams.get('name') ?? ''
          const key = url.searchParams.get('key') ?? 'modelInvocable'
          if (name === '' || (key !== 'modelInvocable' && key !== 'userInvocable')) {
            sendJson(response, 400, { error: 'name and key (modelInvocable|userInvocable) are required' })
            return
          }
          const ctx = host as unknown as Context
          const skill = await ctx.skills.get(name)
          if (skill === undefined || skill.path === undefined) {
            sendJson(response, 404, { error: `skill "${name}" is not file-backed` })
            return
          }
          const raw = readFileSync(skill.path, 'utf8')
          const doc = parseFrontmatter(raw)
          const invocation = (doc.data.invocation ?? {}) as Record<string, unknown>
          const current = typeof invocation[key] === 'boolean' ? invocation[key] : true
          invocation[key] = !current
          doc.data.invocation = invocation
          writeFileSync(skill.path, renderFrontmatter(doc))
          sendJson(response, 200, { ok: true, name, key, value: invocation[key], path: skill.path })
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

export type { SkillSummary, SkillDefinition }
