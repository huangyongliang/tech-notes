# 集合框架 Collections

> [Java](../) › 集合框架

<div class="tn2-quest" data-quest="02" markdown>

<span class="tn2-quest__no">QUEST 02 · 第一章 语言</span>

**目标**

- [ ] 能够按访问模式（随机访问、去重、键值查找、FIFO / 优先级）在 List / Set / Map / Queue 的常见实现之间做选型。
- [ ] 能够说明 `HashMap` 的数组 + 链表 / 红黑树结构、扩容机制，以及 `equals` / `hashCode` 必须一致的原因。
- [ ] 能够说出 `ConcurrentHashMap`、`CopyOnWriteArrayList` 等并发集合的适用场景。
- [ ] 能够使用 Sequenced Collections（JDK 21）的 `getFirst()`、`getLast()`、`reversed()` 等方法。
- [ ] 能够给出常见集合操作的时间复杂度对比表。

**奖励**：+100 XP · 徽章「容器大师」（徽章名暂定，内容建设中）

</div>

List / Set / Map / Queue 的实现与选型，`HashMap` 原理、并发集合，以及 Sequenced Collections（JDK 21）等新 API。适合整理成对比表。

## 建议先收的资料

- Javadoc
- 实现源码阅读笔记
- 复杂度速查表
- 面试笔记

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 再点下方「标记通关」。

1. 【单选】需要按插入顺序遍历、且按键快速查找，首选：
   A. `HashMap`　B. `TreeMap`　C. `LinkedHashMap`　D. `Hashtable`
2. 【简答】自定义类作为 `HashMap` 的键，只重写 `equals` 不重写 `hashCode` 会有什么后果？
3. 【单选】读多写极少、遍历时不希望抛 `ConcurrentModificationException` 的列表，适合：
   A. `ArrayList`　B. `LinkedList`　C. `CopyOnWriteArrayList`　D. `Vector`
4. 【简答】JDK 21 引入 Sequenced Collections 主要解决了什么不一致问题？
5. 【单选】`ArrayList` 按下标 `get(i)` 的时间复杂度是：
   A. O(1)　B. O(log n)　C. O(n)　D. O(n log n)

<details markdown><summary>参考答案</summary>

1. C — `LinkedHashMap` 维护插入顺序，同时保留哈希查找性能。
2. 两个相等的对象可能落到不同的桶里，导致 `get` 找不到、出现重复键。
3. C — 写时复制，迭代基于快照，适合读多写少。
4. 以前取首尾元素、反向遍历在 `List`、`Deque`、`LinkedHashSet` 等类型上写法各不相同，现在有了统一接口和方法。
5. A — 底层是数组，按下标直接访问。

</details>

<div class="tn2-clear" data-quest="02"></div>

---

← [上一节：语言基础与新特性](../01-language-basics/) · [返回 Java](../) · [下一节：异常、泛型、反射与注解](../03-core-advanced/) →
