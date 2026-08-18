# Changelog — 2026-08-19

## DHS 内核升级 0.1.0-rc.7（依赖同步）
- 升级 DHS 内核到 `0.1.0-rc.7`（官方 release），workspace 依赖同步
- `node-pty` 1.1.0 → 1.2.0-beta.15（DHS PR #2517），patch 引用更新，native 预编译二进制加载验证通过（win32-x64 spawn 实测 OK）
- lock 新增 `@deepseek-ai/dsh-attachment` / `dsh-attachment-local` 等 rc.7 引入的 workspace 包
- 修复 DHS ui-sidebar `slots.ts`：`sidebar.primary.action` slot 声明后漏补 `PropsRenderSlots` 联合类型，导致 tsc 构建失败（TS2345）；已修复并跑通 DHS 全量构建
- DHS host 运行时验证：`dsh web --port 0` 就绪信号（`dsh web: http://127.0.0.1:<port>`）正常，DSH-GUI host.ts 解析协议兼容
- DSH-GUI 侧 typecheck / biome（71 文件）/ test（4/4）全绿

## 备注
- DHS 内核 `ui-sidebar` 含 dsh-gui 定制（`sidebar.primary.action` slot，供插件市场等 5 个插件挂载）——未提交到 DHS 仓库，保持工作区改动；每次 DHS 升级 pull 前需注意该文件
