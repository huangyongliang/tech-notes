# Python 速成 {#python-python-bridge}

> [AI](../) › Python 速成

已经会 C 和 Java，用最短时间补齐 AI 阶段要用的 Python：动态类型、内置结构、venv / pip、NumPy 入门。

> 相关主题：[学习路线](../../roadmap/) · [Java 技术栈](../../java/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | AI 主题的预备关：把 C / Java 经验迁移到 Python，能读懂并改写后续各关的示例代码 |
| 前置要求 | 阶段 2（C）、阶段 3（Java） |
| 粗略用时 | 1–2 周（粗略参考，按每周 10–15 小时） |
| 章节 | 预备关（不计入四章） |

## 闯关任务

**QUEST 00 · 预备关**

- [ ] 能够对照 C / Java 说出 Python 的主要差异：动态类型、缩进代码块、一切皆对象、自动内存管理及 CPython 引用计数 / 循环 GC 的实现特点。
- [ ] 能够熟练使用 `list`、`dict`、`set`、`tuple`、推导式、函数、类和异常，写出符合 Python 习惯的代码。
- [ ] 能够用 `venv` 创建虚拟环境、用 `pip` 安装并锁定依赖，在 Jupyter 里运行和调试代码。
- [ ] 能够用 NumPy 做向量化数组运算，读写 JSON / CSV 文件，调用一个 HTTP API。
- [ ] 能够为函数写类型注解，并说出类型注解在运行时不做检查。

**奖励**：+100 XP · 徽章「蟒蛇驯养员」（徽章名暂定，内容建设中）

## 知识要点

### 从 C / Java 到 Python

| 概念 | C | Java | Python |
|------|---|------|--------|
| 类型 | 静态，编译期确定 | 静态，编译期检查 | 动态，变量只是名字，值才有类型 |
| 代码块 | `{}` | `{}` | 缩进（4 个空格） |
| 整数 | 定长，会溢出 | 定长，会溢出 | 任意精度，不溢出 |
| 字符串 | `char[]` + `'\0'` | 不可变 `String` | 不可变 `str`（Unicode） |
| 内存 | `malloc` / `free` | `new` + GC | 自动管理；CPython 使用引用计数 + 循环 GC |
| 入口 | `main()` | `public static void main` | 模块顶层代码，惯用 `if __name__ == "__main__":` |
| 构建 | `gcc` + `make` | `javac` + Maven | 解释执行，`pip` 装依赖 |
| 错误 | 返回码 / 未定义行为 | 受检与非受检异常 | 只有非受检异常，`try` / `except` |

- 一切皆对象：函数、类、模块都可以赋值给变量、作为参数传递。
- 传参是「传对象引用」：在函数里修改可变对象（`list`、`dict`）会影响调用方，重新赋值不会。
- `==` 比较值（相当于 Java 的 `equals`），`is` 比较身份（相当于 Java 对引用的 `==`）。

### 内置数据结构与推导式

| 结构 | 可变 | 有序 | 典型用途 | Java 近似 |
|------|------|------|----------|-----------|
| `list` | 是 | 是 | 动态数组 | `ArrayList` |
| `tuple` | 否 | 是 | 固定记录、多返回值、字典键 | `record` |
| `dict` | 是 | 插入顺序 | 键值映射、JSON 对象 | `LinkedHashMap` |
| `set` | 是 | 否 | 去重、成员判断 | `HashSet` |

下面这段把阶段 2 的「单词频率统计」用 Python 写了一遍，C 里要自己写哈希表和动态数组，这里十几行：

```python
import re
from collections import Counter
from dataclasses import dataclass


@dataclass(frozen=True)
class WordStat:
    word: str
    count: int


def top_words(text: str, n: int = 3) -> list[WordStat]:
    words = re.findall(r"[a-z']+", text.lower())
    counter = Counter(words)
    return [WordStat(w, c) for w, c in counter.most_common(n)]


text = "the cat sat on the mat. The cat is fat."
for stat in top_words(text):
    print(f"{stat.word:<5}{stat.count}")

squares = {x: x * x for x in range(5) if x % 2 == 0}  # 字典推导式
print(squares)
print(sorted({"b", "a", "c"}), [s.word for s in top_words(text, 2)])
```

运行输出：

```text
the  3
cat  2
sat  1
{0: 0, 2: 4, 4: 16}
['a', 'b', 'c'] ['the', 'cat']
```

### 函数、类、异常与类型注解

- 默认参数只求值一次：不要写 `def f(items=[])`，用 `None` 再在函数里新建。
- `*args` / `**kwargs` 收集可变参数，LLM SDK 大量使用关键字参数（`model=...`、`messages=...`）。
- `@dataclass` 相当于 Java 的 `record`；Pydantic 模型在 06、07 关用于结构化输出。
- 用上下文管理器 `with open(...) as f:` 代替手动关闭，相当于 Java 的 try-with-resources。
- 类型注解（`list[str]`、`int | None`）只给 IDE 和 mypy 看，运行时不检查。

```python
import csv
import io
import json


def parse_amount(raw: str) -> float:
    try:
        return float(raw)
    except ValueError as e:
        raise ValueError(f"金额格式错误：{raw!r}") from e


csv_text = "date,item,amount\n2026-11-01,coffee,3.5\n2026-11-02,book,12\n"
rows = list(csv.DictReader(io.StringIO(csv_text)))
total = sum(parse_amount(r["amount"]) for r in rows)
print(json.dumps({"rows": len(rows), "total": total}, ensure_ascii=False))

try:
    parse_amount("12元")
except ValueError as e:
    print(e)
```

运行输出：

```text
{"rows": 2, "total": 15.5}
金额格式错误：'12元'
```

### 环境：venv、pip 与 Jupyter

```bash
python3 -m venv .venv          # 每个项目一个虚拟环境
source .venv/bin/activate      # Windows 用 .venv\Scripts\activate
python -m pip install numpy jupyterlab requests
python -m pip freeze > requirements.txt   # 锁定版本，提交到仓库
jupyter lab                    # 浏览器里打开 Notebook
```

- 永远用 `python -m pip`，确保装进当前解释器；不要往系统 Python 里 `sudo pip install`。
- `.venv/` 加进 `.gitignore`，仓库里只放 `requirements.txt` 或 `pyproject.toml`。
- 新项目也可以用 [uv](https://docs.astral.sh/uv/)：`uv venv`、`uv pip install`，速度更快，命令与 pip 对应。
- 版本：python.org 当前最新稳定版是 3.15.2（2026-10-25）；PyTorch 2.15.0 提供 3.11–3.15 的 wheel，建议用 3.13 或更新版本。

### NumPy 入门

NumPy 的 `ndarray` 是连续内存上的定长同类型数组，和 C 数组一样紧凑，运算在 C 层循环完成。写 AI 代码时先想「整块数组怎么算」，而不是写 Python `for` 循环。

```python
import numpy as np

a = np.array([[1, 2, 3], [4, 5, 6]], dtype=np.float32)   # 形状 (2, 3)
b = np.arange(6, dtype=np.float32).reshape(3, 2)          # 形状 (3, 2)

c = a @ b                     # 矩阵乘法，形状 (2, 2)
row_mean = a.mean(axis=1)     # 按行求均值
normalized = a - a.mean(axis=0, keepdims=True)  # 广播：每列减去列均值

print(c)
print(row_mean, a.shape, c.shape)
print(normalized)
```

运行输出：

```text
[[16. 22.]
 [34. 49.]]
[2. 5.] (2, 3) (2, 2)
[[-1.5 -1.5 -1.5]
 [ 1.5  1.5  1.5]]
```

- `axis=0` 沿行方向压缩（得到每列的结果），`axis=1` 沿列方向压缩（得到每行的结果）。
- 广播规则：从最后一维开始对齐，维度相等或其中一个为 1 才能广播。
- 切片返回视图而不是副本，修改视图会改原数组；需要副本时用 `.copy()`。

### 调用 HTTP API

```python
import json
import urllib.request

req = urllib.request.Request(
    "https://api.github.com/repos/numpy/numpy",
    headers={"Accept": "application/vnd.github+json", "User-Agent": "tech-notes-demo"},
)
with urllib.request.urlopen(req, timeout=10) as resp:
    repo = json.load(resp)
print(repo["full_name"], repo["language"])
```

运行输出：

```text
numpy/numpy Python
```

实际项目里更常用 `requests` 或 `httpx`；06 关的各家 LLM SDK 底层也是这样的 HTTP + JSON 调用。

### 从脚本走向服务：异步、取消与依赖锁定

- `async def` 返回协程，必须 `await` 或交给任务调度；不要在事件循环里调用阻塞的 `requests`、文件处理或 CPU 密集计算。I/O 可用异步客户端，确需阻塞调用时考虑 `asyncio.to_thread`；CPU 密集任务另评估进程或 GPU。
- `asyncio.TaskGroup` 管理同一生命周期的并发任务；某任务异常时取消同组剩余任务。用 `asyncio.timeout` 给整个操作设截止时间，用信号量限制同时访问模型的数量，而不是为每条输入无限创建任务。
- 在 `try/finally` 中关闭连接和流；捕获 `CancelledError` 后通常应重新抛出。取消本地协程不代表远端任务已取消或费用已撤销，API 语义见 [API 编程](../06-llm-api-programming/)。
- `pyproject.toml` 声明项目元数据和直接依赖；锁文件固定解析结果。使用 uv 时，CI 的 `uv sync --locked` 会拒绝过期锁文件；`--frozen` 只是不检查新鲜度，不等于更新依赖。
- 不把 CPython 的对象回收时机、GIL 或某次基准表现当成 Python 语言保证；跨线程共享状态仍应明确同步，文件资源使用上下文管理器。

### 与 Java / 微服务阶段接轨

保留 [Java 并发](../../java/05-concurrency/) 的超时、取消和资源管理思路，但不要把线程池 API 原样套进事件循环。先用 Python 完成数据清洗 / 评测脚本；线上入口仍可由 [Spring](../../java/09-spring/) 提供，Python 模型服务通过 [服务通信](../../microservices/04-communication/) 接入。不要为了学 AI 重写已有订单、鉴权与支付服务。

## 选型对比

| 工具 | 定位 | 优点 | 适合场景 |
|------|------|------|----------|
| venv + pip | 标准库自带的虚拟环境与官方包管理器 | 无需额外安装，所有教程通用 | 入门、简单脚本 |
| uv | Rust 编写的包与项目管理器 | 速度快，兼容 pip 命令，可管理 Python 版本与锁文件 | 新项目首选 |
| conda / Miniforge | 跨语言的包与环境管理器 | 能装 CUDA、MKL 等非 Python 依赖 | 科学计算、需要特定二进制库 |
| Jupyter Notebook | 交互式笔记本 | 边写边看结果，适合探索数据与模型 | 实验、教学；正式代码仍写成 .py |

## 常见误区

- 把 Python 当 C 写：用下标 `for i in range(len(xs))` 遍历，应该直接 `for x in xs` 或 `enumerate(xs)`。
- 在 NumPy 数组上写 Python 循环，速度慢几十到上百倍；能向量化就向量化。
- 可变默认参数 `def f(x=[])` 在多次调用间共享同一个列表。
- 以为类型注解会像 Java 一样报错；注解写错了程序照样运行，要靠 mypy / pyright 检查。
- 不建虚拟环境直接装包，导致不同项目依赖冲突，或把系统 Python 搞坏。
- 混淆 `is` 与 `==`：比较字符串和数字的值一律用 `==`，`is` 只用于 `None`。

## 实践任务

- 把阶段 2 的一个 C 小项目（`wc` / `grep` 克隆、CSV 记账本或单词频率统计）用 Python 重写，记录代码行数、内存管理方式和错误处理的差异。
- 新建项目目录，用 `venv` 建环境，装 `numpy`、`jupyterlab`，导出 `requirements.txt` 并提交到自己的 GitHub 仓库。
- 在 Jupyter 中用 NumPy 生成一个 `1000 × 64` 的随机矩阵，完成矩阵乘法、按行求均值、按列标准化，并和纯 Python 双重循环的耗时做对比。
- 调用一个公开 HTTP API（例如 GitHub REST API），把结果写成 JSON 和 CSV 两种文件。

## 资料索引

- [Python 官方教程（中文）](https://docs.python.org/zh-cn/3/tutorial/) — 官方教程，适合有其他语言基础的读者
- [CS50P](https://cs50.harvard.edu/python/) — 哈佛的 Python 入门课，有 C 基础可以快速刷过前几周
- [NumPy: the absolute basics for beginners](https://numpy.org/doc/stable/user/absolute_beginners.html) — NumPy 官方入门文档
- [venv 官方文档](https://docs.python.org/3/library/venv.html) — 虚拟环境的创建与原理
- [JupyterLab 文档](https://jupyterlab.readthedocs.io/en/stable/) — Notebook 环境的安装与使用
- [Python asyncio 任务](https://docs.python.org/3/library/asyncio-task.html) — 结构化并发、超时、取消和线程委托
- [Python 数据模型](https://docs.python.org/3/reference/datamodel.html) — 实现细节与资源回收边界
- [uv 锁定与同步](https://docs.astral.sh/uv/concepts/projects/sync/) — 锁文件与 CI 的 locked / frozen 行为
- [Python Packaging 项目元数据](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/) — pyproject.toml 的职责

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】下面代码运行后 `a` 的值是：`a = [1, 2]; b = a; b.append(3)`
    - A. `[1, 2]`
    - B. `[1, 2, 3]`
    - C. 报错，列表不能共享
    - D. `[3]`
2. 【单选】对形状为 `(2, 3)` 的 NumPy 数组 `x`，`x.mean(axis=1)` 的形状是：
    - A. `(3,)`
    - B. `(2, 3)`
    - C. `(2,)`
    - D. `()`
3. 【简答】为什么不要写 `def add(item, items=[])`？应该怎么改？
4. 【简答】为什么每个项目都要用虚拟环境？`requirements.txt` 解决什么问题？
5. 【单选】关于 `def f(x: int) -> int`，正确的说法是：
    - A. 传入字符串会在运行时抛 `TypeError`
    - B. 注解只是元数据，运行时不检查，需要 mypy 等工具静态检查
    - C. 注解会让函数编译成机器码
    - D. 注解等同于 Java 的泛型擦除

<details markdown><summary>参考答案</summary>

1. B — `b = a` 只是让两个名字指向同一个列表对象，通过 `b` 修改等于修改 `a`。
2. C — `axis=1` 沿列方向压缩，每行得到一个均值，共 2 个。
3. 默认值只在函数定义时求值一次，多次调用会共享同一个列表；改成 `items=None`，在函数体里 `if items is None: items = []`。
4. 不同项目需要的依赖版本可能冲突，虚拟环境让每个项目有独立的包目录；`requirements.txt` 记录确切版本，别人或 CI 可以复现同样的环境。
5. B — Python 不在运行时检查注解。

</details>

---

[返回 AI](../) · [下一节：数学与机器学习基础](../01-foundations/) →
