# Learning and asking questions {#learning-to-learn}

> [Getting Started](../) › Learning and asking questions · [Chinese original](../../../../topics/getting-started/04-learning-to-learn/)

The Feynman technique, spaced repetition, notes, search, and "How to Ask Questions the Smart Way".

## Where this chapter sits {#_1}

| Item | Content |
|------|---------|
| Stage | Stage 0, Getting Started · lesson 4 |
| Before | [Internet basics](../03-internet-basics/) |
| Time | 3–5 days to learn the method, then use it again in every later lesson |
| Next | Every later lesson on this path uses it: notes, the self-check, and searching and asking when you are stuck |

The hard part of studying a technical subject on your own is not that the material is hard. It is that you forget what you read, and that you do not know what to do when you are stuck. This chapter gives a method you can carry out: how to get the idea in, how to keep it, how to find the answer yourself, and how to ask someone else when you really cannot.

## Quest tasks {#_2}

- [ ] Use the Feynman technique to explain one concept you just learned to a non-specialist, and find the place you cannot explain.
- [ ] Say why active recall and spaced repetition work better than rereading, and schedule reviews with a flashcard tool.
- [ ] Take notes in your own words, and file them in a fixed structure in a repository or a notes program.
- [ ] Use quotes, `site:`, and excluded words to find an answer in official documentation and in a community.
- [ ] Following "How to Ask Questions the Smart Way", write a question that includes the environment, what happened, a minimal reproduction, and what you already tried.

## What to know {#_3}

### The Feynman technique: explaining it is the test of whether you understand it {#_4}

The method is named after the physicist Feynman (the name was given later; the steps summarize how he studied). There are only four:

1. Pick a concept, for example "what DNS is".
2. Pretend you are explaining it to someone who knows none of it. Write or say it in the simplest words.
3. The place where you get stuck, or where you paper over a gap with a term, is the place you do not understand. Go back and study it.
4. Explain it again, until a comparison and an example carry it through.

### Active recall and spaced repetition {#_5}

- **Active recall:** close the book and try to remember. That sticks better than reading it again. Psychology calls this the testing effect, which is why every lesson on this path has a "Check yourself".
- **Spaced repetition:** forgetting is fast at first and then slow. Review once as you are about to forget, and the next review can wait longer (1 day, then 3 days, then 1 week, then 1 month, and so on).
- **A tool:** flashcard software such as Anki schedules the reviews for you. Anki's traditional scheduler comes from SM-2, and newer versions can use the FSRS scheduler in the deck options. One card asks one thing. The front might say "1 Byte = ? bit" and the back "8".

### Focus and rest {#_6}

- Use a rhythm such as the Pomodoro technique: 25 minutes of focus, 5 minutes of rest, and a longer rest after four rounds. Change the lengths if you need to.
- When hard material stalls, leave it for a walk or a night's sleep. You often see it when you come back. The course *Learning How to Learn* calls the alternation focused mode and diffuse mode.
- **Deliberate practice:** work on the part you cannot do, and get feedback (a self-check, a program you run, or someone else's review), instead of repeating what you already can do.

### Notes {#_7}

- Write them in **your own words**. Do not paste long stretches of the original. The original stays as a link.
- Each note answers three questions: what is it, why do you need it, and how do you use it (with one minimal example)?
- Write them in Markdown. After [Git](../../cs-basics/04-git/), put them in a GitHub repository. This repository's [note templates](https://github.com/huangyongliang/tech-notes/tree/main/templates) are there to copy.
- Write down questions and follow-ups, and answer them later. That is the best review.

### How to search {#_8}

| Form | What it does | Example |
|------|--------------|---------|
| `"..."` | Match the whole phrase | `"segmentation fault" gcc` |
| `site:` | Search only one site | `site:docs.github.com pull request` |
| `-word` | Exclude a word | `python list -snake` |
| Add a version | Skip outdated answers | `gcc 14 c23` |

- **Copy an error message as it is** and search for it. Remove the parts that are only yours, such as your file name and path.
- **Official documentation first, then the community.** Official documentation is the most accurate. On Stack Overflow and GitHub Issues, look at the date and the votes.
- **Check what an AI assistant gives you.** Confirm the commands and links in the official documentation, and actually run the code.

### How to ask {#_9}

A good question lets someone else see it at a glance and reproduce it once. Before you ask, do three things: search for the error text, read the official documentation, and try to shrink the problem. A question then includes:

1. **The goal:** what you are trying to accomplish. This prevents the XY problem, where you ask only about the solution Y you imagined and never state the real goal X.
2. **The environment:** the operating system and the software versions.
3. **A minimal reproduction:** the shortest code or steps that show the problem.
4. **The full error:** paste the text as it is. Do not leave a screenshot that cuts the message in half.
5. **What you already tried:** what you did, and what happened.

```text
标题：Ubuntu 24.04 上 gcc 编译 hello.c 报 "undefined reference to `main'"

目标：编译并运行一个最简单的 C 程序。
环境：Ubuntu 24.04，gcc 13.2。
复现：hello.c 内容如下（附 5 行代码），执行 gcc hello.c -o hello。
报错：（完整粘贴终端输出）
已尝试：确认文件已保存；搜索报错后检查了 main 的拼写，仍然报错。
```

## Common mistakes {#_10}

- **Treating "I followed it" as "I learned it".** A video feels clear, and then you cannot write it once it is closed. After every section, do the thing and take the self-check.
- **Saving a link is not studying.** A hundred links in a folder are worth less than reading one of them carefully. Each lesson on this path recommends only three to six sources, so the list stays short.
- **Asking the moment you are stuck.** Someone else searching for you teaches you less than searching yourself, and an answer you find yourself is the one you keep. Spend 15–30 minutes investigating before you ask.
- **A screenshot and no text.** A screenshot cannot be copied or searched. Paste errors and code as text.

## Practice {#_11}

1. Take "binary" from lesson 1 and, with the Feynman technique, write an explanation of at most 200 characters that a non-specialist can follow.
2. Install Anki or a similar tool. Turn 10 key ideas from the first three lessons into cards, and review them for a week.
3. Search once with each of the four forms in the table, and note which one helped.
4. Take a problem you hit recently and write it up as a complete question in the style of "How to Ask Questions the Smart Way". You do not have to post it.
5. Create a learning-log file. Each day, write three lines: what you studied, what you did not understand, and what you will do tomorrow.

## Sources {#_12}

- [How to Ask Questions the Smart Way (Chinese translation)](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way) — the essay by Eric S. Raymond and Rick Moen on how to ask a technical question that gets an answer
- [Stack Overflow: How do I ask a good question?](https://stackoverflow.com/help/how-to-ask) and [How to create a Minimal, Reproducible Example](https://stackoverflow.com/help/minimal-reproducible-example) — the community's own guides to asking and to a minimal reproduction
- [Learning How to Learn (Coursera)](https://www.coursera.org/learn/learning-how-to-learn) — a course on focus, procrastination, and memory (English; the free-audit policy is whatever the page says)
- [Anki manual](https://docs.ankiweb.net/) — the official documentation for the spaced-repetition program Anki
- [Refine web searches](https://support.google.com/websearch/answer/2466433?hl=zh-Hans) — Google's official list of search operators (Chinese)
- [The XY Problem](https://xyproblem.info/) — one page on what the XY problem is and how to avoid it

## Check yourself {#_13}

Answer on your own first, then open the fold. A short answer counts when it has the point. 80% is the bar for the next lesson.

1. Which way of reviewing is the most effective for long-term memory?
    - A. Read the whole thing three times just before the exam
    - B. Close the book and test yourself, then repeat at lengthening intervals
    - C. Copy every highlighted passage once
    - D. Save the material and look at it when you need it
2. To search for "fork" only in GitHub's official documentation, type:
    - A. `fork github`
    - B. `"fork" -github`
    - C. `site:docs.github.com fork`
    - D. `fork filetype:github`
3. Which of these does not belong in a good technical question?
    - A. The software version and the operating system
    - B. The full error text
    - C. "Urgent!!! Waiting online"
    - D. What you have already tried
4. What is the XY problem? How do you avoid it?
5. When you use the Feynman technique to test whether you understand a concept, what is the signal that matters?

<details markdown><summary>Answers</summary>

1. B — active recall plus spaced repetition lasts longer than rereading in one sitting.
2. C — `site:` limits the search to one site.
3. C — urging the reader adds no useful information, and it puts the person answering off.
4. You ask only about the solution Y you imagined, and you never state the real problem X, so people help in the wrong direction. To avoid it, write the final goal first, then the approach you tried.
5. When you explain it to a non-specialist, if you have to hide behind a term, or you cannot give an example, that spot is not understood yet and you need to study it again.

</details>

---

← [Previous: Internet basics](../03-internet-basics/) · [Back to Getting Started](../) · [Next: Tech English](../05-tech-english/) →
