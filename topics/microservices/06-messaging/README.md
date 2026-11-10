# 消息与事件驱动 {#messaging-events}

> [微服务](../) › 消息与事件驱动

异步解耦、事件驱动架构、事件溯源与 CQRS。重点是投递语义、顺序与幂等。

## 本关定位

消息把同步扇出变成时间上解耦的协作：削峰、广播、最终一致。本关抓住投递语义（at-most / at-least / exactly-once 近似）、顺序、幂等与选型，不把 MQ 当成远程函数调用的替代品滥用。

## 闯关任务

- [ ] 能够说明队列与日志型（Kafka）模型的差异及适用场景。
- [ ] 能够解释至少一次投递下消费者幂等的必要性。
- [ ] 能够对比 Kafka、RocketMQ、RabbitMQ、Pulsar 的典型定位。
- [ ] 能够描述 Outbox / 事务消息在「发事件」场景的作用（与第 07 章衔接）。
- [ ] 能够指出分区键与顺序消费的关系。

## 知识要点

### 投递语义

生产实践中常见的是「至少一次 + 消费者幂等」。恰好一次通常依赖幂等写入、事务性外盒或 broker 事务，成本更高。

### 顺序

全局顺序昂贵；按业务键（如 `employeeId`、`deviceId`）分区可获得分区内顺序。需要顺序的消费者应避免多线程并发同一分区。

### 选型速记

- Apache Kafka 4.4.0：高吞吐事件流、回放、流处理入口。
- RocketMQ 5.5.1：国内业务消息、事务消息、延时消息常见。
- RabbitMQ 4.4.0：灵活路由、传统任务队列。
- Apache Pulsar 5.0.1：存算分离、多租户。
- Spring Cloud Stream / Spring for Apache Kafka：Spring 侧绑定抽象。

下面的 YAML 只做了语法解析，没有连接 Kafka。

```yaml
spring:
  kafka:
    bootstrap-servers: kafka:9092
    consumer:
      group-id: attendance-projector
      enable-auto-commit: false
```

## 选型对比

| 系统 | 版本基线 | 模型 | 更适场景 |
|------|----------|------|----------|
| Kafka | 4.4.0 | 分布式日志 | 事件流、回放、大数据衔接 |
| RocketMQ | 5.5.1 | 业务消息 | 事务 / 延时、国内生态 |
| RabbitMQ | 4.4.0 | 智能代理队列 | 复杂路由、传统异步任务 |
| Pulsar | 5.0.1 | 存算分离 | 多租户、统一消息与流 |

## 常见误区

- 把 MQ 当 RPC：同步等待消费结果。
- 无幂等却开启自动重试，造成重复副作用。
- 所有主题单分区，既丢吞吐又误以为「有顺序就安全」。
- 事件载荷塞入庞大快照，导致版本演进困难（应事件通知 + 查询）。

## 实践任务

- [ ] 实现一个至少一次消费：手动提交 offset，失败重试，用业务幂等键去重。
- [ ] 设计三个主题（命令 / 领域事件 / 集成事件）的命名与保留策略草案。
- [ ] 对比同一业务用同步 REST 与异步事件的延迟与耦合差异（文字即可）。

## 资料索引

- [Apache Kafka 文档](https://kafka.apache.org/documentation/) — 架构与语义
- [RocketMQ 快速开始](https://rocketmq.apache.org/docs/quick-start/) — 官方入门
- [RabbitMQ 文档](https://www.rabbitmq.com/docs) — 队列与路由
- [Apache Pulsar 文档](https://pulsar.apache.org/docs/next/) — 概念与架构
- [Apache Kafka 下载目录](https://downloads.apache.org/kafka/) — 发行版版本核对（含 4.4.0）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】至少一次投递下，消费者侧最关键的配套是：
    - A. 关闭所有监控
    - B. 幂等处理或去重
    - C. 取消分区
    - D. 只用 HTTP
2. 【单选】要保证同一设备的遥测事件顺序，更合理的是：
    - A. 随机分区
    - B. 以 deviceId 作为分区键
    - C. 单线程写所有主题到同一大文件且无副本
    - D. 禁用 ACK
3. 【简答】为什么不建议用消息队列模拟同步 RPC？
4. 【单选】Kafka 更贴近的存储抽象是：
    - A. 仅内存阻塞队列
    - B. 可回放的分布式提交日志
    - C. 仅关系表
    - D. 仅本地 HashMap
5. 【简答】领域事件与集成事件可以如何区分？

<details markdown><summary>参考答案</summary>

1. B — 重复投递是常态，必须幂等。
2. B — 相同键进入同一分区以获得分区内顺序。
3. 增加延迟与失败模式，超时与补偿更难；调用方线程被阻塞，失去异步解耦收益。
4. B — 按偏移量保留与回放。
5. 领域事件服务内 / 限界上下文内语义；集成事件面向外部系统，常需更稳定的契约与版本策略。

</details>

---

← [上一节：容错与流量治理](../05-resilience/) · [返回 微服务](../) · [下一节：分布式事务与一致性](../07-distributed-transactions/) →
