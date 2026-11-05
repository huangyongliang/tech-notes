# 服务通信 Service Communication

> [微服务](../) › 服务通信

同步调用（REST、RPC）的选型与客户端写法。Spring 6+ 推荐声明式 HTTP Interface 客户端，OpenFeign 进入功能完成状态。

Spring 客户端与 Cloud 组件见 [Spring 框架](../../java/09-spring/)。

## 主流选型

- RestClient / HTTP Interface（Spring Framework 7）
- Spring Cloud OpenFeign 5.0.4（功能冻结）
- gRPC Java 1.85.1
- Apache Dubbo 3.3.7（3.2.x 仍有维护版 3.2.20）

> [!NOTE]
> Spring Cloud OpenFeign 官方已声明为 feature-complete，新代码优先用 HTTP Interface。

## 建议先收的资料

- Spring HTTP Interface 文档
- gRPC 官方教程
- Dubbo 3 Triple 协议文档

## 资料索引

- [Spring Cloud OpenFeign 文档](https://docs.spring.io/spring-cloud-openfeign/reference/) — feature-complete 声明与参考

---

← [上一节：注册发现与配置](../03-discovery-config/) · [返回 微服务](../) · [下一节：容错与流量治理](../05-resilience/) →
