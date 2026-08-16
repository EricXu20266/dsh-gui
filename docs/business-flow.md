# 核心数据流（business-flow）

## 主链路：对话

```
用户（GUI 窗口）
  │ 在 DHS web UI 输入消息
  ▼
Electron BrowserWindow（DHS web UI）
  │ HTTP POST /api/session.prompt（四象限 ClientRequest）
  ▼
DHS host 子进程（127.0.0.1:<动态端口>）
  │ api-proxy → Agent → LLM（DeepSeek API）
  │ 事件流（assistant/message 等）经 WebSocket 下行
  ▼
Electron 窗口实时渲染回复
```

## 启动链路

```
Electron main（app.whenReady）
  │ 单实例锁 → resolve DHS root（打包版优先 userData/dhs）
  ▼
spawn(node, [apps/cli/lib/bin.js, --profile web, --port 0])
  ▼
DHS host 子进程（boot cordis 树 → webserver 起 127.0.0.1:<OS 分配端口>）
  │ 解析 stdout 的 `dsh web: http://127.0.0.1:<port>` 作为就绪信号
  ▼
BrowserWindow loadURL('http://127.0.0.1:<port>')
  ▼
DHS web UI 渲染（会话列表/对话/工具面板）
```

## 单实例链路

```
第二个 dsh-gui 实例启动
  ▼
app.requestSingleInstanceLock() 失败 → 立即退出
  ▼
第一个实例收到 second-instance 事件 → 唤起主窗口（安装期则唤起向导）
```

## 配置链路

```
用户（窗口设置界面 或 直接编辑）
  ▼
~/.dsh/settings.yaml（DHS home）
  ▼
web / gui 双模式共用（下一次 host boot 生效）
```

## 退出链路

```
托盘「退出」/ 系统退出（Cmd+Q 等）
  ▼
before-quit：isQuitting = true
  ▼
stopHost(hostProc) + killTrackedChildren()（host 与安装类子进程随应用退出）
  ▼
窗口 close 放行 → window-all-closed → app.quit()
```

## 首次安装链路

```
打包版启动 → 单实例锁 → DHS 依赖未就绪
  ▼
打开安装向导（下载源/代理/语言）
  ▼
resources/dhs（只读种子）复制到 userData/dhs
  ▼
pnpm install（ndjson 真实进度，失败自动重试 3 次）
  ▼
dsh --version 内核可运行性校验 → 打包版写 .dsh-install-ok 标记（开发态不写内核仓库）
  ▼
安装 5 个内置插件（discovery/skillmanager/mcpmanager/proxy/about）
  ▼
向导关闭 → launchMain
```

## 关键不变量

- host 是**唯一**的数据/逻辑权威；GUI 壳不持有会话状态
- 通信只走 loopback（127.0.0.1），不暴露外网
- 配置只落 `~/.dsh`，GUI 不另起一套
