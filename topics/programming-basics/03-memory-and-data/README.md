# 内存与数据 Memory & Data

> [编程入门](../) › 内存与数据

数组、指针运算、字符串与 string.h、struct、栈与堆、malloc / free、动态数组与链表。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 2 编程入门 · 第 3 关（第一章「C 语言」最后一关） |
| 前置要求 | [核心概念](../02-core-concepts/)，尤其是指针入门；[操作系统](../../cs-basics/02-operating-systems/) 中的虚拟内存与地址空间 |
| 建议用时 | 3–4 周（本阶段最难也最重要的一关） |
| 后续衔接 | [工具、调试与测试](../04-tools-debugging/) 教你用 AddressSanitizer 抓本关的内存错误；[问题求解](../05-problem-solving/) 用这些结构实现栈、队列和哈希表 |

这一关是 C 的核心：亲手管理内存。你会看到数组和指针的关系、字符串其实只是以 `'\0'` 结尾的字符数组、`struct` 怎样把数据组织在一起，以及栈和堆的区别。学会它，就理解了 Java 中「引用」「对象在堆上」「垃圾回收」到底替你做了什么。

## 闯关任务

- [ ] 能够声明和遍历数组，解释数组传给函数时退化为指针的含义，以及为什么要同时传长度。
- [ ] 能够用指针运算遍历数组，说明 `p + 1` 移动的字节数由什么决定。
- [ ] 能够解释 C 字符串的 `'\0'` 结尾约定，正确使用 `strlen`、`strcmp`、`snprintf` 等函数并避免缓冲区溢出。
- [ ] 能够定义 `struct`，用 `.` 和 `->` 访问成员，并用 `typedef` 简化写法。
- [ ] 能够区分栈和堆上的对象生命周期，正确使用 `malloc`、`realloc`、`free`。
- [ ] 能够实现可增长的动态数组和单链表，并保证没有内存泄漏。

## 知识要点

### 进程的内存布局

```mermaid
flowchart LR
  T[代码段] --> D[数据段 全局/静态]
  D --> H[堆 malloc 向上长]
  H --> G[未用空间]
  G --> S[栈 局部变量 向下长]
```

| 区域 | 存放什么 | 生命周期 | 谁来管理 |
|------|----------|----------|----------|
| 栈 | 局部变量、函数参数、返回地址 | 函数返回即销毁 | 编译器自动 |
| 堆 | `malloc` 申请的内存 | 直到 `free` | 程序员手动 |
| 数据段 | 全局变量、`static` 变量 | 整个程序运行期间 | 自动 |

栈空间有限（Linux 上默认常见为 8 MiB，可用 `ulimit -s` 查看），大数组和大小在运行时才确定的数据应放在堆上。

### 数组与指针运算

```c
#include <stddef.h>
#include <stdio.h>

static int sum(const int *a, size_t n) {   // 等价于 const int a[]
    int total = 0;
    for (const int *p = a; p < a + n; p++) {
        total += *p;
    }
    return total;
}

int main(void) {
    int a[5] = {10, 20, 30};               // 其余元素自动为 0
    size_t n = sizeof a / sizeof a[0];     // 只在数组定义的作用域内有效
    printf("元素个数 %zu，和 %d\n", n, sum(a, n));
    printf("a[2] = %d, *(a + 2) = %d\n", a[2], *(a + 2));
    printf("&a[0] = %p, &a[1] = %p\n", (void *)&a[0], (void *)&a[1]);  // 相差 sizeof(int)
    return 0;
}
```

- 数组名在大多数表达式中会**退化**为指向首元素的指针，`a[i]` 就是 `*(a + i)`。
- 指针加 1 移动的是「一个元素」的距离：`int *` 前进 `sizeof(int)` 字节，`char *` 前进 1 字节。
- 数组传给函数时只传了首地址，函数里 `sizeof a` 得到的是指针大小，所以**必须另外传长度**。
- C 不检查越界：`a[5]` 能编译通过，但读写它是未定义行为。合法下标是 `0` 到 `n - 1`。

### 字符串与 string.h

C 字符串是以空字符 `'\0'` 结尾的 `char` 数组。`"hi"` 占 3 个字节：`'h'`、`'i'`、`'\0'`。

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    char name[16] = "Ada";
    printf("strlen = %zu, sizeof = %zu\n", strlen(name), sizeof name);   // 3, 16

    char greeting[32];
    int len = snprintf(greeting, sizeof greeting, "Hello, %s!", name);   // 不会溢出
    printf("%s（%d 个字符）\n", greeting, len);

    if (strcmp(name, "Ada") == 0) {          // 比较内容要用 strcmp，不能用 ==
        puts("名字相同");
    }

    char *copy = strdup(greeting);           // C23 纳入标准库：在堆上复制一份
    if (copy == nullptr) {
        return EXIT_FAILURE;
    }
    copy[0] = 'J';
    printf("%s / %s\n", greeting, copy);
    free(copy);                              // strdup 的结果要 free
    return 0;
}
```

- `strlen` 数到 `'\0'` 为止，不含结尾；`sizeof` 是整个数组的字节数。
- `strcpy`、`strcat` 不检查目标空间，容易溢出；优先用 `snprintf`，它最多写入 `size - 1` 个字符并补上 `'\0'`，返回值是「本应写入」的长度，可用来判断是否被截断。
- `gets` 已在 C11 中从标准删除，读一行用 `fgets(buf, sizeof buf, stdin)`。
- `char *s = "hello";` 指向字符串字面量，**不能修改**；要修改请用数组 `char s[] = "hello";`。

### struct

```c
#include <stdio.h>
#include <string.h>

typedef struct {
    char name[32];
    int age;
    double score;
} Student;

static void birthday(Student *s) {        // 传指针，避免复制整个结构体，也能修改它
    s->age++;                             // s->age 等价于 (*s).age
}

int main(void) {
    Student s = {.name = "Lin", .age = 19, .score = 88.5};   // 指定成员初始化
    birthday(&s);
    printf("%s %d %.1f\n", s.name, s.age, s.score);

    Student class[2] = {};                // C23：空花括号把所有成员清零
    strcpy(class[0].name, "Wang");        // 已确认长度足够时才可以用 strcpy
    printf("sizeof(Student) = %zu\n", sizeof(Student));
    return 0;
}
```

- 用 `.` 访问结构体变量的成员，用 `->` 通过指针访问。
- 结构体的大小可能大于各成员之和，因为编译器会插入**填充**以满足对齐要求，所以总是用 `sizeof` 而不是自己相加。
- 结构体可以整体赋值和按值传参，但较大的结构体一般传指针。

### malloc 与 free

```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t n = 5;
    int *a = malloc(n * sizeof *a);           // 写 sizeof *a，类型改了也不会错
    if (a == nullptr) {                       // 申请可能失败，必须检查
        perror("malloc");
        return EXIT_FAILURE;
    }
    for (size_t i = 0; i < n; i++) {
        a[i] = (int)(i * i);
    }
    printf("a[4] = %d\n", a[4]);
    free(a);                                  // 用完释放
    a = nullptr;                              // 防止之后误用悬空指针
    return 0;
}
```

堆内存的四条铁律：

- **检查返回值**：`malloc` 失败返回空指针。
- **每次 `malloc` 对应恰好一次 `free`**：忘记释放是**内存泄漏**，释放两次是**重复释放**，都是错误。
- **`free` 之后不再使用**：继续读写已释放的内存叫 use-after-free，是严重的安全漏洞来源。
- **不要返回局部变量的地址**：函数返回后栈上的局部变量已被销毁，需要传出数据时用 `malloc` 或让调用者提供缓冲区。

`calloc(n, size)` 会把内存清零；`realloc(p, new_size)` 调整大小，可能搬到新地址，要用临时变量接收结果，失败时原内存仍然有效。

### 动态数组

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct {
    int *data;
    size_t len;
    size_t cap;
} IntVec;

static bool vec_push(IntVec *v, int x) {
    if (v->len == v->cap) {
        size_t new_cap = v->cap == 0 ? 4 : v->cap * 2;      // 容量翻倍，均摊 O(1)
        int *p = realloc(v->data, new_cap * sizeof *p);
        if (p == nullptr) {
            return false;                                    // 原数据仍在 v->data 中
        }
        v->data = p;
        v->cap = new_cap;
    }
    v->data[v->len++] = x;
    return true;
}

static void vec_free(IntVec *v) {
    free(v->data);
    *v = (IntVec){};
}

int main(void) {
    IntVec v = {};
    for (int i = 1; i <= 10; i++) {
        if (!vec_push(&v, i * 10)) {
            vec_free(&v);
            return EXIT_FAILURE;
        }
    }
    printf("len = %zu, cap = %zu, last = %d\n", v.len, v.cap, v.data[v.len - 1]);
    vec_free(&v);
    return 0;
}
```

### 单链表

```c
#include <stdio.h>
#include <stdlib.h>

typedef struct Node {
    int value;
    struct Node *next;
} Node;

// 在头部插入，返回新的头指针；失败时返回 nullptr，原链表不变
static Node *push_front(Node *head, int value) {
    Node *n = malloc(sizeof *n);
    if (n == nullptr) {
        return nullptr;
    }
    n->value = value;
    n->next = head;
    return n;
}

static void list_free(Node *head) {
    while (head != nullptr) {
        Node *next = head->next;   // 先保存下一个，再释放当前节点
        free(head);
        head = next;
    }
}

int main(void) {
    Node *head = nullptr;
    for (int i = 1; i <= 3; i++) {
        Node *h = push_front(head, i);
        if (h == nullptr) {
            list_free(head);
            return EXIT_FAILURE;
        }
        head = h;
    }
    for (const Node *p = head; p != nullptr; p = p->next) {
        printf("%d -> ", p->value);
    }
    puts("NULL");                  // 3 -> 2 -> 1 -> NULL
    list_free(head);
    return 0;
}
```

释放链表时如果先 `free(head)` 再读 `head->next`，就是 use-after-free，所以必须先保存 `next`。

> [!WARNING]
> 内存错误常常「看起来能跑」，换一台机器或换个输入才崩溃。本关的每个程序都应该用 `-fsanitize=address,undefined` 编译运行一遍，详见 [工具、调试与测试](../04-tools-debugging/)。

## 常见误区

- **「数组就是指针」**：数组是一块连续的对象，只是在表达式中会退化为指针；`sizeof` 数组和 `sizeof` 指针结果不同。
- **差一错误（off-by-one）**：循环写成 `i <= n` 会访问 `a[n]`；给字符串分配空间时忘了给 `'\0'` 留 1 个字节。
- **用 `==` 比较字符串**：比较的是地址，内容相同也可能不相等，应使用 `strcmp`。
- **`p = realloc(p, size)`**：失败时返回空指针，原内存的地址就丢了，造成泄漏。
- **返回局部数组的地址**：函数返回后那块栈内存已失效，`-Wall` 通常会警告 `function returns address of local variable`。

## 实践任务

1. 写函数 `void reverse(int *a, size_t n)`，只用指针（不用下标）原地反转数组。
2. 不用 `string.h`，自己实现 `my_strlen`、`my_strcmp`、`my_strcpy`，与标准库的结果对比。
3. 定义 `Student` 结构体数组，读入 5 名学生的姓名和分数（用 `fgets` 和 `sscanf`），按分数从高到低用 `qsort` 排序后输出。
4. 扩展动态数组：增加 `vec_pop`、`vec_get`（带越界检查），以及 `vec_insert(v, index, x)`。
5. 扩展单链表：实现 `list_length`、`list_find`、`list_remove`（删除第一个等于给定值的节点）和 `list_reverse`，全部用 `-fsanitize=address` 运行确认没有泄漏和越界。

## 资料索引

- [CS50x Week 4: Memory](https://cs50.harvard.edu/x/weeks/4/) — 指针、`malloc`、`free`、内存布局，配有经典的「Pointer Fun with Binky」演示；Week 5 讲链表与哈希表（英文）
- [cppreference：字符串处理](https://en.cppreference.com/w/c/string/byte) — `string.h` 各函数的定义、返回值和注意事项（英文）
- [cppreference：动态内存管理](https://en.cppreference.com/w/c/memory) — `malloc`、`calloc`、`realloc`、`free` 的精确语义（英文）
- [SEI CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard) — 卡内基梅隆大学的 C 安全编码规范，「Memory Management」「Strings」两部分对应本关（英文）
- [Beej's Guide to C Programming](https://beej.us/guide/bgc/) — 指针、数组、字符串、结构体、动态内存各有专章（英文，免费）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】`char s[] = "hello";` 中 `sizeof s` 和 `strlen(s)` 分别是：
    - A. 5 和 5
    - B. 6 和 5
    - C. 5 和 6
    - D. 8 和 5
2. 【单选】`int *p` 指向地址 `0x1000`，`int` 为 4 字节，`p + 2` 指向：
    - A. `0x1002`
    - B. `0x1004`
    - C. `0x1008`
    - D. `0x1010`
3. 【单选】下面哪种写法最安全地扩容？
    - A. `p = realloc(p, n);`
    - B. `int *t = realloc(p, n); if (t != nullptr) p = t;`
    - C. `free(p); p = malloc(n);`
    - D. `p = malloc(n);`
4. 【简答】下面的函数有什么问题？怎么改？`char *make_greeting(void) { char buf[32]; snprintf(buf, sizeof buf, "hi"); return buf; }`
5. 【简答】释放单链表时，为什么要先保存 `next` 再 `free` 当前节点？

<details markdown><summary>参考答案</summary>

1. B — 数组包含结尾的 `'\0'`，共 6 字节；`strlen` 不计 `'\0'`。
2. C — 指针加 2 前进 2 个 `int`，即 8 字节。
3. B — `realloc` 失败返回空指针而原内存仍有效，用临时变量接收才不会丢失原指针。
4. 返回了栈上局部数组的地址，函数返回后该内存失效，调用者使用它是未定义行为。可改为用 `malloc` 分配并让调用者 `free`，或由调用者传入缓冲区和长度。
5. `free` 之后节点内存已归还，再读 `node->next` 是 use-after-free；先保存 `next` 才能安全地继续遍历。

</details>

---

← [上一节：核心概念](../02-core-concepts/) · [返回 编程入门](../) · [下一节：工具、调试与测试](../04-tools-debugging/) →
