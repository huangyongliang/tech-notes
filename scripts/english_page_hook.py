"""Put lang=zh on fallback article HTML. The English theme keeps html lang=en."""


def on_page_content(html, page, config, files):
    if "tn-fallback" not in html:
        return html
    if html.lstrip().startswith('<div lang="zh"'):
        return html
    return '<div lang="zh" class="tn-fallback-body">\n' + html + "\n</div>\n"
