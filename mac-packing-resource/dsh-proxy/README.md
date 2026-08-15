# dsh-proxy

DSH 全局代理管理器——在 DHS 设置页「通用设置」里图形化配置系统代理 / 手动代理，配置持久化到 `~/.dsh/settings.yaml`，配合 DSH-GUI 启动时注入环境变量，让 DHS 全链路（LLM 调用 / 内置搜索 / MCP 客户端）走代理。

## DHS 的网络栈与代理机制（背景）

### 现状：DSH 直连

DHS 的所有网络请求都走 Node 全局 `fetch()`——LLM 调用（`llm-deepseek/adapter.ts`）、内置搜索/抓取工具（`web-search-*`、`web-fetch-http`）、MCP 客户端（AnySearch 等 Streamable HTTP 服务）——全链路**没有任何自定义代理 dispatcher**（源码中搜不到 `ProxyAgent` / `EnvHttpProxyAgent`）。

由此推出三个事实：

1. **Node 的 `fetch()` 不读 Windows 系统代理**。注册表 `Internet Settings` 里的 `ProxyServer`（如 `127.0.0.1:7897`）只对浏览器等 WinHTTP 应用生效，Node 完全无视。
2. **Node 24+ 支持环境变量代理**。设置 `NODE_USE_ENV_PROXY=1` 后，全局 `fetch()` 读取 `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`。
3. **DSH 的代理变量是 bootstrap-only**（`app-boot` 安全设计）：`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`NO_PROXY` 只能由启动 DSH 的进程环境提供，`.env` 文件禁止设置（防恶意 `.env` 把网络重定向到攻击者代理）。

### 结论：DSH 要走代理 = 启动前注入环境变量

```
NODE_USE_ENV_PROXY=1
HTTP_PROXY=http://127.0.0.1:7897
HTTPS_PROXY=http://127.0.0.1:7897
NO_PROXY=localhost,127.0.0.1   # 本地回环（MCP 本地 server 等）不走代理
```

## 插件作用：设置页图形化配置

DHS 原生对代理没有配置入口（只能靠启动 shell 手动设环境变量）。本插件把代理配置变成 DHS 设置页「通用设置」里的一行：

- **滑块开关**：总开关，开启后才注入代理环境变量
- **互斥选项**（二选一）：
  - **默认使用系统代理**：读取 Windows 注册表 `Internet Settings` 的 `ProxyServer`（自动补 `http://` 前缀）
  - **手动配置**：直接填代理地址，默认值 `http://127.0.0.1:7897`，可直接退格改端口
- **保存提示**：「保存后重启应用生效」——代理环境变量在 host 启动时注入，改配置需重启 host
- **持久化**：写入 `~/.dsh/settings.yaml` 的 `proxy:` 节（保形读写，保留文件中其他节与注释）

UI 对齐 DHS 原生设置行（`figma Setting-Cell`）：标题 14px/400、selector h36 r18、`--dsw-alias-bg-module-platform` 底、开关实心 `--dsw-alias-accent`、输入框对齐原生 Input（h32/r8/bg-layer-1，聚焦品牌色高亮）、字体继承系统字体栈（zh/en 双语）。

## 配合机制：谁负责注入

插件本身只负责**配置的持久化与展示**（它运行在 host 进程内，而 host 的 env 在启动时已定，运行时改环境变量对已初始化的 fetch 不生效）。

真正的注入由**启动 DSH 的一方**完成：

| 启动方式 | 注入实现 |
|---|---|
| **DSH-GUI**（推荐） | main 进程 `startHost` 时读取 `settings.yaml` 的 `proxy` 节 → 解析代理地址（`mode: system` 读注册表 / `mode: manual` 用 url）→ 注入 `NODE_USE_ENV_PROXY=1` + `HTTP(S)_PROXY` + `NO_PROXY=localhost,127.0.0.1` → spawn host |
| **dsh web 直接跑** | 无 GUI 注入，需在启动 shell 手动设置环境变量（见上文「结论」） |

DSH-GUI 的注入日志：`[dsh-gui] host proxy: http://127.0.0.1:7897 (NODE_USE_ENV_PROXY=1)`。

## HTTP API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dsh-proxy/get` | 读取当前代理配置 `{ enabled, mode, url }` 与配置文件路径 |
| POST | `/dsh-proxy/update` | 写入代理配置（保形更新 settings.yaml 的 `proxy:` 节） |

## 安装

```sh
# 从 GitHub 安装（首次需要允许构建，dsh 会给出提示，把包 key 加入 profile 的 pnpm-workspace.yaml allowBuilds）
dsh plugin add github:EricXu20266/dsh-proxy

# 或从 npm 安装（预构建产物，无需授权）
dsh plugin add dsh-proxy
```

## 使用

安装后重启 dsh，进入 **设置 → 通用设置**，找到「系统代理」行：

1. 打开滑块开关
2. 选择「默认使用系统代理」（读注册表）或「手动配置」（填代理地址，默认 `http://127.0.0.1:7897`）
3. 点「保存」，重启应用生效

生效后 DHS 的 LLM 调用、内置搜索、MCP 客户端全部走代理（本地回环除外）。关闭滑块并保存后恢复直连。

## 开发

```sh
pnpm install
pnpm build          # tsc 编译 host 侧 → lib/
pnpm bundle:client  # tsdown 打包 client 侧 → client/client.js
```

> 开发期若 profile 通过 `file:` 依赖引用本仓库，改代码后需手动同步构建产物到 profile 的 node_modules（pnpm `file:` 依赖只复制一次，不感知源码变化），并重启 host。

## 许可

MIT
