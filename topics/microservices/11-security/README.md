# 安全 Security

> [微服务](../) › 安全

服务边界的认证授权：OAuth2 / OIDC、JWT、服务间 mTLS 与零信任。

## 主流选型

- Spring Security 7.0
- Spring Security 7.1.2
- 授权服务器已并入 Spring Security 7（坐标 `org.springframework.security:spring-security-oauth2-authorization-server` 7.1.2，独立项目最后版本 1.5.8）
- Keycloak 26.8.1
- mTLS（Istio / SPIFFE）

## 建议先收的资料

- OAuth 2.1 / OIDC 规范
- Spring Security 参考文档
- Keycloak 文档

## 资料索引

- [Spring Security 授权服务器文档](https://docs.spring.io/spring-security/reference/servlet/oauth2/authorization-server/index.html) — OAuth2 Authorization Server
- [Spring Authorization Server Maven 元数据](https://repo1.maven.org/maven2/org/springframework/security/spring-security-oauth2-authorization-server/maven-metadata.xml) — 坐标版本核对

---

← [上一节：可观测性](../10-observability/) · [返回 微服务](../) · [下一节：容器与编排](../12-containers-k8s/) →
