# 语言基础与新特性 Language Basics

> [Java](../) › 语言基础与新特性

<div class="tn2-quest" data-quest="01" markdown>

<span class="tn2-quest__no">QUEST 01 · 第一章 语言</span>

**目标**

- [ ] 能够用 `record` 定义不可变数据载体，并说出编译器自动生成了哪些成员。
- [ ] 能够用 `sealed` / `permits` 限定继承层次，并配合模式匹配 `switch` 写出无需 `default` 的穷尽分支。
- [ ] 能够使用 `instanceof` 模式匹配、文本块和 `var`，并说出 `var` 的适用限制。
- [ ] 能够用 Stream / Lambda 改写常见的循环过滤、映射和聚合代码。
- [ ] 能够按 LTS 版本线（8 → 11 → 17 → 21 → 25）说出至少 3 个语言特性大致出现在哪个阶段。

**奖励**：+100 XP · 徽章「语法新兵」（徽章名暂定，内容建设中）

</div>

从语法、面向对象、`record`、`sealed`、模式匹配（`switch` / `instanceof`）、文本块，到 `var`、Stream / Lambda，按 LTS 版本（8 → 11 → 17 → 21 → 25）整理语言演进。重点是每个特性解决什么问题，以及惯用写法。

## 建议先收的资料

- 官方语言规范 / Javadoc
- 各版本 JEP 列表
- 版本特性速查表
- 小示例代码

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 再点下方「标记通关」。

1. 【单选】下面哪一项不是编译器为 `record Point(int x, int y)` 自动生成的？
   A. 访问器 `x()`、`y()`　B. `equals` / `hashCode` / `toString`　C. `setX(int)`　D. 规范构造器
2. 【单选】`var` 可以用在哪里？
   A. 类的字段　B. 方法参数　C. 方法内带初始化的局部变量　D. 方法返回类型
3. 【简答】对 `sealed interface Shape permits Circle, Square` 写模式匹配 `switch` 时，为什么可以省略 `default`？
4. 【简答】`if (obj instanceof String s && s.length() > 3)` 相比传统写法省掉了什么？
5. 【单选】以下哪个 LTS 版本首次引入 Lambda 和 Stream API？
   A. JDK 8　B. JDK 11　C. JDK 17　D. JDK 21

<details markdown><summary>参考答案</summary>

1. C — `record` 的字段是 `final` 的，不生成 setter。
2. C — `var` 只用于有初始化表达式的局部变量（以及 `for` 循环变量、Lambda 参数）。
3. 编译器知道 `Shape` 的全部子类型，所有分支都覆盖时 `switch` 已经是穷尽的，新增子类时还会编译报错提醒。
4. 省掉了显式强制转换 `(String) obj` 和单独声明变量这两步。
5. A — Lambda 和 Stream 是 JDK 8 引入的。

</details>

<div class="tn2-clear" data-quest="01"></div>

---

[返回 Java](../) · [下一节：集合框架](../02-collections/) →
