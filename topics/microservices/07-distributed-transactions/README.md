# 分布式事务与一致性 {#distributed-transactions}

> [微服务](../) › 分布式事务与一致性

微服务下放弃强一致，用 Saga、TCC、Outbox 实现最终一致。理论部分链接 [系统](../../systems/)。

## 本关定位

跨服务的「一次业务动作」不能靠单库本地事务收场。本关学会在业务可接受的前提下选 Saga / TCC / Outbox，并理解 Seata 等框架的模式边界，而不是默认 XA 硬扛。

## 闯关任务

- [ ] 能够说明为什么微服务默认追求最终一致而非全局强一致。
- [ ] 能够对比编排式与协同式 Saga，以及补偿失败时的处理。
- [ ] 能够描述 TCC 的 Try / Confirm / Cancel 与空回滚、悬挂问题。
- [ ] 能够实现或讲清 Transactional Outbox + CDC（Debezium）的可靠发事件。
- [ ] 能够说出 Seata AT / TCC / Saga / XA 的大致取舍。

## 知识要点

### 先拆业务，再谈组件

能改成「可异步、可补偿」的流程，就不要强行同步分布式事务。例如：提交请假申请 → 冻结额度（可补偿）→ 通知审批人。

### Outbox

本地事务同时写业务表与 outbox 表，再由轮询或 Debezium 3.7.0.Final CDC 发布到 MQ，避免「提交成功但消息丢失」。下面的 SQL 含省略号，不是可执行脚本，未在数据库运行。

```sql
-- 同一本地事务
insert into leave_request(...);
insert into outbox(aggregate_type, aggregate_id, payload) values (...);
```

### Seata

Apache Seata 2.6.0 提供 AT / TCC / Saga / XA。AT 对业务侵入较低但依赖 undo 日志与锁；TCC 性能与控制力更强但要改业务代码；XA 成本高，慎用。Maven 上这条线的坐标是 `org.apache.seata`（`seata-core` 2.6.0 已核对）；旧坐标 `io.seata` 的发布仍停在 2.0.0，不要只看旧 groupId 的 latest。

## 选型对比

| 模式 | 一致性 | 侵入 | 典型工具 |
|------|--------|------|----------|
| 本地事务 + Outbox | 最终一致 | 低 | Debezium 3.7.0.Final |
| Saga（编排 / 协同） | 最终一致 | 中 | 自研 / Seata Saga |
| TCC | 最终一致（可资源预留） | 高 | Seata TCC |
| XA / 2PC | 近似强一致 | 中高 | Seata XA（代价大，慎用） |

## 常见误区

- 所有跨服务调用套 Seata AT，无视锁冲突与长事务。
- 补偿动作不可幂等，重试后状态错乱。
- 只发消息不写 outbox，进程崩溃丢事件。
- 用分布式事务掩盖错误的服务边界。

## 实践任务

- [ ] 设计「申请资源 → 审批 → 生效 / 回滚」的 Saga 状态机（含补偿）。
- [ ] 实现最小 Outbox：同库两表 + 定时发布（或 Debezium 文档走读）。
- [ ] 列出三种不可补偿操作，并给出业务替代方案（人工工单 / 预留号段等）。

## 资料索引

- [Microservices.io 模式目录](https://microservices.io/patterns/) — Saga / Outbox 等
- [Seata 文档：何为 Seata](https://seata.apache.org/docs/overview/what-is-seata/) — 模式总览
- [Debezium 稳定版文档](https://debezium.io/documentation/reference/stable/) — CDC
- [Debezium Maven 元数据](https://repo1.maven.org/maven2/io/debezium/debezium-core/maven-metadata.xml) — 版本核对（Final）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Transactional Outbox 主要解决：
    - A. UI 换肤
    - B. 业务库提交与发消息之间的原子性近似
    - C. 替代所有数据库索引
    - D. 仅用于前端埋点
2. 【单选】TCC 中 Confirm 阶段的典型含义是：
    - A. 预留资源
    - B. 确认提交预留
    - C. 仅打印日志
    - D. 删除数据库
3. 【简答】Saga 补偿失败时通常怎么处理？
4. 【单选】Seata AT 模式相对 TCC 的特点更接近：
    - A. 业务代码改动通常更少，但依赖代理数据源与 undo
    - B. 完全不写日志
    - C. 只能用于前端
    - D. 不支持回滚
5. 【简答】为什么「先发消息再提交 DB」容易出问题？

<details markdown><summary>参考答案</summary>

1. B — 同事务落库，异步可靠投递。
2. B — Try 预留，Confirm 确认，Cancel 释放。
3. 重试补偿（幂等）、转入人工处理 / 对账、告警；需可观测的状态机。
4. A — AT 侵入较低，依赖 undo 与锁机制。
5. 消息已出但本地事务回滚，下游看到不存在的业务事实。

</details>

---

← [上一节：消息与事件驱动](../06-messaging/) · [返回 微服务](../) · [下一节：缓存](../08-caching/) →
