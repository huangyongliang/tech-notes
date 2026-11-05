# 贡献指南 (Contributing)

项目负责人：小鼠。欢迎队友补充笔记。

## 放在哪里
- 不确定放哪 → `topics/inbox/`
- 属于单一主题 → `topics/<topic>/`（可以在下面建子目录）
- 跨主题或较长 → `notes/`
- 外部链接 → `resources/links.md`，也可以同时写进相关主题的「资料索引」

## 命名规范
- 文件名和目录名用英文小写，单词之间用 `-` 连接，例如 `rust-ownership.md`。
- 有时效性的笔记可以加日期前缀：`2026-11-04-k8s-upgrade.md`。
- 每个目录都放一个 `README.md` 作为索引。

## 模板
- 新笔记：复制 `templates/note.md`，填写 front matter（title、topic、tags、date、status、summary）。
- 新主题：复制 `templates/topic-readme.md` 到 `topics/<new-topic>/README.md`，然后在 `topics/README.md` 里登记。
- `status` 可选值：`draft` / `in-progress` / `done`。

## 提交规范 (Conventional Commits)
- `docs: add note on rust ownership`
- `feat: add topic databases`
- `chore: reorganize inbox`
- `fix: broken links in web index`

## PR 流程
1. 从 `main` 建分支：`notes/<topic>-<short-desc>`。
2. 每个 PR 只做一件事，并更新相关 README 索引。
3. 至少一人 review 后再合并（初期由小鼠 review）。
4. 不要提交密钥、token 或私人数据。
