# 服务网格 {#service-mesh}

> [微服务](../) › 服务网格

网格把连接治理和工作负载身份移到数据面，但不替你决定业务权限，也不修正错误的服务边界。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[容器与编排](../12-containers-k8s/) 已经把工作负载放进 Pod，Service 提供稳定入口。[容错与流量治理](../05-resilience/) 写了应用库里的超时、重试和隔离。[可观测性](../10-observability/) 要求 trace context 沿每一跳传播。[安全](../11-security/) 把网格侧 mTLS 指到本页。本页写数据面实际保证什么：流量必须经过被配置的数据面，证书、策略和版本兼容都就绪，这些能力才成立。业务授权、幂等和 API 边界仍在应用里。网格不自动修好事务边界。

## 网格把哪一层移到数据面 {#_2}

控制面分发服务发现结果、证书和策略。数据面在请求路径上执行这些决定。配置传播不是一次瞬时的原子切换：控制面故障，和数据面上已经在跑的流量故障，不是同一件事。

应用 SDK 把重试和 mTLS 写进每种语言，升级跟着业务发布走。sidecar 是每个 Pod 一只代理，L7 能力完整，资源和升级面也按 Pod 计。节点代理把一部分能力收到节点上，多语言的成本更低，但 L7 往往要另外部署。网格不是配置中心，也不是唯一的发现来源。DNS 和应用自己的发现合同仍然在。

## Istio ambient 的 L4 与 L7 分层 {#istio-ambient}

sidecar 模式是每个 Pod 一只 Envoy。ambient 把节点级 ztunnel 放在 L4：安全覆盖、工作负载身份和连接级遥测。需要 HTTP 路由、重试、HTTP 级授权或 HTTP 追踪时，再加独立部署的 Envoy waypoint。waypoint 可以按安全边界共享，策略在目标侧的 waypoint 上执行。只部署 ztunnel，看不见 HTTP 头，也就做不了按头的授权，也产生不了 HTTP span。

```mermaid
flowchart LR
  App[工作负载] --> Z[ztunnel L4]
  Z --> W[waypoint L7 可选]
  W --> Dest[目标服务]
```

下面的图只画「选用了 waypoint 的那条路径」。不选 waypoint 时，流量不是被强行送进 W。图也不表示外部网络、DNS 或所有异常路径。

## GA 不等于所有特性都稳定 {#mesh-maturity}

ambient 的核心（ztunnel、waypoint、API）自 **1.24** 起 GA。[1.24 公告](https://istio.io/latest/news/releases/1.24.x/announcing-1.24/) 的日期是 2024-11-07，写明这些核心被标为 Stable。这不是 1.32 才第一次 GA。

2026-11-23 打开的当前主线是 Istio **1.32.0**。公告日期是 Nov 9, 2026；GitHub 发布 `published_at` 为 2026-11-09T19:07:47Z。1.32.0-rc.2 是预发布，不是默认。1.31.4 与 1.30.8 是更早主线的补丁：支持页把「无已知 CVE」的下界写成 1.31.4+ 和 1.30.8+，所以不再把 1.31.3 当推荐默认。

同一天的 [feature-stages](https://istio.io/latest/docs/releases/feature-stages/)（页面版本 Istio 1.32）把 waypoint 的 HTTPRoute / GRPCRoute、DestinationRule、AuthorizationPolicy、PeerAuthentication 列为 Stable。VirtualService、WasmPlugin，以及实验 Channel 的 TLSRoute / TCPRoute 是 Alpha。跨命名空间 waypoint、IPv6 / 双栈、多网络多集群是 Beta。RequestAuthentication 与 DNS 代理也是 Beta。不能从核心 GA 推出「全部功能都 Stable」。本页不教这些 Alpha / Beta 的配置。

## mTLS、授权与重试要同时满足前提 {#mesh-contracts}

mTLS 证明工作负载身份并加密通道，不决定「这个用户能否批准请假」。那是应用层的 scope 和策略，回 [11](../11-security/)。证书信任域、身份映射和策略必须盖住要保护的入口。STRICT 只说明网格按策略拒绝不合身份的连接，不等于已经打开了应用授权。旁路和未入网的流量，按你写的策略处置，不会自动变成已认证。

L7 授权只能在看得见 HTTP 的代理上执行。ztunnel 只见 L4。应用库和网格如果同时重试，总尝试次数可能相乘。幂等和总时间预算沿用 [05](../05-resilience/)，本页不重写熔断组件。代理观测也恢复不了应用丢掉的 trace header，传播合同在 [10](../10-observability/)。本页不列安装命令，也不写证书轮换步骤。

## 引入前先写能力和兼容清单 {#mesh-adoption}

多语言的东西向治理、统一身份，并且有平台运营者，网格才值得上。服务少、边界不稳、证书和观测还没就绪时，先不上。引入是渐进的：先在小命名空间或非关键流量上核对身份、拒绝路径、延迟和资源，再扩大。这是决策条件，不是一份要在生产执行的任务清单。

2026-11-23 的 [支持矩阵](https://istio.io/latest/docs/releases/supported-releases/) 写明：Istio 1.32 支持 Kubernetes 1.33 到 1.37，构建和测试用的 Gateway API 是 **v1.6.1**。不要拿别处更新的 Gateway API 直接塞进这条发行线。同一页写明：控制面可以比数据面领先一个版本，数据面不能领先控制面；并建议用 revision，使两边没有偏差。预计的支持终点约 2027-06，页面标的是 Expected，不是承诺。首页上的 Kubernetes 1.37.2 不在本页改写。

## Linkerd 版本必须带发行渠道 {#linkerd}

2026-11-23 打开的 [Linkerd Releases](https://linkerd.io/releases/) 写明：最新 edge 是 **edge-26.11.2**。GitHub 发布 `published_at` 为 2026-11-13T23:50:48Z，按 Asia/Shanghai 是 2026-11-14。edge 制品来自当时的 main，可能包含破坏性变更；官网仍写 edge releases are generally considered production ready，并会把事后发现的问题标成 not recommended。它一般可被视为能用于生产的开源渠道，但不是 stable artifact，也不能写成玩具版。

自 2024 年 2 月起，开源项目本身不再产出 stable artifact，由 vendor community 制作。Buoyant Enterprise for Linkerd 是页面列出的发行之一，不是唯一发行。里程碑是另一条轴：Linkerd **2.20** 于 2026-06-23 宣布，代码标签 `version-2.20`，对应的 edge 是 edge-26.6.3。不要把 edge 号和 2.20 混成同一个补丁，也不要臆造企业发行的补丁号。

## 三种形态各自付出什么 {#mesh-choice}

<span id="_5"></span>

| 方案 | 版本基线 | 数据面 | 你付出的成本 |
|------|----------|--------|----------------|
| Istio sidecar | 1.32.0 | 每 Pod 一只 Envoy | L7 在 Pod 内，资源和升级按 Pod 计 |
| Istio ambient | 核心自 1.24 GA，当前发行线 1.32.0 | ztunnel，按需加 waypoint | L4 在节点上；HTTP 能力要另外部署 waypoint |
| Linkerd | edge-26.11.2；里程碑 2.20 另计 | 微代理 | 必须写明 edge 还是 vendor stable，企业补丁号不在本页 |

没有测量，就不能写「有 sidecar 就一定更慢」或「ambient 永远更快」。

## 常见误读 {#_3}

<span id="_6"></span>

- 「ambient 核心 GA，所以 VirtualService 和多集群也是 Stable。」功能表把它们标成 Alpha 或 Beta。
- 「只部署 ztunnel 就有按 HTTP 头的授权和链路 span。」那是 L7，要 waypoint，而且应用还得自己传播 trace context。
- 「mTLS STRICT 等于用户已被授权。」它证明的是工作负载身份，不是请假批准权限。
- 「应用重试三次、网格再重试三次，总共还是三次。」次数会相乘。
- 「edge 就是 stable artifact」，或者「edge 只是玩具」。它不是开源 stable 制品；官网仍把它一般视为 production ready，同时允许破坏性变更。
- 「网格能修好不稳定的服务边界。」边界和事务仍在应用里。

## 可选核对 {#mesh-check}

<span id="_7"></span>

数据面分层和重试预算已经写在上面。这两问只核对它们。

1. 只部署 ztunnel，能否得到按 HTTP header 的授权和链路 span？缺什么？
2. 应用库和网格都重试时，为什么要放在同一个预算里？

<details markdown><summary>参考答案</summary>

1. 不能。ztunnel 只处理 L4。按 HTTP header 的授权和 HTTP span 要有 waypoint，并且应用自己还得把 trace context 传下去。
2. 两边的尝试次数会相乘。没有幂等，写会被放大；总时间还要落在上游预算里。

</details>

<span id="_9"></span>

## 资料索引 {#_4}

<span id="_8"></span>

- [Istio 1.24 公告](https://istio.io/latest/news/releases/1.24.x/announcing-1.24/) — 2024-11-07：ambient 核心（ztunnel、waypoint、API）标为 Stable。
- [Istio 1.32 公告](https://istio.io/latest/news/releases/1.32.x/announcing-1.32/) — Nov 9, 2026。GitHub 非预发布 1.32.0 的 `published_at` 是 2026-11-09T19:07:47Z。
- [支持的发行](https://istio.io/latest/docs/releases/supported-releases/) — 1.32 支持 Kubernetes 1.33–1.37，Gateway API v1.6.1；控制面最多领先数据面一个版本。无已知 CVE 的下界含 1.31.4+、1.30.8+。
- [功能阶段](https://istio.io/latest/docs/releases/feature-stages/) — 2026-11-23 页面版本为 Istio 1.32。VirtualService 为 Alpha，多网络多集群为 Beta。
- [waypoint](https://istio.io/latest/docs/ambient/usage/waypoint/) — 可选的 Envoy 代理，用来补上 L7。
- [Linkerd Releases](https://linkerd.io/releases/) — 最新 edge-26.11.2；2.20 于 2026-06-23 宣布，对应 edge-26.6.3。开源自 2024-02 不再产出 stable artifact。
- [微服务 05](../05-resilience/) — 重试必须幂等，库和网格的次数会相乘。
- [微服务 10](../10-observability/) — 应用继续传播 trace context。本页不重讲采集管道。
- [微服务 11](../11-security/) — 用户令牌和业务授权。
- [微服务 12](../12-containers-k8s/) — 工作负载和 Service。本页不安装集群。

---

← [上一节：容器与编排](../12-containers-k8s/) · [返回 微服务](../) · [下一节：持续交付与 GitOps](../14-cicd-gitops/) →
