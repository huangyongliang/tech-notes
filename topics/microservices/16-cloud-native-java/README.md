# 性能与云原生 Java Performance & Cloud-Native Java

> [微服务](../) › 性能与云原生 Java

缩短启动、降低内存：原生镜像、CRaC 检查点恢复、虚拟线程提升吞吐。链接 [并发 Concurrency](../../java/05-concurrency/)、[生态与新趋势 Ecosystem & Trends](../../java/12-ecosystem-trends/)。

## 本关定位

微服务实例多、扩缩频繁时，冷启动与内存占用直接变成钱与弹性。本关掌握 GraalVM 原生镜像、CRaC 与虚拟线程 / Leyden 的适用边界，避免「为原生而原生」。

## 闯关任务

- [ ] 能够说明原生镜像的收益（启动、内存）与代价（构建时间、反射配置）。
- [ ] 能够描述 CRaC 检查点恢复的流程与限制（打开的连接等）。
- [ ] 能够判断虚拟线程适合的工作负载，并说明 pinning 在 JDK 24（JEP 491）后的变化。
- [ ] 能够概述 Project Leyden AOT 缓存与原生镜像的差异。
- [ ] 能够结合 Spring Boot 文档完成一次原生镜像或 CRaC 试验并记录指标。

## 知识要点

### GraalVM 原生镜像

GraalVM Community 25 Innovation 5（tag `graal-25.5.5.0.3`，基于 JDK 25.0.5）。Spring Boot 提供原生镜像构建支持；需处理反射、动态代理与资源提示。

### CRaC

Coordinated Restore at Checkpoint：在预热后做检查点，新实例恢复时跳过大部分启动。Azul Zulu 提供多版本 CRaC 构建；BellSoft Liberica CRaC 页面可见 JDK 17/21 下载（更高版本渠道以厂商说明为准，**待核实**）。OpenJDK 项目页为权威入口。

### 虚拟线程与 Leyden

虚拟线程（JDK 21+，JEP 444）适合阻塞式 I/O 并发；`synchronized` pinning 在 JDK 24 由 JEP 491 改善。Project Leyden AOT 缓存（JDK 24+）走「仍是 JVM」的加速路径，迁移成本通常低于全量原生。下面的命令只是示意，未执行。

```bash
# Spring Boot 原生镜像（示意，未执行）
./mvnw -Pnative native:compile
```

## 选型对比

| 技术 | 基线 / 状态 | 收益 | 代价 |
|------|-------------|------|------|
| 虚拟线程 | JDK 21+；JDK 24 的 JEP 491 | 高并发阻塞 I/O | CPU 密集无增益 |
| CRaC | 厂商 JDK 支持 | 极快恢复 | 检查点工程化、连接重建 |
| GraalVM Native | graal-25.5.5.0.3 | 启动快、内存低 | 构建复杂、闭环测试 |
| Leyden AOT | JDK 24+ | 加速启动仍属 JVM | 生态仍在演进 |

## 常见误区

- 所有服务强制原生镜像，CI 时间爆炸。
- 在虚拟线程里跑重 CPU 计算并期望线性扩展。
- CRaC 恢复后仍使用检查点前的失效网络连接。
- 忽视原生镜像下的类路径与监控 Agent 差异。

## 实践任务

- [ ] 对同一 Boot 应用对比：JVM 冷启动 vs 原生镜像启动时间与 RSS。
- [ ] 阅读 CRaC 资源，列出恢复后必须重建的资源清单（线程池、DB 池等）。
- [ ] 用虚拟线程跑阻塞 I/O 压测，观察载体线程与平台线程数量。

## 资料索引

- [Spring Boot Native Image](https://docs.spring.io/spring-boot/reference/packaging/native-image/index.html) — Boot 原生镜像
- [GraalVM Native Image](https://www.graalvm.org/latest/reference-manual/native-image/) — 官方手册
- [OpenJDK CRaC 项目](https://openjdk.org/projects/crac/) — CRaC 概述
- [Azul CRaC 产品页](https://www.azul.com/products/components/crac/) — 发行说明入口
- [JEP 444: Virtual Threads](https://openjdk.org/jeps/444) — 虚拟线程
- [JEP 491](https://openjdk.org/jeps/491) — synchronized 与虚拟线程

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】虚拟线程最适合：
    - A. 纯 CPU 打满的计算
    - B. 大量阻塞 I/O 等待
    - C. 仅编译器前端
    - D. 仅替换 TCP 协议
2. 【单选】GraalVM CE tag `graal-25.5.5.0.3` 表示：
    - A. 随意字符串
    - B. Community 25 的 Innovation 构建标识（对照 graalvm-ce-builds Releases）
    - C. 仅 Docker 镜像摘要
    - D. MySQL 版本
3. 【简答】原生镜像的主要工程代价是什么？
4. 【单选】JEP 491 主要改善：
    - A. CSS 布局
    - B. 虚拟线程在 `synchronized` 上的 pinning
    - C. 替换 HTTP 为 FTP
    - D. 取消垃圾回收
5. 【简答】CRaC 恢复后为什么常要重建连接池？

<details markdown><summary>参考答案</summary>

1. B — 阻塞时可卸载载体线程。
2. B — 与 graalvm-ce-builds Releases 核对。
3. 构建慢、反射/动态特性需配置、排障与部分 Agent 能力受限、测试矩阵变大。
4. B — 减少 synchronized 导致的 pinning。
5. 检查点中的连接在恢复后通常已失效或指向错误状态，需按生命周期回调重建。

</details>

---

← [上一节：测试](../15-testing/) · [返回 微服务](../)
