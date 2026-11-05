# 技术英语 Tech English

> [零基础入门](../) › 技术英语

常见术语、读报错信息、读官方文档的方法。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 0 零基础入门 · 第 5 关（本阶段最后一关） |
| 前置要求 | [学会学习与提问](../04-learning-to-learn/)；中学英语基础 |
| 建议用时 | 3–5 天入门，之后靠每天读文档持续积累 |
| 后续衔接 | 进入 [计算机基础](../../cs-basics/)，开始读英文手册、man 页面和编译器报错 |

编程语言的关键字、报错信息、官方文档和大部分一手资料都是英文。好消息是技术英语的词汇量有限、句式固定，不需要考试级别的英语。这一关的目标是：看到英文报错不慌，能借助词典读完一页官方文档。

## 闯关任务

- [ ] 能够认出并解释 30 个以上高频技术词汇（如 `deprecated`、`argument`、`dependency`）。
- [ ] 能够拆解一条编译器报错：文件、行号、级别、原因，并据此定位问题。
- [ ] 能够读懂 Linux 常见报错（`command not found`、`Permission denied`、`No such file or directory`）的含义。
- [ ] 能够按「先概览、再查阅、后精读」的顺序使用官方文档，并说出 `MUST`、`SHOULD`、`MAY` 的区别。
- [ ] 能够用英文关键词搜索，并写出一句简单的英文问题描述。

## 知识要点

### 高频词汇：按场景记

| 场景 | 词汇 | 含义 |
|------|------|------|
| 安装配置 | install、configure、dependency、package、version | 安装、配置、依赖、软件包、版本 |
| 代码 | variable、function、argument、parameter、return value | 变量、函数、实参、形参、返回值 |
| 构建 | compile、build、link、executable、library | 编译、构建、链接、可执行文件、库 |
| 运行 | run、execute、process、input、output | 运行、执行、进程、输入、输出 |
| 出错 | error、warning、failed、invalid、unexpected | 错误、警告、失败、无效、意外的 |
| 文件 | file、directory、path、permission、denied | 文件、目录、路径、权限、被拒绝 |
| 版本 | deprecated、obsolete、release、stable、breaking change | 已弃用、过时、发布、稳定版、不兼容改动 |
| 文档 | usage、example、reference、syntax、default | 用法、示例、参考、语法、默认值 |

技巧：英文缩写也要认，如 `e.g.`（例如）、`i.e.`（也就是）、`etc.`（等等）、`TL;DR`（太长不看版摘要）、`WIP`（进行中）、`FAQ`（常见问题）。

### 拆解一条编译器报错

下面是在 GCC 14 上编译一个漏了分号的程序时的真实输出：

```text
hello.c: In function ‘main’:
hello.c:5:5: error: expected ‘,’ or ‘;’ before ‘printf’
    5 |     printf("%d\n", count);
      |     ^~~~~~
hello.c:4:9: warning: unused variable ‘count’ [-Wunused-variable]
```

读法：

1. `hello.c:5:5` 是「文件:行:列」，告诉你编译器在哪里发现问题。
2. `error` 必须修，程序没编译出来；`warning` 不阻止编译，但往往是隐患。
3. `expected ‘,’ or ‘;’ before ‘printf’` 直译是「在 printf 之前期待一个逗号或分号」。编译器在第 5 行才发现问题，**真正漏分号的是上一行**——这是读报错最重要的经验之一。
4. 第二条 `warning` 是第一条错误连带出来的，修掉第一条后它就消失了。**先看第一条报错**。

### 常见运行时报错

| 报错原文 | 意思 | 常见原因 |
|----------|------|----------|
| `command not found` | 找不到命令 | 没安装，或拼错，或不在 `PATH` 里 |
| `No such file or directory` | 没有这个文件或目录 | 路径写错，或者当前目录不对 |
| `Permission denied` | 权限被拒绝 | 没有读 / 写 / 执行权限 |
| `Segmentation fault` | 段错误 | C 程序访问了不该访问的内存 |
| `Connection refused` | 连接被拒绝 | 对方端口没有服务在监听 |
| `Address already in use` | 地址已被占用 | 端口被另一个程序占着 |

### 读官方文档的方法

1. **先概览**：看目录、Getting Started / Quick Start / Tutorial，花 10 分钟知道文档有哪些部分。
2. **再查阅**：遇到具体问题时用 Reference / API 部分查，搜索框和 `Ctrl` + `F` 是好朋友。
3. **后精读**：真正要用的那一节逐句读，生词查词典，并动手跑一遍示例。
4. 注意文档**版本号**，选择和你安装的版本一致的那份。

规范类文档（RFC、语言标准）里大写的 `MUST`、`SHOULD`、`MAY` 有固定含义（RFC 2119，RFC 8174 补充说明只有大写时才有此含义）：

| 关键词 | 含义 |
|--------|------|
| `MUST` / `SHALL` | 必须，不做就是不符合规范 |
| `SHOULD` | 应该，除非有充分理由 |
| `MAY` | 可以，完全可选 |

> [!TIP]
> 翻译工具可以帮你过一遍大意，但术语要以英文原词记住。比如 `argument` 在编程里是「实参」，不是「争论」；`statement` 是「语句」，不是「声明」。

### 用英文描述问题

套用简单句式就够了：

```text
I'm trying to compile a C program with gcc 14 on Ubuntu 24.04.
When I run `gcc hello.c -o hello`, I get the error: "undefined reference to `main'".
I have checked that the file is saved. What am I missing?
```

## 常见误区

- **看到红字就慌，不读内容**：报错其实是在告诉你答案，先读第一条，逐词查。
- **只看最后一行**：很多工具最后一行只是「失败了」，真正原因在上面。
- **把机器翻译当准确译文**：机器翻译常把术语译错，关键句要对照原文。
- **背单词书**：技术词汇在真实场景里反复出现，在读文档和报错时积累最快。

## 实践任务

1. 建一个「技术词汇表」笔记，按上面的场景分类，每天从文档或报错里补充 3 个词。
2. 在终端里故意制造三种报错：运行不存在的命令、`ls` 不存在的目录、`cat` 一个没有读权限的文件，把原文和含义记下来。
3. 选一份官方文档（例如 [Pro Git](https://git-scm.com/book/en/v2) 第 1 章）的英文版，借助词典读完一节，用中文写 5 行摘要。
4. 用英文写一段 3–5 句的问题描述，描述你最近遇到的一个电脑问题。
5. 完成阶段产出：注册 GitHub 账号，用网页版新建一个仓库，写一篇 Markdown 学习日记，汇总阶段 0 的笔记。

## 资料索引

- [Google Technical Writing Courses](https://developers.google.com/tech-writing) — 谷歌免费技术写作课，用来学「技术英语怎么写」，顺便练阅读（英文）
- [MDN 术语表](https://developer.mozilla.org/zh-CN/docs/Glossary) — Web 相关术语的中英文解释，可在中英文页面之间切换对照
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) 与 [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) — 规范文档中 `MUST`、`SHOULD`、`MAY` 等关键词的定义（英文，各两三页）
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/) — 微软的技术写作风格指南，含常用术语用法（英文）
- [Cambridge Dictionary](https://dictionary.cambridge.org/) — 剑桥英语词典，带例句和发音，有英汉版本

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】文档里说某个函数 `deprecated`，意思是：
    - A. 已经删除，不能再用
    - B. 已弃用，仍可使用但不推荐，将来可能删除
    - C. 实验性功能
    - D. 性能很差
2. 【单选】报错 `main.c:12:8: error: ...` 中 `12` 表示：
    - A. 错误编号
    - B. 列号
    - C. 行号
    - D. 错误数量
3. 【单选】规范文档中 `SHOULD` 的含义是：
    - A. 绝对必须
    - B. 应该做，除非有充分理由
    - C. 可以做也可以不做
    - D. 禁止
4. 【简答】编译器报 `expected ';' before 'return'`，指向第 8 行，你应该先检查哪里？
5. 【简答】运行 `./run.sh` 时看到 `Permission denied`，可能是什么原因？

<details markdown><summary>参考答案</summary>

1. B — deprecated 是「已弃用」，通常保留一段时间再删除。
2. C — 格式是「文件:行:列」，12 是行号，8 是列号。
3. B — `SHOULD` 是强烈建议；`MUST` 才是必须，`MAY` 是可选。
4. 先检查第 8 行之前的那一行（第 7 行）末尾是否漏了分号，编译器往往在下一行才发现问题。
5. 文件没有执行权限（需要 `chmod +x run.sh`），或者当前用户无权访问该文件或目录。

</details>

---

← [上一节：学会学习与提问](../04-learning-to-learn/) · [返回 零基础入门](../)
