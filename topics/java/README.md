# Java 技术栈 Java Stack

Java 语言、JVM 和主流生态（Spring、持久层、构建与测试）的学习笔记。以最新 LTS（JDK 25）为基准，兼顾 8 / 11 / 17 / 21 的差异，按学习顺序排列，也可以当速查手册用。

> 相关主题：[编程 Programming](../programming/) · [Web](../web/) · [系统 Systems](../systems/) · [微服务 Microservices](../microservices/)

## 闯关地图

三章十二关，每章末尾一个 BOSS 章节测验（BOSS 题目内容建设中，读完本章 4 关后可手动标记通过）。点任意关卡进入；进度只保存在本浏览器。

<div class="tn2-qmap">
<div class="tn2-qchap tn2-qchap--1">
<p class="tn2-qchap__head"><span>§ 01</span> 第一章 · 语言 <em>关卡 01–04</em></p>
<div class="tn2-qrow">
<a class="tn2-qnode" data-q="01" href="01-language-basics/"><span class="tn2-qnode__dot">01</span><span class="tn2-qnode__lab"><b>QUEST 01</b>语言基础与新特性</span></a>
<a class="tn2-qnode" data-q="02" href="02-collections/"><span class="tn2-qnode__dot">02</span><span class="tn2-qnode__lab"><b>QUEST 02</b>集合框架</span></a>
<a class="tn2-qnode" data-q="03" href="03-core-advanced/"><span class="tn2-qnode__dot">03</span><span class="tn2-qnode__lab"><b>QUEST 03</b>异常、泛型、反射与注解</span></a>
<a class="tn2-qnode" data-q="04" href="04-io-nio/"><span class="tn2-qnode__dot">04</span><span class="tn2-qnode__lab"><b>QUEST 04</b>输入输出</span></a>
<a class="tn2-qnode tn2-qnode--boss" data-boss="1" href="#"><span class="tn2-qnode__dot">BOSS</span><span class="tn2-qnode__lab"><b>CH.1 BOSS</b>章节测验</span></a>
</div>
</div>
<div class="tn2-qchap tn2-qchap--2">
<p class="tn2-qchap__head"><span>§ 02</span> 第二章 · 平台 <em>关卡 05–08</em></p>
<div class="tn2-qrow">
<a class="tn2-qnode" data-q="05" href="05-concurrency/"><span class="tn2-qnode__dot">05</span><span class="tn2-qnode__lab"><b>QUEST 05</b>并发</span></a>
<a class="tn2-qnode" data-q="06" href="06-jvm/"><span class="tn2-qnode__dot">06</span><span class="tn2-qnode__lab"><b>QUEST 06</b>Java 虚拟机</span></a>
<a class="tn2-qnode" data-q="07" href="07-build-tools/"><span class="tn2-qnode__dot">07</span><span class="tn2-qnode__lab"><b>QUEST 07</b>构建工具</span></a>
<a class="tn2-qnode" data-q="08" href="08-testing/"><span class="tn2-qnode__dot">08</span><span class="tn2-qnode__lab"><b>QUEST 08</b>测试</span></a>
<a class="tn2-qnode tn2-qnode--boss" data-boss="2" href="#"><span class="tn2-qnode__dot">BOSS</span><span class="tn2-qnode__lab"><b>CH.2 BOSS</b>章节测验</span></a>
</div>
</div>
<div class="tn2-qchap tn2-qchap--3">
<p class="tn2-qchap__head"><span>§ 03</span> 第三章 · 生态 <em>关卡 09–12</em></p>
<div class="tn2-qrow">
<a class="tn2-qnode" data-q="09" href="09-spring/"><span class="tn2-qnode__dot">09</span><span class="tn2-qnode__lab"><b>QUEST 09</b>Spring 框架</span></a>
<a class="tn2-qnode" data-q="10" href="10-persistence/"><span class="tn2-qnode__dot">10</span><span class="tn2-qnode__lab"><b>QUEST 10</b>持久层</span></a>
<a class="tn2-qnode" data-q="11" href="11-performance-diagnostics/"><span class="tn2-qnode__dot">11</span><span class="tn2-qnode__lab"><b>QUEST 11</b>性能与诊断</span></a>
<a class="tn2-qnode" data-q="12" href="12-ecosystem-trends/"><span class="tn2-qnode__dot">12</span><span class="tn2-qnode__lab"><b>QUEST 12</b>生态与新趋势</span></a>
<a class="tn2-qnode tn2-qnode--boss" data-boss="3" href="#"><span class="tn2-qnode__dot">BOSS</span><span class="tn2-qnode__lab"><b>CH.3 BOSS</b>章节测验</span></a>
</div>
</div>
</div>

## 子目录

| # | 子目录 | 内容 | 状态 |
|---|--------|------|------|
| 01 | [语言基础与新特性 Language Basics](01-language-basics/) | 语法与新特性（8 → 11 → 17 → 21 → 25 LTS） | ⚪ |
| 02 | [集合框架 Collections](02-collections/) | 集合框架与选型 | ⚪ |
| 03 | [异常、泛型、反射与注解 Core Advanced](03-core-advanced/) | 异常、泛型、反射、注解 | ⚪ |
| 04 | [输入输出 IO & NIO](04-io-nio/) | IO / NIO / NIO.2 / HttpClient | ⚪ |
| 05 | [并发 Concurrency](05-concurrency/) | 并发、线程池、虚拟线程 | ⚪ |
| 06 | [Java 虚拟机 JVM](06-jvm/) | 内存模型、GC、类加载、调优工具 | ⚪ |
| 07 | [构建工具 Build Tools](07-build-tools/) | Maven / Gradle | ⚪ |
| 08 | [测试 Testing](08-testing/) | JUnit 5 / Mockito / Testcontainers | ⚪ |
| 09 | [Spring 框架 Spring](09-spring/) | Spring Framework / Boot / Cloud | ⚪ |
| 10 | [持久层 Persistence](10-persistence/) | JDBC / MyBatis / JPA / 事务 | ⚪ |
| 11 | [性能与诊断 Performance & Diagnostics](11-performance-diagnostics/) | 性能分析与线上排障 | ⚪ |
| 12 | [生态与新趋势 Ecosystem & Trends](12-ecosystem-trends/) | GraalVM、Valhalla、Panama、Leyden | ⚪ |

🟢 已完成 · 🟡 搭建中 · ⚪ 待开始

## 版本基线（2026-11）

> [!WARNING]
> 版本信息有时效，更新时同时改这里的日期。

- JDK：最新 LTS 为 JDK 25；最新功能版本为 JDK 27
- Spring Boot：4.1.x（最新 GA 4.1.2）；Boot 4.0 起基于 Spring Framework 7.0、Spring Security 7.0、Jackson 3.0
- Spring Cloud：2025.1.4（Oakwood），适配 Boot 4.0.x 和 4.1.x（从 2025.1.2 起支持 4.1.x）

## 资料索引

<!-- - [标题](链接) — 一句话说明 -->
