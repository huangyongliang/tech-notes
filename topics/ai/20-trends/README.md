# 前沿与趋势 {#trends}

> [AI](../) › 前沿与趋势

论文、预览、正式接口、开放权重、弃用和关停不是同一件事。GitHub 上的 Latest 也不等于最高正式版。没有同一预算下的对照，就不把厂商自报的提升写进选型。

> 相关主题：[模型全景](../04-model-landscape/) · [代码模型与评测](../13-code-models-evals/) · [推理与服务](../15-inference-serving/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

这一页跟踪方向，不把新名字写进基线。推理模型用更多输出 Token 换准确率，简单任务应少花这份计算。低精度按块缩放，是为了让离群值只影响一块。Java 的演示用的是 JDK 随机数，不能代替 PyTorch 输出块里的五个误差。

## 推理时的计算 {#test-time-compute}

<span id="_2"></span>

推理模型在回答前生成较长的思考，用更多推理时计算换准确率。数学、代码和规划通常更受益。成本和延迟随思考变长。简单任务应关掉或降低思考。原理见 [Transformer 与大模型原理](../03-transformer-llm/)，调用见 [LLM API 编程模式](../06-llm-api-programming/)。本章没有重测任何模型的延迟。

## 长程 Agent {#agent}

章内把 2026 年编程 Agent 的共同方向记为：云端会话可以离线跑很久，有跨会话记忆，自主模式配沙箱和审批。这是当时的概括，不是 2026-11-25 重开产品页后的清单。

工程重点从写好一次提示，转到可恢复的长任务：检查点、进度文件，以及用测试当验收。见 [智能体](../09-agents/) 和 [编程智能体工作流](../12-coding-agents/)。没有测试的长任务无法判断做完没有。

## 三个名字各连什么 {#_4}

- MCP 连接 Agent 与工具或数据。规范修订号以 [MCP 协议与开发](../10-mcp/) 已写下的 2026-07-28 为准。本章不重开整份规范，也不把它改称更新的当前版。
- A2A 连接 Agent 与 Agent。版本以 [智能体](../09-agents/) 已核对的页为准，本章不另写一个 tag。
- AGENTS.md 是给编程 Agent 的项目说明，见 [编程智能体工作流](../12-coding-agents/)。它不是协议授权。

## 开放权重 {#_5}

章内举例：Qwen3.8、DeepSeek V4.x、GLM-5.3、Kimi K3。许可证和部署显存差很多。开放权重让私有化、微调和成本优化成为可能。选型还要看许可证、上下文、工具调用和推理引擎是否支持。具体型号以 [模型全景](../04-model-landscape/) 里已有的记录为准。本章不把这份举例改写成当天的当前型号。

## 按块缩放 {#_6}

章内把 FP8 记为数据中心推理里常见的默认，并把 NVFP4、MXFP8 记为新一代 GPU 上的格式。位数越少，能表示的值越少。离群值会占满整个张量的动态范围，所以低精度常常按小块各自缩放。MX 系列在章内记为 32 个元素共享一个缩放因子，NVFP4 记为 16 个。下面用简化缩放看块大小对误差的影响。

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

编写时的输出：

```text
BF16             相对误差 0.0013
FP8 E4M3 张量级   相对误差 0.0171
FP4 整个张量一组  相对误差 0.4815
FP4 每 32 个一组  相对误差 0.0981
FP4 每 16 个一组  相对误差 0.0730
```

Java 没有 torch 的 FP8 和 BF16。注释写明误差不必等于原文：

```java
class LowPrecision {
    static double rel(double[] q, double[] w) {
        double num = 0, den = 0;
        for (int i = 0; i < w.length; i++) {
            double d = q[i] - w[i];
            num += d * d;
            den += w[i] * w[i];
        }
        return Math.sqrt(num / den);
    }

    static double[] block(double[] x, int block) {
        double[] y = new double[x.length];
        double[] levels = {0, 0.5, 1, 1.5, 2, 3, 4, 6};
        for (int start = 0; start < x.length; start += block) {
            double max = 0;
            for (int i = start; i < start + block; i++) max = Math.max(max, Math.abs(x[i]));
            double scale = max / 6;
            for (int i = start; i < start + block; i++) {
                double mag = scale == 0 ? 0 : Math.abs(x[i] / scale);
                int idx = 0;
                double best = Double.POSITIVE_INFINITY;
                for (int k = 0; k < levels.length; k++) {
                    double dist = Math.abs(mag - levels[k]);
                    if (dist < best) { best = dist; idx = k; }
                }
                y[i] = levels[idx] * Math.signum(x[i]) * scale;
            }
        }
        return y;
    }

    public static void main(String[] args) {
        // 同一套按块缩放与 E2M1 码表。Java 没有 torch 的 FP8/BF16，具体误差不必等于原文数字。
        java.util.Random rng = new java.util.Random(0);
        double[] w = new double[4096];
        for (int i = 0; i < w.length; i++) w[i] = rng.nextGaussian() * 0.02;
        for (int i = 0; i < w.length; i += 512) w[i] *= 40;
        double hi = rel(w, w);
        double[] tensor = block(w, 4096);
        double[] b32 = block(w, 32);
        double[] b16 = block(w, 16);
        double eTensor = rel(tensor, w), e32 = rel(b32, w), e16 = rel(b16, w);
        System.out.printf("高精度相对误差 %.4f%n", hi);
        System.out.printf("整张量一组相对误差 %.4f%n", eTensor);
        System.out.printf("每 32 个一组相对误差 %.4f%n", e32);
        System.out.printf("每 16 个一组相对误差 %.4f%n", e16);
        if (!(hi < eTensor && e16 < e32 && e32 < eTensor)) {
            throw new AssertionError(hi + " " + eTensor + " " + e32 + " " + e16);
        }
    }
}
```

2026-11-25 没有安装 PyTorch，没有重跑上面的五个误差。输出块保持 0.0013、0.0171、0.4815、0.0981、0.0730。同一天用 OpenJDK 21.0.13.0.3 编译运行了 Java。它用 `Random(0)` 的高斯，高精度那一行是数组和自己比。程序按围栏里的不等式退出：整段一组的误差大于每 32 个一组，每 32 个一组又大于每 16 个一组。打印出的小数与 PyTorch 输出块不同，不写入新表，也不能代替那五个数。

## 新架构先看生态 {#_7}

线性注意力用线性复杂度替换一部分全注意力，降低长上下文的计算和 KV。章内举例 Kimi-Linear。扩散语言模型并行去噪整段文本，而不是从左到右逐个生成。章内举例 Stable-DiffCoder。推理引擎、量化和工具链往往晚于论文。基准污染见 [代码模型与评测](../13-code-models-evals/)。本章没有重跑这些模型。

## 季度清单 {#_8}

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

清单本身不是一次已经完成的核对。2026-11-25 没有按它去刷新 PyPI、模型页或关停公告。

## 下沉之前的门槛 {#_9}

论文、演示、预览 API、正式 API、开放权重和生产可用是不同状态。「发布」「可申请」「全量开放」「弃用」「关停」也是不同事件。视频 API 的反例在 [多模态](../16-multimodal/)，本章不再做第二张价格表。

注册表的 latest、Maven 的 `<release>`、GitHub 的 Latest 和最高正式版可能不是同一个。先排除 rc 和 beta，再看官方时间线、维护分支和兼容矩阵。旧主线的补丁不会让新主线倒退。

每一项留下证据日期、官方链接、可复现实验，以及质量、延迟、成本和安全上的差别、还有迁移代价。没有同一预算下的对照，就不把厂商自报的提升写进选型。

季度实验要有止损：先在固定的离线任务上验证，再小流量。没有明确收益就留原方案。协议稳定性、SDK 版本和模型生命周期分开跟踪。OTel GenAI 在 [评测与可观测](../17-evals-observability/) 里记为 Development，不表示以后升级一定兼容。

从 [Java 生态](../../java/12-ecosystem-trends/) 和 [云原生 Java](../../microservices/16-cloud-native-java/) 延伸时，业务契约和可观测链路保持稳定。模型和框架的变化留在适配层，避免每个季度重写业务服务。

## 哪些可以下沉 {#trend-choice}

<span id="_10"></span>

| 方向 | 成熟度（章内判断） | 建议动作 | 下沉到 |
|------|--------|----------|--------|
| 推理模型与思考预算 | 已普及 | 按任务难度选择推理强度 | [03](../03-transformer-llm/)、[06](../06-llm-api-programming/) |
| MCP / AGENTS.md | 已普及 | 直接采用 | [10](../10-mcp/)、[12](../12-coding-agents/) |
| A2A | 推广中 | 跨团队 Agent 互通时评估 | [09](../09-agents/) |
| 长程云端 Agent | 快速演进 | 在非关键任务上试用，建立审批与沙箱 | [12](../12-coding-agents/) |
| FP8 推理 | 已普及 | 自托管时评估 | [15](../15-inference-serving/) |
| NVFP4 / MXFP8 | 推广中 | 有相应硬件时先评精度 | [15](../15-inference-serving/) |
| 线性注意力、扩散语言模型 | 研究与早期 | 先看论文和开源实现，暂不用于生产 | [03](../03-transformer-llm/) |

> [!TIP]
> 判断一个趋势是否值得投入，可以问三个问题：主流推理引擎或 SDK 是否已支持？是否有可复现的开源实现？在你自己的评测集上是否有提升？三个都是「是」再考虑下沉到正式关卡。本章没有在 2026-11-25 重新回答这三问。

## 常见误读 {#_3}

<span id="_11"></span>

- 追每一个新模型。先看自己的评测集。
- 只看厂商基准。可能污染，也可能和任务无关。
- 把预览或 rc 写进基线。预览可能关停，rc 可能不兼容。
- 论文一出就重写系统。引擎和量化往往更晚。
- 回顾之后不改版本基线和关卡。判断就停在清单上。
- 把 Java 的随机数误差写成 PyTorch 那五个数。
- 把本章的开放权重举例称为当天核对过的当前型号。

## 可选核对 {#trend-check}

<span id="_12"></span>

1. 一个趋势要同时满足什么，才写进正式关卡？
2. 为什么不能把 GitHub 的 Latest 直接写成版本基线？Java 的低精度示例能不能代替 PyTorch 输出块里的五个误差？

<details markdown><summary>参考答案</summary>

1. 主流引擎或 SDK 已经支持，有可复现的实现或官方文档，并且在自己的评测集上有提升。还要分清预览、正式版、弃用和关停。三个问题里有「否」，就留在这一页，不写进基线。
2. Latest 可能是 rc，或是旧主线的补丁，不一定是最高正式版。要看注册表的正式版，再和发布记录交叉核对。Java 用的是 `Random(0)`，没有 torch 的 FP8 和 BF16。2026-11-25 的运行只确认了「整段一组的误差大于 32 一块，32 一块大于 16 一块」。打印的小数与 0.0013、0.0171、0.4815、0.0981、0.0730 不同，不能替换输出块。

</details>

<span id="_14"></span>

## 资料索引 {#_13}

- [Stanford AI Index](https://hai.stanford.edu/ai-index) — 年度 AI 指数报告
- [Epoch AI](https://epoch.ai/) — 算力与模型趋势数据
- [Hugging Face Papers](https://huggingface.co/papers) — 每日热门论文
- [Latent Space](https://www.latent.space/) — AI 工程播客与通讯
- [Microscaling Data Formats 论文](https://arxiv.org/abs/2310.10537) — MX 格式的原始论文
- [Semantic Versioning](https://semver.org/) — 正式版与预发布
- [Maven 版本顺序](https://maven.apache.org/pom.html#version-order-specification) — 版本比较不等于选择最新稳定版
- [Spring AI 发布记录](https://github.com/spring-projects/spring-ai/releases) — 稳定分支与 RC 并存的例子；2026-11-25 未重开
- [LangChain4j 发布记录](https://github.com/langchain4j/langchain4j/releases) — 旧线补丁与主线并存的例子；2026-11-25 未重开

---

← [上一节：安全与治理](../19-security-governance/) · [返回 AI](../)
