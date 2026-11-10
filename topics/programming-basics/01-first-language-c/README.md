# 第一门语言 C 与环境 {#c-first-language-c}

> [编程入门](../) › 第一门语言 C 与环境

为什么选 C；安装 gcc / clang、编辑器；预处理→编译→汇编→链接；用 `-std=c23` 指定语言标准（需要 GCC 14、Clang 18 及以上；更早的版本写 `-std=c2x`）。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 2 编程入门 · 第 1 关（第一章「C 语言」） |
| 前置要求 | [零基础入门](../../getting-started/)；会在终端中切换目录、运行命令（[Linux 与 Shell](../../cs-basics/03-linux-shell/) 可同步学习） |
| 建议用时 | 1 周 |
| 后续衔接 | [核心概念](../02-core-concepts/) 开始系统学习类型、控制流和函数 |

这一关只做三件事：想清楚为什么第一门语言选 C，把编译环境装好，弄懂一行 `gcc hello.c` 背后发生了什么。环境搭好、能独立编译运行程序并看懂报错，后面的学习才不会被工具卡住。

## 闯关任务

- [ ] 能够说出选择 C 作为第一门语言的理由，以及它和 Java、Python 的主要区别。
- [ ] 能够在自己的系统上安装 GCC 或 Clang，并用 `--version` 确认版本。
- [ ] 能够用编辑器写出 Hello World，并在终端里编译、运行。
- [ ] 能够描述预处理、编译、汇编、链接四个阶段各自的输入和输出，并分步执行。
- [ ] 能够根据编译器版本选择 `-std=c23` 或 `-std=c2x`，并始终开启 `-Wall -Wextra`。
- [ ] 能够读懂编译器报错中的文件名、行号、列号和错误描述，定位并修复简单错误。

## 知识要点

### 为什么第一门语言选 C

- **离机器近**：C 的变量、数组、指针几乎直接对应内存和地址，学 C 的过程就是在验证 [计算机组成](../../cs-basics/01-computer-organization/) 和 [操作系统](../../cs-basics/02-operating-systems/) 里的概念。
- **小而稳定**：语言核心很小，关键字只有几十个；几十年来写法变化不大，教材和资料丰富。
- **基础设施的语言**：Linux 内核、Git、SQLite、Python 解释器（CPython）、很多数据库和嵌入式程序都用 C 写成。
- **为后续语言打底**：Java 的语法大量借鉴 C 系语言；理解了 C 的指针和手动内存管理，就能真正明白 Java 的引用和垃圾回收替你做了什么。
- **代价**：C 不检查数组越界，不自动回收内存，错误往往在运行时才暴露，甚至表现为「看起来正常」。所以本阶段会同时学习编译警告、AddressSanitizer 等工具（见 [工具、调试与测试](../04-tools-debugging/)）。

| 对比项 | C | Java | Python |
|--------|---|------|--------|
| 运行方式 | 编译成机器码直接运行 | 编译成字节码，由 JVM 运行 | 解释器运行 |
| 内存管理 | 手动 `malloc` / `free` | 垃圾回收 | 垃圾回收 |
| 类型 | 静态类型 | 静态类型 | 动态类型 |
| 越界访问 | 不检查，未定义行为 | 抛出异常 | 抛出异常 |

### C 的标准版本

C 由 ISO 标准化，常说的版本有 C89 / C90、C99、C11、C17 和最新的 **C23**（正式标准号 ISO/IEC 9899:2024）。本路线统一用 C23。

| 编译器 | 推荐写法 | 说明 |
|--------|----------|------|
| GCC 14、Clang 18 及以上 | `-std=c23` | 直接使用新名字 |
| 更早的 GCC / Clang | `-std=c2x` | C23 定稿前的临时名字，支持的特性随版本增加 |
| GCC 15 及以上 | 不写也可 | 默认语言标准已改为 `gnu23`（C23 加 GNU 扩展） |

不加 `-std` 时 GCC 14 默认是 `gnu17`。为了让代码可移植、行为确定，建议总是显式写出 `-std=`。

> [!NOTE]
> 程序可以通过宏 `__STDC_VERSION__` 查看当前采用的标准：C17 是 `201710L`，C23 定稿值是 `202311L`。GCC 14 在 `-std=c23` 下给出的是过渡值 `202000L`，属于正常现象。

### 安装编译器与编辑器

| 系统 | 安装方式 | 验证 |
|------|----------|------|
| Linux（Debian / Ubuntu） | `sudo apt install build-essential` | `gcc --version` |
| macOS | `xcode-select --install` 安装命令行工具 | `clang --version` |
| Windows | 推荐先安装 WSL，再在其中按 Linux 方式安装 | `gcc --version` |

- 发行版自带的 GCC 版本可能低于 14，此时用 `-std=c2x` 即可完成本阶段的全部练习；需要完整 C23 时再升级。
- macOS 上输入 `gcc` 实际调用的是苹果的 Clang，`gcc --version` 的输出里能看到这一点。
- 编辑器推荐 [VS Code](https://code.visualstudio.com/docs/languages/cpp) 加微软的 C/C++ 扩展；也可以用 Vim、CLion 等。编辑器只是写代码的地方，编译和运行仍建议在终端中完成，弄清每一步在做什么。

### 第一个程序

```c
#include <stdio.h>

int main(void) {
    printf("Hello, C!\n");
    return 0;
}
```

- `#include <stdio.h>`：引入标准输入输出库的声明，`printf` 就声明在里面。
- `int main(void)`：程序入口，`void` 表示不接收参数；返回值 `0` 表示运行成功，会成为进程的退出码。
- `\n` 是换行符；语句以分号结尾；花括号包围函数体。

保存为 `hello.c`，在同一目录的终端里执行：

```bash
gcc -std=c23 -Wall -Wextra hello.c -o hello   # 旧版编译器把 c23 换成 c2x
./hello
echo $?                                        # 查看退出码，应为 0
```

`-o hello` 指定输出文件名；不写时默认生成 `a.out`。

### 从源代码到可执行文件

```mermaid
flowchart LR
  A[hello.c] -- 预处理 --> B[hello.i]
  B -- 编译 --> C[hello.s]
  C -- 汇编 --> D[hello.o]
  D -- 链接 --> E[hello]
```

| 阶段 | 命令 | 做了什么 |
|------|------|----------|
| 预处理 | `gcc -E hello.c -o hello.i` | 展开 `#include` 和宏、删除注释；`hello.i` 有几百行，因为 `stdio.h` 的内容被整个贴了进来 |
| 编译 | `gcc -S hello.i -o hello.s` | 把 C 翻译成汇编代码 |
| 汇编 | `gcc -c hello.s -o hello.o` | 把汇编翻译成机器码，得到目标文件，但 `printf` 的地址还空着 |
| 链接 | `gcc hello.o -o hello` | 把目标文件和 C 标准库组合起来，填上 `printf` 等函数的地址 |

平时一条 `gcc hello.c -o hello` 会自动完成全部四步。分步执行一遍很有价值：以后看到「`undefined reference to` 某函数」就知道是**链接**阶段找不到定义，而「`expected ';'`」是**编译**阶段的语法错误。打开 `hello.s` 还可能发现编译器把 `printf` 换成了更简单的 `puts`，这是允许的优化。

### 编译选项与读懂报错

建议从第一天起就用这组选项，把警告当作错误对待：

```bash
gcc -std=c23 -Wall -Wextra -pedantic -g hello.c -o hello
```

- `-Wall -Wextra`：开启常用和额外的警告，很多 bug 在编译时就能被指出。
- `-pedantic`：对不符合所选标准的写法给出警告。
- `-g`：加入调试信息，供 gdb 使用。
- 想强制自己清零警告，可以再加 `-Werror`，把警告视为错误。

下面这段代码有两个问题（第 4 行缺分号，变量 `unused` 定义了却没用），保存为 `hello.c` 后用 GCC 14 编译的真实输出如下：

```c
#include <stdio.h>

int main(void) {
    int unused = 42
    printf("Hello\n");
    return 0;
}
```

```text
hello.c: In function ‘main’:
hello.c:5:5: error: expected ‘,’ or ‘;’ before ‘printf’
    5 |     printf("Hello\n");
      |     ^~~~~~
hello.c:4:9: warning: unused variable ‘unused’ [-Wunused-variable]
    4 |     int unused = 42
      |         ^~~~~~
```

读报错的方法：`hello.c:5:5` 是「文件:行:列」；`error` 必须修复，`warning` 也应修复；**先看第一条**，后面的错误常常是第一条引起的连锁反应；缺分号这类错误往往报在**下一行**，因为编译器读到 `printf` 才发现上一句没结束。同样的代码交给 Clang，会直接指向第 4 行末尾并提示 `expected ';' at end of declaration`，不同编译器的措辞不同，但定位思路一样。看不懂的英文报错可以参考 [技术英语](../../getting-started/05-tech-english/) 中的拆解方法。

## 常见误区

- **「能编译通过就是对的」**：C 中大量错误（越界、未初始化、内存泄漏）编译器不报错，要靠警告、测试和 AddressSanitizer 一起把关。
- **忽略警告**：警告往往就是 bug 的提示，养成零警告的习惯。
- **把 `void main()` 当标准写法**：标准规定的入口是 `int main(void)` 或 `int main(int argc, char *argv[])`。
- **照抄古老教程**：K&R 第 2 版讲的是 C89，一些写法（如 `gets`，已在 C11 中被删除）已经不安全或不再存在；查资料时注意标准版本。
- **只用 IDE 的运行按钮**：不知道背后执行了什么命令，环境一出问题就无从下手。

## 实践任务

1. 安装编译器，记录 `gcc --version`（或 `clang --version`）的输出，确定你应该用 `-std=c23` 还是 `-std=c2x`。
2. 编写并运行 Hello World，把 `return 0;` 改成 `return 3;`，用 `echo $?` 观察退出码变化。
3. 用 `-E`、`-S`、`-c` 分步编译 `hello.c`，用 `wc -l` 查看 `hello.i` 有多少行，打开 `hello.s` 找到字符串 `"Hello, C!"`。
4. 写一个程序输出 `__STDC_VERSION__` 的值，分别用 `-std=c17` 和 `-std=c23`（或 `c2x`）编译，比较结果。
5. 故意制造 3 种错误：缺分号、拼错 `printf`、删掉 `#include <stdio.h>`，记录每种错误的报错信息并分别解释。

## 资料索引

- [CS50x Week 1: C](https://cs50.harvard.edu/x/weeks/1/) — 哈佛 CS50 用 C 讲编程入门的第一周，含视频、讲义和自动评测的习题（英文）
- [GCC 手册：Overall Options](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html) — `-E`、`-S`、`-c`、`-o` 等控制编译阶段的选项（英文）
- [GCC 手册：C Dialect Options](https://gcc.gnu.org/onlinedocs/gcc/C-Dialect-Options.html) — `-std=` 可选的全部 C 标准及默认值（英文）
- [Clang C 语言特性支持状态](https://clang.llvm.org/c_status.html) — Clang 各版本对 C23 等标准特性的支持表（英文）
- [Modern C](https://gustedt.gitlabpages.inria.fr/modern-c/) — 法国 INRIA 研究员 Jens Gustedt 著，面向现代 C 标准的教材，作者提供免费电子版（英文）
- [Beej's Guide to C Programming](https://beej.us/guide/bgc/) — 轻松易读的免费 C 教程，适合配合本阶段通读（英文）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】你的 GCC 版本是 12，想使用 C23 特性，应写：
    - A. `-std=c23`
    - B. `-std=c2x`
    - C. `-std=c17`
    - D. 不需要任何选项
2. 【单选】`gcc -c main.c` 的产物是：
    - A. 预处理后的 `main.i`
    - B. 汇编代码 `main.s`
    - C. 目标文件 `main.o`
    - D. 可执行文件 `a.out`
3. 【单选】报错 `undefined reference to 'sqrt'` 发生在哪个阶段？
    - A. 预处理
    - B. 编译
    - C. 汇编
    - D. 链接
4. 【简答】`hello.c:12:3: error: ...` 中的 `12` 和 `3` 分别表示什么？为什么建议先处理第一条报错？
5. 【简答】说出两条选 C 作为第一门语言的理由，以及一个需要特别注意的代价。

<details markdown><summary>参考答案</summary>

1. B — `-std=c23` 这个名字从 GCC 14 起才可用，更早版本用 `-std=c2x`。
2. C — `-c` 完成预处理、编译、汇编，停在链接之前。
3. D — 代码能编译，但链接时找不到函数的定义；`sqrt` 在数学库里，需要加 `-lm`。
4. 12 是行号，3 是列号。后面的报错常由第一条错误连锁引起，修好第一条后很多后续报错会自动消失。
5. 理由要点：离硬件近，能直观理解内存和地址；语言小而稳定；大量基础软件用 C 写成；为 Java 等语言打基础。代价：不检查越界、手动管理内存，错误常在运行时才暴露，需要借助警告和检测工具。

</details>

---

[返回 编程入门](../) · [下一节：核心概念](../02-core-concepts/) →
