/* 闯关数据：按 topic 分组（java / basics）；levels 共用。
 * 进度只存本浏览器 localStorage（tn-quest-v2），不发任何网络请求。
 * explore.npcs 占位符：{name:id} {badge:id} {ch:n} {chquests:n} {range:n}
 * {boss:n} {bossxp:n} {bossbadge:n} {progress} {remain:n} {key}
 */
window.TN_QUEST_DATA = {
  levels: [
    0,
    200,
    450,
    750,
    1100,
    1650
  ],
  topics: {
    java: {
      chapters: [
        "语言",
        "平台",
        "生态"
      ],
      quests: [
        {"id":"java-01","name":"语言基础与新特性","path":"topics/java/01-language-basics/","chapter":1,"xp":100,"badge":"语法新兵","goal":"掌握语言基础与现代 Java 新特性，打下阅读后续笔记的底子。"},
        {"id":"java-02","name":"集合框架","path":"topics/java/02-collections/","chapter":1,"xp":100,"badge":"容器大师","goal":"按访问模式在 List / Set / Map / Queue 间选型；说清 HashMap 结构。"},
        {"id":"java-03","name":"异常、泛型、反射与注解","path":"topics/java/03-core-advanced/","chapter":1,"xp":100,"badge":"反射术士","goal":"区分受检/非受检；PECS；反射与 MethodHandle；自定义注解。"},
        {"id":"java-04","name":"输入输出","path":"topics/java/04-io-nio/","chapter":1,"xp":100,"badge":"管道工","goal":"理清阻塞 IO / NIO 与常见输入输出模型，会选型。"},
        {"id":"java-05","name":"并发","path":"topics/java/05-concurrency/","chapter":2,"xp":100,"badge":"线程驯兽师","goal":"happens-before、JUC 工具、线程池参数与拒绝策略。"},
        {"id":"java-06","name":"Java 虚拟机","path":"topics/java/06-jvm/","chapter":2,"xp":100,"badge":"字节码考古","goal":"类加载、运行时数据区、GC 基础。"},
        {"id":"java-07","name":"构建工具","path":"topics/java/07-build-tools/","chapter":2,"xp":100,"badge":"构建匠人","goal":"Maven / Gradle 生命周期与依赖冲突。"},
        {"id":"java-08","name":"测试","path":"topics/java/08-testing/","chapter":2,"xp":100,"badge":"红绿循环","goal":"单测、集成测与测试替身。"},
        {"id":"java-09","name":"Spring 框架","path":"topics/java/09-spring/","chapter":3,"xp":100,"badge":"春之学徒","goal":"IoC / AOP、Boot 自动配置与常见扩展点。"},
        {"id":"java-10","name":"持久层","path":"topics/java/10-persistence/","chapter":3,"xp":100,"badge":"事务守门人","goal":"持久层、事务与连接池选型。"},
        {"id":"java-11","name":"性能与诊断","path":"topics/java/11-performance-diagnostics/","chapter":3,"xp":100,"badge":"火焰图猎人","goal":"性能分析与诊断工具链。"},
        {"id":"java-12","name":"生态与新趋势","path":"topics/java/12-ecosystem-trends/","chapter":3,"xp":100,"badge":"趋势瞭望员","goal":"生态与新趋势总览。"}
      ],
      bosses: [
        {"id":"java-b1","chapter":1,"name":"章节测验","xp":150,"badge":"语言章通关"},
        {"id":"java-b2","chapter":2,"name":"章节测验","xp":150,"badge":"平台章通关"},
        {"id":"java-b3","chapter":3,"name":"章节测验","xp":150,"badge":"生态章通关"}
      ],
      explore: {
        npcs: [
          {"id":"mentor","region":1,"at":"java-01","dx":-96,"dy":70,"sprite":"mentor","name":"笔记导师","lines":[{"text":"欢迎来到 Java 笔记世界图，冒险者。点一下地图后，WASD / 方向键移动；点关卡节点会走过去。"},{"text":"走近关卡会浮出任务卡；走近我们这些 NPC，按 Enter / 空格或点「！」可对话。Tab 也能逐个选中关卡。"},{"text":"{progress}","choice":[{"label":"这一章学什么？","next":"ch"},{"label":"先不用","next":null}]}],"branches":{"ch":[{"text":"第一章「{ch:1}」：{chquests:1} → {boss:1}。"}]}},
          {"id":"librarian","region":1,"at":"java-02","dx":52,"dy":-92,"sprite":"lib","name":"图书管理员","lines":[{"text":"「{name:java-02}」书架在这边。List / Set / Map / Queue —— 先想访问模式再选型。"},{"text":"HashMap 的数组 + 链表 / 红黑树，值得画一张。","choice":[{"label":"这关收什么？","next":"q"},{"label":"谢谢","next":null}]}],"branches":{"q":[{"text":"能按访问模式选型；说清 HashMap 与 equals/hashCode；知道并发集合场景。+100 XP · 徽章「{badge:java-02}」。"}]}},
          {"id":"smith","region":1,"at":"java-03","dx":56,"dy":-96,"sprite":"smith","name":"编译器工匠","lines":[{"text":"叮当——「{name:java-03}」都在这砧上打。泛型擦除是铁律，PECS 是手感。"},{"text":"受检/非受检、? extends / ? super、反射与 MethodHandle、自定义注解。","choice":[{"label":"给我一句口诀","next":"tip"},{"label":"先不用","next":null}]}],"branches":{"tip":[{"text":"生产者用 extends，消费者用 super。@Retention 决定运行时能不能摸到注解。徽章「{badge:java-03}」。"}]}},
          {"id":"guard","region":1,"at":"java-b1","dx":118,"dy":-70,"sprite":"guard","name":"门卫","gate":2,"lines":[{"text":"站住。迷雾那边是第二章「{ch:2}」——从「{name:java-05}」开始。"},{"text":"解锁条件：通关第一章全部关卡（{range:1}），并完成「CH.1 BOSS · {boss:1}」。{remain:1}","choice":[{"label":"BOSS 是什么？","next":"boss"},{"label":"知道了","next":null}]}],"branches":{"boss":[{"text":"「{boss:1}」综合检验第一章「{ch:1}」。题目建设中；本章关卡全通后，到 BOSS 处标记通过，雾就会散。"}]}},
          {"id":"cat","region":1,"at":"java-01","dx":104,"dy":104,"sprite":"cat","name":"流浪猫","lines":[{"text":"喵。进度存在浏览器 localStorage 键 {key} 里，换机器不会跟着走。"},{"text":"想重来？页面顶部有「重置进度」。别告诉工匠我说过。"}]}
        ]
      }
    },
    basics: {
      chapters: [
        "零基础入门",
        "计算机基础",
        "编程入门"
      ],
      quests: [
        {"id":"gs-01","name":"认识计算机","path":"topics/getting-started/01-what-is-a-computer/","chapter":1,"xp":100,"badge":"硬件地图师（暂定）","goal":"硬件、软件、二进制与存储单位：计算机是什么、各部分做什么。"},
        {"id":"gs-02","name":"用好电脑","path":"topics/getting-started/02-using-a-computer/","chapter":1,"xp":100,"badge":"键鼠行者（暂定）","goal":"键盘与打字、操作系统界面、文件与目录、安装软件与常用快捷键。"},
        {"id":"gs-03","name":"互联网常识","path":"topics/getting-started/03-internet-basics/","chapter":1,"xp":100,"badge":"网民学徒（暂定）","goal":"IP、域名、浏览器、HTTP / HTTPS、账号安全与密码管理。"},
        {"id":"gs-04","name":"学会学习与提问","path":"topics/getting-started/04-learning-to-learn/","chapter":1,"xp":100,"badge":"提问旅人（暂定）","goal":"费曼学习法、间隔重复、做笔记、搜索技巧与「提问的智慧」。"},
        {"id":"gs-05","name":"技术英语","path":"topics/getting-started/05-tech-english/","chapter":1,"xp":100,"badge":"术语译者（暂定）","goal":"常见术语、读报错信息、读官方文档的方法。"},
        {"id":"cs-01","name":"计算机组成","path":"topics/cs-basics/01-computer-organization/","chapter":2,"xp":100,"badge":"比特工匠（暂定）","goal":"数的表示、CPU 与指令、存储层次：程序如何在机器上跑起来。"},
        {"id":"cs-02","name":"操作系统","path":"topics/cs-basics/02-operating-systems/","chapter":2,"xp":100,"badge":"进程守望（暂定）","goal":"进程与线程、调度、虚拟内存、文件系统与并发基础。"},
        {"id":"cs-03","name":"Linux 与 Shell","path":"topics/cs-basics/03-linux-shell/","chapter":2,"xp":100,"badge":"Shell 旅人（暂定）","goal":"终端、常用命令、管道与重定向、权限、环境变量与简单脚本。"},
        {"id":"cs-04","name":"Git 版本控制","path":"topics/cs-basics/04-git/","chapter":2,"xp":100,"badge":"版本行者（暂定）","goal":"工作区与暂存区、提交、分支、合并、远程仓库与 Pull Request。"},
        {"id":"cs-05","name":"计算机网络","path":"topics/cs-basics/05-networking/","chapter":2,"xp":100,"badge":"网络信使（暂定）","goal":"分层模型、IP、TCP / UDP、DNS、HTTP / HTTPS。"},
        {"id":"cs-06","name":"数据结构与算法","path":"topics/cs-basics/06-data-structures-algorithms/","chapter":2,"xp":100,"badge":"结构炼金（暂定）","goal":"复杂度、线性结构、哈希、树、图、排序与查找；练习用 C 实现。"},
        {"id":"cs-07","name":"数据库基础","path":"topics/cs-basics/07-databases/","chapter":2,"xp":100,"badge":"表海舵手（暂定）","goal":"关系模型、SQL、索引与事务入门。"},
        {"id":"pb-01","name":"第一门语言 C 与环境","path":"topics/programming-basics/01-first-language-c/","chapter":3,"xp":100,"badge":"Hello 工匠（暂定）","goal":"为什么选 C；安装 gcc / clang、编辑器；预处理→编译→汇编→链接；用 `-std=c23` 指定语言标准（需要 GCC 14、Clang 18 及以上；更早的版本写 `-std=c2x`）。"},
        {"id":"pb-02","name":"核心概念","path":"topics/programming-basics/02-core-concepts/","chapter":3,"xp":100,"badge":"类型学徒（暂定）","goal":"类型与 sizeof、运算与类型转换、控制流、函数与作用域、存储期、指针入门、头文件与多文件程序。"},
        {"id":"pb-03","name":"内存与数据","path":"topics/programming-basics/03-memory-and-data/","chapter":3,"xp":100,"badge":"内存矿工（暂定）","goal":"数组、指针运算、字符串与 string.h、struct、栈与堆、malloc / free、动态数组与链表。"},
        {"id":"pb-04","name":"工具、调试与测试","path":"topics/programming-basics/04-tools-debugging/","chapter":3,"xp":100,"badge":"调试猎人（暂定）","goal":"编译警告、gdb、Valgrind / AddressSanitizer、make 与 Makefile、assert 测试。"},
        {"id":"pb-05","name":"问题求解","path":"topics/programming-basics/05-problem-solving/","chapter":3,"xp":100,"badge":"求解剑士（暂定）","goal":"拆解问题、写伪代码；用 C 实现栈、队列、哈希表、排序和查找。"},
        {"id":"pb-06","name":"C 小项目","path":"topics/programming-basics/06-small-projects/","chapter":3,"xp":100,"badge":"小作坊主（暂定）","goal":"用 C 写命令行工具：读写文件、处理命令行参数，多文件 + Makefile。"}
      ],
      bosses: [
        {"id":"gs-b1","chapter":1,"name":"章节测验","xp":150,"badge":"零基础章通关（暂定）"},
        {"id":"cs-b1","chapter":2,"name":"章节测验","xp":150,"badge":"计算机基础章通关（暂定）"},
        {"id":"pb-b1","chapter":3,"name":"章节测验","xp":150,"badge":"编程入门章通关（暂定）"}
      ],
      explore: {
        npcs: [
          {"id":"mentor","region":1,"at":"gs-01","dx":-96,"dy":70,"sprite":"mentor","name":"笔记导师","lines":[{"text":"欢迎来到基础大陆，冒险者。点一下地图后，WASD / 方向键移动；点关卡节点会走过去。"},{"text":"走近关卡会浮出任务卡；走近我们这些 NPC，按 Enter / 空格或点「！」可对话。Tab 也能逐个选中关卡。"},{"text":"{progress}","choice":[{"label":"这一章学什么？","next":"ch"},{"label":"先不用","next":null}]}],"branches":{"ch":[{"text":"第一章「{ch:1}」：{chquests:1} → {boss:1}。"}]}},
          {"id":"librarian","region":1,"at":"gs-02","dx":52,"dy":-92,"sprite":"lib","name":"图书管理员","lines":[{"text":"「{name:gs-02}」书架在这边。键盘、文件、安装软件——先把日常工具摸熟。"},{"text":"绝对路径和相对路径分清了，后面进终端不会晕。","choice":[{"label":"这关收什么？","next":"q"},{"label":"谢谢","next":null}]}],"branches":{"q":[{"text":"盲打与快捷键、路径与扩展名、官方渠道装软件。+100 XP · 徽章「{badge:gs-02}」。"}]}},
          {"id":"smith","region":1,"at":"gs-03","dx":56,"dy":-96,"sprite":"smith","name":"编译器工匠","lines":[{"text":"叮当——「{name:gs-03}」把网址拆开看：协议、域名、路径、查询参数。"},{"text":"HTTPS 的锁能保证什么、不能保证什么，值得记一句。","choice":[{"label":"给我一句口诀","next":"tip"},{"label":"先不用","next":null}]}],"branches":{"tip":[{"text":"IP 找机器，DNS 找名字，HTTPS 加密信道。徽章「{badge:gs-03}」。"}]}},
          {"id":"guard","region":1,"at":"gs-b1","dx":118,"dy":-70,"sprite":"guard","name":"门卫","gate":2,"lines":[{"text":"站住。迷雾那边是第二章「{ch:2}」——从「{name:cs-01}」开始。"},{"text":"解锁条件：通关第一章全部关卡（{range:1}），并完成「CH.1 BOSS · {boss:1}」。{remain:1}","choice":[{"label":"BOSS 是什么？","next":"boss"},{"label":"知道了","next":null}]}],"branches":{"boss":[{"text":"「{boss:1}」综合检验第一章「{ch:1}」。题目建设中；本章关卡全通后，到 BOSS 处标记通过，雾就会散。"}]}},
          {"id":"cat","region":1,"at":"gs-01","dx":104,"dy":104,"sprite":"cat","name":"流浪猫","lines":[{"text":"喵。进度存在浏览器 localStorage 键 {key} 里，换机器不会跟着走。"},{"text":"想重来？页面顶部有「重置进度」。别告诉工匠我说过。"}]}
        ]
      }
    }
  }
};
