# 容器与编排 {#containers-kubernetes}

> [微服务](../) › 容器与编排

镜像构建（Jib、Buildpacks、分层 jar）、K8s 部署、探针、HPA 与 Helm 打包。通用部分链接 [DevOps](../../devops/)。

## 本关定位

容器与编排是微服务的默认运行时。本关聚焦 Java 镜像构建最佳实践与 K8s 部署关键点（探针、资源、滚动发布），细节运维通识链回 devops 主题。

## 闯关任务

- [ ] 能够用分层 jar / Buildpacks / Jib 构建较小且缓存友好的镜像。
- [ ] 能够编写 Deployment + Service 的基本清单，并配置 readiness / liveness / startupProbe。
- [ ] 能够解释资源 request/limit 与 HPA 的关系。
- [ ] 能够用 Helm 4 打包可配置的多环境发布。
- [ ] 能够说明 JVM 在容器中的内存与 CPU 感知注意点。

## 知识要点

### 版本基线

Docker Engine 29.9.3（Moby `docker-v29.9.3`）；Kubernetes 1.37.2；Helm 4.3.1。

### Java 镜像

优先：Buildpacks 或 Jib（少维护 Dockerfile）+ Spring Boot 分层 jar，让依赖层可缓存。不要把密钥 `COPY` 进镜像。

### 探针

- startupProbe：慢启动（原生镜像例外）避免误杀。
- readinessProbe：未就绪不接流量。
- livenessProbe：死锁自愈，避免过于敏感。

下面的探针片段只做了 YAML 语法解析，没有应用到集群。

```yaml
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  periodSeconds: 5
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  periodSeconds: 10
```

## 选型对比

| 构建方式 | 优点 | 注意 |
|----------|------|------|
| Dockerfile + 分层 jar | 可控 | 需维护基础镜像 CVE |
| Jib | 无需 Docker daemon（可） | 学习插件配置 |
| Buildpacks | 约定优于配置 | 构建器版本需锁定 |

## 常见误区

- 只用 liveness 做业务 readiness，导致启动期反复杀进程。
- 不设资源额度，节点抖动时互相饿死。
- 镜像用 `latest` 且不可重现。
- 在容器内「看得到全部主机内存」却不限制堆，被 OOMKill。

## 实践任务

- [ ] 用 Spring Boot 分层 jar 建镜像，对比前后镜像层缓存命中。
- [ ] 部署两副本，验证 readiness 失败时 Service 不转发。
- [ ] 写一份 Helm chart values，区分 dev / staging 的副本数与环境变量。

## 资料索引

- [Kubernetes 概念](https://kubernetes.io/docs/concepts/) — 官方概念
- [Spring Boot 容器镜像](https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html) — 分层与构建
- [Helm 文档](https://helm.sh/docs/) — Chart 与发布
- [Docker Engine 文档](https://docs.docker.com/engine/) — 引擎基础
- [Jib](https://github.com/GoogleContainerTools/jib) — 无 Dockerfile 构建
- [Buildpacks](https://buildpacks.io/) — 云原生构建包

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】readinessProbe 失败时，通常效果是：
    - A. 立刻删除命名空间
    - B. 从 Service 端点摘除，不接新流量
    - C. 格式化磁盘
    - D. 自动改代码
2. 【单选】Kubernetes 1.37.2 这类版本号来自：
    - A. 随机
    - B. 官方发布（版本基线经 GitHub Releases 核对）
    - C. 仅营销文案
    - D. JDK 版本
3. 【简答】为什么 Java 服务要特别关注容器内存 limit？
4. 【单选】Helm 的主要作用是：
    - A. 替代业务数据库
    - B. 打包、模板化并管理 K8s 应用发布
    - C. 仅做前端打包
    - D. 替换 TCP
5. 【简答】startupProbe 解决什么问题？

<details markdown><summary>参考答案</summary>

1. B — 未就绪不进入负载均衡池。
2. B — 与大纲基线一致，已复核。
3. 若堆 + 元空间 + 直接内存超过 cgroup limit，会被 OOMKill；需让 JVM 感知容器限制并留余量。
4. B — 应用交付的包管理与配置分层。
5. 给慢启动应用足够启动时间，避免 liveness 过早杀死尚未就绪的进程。

</details>

---

← [上一节：安全](../11-security/) · [返回 微服务](../) · [下一节：服务网格](../13-service-mesh/) →
