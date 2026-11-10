# 构建工具 {#build-tools}

> [Java](../) › 构建工具

Maven 生命周期、依赖管理与 BOM；Gradle（Kotlin DSL）的任务模型和构建缓存；以及多模块工程和依赖冲突排查。

## 闯关任务

**QUEST 07 · 第二章 平台**

- [ ] 能够说出 Maven default 生命周期的主要阶段及执行顺序。
- [ ] 能够用 `dependencyManagement` 和 BOM 统一管理依赖版本。
- [ ] 能够用 Gradle Kotlin DSL 编写构建脚本，并说出 `implementation` 与 `api` 的区别。
- [ ] 能够说明 Gradle 任务模型、增量构建和构建缓存的作用。
- [ ] 能够在多模块工程里定位并解决依赖冲突。

**奖励**：+100 XP · 徽章「构建匠人」（徽章名暂定，内容建设中）

## 建议先收的资料

- 官方文档
- 常用命令速查表
- 模板 `pom.xml` / `build.gradle.kts`

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】执行 `mvn package` 时，以下哪个阶段不会执行？
    - A. `compile`
    - B. `test`
    - C. `install`
    - D. `validate`
2. 【简答】如何在 Maven 中导入一个 BOM？
3. 【简答】Maven 遇到同一依赖的多个版本时，默认按什么规则选择？
4. 【单选】Gradle 中只在模块内部使用、不想暴露给下游模块编译期的依赖，应使用：
    - A. `api`
    - B. `implementation`
    - C. `compileOnly`
    - D. `testImplementation`
5. 【单选】查看 Maven 依赖树、定位冲突来源的命令是：
    - A. `mvn dependency:tree`
    - B. `mvn clean`
    - C. `mvn site`
    - D. `mvn help:system`

<details markdown><summary>参考答案</summary>

1. C — `install` 在 `package` 之后，只执行到 `package` 为止。
2. 在 `dependencyManagement` 中声明该 BOM，`<type>pom</type>`、`<scope>import</scope>`，之后依赖可省略版本号。
3. 最短路径优先（nearest wins）；路径一样长时，先声明的优先。若在 `dependencyManagement` 中显式锁定版本，则以其为准，覆盖传递依赖的版本。
4. B — `implementation` 不把依赖泄漏到使用者的编译类路径上。
5. A — 可加 `-Dincludes=groupId:artifactId` 过滤。

</details>

---

← [上一节：Java 虚拟机](../06-jvm/) · [返回 Java](../) · [下一节：测试](../08-testing/) →
