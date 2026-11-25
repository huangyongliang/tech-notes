# LLMOps 与 GPU 基础设施 {#llmops-gpu-llmops-gpu-infra}

> [AI](../) › LLMOps 与 GPU 基础设施

整卡、MIG 和时间片不能同时拿到最强隔离和最高利用率。分布式训练要么整组启动，要么整组等待。推理扩缩看排队、KV 和 TTFT，不看 CPU。下面的配额和副本数是写死的算术，不是集群压测。

> 相关主题：[容器与 Kubernetes](../../microservices/12-containers-k8s/) · [持续交付与 GitOps](../../microservices/14-cicd-gitops/) · [推理与服务](../15-inference-serving/) · [微调与对齐](../14-fine-tuning/)

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

## 这一页补哪一块 {#_1}

GPU 软件栈、队列配额、推理服务和模型发布是四层。Kueue 决定一组 Pod 能不能一起进集群。它不是推理引擎里逐个请求的 continuous batching。回滚要连同索引和 adapter 的版本，不能只退容器。版本号仍是 2026-11-05 的记录。

## GPU 怎么分 {#gpu}

<span id="_2"></span>

节点上有驱动、CUDA 和容器运行时的 NVIDIA 扩展。GPU Operator 用来安装和升级驱动、Container Toolkit、Device Plugin 和 DCGM，避免每台机器手工装。Device Plugin 把 GPU 报成 `nvidia.com/gpu`，Pod 按整数张申请。DRA 用 ResourceClaim 按型号或显存筛选，比只数张数更细。

整卡隔离最好，利用率可能最低。MIG 在硬件上切成固定规格的实例，隔离强，规格不能随便改。时间片利用率高，但显存不隔离，一个进程 OOM 会碰到旁边的进程。

## 配额和整组准入 {#_4}

多个团队共用集群时，谁先提交谁先占卡，还会出现一部分 Pod 起来后空等其余 Pod。Kueue 让作业进 LocalQueue，由 ClusterQueue 的配额决定何时整组准入。同一 cohort 里可以借用空闲配额，借用有上限。

分布式训练要所有 Worker 同时就绪。少启动几个会占着卡却不能通信。拓扑上把同一作业放在同一机架或同一 NVLink 域，减少通信。

```yaml
# Kueue v0.20：为 GPU 配置配额（API 版本 v1beta2）
apiVersion: kueue.x-k8s.io/v1beta2
kind: ResourceFlavor
metadata:
  name: gpu-flavor
---
apiVersion: kueue.x-k8s.io/v1beta2
kind: ClusterQueue
metadata:
  name: team-a-cq
spec:
  namespaceSelector: {}
  resourceGroups:
  - coveredResources: ["cpu", "memory", "nvidia.com/gpu"]
    flavors:
    - name: gpu-flavor
      resources:
      - name: cpu
        nominalQuota: 64
      - name: memory
        nominalQuota: 512Gi
      - name: nvidia.com/gpu
        nominalQuota: 8
---
apiVersion: kueue.x-k8s.io/v1beta2
kind: LocalQueue
metadata:
  namespace: team-a
  name: team-a-queue
spec:
  clusterQueue: team-a-cq
```

作业用标签 `kueue.x-k8s.io/queue-name: team-a-queue` 进入队列。章内记下 Kueue 支持 batch Job、JobSet、RayJob、PyTorchJob。2026-11-25 没有把这份 YAML 应用到集群。

下面只模拟「配额够才整组放行」：

```python
# 模拟 Kueue 的配额准入：工作负载先排队，配额够才整体放行（Gang 语义）
quota = {"team-a": 8, "team-b": 8}           # 每个队列的 GPU 名义配额
used = {"team-a": 0, "team-b": 0}
borrow_limit = 4                              # 允许从同组空闲配额借用的上限
queue = [("训练 A1", "team-a", 8), ("推理压测 B1", "team-b", 2),
         ("训练 A2", "team-a", 4), ("训练 A3", "team-a", 8)]

for name, cq, gpus in queue:
    cohort_free = sum(quota.values()) - sum(used.values())   # 同组剩余总配额
    borrow = max(0, used[cq] + gpus - quota[cq])              # 超出自身配额的部分
    if gpus <= cohort_free and borrow <= borrow_limit:
        used[cq] += gpus
        note = f"，借用 {borrow} 张" if borrow else ""
        print(f"准入 {name}（{cq}，{gpus} GPU{note}）")
    else:
        print(f"排队 {name}（{cq}，{gpus} GPU）：配额不足，整体等待而不是部分启动")
print("当前占用：", used)
```

编写时的输出：

```text
准入 训练 A1（team-a，8 GPU）
准入 推理压测 B1（team-b，2 GPU）
准入 训练 A2（team-a，4 GPU，借用 4 张）
排队 训练 A3（team-a，8 GPU）：配额不足，整体等待而不是部分启动
当前占用： {'team-a': 12, 'team-b': 2}
```

Java 对照：

```java
class QuotaSim {
    public static void main(String[] args) {
        int qa = 8, qb = 8, ua = 0, ub = 0, borrowLimit = 4;
        String[] names = {"训练 A1", "推理压测 B1", "训练 A2", "训练 A3"};
        String[] team = {"team-a", "team-a", "team-a", "team-a"};
        team[1] = "team-b";
        int[] gpus = {8, 2, 4, 8};
        for (int i = 0; i < names.length; i++) {
            int used = team[i].equals("team-a") ? ua : ub;
            int quota = team[i].equals("team-a") ? qa : qb;
            int free = (qa + qb) - (ua + ub);
            int borrow = Math.max(0, used + gpus[i] - quota);
            if (gpus[i] <= free && borrow <= borrowLimit) {
                if (team[i].equals("team-a")) ua += gpus[i]; else ub += gpus[i];
                String note = borrow > 0 ? "，借用 " + borrow + " 张" : "";
                System.out.printf("准入 %s（%s，%d GPU%s）%n", names[i], team[i], gpus[i], note);
            } else {
                System.out.printf("排队 %s（%s，%d GPU）：配额不足，整体等待而不是部分启动%n", names[i], team[i], gpus[i]);
            }
        }
        System.out.printf("当前占用： {'team-a': %d, 'team-b': %d}%n", ua, ub);
    }
}
```

2026-11-25 用 Python 3.12.3 和 OpenJDK 21.0.13.0.3 重跑了这两段，打印与输出块一致。这是 8、8 和借用上限 4 的算术：A1 用满 team-a 的 8 张，B1 用 team-b 的 2 张，A2 再借 4 张，A3 的 8 张不够所以整组等待。不是一次集群压测，也没有 GPU。

## Ray {#ray}

Ray Core 用 `@ray.remote` 把函数和类变成任务和 Actor。Ray Train 和 Ray Data 做分布式训练和批推理。Ray Serve 编排在线的多个模型。KubeRay 在 Kubernetes 上管 RayCluster、RayJob 和 RayService，可以和 Kueue 一起排队。2026-11-25 没有安装 Ray。

## KServe 与 llm-d {#kserve-llm-d}

```yaml
# KServe 0.21：LLMInferenceService（API 版本 v1alpha2）
apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceService
metadata:
  name: qwen3-8b
spec:
  model:
    uri: hf://Qwen/Qwen3-8B
    name: Qwen/Qwen3-8B
  replicas: 2
  router:
    scheduler: {}
    route: {}
    gateway: {}
  template:
    containers:
      - name: main
        resources:
          limits:
            nvidia.com/gpu: "1"
          requests:
            nvidia.com/gpu: "1"
```

KServe 有两类资源。通用的 `InferenceService`（v1beta1）适合传统模型和简单的 LLM 部署。面向 LLM 的 `LLMInferenceService` 在章内记为基于 vLLM 和 llm-d，API 是 `v1alpha2`，字段可能变。llm-d 和 Gateway API Inference Extension 按队列长度和前缀缓存选择副本，不是普通轮询。引擎参数见 [推理与服务](../15-inference-serving/)。

`hf://Qwen/Qwen3-8B` 是示例 URI。2026-11-25 没有部署，没有下载这个模型。

## 副本数是占位算术 {#_5}

```python
import math

# 容量规划：根据峰值流量估算推理副本数（吞吐数据应来自你自己的压测）
peak_rps = 12                 # 峰值每秒请求数
avg_output_tokens = 400       # 平均每个请求生成的 Token
replica_tokens_per_s = 2500   # 单副本在目标 P95 延迟下压测得到的输出吞吐
gpus_per_replica = 1
headroom = 0.7                # 只用到 70% 容量，留出突发余量

need_tps = peak_rps * avg_output_tokens
replicas = math.ceil(need_tps / (replica_tokens_per_s * headroom))
print(f"峰值输出吞吐：{need_tps} tokens/s")
print(f"所需副本：{replicas}，GPU：{replicas * gpus_per_replica} 张")

# 每百万输出 Token 的 GPU 成本（单价为占位值，替换成你的实际价格）
gpu_hour_price = 2.0
cost_per_m = gpu_hour_price * gpus_per_replica / (replica_tokens_per_s * headroom * 3600) * 1_000_000
print(f"每百万输出 Token 成本：{cost_per_m:.2f}（与 GPU 单价同一货币单位）")
```

编写时的输出：

```text
峰值输出吞吐：4800 tokens/s
所需副本：3，GPU：3 张
每百万输出 Token 成本：0.32（与 GPU 单价同一货币单位）
```

```java
class CapacityPlan {
    public static void main(String[] args) {
        int peakRps = 12, avgOut = 400, replicaTps = 2500, gpus = 1;
        double headroom = 0.7;
        int need = peakRps * avgOut;
        int replicas = (int) Math.ceil(need / (replicaTps * headroom));
        double cost = 2.0 * gpus / (replicaTps * headroom * 3600) * 1_000_000;
        System.out.printf("峰值输出吞吐：%d tokens/s%n", need);
        System.out.printf("所需副本：%d，GPU：%d 张%n", replicas, replicas * gpus);
        System.out.printf("每百万输出 Token 成本：%.2f（与 GPU 单价同一货币单位）%n", cost);
    }
}
```

2026-11-25 重跑了 Python 和 Java，打印与输出块一致。12、400、2500、0.7 和单价 2.0 都是围栏里的占位。3 个副本和 0.32 不是测量到的集群结果。换成你自己的压测之前，不要把它写成容量结论。

扩缩看排队请求数、KV Cache 占用或 TTFT。CPU 利用率几乎反映不了 GPU 推理。冷启动来自拉镜像、加载数十 GB 权重和引擎预热，可能要数分钟。本地缓存和预热副本能缓解。缩到零只适合低频。训练可以用抢占实例，但要有检查点。在线推理保留按需实例兜底。这些缓解办法是章内已有的判断，不是今天的新测量。

## 发布清单 {#_6}

```mermaid
flowchart LR
  T[训练或微调] --> E[离线评测]
  E --> R[模型仓库]
  R --> C[灰度发布]
  C --> M[线上监控]
  M --> B[回滚或全量]
```

模型放在 Hub 或私有仓库，记下版本、数据来源和评测。版本和推理配置一起走 GitOps，灰度再放大，见 [持续交付与 GitOps](../../microservices/14-cicd-gitops/)。保留上一版本。分数或线上指标异常时切回。评测见 [评测与可观测](../17-evals-observability/)。

回滚不能只退容器。索引、embedding 和 adapter 若和这一版不兼容，要一起退。清单里包括模型 revision、tokenizer、chat template、adapter、量化参数、prompt 和索引版本。这和 [微调与对齐](../14-fine-tuning/) 的交付契约是同一份。

## 接流量之前 {#_7}

`startupProbe` 覆盖下载权重、加载和内核预热。成功之后才启用 liveness 和 readiness。readiness 表示能接受符合配置的推理请求，不是进程还在。慢启动不要被 liveness 反复杀掉。

终止时先撤流、拒绝新请求，再在宽限期内排空已经开始的流，并释放 GPU 和 KV。超时的任务记下可恢复的状态。`preStop` 和应用退出共用终止预算，不能把已经开始的生成无限延长。

Java 入口、检索和 GPU worker 分开扩。入口看连接、请求和队列。GPU 看等待、KV 和满足 SLO 的吞吐。Kueue 管的是工作负载能不能进集群，不是引擎内部逐请求的批处理队列。

权重从受控的制品库来，并校验哈希。镜像、驱动、CUDA、内核和引擎要在目标 GPU 上一起验证。保留冷启动、节点故障、供应商失联和预算耗尽的演练记录。本章没有做这些演练。

## 加在已有平台上 {#_8}

配置和 secret 沿用 [配置管理](../../microservices/03-discovery-config/)。探针、资源限制和网络策略沿用 [容器与 Kubernetes](../../microservices/12-containers-k8s/)。制品和评测门禁沿用 [持续交付与 GitOps](../../microservices/14-cicd-gitops/)。GPU、KV 和质量门禁是加上去的能力，不是换掉整套微服务运维。

## 版本是 2026-11-05 的记录 {#gpu-choice}

<span id="_9"></span>

| 组件 | 版本（2026-11-05 记录） | 职责 | 说明 |
|------|------|------|------|
| Kubernetes | 1.37.2 | 容器编排 | DRA 用于更灵活的设备分配 |
| NVIDIA GPU Operator | v26.7.2 | GPU 驱动与组件自动化 | 统一管理驱动、Device Plugin、DCGM |
| Kueue | v0.20.4 | 作业排队与配额 | 多团队共享集群、Gang 准入 |
| Ray | 2.60.0 | 分布式训练、批推理、Serve | Python 原生，KubeRay 部署 |
| KubeRay | 1.7.1（1.8.0-rc.0 为预发布） | Ray Kubernetes Operator | 与 Ray 版本分别管理 |
| KServe | 0.21.0 | 模型服务化 | `InferenceService` 与 `LLMInferenceService` |
| llm-d | 1.0.0 | K8s 原生分布式推理 | KV 感知路由、PD 分离 |

> [!WARNING]
> 版本于 2026-11-05 在 GitHub Release 与 PyPI 核对。Kueue 同时维护 v0.20.x 与 v0.19.x（v0.19.11），本页 YAML 使用 v0.20 文档中的 `v1beta2` API；KServe `LLMInferenceService` 仍是 alpha API（`v1alpha2`），字段可能变化；Kubernetes 1.38 目前仅有 alpha 预发布。2026-11-25 没有重开这些发布页，不把表内版本称为当天的当前版本。

## 常见误读 {#_3}

<span id="_10"></span>

- 用 CPU 利用率扩推理：瓶颈在显存和排队。
- 训练没有检查点：被抢占后只能重头来。
- 分布式训练不整组调度：部分 Worker 占卡但不能跑。
- 时间片当成隔离：显存仍共享。
- 每次扩容都从公网拉权重：冷启动又慢又不稳定。
- 把配额脚本的 12 张和 2 张当成集群实测。
- 把 3 个副本和 0.32 当成压测结论。
- 只回滚容器，留下不兼容的索引。

## 可选核对 {#gpu-check}

<span id="_11"></span>

1. 为什么 CPU 利用率不适合用来扩 LLM 推理？该看什么？
2. 分布式训练为什么不能先启动一部分 Worker？本页配额脚本证明的是哪条算术，不是哪次集群结果？

<details markdown><summary>参考答案</summary>

1. GPU 推理的等待在队列、KV 和首 Token，不在 CPU。扩缩看排队请求数、KV 占用或 TTFT。Kueue 的队列是作业能否进集群，不是引擎内部逐请求的批处理。
2. 少几个 Worker 时通信起不来，卡却被占着。脚本里的配额是 8 和 8，借用上限是 4：A2 借 4 张得以进入，A3 的 8 张不够就整组等待。2026-11-25 的重跑只核对这组数字，没有集群，也没有 GPU。

</details>

<span id="_13"></span>

## 资料索引 {#_12}

- [KServe 文档](https://kserve.github.io/website/) — Kubernetes 上的模型服务化；2026-11-25 未部署
- [Ray 文档](https://docs.ray.io/en/latest/) — 分布式 AI 计算；2026-11-25 未安装
- [NVIDIA GPU Operator 文档](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/index.html) — 驱动与组件；2026-11-25 未安装
- [Kueue 文档](https://kueue.sigs.k8s.io/docs/) — 作业排队与配额
- [Kubernetes 调度 GPU](https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/) — 官方 GPU 调度说明
- [Kubernetes 动态资源分配](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/) — DRA
- [Kubernetes 探针](https://kubernetes.io/docs/concepts/workloads/pods/probes/) — startup、readiness 与 liveness
- [Kubernetes Pod 生命周期](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) — 终止与宽限期
- [Kueue 概念](https://kueue.sigs.k8s.io/docs/concepts/) — 准入、配额与队列；YAML 是 v0.20 的 `v1beta2` 记录
- [KubeRay 发布记录](https://github.com/kuberay-project/kuberay/releases) — 1.7.1 为当时正式版，1.8.0-rc.0 为预发布

---

← [上一节：评测与可观测](../17-evals-observability/) · [返回 AI](../) · [下一节：安全与治理](../19-security-governance/) →
