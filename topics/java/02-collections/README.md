# 集合框架 {#collections}

> [Java](../) › 集合框架

集合选型是在相等、顺序、修改和并发的合同之间做选择，复杂度只有在前提满足时才有意义。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[语言基础](../01-language-basics/) 写了值、引用，以及 `equals` / `hashCode` 的合同。本页写容器在这些合同之上再承诺什么，以及使用时的泛型怎么读写。擦除和反射在 [核心进阶](../03-core-advanced/)。锁、内存可见性和虚拟线程在 [并发](../05-concurrency/)。测量在 [性能与诊断](../11-performance-diagnostics/)。本页不重写过滤求和，那一段在 01 的 Stream。

## 先看接口承诺，再选实现 {#_2}

`Collection` 扩展 `Iterable`。`List` 有遭遇顺序，元素可以重复，有的实现允许按下标访问。`Set` 的唯一性由它选用的相等或排序合同决定，不是接口名自动禁止一切重复对象。`Queue` 不一定是 FIFO：优先级队列的头部是优先级，不是最早进入的元素。`Deque` 支持两端。`Map` 不是 `Collection` 的子接口；键唯一，值可以重复。`keySet`、`values`、`entrySet` 是视图，不是另外复制的一份快照。`SequencedMap` 只继承 `Map`，不继承 `Collection` 或 `SequencedCollection`。

实现还可以收紧 null、允许哪些修改、以及能不能并发使用。这些限制写在具体类上，不能从接口名字一路推到所有实现。

## 泛型约束读写，不改变容器能力 {#collection-generics}

`List<Integer>` 不是 `List<Number>`。泛型是不变的：如果允许把 `List<Integer>` 当成 `List<Number>`，就可以把 `Double` 放进整数列表。`List<? extends T>` 可以安全地按 `T` 来读，不能随便写入一个 `T`；`null` 是否能写，还要看实现允不允许 null。`List<? super T>` 可以写入 `T`，读出来只能保证是 `Object`。通配符不表示这个集合不可修改。一份只读的使用能力和「对象深不可变」也不是一回事。

后面的 `append` 就是这条合同：来源按 `T` 读，去处按 `T` 写。完整程序放在视图那一节，这里不留半段让读者补全。擦除为什么在运行时看不见类型参数，回 [核心进阶](../03-core-advanced/)，本页不复述那里的例子。

## 按访问模式选型 {#collection-choice}

| 你要的访问 | 常见选择 | 它保证什么 | 主要代价 | 不要拿它当默认 |
|------------|----------|------------|----------|----------------|
| 按下标读写 | `ArrayList` | 随机访问；允许 null | 中间插入删除要移动元素 | `LinkedList` 按下标要遍历 |
| 去重、不关心顺序 | `HashSet` | 由 `equals` / `hashCode` 去重；无顺序 | 散列差时变慢 | 在 `ArrayList` 里手写去重 |
| 去重且保留插入顺序 | `LinkedHashSet` | 插入时的遭遇顺序；再次加入已有元素不挪位置 | 比 `HashSet` 多维护链接 | `HashSet` |
| 键查找 | `HashMap` | 键唯一；允许一个 null 键 | 无顺序；可变键会破坏查找 | `Hashtable` |
| 键有序 | `TreeMap` | 比较器或自然顺序；`compare` 为 0 视为同一键 | 每次查找都要比较 | `HashMap` |
| 键查找且记住插入顺序 | `LinkedHashMap` | 默认构造是插入顺序 | `accessOrder` 为 true 时顺序按访问变化 | `HashMap` |
| 双端、多数操作要快 | `ArrayDeque` | 两端增删均摊常数；不允许 null | 按下标搜索是线性的 | `Stack` |
| 只关心当前优先级最高的元素 | `PriorityQueue` | `peek` 是头部；`offer` / `poll` 维护堆 | 迭代器不按优先级排序 | 把它当成已排序的列表来遍历 |

`TreeSet` 同样用比较结果 0 当作同一元素，比较合同应和 `equals` 一致。`TreeMap` 允许 null 值；自然顺序拒绝 null 键，自定义比较器可以明确支持 null 键。这些 null 规则见后面的小表，不要从某一行推到所有 `Collection`。

`LinkedHashMap` 在默认构造下按插入顺序迭代。再次 `put` 已有的键只更新值，不把键挪到末尾。`new LinkedHashMap(initialCapacity, loadFactor, true)` 才是按访问调整顺序，和下面这个默认构造不是同一种顺序。

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

2026-11-23 用 Temurin 25.0.5.1+2、`javac --release 25` 再运行，标准输出与这份 2026-11-10 JDK 21.0.12.1 的记录相同。这是这一次构建的观察。

## HashMap：桶、扩容，以及必须成对的 equals / hashCode {#hashmap-equals-hashcode}

公开合同先于实现。`equals` 为真必须推出 `hashCode` 相同；反过来不成立。键放进表之后，不能再改那些参与 `equals` 或 `hashCode` 的状态，否则查找和去重不再可靠。所有键都返回同一个散列值，合同上可以合法，只是性能差。漏写 `hashCode` 是正确性问题，不是「平均常数变慢」这同一句话。`Object.hashCode` 不保证按 `name` 一致，也不保证不同对象的散列值彼此不同。不同的散列值也不必然落进不同的桶。

`HashMap` 用键的 `hashCode` 选桶。默认负载因子 `DEFAULT_LOAD_FACTOR` 是 0.75：元素个数超过容量乘以负载因子就 `resize()`，表长大约变成两倍。平均查找接近常数，冲突严重时会变差。下面的树化数字是某一个标签上的实现，不是 `Map` 接口的承诺。

树化不是「链表一到 8 个结点就变成红黑树」。在 OpenJDK 的 jdk21u 标签 `jdk-21.0.12-ga` 里，`TREEIFY_THRESHOLD` 的值是 8，但 `putVal` 挂上新结点时判断的是 `binCount >= TREEIFY_THRESHOLD - 1`。`binCount` 从 0 计，而且不计桶首那个结点，所以同一桶里第 8 个不同的键挂上以后，结点仍是链表上的 `Node`；第 9 个键挂上后才调用 `treeifyBin`。`treeifyBin` 发现表长小于 `MIN_TREEIFY_CAPACITY`（64）时只 `resize()`，不换成 `TreeNode`。表长至少 64 时，才把这个桶改成红黑树。`UNTREEIFY_THRESHOLD` 是 6，用在扩容拆桶时把太短的树拆回链表，不是插入阈值。这是该版本源码里的实现，不是 `java.util.Map` 的接口保证，别的 JDK 可以不同。本次没有用 JDK 25 重跑这段反射，也没有把它改写成对所有 `put` 重载都成立。

2026-11-10 在 Ubuntu OpenJDK 21.0.12.1（`java.runtime.version` 为 `21.0.12.1+1-1-24.04.4-Ubuntu`）上用反射读取 `table`。启动参数是 `--add-opens java.base/java.util=ALL-UNNAMED`。每个键的 `hashCode` 都返回 1，`equals` 只认自己的 `id`，因此它们互不相等、却进同一个桶。`new HashMap<>(64)` 时表长保持 64：第 8 个键的桶首类名是 `java.util.HashMap$Node`，链长 8；第 9 个之后是 `java.util.HashMap$TreeNode`，链长 9。`new HashMap<>(16)` 时第 9 个键仍是 `Node`，表长从 16 扩到 32。对照源码是 [HashMap.java（jdk-21.0.12-ga）](https://github.com/openjdk/jdk21u/blob/jdk-21.0.12-ga/src/java.base/share/classes/java/util/HashMap.java#L260)，插入判断在 [putVal](https://github.com/openjdk/jdk21u/blob/jdk-21.0.12-ga/src/java.base/share/classes/java/util/HashMap.java#L646-L650)，容量门槛在 [treeifyBin](https://github.com/openjdk/jdk21u/blob/jdk-21.0.12-ga/src/java.base/share/classes/java/util/HashMap.java#L761-L764)。

合同被破坏之后，不能从「逻辑上相等的键」推出 `Map` 一定找得到或一定找不到。下面的 `Tag` 只写了 `equals`。`hashCode` 仍是 `Object` 的实现，不按 `name` 计算。2026-11-10 的一次运行印出 `true` 和 `null`。2026-11-23 这一次 Temurin 25.0.5.1+2 也印出这两行，而且这次 `javac` 没有把缺少 `hashCode` 打成警告。两次观察都不能当成所有 JVM 必然印出 `null`。

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

补上按 `name` 计算的 `hashCode` 之后，同样的 `get` 得到 `ok`。这段也在 2026-11-10 的 JDK 21.0.12.1 上编译并运行过。2026-11-23 的 Temurin 25.0.5.1+2 再次运行，标准输出仍是 `ok`。原 `equals` 会调用 `name.equals`，本例没有覆盖 `name` 为 null 的情况。

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

## 读多写少时的快照，不是万能锁 {#concurrent-collection-contracts}

普通集合没有同步保证。fail-fast 迭代器尽力发现结构性修改，不保证一定抛出 `ConcurrentModificationException`，也不能拿它当同步手段。

`CopyOnWriteArrayList` 在写入时复制底层数组。迭代器看到的是创建那一刻的结构快照，迭代器本身不支持增、删、改。元素对象如果可变，快照并不冻结元素内部。适合名单很少改、读取和遍历很多的场景。写很多时，每次复制都贵。

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

这个程序是单线程的，只为看清「迭代器不跟着后面的 `add` 走」。它不是并发压测，也不验证内存可见性。2026-11-23 的 Temurin 运行与这份历史输出相同，仍然只说明这一次单线程观察。

`ConcurrentHashMap` 的迭代是弱一致的，不是整张表的快照。针对单个键的原子方法，不等于跨键或跨步骤的事务。「先 `containsKey` 再 `put`」仍然不是原子的。`computeIfAbsent` 的函数要短，并且不要在里面递归改同一张表；它也不保证任意 Lambda「一生只调用一次」。`Collections.synchronizedMap` 这类包装器在遍历时，仍要按文档在包装对象上同步，单次 `get` 加锁盖不住整次迭代。

| 迭代 | 它实际看到什么 | 不保证什么 |
|------|----------------|------------|
| 普通 `HashMap` / `ArrayList` | 尽力 fail-fast | 一定抛出 `ConcurrentModificationException`，或因此变得线程安全 |
| `CopyOnWriteArrayList` | 创建迭代器时的结构快照 | 元素内部不变；迭代器上的增删改 |
| `ConcurrentHashMap` | 弱一致，可能看见后来的更新 | 整表瞬间快照；跨键原子 |

## JDK 21 的首尾和反转 {#jdk-21}

> [!WARNING]
> `SequencedCollection`、`List.getFirst`、`List.getLast` 和 `reversed` 自 JDK 21 才有。`Deque.getFirst` / `getLast` 在 JDK 8 的文档里已经列出，接口 Since 1.6。不能说 21 之前所有叫这个名字的方法都不存在。

`LinkedHashMap` 的 sequenced 视图是 `sequencedKeySet()`、`sequencedValues()` 和 `sequencedEntrySet()`。普通 `keySet()` 的静态类型仍是 `Set`，不能据此编译 `getFirst`。

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

`reversed()` 是反序视图，不是另一份拷贝。把视图下标 0 设为 `z` 后，原列表变成 `[a, b, z]`，视图变成 `[z, b, a]`。这步也在 2026-11-10 的同一 JDK 上运行过。那是 `ArrayList` 的反序视图；`SequencedCollection` 作为总接口，不保证每一种实现都同样即时反映底层变化。空列表上的 `getFirst` / `getLast` 会抛出 `NoSuchElementException`。本次没有另跑空列表，这句以 JDK 25 的 `List` 文档为准。2026-11-23 的 Temurin 再运行上面的程序，三行与围栏相同。没有用 `--release 17` 做失败编译。

## 视图、副本与不可修改不是一回事 {#views-copies-mutability}

`Arrays.asList` 是背后数组支撑的定长列表：可以 `set`，不能增删。`Collections.unmodifiableList` 禁止通过这个包装器修改，它仍是活视图，底层列表再改，视图看得到。`List.of` 不可修改，并且拒绝 null。`List.copyOf` 复制之后，原列表的元素替换/增删不会改变已复制的列表内容；它拒绝 null，只是浅层复制（元素对象仍是原来的引用），而且不保证每次调用都新建一个实例。`ArrayList.reversed()` 是反序的写穿视图，不是一份拷贝。这些差别不能从「不可修改」这四个字互相推出。[语言基础](../01-language-basics/) 里 record 的 `List` 分量是同一类问题：引用分量不等于深不可变。

```java
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class CollectionContractsDemo {
    static <T> void append(List<? extends T> source, List<? super T> sink) {
        for (T value : source) sink.add(value);
    }
    public static void main(String[] args) {
        var values = new ArrayList<>(List.of("a", "b"));
        var view = Collections.unmodifiableList(values);
        var copy = List.copyOf(values);
        var reverse = values.reversed();
        values.set(0, "z");
        System.out.println(view);
        System.out.println(copy);
        System.out.println(reverse);
        reverse.set(0, "y");
        System.out.println(values);
        var fixed = Arrays.asList("c", "d");
        fixed.set(0, "x");
        System.out.println(fixed);
        try { fixed.add("e"); }
        catch (UnsupportedOperationException e) { System.out.println("fixed-size"); }
        try { view.add("e"); }
        catch (UnsupportedOperationException e) { System.out.println("unmodifiable"); }
        List<Integer> source = List.of(1, 2);
        List<Number> sink = new ArrayList<>();
        append(source, sink);
        System.out.println(sink);
    }
}
```

2026-11-23 00:08 PST，Temurin 25.0.5.1+2、`javac --release 25` 后运行，标准输出是：

```text
[z, b]
[a, b]
[b, z]
[z, y]
[x, d]
fixed-size
unmodifiable
[1, 2]
```

`view` 跟着原列表变成 `[z, b]`。原列表用 `set` 替换下标 0 之后，已复制的列表仍是 `[a, b]`：原列表的元素替换/增删不会改变已复制的列表内容。这份副本仍是浅的，元素对象还是复制当时的引用。`reverse` 先是 `[b, z]`；把它的下标 0 设成 `y`，写穿到原列表的末尾，原列表变成 `[z, y]`。`Arrays.asList` 可以改元素，不能 `add`。`unmodifiableList` 的 `add` 也被拒绝。`append` 从 `List<Integer>` 读、向 `List<Number>` 写，印出 `[1, 2]`。捕获异常只为呈现这两条容器合同，不是异常教程。这里的写穿是 `ArrayList` 的反序视图，不能推广到所有实现。`--release 21` 编译后在 Ubuntu OpenJDK 21.0.13.0.3 上运行，这八行相同。

| 实现 | null | 修改 |
|------|------|------|
| `ArrayList` / `LinkedList` | 允许 | 可增删改；不同步 |
| `HashMap` / `LinkedHashMap` | 至多一个 null 键，值可为 null | `get` 返回 null 时要用 `containsKey` 区分缺失和映射到 null |
| `ConcurrentHashMap` | 键和值都不允许 null | 单键原子方法不等于跨键事务 |
| `ArrayDeque` / `PriorityQueue` | 不允许 null | `poll` / `peek` 用特殊返回值；`remove` / `element` 在空时抛异常 |
| `TreeMap` | 值可为 null；自然顺序拒绝 null 键 | 比较器可以明确支持 null 键 |
| `List.of` / `List.copyOf` | 不允许 null | 不可修改；原列表的元素替换/增删不会改变已复制的列表内容。`copyOf` 仍是浅复制 |

这些是各类自己的限制，不是 `Collection` 一律允许或一律禁止。

## 复杂度要带着操作和前提读 {#collection-costs}

<span id="_5"></span>

| 操作 | ArrayList | LinkedList | HashMap | TreeMap |
|------|-----------|------------|---------|---------|
| 按下标读 | `get` / `set` O(1) | `get` O(n)，从近端走 | 不适用 | 不适用 |
| 按键或按值查找 | `contains` O(n) | `contains` O(n) | `get` 在散列分布好时平均常数；迭代约容量加元素个数 | `get` O(log n)，比较器自己也可以很贵 |
| 尾部追加或放入 | 尾部 `add` 均摊 O(1)；中间增删 O(n) | 尾部 `add` O(1)。迭代器已经停在该结点时，链路插入或删除也是 O(1)；按下标找到这个位置仍是 O(n)，不包含在这 O(1) 里 | `put` 平均常数，扩容另有成本 | `put` / `remove` O(log n) |

`PriorityQueue` 的 `offer` / `poll` 是 O(log n)，`peek` 是 O(1)，`contains` 是 O(n)。它不保证 `iterator` 按优先级排出全部元素。

`HashMap` 的平均常数依赖散列分布。分布差是性能问题。`equals` 与 `hashCode` 不一致是正确性问题。两句不能并成「hashCode 写错所以平均常数不成立」。内存局部性和对象开销是选型时的取舍，本页没有测量，不给吞吐排名。

## 常见误读 {#_3}

<span id="_6"></span>

- 只改 `equals` 不改 `hashCode`，就以为每次都会得到 `null`、并且「没放进去」。合同被破坏之后，不能从逻辑相等推出查找结果。上面的 `null` 是已记录的观察，不是每一种 JVM 的必然输出。
- 需要稳定顺序时用 `HashMap`，再把某次遍历顺序当成承诺。
- 新代码继续用 `Hashtable` 或 `Vector`。它们是遗留的整表同步容器。
- 以为 `ConcurrentHashMap` 让任意两行业务代码都变成原子操作。`containsKey` 之后再 `put` 仍然不是原子的。
- 用 `LinkedList` 做大量 `get(i)`，然后觉得 List 都很慢。慢的是按下标遍历，不是所有 `List`。
- 「不可修改就是深不可变。」包装器挡的是经由它的修改；底层或元素仍可以变。`copyOf` 也只是浅层。
- 「`reversed()` 就是一份拷贝。」对这里的 `ArrayList`，它是写穿的反序视图。
- 「用 foreach 走一遍 `PriorityQueue` 就会按优先级排序。」迭代器没有这个承诺。
- 「看见了 `ConcurrentModificationException` 就说明这个集合是线程安全的。」fail-fast 不保证抛出，更不是同步。

## 可选核对 {#collections-check}

<span id="_7"></span>

视图和键合同已经写在上面。这两问只核对它们。

1. 同一个 `ArrayList` 上的 `unmodifiableList`、`reversed` 和 `List.copyOf`，在原列表 `set` 之后各看到什么？为什么？
2. 逻辑相等的键漏写 `hashCode`、散列分布很差、以及 `ConcurrentHashMap` 先 `containsKey` 再 `put`，分别破坏或不再保证哪条合同？

<details markdown><summary>参考答案</summary>

1. `unmodifiableList` 是活视图，原列表 `set` 之后它看得到新元素，但自己的 `add` 会被拒绝。`reversed` 也是视图，顺序相反，而且 `set` 会写回原列表。`List.copyOf` 之后，原列表的元素替换/增删不会改变已复制的列表内容。这仍是浅复制：元素对象还是原来的引用，不是深克隆。
2. 漏写 `hashCode` 破坏的是「相等必须有相同散列」这条正确性合同，不能再依赖逻辑等值查找；某一次印出 `null` 不是所有 JVM 的保证。散列分布很差时合同仍可成立，失去的是平均常数时间。`containsKey` 之后再 `put` 是两个步骤，单键原子方法并不把这个组合变成跨步骤的原子操作。

</details>

<span id="_9"></span>

## 资料索引 {#_4}

<span id="_8"></span>

- [List](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html)、[Set](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Set.html)、[Map](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html) — 顺序、唯一性、键值与视图。`List.of` Since 9，`copyOf` Since 10，`getFirst` / `reversed` Since 21。
- [SequencedCollection](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedCollection.html)、[SequencedMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/SequencedMap.html)、[JEP 431](https://openjdk.org/jeps/431) — 21 的统一接口。`SequencedMap` 不继承 `Collection`。`LinkedHashMap` 用 sequenced 视图，而不是把普通 `keySet()` 说成自带 `getFirst`。
- [Deque（JDK 8）](https://docs.oracle.com/javase/8/docs/api/java/util/Deque.html) — `getFirst` / `getLast` 已经列出；接口 Since 1.6。
- [ArrayList](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayList.html)、[LinkedList](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedList.html)、[ArrayDeque](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/ArrayDeque.html)、[PriorityQueue](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/PriorityQueue.html)、[TreeMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/TreeMap.html)、[LinkedHashMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedHashMap.html)、[HashMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/HashMap.html) — 选型、null 和复杂度前提。树化阈值不在 `Map` 的接口文档里。
- [Collections](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Collections.html)、[Arrays](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Arrays.html) — 不可修改的活视图，以及数组支撑的定长列表。
- [ConcurrentHashMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html)、[CopyOnWriteArrayList](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/CopyOnWriteArrayList.html) — 弱一致、单键原子，以及创建迭代器时的结构快照。
- [HashMap.java（jdk-21.0.12-ga）](https://github.com/openjdk/jdk21u/blob/jdk-21.0.12-ga/src/java.base/share/classes/java/util/HashMap.java#L260) — 历史实现。标签不是本轮的最新补丁，本次没有重跑反射。
- [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/home/) 与 [COS 226 Syllabus（Fall 2024）](https://www.cs.princeton.edu/courses/archive/fall24/cos226/) — 数据结构和算法的延伸阅读。2026-11-23 没有重新打开这两页，不把它们当作 Java 25 的规范依据。

---

← [上一节：语言基础与新特性](../01-language-basics/) · [返回 Java](../) · [下一节：异常、泛型、反射与注解](../03-core-advanced/) →
