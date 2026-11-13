# 消息与事件驱动 {#messaging-events}

> [微服务](../) › 消息与事件驱动

消息把协作从请求路径上解开之后，常见保证的是至少一次投递；恰好一次通常是近似，顺序只在分区键上成立。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[服务通信](../04-communication/) 写的是同步调用把失败留在请求路径上。本页写时间上解耦的协作：削峰、广播、最终一致。投递、顺序和幂等是这条路径的成立条件。可靠地「先提交再发事件」用 Outbox 或事务消息，细节在 [07](../07-distributed-transactions/)，本页不重写 CDC 或 Seata。领域事件协作建立在 [01](../01-architecture/) 的边界之上，本页不改那一章。

## 投递语义实际保证什么 {#_2}

生产实践中常见的是「至少一次 + 消费者幂等」。至少一次保证的是：消息不会因为瞬时失败而被悄悄丢掉。它同时意味着重复投递是常态，消费者必须可重入或去重。至多一次会丢。恰好一次通常依赖幂等写入、事务性外盒或 broker 事务，成本更高，应写成近似，而不是开一个开关就恰好一次。

## 顺序只在分区键上成立 {#ordering}

<span id="_5"></span>

全局顺序昂贵。按业务键分区，可以获得分区内顺序。原页已有的键是 `employeeId` 和 `deviceId`，保留。需要顺序的消费者应避免多线程并发处理同一分区。单分区既丢吞吐，也不能把「有顺序」理解成「一定安全」。

## 四种中间件是条件 {#broker-roles}

<span id="_6"></span>

- Apache Kafka 4.4.0：高吞吐事件流、回放、流处理入口。
- RocketMQ 5.5.1：国内业务消息、事务消息、延时消息常见。
- RabbitMQ 4.4.0：灵活路由、传统任务队列。
- Apache Pulsar 5.0.1：存算分离、多租户。
- Spring Cloud Stream / Spring for Apache Kafka：Spring 侧绑定抽象，点到为止，不另开操作课。

下面的 YAML 只做了语法解析，没有连接 Kafka。`attendance-projector` 是原页已有的考勤投影示意。

```yaml
spring:
  kafka:
    bootstrap-servers: kafka:9092
    consumer:
      group-id: attendance-projector
      enable-auto-commit: false
```

## 选型表只写稳定线 {#broker-table}

<span id="_7"></span>

| 系统 | 版本基线 | 模型 | 更适场景 |
|------|----------|------|----------|
| Kafka | 4.4.0 | 分布式日志 | 事件流、回放、大数据衔接 |
| RocketMQ | 5.5.1 | 业务消息 | 事务 / 延时、国内生态 |
| RabbitMQ | 4.4.0 | 智能代理队列 | 复杂路由、传统异步任务 |
| Pulsar | 5.0.1 | 存算分离 | 多租户、统一消息与流 |

2026-11-13 打开的页面：Kafka 社区下载页把 4.4.0 列为 Supported releases 的第一条，Released October 22, 2026；同页 4.3.2 是 4.3 维护线，不得因为日期更晚就写成当前主线。Apache 发行目录当日最新系列也是 4.4.0。RocketMQ 官方目录与 GitHub Latest 都是 5.5.1。RabbitMQ Release Information 把 4.4.0 列为 4.4 系列当前补丁（20 Oct 2026）；GitHub 上另有 v4.3.7，是 4.3 维护补丁，官方支持表当日仍写到 4.3.6，正文钉 4.4.0。Pulsar 官方目录与 GitHub Latest 都是 5.0.1（2026-10-26）；4.2.5 与 4.0.14 是并行维护线。

## 发事件要过本地提交这一关 {#outbox-handoff}

「发事件」必须考虑本地提交与消息投递之间的失败窗口。Outbox 和事务消息是常见手段。表结构、SQL 和 CDC 版本以 07 为准。本页不重写 Saga、TCC 或 Seata。

领域事件留在限界上下文内。集成事件面向外部系统，常要更稳定的契约和版本。载荷塞入庞大快照会让演进变困难。事件溯源保存的是状态变化的序列，CQRS 把写模型和读模型分开。二者都不是「上了 Kafka 就自动得到」。

## 常见误读 {#_3}

<span id="_8"></span>

- 「把消息队列当成同步 RPC。」调用方一等消费结果，延迟和失败都回到请求路径上，异步解耦就没了。
- 「至少一次只要关掉重试就安全。」重复投递是常态，消费者必须幂等或去重。
- 「单分区就既有顺序又安全。」单分区丢掉吞吐，顺序也不等于业务安全。
- 「Kafka 4.3.2 或 RabbitMQ 4.3.7 是当前主线。」它们是维护线或维护补丁。主线分别是 4.4.0。
- 「Outbox 的表和 Debezium 版本写在本章。」那些以 07 为准。

## 可选核对 {#messaging-check}

<span id="_9"></span>

投递和顺序已经写在上面。这两问只核对它们。

1. 至少一次投递下，消费者侧最关键的配套是什么？
2. 要保证同一设备的事件顺序，更合理的分区方式是什么？

<details markdown><summary>参考答案</summary>

1. 幂等处理或去重。至少一次意味着重复投递是常态，关掉重试并不能取消已经发出的副本。
2. 以 `deviceId`（或同一业务键，例如 `employeeId`）作为分区键，使相同键进入同一分区，从而得到分区内顺序。需要顺序的消费者不要并发处理这一个分区。

</details>

<span id="_11"></span>

## 资料索引 {#_4}

<span id="_10"></span>

- [Apache Kafka 文档](https://kafka.apache.org/documentation/) — 日志、偏移量与消费语义。
- [Kafka 社区下载页](https://kafka.apache.org/community/downloads/) 与 [Apache 发行目录](https://downloads.apache.org/kafka/) — 2026-11-13：4.4.0 是 Supported releases 的当前主线（October 22, 2026）。4.3.2 是 4.3 维护线。原 `/downloads` 会跳到 `/community/downloads/`。
- [RocketMQ 快速开始](https://rocketmq.apache.org/docs/quick-start/) 与 [官方发行目录](https://downloads.apache.org/rocketmq/) — 稳定线 5.5.1。
- [RabbitMQ 文档](https://www.rabbitmq.com/docs) 与 [Release Information](https://www.rabbitmq.com/release-information) — 4.4.0 是 4.4 系列当前补丁（20 Oct 2026）。4.3.7 是 4.3 维护补丁，不是当前系列。
- [Apache Pulsar 文档门户](https://pulsar.apache.org/docs/next/) — 默认保留这条门户链。版本选择器含 Next、5.0.x、4.2.x、4.0.x LTS 和 3.0.x LTS。Next 不是 nightly 发行目录。稳定线是 5.0.1。
- [微服务 04](../04-communication/) — 同步调用把失败留在请求路径上。
- [微服务 07](../07-distributed-transactions/) — Outbox 与可靠发事件。本页不重写。
- [微服务 01](../01-architecture/) — 领域事件建立在边界之上。

---

← [上一节：容错与流量治理](../05-resilience/) · [返回 微服务](../) · [下一节：分布式事务与一致性](../07-distributed-transactions/) →
