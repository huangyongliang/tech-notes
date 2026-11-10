# 持久层 {#persistence}

> [Java](../) › 持久层

和存储交换数据时，参数绑定与语句分开。事务是否回滚，看的是 Spring 声明的规则，不是语言是否强迫你声明异常。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[计算机基础 07](../../cs-basics/07-databases/) 写 SQL 和事务的一般事实。本页不另开数据库教程，也不写隔离级别课。[Java 09](../09-spring/) 写代理：同类自调用不经过代理。[Java 03](../03-core-advanced/) 写受检异常与非受检异常的类型层次。回滚规则用的是这份层次，但匹配与否是 Spring 的声明，不是语言强迫你声明的那条规则。[Java 06](../06-jvm/) 写堆和线程私有的栈；实体状态不是那套分区。慢查询和连接泄漏的排障见 [Java 11](../11-performance-diagnostics/)。分库分表见 [微服务 09](../../microservices/09-database-sharding/)。

## 参数和语句分开 {#_2}

JDBC 的 `PreparedStatement` 表示一条预编译的 SQL。参数由 setter 单独绑定，不把输入拼进语句文本。语句可以准备一次、执行多次，也避免把用户输入当成语句结构的一部分。

连接的建立和校验通常比单次查询贵，所以需要复用。连接池做的是这件事。HikariCP 是 Boot 管理的常用实现。池的参数怎么调，不在本页。

MyBatis 的 `#{}` 默认生成 `PreparedStatement` 的占位符，把值安全地设进去。`${}` 是字面替换：MyBatis 不修改、也不转义这段字符串，用在必须拼接的标识符（例如 `ORDER BY` 的列名）上。它不是「不能用」，而是不提供绑定这一层保证。输入若来自外部，安全要由调用方自己保证。`<if>`、`<where>`、`<foreach>` 按条件生成不同的语句。本页不写标签手册。

## 上下文跟踪的是变更 {#lifecycle}

相对一个持久化上下文，实例有明确的状态。Jakarta Persistence 3.2 把它们分成四种。new：还没有持久身份，也还没关联上下文。managed：已有持久身份，并且当前关联着上下文，上下文跟踪它的变化。detached：已有持久身份，但当前没有关联这个上下文。removed：仍关联着上下文，并已标记为在事务提交时从数据库删除。

Hibernate 7.4 的导论相对一个上下文分成 transient、persistent、detached 三种：从未持久化且未关联、当前关联、曾经在别的会话里持久化但当前未关联。removed 是 JPA 单列的第四种，不要把它理解成「对象已经不在堆上」。对象还在不在堆上，是 Java 06 的分界。这里回答的是谁在跟踪变更。

Boot 4.1.x 管理的是 Hibernate 7.4 这一线和 Jakarta Persistence 3.2。Hibernate 8 与 Jakarta Persistence 4.0 在 2026-11-12 仍是开发或 Beta，不是当前默认。Framework 7.0 对某个 JPA 4 里程碑的运行时兼容，也不是「已经默认 JPA 4」。上游 7.4 的更新补丁，不会自动变成 Boot 管理的那一版。补丁号在资料索引。

N+1 是一种取数方式：先查一次主集合，得到 N 条，再为每条各查一次关联，一共 1+N 次。需要关联数据时，应一次性取出，例如 fetch join、实体图或批量抓取。不是「用了 JPA 就必然 N+1」。把关联一律改成立刻加载，可能变成一次过大的连接，不是通用解法。

## 回滚匹配的是声明过的异常 {#tx}

`@Transactional` 的默认传播是 `REQUIRED`：有当前事务就加入，没有就新建。`REQUIRES_NEW` 新建一个事务，若已有事务则先把它挂起。适用条件是这段工作必须单独提交或回滚，不能跟着外层一起走。

默认回滚规则：`RuntimeException` 和 `Error` 触发回滚，受检异常不触发。语言上的受检，只表示调用方必须在签名或捕获处承认它（Java 03）。Spring 默认并不因此回滚。需要受检异常也回滚时，用 `rollbackFor` 指明那些类型。Framework 6.2 起可以在 `@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)` 上把全局默认改成所有异常都回滚。这是可以切换的全局默认，不是 7.0 已经改掉的行为。具体事务上的回滚规则会盖过这个默认。

拦截没有发生，或回滚规则没有匹配，事务就不会按你以为的方式结束。常见情况都回到这两句。同类自调用不经过代理，见 Java 09。基于接口的代理只能拦截接口上的 public 方法；private 方法不在代理的拦截范围里。异常被 catch 之后没有再抛出，回滚规则看不到它。类没有被容器管理，就没有代理可拦截。

## 常见误读 {#_3}

- 「`${}` 不能出现在 MyBatis 里。」它可以做字面替换。它不提供 `#{}` 那层参数绑定。
- 「用了 JPA 就必然 N+1。」N+1 是「一次主查询再按条查关联」。需要关联时一次性取出，不是把所有关联都改成立刻加载。
- 「受检异常会按 Java 的规则自动回滚。」语言只强迫你承认受检异常。Spring 默认不对它回滚，除非 `rollbackFor` 或全局 `RollbackOn` 把它算进去。
- 「Hibernate 8 已经是 Boot 4.1 的默认。」Boot 4.1 管理的是 Hibernate 7.4 与 Jakarta Persistence 3.2。8 与 JPA 4 还不是当前默认。

## 可选核对 {#persistence-check}

绑定和回滚规则已经写在上面。这两问只核对它们。

1. `#{}` 和 `${}` 哪一种提供参数绑定？这和 SQL 注入有什么关系？
2. 默认的 `@Transactional` 在受检异常时会不会回滚？

<details markdown><summary>参考答案</summary>

1. `#{}` 走 `PreparedStatement` 的参数绑定，输入不会变成语句结构。`${}` 是字面替换，不提供这层绑定；外部输入若被拼进去，就可能改变语句结构。
2. 默认不会。Spring 只对 `RuntimeException` 和 `Error` 回滚。受检异常在语言上必须被承认，但这不等于 Spring 回滚。需要时用 `rollbackFor` 指定。

</details>

## 资料索引 {#_4}

- [`PreparedStatement`](https://docs.oracle.com/en/java/javase/25/docs/api/java.sql/java/sql/PreparedStatement.html) — 预编译 SQL，参数单独绑定。JDK 25。
- [HikariCP](https://github.com/brettwooldridge/HikariCP) — JDBC 连接池。Boot 4.1.2 管理的是 7.0.2，见下面的坐标页。本页不写池参数。
- [MyBatis 映射](https://mybatis.org/mybatis-3/sqlmap-xml.html) — `#{}` 生成 `PreparedStatement` 占位符；`${}` 把字符串原样替进语句。
- [Jakarta Persistence 3.2](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2.html) — 第 3.2 节：new、managed、detached、removed。removed 会在事务提交时从数据库删除。
- [Hibernate 7.4 导论：持久化上下文](https://docs.hibernate.org/orm/7.4/introduction/html_single/Hibernate_Introduction.html#persistence-contexts) — 相对一个上下文的 transient、persistent、detached。
- [Hibernate 7.4 导论：实体图](https://docs.hibernate.org/orm/7.4/introduction/html_single/Hibernate_Introduction.html#entity-graph) — 需要关联时可以指定一次性取出的图，而不是默认按条再查。
- [Hibernate ORM 发布页](https://hibernate.org/orm/releases/) — 2026-11-12：稳定线 7.4 的上游最新是 7.4.15.Final（Jakarta Persistence 3.2）。8.0 仍是开发版（Jakarta Persistence 4.0）。Boot 管理的是 7.4.13.Final，不是上游最新补丁，也不是 8.0。
- [`Propagation`](https://docs.spring.io/spring-framework/docs/7.0.10/javadoc-api/org/springframework/transaction/annotation/Propagation.html) — `REQUIRED` 加入当前事务，没有则新建。`REQUIRES_NEW` 新建事务，并挂起已有事务。版本对齐 Boot 4.1.2 管理的 Framework 7.0.10。
- [声明式事务](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html) — 默认只有 `RuntimeException` 和 `Error` 回滚，受检异常不回滚。`rollbackFor` 可以改某次事务。`@EnableTransactionManagement(rollbackOn = ALL_EXCEPTIONS)` 改的是可切换的全局默认。自调用不经过代理。
- [Boot 依赖坐标](https://docs.spring.io/spring-boot/appendix/dependency-versions/coordinates.html) — 2026-11-12：Hibernate 7.4.13.Final、HikariCP 7.0.2、Jakarta Persistence 3.2.0。
- [Java 03](../03-core-advanced/) — 受检异常必须被承认。这不等于 Spring 回滚。
- [Java 09](../09-spring/) — 代理与同类自调用。
- [计算机基础 07](../../cs-basics/07-databases/) — SQL 和事务的一般事实。
- [Java 06](../06-jvm/) — 堆和线程私有存储。实体状态不是这套分区。
- [Java 11](../11-performance-diagnostics/) — 慢查询和连接泄漏的排障。
- [微服务 09](../../microservices/09-database-sharding/) — 分库分表。本页只写单库上的映射和本地事务。

---

← [上一节：Spring 框架](../09-spring/) · [返回 Java](../) · [下一节：性能与诊断](../11-performance-diagnostics/) →
