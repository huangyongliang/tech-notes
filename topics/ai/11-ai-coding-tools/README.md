# AI 编程助手与 IDE {#ai-ide-ai-coding-tools}

> [AI](../) › AI 编程助手与 IDE

选型先记下能复现的四个维度：工具版本、发布通道、模型 ID、规则版本。ignore 文件、独立 worktree 和产品里的隐私模式，都不是操作系统上的凭证隔离。

> 相关主题：[MCP 协议与开发](../10-mcp/) · [编程智能体工作流](../12-coding-agents/) · [安全与治理](../19-security-governance/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

同一道题在两个工具里的差别，可能来自模型或通道，而不来自产品名。比较之前先把版本、通道、模型 ID 和规则文件版本写下来。索引忽略、第二棵工作树、隐私开关，各自少暴露一条产品路径，都不改 SSH 密钥、环境变量和进程身份。

## 四种形态 {#_4}

<span id="_2"></span>

```mermaid
flowchart LR
    A[补全] --> B[IDE 内对话]
    B --> C[IDE Agent 模式]
    C --> D[终端 CLI Agent]
    D --> E[云端异步 Agent]
```

- 行内补全：在熟悉的代码里逐行提示。反馈快，改动面小。
- IDE 里的对话：围绕当前文件提问或改一块。人还在看 diff。
- 终端里的 CLI Agent：按任务改多个文件、跑命令。边界要写进规则和测试。
- 云端异步 Agent：从 Issue 出发，在远端环境里改完并提交 PR。环境、凭证和保留策略都要单独验收，不能沿用本机隐私开关的结论。

形态可以组合。选的时候先问任务是「下一行」还是「整张工单」，再问代码和凭证能不能离开本机。

## 上手命令 {#cli-agent}

下面的安装和 `claude mcp add` 是本章原有的命令记录。2026-11-25 没有重跑，没有安装这些 CLI，也没有访问 `mcp.example.com`。版本表仍是 2026-11-04 至 2026-11-05 的渠道快照。

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

第一次先让 Agent 只读地解释代码结构，再给带验收标准的小任务。规则文件（`AGENTS.md`、`CLAUDE.md` 等）写构建命令、测试命令和规范，写法见 [下一关](../12-coding-agents/)。

默认在写文件或跑命令前询问。自动执行只放在可丢弃的隔离环境里。隔离要单独证明：独立 worktree 不够，见下面。

## 选型时要记下的维度 {#_5}

比较两次运行之前，先固定这四项，否则「工具 A 更好」可能只是换了模型或换了 nightly：

- 工具版本：安装到的那个构建号，不是官网首页上未核对的「最新」。
- 发布通道：Stable、Preview、Nightly 和插件通道分开记。本章沿用已核实的 Cursor 稳定版 3.28.7 作为 2026-11 的稳定通道记录，不把其他通道的较大数字写成稳定版。2026-11-25 没有重查下载接口。
- 模型 ID：同名产品可以换成另一个模型。不记下 ID，结果不能复跑。
- 规则版本：仓库里的规则文件也要有版本或提交号。换一份 `AGENTS.md` 等于换了任务说明。

除此之外仍要看：交互是补全还是整块托管；模型能否切换或接到自部署；代码是否出境、是否用于训练、能否私有化；计费是席位、请求还是 Token，Agent 比补全贵；规则和 MCP 配置能否进仓库统一下发；国内网络、实名和支付是否可用。国内团队可以评估通义灵码、Qoder、TRAE 国内版、Qwen Code、Kimi CLI，但评估结论也要带上上面的四个维度。

## 忽略、工作树和隐私模式 {#_6}

这三样都常被当成「已经隔离」。它们限制的不是同一层：

- ignore 文件告诉索引或某些读取路径跳过文件。终端、MCP Server、扩展和依赖脚本是另外的进程，仍可能打开该路径。ignore 不是操作系统权限，也挡不住进程继承的环境变量。密钥不要放在 Agent 能读的工作目录里。
- 独立 worktree 是同一仓库的另一个目录。它不新建操作系统用户，仍然看得到同一套 SSH 密钥、环境变量、网络和共享的 Git 配置。在 worktree 里开自动执行，生产凭证还在环境里，就和在主目录里开是同一条泄露路径。要隔离执行，还得规定只读挂载、无敏感环境、非特权用户和出站限制，见 [编程智能体工作流](../12-coding-agents/)。
- 隐私模式是产品开关，覆盖该产品写明的那些流量。补全、聊天、索引、遥测、云 Agent 和第三方模型可以有不同的保留策略。一个开关打开，不表示插件、组织套餐或另一个模型通道也按同一策略处理。它更不是系统凭证的边界：密钥仍在本机环境里，模式不会把它们从进程里拿掉。

按仓库的敏感级别决定哪些目录和服务可以碰。自动执行不要开在主分支上，也不要开在带生产凭证的环境里。

## 工具怎么选 {#ide-choice}

<span id="_7"></span>

版本以 2026-11-04 至 2026-11-05 从官方渠道核对为准。2026-11-25 没有重跑安装命令，也没有重查这些版本，表内数字不称为当前版本。

| 工具 | 形态 | 版本（2026-11-04 至 11-05 记录） | 特点 |
|------|------|-----------------|------|
| Claude Code | CLI / IDE 扩展 | 2.1.318 | 终端 Agent，Hooks、Skills、子 Agent |
| Codex CLI | CLI / 云任务 | `rust-v0.166.0`（npm `@openai/codex` 0.166.0） | Rust 实现，沙箱执行，可衔接云端任务 |
| Gemini CLI | CLI | 0.67.0 | 开源，Google 账号可免费试用 |
| GitHub Copilot CLI | CLI | 1.0.105 | 与 Copilot 订阅和 GitHub 集成 |
| Qwen Code | CLI | 0.26.7 | 通义千问系列 |
| Kimi CLI | CLI | 1.52.0 | 月之暗面 |
| OpenCode | CLI | 1.19.5 | 开源，多模型 |
| Cline | IDE 插件 | 4.1.26 | 开源，自带 API Key |
| Kilo Code CLI | CLI / 插件 | 7.8.27 | 开源，多模型 |
| Cursor | AI 原生 IDE | 稳定版 3.28.7（稳定通道） | Agent 模式、云 Agent、Agent SDK |
| TRAE | AI 原生 IDE | 国际版 v3.6.4，国内版 v3.4.12 | 国内外两个版本 |
| Qoder | AI 原生 IDE | 1.38.0 | 阿里；原 Lingma IDE 已并入 Qoder 国内版 |

> [!WARNING]
> 上表是 2026-11-04 至 2026-11-05 的渠道快照：Cursor 取自当时的官方下载接口，TRAE 国际版 v3.6.4 发布于 2026-10-15、国内版 v3.4.12 发布于 2026-10-30，Qoder 1.38.0 发布于 2026-10-30。2026-11-25 没有重查。编程工具更名、并购、停服频繁：Windsurf 已并入 Cognition 并更名 Devin Desktop；Amazon Q Developer IDE 插件将于 2027-04-30 停止支持，官方指向 Kiro；TRAE 在 3.5.93–3.5.104 期间曾以 TraeCode 名称发布。第三方榜单常有过期版本号。

## 常见误读 {#_3}

<span id="_8"></span>

- 只用补全，或什么都交给 Agent：补全适合熟悉的逐行修改。Agent 适合边界清楚、有测试的整块任务。
- 不给规则和验收标准：Agent 只能猜构建命令和完成定义。
- 在主分支、带生产凭证的环境里开自动执行：删文件或读密钥时没有可丢弃的边界。
- 不看 diff 就接受：生成的代码仍要评审和测试，安全和并发尤其如此。
- 把 ignore、worktree 或隐私模式当成凭证隔离：三者都不拿走系统里的密钥。
- 只看排行榜：同一模型在不同工具里差很多。用自己的仓库试，并记下四个复现维度。
- 把上面的安装命令当成 2026-11-25 跑通的结果：命令没有重跑。

## 可选核对 {#ide-check}

<span id="_9"></span>

1. 比较两个工具做同一道题之前，要记下哪几个维度，结果才复现得了？
2. ignore 文件、独立 worktree、产品的隐私模式，为什么都不是系统凭证隔离？

<details markdown><summary>参考答案</summary>

1. 工具版本、发布通道（稳定、预览或 nightly）、模型 ID、规则文件版本。少一项，差异就可能来自模型和通道，而不是产品。本章的版本表是 2026-11-04 至 2026-11-05 的快照，安装命令在 2026-11-25 没有重跑。
2. ignore 只影响索引或约定的读取路径，挡不住终端、MCP 和扩展，也挡不住环境变量。worktree 是另一个目录，不新建系统用户，SSH 密钥、环境和网络仍是同一套。隐私模式只覆盖该产品写明的流量，不覆盖全部插件和云 Agent，也不会从进程里移除已经存在的凭证。

</details>

<span id="_11"></span>

## 资料索引 {#_10}

- [Claude Code 文档](https://code.claude.com/docs/en/overview) — Anthropic 终端编程 Agent
- [OpenAI Codex 文档](https://developers.openai.com/codex) — Codex CLI 与云端 Agent
- [Gemini CLI 文档](https://geminicli.com/docs/) — Google 开源终端 Agent
- [GitHub Copilot 文档](https://docs.github.com/en/copilot) — Copilot 补全、Chat、CLI 与 coding agent
- [Cursor Changelog](https://cursor.com/changelog) — Cursor 功能更新
- [Qoder](https://qoder.com/) — 阿里 AI 原生 IDE
- [Cursor 安全](https://cursor.com/security) — 隐私模式、数据与产品边界
- [Cursor Ignore 文件](https://docs.cursor.com/context/ignore-files) — 索引排除不等同于执行权限
- [Claude Code 安全](https://code.claude.com/docs/en/security) — 权限、提示注入与执行风险
- [Kilo Code CLI npm](https://www.npmjs.com/package/@kilocode/cli) — 2026-11-05 记下 7.8.27；2026-11-25 未重开

---

← [上一节：MCP 协议与开发](../10-mcp/) · [返回 AI](../) · [下一节：编程智能体工作流](../12-coding-agents/) →
