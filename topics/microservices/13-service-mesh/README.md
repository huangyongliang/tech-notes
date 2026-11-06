# 服务网格 Service Mesh

> [微服务](../) › 服务网格

把流量治理、mTLS、可观测下沉到基础设施。重点比较 sidecar 与 Istio ambient（无 sidecar）模式。

## 本关定位

当服务数量与语言变多，把重试、mTLS、观测重复实现在每个 SDK 里成本过高。本关理解网格的价值与代价，并掌握 Istio ambient GA 后的模式选择——不是每个系统都需要网格。

## 闯关任务

- [ ] 能够说明 sidecar 模式与 Istio ambient（ztunnel / waypoint）的差异。
- [ ] 能够列出网格擅长的能力（mTLS、流量拆分、故障注入）与不擅长的（业务鉴权细节）。
- [ ] 能够解释为何「尚未稳定的服务边界」上网格帮不上忙。
- [ ] 能够说明 Linkerd 开源发布策略（edge vs 企业 stable）避免版本误读。
- [ ] 能够设计「先应用层容错、后网格」或反向的引入顺序并说明理由。

## 知识要点

### Istio ambient

Istio 1.31.3；ambient 模式自 1.24 起 GA（见 1.24 发布公告）。节点级 ztunnel 处理 L4，需要 L7 时再加 waypoint，降低 sidecar 资源与侵入。

### 何时上网格

适合：多语言东向流量、统一 mTLS、渐进交付与故障注入由平台团队运营。不适合：服务不足、平台能力不足、指望网格自动修好错误的 API 设计。

### Linkerd

自 2024-02 起开源项目以 edge 发布为主，最新可见 `edge-26.11.1`；stable 由 Buoyant Enterprise for Linkerd 提供。引用版本时写明 edge / 企业渠道。

```mermaid
flowchart LR
  App[工作负载] --> Z[ztunnel L4]
  Z --> W[waypoint L7 可选]
  W --> Dest[目标服务]
```

## 选型对比

| 方案 | 版本基线 | 数据面 | 备注 |
|------|----------|--------|------|
| Istio sidecar | 1.31.3 | Envoy sidecar | 成熟 L7，资源占用较高 |
| Istio ambient | 自 1.24 GA | ztunnel ± waypoint | 降低 sidecar 成本 |
| Linkerd | edge-26.11.1（开源） | 微代理 | 注意 edge / 企业 stable 政策 |

## 常见误区

- 没有可观测与证书体系就「全量开 mTLS」。
- 应用重试 + 网格重试无协调。
- 把网格当服务发现与配置中心的唯一来源却不理解 DNS / 抽象层。
- 将 Linkerd edge 版本直接写成生产 stable。

## 实践任务

- [ ] 阅读 ambient 文档，用自己的话解释 ztunnel 与 waypoint 分工。
- [ ] 在测试集群对单个命名空间开启 mTLS STRICT，观察未注入工作负载的失败模式。
- [ ] 写一页「我们暂不上网格」的决策记录（触发条件清单）。

## 资料索引

- [Istio Ambient 文档](https://istio.io/latest/docs/ambient/) — 无 sidecar 模式
- [Istio 1.24 公告（ambient GA）](https://istio.io/latest/news/releases/1.24.x/announcing-1.24/) — GA 说明
- [Linkerd Releases 政策](https://linkerd.io/releases/) — edge / stable
- [Istio 最新文档](https://istio.io/latest/docs/) — 流量管理总览

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Istio ambient 模式自哪个版本起 GA？
    - A. 0.1
    - B. 1.24
    - C. 仅设计文档从未发布
    - D. 2.0 独占
2. 【单选】ambient 中负责节点级 L4 的组件通常是：
    - A. 仅 kube-proxy 替换名
    - B. ztunnel
    - C. 仅 etcd
    - D. 仅 Contour UI
3. 【简答】网格不能替代什么应用职责？
4. 【单选】关于 Linkerd 开源发布，更准确的是：
    - A. 只有每年一个 stable 且人人免费无限
    - B. 开源主发 edge，stable 由企业发行提供
    - C. 从不发版
    - D. 只能跑在 Windows XP
5. 【简答】为什么说不是所有微服务都需要服务网格？

<details markdown><summary>参考答案</summary>

1. B — 1.24 公告宣布 ambient GA。
2. B — ztunnel 处理 L4；L7 用 waypoint。
3. 业务鉴权规则、领域级降级文案、正确的 API 与事务边界等。
4. B — 见官方 releases 政策说明。
5. 引入运维与认知成本；服务少、语言单一、平台未就绪时收益有限甚至为负。

</details>

---

← [上一节：容器与编排](../12-containers-k8s/) · [返回 微服务](../) · [下一节：持续交付与 GitOps](../14-cicd-gitops/) →
