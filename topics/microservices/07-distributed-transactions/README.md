# 分布式事务与一致性 Distributed Transactions

> [微服务](../) › 分布式事务与一致性

微服务下放弃强一致，用 Saga、TCC、Outbox 实现最终一致。理论部分链接 [系统 Systems](../../systems/)。

## 主流选型

- Apache Seata 2.6.0（AT / TCC / Saga / XA）
- Transactional Outbox + Debezium 3.7.0.Final CDC

## 建议先收的资料

- microservices.io Saga / Outbox 模式
- Seata 文档
- 幂等与对账实践

## 资料索引

- [Microservices.io 模式目录](https://microservices.io/patterns/) — 含 Saga / Outbox 等模式
- [Debezium Maven 元数据](https://repo1.maven.org/maven2/io/debezium/debezium-core/maven-metadata.xml) — Debezium 版本核对

---

← [上一节：消息与事件驱动](../06-messaging/) · [返回 微服务](../) · [下一节：缓存](../08-caching/) →
