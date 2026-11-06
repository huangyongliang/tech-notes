# 语言基础与新特性 Language Basics

> [Java](../) › 语言基础与新特性

从语法、面向对象、`record`、`sealed`、模式匹配（`switch` / `instanceof`）、文本块，到 `var`、Stream / Lambda，按 LTS 版本（8 → 11 → 17 → 21 → 25）整理语言演进。重点是每个特性解决什么问题，以及惯用写法。

## 闯关任务

**QUEST 01 · 第一章 语言**

- [ ] 能够用 `record` 定义不可变数据载体，并说出编译器自动生成了哪些成员。
- [ ] 能够用 `sealed` / `permits` 限定继承层次，并配合模式匹配 `switch` 写出无需 `default` 的穷尽分支。
- [ ] 能够使用 `instanceof` 模式匹配、文本块和 `var`，并说出 `var` 的适用限制。
- [ ] 能够用 Stream / Lambda 改写常见的循环过滤、映射和聚合代码。
- [ ] 能够按 LTS 版本线（8 → 11 → 17 → 21 → 25）说出至少 3 个语言特性大致出现在哪个阶段。

**奖励**：+100 XP · 徽章「语法新兵」（徽章名暂定，内容建设中）

## 知识要点

主题版本基线是 JDK 25 LTS。下面四段都是可单独保存、编译、运行的程序。2026-11-06 在 JDK 21.0.12.1 上执行 `javac --release 21` 后运行，输出与下文一致。这些语法在 JDK 21 已是正式特性，没有使用 22 及以后才加入的语法，因此未在 JDK 25 上再跑一遍。

### 特性落在哪条 LTS

「正式版第一次出现」和「下一条 LTS 里已经能用」不是同一句话。记 LTS 阶段就够用：

| 阶段 | 这一段里可以依赖的写法 |
|------|------------------------|
| JDK 8 | Lambda、Stream |
| JDK 11 | `var`（JDK 10 正式，11 是下一条 LTS） |
| JDK 17 | 文本块、`record`、`sealed`、`instanceof` 模式匹配 |
| JDK 21 | 模式匹配 `switch` |
| JDK 25 | 当前 LTS 基线；本章示例不依赖 21 之后的新语法 |

> [!WARNING]
> JDK 8 没有 `var`、文本块、`record`、`sealed` 和模式匹配。用 JDK 8 编译下面的示例会直接失败。

### record 是数据载体，不是带 setter 的 JavaBean

`record Point(int x, int y)` 把字段声明成构造器参数。编译器生成规范构造器、访问器 `x()` / `y()`、以及按全部分量比较的 `equals` / `hashCode` / `toString`。分量是 `final` 的，没有 `setX`。

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

### sealed 让 switch 可以穷尽

`sealed` 配合 `permits` 把实现者写死。模式匹配 `switch` 覆盖全部许可类型后，编译器知道没有遗漏，可以不写 `default`。以后多一个实现，没补分支就会编译失败，这正是想要的提醒。

```java
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
        System.out.printf("%.2f%n", area(new Circle(1)));
        System.out.printf("%.2f%n", area(new Square(2)));
    }
}
```

运行输出：

```text
3.14
4.00
```

### instanceof、文本块和 var

`instanceof String s` 在判断成功时直接得到 `s`，不用再强制转换。`var` 只是局部变量的类型推断，变量仍然是编译期就确定的静态类型。文本块还是 `String`，方便写多行文字；行首相对结束引号的缩进会被去掉。

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

`var` 不能用于字段、方法参数或返回类型，也没有 JavaScript 那种运行期换类型。

### 用 Stream 表达过滤和汇总

循环仍然合法。过滤、映射、汇总这类「不关心中间下标」的代码，Stream 通常更短。

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

## 常见误区

- 把 `record` 当成可变 JavaBean，去找 setter 或 `getX()`。
- 以为 `var` 是动态类型，或把它写在字段上。
- 模式匹配 `switch` 随手加一个永远走不到的 `default`，把「新增子类时编译失败」这个保护盖掉。
- 在 `forEach` 里修改外部可变状态，然后抱怨 Stream 难读。这种循环留着普通 `for` 更清楚。

## 实践任务

1. 保存并运行 `RecordDemo`。再给 `Point` 加一个 `String name` 分量，看 `toString` 和 `equals` 如何变化。
2. 在 `ShapeDemo` 里增加 `record Triangle(double base, double height)`，先不要补 `switch` 分支，确认编译失败；补上面积公式后再运行。
3. 不用 Stream，用普通循环算出同样的 7。两种写法都留着，标出你认为哪一种更好读。

## 资料索引

- [Java Language Changes（JDK 25）](https://docs.oracle.com/en/java/javase/25/language/java-language-changes-release.html) — Oracle 按版本整理的语言变更，对应当前 LTS 基线
- [JEP 395: Records](https://openjdk.org/jeps/395) — `record` 正式说明
- [JEP 409: Sealed Classes](https://openjdk.org/jeps/409) — `sealed` / `permits` 正式说明
- [JEP 441: Pattern Matching for switch](https://openjdk.org/jeps/441) — 模式匹配 `switch`（JDK 21）
- [JEP 394: Pattern Matching for instanceof](https://openjdk.org/jeps/394) — `instanceof` 模式匹配
- [JEP 378: Text Blocks](https://openjdk.org/jeps/378) — 文本块
- [JLS：Record Declarations](https://docs.oracle.com/javase/specs/jls/se21/html/jls-8.html#jls-8.10) — 语言规范里的 `record` 定义

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】下面哪一项不是编译器为 `record Point(int x, int y)` 自动生成的？
    - A. 访问器 `x()`、`y()`
    - B. `equals` / `hashCode` / `toString`
    - C. `setX(int)`
    - D. 规范构造器
2. 【单选】`var` 可以用在哪里？
    - A. 类的字段
    - B. 方法参数
    - C. 方法内带初始化的局部变量
    - D. 方法返回类型
3. 【简答】对 `sealed interface Shape permits Circle, Square` 写模式匹配 `switch` 时，为什么可以省略 `default`？
4. 【简答】`if (obj instanceof String s && s.length() > 3)` 相比传统写法省掉了什么？
5. 【单选】以下哪个 LTS 版本首次引入 Lambda 和 Stream API？
    - A. JDK 8
    - B. JDK 11
    - C. JDK 17
    - D. JDK 21

<details markdown><summary>参考答案</summary>

1. C — `record` 的字段是 `final` 的，不生成 setter。
2. C — `var` 只用于有初始化表达式的局部变量（以及 `for` 循环变量、Lambda 参数）。
3. 编译器知道 `Shape` 的全部子类型，所有分支都覆盖时 `switch` 已经是穷尽的，新增子类时还会编译报错提醒。
4. 省掉了显式强制转换 `(String) obj` 和单独声明变量这两步。
5. A — Lambda 和 Stream 是 JDK 8 引入的。

</details>

---

[返回 Java](../) · [下一节：集合框架](../02-collections/) →
