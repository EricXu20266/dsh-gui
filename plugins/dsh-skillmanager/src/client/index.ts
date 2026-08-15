/**
 * dsh-skillmanager client: sidebar entry + skill list panel.
 * Lists skills from the host registry, toggles invocation policy on disk,
 * and delegates creation/review to the host agent via session prompts.
 */
import { createElement as h, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Translate } from './locales-types.ts'
import { zh, en } from './locales.ts'
import { sourceLabel, SOURCE_ORDER, type SkillInfo, type SkillDetail } from './market-data.ts'

export const name = 'dsh-skillmanager'
export const inject = ['slots', 'locale', 'sessions', 'workspaces']

/* ── styles ─────────────────────────────────────────────────────────────── */

const panelStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--dsw-alias-mask, rgba(15,15,30,0.45))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const cardStyle: React.CSSProperties = {
  width: 900, maxWidth: '94vw', height: '82vh', background: 'var(--dsw-alias-surface, #fff)',
  borderRadius: 14, boxShadow: '0 24px 64px rgba(15,15,30,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
  borderBottom: '1px solid var(--dsw-alias-divider, #ececf2)', flexShrink: 0,
}
const closeStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border, #e0e0ea)', background: 'transparent', borderRadius: 8,
  width: 28, height: 28, cursor: 'pointer', fontSize: 13, color: '#555',
}
const btnStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border, #d5d5e2)', background: 'var(--dsw-alias-surface, #fff)',
  borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', color: '#333',
}
const primaryBtn: React.CSSProperties = {
  ...btnStyle, background: '#4176e6', borderColor: '#4176e6', color: '#fff',
}
const itemStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border, #e6e6ee)', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
}
const nameStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#1f2328', fontFamily: 'monospace' }
const descStyle: React.CSSProperties = { fontSize: 12, color: '#57606a', marginTop: 3 }
const metaStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginTop: 4 }
const badgeStyle: React.CSSProperties = {
  fontSize: 10, padding: '1px 7px', borderRadius: 9, background: '#eef2ff', color: '#4f46e5', marginRight: 6,
}
const toggleStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border, #d5d5e2)', background: 'transparent', borderRadius: 7,
  padding: '3px 9px', fontSize: 11, cursor: 'pointer', marginLeft: 6,
}
const toggleOnStyle: React.CSSProperties = { ...toggleStyle, background: '#e8f7ee', borderColor: '#bbe7cd', color: '#1a7f37' }
const toggleOffStyle: React.CSSProperties = { ...toggleStyle, background: '#f6f7f9', borderColor: '#e0e0ea', color: '#8b949e' }
const contentStyle: React.CSSProperties = {
  marginTop: 8, padding: 10, background: 'var(--dsw-alias-surface-subtle, #f6f7f9)', borderRadius: 8,
  fontSize: 12, color: '#3a3f4b', whiteSpace: 'pre-wrap', maxHeight: 260, overflowY: 'auto',
}
const emptyStyle: React.CSSProperties = { textAlign: 'center', color: 'var(--dsw-alias-label-secondary, #9aa0b4)', fontSize: 13, padding: 40 }

/* ── session helper (mirrors dsh-discovery) ─────────────────────────────── */

interface DiscoveryClientContext {
  workspaces: { list: { getSnapshot(): { items: Array<{ workspaceId: string; sessionIds: string[] }>; recentWorkspaceId?: string } }; startSession(): void; connectWorkspace(id: string): Promise<string> }
  sessions: { list: { getSnapshot(): { current?: string } }; open(id: string): void; scope(id: string): unknown }
  locale: { register(ns: string, dict: unknown): void; bind(ns: string): Translate }
  slots: { inject(name: string, fn: () => unknown): void; register(spec: unknown, render: (owner: { wide: boolean }) => ReactNode): unknown }
}

async function openSessionAndSend(ctx: DiscoveryClientContext, text: string): Promise<boolean> {
  const ws = ctx.workspaces.list.getSnapshot()
  const current = ctx.sessions.list.getSnapshot().current
  const currentWsId = current === undefined
    ? undefined
    : ws.items.find((item) => item.sessionIds.includes(current))?.workspaceId
  const target = currentWsId ?? ws.recentWorkspaceId
  if (target === undefined) {
    ctx.workspaces.startSession()
    return false
  }
  const sessionId = await ctx.workspaces.connectWorkspace(target)
  ctx.sessions.open(sessionId)
  const scoped = ctx.sessions.scope(sessionId)
  if (scoped === undefined) return false
  const conversation = scoped.get('conversation') as { send(text: string): Promise<void> }
  await conversation.send(text)
  return true
}

/* ── prompts ────────────────────────────────────────────────────────────── */

function buildReviewPrompt(skill: SkillInfo & { path?: string }, t: Translate): string {
  return [
    `请审查本机技能「${skill.name}」（${skill.path ?? skill.provider}）：`,
    '',
    `描述：${skill.description}`,
    skill.whenToUse !== undefined ? `触发时机：${skill.whenToUse}` : '',
    '',
    '审查要点：',
    '1. 指令质量：描述是否清晰、触发条件（whenToUse）是否明确、正文是否与描述一致',
    '2. 安全风险：是否存在提示注入风险、越权指令、敏感操作',
    '3. 改进建议：需要补充/修改哪些内容',
    '',
    '如需修改，直接使用文件工具编辑该技能文件（保留 YAML frontmatter 格式），完成后简述改了什么。',
  ].filter((line) => line !== '').join('\n')
}

function buildCreatePrompt(t: Translate): string {
  return [
    '请在本机技能目录创建一个新技能。',
    '',
    '步骤：',
    '1. 询问用户：技能名称（kebab-case）、一句话描述、触发时机、核心指令内容',
    '2. 创建目录 ~/.dsh/skills/<name>/，写入 SKILL.md（YAML frontmatter：name/description/whenToUse + 正文）',
    '3. 完成后告知路径与如何触发',
    '',
    '注意：技能名必须是小写 kebab-case；正文用 Markdown；不要创建与内置技能重名的技能。',
  ].join('\n')
}

/* ── components ─────────────────────────────────────────────────────────── */

function SkillIcon(): ReactNode {
  return h('span', { style: { width: 16, height: 16, borderRadius: 4, background: '#4176e6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', flexShrink: 0 } }, 'S')
}

function SkillPanel({ t, ctx, onClose }: { t: Translate; ctx: DiscoveryClientContext; onClose: () => void }) {
  const [skills, setSkills] = useState<SkillInfo[] | null>(null)
  const [detail, setDetail] = useState<SkillDetail | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<'all' | 'source' | 'group'>('all')

  const load = (): void => {
    setError('')
    fetch('/dsh-skillmanager/list', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { skills: SkillInfo[] }) => setSkills(body.skills ?? []))
      .catch(() => setError(t('loadFail')))
  }
  useEffect(load, [])

  const openDetail = (name: string): void => {
    setDetail(null)
    fetch(`/dsh-skillmanager/get?name=${encodeURIComponent(name)}`, { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { skill: SkillDetail }) => setDetail(body.skill))
      .catch(() => setError(t('loadFail')))
  }

  const toggle = (name: string, key: 'modelInvocable' | 'userInvocable', silent = false): void => {
    fetch(`/dsh-skillmanager/toggle?name=${encodeURIComponent(name)}&key=${key}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string }) => {
        if (body.ok) { if (!silent) load() }
        else if (!silent) setError(body.error ?? t('toggleFail'))
      })
      .catch(() => { if (!silent) setError(t('toggleFail')) })
  }

  // 批量：组内全部启用/禁用（model+user 双开关）
  const batchToggle = (list: SkillInfo[], target: 'on' | 'off'): void => {
    for (const skill of list) {
      const wantOn = target === 'on'
      if (skill.invocation.modelInvocable !== wantOn) toggle(skill.name, 'modelInvocable', true)
      if (skill.invocation.userInvocable !== wantOn) toggle(skill.name, 'userInvocable', true)
    }
    setTimeout(load, 400)
  }

  // 设置合集（group/subgroup）——简单交互：prompt 输入
  const setGroup = (skill: SkillInfo): void => {
    const current = skill.group ?? ''
    const group = window.prompt(`${t('setGroup')} — ${t('groupNamePh')}`, current)
    if (group === null) return
    const subgroup = window.prompt(t('subgroupNamePh'), skill.subgroup ?? '')
    if (subgroup === null) return
    fetch('/dsh-skillmanager/group', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: skill.name, group: group.trim() || null, subgroup: subgroup.trim() || null }),
    })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string }) => {
        if (body.ok) load()
        else setError(body.error ?? t('toggleFail'))
      })
      .catch(() => setError(t('toggleFail')))
  }

  const review = (skill: SkillInfo): void => {
    onClose()
    void openSessionAndSend(ctx, buildReviewPrompt(skill, t))
  }
  const create = (): void => {
    onClose()
    void openSessionAndSend(ctx, buildCreatePrompt(t))
  }

  const all = skills ?? []

  // 视图分组
  const renderGroup = (label: string, list: SkillInfo[]): ReactNode => h('div', { key: label },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 6px' } },
      h('span', { style: { fontSize: 11, fontWeight: 600, color: '#57606a' } }, `${label} (${list.length})`),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', style: btnStyle, onClick: () => batchToggle(list, 'on') }, t('enableAll')),
      h('button', { type: 'button', style: btnStyle, onClick: () => batchToggle(list, 'off') }, t('disableAll')),
    ),
    list.map((skill) => renderSkill(skill)),
  )

  const renderSkill = (skill: SkillInfo): ReactNode => h('div', { key: skill.name, style: itemStyle },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('span', { style: nameStyle }, skill.name),
      h('span', { style: badgeStyle }, skill.provider),
      skill.group !== undefined && h('span', { style: { fontSize: 10, padding: '1px 7px', borderRadius: 9, background: '#eef2ff', color: '#4f46e5', marginRight: 6 } },
        skill.subgroup !== undefined ? `${skill.group} / ${skill.subgroup}` : skill.group),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', style: btnStyle, onClick: () => setGroup(skill) }, t('setGroup')),
      h('button', {
        type: 'button',
        style: skill.invocation.modelInvocable ? toggleOnStyle : toggleOffStyle,
        onClick: () => toggle(skill.name, 'modelInvocable'),
        title: t('modelInvoke'),
      }, `${t('modelInvoke')}: ${skill.invocation.modelInvocable ? t('enabled') : t('disabled')}`),
      h('button', {
        type: 'button',
        style: skill.invocation.userInvocable ? toggleOnStyle : toggleOffStyle,
        onClick: () => toggle(skill.name, 'userInvocable'),
        title: t('userInvoke'),
      }, `${t('userInvoke')}: ${skill.invocation.userInvocable ? t('enabled') : t('disabled')}`),
      h('button', { type: 'button', style: btnStyle, onClick: () => openDetail(skill.name) }, t('viewDetail')),
      h('button', { type: 'button', style: btnStyle, onClick: () => review(skill) }, t('reviewSkill')),
    ),
    h('div', { style: descStyle }, skill.description),
    h('div', { style: metaStyle }, skill.whenToUse !== undefined ? `${t('whenToUse')}: ${skill.whenToUse}` : ''),
    detail !== null && detail.name === skill.name && h('div', { style: contentStyle },
      detail.path !== undefined && h('div', { style: metaStyle }, `${t('path')}: ${detail.path}`),
      h('div', { style: { fontWeight: 600, margin: '6px 0 3px' } }, `${t('contentPreview')} (${detail.content.length} chars)`),
      detail.content,
    ),
  )

  // 按来源分组
  const bySource = new Map<string, SkillInfo[]>()
  for (const skill of all) {
    const list = bySource.get(skill.source) ?? []
    list.push(skill)
    bySource.set(skill.source, list)
  }
  const orderedSources = [...bySource.keys()].sort((a, b) => {
    const ia = SOURCE_ORDER.indexOf(a as never)
    const ib = SOURCE_ORDER.indexOf(b as never)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b)
  })

  // 按合集分组
  const byGroup = new Map<string, SkillInfo[]>()
  for (const skill of all) {
    const key = skill.group ?? ''
    const list = byGroup.get(key) ?? []
    list.push(skill)
    byGroup.set(key, list)
  }
  const orderedGroups = [...byGroup.keys()].sort((a, b) => {
    if (a === '') return 1
    if (b === '') return -1
    return a.localeCompare(b, 'zh')
  })

  const viewBtn = (id: 'all' | 'source' | 'group', label: string): ReactNode => h('button', {
    type: 'button',
    style: view === id ? { ...btnStyle, background: '#4176e6', borderColor: '#4176e6', color: '#fff' } : btnStyle,
    onClick: () => setView(id),
  }, label)

  return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-divider, #ececf2)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
      h('button', { type: 'button', style: primaryBtn, onClick: create }, `+ ${t('createSkill')}`),
      h('span', { style: { flex: 1 } }),
      viewBtn('all', t('viewAll')),
      viewBtn('source', t('viewSource')),
      viewBtn('group', t('viewGroup')),
    ),
    error !== '' && h('div', { style: emptyStyle }, error),
    skills === null && !error && h('div', { style: emptyStyle }, t('loading')),
    skills !== null && skills.length === 0 && h('div', { style: emptyStyle }, t('empty')),
    skills !== null && h('div', { style: { flex: 1, overflowY: 'auto', padding: 12 } },
      h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginBottom: 8 } }, t('total').replace('{n}', String(skills.length))),
      view === 'all' && all.map(renderSkill),
      view === 'source' && orderedSources.map((source) => renderGroup(sourceLabel(source), bySource.get(source)!)),
      view === 'group' && orderedGroups.map((group) => renderGroup(group === '' ? t('noGroup') : group, byGroup.get(group)!)),
    ),
  )
}

/* ── entry ──────────────────────────────────────────────────────────────── */

export function apply(ctx: DiscoveryClientContext): void {
  const NS = 'dsh-skillmanager'
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-skillmanager: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('sidebar.primary.action', () => ctx.slots.register({
    name: 'sidebar.primary.action',
    id: 'dsh-skillmanager',
    order: 2,
    locale: NS,
  }, (owner: { wide: boolean }) => h(SkillTrigger, { wide: owner.wide ?? false, t, ctx })))
}

function SkillTrigger({ wide, t, ctx }: { wide: boolean; t: Translate; ctx: DiscoveryClientContext }) {
  const [open, setOpen] = useState(false)
  const close = (): void => setOpen(false)
  const closeButton = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open])
  useEffect(() => { if (open) closeButton.current?.focus() }, [open])

  const style: React.CSSProperties = wide
    ? { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', color: 'inherit', fontSize: 13 }
    : { width: 40, height: 40, border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit' }

  return h('div', { style: { display: 'contents' } },
    h('button', { type: 'button', style, title: t('nav'), 'aria-label': t('nav'), onClick: () => setOpen(true) },
      h(SkillIcon),
      wide && h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('nav')),
    ),
    open && h('div', { style: panelStyle, onClick: close },
      h('div', { style: cardStyle, onClick: (e: React.MouseEvent) => e.stopPropagation() },
        h('div', { style: headerStyle },
          h(SkillIcon),
          h('span', { style: { fontWeight: 600, fontSize: 14 } }, t('nav')),
          h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', fontWeight: 400 } }, t('subtitle')),
          h('span', { style: { flex: 1 } }),
          h('button', { ref: closeButton, style: closeStyle, onClick: close, 'aria-label': 'Close' }, '✕'),
        ),
        h('div', { style: { flex: 1, overflowY: 'hidden', padding: '0 4px' } }, h(SkillPanel, { t, ctx, onClose: close })),
      ),
    ),
  )
}
