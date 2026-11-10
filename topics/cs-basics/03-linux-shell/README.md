# Linux 与 Shell {#linux-shell-linux-shell}

> [计算机基础](../) › Linux 与 Shell

终端、常用命令、管道与重定向、权限、环境变量与简单脚本。

## 本关定位

| 项 | 内容 |
|----|------|
| 所属阶段 | 阶段 1 计算机基础 · 第 3 关（第一章「系统与工具」） |
| 前置要求 | [操作系统](../02-operating-systems/) 中的进程、文件描述符概念；会用 [文件与路径](../../getting-started/02-using-a-computer/) |
| 建议用时 | 1–2 周，之后在日常使用中持续熟练 |
| 后续衔接 | [Git 版本控制](../04-git/) 和之后所有 C 编译、调试都在终端里完成 |

终端是程序员最常用的工作台：编译 C 程序、运行测试、查日志、连服务器都离不开它。本关以 Linux 上默认的 Bash 为例；macOS 默认是 zsh，日常命令基本一致；Windows 用户建议安装 WSL 获得完整的 Linux 环境。

## 闯关任务

- [ ] 能够在终端中用 `pwd`、`ls`、`cd` 导航，并区分绝对路径与相对路径。
- [ ] 能够熟练使用文件操作和文本查看命令，用 `man` 或 `--help` 自己查用法。
- [ ] 能够用管道 `|` 和重定向 `>`、`>>`、`2>`、`<` 组合命令完成数据处理。
- [ ] 能够读懂 `ls -l` 的权限位，并用 `chmod` 修改权限。
- [ ] 能够解释 `PATH` 等环境变量的作用，并临时或永久修改它们。
- [ ] 能够写出带变量、条件、循环和参数的简单 Bash 脚本，并用 ShellCheck 检查。

## 知识要点

### 终端、Shell 与命令

- **终端**（Terminal）是显示文字的窗口；**Shell** 是在里面解释你输入的命令的程序，常见的有 Bash、zsh。
- 命令的一般形式：`命令 选项 参数`，例如 `ls -l /etc`。短选项一个横线（`-l`），长选项两个横线（`--all`）。
- 每个命令结束时返回**退出码**：0 表示成功，非 0 表示失败。用 `echo $?` 查看上一条命令的退出码。
- 查帮助：`man ls` 打开手册（按 `q` 退出，`/关键词` 搜索），`ls --help` 看简要说明。
- 效率技巧：`Tab` 自动补全，`↑` 翻历史，`Ctrl + R` 搜索历史，`Ctrl + C` 中断当前命令。

### 常用命令速查

| 类别 | 命令 | 作用 |
|------|------|------|
| 导航 | `pwd` `ls` `cd` | 当前目录、列出内容、切换目录 |
| 文件 | `mkdir` `touch` `cp` `mv` `rm` | 建目录、建空文件、复制、移动或改名、删除 |
| 查看 | `cat` `less` `head` `tail` | 输出全文、分页看、看开头、看结尾 |
| 搜索 | `grep` `find` | 按内容搜行、按条件找文件 |
| 文本 | `wc` `sort` `uniq` `cut` | 计数、排序、去重、按列截取 |
| 进程 | `ps` `top` `kill` | 看进程、实时监控、发信号 |
| 系统 | `df -h` `du -sh` `which` | 磁盘空间、目录大小、命令在哪 |

> [!WARNING]
> `rm` 删除的文件不进回收站，无法撤销。`rm -rf` 加上错误的路径可能毁掉整个目录，执行前先用 `ls` 确认路径，永远不要用 `sudo` 运行自己看不懂的删除命令。

### 管道与重定向

每个进程默认有三个流：标准输入（0）、标准输出（1）、标准错误（2）。

| 写法 | 含义 |
|------|------|
| `cmd > out.txt` | 标准输出写入文件（覆盖） |
| `cmd >> out.txt` | 标准输出追加到文件末尾 |
| `cmd 2> err.txt` | 标准错误写入文件 |
| `cmd > all.txt 2>&1` | 标准输出和标准错误都写入同一个文件 |
| `cmd < in.txt` | 从文件读取标准输入 |

管道 `cmd1 | cmd2` 把 cmd1 的标准输出接到 cmd2 的标准输入，它是 Unix 哲学的体现：每个工具只做好一件事，再组合起来。例如统计一个文本里出现最多的 5 个单词：

```bash
tr -cs '[:alpha:]' '\n' < article.txt | tr '[:upper:]' '[:lower:]' | sort | uniq -c | sort -rn | head -n 5
```

依次是：把非字母都换成换行（一行一个词）→ 转小写 → 排序 → 相邻去重并计数 → 按次数倒序 → 取前 5 行。

### 权限

`ls -l` 输出的第一列形如 `-rwxr-xr--`：

- 第 1 位是类型：`-` 普通文件，`d` 目录，`l` 符号链接。
- 后 9 位每 3 位一组，依次是**所有者**、**所属组**、**其他人**的权限；`r` 读、`w` 写、`x` 执行（对目录来说是「能进入」）。
- 数字写法：r = 4、w = 2、x = 1，相加得到每组的值。`755` 即 `rwxr-xr-x`，`644` 即 `rw-r--r--`。

```bash
chmod +x hello.sh      # 给所有人加执行权限
chmod 644 notes.txt    # 所有者读写，其他人只读
ls -l hello.sh notes.txt
```

`sudo` 以管理员（root）身份执行命令，只在确实需要时使用，例如安装软件。

### 环境变量与 PATH

- 环境变量是传给进程的「键 = 值」配置，用 `echo "$HOME"` 查看，`env` 列出全部。
- **`PATH`** 是用冒号分隔的目录列表。输入 `gcc` 时，Shell 依次在这些目录里找名为 `gcc` 的可执行文件；找不到就报 `command not found`。`which gcc` 显示找到的是哪一个。
- 当前目录默认不在 `PATH` 里，所以运行自己编译的程序要写 `./hello`。
- 临时修改：`export PATH="$HOME/bin:$PATH"`，只对当前终端有效；写进 `~/.bashrc`（zsh 是 `~/.zshrc`）后对新开的终端永久生效。

### 第一个 Shell 脚本

```bash
#!/usr/bin/env bash
# backup.sh：把指定目录打包成带日期的压缩文件
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "用法：$0 <目录>" >&2
    exit 1
fi

src="$1"
if [[ ! -d "$src" ]]; then
    echo "错误：$src 不是目录" >&2
    exit 1
fi

name="$(basename "$src")-$(date +%Y%m%d).tar.gz"
tar -czf "$name" "$src"
echo "已生成 $name"

for f in *.tar.gz; do
    echo "现有备份：$f"
done
```

要点：

- 第一行 `#!`（shebang）指定解释器；`chmod +x backup.sh` 后用 `./backup.sh docs` 运行。
- `set -euo pipefail`：命令失败就退出、使用未定义变量报错、管道中任一环节失败都算失败，能避开很多隐蔽的错误。
- `$1`、`$2` 是参数，`$#` 是参数个数，`$0` 是脚本名。
- **变量引用一律加双引号** `"$src"`，否则文件名里有空格就会被拆成多个参数。
- 错误信息写到标准错误 `>&2`，失败时返回非 0 退出码。

## 常见误区

- **「`cd` 到哪都用绝对路径」**：熟练使用 `.`、`..`、`~` 和 Tab 补全，效率高很多。
- **变量不加引号**：`rm $file` 在文件名含空格时会删错文件，应写 `rm "$file"`。
- **赋值时等号两边加空格**：`name = 1` 会被当成运行名为 `name` 的命令，必须写成 `name=1`。
- **遇到权限错误就加 `sudo`**：先弄清为什么没有权限；在自己的家目录里用 `sudo` 创建文件，之后反而会因为文件属于 root 而无法修改。
- **`>` 和 `>>` 混用**：`>` 会清空原文件，追加日志要用 `>>`。

## 实践任务

1. 在家目录下建立 `playground/`，用命令完成：新建 3 个文件、复制、改名、移到子目录、删除，全程不用图形界面。
2. 用 `man grep` 查出「忽略大小写」和「显示行号」的选项，然后在一个 C 源文件里搜索所有 `printf` 并显示行号。
3. 找一篇英文文章存为 `article.txt`，运行上面的词频管道，再改成输出前 10 个。
4. 写一个 `hello.sh`，接受一个名字参数并输出问候语，没给参数时打印用法并以退出码 1 结束；在 [ShellCheck](https://www.shellcheck.net/) 中检查直到没有警告。
5. 把 `~/bin` 加入 `PATH` 并写入 `~/.bashrc`，把 `hello.sh` 放进去，在任意目录直接运行 `hello.sh 世界`。

## 资料索引

- [The Linux Command Line](https://linuxcommand.org/tlcl.php) — William Shotts 著，系统讲解 Shell 与常用命令的免费电子书（英文）
- [MIT Missing Semester](https://missing.csail.mit.edu/) — 「Shell 工具与脚本」「命令行环境」等讲，专讲课堂上不教的工具技能（[中文翻译](https://missing-semester-cn.github.io/)）
- [GNU Bash 参考手册](https://www.gnu.org/software/bash/manual/) — Bash 官方手册，查语法细节的权威来源（英文）
- [ShellCheck](https://www.shellcheck.net/) — Shell 脚本静态检查工具，可在线粘贴检查，也能本地安装
- [explainshell](https://explainshell.com/) — 粘贴一条命令，逐段解释各个选项的含义（英文）
- [安装 WSL](https://learn.microsoft.com/zh-cn/windows/wsl/install) — 微软官方中文文档，在 Windows 上获得 Linux 环境

## 通关自测

先独立作答，再展开参考答案核对；简答题答出要点即算对。答对 ≥ 80% 即可进入下一关。

1. 【单选】`chmod 750 run.sh` 之后，同组用户对该文件的权限是：
    - A. 读、写、执行
    - B. 读、执行
    - C. 只读
    - D. 没有权限
2. 【单选】想把命令的标准输出和标准错误都保存到 `log.txt`，应写：
    - A. `cmd > log.txt`
    - B. `cmd 2> log.txt`
    - C. `cmd > log.txt 2>&1`
    - D. `cmd | log.txt`
3. 【单选】自己编译出的 `hello` 在当前目录，直接输入 `hello` 提示 `command not found`，最可能的原因是：
    - A. 文件损坏
    - B. 当前目录不在 `PATH` 中
    - C. 没有安装 gcc
    - D. 终端需要重启
4. 【简答】解释 `cat access.log | grep 404 | wc -l` 每一步做了什么，最终输出的是什么。
5. 【简答】Shell 脚本里为什么要写 `"$file"` 而不是 `$file`？

<details markdown><summary>参考答案</summary>

1. B — 7 / 5 / 0 分别对应所有者、组、其他人；5 = 4 + 1，即读和执行。
2. C — 先把标准输出重定向到文件，再让标准错误（2）指向标准输出（1）当前的去处。
3. B — Shell 只在 `PATH` 列出的目录中查找命令，应输入 `./hello`。
4. `cat` 输出日志全文，`grep 404` 只保留含 404 的行，`wc -l` 统计行数；最终输出含 404 的行数（也可以直接写 `grep -c 404 access.log`）。
5. 不加引号时，变量值中的空格和通配符会被 Shell 拆分、展开，含空格的文件名会变成多个参数，导致命令出错甚至操作错误的文件。

</details>

---

← [上一节：操作系统](../02-operating-systems/) · [返回 计算机基础](../) · [下一节：Git 版本控制](../04-git/) →
