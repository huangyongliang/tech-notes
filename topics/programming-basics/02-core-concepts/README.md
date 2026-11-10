# 核心概念 {#core-concepts}

> [编程入门](../) › 核心概念

类型与 sizeof、运算与类型转换、控制流、函数与作用域、存储期、指针入门、头文件与多文件程序。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 2 编程入门 · 第 2 关（第一章「C 语言」） |
| 前置要求 | [第一门语言 C 与环境](../01-first-language-c/)：能编译运行程序、读懂报错 |
| 建议用时 | 2–3 周 |
| 后续衔接 | [内存与数据](../03-memory-and-data/) 在本关的指针入门基础上深入数组、字符串和动态内存 |

这一关覆盖写任何程序都离不开的基础：数据有什么类型、表达式怎样求值、程序怎样分支和循环、怎样把代码拆成函数和多个文件。重点放在 C 特有、最容易踩坑的地方：整数除法、隐式类型转换、未初始化变量和指针。

## 闯关任务

- [ ] 能够说出 C 的基本类型，用 `sizeof` 查看大小，并按需选用 `<stdint.h>` 中的定宽整数。
- [ ] 能够预测含整数除法、取余、隐式类型转换的表达式结果，并在需要时写显式转换。
- [ ] 能够用 `if`、`switch`、`for`、`while` 写出正确的分支和循环，包括 `break`、`continue`。
- [ ] 能够定义和调用函数，解释值传递、作用域，以及自动存储期和静态存储期的区别。
- [ ] 能够用指针让函数修改调用者的变量，解释 `&` 和 `*` 的含义。
- [ ] 能够把程序拆成 `.h` 和 `.c` 多个文件，用头文件保护并正确编译链接。

## 知识要点

### 类型与 sizeof

| 类型 | 常见大小（64 位 Linux / macOS） | 用途 |
|------|--------------------------------|------|
| `char` | 1 字节（标准规定 `sizeof(char)` 恒为 1） | 字符、字节 |
| `int` | 4 字节 | 一般整数 |
| `long` | 8 字节（64 位 Windows 上是 4 字节） | 较大整数 |
| `long long` | 8 字节 | 至少 64 位的整数 |
| `float` / `double` | 4 / 8 字节 | 浮点数，默认用 `double` |
| `bool` | 1 字节 | 真假值，C23 起 `bool`、`true`、`false` 是关键字 |
| `size_t` | 8 字节 | 无符号，表示大小和下标，`sizeof` 的结果类型 |

标准只规定了最小范围，具体大小取决于平台。需要确定位数时用 `<stdint.h>` 的 `int32_t`、`uint8_t`、`int64_t` 等。

```c
#include <stdint.h>
#include <stdio.h>

int main(void) {
    printf("char=%zu int=%zu long=%zu double=%zu pointer=%zu\n",
           sizeof(char), sizeof(int), sizeof(long), sizeof(double), sizeof(void *));

    int32_t score = 95;
    bool passed = score >= 60;                // C23：无需包含 stdbool.h
    constexpr int max_score = 100;            // C23：编译期常量
    unsigned flags = 0b1010;                  // C23：二进制字面量
    long population = 1'400'000'000;          // C23：数字分隔符
    typeof(score) bonus = 5;                  // C23：typeof

    printf("%d/%d passed=%d flags=%u pop=%ld bonus=%d\n",
           (int)score, max_score, passed, flags, population, (int)bonus);
    return 0;
}
```

`printf` 的格式符要和类型匹配：`int` 用 `%d`，`unsigned` 用 `%u`，`long` 用 `%ld`，`size_t` 用 `%zu`，`double` 用 `%f`；写错是未定义行为，`-Wall` 会给出警告。

### 运算与类型转换

- **整数除法向零截断**：`7 / 2` 是 `3`，`-7 / 2` 是 `-3`；`%` 取余的符号跟被除数一致，`-7 % 2` 是 `-1`。想得到小数，至少让一个操作数是浮点：`7 / 2.0` 或 `(double)7 / 2`。
- **隐式转换**：运算时较小的整数类型会先提升为 `int`；`int` 和 `double` 运算时 `int` 转为 `double`。
- **有符号和无符号混用**：比较 `-1 < 1u` 时 `-1` 被转换成很大的无符号数，结果为假。`-Wextra` 会对这种比较发出警告。
- **赋值截断**：把 `double` 赋给 `int` 会丢掉小数部分；把大整数赋给小类型会丢掉高位。
- **优先级**：拿不准就加括号。常见陷阱：`a & mask == 0` 实际是 `a & (mask == 0)`。
- `a++` 和 `++a` 单独成句时等价；不要在同一表达式中对同一变量修改两次（如 `i = i++`），那是未定义行为。

### 控制流

```c
#include <stdio.h>

int main(void) {
    for (int i = 1; i <= 15; i++) {
        if (i % 15 == 0) {
            puts("FizzBuzz");
        } else if (i % 3 == 0) {
            puts("Fizz");
        } else if (i % 5 == 0) {
            puts("Buzz");
        } else {
            printf("%d\n", i);
        }
    }

    int day = 6;
    switch (day) {
    case 6:
    case 7:
        puts("周末");
        break;                                 // 没有 break 会继续执行下一个 case
    default:
        puts("工作日");
        break;
    }
    return 0;
}
```

- C 中 `0` 为假、非 `0` 为真；`if (x = 0)` 是赋值而不是比较，`-Wall` 会警告，比较请写 `==`。
- `while` 先判断后执行，`do … while` 至少执行一次；`break` 跳出当前循环或 `switch`，`continue` 进入下一轮循环。
- 即使只有一条语句，也建议总是写花括号，避免以后加语句时出错。

### 函数、作用域与存储期

```c
#include <stdio.h>

static int counter(void) {
    static int calls = 0;      // 静态存储期：只初始化一次，函数返回后仍保留
    calls++;
    return calls;
}

static void try_change(int x) {
    x = 100;                   // 只改了副本
    printf("函数内 x = %d\n", x);
}

int main(void) {
    int n = 1;
    try_change(n);
    printf("n = %d\n", n);     // 仍是 1：C 的参数按值传递
    counter();
    counter();
    printf("calls = %d\n", counter());   // 3
    return 0;
}
```

- **值传递**：调用函数时，实参的值被复制给形参，函数里改形参不影响调用者。
- **作用域**：在花括号内声明的变量只在该块中可见；在所有函数之外声明的是**全局变量**，整个文件可见。尽量少用全局变量。
- **存储期**：普通局部变量是**自动存储期**，进入块时创建、离开时销毁，而且**不会自动初始化**，读取未初始化的局部变量是未定义行为；全局变量和 `static` 局部变量是**静态存储期**，程序运行期间一直存在，默认初始化为 0。
- 函数前的 `static` 含义不同：表示该函数只在本文件内可见（内部链接）。
- 函数要先声明再使用；把**函数原型**写在调用之前或头文件中。

### 指针入门

指针是存放地址的变量。`&x` 取变量 `x` 的地址，`*p` 访问指针 `p` 指向的对象。借助指针，函数可以修改调用者的变量：

```c
#include <stdio.h>

static void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void) {
    int x = 3, y = 7;
    int *p = &x;
    printf("x 的地址 %p，值 %d\n", (void *)p, *p);
    swap(&x, &y);
    printf("x = %d, y = %d\n", x, y);    // x = 7, y = 3
    int *none = nullptr;                  // C23 的空指针常量，旧标准用 NULL
    if (none == nullptr) {
        puts("none 不指向任何对象，不能解引用");
    }
    return 0;
}
```

- 声明中的 `*` 表示「这是指针类型」，表达式中的 `*` 表示「解引用」。
- 未初始化的指针指向随机地址，解引用空指针或野指针是未定义行为，通常导致段错误。声明指针时要么让它指向有效对象，要么设为 `nullptr`。
- `scanf("%d", &n)` 要传地址，正是因为它需要修改 `n`。

### 头文件与多文件程序

程序变大后要拆分：**头文件**（`.h`）放声明，**源文件**（`.c`）放定义。

```c
// 文件：mathx.h
#ifndef MATHX_H
#define MATHX_H

int gcd(int a, int b);
bool is_prime(int n);     // C23 起 bool 是关键字，无需 stdbool.h

#endif
```

```c
// 文件：mathx.c
#include "mathx.h"

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a < 0 ? -a : a;
}

bool is_prime(int n) {
    if (n < 2) {
        return false;
    }
    for (int i = 2; i <= n / i; i++) {
        if (n % i == 0) {
            return false;
        }
    }
    return true;
}
```

```c
// 文件：main.c
#include <stdio.h>
#include "mathx.h"

int main(void) {
    printf("gcd(84, 36) = %d\n", gcd(84, 36));     // 12
    printf("97 是质数吗？%s\n", is_prime(97) ? "是" : "否");
    return 0;
}
```

```bash
gcc -std=c23 -Wall -Wextra -c mathx.c      # 生成 mathx.o
gcc -std=c23 -Wall -Wextra -c main.c       # 生成 main.o
gcc mathx.o main.o -o app                  # 链接
./app
```

- `#include <…>` 在系统目录中查找，`#include "…"` 先在当前目录查找。
- `#ifndef` / `#define` / `#endif` 是**头文件保护**，防止同一头文件被重复包含。
- 头文件里只放声明（函数原型、类型定义、宏），不要放函数定义和全局变量定义，否则多个文件包含后链接时会报重复定义。
- 文件多了以后，手动敲编译命令很麻烦，[工具、调试与测试](../04-tools-debugging/) 会用 Makefile 自动化。

> [!TIP]
> 把每个 `.c` 文件单独编译成 `.o` 再链接，改了一个文件只需重新编译那一个，这正是 make 能加快构建的原因。

## 常见误区

- **「`5 / 2` 等于 2.5」**：两个整数相除结果仍是整数 2。
- **「局部变量默认是 0」**：自动存储期变量不初始化就是不确定的值，务必在声明时初始化。
- **「函数能改掉传进来的变量」**：C 只有值传递，要修改调用者的变量必须传指针。
- **`if (x = 5)`**：赋值表达式的值是 5，条件永远为真。开启 `-Wall` 能发现。
- **在头文件里写函数定义**：多个 `.c` 包含后会出现 `multiple definition` 链接错误。

## 实践任务

1. 运行类型大小示例，记录你的机器上各类型的 `sizeof`；再把 `printf` 的某个 `%zu` 改成 `%d`，观察 `-Wall` 的警告。
2. 先在纸上写出下列表达式的值，再写程序验证：`7 / 2`、`-7 / 2`、`-7 % 3`、`7 / 2.0`、`(int)3.99`、`-1 < 1u`。
3. 写函数 `int digit_sum(int n)` 求各位数字之和，再写 `void min_max(const int a[], int n, int *min, int *max)` 通过指针返回最小值和最大值。
4. 用 `static` 局部变量写一个每次调用返回下一个编号（1、2、3……）的函数。
5. 把上面的 `mathx` 示例拆成三个文件，分步编译链接；再把 `gcd` 的定义挪进头文件，让两个 `.c` 都包含它，观察链接错误。

## 资料索引

- [cppreference：C 语言参考](https://en.cppreference.com/w/c) — 最常用的 C 标准语言和库参考，标注了各特性出现在哪个标准版本（英文；网站会拦截部分自动化访问，浏览器访问正常）
- [CS50x Week 1: C](https://cs50.harvard.edu/x/weeks/1/) — 变量、条件、循环、函数；Week 2 讲数组和命令行参数（英文）
- [Beej's Guide to C Programming](https://beej.us/guide/bgc/) — 变量、运算符、函数、指针、多文件项目各有专章（英文，免费）
- [Modern C](https://gustedt.gitlabpages.inria.fr/modern-c/) — 按照现代 C 标准讲解类型、表达式和函数，对未定义行为讲得很细（英文，免费电子版）
- [GCC 手册：Warning Options](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html) — 每个警告选项检查什么，看不懂某条警告时查阅（英文）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】`int a = 7, b = 2; double r = a / b;` 执行后 `r` 的值是：
    - A. 3.5
    - B. 3.0
    - C. 4.0
    - D. 编译错误
2. 【单选】下列关于函数内 `static int n;` 的说法，正确的是：
    - A. 每次调用函数都会重新初始化为 0
    - B. 只初始化一次，函数返回后值仍保留
    - C. 它是全局变量，其他文件也能访问
    - D. 它的值未定义
3. 【单选】`void f(int *p) { *p = 10; }`，要让 `f` 把 `main` 中的 `int x` 改为 10，应调用：
    - A. `f(x)`
    - B. `f(*x)`
    - C. `f(&x)`
    - D. `f(x*)`
4. 【简答】`-1 < 1u` 的结果是什么？为什么？
5. 【简答】头文件里应该放什么、不应该放什么？头文件保护起什么作用？

<details markdown><summary>参考答案</summary>

1. B — `a / b` 先按整数除法得 3，再转换为 `double` 得 3.0。
2. B — 静态存储期变量只初始化一次，生命周期贯穿程序运行；函数内声明使它只在该函数内可见。
3. C — 传入 `x` 的地址，函数通过解引用修改它。
4. 结果为假（0）。`-1` 与无符号数比较时被转换为无符号类型，变成一个很大的数（如 4294967295），所以不小于 1。
5. 放函数原型、类型定义、宏等声明；不放函数定义和全局变量定义，否则多个文件包含后会重复定义。头文件保护防止同一头文件在一个编译单元中被重复包含导致重复声明错误。

</details>

---

← [上一节：第一门语言 C 与环境](../01-first-language-c/) · [返回 编程入门](../) · [下一节：内存与数据](../03-memory-and-data/) →
