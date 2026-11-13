# 可观测性 {#observability}

> [微服务](../) › 可观测性

指标、日志和链路各自回答不同的问题；把它们串起来，只在 trace id 沿每一跳传播、并且采样留住了那条请求时才成立。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[容错与流量治理](../05-resilience/) 已经让失败可以隔离。[消息与事件驱动](../06-messaging/) 和 [分布式事务与一致性](../07-distributed-transactions/) 让协作变成异步、最终一致。部分失败加上异步之后，看一台机器不够用。本页写测量从哪来，以及怎么把一次请求的各段串起来。测量是什么、目标怎么定、误差预算怎么花，回链 [SRE](../../sre/) 和 [SRE 02](../../sre/02-slo-error-budget/)。Actuator 基础回链 [Java 09](../../java/09-spring/)，排障回链 [Java 11](../../java/11-performance-diagnostics/)。网格自动产生的遥测留给 [13](../13-service-mesh/)。生产可观测性的实现在本页，可重复与晋级的约定在 [DevOps](../../devops/)。

## 三类信号各自回答什么 {#_2}

指标是聚合后的数，适合告警和容量。日志是离散事件的细节。链路是一次请求跨服务的路径和耗时。三者不互相替代：指标告诉你有问题，链路告诉你卡在哪一段，日志告诉你那一段发生了什么。

服务级至少要有 RED：Rate、Errors、Duration。只有主机 CPU，回答不了用户有没有失败、慢在哪一次调用。

## 关联靠上下文传播成立 {#context-propagation}

trace id 和 span id 要沿每一跳传播，包括 HTTP 头和消息头。日志里带上 `trace_id`，指标用 exemplar 指向一条样本链路，三者才能互跳。任何一跳丢掉上下文，链路就断。自建线程池、异步消息没有把头发过去，都是这一跳。

[W3C Trace Context](https://www.w3.org/TR/trace-context/) 是 2021-11-23 的 Recommendation，用 `traceparent` 传递 trace id。2026-11-13 的 OpenTelemetry Java SDK 配置页把 `otel.propagators` 的默认值写成 `tracecontext,baggage`（W3C）。消息头里的透传回指 06，本页不重写投递语义。

## 采样与基数是成本条件 {#sampling-cardinality}

全量采样会打爆存储。采样过低会错过偶发故障。头部采样在入口就决定留不留，尾部采样等 Collector 看见整条链路再决定，更能留下错误和慢请求，也更贵。

高基数标签会让时间序列爆炸。把 userId 当成 label，序列数量跟着用户数走，存储和查询会把监控拖垮。标签应是有界的维度，例如服务名、路由、状态码，而不是一次请求里的标识。

## OpenTelemetry 统一的是采集 {#opentelemetry}

OpenTelemetry 提供 API、SDK、语言 Agent、Collector 和 OTLP。它统一的是采集和传输，不统一后端，也不替你定义 SLI。2026-11-13 打开的 [OpenTelemetry Java](https://opentelemetry.io/docs/languages/java/) 把 Traces、Metrics、Logs 都标为 Stable。

Java Agent 当前 GA 是 **2.33.1**。同日 Maven `io.opentelemetry.javaagent:opentelemetry-javaagent` 的 `latest` / `release` 与 GitHub Latest 都是 2.33.1（2026-10-26）。上游 `opentelemetry-api` 的 Maven `latest` 是 **1.68.0**（`lastUpdated` 2026-11-06）。Boot 4.1.2 管理的 `opentelemetry-api` 是 **1.62.0**。不要把上游最新 SDK 写成 Boot 管理的版本。

Java Agent 2.0 起，默认协议是 `http/protobuf`，不是 `grpc`。SDK 配置页写明：协议为 grpc 时 endpoint 用 4317，为 `http/protobuf` 时用 4318。`leave-service` 是原页已有示意。下面的命令未执行。

```bash
java -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=leave-service \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4318 \
  -jar app.jar
```

若 Collector 只开 gRPC 4317，改用 `:4317` 并加 `-Dotel.exporter.otlp.protocol=grpc`。

## Micrometer 是 Spring 侧的门面 {#micrometer}

Micrometer **1.17.2** 是指标门面。Spring Boot Actuator 默认用它对接 Prometheus 等后端。Observation API 让同一处埋点同时出指标和 span。Micrometer Tracing **1.7.2** 把 span 桥到 OpenTelemetry 或 Brave。Boot 4.1.2 的依赖坐标管理的就是 Micrometer 1.17.2 和 Tracing 1.7.2。

2026-11-13 的 [Micrometer 参考](https://docs.micrometer.io/micrometer/reference/) 把 1.17.2 标为 Stable，把 **1.18.0-RC2** 标为 Preview。Maven `micrometer-core` 的 `latest` / `release` 指向 1.18.0-RC2（`lastUpdated` 2026-11-05），`micrometer-tracing` 的 `latest` / `release` 指向 **1.8.0-RC2**。二者都不是默认。

接入路径选一条为主：Java Agent 做字节码增强，或应用内使用 Micrometer / OpenTelemetry starter。两条同时报同一类信号，后端会看到两份。

## 后端按团队栈选，Agent 只挂一个 {#grafana-skywalking}

后端按团队已经在用的栈来选，不要为了「都试试」叠多套 APM Agent。多个 Agent 一起改字节码，会互相冲突。

- Prometheus **3.16.0**：下载页标为 Latest，日期 2026-11-04。同页 LTS 是 **3.13.5**（2026-10-21）。发布周期页写明 LTS 接收选定的缺陷修复，期限一年。GitHub Latest 是 v3.16.0（2026-11-05）。3.16 的 rc 不是默认，3.13.5 是 LTS 补丁，不因为日期就当成主线。
- Grafana **13.3.1**：下载页 `releaseDate` 为 2026-11-10。GitHub Latest 同为 v13.3.1。
- Loki **3.7.10**：GitHub Latest，发布于 2026-11-13。文档当前档是 v3.7.x (latest)。同日还有维护线 v3.6.21。**v4.0.0-rc.3** 是预发布，不是默认。
- Tempo **3.1.1**（GitHub Latest，2026-10-21）。文档当前档是 v3.1.x (latest)。
- Jaeger **2.23.0**：下载页 Latest version，GitHub Latest 同为 v2.23.0（2026-11-05）。
- SkyWalking **11.1.0**：下载页标为 Latest release，Nov. 6th, 2026。Java Agent 是另一条版本线，本页不新增它的版本号。
- Elastic Stack **9.5.6**：Elasticsearch 下载页 Version 9.5.6，November 2, 2026。

Grafana 做统一可视化。Loki、Tempo 和 Prometheus 组成一条 LGTM 路径。SkyWalking 在 Java 拓扑和 APM 上是另一条完整路径。选一条深耕。

## SLI 贴近用户旅程 {#sli}

告警应基于贴近用户体验的 SLI，例如错误率和延迟分位，而不是「CPU > 80%」。CPU 高不一定用户已经受损，CPU 不高也不等于这次请求是好的。SRE 主页和 SRE 02 引用的是这句。SLI 怎么收成 SLO、误差预算怎么花，只回链 SRE。本页不写 Prometheus 告警规则，也不写 PromQL。

## 五类能力各自选什么 {#obs-choice}

<span id="_5"></span>

| 能力 | 基线 | 它适合什么 |
|------|------|------------|
| 采集标准 | OTel Java Agent 2.33.1 | 统一 traces / metrics / logs 的采集 |
| 指标 | Micrometer 1.17.2 + Prometheus 3.16.0 | Spring Boot 默认的指标门面和后端 |
| 可视化 | Grafana 13.3.1 | 把多类信号放到同一套面板 |
| 日志 | Loki 3.7.10 或 Elastic Stack 9.5.6 | 按团队已有的日志栈 |
| 链路 | Tempo 3.1.1 / Jaeger 2.23.0 / SkyWalking 11.1.0 | 只挂一个 Agent |

## 常见误读 {#_3}

<span id="_6"></span>

- 「有主机 CPU 就够了。」服务级至少要有 RED。CPU 不是用户旅程。
- 「日志里不必带 trace id。」没有它，告警跳不到那一次请求。
- 「全量采样最安全，或者采样率越低越省。」前者打爆存储，后者错过偶发故障。
- 「userId 当 label 更方便排障。」高基数会让时间序列爆炸。
- 「OpenTelemetry 选定了后端，也定义了 SLI。」它统一的是采集和协议。
- 「Agent 和 Micrometer 各报一遍更保险。」同一信号会重复。
- 「多个 APM Agent 可以并存。」字节码会冲突。
- 「Maven `latest` 的 Micrometer 1.18、Loki 4.0 rc、上游 OTel SDK 1.68.0 是当前默认。」1.18 与 Tracing 1.8 是 RC，Loki 4.0 是 rc，1.68.0 不是 Boot 4.1.2 管理的 1.62.0。

## 可选核对 {#obs-check}

<span id="_7"></span>

信号分工和成本已经写在上面。这两问只核对它们。

1. 为什么告警更适合基于 SLI，而不是单一的 CPU 阈值？
2. 高基数标签有什么风险？

<details markdown><summary>参考答案</summary>

1. SLI 贴近用户体验，例如错误率和延迟分位。CPU 高不一定用户已经受损，CPU 不高也不等于用户没受损。
2. 把 userId 这类高基数值当成标签，时间序列数量会爆炸，存储和查询成本把监控拖垮。

</details>

<span id="_9"></span>

## 资料索引 {#_4}

<span id="_8"></span>

- [OpenTelemetry Java](https://opentelemetry.io/docs/languages/java/) — 2026-11-13：Traces、Metrics、Logs 均为 Stable。
- [OTel Java Agent 配置](https://opentelemetry.io/docs/zero-code/java/agent/configuration/) — 2.0 起默认协议是 `http/protobuf`，不是 `grpc`。
- [OTel Java SDK 配置](https://opentelemetry.io/docs/languages/java/configuration/) — grpc 对应 4317，`http/protobuf` 对应 4318。`otel.propagators` 默认 `tracecontext,baggage`。
- [Micrometer 参考](https://docs.micrometer.io/micrometer/reference/) — Stable 1.17.2，Preview 1.18.0-RC2。Maven `latest` / `release` 指向该 RC，不是默认。
- [Prometheus 下载](https://prometheus.io/download/) 与 [发布周期](https://prometheus.io/docs/introduction/release-cycle/) — 3.16.0（2026-11-04）为 Latest；LTS 3.13.5（2026-10-21）维护一年。
- [Grafana 文档](https://grafana.com/docs/) — 可视化。下载页 Grafana 13.3.1，`releaseDate` 2026-11-10。
- [Loki 发行说明](https://grafana.com/docs/loki/latest/release-notes/) — 当前档 v3.7.x (latest)。GitHub Latest 是 v3.7.10（2026-11-13）；v4.0.0-rc.3 是预发布。
- [Spring Boot Observability](https://docs.spring.io/spring-boot/reference/actuator/observability.html) — Actuator 与 Micrometer。
- [SkyWalking 文档](https://skywalking.apache.org/docs/) 与 [下载页](https://skywalking.apache.org/downloads/) — v11.1.0，Latest release Nov. 6th, 2026。本页不写 Java Agent 版本。
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) — 2021-11-23 Recommendation。
- [SRE 02](../../sre/02-slo-error-budget/) — SLO 与误差预算。本页只保留「SLI 贴近用户旅程而不是 CPU」。
- [微服务 13](../13-service-mesh/) — 网格遥测。本页不写 sidecar / ambient 配置。

---

← [上一节：数据库与分库分表](../09-database-sharding/) · [返回 微服务](../) · [下一节：安全](../11-security/) →
