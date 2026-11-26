# 语言基础与新特性 {#language-basics}

> [Java](../) › 语言基础与新特性

Java 的类型和语法能限制错误的表达方式，但变量、对象和容器的语义仍需要分开理解。

> [!NOTE]
> 本仓库和站点的内容由 AI 生成，资料与资源链接来源于网络，仅供学习参考；如有错误或侵权，请提 Issue 告知。

---

## 这一页补哪一块 {#_1}

这一页解释 Java 里变量持有什么、调用复制什么，以及既有的现代写法在什么条件下成立。[集合框架](../02-collections/) 承接容器合同。异常、擦除和反射在 [核心进阶](../03-core-advanced/)，本页只给泛型的最低前提，不重复那边的整节，也不沿用任何未经验证的 `instanceof` 断言。对象布局和 GC 在 [JVM](../06-jvm/)，并发执行在 [并发](../05-concurrency/)，尚未成为默认语义的语言趋势在 [生态与新趋势](../12-ecosystem-trends/)。只回链，不改邻章。

## 值会复制，引用可以共享对象 {#_2}

Java 的值分两类。八种基本类型里，`byte` / `short` / `int` / `long` 是整数，`float` / `double` 是浮点，`boolean` 是真假。`char` 是一个 UTF-16 码元，不是任意一个完整字符：一个辅助平面字符可以占两个 `char`。引用类型的值是指向对象的引用，不是对象本身。数组也是对象。`null` 是一个引用值，表示当前不指向任何对象。

方法调用按值传递：实参的值被复制进形参。复制的如果是基本值，形参再赋值不影响调用方的变量。复制的如果是引用，形参和调用方变量在重新绑定之前指向同一个对象，所以可以通过这个引用改对象里的状态。把形参改绑到另一个对象，只改形参自己的那份引用。`final` 约束的是这个变量不能再绑定别的值，不冻结引用所指向的对象。本页不画「引用一定在栈、对象一定在堆」：那是实现布局，不是语言合同。

```java
public class ValuePassingDemo {
    static void change(int n, int[] values) {
        n = 9;
        values[0] = 9;
        values = new int[] {7};
    }
    public static void main(String[] args) {
        int n = 1;
        int[] values = {1};
        int[] alias = values;
        change(n, values);
        System.out.println(n);
        System.out.println(values[0]);
        System.out.println(values == alias);
    }
}
```

2026-11-23 00:08 PST，用 Temurin 25.0.5.1+2 执行 `javac --release 25` 后运行，标准输出是：

```text
1
9
true
```

`n` 印出 1：方法里改的是基本值的副本。数组元素变成 9：复制过去的引用仍指向同一数组。`values == alias` 为 true：形参后来指向新数组 `{7}`，调用方的变量没有跟着改绑。不能由此推出「Java 按引用传递对象」。同一份源再用这份 `javac --release 21` 编译，并在 Ubuntu OpenJDK 21.0.13.0.3 上运行，这三行相同。这是这两次构建的观察。

## 类型约束使用方式，相等需要合同 {#types-and-equality}

声明类型决定这个表达式能使用哪些成员，也参与重载的选择。实例方法若被重写，调用时按运行时的类分派。封装用来守住不变量。接口给使用方一份合同，不规定实现怎么摆字段。继承表达的是 is-a；只是想复用一段行为时，组合更合适。

`==` 比较的是引用同一性：是不是同一个对象。`equals` 是可以重写的逻辑相等。重写之后要保持自反、对称、传递、一致，并且对 `null` 返回 false，同时重写 `hashCode`，使相等的对象散列值相同。散列值相同并不推出对象相等，也不推出它们是同一个对象。`hashCode` 不是地址。下面的 `Point` 和 `Tag` 会在记录和集合两节里用到；`HashMap` 的桶不在本页重写。

`List<String>` 是编译期约束，不是每个列表对象在运行时都还带着一个 String 类型参数。不变型和通配符的用法在 [集合框架](../02-collections/)。擦除能不能具体化，放在 [核心进阶](../03-core-advanced/)。泛型不会自动去深检查反序列化进来的对象。

## 特性落在哪条 LTS {#lts}

「正式版第一次出现」和「下一条 LTS 里已经能用」不是同一句话。记首次正式版本，再记哪条 LTS 已经能用：

| 阶段 | 首次正式 | 这一段里可以依赖的写法 |
|------|----------|------------------------|
| JDK 8 | Lambda、Stream 在 8 | Lambda、Stream |
| JDK 11 | 局部变量 `var` 在 10；Lambda 形参的 `var` 在 11 | `var` |
| JDK 17 | 文本块 15，`instanceof` 模式 16，`record` 16，`sealed` 17 | 文本块、`record`、`sealed`、`instanceof` 模式匹配 |
| JDK 21 | 模式 `switch` 与记录模式都在 21 | 模式匹配 `switch` |
| JDK 25 | 见下面三则；原始类型模式仍是预览 | 当前 LTS 基线；本章旧示例不依赖 21 之后才加入的语法 |

JDK 17 能用 `record`，是因为 16 已经正式，不是 17 才引入 `record`。模式 `switch` 是 21 的正式特性；14 就已经有的是 switch 表达式，两者不要写成同一件事。

2026-11-23 打开的 JDK 发行页：25 于 2025-09-16 GA，27 于 2026-09-15 GA，28 仍在开发。25 上已经正式、但本章旧程序不必改写成的三则是：模块导入声明（JEP 511），紧凑源文件与实例 `main`（JEP 512；`IO.println` 要写类名，不沿用旧预览的隐式静态导入），灵活构造器（JEP 513；不是可以随意使用尚未构造完的 `this`）。原始类型模式在 JDK 25 仍是第三预览（JEP 507），在 JDK 27 仍是第五预览（JEP 532）。预览不是稳定默认。本章旧的四个程序，以及下面新增的两个，都不需要 `--enable-preview`。

版本与验收说明：2026-11-10 在 JDK 21.0.12.1 上执行 `javac --release 21` 后运行，下面四个历史输出围栏与当时的标准输出一致。2026-11-23 用 Temurin 25.0.5.1+2、`javac --release 25` 再运行这四个程序，标准输出与那些围栏相同。这是这一次构建的观察。`record` 的 `toString` 排版不因此变成跨实现的格式规范。没有重跑反射实验，也没有把 JDK 25 编出的 class 交给 JDK 21。

> [!WARNING]
> JDK 8 没有 `var`、文本块、`record`、`sealed` 和模式匹配。用 JDK 8 编译下面的示例会直接失败。

## record 是数据载体，不是带 setter 的 JavaBean {#record-setter-javabean}

`record Point(int x, int y)` 把字段声明成构造器参数。编译器生成规范构造器、访问器 `x()` / `y()`、以及按全部分量比较的 `equals` / `hashCode` / `toString`。分量字段是 `private final` 的，没有 `setX`。记录类本身隐式 `final`。生成的 `equals` 比较的是不是同一个记录类、以及分量的值；这不把对象变成没有身份的 value class。

```java
public class RecordDemo {
    record Point(int x, int y) {}

    public static void main(String[] args) {
        Point p = new Point(3, 4);
        Point q = new Point(3, 4);
        System.out.println(p.x() + "," + p.y());
        System.out.println(p.equals(q));
        System.out.println(p);
        System.out.println(p.getClass().getRecordComponents().length);
    }
}
```

运行输出：

```text
3,4
true
Point[x=3, y=4]
2
```

最后一行是记录分量的个数。访问器是 `x()` 而不是 `getX()`。给 `p` 写 `setX` 或给分量重新赋值，这段程序就不再能通过编译；本次没有把那份失败代码编进去。

分量如果是引用，`final` 只固定这个引用指向哪一个对象。对象自己仍可变。紧凑构造器可以先改参数，编译器再把参数赋给分量字段；这不是在构造器里给 `final` 字段重新赋值。`List.copyOf` 挡住的是这份列表结构随后被改，元素本身不会被递归复制。防御性副本不等于深克隆。要不要复制，取决于你对外承诺的合同；这里用 `copyOf` 是显式拒绝 null，不是所有 record 都必须复制。

```java
import java.util.ArrayList;
import java.util.List;

public class RecordAliasingDemo {
    record Names(List<String> values) {}
    record CopiedNames(List<String> values) {
        CopiedNames { values = List.copyOf(values); }
    }
    public static void main(String[] args) {
        var values = new ArrayList<>(List.of("a"));
        var shared = new Names(values);
        var copied = new CopiedNames(values);
        values.add("b");
        System.out.println(shared.values());
        System.out.println(copied.values());
        System.out.println(shared.values() == values);
    }
}
```

同一次 Temurin 25.0.5.1+2、`javac --release 25` 运行的标准输出：

```text
[a, b]
[a]
true
```

`shared` 和原来的列表是同一个对象，所以看得到后来加上的 `b`。`copied` 的列表是复制当时的结构，仍是 `[a]`。本例的元素是 `String`，不能据此说 `List.copyOf` 会递归复制任意可变元素。`--release 21` 编译后在 Ubuntu OpenJDK 21.0.13.0.3 上运行，这三行相同。

## sealed 限制实现，穷尽仍有前提 {#sealed-switch}

`sealed` 配合 `permits` 限制直接许可的实现。直接子类必须是 `final`、`sealed` 或 `non-sealed`；记录类隐式 `final`。`non-sealed` 可以重新打开自己的子树，所以「把实现者写死」只覆盖直接许可关系，不是每一棵子树的末端永远不变。模式匹配 `switch` 覆盖全部许可类型后，对非 null 的 `Shape` 可以不写 `default`。传入 `null`、又没有 `case null` 时，仍会抛出 `NullPointerException`。新增一种许可类型之后，要重新编译受影响的 `switch`，才能得到遗漏分支的诊断；这不是跨版本二进制文件的万能保护。记录模式是在模式里解构一个记录，和「声明一个 record」不是同一件事。本页不再加第三套几何程序。

`printf(String, Object...)` 按 JVM 的默认 `Locale` 决定小数点。不传 `Locale` 时，`de_DE` 和 `fr_FR` 会把圆周面积印成 `3,14`。下面传入 `Locale.US`，小数点固定为 `.`。

```java
import java.util.Locale;

public class ShapeDemo {
    sealed interface Shape permits Circle, Square {}
    record Circle(double r) implements Shape {}
    record Square(double side) implements Shape {}

    static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.r() * c.r();
            case Square q -> q.side() * q.side();
        };
    }

    public static void main(String[] args) {
        System.out.printf(Locale.US, "%.2f%n", area(new Circle(1)));
        System.out.printf(Locale.US, "%.2f%n", area(new Square(2)));
    }
}
```

运行输出：

```text
3.14
4.00
```

本次没有另编漏掉分支的负向程序，也没有对 `area(null)` 做运行。穷尽和 null 的差别以上面的语言规则为准，不靠一份没运行的日志。

## instanceof、文本块和 var {#instanceof-var}

`instanceof String s` 在判断成功时直接得到 `s`，不用再强制转换。`instanceof` 对 `null` 为 false，所以 `&&` 右边只有匹配成功才有 `s`。`var` 是静态类型推断，不是运行期换类型。普通方法或构造器的形参、字段、返回类型不能写 `var`。自 JDK 11 起，Lambda 形参可以用 `var`，而且同一个 Lambda 的参数必须同一种写法；目标类型仍然必需。`var x = null` 没有目标类型，不成立。

文本块还是 `String`，方便写多行文字；行首相对结束引号的缩进会被去掉。它不是插值，也不是不处理转义的原始字符串。`strip` 的 API 自 JDK 11，`formatted` 自 JDK 15；文本块语法自 JDK 15。`formatted` 仍然是格式化，不是另一种插值语法。

```java
public class EverydayDemo {
    public static void main(String[] args) {
        Object obj = "Java";
        if (obj instanceof String s && s.length() > 3) {
            System.out.println(s.toUpperCase());
        }
        var n = 21;
        String note = """
                quest %d
                done
                """.formatted(n);
        System.out.println(note.strip());
    }
}
```

运行输出：

```text
JAVA
quest 21
done
```

`quest 21` 是这段程序自己的数据，保留。本次没有另编「字段上写 var」或「Lambda 形参混用类型与 var」的失败样本。

## 用 Stream 表达过滤和汇总 {#stream}

循环仍然合法。过滤、映射、汇总这类「不关心中间下标」的代码，Stream 通常更短。Lambda 需要函数式接口作为目标类型。它捕获的局部变量必须是 `final` 或事实上不再赋值。中间操作是惰性的，终止操作才触发所需要的遍历；实现可以省掉对结果没有影响的操作。流用过一次就不能再消费，它也不是存放元素的容器。流水线通常要求无状态、不干扰数据源。需要在中途改外部状态时，普通循环更清楚。`parallel()` 不保证更快。线程池和内存模型不在本页。

```java
import java.util.List;

public class StreamDemo {
    public static void main(String[] args) {
        var names = List.of("Ann", "Bo", "Cara");
        int total = names.stream()
                .filter(s -> s.length() > 2)
                .mapToInt(String::length)
                .sum();
        System.out.println(total);
    }
}
```

运行输出：

```text
7
```

`Bo` 长度是 2，被滤掉。`Ann` 与 `Cara` 的长度 3 和 4 相加得 7。

## 常见误读 {#_3}

- 把 `record` 当成可变 JavaBean，去找 setter 或 `getX()`。分量没有 setter；引用分量指向的对象仍可以变。
- 以为 `var` 是动态类型，或把它写在字段、普通方法参数、返回类型上。Lambda 形参是 JDK 11 起的例外，仍要目标类型。
- 模式匹配 `switch` 随手加一个永远走不到的 `default`，把「新增许可类型后重新编译会失败」这个提醒盖掉。
- 在 `forEach` 里修改外部可变状态，然后抱怨 Stream 难读。这种循环留着普通 `for` 更清楚。
- 「`record` 就是深不可变。」`final` 固定的是分量引用。`List.copyOf` 也只复制集合结构。
- 「对象是按引用传递的。」传递时复制的是引用的值。重新绑定形参不改调用方的变量。
- 「`sealed` 的穷尽覆盖了 null。」没有 `case null` 时，`null` 仍会在 `switch` 上抛出 `NullPointerException`。
- 「预览特性既然写在 JDK 25 里，就可以当稳定语法用。」原始类型模式在 25 仍是第三预览，不是本章的默认。

## 可选核对 {#language-check}

值传递和穷尽的前提已经写在上面。这两问只核对它们。

1. `ValuePassingDemo` 里，调用之后 `n` 和数组元素为什么一个变了、一个没变？`RecordAliasingDemo` 里，`List` 分量会被 `final` 冻住吗？
2. `ShapeDemo` 再许可一种类型，和向 `area` 传入 `null`，分别受哪条约束？模式 `switch` 在 21、原始类型模式在 25，是不是同为正式特性？

<details markdown><summary>参考答案</summary>

1. `n` 是基本值，方法里改的是副本，调用方仍是 1。数组的引用被复制后仍指向同一对象，所以元素变成 9；形参再指向新数组，不改调用方的变量。`Names` 的 `final` 分量只是不能改绑这个列表；列表内容后来加上了 `b`。`CopiedNames` 用 `List.copyOf` 复制的是当时的列表结构，元素 `String` 本身不可变，这不是深克隆。
2. 新增许可类型之后，要重新编译这个 `switch`，漏掉的分支才会被诊断出来。传入 `null` 且没有 `case null` 时，运行时抛出 `NullPointerException`，穷尽检查不把它当成已覆盖。模式 `switch` 在 JDK 21 已正式。原始类型模式在 JDK 25 仍是预览，不是默认语法。

</details>

<span id="_6"></span>

## 资料索引 {#_4}

<span id="_5"></span>

- [JLS 25 §4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-4.html) — 基本类型与引用类型、`null`、`final`、泛型。页面未标发布日期。
- [JLS 25 §15.12.4.5](https://docs.oracle.com/javase/specs/jls/se25/html/jls-15.html#jls-15.12.4.5) — 调用时复制实参的值。
- [JLS 25 §8.10](https://docs.oracle.com/javase/specs/jls/se25/html/jls-8.html#jls-8.10) — 记录的字段、构造器和隐式 `final`。历史的 [JLS 21 同节](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.10) 只作当时的规范入口。
- [Object.equals / hashCode](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Object.html#hashCode()) — 相等合同；散列值不保证对象之间唯一。
- [String](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/String.html) — `strip` Since 11，`formatted` Since 15。
- [Java Language Changes（JDK 25）](https://docs.oracle.com/en/java/javase/25/language/java-language-changes-release.html) — 按版本整理的语言变更。页面未标发布日期。
- [JEP 286](https://openjdk.org/jeps/286)、[JEP 323](https://openjdk.org/jeps/323) — 局部变量 `var` 在 10 正式；Lambda 形参的 `var` 在 11 正式。
- [JEP 361](https://openjdk.org/jeps/361)、[JEP 378](https://openjdk.org/jeps/378)、[JEP 394](https://openjdk.org/jeps/394)、[JEP 395](https://openjdk.org/jeps/395)、[JEP 409](https://openjdk.org/jeps/409) — switch 表达式 14，文本块 15，`instanceof` 模式 16，`record` 16，`sealed` 17。均已交付。
- [JEP 440](https://openjdk.org/jeps/440)、[JEP 441](https://openjdk.org/jeps/441) — 记录模式与模式 `switch` 均在 21 正式。
- [JEP 511](https://openjdk.org/jeps/511)、[JEP 512](https://openjdk.org/jeps/512)、[JEP 513](https://openjdk.org/jeps/513) — JDK 25 已正式。本章旧程序不改写成这些风格。
- [JEP 507](https://openjdk.org/jeps/507) — JDK 25 上原始类型模式的第三预览，不是默认。
- [JDK 发行列表](https://openjdk.org/projects/jdk/) — 25 GA 2025-09-16，27 GA 2026-09-15，28 仍在开发。

---

[返回 Java](../) · [下一节：集合框架](../02-collections/) →
