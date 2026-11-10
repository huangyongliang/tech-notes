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
# 游戏模式：构建期生成分 topic 对话文件（静态、同域 script 注入，运行时不 fetch/XHR）
# dialogs-java.js ≈ 首页外 Java 文章用；dialogs-basics.js ≈ 知识世界基础陆
# dialogs-loader.js（入库）按路径懒加载对应文件并 merge 进 window.TN_DIALOGS
python3 scripts/build_dialogs.py --topics _site_src/topics \
  --out _site_src/javascripts/dialogs-java.js --only-topic java --merge
python3 scripts/build_dialogs.py --topics _site_src/topics \
  --out _site_src/javascripts/dialogs-basics.js \
  --only-topic getting-started,cs-basics,programming-basics --merge
# English site: real English where the catalog says translated.
# Other /en/ URLs keep the same article, with the fallback banner.
# _site_src/en is the copied source tree and is not the English site.
python3 scripts/build_english_slice.py
