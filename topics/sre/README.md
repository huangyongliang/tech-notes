# SRE 与高可用 {#sre}

本主题讨论可用性如何被定义、被承诺，以及如何被有意识地花掉。它不建监控工具或应急手册目录，也不并入软件工程理论。

> 相关主题：[DevOps](../devops/) · [微服务](../microservices/) · [分布式系统模型](../systems/distributed/) · [软件工程理论](../software-engineering/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 可用性是可花费的约定 {#sre-definition}

可用性不是「系统一直没宕机」的印象。它是：在选定的测量方式下，服务水平被承诺到什么程度，以及超过多少失败就算打破承诺。没有这一定义，后面的「几个九」没有含义。

误差预算把「还允许失败多少」变成可花费的量。花完了，就应停止继续消耗可靠性的变更。还有余额，才谈得上继续发布。怎样从目标算出这份余额，在 [服务水平与误差预算](02-slo-error-budget/)。冗余只在失败尽量独立时撑住这份约定，恢复阻止的是继续花费，不是把已经失败的请求改写成成功。

[DevOps](../devops/) 写流水线保证可重复、来源、晋级门禁和回滚。门禁和回滚是变更与撤回制品的约定。本主题问的是服务水平是否还允许这次变更，以及撤回制品能不能挽回可用性。[容错与流量治理](../microservices/05-resilience/) 写超时、重试、熔断和限流。那些手段改变故障影响范围，不是可用性的定义。[可观测性](../microservices/10-observability/) 写指标、日志和链路，并已要求 SLI 贴近用户旅程而不是 CPU。本主题借用那一句，展开定义、承诺和误差预算，不写采集，也不写 Prometheus 规则。[分布式系统模型](../systems/distributed/) 写部分失效：超时不等于没做。冗余不能取消这个模型。

与 [软件工程理论](../software-engineering/) 不合并。那边约束的是复杂性、模块、规格，以及验证能证明什么。这边约束的是运行中的服务水平如何被定义和花费。验证章谈缺陷是否被证明存在；本主题谈失败预算是否被花完。[产品调研](../product-research/) 留下判断与事实。本主题不写选型备忘。

读过分布式系统模型，并知道可观测性里「SLI 不是 CPU」，再读最顺。这不是 Java、DevOps 或可观测性课的前置。

## 学习路径 {#sre-path}

```mermaid
flowchart LR
  A[可用性含义] --> B[目标与预算] --> C[冗余条件] --> D[恢复边界]
```

## 子目录 {#sre-chapters}

| # | 子目录 | 内容 | 状态 |
|---|--------|------|------|
| 01 | [可用性的含义](01-availability/) | 时间占比与请求占比，以及「几个九」依赖定义 | 🟡 |
| 02 | [服务水平与误差预算](02-slo-error-budget/) | SLI、SLO、SLA 的分界，以及预算如何被花掉 | 🟡 |
| 03 | [冗余成立的条件](03-redundancy-conditions/) | 副本只有在失败尽量独立时才提高可用性 | 🟡 |
| 04 | [恢复能挽回什么](04-recovery/) | 缓解止住继续花费，不能把已失败改写成成功 | 🟡 |

🟢 已完成 · 🟡 搭建中 · ⚪ 待开始

`monitoring/`、`oncall/`、`runbooks/` 本批不建。

## 资料索引 {#sre-sources}

- [Google SRE：Embracing Risk](https://sre.google/sre-book/embracing-risk/) — 概念来源：可靠性目标留出可花费的失败份额。本页不是该公司的发布手册。
- [Google SRE：Service Level Objectives](https://sre.google/sre-book/service-level-objectives/) — 概念来源：SLI、SLO 与可用性度量的定义。本页不复述其内部指标。
- [DevOps](../devops/) — 制品如何被承认和撤回。不是服务水平的定义。
- [容错与流量治理](../microservices/05-resilience/) — 超时、重试、熔断、限流的实践。
- [可观测性](../microservices/10-observability/) — 测量从哪来。本主题定义测量是什么。
- [分布式系统模型](../systems/distributed/) — 部分失效。冗余不能取消它。
- [软件工程理论](../software-engineering/) — 规格与验证。与本主题不合并。
