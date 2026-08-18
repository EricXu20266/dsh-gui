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
import type { IncomingMessage, ServerResponse } from 'node:http';
export interface WebServerService {
    register(route: {
        kind: 'exact' | 'prefix';
        path: string;
        handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;
    }): () => void;
}
export interface DiscoveryHost {
    webServer: WebServerService;
    effect(callback: () => () => void, label: string): void;
}
export interface PluginEntry {
    name: string;
    owner: string;
    description: string;
    stars: number;
    language: string | null;
    updatedAt: string;
    htmlUrl: string;
    topics: string[];
}
export interface PluginListing {
    total: number;
    plugins: PluginEntry[];
    fetchedAt: string;
    /** GitHub search is paginated; 10 pages x 30 = 300 repos fetched. */
    source: 'github';
}
/** Pull up to 10 pages (~300 repos). A failed page stops the fetch gracefully. */
export declare function fetchListing(): Promise<PluginListing>;
/** Drop the cache (not used by the UI yet, but harmless to expose). */
export declare function invalidateListing(): void;
export interface InstalledVersion {
    name: string;
    current: string;
    /** npm registry 最新版（插件已发布 npm 时可查，否则 null）。 */
    latest: string | null;
    /** npm 最新版发布时间（ISO，可查时）。 */
    latestPublishedAt: string | null;
    /** GitHub 仓库 "owner/repo"（从插件 package.json repository 解析）。 */
    repo: string | null;
    /** GitHub 远端最新 commit SHA。 */
    remoteSha: string | null;
    /** GitHub 远端最新 commit 时间（ISO）。 */
    remotePushedAt: string | null;
    /** 基线：上次建立/推进时记录的远端 SHA（null = 首次检查尚未建立基线）。 */
    baselineSha: string | null;
    /** 是否检测到更新：npm latest ≠ current，或 GitHub 远端 SHA ≠ 基线 SHA（且插件本体未重装）。 */
    hasUpdate: boolean;
    /** 检测到更新的来源：'npm' | 'github' | 'none'。 */
    source: 'npm' | 'github' | 'none';
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
export declare function installedVersions(listInstalled: () => string[]): Promise<InstalledVersion[]>;
/**
 * Register the discovery HTTP routes.
 * @param host - Acquired webServer service.
 * @returns Disposer removing every registered route.
 */
export declare function mountDiscoveryRoutes(host: DiscoveryHost, listInstalled: () => string[]): () => void;
