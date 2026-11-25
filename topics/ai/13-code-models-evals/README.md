# 代码模型与评测 {#code-models-benchmarks}

> [AI](../) › 代码模型与评测

一个分数坏掉的方式不一样，下一步也不同。题饱和或泄漏就换基准。harness 和尝试次数不同就不能横比。测试过窄或过宽时，先看测试再看模型。只跑一次得到的是一次样本，不是 pass@k。

> 相关主题：[模型全景](../04-model-landscape/) · [编程智能体工作流](../12-coding-agents/) · [评测与可观测](../17-evals-observability/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

公开榜衡量的是某套 harness 下的采样结果。自家仓库要另抽已合并的 PR。执行模型写出的代码时，超时只挡住这一次等待，不构成沙箱。pass@k 估计的是 k 个样本里至少通过一个的概率，不是把第 k 次提交当成唯一答案。

## 能力从补全到长程任务 {#_4}

<span id="_2"></span>

通用旗舰模型是多数编程 Agent 的默认选择，见 [模型全景](../04-model-landscape/)。编程特化模型是另一条线。章内记下 Moonshot 的 Kimi-K2.7-Code 于 2026-06-12 开源，1T 总参数、32B 激活的 MoE，且只支持思考模式。Mistral 的 Leanstral 1.5 面向 Lean 4。这些是原记录，2026-11-25 没有重开模型页，不改称当前版本。

行内补全要低延迟，常用小模型做 FIM：按光标前后文填中间。能力从易到难是补全、单函数、仓库级修改、终端操作，然后是数小时、数千次工具调用的长程任务。长程任务的失败更多出在工具和预算，不只是下一个 token。验收方式见 [编程智能体工作流](../12-coding-agents/)。

## 基准各自挡住什么 {#_5}

- HumanEval / MBPP 是单函数题，已经饱和，只适合入门对照。用它比较前沿模型，分不出差距。
- LiveCodeBench 按时间收集新题，可以只评训练截止日期之后的题，用来降低「训练时见过答案」。它仍偏算法题。
- SWE-bench 用真实 Issue 和 PR 做仓库级修复，用隐藏测试判定。Verified 是人工筛过的 500 题。
- SWE-bench Pro 更难、章内记为污染更少。Scale 于 2026-09 发布 SWE-Bench Pro V2。这个月份是章内记录，2026-11-25 没有重开。
- Terminal-Bench 2.0 在终端里做任务，并有反作弊规则。环境本身就会影响分数。

分数还要看 harness、是否联网、尝试次数，以及是不是厂商在自家框架里自报。缺任何一项，两行排行榜不能横比。

## pass@k 不是第 k 次提交 {#passk}

pass@k：每题采 k 个答案，有一个通过就算这题通过。只采 k 个，估计方差大。Codex 论文的无偏估计是每题采 n ≥ k 个，其中 c 个通过：pass@k = 1 − C(n−c, k) / C(n, k)。

下面三行只是这个公式。不是一次仓库评测。

```python
from math import comb

def pass_at_k(n: int, c: int, k: int) -> float:
    """n 个样本中 c 个通过时 pass@k 的无偏估计"""
    if n - c < k:
        return 1.0
    return 1.0 - comb(n - c, k) / comb(n, k)

results = {"题 1": (10, 3), "题 2": (10, 0), "题 3": (10, 10)}
for k in (1, 5):
    score = sum(pass_at_k(n, c, k) for n, c in results.values()) / len(results)
    print(f"pass@{k} = {score:.3f}")
```

编写时的输出：

```text
pass@1 = 0.433
pass@5 = 0.639
```

同一公式的 Java 对照：

```java
class PassAtK {
    static long comb(int n, int k) {
        if (k < 0 || k > n) return 0;
        long v = 1;
        for (int i = 1; i <= k; i++) v = v * (n - k + i) / i;
        return v;
    }

    static double passAtK(int n, int c, int k) {
        if (n - c < k) return 1.0;
        return 1.0 - (double) comb(n - c, k) / comb(n, k);
    }

    public static void main(String[] args) {
        int[][] results = {{10, 3}, {10, 0}, {10, 10}};
        for (int k : new int[] {1, 5}) {
            double score = 0;
            for (int[] rc : results) score += passAtK(rc[0], rc[1], k);
            score /= results.length;
            System.out.printf("pass@%d = %.3f%n", k, score);
        }
    }
}
```

`n=10`、`c=3` 时 pass@1 = 1 − C(7,1)/C(10,1) = 0.3。那是单样本通过率，不是「第 1 次提交的那一份」。2026-11-25 用本机 Python 3.12.3 和 OpenJDK 21.0.13.0.3 重算了这两段，打印与输出块一致。输出块没有改写。这不是新的基准，也没有下载代码模型。

## 自建题与进程超时 {#_6}

公开基准代表不了你的仓库。从已合并的 PR 抽题：Issue 描述、修复前的代码、PR 里的测试。最接近 [编程智能体工作流](../12-coding-agents/) 里的 Verify。

候选代码不要在评测进程里直接 `exec`。下面的示例用独立进程和 2 秒超时：

```python
import subprocess, sys, tempfile, textwrap, pathlib

TESTS = textwrap.dedent("""
    assert slugify("Hello World") == "hello-world"
    assert slugify("  Spring  AI ") == "spring-ai"
""")

candidates = {
    "模型 A": "def slugify(s):\n    return '-'.join(s.lower().split())\n",
    "模型 B": "def slugify(s):\n    return s.lower().replace(' ', '-')\n",
    "模型 C": "def slugify(s):\n    while True:\n        pass\n",
}

def run(code: str, timeout: float = 2.0) -> str:
    with tempfile.TemporaryDirectory() as td:
        f = pathlib.Path(td, "t.py")
        f.write_text(code + TESTS)
        try:
            r = subprocess.run([sys.executable, str(f)], capture_output=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            return "超时"
        return "通过" if r.returncode == 0 else "失败"

for name, code in candidates.items():
    print(name, run(code))
```

编写时的输出：

```text
模型 A 通过
模型 B 失败
模型 C 超时
```

同一形状的 Java 会再调用 `javac` 和 `java`：

```java
class IsolatedChecks {
    public static void main(String[] args) throws Exception {
        // 在隔离进程里跑测试并设超时。不是 fork／exec 对照。
        String[] names = {"模型 A", "模型 B", "模型 C"};
        String[] bodies = {
            "class T { static String slugify(String s) { return String.join(\"-\", s.toLowerCase().trim().split(\"\\\\s+\")); } public static void main(String[] a) { if (!slugify(\"Hello World\").equals(\"hello-world\") || !slugify(\"  Spring  AI \").equals(\"spring-ai\")) System.exit(1); } }",
            "class T { static String slugify(String s) { return s.toLowerCase().replace(' ', '-'); } public static void main(String[] a) { if (!slugify(\"Hello World\").equals(\"hello-world\") || !slugify(\"  Spring  AI \").equals(\"spring-ai\")) System.exit(1); } }",
            "class T { public static void main(String[] a) { while (true) {} } }"
        };
        for (int i = 0; i < names.length; i++) {
            java.nio.file.Path dir = java.nio.file.Files.createTempDirectory("iso");
            java.nio.file.Path src = dir.resolve("T.java");
            java.nio.file.Files.writeString(src, bodies[i]);
            Process compile = new ProcessBuilder("javac", src.toString()).start();
            if (compile.waitFor() != 0) throw new AssertionError("javac");
            Process run = new ProcessBuilder("java", "-cp", dir.toString(), "T").start();
            boolean done = run.waitFor(2, java.util.concurrent.TimeUnit.SECONDS);
            String verdict;
            if (!done) {
                run.destroyForcibly();
                verdict = "超时";
            } else {
                verdict = run.exitValue() == 0 ? "通过" : "失败";
            }
            System.out.println(names[i] + " " + verdict);
        }
    }
}
```

2026-11-25 没有跑这两段隔离示例。Python 会启动子进程并等待一段死循环。Java 会再编译、再启动 `java`。本大纲和这次正文都没有把它们当成当天的安全验证。

## 超时不是沙箱 {#_7}

本页 `subprocess` 示例只限制等待时间并看退出码，不限制文件、网络、子进程或内核。超时返回之后，示例也没有写明进程组已被清掉。它只适合已经审过的教学代码。

模型生成或外部提交的代码要放进专门沙箱：限制 CPU、内存、进程数、输出大小和总时间，禁用网络，依赖和文件系统只读，去掉 secret，并清理整个进程组。Java 那段同样只是教学进程，不是沙箱。

## 比较时要写清的条件 {#_8}

一次通过率和重试后的成功率要分开报。写上采样次数、温度、模型与 harness 版本、可用的工具，以及 Token 和时间预算。pass@k 是采样成功概率的估计，不是把第 k 次提交当成唯一答案。

公开测试帮助开发。隐藏测试负责评分，并应包括边界、异常、性质或变形测试，以及安全回归。不能把隐藏答案或评测补丁漏给 Agent，也不能为了变绿去改测试。

比 Java 仓库任务时，同时看编译、JUnit、集成测试、静态检查和依赖扫描。只编译通过不等于需求或安全正确，见 [Java 测试](../../java/08-testing/) 和 [微服务测试](../../microservices/15-testing/)。

Leanstral 1.5 的章内记录来自当时的官方模型页：ID `labs-leanstral-1-5`，119B 总参数 / 6.5B 激活，256k 上下文 / 128k 输出，弃用日期 2026-09-29。弃用不等于已经关停。当时的页上没有单独的关停日期。2026-11-25 没有重开该页，这里不补一个关停日。

## 基准怎么读 {#code-eval-choice}

<span id="_9"></span>

| 基准 | 测什么 | 优点 | 局限 |
|------|--------|------|------|
| HumanEval / MBPP | 单函数生成 | 简单、便宜、可复现 | 已饱和，严重污染 |
| LiveCodeBench | 竞赛题，按时间滚动 | 可按截止日期之后的题评测 | 偏算法题，离工程有距离 |
| SWE-bench Verified | 真实仓库 Issue 修复 | 贴近工程 | OpenAI 审计发现测试缺陷与污染，已停止报告 |
| SWE-bench Pro / Pro V2 | 更难的仓库级任务 | 污染明显更少 | 分数依赖 harness 与 Agent 框架 |
| Terminal-Bench 2.0 | 终端中完成任务 | 覆盖命令行与运维操作 | 环境复杂，需关注反作弊规则 |
| 自建评测 | 自家代码库的真实任务 | 最贴近业务 | 需要投入构建与维护 |

> [!WARNING]
> OpenAI 于 2026-02-23 发文说明 SWE-bench Verified 已严重污染（其审计子集中至少 59.4% 的题目存在测试缺陷），并建议改报 SWE-bench Pro。读任何分数时都要看 harness、是否联网、尝试次数和是否为厂商自报。Leanstral 1.5 的弃用日期在章内记为 2026-09-29。2026-11-25 没有重开这些页，不补关停日期，也不把 59.4% 当成新的审计。

## 常见误读 {#_3}

<span id="_10"></span>

- 只看排行榜选模型：harness、联网和尝试次数不同，分数不能横比。
- 把厂商自报当成独立评测：常是自家框架和最高推理强度。
- 用 HumanEval 比前沿模型：题已饱和，也广泛泄漏。
- 忽略污染：公开仓库里的题和答案，模型可能在训练中见过。
- 把 pass@k 当成第 k 次那一份答案。
- 在评测进程里直接跑生成的代码，或把 2 秒超时当成沙箱。
- 给 Leanstral 1.5 补一个章内没有的关停日。

## 可选核对 {#code-eval-check}

<span id="_11"></span>

1. 每题采 10 个样本、其中 3 个通过时，pass@1 的无偏估计是多少？它和「第 1 次提交」有什么差别？
2. 两家自报的仓库分为什么不能直接比？本页的子进程示例挡住了什么，没有挡住什么？

<details markdown><summary>参考答案</summary>

1. 0.3。pass@1 = 1 − C(7,1)/C(10,1) = 0.3，是单样本通过的概率估计。不是把第一次交上去的那份代码当成唯一答案。围栏里的三行只重算这个公式。
2. 缺少 harness、是否联网、尝试次数和是不是自报时，分数不可比。测试过窄或过宽时，对的补丁也会失败。子进程示例只看超时和退出码。它不禁用网络、不移除 secret，也不说明进程组已清理。2026-11-25 没有跑这段隔离示例。

</details>

<span id="_13"></span>

## 资料索引 {#_12}

- [SWE-bench](https://www.swebench.com/) — 仓库级修复基准与排行榜；2026-11-25 未重开
- [Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) — 2026-02-23 的文章；59.4% 是该文数字
- [SWE-Bench Pro V2](https://labs.scale.com/blog/swe-bench-pro-v2) — 章内记为 2026-09；2026-11-25 未重开
- [Terminal-Bench](https://www.tbench.ai/) — 终端 Agent 基准；2026-11-25 未跑
- [LiveCodeBench](https://livecodebench.github.io/) — 持续更新的代码基准
- [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) — Codex 论文，pass@k 无偏估计出处
- [Python subprocess 安全注意](https://docs.python.org/3/library/subprocess.html#security-considerations) — 子进程不是完整隔离边界；2026-11-25 未重开
- [Inspect AI 沙箱](https://inspect.aisi.org.uk/sandboxing.html) — 评测执行的隔离环境；2026-11-25 未重开
- [Mistral Leanstral 1.5](https://docs.mistral.ai/models/leanstral-1-5) — 章内记录的规格与弃用日期；2026-11-25 未重开，不补关停日

---

← [上一节：编程智能体工作流](../12-coding-agents/) · [返回 AI](../) · [下一节：微调与对齐](../14-fine-tuning/) →
