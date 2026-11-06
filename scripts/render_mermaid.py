#!/usr/bin/env python3
"""Render ```mermaid fences to PNGs for the miniapp reader subpackage.

Cache key is sha256(source + theme config + mermaid version). Unchanged
diagrams are not rendered again. A render failure is a warning: the block
becomes a code block with banner 「图表未生成 · 显示源码」 and the build
continues.

Dark files are not produced. A later pass can add ``<hash>.dark.png`` beside
the light image without renaming it.

Requires, only on a cache miss: Node, scripts/mermaid dependencies, Chrome,
Noto Sans CJK SC, and pngquant.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MERMAID_DIR = ROOT / "scripts" / "mermaid"
CONFIG_PATH = MERMAID_DIR / "mermaid.config.json"
CSS_PATH = MERMAID_DIR / "diagram.css"
PUPPETEER_PATH = MERMAID_DIR / "puppeteer.json"
PIN_PATH = MERMAID_DIR / "render.json"
INDEX_PATH = MERMAID_DIR / "index.json"
DIAGRAM_DIR = ROOT / "miniprogram" / "pages" / "reader" / "diagrams"
MMDC = MERMAID_DIR / "node_modules" / ".bin" / "mmdc"
MERMAID_PKG = MERMAID_DIR / "node_modules" / "mermaid" / "package.json"

BANNER = "图表未生成 · 显示源码"
SRC_PREFIX = "/pages/reader/diagrams"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.S)
ACC_TITLE_RE = re.compile(r"(?m)^accTitle\s*:\s*(.+?)\s*$")
CLASSDEF_RE_TMPL = r"(?m)^\s*classDef\s+{name}\b"

_WARNINGS: list[str] = []


def warnings() -> list[str]:
    return list(_WARNINGS)


def clear_warnings() -> None:
    _WARNINGS.clear()


def warn(message: str) -> None:
    _WARNINGS.append(message)
    print(f"WARNING: {message}", flush=True)
    # GitHub Actions turns this into a check annotation. The unit test uses doc id "unit".
    if "(unit)" not in message:
        print(f"::warning::{message}", flush=True)


def load_pin() -> dict:
    return json.loads(PIN_PATH.read_text(encoding="utf-8"))


def fingerprint() -> bytes:
    return b"\n".join(
        (
            PIN_PATH.read_bytes().strip(),
            CONFIG_PATH.read_bytes().strip(),
            CSS_PATH.read_bytes().strip(),
        )
    )


def diagram_hash(source: str) -> str:
    digest = hashlib.sha256()
    digest.update(source.encode("utf-8"))
    digest.update(b"\0")
    digest.update(fingerprint())
    return digest.hexdigest()


def diagram_kind(source: str) -> str:
    text = FRONTMATTER_RE.sub("", source, count=1)
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(("%%", "accTitle", "accDescr")):
            continue
        return stripped.split()[0]
    return ""


def prepare_source(source: str) -> str:
    """Inject default hot/mark classDefs. Author definitions stay in place and win."""
    pin = load_pin()
    if diagram_kind(source) not in set(pin.get("classDefKinds") or []):
        return source
    extra: list[str] = []
    for name, style in (pin.get("classDefs") or {}).items():
        if re.search(CLASSDEF_RE_TMPL.format(name=re.escape(name)), source):
            continue
        extra.append(f"classDef {name} {style}")
    if not extra:
        return source
    lines = source.split("\n")
    index = 0
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                index = i + 1
                break
    while index < len(lines):
        stripped = lines[index].strip()
        if not stripped or stripped.startswith(("%%", "accTitle", "accDescr")):
            index += 1
            continue
        index += 1
        break
    lines[index:index] = extra
    return "\n".join(lines)


def diagram_title(source: str) -> str:
    match = FRONTMATTER_RE.match(source)
    if match:
        for line in match.group(1).splitlines():
            if line.strip().lower().startswith("title:"):
                return line.split(":", 1)[1].strip().strip("\"'")
    match = ACC_TITLE_RE.search(source)
    if match:
        return match.group(1).strip().strip("\"'")
    return ""


def first_node_text(source: str) -> str:
    skip = (
        "subgraph ",
        "direction ",
        "classDef ",
        "class ",
        "style ",
        "linkStyle ",
        "click ",
    )
    for line in source.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(("%%", "accTitle", "accDescr", "---")):
            continue
        if stripped.startswith(skip):
            continue
        kind = stripped.split()[0]
        if kind in {"flowchart", "graph", "sequenceDiagram", "stateDiagram", "stateDiagram-v2"}:
            continue
        match = re.search(r"\[([^\]\n]+)\]", stripped)
        if match:
            return match.group(1).strip().strip("\"'")
        match = re.search(r"\(([^)\n]+)\)", stripped)
        if match:
            label = match.group(1).strip().strip("\"'")
            if label and not label.startswith("http"):
                return label
    return "图"


def diagram_alt(source: str) -> str:
    return diagram_title(source) or first_node_text(source)


def _load_index(path: Path) -> dict:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    files = data.get("files") if isinstance(data, dict) else None
    return files if isinstance(files, dict) else {}


def _write_index(path: Path, files: dict) -> None:
    payload = {"files": {key: files[key] for key in sorted(files)}}
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if path.is_file() and path.read_text(encoding="utf-8") == text:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as handle:
        signature = handle.read(8)
        if signature != b"\x89PNG\r\n\x1a\n":
            raise RuntimeError(f"not a png: {path.name}")
        handle.read(4)
        if handle.read(4) != b"IHDR":
            raise RuntimeError(f"png missing IHDR: {path.name}")
        width = int.from_bytes(handle.read(4), "big")
        height = int.from_bytes(handle.read(4), "big")
    if width <= 0 or height <= 0:
        raise RuntimeError(f"png has empty dimensions: {path.name}")
    return width, height


def _parse_hex(color: str) -> tuple[int, int, int]:
    text = color.strip().lstrip("#")
    if len(text) != 6:
        raise RuntimeError(f"expected #rrggbb paper color, got {color}")
    return int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16)


def _error_text(text: str, limit: int = 800) -> str:
    """Keep the start of an mmdc error. Parse messages are not at the tail."""
    flat = " ".join(text.split())
    if len(flat) <= limit:
        return flat
    return flat[:limit] + "…"


def _snap_even(image, paper: tuple[int, int, int]):
    """Pad at most one paper pixel so physical size is exactly 2× the logical size."""
    from PIL import Image

    width, height = image.size
    even_w = width + (width % 2)
    even_h = height + (height % 2)
    if (even_w, even_h) == (width, height):
        return image
    canvas = Image.new("RGB", (even_w, even_h), paper)
    canvas.paste(image, (0, 0))
    return canvas


def _fit_width(
    path: Path,
    max_width: int,
    scale: int,
    pad_px: int,
    paper: tuple[int, int, int],
) -> tuple[int, int, int, int]:
    """Opaque paper PNG. Returned logical CSS px and physical px satisfy pw == scale * w."""
    from PIL import Image

    if scale != 2:
        raise RuntimeError(f"diagram scale must be 2, got {scale}")
    with Image.open(path) as image:
        rgba = image.convert("RGBA")
        sheet = Image.new("RGBA", rgba.size, (*paper, 255))
        sheet.alpha_composite(rgba)
        pad = max(0, pad_px) * scale
        canvas = Image.new("RGB", (sheet.width + pad * 2, sheet.height + pad * 2), paper)
        canvas.paste(sheet.convert("RGB"), (pad, pad))
        pixel_w, pixel_h = canvas.size
        if pixel_w > max_width:
            pixel_h = max(1, round(pixel_h * (max_width / pixel_w)))
            pixel_w = max_width
            canvas = canvas.resize((pixel_w, pixel_h), Image.Resampling.LANCZOS)
        canvas = _snap_even(canvas, paper)
        pixel_w, pixel_h = canvas.size
        canvas.save(path, "PNG")
    logical_w = pixel_w // scale
    logical_h = pixel_h // scale
    if pixel_w != scale * logical_w or pixel_h != scale * logical_h:
        raise RuntimeError(f"bitmap {pixel_w}x{pixel_h} is not {scale}× logical size")
    return logical_w, logical_h, pixel_w, pixel_h


def _pngquant(path: Path, args: list[str]) -> None:
    if shutil.which("pngquant") is None:
        warn("pngquant is not installed; keeping uncompressed png")
        return
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / "out.png"
        command = ["pngquant", *args, "--force", "--skip-if-larger", "--output", str(dest), str(path)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode == 0 and dest.is_file() and dest.stat().st_size > 0:
            shutil.move(str(dest), path)
        elif result.returncode not in {0, 98, 99}:
            # 98/99: quality floor not met or output was larger. Keep the original.
            detail = (result.stderr or result.stdout or "").strip()
            warn(f"pngquant skipped {path.name}: {detail or result.returncode}")


def find_chrome() -> str | None:
    env = os.environ.get("PUPPETEER_EXECUTABLE_PATH") or os.environ.get("CHROME_PATH")
    candidates = [
        env,
        "/usr/local/bin/google-chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    return None


def _installed_mermaid_version() -> str | None:
    if not MERMAID_PKG.is_file():
        return None
    return str(json.loads(MERMAID_PKG.read_text(encoding="utf-8")).get("version") or "")


def _check_toolchain() -> None:
    pin = load_pin()
    if not MMDC.is_file():
        raise RuntimeError("mmdc is not installed (scripts/mermaid: npm ci)")
    installed = _installed_mermaid_version()
    expected = str(pin["mermaid"])
    if installed != expected:
        raise RuntimeError(f"mermaid version {installed or 'missing'} != pin {expected}")
    if find_chrome() is None:
        raise RuntimeError("Chrome/Chromium not found for mmdc")
    if shutil.which("fc-list"):
        listed = subprocess.run(
            ["fc-list", "Noto Sans CJK SC"],
            capture_output=True,
            text=True,
        )
        if "Noto Sans CJK SC" not in (listed.stdout or ""):
            warn("Noto Sans CJK SC is not installed; diagram Chinese may render as boxes")


def _puppeteer_config() -> Path:
    chrome = find_chrome()
    base = json.loads(PUPPETEER_PATH.read_text(encoding="utf-8"))
    if chrome:
        base["executablePath"] = chrome
    handle = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    json.dump(base, handle)
    handle.close()
    return Path(handle.name)


def render_png(source: str, dest: Path) -> None:
    """Render one diagram with mmdc. ``source`` may already include injected classDefs."""
    _check_toolchain()
    pin = load_pin()
    dest.parent.mkdir(parents=True, exist_ok=True)
    puppeteer = _puppeteer_config()
    try:
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "diagram.mmd"
            out = Path(tmp) / "diagram.png"
            src.write_text(source, encoding="utf-8")
            command = [
                str(MMDC),
                "-i",
                str(src),
                "-o",
                str(out),
                "-b",
                str(pin.get("background") or "#f4efe4"),
                "-c",
                str(CONFIG_PATH),
                "-C",
                str(CSS_PATH),
                "-s",
                str(pin["scale"]),
                "-p",
                str(puppeteer),
                "-q",
            ]
            result = subprocess.run(command, capture_output=True, text=True, timeout=120)
            if result.returncode != 0 or not out.is_file():
                detail = _error_text(result.stderr or result.stdout or "mmdc failed")
                raise RuntimeError(detail or "mmdc failed")
            logical_w, logical_h, _pw, _ph = _fit_width(
                out,
                int(pin["maxWidth"]),
                int(pin["scale"]),
                int(pin.get("padPx") or 0),
                _parse_hex(str(pin.get("background") or "#f4efe4")),
            )
            _pngquant(out, list(pin.get("pngquant") or []))
            shutil.move(str(out), dest)
            if logical_w <= 0 or logical_h <= 0:
                raise RuntimeError("rendered diagram has no size")
            pixel_w, pixel_h = _png_size(dest)
            if pixel_w != int(pin["scale"]) * logical_w or pixel_h != int(pin["scale"]) * logical_h:
                raise RuntimeError(
                    f"final bitmap {pixel_w}x{pixel_h} != {pin['scale']}× {logical_w}x{logical_h}"
                )
            dest.with_suffix(".size").write_text(
                json.dumps(
                    {"w": logical_w, "h": logical_h, "pw": pixel_w, "ph": pixel_h},
                    separators=(",", ":"),
                ),
                encoding="utf-8",
            )
    finally:
        puppeteer.unlink(missing_ok=True)


def _read_size_sidecar(png: Path) -> tuple[int, int, int, int] | None:
    sidecar = png.with_suffix(".size")
    if not sidecar.is_file():
        return None
    data = json.loads(sidecar.read_text(encoding="utf-8"))
    return int(data["w"]), int(data["h"]), int(data["pw"]), int(data["ph"])


def _sizes_match(logical_w: int, logical_h: int, pixel_w: int, pixel_h: int) -> bool:
    return (
        logical_w > 0
        and logical_h > 0
        and pixel_w == 2 * logical_w
        and pixel_h == 2 * logical_h
    )


def _success_node(
    source: str,
    digest: str,
    logical_w: int,
    logical_h: int,
    pixel_w: int,
    pixel_h: int,
) -> dict:
    node = {
        "t": "diagram",
        "src": f"{SRC_PREFIX}/{digest}.png",
        "w": logical_w,
        "h": logical_h,
        "pw": pixel_w,
        "ph": pixel_h,
        "alt": diagram_alt(source),
        "source": source,
    }
    title = diagram_title(source)
    if title:
        node["title"] = title
    return node


def _failure_node(source: str) -> dict:
    return {
        "t": "code",
        "lang": "mermaid",
        "code": source,
        "banner": BANNER,
    }


def materialize(
    source: str,
    *,
    doc_id: str,
    out_dir: Path | None = None,
    index: dict | None = None,
    runner=None,
) -> dict:
    """Return a diagram node, or a code block when rendering fails."""
    out_dir = out_dir or DIAGRAM_DIR
    index = index if index is not None else _load_index(INDEX_PATH)
    digest = diagram_hash(source)
    png = out_dir / f"{digest}.png"
    cached = index.get(digest)
    if png.is_file() and isinstance(cached, dict):
        try:
            logical_w, logical_h = int(cached["w"]), int(cached["h"])
            pixel_w, pixel_h = int(cached["pw"]), int(cached["ph"])
        except (KeyError, TypeError, ValueError):
            logical_w = logical_h = pixel_w = pixel_h = 0
        if _sizes_match(logical_w, logical_h, pixel_w, pixel_h) and _png_size(png) == (
            pixel_w,
            pixel_h,
        ):
            return _success_node(source, digest, logical_w, logical_h, pixel_w, pixel_h)
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        run = runner or render_png
        run(prepare_source(source), png)
        sized = _read_size_sidecar(png)
        if sized is None:
            raise RuntimeError("renderer did not record logical size")
        logical_w, logical_h, pixel_w, pixel_h = sized
        file_w, file_h = _png_size(png)
        png.with_suffix(".size").unlink(missing_ok=True)
        if (file_w, file_h) != (pixel_w, pixel_h) or not _sizes_match(
            logical_w, logical_h, pixel_w, pixel_h
        ):
            raise RuntimeError(f"size metadata {sized} does not match bitmap {file_w}x{file_h}")
        index[digest] = {"w": logical_w, "h": logical_h, "pw": pixel_w, "ph": pixel_h}
        return _success_node(source, digest, logical_w, logical_h, pixel_w, pixel_h)
    except Exception as exc:  # noqa: BLE001 — one bad diagram must not fail the build
        png.with_suffix(".size").unlink(missing_ok=True)
        if png.is_file() and digest not in index:
            png.unlink(missing_ok=True)
        detail = _error_text(str(exc), 500)
        warn(f"mermaid render failed ({doc_id}): {detail}")
        return _failure_node(source)


def _walk_mermaid(blocks: list[dict], doc_id: str, found: list[tuple[list, int, str, str]]) -> None:
    for index, block in enumerate(blocks):
        if block.get("t") == "code" and block.get("lang") == "mermaid":
            found.append((blocks, index, block.get("code") or "", doc_id))
            continue
        child = block.get("blocks")
        if isinstance(child, list):
            _walk_mermaid(child, doc_id, found)
        if block.get("t") in {"ul", "ol"}:
            for item in block.get("items") or []:
                nested = item.get("blocks")
                if isinstance(nested, list):
                    _walk_mermaid(nested, doc_id, found)


def attach_diagrams(
    docs: dict[str, dict],
    *,
    out_dir: Path | None = None,
    index_path: Path | None = None,
    runner=None,
) -> dict:
    """Replace mermaid code blocks in ``docs`` with diagram nodes or failure blocks."""
    out_dir = out_dir or DIAGRAM_DIR
    index_path = index_path or INDEX_PATH
    found: list[tuple[list, int, str, str]] = []
    for doc_id, doc in docs.items():
        _walk_mermaid(doc.get("blocks") or [], doc_id, found)
    index = _load_index(index_path)
    rendered: dict[str, dict] = {}
    for _blocks, _index, source, doc_id in found:
        if source in rendered:
            continue
        rendered[source] = materialize(
            source,
            doc_id=doc_id,
            out_dir=out_dir,
            index=index,
            runner=runner,
        )
    for blocks, index_in_block, source, _doc_id in found:
        blocks[index_in_block] = json.loads(json.dumps(rendered[source], ensure_ascii=False))
    used = {diagram_hash(source) for source in rendered}
    if out_dir.is_dir():
        for png in out_dir.glob("*.png"):
            if png.stem not in used and not png.name.endswith(".dark.png"):
                png.unlink()
        for sidecar in out_dir.glob("*.size"):
            sidecar.unlink()
    kept = {key: value for key, value in index.items() if key in used}
    _write_index(index_path, kept)
    total = 0
    count = 0
    failures = 0
    for node in rendered.values():
        if node.get("t") != "diagram":
            failures += 1
            continue
        count += 1
        png = out_dir / Path(node["src"]).name
        if png.is_file():
            total += png.stat().st_size
    return {"count": count, "bytes": total, "failures": failures, "unique": len(rendered)}
