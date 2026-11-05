# 服务网格 Service Mesh

> [微服务](../) › 服务网格

把流量治理、mTLS、可观测下沉到基础设施。重点比较 sidecar 与 Istio ambient（无 sidecar）模式。

## 主流选型

- Istio 1.31.3（ambient 模式自 1.24 起 GA）
- Linkerd（自 2024-02 起开源项目只发布 edge 版，最新 edge-26.11.1；stable 版由 Buoyant Enterprise for Linkerd 提供）

## 建议先收的资料

- Istio ambient 文档
- 网格性能对比
- 何时不需要网格的讨论

## 资料索引

- [Istio Ambient 模式](https://istio.io/latest/docs/ambient/) — ambient 官方文档
- [Istio 1.24 发布公告（ambient GA）](https://istio.io/latest/news/releases/1.24.x/announcing-1.24/) — ambient GA 说明
- [Linkerd Releases（stable 政策）](https://linkerd.io/releases/) — edge / stable 发布政策

---

← [上一节：容器与编排](../12-containers-k8s/) · [返回 微服务](../) · [下一节：持续交付与 GitOps](../14-cicd-gitops/) →
