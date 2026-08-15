# 核心数据流（business-flow）

## 主链路：对话

```
用户（GUI 窗口）
  │ 在 DHS web UI 输入消息
  ▼
Electron BrowserWindow（DHS web UI）
  │ HTTP POST /api/session.prompt（四象限 ClientRequest）
  ▼
DHS host 子进程（127.0.0.1:3080）
  │ api-proxy → Agent → LLM（DeepSeek API）
  │ 事件流（assistant/message 等）经 WebSocket 下行
  ▼
Electron 窗口实时渲染回复
```

## 启动链路

```
Electron main（app.whenReady）
  │ spawn('node', ['apps/cli/lib/bin.js', '--profile', 'web'])
  ▼
DHS host 子进程（boot cordis 树 → webserver 起 127.0.0.1:3080）
  │ waitForPort(3080) 轮询就绪
  ▼
BrowserWindow loadURL('http://127.0.0.1:3080')
  ▼
DHS web UI 渲染（会话列表/对话/工具面板）
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
window-all-closed / before-quit
  ▼
hostProc.kill()（host 子进程随应用退出）
  ▼
app.quit()
```

## 关键不变量

- host 是**唯一**的数据/逻辑权威；GUI 壳不持有会话状态
- 通信只走 loopback（127.0.0.1），不暴露外网
- 配置只落 `~/.dsh`，GUI 不另起一套
