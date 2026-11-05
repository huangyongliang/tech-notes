#!/usr/bin/env bash
# 把站点要用的内容复制到 _site_src/（仓库里原文件不动）
set -euo pipefail
rm -rf _site_src && mkdir -p _site_src
cp README.md CONTRIBUTING.md _site_src/
[ -f STYLE.md ] && cp STYLE.md _site_src/
cp -r topics notes resources _site_src/
# LICENSE 无 .md 扩展名：站内改为指向 GitHub 的绝对链接
sed -i 's#](LICENSE)#](https://github.com/huangyongliang/tech-notes/blob/main/LICENSE)#g' _site_src/*.md
# 站点专用：首页和样式（GitHub 仓库页仍用 README.md）
cp -r website/. _site_src/
rm -f _site_src/README.md
# 游戏模式：构建期从 Markdown 生成 NPC 对话（静态 dialogs.js，运行时不发请求；只读 _site_src 里的副本）
python3 scripts/build_dialogs.py --topics _site_src/topics --out _site_src/javascripts/dialogs.js --only-topic java
