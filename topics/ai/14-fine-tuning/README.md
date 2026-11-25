# 微调与对齐 {#fine-tuning-alignment}

> [AI](../) › 微调与对齐

每周都在变的文档用 RAG，不用微调。微调适合格式、语气和稳定的行为，或把大模型的这类行为蒸馏到小模型。训练 loss 下降，还不等于服务里的工具调用或结构化输出变好。

> 相关主题：[深度学习框架](../02-dl-frameworks/) · [检索增强生成](../08-rag/) · [推理与服务](../15-inference-serving/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

成本阶梯是提示词、RAG、微调、继续预训练。LoRA 只训练低秩增量，B 从 0 开始，所以第一步不改变原模型。本页的 Java 只核对参数个数，并在 4 个数上看合并是否一致，不是 4096 维训练。SFT 示例没有打开 assistant-only loss。GRPO 那段引用了未定义的数据集，不能执行。

## 何时微调 {#_4}

<span id="_2"></span>

提示词能固定的格式和语气，先不要训练。知识会变时用 [检索增强生成](../08-rag/)：写进权重之后很难按周更新。

适合微调的是稳定的输出格式、风格，以及特定领域里反复出现的行为。把大模型的这类行为蒸馏到小模型，是为了推理成本和延迟，不是为了灌进一份每周都改的文档。

继续预训练要大量领域语料和算力。多数团队先不要上这一档。

## 参数高效微调 {#peft}

LoRA 冻结原权重 W，只训练 A（r × d）和 B（d × r）。更新是 ΔW = (alpha / r) · BA。B 初始化为 0，训练开始时输出不变。训完可以把 ΔW 合并回 W，推理不再多一块计算；也可以不合并，在服务里同时挂多个 LoRA。

QLoRA 把基座量化成 4-bit 再训 LoRA，省的是基座权重的存储。DoRA 把幅度和方向分开更新。

下面的 PyTorch 示例在编写时验证参数占比和合并后的输出接近。2026-11-25 没有重跑，也没有安装 PyTorch。

```python
import torch
from torch import nn

torch.manual_seed(0)

class LoRALinear(nn.Module):
    """冻结原权重 W，只训练低秩矩阵 A、B：y = xW^T + (alpha/r)·xA^T B^T"""
    def __init__(self, base: nn.Linear, r: int = 8, alpha: int = 16):
        super().__init__()
        self.base = base.requires_grad_(False)
        self.A = nn.Parameter(torch.randn(r, base.in_features) * 0.01)
        self.B = nn.Parameter(torch.zeros(base.out_features, r))  # B 初始为 0，训练开始时不改变模型
        self.scale = alpha / r

    def forward(self, x):
        return self.base(x) + (x @ self.A.T @ self.B.T) * self.scale

    def merge(self) -> nn.Linear:
        merged = nn.Linear(self.base.in_features, self.base.out_features)
        merged.weight.data = self.base.weight + self.scale * self.B @ self.A
        merged.bias.data = self.base.bias.clone()
        return merged

layer = LoRALinear(nn.Linear(4096, 4096), r=8)
trainable = sum(p.numel() for p in layer.parameters() if p.requires_grad)
total = sum(p.numel() for p in layer.parameters())
print(f"可训练参数 {trainable:,} / 总参数 {total:,} = {trainable / total:.2%}")

with torch.no_grad():
    layer.B.normal_()                     # 模拟训练后的 B
    x = torch.randn(2, 4096)
    diff = (layer(x) - layer.merge()(x)).abs().max().item()
print("合并后输出一致：", diff < 1e-3)
```

编写时的输出：

```text
可训练参数 65,536 / 总参数 16,846,848 = 0.39%
合并后输出一致： True
```

同一公式的 Java 对照：

```java
class LoraCount {
    public static void main(String[] args) {
        int in = 4096, out = 4096, r = 8, alpha = 16;
        long trainable = (long) r * in + (long) out * r;
        long total = (long) out * in + out + trainable;
        System.out.printf("可训练参数 %,d / 总参数 %,d = %.2f%%%n", trainable, total, 100.0 * trainable / total);
        if (trainable != 65536 || total != 16846848) throw new AssertionError();
        double scale = (double) alpha / r;
        double[] x = {0.2, -0.4, 0.1, 0.3};
        double[][] a = {{0.01, 0, 0, 0}, {0, 0.02, 0, 0}};
        double[][] b = {{0.3, 0}, {0, 0.4}, {-0.2, 0}, {0, 0.1}};
        double[] via = apply(x, a, b, scale);
        double[] merged = applyMerged(x, a, b, scale);
        double diff = 0;
        for (int i = 0; i < via.length; i++) diff = Math.max(diff, Math.abs(via[i] - merged[i]));
        System.out.println("合并后输出一致： " + (diff < 1e-3));
    }

    static double[] apply(double[] x, double[][] a, double[][] b, double scale) {
        double[] ax = new double[a.length];
        for (int i = 0; i < a.length; i++) for (int j = 0; j < x.length; j++) ax[i] += x[j] * a[i][j];
        double[] y = new double[b.length];
        for (int i = 0; i < b.length; i++) for (int j = 0; j < ax.length; j++) y[i] += ax[j] * b[i][j];
        for (int i = 0; i < y.length; i++) y[i] *= scale;
        return y;
    }

    static double[] applyMerged(double[] x, double[][] a, double[][] b, double scale) {
        double[][] w = new double[b.length][a[0].length];
        for (int i = 0; i < b.length; i++) for (int j = 0; j < a[0].length; j++) for (int k = 0; k < a.length; k++) w[i][j] += scale * b[i][k] * a[k][j];
        double[] y = new double[w.length];
        for (int i = 0; i < w.length; i++) for (int j = 0; j < x.length; j++) y[i] += x[j] * w[i][j];
        return y;
    }
}
```

Java 用 `in = out = 4096`、`r = 8` 算出可训练参数 65,536、总参数 16,846,848。合并是否一致，只在围栏里的 4 维数组上做。2026-11-25 用 OpenJDK 21.0.13.0.3 编译运行了这段：参数行与上面的输出块第一行一致；布尔值打印是小写 `true`，因为这是 Java 的 boolean，不是 PyTorch 那次运行的 `True`。这不是 4096 维的训练，也没有 GPU。输出块不改。

## SFT 示例没有只训 assistant {#sft-trl-peft-lora}

数据通常是 `messages`。TRL 会套模型的聊天模板。本例没有打开 assistant-only，不能说成只计算 assistant 的损失。

数据质量比条数重要：去重，去掉低质量和有害样本，并检查有没有混进评测集。按文档、会话或时间切开，避免同一份改写同时出现在训练和测试里。切分方式见 [代码模型与评测](../13-code-models-evals/)。

下面用 135M 的小模型在 CPU 上跑 4 步，只为看调用形状。真实训练要 GPU 和成百上千条高质量样本。小样本重复几次只说明 API 能跑，不证明泛化。

```python
from datasets import Dataset
from peft import LoraConfig
from trl import SFTConfig, SFTTrainer

data = Dataset.from_list([
    {"messages": [{"role": "user", "content": "退款多久到账？"},
                  {"role": "assistant", "content": "原路退回，1–3 个工作日到账。"}]},
    {"messages": [{"role": "user", "content": "可以开发票吗？"},
                  {"role": "assistant", "content": "可以，在订单详情页申请电子发票。"}]},
] * 4)

trainer = SFTTrainer(
    model="HuggingFaceTB/SmolLM2-135M-Instruct",
    train_dataset=data,
    args=SFTConfig(output_dir="out", max_steps=4, per_device_train_batch_size=4,
                   learning_rate=2e-4, logging_steps=2, report_to="none", use_cpu=True),
    peft_config=LoraConfig(r=8, lora_alpha=16, target_modules=["q_proj", "v_proj"],
                           task_type="CAUSAL_LM"),
)
trainer.model.print_trainable_parameters()
trainer.train()
print("最终 loss 记录：", [round(x["loss"], 2) for x in trainer.state.log_history if "loss" in x])
```

编写时的输出：

```text
trainable params: 460,800 || all params: 134,975,808 || trainable%: 0.3414
{'loss': '3.904', 'grad_norm': '1.053', 'learning_rate': '0.00015', 'entropy': '2.012', 'mean_token_accuracy': '0.3786', 'num_tokens': '568', 'epoch': '1'}
{'loss': '3.856', 'grad_norm': '1.059', 'learning_rate': '5e-05', 'entropy': '2.032', 'mean_token_accuracy': '0.3799', 'num_tokens': '1136', 'epoch': '2'}
{'train_runtime': '5.835', 'train_samples_per_second': '2.742', 'train_steps_per_second': '0.685', 'train_loss': '3.88', 'epoch': '2'}
最终 loss 记录： [3.9, 3.86]
```

CPU 上的训练存在数值抖动，loss 与耗时每次运行会略有差异；可训练参数约占 0.34%，说明 LoRA 只更新了极少量参数。

这段输出是编写时的记录，对应章内注明的 TRL 1.17.1、PEFT 0.21.2、Transformers 5.22.1、PyTorch 2.15.0（CPU）。2026-11-25 没有重跑，没有下载 `HuggingFaceTB/SmolLM2-135M-Instruct`，也没有新的 loss 数字。

## 偏好损失与不可执行的 GRPO 入口 {#_5}

- RLHF（PPO）先训奖励模型，再用 PPO 更新策略。流程长，多个模型要同时占显存。
- DPO 用偏好对（chosen / rejected）直接优化。不单独训奖励模型。损失看的是策略模型和参考模型的对数概率差。参考模型仍然要有。
- GRPO 出自 DeepSeekMath：同一题采一组回答，用组内相对奖励代替价值网络。常和可验证奖励一起用，例如数学答案匹配或单元测试通过。

```python
import torch
import torch.nn.functional as F

def dpo_loss(pi_chosen, pi_rejected, ref_chosen, ref_rejected, beta=0.1):
    """输入为各回答在策略模型 / 参考模型下的对数概率之和"""
    margin = (pi_chosen - ref_chosen) - (pi_rejected - ref_rejected)
    return -F.logsigmoid(beta * margin).mean()

ref_c, ref_r = torch.tensor([-12.0]), torch.tensor([-11.0])
print("与参考模型相同：", round(dpo_loss(ref_c, ref_r, ref_c, ref_r).item(), 4))
print("更偏好 chosen：", round(dpo_loss(torch.tensor([-8.0]), torch.tensor([-15.0]), ref_c, ref_r).item(), 4))
print("更偏好 rejected：", round(dpo_loss(torch.tensor([-15.0]), torch.tensor([-8.0]), ref_c, ref_r).item(), 4))
```

编写时的输出：

```text
与参考模型相同： 0.6931
更偏好 chosen： 0.3711
更偏好 rejected： 1.0375
```

同一公式的 Java，`beta` 写死为 0.1：

```java
class DpoLoss {
    static double loss(double piC, double piR, double refC, double refR) {
        double margin = (piC - refC) - (piR - refR);
        double sig = 1.0 / (1.0 + Math.exp(-0.1 * margin));
        return -Math.log(sig);
    }

    public static void main(String[] args) {
        System.out.printf("与参考模型相同： %.4f%n", loss(-12, -11, -12, -11));
        System.out.printf("更偏好 chosen： %.4f%n", loss(-8, -15, -12, -11));
        System.out.printf("更偏好 rejected： %.4f%n", loss(-15, -8, -12, -11));
    }
}
```

三个标量的方向是：和参考模型一样时损失约 0.6931；更偏向 chosen 时下降；更偏向 rejected 时上升。2026-11-25 只重算了 Java 的这三个数，与输出块一致。PyTorch 那段没有重跑。这不是一次对齐训练，没有奖励模型，也没有偏好数据集。

```python
# 示意：TRL 1.17 的 DPO 与 GRPO 训练器入口（需要 GPU 与真实数据集）
from trl import DPOConfig, DPOTrainer, GRPOConfig, GRPOTrainer

dpo = DPOTrainer(model="Qwen/Qwen3-0.6B", args=DPOConfig(output_dir="dpo", beta=0.1),
                 train_dataset=pref_dataset)        # 列：prompt / chosen / rejected

def reward_exact(completions, answer, **kwargs):    # 可验证奖励：答案完全匹配得 1 分
    return [1.0 if c[0]["content"].strip() == a else 0.0 for c, a in zip(completions, answer)]

grpo = GRPOTrainer(model="Qwen/Qwen3-0.6B", reward_funcs=reward_exact,
                   args=GRPOConfig(output_dir="grpo"), train_dataset=math_dataset)
```

这段 DPO / GRPO 入口引用了没有定义的 `pref_dataset` 和 `math_dataset`，注释写明要 GPU 和真实数据。它不能执行。2026-11-25 没有补数据集，也没有跑。`Qwen/Qwen3-0.6B` 只是围栏里的示例字符串。

## 评测与遗忘 {#_6}

训练前先有留出集，见 [评测与可观测](../17-evals-observability/)。对比微调前后的任务指标和通用能力。领域数据过多会损害通用能力，可以混入一部分通用样本。用大模型生成训练数据之前，先看服务条款是否允许蒸馏。

## QLoRA 省的是基座存储 {#qlora}

QLoRA 通常冻结 4-bit 基座，只训 LoRA。NF4 是权重的量化表示，double quantization 再量化缩放常数。计算用的 dtype 仍可以是 bf16。不能把「4-bit 存储」说成计算、梯度和 KV 都是 4-bit。

assistant-only 要显式 `assistant_only_loss=True`，并且聊天模板要能给出 assistant mask。padding、user 和 system 是否进了 loss，要抽查实际 labels。字段名叫 `messages` 不够。

本页最小 SFT 是整段序列的损失。若改成 assistant-only、packing、截断或另一套模板，先核对特殊 Token、EOS、样本边界和有效 Token 数，再比较 loss。目标不一致时，loss 下降不能解释成变好了。

小教学样本重复多次只验证 API。评测集按文档或时间切开，见 [代码模型与评测](../13-code-models-evals/)。

## 制品要和基座 revision 一起走 {#_7}

偏好对要来自同一问题，标注标准要写清。位置、长度和语气的偏差会让模型学着迎合。回归要同时看原有能力、安全、拒答和目标任务。

交出去的包括基座 revision 和许可证、tokenizer、chat template、adapter 的配置和权重、数据清单、依赖、量化配置、评测报告。同名但 revision 不同的基座不能随便挂这个 adapter。

合并、再量化或换推理引擎之后，再做端到端评测。训练 loss 下降不保证服务里的工具调用、结构化输出或多语言质量变好。部署上的取舍见 [推理与服务](../15-inference-serving/)。

## 工具版本是当时的查询 {#tune-choice}

<span id="_8"></span>

| 工具 | 版本（2026-11-05 的 PyPI 记录） | 特点 | 适合 |
|------|------|------|------|
| TRL | 1.17.1 | Hugging Face 官方，SFT / DPO / GRPO 训练器 | 需要灵活编程的团队 |
| PEFT | 0.21.2 | LoRA、QLoRA、DoRA 等适配器 | 与 TRL、Transformers 配合 |
| Unsloth | 2026.11.2 | 优化内核，省显存、提速 | 单卡、消费级 GPU |
| LLaMA-Factory | 0.9.5 | 配置驱动、Web UI、中文生态好 | 零代码或快速实验 |
| verl | 0.9.1 | 大规模强化学习训练 | 多机 GRPO / PPO |
| DeepSpeed | 0.19.9 | ZeRO 分布式训练与显存优化 | 全参数或大模型训练 |
| bitsandbytes | 0.50.2 | 4-bit / 8-bit 量化 | QLoRA |

> [!WARNING]
> 以上版本为 2026-11-05 查询 PyPI 的结果；Unsloth 采用日期式版本号，更新频繁。正文 SFT 示例在 TRL 1.17.1、PEFT 0.21.2、Transformers 5.22.1、PyTorch 2.15.0（CPU）上实际运行。DPO / GRPO 示意代码中的模型名仅为示例，训练器参数以 TRL 文档为准。2026-11-25 没有重查 PyPI，也没有重跑 SFT，不把这些版本称为当前版本。

## 常见误读 {#_3}

<span id="_9"></span>

- 用微调灌每周都变的知识：优先 RAG。加大 r 并不更新文档。
- 数据越多越好：几百条干净样本往往胜过上万条噪声。
- 只看训练 loss：要有留出集。本页 SFT 也没有打开 assistant-only。
- r 越大越好：太大就接近全参数，更易过拟合。
- 训练和推理的聊天模板不一致：输出格式会对不上。
- 评测集混进训练数据：分数虚高。
- 把 Java 的 4 维合并当成 4096 维训练。
- 把 GRPO 入口当成已经能跑的实验。

## 可选核对 {#tune-check}

<span id="_10"></span>

1. 产品文档每周更新时，为什么用 RAG，而不是加大 LoRA 的 r？
2. 本页 SFT 没有打开 assistant-only。训练 loss 下降为什么还不能当成服务端质量变好？QLoRA 的 4-bit 覆盖哪一部分？

<details markdown><summary>参考答案</summary>

1. 每周都变的内容写进权重就难以维护。RAG 在回答时把当前文档放进上下文。r 只决定 LoRA 的容量，不负责更新知识。继续预训练更贵，多数团队先不上。
2. 这个示例算的是整段序列的损失，不是只算 assistant。loss 还会随 CPU 运行抖动，而且小样本重复不证明泛化。服务端还要看工具调用和结构化输出，那是换引擎之后的检查。QLoRA 的 4-bit 是冻结基座的存储；计算 dtype 仍可以是 bf16，KV 也不是 4-bit。Java 的合并演示只在 4 个数上，GRPO 围栏因数据集未定义而不能执行。

</details>

<span id="_12"></span>

## 资料索引 {#_11}

- [LoRA 论文](https://arxiv.org/abs/2106.09685) — 低秩适配原理
- [QLoRA 论文](https://arxiv.org/abs/2305.14314) — 4-bit 量化 + LoRA
- [DPO 论文](https://arxiv.org/abs/2305.18290) — 直接偏好优化
- [DeepSeekMath 论文](https://arxiv.org/abs/2402.03300) — GRPO 算法出处
- [TRL 文档](https://huggingface.co/docs/trl/index) — SFT / DPO / GRPO 训练器；版本表是 2026-11-05 的记录
- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) — 一站式微调框架
- [TRL SFT Trainer](https://huggingface.co/docs/trl/en/sft_trainer) — assistant_only_loss 与模板 mask；2026-11-25 未重开
- [Transformers bitsandbytes](https://huggingface.co/docs/transformers/en/quantization/bitsandbytes) — NF4 与 compute dtype；2026-11-25 未重开
- [TRL DPO Trainer](https://huggingface.co/docs/trl/en/dpo_trainer) — 偏好数据与参考模型；2026-11-25 未重开
- [PEFT 检查点格式](https://huggingface.co/docs/peft/developer_guides/checkpoint) — adapter 与基座 revision

---

← [上一节：代码模型与评测](../13-code-models-evals/) · [返回 AI](../) · [下一节：推理与服务](../15-inference-serving/) →
