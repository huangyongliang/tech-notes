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
