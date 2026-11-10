# 编程智能体工作流 {#coding-agent-workflows}

> [AI](../) › 编程智能体工作流

把编程 Agent 当作团队成员来用的工程方法：怎么写规则和规格、怎么拆任务、怎么让它在 CI 里自动修复与评审，以及如何控制风险。目标是可复现、可审查，而不是「一把梭」。

> 相关主题：[AI 编程助手与 IDE](../11-ai-coding-tools/) · [持续交付与 GitOps](../../microservices/14-cicd-gitops/) · [安全与治理](../19-security-governance/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 第二章应用工程：从「会用工具」进阶到「用工程方法驾驭编程 Agent」 |
| 前置要求 | [AI 编程助手与 IDE](../11-ai-coding-tools/)；熟悉 Git 分支、PR 与 CI 流水线 |
| 粗略用时 | 1–2 周（粗略参考） |
| 章节 | 第二章 应用工程 |

## 闯关任务

**QUEST 12 · 第二章 应用工程**

- [ ] 能够为项目写一份有效的 `AGENTS.md`，包含构建、测试命令与代码约定。
- [ ] 能够按 Explore → Plan → Code → Verify 的节奏驱动 Agent 完成一个功能，并让测试成为验收标准。
- [ ] 能够用 Spec 驱动开发（如 GitHub Spec Kit）把需求转成规格、计划和任务。
- [ ] 能够用 git worktree 或容器并行运行多个 Agent，并配置权限白名单。
- [ ] 能够在 CI 中接入编程 Agent 做自动评审或修复，并识别其中的安全风险。

**奖励**：+100 XP · 徽章「Agent 工头」（徽章名暂定，内容建设中）

## 知识要点

### 规则文件

- `AGENTS.md` 是跨工具的开放格式，放在仓库根目录（子目录可再放一份覆盖局部规则），多数编程 Agent 都会读取。
- 各工具也有自己的文件：Claude Code 的 `CLAUDE.md`、Cursor Rules、Copilot 的 `.github/copilot-instructions.md`；可以让它们引用同一份 `AGENTS.md`，避免多处维护。
- 写什么：怎么构建、怎么跑测试和 lint、目录约定、代码风格、禁止事项；不写人人都知道的常识。
- 规则要短而具体，并随项目演进更新；Agent 反复犯同一个错时，就把正确做法补进规则文件。

```markdown
# AGENTS.md

## 构建与测试
- 构建：`./mvnw -q package -DskipTests`
- 单元测试：`./mvnw -q test`；只跑一个类：`./mvnw -q test -Dtest=OrderServiceTest`
- 提交前必须通过：`./mvnw -q verify`

## 代码约定
- Java 21，Spring Boot；业务代码放在 `src/main/java/com/example/order/`
- 新接口必须有单元测试；不要修改 `db/migration/` 中已发布的脚本

## 禁止事项
- 不要提交 `.env`、密钥或真实客户数据
- 不要升级依赖版本，除非任务明确要求
```

### Explore → Plan → Code → Verify

```mermaid
flowchart LR
    E[Explore 读代码] --> P[Plan 写计划]
    P --> C[Code 小步实现]
    C --> V[Verify 测试]
    V -->|失败| C
    V -->|通过| R[人工评审合并]
```

- Explore：先让 Agent 只读地理解相关代码，不急着改。
- Plan：让它写出修改计划并由你确认，复杂任务把计划存成文件。
- Code：小步实现、小步提交，每步都能单独回滚。
- Verify：测试先行，给 Agent 一个可验证的目标；它能自己跑测试，就能自己发现并修正错误。

### Spec 驱动开发

- 思路：先写规格（做什么、为什么）→ 技术计划 → 任务清单 → 实现，规格和计划都是仓库里可评审的文件。
- GitHub Spec Kit 提供 `specify` CLI 和一组技能命令；Kiro 内置 specs 工作流。

```bash
uv tool install specify-cli
specify init my-project --integration copilot
```

```text
/speckit-constitution 以代码质量、测试和可维护性为原则。
/speckit-specify 实现订单退款功能：大额退款需要主管审批。
/speckit-plan 使用 Spring Boot 与 PostgreSQL，审批状态存数据库。
/speckit-tasks
/speckit-implement
```

上面是 Copilot 的默认命令写法，其他 Agent 的调用语法见 Spec Kit 文档。

### 并行、隔离与权限

- 并行：每个 Agent 一个 `git worktree` 可减少文件冲突；需要安全隔离时另配受限容器 / 沙箱；主 Agent 也可以派生子 Agent 处理独立的子任务。
- 权限：按白名单开放命令，例如只允许 `git diff`、`./mvnw test`；网络访问与写操作默认需要审批。
- 无人值守运行时用 headless 模式，并明确限制工具：

```bash
git worktree add ../order-refund -b feat/refund
cd ../order-refund
claude -p "修复 OrderServiceTest 中失败的测试，只修改 src/ 下的文件" \
  --allowedTools "Read,Edit,Bash(./mvnw -q test *)"
```

### CI 中的编程 Agent

- PR 自动评审、Issue 自动实现、失败测试自动修复，最终合并仍由人决定。
- Claude Code GitHub Actions 在 Issue 或 PR 评论中 `@claude` 即可触发；Copilot coding agent、Codex 云任务提供类似的异步工作方式。

```yaml
name: Claude Code
on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
jobs:
  claude:
    if: >-
      contains(github.event.comment.body, '@claude') &&
      contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association)
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1
          persist-credentials: false
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: "只分析问题并给出修复建议，不提交、不推送、不评论。"
```

此 YAML 是受信维护者触发的只读分析配置示意，不包含自动提交 / 评论权限；生产前需按官方仓库解析并固定两项 Action 的完整 SHA，配置环境审批、模型预算与工具限制。不要在此 secret 上下文检出不可信 PR 分支；若需要发布分析结果，放在独立、经过审批且只处理数据的 job 中。

### 自定义扩展

- Skills / Slash 命令：把团队常用流程（发版检查、写迁移脚本）沉淀成可复用指令。
- Hooks：在 Agent 编辑文件或运行命令前后自动执行格式化、lint 或安全检查。
- MCP Server：接入内部系统（工单、文档、监控），见 [MCP 协议与开发](../10-mcp/)。
- Agent SDK：Claude Agent SDK、Cursor Agent SDK、Codex SDK 可用来自建内部编程 Agent。

### 安全的 CI 验证与 Java 交付链

- Issue / PR 评论、仓库文档、测试日志、依赖脚本都可能携带提示注入；只有受信维护者的触发也不代表内容可信。身份校验、工具白名单、预算和环境隔离必须同时存在。
- 默认 `GITHUB_TOKEN` 只读，按 job 开最小权限；第三方 Actions 生产配置固定完整 commit SHA，并验证来自官方仓库。不要在有 secret / 写权限的 `pull_request_target` 上检出或执行不可信 PR 代码。
- 构建可能执行 Maven / Gradle 插件、注解处理器与测试代码；即使命令只允许 `mvn test`，也必须在无生产凭证、受限网络的临时环境运行。worktree 不是沙箱。
- 交付物包括规格、差异、单元 / 集成测试、依赖与漏洞报告、模型调用预算和未验证项。复用 [Java 构建工具](../../java/07-build-tools/)、[微服务测试](../../microservices/15-testing/) 和 [CI/CD](../../microservices/14-cicd-gitops/)，把「Agent 说完成」换成可复查的检查结果。

## 选型对比

| 方式 | 代表 | 适合 | 风险控制 |
|------|------|------|----------|
| 本地交互 | IDE Agent 模式、CLI Agent | 探索、调试、需要频繁确认的任务 | 逐步审批，看 diff |
| 本地 headless | `claude -p`、Codex 非交互模式 | 批量重构、脚本化任务 | 工具白名单、worktree 隔离 |
| CI 触发 | Claude Code GitHub Actions | PR 评审、评论触发的修改 | 最小 `permissions`、密钥放 Secrets |
| 云端异步 | Copilot coding agent、Codex 云任务 | 从 Issue 到 PR 的独立任务 | 沙箱环境、人工评审合并 |
| 规格驱动 | GitHub Spec Kit v1.3.0、Kiro specs | 新功能、需求不清晰的任务 | 规格与计划先评审 |

> [!WARNING]
> Spec Kit v1.3.0 发布于 2026-11-04（太平洋时间），命令写法为 `/speckit-specify` 这类连字符形式，旧教程中的 `/speckit.specify` 已过时。Claude Code GitHub Actions 示例取自 2026-11-05 的官方文档（`anthropics/claude-code-action@v1`）。

## 常见误区

- 规则文件写成长篇文档：Agent 每次都要读，冗长无关的内容会挤占上下文并稀释重点。
- 一次给 Agent 一个大需求：缺少中间检查点，跑偏后难以定位；应拆成可验证的小任务。
- 没有测试就让 Agent 改代码：它无法判断自己是否改对，只能「看起来对」。
- 多个 Agent 在同一个工作目录并行：互相覆盖文件、抢占端口，应使用 worktree 或容器隔离。
- CI 中给 Agent 过大的权限：一条恶意 Issue 评论就可能通过提示注入让 Agent 泄露密钥或推送恶意代码。
- 让 Agent 自己合并 PR：评审与合并必须留给人，见 [安全与治理](../19-security-governance/)。

## 实践任务

- 为你的一个项目写 `AGENTS.md`，让 Agent 在不额外提示的情况下正确跑通构建和测试。
- 用 Explore → Plan → Code → Verify 完成一个小功能，保存计划文件和每一步的提交记录。
- 用 Spec Kit 走一遍 constitution → specify → plan → tasks → implement，评审生成的规格与计划。
- 在一个测试仓库中配置 Claude Code GitHub Actions，用 `@claude` 评论让它修复一个失败的测试，并检查其 `permissions` 是否最小化。

## 资料索引

- [AGENTS.md](https://agents.md/) — 编程 Agent 规则文件开放格式
- [GitHub Spec Kit](https://github.com/github/spec-kit) — Spec 驱动开发工具包
- [Claude Code 最佳实践](https://www.anthropic.com/engineering/claude-code-best-practices) — 官方工作流建议
- [Claude Code GitHub Actions](https://code.claude.com/docs/en/github-actions) — CI 集成与权限说明
- [Claude Code headless 模式](https://code.claude.com/docs/en/headless) — 非交互运行与工具白名单
- [Copilot coding agent](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent) — GitHub 异步编程 Agent
- [GitHub Actions 安全使用](https://docs.github.com/en/actions/reference/security/secure-use) — 最小权限与固定完整 SHA
- [GitHub pull_request_target 安全](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target) — 禁止在特权上下文运行不可信代码
- [GitHub 脚本注入](https://docs.github.com/en/actions/concepts/security/script-injections) — 事件字段与命令拼接风险

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】以下哪项最适合写进 `AGENTS.md`？
    - A. 公司发展历史
    - B. 构建与测试命令、目录约定和禁止事项
    - C. 生产数据库密码
    - D. 每次任务的具体需求
2. 【单选】让多个编程 Agent 并行工作而互不干扰，推荐的做法是：
    - A. 在同一目录同时运行
    - B. 每个 Agent 使用独立的 git worktree 或容器
    - C. 关闭版本控制
    - D. 让它们轮流提交到主分支
3. 【单选】Explore → Plan → Code → Verify 中，让 Agent 能自我纠错的关键是：
    - A. 更长的提示词
    - B. 可运行的测试作为验收标准
    - C. 更高的 temperature
    - D. 更多的 MCP Server
4. 【简答】说明 Spec 驱动开发的步骤，以及它相比「直接让 Agent 写代码」的好处。
5. 【简答】在 CI 中让 Agent 响应 Issue 评论，存在哪些安全风险？如何缓解？

<details markdown><summary>参考答案</summary>

1. B — 规则文件写稳定、通用的项目知识；具体需求放在任务描述里，密钥绝不能写进仓库。
2. B — worktree 或容器隔离文件与运行环境，避免互相覆盖。
3. B — 测试给出客观的通过 / 失败信号，Agent 可以据此迭代修正。
4. 规格 → 计划 → 任务 → 实现，各阶段产物都是可评审的文件。好处：需求和技术决策在写代码前就被评审；任务粒度小、可验证；结果可复现，便于多人协作和后续维护。
5. 风险：评论中的提示注入诱导 Agent 泄露密钥、修改 CI 配置或推送恶意代码；权限过大；第三方 Action 供应链。缓解：最小化 `permissions`；限制可触发的用户；密钥放 Secrets 且不暴露给不可信输入；Agent 只能开 PR、不能合并；固定 Action 版本并审查。

</details>

---

← [上一节：AI 编程助手与 IDE](../11-ai-coding-tools/) · [返回 AI](../) · [下一节：代码模型与评测](../13-code-models-evals/) →
