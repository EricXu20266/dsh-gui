# Changelog — 2026-08-16

## 全量代码审查整改
- 依赖修正：`biome`（旧环境变量工具）→ `@biomejs/biome@1.9.4`；新增 typecheck/test/lint/format 脚本与 tsconfig
- 模块拆分：`electron/` 下新增 `paths.ts` / `proxy.ts` / `installer.ts` / `host.ts` / `tray.ts` / `child-process.ts` / `log.ts` / `types.ts`
- 路径：移除 `E:/AllinDeepSeek/deepseek-harness` 硬编码，开发态改为 `../deepseek-harness`
- 生命周期：合并重复 window-all-closed / before-quit，修复向导关闭 → launchMain 竞态，补齐 mac Cmd+Q 语义与 mainWin 置空
- 端口：host 改 `dsh web --port 0` 动态端口，解析 stdout URL 作为就绪信号，消除 3080 冲突
- 单实例：`requestSingleInstanceLock` + second-instance 唤起
- 安装布局：打包版从 resources/dhs 复制到 userData/dhs 再安装；`.dsh-install-ok` 完成标记；兼容旧布局
- 插件：首次安装注册 5 个插件（discovery/skillmanager/mcpmanager/proxy/about），与 README 一致
- i18n：pnpm 进度、插件安装、错误文案跟随向导 zh/en
- 校验：向导第 4 步展示主进程真实 checks 结果
- 安全：主窗口 will-navigate 限制 + permission handler；向导页 CSP；sandbox: true
- 代理：normalize 手动代理，解析 Windows 多段 ProxyServer，支持 macOS scutil；NO_PROXY 含 ::1
- 配置：settings.yaml 原子写入，YAML 损坏不覆盖
- 打包：build-win-unpacked.bat 补 apply-exe-icon 步骤并支持 CI
- 依赖：pnpm-workspace.yaml 的 `allowBuilds` 移除 `name@file:` 键，修复 pnpm 11 `ERR_PNPM_INVALID_VERSION_UNION`
- 文档：README/EN、DSH-GUI、ARCHITECT、business-flow、DEV-TRACKER、CHANGELOG、docs/index、handoff 同步；docs/archive 旧宪法加归档提示
