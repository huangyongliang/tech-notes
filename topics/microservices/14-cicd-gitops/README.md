# 持续交付与 GitOps CI/CD {#gitops-cicd-gitops}

> [微服务](../) › 持续交付与 GitOps

从提交到上线的流水线，以及以 Git 为唯一事实来源的声明式部署、灰度发布。通用基础见 [DevOps](../../devops/)。

## 本关定位

微服务放大了发布频率与失败面。本关把 CI（构建验证）与 CD / GitOps（集群状态收敛）分开看清，并掌握金丝雀 / 蓝绿与 Argo Rollouts、Flux 等工具定位。

## 闯关任务

- [ ] 能够画出「提交 → 构建 → 制品 → 部署 → 验证 → 回滚」的流水线。
- [ ] 能够解释 GitOps 的期望状态与集群实际状态的协调循环。
- [ ] 能够对比 Argo CD 与 Flux 的使用侧重点。
- [ ] 能够用 Argo Rollouts（或等价能力）描述金丝雀步骤与自动回滚条件。
- [ ] 能够说明镜像 tag 不可变与环境晋级（promotion）策略。

## 知识要点

### 版本基线

GitHub Actions（托管 CI）；Argo CD 3.6.1；Argo Rollouts 1.10.2；Flux 2.10.0。

### GitOps 原则

期望状态存 Git；自动同步与漂移检测；变更可审计。密钥仍走密封密钥 / 外部密钥管理，而不是明文进库。

### 渐进交付

下面是简化示意，只做了 YAML 语法解析，没有应用到集群。

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

分析器可对接 Prometheus 指标，错误率升高自动回滚。

## 选型对比

| 工具 | 版本基线 | 角色 |
|------|----------|------|
| GitHub Actions | 托管 | CI 构建 / 测试 / 签名 |
| Argo CD | 3.6.1 | GitOps 持续部署与 UI |
| Argo Rollouts | 1.10.2 | 渐进交付（金丝雀等） |
| Flux | 2.10.0 | GitOps 工具链（多控制器） |

## 常见误区

- 在流水线里 `kubectl apply` 一堆手工命令且无 Git 溯源。
- 使用可变的 `latest` 做生产晋级。
- 金丝雀只按时间切流，不看错误率 / 延迟。
- GitOps 仓库与应用仓库权限过大，人人可改生产期望状态。

## 实践任务

- [ ] 用 GitHub Actions 构建镜像并推到仓库，tag 使用 Git SHA。
- [ ] 部署 Argo CD 应用，故意改集群资源，观察漂移与同步。
- [ ] 为一次发布写清：成功标准、自动回滚阈值、人工审批点。

## 资料索引

- [Argo CD 文档](https://argo-cd.readthedocs.io/en/stable/) — GitOps CD
- [OpenGitOps 原则](https://opengitops.dev/) — 原则定义
- [Argo Rollouts](https://argoproj.github.io/rollouts/) — 渐进交付
- [Flux 文档](https://fluxcd.io/flux/) — Flux 家族
- [GitHub Actions 文档](https://docs.github.com/en/actions) — CI 工作流

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】GitOps 中「唯一事实来源」通常指：
    - A. 某台跳板机上的临时脚本
    - B. Git 中的期望状态声明
    - C. 聊天记录
    - D. 口头约定
2. 【单选】Argo Rollouts 1.10.2 更擅长：
    - A. 替代关系数据库
    - B. 金丝雀等渐进交付
    - C. 仅写前端 CSS
    - D. 证书颁发机构
3. 【简答】为什么生产镜像 tag 推荐不可变？
4. 【单选】Flux 2.10.0 与 Argo CD 都可归类为：
    - A. 仅消息队列
    - B. GitOps 持续部署工具
    - C. 仅 JVM
    - D. 仅浏览器
5. 【简答】金丝雀发布自动回滚通常应观察哪些信号？

<details markdown><summary>参考答案</summary>

1. B — 以 Git 声明为准收敛集群。
2. B — 与 Deployment 渐进策略互补。
3. 保证可追溯与可重现；`latest` 会在不知情时改变含义。
4. B — 二者均为主流 GitOps CD。
5. 错误率、延迟、饱和度等 SLI；也可用业务指标（下单成功率等）。

</details>

---

← [上一节：服务网格](../13-service-mesh/) · [返回 微服务](../) · [下一节：测试](../15-testing/) →
