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
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}
