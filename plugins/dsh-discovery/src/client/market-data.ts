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

/**
 * 中英同义词表：中文搜索词 → 英文关键词数组。插件数据是英文的
 * （name/description/topics），用户搜中文词时用英文关键词去匹配，
 * 避免中文搜索漏掉英文内容。覆盖常见插件技术词，按需扩充。
 */
const SEARCH_SYNONYMS: Record<string, string[]> = {
  记忆: ['memory', 'recall', 'remember', 'store', 'kv', 'vector'],
  终端: ['terminal', 'tui', 'console', 'shell', 'bash'],
  通知: ['notify', 'notification', 'webhook', 'slack', 'wechat', 'feishu', 'telegram', 'dingtalk', 'push'],
  聊天: ['chat', 'conversation', 'message', 'dialog', 'discuss'],
  对话: ['chat', 'conversation', 'message', 'dialog'],
  界面: ['ui', 'interface', 'panel', 'overlay', 'web-ui'],
  皮肤: ['theme', 'skin', 'appearance'],
  主题: ['theme', 'skin'],
  工具: ['tool', 'utility', 'command', 'automation'],
  模型: ['model', 'llm', 'provider', 'inference', 'gateway'],
  插件: ['plugin', 'extension', 'addon', 'module'],
  搜索: ['search', 'discovery', 'find', 'query'],
  开发: ['dev', 'runtime', 'debug', 'inspect', 'code', 'git', 'docker', 'sandbox'],
  测试: ['test', 'testing', 'spec', 'verify'],
  文档: ['doc', 'documentation', 'docs', 'wiki'],
  数据库: ['database', 'db', 'sql', 'kv', 'storage', 'postgres', 'mysql', 'sqlite'],
  缓存: ['cache', 'redis', 'memcached'],
  队列: ['queue', 'mq', 'kafka', 'rabbitmq'],
  网络: ['network', 'http', 'request', 'fetch', 'socket', 'websocket', 'proxy'],
  安全: ['security', 'auth', 'login', 'password', 'token', 'permission', 'sandbox'],
  文件: ['file', 'fs', 'filesystem', 'path', 'folder', 'directory'],
  图片: ['image', 'photo', 'picture', 'vision'],
  视频: ['video', 'media', 'stream'],
  音频: ['audio', 'sound', 'voice', 'speech', 'tts', 'asr'],
  语音: ['voice', 'speech', 'tts', 'asr', 'audio'],
  代码: ['code', 'source', 'snippet', 'syntax', 'highlight'],
  工作流: ['workflow', 'pipeline', 'automation', 'orchestration'],
  调度: ['schedule', 'cron', 'timer', 'task', 'job'],
  代理: ['proxy', 'agent', 'provider'],
  分析: ['analytics', 'analysis', 'metrics', 'stats', 'dashboard'],
  监控: ['monitor', 'watch', 'alert', 'metric', 'observability'],
  日志: ['log', 'logging', 'trace', 'logger'],
  浏览器: ['browser', 'chromium', 'playwright', 'puppeteer', 'web'],
  网页: ['web', 'html', 'http', 'page', 'browser'],
  集成: ['integration', 'api', 'webhook', 'connect'],
}

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
  // 搜索词命中分类 label 时，按分类归属匹配（和分类 Tab 一致）
  const labelCat = q === '' ? undefined : CATEGORY_KEYWORDS.find((c) => c.label === q)
  // 搜索词命中中英同义词表时，用英文关键词匹配
  const synonyms = q === '' ? undefined : SEARCH_SYNONYMS[q]
  return all.filter((p) => {
    if (opts.cat !== 'all' && categoryOf(p) !== opts.cat) return false
    if (q === '') return true
    if (labelCat) return categoryOf(p) === labelCat.id
    const hay = `${p.name} ${p.owner} ${p.description} ${p.topics.join(' ')}`.toLowerCase()
    if (hay.includes(qLower)) return true
    if (synonyms !== undefined) {
      const catHay = `${p.name} ${p.topics.join(' ')} ${p.description}`.toLowerCase()
      return synonyms.some((en) => catHay.includes(en))
    }
    return false
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
  /** 功能关键词：每个词代表一个功能簇。重复筛选时，每个功能簇只保留 star 前 MAX_PER_FUNCTION 个。 */
  keywords: string[]
  /** Plugin match rule (name + description + topics haystack). */
  match: RegExp
}

/** Curated user scenarios that map onto community plugin clusters. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'writing',
    id2: 'writing',
    keywords: ['write', 'note', 'memory', 'template', 'blog', 'doc', 'content', 'skill', 'memo', 'recall', 'remember'],
    match: /write|writing|note|memo|skill|memory|template|blog|content|doc|recall|remember/i,
  },
  {
    id: 'dev',
    id2: 'dev',
    keywords: ['terminal', 'git', 'docker', 'code', 'debug', 'runtime', 'sandbox', 'browser', 'cli', 'tui', 'shell', 'dev'],
    match: /terminal|tui|shell|cli|git|docker|code|dev|debug|runtime|sandbox|browser/i,
  },
  {
    id: 'model',
    id2: 'model',
    keywords: ['model', 'llm', 'provider', 'gateway', 'inference', 'api', 'openai', 'anthropic', 'gemini', 'claude'],
    match: /model|provider|llm|api|gateway|inference|openai|anthropic|gemini|claude/i,
  },
  {
    id: 'automation',
    id2: 'automation',
    keywords: ['tool', 'workflow', 'schedule', 'task', 'agent', 'pipeline', 'command', 'todo', 'job', 'automation'],
    match: /tool|command|automation|workflow|schedule|task|todo|job|agent|pipeline/i,
  },
  {
    id: 'notify',
    id2: 'notify',
    keywords: ['notify', 'webhook', 'slack', 'wechat', 'telegram', 'email', 'push', 'notification', 'feishu', 'dingtalk', 'im'],
    match: /notify|notification|webhook|slack|wechat|feishu|telegram|dingtalk|email|im|push/i,
  },
]

/** 每个功能簇最多保留的高星插件数。 */
export const MAX_PER_FUNCTION = 3
/** 每个功能簇额外保留的「最近更新」名额，避免纯 star 阈值忽略新项目。 */
export const NEW_PROJECTS_PER_FUNCTION = 1

/**
 * Plugins matching a scenario with duplicate filtering: each functional
 * keyword cluster keeps the top {@link MAX_PER_FUNCTION} by stars plus
 * {@link NEW_PROJECTS_PER_FUNCTION} most-recently-updated newcomers, so a
 * scenario stays lean without ignoring fresh projects.
 */
export function scenarioPlugins(listing: PluginListing | null, scenario: Scenario): PluginEntry[] {
  const matched = (listing?.plugins ?? []).filter((p) => {
    const hay = `${p.name} ${p.description} ${p.topics.join(' ')}`
    return scenario.match.test(hay)
  })
  // 按功能关键词分组：插件归入第一个命中的关键词簇（未命中任何关键词的归入 other）
  const byKeyword = new Map<string, PluginEntry[]>()
  for (const plugin of matched) {
    const hay = `${plugin.name} ${plugin.description} ${plugin.topics.join(' ')}`.toLowerCase()
    const keyword = scenario.keywords.find((k) => hay.includes(k)) ?? 'other'
    const group = byKeyword.get(keyword)
    if (group === undefined) byKeyword.set(keyword, [plugin])
    else group.push(plugin)
  }
  // 每个功能簇：高星前 MAX_PER_FUNCTION ∪ 最近更新前 NEW_PROJECTS_PER_FUNCTION（去重）
  const picked = new Map<string, PluginEntry>()
  for (const group of byKeyword.values()) {
    const byStars = [...group]
      .sort((a, b) => b.stars - a.stars || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_PER_FUNCTION)
    const byRecent = [...group]
      .filter((p) => !byStars.some((s) => s.htmlUrl === p.htmlUrl))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, NEW_PROJECTS_PER_FUNCTION)
    for (const plugin of [...byStars, ...byRecent]) picked.set(plugin.htmlUrl, plugin)
  }
  return [...picked.values()].sort((a, b) => b.stars - a.stars || b.updatedAt.localeCompare(a.updatedAt))
}
