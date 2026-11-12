# 微调与对齐 {#fine-tuning-alignment}

> [AI](../) › 微调与对齐

什么时候该微调（格式、风格、领域行为），什么时候用提示词或 RAG 就够。本关讲参数高效微调、SFT、偏好对齐和基于可验证奖励的强化学习（RLVR），以及常用的一站式工具。

> 相关主题：[深度学习框架](../02-dl-frameworks/) · [检索增强生成](../08-rag/) · [推理与服务](../15-inference-serving/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 第四章深入：在提示词与 RAG 不够时，用训练改变模型行为 |
| 前置要求 | [深度学习框架](../02-dl-frameworks/)、[Transformer 与大模型原理](../03-transformer-llm/)；了解梯度下降与损失函数 |
| 粗略用时 | 2–3 周（粗略参考） |
| 章节 | 第四章 深入 |

## 闯关任务

**QUEST 14 · 第四章 深入**

- [ ] 能够按「提示词 → RAG → 微调 → 继续预训练」的成本阶梯判断是否需要微调。
- [ ] 能够解释 LoRA / QLoRA 的原理，说出秩 r、alpha 和目标模块的作用。
- [ ] 能够用 TRL + PEFT 跑通一次 LoRA SFT，并准备对话格式的训练数据。
- [ ] 能够说明 RLHF（PPO）、DPO、GRPO 的区别和各自的数据需求。
- [ ] 能够评估微调效果，并识别过拟合、灾难性遗忘与数据污染。

**奖励**：+100 XP · 徽章「模型调校师」（徽章名暂定，内容建设中）

## 知识要点

### 何时微调

- 提示词能解决的不要微调；缺知识优先用 RAG（知识会更新，训练进权重难以维护）。
- 适合微调：固定输出格式、风格与语气、特定领域的行为模式、把大模型能力蒸馏到小模型以降低成本和延迟。
- 继续预训练：需要大量领域语料和算力，一般团队很少需要。

### 参数高效微调 PEFT

- LoRA：冻结原权重 W，只训练两个低秩矩阵 A（r × d）和 B（d × r），更新量为 ΔW = (alpha / r) · BA；B 初始化为 0，所以训练开始时模型不变。
- 训练完可以把 ΔW 合并回 W，推理零额外开销；也可以不合并，在推理服务中同时挂载多个 LoRA。
- QLoRA：把基座量化为 4-bit 后再训练 LoRA，显著降低显存；DoRA 把权重分解为幅度与方向分别更新。

下面用纯 PyTorch 实现一个 LoRA 层，验证参数量占比和合并后的等价性：

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

运行输出：

```text
可训练参数 65,536 / 总参数 16,846,848 = 0.39%
合并后输出一致： True
```

同一点的 Java 对照：

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


### SFT：用 TRL + PEFT 跑一次 LoRA 微调

- 数据通常是对话格式（`messages` 列表），TRL 会套用模型的聊天模板；本例未启用 assistant-only，默认不能概括为只计算 assistant 损失，具体掩码与配置见下文。
- 数据质量比数量重要：去重、去除低质量与有害样本、检查是否混入评测集。
- 下面的例子用 135M 的小模型在 CPU 上跑 4 步，只为验证流程；真实训练需要 GPU 和成百上千条高质量样本。

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

运行输出：

```text
trainable params: 460,800 || all params: 134,975,808 || trainable%: 0.3414
{'loss': '3.904', 'grad_norm': '1.053', 'learning_rate': '0.00015', 'entropy': '2.012', 'mean_token_accuracy': '0.3786', 'num_tokens': '568', 'epoch': '1'}
{'loss': '3.856', 'grad_norm': '1.059', 'learning_rate': '5e-05', 'entropy': '2.032', 'mean_token_accuracy': '0.3799', 'num_tokens': '1136', 'epoch': '2'}
{'train_runtime': '5.835', 'train_samples_per_second': '2.742', 'train_steps_per_second': '0.685', 'train_loss': '3.88', 'epoch': '2'}
最终 loss 记录： [3.9, 3.86]
```

CPU 上的训练存在数值抖动，loss 与耗时每次运行会略有差异；可训练参数约占 0.34%，说明 LoRA 只更新了极少量参数。

### 偏好对齐与强化学习

- RLHF（PPO）：先训练奖励模型，再用 PPO 优化策略；流程复杂、需要多个模型同时在显存中。
- DPO：直接用偏好对（chosen / rejected）优化，不需要单独的奖励模型；损失只依赖策略模型与参考模型的对数概率差。
- GRPO：DeepSeekMath 提出，对同一问题采样一组回答，用组内相对奖励代替价值网络；常与可验证奖励（RLVR，如数学答案正确、单元测试通过）结合。

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

运行输出：

```text
与参考模型相同： 0.6931
更偏好 chosen： 0.3711
更偏好 rejected： 1.0375
```

同一点的 Java 对照：

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

### 评估与风险

- 训练前先建评测集（见 [评测与可观测](../17-evals-observability/)），对比微调前后的任务指标和通用能力。
- 灾难性遗忘：领域数据训练过多会损害通用能力，可混入部分通用数据。
- 蒸馏：用大模型生成训练数据前，确认模型服务条款是否允许。

### QLoRA 与损失掩码：节省显存但不省验证

- QLoRA 通常冻结 4-bit 基座，仅训练 LoRA adapter；NF4 是权重量化表示，double quantization 继续量化缩放常数，计算 dtype 可仍为 bf16。不能把「4-bit 存储」解释为所有计算、梯度和 KV 都是 4-bit。
- assistant-only loss 需要显式 `assistant_only_loss=True`，并要求聊天模板能返回 assistant mask（通常有 generation 标记）；padding / user / system 是否参与 loss 应抽样检查实际 labels，不能只看数据字段叫 `messages`。
- 本页最小 SFT 为完整序列损失的流程演示；若切换 assistant-only、packing、截断或模板，先验证特殊 Token / EOS、样本边界和有效 Token 数，再比较 loss，避免用不一致目标得出提升结论。
- 按文档 / 会话 / 时间划分并去重，避免同源改写跨训练与测试；小教学样本重复多次只验证 API，不证明泛化。评测方法见 [代码模型与评测](../13-code-models-evals/)。

### 对齐与模型制品的交付契约

- DPO 的偏好对需来自相同问题、可靠标注和清楚的判定标准；位置、长度和风格偏差会让模型学会讨好而非更正确。保留基准能力、安全、拒答与目标任务的联合回归，警惕 reward hacking。
- 保存基座 revision / 许可证、tokenizer、chat template、adapter 配置与权重、数据清单 / 版本、依赖、量化配置和评测报告；adapter 不能随便加载到同名但不同 revision 的基座。
- 合并 adapter、重新量化、切换推理引擎后再做端到端评测；训练时 loss 降低不保证服务的工具调用、结构化输出或多语言质量提高，部署取舍见 [推理与服务](../15-inference-serving/)。

## 选型对比

| 工具 | 版本 | 特点 | 适合 |
|------|------|------|------|
| TRL | 1.17.1 | Hugging Face 官方，SFT / DPO / GRPO 训练器 | 需要灵活编程的团队 |
| PEFT | 0.21.2 | LoRA、QLoRA、DoRA 等适配器 | 与 TRL、Transformers 配合 |
| Unsloth | 2026.11.2 | 优化内核，省显存、提速 | 单卡、消费级 GPU |
| LLaMA-Factory | 0.9.5 | 配置驱动、Web UI、中文生态好 | 零代码或快速实验 |
| verl | 0.9.1 | 大规模强化学习训练 | 多机 GRPO / PPO |
| DeepSpeed | 0.19.9 | ZeRO 分布式训练与显存优化 | 全参数或大模型训练 |
| bitsandbytes | 0.50.2 | 4-bit / 8-bit 量化 | QLoRA |

> [!WARNING]
> 以上版本为 2026-11-05 查询 PyPI 的结果；Unsloth 采用日期式版本号，更新频繁。正文 SFT 示例在 TRL 1.17.1、PEFT 0.21.2、Transformers 5.22.1、PyTorch 2.15.0（CPU）上实际运行。DPO / GRPO 示意代码中的模型名仅为示例，训练器参数以 TRL 文档为准。

## 常见误区

- 用微调「灌知识」：模型容易记错且难以更新，知识类需求优先用 RAG。
- 数据越多越好：几百条高质量样本往往胜过上万条噪声数据。
- 只看训练 loss：loss 下降不代表任务变好，必须用独立评测集验证。
- LoRA 的 r 越大越好：r 过大接近全参数微调，更容易过拟合且省不了多少资源。
- 忘记聊天模板：训练和推理用的模板不一致，会导致输出格式错乱。
- 评测集混入训练数据：分数虚高，上线后效果落差大。

## 实践任务

- 运行本页 LoRA 代码，把 r 改成 4、16、64，记录可训练参数占比。
- 用 TRL + PEFT 在一个 0.5B–1.5B 的开源模型上做 LoRA SFT（如客服问答格式），对比微调前后在 50 条留出样本上的表现。
- 构造 100 对偏好数据，用 DPO 训练，观察 chosen / rejected 的奖励差变化。
- 用 LLaMA-Factory 的 Web UI 复现同一个 SFT 任务，比较两种方式的配置成本。

## 资料索引

- [LoRA 论文](https://arxiv.org/abs/2106.09685) — 低秩适配原理
- [QLoRA 论文](https://arxiv.org/abs/2305.14314) — 4-bit 量化 + LoRA
- [DPO 论文](https://arxiv.org/abs/2305.18290) — 直接偏好优化
- [DeepSeekMath 论文](https://arxiv.org/abs/2402.03300) — GRPO 算法出处
- [TRL 文档](https://huggingface.co/docs/trl/index) — SFT / DPO / GRPO 训练器
- [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) — 一站式微调框架
- [TRL SFT Trainer](https://huggingface.co/docs/trl/en/sft_trainer) — assistant_only_loss、模板 mask 与数据格式
- [Transformers bitsandbytes](https://huggingface.co/docs/transformers/en/quantization/bitsandbytes) — NF4、嵌套量化与 compute dtype
- [TRL DPO Trainer](https://huggingface.co/docs/trl/en/dpo_trainer) — 偏好数据、参考模型与训练目标
- [PEFT 检查点格式](https://huggingface.co/docs/peft/developer_guides/checkpoint) — adapter 配置与基座依赖

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】公司产品文档每周更新，希望模型能回答最新内容，首选方案是：
    - A. 每周全参数微调
    - B. RAG
    - C. 继续预训练
    - D. 增大 LoRA 的 r
2. 【单选】LoRA 中 B 矩阵初始化为 0 的作用是：
    - A. 加快收敛
    - B. 训练开始时不改变原模型的输出
    - C. 减少显存
    - D. 防止过拟合
3. 【单选】DPO 相比 RLHF（PPO）最大的简化是：
    - A. 不需要偏好数据
    - B. 不需要单独训练奖励模型
    - C. 不需要参考模型
    - D. 不需要 GPU
4. 【简答】QLoRA 为什么能大幅降低显存？它和 LoRA 是什么关系？
5. 【简答】GRPO 与可验证奖励（RLVR）适合什么任务？举一个奖励函数的例子。

<details markdown><summary>参考答案</summary>

1. B — 频繁更新的知识用检索注入上下文，无需重新训练。
2. B — ΔW = BA 初始为 0，模型从原始能力出发逐步学习增量。
3. B — DPO 用偏好对直接优化策略，把奖励模型隐含在损失中；但仍需要参考模型。
4. QLoRA 把冻结的基座权重量化为 4-bit 存储，显存主要占用从 16-bit 权重降到约四分之一，只有少量 LoRA 参数以高精度训练。它是在 LoRA 基础上加了基座量化，适配器部分仍是 LoRA。
5. 适合答案可以被程序自动判对错的任务，如数学题、代码生成、格式校验。例子：生成的代码通过单元测试得 1 分，否则 0 分；或数学答案与标准答案完全一致得 1 分。

</details>

---

← [上一节：代码模型与评测](../13-code-models-evals/) · [返回 AI](../) · [下一节：推理与服务](../15-inference-serving/) →
