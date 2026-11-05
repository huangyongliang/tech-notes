# 生态与新趋势 Ecosystem & Trends

> [Java](../) › 生态与新趋势

GraalVM Native Image（及 Spring AOT）、Project Valhalla（值类型）、Panama（FFM API，JDK 22 正式发布）、Leyden（启动优化 / AOT 缓存），以及 Amber 带来的语言演进。目标是跟踪方向，不追求深入。

## 闯关任务

**QUEST 12 · 第三章 生态**

- [ ] 能够说明 GraalVM Native Image 的优缺点（启动快、内存小 vs 构建慢、闭合世界假设），以及 Spring AOT 的作用。
- [ ] 能够说出 Project Valhalla 值类型要解决的问题。
- [ ] 能够说出 Panama 的 FFM API（JDK 22 正式发布）用来替代什么，并写出调用本地函数的基本步骤。
- [ ] 能够说明 Project Leyden 的目标（启动优化、AOT 缓存），并和 Native Image 做对比。
- [ ] 能够列举 Project Amber 带来的语言特性（如 `record`、模式匹配）。

**奖励**：+100 XP · 徽章「趋势瞭望员」（徽章名暂定，内容建设中）

## 建议先收的资料

- openjdk.org 项目页
- 相关 JEP
- 官方博客
- 实验性示例代码

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Panama 的 FFM API 主要用来替代：
    - A. JDBC
    - B. JNI
    - C. RMI
    - D. JMX
2. 【简答】为什么 Native Image 下反射、动态代理需要额外配置？Spring AOT 在其中做了什么？
3. 【单选】Project Valhalla 的核心目标是：
    - A. 虚拟线程
    - B. 值类型，让数据「像 class 一样编码，像 int 一样工作」
    - C. 模块系统
    - D. 新的 GC
4. 【简答】Leyden 与 GraalVM Native Image 在优化启动的思路上有什么不同？
5. 【单选】以下哪个特性来自 Project Amber？
    - A. 虚拟线程
    - B. ZGC
    - C. 模式匹配 `switch`
    - D. FFM API

<details markdown><summary>参考答案</summary>

1. B — FFM API 用纯 Java 代码调用本地函数、操作堆外内存，替代 JNI。
2. Native Image 在构建期做闭合世界分析，运行时动态使用的类必须事先声明；Spring AOT 在构建期提前处理 Bean 定义，并生成所需的提示（hints）配置。
3. B — 值类型去掉对象身份，获得更紧凑的内存布局。
4. Leyden 保留 HotSpot JVM 和动态特性，通过提前训练运行生成的 AOT 缓存缩短启动和预热；Native Image 直接编译成独立本地可执行文件。
5. C — 虚拟线程来自 Loom，FFM API 来自 Panama。

</details>

---

← [上一节：性能与诊断](../11-performance-diagnostics/) · [返回 Java](../)
