# 分布式事务与一致性 {#distributed-transactions}

> [微服务](../) › 分布式事务与一致性

跨服务的一次业务动作，默认追求最终一致：Outbox 收的是本地提交和发事件之间的窗口，Saga 与 TCC 收的是可补偿流程，不是默认 XA。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[架构基础与拆分](../01-architecture/) 已经要求先有稳定边界。用分布式事务掩盖错误的边界，解决不了模型耦合。[消息与事件驱动](../06-messaging/) 已经说明至少一次投递需要幂等，并且事件必须可靠发出。本页回答：一次跨越多个服务的业务动作，在放弃全局强一致之后，用什么手段得到可接受的最终一致。CAP、一致性与共识以 [系统](../../systems/) 为准，本页不重讲。分库分表、路由和分布式 ID 在 [09](../09-database-sharding/)，本页不展开。

## 先拆业务，再谈组件 {#_2}

能改成可异步、可补偿的流程，就不要强行同步分布式事务。原页的抽象例子保留：提交请假申请，然后冻结额度（可补偿），再通知审批人。不要把这个例子扩成公司故事。

## Outbox 保证的是本地提交与发事件 {#outbox}

本地事务同时写业务表和 outbox 表，再由轮询或 CDC 发布到消息队列。这样避免「提交成功但消息丢失」，也避免「先发消息再提交、消息已出但本地回滚」。它保证的是本地提交与「将要发出的事件」之间的近似原子性。它不保证下游已经处理成功。那仍要靠 06 的至少一次加幂等，以及事后对账。

CDC 的当前稳定线是 **Debezium 3.7.1.Final**。2026-11-13 打开的 [Releases](https://debezium.io/releases/) 写明 Latest stable 是 3.7.1.Final，Development 是 **3.8.0.Alpha1**。稳定文档在 [reference/stable](https://debezium.io/documentation/reference/stable/)，指向 3.7 线。Maven `io.debezium:debezium-core` 的 `latest` / `release` 当日指向 3.8.0.Alpha1（`lastUpdated` 2026-11-10），不得写成当前默认。主题首页的版本表本批不改，那里本来也没有 Debezium 的补丁号。

下面的 SQL 含省略号，不是可执行脚本，未在数据库运行。

```sql
-- 同一本地事务
insert into leave_request(...);
insert into outbox(aggregate_type, aggregate_id, payload) values (...);
```

## Saga 与 TCC 要可补偿 {#saga-tcc}

编排式 Saga 由中心协调器推进。协同式 Saga 由各参与方靠事件推进。补偿必须幂等。补偿失败时，重试、转入人工或对账，并告警。需要可观测的状态机，而不是自动再开一笔 XA。

TCC 的 Try 预留资源，Confirm 确认提交，Cancel 释放。空回滚和悬挂是这类协议要处理的边界，不是只背三个字母。

## Seata 的模式是条件 {#seata}

Apache Seata **2.6.0** 是当前稳定线。2026-11-13 打开的 Maven `org.apache.seata:seata-core`，`latest` 与 `release` 都是 2.6.0，`lastUpdated` 为 2026-02-10。官方文档版本选择器当前是 v2.6。GitHub Latest 亦为 v2.6.0（2026-01-28）。不得把 GitHub 上的 **v2.7.0** 写成已交付：发行页标为预发布，名称是 Apache Seata (Incubating) 2.7.0 (RC Round4)，发布于 2026-10-14。

官方站点把项目写成 Apache Seata (incubating)。这是孵化事实，不要写成「还不能用」，也不要把 incubating 和 2.7 的 RC 混成一句「尚未 GA」。2.6.0 已经交付。旧坐标 `io.seata:seata-core` 的 `latest` / `release` 仍停在 **2.0.0**（`lastUpdated` 2023-11-20），不要只看旧 groupId 的 latest。

AT 对业务侵入较低，但依赖 undo 日志和锁。TCC 控制力更强，但要改业务代码。Saga 适合长流程补偿。XA / 2PC 近似强一致，成本高，慎用。不要默认所有跨服务调用都套 AT。

## 四种模式各自把一致性放在哪 {#tx-choice}

<span id="_5"></span>

| 模式 | 一致性 | 侵入 | 典型工具 |
|------|--------|------|----------|
| 本地事务 + Outbox | 最终一致 | 低 | Debezium 3.7.1.Final |
| Saga（编排 / 协同） | 最终一致 | 中 | 自研 / Seata Saga |
| TCC | 最终一致（可资源预留） | 高 | Seata TCC |
| XA / 2PC | 近似强一致 | 中高 | Seata XA（代价大，慎用） |

## 常见误读 {#_3}

<span id="_6"></span>

- 「所有跨服务调用都套 Seata AT。」长事务和锁冲突不会因此消失。
- 「补偿失败就再开一笔 XA。」补偿要幂等，失败后转入重试、对账或人工，并告警。
- 「只发消息、不写 outbox，进程崩溃也不会丢事件。」本地提交和发消息之间仍有失败窗口。
- 「Debezium 的 Maven `latest` 就是当前默认。」它指向 3.8.0.Alpha1。稳定线是 3.7.1.Final。
- 「`io.seata` 的 latest 或 2.7 RC 是当前稳定线。」旧坐标停在 2.0.0。2.7.0 是 RC Round4。稳定线是 `org.apache.seata` 2.6.0。
- 「用分布式事务就能补回划错的服务边界。」边界错了，事务组件补不回来。

## 可选核对 {#tx-check}

<span id="_7"></span>

失败窗口和补偿已经写在上面。这两问只核对它们。

1. Transactional Outbox 主要解决哪一个失败窗口？
2. 为什么「先发消息再提交数据库」容易出问题？

<details markdown><summary>参考答案</summary>

1. 它把业务表和 outbox 放进同一个本地事务，使本地提交和「将要发出的事件」近似原子。它不保证下游已经处理成功，也不替代数据库。
2. 消息已经发出，本地事务却回滚。下游会看到一笔并不存在的业务事实。

</details>

<span id="_9"></span>

## 资料索引 {#_4}

<span id="_8"></span>

- [Microservices.io 模式目录](https://microservices.io/patterns/) — Saga 与 Outbox 的条件。
- [Seata：何为 Seata](https://seata.apache.org/docs/overview/what-is-seata/) — 2026-11-13 文档当前是 v2.6。页上写明 Apache Seata (incubating)。2.6.0 已交付。v2.7.0 是 RC Round4，不是默认。`io.seata:seata-core` 的 `latest` / `release` 仍是 2.0.0。
- [Debezium 稳定版文档](https://debezium.io/documentation/reference/stable/) — 指向 3.7 线。
- [Debezium Releases](https://debezium.io/releases/) 与 [Maven 元数据](https://repo1.maven.org/maven2/io/debezium/debezium-core/maven-metadata.xml) — Latest stable 是 3.7.1.Final。`latest` / `release` 指向 3.8.0.Alpha1（`lastUpdated` 2026-11-10），不是默认。
- [系统](../../systems/) — CAP 与共识。本页不重讲。
- [微服务 01](../01-architecture/) — 错误的边界补不回来。
- [微服务 06](../06-messaging/) — 至少一次与幂等。本页不重写投递语义。
- [微服务 09](../09-database-sharding/) — 数据分区不在本页。

---

← [上一节：消息与事件驱动](../06-messaging/) · [返回 微服务](../) · [下一节：缓存](../08-caching/) →
