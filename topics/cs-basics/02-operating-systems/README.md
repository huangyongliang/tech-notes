# 操作系统 Operating Systems

> [计算机基础](../) › 操作系统

进程与线程、调度、虚拟内存、文件系统与并发基础。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 1 计算机基础 · 第 2 关（第一章「系统与工具」） |
| 前置要求 | [计算机组成](../01-computer-organization/)；能读懂简单 C 代码（[核心概念](../../programming-basics/02-core-concepts/)） |
| 建议用时 | 3–4 周（粗略参考，入门深度；读完 OSTEP 需要更久） |
| 后续衔接 | [Linux 与 Shell](../03-linux-shell/) 会天天用到进程、文件描述符和权限；Java 阶段的 [并发](../../java/05-concurrency/) 建立在本关的线程与锁之上。不变式与终止可选读网站上的 [证明与归纳](../../cs-theory/03-proofs-induction/)，依赖成圈可选读 [有向图](../../cs-theory/10-digraphs-dag/)。都不是本关前置，也不在小程序打包的 35 篇里 |

> [!TIP]
> 路线建议阶段 1 和阶段 2 交叉进行：先通读本关建立概念，学完 C 的指针和内存后，再回来动手跑本关的示例和 OSTEP 的作业。

操作系统是「管理硬件、给程序提供服务」的软件。这一关回答三个问题：多个程序怎么同时运行（**虚拟化 CPU**），每个程序为什么都以为自己独占内存（**虚拟化内存**），数据怎么长期保存（**持久化**），以及多个执行流同时改数据时怎么不出错（**并发**）。这也正是 OSTEP 一书的三大部分。

## 闯关任务

- [ ] 能够解释程序和进程的区别，说出进程的主要状态和状态切换的原因。
- [ ] 能够用 `fork`、`exec`、`wait` 描述 Shell 启动一个命令的过程。
- [ ] 能够区分进程和线程：哪些资源共享，哪些各自独有。
- [ ] 能够解释虚拟内存、页、页表和缺页的含义，以及它带来的隔离作用。
- [ ] 能够说出文件描述符、目录、inode 的作用，以及标准输入 / 输出 / 错误对应的编号。
- [ ] 能够指出一段多线程代码中的竞态条件，并用互斥锁修复。

## 知识要点

### 程序、进程与系统调用

- **程序**是硬盘上的可执行文件；**进程**是程序运行起来的实例，拥有自己的地址空间、打开的文件、寄存器状态。同一个程序可以同时跑多个进程。
- CPU 有**用户态**和**内核态**。普通程序不能直接操作硬件，要通过**系统调用**（如 `read`、`write`、`open`、`fork`）请求内核代办。C 标准库的 `printf` 最终也会调用 `write`。
- **进程状态**：就绪（等 CPU）、运行、阻塞（等磁盘、网络、键盘等）。时间片用完会从运行回到就绪；发起 I/O 会进入阻塞，I/O 完成后回到就绪。

### Shell 怎样运行一个命令

在类 Unix 系统上，创建新进程分两步：`fork` 复制出一个子进程，子进程再用 `exec` 把自己替换成要运行的程序，父进程用 `wait` 等它结束。下面的程序模拟了 Shell 运行 `ls -l` 的过程（Linux / macOS）：

```c
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();
    if (pid < 0) {
        perror("fork");
        return EXIT_FAILURE;
    }
    if (pid == 0) {                       // 子进程
        char *argv[] = {"ls", "-l", nullptr};
        execvp(argv[0], argv);            // 成功时不会返回
        perror("execvp");
        _exit(127);
    }
    int status = 0;                       // 父进程
    waitpid(pid, &status, 0);
    if (WIFEXITED(status)) {
        printf("子进程 %d 退出码 %d\n", (int)pid, WEXITSTATUS(status));
    }
    return EXIT_SUCCESS;
}
```

`nullptr` 是 C23 新增的空指针常量；在不支持 C23 的旧编译器上可以写 `NULL`。

### 调度

操作系统在多个就绪进程之间快速切换（上下文切换），每个进程只运行一小段时间片，看起来就像同时运行。调度算法要在「响应快」「吞吐高」「公平」之间权衡，经典算法有先来先服务、短作业优先、轮转（Round Robin）、多级反馈队列。Linux 从 6.6 版本起把默认调度器从 CFS 换成了 EEVDF。

### 线程

线程是进程内的执行流。同一进程的线程**共享**代码、全局变量、堆和打开的文件，各自**独有**栈、寄存器和程序计数器。线程间通信方便，但也因此容易出现并发错误。

### 虚拟内存

- 每个进程看到的是一个从 0 开始的、连续的**虚拟地址空间**；硬件（MMU）和操作系统通过**页表**把虚拟页映射到物理内存页，页的常见大小是 4 KiB。
- 好处：进程之间**互相隔离**，一个程序的野指针改不到别的程序；程序可以使用比物理内存更大的空间（不常用的页换到磁盘）。
- **缺页**：访问的虚拟页当前不在物理内存里，CPU 陷入内核，由操作系统把它调进来；访问的地址根本没有映射时，进程会收到段错误（`SIGSEGV`）。
- 一个进程的地址空间大致分为：代码段、数据段（全局变量）、堆（`malloc`，向上增长）、栈（函数调用，向下增长）。

### 文件系统

- **文件描述符**是进程打开文件后得到的一个小整数。约定 `0` 是标准输入、`1` 是标准输出、`2` 是标准错误，Shell 的重定向 `>`、`2>` 就是在改这几个编号指向哪里。
- 「一切皆文件」：在 Unix 中，普通文件、目录、终端、管道、网络套接字都可以用 `read` / `write` 操作。
- **inode** 保存文件的元数据（大小、权限、数据块位置），**目录**只是「文件名 → inode 编号」的映射表，所以同一个文件可以有多个名字（硬链接）。
- 写文件时数据通常先进内核缓存，再择机写入磁盘；需要确保落盘时调用 `fsync`。

### 并发：竞态条件与锁

两个线程同时执行 `counter++` 时，这一行其实是「读—加—写」三步，交错执行就会丢失更新，这叫**竞态条件**。用互斥锁把这段**临界区**保护起来：

```c
#include <pthread.h>
#include <stdio.h>

static long counter = 0;
static pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;

static void *worker(void *arg) {
    (void)arg;
    for (int i = 0; i < 1'000'000; i++) {
        pthread_mutex_lock(&lock);
        counter++;                        // 临界区
        pthread_mutex_unlock(&lock);
    }
    return nullptr;
}

int main(void) {
    pthread_t t1, t2;
    pthread_create(&t1, nullptr, worker, nullptr);
    pthread_create(&t2, nullptr, worker, nullptr);
    pthread_join(t1, nullptr);
    pthread_join(t2, nullptr);
    printf("counter = %ld\n", counter);   // 加锁后稳定输出 2000000
    return 0;
}
```

编译：`gcc -std=c2x -Wall -Wextra -pthread counter.c -o counter`。去掉两行加锁、解锁再运行几次，结果通常会小于 2000000，而且每次不同。`1'000'000` 中的单引号是 C23 的数字分隔符，只为好读。

**死锁**：两个线程各持有一把锁、又等待对方的锁，谁也走不下去。最简单的预防办法是所有线程按相同顺序加锁。

## 常见误区

- **「多线程一定更快」**：线程切换、加锁都有开销，任务本身无法拆分或主要在等 I/O 时，多线程不一定更快。
- **「进程之间可以直接读写对方的变量」**：虚拟内存把它们隔离了，必须通过管道、共享内存、套接字等进程间通信机制。
- **「`fork` 之后父子进程共享变量」**：`fork` 复制的是地址空间（实现上用写时复制），之后各改各的，互不影响。
- **「`printf` 之后数据就到了屏幕 / 文件」**：标准库有缓冲区，输出到文件时可能要等缓冲区满或 `fflush` 才真正写出。

## 实践任务

1. 运行 `ps aux`（或 `top`、`htop`）观察系统里的进程，找到你的终端 Shell 进程和它的 PID。
2. 编译运行 `fork` 示例，把 `ls -l` 换成 `date`；再在子进程里调用一个不存在的命令，观察退出码 127。
3. 编译运行计数器示例，先加锁运行 3 次，再去掉锁运行 3 次，记录结果并解释差异。
4. 运行 `cat /proc/self/maps`（Linux），找出输出中的堆、栈和共享库区域。
5. 阅读 OSTEP 第 4–6 章（进程、进程 API、受限直接执行），完成第 5 章的作业代码题。

## 资料索引

- [Operating Systems: Three Easy Pieces（OSTEP）](https://pages.cs.wisc.edu/~remzi/OSTEP/) — 免费在线操作系统教材，按虚拟化、并发、持久化三部分讲，示例用 C（英文；中文版书名《操作系统导论》，人民邮电出版社）
- [MIT 6.1810: Operating System Engineering](https://pdos.csail.mit.edu/6.1810/) — MIT 操作系统课，基于教学系统 xv6 动手改内核，适合学完入门后进阶（英文）
- [CS:APP](https://csapp.cs.cmu.edu/) — 第 8 章异常控制流（进程、信号）、第 9 章虚拟内存、第 12 章并发编程（教材付费）
- [Linux man pages（man7.org）](https://man7.org/linux/man-pages/) — `fork(2)`、`execve(2)`、`pthread_create(3)` 等系统调用和库函数的权威手册（英文）
- [MIT Missing Semester](https://missing.csail.mit.edu/) — 其中「命令行环境」一讲演示了作业控制、信号和进程管理（[中文翻译](https://missing-semester-cn.github.io/)）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】同一进程内的多个线程共享的是：
    - A. 程序计数器
    - B. 栈
    - C. 堆内存
    - D. 寄存器
2. 【单选】标准错误输出对应的文件描述符是：
    - A. 0
    - B. 1
    - C. 2
    - D. 3
3. 【单选】进程发起磁盘读取后在等待数据，它处于：
    - A. 运行态
    - B. 就绪态
    - C. 阻塞态
    - D. 已终止
4. 【简答】Shell 执行一条外部命令时，`fork`、`exec`、`wait` 分别做了什么？
5. 【简答】虚拟内存给进程带来了哪两点主要好处？

<details markdown><summary>参考答案</summary>

1. C — 线程共享进程的堆和全局数据，各自有独立的栈、程序计数器和寄存器状态。
2. C — 0 是标准输入，1 是标准输出，2 是标准错误。
3. C — 等待 I/O 的进程不占 CPU，处于阻塞态，I/O 完成后回到就绪态。
4. `fork` 复制出一个子进程；子进程调用 `exec` 把自己替换成要运行的程序；父进程（Shell）调用 `wait` 等待子进程结束并取得退出码。
5. 要点：进程之间地址空间隔离，互不干扰、更安全；每个进程看到连续的大地址空间，可以使用比物理内存更大的空间，简化了编程和内存管理。

</details>

---

← [上一节：计算机组成](../01-computer-organization/) · [返回 计算机基础](../) · [下一节：Linux 与 Shell](../03-linux-shell/) →
