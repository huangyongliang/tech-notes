# AI 编程助手与 IDE {#ai-ide-ai-coding-tools}

> [AI](../) › AI 编程助手与 IDE

开发者日常使用的 AI 编程工具全景：AI 原生 IDE、IDE 插件、终端 CLI Agent 和云端异步 Agent。重点比较交互形态、模型选择、上下文与规则机制、MCP 支持、企业合规和国内可用性。

> 相关主题：[编程智能体工作流](../12-coding-agents/) · [MCP 协议与开发](../10-mcp/) · [代码模型与评测](../13-code-models-evals/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 第一章入门的工具关：选好并用熟一套 AI 编程工具，后面各关都在用它 |
| 前置要求 | 会用 Git 与命令行；[模型全景](../04-model-landscape/) 有助于理解各工具背后的模型 |
| 粗略用时 | 3–5 天（粗略参考） |
| 章节 | 第一章 入门 |

## 闯关任务

**QUEST 11 · 第一章 入门**

- [ ] 能够区分 AI 原生 IDE、IDE 插件、终端 CLI Agent、云端异步 Agent 四种形态及各自适合的任务。
- [ ] 能够安装并配置至少一个 CLI Agent 和一个 IDE 工具，完成一次「读代码 → 修改 → 跑测试」的任务。
- [ ] 能够为工具接入一个 MCP Server，并理解权限与审批设置。
- [ ] 能够从模型自由度、隐私合规、计费方式、团队规则共享等维度为团队做工具选型。

**奖励**：+100 XP · 徽章「结对编程家」（徽章名暂定，内容建设中）

## 知识要点

### 四种形态

```mermaid
flowchart LR
    A[补全] --> B[IDE 内对话]
    B --> C[IDE Agent 模式]
    C --> D[终端 CLI Agent]
    D --> E[云端异步 Agent]
```

- AI 原生 IDE：Cursor、Devin Desktop（原 Windsurf）、Kiro（AWS）、TRAE（字节）、Qoder（阿里），把补全、对话和 Agent 模式集成在编辑器里。
- IDE 插件：GitHub Copilot、通义灵码、Cline、Kilo Code、Gemini Code Assist，装进 VS Code 或 JetBrains 即用，迁移成本低。
- 终端 CLI Agent：Claude Code、Codex CLI、Gemini CLI、GitHub Copilot CLI、Qwen Code、Kimi CLI、OpenCode，在仓库目录里直接读写文件、运行命令，也能脚本化进 CI。
- 云端异步 Agent：Copilot coding agent、Codex 云任务、Devin、Cursor 云 Agent，从 Issue 出发在云端沙箱中工作，最后提交 PR。
- 越往右自主性越高，越需要清晰的任务描述、可运行的测试和代码评审，见 [编程智能体工作流](../12-coding-agents/)。

### 上手 CLI Agent

```bash
# Claude Code（官方推荐原生安装脚本，也可用 Homebrew 或 npm）
curl -fsSL https://claude.ai/install.sh | bash

# OpenAI Codex CLI
npm install -g @openai/codex

# Gemini CLI
npm install -g @google/gemini-cli

# 在项目目录中启动并接入一个远程 MCP Server
cd my-project
claude mcp add --transport http notes https://mcp.example.com/mcp
codex mcp add notes --url https://mcp.example.com/mcp
```

- 第一次使用先让 Agent 只读地解释代码结构，再给出带验收标准的小任务。
- 规则文件（`AGENTS.md`、`CLAUDE.md` 等）告诉 Agent 构建命令、测试命令和代码规范，写法见第 12 关。
- 权限模式：默认每次写文件或运行命令前询问；自动执行模式只在容器或 worktree 等隔离环境中开启。

### 选型维度

- 交互形态：要实时补全选 IDE 或插件；要整块任务托管选 CLI 或云端 Agent。
- 模型自由度：有的工具绑定自家模型，有的可切换多家模型或接入自部署模型。
- 隐私与合规：代码是否出境、是否用于训练、是否支持私有化部署，企业版通常提供零数据保留选项。
- 计费方式：按席位订阅、按请求次数或按 Token 计费，Agent 模式的消耗远高于补全。
- 团队协作：规则文件能否进仓库共享，MCP 配置和权限策略能否统一下发。
- 国内可用性：网络访问、实名与支付方式，国内团队可优先评估通义灵码、Qoder、TRAE 国内版、Qwen Code、Kimi CLI。

### 隐私与执行边界也要验收

- 分别核对代码补全、聊天、索引、遥测、云 Agent 和第三方模型的数据流；某个「隐私模式」不代表全部插件、工具与组织套餐采用相同保留策略。按项目敏感级别决定哪些目录和服务可用。
- ignore 文件限制某些索引 / 读取路径，不是操作系统权限边界；终端工具、MCP、扩展和依赖脚本仍可能访问文件。不要把 secret 放在 Agent 可读的工作目录或无关进程继承的环境里。
- worktree 只隔离工作树，不隔离账户、凭证、网络、内核或共享 Git 状态；容器也需明确只读挂载、无敏感环境、非特权用户和出站限制，执行工作流见 [下一关](../12-coding-agents/)。
- 记录「工具版本 + 发布通道 + 模型 ID + 规则版本」再比较同一任务。Stable、Preview、Nightly 和插件版本不能混为一谈；本页沿用已核实的 Cursor 3.28.7 稳定基线，不把其他通道的较大数字写成稳定版。

## 选型对比

| 工具 | 形态 | 版本（2026-11） | 特点 |
|------|------|-----------------|------|
| Claude Code | CLI / IDE 扩展 | 2.1.318 | 终端 Agent 代表，Hooks、Skills、子 Agent 丰富 |
| Codex CLI | CLI / 云任务 | `rust-v0.166.0`（npm `@openai/codex` 0.166.0） | Rust 实现，沙箱执行，可衔接云端任务 |
| Gemini CLI | CLI | 0.67.0 | 开源，Google 账号可免费试用 |
| GitHub Copilot CLI | CLI | 1.0.105 | 与 Copilot 订阅和 GitHub 深度集成 |
| Qwen Code | CLI | 0.26.7 | 通义千问系列，国内可用 |
| Kimi CLI | CLI | 1.52.0 | 月之暗面出品 |
| OpenCode | CLI | 1.19.5 | 开源，多模型 |
| Cline | IDE 插件 | 4.1.26 | 开源，自带 API Key |
| Kilo Code CLI | CLI / 插件 | 7.8.27 | 开源，多模型 |
| Cursor | AI 原生 IDE | 稳定版 3.28.7（稳定通道） | Agent 模式、云 Agent、Agent SDK |
| TRAE | AI 原生 IDE | 国际版 v3.6.4，国内版 v3.4.12 | 字节出品，国内外两个版本 |
| Qoder | AI 原生 IDE | 1.38.0 | 阿里出品；原 Lingma IDE 已并入 Qoder 国内版 |

> [!WARNING]
> 版本以 2026-11-04 至 2026-11-05 从官方渠道核对为准：Cursor 取自官方下载接口，TRAE 国际版 v3.6.4 发布于 2026-10-15、国内版 v3.4.12 发布于 2026-10-30，Qoder 1.38.0 发布于 2026-10-30。编程工具更名、并购、停服频繁：Windsurf 已并入 Cognition 并更名 Devin Desktop；Amazon Q Developer IDE 插件将于 2027-04-30 停止支持，官方指向 Kiro；TRAE 在 3.5.93–3.5.104 期间曾以 TraeCode 名称发布。第三方榜单常有过期或错误的版本号，以官方渠道为准。

## 常见误区

- 只用补全不用 Agent，或者反过来什么都交给 Agent：补全适合熟悉的代码，Agent 适合边界清晰、有测试的任务。
- 不给上下文就提需求：没有规则文件、没有相关文件路径和验收标准，Agent 只能猜。
- 在主分支、带生产凭证的环境里开自动执行：Agent 误删文件或泄露密钥时没有回滚余地。
- 不看 diff 就接受：AI 生成的代码同样需要评审和测试，尤其是安全与并发相关的改动。
- 把公司代码交给未经评估的工具：先确认数据保留、训练使用和出境政策。
- 只看排行榜选工具：同一个模型在不同工具里表现差异很大，用自己的仓库试一周再定。

## 实践任务

- 安装一个 CLI Agent 和一个 IDE 工具，在同一个开源仓库中分别完成「修一个 Issue 并补测试」，对比耗时、Token 消耗和 diff 质量。
- 为工具接入一个 MCP Server（例如第 10 关写的笔记 Server），并配置成写操作需要审批。
- 起草一份团队 AI 编程工具使用规范：允许的工具、数据合规要求、权限模式和代码评审要求。

## 资料索引

- [Claude Code 文档](https://code.claude.com/docs/en/overview) — Anthropic 终端编程 Agent
- [OpenAI Codex 文档](https://developers.openai.com/codex) — Codex CLI 与云端 Agent
- [Gemini CLI 文档](https://geminicli.com/docs/) — Google 开源终端 Agent
- [GitHub Copilot 文档](https://docs.github.com/en/copilot) — Copilot 补全、Chat、CLI 与 coding agent
- [Cursor Changelog](https://cursor.com/changelog) — Cursor 功能更新
- [Qoder](https://qoder.com/) — 阿里 AI 原生 IDE
- [Cursor 安全](https://cursor.com/security) — 隐私模式、数据与产品边界
- [Cursor Ignore 文件](https://docs.cursor.com/context/ignore-files) — 索引排除不等同于执行权限
- [Claude Code 安全](https://code.claude.com/docs/en/security) — 权限、提示注入与执行风险
- [Kilo Code CLI npm](https://www.npmjs.com/package/@kilocode/cli) — 2026-11-05 为 7.8.27

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】从 Issue 出发、在云端沙箱中工作并最终提交 PR 的工具形态是：
    - A. 代码补全
    - B. IDE 插件对话
    - C. 云端异步 Agent
    - D. 静态代码扫描
2. 【单选】在本机开启 Agent 的自动执行模式，最合理的前提是：
    - A. 在主分支直接运行
    - B. 在容器或独立 worktree 等隔离环境中运行
    - C. 关闭所有测试以提高速度
    - D. 把生产数据库凭证写进环境变量
3. 【单选】stdio 与 HTTP 两种 MCP Server 都能接入 Claude Code，添加远程 Server 的命令形如：
    - A. `claude mcp add --transport http <name> <url>`
    - B. `claude install-server <url>`
    - C. `npm install -g <url>`
    - D. `git remote add <name> <url>`
4. 【简答】为一个 20 人、代码不能出境的团队选 AI 编程工具，你会考察哪些维度？
5. 【简答】补全工具与 CLI Agent 各适合什么样的任务？

<details markdown><summary>参考答案</summary>

1. C — 云端异步 Agent 从 Issue 出发，在云端环境中完成修改并提交 PR。
2. B — 隔离环境让误操作可以丢弃，避免影响主分支和生产凭证。
3. A — `claude mcp add --transport http <name> <url>` 添加远程 Server；stdio Server 用 `--transport stdio` 加 `--` 后接启动命令。
4. 数据是否出境、是否用于训练、能否私有化或接入自部署模型；企业管理（SSO、审计、策略下发）；模型能力与可切换性；计费方式与预算；规则文件与 MCP 配置能否团队共享；国内网络可用性。
5. 补全适合在熟悉的代码中逐行编写、实时反馈；CLI Agent 适合边界清晰的整块任务，例如跨文件重构、修复失败测试、按规格实现功能，前提是有可运行的测试来验证。

</details>

---

← [上一节：MCP 协议与开发](../10-mcp/) · [返回 AI](../) · [下一节：编程智能体工作流](../12-coding-agents/) →
