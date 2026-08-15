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
    latest: string | null;
    /** latest 可查询且与当前版本不同（版本号语义比较由代码完成，确定性操作不交 LLM）。 */
    hasUpdate: boolean;
}
/**
 * 代码侧版本比对：并行读所有已安装插件的当前版本 + 查 npm 最新版，
 * 返回带 hasUpdate 标记的清单。确定性操作（版本读取/比对）在代码完成，
 * LLM 只负责对「需更新清单」做安全审查与安装执行。
 */
export declare function installedVersions(listInstalled: () => string[]): Promise<InstalledVersion[]>;
/**
 * Register the discovery HTTP routes.
 * @param host - Acquired webServer service.
 * @returns Disposer removing every registered route.
 */
export declare function mountDiscoveryRoutes(host: DiscoveryHost, listInstalled: () => string[]): () => void;
