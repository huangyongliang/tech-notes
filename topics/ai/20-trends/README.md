# 前沿与趋势 {#trends}

> [AI](../) › 前沿与趋势

跟踪方向而不求深入：推理模型与 test-time compute、长程自主 Agent、Agent 互操作协议、开放权重、低精度推理与新架构。每季度回顾一次，把成熟内容下沉到对应关卡。

> 相关主题：[模型全景](../04-model-landscape/) · [代码模型与评测](../13-code-models-evals/) · [推理与服务](../15-inference-serving/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 持续关：建立跟踪前沿的方法，判断哪些变化值得投入，哪些只需观望 |
| 前置要求 | 完成第一章至第三章；第四章可按兴趣选修 |
| 粗略用时 | 每季度 半天到 1 天（粗略参考） |
| 章节 | 持续关（不计入四章） |

## 闯关任务

**QUEST 20 · 持续关**

- [ ] 能够说明推理模型与 test-time compute 的含义，以及它对成本和延迟的影响。
- [ ] 能够概括长程 Agent 的共同方向：云端会话、记忆、自主模式与沙箱。
- [ ] 能够说明 MCP、A2A 与 AGENTS.md 分别解决的互操作问题。
- [ ] 能够解释 FP8、NVFP4、MXFP8 等低精度格式为什么需要按块缩放。
- [ ] 能够建立自己的季度回顾流程，把趋势判断落到版本基线与关卡内容的更新上。

**奖励**：+100 XP · 徽章「趋势瞭望者」（徽章名暂定，内容建设中）

## 知识要点

### 推理模型与 test-time compute

- 推理模型在回答前生成较长的思考过程，用更多推理时计算换取更高的准确率，数学、代码与规划任务受益最明显。
- 成本与延迟随思考长度增长，多数 API 提供思考预算或推理强度参数；简单任务关闭或降低思考更划算。
- 原理见 [Transformer 与大模型原理](../03-transformer-llm/)，调用方式见 [LLM API 编程模式](../06-llm-api-programming/)。

### 长程 Agent

- 2026 年各编程 Agent 的共同方向：云端会话可以离线运行数小时，跨会话记忆，自主模式配合沙箱与审批。
- 工程重点从「写好一次提示」转向「设计可恢复的长任务」：检查点、进度文件、测试作为验收标准。
- 实践见 [智能体](../09-agents/) 与 [编程智能体工作流](../12-coding-agents/)。

### 协议标准化

- MCP：Agent 连接工具与数据，规范 2026-07-28 版改为无状态设计，见 [MCP 协议与开发](../10-mcp/)。
- A2A：Agent 与 Agent 之间的任务协作，见 [智能体](../09-agents/)。
- AGENTS.md：给编程 Agent 的项目说明文件，多数工具已支持，见 [编程智能体工作流](../12-coding-agents/)。

### 开放权重

- 国产 MoE 模型持续追赶闭源旗舰：Qwen3.8、DeepSeek V4.x、GLM-5.3、Kimi K3 等，许可证与部署显存差异较大。
- 开放权重让私有化部署、微调与成本优化成为可能；选型时同时看许可证、上下文长度、工具调用能力与推理引擎支持。
- 当前型号见 [模型全景](../04-model-landscape/)。

### 低精度与新硬件

- FP8 已是数据中心推理的常用默认；新一代 GPU 原生支持 NVFP4、MXFP8 等格式。
- 位数越少，可表示的取值越少；离群值会挤占整个张量的动态范围，所以低精度格式普遍采用「按小块各自缩放」。
- MX 系列按 32 个元素一块共享缩放因子，NVFP4 按 16 个元素一块；下例用简化的缩放方式演示块大小对误差的影响。

```python
import torch

torch.manual_seed(0)
w = torch.randn(4096) * 0.02
w[::512] *= 40            # 少量离群值，模拟真实权重分布

def rel_err(q):
    return ((q - w).norm() / w.norm()).item()

# FP8 E4M3：整个张量一个缩放因子
s = w.abs().max() / torch.finfo(torch.float8_e4m3fn).max
fp8 = (w / s).to(torch.float8_e4m3fn).to(torch.float32) * s

# FP4 E2M1 只有 8 个非负取值；按块缩放可以减少离群值的影响
E2M1 = torch.tensor([0, 0.5, 1, 1.5, 2, 3, 4, 6])

def fp4_block(x, block):
    x = x.view(-1, block)
    scale = x.abs().amax(dim=1, keepdim=True) / 6
    y = (x / scale).abs()
    idx = (y.unsqueeze(-1) - E2M1).abs().argmin(-1)
    return (E2M1[idx] * x.sign() * scale).view(-1)

print(f"BF16             相对误差 {rel_err(w.to(torch.bfloat16).float()):.4f}")
print(f"FP8 E4M3 张量级   相对误差 {rel_err(fp8):.4f}")
print(f"FP4 整个张量一组  相对误差 {rel_err(fp4_block(w, 4096)):.4f}")
print(f"FP4 每 32 个一组  相对误差 {rel_err(fp4_block(w, 32)):.4f}")
print(f"FP4 每 16 个一组  相对误差 {rel_err(fp4_block(w, 16)):.4f}")
```

运行输出：

```text
BF16             相对误差 0.0013
FP8 E4M3 张量级   相对误差 0.0171
FP4 整个张量一组  相对误差 0.4815
FP4 每 32 个一组  相对误差 0.0981
FP4 每 16 个一组  相对误差 0.0730
```

### 新架构

- 线性注意力：用线性复杂度的注意力替代部分全注意力层，降低长上下文的计算与 KV Cache 开销，如 Kimi-Linear。
- 扩散语言模型：不按从左到右逐个生成，而是并行去噪整段文本，如 Stable-DiffCoder。
- 评测可信度：基准污染与作弊治理已成为共识，SWE-bench Verified 已被指出存在污染，见 [代码模型与评测](../13-code-models-evals/)。

### 季度回顾流程

```mermaid
flowchart LR
  C[收集信号] --> F[筛选验证]
  F --> T[小规模试用]
  T --> D[下沉到关卡]
  D --> B[更新版本基线]
```

```markdown
## 2026 Q4 回顾清单

- [ ] 版本基线：逐项核对 PyPI / npm / GitHub Releases，排除 rc 与旧分支补丁
- [ ] 模型：各厂商官方模型页是否有新旗舰、下线或改名
- [ ] 下线公告：已引用的 API、模型、产品是否关停（如视频生成服务）
- [ ] 协议：MCP、A2A 规范是否发布新版本
- [ ] 评测：引用的基准是否被指出污染或有替代
- [ ] 内容下沉：本季度成熟的趋势移入对应关卡，删除过时内容
```

### 趋势进入学习计划前的证据门槛

- 区分论文 / 演示、预览 API、正式 API、开放权重与生产可用；「发布」「可申请」「全量开放」「弃用」「关停」是不同事件。视频 API 的反例见 [多模态](../16-multimodal/)，不重复维护另一张规格表。
- 注册表 `latest` / Maven `<release>`、GitHub `Latest` 与最高正式版本可能不同；先排除 rc / beta，再对照官方时间线、维护分支、兼容矩阵和发行制品。旧主线补丁不会使新主线倒退。
- 对每项趋势保存证据日期、官方链接、可复现实验、质量 / 延迟 / 成本 / 安全增益与迁移代价；没有同预算对比，不把厂商自报提升直接写进技术选型结论。
- 给季度实验设止损：先在固定离线任务验证，再小流量灰度；若无明确收益，保留原方案。协议稳定性、SDK 版本和模型生命周期要分别跟踪，例如 OTel GenAI 的 Development 已核实，但不代表未来升级兼容。
- 从 [Java 生态](../../java/12-ecosystem-trends/) 和 [云原生 Java](../../microservices/16-cloud-native-java/) 延伸时，优先保持业务契约与可观测链路稳定，把模型 / 框架变化限制在适配层，避免每个季度重写业务服务。

## 选型对比

| 方向 | 成熟度 | 建议动作 | 下沉到 |
|------|--------|----------|--------|
| 推理模型与思考预算 | 已普及 | 在应用中按任务难度选择推理强度 | [03](../03-transformer-llm/)、[06](../06-llm-api-programming/) |
| MCP / AGENTS.md | 已普及 | 直接采用 | [10](../10-mcp/)、[12](../12-coding-agents/) |
| A2A | 推广中 | 跨团队 Agent 互通时评估 | [09](../09-agents/) |
| 长程云端 Agent | 快速演进 | 在非关键任务上试用，建立审批与沙箱 | [12](../12-coding-agents/) |
| FP8 推理 | 已普及 | 自托管默认评估 | [15](../15-inference-serving/) |
| NVFP4 / MXFP8 | 推广中 | 有新硬件时评测精度后采用 | [15](../15-inference-serving/) |
| 线性注意力、扩散语言模型 | 研究与早期 | 关注论文与开源模型，暂不用于生产 | [03](../03-transformer-llm/) |

> [!TIP]
> 判断一个趋势是否值得投入，可以问三个问题：主流推理引擎或 SDK 是否已支持？是否有可复现的开源实现？在你自己的评测集上是否有提升？三个都是「是」再考虑下沉到正式关卡。

## 常见误区

- 追每一个新模型发布：大多数发布对你的应用没有实质影响，应以自己的评测集为准。
- 只看厂商公布的基准分数：可能存在污染或与你的任务不相关。
- 把预览版或 rc 版本写进基线：预览服务可能突然关停，rc 版本可能有破坏性变化。
- 新架构论文一出就重写系统：推理引擎、量化工具与生态支持往往要滞后数月。
- 回顾后不更新内容：趋势判断只有落到版本基线和关卡内容上才有价值。

## 实践任务

- 运行本页的低精度代码，把块大小改为 8、64、128，观察误差变化，并解释离群值的作用。
- 按本页清单完成一次季度回顾，至少更新一处版本号和一处过时内容。
- 订阅一个论文或资讯来源，每周花 30 分钟浏览，记录 3 条你认为会影响自己工作的变化。
- 选一个开放权重新模型，在你的评测集上与当前使用的模型对比，写出是否切换的结论。

## 资料索引

- [Stanford AI Index](https://hai.stanford.edu/ai-index) — 年度 AI 指数报告
- [Epoch AI](https://epoch.ai/) — 算力与模型趋势数据
- [Hugging Face Papers](https://huggingface.co/papers) — 每日热门论文
- [Latent Space](https://www.latent.space/) — AI 工程播客与通讯
- [Microscaling Data Formats 论文](https://arxiv.org/abs/2310.10537) — MX 低精度格式规范的原始论文
- [Semantic Versioning](https://semver.org/) — 正式版、预发布与兼容性声明的含义
- [Maven 版本顺序](https://maven.apache.org/pom.html#version-order-specification) — 版本比较不等同于最新稳定版选择
- [Spring AI 发布记录](https://github.com/spring-projects/spring-ai/releases) — 稳定分支与 RC 并行发布的例子
- [LangChain4j 发布记录](https://github.com/langchain4j/langchain4j/releases) — 旧线补丁与主线版本并存的例子

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】推理模型用更多「推理时计算」提升准确率，直接代价是：
    - A. 训练成本上升
    - B. 输出 Token 与延迟增加
    - C. 上下文窗口变小
    - D. 无法调用工具
2. 【单选】负责 Agent 与 Agent 之间任务协作的协议是：
    - A. MCP
    - B. A2A
    - C. AGENTS.md
    - D. OpenTelemetry
3. 【单选】低精度格式普遍采用按小块缩放，主要原因是：
    - A. 加快训练收敛
    - B. 减少离群值对整体动态范围的影响
    - C. 减少模型层数
    - D. 兼容旧 GPU
4. 【简答】你会用哪些标准判断一个新趋势是否应该写进正式关卡？
5. 【简答】为什么版本基线不应直接采用 GitHub 的「Latest」标记？

<details markdown><summary>参考答案</summary>

1. B — 思考过程需要生成更多 Token，成本和延迟随之增加。
2. B — MCP 连接工具与数据，A2A 连接 Agent 与 Agent。
3. B — 每块单独计算缩放因子，离群值只影响所在小块，其余元素仍能保留精度。
4. 主流推理引擎、SDK 或工具是否已经支持；是否有可复现的开源实现或官方文档；在自己的评测集或真实任务上是否带来可测量的提升；是否已稳定，不是预览或 rc 版本。
5. 「Latest」可能指向 rc 预发布或旧主版本的补丁版本（例如同时维护 v3 与 v4 的项目），不一定是最高正式版。应以 PyPI、npm、Maven 等注册表的正式版为准，再与 GitHub Releases 交叉核对。

</details>

---

← [上一节：安全与治理](../19-security-governance/) · [返回 AI](../)
