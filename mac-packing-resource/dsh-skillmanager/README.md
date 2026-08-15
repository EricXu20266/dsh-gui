# dsh-skillmanager

DSH 技能管理器——以图形化方式查看和管理 DHS 的技能（skill）：列表、分组、启用/禁用、新建引导、LLM 审查。技能的创建与编辑由 host agent（LLM）执行，本插件负责"看得清、管得住"。

## DHS 的技能管理机制（背景）

DHS 的技能体系**没有中心化注册表——文件即注册**：把 `<name>/SKILL.md` 放进扫描根，宿主自动发现并纳入模型可用目录。

### 扫描目录（skill-filesystem provider 默认根）

| 目录 | 来源标记 | 说明 |
|---|---|---|
| `~/.dsh/skills` | user-dsh | DSH 自身技能目录 |
| `~/.agents/skills` | user-agents | **Agent Skills 开放规范**共享目录（Claude Code、Codex、Cursor 等大量工具采用），跨工具复用 |
| `<项目根>/.dsh/skills` | project-dsh | 项目级 DSH 专属 |
| `<项目根>/.agents/skills` | project-agents | 项目级共享 |
| `$DSH_BUNDLED_SKILL_DIR` | bundled | 内置技能（可选） |

> `~/.agents` 是 Anthropic 提出的 Agent Skills 开放规范的共享配置根（非 Claude Code 的 `~/.claude`），DHS 主动兼容——放进 `~/.agents/skills` 的 skill 任何兼容工具都能用。

### 调用方式（双通道）

1. **模型主动调用**：每轮会话注入 `<available_skills>` 目录（skill 名 + 500 字符截断描述），模型用 `skill` 工具加载完整指令
2. **用户显式调用**：对话里输入 `/<skill名>`（kebab-case），宿主把 skill 完整指令注入上下文

### 权限开关（frontmatter）

| frontmatter | 模型调用 | 用户斜杠 |
|---|---|---|
| （缺省） | ✅ | ✅ |
| `disable-model-invocation: true` | ❌ | ✅（唯一入口） |
| `user-invocable: false` | ✅ | ❌ |

### 生效前提

skill 要真正可用，会话必须挂载 `skill-filesystem` + `tool-skill` 插件——web profile 默认 preset 为 `standard`（已挂载）；`minimal` 极简 preset 只有两个工具，无 skill 能力。

## 插件作用：图形化管理

DHS 原生对 skill 只有"文件系统 + 会话注入"，用户难以直观看到和管理。本插件在侧边栏提供「技能管理」面板：

- **技能列表**：扫描文件系统（`~/.dsh/skills`、`~/.agents/skills`、`$DSH_BUNDLED_SKILL_DIR`），解析 SKILL.md frontmatter——**不依赖 preset 是否加载 provider**，管理以文件系统为准（面板看到 = 文件已落盘）
- **三视图**：全部 / 按来源（user-dsh、user-agents、project、bundled）/ 按合集（metadata.group + subgroup）
- **双开关**：「模型可以调用」「用户可调用」独立启停（写 frontmatter，DHS 原生读取）
- **合集管理**：设置/清除 group/subgroup，组内一键全部启用/禁用
- **详情**：触发时机、正文预览、文件路径
- **新建技能**：引导 DHS 在 `~/.dsh/skills/<name>/` 创建（LLM 按 prompt 写入 SKILL.md）
- **LLM 审查**：一键生成审查 prompt 交 DHS（指令质量/安全风险/改进建议），需要修改时直接编辑文件
- **i18n**：zh / en 双语

## 安装

```sh
# 从 GitHub 安装（首次需要允许构建，dsh 会给出提示，把包 key 加入 profile 的 pnpm-workspace.yaml allowBuilds）
dsh plugin add github:EricXu20266/dsh-skillmanager

# 或从 npm 安装（预构建产物，无需授权）
dsh plugin add dsh-skillmanager
```

## 使用

安装后重启 dsh 会话，侧边栏出现「技能管理」入口。新增/修改 skill 文件后 watcher 自动发现，无需重启。

## 开发

```sh
pnpm install
pnpm build          # tsc 编译 host 侧 → lib/
pnpm bundle:client  # tsdown 打包 client 侧 → client/client.js
```

> 开发期若 profile 通过 `file:` 依赖引用本仓库，改代码后需手动同步构建产物到 profile 的 node_modules（pnpm `file:` 依赖只复制一次，不感知源码变化），并重启 host。

## 许可

MIT
