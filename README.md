# dsh-gui — DeepSeek Harness 桌面客户端

> DHS (DeepSeek Harness) 的 Electron GUI 客户端：把 web ui 的使用方式封装为原生桌面 GUI。内核最大限度的保持 DHS。

[![Electron](https://img.shields.io/badge/Electron-43+-blue.svg)](https://www.electronjs.org)
[![Node](https://img.shields.io/badge/Node-24+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

DHS 官方以 web ui（浏览器）形态交付。dsh-gui 用 Electron 承载同一套 DHS 前端，把「浏览器里打开网页」变成「桌面应用」，同时保持 DHS 内核零改动。

---

## 特性

- **原生桌面体验**：独立窗口、系统托盘（X 最小化到托盘、托盘右键退出）、DeepSeek 蓝鲸鱼图标
- **首次安装向导**：5 步流程（欢迎 → 下载源选择 → 下载进度 → 检查 → 完成），国内源/原生源/系统代理可选，全程进度真实显示
- **捆绑分发**：打包版捆绑 Node + pnpm + DHS 源码，首次启动自动装依赖（可选国内源加速），免手动配置环境
- **内置插件搜索系统**：捆绑 dsh-discovery（一个 DSH 插件，独立开源仓库），首次安装自动注册，开箱即用——详见下方章节
- **中英双语**：界面语言跟随系统，可手动切换，并映射到 DHS 内核 `locale.preference`（内核 UI 跟随）
- **安装日志**：安装全过程落盘 `%APPDATA%/dsh-gui/install.log`，失败可追溯
- **零内核改动**：DHS 内核保持官方原样，GUI 只做壳

## 内置插件搜索系统（dsh-discovery）

dsh-gui 内置了一个**插件搜索系统**——它本身就是一个 DSH 插件，来自独立开源仓库 [EricXu20266/dsh-discovery](https://github.com/EricXu20266/dsh-discovery)，随打包版捆绑并在首次安装时自动注册到 DHS profile。

定位是**社区插件的发现与审计工具**：DHS 目前没有官方插件市场，第三方插件本质上是可执行代码，因此它刻意做成只读——只负责「发现 → 筛选 → 审查」，安装永远由你在预览仓库后自行执行 `dsh plugin add`。

能力概览：

- **浏览**：拉取 GitHub `dsh-plugin` 社区话题下的全部插件仓库（有界分页 + 超时降级）
- **分类**：7 类功能分类 + 其他（UI 增强 / 终端 / 工具 / 记忆 / 模型 / 通知 / 开发）
- **场景**：5 个使用场景（写作 / 开发 / 模型接入 / 自动化 / 通知集成），自动去重限量推荐
- **搜索**：38 词中英同义词表，中文关键词也能命中英文插件数据
- **审计**：内置 Markdown 渲染器预览仓库 README、官方（deepseek-ai）vs 社区标记、已安装标识、检查更新

完整的设计说明（安全模型、拉取规则、场景化筛选规则）见该仓库的 [README](https://github.com/EricXu20266/dsh-discovery)。

## 架构

```
┌─────────────────────────────────────────────┐
│ Electron App（dsh-gui）                       │
│  main 进程 ──spawn──> DHS host 子进程          │
│     │                    └─ apps/cli/bin.js  │
│     │                        --profile web   │
│     │                        → 127.0.0.1:3080│
│  BrowserWindow loadURL ←─────────────────────┘
└─────────────────────────────────────────────┘
```

- **GUI 壳**：Electron（窗口、托盘、进程管理、安装向导）
- **DHS host**：子进程方式运行官方 `dsh`（打包版用捆绑 Node 24，开发态用系统 Node），内核 100% 保持
- **通信**：本地 HTTP + WebSocket（`127.0.0.1:3080`）
- **配置**：`~/.dsh`（DHS 通用 home，web/gui 双模式共用）

> ⚠️ 已知边界：DHS 的 cordis loader 依赖 Node 内部 API（`node-addon-require-builtin`），
> 与 Electron 内置 Node 不兼容——因此 host 走子进程而非 in-process（详见 docs/ARCHITECT.md）。

## 快速开始（开发态）

```bash
# 依赖（workspace 包含 ../deepseek-harness）
pnpm install

# 构建 DHS（首次需要：host lib + client lib + web dist）
pnpm --filter @deepseek-ai/dsh-root run build

# 启动
pnpm build && pnpm start
```

## 打包分发

```bash
# 构建 + 打包（win-unpacked 目录）
pnpm build
pnpm exec electron-builder --win dir
node scripts/apply-exe-icon.mjs   # electron-builder 26 的 exe 图标编辑有静默 bug，需手动嵌入
```

打包版结构：`resources/runtime`（捆绑 Node + pnpm）、`resources/dhs`（DHS 源码，不含 node_modules，首次启动向导自动安装）、`resources/dsh-discovery`（内置插件）。

## 目录结构

```
dsh-gui/
├── electron/        # GUI 壳引擎（main/preload/renderer/安装向导）
├── plugins/         # 内置插件（dsh-discovery 插件搜索系统）
├── platform/        # 平台适配（windows 打包 / macos 预留）
├── resources/       # 资源（图标、打包运行时）
├── install/         # 安装器配置
├── scripts/         # 构建/打包脚本
├── tools/           # 辅助工具
└── docs/            # 文档体系（ARCHITECT/DEV-TRACKER/index...）
```

详细文档见 [docs/index.md](docs/index.md)。
