# 深度学习框架 {#deep-learning-frameworks}

> [AI](../) › 深度学习框架

掌握 PyTorch 的张量、自动求导和训练循环，了解 JAX 与 Keras 的定位，并会用 Hugging Face Transformers 加载和运行开源模型。这是读懂 14 微调、15 推理代码的前提。

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 从「会算公式」到「会写训练与推理代码」 |
| 前置要求 | [Python 速成](../00-python-bridge/)、[数学与机器学习基础](../01-foundations/) |
| 粗略用时 | 2–3 周（粗略参考） |
| 章节 | 第四章 深入 |

## 闯关任务

**QUEST 02 · 第四章 深入**

- [ ] 能够用 PyTorch 张量完成形状变换、广播与设备迁移，并解释 `requires_grad` 与 `backward()` 的作用。
- [ ] 能够用 `nn.Module`、`DataLoader` 和优化器写出标准训练循环，包括 `train()` / `eval()` 切换和 `no_grad` 推理。
- [ ] 能够说明 `torch.compile`、混合精度（bf16）和 FSDP 分别解决什么问题。
- [ ] 能够比较 PyTorch、JAX、Keras 3 的编程模型与生态定位。
- [ ] 能够用 Hugging Face Transformers 加载一个小模型，完成分词、生成与解码。

**奖励**：+100 XP · 徽章「张量炼金师」（徽章名暂定，内容建设中）

## 知识要点

### 张量与自动求导

- 张量（Tensor）是带 `dtype`、`shape`、`device` 的多维数组，接口与 NumPy 很像，但能放到 GPU 上并记录计算图。
- 设置 `requires_grad=True` 的张量参与运算后，调用 `loss.backward()` 会沿计算图把梯度累加到 `.grad`；所以每步更新前要 `optimizer.zero_grad()`。
- 推理时用 `torch.no_grad()`（或 `torch.inference_mode()`）关闭梯度记录，省显存也更快。

```python
import torch

x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x ** 2).sum()          # y = x1² + x2² + x3²
y.backward()
print(x.grad)               # dy/dx = 2x

a = torch.ones(2, 3)
b = torch.arange(3.0)       # 形状 (3,)，广播到 (2, 3)
print((a + b).shape, (a @ a.T).shape)
print(torch.__version__.split("+")[0], torch.cuda.is_available())
```

运行输出：

```text
tensor([2., 4., 6.])
torch.Size([2, 3]) torch.Size([2, 2])
2.15.0 False
```

### 训练循环

```mermaid
flowchart LR
  A[数据集 Dataset] --> B[DataLoader]
  B --> C[模型 nn.Module]
  C --> D[损失 Loss]
  D --> E[反向 backward]
  E --> F[优化器 step]
  F --> B
```

下面在 CPU 上训练一个两层 MLP 区分两个同心圆，结构与大模型微调脚本完全一样：

```python
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

torch.manual_seed(0)
n = 2000
r = torch.cat([torch.rand(n // 2) * 1.0, 1.5 + torch.rand(n // 2)])   # 内圈、外圈半径
theta = torch.rand(n) * 2 * torch.pi
X = torch.stack([r * torch.cos(theta), r * torch.sin(theta)], dim=1)
y = torch.cat([torch.zeros(n // 2), torch.ones(n // 2)]).long()
# 每类取 800 条训练、200 条验证，避免原始按类别排序造成验证集只有正类
train_idx = torch.cat([torch.arange(0, 800), torch.arange(1000, 1800)])
val_idx = torch.cat([torch.arange(800, 1000), torch.arange(1800, 2000)])
train = DataLoader(TensorDataset(X[train_idx], y[train_idx]), batch_size=64, shuffle=True)


class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(2, 32), nn.ReLU(), nn.Linear(32, 2))

    def forward(self, x):
        return self.net(x)


model = MLP()
opt = torch.optim.AdamW(model.parameters(), lr=1e-2, weight_decay=0.01)
loss_fn = nn.CrossEntropyLoss()

for epoch in range(5):
    model.train()
    for xb, yb in train:
        opt.zero_grad()
        with torch.autocast("cpu", dtype=torch.bfloat16):   # 混合精度；GPU 上改成 "cuda"
            logits = model(xb)
        loss = loss_fn(logits.float(), yb)
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        acc = (model(X[val_idx]).argmax(dim=1) == y[val_idx]).float().mean()
    print(f"epoch {epoch} loss {loss.item():.3f} val_acc {acc:.3f}")

torch.save(model.state_dict(), "mlp.pt")      # 只存权重，加载用 load_state_dict
print(sum(p.numel() for p in model.parameters()), "个参数")
```

输出形态示意（本轮修复了分层划分，未重新训练，故不沿用原验证准确率）：

```text
epoch <轮次> loss <末批损失> val_acc <两类验证集准确率>
162 个参数
```

### 编译、精度与分布式

- `torch.compile(model)`：把 Python 级计算图交给编译器做算子融合，通常一行代码带来明显加速；首次调用要编译，有冷启动时间。
- 混合精度：bf16 与 fp32 指数位相同、不易溢出，是现代 GPU 训练的默认选择；fp16 需要配合 loss scaling。
- 数据并行 DDP：每张卡一份完整模型，同步梯度；模型放不下一张卡时用 FSDP2 把参数、梯度、优化器状态切分到多卡。DeepSpeed ZeRO 是同类方案。
- Hugging Face Accelerate 把单卡、DDP、FSDP、DeepSpeed 的启动差异包成同一套代码。

```python
# 示意：默认 inductor 后端需要 C++ 编译器，本页环境以 aot_eager 后端验证
import torch
from torch import nn

model = nn.Sequential(nn.Linear(64, 128), nn.GELU(), nn.Linear(128, 10))
compiled = torch.compile(model)            # 默认后端 inductor，CPU 上需要 C 编译器
x = torch.randn(8, 64)
with torch.no_grad():
    print(torch.allclose(model(x), compiled(x), atol=1e-5))   # 期望输出 True
```

默认的 inductor 后端会生成并编译 C++ / Triton 代码，CPU 上需要可用的 `g++`。本页编写环境没有 C++ 编译器，这段代码改用 `backend="aot_eager"` 验证过输出 `True`；`aot_eager` 只做图捕获、不做代码生成，适合排查是不是编译器问题。

### JAX：函数式变换

JAX 用纯函数加变换：`grad` 求导、`jit` 编译、`vmap` 自动批处理。没有隐式状态，参数需要显式传入，Google 的 Gemma、Gemini 训练栈以 JAX 为主。

```python
import jax
import jax.numpy as jnp


def loss(w, x, y):
    return jnp.mean((x @ w - y) ** 2)


grad_fn = jax.jit(jax.grad(loss))          # 先求导再编译
x = jnp.array([[1.0, 2.0], [3.0, 4.0]])
y = jnp.array([1.0, 2.0])
w = jnp.zeros(2)
print(grad_fn(w, x, y))

batched_dot = jax.vmap(jnp.dot)            # 对第 0 维自动批处理
print(batched_dot(x, x))
```

运行输出：

```text
[ -7. -10.]
[ 5. 25.]
```

### Hugging Face Transformers：加载开源模型

Transformers 5.x 是开源模型的事实标准接口：`AutoTokenizer` 负责分词，`AutoModelForCausalLM` 加载权重，`apply_chat_template` 按模型自己的对话格式拼接消息。下面在 CPU 上运行一个 1.35 亿参数的小模型（首次运行会从 Hugging Face Hub 下载约 270 MB）：

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "HuggingFaceTB/SmolLM2-135M-Instruct"
tok = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForCausalLM.from_pretrained(model_id, dtype=torch.float32)

messages = [{"role": "user", "content": "What is the capital of France?"}]
inputs = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt", return_dict=True)
out = model.generate(**inputs, max_new_tokens=20, do_sample=False)   # 贪心解码，结果可复现
print(tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True))
print(model.num_parameters())
```

运行输出：

```text
The capital of France is Paris.
134515008
```

### 可信的训练实验：可复现、掩码与检查点

- 随机种子只是起点：记录 Python / NumPy / 框架种子、数据划分、DataLoader worker 初始化、模型与依赖版本。跨平台、跨版本仍不保证逐位一致；确定性算法可能降低性能。
- `model.eval()` 改变 Dropout / BatchNorm 行为，`no_grad()` 或 `inference_mode()` 禁用梯度记录，两者职责不同，验证时通常都需要。
- 序列批处理要区分 attention mask、因果 mask 和 loss mask；padding 不应贡献目标损失。梯度累积是多个 micro-batch 后再 `step`，损失缩放与实际有效 Token 数要一致，不能只把循环次数当有效 batch size。
- 断点续训除权重外还需优化器、学习率调度器、步数、随机状态和数据进度；只保存 `state_dict` 足以做权重加载，但不等于完整恢复训练。
- 不加载来源不明的 pickle 检查点，也不随意开启模型仓库的远程代码。`weights_only=True` 缩小反序列化攻击面，但不是沙箱或来源可信证明；验证发布者、哈希和许可证，安全边界见 [安全与治理](../19-security-governance/)。

## 选型对比

| 框架 | 编程模型 | 优势 | 适合 |
|------|----------|------|------|
| PyTorch 2.15 | 命令式（eager）+ `torch.compile` | 生态最大，论文与开源模型默认实现 | 绝大多数训练、微调、推理 |
| JAX 0.12 | 函数式变换 `grad` / `jit` / `vmap` | TPU 友好、大规模并行表达清晰 | 研究、TPU 训练 |
| Keras 3.15 | 高层 API，可切换 JAX / PyTorch / TensorFlow 后端 | 上手快、代码短 | 教学、快速原型 |
| TensorFlow 2.21 | 图执行 + Keras | 存量部署（TF Serving、TFLite） | 维护已有系统 |
| Transformers 5.22 | 模型库与统一加载接口 | 覆盖主流开源 LLM | 加载、微调、评测开源模型 |

> [!WARNING]
> 版本基线（2026-11）：PyTorch 2.15.0、Transformers 5.22.1 来自 [AI 总览](../) 的版本表；JAX 0.12.0.1、Accelerate 1.15.0、DeepSpeed 0.19.9 为 PyPI 当前版本；Keras 在 PyPI 为 3.15.1，而 GitHub Releases 的 Latest 标签仍显示 3.12.4，以 PyPI 为准。TensorFlow 的版本与适用场景需按官方发布和部署生态判断，不能由一段时间未发新版推断已停止维护。

## 常见误区

- 忘记 `optimizer.zero_grad()`，梯度会跨步累加，损失曲线异常。
- 评估时不切 `model.eval()`：Dropout、BatchNorm 仍按训练模式工作，指标偏低且不稳定。
- 用 `torch.save(model)` 保存整个对象：依赖代码路径，换环境就加载失败；应保存 `state_dict` 或用 safetensors。
- 认为 bf16 一定比 fp32 准：它节省显存和算力，但尾数位少，损失计算和归一化常要保留 fp32。
- 用 `generate` 默认参数直接比较模型：采样参数（温度、top_p）不同，结果不可比；对比时固定 `do_sample=False` 或固定随机种子。

## 实践任务

- 跑通本页的同心圆 MLP，把隐藏层改成 4 个神经元，观察欠拟合。
- 用 `torch.compile` 包装同一模型，比较首次与后续 100 次前向的耗时。
- 用 JAX 重写 01 关的线性回归梯度下降，体会 `jit(grad(loss))` 的写法。
- 用 Transformers 加载一个 1B 以下的开源 Instruct 模型，打印它的 `chat_template`，理解系统提示词和角色标记是怎么拼进输入的。

## 资料索引

- [PyTorch 文档](https://docs.pytorch.org/docs/stable/index.html) — 官方 API 与教程入口
- [Learn the Basics（PyTorch 教程）](https://docs.pytorch.org/tutorials/beginner/basics/intro.html) — 张量、数据、训练循环一条龙
- [Hugging Face Transformers 文档](https://huggingface.co/docs/transformers/index) — 加载、生成、Trainer
- [Getting started with FSDP2](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html) — 多卡切分训练
- [JAX 文档](https://docs.jax.dev/en/latest/) — 函数式变换与并行
- [Keras 3](https://keras.io/) — 多后端高层 API
- [PyTorch 可复现性](https://docs.pytorch.org/docs/stable/notes/randomness.html) — 随机源与跨环境限制
- [PyTorch 序列化语义](https://docs.pytorch.org/docs/stable/notes/serialization.html) — state_dict 与 weights_only 安全边界
- [PyTorch 性能调优](https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html) — 梯度累积、同步和推理模式
- [PyTorch 官方版本](https://pypi.org/project/torch/) — 2026-11-05 包版本复核
- [Keras 官方版本](https://pypi.org/project/keras/) — 不能把旧维护分支的 Latest 当最新主线

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】以下哪一步缺失会导致梯度跨批次累加？
    - A. `model.eval()`
    - B. `optimizer.zero_grad()`
    - C. `torch.no_grad()`
    - D. `loss.item()`
2. 【简答】`model.eval()` 和 `torch.no_grad()` 分别做了什么？推理时为什么两者都要？
3. 【单选】一个 70B 模型的参数、梯度和优化器状态放不进单卡显存，最直接的训练方案是：
    - A. DDP
    - B. FSDP / ZeRO 切分
    - C. 把 batch size 调成 1
    - D. 改用 JAX
4. 【简答】为什么现代 GPU 训练更常用 bf16 而不是 fp16？
5. 【简答】`apply_chat_template` 解决什么问题？不用它直接拼字符串会有什么风险？

<details markdown><summary>参考答案</summary>

1. B — PyTorch 默认把梯度累加到 `.grad`，每步要先清零。
2. `eval()` 切换 Dropout、BatchNorm 等层的行为；`no_grad()` 关闭计算图记录、节省显存和时间。前者影响结果正确性，后者影响资源，二者作用不同。
3. B — DDP 每卡保存完整副本，放不下时就要切分参数、梯度与优化器状态。
4. bf16 指数位与 fp32 相同，数值范围大、不易上溢下溢，通常不需要 loss scaling；fp16 范围小，需要额外的缩放技巧。
5. 不同模型的角色标记、特殊 token 和系统提示词格式不同；模板按模型自带的格式拼接。手拼容易漏特殊 token 或格式错误，导致模型表现明显下降。

</details>

---

← [上一节：数学与机器学习基础](../01-foundations/) · [返回 AI](../) · [下一节：Transformer 与大模型原理](../03-transformer-llm/) →
