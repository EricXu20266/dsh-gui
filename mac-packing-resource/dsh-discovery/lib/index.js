import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mountDiscoveryRoutes } from "./routes.js";
export const name = 'dsh-discovery';
/** 内置 bundle 插件（非用户安装），已安装标识中排除。 */
const BUILTIN_PLUGINS = new Set([
    '@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-headless',
]);
/** 当前激活 profile 名（host 启动 argv：node bin.js --profile <name>）。 */
function resolveProfileName() {
    const idx = process.argv.indexOf('--profile');
    return idx >= 0 && process.argv[idx + 1] !== undefined ? process.argv[idx + 1] : 'web';
}
/** 读 profile manifest 的 dsh.profile.bundles，过滤内置，得到用户安装的插件包名。 */
function listInstalledPlugins() {
    try {
        const manifestPath = join(homedir(), '.dsh', 'profiles', resolveProfileName(), 'package.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        return (manifest.dsh?.profile?.bundles ?? []).filter((name) => !BUILTIN_PLUGINS.has(name));
    }
    catch {
        return [];
    }
}
export function apply(ctx) {
    ctx.inject(['systemPrompt'], (sysCtx) => sysCtx.systemPrompt.section({
        name: 'plugin:dsh-discovery',
        order: 900,
        text: 'Installed plugin: dsh-discovery (sidebar 插件搜索 panel). Browses community DSH plugins from the GitHub dsh-plugin topic; installation itself is left to the user or the agent.',
    }));
    ctx.inject(['webServer', 'loader'], (hostCtx) => {
        const host = hostCtx;
        host.effect(() => mountDiscoveryRoutes(host, listInstalledPlugins), 'dsh-discovery: http routes');
    });
}
