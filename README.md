# dhs-gui — DeepSeek Harness 桌面客户端

> DHS (DeepSeek Harness) 的 Electron GUI 客户端：把 web ui 的使用方式封装为原生桌面 GUI。内核最大限度的保持 DHS。

[![Electron](https://img.shields.io/badge/Electron-43+-blue.svg)](https://www.electronjs.org)
[![Node](https://img.shields.io/badge/Node-24+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

DHS 官方以 web ui（浏览器）形态交付。dhs-gui 用 Electron 承载同一套 DHS 前端，把「浏览器里打开网页」变成「桌面应用」，同时保持 DHS 内核零改动。

---

## 架构

```
┌─────────────────────────────────────────────┐
│ Electron App（dhs-gui）                       │
│  main 进程 ──spawn──> DHS host 子进程（系统 Node）│
│     │                    └─ apps/cli/bin.js  │
│     │                        --profile web   │
│     │                        → 127.0.0.1:3080│
│  BrowserWindow loadURL ←─────────────────────┘
└─────────────────────────────────────────────┘
```

- **GUI 壳**：Electron（窗口、进程管理、后续的原生增强）
- **DHS host**：以子进程方式运行官方 `dsh`（系统 Node 24），内核 100% 保持
- **通信**：本地 HTTP + WebSocket（`127.0.0.1:3080`）
- **配置**：`~/.dsh`（DHS 通用 home，web/gui 双模式共用）

> ⚠️ 已知边界：DHS 的 cordis loader 依赖 Node 内部 API（`node-addon-require-builtin`），
> 与 Electron 内置 Node 不兼容——因此 host 走子进程而非 in-process（详见 docs/ARCHITECT.md）。

## 快速开始

```bash
# 依赖（workspace 包含 ../deepseek-harness）
pnpm install

# 构建 DHS（首次需要：host lib + client lib + web dist）
pnpm --filter @deepseek-ai/dsh-root run build

# 启动
pnpm build && pnpm start
```

## 目录结构

```
dhs-gui/
├── electron/        # GUI 壳引擎（main/preload/renderer）
├── platform/        # 平台适配（windows 打包 / macos 预留）
├── resources/       # 资源（图标等）
├── install/         # 安装器配置
├── scripts/         # 构建/打包脚本
├── tools/           # 辅助工具
└── docs/            # 文档体系（ARCHITECT/DEV-TRACKER/index...）
```

详细文档见 [docs/index.md](docs/index.md)。
