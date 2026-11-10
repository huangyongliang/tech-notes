# 构建工具 {#build-tools}

> [Java](../) › 构建工具

一次构建成为可复现的合同，靠的是阶段顺序、被锁定的版本，以及相同输入可以不重做。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[Java 08](../08-testing/) 写一次测试证明了哪一层。[软件工程 04](../../software-engineering/04-verification/) 写一次检查的效力边界。流水线把构建和测试收成门禁时，见 [DevOps 03](../../devops/03-promotion-gating/)。本页只写构建合同：Maven 的 default 生命周期是阶段顺序，BOM 锁定的是版本，Gradle 的任务图决定什么可以不重做，`api` 与 `implementation` 决定依赖进不进下游的编译类路径。

## 阶段只走到你点名的那一步 {#_2}

Maven 有三条内建生命周期：default、clean、site。本页只把 default 说清楚。一条生命周期由阶段组成，阶段按给定的顺序执行。调用某一个阶段，等于从开头执行到这个阶段为止，含这个阶段，不含它后面的阶段。

default 里要记住的主要阶段，按顺序是 `validate`、`compile`、`test`、`package`、`verify`、`install`、`deploy`。完整列表更长，中间还有集成测试前后的阶段。正文要抓住的是：你调用的是阶段，不是随意挑几个目标拼在一起。`mvn package` 会跑到 `package`，因此会做它之前的 `compile` 和 `test`，不会做它之后的 `install` 和 `deploy`。`test` 阶段跑的是测试；那些测试证明了什么，见 Java 08 和软件工程 04。

`mvn dependency:tree` 用来查看依赖树，看出冲突来自哪一条路径。它是观察工具，不改变调解规则。

## 版本由管理块决定 {#managed-versions}

导入一个 BOM，是在 `dependencyManagement` 里声明那个 POM，类型为 `pom`，scope 为 `import`。`import` 只在 `dependencyManagement` 里对 `pom` 类型有效：它把对方 `dependencyManagement` 中的版本列表引进来，用来替换这条声明本身。之后本工程的依赖可以省略版本，由这份管理来定。它锁定的是版本。它不会把 BOM 里列出的每一个构件都放进类路径。要用哪一个构件，仍要自己声明那一条依赖。

同一构件出现多个版本时，Maven 默认取依赖树里离本工程最近的那一个（nearest definition）。两条路径一样深时，POM 里先声明的优先。在本工程的 POM 里显式声明版本，可以保证用这个版本，从而覆盖传递依赖带来的版本。这不是「永远用当时最新的发行版」。

Gradle 的默认不同。图里对同一模块提出了多个版本时，它默认在这些被请求的版本里取较高的那个。这也不是去仓库里再找一个更新的发行版，只是在已经出现的版本中取高的。不要把 Gradle 的这条默认写成 Maven 的规则。

## 任务图决定什么可以不重做 {#gradle-graph}

Gradle 的任务连成有依赖的有向图。增量构建看任务的输入和输出：输入输出没变，这次就可以跳过。构建缓存可以复用已经算过的任务输出。这两条保证的是「相同输入不必重做」。它们不保证「这次构建一定更快」。输入变了，或者缓存对不上，该做的任务仍要做。

## 下游编译类路径 {#api-impl}

`java-library` 插件把依赖分成会不会泄漏给下游。`api` 声明的是本库 API 导出的依赖，它会出现在下游模块的编译类路径上。`implementation` 声明的是只在本模块内部使用的依赖，不进入下游的编译类路径。只在模块内部使用、不想让下游在编译期看见的依赖，用 `implementation`。

## 哪一条线是当前默认 {#version-lines}

> [!WARNING]
> 正文里的现行默认是 Maven 3.x 和 Gradle 9.x。Maven 4 仍是预览，官方写明不适合生产，不要把它的阶段写法当成现行默认。Gradle 8.x 仍在打补丁；发布日期更新，不等于它取代了 9.x 主线。

Apache 下载页把 Maven 3.x 标成推荐的稳定线，把 Maven 4 标成 Preview。Boot 4.0 起可以用 Gradle 9 构建应用，并继续保留 Gradle 8.14 及以上。具体补丁号只出现在资料索引，随落地当天打开的页面。

## 常见误读 {#_3}

- 「`mvn package` 会把包装进本地仓库。」装进本地仓库的是后面的 `install`。`package` 只执行到打包为止。
- 「导入 BOM 就把里面的构件都加进了类路径。」`import` 引进的是版本管理。要用的构件仍要自己声明。
- 「依赖冲突时永远取最新发行版。」Maven 默认是最短路径，同深度时先声明的优先。Gradle 默认是在图里已经出现的版本中取较高的那个。
- 「用了构建缓存，构建就一定更快。」缓存复用的是相同输入的已有输出。输入变了，任务仍要重做。

## 可选核对 {#build-check}

阶段顺序和类路径已经写在上面。这两问只核对它们。

1. 执行 `mvn package` 时，为什么不会进入 `install`？
2. `implementation` 和 `api` 对下游编译类路径有什么差别？

<details markdown><summary>参考答案</summary>

1. default 生命周期的阶段按顺序执行。调用某个阶段，只执行到这个阶段为止，含它之前的阶段。`install` 在 `package` 之后，所以不会执行。
2. `api` 会进入下游模块的编译类路径。`implementation` 只留给本模块，不进入下游的编译类路径。

</details>

## 资料索引 {#_4}

- [Maven 构建生命周期](https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html) — default、clean、site 三条内建生命周期。调用某个阶段，会按顺序执行到该阶段为止。`package` 在 `install` 之前。
- [Maven 依赖机制](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) — `import` 只用于 `dependencyManagement` 中的 `pom`，引进对方的版本管理。多个版本时取最近定义；同深度时先声明的优先。显式声明版本可以盖过传递依赖。
- [Maven 下载页](https://maven.apache.org/download.cgi) — 2026-11-12：推荐稳定版是 3.10.0，上一稳定小版本是 3.9.16。4.0.0-rc-7 为 Preview，官方写明 NOT safe for production use。
- [Gradle Java Library 插件](https://docs.gradle.org/current/userguide/java_library_plugin.html) — 当前文档为 9.9.1。`api` 进入下游编译类路径，`implementation` 不进入。
- [Gradle 版本冲突](https://docs.gradle.org/current/userguide/dependency_constraints_conflicts.html) — 图里出现多个版本时，默认取较高的那个。
- [Gradle 增量构建](https://docs.gradle.org/current/userguide/incremental_build.html) 与 [构建缓存](https://docs.gradle.org/current/userguide/build_cache.html) — 相同输入可以不重做。这不是「一定更快」。
- [Gradle 发布页](https://gradle.org/releases/) — 2026-11-12：9.x 主线是 9.9.1（2026-11-10）。8.14.7（2026-11-11）是 8.x 安全补丁，不是最新主线。
- [Spring Boot 4.0 发行说明](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes) — 支持用 Gradle 9 构建，并保留 Gradle 8.14 及以上。
- [Java 08 测试](../08-testing/) — `test` 阶段跑到的测试证明了哪一层。
- [软件工程 04](../../software-engineering/04-verification/) — 一次检查的效力边界。
- [DevOps 03](../../devops/03-promotion-gating/) — 流水线把构建和测试收成门禁。本页不写 CI 配置。

---

← [上一节：Java 虚拟机](../06-jvm/) · [返回 Java](../) · [下一节：测试](../08-testing/) →
