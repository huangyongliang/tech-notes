# 数据库与分库分表 {#database-sharding}

> [微服务](../) › 数据库与分库分表

每服务一库保证的是数据所有权与独立演进，不是跨库还能 join；分片只在分片键与主要访问路径对齐时，才把写和存储分开。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[架构基础与拆分](../01-architecture/) 已经要求先有稳定边界。[分布式事务与一致性](../07-distributed-transactions/) 处理跨服务写路径上的最终一致，[缓存](../08-caching/) 处理读路径加速。本页处理数据本身：谁拥有它，单库撑不住时怎么扩读、怎么扩写。ORM 映射、`@Transactional` 和隔离级别回链 [Java 10](../../java/10-persistence/)，本页不重写。一致性模型与共识回链 [系统 · 分布式系统模型](../../systems/distributed/)。跨片事务只回指 07 的 Saga / Outbox。热点读回指 08。

## 每服务一库保证的是所有权 {#_2}

服务通过 API 或事件共享数据，不直接连对方的表。这样 schema 才能独立演进、独立扩容。代价是跨服务查询不能再靠 join：报表和复杂关联走只读副本、数仓，或 CQRS 读模型。读模型若靠事件来建，衔接在 [消息与事件驱动](../06-messaging/) 和 07，本页不重写。

「每服务一库」指的是逻辑所有权，不是每个服务必须独占一台数据库实例。共用实例、但不共用 schema 和表、并且只能经 API 访问，也满足这条。共用一个 schema「图省事」，违反的正是所有权。

## 读写分离只扩读 {#read-replica}

主库写、副本读，扩大的是读吞吐。成立条件是业务能接受复制延迟：刚写完就要读到自己的写入（read-your-writes）时，这条路径要回到主库，或等复制追上。它不解决写容量瓶颈，也不解决跨库事务。写仍然集中在主库。

## 分片键决定什么 {#shard-key}

<span id="_5"></span>

分片把一张表按分片键拆到多个库或表，写和存储才能水平扩展。分片键应选高频等值查询字段，例如租户 ID、资源 ID。会倾斜的字段、会改值的字段，不适合当键：按姓氏分片，或按状态字段分片，数据会堆在少数分片上，键一变还要搬家。

路由跟着分片键走。应用或代理用分片键算出目标库表，请求才有唯一去处。按非分片键查询没有这条路由，会变成散射查询：每个分片都要问一遍。缓解是为那条访问路径建二次索引表、交给搜索引擎、谨慎使用广播查询，或干脆禁止该路径。跨片事务尽量在建模时避开，或改成 Saga；写法回指 07。

下面仍用原页的 `ticket` 表示例，只说明路由，不展开成工单系统。片段使用自定义标签 `!SHARDING`，普通 YAML 解析器无法构造它；未在 ShardingSphere 上加载。

```yaml
# ShardingSphere 逻辑示意（简化）
rules:
  - !SHARDING
    tables:
      ticket:
        actualDataNodes: ds_${0..3}.ticket_${0..7}
        tableStrategy:
          standard:
            shardingColumn: ticket_id
            shardingAlgorithmName: ticket-hash
```

## 分布式 ID {#distributed-id}

分片之后不能再依赖单库自增。常见做法有三种。号段由数据库一次发一段，应用在段内递增。雪花类把时间戳、机器号和序列拼成一个数。UUID 不依赖中心发号；[RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html) 的 UUIDv7 把 Unix 毫秒时间戳放在高位，因此是时间有序的，比完全随机的 UUID 更适合做索引键。

雪花类成立的前提是时钟单调，并且机器号不重复。时间回拨会把新 ID 排到旧 ID 前面，机器号耗尽或撞号会让不同节点发出同一个 ID。本页只写这些条件，不推荐具体开源发号器，也不给出实现。

## 扩容与迁移 {#resharding}

从 N 个库扩到 2N 个库，一般按五步走：双写或 CDC 同步，数据校验，灰度切读，切写，下线旧路由。从 4 库到 8 库也是这五步，不是另一套仪式。每一步都要能回退、能对账。校验没过就不要切写。CDC 的采集回指 07 里的 Debezium，本页不重写连接器。

## 版本线怎么读（2026-11） {#2026-11}

- MySQL：`mysql-9.7.4`（9.7.x 为 LTS 线，官方 yum 源可见 `mysql-9.7-lts-community`）；`mysql-8.4.13` 仍在 8.4 LTS；自 2026 年 7 月的 26.7.0 起，Innovation 与之后的新 LTS 改用日历版本 `YY.M.P`（26=2026 年，7=7 月，末位是补丁号），9.7 是最后一条顺序编号的发布线；当前 Innovation 为 26.10.0，8.4 / 9.7 两条 LTS 沿用原编号。2026-11-13 的 [MySQL Server tags](https://github.com/mysql/mysql-server/tags) 仍可见 `mysql-26.10.0`、`mysql-9.7.4`（Oct 20, 2026）、`mysql-8.4.13`（Sep 30, 2026）。[26.7 手册](https://dev.mysql.com/doc/refman/26.7/en/mysql-releases.html) 从本机出口仍是 403，日历版本这句沿用原页，没有从该手册新增细节。
- PostgreSQL 当前补丁是 **18.7**。[版本政策](https://www.postgresql.org/support/versioning/) 表里 18 的 Current minor 是 18.7。[首页](https://www.postgresql.org/) 写明 2026-11-12 发布 18.7，同时发布的 **19 RC 2** 不是默认。
- Apache ShardingSphere **5.5.3**。下载页版本列表首项、GitHub Latest 和 Maven `shardingsphere-jdbc` 的 `latest` / `release` 都是 5.5.3（2026-02-28）。
- TiDB **8.5.8**（8.5 LTS）。[发布时间线](https://docs.pingcap.com/tidb/stable/release-timeline/) 首行是 7.5.8（2026-09-17），其次才是 8.5.8（2026-08-27）：按日期最新不等于目标 LTS 线。GitHub `releases/latest` 仍指向 **v7.5.8**，因为这条旧 LTS 补丁的发布时间更晚。另有标签 `v9.0.0-beta.1`（2025-03-31），名字是 beta，不是已交付的默认。

## 两条扩写路线是条件 {#db-choice}

<span id="_6"></span>

| 方案 | 版本基线 | 它实际换到什么 | 更适场景 |
|------|----------|----------------|----------|
| 单库 + 读写分离 | MySQL 9.7.4 LTS / PostgreSQL 18.7 | 只扩展读 | 中等规模，写不是瓶颈 |
| ShardingSphere | 5.5.3 | JDBC / Proxy 分片，保留 MySQL 协议和运维习惯 | 能接受分片键和路由规则成为应用的一部分 |
| TiDB | 8.5.8 LTS | 分布式 SQL，业务少写分片代码 | 能接受另一套运维和 SQL 兼容面 |

这三行是适用条件，不是产品擂台。单库加读写分离不扩写。ShardingSphere 把路由留在应用或代理里。TiDB 把分片从业务代码里拿开，运维和 SQL 兼容面换了一套。

## 常见误读 {#_3}

<span id="_7"></span>

- 「每服务一库就是每台机器一个实例。」共用实例可以，共用 schema 和表不行。
- 「拆开服务之后仍共用一个 schema，只是图省事。」省掉的是独立演进。
- 「读写分离把写也扩出去了。」写还在主库，跨库事务也不在这条路径上。
- 「按姓氏或状态字段分片，只要分了就均匀。」倾斜和改值都会让路由失效。
- 「非分片键查询只是慢一点。」它会散射到所有分片。
- 「雪花类 ID 只要接上就唯一。」时钟回拨或机器号撞车都会破坏它。
- 「GitHub Latest 的 v7.5.8 就是 TiDB 当前主线。」它是另一条 LTS 的补丁。`v9.0.0-beta.1` 和 PostgreSQL 19 RC 2 都不是默认。

## 可选核对 {#sharding-check}

<span id="_8"></span>

所有权和分片条件已经写在上面。这两问只核对它们。

1. 分片后按非分片键查询会遇到什么，怎么缓解？
2. 读写分离不能解决什么？

<details markdown><summary>参考答案</summary>

1. 会变成散射查询，每个分片都要问一遍。可以按这条访问路径建二次索引表、交给搜索引擎、谨慎使用广播查询，或禁止该路径。
2. 它只扩读。写容量瓶颈和跨库事务都还在。刚写完就要读到自己的写入时，还得回到主库，或等复制追上。

</details>

<span id="_10"></span>

## 资料索引 {#_4}

<span id="_9"></span>

- [ShardingSphere 文档总览](https://shardingsphere.apache.org/document/current/en/overview/) — 分片与 JDBC / Proxy。下载页版本列表首项是 5.5.3。
- [MySQL Releases: Innovation and LTS（26.7 手册）](https://dev.mysql.com/doc/refman/26.7/en/mysql-releases.html) — 日历版本 `YY.M.P` 与 LTS / Innovation。2026-11-13 本机出口 403，正文沿用原句。
- [MySQL Server tags](https://github.com/mysql/mysql-server/tags) — 2026-11-13 可见 `mysql-26.10.0`、`mysql-9.7.4`（Oct 20, 2026）、`mysql-8.4.13`（Sep 30, 2026）。
- [PostgreSQL 版本政策](https://www.postgresql.org/support/versioning/) — 18 的 Current minor 是 18.7。
- [PostgreSQL 18 文档](https://www.postgresql.org/docs/18/index.html) — 大版本 18。首页同日公告里的 19 RC 2 不是默认。
- [TiDB 稳定版文档](https://docs.pingcap.com/tidb/stable/) 与 [发布时间线](https://docs.pingcap.com/tidb/stable/release-timeline/) — 时间线首行 7.5.8（2026-09-17），其次 8.5.8（2026-08-27）。GitHub `releases/latest` 是 v7.5.8。
- [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562.html) — UUIDv7 把 Unix 毫秒时间戳放在高 48 位。
- [Java 10](../../java/10-persistence/) — 单库映射和本地事务。本页不重写。
- [微服务 07](../07-distributed-transactions/) — 跨片事务与 CDC。
- [微服务 08](../08-caching/) — 热点读。
- [系统 · 分布式系统模型](../../systems/distributed/) — 一致性模型。本页不重讲。

---

← [上一节：缓存](../08-caching/) · [返回 微服务](../) · [下一节：可观测性](../10-observability/) →
