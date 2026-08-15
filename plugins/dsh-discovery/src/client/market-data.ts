/** Data model for the discovery browser. */

export interface PluginEntry {
  name: string
  owner: string
  description: string
  stars: number
  language: string | null
  updatedAt: string
  htmlUrl: string
  topics: string[]
}

export interface PluginListing {
  total: number
  plugins: PluginEntry[]
  fetchedAt: string
  source: 'github'
}

/** Category buckets derived from the plugin name / topics / description. */
const CATEGORY_KEYWORDS: Array<{ id: string; label: string; match: RegExp }> = [
  { id: 'ui', label: 'UI 增强', match: /sidebar|ui|theme|skin|panel|overlay|web-ui|interface/i },
  { id: 'terminal', label: '终端', match: /terminal|tui|shell|cli|console|bash/i },
  { id: 'tools', label: '工具与能力', match: /tool|skill|command|automation|workflow/i },
  { id: 'memory', label: '记忆', match: /memory|recall|remember|store|kv|vector/i },
  { id: 'model', label: '模型与接入', match: /model|provider|llm|api|gateway|inference/i },
  { id: 'notify', label: '通知与集成', match: /notify|notification|webhook|slack|wechat|feishu|telegram|dingtalk/i },
  { id: 'dev', label: '开发与运行时', match: /dev|runtime|debug|inspect|code|git|docker|sandbox/i },
]

export function categoryOf(plugin: PluginEntry): string {
  const haystack = `${plugin.name} ${plugin.topics.join(' ')} ${plugin.description}`.slice(0, 400)
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.match.test(haystack)) return cat.id
  }
  return 'other'
}

export function orderedCategories(listing: PluginListing | null): Array<{ id: string; label: string; count: number }> {
  const counts = new Map<string, number>()
  for (const plugin of listing?.plugins ?? []) {
    const id = categoryOf(plugin)
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return CATEGORY_KEYWORDS.map((c) => ({ id: c.id, label: c.label, count: counts.get(c.id) ?? 0 }))
    .concat({ id: 'other', label: '其他', count: counts.get('other') ?? 0 })
    .filter((c) => c.count > 0)
}

/** Pure filter+sort; the component memoizes with useMemo. */
export function filterPlugins(
  listing: PluginListing | null,
  opts: { q: string; cat: string },
): PluginEntry[] {
  const all = listing?.plugins ?? []
  const q = opts.q.trim()
  const qLower = q.toLowerCase()
  // 搜索词命中分类 label 时，复用该分类的英文关键词，避免中文搜索漏掉英文内容
  const labelCat = q === '' ? undefined : CATEGORY_KEYWORDS.find((c) => c.label === q)
  return all.filter((p) => {
    if (opts.cat !== 'all' && categoryOf(p) !== opts.cat) return false
    if (q === '') return true
    if (labelCat) return categoryOf(p) === labelCat.id
    const hay = `${p.name} ${p.owner} ${p.description} ${p.topics.join(' ')}`.toLowerCase()
    return hay.includes(qLower)
  }).sort((a, b) => b.stars - a.stars)
}

/* ── provenance: official vs third-party ─────────────────────────────────── */

/**
 * The single verified DeepSeek official GitHub org. `deepseek` (the bare
 * handle) is a dormant placeholder account (public_repos = 0, no blog) and is
 * deliberately NOT treated as official.
 */
const OFFICIAL_OWNERS = new Set(['deepseek-ai'])

/** Whether a repository is an official DeepSeek release. */
export function isOfficial(plugin: PluginEntry): boolean {
  return OFFICIAL_OWNERS.has(plugin.owner)
}

/* ── scenario packs (batch / guided install) ─────────────────────────────── */

export interface Scenario {
  id: string
  /** Locale key suffix — resolved as `scenario_<id>` / `scenario_<id>_desc`. */
  id2: string
  /** Plugin match rule (name + description + topics haystack). */
  match: RegExp
}

/** Curated user scenarios that map onto community plugin clusters. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'writing',
    id2: 'writing',
    match: /write|writing|note|memo|skill|memory|template|blog|content|doc|recall|remember/i,
  },
  {
    id: 'dev',
    id2: 'dev',
    match: /terminal|tui|shell|cli|git|docker|code|dev|debug|runtime|sandbox|browser/i,
  },
  {
    id: 'model',
    id2: 'model',
    match: /model|provider|llm|api|gateway|inference|openai|anthropic|gemini|claude/i,
  },
  {
    id: 'automation',
    id2: 'automation',
    match: /tool|command|automation|workflow|schedule|task|todo|job|agent|pipeline/i,
  },
  {
    id: 'notify',
    id2: 'notify',
    match: /notify|notification|webhook|slack|wechat|feishu|telegram|dingtalk|email|im|push/i,
  },
]

/**
 * Plugins matching a scenario, sorted by stars then recency (the batch
 * install prompt feeds this list to DHS for self-judged selection).
 */
export function scenarioPlugins(listing: PluginListing | null, scenario: Scenario): PluginEntry[] {
  return (listing?.plugins ?? [])
    .filter((p) => {
      const hay = `${p.name} ${p.description} ${p.topics.join(' ')}`
      return scenario.match.test(hay)
    })
    .sort((a, b) => b.stars - a.stars || b.updatedAt.localeCompare(a.updatedAt))
}
