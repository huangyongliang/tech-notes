/* Java 闯关数据：关卡与 BOSS（仅网站使用；按 topic 分组，便于以后扩展） */
window.TN_QUEST_DATA = {
  levels: [0, 200, 450, 750, 1100, 1650],
  topics: {
    java: {
      chapters: ["语言", "平台", "生态"],
      quests: [
        { id: "java-01", name: "语言基础与新特性", path: "topics/java/01-language-basics/", chapter: 1, xp: 100, badge: "语法新兵" },
        { id: "java-02", name: "集合框架", path: "topics/java/02-collections/", chapter: 1, xp: 100, badge: "容器大师" },
        { id: "java-03", name: "异常、泛型、反射与注解", path: "topics/java/03-core-advanced/", chapter: 1, xp: 100, badge: "反射术士" },
        { id: "java-04", name: "输入输出", path: "topics/java/04-io-nio/", chapter: 1, xp: 100, badge: "管道工" },
        { id: "java-05", name: "并发", path: "topics/java/05-concurrency/", chapter: 2, xp: 100, badge: "线程驯兽师" },
        { id: "java-06", name: "Java 虚拟机", path: "topics/java/06-jvm/", chapter: 2, xp: 100, badge: "字节码考古" },
        { id: "java-07", name: "构建工具", path: "topics/java/07-build-tools/", chapter: 2, xp: 100, badge: "构建匠人" },
        { id: "java-08", name: "测试", path: "topics/java/08-testing/", chapter: 2, xp: 100, badge: "红绿循环" },
        { id: "java-09", name: "Spring 框架", path: "topics/java/09-spring/", chapter: 3, xp: 100, badge: "春之学徒" },
        { id: "java-10", name: "持久层", path: "topics/java/10-persistence/", chapter: 3, xp: 100, badge: "事务守门人" },
        { id: "java-11", name: "性能与诊断", path: "topics/java/11-performance-diagnostics/", chapter: 3, xp: 100, badge: "火焰图猎人" },
        { id: "java-12", name: "生态与新趋势", path: "topics/java/12-ecosystem-trends/", chapter: 3, xp: 100, badge: "趋势瞭望员" }
      ],
      bosses: [
        { id: "java-b1", chapter: 1, name: "章节测验", xp: 150, badge: "语言章通关" },
        { id: "java-b2", chapter: 2, name: "章节测验", xp: 150, badge: "平台章通关" },
        { id: "java-b3", chapter: 3, name: "章节测验", xp: 150, badge: "生态章通关" }
      ]
    }
  }
};
