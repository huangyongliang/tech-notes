# 性能与云原生 Java Performance & Cloud-Native Java

> [微服务](../) › 性能与云原生 Java

缩短启动、降低内存：原生镜像、CRaC 检查点恢复、虚拟线程提升吞吐。链接 [并发 Concurrency](../../java/05-concurrency/)、[生态与新趋势 Ecosystem & Trends](../../java/12-ecosystem-trends/)。

## 主流选型

- GraalVM Community 25 Innovation 5（tag `graal-25.5.5.0.3`：GraalVM 25 第 5 个 Innovation 版本，基于 JDK 25.0.5）
- CRaC：Azul Zulu 提供 JDK 17/21/25/26/27 的 CRaC 版；BellSoft Liberica 仅 JDK 17/21（最新 21.0.13），暂无 JDK 25
- 虚拟线程（JDK 21+；JDK 24 起 JEP 491 解决 synchronized pinning）
- Project Leyden AOT 缓存（JDK 24+）

## 建议先收的资料

- Spring Boot GraalVM 章节
- CRaC 文档
- 虚拟线程压测对比

## 资料索引

- [GraalVM CE Builds Releases](https://github.com/graalvm/graalvm-ce-builds/releases) — GraalVM Community 发行版

---

← [上一节：测试](../15-testing/) · [返回 微服务](../)
