# dsh-gui — DeepSeek Harness 桌面客户端

> 🌐 **中文 | [English](README.en.md)**

> DHS (DeepSeek Harness) 的 Electron GUI 客户端：把 web ui 的使用方式封装为原生桌面 GUI。内核最大限度的保持 DHS。

[![Electron](https://img.shields.io/badge/Electron-43+-blue.svg)](https://www.electronjs.org)
[![Node](https://img.shields.io/badge/Node-24+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/EricXu20266/dsh-gui)](https://github.com/EricXu20266/dsh-gui/releases)

DHS 官方以 web ui（浏览器）形态交付。dsh-gui 用 Electron 承载同一套 DHS 前端，把「浏览器里打开网页」变成「桌面应用」，同时保持 DHS 内核零改动。

---

## 下载

| 平台 | 安装包 | 说明 |
|---|---|---|
| **Windows 10+**（x64） | `dsh-gui-v0.2.0.zip` | 免安装包，解压后双击 `dsh-gui.exe` 启动 |
| **macOS**（Apple Silicon / arm64） | `dsh-gui-0.2.0-arm64.dmg` | 安装包，打开后拖入 Applications 启动 |

下载见 **[GitHub Releases](https://github.com/EricXu20266/dsh-gui/releases)**。首次启动自动安装捆绑的 DHS 依赖（可选国内源加速），免手动配置环境。

## 系统要求

- **Windows 10+**（x64）：免安装包（zip），见上方下载
- **macOS 14+**（Apple Silicon / arm64）：dmg 安装包，见上方下载
- **源码运行**：任何平台均可通过 `pnpm install && pnpm dev` 从源码启动（见「快速开始」）

## 特性

- **原生桌面体验**：独立窗口、系统托盘（X 最小化到托盘、托盘右键退出）、单实例锁、DeepSeek 蓝鲸鱼图标
- **动态端口**：host 以 `dsh web --port 0` 启动，解析就绪 URL 后加载窗口，避免 3080 端口冲突
- **首次安装向导**：5 步流程（欢迎 → 下载源选择 → 下载进度 → 真实校验 → 完成），国内源/原生源/系统代理可选，全程进度真实显示
- **捆绑分发**：打包版捆绑 Node + pnpm + DHS 源码 + 内置插件，首次启动自动装依赖，开箱即用
- **内置插件体系**：捆绑 5 个插件（插件搜索 / Skill 管理 / MCP 管理 / 全局代理 / 关于），覆盖 DHS 的日常管理与扩展——详见下方章节
- **插件 agent 感知**：每个内置插件向 host 注册 `systemPrompt` section，模型每轮会话都能感知已安装插件的能力说明，无需手动提示
- **全局代理**：设置页图形化配置系统代理/手动代理，GUI 启动时注入环境变量，DHS 全链路（LLM 调用 / 内置搜索 / MCP 客户端）走代理
- **中英双语**：界面语言跟随系统，可手动切换，并映射到 DHS 内核 `locale.preference`（内核 UI 跟随）
- **安全基线**：主窗口只允许本机 host origin 导航，外链走系统浏览器，危险权限默认拒绝，向导页启用 CSP
- **安装日志**：安装全过程落盘 `%APPDATA%/dsh-gui/install.log`，失败可追溯
- **零内核改动**：DHS 内核保持官方原样，GUI 只做壳

## 内置插件

dsh-gui 捆绑 5 个插件，除 dsh-about 外均为独立开源仓库，随打包版分发、首次安装自动注册到 DHS profile：

| 插件 | 仓库 | 功能 |
|---|---|---|
| **dsh-discovery** | [EricXu20266/dsh-discovery](https://github.com/EricXu20266/dsh-discovery) | 社区插件搜索 + LLM 安全审计 |
| **dsh-skillmanager** | [EricXu20266/dsh-skillmanager](https://github.com/EricXu20266/dsh-skillmanager) | Skill（技能）图形化管理 |
| **dsh-mcpmanager** | [EricXu20266/dsh-mcpmanager](https://github.com/EricXu20266/dsh-mcpmanager) | MCP server 图形化管理 |
| **dsh-proxy** | [EricXu20266/dsh-proxy](https://github.com/EricXu20266/dsh-proxy) | 全局代理配置 |
| **dsh-about** | 内置（本仓库 `plugins/`） | 设置页「关于」显示版本信息 |

### dsh-discovery — 插件搜索与 LLM 审计

定位是**社区插件的发现与 LLM 审计工具**：DHS 目前没有官方插件市场，第三方插件本质上是可执行代码，因此它刻意做成只读——只负责「发现 → 筛选」，**安全审查交由 LLM 完成**（一键生成审查 prompt，LLM 读源码查风险，通过则装、有风险则停）。

- **浏览**：拉取 GitHub `dsh-plugin` 社区话题下的全部插件仓库（有界分页 + 超时降级）
- **分类**：7 类功能分类 + 其他（UI 增强 / 终端 / 工具 / 记忆 / 模型 / 通知 / 开发）
- **场景**：5 个使用场景（写作 / 开发 / 模型接入 / 自动化 / 通知集成），自动去重限量推荐
- **搜索**：38 词中英同义词表，中文关键词也能命中英文插件数据
- **LLM 审计安装**：一键生成审查 prompt 交给 LLM（读源码/查依赖/识别恶意行为），通过则 `dsh plugin add` 安装、有风险则列出风险点停止；官方（deepseek-ai）标记、已安装标识、**检查更新同样带安全审查**（对比新旧差异，通过才 update）

完整的设计说明（安全模型、拉取规则、场景化筛选规则）见该仓库的 [README](https://github.com/EricXu20266/dsh-discovery)。

### dsh-skillmanager — Skill 管理

DHS 的技能体系**没有中心化注册表——文件即注册**：把 `<name>/SKILL.md` 放进扫描根，宿主自动发现并纳入模型可用目录（`~/.dsh/skills`、`~/.agents/skills` 等 5 个扫描根）。本插件以图形化方式呈现这套体系：技能列表、分组、启用/禁用（frontmatter 权限开关）、新建引导、LLM 审查。技能的创建与编辑由 host agent（LLM）执行，本插件负责「看得清、管得住」。

### dsh-mcpmanager — MCP 管理

DHS 的 MCP **没有独立存储——一个 server = 一条 `@deepseek-ai/dsh-mcp-client` 插件实例**，持久化在 `~/.dsh/profiles/web/cordis.patch.yml`。本插件以表单化方式增删改 MCP server 配置（stdio / streamable-http 两种传输），保存后**热重载生效**（新会话工具列表立即可用，无需重启），并提供 LLM 验证引导。

### dsh-proxy — 全局代理

DHS 网络栈全链路裸 `fetch()`，不读 Windows 系统代理；Node 24+ 支持 `NODE_USE_ENV_PROXY` 环境变量代理（bootstrap-only 安全设计，`.env` 禁止设置代理变量）。本插件在设置页「通用设置」图形化配置系统代理 / 手动代理，持久化到 `~/.dsh/settings.yaml`，由 dsh-gui 启动时注入环境变量，让 LLM 调用 / 内置搜索 / MCP 客户端全链路走代理。

### dsh-about — 关于

设置页「关于」tab（内置插件，随仓库打包、不独立发布），展示 dsh-gui / 内核 / 运行时（Electron + Node）/ 已装插件四层版本信息，方便核对版本与排查问题。

### 插件 agent 感知（systemPrompt section）

每个内置插件在 host 侧注册一段 `systemPrompt` section（`plugin:<id>`），随会话注入模型上下文。模型因此**天然知道已安装哪些插件、各自能做什么**——例如用户问「帮我看看有哪些插件」时，模型直接依据插件注册说明作答，无需额外文档。

## 架构

```
┌─────────────────────────────────────────────┐
│ Electron App（dsh-gui）                       │
│  main 进程 ──spawn──> DHS host 子进程          │
│     │                    └─ apps/cli/bin.js  │
│     │                        --profile web   │
│     │                        --port 0        │
│     │                        → 127.0.0.1:<p> │
│  BrowserWindow loadURL ←─────────────────────┘
└─────────────────────────────────────────────┘
```

- **GUI 壳**：Electron（窗口、托盘、进程管理、安装向导、单实例锁）
- **DHS host**：子进程方式运行官方 `dsh`（打包版用捆绑 Node 24，开发态用系统 Node），内核 100% 保持
- **通信**：本地 HTTP + WebSocket（`127.0.0.1`，端口由 `--port 0` 动态分配，避免 3080 冲突）
- **配置**：`~/.dsh`（DHS 通用 home，web/gui 双模式共用）

> ⚠️ 已知边界：DHS 的 cordis loader 依赖 Node 内部 API（`node-addon-require-builtin`），
> 与 Electron 内置 Node 不兼容——因此 host 走子进程而非 in-process（详见 docs/ARCHITECT.md）。

## 快速开始（开发态）

```bash
# 依赖（workspace 包含 ../deepseek-harness）
pnpm install

# 构建 DHS（首次需要：host lib + client lib + web dist）
pnpm --filter @deepseek-ai/dsh-root run build

# 提交前自检（先格式化，再检查）
pnpm format
pnpm typecheck && pnpm check && pnpm test

# 启动
pnpm build && pnpm start
```

## 打包分发

### Windows（本地打包）

一键脚本（推荐，输出全程 console）：

```bat
build-win-unpacked.bat
```

或手动（package.json 脚本）：

```bash
pnpm package:dir   # 免安装包 → release/win-unpacked/
pnpm package       # nsis 安装包 → release/dsh-gui-setup-*.exe
```

产物见 **[GitHub Releases](https://github.com/EricXu20266/dsh-gui/releases)**。

### macOS（源码构建）

dsh-gui 是 workspace 项目，内核依赖 `deepseek-harness` 必须放在 **dsh-gui 同级目录**（`pnpm-workspace.yaml` 的 `../deepseek-harness`、图标源 `apps/web/public/favicon.svg` 都按此相对路径解析）：

```bash
# 目录布局：两个仓库同级
#   ~/dev/dsh-gui
#   ~/dev/deepseek-harness
git clone https://github.com/EricXu20266/dsh-gui.git
git clone https://github.com/deepseek-ai/deepseek-harness.git

cd dsh-gui
pnpm install                                    # 安装依赖（含 workspace 的 DHS 包）
pnpm --filter @deepseek-ai/dsh-root run build   # 构建 DHS 内核（lib + web dist）

# 开发态运行（用系统 Node，无需捆绑运行时）
pnpm build && pnpm start

# 打包 macOS 应用（Apple Silicon，产物 release/*.dmg + *.zip）
node scripts/gen-icons.mjs                      # 生成 mac 图标（icon-512.png）
pnpm exec electron-builder --mac --arm64 --publish never
```

> 打包版需要捆绑 Node + pnpm 运行时（`resources/runtime/`，该目录被 gitignore，需自行准备）：从 nodejs.org 下载 darwin-arm64 版 Node、从 npm registry 取 pnpm tarball，解压到对应目录即可。

打包版结构：`resources/runtime`（捆绑 Node + pnpm）、`resources/dhs`（DHS 源码种子，不含 node_modules）、`resources/dsh-*`（四个独立插件仓库 + 内置 dsh-about）。首次启动向导会把 DHS 源码复制到 `%APPDATA%/dsh-gui/dhs`（macOS 为 `~/Library/Application Support/dsh-gui/dhs`）后再安装依赖，避免写入应用资源目录。

## 目录结构

```
dsh-gui/
├── electron/        # GUI 壳引擎（main/host/installer/proxy/paths/tray/preload/renderer）
├── plugins/         # 内置插件（dsh-about；其余 4 个为独立仓库）
├── mac-packing-resource/  # 4 个外置插件源码（mac CI 单仓库打包用）
├── platform/        # 平台适配（windows 打包 / macos 预留）
├── resources/       # 资源（图标、打包运行时：捆绑 Node + pnpm）
├── install/         # 安装器配置
├── scripts/         # 构建/打包脚本
├── tests/           # 单元测试（node:test + tsx）
├── tools/           # 辅助工具
└── docs/            # 文档体系（ARCHITECT/DEV-TRACKER/index...）
```

详细文档见 [docs/index.md](docs/index.md)。
