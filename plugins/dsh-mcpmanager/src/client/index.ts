/**
 * dsh-mcpmanager client: sidebar entry + MCP server config panel.
 * Lists/creates/edits/deletes mcp-client instances in the profile patch.
 */
import { createElement as h, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Translate } from './locales-types.ts'
import { zh, en } from './locales.ts'
import type { McpServerEntry } from './market-data.ts'

export const name = 'dsh-mcpmanager'
export const inject = ['slots', 'locale', 'sessions', 'workspaces']

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
const dangerBtn: React.CSSProperties = { ...btnStyle, color: '#cf222e', borderColor: '#f0c0c4' }
const itemStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border, #e6e6ee)', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
}
const emptyStyle: React.CSSProperties = { textAlign: 'center', color: 'var(--dsw-alias-label-secondary, #9aa0b4)', fontSize: 13, padding: 40 }
const formStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border, #e0e0ea)', borderRadius: 10, padding: 14, marginBottom: 12, background: 'var(--dsw-alias-surface-subtle, #fafbfc)',
}
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: '#57606a', margin: '8px 0 3px' }
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', border: '1px solid var(--dsw-alias-border, #d5d5e2)', borderRadius: 7,
  padding: '6px 9px', fontSize: 12, background: '#fff', color: '#1f2328',
}
const metaStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginTop: 4 }

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

function buildRestartPrompt(): string {
  return [
    '已修改 MCP server 配置，需要重启 DHS host 才能生效。',
    '请评估是否可以安全重启（保存当前会话状态后执行），并告知用户重启结果。',
  ].join('\n')
}

function MCPIcon(): ReactNode {
  return h('span', { style: { width: 16, height: 16, borderRadius: 4, background: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', flexShrink: 0 } }, 'M')
}

interface FormState {
  id: string
  serverName: string
  transport: string
  command: string
  args: string
  env: string
  cwd: string
}

const emptyForm: FormState = { id: '', serverName: '', transport: 'stdio', command: '', args: '', env: '', cwd: '' }

function McpPanel({ t, ctx, onClose }: { t: Translate; ctx: DiscoveryClientContext; onClose: () => void }) {
  const [servers, setServers] = useState<McpServerEntry[] | null>(null)
  const [patchPath, setPatchPath] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<FormState | null>(null)

  const load = (): void => {
    setError('')
    fetch('/dsh-mcpmanager/list', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { servers: McpServerEntry[]; patchPath: string }) => {
        setServers(body.servers ?? [])
        setPatchPath(body.patchPath ?? '')
      })
      .catch(() => setError(t('loadFail')))
  }
  useEffect(load, [])

  const startAdd = (): void => setEditing({ ...emptyForm })
  const startEdit = (s: McpServerEntry): void => setEditing({
    id: s.id,
    serverName: s.serverName,
    transport: s.transport,
    command: s.command ?? '',
    args: (s.args ?? []).join(', '),
    env: Object.entries(s.env ?? {}).map(([k, v]) => `${k}=${v}`).join(', '),
    cwd: s.cwd ?? '',
  })

  const save = (): void => {
    if (editing === null) return
    const config: Record<string, unknown> = {
      serverName: editing.serverName.trim() || editing.id.trim(),
      transport: editing.transport,
    }
    if (editing.command.trim() !== '') config.command = editing.command.trim()
    if (editing.args.trim() !== '') config.args = editing.args.split(',').map((s) => s.trim()).filter((s) => s !== '')
    if (editing.env.trim() !== '') {
      const env: Record<string, string> = {}
      for (const pair of editing.env.split(',')) {
        const idx = pair.indexOf('=')
        if (idx > 0) env[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim()
      }
      config.env = env
    }
    if (editing.cwd.trim() !== '') config.cwd = editing.cwd.trim()
    fetch('/dsh-mcpmanager/upsert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: editing.id.trim(), config }),
    })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string; resolvedNpx?: boolean }) => {
        if (body.ok) {
          setNotice(body.resolvedNpx === true ? t('npxResolved') : t('saved'))
          setEditing(null)
          load()
        } else {
          setError(body.error ?? t('saveFail'))
        }
      })
      .catch(() => setError(t('saveFail')))
  }

  const remove = (s: McpServerEntry): void => {
    if (!window.confirm(t('deleteConfirm').replace('{id}', s.id))) return
    fetch('/dsh-mcpmanager/delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: s.id }),
    })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string }) => {
        if (body.ok) {
          setNotice(t('saved'))
          load()
        } else {
          setError(body.error ?? t('saveFail'))
        }
      })
      .catch(() => setError(t('saveFail')))
  }

  const toggleEnabled = (s: McpServerEntry): void => {
    fetch('/dsh-mcpmanager/toggle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: s.id, enabled: !s.enabled }),
    })
      .then((res) => res.json())
      .then((body: { ok?: boolean; error?: string }) => {
        if (body.ok) {
          setNotice(t('saved'))
          load()
        } else {
          setError(body.error ?? t('saveFail'))
        }
      })
      .catch(() => setError(t('saveFail')))
  }

  const askRestart = (): void => {
    onClose()
    void openSessionAndSend(ctx, buildRestartPrompt())
  }

  const field = (key: keyof FormState, label: string): ReactNode => h('div', null,
    h('label', { style: labelStyle }, label),
    h('input', {
      style: inputStyle,
      value: editing![key] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing!, [key]: e.target.value }),
    }),
  )

  return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-divider, #ececf2)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      h('button', { type: 'button', style: primaryBtn, onClick: startAdd }, `+ ${t('add')}`),
      h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)' } }, t('restartNote')),
      h('span', { style: { flex: 1 } }),
      h('button', { type: 'button', style: btnStyle, onClick: askRestart }, t('restartWithLLM')),
    ),
    notice !== '' && h('div', { style: { padding: '6px 16px', fontSize: 12, color: '#1a7f37', background: '#e8f7ee' } }, notice),
    error !== '' && h('div', { style: emptyStyle }, error),
    servers === null && !error && h('div', { style: emptyStyle }, t('loading')),
    h('div', { style: { flex: 1, overflowY: 'auto', padding: 12 } },
      servers !== null && patchPath !== '' && h('div', { style: metaStyle }, `📄 ${patchPath}`),
      servers !== null && servers.length === 0 && h('div', { style: emptyStyle }, t('empty')),
      editing !== null && h('div', { style: formStyle },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' } },
          field('id', t('fieldId')),
          field('serverName', t('fieldServer')),
        ),
        h('label', { style: labelStyle }, t('fieldTransport')),
        h('select', {
          style: inputStyle,
          value: editing.transport,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, transport: e.target.value }),
        },
          h('option', { value: 'stdio' }, t('transportStdio')),
          h('option', { value: 'streamable-http' }, t('transportHttp')),
        ),
        field('command', t('fieldCommand')),
        field('args', t('fieldArgs')),
        field('env', t('fieldEnv')),
        field('cwd', t('fieldCwd')),
        h('div', { style: { marginTop: 12, display: 'flex', gap: 8 } },
          h('button', { type: 'button', style: primaryBtn, onClick: save }, t('save')),
          h('button', { type: 'button', style: btnStyle, onClick: () => setEditing(null) }, t('cancel')),
        ),
      ),
      servers !== null && servers.map((s) => h('div', { key: s.id, style: itemStyle },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
          h('span', { style: { fontSize: 13, fontWeight: 600, color: '#1f2328', fontFamily: 'monospace', opacity: s.enabled ? 1 : 0.45 } }, s.serverName),
          h('span', { style: { fontSize: 10, padding: '1px 7px', borderRadius: 9, background: s.transport === 'stdio' ? '#eef2ff' : '#fef3c7', color: s.transport === 'stdio' ? '#4f46e5' : '#b45309' } }, s.transport),
          h('span', { style: { fontSize: 10, padding: '1px 7px', borderRadius: 9, background: s.enabled ? '#e8f7ee' : '#f6f7f9', color: s.enabled ? '#1a7f37' : '#8b949e' } },
            s.enabled ? t('enabled') : t('disabled')),
          h('span', { style: { flex: 1 } }),
          h('button', { type: 'button', style: s.enabled ? btnStyle : { ...btnStyle, background: '#4176e6', borderColor: '#4176e6', color: '#fff' }, onClick: () => toggleEnabled(s) },
            s.enabled ? t('disableServer') : t('enableServer')),
          h('button', { type: 'button', style: btnStyle, onClick: () => startEdit(s) }, t('edit')),
          h('button', { type: 'button', style: dangerBtn, onClick: () => remove(s) }, t('delete')),
        ),
        h('div', { style: metaStyle }, `id: ${s.id}`),
        (s.command !== undefined || (s.args ?? []).length > 0) && h('div', { style: { fontSize: 11, color: '#57606a', marginTop: 3, fontFamily: 'monospace', opacity: s.enabled ? 1 : 0.5 } },
          [s.command, ...(s.args ?? [])].filter(Boolean).join(' '),
        ),
        s.env !== undefined && h('div', { style: metaStyle }, `env: ${Object.keys(s.env).join(', ')}`),
      )),
    ),
  )
}

export function apply(ctx: DiscoveryClientContext): void {
  const NS = 'dsh-mcpmanager'
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-mcpmanager: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('sidebar.primary.action', () => ctx.slots.register({
    name: 'sidebar.primary.action',
    id: 'dsh-mcpmanager',
    order: 3,
    locale: NS,
  }, (owner: { wide: boolean }) => h(McpTrigger, { wide: owner.wide ?? false, t, ctx })))
}

function McpTrigger({ wide, t, ctx }: { wide: boolean; t: Translate; ctx: DiscoveryClientContext }) {
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
      h(MCPIcon),
      wide && h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('nav')),
    ),
    open && h('div', { style: panelStyle, onClick: close },
      h('div', { style: cardStyle, onClick: (e: React.MouseEvent) => e.stopPropagation() },
        h('div', { style: headerStyle },
          h(MCPIcon),
          h('span', { style: { fontWeight: 600, fontSize: 14 } }, t('nav')),
          h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', fontWeight: 400 } }, t('subtitle')),
          h('span', { style: { flex: 1 } }),
          h('button', { ref: closeButton, style: closeStyle, onClick: close, 'aria-label': 'Close' }, '✕'),
        ),
        h('div', { style: { flex: 1, overflowY: 'hidden', padding: '0 4px' } }, h(McpPanel, { t, ctx, onClose: close })),
      ),
    ),
  )
}
