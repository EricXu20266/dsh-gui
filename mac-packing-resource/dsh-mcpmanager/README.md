# dsh-mcpmanager

DSH MCP 管理器——以图形化方式查看和管理 DHS 的 MCP server 配置：列表、表单化增删改、启用/禁用、LLM 验证。配置持久化与 DHS 原生机制完全一致（cordis.patch.yml），保存后**热重载生效**。

## DHS 的 MCP 管理机制（背景）

DHS 的 MCP **没有独立存储——一个 server = 一条 `@deepseek-ai/dsh-mcp-client` 插件实例**，持久化在 profile 的 patch 层：

```
~/.dsh/profiles/web/cordis.patch.yml
```

```yaml
# stdio 型（spawn 子进程）
- insert:
    - id: mcp-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: github
        transport: stdio
        command: npx
        args: ['-y', '@modelcontextprotocol/server-github']
        env: { GITHUB_TOKEN: ... }

# streamable-http 型（远程服务）
- insert:
    - id: mcp-web
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: web
        transport: streamable-http
        url: https://example.com/mcp
        headers: { Authorization: ... }
```

### 关键机制

- **工具命名**：连接后每个工具注册为 `mcp__<serverName>__<rawName>`（与 Claude Code/Codex 同款命名），名字是 serverName+rawName 的纯函数，连接顺序不影响
- **加载链路**：host 启动 → 解析 profile 配置 → 每个 mcp-client 实例连接 server → `listTools()` 发现 → 工具注入 `ctx.tools` → 模型当普通工具调用
- **热重载（HMR）**：编辑配置条目触发 disconnect + reconnect，**无需重启进程**——保存后新会话工具列表立即出现 `mcp__<serverName>__*`
- **断线重连**：自动指数退避（500ms 起 → 30s 封顶，10 次上限）；恢复后替换工具代（不重复不泄漏）；超限卸载工具停止重连
- **`!!js` 表达式**：cordis patch 允许 `!!js <expr>` 动态求值（如从环境变量注入 API key），由 Schemastery 执行

## 插件作用：图形化管理

DHS 原生对 MCP 只有"手写 YAML + 重启生效"的方式，用户难以可视化操作。本插件在侧边栏提供「MCP 管理」面板：

- **配置列表**：解析 `cordis.patch.yml` 的 mcp-client 实例，显示 serverName / transport / command / url / 启用状态（env 值脱敏，只显示键名）
- **表单化增删改**：新增/编辑走可视化表单（id / serverName / transport 下拉（stdio、streamable-http）/ command / args / env / url / headers / cwd）
- **启用/禁用**：cordis patch `disabled: true` 原生机制——禁用保留配置、host 不加载，可随时再启用
- **保存即热重载**：保存后自动生效，无需重启——「让 LLM 验证连接」引导 DHS 去新会话确认 `mcp__*` 工具是否出现
- **`!!js` 兼容**：解析器容忍 `!!js` 表达式（保留原文不执行不崩溃），GUI 以静态字符串展示；需要执行语义请直接手改 patch 文件
- **内置 Node 运行（打包版稳定性）**：保存时若 command 是 `npx`，自动扫描 npm `_npx` 缓存解析为「当前 Node + 包入口 js」直调——跳过系统 PATH 依赖（打包版 host 用捆绑 Node 运行，系统可能没有 npx）
- **i18n**：zh / en 双语

## 安装

```sh
# 从 GitHub 安装（首次需要允许构建，dsh 会给出提示，把包 key 加入 profile 的 pnpm-workspace.yaml allowBuilds）
dsh plugin add github:EricXu20266/dsh-mcpmanager

# 或从 npm 安装（预构建产物，无需授权）
dsh plugin add dsh-mcpmanager
```

## 使用

安装后重启 dsh 会话，侧边栏出现「MCP 管理」入口。新增/编辑/删除 server 后保存即热重载生效，无需重启 host。

## 开发

```sh
pnpm install
pnpm build          # tsc 编译 host 侧 → lib/
pnpm bundle:client  # tsdown 打包 client 侧 → client/client.js
```

> 开发期若 profile 通过 `file:` 依赖引用本仓库，改代码后需手动同步构建产物到 profile 的 node_modules（pnpm `file:` 依赖只复制一次，不感知源码变化），并重启 host。

## 许可

MIT
