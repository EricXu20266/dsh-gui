/**
 * dsh-about host routes: serves the version manifest for the About tab.
 *
 * Versions arrive from two places:
 *  - the DSH-GUI launcher injects DSH_GUI_VERSION / DSH_KERNEL_VERSION /
 *    DSH_ELECTRON_VERSION / DSH_NODE_VERSION into the host environment;
 *  - installed plugin versions are read from the active profile's
 *    node_modules/<pkg>/package.json.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'

/** One installed plugin row on the About tab. */
export interface AboutPluginRow {
  name: string
  version: string
  description?: string
}

/** The full About manifest. */
export interface AboutInfo {
  gui: { name: string; version: string }
  kernel: string
  runtime: { electron: string; node: string; platform: string }
  plugins: AboutPluginRow[]
}

/** User-installed plugins to enumerate (dsh-gui ships these alongside). */
const PLUGIN_PACKAGES = ['dsh-proxy', 'dsh-skillmanager', 'dsh-mcpmanager', 'dsh-discovery']

/** Host services required by this plugin. */
export interface AboutHost extends Context {
  webServer: {
    register(route: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void }): unknown
  }
  effect<T>(body: () => T, label: string): T
}

/** Current profile name (host argv: node bin.js --profile <name>). */
function resolveProfileName(): string {
  const idx = process.argv.indexOf('--profile')
  return idx >= 0 && process.argv[idx + 1] !== undefined ? process.argv[idx + 1] : 'web'
}

/** Read one plugin's version + description from the active profile's node_modules. */
function readPluginRow(pkg: string): AboutPluginRow {
  try {
    const pkgPath = join(homedir(), '.dsh', 'profiles', resolveProfileName(), 'node_modules', pkg, 'package.json')
    const doc = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string; description?: string }
    return {
      name: pkg,
      version: doc.version ?? 'unknown',
      ...doc.description !== undefined ? { description: doc.description } : {},
    }
  } catch {
    return { name: pkg, version: '—' }
  }
}

/** Assemble the About manifest. */
export function readAboutInfo(): AboutInfo {
  return {
    gui: {
      name: process.env.DSH_GUI_NAME ?? 'dsh-gui',
      version: process.env.DSH_GUI_VERSION ?? 'dev',
    },
    kernel: process.env.DSH_KERNEL_VERSION ?? 'unknown',
    runtime: {
      electron: process.env.DSH_ELECTRON_VERSION ?? 'unknown',
      node: process.env.DSH_NODE_VERSION ?? process.version,
      platform: `${process.platform} ${process.arch}`,
    },
    plugins: PLUGIN_PACKAGES.map(readPluginRow),
  }
}

/** Write a JSON response. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  })
  res.end(text)
}

/** Mount the /dsh-about/info route. */
export function mountAboutRoutes(host: AboutHost): void {
  host.webServer.register({
    kind: 'exact',
    path: '/dsh-about/info',
    handler: (_req, res) => sendJson(res, 200, readAboutInfo()),
  })
}
