# dsh-discovery

DSH 插件搜索器（DSH plugin discovery browser）——浏览和搜索 DeepSeek Harness 社区插件的只读工具，不含一键安装。

安装由用户决定：看到感兴趣的仓库 → 自行 `dsh plugin add github:<owner>/<repo>`，本插件不代执行任何安装动作（只读设计）。

## 功能

- **浏览 GitHub `dsh-plugin` 社区插件**（host 只读代理 GitHub API，10 页分页）
- **分类浏览**：7 类功能分类 + 其他
- **场景配置**：5 个使用场景 + 一键/自定义安装指引
- **官方/第三方标记**：DeepSeek 官方蓝底 vs 社区描边
- **中英同义词搜索**：38 词映射表，支持中文/英文关键词
- **已安装标识**：读取 profile manifest bundles，区分内置与用户安装
- **审查安装 / 查看仓库**：内置 Markdown 渲染器预览仓库 README
- **检查更新**：已安装插件生成更新检查 prompt
- **listing 缓存**：sessionStorage + TTL 10 分钟
- **i18n**：zh / en 双语界面

## 安装

```sh
# 从 GitHub 安装（首次需要允许构建，dsh 会给出提示，把包 key 加入 profile 的 pnpm-workspace.yaml allowBuilds）
dsh plugin add github:EricXu20266/dsh-discovery

# 或从 npm 安装（预构建产物，无需授权）
dsh plugin add dsh-discovery
```

## 使用

安装后重启 dsh 会话，侧边栏「新建会话」下方会出现「插件市场」入口，点击打开全屏搜索浏览器。

## 设计原则

只读。不安装、不更新、不卸载——所有安装动作由用户经 `dsh plugin add` 在审查仓库后自行执行。

## 开发

```sh
pnpm install
pnpm build          # tsc 编译 host 侧 → lib/
pnpm bundle:client  # tsdown 打包 client 侧 → client/client.js
```

## 许可

MIT
