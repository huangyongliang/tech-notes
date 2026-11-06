# 可观测性 Observability

> [微服务](../) › 可观测性

指标、日志、链路三支柱，以 OpenTelemetry 统一采集。Spring Boot 通过 Micrometer 对接。

## 本关定位

没有统一的 traces / metrics / logs，排障只能靠猜。本关建立以 OpenTelemetry 为中心的采集与后端选型（Prometheus、Grafana LGTM、SkyWalking 等），并接到 Spring Boot Actuator。

## 闯关任务

- [ ] 能够解释指标、日志、链路的分工与关联（exemplar / traceId）。
- [ ] 能够用 OpenTelemetry Java Agent 对 Spring Boot 服务做零/低侵入接入。
- [ ] 能够说明 Micrometer 与 OTel / Prometheus 的关系。
- [ ] 能够搭建或描述 LGTM（Loki、Grafana、Tempo、Prometheus/Mimir）中的至少两条路径。
- [ ] 能够定义面向用户旅程的 SLI / SLO，而不仅是机器 CPU。

## 知识要点

### 三支柱

- Metrics：聚合，适合告警与容量（Micrometer 1.17.2 → Prometheus 3.15.1）。
- Logs：事件细节（Loki 3.7.9 或 ELK 9.5.6）。
- Traces：请求路径（OTel → Tempo 3.1.1 / Jaeger 2.23.0；或 SkyWalking 11.0.0）。

### OpenTelemetry

OpenTelemetry Java Agent 2.33.1 是统一采集的首选入口；应用内也可用 Micrometer Tracing 桥接。下面的命令未执行。

```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=leave-service \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4317 \
  -jar app.jar
```

### Grafana 与 SkyWalking

Grafana 13.3.0 做统一可视化；SkyWalking 在 Java 微服务与拓扑分析上仍有完整方案。选一种主路径深耕，避免三套 Agent 并存。

## 选型对比

| 能力 | 推荐组件（基线） | 备注 |
|------|------------------|------|
| 采集标准 | OTel Java Agent 2.33.1 | 统一 traces/metrics/logs 信号 |
| 指标 | Micrometer 1.17.2 + Prometheus 3.15.1 | Spring Boot 默认友好 |
| 可视化 | Grafana 13.3.0 | 仪表盘与告警 |
| 日志 | Loki 3.7.9 或 ELK 9.5.6 | 按团队栈选择 |
| 链路 | Tempo 3.1.1 / Jaeger 2.23.0 / SkyWalking 11.0.0 | 勿多 Agent 重叠 |

## 常见误区

- 只采主机指标，没有 RED（Rate、Errors、Duration）服务指标。
- 日志无 traceId，无法从告警跳到上下文。
- 全量采样打爆存储；或采样过低错过偶发故障。
- 同时挂载多个 APM Agent 导致字节码冲突。

## 实践任务

- [ ] 给两个互相调用的服务挂上 OTel Agent，在后端查看完整 span。
- [ ] 为关键接口定义 SLI，并写一条 Prometheus 告警规则草案。
- [ ] 在日志中注入 `trace_id`，验证从 Grafana 链路跳到日志。

## 资料索引

- [OpenTelemetry Java](https://opentelemetry.io/docs/languages/java/) — 语言侧文档
- [Micrometer 参考](https://docs.micrometer.io/micrometer/reference/) — 指标门面
- [Prometheus 概览](https://prometheus.io/docs/introduction/overview/) — 指标系统
- [Grafana 文档](https://grafana.com/docs/) — 可视化与 LGTM
- [Spring Boot Observability](https://docs.spring.io/spring-boot/reference/actuator/observability.html) — Actuator 可观测
- [SkyWalking 文档](https://skywalking.apache.org/docs/) — Java APM 方案

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】把分布式追踪、指标等统一到开放标准时，优先考虑：
    - A. 私有二进制协议且无文档
    - B. OpenTelemetry
    - C. 仅 System.out
    - D. 仅 FTP 上传日志
2. 【单选】Micrometer 在 Spring Boot 中的主要角色是：
    - A. 替代数据库
    - B. 指标门面，对接 Prometheus 等后端
    - C. 仅做 UI 主题
    - D. 替换网关
3. 【简答】为什么告警更适合基于 SLI，而不是「CPU > 80%」单一条件？
4. 【单选】Tempo 更偏向哪类信号后端？
    - A. 仅关系型 SQL
    - B. 分布式追踪存储
    - C. 仅 CDN
    - D. 仅证书颁发
5. 【简答】高基数标签（如 userId 当 label）有什么风险？

<details markdown><summary>参考答案</summary>

1. B — 厂商中立采集标准。
2. B — 与 Actuator / Observation API 配合。
3. SLI 贴近用户体验（错误率、延迟）；CPU 高不一定用户受损，反之亦然。
4. B — Grafana 生态中的 trace 后端。
5. 时间序列爆炸，存储与查询成本剧增，拖垮监控系统。

</details>

---

← [上一节：数据库与分库分表](../09-database-sharding/) · [返回 微服务](../) · [下一节：安全](../11-security/) →
