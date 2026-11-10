# 安全 {#security}

> [微服务](../) › 安全

服务边界的认证授权：OAuth2 / OIDC、JWT、服务间 mTLS 与零信任。

## 本关定位

微服务把攻击面从「一个入口」变成「一群可互调的进程」。本关覆盖人类用户认证（OAuth2 / OIDC）与服务身份（mTLS / SPIFFE），以及 Spring Security 7 授权服务器坐标变化。

## 闯关任务

- [ ] 能够区分认证与鉴权，以及网关鉴权与服务内鉴权的分工。
- [ ] 能够说明 OAuth2 / OIDC 中 Authorization Code + PKCE 的适用场景。
- [ ] 能够配置资源服务器校验 JWT，并解释常见声明（iss、aud、exp、scope）。
- [ ] 能够说出 Spring Authorization Server 并入 Spring Security 7 后的 Maven 坐标。
- [ ] 能够描述服务间 mTLS 相对纯 JWT 传递的互补关系。

## 知识要点

### Spring Security 7

基线：Spring Security 7.1.2（Boot 4 / Framework 7 生态）。授权服务器坐标为 `org.springframework.security:spring-security-oauth2-authorization-server`（7.1.2）；独立项目最后版本为 1.5.8。

### 令牌与受众

JWT 需校验签发者、受众、过期与签名算法。服务间互调优先短寿命令牌 + 观众限制；不要把长寿命刷新令牌塞进内部 RPC。

### Keycloak 与 mTLS

Keycloak 26.8.1 可作为 IdP。服务网格（见 13 章）可提供 mTLS，实现传输层身份；与应用层授权（scope / 策略）互补，而非互相替代。下面的 YAML 只做了语法解析，没有启动资源服务器。2026-11-06 GitHub `releases/latest` 已是 Keycloak 26.8.2，本章仍沿用 2026-11-05 基线 26.8.1。

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://id.example.com/realms/demo
```

## 选型对比

| 能力 | 方案 | 版本基线 | 备注 |
|------|------|----------|------|
| 应用安全框架 | Spring Security | 7.1.2 | 资源服务器 / 过滤器链 |
| 授权服务器 | spring-security-oauth2-authorization-server | 7.1.2 | 并入 Security 7 |
| 外部 IdP | Keycloak | 26.8.1 | 领域与联邦 |
| 服务身份 | mTLS（Istio / SPIFFE） | 见网格章 | 零信任传输 |

## 常见误区

- 只在网关验 JWT，内部服务无认证，集群内可任意调用。
- 禁用签名校验「先联调」。
- 把密钥写进镜像层或公开配置仓库。
- 用 HS256 共享机密横跨所有服务且从不轮换。

## 实践任务

- [ ] 搭一个资源服务器，用公钥 / issuer-uri 校验 JWT，拒绝错误 aud。
- [ ] 画一张「浏览器 → 网关 → 服务 A → 服务 B」的身份传递图（用户令牌 vs 服务身份）。
- [ ] 列出密钥与证书轮换清单（IdP 签名密钥、服务证书）。

## 资料索引

- [Spring Security 参考](https://docs.spring.io/spring-security/reference/) — 总览
- [授权服务器文档](https://docs.spring.io/spring-security/reference/servlet/oauth2/authorization-server/index.html) — OAuth2 AS
- [Maven 元数据（坐标核对）](https://repo1.maven.org/maven2/org/springframework/security/spring-security-oauth2-authorization-server/maven-metadata.xml) — 7.1.2
- [Keycloak 文档](https://www.keycloak.org/documentation) — IdP 管理
- [OAuth 2.1 草案 / OIDC 规范入口](https://openid.net/developers/specs/) — 协议权威来源

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】Spring Security 7 下授权服务器的推荐坐标属于：
    - A. `com.example:my-auth`
    - B. `org.springframework.security:spring-security-oauth2-authorization-server`
    - C. `com.netflix:zuul`
    - D. `org.apache.hystrix:hystrix-core`
2. 【单选】OIDC 相对纯 OAuth2 额外强调的是：
    - A. 仅文件传输
    - B. 身份认证层（ID Token 等）
    - C. 仅打印日志
    - D. 取消 HTTPS
3. 【简答】为什么内部服务仍需要鉴权，而不能只信任网关？
4. 【单选】mTLS 主要增强哪一层？
    - A. 仅业务 SQL 优化
    - B. 传输层服务身份与加密
    - C. 仅 CSS
    - D. 仅前端路由
5. 【简答】校验 JWT 时至少应检查哪些字段 / 方面？

<details markdown><summary>参考答案</summary>

1. B — 并入 Spring Security 后的官方坐标。
2. B — OpenID Connect 定义身份层。
3. 旁路调用、错误配置、东向流量绕过网关时仍需保护；零信任假设网络不可靠。
4. B — 证书标识对端服务并加密通道。
5. 签名算法与密钥、iss、aud、exp（及 nbf）、必要 scope / 权限声明。

</details>

---

← [上一节：可观测性](../10-observability/) · [返回 微服务](../) · [下一节：容器与编排](../12-containers-k8s/) →
