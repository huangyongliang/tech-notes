/* Java 闯关数据：关卡与 BOSS（仅网站使用；按 topic 分组，便于以后扩展） */
window.TN_QUEST_DATA = {
  levels: [0, 200, 450, 750, 1100, 1650],
  topics: {
    java: {
      chapters: ["语言", "平台", "生态"],
      quests: [
        { id: "java-01", name: "语言基础与新特性", path: "topics/java/01-language-basics/", chapter: 1, xp: 100, badge: "语法新兵", goal: "掌握语言基础与现代 Java 新特性，打下阅读后续笔记的底子。" },
        { id: "java-02", name: "集合框架", path: "topics/java/02-collections/", chapter: 1, xp: 100, badge: "容器大师", goal: "按访问模式在 List / Set / Map / Queue 间选型；说清 HashMap 结构。" },
        { id: "java-03", name: "异常、泛型、反射与注解", path: "topics/java/03-core-advanced/", chapter: 1, xp: 100, badge: "反射术士", goal: "区分受检/非受检；PECS；反射与 MethodHandle；自定义注解。" },
        { id: "java-04", name: "输入输出", path: "topics/java/04-io-nio/", chapter: 1, xp: 100, badge: "管道工", goal: "理清阻塞 IO / NIO 与常见输入输出模型，会选型。" },
        { id: "java-05", name: "并发", path: "topics/java/05-concurrency/", chapter: 2, xp: 100, badge: "线程驯兽师", goal: "happens-before、JUC 工具、线程池参数与拒绝策略。" },
        { id: "java-06", name: "Java 虚拟机", path: "topics/java/06-jvm/", chapter: 2, xp: 100, badge: "字节码考古", goal: "类加载、运行时数据区、GC 基础。" },
        { id: "java-07", name: "构建工具", path: "topics/java/07-build-tools/", chapter: 2, xp: 100, badge: "构建匠人", goal: "Maven / Gradle 生命周期与依赖冲突。" },
        { id: "java-08", name: "测试", path: "topics/java/08-testing/", chapter: 2, xp: 100, badge: "红绿循环", goal: "单测、集成测与测试替身。" },
        { id: "java-09", name: "Spring 框架", path: "topics/java/09-spring/", chapter: 3, xp: 100, badge: "春之学徒", goal: "IoC / AOP、Boot 自动配置与常见扩展点。" },
        { id: "java-10", name: "持久层", path: "topics/java/10-persistence/", chapter: 3, xp: 100, badge: "事务守门人", goal: "持久层、事务与连接池选型。" },
        { id: "java-11", name: "性能与诊断", path: "topics/java/11-performance-diagnostics/", chapter: 3, xp: 100, badge: "火焰图猎人", goal: "性能分析与诊断工具链。" },
        { id: "java-12", name: "生态与新趋势", path: "topics/java/12-ecosystem-trends/", chapter: 3, xp: 100, badge: "趋势瞭望员", goal: "生态与新趋势总览。" }
      ],
      bosses: [
        { id: "java-b1", chapter: 1, name: "章节测验", xp: 150, badge: "语言章通关" },
        { id: "java-b2", chapter: 2, name: "章节测验", xp: 150, badge: "平台章通关" },
        { id: "java-b3", chapter: 3, name: "章节测验", xp: 150, badge: "生态章通关" }
      ],
      /* 探索视图（explore.js）专用的附加数据；其它消费者忽略即可。
         文案里的 {xxx} 占位符由 explore.js 从上面的 quests / bosses / chapters 与当前进度填充，
         关卡名一律不写死在这里：{name:java-02} 关卡名 · {badge:java-02} 徽章 · {ch:1} 章名 ·
         {chquests:1} 本章关卡名串 · {range:1} 关卡号区间 · {boss:1} BOSS 名 · {bossxp:1} · {bossbadge:1} ·
         {progress} 当前进度一句话 · {remain:1} 本章还差什么 · {key} 进度存储键 */
      explore: {
        npcs: [
          { id: "mentor", region: 1, at: "java-01", dx: -96, dy: 70, sprite: "mentor", name: "笔记导师",
            lines: [
              { text: "欢迎来到 Java 笔记世界图，冒险者。点一下地图后，WASD / 方向键移动；点关卡节点会走过去。" },
              { text: "走近关卡会浮出任务卡；走近我们这些 NPC，按 Enter / 空格或点「！」可对话。Tab 也能逐个选中关卡。" },
              { text: "{progress}", choice: [{ label: "这一章学什么？", next: "ch" }, { label: "先不用", next: null }] }
            ],
            branches: { ch: [{ text: "第一章「{ch:1}」：{chquests:1} → {boss:1}。" }] } },
          { id: "librarian", region: 1, at: "java-02", dx: 52, dy: -92, sprite: "lib", name: "图书管理员",
            lines: [
              { text: "「{name:java-02}」书架在这边。List / Set / Map / Queue —— 先想访问模式再选型。" },
              { text: "HashMap 的数组 + 链表 / 红黑树，值得画一张。", choice: [{ label: "这关收什么？", next: "q" }, { label: "谢谢", next: null }] }
            ],
            branches: { q: [{ text: "能按访问模式选型；说清 HashMap 与 equals/hashCode；知道并发集合场景。+100 XP · 徽章「{badge:java-02}」。" }] } },
          { id: "smith", region: 1, at: "java-03", dx: 56, dy: -96, sprite: "smith", name: "编译器工匠",
            lines: [
              { text: "叮当——「{name:java-03}」都在这砧上打。泛型擦除是铁律，PECS 是手感。" },
              { text: "受检/非受检、? extends / ? super、反射与 MethodHandle、自定义注解。", choice: [{ label: "给我一句口诀", next: "tip" }, { label: "先不用", next: null }] }
            ],
            branches: { tip: [{ text: "生产者用 extends，消费者用 super。@Retention 决定运行时能不能摸到注解。徽章「{badge:java-03}」。" }] } },
          { id: "guard", region: 1, at: "java-b1", dx: 118, dy: -70, sprite: "guard", name: "门卫", gate: 2,
            lines: [
              { text: "站住。迷雾那边是第二章「{ch:2}」——从「{name:java-05}」开始。" },
              { text: "解锁条件：通关第一章全部关卡（{range:1}），并完成「CH.1 BOSS · {boss:1}」。{remain:1}", choice: [{ label: "BOSS 是什么？", next: "boss" }, { label: "知道了", next: null }] }
            ],
            branches: { boss: [{ text: "「{boss:1}」综合检验第一章「{ch:1}」。题目建设中；本章关卡全通后，到 BOSS 处标记通过，雾就会散。" }] } },
          { id: "cat", region: 1, at: "java-01", dx: 104, dy: 104, sprite: "cat", name: "流浪猫",
            lines: [
              { text: "喵。进度存在浏览器 localStorage 键 {key} 里，换机器不会跟着走。" },
              { text: "想重来？页面顶部有「重置进度」。别告诉工匠我说过。" }
            ] }
        ]
      }
    }
  }
};
