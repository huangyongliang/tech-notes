# 持续交付与 GitOps {#gitops-cicd-gitops}

> [微服务](../) › 持续交付与 GitOps

CI 产出带身份的制品，GitOps 持续把实际状态推向声明；这一步是否继续，要由证据决定，而不是由暂停时间决定。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[容器与编排](../12-containers-k8s/) 给出运行载体。[测试](../15-testing/) 给出分层证据。[可观测性](../10-observability/) 和 [SRE](../../sre/) 给出观察指标。可重复、来源、晋级门禁和回滚审计是 [DevOps](../../devops/) 的约定（[可重复](../../devops/01-repeatability/)、[来源](../../devops/02-provenance/)、[晋级](../../devops/03-promotion-gating/)、[回滚](../../devops/04-rollback-audit/)）。本页只写一种实现：Actions 做 CI，协调器把声明推向集群，Rollouts 做渐进步骤。不重写那四章，也不把 DevOps 写成工具目录。

## CI、持续部署与协调循环分开看 {#_2}

提交触发构建、测试和签名，产出镜像 digest，以及来源和测试证据。CD 把同一个 digest 晋级到下一个环境。GitOps 控制器读取受控的期望声明，和观测到的状态比较，再去协调。

CI 绿只说明这次检查通过。sync 绿只说明目标资源符合声明。两者都不证明用户成功率。持续交付的意思是制品可以发布；是否自动推进到下一环境，仍由门禁决定。自动持续部署是另一项选择，不是 GitOps 这个名字自带的。

## GitOps 的事实来源是期望状态 {#gitops}

[OpenGitOps Principles v1.0.0](https://opengitops.dev/) 是四条：期望状态必须声明式；存放方式要不可变、有版本、留得住完整历史；软件代理自动拉取声明；代理持续观察实际状态并试图施加期望状态。

漂移检测和 self-heal 是配置，不是「装上 Argo CD 就全部自动修复」。紧急时直接改集群资源，要么回写声明，要么明确暂停协调，否则下一轮会被覆盖。密钥不进 Git 明文。Git 历史是期望变更的历史，不代替运行时审计和指标。它是被承认的期望状态来源，不是运行时全部事实的唯一记录。

## Actions 服务、action tag 与运行时不是一个版本 {#actions-boundaries}

GitHub Actions 是托管的 CI 能力，没有「Actions 7」这种统一产品版本。每个 action 自己发版。action 内部的 JavaScript 运行时，和项目要编译的 JDK，不是同一层：前者跟着 action 的实现走，后者由负责安装 JDK 的 action 按工程需要安装，仍然可以是 JDK 25。具体标签和 `action.yml` 里的运行时写在资料索引。

本页不新增完整 workflow。生产依赖应 pin 到核实过的完整 commit SHA；`@v7` 不是不可变身份。本文不编造 SHA。最小权限、不可信的 PR 输入、OIDC 短期身份只点到这里，细节回 [11](../11-security/)。

## 制品晋级与权限边界 {#promotion-identity}

同一个 digest 跨环境晋级，不为每个环境重新构建。Git SHA 可以做成镜像 tag，用来追溯那次提交，但 tag 仍可能被覆盖，所以它不等于 digest 不变。应用源码仓和环境声明仓可以分开，权限各自收小，避免构建凭证同时能任意改生产期望。来源和晋级门禁回 DevOps 02 / 03。

## 渐进交付要让证据决定下一步 {#progressive-delivery}

<span id="_5"></span>

金丝雀是把新版本逐步放进一小部分流量。蓝绿是准备两套环境再切换。下面的片段只做了 YAML 语法解析，没有应用到集群。它逐字保留原页的权重和暂停，没有完整的 Rollout，也没有 AnalysisTemplate 或 AnalysisRun。

```yaml
# Argo Rollouts 金丝雀示意（简化）
strategy:
  canary:
    steps:
      - setWeight: 10
      - pause: { duration: 5m }
      - setWeight: 50
      - pause: { duration: 5m }
```

这段只示范步骤和停顿。它不会自己读取 Prometheus，也不会因为错误率升高而回滚。要让证据决定下一步，需要另接分析：成功、失败、无数据各自是什么条件。2026-11-23 的 [analysis 文档](https://argoproj.github.io/argo-rollouts/features/analysis/) 写明，完成的分析可以是 Successful、Failed 或 Inconclusive，分别让更新继续、中止或暂停。没有这份分析，暂停只是时间。没有流量路由器时，[canary 文档](https://argoproj.github.io/argo-rollouts/features/canary/) 说明基本金丝雀要靠调节金丝雀副本规模来近似权重，`setWeight: 10` 不是精确的 10% 请求。把权重交给网格或入口，回 [13](../13-service-mesh/) 和 [02](../02-api-gateway/)，本页不加第二份完整配置。

## 回滚撤回的是哪一件事 {#rollback-scope}

Rollouts 的 abort 停的是当前 rollout，把流量从这次金丝雀上拿回来。Git revert 改的是期望版本。数据库的向后兼容是第三件事。Git revert 撤不回已经发出的消息和已经写下的请假记录。没有数据时，不要把「没有失败样本」当成成功。人工审批和暂停点要写在步骤里。业务信号可以用请假提交成功率这种既有说法，不另编一套订单故事。

## 工具分工与版本线 {#delivery-choice}

<span id="_6"></span>

| 工具 | 版本基线 | 它负责什么 |
|------|----------|------------|
| GitHub Actions | 托管服务，无统一 semver | CI：构建、测试、签名 |
| Argo CD | 3.6.2 | GitOps 协调，偏 Application 和可视化入口 |
| Flux | 2.10.1 | GitOps 协调，一组可组合的控制器 |
| Argo Rollouts | 1.10.2 | 渐进步骤。1.11.0-rc1 不是默认 |

2026-11-23：Argo CD 非预发布 v3.6.2 的 `published_at` 是 2026-11-18T19:55:54Z（Asia/Shanghai 为 2026-11-19）。同日还有 3.5.8 和 3.4.14 维护线。stable 升级文档的最新线是 3.6。Flux v2.10.1 发布于 2026-11-20；官方发行导航的当前线是 v2.10，2.9.6 是维护线。Rollouts 的 GA 是 v1.10.2（2026-11-04）；v1.11.0-rc1（2026-11-05）是预发布。Argo CD 和 Flux 都做 reconcile，不是一场性能擂台。

## 常见误读 {#_3}

<span id="_7"></span>

- 「流水线里 kubectl 命令多，就是 GitOps。」没有受控的期望声明和协调循环，就还是命令。
- 「`latest` 或 Git SHA tag 已经不可变。」tag 可以被覆盖。身份是 digest。
- 「YAML 里有 pause，就有错误率分析。」pause 只是停顿。
- 「setWeight: 10 就是精确 10% 的请求。」没有流量路由器时，这是副本规模上的近似。
- 「sync 成功就是业务成功。」它只说明资源符合声明。
- 「Git revert 撤得回数据库副作用和已经发出的消息。」它只改期望版本。

## 可选核对 {#delivery-check}

<span id="_8"></span>

制品身份和这段 YAML 的边界已经写在上面。这两问只核对它们。

1. 为什么固定镜像 digest 比只用 Git SHA tag 更准确地描述晋级身份？
2. 只有 setWeight 和 pause 时，能否保证错误率升高就自动回滚？还缺什么？

<details markdown><summary>参考答案</summary>

1. Git SHA tag 可以指向那次提交，但 tag 仍可能被改写。digest 标识的是那一份制品内容，晋级过去的还是同一份。
2. 不能。这段只有权重和停顿，没有 AnalysisTemplate 或 AnalysisRun，不会读取错误率。Failed 分析才能 abort；没有流量路由器时，权重还只是副本近似。

</details>

<span id="_10"></span>

## 资料索引 {#_4}

<span id="_9"></span>

- [OpenGitOps Principles v1.0.0](https://opengitops.dev/) — 声明式、版本化不可变、自动拉取、持续协调。页面没有单独的发行日期。
- [Argo CD 发行](https://github.com/argoproj/argo-cd/releases) 与 [stable 升级线](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/overview/) — v3.6.2 为 3.6 线当前 GA。3.5.8 / 3.4.14 是维护线。
- [Flux 发行说明](https://fluxcd.io/flux/releases/) 与 [GitHub Releases](https://github.com/fluxcd/flux2/releases) — 当前线 v2.10，补丁 2.10.1（2026-11-20）。2.9.6 是维护线。
- [Rollouts canary](https://argoproj.github.io/argo-rollouts/features/canary/) 与 [analysis](https://argoproj.github.io/argo-rollouts/features/analysis/) — setWeight 在没有流量路由器时近似副本权重；Failed 分析 abort，Inconclusive 暂停。GA 是 1.10.2，1.11.0-rc1 不是默认。
- [GitHub Actions 安全加固](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions) — 将 action pin 到完整 commit SHA。本文不编造 SHA。
- [actions/checkout v7.0.1](https://github.com/actions/checkout/blob/v7.0.1/action.yml)（2026-07-20）、[setup-java v6.3.0](https://github.com/actions/setup-java/blob/v6.3.0/action.yml)（2026-11-14）、[upload-artifact v7.0.2](https://github.com/actions/upload-artifact/blob/v7.0.2/action.yml)（2026-10-07）— 2026-11-23 核对的固定标签。三份 `action.yml` 的 `runs.using` 都是 `node24`，那是 action 的 JavaScript 运行时，不是项目的编译 JDK。
- [DevOps 03](../../devops/03-promotion-gating/) 与 [DevOps 04](../../devops/04-rollback-audit/) — 晋级门禁和回滚审计。本页是一次实现。

---

← [上一节：服务网格](../13-service-mesh/) · [返回 微服务](../) · [下一节：测试](../15-testing/) →
