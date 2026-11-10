---
title: 首页
hide:
  - navigation
  - toc
---

<div class="tn2-hero" markdown>

<div class="tn2-hero__text" markdown>

<span class="tn2-kicker">TECH-NOTES / 技术笔记 / v2026.11</span>

# 学过的东西，<br>都<mark>落成文档</mark>。

一份公开的工程笔记本：按技术栈整理链接、短笔记和学习记录。不追热点，只记真正弄懂的东西。

[从零开始 →](topics/roadmap/README.md){ .tn2-btn .tn2-btn--solid }
[已会编程？从 Java 开始](topics/java/README.md){ .tn2-btn }
[全部主题](topics/README.md){ .tn2-btn }

</div>

<div class="tn2-term">
<div class="tn2-term__bar"><i></i><i></i><i></i><span>~/tech-notes</span></div>
<pre><code><b>$</b> tree -L 1 topics/
topics/
├── <em>roadmap/</em> <s># 0 个子主题 · 搭建中</s>
├── <em>getting-started/</em> <s># 5 个子主题 · 搭建中</s>
├── <em>cs-basics/</em> <s># 7 个子主题 · 搭建中</s>
├── <em>cs-theory/</em> <s># 14 个子主题 · 搭建中</s>
├── <em>programming-basics/</em> <s># 6 个子主题 · 搭建中</s>
├── <em>java/</em> <s># 12 个子主题 · 搭建中</s>
├── <em>microservices/</em> <s># 16 个子主题 · 搭建中</s>
├── <em>ai/</em> <s># 21 个子主题 · 搭建中</s>
├── <em>programming/</em> <s># 4 个子主题 · 搭建中</s>
├── <em>web/</em> <s># 1 个子主题 · 搭建中</s>
├── <em>systems/</em> <s># 1 个子主题 · 搭建中</s>
├── <em>devops/</em> <s># 4 个子主题 · 搭建中</s>
└── <em>product-research/</em> <s># 0 个子主题 · 待开始</s>

<b>$</b> cat java/README.md | head -1
# Java 技术栈
<b>$</b> <span class="tn2-caret"></span></code></pre>
</div>

</div>

<div class="tn2-ticker" aria-label="关键词">
<span>JDK 25 LTS</span><span>Spring Boot 4.1</span><span>Virtual Threads</span><span>GraalVM</span><span>Spring Cloud 2025.1</span><span>JUnit 5</span><span>Testcontainers</span><span>Valhalla</span>
</div>

<section class="tn2-sec" markdown>

<div class="tn2-head" markdown>
<span>§ 01</span>

## 为什么值得看

</div>

<p class="tn2-lede">三个理由，决定要不要花时间在这里。</p>

<div class="tn2-why" markdown>

<div markdown>
<span class="k">LTS</span>

**跟进最新 LTS**

以 JDK 25 / Spring Boot 4.1 / Spring Cloud 2025.1 为基线，兼顾 8 / 11 / 17 / 21 的差异，版本信息标注更新日期。
</div>

<div markdown>
<span class="k">01 → 12</span>

**按学习顺序编号**

Java 12 个子主题、微服务 16 个子主题都按先后编号，后一节建立在前一节上，可以从头读到尾。
</div>

<div markdown>
<span class="k">/ SEARCH</span>

**也能当速查手册**

每个主题一张子目录表加资料索引，按 <kbd>/</kbd> 唤出站内搜索，遇到问题直接跳到对应编号。
</div>

</div>

</section>

<section class="tn2-sec" markdown>

<div class="tn2-head" markdown>
<span>§ 02</span>

## 从这里开始

</div>

<p class="tn2-lede">完全零基础从学习路线开始；已经会编程的从 Java 开始，再进阶微服务与 AI。</p>

<div class="tn2-start" markdown>

<div class="tn2-card tn2-card--main" markdown>

<span class="tn2-tag">START HERE · QUEST MAP</span>

### Java 技术栈 {#java-java-stack}

Java 语言、JVM 和主流生态的学习笔记，12 关分三章，每章末尾一个 BOSS 章节测验。

<div class="tn2-qmini">
<div class="tn2-qmini__ch"><b>01–04</b><strong>语言</strong><div class="tn2-qmini__path"><a data-q="01" href="topics/java/01-language-basics/" title="QUEST 01 语言基础与新特性">01</a><a data-q="02" href="topics/java/02-collections/" title="QUEST 02 集合框架">02</a><a data-q="03" href="topics/java/03-core-advanced/" title="QUEST 03 异常、泛型、反射与注解">03</a><a data-q="04" href="topics/java/04-io-nio/" title="QUEST 04 输入输出">04</a><span class="tn2-qmini__boss" data-boss="1" title="章节测验">B</span></div></div>
<div class="tn2-qmini__ch"><b>05–08</b><strong>平台</strong><div class="tn2-qmini__path"><a data-q="05" href="topics/java/05-concurrency/" title="QUEST 05 并发">05</a><a data-q="06" href="topics/java/06-jvm/" title="QUEST 06 Java 虚拟机">06</a><a data-q="07" href="topics/java/07-build-tools/" title="QUEST 07 构建工具">07</a><a data-q="08" href="topics/java/08-testing/" title="QUEST 08 测试">08</a><span class="tn2-qmini__boss" data-boss="2" title="章节测验">B</span></div></div>
<div class="tn2-qmini__ch"><b>09–12</b><strong>生态</strong><div class="tn2-qmini__path"><a data-q="09" href="topics/java/09-spring/" title="QUEST 09 Spring 框架">09</a><a data-q="10" href="topics/java/10-persistence/" title="QUEST 10 持久层">10</a><a data-q="11" href="topics/java/11-performance-diagnostics/" title="QUEST 11 性能与诊断">11</a><a data-q="12" href="topics/java/12-ecosystem-trends/" title="QUEST 12 生态与新趋势">12</a><span class="tn2-qmini__boss" data-boss="3" title="章节测验">B</span></div></div>
</div>

<p class="tn2-qprog">12 关 · 3 个 BOSS · 从 QUEST 01 语言基础与新特性开始</p>

<p class="tn2-qcta"><a class="tn2-btn tn2-btn--solid tn2-continue" href="topics/java/01-language-basics/">开始闯关 →</a> <a class="tn2-btn" href="topics/java/">看闯关地图</a></p>

</div>

<div class="tn2-card tn2-card--next" markdown>

<span class="tn2-tag tn2-tag--ghost">NEXT · 02</span>

### 学完进阶：微服务 {#microservices}

16 个子主题，从架构拆分、服务治理、可观测性到云原生 Java，原理语言中立，以 Java / Spring 实现。

<div class="tn2-mini">
<span>入门</span><span>进阶</span><span>生产</span>
</div>

<p class="tn2-cap">前 3 节预览</p>

<div class="tn2-peek" markdown>

[<span>01</span>架构基础与拆分](topics/microservices/01-architecture/README.md)
[<span>02</span>API 网关](topics/microservices/02-api-gateway/README.md)
[<span>03</span>注册发现与配置](topics/microservices/03-discovery-config/README.md)

</div>

[看全部 16 个子主题 →](topics/microservices/README.md){ .tn2-btn }

</div>

</div>

</section>

<section class="tn2-sec" markdown>

<div class="tn2-head" markdown>
<span>§ 03</span>

## 全部主题

</div>

<p class="tn2-lede">整个笔记本的目录。高亮的正在搭建，灰色的还没开始。</p>

<p class="tn-status">编辑状态是待开始、搭建中、已完成。翻译是已译、部分、未译。本机已学进度只在这台浏览器里，清掉记录不会改变编辑状态。</p>

<div class="tn2-index" markdown>

[<span class="n">00</span><span class="t">学习路线</span><span class="d">从零到 AI · 六个阶段总览 · 0 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/roadmap/README.md)

[<span class="n">01</span><span class="t">零基础入门</span><span class="d">电脑 · 网络 · 自学方法，5 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">已译</span></span>](topics/getting-started/README.md)

[<span class="n">02</span><span class="t">计算机基础</span><span class="d">组成 · OS · Linux · Git · 网络 · DSA · 数据库 · 7 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/cs-basics/README.md)

[<span class="n">03</span><span class="t">理论基础</span><span class="d">数理逻辑 · 图论 · 计算理论，14 个子主题，只在网站</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/cs-theory/README.md)

[<span class="n">04</span><span class="t">编程入门</span><span class="d">第一门语言 C，6 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/programming-basics/README.md)

[<span class="n">05</span><span class="t">Java 技术栈</span><span class="d">语言 · JVM · 并发 · Spring，12 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/java/README.md)

[<span class="n">06</span><span class="t">微服务</span><span class="d">架构拆分 · 服务治理 · 可观测性 · 云原生 Java，16 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/microservices/README.md)

[<span class="n">07</span><span class="t">AI 技术栈</span><span class="d">大模型 · RAG · Agent · MCP · 推理部署，21 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/ai/README.md)

[<span class="n">08</span><span class="t">编程</span><span class="d">语言定义了什么（语法、语义、类型、求值与内存）; 不建算法/设计模式目录 · 4 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/programming/README.md)

[<span class="n">09</span><span class="t">Web</span><span class="d">浏览器里的源；前端与后端仍空 · 1 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/web/README.md)

[<span class="n">10</span><span class="t">系统</span><span class="d">分布式模型；单机 OS 与 SQL 仍在计算机基础 · 1 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/systems/README.md)

[<span class="n">11</span><span class="t">DevOps</span><span class="d">流水线保证什么（可重复、来源、晋级门禁、回滚与审计）; 不建容器/云/可观测目录 · 4 个子主题</span><span class="s-pair"><span class="s s--wip">搭建中</span><span class="s s--tr">未译</span></span>](topics/devops/README.md)

[<span class="n">12</span><span class="t">产品调研</span><span class="d">产品、竞品、技术选型 · 0 个子主题</span><span class="s-pair"><span class="s">待开始</span><span class="s s--tr">未译</span></span>](topics/product-research/README.md){ .tn2-todo }

</div>

</section>

<section class="tn2-sec" markdown>

<div class="tn2-head" markdown>
<span>§ 04</span>

## 这些笔记怎么来的

</div>

<p class="tn2-lede">每篇笔记都走同一条流水线：先收集，再归类，最后沉淀。</p>

<div class="tn2-flow" markdown>

<div markdown>
<span class="k">IN</span>

**收集**

新链接、想法先丢进 [Inbox](topics/inbox/README.md)，不求整齐。
</div>

<div markdown>
<span class="k">SORT</span>

**归类**

定期整理进对应主题，更新「资料索引」。
</div>

<div markdown>
<span class="k">OUT</span>

**沉淀**

真正弄懂的，写成一篇[笔记](notes/README.md)。
</div>

</div>

</section>

<section class="tn2-sec tn2-sec--cta" markdown>

<div class="tn2-cta" markdown>

<div class="tn2-cta__text">
<span class="tn2-cta__label">§ 05 · 开始</span>
<p class="tn2-cta__title">从 Java 01 开始，一节一节读下去。</p>
</div>

<div class="tn2-cta__btns" markdown>

[开始读 →](topics/java/README.md){ .tn2-btn .tn2-btn--solid }
[在 GitHub 上看](https://github.com/huangyongliang/tech-notes){ .tn2-btn .tn2-btn--light }

</div>

</div>

</section>
