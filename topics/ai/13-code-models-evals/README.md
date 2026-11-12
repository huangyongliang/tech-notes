# 代码模型与评测 {#code-models-benchmarks}

> [AI](../) › 代码模型与评测

编程能力从哪来、怎么衡量：代码专用模型与通用旗舰、FIM 补全、仓库级与终端任务，以及主流代码基准的优缺点和污染问题。目标是读懂发布会上的分数，并能在自己的仓库上做小规模评测。

> 相关主题：[模型全景](../04-model-landscape/) · [编程智能体工作流](../12-coding-agents/) · [评测与可观测](../17-evals-observability/)

## 本关定位

| 项 | 内容 |
|----|------|
| 定位 | 第四章深入：理解代码模型的能力维度与评测方法，避免被单一分数误导 |
| 前置要求 | [模型全景](../04-model-landscape/)、[编程智能体工作流](../12-coding-agents/)；会写单元测试 |
| 粗略用时 | 1 周（粗略参考） |
| 章节 | 第四章 深入 |

## 闯关任务

**QUEST 13 · 第四章 深入**

- [ ] 能够区分补全（FIM）、函数生成、仓库级修改、终端操作、长程任务这几种编程能力。
- [ ] 能够说出 HumanEval、LiveCodeBench、SWE-bench Verified / Pro、Terminal-Bench 各自测什么、有何局限。
- [ ] 能够解释 pass@k 的含义，并用无偏估计公式计算。
- [ ] 能够识别基准污染与 harness 差异对分数的影响。
- [ ] 能够从自家 PR 历史抽题，在隔离环境中搭一个小型评测。

**奖励**：+100 XP · 徽章「基准审判官」（徽章名暂定，内容建设中）

## 知识要点

### 模型与能力维度

- 通用旗舰模型（见 [模型全景](../04-model-landscape/)）是多数编程 Agent 的默认选择。
- 编程特化模型：如 Moonshot 的 Kimi-K2.7-Code（2026-06-12 开源，1T 总参数 / 32B 激活的 MoE，仅支持思考模式）；Mistral 的 Leanstral 1.5 面向 Lean 4 形式化证明。
- 小模型本地补全：IDE 的行内补全对延迟敏感，常用小参数模型做 FIM（Fill-in-the-Middle，根据光标前后文填中间）。
- 能力维度从易到难：补全 → 单函数生成 → 仓库级修改 → 终端操作 → 长程任务（数小时、数千次工具调用）。

### 主流基准

- HumanEval / MBPP：单函数题，已基本饱和，只适合做入门对比。
- LiveCodeBench：按时间滚动收集新题，可按模型训练截止日期之后的题目评测，以降低污染。
- SWE-bench：从真实 GitHub Issue 与 PR 构造仓库级修复任务，用隐藏测试判定；Verified 是人工筛选的 500 题子集。
- SWE-bench Pro：更难、污染更少；Scale 于 2026-09 发布 SWE-Bench Pro V2。
- Terminal-Bench 2.0：在终端环境中完成任务，衡量 Agent 的命令行操作能力，并出台了反作弊规则。

### pass@k

- pass@k：每题采样 k 个答案，只要有一个通过测试就算该题通过。
- 直接采 k 个估计方差大；Codex 论文给出无偏估计：每题采 n ≥ k 个，其中 c 个通过，pass@k = 1 − C(n−c, k) / C(n, k)。

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

运行输出：

```text
pass@1 = 0.433
pass@5 = 0.639
```

同一点的 Java 对照：

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


### 自建评测：在隔离进程中跑测试

- 公开基准无法代表你的代码库；从自家已合并的 PR 中抽题（Issue 描述 + 修复前代码 + PR 中的测试），最能反映真实效果。
- 候选代码必须在隔离环境中运行（独立进程、超时，生产中用容器或沙箱），不要在评测进程里直接 `exec`。

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

运行输出：

```text
模型 A 通过
模型 B 失败
模型 C 超时
```

同一点的 Java 对照：

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


### 进程隔离不是安全沙箱

本页 `subprocess` 示例只限制运行时间并收集输出，不限制文件、网络、子进程或内核访问；仅用于已审查的教学代码。运行模型生成 / 外部提交代码应使用专门沙箱或强隔离环境，配置 CPU、内存、进程数、输出大小和总时限；禁用网络、只读依赖与文件系统、移除 secret，并清理整个进程组。

### 可比较、不可投机的代码评测

- 区分一次通过率与重试后成功率，报告采样次数、温度、模型 / harness 版本、工具与总 Token / 时间预算；`pass@k` 是采样成功概率估计，不是把第 k 次提交当唯一答案。
- 公共测试帮助开发，隐藏测试负责评估；包括边界、异常、性质 / 变形测试及安全回归。不能把隐藏答案或评测补丁泄漏给 Agent，也不允许修改测试来「通过」。
- 比较 Java 仓库任务时同时跑编译、JUnit、集成测试、静态检查和依赖扫描；仅编译通过不等于需求或安全正确，衔接 [Java 测试](../../java/08-testing/) 与 [微服务测试](../../microservices/15-testing/)。
- Leanstral 1.5 官方模型页列出 ID `labs-leanstral-1-5`、119B 总参数 / 6.5B 激活、256k 上下文 / 128k 输出，并明确标为弃用，弃用日期 2026-09-29。弃用不等于已关停；具体关停日期待核实：已检查官方模型页，未见独立 shutdown 日期。

## 选型对比

| 基准 | 测什么 | 优点 | 局限 |
|------|--------|------|------|
| HumanEval / MBPP | 单函数生成 | 简单、便宜、可复现 | 已饱和，严重污染 |
| LiveCodeBench | 竞赛题，按时间滚动 | 可按截止日期之后的题评测 | 偏算法题，离工程有距离 |
| SWE-bench Verified | 真实仓库 Issue 修复 | 贴近工程 | OpenAI 审计发现测试缺陷与污染，已停止报告 |
| SWE-bench Pro / Pro V2 | 更难的仓库级任务 | 污染明显更少 | 分数依赖 harness 与 Agent 框架 |
| Terminal-Bench 2.0 | 终端中完成任务 | 覆盖命令行与运维操作 | 环境复杂，需关注反作弊规则 |
| 自建评测 | 自家代码库的真实任务 | 最贴近业务 | 需要投入构建与维护 |

> [!WARNING]
> OpenAI 于 2026-02-23 发文说明 SWE-bench Verified 已严重污染（其审计子集中至少 59.4% 的题目存在测试缺陷），并建议改报 SWE-bench Pro。读任何分数时都要看 harness、是否联网、尝试次数和是否为厂商自报。Leanstral 1.5 已由官方明确弃用，日期为 2026-09-29；弃用与关停的区别见下文。

## 常见误区

- 只看排行榜分数选模型：不同厂商用不同 harness、不同尝试次数，分数不可直接比较。
- 把厂商自报的分数当成独立评测：自报分数常在自家 Agent 框架、最高推理强度下取得。
- 用 HumanEval 比较前沿模型：题目已饱和、广泛泄漏，区分不出差距。
- 忽略污染：基准题与答案来自公开仓库，模型可能在训练中见过「标准答案」。
- 在评测进程中直接执行模型生成的代码：死循环、删文件、联网都可能发生，必须隔离并设超时。
- 只评测一次：采样有随机性，要多次运行并报告 pass@k 或置信区间。

## 实践任务

- 用 `pass_at_k` 函数计算：n = 20、c = 4 时 pass@1 与 pass@10 分别是多少，并解释差异。
- 从你的项目中挑 5 个已合并的小 PR，整理成「Issue 描述 + 修复前提交 + PR 测试」的评测题。
- 用两个编程 Agent 在 worktree 中分别解这 5 道题，每题跑 3 次，统计通过率和耗时。
- 阅读 OpenAI 关于 SWE-bench Verified 的分析，总结「测试过窄」和「测试过宽」各举一例。

## 资料索引

- [SWE-bench](https://www.swebench.com/) — 仓库级修复基准与排行榜
- [Why we no longer evaluate SWE-bench Verified](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/) — OpenAI 污染与测试缺陷分析
- [SWE-Bench Pro V2](https://labs.scale.com/blog/swe-bench-pro-v2) — Scale 新版基准说明
- [Terminal-Bench](https://www.tbench.ai/) — 终端 Agent 基准
- [LiveCodeBench](https://livecodebench.github.io/) — 持续更新的代码基准
- [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374) — Codex 论文，pass@k 无偏估计出处
- [Python subprocess 安全注意](https://docs.python.org/3/library/subprocess.html#security-considerations) — 子进程不是完整隔离边界
- [Inspect AI 沙箱](https://inspect.aisi.org.uk/sandboxing.html) — 评测工具执行的隔离环境
- [Mistral Leanstral 1.5](https://docs.mistral.ai/models/leanstral-1-5) — 模型规格、弃用状态与日期

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】FIM（Fill-in-the-Middle）主要用于：
    - A. 仓库级修复
    - B. 根据光标前后文补全中间代码
    - C. 生成测试数据
    - D. 终端操作
2. 【单选】LiveCodeBench 降低污染的主要方法是：
    - A. 题目加密
    - B. 按时间滚动收集新题，只评测模型训练截止日期之后的题
    - C. 只用私有仓库
    - D. 人工打分
3. 【单选】每题采 10 个样本，其中 3 个通过，pass@1 的无偏估计是：
    - A. 0.1
    - B. 0.3
    - C. 0.7
    - D. 1.0
4. 【简答】为什么 OpenAI 停止报告 SWE-bench Verified？
5. 【简答】自建代码评测时，如何安全地执行模型生成的代码？

<details markdown><summary>参考答案</summary>

1. B — FIM 用光标前后文预测中间片段，是 IDE 行内补全的基础。
2. B — 按发布时间筛题，可避开模型训练时可能见过的题目。
3. B — pass@1 = 1 − C(7,1)/C(10,1) = 1 − 7/10 = 0.3，即单样本通过率。
4. 两个原因：一是测试缺陷，审计子集中大量题目的测试过窄（强制特定实现）或过宽（测试题面未要求的功能），正确解也会失败；二是污染，前沿模型能复现标准补丁，分数更多反映训练时的暴露程度而非真实能力。OpenAI 建议改报 SWE-bench Pro。
5. 在独立进程或容器 / 沙箱中运行，设置超时与资源限制，禁用网络，使用只读或临时文件系统，不在评测主进程中 `exec`，并记录每次运行的输出便于复查。

</details>

---

← [上一节：编程智能体工作流](../12-coding-agents/) · [返回 AI](../) · [下一节：微调与对齐](../14-fine-tuning/) →
