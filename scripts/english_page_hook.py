"""English chrome stays English. The untranslated article body stays Chinese."""
import re

from mkdocs.structure.toc import get_toc


def on_page_context(context, page, config, nav):
    """Section headings are still Chinese, so they must not become the sidebar TOC."""
    hide = page.meta.get("hide") or []
    if "toc" in hide:
        page.toc = get_toc([])
    return context


def on_page_content(html, page, config, files):
    if "tn-fallback" not in html:
        return html
    if 'class="tn-fallback-body"' in html:
        return html
    match = re.search(r"</h1>", html, re.IGNORECASE)
    if not match:
        return '<div lang="zh" class="tn-fallback-body">\n' + html + "\n</div>\n"
    head, tail = html[: match.end()], html[match.end() :]
    return head + '\n<div lang="zh" class="tn-fallback-body">\n' + tail + "\n</div>\n"
