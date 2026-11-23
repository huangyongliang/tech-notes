# Python 速成 {#python-python-bridge}

> [AI](../) › Python 速成

已经会 C 和 Java，用最短时间补齐 AI 阶段要用的 Python：动态类型、内置结构、venv / pip、NumPy 入门。后续示例都假设你能读懂这些写法。

> 相关主题：[学习路线](../../roadmap/) · [Java 技术栈](../../java/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

这一页只解决「能读、能改后续章节里的 Python」。它不教完整的语言课，也不替代 Java 服务。

- 名字绑定、内置结构、异常和类型注解，够看懂后面的训练脚本。
- 虚拟环境和锁文件，避免把依赖装进系统解释器。
- NumPy 的形状、广播和视图，是张量和矩阵乘法的前置。
- 一次只读的 HTTP 示例，说明 SDK 底下仍是请求和 JSON。

## 名字绑定的是对象，不是箱子 {#_2}

Python 里变量是指向对象的名字，不是一块预先定好类型的内存。`b = a` 再改可变对象，两个名字看到的是同一份数据；给 `b` 重新赋值，只是让 `b` 指向新对象。

`==` 比较值，`is` 比较身份。小整数和短字符串可能被复用，所以不要用 `is` 判断相等。`is` 主要用于 `None`。

函数参数传的也是对象引用。函数里修改 `list` 或 `dict` 会影响调用方；`items = []` 这种重新绑定不会。

## 从 C / Java 到 Python {#c-java-python}

| 概念 | C | Java | Python |
|------|---|------|--------|
| 类型 | 静态，编译期确定 | 静态，编译期检查 | 动态，变量只是名字，值才有类型 |
| 代码块 | `{}` | `{}` | 缩进（4 个空格） |
| 整数 | 定长，会溢出 | 定长，会溢出 | `int` 任意精度，不按固定位宽溢出；`float` 会溢出成 `inf`，NumPy 定宽整数会溢出或环绕 |
| 字符串 | `char[]` + `'\0'` | 不可变 `String` | 不可变 `str`（Unicode） |
| 内存 | `malloc` / `free` | `new` + GC | 自动管理。引用计数加循环 GC 是 CPython 的实现，不是语言保证 |
| 入口 | `main()` | `public static void main` | 模块顶层代码，惯用 `if __name__ == "__main__":` |
| 构建 | `gcc` + `make` | `javac` + Maven | 解释执行，`pip` 装依赖 |
| 错误 | 返回码 / 未定义行为 | 受检与非受检异常 | 只有非受检异常，`try` / `except` |

- 函数、类、模块都可以赋给变量、当作参数。这是「一切皆对象」在代码里的含义。
- 默认发行的 CPython 启用 GIL。它限制同一进程里多条线程同时执行 Python 字节码，所以 CPU 密集工作不会因为多开线程而并行。等待 I/O 时线程可以让出，多进程是另一条路。另有 free-threaded 构建可以关闭 GIL，那不是默认发行，本页不把它写成当前稳定默认。
- 字典键必须可哈希。`list` 不能当键，`tuple` 只有在元素都可哈希时才能当键。

## 内置数据结构与推导式 {#_4}

| 结构 | 可变 | 有序 | 典型用途 | Java 近似 |
|------|------|------|----------|-----------|
| `list` | 是 | 是 | 动态数组 | `ArrayList` |
| `tuple` | 否 | 是 | 一组有序值、多返回值、可哈希时作字典键 | 没有字段名，不是 Java `record` |
| `dict` | 是 | 插入顺序 | 键值映射、JSON 对象 | `LinkedHashMap` |
| `set` | 是 | 否 | 去重、成员判断 | `HashSet` |

下面把单词频率用 Python 写一遍。C 里要自己管哈希表和动态数组。

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

同一点的 Java 对照。`LinkedHashMap` 的打印格式和 Python 字典不同，下面只对照算法，不把 Java 的标准输出写进上面的文本围栏。

```java
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

class WordFreq {
    record WordStat(String word, int count) {}

    static List<WordStat> topWords(String text, int n) {
        Matcher m = Pattern.compile("[a-z']+").matcher(text.toLowerCase());
        Map<String, Integer> counter = new LinkedHashMap<>();
        while (m.find()) {
            counter.merge(m.group(), 1, Integer::sum);
        }
        List<WordStat> stats = new ArrayList<>();
        counter.forEach((w, c) -> stats.add(new WordStat(w, c)));
        stats.sort((a, b) -> Integer.compare(b.count, a.count));
        return stats.subList(0, Math.min(n, stats.size()));
    }

    public static void main(String[] args) {
        String text = "the cat sat on the mat. The cat is fat.";
        for (WordStat stat : topWords(text, 3)) {
            System.out.printf("%-5s%d%n", stat.word, stat.count);
        }
        Map<Integer, Integer> squares = new LinkedHashMap<>();
        for (int x = 0; x < 5; x++) if (x % 2 == 0) squares.put(x, x * x);
        System.out.println(squares);
        System.out.println(new TreeSet<>(List.of("b", "a", "c")) + " "
                + topWords(text, 2).stream().map(WordStat::word).toList());
    }
}
```

## 函数、类、异常与类型注解 {#_5}

- 默认参数只求值一次。不要写 `def f(items=[])`，用 `None` 再在函数里新建。
- `*args` / `**kwargs` 收集可变参数。后面的模型调用大量使用关键字参数。
- `@dataclass` 生成带字段的类。它不是 Java `record` 的逐项等价：不可变要显式 `frozen=True`，校验和序列化仍要另做。
- `with open(...) as f:` 保证离开代码块时关闭文件，对应 Java 的 try-with-resources。
- 类型注解给 IDE 和类型检查器看。CPython 运行这段代码时不按注解拒绝参数。

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

同一点的 Java 对照：

```java
class Amounts {
    static double parseAmount(String raw) {
        try {
            return Double.parseDouble(raw);
        } catch (NumberFormatException e) {
            NumberFormatException wrapped = new NumberFormatException("金额格式错误：'" + raw + "'");
            wrapped.initCause(e);
            throw wrapped;
        }
    }

    public static void main(String[] args) {
        // Python 的类型注解运行时不检查。Java 的类型是编译期检查。
        String csv = "date,item,amount\n2026-11-01,coffee,3.5\n2026-11-02,book,12\n";
        String[] lines = csv.split("\n");
        int rows = 0;
        double total = 0;
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].isEmpty()) continue;
            rows++;
            total += parseAmount(lines[i].split(",")[2]);
        }
        System.out.printf("{\"rows\": %d, \"total\": %s}%n", rows, total == 15.5 ? "15.5" : Double.toString(total));
        try {
            parseAmount("12元");
        } catch (NumberFormatException e) {
            System.out.println(e.getMessage());
        }
    }
}
```

## 环境：venv、pip 与 Jupyter {#venvpip-jupyter}

```bash
python3 -m venv .venv          # 每个项目一个虚拟环境
source .venv/bin/activate      # Windows 用 .venv\Scripts\activate
python -m pip install numpy jupyterlab requests
python -m pip freeze > requirements.txt   # 锁定版本，提交到仓库
jupyter lab                    # 浏览器里打开 Notebook
```

这次核对时，`python3 -m venv` 因缺少 `ensurepip` 没有建成虚拟环境。随后用 `python3 -m pip install --target /tmp/ai-site numpy==2.3.5`，并以 `PYTHONPATH=/tmp/ai-site` 在 CPython 3.12.3 上隔离运行。上面的 venv 配方没有被这次运行验证。

本次实际运行范围：Python 的词频、金额解析、NumPy、HTTP 读取、Softmax、梯度拟合和迷你 BPE；Java 的 `WordFreq`、`Amounts`、`RepoLookup`、`SoftmaxDemo`、`GradientFit`、`TinyBpe` 的 `main`、`CausalAttention`。JDK 是 Temurin `25.0.5.1+2`，`javac --release 25`。清单之外的围栏本次没有运行。

- 用 `python -m pip`，让包装进当前解释器，而不是系统 Python。
- `.venv/` 放进 `.gitignore`。仓库里放 `requirements.txt` 或带锁文件的 `pyproject.toml`。
- [uv](https://docs.astral.sh/uv/) 可以建环境和锁依赖。它快，不因此成为所有项目的唯一选择。`uv sync --locked` 拒绝过期锁文件；`--frozen` 不检查新鲜度，也不等于把依赖升到最新。
- 2026-11-23 打开的 [python.org 下载页](https://www.python.org/downloads/) 把 **3.15.2** 标为当前稳定版，[3.15.2 发布页](https://www.python.org/downloads/release/python-3152/) 写的日期是 2026-10-25。同一下载页把 3.16 标为 pre-release，计划日期 2027-10-06。
- 同日 PyPI 上 `torch` 的当前版本是 **2.15.0**，不是 PyTorch 3.15。`Requires-Python` 为 `>=3.11`，这只说明声明的解释器下界，不是 wheel 清单。这次读到的文件列表里，`python_version` 含 `cp311`、`cp312`、`cp313`、`cp314`、`cp315`，文件名里带 `cp315` 的有 8 个。那是索引标签，不是本机安装，也不是一份已经逐文件安装过的矩阵。AI 总览的版本基线本批不改，那里仍写着 PyTorch 2.15.0 和 Transformers 5.22.1。

## NumPy 入门 {#numpy}

`ndarray` 是连续内存上的定长同类型数组。运算在编译好的循环里完成。先想整块数组怎么算，再考虑 Python 循环。

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

- `axis=0` 沿行方向压缩，得到每一列的结果。`axis=1` 沿列方向压缩，得到每一行的结果。
- 广播从最后一维对齐。维度相等，或其中一个是 1，才能广播。
- 切片通常是视图。改视图会改原数组。要独立副本时用 `.copy()`。

## 调用 HTTP API {#http-api}

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

上面这段在 2026-11-23 用 CPython 3.12.3 又请求了一次，标准输出仍是 `numpy/numpy Python`。公开接口的字段以后仍可能变，所以这段输出是当次读取，不是 CI 保证。

同一点的 Java 对照。同日用 Temurin `25.0.5.1+2`、`javac --release 25` 编译运行，标准输出同样是 `numpy/numpy Python`。手写的字段截取只适用于这次响应的形状，不是通用 JSON 解析器。

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

class RepoLookup {
    public static void main(String[] args) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.github.com/repos/numpy/numpy"))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/vnd.github+json")
                .header("User-Agent", "tech-notes-demo")
                .GET()
                .build();
        String body = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString())
                .body();
        String name = field(body, "full_name");
        String language = field(body, "language");
        System.out.println(name + " " + language);
    }

    static String field(String json, String key) {
        String mark = "\"" + key + "\":";
        int i = json.indexOf(mark);
        if (i < 0) throw new IllegalStateException(key);
        int start = json.indexOf('"', i + mark.length());
        int end = json.indexOf('"', start + 1);
        return json.substring(start + 1, end);
    }
}
```

实际项目里更常用 `requests` 或 `httpx`。各家模型 SDK 底下也是 HTTP 加 JSON。

## 从脚本走向服务：异步、取消与依赖锁定 {#_6}

- `async def` 返回协程，要 `await` 或交给任务调度。事件循环里不要直接调用阻塞的 HTTP、文件或 CPU 密集计算。阻塞 I/O 可以考虑 `asyncio.to_thread`；CPU 密集工作另看进程或加速器。
- `asyncio.TaskGroup` 管同一生命周期的一组任务。组里有任务失败时，其余任务会被取消。`asyncio.timeout` 给整段操作一个截止时间；需要限流时，另用信号量限制同时访问模型的数量。取消语义见 [API 编程](../06-llm-api-programming/)。
- 在 `finally` 里关闭连接。捕获 `CancelledError` 之后通常要再抛出。取消本地协程不等于远端已经停止计费。
- `pyproject.toml` 声明直接依赖。锁文件固定解析结果。CI 用 `--locked` 拒绝过期锁；`--frozen` 只是不重新解析。

## 与 Java / 微服务阶段接轨 {#java}

保留 [Java 并发](../../java/05-concurrency/) 里超时、取消和关闭资源的思路，不要把线程池 API 原样放进事件循环。数据清洗和评测可以先用 Python。线上入口仍可以由 [Spring](../../java/09-spring/) 提供，Python 模型服务通过 [服务通信](../../microservices/04-communication/) 接入。不要为了学 AI 重写已有订单、鉴权与支付服务。

## 工具怎么选 {#py-tool-choice}

<span id="_7"></span>

| 工具 | 定位 | 优点 | 适合场景 |
|------|------|------|----------|
| venv + pip | 标准库自带的虚拟环境与官方包管理器 | 无需额外安装，教程通用 | 入门、简单脚本 |
| uv | Rust 编写的包与项目管理器 | 速度快，可管理解释器版本与锁文件 | 新项目、需要锁文件的 CI |
| conda / Miniforge | 跨语言的包与环境管理器 | 能装 CUDA、MKL 等非 Python 依赖 | 需要特定二进制库时 |
| Jupyter Notebook | 交互式笔记本 | 边写边看结果 | 探索数据；要长期维护的代码仍写成 `.py` |

## 常见误读 {#_3}

<span id="_8"></span>

- 用下标循环硬套 C 的写法。能直接迭代对象时，不必先取下标。
- 在 NumPy 数组上写 Python 循环。能整块算的运算，循环只是在解释器里重复进出。
- 可变默认参数在多次调用之间共享同一个列表。
- 类型注解会在运行时拒绝错误参数。CPython 不按注解检查，要另跑 mypy 或 pyright。
- 不建虚拟环境，把包装进系统解释器。
- 用 `is` 比较字符串和数字的值。值比较用 `==`，`is` 留给 `None`。
- 「Python 不能并发。」默认发行是 GIL-enabled CPython，限制的是同一进程里多线程同时执行字节码，因此 CPU 密集工作不会靠多线程并行变快。等待 I/O 和多进程是另一条路。free-threaded 构建关闭 GIL，不是当前默认发行。
- 「数字都不溢出。」只有 `int` 是任意精度。`float` 会变成非有限值，NumPy 定宽整数会溢出或环绕。
- 「`tuple` 就是 Java `record`。」它是按位置存放的不可变序列，元素都可哈希时才能当字典键。它没有具名字段和访问器合同。
- 一次 `del` 或某次基准，等于语言承诺了回收时刻。引用计数和循环 GC 是 CPython 的实现。
- 「`--frozen` 会把依赖升到最新。」它不重新解析，也不检查锁是否过期。

## 可选核对 {#py-bridge-check}

<span id="_9"></span>

不答也不影响后面章节。最多两问，答案只复述上面已经写过的内容。

1. `a = [1, 2]; b = a; b.append(3)` 之后 `a` 是什么？为什么？
2. 为什么 `def add(item, items=[])` 不能写？类型注解会不会在运行时挡住错误的实参？

<details markdown><summary>参考答案</summary>

1. `a` 变成 `[1, 2, 3]`。`b = a` 没有复制列表，两个名字指向同一个对象，`append` 改的是那一个对象。
2. 默认值在函数定义时求值一次，以后的调用共享这个列表。改成 `items=None`，在函数体内再建新列表。类型注解不会让 CPython 在运行时拒绝错误的实参。

</details>

<span id="_11"></span>

## 资料索引 {#_10}

- [Python 官方教程（中文）](https://docs.python.org/zh-cn/3/tutorial/) — 有其他语言基础时的官方教程
- [CS50P](https://cs50.harvard.edu/python/) — 哈佛的 Python 入门课，有 C 基础可以快速刷过前几周
- [Python 3.15.2 发布说明](https://www.python.org/downloads/release/python-3152/) — 2026-10-25 的维护版
- [Python 下载页](https://www.python.org/downloads/) — 2026-11-23 核对的稳定版与 3.16 pre-release 计划
- [Free-threaded Python](https://docs.python.org/3/howto/free-threading-python.html) — 关闭 GIL 的构建，不是默认发行
- [NumPy: the absolute basics for beginners](https://numpy.org/doc/stable/user/absolute_beginners.html) — 数组入门
- [venv 官方文档](https://docs.python.org/3/library/venv.html) — 虚拟环境
- [JupyterLab 文档](https://jupyterlab.readthedocs.io/en/stable/) — Notebook 环境的安装与使用
- [Python asyncio 任务](https://docs.python.org/3/library/asyncio-task.html) — 任务组、超时和取消
- [Python 数据模型](https://docs.python.org/3/reference/datamodel.html) — 对象、引用和回收边界
- [uv 锁定与同步](https://docs.astral.sh/uv/concepts/projects/sync/) — `--locked` 与 `--frozen`
- [Python Packaging 项目元数据](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/) — pyproject.toml 的职责
- [PyPI: torch](https://pypi.org/project/torch/) — 2026-11-23 的当前版本与 wheel 标签

---

[返回 AI](../) · [下一节：数学与机器学习基础](../01-foundations/) →
