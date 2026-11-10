# 数据库基础 Databases

> [计算机基础](../) › 数据库基础

关系模型、SQL、索引与事务入门。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 1 计算机基础 · 第 7 关（第二章「数据与网络」最后一关） |
| 前置要求 | [Linux 与 Shell](../03-linux-shell/) 的终端操作；[数据结构与算法](../06-data-structures-algorithms/) 中的哈希表与树 |
| 建议用时 | 2–3 周（入门深度） |
| 后续衔接 | Java 阶段的 [数据持久化](../../java/10-persistence/)（JDBC、ORM）直接建立在本关的 SQL 和事务之上。数学关系可选读网站上的 [集合、关系与函数](../../cs-theory/02-sets-relations-functions/)，不覆盖 SQL 的 NULL，也不是写查询的前置，并且不在小程序打包的 35 篇里 |

几乎所有应用都要把数据长期保存下来并快速查询，关系数据库是最常用的方案。本关用 SQLite 练习：它是一个单文件、零配置的数据库，安装后马上能用，SQL 语法和 MySQL、PostgreSQL 大部分相通。

## 闯关任务

- [ ] 能够解释表、行、列、主键、外键的含义，并为一个简单场景设计表结构。
- [ ] 能够用 SQL 完成建表和增删改查，熟练使用 `WHERE`、`ORDER BY`、`LIMIT`。
- [ ] 能够用 `GROUP BY` 和聚合函数做统计，用 `JOIN` 连接多张表查询。
- [ ] 能够解释索引为什么能加快查询、代价是什么，并用 `EXPLAIN QUERY PLAN` 验证。
- [ ] 能够说出事务的 ACID 四个特性，并用 `BEGIN` / `COMMIT` / `ROLLBACK` 保证一组操作的原子性。
- [ ] 能够解释 SQL 注入的成因，并说明参数化查询为什么能防止它。

## 知识要点

### 关系模型

- 数据存在**表**（table）里，每一**行**（row）是一条记录，每一**列**（column）是一个字段，有固定的类型。
- **主键**（primary key）唯一标识一行，不能重复、不能为空，常用自增整数 `id`。
- **外键**（foreign key）引用另一张表的主键，表达表与表之间的关系，例如「订单属于某个用户」。
- **范式**的核心思想是**不重复存储同一事实**：用户的姓名只存在 `users` 表里，订单表只存 `user_id`。这样修改姓名时只需改一处，不会出现数据不一致。
- 关系之间常见三种：一对一、一对多（一个用户多个订单）、多对多（学生和课程，需要一张中间表）。

### 建表与增删改查

下面的例子用一个记账场景：`categories` 存分类，`expenses` 存每一笔支出。在终端运行 `sqlite3 ledger.db` 进入交互界面后输入：

```sql
CREATE TABLE categories (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE expenses (
    id          INTEGER PRIMARY KEY,
    spent_on    TEXT    NOT NULL,              -- 日期，格式 YYYY-MM-DD
    amount_cent INTEGER NOT NULL CHECK (amount_cent > 0),
    category_id INTEGER NOT NULL REFERENCES categories (id),
    note        TEXT
);

INSERT INTO categories (name) VALUES ('餐饮'), ('交通'), ('学习');

INSERT INTO expenses (spent_on, amount_cent, category_id, note) VALUES
    ('2026-11-01', 2500, 1, '午饭'),
    ('2026-11-01',  400, 2, '地铁'),
    ('2026-11-02', 8900, 3, '技术书'),
    ('2026-11-03', 3200, 1, '晚饭');

SELECT spent_on, amount_cent, note
FROM expenses
WHERE amount_cent >= 3000
ORDER BY spent_on DESC
LIMIT 10;

UPDATE expenses SET note = '晚饭（聚餐）' WHERE id = 4;
DELETE FROM expenses WHERE id = 2;
```

- 金额用整数「分」存储，避免浮点误差（见 [计算机组成](../01-computer-organization/)）。
- `UPDATE` 和 `DELETE` **一定要带 `WHERE`**，否则会修改或删除整张表。
- SQLite 默认不检查外键约束，需要先执行 `PRAGMA foreign_keys = ON;` 才会生效。

### 聚合与连接

```sql
-- 每个分类的总支出，从高到低
SELECT c.name, SUM(e.amount_cent) AS total_cent, COUNT(*) AS times
FROM expenses AS e
JOIN categories AS c ON c.id = e.category_id
GROUP BY c.name
HAVING SUM(e.amount_cent) > 1000
ORDER BY total_cent DESC;
```

- **聚合函数**：`COUNT`、`SUM`、`AVG`、`MIN`、`MAX`，配合 `GROUP BY` 按组统计。
- `WHERE` 在分组**前**过滤行，`HAVING` 在分组**后**过滤组。
- **`JOIN`**（内连接）只保留两边都匹配的行；**`LEFT JOIN`** 保留左表所有行，右表没有匹配时填 `NULL`，例如「列出所有分类，包括还没有支出的」。
- `NULL` 表示「未知」，判断要用 `IS NULL`，`= NULL` 永远不成立。

### 索引

没有索引时，按条件查询要扫描整张表（O(n)）。**索引**是额外维护的有序数据结构，多数数据库用 **B 树 / B+ 树**，使查找降到 O(log n)，就像书末的索引页。

```sql
CREATE INDEX idx_expenses_spent_on ON expenses (spent_on);

EXPLAIN QUERY PLAN
SELECT * FROM expenses WHERE spent_on = '2026-11-01';
-- 输出中出现 SEARCH expenses USING INDEX idx_expenses_spent_on，说明用上了索引
```

- 主键自动带索引；经常出现在 `WHERE`、`JOIN`、`ORDER BY` 中的列适合建索引。
- 代价：占用额外空间；每次插入、修改都要同步更新索引，写入变慢。不要给每一列都建索引。
- 对列做运算或函数处理（如 `WHERE substr(spent_on, 1, 7) = '2026-11'`）通常用不上该列的普通索引，可以改写成范围条件 `WHERE spent_on >= '2026-11-01' AND spent_on < '2026-12-01'`。

### 事务与 ACID

**事务**把多条语句打包成一个整体，要么全部成功，要么全部撤销。典型例子是转账：扣款和入账必须同时成功。

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;   -- 中途出错则执行 ROLLBACK，两条修改都不生效
```

| 特性 | 含义 |
|------|------|
| 原子性 Atomicity | 事务中的操作要么全做，要么全不做 |
| 一致性 Consistency | 事务前后数据都满足约束（如余额不为负） |
| 隔离性 Isolation | 并发执行的事务互不干扰，程度由隔离级别决定 |
| 持久性 Durability | 提交成功后，即使断电数据也不会丢失 |

隔离级别（读未提交、读已提交、可重复读、可串行化）和它们能防止的「脏读」「不可重复读」「幻读」，入门阶段知道名字即可，学 Java 持久化时再深入。

### SQL 注入与参数化查询

把用户输入直接拼接进 SQL 字符串非常危险。假设程序这样拼接：

```text
"SELECT * FROM users WHERE name = '" + 用户输入 + "'"
```

用户输入 `' OR '1'='1` 时，条件变成永远为真，返回全部用户。正确做法是**参数化查询**：SQL 中用占位符 `?`，数据单独传给数据库，数据库只把它当作值，不会当作 SQL 代码执行。在 C 中使用 SQLite 时对应 `sqlite3_prepare_v2` 加 `sqlite3_bind_text`，Java 中对应 `PreparedStatement`。

> [!WARNING]
> 永远不要用字符串拼接把用户输入放进 SQL。无论用哪种语言、哪种数据库，都应使用参数化查询或可靠的 ORM。

## 常见误区

- **`UPDATE` / `DELETE` 忘写 `WHERE`**：一条语句改掉整张表。执行前先用同样的 `WHERE` 跑一遍 `SELECT` 确认范围。
- **「索引越多越快」**：索引加速读、拖慢写，还占空间，只为常用查询条件建。
- **用 `= NULL` 判断空值**：结果永远不为真，应写 `IS NULL`。
- **用浮点类型存金额**：会有舍入误差，用整数分或数据库的定点小数类型。
- **把所有信息塞进一张大表**：同一事实重复存储，修改时容易漏改导致数据不一致。

## 实践任务

1. 安装 SQLite（`sqlite3 --version` 验证），运行上面的建表和插入语句，再练习 5 条不同条件的 `SELECT`。
2. 写出 SQL：统计每天的总支出；找出支出最多的分类；用 `LEFT JOIN` 列出所有分类及其支出次数（包括 0 次的）。
3. 用 Python 或 Shell 生成 10 万条随机支出插入表中，比较给 `spent_on` 建索引前后查询某一天的耗时（在 sqlite3 中用 `.timer on`），并用 `EXPLAIN QUERY PLAN` 对比。
4. 建一个 `accounts` 表，演示转账事务：在 `COMMIT` 前执行 `ROLLBACK`，确认两条修改都没有生效。
5. 在 [SQLBolt](https://sqlbolt.com/) 完成全部基础课程。

## 资料索引

- [SQLBolt](https://sqlbolt.com/) — 浏览器里的交互式 SQL 入门练习，每课一个知识点（英文）
- [SQLite 官方文档：SQL 语法](https://www.sqlite.org/lang.html) — SQLite 支持的全部 SQL 语句与函数（英文）
- [PostgreSQL 官方教程](https://www.postgresql.org/docs/current/tutorial.html) — 从建表、查询到事务的入门教程，学完 SQLite 后迁移到服务器数据库时阅读（英文）
- [Use The Index, Luke!](https://use-the-index-luke.com/) — 面向开发者讲解 SQL 索引原理与优化的免费网站（英文）
- [CMU 15-445 Database Systems](https://15445.courses.cs.cmu.edu/) — 卡内基梅隆大学数据库系统课，讲存储、索引、事务的实现，适合进阶（英文）
- [CS50x Week 7: SQL](https://cs50.harvard.edu/x/weeks/7/) — 哈佛 CS50 的 SQL 一周，用 SQLite 讲查询、关系与 SQL 注入（英文）

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】按分组统计后，要只保留总额大于 1000 的组，应使用：
    - A. `WHERE`
    - B. `HAVING`
    - C. `ORDER BY`
    - D. `LIMIT`
2. 【单选】想列出所有分类及其支出，没有支出的分类也要显示，应使用：
    - A. `JOIN`
    - B. `LEFT JOIN`
    - C. `UNION`
    - D. `GROUP BY`
3. 【单选】关于索引，下列说法正确的是：
    - A. 索引越多，所有操作都越快
    - B. 索引能加快查询，但会让插入和修改变慢
    - C. 建了索引的列不能再修改
    - D. 索引只能建在主键上
4. 【简答】什么是事务？用转账的例子说明原子性为什么重要。
5. 【简答】什么是 SQL 注入？如何防止？

<details markdown><summary>参考答案</summary>

1. B — `HAVING` 在分组之后过滤；`WHERE` 作用于分组之前的行。
2. B — `LEFT JOIN` 保留左表全部行，右表无匹配时为 `NULL`。
3. B — 每次写入都要同步维护索引，所以索引是「以写换读」。
4. 事务是一组要么全部成功、要么全部撤销的操作。转账要扣 A 的钱并给 B 加钱，如果只完成扣款就出错，钱会凭空消失；原子性保证这种中间状态不会被保留。
5. 把用户输入直接拼接进 SQL，使输入被当作 SQL 代码执行，从而绕过条件或篡改数据。用参数化查询（占位符加绑定参数）防止，数据库只把输入当作值处理。

</details>

---

← [上一节：数据结构与算法](../06-data-structures-algorithms/) · [返回 计算机基础](../)
