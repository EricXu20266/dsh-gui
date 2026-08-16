# dsh-gui 架构骨架（ARCHITECT）

> 用「1+3+3+场」拓扑 + Root 判定四条标准收敛。借鉴 IME 结构，内容针对 DHS GUI 客户端定制。

## 一、拓扑分析（1+3+3+场）

### 心跳「1」：应用引擎 —— Electron main loop + host 生命周期管理

- **框架自带**：Electron main loop（app.whenReady / window-all-closed / before-quit）
- **自研（注入点）**：DHS host 子进程的生命周期管理——spawn（`--port 0`）、stdout URL 就绪信号解析、崩溃退出（exit → app.quit）、退出清理（stopHost）
- 注入点清单：
  - `app.whenReady` → `launchMain()`（单实例锁 → spawn node → bin.js --profile web --port 0）
  - `app.on('before-quit')` → `isQuitting = true` + `stopHost()` + `killTrackedChildren()`
  - `hostProc.on('exit')` → host 崩溃处理（fail-loud：非退出流程中 host 退出则 app.quit）

### 三角（物理必然）：前台 — 后台 — 存储

| 三角 | 实体 | 落点 |
|------|------|------|
| 前台（交互端） | Electron BrowserWindow + DHS web UI | `electron/main.ts` + DHS dist |
| 后台（逻辑端） | DHS host（子进程，内核 100% 官方） | `apps/cli/bin.js --profile web --port 0` |
| 存储（持久端） | `~/.dsh`（DHS home：profiles/sessions/storages/settings.yaml） | 不接管，透传 |

> 三角里「后台」刻意外包给 DHS 官方进程——这是本项目的核心决策：**内核最大限度的保持 DHS**。
> 我们的业务面只在 GUI 壳（前台 + 生命周期）。

### 三条流（居中）：通道 · 跟踪 · 呈现

| 流 | 实体 | 说明 |
|----|------|------|
| 通道 | HTTP + WebSocket（127.0.0.1，`--port 0` 动态分配） | `/api/<method>` RPC 四象限协议 + 下行事件流 |
| 跟踪 | host 日志管道（stdout/stderr → 主进程日志） | 启动时透传、崩溃诊断 |
| 呈现 | DHS web UI（React dist） | 完整复用官方前端，不重写 |

### 场（横切品质）

| 场 | 姿态 | 落点 |
|----|------|------|
| 安全 | loopback-only（127.0.0.1）+ will-navigate 白名单 + permission 默认拒绝 | 不额外暴露端口，主窗口只允许本机 host origin |
| 可靠 | host 崩溃 → 应用退出（fail-loud），启动超时自动清理子进程 | `host.ts` 的 exit/error/timeout 三路处理 |
| 性能 | 子进程隔离（host 与 GUI 互不阻塞） | 子进程方案 |
| 配置 | `~/.dsh` 透传（web/gui 共用一份）；settings.yaml 写入走 tmp+rename | 不复制不接管，解析失败不覆盖 |
| 生命周期 | spawn（--port 0）→ 解析 `dsh web: http://…` 就绪信号 → stopHost 清理 | `startHost()` / `stopHost()` |

---

## 二、Root 裁剪（四条标准）

> 每条 Root 满足：①白话 ②正交 ③独立演化 ④缺位可证伪

| # | Root | 白话 | 裁/留理由 |
|---|------|------|-----------|
| 1 | **GUI 壳引擎** | 窗口怎么开、host 怎么跟着活 | 留——本项目的核心存在理由 |
| 2 | **Host 集成层** | host 怎么起、怎么连、怎么管 | 留——进程管理 + 协议感知（--port 0 / stdout 就绪信号 / 退出处理） |
| 3 | **平台/打包** | 怎么变成用户能装的桌面应用 | 留——桌面应用的交付形态（win-unpacked / mac CI 已跑通） |
| 4 | 数据模型与持久化 | 存什么 | **裁**——存储全在 DHS host（~/.dsh），GUI 零存储 |
| 5 | 业务领域层 | 应用做什么 | **裁**——业务逻辑全在 DHS（agent 会话/工具/记忆），GUI 不重复 |
| 6 | 身份与权限 | 谁能干什么 | **裁**——单机单用户，权限模型在 DHS host 内部 |
| 7 | 状态管理 | 此刻应用知道什么 | **裁**——窗口状态极简（开/关/加载），会话状态在 host |
| 8 | 呈现层 | 长什么样 | **裁**——复用 DHS web UI，不重写（核心决策） |
| 9 | 可观测性 | 发生了什么 | 合并进 Root 2（host 日志透传 + 主进程日志） |
| 10 | 可靠性 | 错了能回退 | 并入 Root 1（崩溃处理） |
| 11 | 性能 | 跑得快 | 并入 Root 2（子进程隔离即性能方案） |
| 12 | 生命周期 | 怎么部署升级 | 并入 Root 3（打包分发） |

**结论：4 个 Root。** 桌面单用户 + 内核外包决定了裁剪方向——GUI 壳只做「窗口 + host 生命周期 + 打包」，其余全部归属 DHS。

---

## 三、技术方向

| 维度 | 决策 | 理由 |
|------|------|------|
| GUI 框架 | Electron 43 | 官方 RFC 预留路线，Node 24 兼容 |
| Host 运行 | 独立 Node 子进程（打包版捆绑 Node，开发态系统 Node） | DHS cordis loader 依赖 Node 内部 API，Electron 内置 Node 不兼容 |
| 通信 | 本地 HTTP/WS（loopback） | DHS 原生协议，零改动 |
| 构建 | esbuild（main bundle） | 轻量，main 只依赖 electron + node 内置 |
| 打包 | electron-builder | 捆绑 node/pnpm/DHS 源码/插件；win-unpacked + mac arm64 |
| 语言 | TypeScript | 全栈统一 |

---

## 四、模块划分（Branch 生长方向）

| 模块 | 归属 Root | 状态 |
|------|-----------|------|
| `electron/main.ts` 窗口 + host 生命周期 + 单实例 | Root 1 | ✅ 完成 |
| `electron/preload.ts` IPC 载体（安装向导） | Root 2 | ✅ 完成（原生对话框/通知仍为 P1） |
| `electron/{paths,proxy,installer,host,tray}.ts` 模块拆分 | Root 1/2/3 | ✅ 完成 |
| `electron/{child-process,log,types}.ts` 子进程托管 / 安装日志 / 共享类型 | Root 2/3 | ✅ 完成 |
| `platform/windows` 打包配置 | Root 3 | ✅ win-unpacked 可用 |
| 首次安装器（userData/dhs + 5 插件注册） | Root 3 | ✅ 完成 |
| 系统托盘/单实例 | Root 1 | ✅ 完成 |
