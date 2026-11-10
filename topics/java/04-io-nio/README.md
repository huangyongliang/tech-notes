# IO 与 NIO {#io-nio}

> [Java](../) › IO 与 NIO

BIO、NIO（Buffer / Channel / Selector）、NIO.2（`Files` / `Path`）以及 `HttpClient`。学习 Netty 等网络框架之前要先掌握这些。

## 闯关任务

**QUEST 04 · 第一章 语言**

- [ ] 能够说明 BIO 与 NIO 在线程模型上的区别。
- [ ] 能够解释 NIO 的 Buffer、Channel、Selector 三个核心概念，并说出 Buffer 的 `flip()` 作用。
- [ ] 能够用 NIO.2 的 `Path` / `Files` 完成读写文件、遍历目录等常见操作。
- [ ] 能够用 `HttpClient` 发出同步和异步 HTTP 请求。
- [ ] 能够说明为什么学习 Netty 之前要先掌握 NIO。

**奖励**：+100 XP · 徽章「管道工」（徽章名暂定，内容建设中）

## 建议先收的资料

- 官方教程
- Javadoc
- 示例代码
- IO 模型对比图

## 资料索引

<!-- - [标题](相对路径或链接) — 一句话说明 -->

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】NIO 中让一个线程同时监听多个连接就绪事件的组件是：
    - A. `Buffer`
    - B. `Channel`
    - C. `Selector`
    - D. `Stream`
2. 【简答】`ByteBuffer` 写入数据后、读取之前为什么要调用 `flip()`？
3. 【单选】一次性把小文本文件读成字符串，最简洁的 NIO.2 写法是：
    - A. `Files.readString(path)`
    - B. `new FileInputStream(path)`
    - C. `Paths.read(path)`
    - D. `Channel.readAll(path)`
4. 【简答】`HttpClient` 的 `send` 和 `sendAsync` 有什么区别？

<details markdown><summary>参考答案</summary>

1. C — Selector 实现 I/O 多路复用。
2. `flip()` 把 limit 设为当前 position、position 归零，把缓冲区从写模式切换到读模式。
3. A — `Files.readString` 直接返回文件内容。
4. `send` 阻塞直到拿到响应；`sendAsync` 立即返回 `CompletableFuture`。

</details>

---

← [上一节：异常、泛型、反射与注解](../03-core-advanced/) · [返回 Java](../) · [下一节：并发](../05-concurrency/) →
