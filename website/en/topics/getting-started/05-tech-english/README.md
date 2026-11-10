# Tech English {#tech-english}

> [Getting Started](../) › Tech English · [Chinese original](../../../../topics/getting-started/05-tech-english/)

How to read error messages and official documentation. API and command names stay in English on purpose.

## Where this chapter fits {#_1}

| Item | Content |
|------|---------|
| Stage | Stage 0, Getting Started · Chapter 5 (last chapter of this stage) |
| Prerequisites | [Learning to Learn](../04-learning-to-learn/); school-level English. That chapter has no English body yet. |
| Suggested time | 3–5 days to start, then daily reading |
| What's next | [CS Basics](../../../cs-basics/): manuals, man pages, and compiler errors. That section has no English body yet. |

Keywords, compiler errors, official docs, and most primary sources are in English. The useful vocabulary is small and the sentence patterns repeat. You do not need exam-level English. The goal is narrower: do not freeze on an English error, and finish one page of official documentation with a dictionary.

## Quest tasks {#_2}

- [ ] Recognize and explain at least 30 frequent technical words (for example `deprecated`, `argument`, `dependency`).
- [ ] Take a compiler diagnostic apart: file, line, severity, and reason, then find the fault.
- [ ] Read the common Linux errors `command not found`, `Permission denied`, and `No such file or directory`.
- [ ] Use a manual in the order overview, lookup, then close reading, and state what `MUST`, `SHOULD`, and `MAY` mean.
- [ ] Search with English keywords and write one plain English problem statement.

## What to know {#_3}

### Frequent words, by situation {#_4}

| Situation | Words | Meaning |
|-----------|-------|---------|
| Install and configure | install, configure, dependency, package, version | set up, adjust settings, something required, a software bundle, a release number |
| Code | variable, function, argument, parameter, return value | a named value, a callable unit, a value passed in, a declared input, the value passed back |
| Build | compile, build, link, executable, library | translate source, produce the program, connect object files, a file you can run, reusable code |
| Run | run, execute, process, input, output | start, carry out, a running program, data in, data out |
| Failure | error, warning, failed, invalid, unexpected | a fault, a non-fatal alert, did not succeed, not allowed, not what the program assumed |
| Files | file, directory, path, permission, denied | a file, a folder, a location, an access right, refused |
| Versions | deprecated, obsolete, release, stable, breaking change | still present but scheduled for removal, outdated, a published version, safe to rely on, a change that breaks callers |
| Docs | usage, example, reference, syntax, default | how to call it, a sample, the lookup section, the grammar, the value used when you omit one |

Also learn the short forms: `e.g.` (for example), `i.e.` (that is), `etc.` (and the rest), `TL;DR` (a short summary), `WIP` (work in progress), `FAQ` (frequently asked questions).

### How to read one compiler diagnostic {#_5}

This is real GCC 14 output for a program that omitted a semicolon:

```text
hello.c: In function ‘main’:
hello.c:5:5: error: expected ‘,’ or ‘;’ before ‘printf’
    5 |     printf("%d\n", count);
      |     ^~~~~~
hello.c:4:9: warning: unused variable ‘count’ [-Wunused-variable]
```

How to read it:

1. `hello.c:5:5` is file, line, column. It tells you where the compiler noticed the problem.
2. `error` means the program was not built. `warning` does not stop the build, but it is often a real defect.
3. `expected ‘,’ or ‘;’ before ‘printf’` means the compiler wanted a comma or a semicolon before `printf`. It reports line 5, but the missing semicolon is on the previous line. That delay is the main habit to learn.
4. The warning is a consequence of the first fault. Fix the first diagnostic before chasing the rest.

### Runtime errors you will see {#_6}

| Message | Meaning | Usual cause |
|---------|---------|-------------|
| `command not found` | The shell has no such command | Not installed, mistyped, or not on `PATH` |
| `No such file or directory` | That path does not exist | Wrong path, or the wrong working directory |
| `Permission denied` | Access was refused | Missing read, write, or execute permission |
| `Segmentation fault` | The process accessed memory it must not | Typical of a C program walking off an array or through a bad pointer |
| `Connection refused` | The remote side rejected the connection | Nothing is listening on that port |
| `Address already in use` | That address is taken | Another process already holds the port |

### How to read an official manual {#_7}

1. **Overview first.** Read the table of contents and Getting Started, Quick Start, or Tutorial. Ten minutes is enough to see how the book is split.
2. **Look up next.** For a specific question, use the Reference or API section. The site search and `Ctrl` + `F` are the tools.
3. **Close reading last.** Read the section you will actually use, sentence by sentence. Look up words, then run the example.
4. Match the **version** of the manual to the version you installed.

In specifications (RFCs and language standards), the capital words `MUST`, `SHOULD`, and `MAY` are defined by [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119). [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) adds that only the capital forms carry those meanings.

| Keyword | Meaning |
|---------|---------|
| `MUST` / `SHALL` | Required. Skipping it means the implementation does not conform. |
| `SHOULD` | Recommended. Skip it only with a stated reason. |
| `MAY` | Optional. |

> [!TIP]
> A translator can give you the shape of a paragraph. Keep the term itself in English. In programming, `argument` is the value passed into a function, not a dispute. `statement` is a program statement, not a press statement.

### Describe a problem in English {#_8}

A fixed pattern is enough:

```text
I'm trying to compile a C program with gcc 14 on Ubuntu 24.04.
When I run `gcc hello.c -o hello`, I get the error: "undefined reference to `main'".
I have checked that the file is saved. What am I missing?
```

## Common mistakes {#_9}

- **Stopping at the red text.** The diagnostic is the clue. Read the first one, word by word.
- **Reading only the last line.** Many tools end with "failed". The cause is above that line.
- **Trusting a machine translation for terms.** Translators regularly pick the wrong sense. Check the original sentence for the term.
- **Studying a word list in isolation.** These words stick when they show up in a manual or an error you are fixing.

## Practice {#_10}

1. Keep a glossary grouped by the situations above. Add three words a day from a manual or an error.
2. Cause three errors on purpose: a missing command, `ls` of a missing directory, and `cat` of a file you cannot read. Record the message and the meaning.
3. Read one section of the English [Pro Git](https://git-scm.com/book/en/v2), chapter 1, with a dictionary. Write five lines on what it said.
4. Write three to five English sentences describing a computer problem you actually hit.
5. Stage output: create a GitHub account, make a repository in the web UI, and write a short Markdown learning log for stage 0.

## Sources {#_11}

- [Google Technical Writing Courses](https://developers.google.com/tech-writing) — free courses on technical writing, also useful as reading practice
- [MDN Glossary](https://developer.mozilla.org/en-US/docs/Glossary) — Web terms, with a Chinese glossary you can compare
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) — definitions of `MUST`, `SHOULD`, and `MAY`
- [Microsoft Writing Style Guide](https://learn.microsoft.com/en-us/style-guide/welcome/) — usage of common technical terms
- [Cambridge Dictionary](https://dictionary.cambridge.org/) — definitions, examples, and audio

## Check yourself {#_12}

Answer first, then open the fold. A short answer is enough when it has the point. 80% is the bar for the next chapter.

1. A manual calls a function `deprecated`. That means:
    - A. It has been deleted and cannot be called
    - B. It still works, but it is discouraged and may be removed
    - C. It is experimental
    - D. It is slow
2. In `main.c:12:8: error: ...`, `12` is:
    - A. An error code
    - B. The column
    - C. The line
    - D. The number of errors
3. In a specification, `SHOULD` means:
    - A. Absolutely required
    - B. Do it unless you have a specific reason not to
    - C. Entirely optional
    - D. Forbidden
4. The compiler says `expected ';' before 'return'` and points at line 8. Where do you look first?
5. `./run.sh` prints `Permission denied`. What are the likely causes?

<details markdown><summary>Answers</summary>

1. B — `deprecated` means still available, usually for a transition period, and not the recommended path.
2. C — the form is file:line:column. 12 is the line and 8 is the column.
3. B — `SHOULD` is a strong recommendation. `MUST` is the requirement. `MAY` is optional.
4. Look at the end of the previous line (line 7). The compiler often reports the fault on the following line.
5. The file is not executable (`chmod +x run.sh`), or this user cannot read or traverse the file or its directory.

</details>

---

[Chinese original](../../../../topics/getting-started/05-tech-english/) · [English coverage list](../../../not-translated.md)
