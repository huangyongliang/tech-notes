# 异常、泛型、反射与注解 {#core-advanced}

> [Java](../) › 异常、泛型、反射与注解

受检异常写进方法签名，泛型参数在运行时被擦除，注解能被谁读到由保留期决定。反射看见的是还在的元数据，不是另一份语言合同。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

[Java 01](../01-language-basics/) 写语法怎么演进，[Java 02](../02-collections/) 写集合怎么选。本页只写四条编译期和运行期合同：异常是否必须被承认、类型参数在运行时还在不在、反射和 `MethodHandle` 各自看见什么、注解活到哪一层。[编程 03](../../programming/03-types/) 写检查发生在何时。本页不重讲健全性，也不写 Spring 入门。框架用法以后见 [Java 09](../09-spring/)。

## 受检异常是签名的一部分 {#_2}

分界在类型层次上。`RuntimeException`、`Error` 以及它们的子类型是非受检异常。`Throwable` 自身，以及其他子类，是受检异常。方法体若能抛出受检异常，就必须把它写进 `throws`，否则是编译期错误。调用方要让自己的方法体不再抛出它，就得捕获它，或继续在自己的签名里承认它。

这不是「运行时异常就可以忽略」。非受检只表示语言不强迫你在签名里承认它。空指针、非法参数仍然是失败。把受检异常放进签名，适合调用方有合理方式处理的情况：文件打不开、调用方可以选择另一条路径或把失败交给自己的调用者。若调用方除了终止没有别的办法，硬塞进签名只会让每一层都机械地再声明一次。适用条件是「调用方能处理」，不是「受检更高级」。

```java
import java.io.IOException;

class ConfigReader {
    void readConfig() throws IOException {
        throw new IOException("unreadable");
    }
}
```

`IOException` 不是 `RuntimeException` 的子类型，所以 `readConfig` 必须把它写进 `throws`，调用者也必须承认它。

## 类型参数在运行时不在了 {#erasure}

泛型擦除是 JLS 的规定：编译之后，类型参数被映射成它们的擦除。运行时的 `List<String>` 和 `List<Integer>` 都只是 `List`。类型变量不是可具体化类型，类实例创建要求那个名字指向一个类或接口，所以不能 `new T()`。`instanceof` 右侧若是参数化类型，类型参数只能是无界通配符，也就是必须可具体化。`List<String>` 带了具体的 `String`，写 `obj instanceof List<String>` 通不过编译。这不是编译器漏做的检查。

通配符表示对类型参数只有一部分了解。`List<? extends T>` 取出的元素可以当成 `T`，不能放进一个任意的 `T`，因为实际元素可能是 `T` 的某个子类型。它适合「我只从这里生产元素」。`List<? super T>` 可以放进 `T`，取出来只能当成更宽的类型。它适合「我只向这里消费 `T`」。两边都要读写具体的 `T` 时，通配符帮不上，应写成 `List<T>`。集合上的这种写法见 [Java 02](../02-collections/)，本页不重讲容器选型。

## 反射看见元数据，句柄是已解析的调用 {#reflect-handle}

`java.lang.reflect` 在运行时读取类的字段、方法和注解，前提是这些元数据还被虚拟机留着。注解若没有保留到运行时，反射读不到，见下一节。

`MethodHandles.Lookup` 在创建方法句柄时做访问检查。句柄被调用时不再做这次检查。查找阶段看不见的成员，不会因为后来改用句柄就变成可见。绑定之后少的是重复查找，不是语言的访问规则。句柄不是「更快的反射」这句空话。

## 保留期决定谁读得到 {#retention}

`@Retention` 的三个取值决定注解活到哪一层。`SOURCE` 只留在源文件里，编译器可以用，类文件里没有。`CLASS` 是默认：编译器把注解写入类文件，但虚拟机不保证在运行时还把它留着，因此标准反射读不到。`RUNTIME` 才会被虚拟机保留，反射才能读到。

所以「只要在运行时用反射读到注解」，保留策略必须是 `RUNTIME`。`CLASS` 进了字节码也不够。

Lombok 和 MapStruct 走的是注解处理器：编译期生成代码或改语法树，不靠运行时反射。Spring 对注解的典型路径是运行时反射或代理。这里只用来分清阶段。处理器怎么写、框架怎么配置，不在本页。

## 常见误读 {#_3}

- 「运行时异常就是可以忽略。」语言只是不强迫你声明它。失败仍然发生。
- 「不能 `instanceof List<String>` 是编译器的小毛病。」这是擦除和可具体化类型的规定。运行时没有 `String` 这个参数可查。
- 「记住 PECS 口诀就总能选对。」口诀只在「只生产」或「只消费」时成立。又读又写具体的 `T`，通配符会挡住你。
- 「`MethodHandle` 一定比反射快，并且绕过访问控制。」查找之后少一次按名查找。看不见的成员，查找阶段就会失败。

## 可选核对 {#core-advanced-check}

定义已经写在上面。这两问只核对擦除和保留期。

1. 为什么不能写 `obj instanceof List<String>`？
2. 注解要在运行时用反射读到，`@Retention` 必须是什么？

<details markdown><summary>参考答案</summary>

1. `List<String>` 不是可具体化类型。类型参数在编译后被擦除，运行时没有 `String` 这个参数可以检查。这是 JLS 的限制。
2. `RetentionPolicy.RUNTIME`。`CLASS` 即使进了类文件，标准反射也读不到。`SOURCE` 更早就不在了。

</details>

## 资料索引 {#_4}

- [JLS 11.1.1：The Kinds of Exceptions](https://docs.oracle.com/javase/specs/jls/se25/html/jls-11.html#jls-11.1.1) — 受检异常是除 `RuntimeException`、`Error` 及其子类以外的异常类。JDK 25。
- [JLS 11.2.3：Exception Checking](https://docs.oracle.com/javase/specs/jls/se25/html/jls-11.html#jls-11.2.3) — 方法体能抛出的受检异常必须写进 `throws`，否则是编译期错误。
- [JLS 4.6：Type Erasure](https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html#jls-4.6) — 类型参数被擦除。运行时没有单独的 `List<String>`。
- [JLS 4.7：Reifiable Types](https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html#jls-4.7) — 带具体类型参数的 `List<String>` 不是可具体化类型。
- [JLS 4.11：Where Types Are Used](https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html#jls-4.11) — `instanceof` 右侧若是参数化类型，类型参数只能是无界通配符。
- [JLS 15.9.1](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html#jls-15.9.1) — 被实例化的名字必须指向类或接口。类型变量 `T` 不能 `new T()`。
- [JLS 4.5.1：Type Arguments](https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html#jls-4.5.1) — 通配符表示只掌握类型参数的一部分。只读或只写的使用条件来自这份部分了解。
- [`java.lang.reflect`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/reflect/package-summary.html) — 运行时读取仍被保留的字段、方法和注解。
- [`MethodHandles.Lookup`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/invoke/MethodHandles.Lookup.html) — 访问检查发生在创建句柄时，调用句柄时不再做这次检查。
- [`RetentionPolicy`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/annotation/RetentionPolicy.html) — `SOURCE`、`CLASS`、`RUNTIME` 各活到哪一层。`CLASS` 不保证运行时还能被反射读到。
- [Java 02 集合](../02-collections/) — 通配符用在集合参数上时的选型。
- [编程 03 类型系统](../../programming/03-types/) — 检查发生在何时。本页不重讲健全性。
- [Java 09 Spring](../09-spring/) — 框架怎样使用注解，以后再写。

---

← [上一节：集合框架](../02-collections/) · [返回 Java](../) · [下一节：输入输出](../04-io-nio/) →
