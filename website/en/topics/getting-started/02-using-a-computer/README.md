# Using a computer {#using-a-computer}

> [Getting Started](../) › Using a computer · [Chinese original](../../../../topics/getting-started/02-using-a-computer/)

The keyboard and typing, the operating system's interface, files and directories, installing software, and the shortcuts you use every day.

## Where this chapter fits {#_1}

| Item | Content |
|------|---------|
| Stage | Stage 0, Getting Started · Chapter 2 |
| Prerequisites | [What is a computer](../01-what-is-a-computer/) |
| Suggested time | 4–7 days (a rough guide; typing practice has to be daily, and it takes longer) |
| What's next | [Linux and Shell](../../cs-basics/03-linux-shell/) does from the command line what this chapter does in the graphical interface |

A programmer's day is typing, finding files, installing tools, and moving between windows. This chapter makes those basics fluent, so that later, when you learn the command line and write code, your attention stays on what you mean rather than on where to click.

## Quest tasks {#_2}

- [ ] Touch-type with the right fingers, at 30 or more characters per minute in Chinese or English (a suggested target).
- [ ] State the difference between an absolute path and a relative path, and write the full path of your Documents folder.
- [ ] Show file extensions, and say what `.txt`, `.zip`, `.exe`, `.dmg`, and `.pdf` each are.
- [ ] Download, install, and uninstall one program from an official source, and install one program with a package manager.
- [ ] Use ten or more shortcuts fluently, including copy, paste, undo, switching windows, screenshots, and search.

## What to know {#_3}

### Keyboard and typing {#_4}

- **Home keys:** the left index finger rests on `F` and the right index finger on `J` (those two keys have a small bump). The other fingers sit in a row beside them, and each finger owns one fixed column.
- **Accuracy before speed.** For the first two weeks, only aim to type without looking and without mistakes. Speed follows.
- **The symbols programmers type** need their own practice: `{ } [ ] ( ) < > ; : " ' / \ | _ - = + * & ^ % $ # @ !`. In code they are as common as letters.
- Learn to switch an input method between Chinese and English quickly (often the `Shift` key). When you write code, use English punctuation. Full-width Chinese marks such as `，；（）` make the program fail.

### Files, directories, and paths {#_5}

A file system is a tree. The top is the root. Under it are layers of directories (folders), and files hang on those directories.

| System | Root / starting point | An example of a home directory | Separator |
|--------|-----------------------|--------------------------------|-----------|
| Windows | A drive letter, `C:\` | `C:\Users\alice\Documents` | `\` |
| macOS | `/` | `/Users/alice/Documents` | `/` |
| Linux | `/` | `/home/alice/Documents` | `/` |

- An **absolute path** starts at the root and is written in full. It names the same place wherever you use it.
- A **relative path** starts at the current directory. `.` means the current directory and `..` means the parent. If you are in `Documents`, `../Downloads` is the `Downloads` directory beside it.
- An **extension** (`.txt`, `.jpg`) tells the system which program should open the file. Windows hides extensions by default. Turn on "File name extensions" in File Explorer's View menu. Otherwise a disguise such as `report.pdf.exe` is easy to trust.
- While you are learning to program, name files and directories with only English letters, digits, `-`, and `_`. Avoid spaces and Chinese. The command line is much less trouble that way.

### Installing and uninstalling software {#_6}

- **Prefer an official source:** the project's own site, or the store that comes with the system (Microsoft Store, Mac App Store). A "fast download" button in a search result often bundles adware.
- **Common installers:** on Windows, `.exe` and `.msi`; on macOS, `.dmg` (open it and drag the application into Applications) and `.pkg`; on Linux, the distribution's packages.
- **Uninstall** through the system settings (Windows: Settings → Apps; on macOS, drag the application to the Trash). Do not delete the install directory by hand.
- A **package manager** installs software with one command. Programmers use them constantly:

```bash
# Windows 10 / 11（winget，在 PowerShell 或终端中运行）
winget install --id Git.Git -e

# macOS（需要先按 brew.sh 的说明安装 Homebrew）
brew install git

# Debian / Ubuntu Linux
sudo apt install git
```

### Archives {#_7}

`.zip` is a compressed format every system can open directly. `.7z` and `.rar` need extra software. `.tar.gz` is common on Linux and macOS. Before you extract, see which directory the files will land in, so you do not scatter hundreds of files across the desktop.

### Shortcuts you will use {#_8}

| Action | Windows | macOS |
|--------|---------|-------|
| Copy / cut / paste | `Ctrl` + `C` / `X` / `V` | `Cmd` + `C` / `X` / `V` |
| Undo / redo | `Ctrl` + `Z` / `Ctrl` + `Y` | `Cmd` + `Z` / `Cmd` + `Shift` + `Z` |
| Select all / save / find | `Ctrl` + `A` / `S` / `F` | `Cmd` + `A` / `S` / `F` |
| Switch applications | `Alt` + `Tab` | `Cmd` + `Tab` |
| Open the file manager | `Win` + `E` | Click Finder in the Dock |
| Search everywhere | `Win` (then type) | `Cmd` + `Space` |
| Screenshot | `Win` + `Shift` + `S` | `Cmd` + `Shift` + `4` |
| Lock the screen | `Win` + `L` | `Ctrl` + `Cmd` + `Q` |

> [!TIP]
> Deliberately practice only three new shortcuts a week. After a week they become habit. In a browser, `Ctrl` / `Cmd` + `L` (jump to the address bar), `T` (a new tab), and `W` (close the tab) are just as common.

### Backups {#_9}

Keep at least two copies of anything important, in different places (the computer plus a cloud drive or an external disk). The usual "3-2-1 rule" is three copies, on two kinds of media, with one copy off site. Once you write code, managing the files with [Git](../../cs-basics/04-git/) and pushing them to GitHub is another backup.

## Common mistakes {#_10}

- **Leaving every file on the desktop or in Downloads.** After a while nothing can be found. Make directories by project, year, or kind, and file a download as soon as it arrives.
- **Putting spaces and Chinese in file names.** The graphical interface does not mind. The command line needs quotes everywhere, and some tools fail.
- **Clicking Next through an installer.** Many installers check extra bundled software by default. Read each page.
- **Using `Ctrl` + `C` / `V` without knowing how to undo.** After a mistake, the first move is `Ctrl` / `Cmd` + `Z`, not a manual repair.

## Practice {#_11}

1. Take a speed test on TypingClub or Monkeytype and write down the starting speed. Practice 15 minutes a day, then test again after two weeks.
2. Turn on file-extension display. Under Documents, create the directory `learning/getting-started/` and write down its absolute path.
3. Install one program with a package manager (winget, Homebrew, or apt), for example Git or VS Code, and uninstall one program you do not use through the system settings.
4. Compress a folder to `.zip`, send it to yourself (email or a cloud drive), then download it and extract it into a different directory.
5. Add to the "specification of my computer" note: the programs you use, the rule you use to organize directories, and your ten most-used shortcuts.

## Sources {#_12}

- [Keyboard shortcuts in Windows](https://support.microsoft.com/zh-cn/windows/windows-%E7%9A%84%E9%94%AE%E7%9B%98%E5%BF%AB%E6%8D%B7%E6%96%B9%E5%BC%8F-dcc61a57-8ff0-cffe-9796-cb9706c75eec) — Microsoft's official shortcut list (Chinese)
- [Mac keyboard shortcuts](https://support.apple.com/zh-cn/102650) — Apple's official shortcut list (Chinese)
- [LearnFree: Windows Basics](https://www.learnfree.org/series/windows-basics) and [macOS Basics](https://www.learnfree.org/series/macos-basics) — GCFGlobal's free introductions to the desktop, files, and settings
- [Use WinGet to install and manage applications](https://learn.microsoft.com/zh-cn/windows/package-manager/winget/) — Microsoft's official winget documentation (Chinese)
- [TypingClub](https://www.typingclub.com/) — a free graded typing course, suitable for learning the finger positions
- [Monkeytype](https://monkeytype.com/) — a plain typing-speed site that can drill punctuation and digits

## Check yourself {#_13}

Answer on your own first, then open the fold. A short answer counts when it has the point. 80% is the bar for the next chapter.

1. The current directory is `/home/alice/Documents`. The relative path `../Downloads` points at:
    - A. `/home/alice/Documents/Downloads`
    - B. `/home/alice/Downloads`
    - C. `/home/Downloads`
    - D. `/Downloads`
2. Which of these is a common installer format on macOS?
    - A. `.msi`
    - B. `.dmg`
    - C. `.deb`
    - D. `.apk`
3. You deleted a stretch of text by mistake. The fastest repair is:
    - A. Close the file without saving
    - B. Type it again
    - C. Press `Ctrl` / `Cmd` + `Z`
    - D. Look in the recycle bin
4. Why should you turn on "show file extensions" on Windows?
5. What is better about installing software with a package manager than searching the web and downloading it? Name two things.

<details markdown><summary>Answers</summary>

1. B — `..` goes up to `/home/alice`, then into `Downloads`.
2. B — `.dmg` is a macOS disk image. `.msi` belongs to Windows, `.deb` to Debian / Ubuntu, and `.apk` to Android.
3. C — undo is the ordinary operation in an editor.
4. You can see the file's real type, and you will not open a disguised executable such as `xxx.pdf.exe` as if it were a document.
5. The points: the source is trustworthy (an official repository), one command finishes the install, upgrades and uninstalls stay in one place, and the same command can be scripted onto a new computer.

</details>

---

← [Previous: What is a computer](../01-what-is-a-computer/) · [Back to Getting Started](../) · [Next: Internet basics](../03-internet-basics/) →
