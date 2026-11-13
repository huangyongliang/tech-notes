# 安全 {#security}

> [微服务](../) › 安全

认证确认调用者是谁，授权决定能做什么；令牌只在每一跳都校验签名、`iss`、`aud` 和 `exp` 时才可信，mTLS 证明的是工作负载身份，不代替应用层授权。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[API 网关](../02-api-gateway/) 写了：鉴权在边缘校验身份和入口权限，服务内部仍可能需要授权，细节见本页。微服务把攻击面从一个入口变成一群可互调的进程，所以每一跳都要回答调用者是谁、能做什么。过滤器链和代理回链 [Java 09](../../java/09-spring/)，本页不重写 Spring Security 入门。mTLS 在网格里怎么落地回链 [服务网格](../13-service-mesh/)。密钥放在哪，回指 [注册发现与配置](../03-discovery-config/) 和 [容器与编排](../12-containers-k8s/)：配置中心不存明文密钥，Secret 的平台存放在 12。

## 认证、授权与边界各自保证什么 {#_2}

认证确认身份。授权决定权限。网关校验令牌，只覆盖从入口进来的那部分请求。旁路调用、配错的路由、东西向流量都可以绕过网关。所以服务内仍要鉴权。两边的策略必须一致，否则边缘放行的请求会在内部被另一套规则拒绝，或者反过来。这是 02 那句分工的下文，不是另一套产品。

## OAuth 管委托，OIDC 加身份层 {#oauth-oidc}

OAuth 2.0 管的是授权委托：客户端拿到访问令牌，去调用资源。OpenID Connect 在其上加身份层，包括 ID Token 和 UserInfo。[OpenID 规范页](https://openid.net/developers/specs/) 把 OpenID Connect Core 1.0 标为 Second Errata（errata set 2）。同一页写明，这份规范已由 ITU-T 于 2025 年 10 月发布，并作为 ISO/IEC 26131:2024 发布。它是已发布规范。

浏览器和移动端用 Authorization Code 加 PKCE。服务对服务用 client credentials。这些最佳实践的出处是已发布的 [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)（OAuth 2.0 Security BCP），不是一份尚未发布的 2.1 RFC。

**OAuth 2.1 仍是 IETF Internet-Draft。** 2026-11-13 的 [datatracker](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) 显示 `draft-ietf-oauth-v2-1-17`，文档类型是 Active Internet-Draft（oauth WG），WG state 为 WG Document，Last updated 2026-10-30，Expires 4 May 2027，IESG state 为 I-D Exists。关联里程碑是 Dec 2026 提交 IESG。不得写成已发布 RFC。Spring 文档把授权服务器页面标题写成「OAuth 2.1 Authorization Server」，那是产品命名，不代表 2.1 已经成文。

## 令牌在每一跳都要校验 {#token-validation}

JWT 至少校验签名和算法、`iss`、`aud`、`exp`，以及 `nbf`，再加上这次调用需要的 scope 或权限声明。禁用签名校验「先联调」，等于放弃令牌本身。令牌格式见 [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)，最佳实践见 [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725)。

服务间互调用短寿命的访问令牌，并限制受众。不要把长寿命刷新令牌塞进内部 RPC。用户令牌透传或令牌交换，传递的是用户身份；服务自己的身份是另一件事。二者要分开。

HS256 的共享密钥横跨所有服务、并且不轮换，是误区：一把密钥泄漏，所有服务都能伪造令牌。非对称签名加 JWKS，让资源服务器只持有公钥。

## Spring Security 7 与授权服务器坐标 {#spring-security-7}

当前 GA 仍是 **7.1.2**。2026-11-13 的项目页、参考文档的 Stable 档、GitHub Latest 都是 7.1.2（2026-10-22）。7.0.8 是 7.0 维护线。Boot 4.1.2 的依赖坐标里，`spring-security-core` 和 `spring-security-oauth2-authorization-server` 都是 7.1.2。

授权服务器已经并入 Spring Security 7。坐标不变，仍是 `org.springframework.security:spring-security-oauth2-authorization-server`，版本跟随 Security，当前是 7.1.2。独立项目最后版本是 **1.5.8**（2026-06-09），仓库已归档到 `spring-attic`。`spring.io/projects/spring-authorization-server` 当日返回 404。1.5.x 不是新项目选项。

Maven `spring-security-core` 和授权服务器的 `latest` / `release` 当日都指向 **7.2.0-RC1**（`lastUpdated` 2026-10-22）。参考文档把 7.2.0-RC1 放在 Preview。不得写成默认。

下面的 YAML 只做了语法解析，没有启动资源服务器。`issuer-uri` 仍是原页的示意。

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://id.example.com/realms/demo
```

## Keycloak 管用户身份，mTLS 管工作负载身份 {#keycloak-mtls}

Keycloak **26.8.2** 可以作为外部 IdP。2026-11-13 的下载页当前版本就是 26.8.2，Maven `keycloak-core` 的 `latest` / `release` 与 GitHub Latest 一致（2026-11-05）。下载页上的 Nightly 不是这个发行版本。

mTLS 让双方用证书证明工作负载身份，并加密通道。SPIFFE 给出可移植的工作负载身份格式。它与应用层授权（scope、策略）互补，不互相替代：证书证明是哪一个工作负载，不证明调用者拥有哪一项业务权限。网格里怎么打开 STRICT、证书怎么轮转，留给 13。本页不写 Istio 配置。

## 密钥与证书要轮换 {#key-rotation}

密钥不进镜像层，也不进公开的配置仓库。IdP 的签名密钥和服务证书都要有轮换计划。Secret 在平台上怎么存放，回指 12。本页不引入新的密钥管理系统。

## 四类能力各自放在哪 {#sec-choice}

<span id="_5"></span>

| 能力 | 方案 | 版本基线 | 它放在哪 |
|------|------|----------|----------|
| 应用安全框架 | Spring Security | 7.1.2 | 资源服务器与过滤器链 |
| 授权服务器 | spring-security-oauth2-authorization-server | 7.1.2 | 已并入 Security 7，不是独立新项目 |
| 外部 IdP | Keycloak | 26.8.2 | 用户领域与联邦 |
| 服务身份 | mTLS（Istio / SPIFFE） | 见 13 | 工作负载身份与传输加密 |

## 常见误读 {#_3}

<span id="_6"></span>

- 「只在网关验 JWT，内部就可以互调。」旁路和东西向流量绕得过网关。
- 「先关掉签名校验，联调完再开。」这一跳已经不再校验令牌。
- 「把长寿命刷新令牌放进内部 RPC。」内部要的是短寿命、限制了 `aud` 的访问令牌。
- 「HS256 共享密钥横跨所有服务，不用轮换。」一把密钥泄漏，所有服务都能伪造。
- 「密钥写进镜像层或公开配置仓库。」轮换也清不掉已经发出去的层。
- 「OAuth 2.1 已经是 RFC。」它仍是 `draft-ietf-oauth-v2-1-17`。
- 「Spring 页面标题写了 OAuth 2.1，所以草案已成文。」那是产品命名。
- 「Maven `latest` 的 7.2.0-RC1 是当前 GA。」GA 是 7.1.2。独立授权服务器 1.5.8 已归档，不是新选项。
- 「有了 mTLS 就不必做应用层授权。」证书证明工作负载，不证明用户权限。

## 可选核对 {#sec-check}

<span id="_7"></span>

边界和令牌条件已经写在上面。这两问只核对它们。

1. 为什么内部服务仍需要鉴权，而不能只信任网关？
2. 校验 JWT 至少要检查哪些方面？

<details markdown><summary>参考答案</summary>

1. 网关只看见从入口进来的请求。旁路调用、错误配置和东西向流量都可以绕过它。网络不可靠时，服务内仍要回答调用者是谁、能做什么。
2. 至少校验签名和算法、`iss`、`aud`、`exp`（以及 `nbf`），还有这次调用需要的 scope 或权限声明。

</details>

<span id="_9"></span>

## 资料索引 {#_4}

<span id="_8"></span>

- [Spring Security 参考](https://docs.spring.io/spring-security/reference/) — 2026-11-13 当前档 7.1.2。Stable 另有 7.0.8 维护线。Preview 是 7.2.0-RC1，不是默认。
- [授权服务器文档](https://docs.spring.io/spring-security/reference/servlet/oauth2/authorization-server/index.html) — 页面标题为「OAuth 2.1 Authorization Server」，属于 Security 7.1.2 文档，不是 2.1 RFC。
- [Maven 元数据](https://repo1.maven.org/maven2/org/springframework/security/spring-security-oauth2-authorization-server/maven-metadata.xml) — `latest` / `release` 指向 7.2.0-RC1。默认仍是 Boot 4.1.2 管理的 7.1.2。
- [Keycloak 下载](https://www.keycloak.org/downloads) 与 [文档](https://www.keycloak.org/documentation) — 下载页当前 26.8.2。Nightly 不是该发行版本。
- [OAuth 2.1 草案（IETF datatracker）](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) — `draft-ietf-oauth-v2-1-17`，Active Internet-Draft，Last updated 2026-10-30，里程碑 Dec 2026 提交 IESG。
- [OpenID 规范入口](https://openid.net/developers/specs/) — Core 1.0 Second Errata；ITU-T（2025-10）与 ISO/IEC 26131:2024 已发布。
- [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html) — OAuth 2.0 Security BCP。PKCE 等实践以这份已发布文档为出处。
- [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) 与 [RFC 8725](https://www.rfc-editor.org/rfc/rfc8725) — JWT 与 JWT 最佳实践。
- [微服务 02](../02-api-gateway/) — 边缘鉴权与服务内授权的分工。
- [微服务 13](../13-service-mesh/) — 网格侧 mTLS。
- [Java 09](../../java/09-spring/) — 过滤器链。本页不重写。

---

← [上一节：可观测性](../10-observability/) · [返回 微服务](../) · [下一节：容器与编排](../12-containers-k8s/) →
