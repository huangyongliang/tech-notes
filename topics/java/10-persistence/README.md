# 持久层 Persistence

> [Java](../) › 持久层

<div class="tn2-quest" data-quest="10" markdown>

<span class="tn2-quest__no">QUEST 10 · 第三章 生态</span>

**目标**

- [ ] 能够用 JDBC 的 `PreparedStatement` 执行参数化查询，并说出为什么要用连接池（HikariCP）。
- [ ] 能够用 MyBatis 编写映射和动态 SQL（`<if>`、`<where>`、`<foreach>`），并区分 `#{}` 与 `${}`。
- [ ] 能够描述 JPA / Hibernate 实体的生命周期状态（瞬时、托管、游离、删除）。
- [ ] 能够识别 N+1 查询问题，并用 fetch join 或 `@EntityGraph` 解决。
- [ ] 能够说明 `@Transactional` 常用传播行为和常见失效场景。

**奖励**：+100 XP · 徽章「事务守门人」（徽章名暂定，内容建设中）

</div>

JDBC 基础与连接池（HikariCP）、MyBatis 映射与动态 SQL、JPA / Hibernate 实体生命周期与 N+1 问题，以及事务（`@Transactional` 传播行为和失效场景）。

## 建议先收的资料

- 官方文档
- SQL / 映射示例
- 事务与性能排障笔记

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 再点下方「标记通关」。

1. 【单选】MyBatis 中能防止 SQL 注入的占位符写法是：
   A. `${}`　B. `#{}`　C. 两者都可以　D. 两者都不行
2. 【简答】什么是 N+1 问题？举一种解决办法。
3. 【单选】希望方法始终在新的独立事务中执行（挂起外层事务），传播行为应设为：
   A. `REQUIRED`　B. `SUPPORTS`　C. `REQUIRES_NEW`　D. `MANDATORY`
4. 【简答】默认情况下，`@Transactional` 方法抛出受检异常时会回滚吗？
5. 【简答】列举两个 `@Transactional` 失效的常见场景。

<details markdown><summary>参考答案</summary>

1. B — `#{}` 走预编译参数绑定，`${}` 是字符串直接拼接。
2. 查 1 次主表得到 N 条记录，再为每条记录各查 1 次关联数据；可用 fetch join、`@EntityGraph` 或批量抓取解决。
3. C — `REQUIRES_NEW` 会挂起当前事务并开启新事务。
4. 不会。默认只对 `RuntimeException` 和 `Error` 回滚，需要时用 `rollbackFor` 指定；Spring 6.2 起也可通过 `@EnableTransactionManagement(rollbackOn = RollbackOn.ALL_EXCEPTIONS)` 全局改为所有异常都回滚。
5. 例如：同类自调用、方法不是 `public`、异常被 catch 后没有抛出、类没有被 Spring 管理（任选两个即可）。

</details>

<div class="tn2-clear" data-quest="10"></div>

---

← [上一节：Spring 框架](../09-spring/) · [返回 Java](../) · [下一节：性能与诊断](../11-performance-diagnostics/) →
