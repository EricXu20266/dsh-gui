/**
 * dsh-skillmanager host routes:
 *  - GET  /dsh-skillmanager/list   — ctx.skills.snapshot() summaries
 *  - GET  /dsh-skillmanager/get    — full definition (content/path) by name
 *  - POST /dsh-skillmanager/toggle — flip model/user invocation in SKILL.md frontmatter
 * Skill file edits invalidate the filesystem provider's watch automatically.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
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

/** 分组信息：兼容 DHS frontmatter 的 metadata.group/subgroup（泰深式合集） */
export interface SkillGroupInfo {
  name: string
  description: string
  whenToUse?: string
  source: string
  provider: string
  invocation: { modelInvocable: boolean; userInvocable: boolean }
  group?: string
  subgroup?: string
  path?: string
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

/** 扫描技能文件系统（user-dsh / user-agents / bundled），解析 frontmatter。
 *  不依赖 ctx.skills 的 provider（web profile 无 preset 时 provider 未加载），
 *  管理以文件系统为准——与泰深 skill-manager 同款做法。 */
function scanSkills(): SkillGroupInfo[] {
  const roots: Array<{ dir: string; source: string }> = [
    { dir: join(homedir(), '.dsh', 'skills'), source: 'user-dsh' },
    { dir: join(process.env.DSH_AGENTS_HOME ?? join(homedir(), '.agents'), 'skills'), source: 'user-agents' },
  ]
  const bundled = process.env.DSH_BUNDLED_SKILL_DIR
  if (bundled !== undefined && bundled !== '') roots.push({ dir: bundled, source: 'bundled' })

  const out: SkillGroupInfo[] = []
  for (const root of roots) {
    if (!existsSync(root.dir)) continue
    let entries
    try {
      entries = readdirSync(root.dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const skillDir = join(root.dir, entry.name)
      const skillFile = join(skillDir, 'SKILL.md')
      if (!existsSync(skillFile)) continue
      try {
        const raw = readFileSync(skillFile, 'utf8')
        const doc = parseFrontmatter(raw)
        const invocation = (doc.data.invocation ?? {}) as Record<string, unknown>
        const meta = (doc.data.metadata ?? {}) as Record<string, unknown>
        out.push({
          name: typeof doc.data.name === 'string' ? doc.data.name : entry.name,
          description: typeof doc.data.description === 'string' ? doc.data.description : '',
          whenToUse: typeof doc.data.whenToUse === 'string' ? doc.data.whenToUse : undefined,
          invocation: {
            modelInvocable: typeof invocation.modelInvocable === 'boolean' ? invocation.modelInvocable : true,
            userInvocable: typeof invocation.userInvocable === 'boolean' ? invocation.userInvocable : true,
          },
          source: root.source,
          provider: 'skill-filesystem',
          group: typeof meta.group === 'string' ? meta.group : undefined,
          subgroup: typeof meta.subgroup === 'string' ? meta.subgroup : undefined,
          path: skillFile,
        })
      } catch {
        // 单个技能解析失败跳过
      }
    }
  }
  return out
}

function findSkill(name: string): SkillGroupInfo | undefined {
  return scanSkills().find((s) => s.name === name)
}

export function mountSkillManagerRoutes(host: SkillManagerHost): () => void {
  const disposers = [
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/list',
      handler: async (_request, response) => {
        try {
          sendJson(response, 200, { skills: scanSkills() })
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
          const skill = findSkill(name)
          if (skill === undefined || skill.path === undefined) {
            sendJson(response, 404, { error: `skill "${name}" not found` })
            return
          }
          const raw = readFileSync(skill.path, 'utf8')
          const doc = parseFrontmatter(raw)
          sendJson(response, 200, {
            skill: { ...skill, content: doc.content },
          })
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
          const skill = findSkill(name)
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
    // 合集管理：设置/清除技能的 group 与 subgroup（写入 frontmatter metadata，DHS 原生读取）
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-skillmanager/group',
      handler: async (request, response) => {
        if (!sameOrigin(request)) {
          sendJson(response, 403, { error: 'cross-origin request rejected' })
          return
        }
        try {
          const chunks: Buffer[] = []
          for await (const c of request) chunks.push(c as Buffer)
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
            name?: string; group?: string | null; subgroup?: string | null
          }
          if (body.name === undefined) {
            sendJson(response, 400, { error: 'name is required' })
            return
          }
          const skill = findSkill(body.name)
          if (skill === undefined || skill.path === undefined) {
            sendJson(response, 404, { error: `skill "${body.name}" is not file-backed` })
            return
          }
          const raw = readFileSync(skill.path, 'utf8')
          const doc = parseFrontmatter(raw)
          const metadata = (doc.data.metadata ?? {}) as Record<string, unknown>
          if (body.group === null || body.group === '') delete metadata.group
          else if (typeof body.group === 'string') metadata.group = body.group
          if (body.subgroup === null || body.subgroup === '') delete metadata.subgroup
          else if (typeof body.subgroup === 'string') metadata.subgroup = body.subgroup
          doc.data.metadata = metadata
          writeFileSync(skill.path, renderFrontmatter(doc))
          sendJson(response, 200, { ok: true, name: body.name, metadata })
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
