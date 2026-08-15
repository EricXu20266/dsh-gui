/**
 * dsh-discovery client: the sidebar entry (under New Session) opens a
 * full-screen discovery browser. Read-only by design — listing comes from the
 * host's read-only GitHub proxy, and opening a repo is a plain external link.
 * There is deliberately no install / update / uninstall surface here:
 * installation happens via `dsh plugin add` after the user reviews a repo.
 */
import { createElement as h, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Translate } from './locales-types.ts'
import { zh, en } from './locales.ts'
import {
  filterPlugins, orderedCategories, isOfficial, SCENARIOS, scenarioPlugins,
  type PluginEntry, type PluginListing, type Scenario, type InstalledVersion,
} from './market-data.ts'

export const name = 'dsh-discovery'
// Locale + slots + session orchestration injected before apply runs.
export const inject = ['slots', 'locale', 'sessions', 'workspaces']

/** Listing 缓存：sessionStorage（关闭标签页 = app 重启即清空）+ TTL 定时过期。 */
const LISTING_TTL_MS = 10 * 60 * 1000
const LISTING_CACHE_KEY = 'dshd.listing.cache.v1'

function readListingCache(): PluginListing | null {
  try {
    const raw = sessionStorage.getItem(LISTING_CACHE_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw) as { at: number; data: PluginListing }
    return Date.now() - parsed.at < LISTING_TTL_MS ? parsed.data : null
  } catch {
    return null
  }
}

function writeListingCache(data: PluginListing): void {
  try {
    sessionStorage.setItem(LISTING_CACHE_KEY, JSON.stringify({ at: Date.now(), data }))
  } catch {
    // storage 不可用（隐私模式等）时静默降级为每次拉取
  }
}

export interface LocaleService {
  register(namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): unknown
  bind(namespace: string): Translate
  subscribe(callback: () => void): () => void
  getSnapshot(): { active: string }
}

export interface SlotsService {
  inject(slot: string, register: () => unknown): void
  register(meta: Record<string, unknown>, component: () => unknown): unknown
}

export interface SessionsService {
  list: { getSnapshot(): { current?: string } }
  open(id: string): void
  scope(id: string): { get(name: string): unknown } | undefined
}

export interface WorkspacesService {
  list: {
    getSnapshot(): {
      items: Array<{ sessionIds: string[]; workspaceId: string }>
      recentWorkspaceId?: string
    }
  }
  startSession(workspaceId?: string): void
  connectWorkspace(workspaceId: string): Promise<string>
}

export interface DiscoveryClientContext {
  effect(callback: () => unknown, label?: string): void
  locale: LocaleService
  slots: SlotsService
  sessions: SessionsService
  workspaces: WorkspacesService
}

/** DHS ui-primitives IconCordisPluginOutline14 path (linear plugin glyph). */
const PLUGIN_ICON_PATH = 'M3.03426 5.66661L1.70084 7.00003L3.0315 8.33069L2.14762 9.21457L-0.0669245 7.00003L2.15038 4.78273L3.03426 5.66661ZM7 14.067L4.77924 11.8462L5.66313 10.9623L7 12.2992L8.33342 10.9658L9.2173 11.8496L7 14.067ZM11.8489 9.21803L10.965 8.33414L12.2992 7.00003L10.9623 5.66316L11.8462 4.77927L14.0669 7.00003L11.8489 9.21803ZM8.33066 3.03153L7 1.70087L5.66589 3.03498L4.782 2.1511L7 -0.0668945L9.21454 2.14765L8.33066 3.03153Z'

function PluginIcon({ size = 14 }: { size?: number }) {
  return h('svg', {
    width: size, height: size, viewBox: '0 0 14 14', fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg', style: { flexShrink: 0 },
  },
    h('g', { clipPath: 'url(#dshd-plug-clip)' },
      h('path', { d: PLUGIN_ICON_PATH, fill: 'currentColor' }),
      h('rect', { x: 5.98535, y: 5.98535, width: 2.02942, height: 2.02942, fill: 'currentColor' }),
    ),
    h('defs', null, h('clipPath', { id: 'dshd-plug-clip' }, h('rect', { width: 14, height: 14, fill: 'currentColor' }))),
  )
}

/* ── inline styles (consistent with the taishen-style panel look) ─────────── */

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  width: '100%', height: 38, padding: '8px 16px', boxSizing: 'border-box',
  background: 'transparent', border: 'none', borderRadius: 12,
  color: 'var(--dsw-alias-label-primary, #c6c8d4)', font: '500 14px system-ui',
  lineHeight: '22px', cursor: 'pointer', textAlign: 'left', overflow: 'hidden',
  transition: 'background-color .15s ease, color .15s ease, transform .15s ease',
}
const btnHoverStyle: React.CSSProperties = {
  background: 'var(--dsw-alias-interactive-bg-hover, rgba(255,255,255,.06))',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)',
}
const railStyle: React.CSSProperties = {
  ...btnStyle, justifyContent: 'center', width: 36, height: 36, padding: 0, borderRadius: 8,
  color: 'var(--dsw-alias-label-secondary, #9aa0b4)',
}
const maskStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(8,8,16,.6)', zIndex: 1000 }
const panelStyle: React.CSSProperties = {
  position: 'absolute', inset: '28px 32px', maxWidth: 1180, margin: '0 auto',
  background: 'var(--dsw-alias-bg-layer-1, #14141f)',
  border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', borderRadius: 16,
  boxShadow: '0 24px 64px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
}
const headerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)', font: '600 15px system-ui', flexShrink: 0,
}
const closeStyle: React.CSSProperties = {
  marginLeft: 'auto', background: 'var(--dsw-alias-button-elevated-fill, #2a2a4a)',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)', border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
  borderRadius: 6, padding: '4px 12px', cursor: 'pointer', font: '12px system-ui',
}
const bodyStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }
const searchStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box',
  border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
  background: 'var(--dsw-alias-bg-layer-2, #1c1c2e)', color: 'var(--dsw-alias-label-primary, #e0e0f0)',
  font: '13px system-ui', outline: 'none', marginBottom: 12,
}
const catRowStyle: React.CSSProperties = { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }
const catStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary, #9aa0b4)',
  fontSize: 12, padding: '4px 12px', borderRadius: 999, cursor: 'pointer',
  transition: 'background-color .15s ease, color .15s ease',
}
const catOnStyle: React.CSSProperties = {
  ...catStyle, background: 'var(--dsw-alias-bg-layer-2, #2a2a4a)',
  color: 'var(--dsw-alias-brand-primary, #7aa2ff)', fontWeight: 600,
}
const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }
const cardStyle: React.CSSProperties = {
  background: 'var(--dsw-alias-bg-layer-1, #1a1a2b)',
  border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', borderRadius: 12, padding: '14px 16px',
  display: 'flex', flexDirection: 'column', gap: 8, transition: 'border-color .15s ease, transform .15s ease',
}
const nameStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #e0e0f0)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}
const ownerStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)' }
const descStyle: React.CSSProperties = {
  fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, #9aa0b4)',
  minHeight: 36, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
}
const metaStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginTop: 'auto' }
const repoBtnStyle: React.CSSProperties = {
  marginLeft: 'auto', border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
  background: 'var(--dsw-alias-button-elevated-fill, #2a2a4a)',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 11, textDecoration: 'none',
  transition: 'border-color .15s ease, background-color .15s ease',
}
const disclaimerStyle: React.CSSProperties = {
  fontSize: 11, lineHeight: '16px', color: 'var(--dsw-alias-label-tertiary, #7c7c9c)',
  background: 'var(--dsw-alias-bg-layer-2, #1c1c2e)', borderRadius: 8, padding: '8px 12px', margin: '0 0 12px',
}
const loadingStyle: React.CSSProperties = { textAlign: 'center', color: 'var(--dsw-alias-label-secondary, #9aa0b4)', fontSize: 13, padding: 48 }
const emptyStyle: React.CSSProperties = { textAlign: 'center', color: 'var(--dsw-alias-label-secondary, #9aa0b4)', fontSize: 13, padding: 32 }

const badgeOfficialStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 600,
  color: '#ffffff', padding: '2px 8px', borderRadius: 999, lineHeight: '16px',
  background: 'var(--dsw-static-deepseek-500, #4176E6)', flexShrink: 0,
}
const badgeThirdStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 600,
  color: 'var(--dsw-alias-label-tertiary, #7c7c9c)', padding: '1px 7px', borderRadius: 999, lineHeight: '16px',
  border: '1px solid currentColor', flexShrink: 0,
}
const installedBadgeStyle: React.CSSProperties = {
  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', flexShrink: 0,
}
const cardFooterStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto',
}
const cardBtnGroupStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
}
const cardBtnStyle: React.CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l2, #3a3a5a)',
  background: 'var(--dsw-alias-button-elevated-fill, #2a2a4a)',
  color: 'var(--dsw-alias-label-primary, #e0e0f0)', borderRadius: 6,
  padding: '4px 10px', cursor: 'pointer', fontSize: 11,
  transition: 'border-color .15s ease, background-color .15s ease, color .15s ease',
}
const cardBtnPrimaryStyle: React.CSSProperties = {
  ...cardBtnStyle,
  color: 'var(--dsw-static-deepseek-500, #4176E6)',
}
/** Hover micro-interaction for card / scenario / header buttons (CSS class). */
const HOVER_CSS = '.dshd-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08)) !important;border-color:var(--dsw-alias-brand-primary,#7aa2ff) !important}'
const tabRowStyle: React.CSSProperties = {
  display: 'flex', gap: 4, marginBottom: 12,
}
const tabStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', color: 'var(--dsw-alias-label-secondary, #9aa0b4)',
  fontSize: 13, padding: '8px 16px', cursor: 'pointer', borderRadius: 8,
  transition: 'background-color .15s ease, color .15s ease',
}
const tabOnStyle: React.CSSProperties = {
  ...tabStyle,
  background: 'var(--dsw-static-deepseek-500, #4176E6)',
  color: '#ffffff', fontWeight: 600,
}
const scenarioCardStyle: React.CSSProperties = {
  background: 'var(--dsw-alias-bg-layer-1, #1a1a2b)', border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)',
  borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10,
}
const scenarioTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #e0e0f0)' }
const scenarioDescStyle: React.CSSProperties = { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary, #9aa0b4)', minHeight: 18 }
const scenarioCountStyle: React.CSSProperties = { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)' }
const scenarioBtnRowStyle: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 4 }
const repoPanelStyle: React.CSSProperties = {
  position: 'absolute', inset: '28px 32px', maxWidth: 900, margin: '0 auto',
  background: 'var(--dsw-alias-bg-layer-1, #14141f)', border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)',
  borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  zIndex: 1100,
}
const mdBodyStyle: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: '16px 20px', font: '13px/1.7 system-ui',
  color: 'var(--dsw-alias-label-secondary, #c6c8d4)',
}
const mdH1Style: React.CSSProperties = { fontSize: 22, fontWeight: 700, margin: '20px 0 10px', color: 'var(--dsw-alias-label-primary, #e0e0f0)', borderBottom: '1px solid var(--dsw-alias-border-l2, #2e2e4a)', paddingBottom: 8 }
const mdH2Style: React.CSSProperties = { fontSize: 18, fontWeight: 600, margin: '18px 0 8px', color: 'var(--dsw-alias-label-primary, #e0e0f0)' }
const mdH3Style: React.CSSProperties = { fontSize: 15, fontWeight: 600, margin: '14px 0 6px', color: 'var(--dsw-alias-label-primary, #e0e0f0)' }
const mdParaStyle: React.CSSProperties = { fontSize: 13, lineHeight: '22px', margin: '8px 0' }
const mdCodeBlockStyle: React.CSSProperties = {
  background: 'var(--dsw-alias-bg-layer-2, #1c1c2e)', border: '1px solid var(--dsw-alias-border-l2, #2e2e4a)',
  borderRadius: 8, padding: '12px 14px', margin: '10px 0', overflowX: 'auto',
  font: '12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--dsw-alias-label-primary, #e0e0f0)', whiteSpace: 'pre',
}
const mdInlineCodeStyle: React.CSSProperties = { background: 'var(--dsw-alias-bg-layer-2, #1c1c2e)', borderRadius: 4, padding: '1px 5px', font: '12px ui-monospace, Menlo, monospace', color: 'var(--dsw-alias-brand-primary, #7aa2ff)' }
const mdListItemStyle: React.CSSProperties = { fontSize: 13, lineHeight: '22px', margin: '3px 0', paddingLeft: 4 }
const mdQuoteStyle: React.CSSProperties = { borderLeft: '3px solid var(--dsw-alias-brand-primary, #7aa2ff)', padding: '4px 12px', margin: '10px 0', color: 'var(--dsw-alias-label-tertiary, #9aa0b4)' }
const mdLinkStyle: React.CSSProperties = { color: 'var(--dsw-alias-brand-primary, #7aa2ff)', textDecoration: 'none' }

function StarIcon() {
  return h('svg', { width: 11, height: 11, viewBox: '0 0 14 14', fill: 'currentColor', style: { flexShrink: 0 } },
    h('path', { d: 'M7 0.5L8.9 4.8L13.5 5.3L10.2 8.4L11 13L7 10.7L3 13L3.8 8.4L0.5 5.3L5.1 4.8L7 0.5Z' }),
  )
}

/** 已安装对勾图标（平面 SVG：浅蓝圆底 + 蓝色对勾）。 */
function InstalledIcon() {
  return h('svg', { width: 13, height: 13, viewBox: '0 0 14 14', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', style: { flexShrink: 0 } },
    h('circle', { cx: 7, cy: 7, r: 6.2, fill: 'var(--dsw-static-deepseek-500, #4176E6)', opacity: 0.16 }),
    h('path', { d: 'M4 7.2L6.2 9.4L10.2 5.2', stroke: 'var(--dsw-static-deepseek-500, #4176E6)', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }),
  )
}

/** 是否已安装：仓库名匹配已安装包名（忽略 npm scope 前缀与大小写）。 */
function isInstalled(plugin: PluginEntry, installed: string[]): boolean {
  const names = new Set(installed.map((n) => (n.split('/').pop() ?? n).toLowerCase()))
  return names.has(plugin.name.toLowerCase())
}

/** ISO 时间 → 本地 HH:mm。 */
function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function PluginCard({ plugin, t, installed, onReview, onViewRepo, onCheckUpdate }: {
  plugin: PluginEntry
  t: Translate
  installed: boolean
  onReview: (plugin: PluginEntry) => void
  onViewRepo: (plugin: PluginEntry) => void
  onCheckUpdate: (plugin: PluginEntry) => void
}) {
  const official = isOfficial(plugin)
  return h('div', { style: cardStyle },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
      h('div', { style: { width: 30, height: 30, borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2, #2a2a4a)', display: 'grid', placeItems: 'center', flexShrink: 0 } },
        h(PluginIcon, { size: 14 }),
      ),
      h('div', { style: { minWidth: 0 } },
        h('div', { style: nameStyle }, plugin.name),
        h('div', { style: ownerStyle }, `${plugin.owner} / ${plugin.name}`),
      ),
      installed && h('span', { style: installedBadgeStyle, title: t('installedTooltip') }, h(InstalledIcon)),
    ),
    h('p', { style: descStyle }, plugin.description || '—'),
    h('div', { style: metaStyle },
      h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 3 } }, h(StarIcon), plugin.stars),
      plugin.language !== null && h('span', null, plugin.language),
      plugin.updatedAt !== '' && h('span', null, t('updated') + ' ' + plugin.updatedAt.slice(0, 10)),
    ),
    h('div', { style: cardFooterStyle },
      h('span', { style: official ? badgeOfficialStyle : badgeThirdStyle }, official ? t('official') : t('thirdParty')),
      h('div', { style: cardBtnGroupStyle },
        installed
          ? h('button', { type: 'button', className: 'dshd-btn', style: cardBtnPrimaryStyle, title: t('checkUpdate'), onClick: () => onCheckUpdate(plugin) }, t('checkUpdate'))
          : h('button', { type: 'button', className: 'dshd-btn', style: cardBtnPrimaryStyle, title: t('reviewInstall'), onClick: () => onReview(plugin) }, t('reviewInstall')),
        h('button', { type: 'button', className: 'dshd-btn', style: cardBtnStyle, title: t('viewRepo'), onClick: () => onViewRepo(plugin) }, t('viewRepo')),
      ),
    ),
  )
}

/** Resolve the target workspace, open a fresh session, and send one prompt into it. */
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

function buildReviewPrompt(plugin: PluginEntry, t: Translate): string {
  return [
    `请审查并安装插件仓库：${plugin.htmlUrl}（${plugin.owner}/${plugin.name}）`,
    '',
    '请先审查该仓库源码（README、package.json、入口代码、依赖），重点确认：',
    '1. 无恶意行为（异常网络请求、文件读写、环境变量/密钥窃取、命令执行）',
    '2. 与描述相符，无隐藏后门',
    '3. 许可证与依赖安全',
    '',
    '审查通过后，使用 dsh plugin add 安装该插件。若发现风险，请列出风险点并停止安装。',
    '',
    t('networkNote'),
  ].join('\n')
}

function buildCheckUpdatePrompt(plugin: PluginEntry): string {
  return [
    `请检查已安装插件 ${plugin.owner}/${plugin.name} 是否有可用更新：${plugin.htmlUrl}`,
    '',
    '请检查该插件的当前安装版本与最新版本（npm registry 或 GitHub releases）：',
    '1. 对比已安装版本与最新版本',
    '2. 如有更新，简述更新内容（changelog / releases）',
    '3. 更新前必须先审查新版本的安全性（重点对比新旧版本差异，警惕供应链投毒/维护者账号被盗）：',
    '   - 依赖变更：新增了哪些依赖？来源是否可信？有无依赖投毒风险？',
    '   - 代码变更：是否新增网络请求、文件读写、环境变量/密钥访问、命令执行等敏感行为？',
    '   - 权限变化：是否要求额外权限或修改配置？',
    '4. 审查通过后才使用 dsh plugin update 更新；若发现任何风险，列出风险点并停止更新',
  ].join('\n')
}

/**
 * 一键更新 prompt：版本比对已由代码完成（确定性操作），清单是「哪些插件有更新 + 新旧版本」，
 * LLM 只负责对每个候选做安全审查（依赖/代码/权限变更）与安装执行。
 */
function buildBulkUpdatePrompt(updates: InstalledVersion[], t: Translate): string {
  const lines = updates.map((p) => `- ${p.name}：当前 ${p.current} → 最新 ${p.latest ?? '?'}`)
  return [
    '以下已安装插件有可用更新（版本已由插件搜索插件代码比对完成，最新版来源 npm registry）：',
    '',
    ...lines,
    '',
    '请逐个更新，但更新前必须先安全审查每个插件的新版本（重点对比新旧版本差异，警惕供应链投毒/维护者账号被盗）：',
    '1. 依赖变更：新增了哪些依赖？来源是否可信？有无投毒风险？',
    '2. 代码变更：是否新增网络请求、文件读写、环境变量/密钥访问、命令执行等敏感行为？',
    '3. 权限变化：是否要求额外权限或修改配置？',
    '',
    '审查通过后才使用 dsh plugin update 更新该插件；若发现任何风险，列出风险点并停止更新该插件。',
    '完成后简述：更新了哪些、跳过了哪些及原因。',
    '',
    t('networkNote'),
  ].join('\n')
}

function scenarioLines(plugins: PluginEntry[]): string[] {
  return plugins.slice(0, 20).map((p) =>
    `- ${p.owner}/${p.name}（⭐${p.stars}，更新于 ${p.updatedAt.slice(0, 10)}）：${p.description || '—'}`)
}

function buildScenarioBatchPrompt(scenario: Scenario, plugins: PluginEntry[], t: Translate): string {
  return [
    `请为「${t(`scenario_${scenario.id}`)}」场景安装匹配插件。`,
    '',
    `场景需求：${t(`scenario_${scenario.id}_desc`)}`,
    '',
    '候选插件清单（已按 star 数排序）：',
    ...scenarioLines(plugins),
    '',
    '请自主判断并安装：',
    '1. 不要安装功能重复的插件（同类功能只选最优，以 star 数和更新时间为准）',
    '2. 安装前先审查每个候选仓库的安全性',
    '3. 使用 dsh plugin add 安装筛选后的插件',
    '4. 完成后简述安装了哪些、为什么选它们',
    '',
    t('networkNote'),
  ].join('\n')
}

function buildScenarioCustomPrompt(scenario: Scenario, plugins: PluginEntry[], t: Translate): string {
  return [
    `请为「${t(`scenario_${scenario.id}`)}」场景评估插件。`,
    '',
    `场景需求：${t(`scenario_${scenario.id}_desc`)}`,
    '',
    '候选插件清单（已按 star 数排序）：',
    ...scenarioLines(plugins),
    '',
    '请评估后给出推荐列表和推荐理由（先不要安装）：',
    '1. 推荐安装哪些插件、各自理由',
    '2. 不推荐哪些、原因（功能重复 / 质量 / 安全）',
    '3. 等我确认后再安装',
    '',
    t('networkNote'),
  ].join('\n')
}

/* ── lightweight markdown renderer (zero-dependency) ─────────────────────── */

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let last = 0
  let key = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(h('code', { key: key++, style: mdInlineCodeStyle }, token.slice(1, -1)))
    } else if (token.startsWith('**')) {
      nodes.push(h('strong', { key: key++ }, token.slice(2, -2)))
    } else if (token.startsWith('*')) {
      nodes.push(h('em', { key: key++ }, token.slice(1, -1)))
    } else {
      const link = token.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (link) nodes.push(h('a', { key: key++, href: link[2], target: '_blank', rel: 'noreferrer', style: mdLinkStyle }, link[1]))
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderMarkdown(md: string): ReactNode[] {
  const lines = md.split('\n')
  const nodes: ReactNode[] = []
  let key = 0
  let inCode = false
  let codeLines: string[] = []
  let i = 0

  const flushCode = (): void => {
    if (codeLines.length > 0) {
      nodes.push(h('pre', { key: key++, style: mdCodeBlockStyle }, h('code', null, codeLines.join('\n'))))
      codeLines = []
    }
  }

  while (i < lines.length) {
    const line = lines[i]
    if (line.trimStart().startsWith('```')) {
      if (inCode) { flushCode(); inCode = false } else { inCode = true }
      i++
      continue
    }
    if (inCode) { codeLines.push(line); i++; continue }
    if (line.trim() === '') { i++; continue }

    const hMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (hMatch) {
      const level = hMatch[1].length
      const style = level <= 1 ? mdH1Style : level === 2 ? mdH2Style : mdH3Style
      const tag = level <= 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      nodes.push(h(tag, { key: key++, style }, renderInline(hMatch[2])))
      i++
      continue
    }

    const ulMatch = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ulMatch) {
      nodes.push(h('div', { key: key++, style: mdListItemStyle },
        h('span', { style: { color: 'var(--dsw-alias-brand-primary, #7aa2ff)' } }, '• '), renderInline(ulMatch[1])))
      i++
      continue
    }

    const olMatch = line.match(/^\s*(\d+)\.\s+(.*)$/)
    if (olMatch) {
      nodes.push(h('div', { key: key++, style: mdListItemStyle },
        h('span', { style: { color: 'var(--dsw-alias-label-secondary, #7c7c9c)' } }, `${olMatch[1]}. `), renderInline(olMatch[2])))
      i++
      continue
    }

    const quoteMatch = line.match(/^\s*>\s?(.*)$/)
    if (quoteMatch) {
      nodes.push(h('blockquote', { key: key++, style: mdQuoteStyle }, renderInline(quoteMatch[1])))
      i++
      continue
    }

    nodes.push(h('p', { key: key++, style: mdParaStyle }, renderInline(line)))
    i++
  }
  if (inCode) flushCode()
  return nodes
}

function RepoPreview({ plugin, t, onClose }: { plugin: PluginEntry; t: Translate; onClose: () => void }) {
  const [state, setState] = useState<'loading' | 'error' | 'done'>('loading')
  const [readme, setReadme] = useState('')

  useEffect(() => {
    setState('loading')
    setReadme('')
    const url = `/dsh-discovery/readme?owner=${encodeURIComponent(plugin.owner)}&repo=${encodeURIComponent(plugin.name)}`
    fetch(url, { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { markdown: string }) => { setReadme(body.markdown); setState('done') })
      .catch(() => setState('error'))
  }, [plugin.owner, plugin.name])

  return h('div', { style: maskStyle, onClick: onClose },
    h('div', { style: repoPanelStyle, onClick: (e: React.MouseEvent) => e.stopPropagation() },
      h('div', { style: headerStyle },
        h(PluginIcon, { size: 15 }),
        h('span', { style: { flex: 1 } }, `${plugin.owner}/${plugin.name}`),
        h('a', { href: plugin.htmlUrl, target: '_blank', rel: 'noreferrer', className: 'dshd-btn', style: repoBtnStyle, title: t('openOnGitHub') }, t('openOnGitHub')),
        h('button', { className: 'dshd-btn', style: closeStyle, onClick: onClose, 'aria-label': '关闭', title: '关闭' }, '✕'),
      ),
      state === 'loading' && h('div', { style: loadingStyle }, t('readmeLoading')),
      state === 'error' && h('div', { style: emptyStyle }, t('readmeFail')),
      state === 'done' && (readme === '' ? h('div', { style: emptyStyle }, t('noReadme')) : h('div', { style: mdBodyStyle }, renderMarkdown(readme))),
    ),
  )
}

function ScenarioPanel({ listing, t, onInstall, onCustom }: {
  listing: PluginListing | null
  t: Translate
  onInstall: (scenario: Scenario, plugins: PluginEntry[]) => void
  onCustom: (scenario: Scenario, plugins: PluginEntry[]) => void
}) {
  return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    h('p', { style: disclaimerStyle }, `⚠️ ${t('disclaimerBody')}`),
    h('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--dsw-alias-label-primary, #e0e0f0)', margin: '0 0 12px' } }, t('scenariosTitle')),
    h('div', { style: { ...bodyStyle, flex: 1 } },
      h('div', { style: gridStyle },
        SCENARIOS.map((scenario) => {
          const matched = scenarioPlugins(listing, scenario)
          return h('div', { key: scenario.id, style: scenarioCardStyle },
            h('div', { style: scenarioTitleStyle }, t(`scenario_${scenario.id}`)),
            h('div', { style: scenarioDescStyle }, t(`scenario_${scenario.id}_desc`)),
            h('div', { style: scenarioCountStyle }, t('scenarioMatchCount').replace('{n}', String(matched.length))),
            h('div', { style: scenarioBtnRowStyle },
              h('button', { type: 'button', className: 'dshd-btn', style: cardBtnPrimaryStyle, title: t('installAll'), onClick: () => onInstall(scenario, matched) }, t('installAll')),
              h('button', { type: 'button', className: 'dshd-btn', style: cardBtnStyle, title: t('customInstall'), onClick: () => onCustom(scenario, matched) }, t('customInstall')),
            ),
          )
        }),
      ),
    ),
  )
}

function DiscoveryBrowser({ t, ctx, onClose, onFetched }: {
  t: Translate
  ctx: DiscoveryClientContext
  onClose: () => void
  onFetched: (at: string) => void
}) {
  const [tab, setTab] = useState<'browse' | 'scenario' | 'installed'>('browse')
  const [listing, setListing] = useState<PluginListing | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [installed, setInstalled] = useState<string[]>([])
  const [installedVersions, setInstalledVersions] = useState<InstalledVersion[] | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [preview, setPreview] = useState<PluginEntry | null>(null)

  const load = (): void => {
    setLoadError(false)
    // sessionStorage 缓存：TTL 内直接使用，避免每次打开面板都重新拉取 GitHub
    const cached = readListingCache()
    if (cached !== null) {
      setListing(cached)
      onFetched(cached.fetchedAt)
      return
    }
    fetch('/dsh-discovery/listing', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: PluginListing) => {
        writeListingCache(body)
        setListing(body)
        onFetched(body.fetchedAt)
      })
      .catch(() => setLoadError(true))
  }
  useEffect(load, [])
  useEffect(() => {
    fetch('/dsh-discovery/installed', { cache: 'no-store' })
      .then((res) => { if (!res.ok) return []; return res.json() })
      .then((body: { installed: string[] }) => setInstalled(body.installed ?? []))
      .catch(() => setInstalled([]))
  }, [])
  // 已安装插件版本比对（代码侧：读当前版本 + 查 npm 最新版）
  useEffect(() => {
    fetch('/dsh-discovery/installed-versions', { cache: 'no-store' })
      .then((res) => { if (!res.ok) throw new Error('HTTP ' + String(res.status)); return res.json() })
      .then((body: { plugins: InstalledVersion[] }) => setInstalledVersions(body.plugins ?? []))
      .catch(() => setInstalledVersions([]))
  }, [])

  const cats = useMemo(() => orderedCategories(listing), [listing])
  const plugins = useMemo(() => filterPlugins(listing, { q, cat }), [listing, q, cat])

  const handleReview = (plugin: PluginEntry): void => {
    onClose()
    void openSessionAndSend(ctx, buildReviewPrompt(plugin, t))
  }
  const handleCheckUpdate = (plugin: PluginEntry): void => {
    onClose()
    void openSessionAndSend(ctx, buildCheckUpdatePrompt(plugin))
  }
  const handleInstall = (scenario: Scenario, matched: PluginEntry[]): void => {
    onClose()
    void openSessionAndSend(ctx, buildScenarioBatchPrompt(scenario, matched, t))
  }
  const handleCustom = (scenario: Scenario, matched: PluginEntry[]): void => {
    onClose()
    void openSessionAndSend(ctx, buildScenarioCustomPrompt(scenario, matched, t))
  }
  const handleUpdateAll = (): void => {
    const updates = (installedVersions ?? []).filter((p) => p.hasUpdate)
    if (updates.length === 0) return
    onClose()
    void openSessionAndSend(ctx, buildBulkUpdatePrompt(updates, t))
  }

  return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    h('div', { style: tabRowStyle },
      h('button', { type: 'button', style: tab === 'browse' ? tabOnStyle : tabStyle, onClick: () => setTab('browse') }, t('all')),
      h('button', { type: 'button', style: tab === 'scenario' ? tabOnStyle : tabStyle, onClick: () => setTab('scenario') }, t('scenariosTab')),
      h('button', { type: 'button', style: tab === 'installed' ? tabOnStyle : tabStyle, onClick: () => setTab('installed') }, t('installedTab')),
    ),
    tab === 'browse' && h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
      h('p', { style: disclaimerStyle }, `⚠️ ${t('disclaimerBody')}`),
      h('input', {
        style: searchStyle,
        placeholder: t('searchPh'),
        value: q,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value),
      }),
      h('div', { style: catRowStyle },
        h('button', { style: cat === 'all' ? catOnStyle : catStyle, onClick: () => setCat('all') }, t('all')),
        cats.map((c) => h('button', {
          key: c.id,
          style: cat === c.id ? catOnStyle : catStyle,
          onClick: () => setCat(c.id),
        }, `${t('category_' + c.id)} (${c.count})`)),
      ),
      h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginBottom: 10 } },
        t('total').replace('{n}', String(listing?.total ?? 0)) + ' · ' + t('fetchedFrom'),
      ),
      h('div', { style: bodyStyle, flex: 1 },
        loadError && h('div', { style: emptyStyle }, t('loadFail') + ' — ' + t('refresh')),
        !loadError && listing === null && h('div', { style: loadingStyle }, t('loading')),
        !loadError && listing !== null && plugins.length === 0 && h('div', { style: emptyStyle }, t('empty')),
        !loadError && listing !== null && plugins.length > 0 && h('div', { style: gridStyle },
          plugins.map((p) => h(PluginCard, {
            key: p.htmlUrl, plugin: p, t, installed: isInstalled(p, installed),
            onReview: handleReview, onViewRepo: (x) => setPreview(x), onCheckUpdate: handleCheckUpdate,
          })),
        ),
      ),
    ),
    tab === 'scenario' && h(ScenarioPanel, { listing, t, onInstall: handleInstall, onCustom: handleCustom }),
    tab === 'installed' && h(InstalledPanel, { t, versions: installedVersions, onUpdateAll: handleUpdateAll }),
    preview !== null && h(RepoPreview, { plugin: preview, t, onClose: () => setPreview(null) }),
  )
}

/** 已安装 tab：顶部一键更新 + 已安装插件版本列表（代码侧比对结果）。 */
function InstalledPanel({ t, versions, onUpdateAll }: {
  t: Translate
  versions: InstalledVersion[] | null
  onUpdateAll: () => void
}) {
  const updatable = (versions ?? []).filter((p) => p.hasUpdate)
  const badgeText = (p: InstalledVersion): string => p.hasUpdate
    ? t('updateAvailable')
    : (p.latest !== null ? t('upToDate') : t('versionUnknown'))
  const badgeStyleOf = (p: InstalledVersion): React.CSSProperties => p.hasUpdate
    ? { fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#fff4e5', color: '#b45309', whiteSpace: 'nowrap' }
    : { fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#e8f7ee', color: '#1a7f37', whiteSpace: 'nowrap' }
  return h('div', { style: { height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 } },
    h('div', { style: { padding: '12px 14px', borderBottom: '1px solid var(--dsw-alias-divider, #ececf2)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
      h('button', {
        type: 'button',
        style: {
          ...btnStyle,
          background: '#4176e6',
          borderColor: '#4176e6',
          color: '#fff',
          opacity: updatable.length === 0 ? 0.5 : 1,
          cursor: updatable.length === 0 ? 'default' : 'pointer',
        },
        onClick: onUpdateAll,
        disabled: updatable.length === 0,
      }, `${t('updateAll')}${updatable.length > 0 ? ` (${updatable.length})` : ''}`),
      h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)' } }, t('updateAllNote')),
    ),
    h('div', { style: { flex: 1, overflowY: 'auto', padding: 8 } },
      versions === null && h('div', { style: loadingStyle }, t('updateLoading')),
      versions !== null && versions.length === 0 && h('div', { style: emptyStyle }, t('noInstalled')),
      versions !== null && versions.length > 0 && updatable.length === 0 && h('div', { style: emptyStyle }, t('updateEmpty')),
      versions !== null && versions.map((p) => h('div', { key: p.name, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--dsw-alias-border, #e6e6ee)', marginBottom: 6 } },
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: 13, fontWeight: 600, color: '#1f2328', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.name),
          h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', marginTop: 2 } },
            `${t('currentVersion')} ${p.current}` + (p.latest !== null ? ` → ${t('latestVersion')} ${p.latest}` : ''),
          ),
        ),
        h('span', { style: badgeStyleOf(p) }, badgeText(p)),
      )),
    ),
  )
}

export function apply(ctx: DiscoveryClientContext): void {
  const NS = 'dsh-discovery'
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-discovery: dictionaries')
  const t = ctx.locale.bind(NS)

  ctx.slots.inject('sidebar.primary.action', () => ctx.slots.register({
    name: 'sidebar.primary.action',
    id: 'dsh-discovery',
    order: 1,
    locale: NS,
  }, (owner: { wide: boolean }) => h(DiscoveryTrigger, { wide: owner.wide ?? false, t, ctx })))
}

function DiscoveryTrigger({ wide, t, ctx }: { wide: boolean; t: Translate; ctx: DiscoveryClientContext }) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [fetchedAt, setFetchedAt] = useState('')
  const close = (): void => setOpen(false)
  const closeButton = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open])
  useEffect(() => { if (open) closeButton.current?.focus() }, [open])

  const style = wide ? { ...btnStyle, ...(hovered ? btnHoverStyle : null) } : railStyle

  return h('div', { style: { display: 'contents' } },
    h('style', null, HOVER_CSS),
    h('button', {
      type: 'button',
      style,
      title: t('nav'),
      'aria-label': t('nav'),
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onClick: () => setOpen(true),
    },
      h(PluginIcon, { size: wide ? 15 : 18 }),
      wide && h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, t('nav')),
    ),
    open && h('div', { style: maskStyle, onClick: close },
      h('div', { style: panelStyle, onClick: (e: React.MouseEvent) => e.stopPropagation() },
        h('div', { style: headerStyle },
          h(PluginIcon, { size: 15 }),
          h('span', null, t('nav')),
          h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary, #7c7c9c)', fontWeight: 400 } }, t('subtitle')),
          fetchedAt !== '' && h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #9aa0b4)', fontWeight: 400 } }, `${t('lastRefresh')} ${formatTime(fetchedAt)}`),
          h('button', { ref: closeButton, style: closeStyle, onClick: close, 'aria-label': '关闭' }, '✕ 关闭'),
        ),
        h('div', { style: { flex: 1, overflowY: 'hidden', padding: '0 4px' } }, h(DiscoveryBrowser, { t, ctx, onClose: close, onFetched: setFetchedAt })),
      ),
    ),
  )
}
