# 容器与编排 {#containers-kubernetes}

> [微服务](../) › 容器与编排

镜像保证可重现和可缓存的前提是钉住版本、不用 `latest`；编排保证的是向声明的期望状态收敛，探针和 HPA 只在配置与进程的实际行为一致时才起作用。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[注册发现与配置](../03-discovery-config/) 写了名字怎么变成实例、配置从哪来，并把 Service 与 ConfigMap 的平台细节指到本页。[可观测性](../10-observability/) 依赖探针和 Actuator 端点。[安全](../11-security/) 要求密钥不进镜像。本页写服务实际跑在什么上面。可重复构建、来源、晋级门禁和回滚是 [DevOps](../../devops/) 的约定（[可重复](../../devops/01-repeatability/)、[来源](../../devops/02-provenance/)、[晋级](../../devops/03-promotion-gating/)、[回滚](../../devops/04-rollback-audit/)），本页是一次实现，不重写那些约定。堆和 GC 的原理回链 [Java 06](../../java/06-jvm/)。网格、流水线、原生镜像分别在 [13](../13-service-mesh/)、[14](../14-cicd-gitops/) 和 [16](../16-cloud-native-java/)，这里只点到。

## 编排保证的是向期望状态收敛 {#_2}

Deployment 声明副本数和滚动策略。控制器把实际状态推向这份声明，而不是「执行一次脚本就结束」。Service 给一组 Pod 一个稳定的访问入口，并且只把流量送到已经就绪的端点。发现与配置刷新的合同仍以 03 为准；这里只写平台对象本身的语义。

ConfigMap 把配置从镜像里拿出来。Secret 把口令、令牌和密钥从镜像和 Pod 规约里拿出来。2026-11-13 的 [Secret 概念页](https://kubernetes.io/docs/concepts/configuration/secret/) 写明：默认存放在 API 服务器的底层存储（etcd）里，并且是未加密的；要安全使用，至少要开启 Encryption at Rest，并用 RBAC 收紧访问。清单里的 base64 是序列化，不是这层加密。

## Java 镜像保证可重现和可缓存 {#java}

Buildpacks 或 Jib，加上 Spring Boot 分层 jar，让依赖层可以缓存：应用层的小改动只重推一层，少维护一份手写 Dockerfile。可重现的前提是钉住基础镜像和构建器的版本，不用 `latest`。密钥不要 `COPY` 进镜像，这与 11 的要求是同一句。本页不新增 Jib 或 Buildpacks 的版本号。

## 三类探针各自管什么 {#probes}

<span id="_5"></span>

startupProbe 给慢启动留时间，避免 liveness 在进程还没起来时就把它杀掉。原生镜像的启动特征不同，例外只点这一句，细节回指 16。readinessProbe 失败时，Pod 从 Service 端点里摘掉，不接新流量，容器不一定重启。livenessProbe 用于死锁这类不会自己恢复的状态。它不能过于敏感，也不能拿来代替 readiness：启动期反复失败的是就绪，不是「进程已死」。

Spring Boot 在 Kubernetes 上把这两个健康组暴露为 `/actuator/health/readiness` 和 `/actuator/health/liveness`。下面的片段只做了 YAML 语法解析，没有应用到集群。

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

## 资源是调度和扩缩的基准 {#resources-hpa}

request 是调度依据，limit 是上限。CPU 超过 limit 会被节流，内存超过 limit 会被 OOMKill。不设额度时，节点一抖，Pod 会互相饿死。

HPA 按 CPU 利用率扩缩时，这个利用率是相对 request 算的。2026-11-13 的 [HPA 概念页](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) 写明：目标是利用率时，控制器把用量算成各容器对应 resource request 的百分比。不设 request，就没有这个基准，扩缩没有可靠的输入。

## JVM 按容器里的可用内存定堆 {#jvm-in-container}

JDK 25 的 [`java` 命令手册](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html) 写明：`-XX:+UseContainerSupport` 默认是 true，容器支持默认开启，虚拟机据此确定容器里的 Java 进程可用多少内存、多少处理器。`-XX:MaxRAMPercentage` 的默认值是 25%。堆只是其中一块。元空间、线程栈和直接内存还在堆外。这几块加起来超过容器内存上限，进程会被 OOMKill，所以要留余量。只写这个成立条件，不展开 GC 调优；原理在 Java 06，排障在 Java 11。

## Helm 用 chart 区分环境 {#helm}

Helm 用 chart 和 values 做模板，把 dev 和 staging 的副本数、环境变量分开。Helm 4 是当前主线。**4.3.2** 发布于 2026-11-13：GitHub Latest 是 v4.3.2（2026-11-13T04:53:35Z），[get.helm.sh](https://get.helm.sh/helm-v4.3.2-linux-amd64.tar.gz.sha256sum) 已有该版本的校验和。Helm 文档的版本选择器当日仍显示 4.3.1 和 3.22.1，选择器滞后，不以它代替发布。Helm 3 的维护线是 3.22.1，不要和 4.3.2 混成一个版本。4.3.0-rc.1 是预发布，不是默认。

## 三种构建方式是条件 {#build-choice}

<span id="_6"></span>

| 构建方式 | 它适合什么 | 前提 |
|----------|------------|------|
| Dockerfile + 分层 jar | 需要自己控制每一层 | 基础镜像的版本和 CVE 要有人维护 |
| Jib | 可以不依赖本机 Docker daemon | 插件配置本身要钉住 |
| Buildpacks | 约定优于一份手写 Dockerfile | 构建器版本要钉住，不用 `latest` |

## 版本只钉稳定线 {#k8s-versions}

- Docker Engine **29.9.3**。[Engine v29 发行说明](https://docs.docker.com/engine/release-notes/29/) 目录首项是 29.9.3。GitHub 非预发布 Latest 是 `docker-v29.9.3`（2026-11-03）。`docker-v29.10.0-rc.2`（2026-11-12）是预发布。
- Kubernetes **1.37.2**。2026-11-13 的 [dl.k8s.io/release/stable.txt](https://dl.k8s.io/release/stable.txt) 内容是 `v1.37.2`，GitHub 非预发布同为 v1.37.2（2026-10-28）。[kubernetes.io/releases](https://kubernetes.io/releases/) 当日仍写 1.37 Latest Release: 1.37.1，页面滞后，以 stable.txt 为准。v1.38.0-beta.0（2026-11-06）是预发布。
- Helm **4.3.2**，出处在上文 Helm 一节。文档选择器上的 4.3.1 不是更新的发布。

## 常见误读 {#_3}

<span id="_7"></span>

- 「只用 liveness 表示业务还没就绪。」启动期会反复杀进程。就绪看 readiness，慢启动看 startup。
- 「不设 request 和 limit，调度会自己看着办。」没有额度时，节点抖动会互相饿死；HPA 的 CPU 利用率也没有基准。
- 「镜像标签用 `latest` 更省事。」构建不可重现，缓存也失去意义。
- 「容器里看得到宿主机的全部内存，堆可以按那块来设。」超过容器内存上限会被 OOMKill。堆之外还有元空间、线程栈和直接内存。
- 「Secret 做了 base64 就是加密。」概念页写的是默认明文存在 etcd，静态加密要另开。
- 「密钥可以 `COPY` 进镜像，反正有 Secret。」层一旦发出去，轮换清不掉。
- 「Kubernetes 1.38 beta、Docker 29.10 rc、Helm 文档选择器上的 4.3.1 是当前默认。」稳定线是 1.37.2、29.9.3 和 4.3.2。

## 可选核对 {#k8s-check}

<span id="_8"></span>

探针和内存条件已经写在上面。这两问只核对它们。

1. readinessProbe 失败与 livenessProbe 失败各自导致什么？
2. 为什么 Java 服务要特别关注容器内存 limit？

<details markdown><summary>参考答案</summary>

1. readiness 失败时，Pod 从 Service 端点里摘掉，不再接新流量，容器不一定重启。liveness 失败时，kubelet 会重启容器。慢启动用 startupProbe 挡住过早的 liveness，而不是拿 liveness 代替 readiness。
2. 堆之外还有元空间、线程栈和直接内存。加起来超过容器内存上限就会被 OOMKill。JDK 25 的 `MaxRAMPercentage` 默认只把堆限制在可用内存的 25%，余下要留给非堆。

</details>

<span id="_10"></span>

## 资料索引 {#_4}

<span id="_9"></span>

- [Kubernetes 概念](https://kubernetes.io/docs/concepts/) — Deployment、Service、ConfigMap、Secret 的平台语义。
- [Secret](https://kubernetes.io/docs/concepts/configuration/secret/) — 2026-11-13：默认未加密存放在 etcd；Encryption at Rest 要另行开启。
- [探针配置](https://kubernetes.io/docs/concepts/workloads/pods/probes/) — startup、readiness、liveness 的分工。
- [HPA](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) — 利用率是相对 resource request 的百分比。
- [Spring Boot 容器镜像](https://docs.spring.io/spring-boot/reference/packaging/container-images/index.html) — 分层 jar、Dockerfile 与 Buildpacks。
- [Spring Boot Actuator 端点](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html) — `/actuator/health/liveness` 与 `/actuator/health/readiness`。
- [JDK 25 `java` 命令](https://docs.oracle.com/en/java/javase/25/docs/specs/man/java.html) — `UseContainerSupport` 默认 true；`MaxRAMPercentage` 默认 25%。
- [Helm 文档](https://helm.sh/docs/) — chart 与发布。选择器当日仍是 4.3.1 / 3.22.1；已发布的主线是 GitHub Latest v4.3.2（2026-11-13）与 [get.helm.sh 校验和](https://get.helm.sh/helm-v4.3.2-linux-amd64.tar.gz.sha256sum)。
- [Docker Engine v29 发行说明](https://docs.docker.com/engine/release-notes/29/) — 目录首项 29.9.3。`docker-v29.10.0-rc.2` 是预发布。
- [Kubernetes 发布页](https://kubernetes.io/releases/) 与 [stable.txt](https://dl.k8s.io/release/stable.txt) — 页面仍写 1.37.1；stable.txt 是 v1.37.2。
- [Jib](https://github.com/GoogleContainerTools/jib) 与 [Buildpacks](https://buildpacks.io/) — 少维护 Dockerfile 的两条构建路径。本页不钉版本号。
- [DevOps](../../devops/) — 可重复、来源、晋级与回滚的约定。本页是一次实现。
- [微服务 03](../03-discovery-config/) — 发现与配置刷新。本页只写 Service / ConfigMap / Secret 的平台语义。

---

← [上一节：安全](../11-security/) · [返回 微服务](../) · [下一节：服务网格](../13-service-mesh/) →
