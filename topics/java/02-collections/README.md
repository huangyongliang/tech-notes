# 集合框架 Collections

> [Java](../) › 集合框架

List / Set / Map / Queue 的实现与选型，`HashMap` 原理、并发集合，以及 Sequenced Collections（JDK 21）等新 API。适合整理成对比表。

## 闯关任务

**QUEST 02 · 第一章 语言**

- [ ] 能够按访问模式（随机访问、去重、键值查找、FIFO / 优先级）在 List / Set / Map / Queue 的常见实现之间做选型。
- [ ] 能够说明 `HashMap` 的数组 + 链表 / 红黑树结构、扩容机制，以及 `equals` / `hashCode` 必须一致的原因。
- [ ] 能够说出 `ConcurrentHashMap`、`CopyOnWriteArrayList` 等并发集合的适用场景。
- [ ] 能够使用 Sequenced Collections（JDK 21）的 `getFirst()`、`getLast()`、`reversed()` 等方法。
- [ ] 能够给出常见集合操作的时间复杂度对比表。

**奖励**：+100 XP · 徽章「容器大师」（徽章名暂定，内容建设中）

## 知识要点

先问数据怎么被用，再选容器。下面的程序都可单独编译。2026-11-06 在 JDK 21.0.12.1 上执行 `javac --release 21` 后运行，输出与下文一致。未连接外部服务。

### 按访问模式选型

| 你要的访问 | 常见选择 | 不要拿它当默认 |
|------------|----------|----------------|
| 按下标读写 | `ArrayList` | `LinkedList` |
| 去重、不关心顺序 | `HashSet` | `ArrayList` 里手写去重 |
| 去重且保留插入顺序 | `LinkedHashSet` | `HashSet` |
| 键查找 | `HashMap` | `Hashtable` |
| 键有序 | `TreeMap` | `HashMap` |
| 键查找且记住插入顺序 | `LinkedHashMap` | `HashMap` |
| 队首队尾 | `ArrayDeque` | `Stack` |

`LinkedHashMap` 在默认构造下按插入顺序迭代。再次 `put` 已有的键只更新值，不把键挪到末尾。

```java
import java.util.LinkedHashMap;

public class UpdateOrder {
    public static void main(String[] args) {
        var linked = new LinkedHashMap<String, Integer>();
        linked.put("c", 1);
        linked.put("a", 1);
        linked.put("c", 2);
        System.out.println(String.join(",", linked.keySet()));
        System.out.println(linked.get("c"));
    }
}
```

运行输出：

```text
c,a
2
```

### HashMap：桶、扩容，以及必须成对的 equals / hashCode

`HashMap` 用键的 `hashCode` 选桶。桶里冲突变长时，OpenJDK 的实现会在链表长度达到 8 且数组容量至少 64 时把这个桶改成红黑树；容量不够时先扩容。默认负载因子是 0.75，元素个数超过「容量 × 负载因子」就大约扩成两倍。平均查找接近常数，冲突严重时会变差。

`equals` 为真的两个键必须有相同的 `hashCode`，否则它们会进不同的桶，`get` 找不到已经放进去的值。下面的 `Tag` 只写了 `equals`，`hashCode` 仍是对象身份。

```java
import java.util.HashMap;

public class HashKeyDemo {
    static final class Tag {
        final String name;
        Tag(String name) { this.name = name; }
        @Override public boolean equals(Object o) {
            return o instanceof Tag t && name.equals(t.name);
        }
    }

    public static void main(String[] args) {
        var map = new HashMap<Tag, String>();
        var first = new Tag("a");
        var second = new Tag("a");
        map.put(first, "ok");
        System.out.println(first.equals(second));
        System.out.println(map.get(second));
    }
}
```

运行输出：

```text
true
null
```

补上按 `name` 计算的 `hashCode` 之后，同样的 `get` 得到 `ok`。这段也在同一 JDK 上编译并运行过：

```java
import java.util.HashMap;
import java.util.Objects;

public class HashKeyFixed {
    static final class Tag {
        final String name;
        Tag(String name) { this.name = name; }
        @Override public boolean equals(Object o) {
            return o instanceof Tag t && name.equals(t.name);
        }
        @Override public int hashCode() {
            return Objects.hashCode(name);
        }
    }

    public static void main(String[] args) {
        var map = new HashMap<Tag, String>();
        map.put(new Tag("a"), "ok");
        System.out.println(map.get(new Tag("a")));
    }
}
```

运行输出：

```text
ok
```

### 读多写少时的快照，不是万能锁

`CopyOnWriteArrayList` 在写入时复制底层数组。迭代器看到的是创建那一刻的快照，不会抛 `ConcurrentModificationException`。适合名单很少改、读取和遍历很多的场景。写很多时，每次复制都贵。

```java
import java.util.concurrent.CopyOnWriteArrayList;

public class CowDemo {
    public static void main(String[] args) {
        var list = new CopyOnWriteArrayList<String>();
        list.add("a");
        var it = list.iterator();
        list.add("b");
        while (it.hasNext()) {
            System.out.print(it.next());
        }
        System.out.println();
        System.out.println(list);
    }
}
```

运行输出：

```text
a
[a, b]
```

这个程序是单线程的，只为看清「迭代器不跟着后面的 `add` 走」。`ConcurrentHashMap` 适合并发的键值读写；「先 `containsKey` 再 `put`」这种组合动作仍然不是原子的，需要方法本身提供的原子操作，或者你自己的同步。

### JDK 21 的首尾和反转

> [!WARNING]
> `getFirst`、`getLast`、`reversed` 来自 Sequenced Collections，JDK 21 起才有。JDK 8、11、17 没有这些方法。

`List`、`Deque`、`LinkedHashSet` 以及 `LinkedHashMap` 的键视图都走这套统一叫法，不必再记每种容器各自的 `get(0)` 或 `descendingIterator`。

```java
import java.util.ArrayList;
import java.util.List;

public class SequencedDemo {
    public static void main(String[] args) {
        var list = new ArrayList<>(List.of("a", "b", "c"));
        System.out.println(list.getFirst());
        System.out.println(list.getLast());
        System.out.println(list.reversed());
    }
}
```

运行输出：

```text
a
c
[c, b, a]
```

`reversed()` 是反序视图，不是另一份拷贝。把视图下标 0 设为 `z` 后，原列表变成 `[a, b, z]`，视图变成 `[z, b, a]`。这步也在同一 JDK 上运行过。

### 复杂度对照

| 操作 | ArrayList | LinkedList | HashMap | TreeMap |
|------|-----------|------------|---------|---------|
| 按下标读 | O(1) | O(n) | 不适用 | 不适用 |
| 按键读 | 不适用 | 不适用 | 平均接近 O(1) | O(log n) |
| 尾部追加 | 均摊 O(1) | O(1) | 平均接近 O(1) 的 put | O(log n) 的 put |

`HashMap` 的「平均接近 O(1)」依赖散列质量。键的 `hashCode` 写错时，这个假设不成立。

## 常见误区

- 只改 `equals` 不改 `hashCode`，查找得到 `null` 还以为没放进去。
- 需要稳定顺序时用 `HashMap`，再把某次遍历顺序当成承诺。
- 新代码继续用 `Hashtable` 或 `Vector`。它们是遗留的整表同步容器。
- 以为 `ConcurrentHashMap` 让任意两行业务代码都变成原子操作。
- 用 `LinkedList` 做大量 `get(i)`，然后觉得 List 都很慢。

## 实践任务

1. 运行 `HashKeyDemo`，确认输出是 `true` 和 `null`。再换成 `HashKeyFixed`，确认变成 `ok`。
2. 用 `LinkedHashMap` 按 `c`、`a`、`b` 插入，打印键的顺序；把已有键 `c` 的值改成 2，再看顺序有没有变成末尾。
3. 准备一个会在迭代途中 `add` 的 `ArrayList`，观察 `ConcurrentModificationException`；换成 `CopyOnWriteArrayList` 后对照 `CowDemo` 的快照行为。JDK 21 上再调用一次 `getFirst` 和 `reversed`。

## 资料索引

- [The Collections Framework](https://docs.oracle.com/javase/tutorial/collections/index.html) — Oracle Java 教程里的集合总览
- [HashMap（JDK 21 Javadoc）](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html) — 负载因子、树化和实现说明
- [JEP 431: Sequenced Collections](https://openjdk.org/jeps/431) — `getFirst` / `reversed` 的正式说明
- [SequencedCollection（JDK 21 Javadoc）](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/SequencedCollection.html) — 统一接口
- [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/home/) — 普林斯顿 COS 226 教材站点，用 Java 讲数据结构和算法
- [UC Berkeley CS 61B](https://inst.eecs.berkeley.edu/~cs61b/) — 伯克利数据结构课程（Java）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】需要按插入顺序遍历、且按键快速查找，首选：
    - A. `HashMap`
    - B. `TreeMap`
    - C. `LinkedHashMap`
    - D. `Hashtable`
2. 【简答】自定义类作为 `HashMap` 的键，只重写 `equals` 不重写 `hashCode` 会有什么后果？
3. 【单选】读多写极少、遍历时不希望抛 `ConcurrentModificationException` 的列表，适合：
    - A. `ArrayList`
    - B. `LinkedList`
    - C. `CopyOnWriteArrayList`
    - D. `Vector`
4. 【简答】JDK 21 引入 Sequenced Collections 主要解决了什么不一致问题？
5. 【单选】`ArrayList` 按下标 `get(i)` 的时间复杂度是：
    - A. O(1)
    - B. O(log n)
    - C. O(n)
    - D. O(n log n)

<details markdown><summary>参考答案</summary>

1. C — `LinkedHashMap` 维护插入顺序，同时保留哈希查找性能。
2. 两个相等的对象可能落到不同的桶里，导致 `get` 找不到、出现重复键。
3. C — 写时复制，迭代基于快照，适合读多写少。
4. 以前取首尾元素、反向遍历在 `List`、`Deque`、`LinkedHashSet` 等类型上写法各不相同，现在有了统一接口和方法。
5. A — 底层是数组，按下标直接访问。

</details>

---

← [上一节：语言基础与新特性](../01-language-basics/) · [返回 Java](../) · [下一节：异常、泛型、反射与注解](../03-core-advanced/) →
