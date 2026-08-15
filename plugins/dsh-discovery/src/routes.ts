/**
 * dsh-discovery host routes: read-only GitHub topic browsing.
 *
 * Security model: this plugin never installs, updates, uninstalls or
 * restarts anything. It only proxies the GitHub API's `dsh-plugin` topic
 * repository search (the official community channel DeepSeek documents) and
 * serves the listing to the browser UI. Opening a repository happens in the
 * browser (external link); installing is done by the user or the host agent
 * with `dsh plugin add <spec>` after reviewing the repo.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { sendJson } from './http.ts'

export interface WebServerService {
  register(route: {
    kind: 'exact' | 'prefix'
    path: string
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
  }): () => void
}

export interface DiscoveryHost {
  webServer: WebServerService
  effect(callback: () => () => void, label: string): void
}

const GITHUB_API = 'https://api.github.com'
/** Cached listing; refresh happens on demand via ?force=1. */
let cache: { at: number; data: PluginListing | null } = { at: 0, data: null }
const TTL_MS = 5 * 60 * 1000

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
  /** GitHub search is paginated; 10 pages x 30 = 300 repos fetched. */
  source: 'github'
}

interface GitHubRepo {
  full_name: string
  description: string | null
  stargazers_count: number
  language: string | null
  updated_at: string
  html_url: string
  topics?: string[]
}

/** Fetch one page of GitHub search results for the dsh-plugin topic. */
async function fetchPage(page: number): Promise<GitHubRepo[]> {
  const url = `${GITHUB_API}/search/repositories?q=topic:dsh-plugin&sort=stars&order=desc&per_page=30&page=${page}`
  const res = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'dsh-discovery',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`GitHub API HTTP ${res.status}`)
  const body = (await res.json()) as { items?: GitHubRepo[] }
  return body.items ?? []
}

/** Pull up to 10 pages (~300 repos). A failed page stops the fetch gracefully. */
export async function fetchListing(): Promise<PluginListing> {
  if (cache.data !== null && Date.now() - cache.at < TTL_MS) return cache.data
  const all: GitHubRepo[] = []
  for (let page = 1; page <= 10; page += 1) {
    try {
      const items = await fetchPage(page)
      if (items.length === 0) break
      all.push(...items)
    } catch {
      break // transient GitHub errors: serve what we have
    }
  }
  const plugins: PluginEntry[] = all.map((repo) => ({
    name: repo.full_name.split('/')[1] ?? repo.full_name,
    owner: repo.full_name.split('/')[0] ?? '',
    description: repo.description ?? '',
    stars: repo.stargazers_count,
    language: repo.language,
    updatedAt: repo.updated_at,
    htmlUrl: repo.html_url,
    topics: repo.topics ?? [],
  }))
  const listing: PluginListing = {
    total: plugins.length,
    plugins,
    fetchedAt: new Date().toISOString(),
    source: 'github',
  }
  cache = { at: Date.now(), data: listing }
  return listing
}

/** Drop the cache (not used by the UI yet, but harmless to expose). */
export function invalidateListing(): void {
  cache = { at: 0, data: null }
}

/* ── installed versions (code-side comparison for one-click update) ───────── */

export interface InstalledVersion {
  name: string
  current: string
  latest: string | null
  /** latest 可查询且与当前版本不同（版本号语义比较由代码完成，确定性操作不交 LLM）。 */
  hasUpdate: boolean
}

/** 当前激活 profile 名（与 host 侧一致：argv --profile）。 */
function resolveProfileName(): string {
  const idx = process.argv.indexOf('--profile')
  return idx >= 0 && process.argv[idx + 1] !== undefined ? process.argv[idx + 1] : 'web'
}

/** 读已安装插件包自身 package.json 的 version（file:/github: 链接没有版本号，以包内为准）。 */
function readInstalledVersion(pkg: string): string | null {
  try {
    const pkgJson = join(homedir(), '.dsh', 'profiles', resolveProfileName(), 'node_modules', pkg, 'package.json')
    const doc = JSON.parse(readFileSync(pkgJson, 'utf8')) as { version?: string }
    return doc.version ?? null
  } catch {
    return null
  }
}

/** 查 npm registry 最新版本；非 npm 源（github: 等）或查询失败返回 null（诚实标注「无法检测」）。 */
async function fetchLatestVersion(pkg: string): Promise<string | null> {
  const encoded = pkg.startsWith('@') ? pkg.replace('/', '%2F') : pkg
  try {
    const res = await fetch(`https://registry.npmjs.org/${encoded}/latest`, {
      headers: { accept: 'application/vnd.npm.install-v1+json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { version?: string }
    return body.version ?? null
  } catch {
    return null
  }
}

/**
 * 代码侧版本比对：并行读所有已安装插件的当前版本 + 查 npm 最新版，
 * 返回带 hasUpdate 标记的清单。确定性操作（版本读取/比对）在代码完成，
 * LLM 只负责对「需更新清单」做安全审查与安装执行。
 */
export async function installedVersions(listInstalled: () => string[]): Promise<InstalledVersion[]> {
  const names = listInstalled()
  const settled = await Promise.allSettled(names.map(async (name) => {
    const current = readInstalledVersion(name)
    const latest = await fetchLatestVersion(name)
    return {
      name,
      current: current ?? 'unknown',
      latest,
      hasUpdate: latest !== null && current !== null && latest !== current,
    } satisfies InstalledVersion
  }))
  return settled
    .filter((r): r is PromiseFulfilledResult<InstalledVersion> => r.status === 'fulfilled')
    .map((r) => r.value)
}

/** Cached README text; refresh happens on demand (TTL-bounded). */
const README_TTL_MS = 5 * 60 * 1000
const readmeCache = new Map<string, { at: number; data: { markdown: string } | { error: string } }>()

/**
 * Fetch one repository README as raw Markdown. Read-only; serves the
 * discovery browser's in-panel repository preview (GitHub pages refuse
 * iframe embedding, so the UI renders the README instead).
 */
async function fetchReadme(owner: string, repo: string): Promise<string> {
  const key = `${owner}/${repo}`
  const cached = readmeCache.get(key)
  if (cached !== undefined && Date.now() - cached.at < README_TTL_MS) {
    if ('markdown' in cached.data) return cached.data.markdown
    throw new Error(cached.data.error)
  }
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`
  const res = await fetch(url, {
    headers: {
      accept: 'application/vnd.github.raw+json',
      'user-agent': 'dsh-discovery',
    },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) {
    const error = `README HTTP ${res.status}`
    readmeCache.set(key, { at: Date.now(), data: { error } })
    throw new Error(error)
  }
  const markdown = await res.text()
  readmeCache.set(key, { at: Date.now(), data: { markdown } })
  return markdown
}

/**
 * Register the discovery HTTP routes.
 * @param host - Acquired webServer service.
 * @returns Disposer removing every registered route.
 */
export function mountDiscoveryRoutes(host: DiscoveryHost, listInstalled: () => string[]): () => void {
  const disposers = [
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-discovery/listing',
      handler: async (request, response) => {
        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          if (url.searchParams.get('force') === '1') invalidateListing()
          const listing = await fetchListing()
          sendJson(response, 200, listing)
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-discovery/installed',
      handler: async (_request, response) => {
        sendJson(response, 200, { installed: listInstalled() })
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-discovery/readme',
      handler: async (request, response) => {
        try {
          const url = new URL(request.url ?? '', 'http://localhost')
          const owner = url.searchParams.get('owner') ?? ''
          const repo = url.searchParams.get('repo') ?? ''
          if (owner === '' || repo === '') {
            sendJson(response, 400, { error: 'owner and repo are required' })
            return
          }
          const markdown = await fetchReadme(owner, repo)
          sendJson(response, 200, { markdown })
        } catch (error) {
          sendJson(response, 404, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }),
    host.webServer.register({
      kind: 'exact',
      path: '/dsh-discovery/installed-versions',
      handler: async (_request, response) => {
        try {
          const versions = await installedVersions(listInstalled)
          sendJson(response, 200, { plugins: versions })
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}
