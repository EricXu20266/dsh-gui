/**
 * dsh-discovery host routes: read-only GitHub topic browsing.
 *
 * Security model: this plugin never installs, updates, uninstalls or
 * restarts anything. It only proxies the GitHub API's `dsh-plugin` topic
 * repository search (the official community channel DeepSeek documents) and
 * serves the listing to the browser UI. Opening a repository happens in the
 * browser (external link); installing is done by the user or the host agent
 * with `dsh plugin add <spec>` after reviewing the repo.
 *
 * Search fallback: GitHub's topic index lags for brand-new repositories (a
 * `dsh-plugin` topic can take hours to days to appear in topic search). The
 * `/dsh-discovery/search` route proxies GitHub's full-text repository search
 * (name/description/README) so fresh plugins are still discoverable by name.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { sendJson } from "./http.js";
const GITHUB_API = 'https://api.github.com';
/** Cached listing; refresh happens on demand via ?force=1. */
let cache = { at: 0, data: null };
const TTL_MS = 5 * 60 * 1000;
/** Fetch one page of GitHub search results for the dsh-plugin topic. */
async function fetchPage(page) {
    const url = `${GITHUB_API}/search/repositories?q=topic:dsh-plugin&sort=stars&order=desc&per_page=30&page=${page}`;
    const res = await fetch(url, {
        headers: {
            accept: 'application/vnd.github+json',
            'user-agent': 'dsh-discovery',
        },
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok)
        throw new Error(`GitHub API HTTP ${res.status}`);
    const body = (await res.json());
    return body.items ?? [];
}
/** Pull up to 10 pages (~300 repos). A failed page stops the fetch gracefully. */
export async function fetchListing() {
    if (cache.data !== null && Date.now() - cache.at < TTL_MS)
        return cache.data;
    const all = [];
    for (let page = 1; page <= 10; page += 1) {
        try {
            const items = await fetchPage(page);
            if (items.length === 0)
                break;
            all.push(...items);
        }
        catch {
            break; // transient GitHub errors: serve what we have
        }
    }
    const plugins = all.map((repo) => ({
        name: repo.full_name.split('/')[1] ?? repo.full_name,
        owner: repo.full_name.split('/')[0] ?? '',
        description: repo.description ?? '',
        stars: repo.stargazers_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        htmlUrl: repo.html_url,
        topics: repo.topics ?? [],
    }));
    const listing = {
        total: plugins.length,
        plugins,
        fetchedAt: new Date().toISOString(),
        source: 'github',
    };
    cache = { at: Date.now(), data: listing };
    return listing;
}
/** Drop the cache (not used by the UI yet, but harmless to expose). */
export function invalidateListing() {
    cache = { at: 0, data: null };
}
/* ── GitHub full-text search fallback ─────────────────────────────────────── */
/** 全文搜索缓存：关键词 → 结果（null = 查询失败）。TTL 防未认证 API 限流（60 req/h）。 */
const searchCache = new Map();
const SEARCH_TTL_MS = 5 * 60 * 1000;
/**
 * GitHub 全文搜索兜底：topic 列表索引对新仓库有延迟（topic 已打但未收录），
 * 本地过滤无结果时走 search API 全文匹配 name/description/readme。
 * 不限定 topic，才能命中最新仓库。失败返回 null（区别于"无结果"的 []）。
 */
async function fetchSearch(q) {
    const key = q.trim().toLowerCase();
    if (key === '')
        return [];
    const cached = searchCache.get(key);
    if (cached !== undefined && Date.now() - cached.at < SEARCH_TTL_MS)
        return cached.data;
    const url = `${GITHUB_API}/search/repositories?q=${encodeURIComponent(key)}&per_page=30&sort=stars&order=desc`;
    try {
        const res = await fetch(url, {
            headers: {
                accept: 'application/vnd.github+json',
                'user-agent': 'dsh-discovery',
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok)
            throw new Error(`GitHub API HTTP ${res.status}`);
        const body = (await res.json());
        const plugins = (body.items ?? []).map((repo) => ({
            name: repo.full_name.split('/')[1] ?? repo.full_name,
            owner: repo.full_name.split('/')[0] ?? '',
            description: repo.description ?? '',
            stars: repo.stargazers_count,
            language: repo.language,
            updatedAt: repo.updated_at,
            htmlUrl: repo.html_url,
            topics: repo.topics ?? [],
        }));
        searchCache.set(key, { at: Date.now(), data: plugins });
        return plugins;
    }
    catch {
        searchCache.set(key, { at: Date.now(), data: null });
        return null;
    }
}
/** 当前激活 profile 名（与 host 侧一致：argv --profile）。 */
function resolveProfileName() {
    const idx = process.argv.indexOf('--profile');
    return idx >= 0 && process.argv[idx + 1] !== undefined ? process.argv[idx + 1] : 'web';
}
/** profile 下某插件的 node_modules 路径（file:/github: 安装的插件在此为实体副本）。 */
function profileNodeModules(pkg) {
    return join(homedir(), '.dsh', 'profiles', resolveProfileName(), 'node_modules', pkg);
}
/** 读已安装插件包自身 package.json；读不到返回 null。 */
function readInstalledPackage(pkg) {
    try {
        return JSON.parse(readFileSync(join(profileNodeModules(pkg), 'package.json'), 'utf8'));
    }
    catch {
        return null;
    }
}
/** 已安装插件 package.json 的 mtime（检测重装：file: 源更新后重装会复制新文件）。 */
function readInstalledMtime(pkg) {
    try {
        return statSync(join(profileNodeModules(pkg), 'package.json')).mtimeMs;
    }
    catch {
        return null;
    }
}
/** 读已安装插件包自身 package.json 的 version（file:/github: 链接没有版本号，以包内为准）。 */
function readInstalledVersion(pkg) {
    const doc = readInstalledPackage(pkg);
    return typeof doc?.version === 'string' ? doc.version : null;
}
/** 从 package.json repository 字段解析 GitHub 仓库（支持 string / {url} / git+https / ssh 格式）。 */
function resolveRepo(pkg) {
    const doc = readInstalledPackage(pkg);
    const repository = doc?.repository;
    const url = typeof repository === 'string'
        ? repository
        : repository?.url;
    if (typeof url !== 'string')
        return null;
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    return m !== null ? { owner: m[1], repo: m[2] } : null;
}
/** 查 npm registry 最新版 + 发布时间；非 npm 源（github: 等）或查询失败返回 null（诚实标注「无法检测」）。 */
async function fetchNpmInfo(pkg) {
    const encoded = pkg.startsWith('@') ? pkg.replace('/', '%2F') : pkg;
    try {
        const res = await fetch(`https://registry.npmjs.org/${encoded}?fields=dist-tags,time`, {
            headers: { accept: 'application/vnd.npm.install-v1+json' },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok)
            return { latest: null, publishedAt: null };
        const body = (await res.json());
        const latest = body['dist-tags']?.latest ?? null;
        const publishedAt = latest !== null ? (body.time?.[latest] ?? null) : null;
        return { latest, publishedAt };
    }
    catch {
        return { latest: null, publishedAt: null };
    }
}
const ghHeadCache = new Map();
const GH_TTL_MS = 5 * 60 * 1000;
async function fetchGitHubHead(owner, repo) {
    const key = `${owner}/${repo}`;
    const cached = ghHeadCache.get(key);
    if (cached !== undefined && Date.now() - cached.at < GH_TTL_MS)
        return cached.data;
    try {
        const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=1`, {
            headers: {
                accept: 'application/vnd.github+json',
                'user-agent': 'dsh-discovery',
            },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok)
            return null;
        const body = (await res.json());
        const item = body[0];
        const result = item !== undefined
            ? { sha: item.sha, date: item.commit?.committer?.date ?? '' }
            : null;
        ghHeadCache.set(key, { at: Date.now(), data: result });
        return result;
    }
    catch {
        ghHeadCache.set(key, { at: Date.now(), data: null });
        return null;
    }
}
function baselinePath() {
    return join(homedir(), '.dsh', 'profiles', resolveProfileName(), 'dsh-discovery-state.json');
}
function readBaseline() {
    try {
        return JSON.parse(readFileSync(baselinePath(), 'utf8'));
    }
    catch {
        return { plugins: {} };
    }
}
function writeBaseline(state) {
    try {
        writeFileSync(baselinePath(), JSON.stringify(state, null, 2), 'utf8');
    }
    catch {
        // 状态文件写失败不影响主流程（只影响下次比对）
    }
}
/**
 * 多源版本比对：npm registry（latest + 发布时间）+ GitHub 远端 commit（SHA 基线）。
 * 确定性操作（版本读取/比对）在代码完成，LLM 只负责对「需更新清单」做安全审查与安装执行。
 *
 * 基线语义：
 * - 首次检查：记录远端 SHA 为基线（不误报），UI 显示「基线已建立」。
 * - 插件本体变化（版本号或 package.json mtime 变化 = 重装/更新过）：基线推进到当前远端 SHA。
 * - 其余情况：远端 SHA ≠ 基线 SHA → 提示更新，基线不动（直到真正更新插件）。
 */
export async function installedVersions(listInstalled) {
    const names = listInstalled();
    const state = readBaseline();
    const settled = await Promise.allSettled(names.map(async (name) => {
        const current = readInstalledVersion(name);
        const npm = await fetchNpmInfo(name);
        const repo = resolveRepo(name);
        const gh = repo !== null ? await fetchGitHubHead(repo.owner, repo.repo) : null;
        const record = state.plugins[name];
        const baselineSha = record?.sha ?? null;
        const pkgMtime = readInstalledMtime(name);
        // 插件本体是否变化（重装/更新过）：版本号或 package.json mtime 任一变化
        const reinstalled = record !== undefined
            && (record.currentVersion !== current || record.fileMtime !== pkgMtime);
        let hasUpdate = false;
        let source = 'none';
        if (npm.latest !== null && current !== null && npm.latest !== current) {
            hasUpdate = true;
            source = 'npm';
        }
        if (gh !== null && baselineSha !== null && !reinstalled && gh.sha !== baselineSha) {
            hasUpdate = true;
            source = 'github';
        }
        // 推进/建立基线：插件重装过，或首次检查
        if (gh !== null && (record === undefined || reinstalled)) {
            state.plugins[name] = {
                sha: gh.sha,
                checkedAt: new Date().toISOString(),
                currentVersion: current,
                fileMtime: pkgMtime,
            };
        }
        return {
            name,
            current: current ?? 'unknown',
            latest: npm.latest,
            latestPublishedAt: npm.publishedAt,
            repo: repo !== null ? `${repo.owner}/${repo.repo}` : null,
            remoteSha: gh?.sha ?? null,
            remotePushedAt: gh?.date ?? null,
            baselineSha,
            hasUpdate,
            source,
        };
    }));
    writeBaseline(state);
    return settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
}
/** Cached README text; refresh happens on demand (TTL-bounded). */
const README_TTL_MS = 5 * 60 * 1000;
const readmeCache = new Map();
/**
 * Fetch one repository README as raw Markdown. Read-only; serves the
 * discovery browser's in-panel repository preview (GitHub pages refuse
 * iframe embedding, so the UI renders the README instead).
 */
async function fetchReadme(owner, repo) {
    const key = `${owner}/${repo}`;
    const cached = readmeCache.get(key);
    if (cached !== undefined && Date.now() - cached.at < README_TTL_MS) {
        if ('markdown' in cached.data)
            return cached.data.markdown;
        throw new Error(cached.data.error);
    }
    const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`;
    const res = await fetch(url, {
        headers: {
            accept: 'application/vnd.github.raw+json',
            'user-agent': 'dsh-discovery',
        },
        signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
        const error = `README HTTP ${res.status}`;
        readmeCache.set(key, { at: Date.now(), data: { error } });
        throw new Error(error);
    }
    const markdown = await res.text();
    readmeCache.set(key, { at: Date.now(), data: { markdown } });
    return markdown;
}
/**
 * Register the discovery HTTP routes.
 * @param host - Acquired webServer service.
 * @returns Disposer removing every registered route.
 */
export function mountDiscoveryRoutes(host, listInstalled) {
    const disposers = [
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-discovery/listing',
            handler: async (request, response) => {
                try {
                    const url = new URL(request.url ?? '', 'http://localhost');
                    if (url.searchParams.get('force') === '1')
                        invalidateListing();
                    const listing = await fetchListing();
                    sendJson(response, 200, listing);
                }
                catch (error) {
                    sendJson(response, 500, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-discovery/installed',
            handler: async (_request, response) => {
                sendJson(response, 200, { installed: listInstalled() });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-discovery/search',
            handler: async (request, response) => {
                try {
                    const url = new URL(request.url ?? '', 'http://localhost');
                    const q = url.searchParams.get('q') ?? '';
                    if (q.trim() === '') {
                        sendJson(response, 400, { error: 'q is required' });
                        return;
                    }
                    const plugins = await fetchSearch(q);
                    if (plugins === null) {
                        sendJson(response, 502, { error: 'GitHub search unavailable' });
                        return;
                    }
                    sendJson(response, 200, { plugins, source: 'search' });
                }
                catch (error) {
                    sendJson(response, 500, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-discovery/readme',
            handler: async (request, response) => {
                try {
                    const url = new URL(request.url ?? '', 'http://localhost');
                    const owner = url.searchParams.get('owner') ?? '';
                    const repo = url.searchParams.get('repo') ?? '';
                    if (owner === '' || repo === '') {
                        sendJson(response, 400, { error: 'owner and repo are required' });
                        return;
                    }
                    const markdown = await fetchReadme(owner, repo);
                    sendJson(response, 200, { markdown });
                }
                catch (error) {
                    sendJson(response, 404, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-discovery/installed-versions',
            handler: async (_request, response) => {
                try {
                    const versions = await installedVersions(listInstalled);
                    sendJson(response, 200, { plugins: versions });
                }
                catch (error) {
                    sendJson(response, 500, {
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        }),
    ];
    return () => {
        for (const dispose of disposers)
            dispose();
    };
}
