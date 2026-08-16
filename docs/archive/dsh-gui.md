# dsh-gui — 开发环境与工作流

> 🗄️ **历史归档**：本文件是 2026-08-15 的 L2 宪法快照，仅作历史留存。
> 现行宪法见仓库根目录 [`DSH-GUI.md`](../../DSH-GUI.md)；2026-08-16 起的主要变更见
> [`docs/changelogs/CHANGELOG_2026-08-16.md`](../changelogs/CHANGELOG_2026-08-16.md)。

> 📘 本文件由 AI 自动生成，是项目的 **L2 宪法**。
> 所有 AI 辅助开发遵循此文件的约定。
> 配置是活的——需要调整时告诉 AI 即可。

---

## 项目信息

| 字段 | 值 |
|------|-----|
| 项目名称 | dsh-gui (DeepSeek Harness GUI) |
| 项目类型 | 桌面应用（Electron GUI 客户端） |
| 技术栈 | Electron 43 + Node 24 + TypeScript + esbuild + Biome |
| 内核依赖 | [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — 本地 workspace 引用，内核零改动 |
| 团队规模 | 个人项目 |
| 生成日期 | 2026-08-15 |

---

## 目录结构

```
dsh-gui/
├── .editorconfig              # 编辑器行为统一
├── .gitignore
├── biome.json                 # Lint + Format 配置
├── DSH-GUI.md                 # 本文件 — L2 宪法
├── electron/                  # GUI 壳引擎（核心）
│   ├── main.ts                # 主进程：spawn DHS host + 窗口生命周期
│   ├── preload.ts             # preload 桥（IPC 载体，P1 启用）
│   └── renderer/              # 渲染层（自绘 UI，预留）
├── plugins/
│   └── dsh-discovery/         # 自研 DHS 插件：插件搜索器（浏览 GitHub 社区插件）
├── platform/
│   ├── windows/               # Windows 打包（electron-builder 配置）
│   └── macos/                 # 预留
├── resources/                 # 资源（应用图标等）
├── install/                   # 安装器脚本/配置
├── scripts/                   # 构建脚本（build-main.mjs 等）
├── tools/                     # 辅助工具
├── docs/
│   ├── ARCHITECT.md           # 架构骨架
│   ├── DEV-TRACKER.md         # 需求看板
│   ├── business-flow.md       # 核心数据流
│   ├── index.md               # 文档索引入口
│   ├── CHANGELOG              # 版本变更记录
│   ├── modules/               # 模块规格
│   ├── changelogs/            # 变更日志归档
│   ├── bugs/                  # Bug 修复记录
│   ├── handoff/               # 会话交接
│   ├── reference/             # 参考资料
│   └── archive/               # 历史归档
├── package.json               # pnpm workspace 根（包含 ../deepseek-harness）
├── pnpm-workspace.yaml        # workspace 配置（DHS 并入）
├── tmp/（运行时生成，gitignore）
└── dist/（构建产物，gitignore）
```

> DHS 仓库（`../deepseek-harness`）是 workspace 成员：`@deepseek-ai/*` 包可直接引用，内核不 fork 不修改。

---

## 环境分层

| 环境 | 用途 | 运行位置 | 配置 |
|------|------|----------|------|
| DEV  | 日常开发 | 本地机器 | `~/.dsh`（DHS home，web/gui 共用）|
| PROD | 最终用户 | 用户机器 | 捆绑 node + 打包分发（P1）|

> DHS 的配置（API key、模型、profile）统一在 `~/.dsh`，GUI 与 web 模式共用一份。

---

## 版本控制

### 远程仓库
- 平台：GitHub
- 仓库：`dsh-gui`（重名则 `dsh-gui-taishen`）
- 认证方式：HTTPS Token（gh CLI）

### 分支模型
```
main（稳定） ←── feature/*（开发，--no-ff 合并）
```

### Commit 规范
- 格式：`type: description`（feat/fix/chore/docs/refactor）
- AI 代码标注：`[AI:泰深]` 前缀

### 远程推送策略
指令推送——用户说「推送」AI 才 push。

---

## 工作流

### 编码循环

```
需求描述 → AI 生成代码 → typecheck + biome → commit
     ↑                        ↓
     └────── 不通过，修复 ←───┘
```

### AI 自检契约（硬规则）

| 检查 | 命令 | 不通过的后果 |
|------|------|-------------|
| typecheck | `pnpm exec tsc --noEmit -p tsconfig.json`（如配置） | 拒绝 commit |
| lint | `pnpm exec biome check .` | 先 `--write` 修复，修不了拒绝 commit |
| 运行验证 | `pnpm start`（窗口拉起 + host 就绪） | 拒绝 commit |

**任何一项不通过 → 禁止 commit。**

### 涉及 DHS 的改动红线
- **不修改** `../deepseek-harness` 下任何文件（内核保持）
- DHS 升级：重新 `pnpm install` + `pnpm --filter @deepseek-ai/dsh-root run build`
- 协议无版本字段——client 与 host 绑定发布，跟随 DHS 版本

---

## 工具链

| 类别 | 工具 | 备注 |
|------|------|------|
| 编辑器 | VS Code | 推荐 |
| 包管理 | pnpm 11 | workspace 根 |
| 代码格式化 | Biome | lint + format 一体 |
| 构建 | esbuild | main 进程 bundle |
| 打包 | electron-builder | P1 |
| 运行时 | Node 24 + Electron 43 | 系统 Node 跑 DHS host |

---

## 文档管理

`docs/index.md` 是文档索引入口。AI 主动维护：
- 新需求 → `docs/DEV-TRACKER.md`
- 变更 → `docs/changelogs/CHANGELOG_{日期}.md`
- Bug → `docs/bugs/BUG_{日期}.md`
- 会话结束 → `docs/handoff/`
- 过时文档 → 移入 `docs/archive/`（不删除）

---

## 变更记录

| 日期 | 变更内容 | 原因 |
|------|----------|------|
| 2026-08-15 | 初始创建（P0 完成：webui→gui + 对话链路全通） | POC 验收通过 |
| 2026-08-15 | 自研 dsh-discovery 插件搜索器（浏览/搜索/已安装标识/检查更新/中英搜索） | 替代第三方 dshmarket |
