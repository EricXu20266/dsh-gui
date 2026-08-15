# Changelog — 2026-08-15

## 初始化
- 创建项目结构（electron/platform/resources/install/scripts/tools/docs）
- 配置开发环境与工作流（L2 宪法 dhs-gui.md）
- 初始化 Git 仓库（main 分支）
- P0 里程碑：Electron 窗口 + DHS host 子进程 + 对话链路全通

## dsh-discovery 插件搜索器（自研，替代第三方 dshmarket）
- 浏览/搜索 GitHub dsh-plugin 主题社区插件（host 只读代理 GitHub API，10 页分页）
- 分类浏览（7 类 + 其他）+ 场景配置（5 场景 + 一键/自定义安装）
- 官方/第三方标记（DeepSeek 蓝底 vs 描边）+ 卡片 UI 打磨（右对齐/hover/tooltip/蓝底 Tab）
- 审查安装 / 查看仓库（自写 markdown 渲染器）/ 检查更新（已安装插件开会话发 prompt）
- 中英同义词搜索（38 词映射表）+ 搜索命中分类名按分类归属匹配
- listing 缓存（sessionStorage + TTL 10 分钟，页面刷新/模块重载仍命中）+ 上次刷新时间
- 已安装标识（读 profile manifest bundles，SVG 对勾 + hover 提示）
- i18n（zh/en 字典接入 DHS locale 服务，含分类标签）
- 外链走系统默认浏览器（electron setWindowOpenHandler + shell.openExternal）
- 国内源兜底提示（阿里/清华 npm 镜像，仅加速安装不提供查看）
