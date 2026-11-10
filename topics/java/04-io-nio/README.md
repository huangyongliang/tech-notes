# IO 与 NIO {#io-nio}

> [Java](../) › IO 与 NIO

一个 Java 线程等待输入时，阻塞调用占住这条线程；NIO 改的是「等到就绪再继续」，不是「一定更快」。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[计算机基础 05](../../cs-basics/05-networking/) 写报文、TLS 和端口。本页不重讲协议。这里只写 Java 侧：一次调用会不会占住线程，缓冲区的游标怎么划定下一次读写，以及一条线程怎样等待多个通道就绪。[编程 04](../../programming/04-evaluation-memory/) 把对象和存储分成两层。本页的 `Buffer` 是那块存储上的游标合同。[Java 05](../05-concurrency/) 再写 `CompletableFuture` 和虚拟线程下的阻塞。学 Netty 之前要先有就绪和缓冲区这两条。本页到此为止，不写 Netty 管线。

## 阻塞占用线程，就绪才继续 {#_2}

BIO 的一次读或写占住调用它的那条线程，直到完成或失败。线程在等待期间不能去做另一件不相关的事。NIO 允许把多个通道注册给同一个 `Selector`。线程阻塞在「有没有通道就绪」上，而不是阻塞在某一个连接的整次传输上。就绪之后，线程再对那个通道继续读写。

这改变的是线程和等待的关系。没有「NIO 一定更快」这条结论。通道少、每次传输又长时，少一次就绪查询未必更省。通道多、每次只等一小段时，一条线程不必为每个连接各站一条，等待的成本才降下来。

## 游标决定下一次读写的区间 {#buffer-cursors}

`Buffer` 的 `position` 是下一次读写的起点，`limit` 是终点。两者之间才是当前有效区间。写入时，`position` 随写入前进，`limit` 通常停在容量处。

写完要读刚才写入的内容，必须调用 `flip()`。它做的是游标算术：把 `limit` 设为当前的 `position`，再把 `position` 设为 0。若定义过 mark，这次调用会丢掉它。于是下一次读从 0 走到刚才写到的位置，不会把还没写过的尾部也读出去。说「切换到读模式」只是这套算术的名字，代替不了 `limit` 和 `position` 各自变成了什么。忘了 `flip()`，读取会从写完的位置继续向后，读到的不是刚写入的那段。

```java
import java.nio.ByteBuffer;

class WrittenBytes {
    byte first() {
        ByteBuffer buf = ByteBuffer.allocate(16);
        buf.put((byte) 1);
        buf.put((byte) 2);
        buf.flip();
        return buf.get();
    }
}
```

这里 `flip()` 之后，`limit` 是 2，`position` 从 0 开始，`get` 取到的是 1。

## 通道交换字节，选择器等待就绪 {#channel-selector}

`Channel` 是一条打开的连接，通向文件、网络套接字、硬件设备，或能做读写的程序组件。它本身不表示「已经有数据」。`Selector` 让一条线程同时等待多个已注册通道上的就绪事件。事件到了，线程再对相应的通道操作。

所以一个线程同时等待多个连接就绪，靠的是 `Selector`，不是 `Buffer`，也不是再开一条线程去堵住每个连接。这是多路复用的就绪通知。它没有取消操作系统：就绪与否仍由操作系统告诉运行时。本页不写 epoll 怎么调。

## 文件合同和两种等待 {#nio2-http}

NIO.2 的 `Path` 表示一条路径，`Files` 是对文件和目录的操作入口。`Files.readString(path)` 把文件的全部内容读成一个字符串，读完才返回。文件要小到装得下这一整份字符串，这个方法才合适。它不是「因为用了 NIO.2 所以高性能」。

`HttpClient.send` 在必要时一直阻塞到拿到响应。这次等待可以持续多久，由请求上的 `timeout` 决定。`sendAsync` 立刻返回一个 `CompletableFuture`，响应完成时那个未来才结束。HTTP 报文和 TLS 仍以计算机基础 05 为准。`sendAsync` 怎样和虚拟线程里的阻塞搭配，见 Java 05。

## 常见误读 {#_3}

- 「用了 NIO 就一定更快。」它改变的是一条线程可以等待多次就绪，而不是每次传输的字节成本。
- 「`flip()` 就是切换到读模式。」要说的是 `limit` 变成当前 `position`，`position` 归零。不说这两个游标，读区间就不清楚。
- 「Selector 让程序可以不管操作系统。」它等的是操作系统给出的就绪。本页不写套接字实现。
- 「`Files.readString` 适合任何文件。」它一次读入全部内容，只适合小文本。

## 可选核对 {#io-check}

游标和就绪组件已经写在上面。这两问只核对它们。

1. 写入之后、读取之前为什么要调用 `flip()`？
2. 一个线程同时等待多个连接就绪，靠的是哪一个组件？

<details markdown><summary>参考答案</summary>

1. `flip()` 把 `limit` 设为当前 `position`，再把 `position` 设为 0。下一次读的区间才是刚才写入的那一段，而不是写完位置之后的空尾。
2. `Selector`。线程等的是多个已注册通道上的就绪事件，而不是用 `Buffer` 去堵每一个连接。

</details>

## 资料索引 {#_4}

- [`Buffer`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/Buffer.html) — `flip()` 先把 `limit` 设为当前 `position`，再把 `position` 设为 0。JDK 25。
- [`Channel`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/channels/Channel.html) — 一条打开的连接，通向文件、套接字或设备，用来读或写。
- [`Selector`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/channels/Selector.html) — 多个 `SelectableChannel` 的多路复用器。一条线程等待多个通道就绪，靠的是它。
- [`Path`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/Path.html) 与 [`Files`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/Files.html) — 文件合同。`readString` 把文件的全部内容读成一个字符串。
- [`HttpClient`](https://docs.oracle.com/en/java/javase/25/docs/api/java.net.http/java/net/http/HttpClient.html) — `send` 在必要时阻塞到拿到响应；`sendAsync` 返回 `CompletableFuture`。
- [`HttpRequest`](https://docs.oracle.com/en/java/javase/25/docs/api/java.net.http/java/net/http/HttpRequest.html) — `timeout` 决定这次等待可以持续多久。
- [计算机基础 05](../../cs-basics/05-networking/) — 报文和 TLS。本页不重讲。
- [Java 05 并发](../05-concurrency/) — 异步完成和虚拟线程下的阻塞。
- [编程 04](../../programming/04-evaluation-memory/) — 对象和存储不是同一层。缓冲区是游标加存储。

---

← [上一节：异常、泛型、反射与注解](../03-core-advanced/) · [返回 Java](../) · [下一节：并发](../05-concurrency/) →
