# 深度学习框架 {#deep-learning-frameworks}

> [AI](../) › 深度学习框架

掌握 PyTorch 的张量、自动求导和训练循环，了解 JAX 与 Keras 的定位，并会用 Hugging Face Transformers 加载和运行开源模型。这是读懂 [微调与对齐](../14-fine-tuning/) 和 [推理与服务](../15-inference-serving/) 代码的前提。

---

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

这一页连接上一页的损失、梯度和后面的微调、推理代码。它保证的是：梯度记在哪些张量上、一次标准训练循环长什么样、编译、精度和切分各自解决什么，以及加载开源模型时模板和权重的边界。

## 张量记录的是计算，不是自动保住正确性 {#_2}

<span id="_4"></span>

- `requires_grad=True` 只在它参与的运算上建图。`loss.backward()` 把梯度累加到 `.grad`，所以每步更新前要 `optimizer.zero_grad()`。
- `model.eval()` 改变 Dropout 和 BatchNorm 的行为。`torch.no_grad()` 或 `torch.inference_mode()` 关闭记录。验证时通常两个都要，职责不同。
- 模型和 batch 必须在同一个 `device` 上。CPU 张量和 CUDA 张量对不上，不是公式算错了。

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

`2.15.0 False` 是原文记录的历史输出。2026-11-23 这台机器没有安装 PyTorch，这段以及后面的 MLP、`torch.compile`、JAX 和 Transformers 示例都没有重跑。

## 训练循环 {#_5}

```mermaid
flowchart LR
  A[数据集 Dataset] --> B[DataLoader]
  B --> C[模型 nn.Module]
  C --> D[损失 Loss]
  D --> E[反向 backward]
  E --> F[优化器 step]
  F --> B
```

下面在 CPU 上训练一个两层 MLP。循环的形状和微调脚本相同，不等于这一页已经做了微调。

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

## 编译、精度与分布式 {#_6}

- 下面围栏写的是默认的 `torch.compile(model)`。默认后端是 inductor：Dynamo 捕获图，再生成并编译代码。第一次调用有冷启动，那不是稳态速度。
- `backend="aot_eager"` 不是这条性能路径。Dynamo 捕获图，AOTAutograd 做出前向和反向，然后用 eager 执行，不做 inductor 的代码生成。它适合区分「图有没有被捕获」和「后端编译是不是慢或失败」。原文说编写环境没有 C++ 编译器，曾用 `backend="aot_eager"` 看到 `True`。那是当时的记录。本次没有安装 PyTorch，没有改围栏，也没有把 `True` 写成新的实测。
- bf16 的指数位与 fp32 相同，范围大，通常不必为了溢出做 loss scaling。fp16 范围小，需要缩放。两者尾数都比 fp32 少，损失和归一化常常留在 fp32。bf16 不是「一定比 fp32 准」。
- DDP 是每张卡一份完整模型，同步梯度。参数、梯度和优化器状态放不进一张卡时，要切分，例如 FSDP / FSDP2 或 DeepSpeed ZeRO。Accelerate 包的是启动差异。2026-11-23 打开的 [FSDP2 教程](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html) 仍返回 200。这里不写安装命令，也不把文档里的类名抄成新示例。

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

默认的 inductor 后端会生成并编译 C++ / Triton 代码，CPU 上需要可用的 `g++`。本页编写环境没有 C++ 编译器，这段代码改用 `backend="aot_eager"` 验证过输出 `True`；`aot_eager` 只做图捕获、不做代码生成，适合排查是不是编译器问题。更具体地说，图由 Dynamo 捕获，AOTAutograd 负责前向和反向，`aot_eager` 再用 eager 执行，它不是 inductor 的性能后端。2026-11-23 这次没有重跑，围栏仍是默认的 `torch.compile(model)`。

## JAX：函数式变换 {#jax}

JAX 用纯函数加变换：`grad` 求导、`jit` 编译、`vmap` 自动批处理。没有挂在模块上的隐式状态，参数要显式传入。2026-11-23 PyPI 当前版本是 **0.12.1**，`Requires-Python` 为 `>=3.12`，并且 `jax` 与 `jaxlib` 要成对。能安装 PyTorch 2.15.0 的 3.11 环境，不能据此安装当前 JAX。本次没有安装，不记录一对具体的 jaxlib 版本。

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

这段没有在本次运行，输出保持原文。

## Hugging Face Transformers：加载开源模型 {#hugging-face-transformers}

2026-11-23 PyPI 当前版本是 **5.24.0**，`Requires-Python` 为 `>=3.11.0`。[AI 总览](../) 的版本基线仍写 Transformers 5.22.1，本批不改那一页，也不再把 5.22.1 叫成当前最新。下面的 API 没有按 5.24.0 重跑，不迁移函数签名。示例会下载约 270 MB，输出是历史贪心结果。

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

## 可信的训练实验：可复现、掩码与检查点 {#_7}

- 随机种子只是起点。记下 Python、NumPy、框架的种子，以及数据划分、DataLoader worker、模型和依赖版本。换平台或换版本仍不保证逐位一致。确定性算法可能更慢。
- 序列批处理要分开 attention mask、因果 mask 和 loss mask。padding 不应计入目标损失。梯度累积是多个小批之后再 `step`。损失缩放要和有效 token 数一致，不能只数循环次数。
- 断点续训除了权重要保存优化器、学习率调度器、步数、随机状态和数据进度。只保存 `state_dict` 可以加载权重，不等于恢复训练。能加载权重，也不等于训练状态已经回来。
- 不加载来源不明的 pickle，也不随意打开仓库里的远程代码。`weights_only=True` 缩小反序列化时能执行的类型，不是沙箱，也不是来源可信的证明。发布者、哈希和许可证仍要核对，见 [安全与治理](../19-security-governance/)。

## 框架怎么选 {#framework-choice}

<span id="_8"></span>

| 框架 | 编程模型 | 优势 | 适合 |
|------|----------|------|------|
| PyTorch 2.15.0 | 命令式（eager）+ `torch.compile` | 生态最大，论文与开源模型默认实现 | 绝大多数训练、微调、推理 |
| JAX 0.12.1 | 函数式变换 `grad` / `jit` / `vmap` | TPU 友好、大规模并行表达清晰 | 研究、TPU 训练 |
| Keras 3.15.1 | 高层 API，可切换 JAX / PyTorch / TensorFlow 后端 | 上手快、代码短 | 教学、快速原型 |
| TensorFlow 2.21.0 | 图执行 + Keras | 存量部署（TF Serving、TFLite） | 维护已有系统 |
| Transformers 5.24.0 | 模型库与统一加载接口 | 覆盖主流开源 LLM | 加载、微调、评测开源模型 |

> [!WARNING]
> [AI 总览](../) 的版本基线仍写 PyTorch 2.15.0、Transformers 5.22.1（本批不改那一页）。总览没有列出 JAX、Accelerate、DeepSpeed、Keras 和 TensorFlow。2026-11-23 打开的 PyPI 当前是 Transformers **5.24.0**、JAX **0.12.1**、Accelerate **1.16.0**、DeepSpeed **0.20.0**、PyTorch **2.15.0**、Keras **3.15.1**、TensorFlow **2.21.0**。`torch` 的 `Requires-Python` 是 `>=3.11`；文件列表里能看到 `cp315` 标签，这不是本机安装。JAX 要求 `>=3.12`。DeepSpeed 这次读到的 `requires_python` 为空，不据此写 Python 范围。Keras 以 PyPI 的 3.15.1 为准；本次没有重开 GitHub Releases，不把 Latest 标签是否落后写成已核实。TensorFlow 的 wheel 标签见到 `cp310`–`cp313`，没有见到 `cp315`。一段时间没有新版本，不能推断已经停止维护。示例没有迁到 Transformers 5.24.0。

## 常见误读 {#_3}

<span id="_9"></span>

- 忘记 `optimizer.zero_grad()`，梯度会跨步累加。
- 评估时不切 `model.eval()`。Dropout 和 BatchNorm 仍按训练模式工作。
- 用 `torch.save(model)` 保存整个对象。换环境往往加载失败。应保存 `state_dict`，或用 safetensors。能加载权重，不等于优化器和步数也恢复了。
- 认为 bf16 一定比 fp32 准。它省显存和算力，尾数更少。
- 用 `generate` 的默认采样参数直接比较模型。温度和 `top_p` 不同，结果不可比。对比时固定 `do_sample=False` 或固定种子。
- `torch.compile` 的第一次调用等于稳态速度。`aot_eager` 也不是 inductor 的性能后端。

## 可选核对 {#framework-check}

<span id="_10"></span>

1. `model.eval()` 和 `torch.no_grad()` 各做什么？为什么推理时两者都要？
2. 70B 的参数、梯度和优化器状态放不进单卡时，为什么 DDP 不够，要切分？

<details markdown><summary>参考答案</summary>

1. `eval()` 切换 Dropout 和 BatchNorm 的行为。`no_grad()` 关闭计算图，省下显存和时间。前者影响结果，后者影响是否记录梯度。
2. DDP 每张卡仍保存完整副本。放不下时要切分参数、梯度和优化器状态，例如 FSDP 或 ZeRO。把 batch 调成 1 不减少这份副本。

</details>

<span id="_12"></span>

## 资料索引 {#_11}

- [PyTorch 文档](https://docs.pytorch.org/docs/stable/index.html) — 官方 API 与教程入口
- [Learn the Basics（PyTorch 教程）](https://docs.pytorch.org/tutorials/beginner/basics/intro.html) — 张量、数据、训练循环一条龙
- [Hugging Face Transformers 文档](https://huggingface.co/docs/transformers/index) — 加载、生成、Trainer
- [Getting started with FSDP2](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html) — 2026-11-23 仍可打开的切分教程
- [JAX 文档](https://docs.jax.dev/en/latest/) — 函数式变换与并行
- [Keras 3](https://keras.io/) — 多后端高层 API
- [PyTorch 可复现性](https://docs.pytorch.org/docs/stable/notes/randomness.html) — 随机源与跨环境限制
- [PyTorch 序列化语义](https://docs.pytorch.org/docs/stable/notes/serialization.html) — state_dict 与 weights_only 安全边界
- [PyTorch 性能调优](https://docs.pytorch.org/tutorials/recipes/recipes/tuning_guide.html) — 梯度累积、同步和推理模式
- [PyPI: torch](https://pypi.org/project/torch/) — 2026-11-23 读到的 2.15.0
- [PyPI: transformers](https://pypi.org/project/transformers/) — 同日读到的 5.24.0
- [PyPI: keras](https://pypi.org/project/keras/) — 同日读到的 3.15.1

---

← [上一节：数学与机器学习基础](../01-foundations/) · [返回 AI](../) · [下一节：Transformer 与大模型原理](../03-transformer-llm/) →
