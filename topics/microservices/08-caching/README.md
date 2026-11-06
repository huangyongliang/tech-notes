# 缓存 Caching

> [微服务](../) › 缓存

分布式缓存与本地缓存组合的多级缓存，以及穿透 / 击穿 / 雪崩、一致性策略。

## 本关定位

缓存用空间与复杂度换延迟与下游容量。本关掌握多级缓存结构、三大经典问题与一致性策略，避免「加了 Redis 反而更难排障」。

## 闯关任务

- [ ] 能够设计本地（Caffeine）+ 分布式（Redis）的多级缓存，并说清失效顺序。
- [ ] 能够解释缓存穿透、击穿、雪崩及对应缓解手段。
- [ ] 能够对比 Cache-Aside、Read-Through、Write-Through、Write-Behind。
- [ ] 能够说明旁路缓存更新时的竞态与常见解决思路。
- [ ] 能够评估哪些数据不该缓存（强一致金额、权限即时生效等需谨慎）。

## 知识要点

### 多级缓存

Caffeine 3.3.1 适合进程内热点；Redis 8.10.3 适合跨实例共享。请求路径通常：本地 → Redis → DB。更新时注意先更新 DB，再删缓存（或延迟双删），并接受短暂不一致窗口。下面的 `@Bean` 方法已在 2026-11-06 用 JDK 21.0.12.1 对 Caffeine 3.3.1 与 `spring-context` 7.0.10 编译通过；未放入容器运行。

```java
@Bean
Cache<String, Employee> localCache() {
    return Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(Duration.ofMinutes(2))
        .build();
}
```

### 三大问题

- 穿透：查不存在的键打到 DB → 布隆过滤器 / 空值短 TTL。
- 击穿：热点键过期瞬间打穿 → 互斥重建 / 逻辑过期。
- 雪崩：大量键同时过期 → TTL 加抖动、依赖隔离与限流。

### Redisson 与 Spring Cache

Redisson 4.8.0 提供分布式锁、RMap 等；Spring Cache 抽象便于注解化，但要清楚底层是本地还是 Redis，避免多实例「本地缓存」造成认知偏差。

## 选型对比

| 组件 | 版本基线 | 层级 | 备注 |
|------|----------|------|------|
| Caffeine | 3.3.1 | 本地 | 高命中、无跨节点一致 |
| Redis | 8.10.3 | 分布式 | 共享热点、会话、限流计数 |
| Redisson | 4.8.0 | 客户端增强 | 锁、集合、限流器 |
| Spring Cache | 随 Boot | 抽象 | 需明确 CacheManager 实现 |

## 常见误区

- 只写缓存不设过期与最大容量。
- 先更新缓存再写 DB，失败后长期脏读。
- 把本地缓存当全局真相。
- 对强一致业务读「以为缓存永远对」。

## 实践任务

- [ ] 实现 Cache-Aside：读穿透加载、写后删缓存，并做并发单测（可模拟延迟）。
- [ ] 为不存在的键设计空值缓存或布隆方案说明。
- [ ] 压测对比：无缓存 / 仅 Redis / 本地+Redis 的延迟与 DB QPS。

## 资料索引

- [Redis 官方文档](https://redis.io/docs/) — 数据结构与运维
- [Caffeine Wiki](https://github.com/ben-manes/caffeine/wiki) — 本地缓存策略
- [Redisson 参考](https://github.com/redisson/redisson/wiki) — Java 客户端能力
- [Microservices.io 模式目录](https://microservices.io/patterns/) — 数据与可靠性相关模式总览

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】缓存穿透更准确的描述是：
    - A. 热点键过期
    - B. 查询不存在的数据持续绕过缓存打到存储
    - C. 机房断电
    - D. TLS 证书过期
2. 【单选】Cache-Aside 写路径的常见推荐是：
    - A. 只更新缓存不写库
    - B. 先更新数据库，再删除（或失效）缓存
    - C. 永远不失效
    - D. 只写本地文件
3. 【简答】为什么多级缓存里本地层 TTL 通常更短？
4. 【单选】Caffeine 主要定位是：
    - A. 跨机房强一致存储
    - B. 进程内高性能缓存
    - C. 仅消息队列
    - D. 仅 API 网关
5. 【简答】缓存雪崩的一种缓解思路是什么？

<details markdown><summary>参考答案</summary>

1. B — 恶意或不存在的键绕过缓存。
2. B — 以 DB 为准，失效缓存避免长期脏数据。
3. 降低跨实例不一致窗口，尽快回源到 Redis / DB 获取较新值。
4. B — 本地缓存库。
5. TTL 加随机抖动、分批失效、多级依赖隔离与限流、永不过期 + 异步刷新等。

</details>

---

← [上一节：分布式事务与一致性](../07-distributed-transactions/) · [返回 微服务](../) · [下一节：数据库与分库分表](../09-database-sharding/) →
