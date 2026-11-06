# 数据库与分库分表 Database & Sharding

> [微服务](../) › 数据库与分库分表

每服务一库原则、读写分离、分库分表与分布式 ID。ORM 用法链接 [持久层 Persistence](../../java/10-persistence/)。

## 本关定位

数据是微服务里最难拆的部分。本关掌握「每服务一库」、读写分离与分片策略，以及何时该上分布式数据库（如 TiDB），而不是一上来万能中间件。

## 闯关任务

- [ ] 能够说明 Database per Service 的收益与跨库查询代价。
- [ ] 能够设计分片键，并解释热点与跨片事务问题。
- [ ] 能够对比应用层分片（ShardingSphere）与分布式数据库（TiDB）路线。
- [ ] 能够说出 MySQL LTS / Innovation 版本线与 PostgreSQL 大版本基线。
- [ ] 能够描述数据迁移与双写 / 校验的基本步骤。

## 知识要点

### 每服务一库

服务通过 API 或事件共享数据，而不是直接连对方表。报表与复杂关联可走只读副本、数据仓库或 CQRS 读模型。

### 版本基线（2026-11 复核）

- MySQL：`mysql-9.7.4`（9.7.x 为 LTS 线，官方 yum 源可见 `mysql-9.7-lts-community`）；`mysql-8.4.13` 仍在 8.4 LTS；自 2026 年 7 月的 26.7.0 起，Innovation 与之后的新 LTS 改用日历版本 `YY.M.P`（26=2026 年，7=7 月，末位是补丁号），9.7 是最后一条顺序编号的发布线；当前 Innovation 为 26.10.0，8.4 / 9.7 两条 LTS 沿用原编号。
- PostgreSQL 18.6（大版本 18）。
- Apache ShardingSphere 5.5.3。
- TiDB 8.5.8（8.5 LTS）。注意：GitHub `releases/latest` 可能指向其他维护线（如 v7.5.8），需按 LTS 线交叉核对。

### 分片键

选高频等值查询字段（如租户 ID、资源 ID）。避免用会倾斜的状态字段。跨片事务尽量转化为 Saga 或避免。下面的片段使用 ShardingSphere 自定义标签 `!SHARDING`，普通 YAML 解析器无法构造它；未在 ShardingSphere 上加载。

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

## 选型对比

| 方案 | 版本基线 | 思路 | 更适场景 |
|------|----------|------|----------|
| 单库 + 读写分离 | MySQL 9.7.4 LTS / PG 18.6 | 垂直扩展读 | 中等规模 |
| ShardingSphere | 5.5.3 | 代理 / JDBC 分片 | 需保留 MySQL 协议与运维习惯 |
| TiDB | 8.5.8 LTS | 分布式 SQL | 需要水平扩展且想减少业务分片代码 |

## 常见误区

- 按用户姓氏等不稳定字段分片。
- 服务拆分了仍共用一个 schema「图省事」。
- 忽视分布式 ID（时间回拨、机器号耗尽）。
- 把 GitHub Latest 的旧 LTS 补丁当成当前主推版本。

## 实践任务

- [ ] 为「工单」表选择分片键并写出路由规则与查询约束清单。
- [ ] 规划一次扩容：从 4 库到 8 库的双写 / 校验 / 切流步骤。
- [ ] 对比同一需求用 ShardingSphere 与 TiDB 的运维与 SQL 兼容差异（文档走读）。

## 资料索引

- [ShardingSphere 文档总览](https://shardingsphere.apache.org/document/current/en/overview/) — 分片与生态
- [MySQL Releases: Innovation and LTS（26.7 手册）](https://dev.mysql.com/doc/refman/26.7/en/mysql-releases.html) — 官方说明日历版本 YY.M.P 与 LTS / Innovation 规则
- [MySQL Server tags](https://github.com/mysql/mysql-server/tags) — `mysql-9.7.4` / `mysql-8.4.13` / `mysql-26.10.0` 版本核对（dev.mysql.com 文档 CDN 在部分出口会 403）
- [PostgreSQL 版本政策](https://www.postgresql.org/support/versioning/) — 大版本支持周期
- [PostgreSQL 18 文档](https://www.postgresql.org/docs/18/index.html) — 官方文档
- [TiDB 稳定版文档](https://docs.pingcap.com/tidb/stable/) — 分布式 SQL
- [TiDB 发布时间线](https://docs.pingcap.com/tidb/stable/release-timeline/) — LTS 线核对

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Database per Service 的主要动机是：
    - A. 让所有服务共用一张大表更方便
    - B. 独立演进 schema 与扩展，降低耦合
    - C. 取消备份
    - D. 只为了换 ORM
2. 【单选】关于 MySQL 版本，下列说法更准确的是：
    - A. 9.7.x 与 8.4.x 均为 LTS 线中的成员（不同代际）
    - B. 只有 5.5 还存在
    - C. Innovation 永不发布
    - D. 26.10.0 表示 1926 年产品
3. 【简答】分片后按非分片键查询会遇到什么问题？如何缓解？
4. 【单选】核对 TiDB 版本时为何不能只看 `releases/latest`？
    - A. GitHub 从不发布 TiDB
    - B. Latest 可能落在其他维护分支的补丁上，需对照 8.5 LTS 等目标线
    - C. Latest 永远最新主线无需核对
    - D. 只能看 Docker Hub 随机 tag
5. 【简答】读写分离不能解决什么问题？

<details markdown><summary>参考答案</summary>

1. B — 数据所有权与独立演进。
2. A — 8.4.x 与 9.7.x 都是 LTS 线；9.7 之后改用日历版本 `YY.M.P`，26.10.0 即 2026 年 10 月的 Innovation 版本。
3. 可能变成散射查询；可用二次索引表、搜索引擎、广播查询（慎）或禁止该访问路径。
4. B — 典型「旧分支 Latest」陷阱。
5. 不能解决写容量瓶颈与跨库事务；写仍集中在主库。

</details>

---

← [上一节：缓存](../08-caching/) · [返回 微服务](../) · [下一节：可观测性](../10-observability/) →
