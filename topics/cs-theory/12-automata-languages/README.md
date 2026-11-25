# 自动机与形式语言 {#automata-and-formal-languages}

> [计算机理论](../) › 自动机与形式语言

有限状态机只能记住有限种摘要，却足以识别许多格式；泵引理帮助证明有些格式超出了这个模型。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

DFA 是否接受，看的是读完整个输入之后的状态。空串不发生转移，留在初态。NFA 只要存在一条把输入读完并停在接受状态的分支。直接把 NFA 的接受状态翻过来，得不到补语言：原来的拒绝是所有分支都不接受，翻过来之后变成存在一条本来不接受的分支。泵引理的证明必须盖住每一种合法分解，只把自己挑的一段 y 泵坏并不够。三个状态的尾缀检查器只说明「末尾是 10」这一种语言。工程里的正则可以有反向引用，不等于理论正则。资料索引中的 Java SE 25 Pattern 链接本次没有重开，不称为当天核对过的当前文档。不写状态最小化，也不写词法分析器。

## 原创谜题：流式标记检查器 {#_2}

输入是一串 0、1，只接受最后两个字符恰为 `10` 的串。输入可能很长，但不能把整串存起来。只记「末尾和目标前缀重合了多少」够不够？这就是用有限状态概括历史信息的例子。

## 知识要点 {#_3}

### 字符串、语言与 DFA {#dfa}

字母表 Σ 是有限符号集；Σ* 是全部有限字符串的集合，包括长度 0 的空串 ε。语言是 Σ* 的子集，不必是自然语言，也不必有限。空语言 `∅` 与只含空串的语言 `{ε}` 不同。

确定有限自动机 DFA 可写成五元组 `(Q,Σ,δ,q₀,F)`：Q 是有限状态集，δ 为每个「状态、输入符号」指定唯一下一状态，q₀ 是初态，F 是接受状态集合。标准定义要求转移是全函数；不允许的符号或缺失转移，可按模型加入拒绝汇点。

从初态逐个读取输入，全部读完后状态属于 F 才接受；中途经过接受状态不等于提前接受剩余任意输入。对空串不做转移，因此它被接受当且仅当初态属于 F。对长度做归纳，可以证明「当前状态记录的摘要」在每一步都正确。

### NFA 与正则表达式 {#nfa}

NFA 允许某个状态在同一符号下有多个后继，也可有不消耗输入的 ε 转移。接受语义是**存在**一条分支完整读完输入并停在接受状态，而不是所有分支都成功，也不是随机挑一条。

子集构造把「NFA 此刻所有可能状态的集合」当成 DFA 一个状态；含 ε 转移时还要取 ε 闭包。若 NFA 有 q 个状态，构造至多有 2^q 个状态，其中很多可能不可达。这说明 NFA 不比 DFA 多识别语言，只是表示可能更紧凑。

理论正则表达式由符号、空语言、空串，通过并、连接、Kleene 星号构造；星号表示重复零次或更多次。Kleene 定理说 DFA、NFA 与这种正则表达式恰好描述同一类**正则语言**；本关引用其完整结果，不逐一证明所有转换。

正则语言对并、交、补、连接与星号封闭。交可用状态对乘积构造；补则在转移完整的 DFA 上交换接受与非接受状态，并固定字母表。只对一个任意 NFA 直接翻转接受状态，通常不会得到补语言。

### 泵引理的量词不能省略 {#_4}

有限状态数迫使足够长的接受运行重复状态：中间那一段输入可重复任意次。精确地说，若 L 正则，则存在整数 p≥1，使每个满足 `s∈L`、`|s|≥p` 的串，都**存在**分解 `s=xyz`，满足：

- `|xy|≤p`。
- `|y|≥1`。
- 对每个整数 i≥0，都有 `xyⁱz∈L`。

用它证明非正则时：先让对方给任意 p，再选一个足够长的合法串；必须对**每一种允许的分解**，都能找出某个泵次数 i 使结果不在语言。不能自己挑一个坏分解，就宣布语言非正则。

泵引理是正则的必要条件，不是判定正则性的充要条件；通过若干泵测试也不能证明正则。

## 小例题与 C 验证 {#c}

### 例一：三个状态足够 {#_5}

设状态 0 表示末尾既不是 `1` 也不是 `10`，状态 1 表示末尾为 `1`，状态 2 表示末尾为 `10`。状态 2 接受；这三个摘要互斥且覆盖全部二进制串。

| 当前状态 | 读入 0 | 读入 1 |
|----------|--------|--------|
| 0 | 0 | 1 |
| 1 | 2 | 1 |
| 2 | 0 | 1 |

例如 `110`：0→1→1→2，接受；`100`：0→1→2→0，拒绝。相应理论正则表达式可写为 `(0|1)*10`，没有必要记住整个前缀。

下面完整程序只接受空字符结尾的 C 字符串，遇到非二进制字符直接拒绝；调用者须提供合法非空指针和可读取的字符串。保存为 `dfa.c`，用 `gcc -std=c17 -Wall -Wextra -Werror dfa.c -o dfa` 编译。

```c
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>

static bool ends_with_10(const char *text) {
    static const unsigned next[3][2] = {{0, 1}, {2, 1}, {0, 1}};
    unsigned state = 0;
    for (const char *p = text; *p != '\0'; ++p) {
        if (*p != '0' && *p != '1') {
            return false;
        }
        unsigned bit = (unsigned)(*p - '0');
        state = next[state][bit];
    }
    return state == 2;
}

int main(void) {
    assert(!ends_with_10(""));
    assert(!ends_with_10("1"));
    assert(ends_with_10("10"));
    assert(ends_with_10("110"));
    assert(!ends_with_10("100"));
    assert(ends_with_10("1010"));
    assert(!ends_with_10("102"));
    puts("dfa checks passed");
    return 0;
}
```

同一点的 Java 对照：

```java
class EndsWith10 {
    static boolean endsWith10(String text) {
        int[][] next = {{0, 1}, {2, 1}, {0, 1}};
        int state = 0;
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (ch != '0' && ch != '1') {
                return false;
            }
            state = next[state][ch - '0'];
        }
        return state == 2;
    }

    public static void main(String[] args) {
        if (endsWith10("")) throw new AssertionError();
        if (endsWith10("1")) throw new AssertionError();
        if (!endsWith10("10")) throw new AssertionError();
        if (!endsWith10("110")) throw new AssertionError();
        if (endsWith10("100")) throw new AssertionError();
        if (!endsWith10("1010")) throw new AssertionError();
        if (endsWith10("102")) throw new AssertionError();
        System.out.println("dfa checks passed");
    }
}
```

2026-11-25 用 gcc 13.3.0 与 OpenJDK 21.0.13.0.3 离线编译运行了这两段，都打印 `dfa checks passed`。围栏未改。这只说明这个三状态检查器通过了围栏里写下的那些串，不是所有正则语言的实现。

### 例二：固定比例的分块标记不正则 {#_6}

令 `L={UⁿV²ⁿ : n≥0}`，U、V 是两个不同符号。假设 L 正则，取泵长度 p，选择 `s=UᵖV²ᵖ`。任意合法分解 s=xyz 都有 `|xy|≤p`，故非空 y 只包含 U。取 i=0 后，U 数减少而 V 数不变，不再满足 V 数恰为 U 数的 2 倍，所以不在 L，矛盾。这个论证覆盖所有允许分解，而不依赖我们挑中哪一段。

它仍然可判定：使用无界计数器的普通算法可以数 U 和 V、检查顺序再比较二者的倍数关系。**非正则不等于不可计算**，只是有限状态模型不够。

## 和 C、Java 的衔接 {#cjava}

C 的逐字符扫描与 Java 的状态对象都可实现有限状态机，但引入无界容器或计数器后，整体模型不再只是固定状态数的 DFA。实际正则引擎可能带反向引用等扩展，不能把所有引擎功能都当成理论正则语言；性能还取决于实现策略。语言语法入门回 [C 核心概念](../../programming-basics/02-core-concepts/)，模型边界接 [可计算性](../13-computability/)。

## 可选核对 {#language-check}

<span id="_7"></span>

<span id="_8"></span>

1. 一个 NFA 有一条分支把输入读完并接受，另一条分支拒绝。整体接不接受？为什么不能把「存在」换成「所有」？
2. 有人选 `UᵖV²ᵖ`，只把第一个 U 当作 y 泵坏，就宣布非正则的证明已经完成。缺了什么？

<details markdown><summary>参考答案</summary>

1. 接受。NFA 只要求存在一条成功分支。机器拒绝，才是所有分支都不接受。两个说法的量词不同。
2. 对方可以换一种分解。只破坏自己挑的一种 y，否定不了「存在一种分解能一直泵」。本页的论证是：任何 `|xy|≤p` 且 y 非空的分解，y 都只含 U，取 i=0 都会破坏二倍关系。

</details>

## 资料索引 {#_9}

- [MIT Theory of Computation 讲义](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/lecture-notes/) — Sipser 课程第 1–3 讲：DFA、NFA、正则转换与泵引理；免费讲义对应教材《Introduction to the Theory of Computation》第 1 章。
- [MIT Lecture 3：Regular Pumping Lemma](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/resources/mit18_404f20_lec3-1/) — 泵引理的正式陈述和证明；本页流式尾缀识别器及代码为原创。
- [Java SE 25 Pattern 文档](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/regex/Pattern.html) — 官方列出反向引用等实际引擎特性，用于区分工程正则与理论正则。
- [Start Doing Graph Theory：目录](https://vertex.degree/contents.html) — 本专题借鉴其问题驱动方式；自动机与正则语言不属于该书正文覆盖范围。

← [上一节：最短路与算法证明](../11-shortest-path-proofs/) · [返回 计算机理论](../) · [下一节：可计算性与停机问题](../13-computability/) →
