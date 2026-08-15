# dsh-gui — DeepSeek Harness Desktop Client

> 🌐 **English | [中文](README.md)**

> DHS (DeepSeek Harness) Electron GUI client: wraps the web-UI workflow into a native desktop GUI, keeping the DHS kernel maximally untouched.

[![Electron](https://img.shields.io/badge/Electron-43+-blue.svg)](https://www.electronjs.org)
[![Node](https://img.shields.io/badge/Node-24+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/EricXu20266/dsh-gui)](https://github.com/EricXu20266/dsh-gui/releases)

DHS is delivered officially as a web UI (browser). dsh-gui uses Electron to host the same DHS frontend, turning "open a webpage in your browser" into "a desktop app" — with **zero changes to the DHS kernel**.

---

## Download

**Windows x64 portable build (win-unpacked): [GitHub Releases](https://github.com/EricXu20266/dsh-gui/releases)**

Download, unzip, and run — double-click `dsh-gui.exe` to launch. The first launch automatically installs bundled DHS dependencies (with an optional China mirror for speed); no manual environment setup required.

## System Requirements

- **Windows 10+** (x64): portable build (win-unpacked) available — see Download above
- **macOS** (Apple Silicon / arm64): supported, built by GitHub Actions CI (`build-mac-arm64`); artifacts available from Actions artifacts

## Features

- **Native desktop experience**: standalone window, system tray (minimize-to-tray on X, quit from tray context menu), DeepSeek blue-whale icon
- **First-run setup wizard**: 5-step flow (welcome → download source → download progress → check → done), China mirror / official source / system proxy selectable, real progress shown throughout
- **Bundled distribution**: the packaged build bundles Node + pnpm + DHS source + built-in plugins; first launch auto-installs dependencies — out of the box
- **Built-in plugin system**: 5 bundled plugins (plugin discovery / Skill manager / MCP manager / global proxy / About) covering DHS's daily management and extension — see below
- **Plugin agent awareness**: every built-in plugin registers a `systemPrompt` section with the host, so the model is aware of installed plugins and what they do each session — no manual prompting needed
- **Global proxy**: configure system proxy / manual proxy graphically in Settings; the GUI injects environment variables at launch so the whole DHS chain (LLM calls / built-in search / MCP client) goes through the proxy
- **Bilingual zh/en**: UI language follows the system, switchable manually, and mapped to DHS kernel `locale.preference` (kernel UI follows)
- **Install logs**: the full install process is written to `%APPDATA%/dsh-gui/install.log` for failure tracing
- **Zero kernel changes**: the DHS kernel stays officially untouched; the GUI is only a shell

## Built-in plugins

dsh-gui bundles 5 plugins. Except for dsh-about, all are standalone open-source repos, distributed with the packaged build and auto-registered to the DHS profile on first install:

| Plugin | Repo | Purpose |
|---|---|---|
| **dsh-discovery** | [EricXu20266/dsh-discovery](https://github.com/EricXu20266/dsh-discovery) | Community plugin discovery + LLM security audit |
| **dsh-skillmanager** | [EricXu20266/dsh-skillmanager](https://github.com/EricXu20266/dsh-skillmanager) | Graphical skill management |
| **dsh-mcpmanager** | [EricXu20266/dsh-mcpmanager](https://github.com/EricXu20266/dsh-mcpmanager) | Graphical MCP server management |
| **dsh-proxy** | [EricXu20266/dsh-proxy](https://github.com/EricXu20266/dsh-proxy) | Global proxy configuration |
| **dsh-about** | Built-in (this repo's `plugins/`) | "About" tab in Settings showing version info |

### dsh-discovery — plugin discovery & LLM audit

Positioned as a **community-plugin discovery and LLM-audit tool**: DHS has no official plugin marketplace, and third-party plugins are essentially executable code, so it is deliberately read-only — it only handles "discover → filter"; **security review is delegated to the LLM** (one-click generation of an audit prompt; the LLM reads the source and checks for risk; install if it passes, stop if risk is found).

- **Browse**: pulls all plugin repos under the GitHub `dsh-plugin` community topic (bounded pagination + timeout fallback)
- **Categorize**: 7 functional categories + Other (UI enhancement / terminal / tools / memory / models / notifications / development)
- **Scenarios**: 5 use scenarios (writing / development / model integration / automation / notification integration) with automatic dedup and limited recommendations
- **Search**: a 38-word Chinese-English synonym table so Chinese keywords hit English plugin data
- **LLM-audited install**: one-click audit prompt for the LLM (reads source / checks deps / identifies malicious behavior); if it passes, `dsh plugin add` installs; if risk is found, it lists the risk points and stops. Official (deepseek-ai) badge, installed marker, and **update checks also carry security review** (diff old vs. new, update only if it passes)

Full design notes (security model, fetch rules, scenario filtering) are in the repo's [README](https://github.com/EricXu20266/dsh-discovery).

### dsh-skillmanager — skill management

DHS's skill system has **no centralized registry — files are the registry**: drop `<name>/SKILL.md` into a scan root and the host auto-discovers it and adds it to the model's available directory (`~/.dsh/skills`, `~/.agents/skills`, and 3 more scan roots). This plugin presents that system graphically: skill list, grouping, enable/disable (frontmatter permission switches), guided creation, LLM review. Skill creation and editing are executed by the host agent (LLM); this plugin handles "see clearly, control firmly".

### dsh-mcpmanager — MCP management

DHS's MCP has **no standalone store — one server = one `@deepseek-ai/dsh-mcp-client` plugin instance**, persisted in `~/.dsh/profiles/web/cordis.patch.yml`. This plugin provides form-based CRUD for MCP server config (stdio / streamable-http transports); saving applies via **hot reload** (new sessions see the tools immediately, no restart) and offers LLM verification guidance.

### dsh-proxy — global proxy

DHS's network stack uses raw `fetch()` end-to-end and does not read the Windows system proxy; Node 24+ supports the `NODE_USE_ENV_PROXY` env-var proxy (bootstrap-only security design — `.env` cannot set proxy vars). This plugin adds a "System Proxy" row in Settings → General Settings, persisted to `~/.dsh/settings.yaml`; dsh-gui injects env vars at launch so LLM calls / built-in search / MCP client all route through the proxy.

### dsh-about — About

The "About" tab in Settings (built-in plugin, shipped in this repo, not published separately) shows four layers of version info — dsh-gui / kernel / runtime (Electron + Node) / installed plugins — handy for version checks and troubleshooting.

### Plugin agent awareness (systemPrompt sections)

Every built-in plugin registers a `systemPrompt` section on the host side (`plugin:<id>`), injected into the model context each session. The model thus **naturally knows which plugins are installed and what each one does** — e.g. when the user asks "what plugins do I have?", the model answers directly from the registered descriptions, no extra docs needed.

## Architecture

```
┌─────────────────────────────────────────────┐
│ Electron App (dsh-gui)                       │
│  main process ──spawn──> DHS host subprocess │
│     │                    └─ apps/cli/bin.js  │
│     │                        --profile web   │
│     │                        → 127.0.0.1:3080│
│  BrowserWindow loadURL ←─────────────────────┘
└─────────────────────────────────────────────┘
```

- **GUI shell**: Electron (window, tray, process management, setup wizard)
- **DHS host**: runs the official `dsh` as a subprocess (bundled Node 24 in packaged builds, system Node in dev), kernel 100% untouched
- **Communication**: local HTTP + WebSocket (`127.0.0.1:3080`)
- **Config**: `~/.dsh` (shared DHS home, used by both web and GUI modes)

> ⚠️ Known boundary: DHS's cordis loader depends on a Node internal API (`node-addon-require-builtin`),
> which is incompatible with Electron's bundled Node — so the host runs as a subprocess rather than in-process (see docs/ARCHITECT.md).

## Quick start (development)

```bash
# Dependencies (workspace includes ../deepseek-harness)
pnpm install

# Build DHS (first time only: host lib + client lib + web dist)
pnpm --filter @deepseek-ai/dsh-root run build

# Launch
pnpm build && pnpm start
```

## Packaging

One-click script (recommended; full console output):

```bat
build-win-unpacked.bat
```

Or manually:

```bash
pnpm build
pnpm exec electron-builder --win dir
node scripts/apply-exe-icon.mjs   # electron-builder 26 has a silent exe-icon bug; embed it manually
```

Artifacts: `release/win-unpacked/` (portable, Windows x64). Released versions: **[GitHub Releases](https://github.com/EricXu20266/dsh-gui/releases)**.

Packaged-build layout: `resources/runtime` (bundled Node + pnpm), `resources/dhs` (DHS source, no node_modules — the first-run wizard installs them), `resources/dsh-*` (four standalone plugin repos + built-in dsh-about).

## Directory layout

```
dsh-gui/
├── electron/        # GUI shell engine (main/preload/renderer/setup wizard)
├── plugins/         # built-in plugins (dsh-about; the other 4 are standalone repos)
├── platform/        # platform adapters (windows packaging / macos reserved)
├── resources/       # assets (icon, packaging runtime: bundled Node + pnpm)
├── install/         # installer config
├── scripts/         # build/package scripts
├── tools/           # helper tools
└── docs/            # docs system (ARCHITECT/DEV-TRACKER/index...)
```

Full docs: [docs/index.md](docs/index.md).
