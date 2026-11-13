# 缓存 {#caching}

> [微服务](../) › 缓存

缓存用空间和复杂度换延迟与下游容量。它不提供跨实例强一致，本地缓存也不是全局真相。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[服务通信](../04-communication/) 和 [容错与流量治理](../05-resilience/) 已经要求读路径也考虑超时与隔离。[分布式事务与一致性](../07-distributed-transactions/) 处理的是跨服务写路径上的最终一致。本页处理读路径加速：何时引入多级缓存，失效顺序是什么，哪些数据不该缓存。数据如何分区、如何分库分表，留给 [09](../09-database-sharding/)。

## 多级缓存各自保证什么 {#_2}

Caffeine **3.3.1** 适合进程内热点。它保证的是本进程的低延迟命中，不保证跨节点一致。Redis **8.10.3** 适合跨实例共享热点、会话或限流计数。请求路径通常是：本地，然后 Redis，然后数据库。更新时先更新数据库，再删除缓存，或做延迟双删，并接受短暂不一致窗口。本地层 TTL 通常更短，用来缩小跨实例窗口，尽快回源到 Redis 或数据库。

下面的 `@Bean` 方法已在 2026-11-13 用 JDK 25.0.5（Temurin 25.0.5+8）对 Caffeine 3.3.1 与 `spring-context` 7.0.10 编译通过；未放入容器运行。Framework 线仍以 **7.0** 为准，7.0.10 是这条线的当前 GA。Maven `org.springframework:spring-context` 的 `latest` / `release` 当日指向 **7.1.0-RC2**（`lastUpdated` 2026-11-05），不得写成默认。Boot 4.2.0-RC2 与 Cloud 2026.0.0-RC2 同样不是默认。`Employee` 是原页已有的抽象例子。

```java
@Bean
Cache<String, Employee> localCache() {
    return Caffeine.newBuilder()
        .maximumSize(10_000)
        .expireAfterWrite(Duration.ofMinutes(2))
        .build();
}
```

8.10.3 是当前 8.10 稳定补丁。2026-11-13 的 [download.redis.io/releases](https://download.redis.io/releases/) 提供 `redis-8.10.3.tar.gz`（26-Oct-2026）。GitHub Latest 非预发布是 8.10.3（2026-10-26）。同日还有 8.8.4、8.6.8、8.4.8、8.2.11、7.4.12、7.2.17 等维护补丁，不得因为并列发布就混写主线。[redis.io/downloads](https://redis.io/downloads/) 的产品选择器是 8.10 线，但部分发行说明仍链到 8.10.0 标签，以官方 tarball 目录和 GitHub 非预发布 8.10.3 为准。GitHub 另有 **8.12-rc3**（2026-11-12，预发布），不得写成已交付或当前默认。

## 穿透、击穿、雪崩不是同一个问题 {#cache-problems}

<span id="_5"></span>

穿透：查不存在的键持续打到数据库。缓解是空值短 TTL，或布隆过滤器。击穿：热点键过期的瞬间被打穿。缓解是互斥重建，或逻辑过期。雪崩：大量键同时过期。缓解是 TTL 加抖动、依赖隔离与限流，或异步刷新。三者不是同一个问题。只加一个 Redis，并不自动解决它们。

## 写路径先以数据库为准 {#cache-aside}

Cache-Aside（旁路）写路径的常见推荐是：先更新数据库，再删除或失效缓存。并发下仍有短暂竞态。先更新缓存再写数据库，写入失败后会长期脏读。Read-Through、Write-Through、Write-Behind 只是把一致性和延迟放到不同一侧，本页不写成产品教程。强一致金额、权限即时生效这类数据，要谨慎缓存，或接受明确的不一致窗口。点到即可，不展开成新的业务域。

## Redisson 与 Spring Cache 要分清底层 {#redisson-spring-cache}

Redisson **4.8.0** 提供分布式锁、RMap、限流器等客户端增强。2026-11-13 的 Maven `org.redisson:redisson` 与 GitHub Latest 都是 4.8.0（2026-10-02）。Spring Cache 是抽象，便于注解化，但必须清楚底层是本地还是 Redis。多实例上的本地缓存不是全局真相。本页不写锁的实现。

## 四层各自换到什么 {#cache-choice}

<span id="_6"></span>

| 组件 | 版本基线 | 层级 | 备注 |
|------|----------|------|------|
| Caffeine | 3.3.1 | 本地 | 高命中、无跨节点一致 |
| Redis | 8.10.3 | 分布式 | 共享热点、会话、限流计数 |
| Redisson | 4.8.0 | 客户端增强 | 锁、集合、限流器 |
| Spring Cache | 随 Boot | 抽象 | 需明确 CacheManager 实现 |

## 常见误读 {#_3}

<span id="_7"></span>

- 「只写缓存，不设过期和最大容量。」本地层会无界增长，过期策略也不存在。
- 「先更新缓存再写数据库。」写入失败后，缓存里的值会长期是脏的。
- 「本地缓存就是全局真相。」它只保证本进程。跨实例要回到 Redis 或数据库。
- 「穿透和击穿是同一句话。」穿透是不存在的键绕过缓存；击穿是热点键过期的瞬间被打穿。
- 「Redis 8.12 或 8.8.4 是当前主线。」8.12 仍是 RC。8.8.4 是维护补丁。主线是 8.10.3。
- 「`spring-context` 的 Maven `latest` 可以换成 7.1。」它指向 7.1.0-RC2。本章编译注记仍是 7.0.10 GA。

## 可选核对 {#cache-check}

<span id="_8"></span>

读路径和写路径已经写在上面。这两问只核对它们。

1. 缓存穿透更准确的描述是什么？它和击穿有什么差别？
2. Cache-Aside 写路径的常见推荐是什么？

<details markdown><summary>参考答案</summary>

1. 穿透是查询不存在的数据，持续绕过缓存打到存储。击穿是一个热点键过期的瞬间，大量请求同时打到存储。空值短 TTL 或布隆过滤器针对的是穿透，不是击穿。
2. 先更新数据库，再删除或失效缓存。以数据库为准，避免先改缓存、后写库失败时留下长期脏读。

</details>

<span id="_10"></span>

## 资料索引 {#_4}

<span id="_9"></span>

- [Redis 官方文档](https://redis.io/docs/) 与 [download.redis.io/releases](https://download.redis.io/releases/) — 2026-11-13：`redis-8.10.3.tar.gz` 日期为 26-Oct-2026。GitHub 非预发布 Latest 是 8.10.3。8.12-rc3（2026-11-12）是预发布。8.8.4 等同日补丁是维护线。[redis.io/downloads](https://redis.io/downloads/) 选择器为 8.10 线；若发行说明仍链到 8.10.0 标签，以 tarball 和 GitHub 非预发布为准。
- [Caffeine Wiki](https://github.com/ben-manes/caffeine/wiki) — 进程内缓存。稳定线 3.3.1（2026-10-13）。
- [Redisson 参考](https://github.com/redisson/redisson/wiki) — 客户端增强。稳定线 4.8.0（2026-10-02）。
- [Microservices.io 模式目录](https://microservices.io/patterns/) — 读路径加速仍要服从可靠性和数据所有权。
- [微服务 05](../05-resilience/) — 未命中或击穿时的隔离与限流。
- [微服务 07](../07-distributed-transactions/) — 写路径上的最终一致。
- [微服务 09](../09-database-sharding/) — 数据分区不在本页。

---

← [上一节：分布式事务与一致性](../07-distributed-transactions/) · [返回 微服务](../) · [下一节：数据库与分库分表](../09-database-sharding/) →
