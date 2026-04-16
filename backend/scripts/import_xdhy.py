"""
Import 现代汉语词典第7版 (XDHY7) from MDX file into SQLite.

Data source: 现汉7.mdx (MDict text format — the .mdd companion file holds binary resources)
Each MDX key is the headword (simplified).  One key may contain multiple <entry> blocks
for polyphonic characters (e.g. 好 → hǎo entry + hào entry).

Storage layout:
  • characters        — upsert simplified/traditional
  • pinyin_readings   — insert diacritic pinyin if not yet present (pinyin_numeric=NULL)
  • definitions       — one row per entry-block (one per reading of a character)
                        language='zh'
                        pos=NULL  (per-definition pos lives inside the JSON)
                        meaning_text = JSON: {"pinyin":"hǎo","defs":[{"pos":"形","def":"...","ex":["..."]},...]}

Usage:
    python scripts/import_xdhy.py

Place 现汉7.mdx in backend/data/ first (copy from 现代汉语词典7/历史版本/20220522/).
The script is idempotent — re-running deletes old definitions and re-imports.
"""

import json
import re
import sys
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select, delete, SQLModel
from app.core.database import engine
from app.models.character import Character, PinyinReading, Definition, DictionarySource

DATA_FILE = Path(__file__).parent.parent / "data" / "现汉7.mdx"
SOURCE_NAME = "现代汉语词典"
BATCH_SIZE = 500

# ── HTML helpers ──────────────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_TRAD_RE = re.compile(r"（([^）\s]{1,6})）")

# patterns for structure
_ENTRY_RE = re.compile(r"<entry[^>]*>(.*?)</entry>", re.DOTALL)
_HWG_RE = re.compile(r"<hwg>(.*?)</hwg>", re.DOTALL)
_HW_RE = re.compile(r"<hw>(.*?)</hw>", re.DOTALL)
_PINYIN_RE = re.compile(r"<pinyin>(.*?)</pinyin>", re.DOTALL)
_DEF_RE = re.compile(r"<def>(.*?)</def>", re.DOTALL)
_PS_RE = re.compile(r"<ps>(.*?)</ps>")
_EX_RE = re.compile(r"<ex>(.*?)</ex>", re.DOTALL)
_NUM_RE = re.compile(r"<num>.*?</num>", re.DOTALL)


def _strip(html: str) -> str:
    """Remove all HTML tags and unescape entities."""
    return unescape(_TAG_RE.sub("", html)).strip()


_SUB_LABEL_RE = re.compile(r"^[a-z]）")


def _parse_defs(entry_html: str) -> list[dict]:
    """Return list of {pos, def, ex, is_sub} dicts from all <def> blocks.

    Some entries have a "parent" block that carries only a <num>+<ps> with empty
    text, followed by lettered sub-items (a）b）c）...) as separate <def> blocks.
    We propagate the parent's pos to those sub-items and mark them is_sub=True.
    """
    result = []
    pending_pos: str | None = None  # pos from an empty "header" block

    for m in _DEF_RE.finditer(entry_html):
        block = m.group(1)

        # Skip cross-reference lines like "另见hào"
        text_only = _strip(block)
        if text_only.startswith("另见") and not _NUM_RE.search(block):
            continue

        ps_m = _PS_RE.search(block)
        pos = _strip(ps_m.group(1)) if ps_m else None

        ex_m = _EX_RE.search(block)
        ex_raw = _strip(ex_m.group(1)) if ex_m else ""
        examples = [e.strip() for e in ex_raw.split("｜") if e.strip()] if ex_raw else []

        # Remove sub-tags to isolate definition text
        def_text = block
        def_text = re.sub(r"<num>.*?</num>", "", def_text, flags=re.DOTALL)
        def_text = re.sub(r"<ps>.*?</ps>", "", def_text, flags=re.DOTALL)
        def_text = re.sub(r"<ex>.*?</ex>", "", def_text, flags=re.DOTALL)
        def_text = _strip(def_text).strip("：").strip()

        if not def_text:
            # Empty body + has pos → this is a "header" block for upcoming sub-items
            if pos:
                pending_pos = pos
            continue

        is_sub = bool(_SUB_LABEL_RE.match(def_text))
        if is_sub:
            # Inherit parent pos; don't reset pending_pos yet (more sub-items may follow)
            result.append({"pos": pending_pos, "def": def_text, "ex": examples, "is_sub": True})
        else:
            pending_pos = None  # New numbered entry resets any pending parent
            result.append({"pos": pos, "def": def_text, "ex": examples, "is_sub": False})

    return result


def parse_mdx_value(key_str: str, html: str) -> list[dict]:
    """
    Parse one MDX HTML value.  Returns list of entry dicts:
        {simplified, traditional, pinyin, defs: [{pos, def, ex}]}
    """
    entries = _ENTRY_RE.findall(html)
    if not entries:
        return []

    results = []
    for entry_html in entries:
        simplified = key_str
        traditional: str | None = None
        pinyin = ""

        # ── Headword / pinyin extraction ─────────────────────────────
        hwg_m = _HWG_RE.search(entry_html)
        if hwg_m:
            hwg = hwg_m.group(1)
            hw_m = _HW_RE.search(hwg)
            if hw_m:
                hw_text = _strip(hw_m.group(1))
                trad_m = _TRAD_RE.search(hw_text)
                if trad_m:
                    traditional = trad_m.group(1)
            py_m = _PINYIN_RE.search(hwg)
            pinyin = py_m.group(1).strip() if py_m else ""
        else:
            # Pinyin embedded inside <hw>: <hw>好<pinyin>hǎo</pinyin></hw>
            hw_m = _HW_RE.search(entry_html)
            if hw_m:
                hw_inner = hw_m.group(1)
                trad_m = _TRAD_RE.search(_strip(hw_inner))
                if trad_m:
                    traditional = trad_m.group(1)
                py_m = _PINYIN_RE.search(hw_inner)
                pinyin = py_m.group(1).strip() if py_m else ""

        if not pinyin:
            continue

        defs = _parse_defs(entry_html)
        if not defs:
            continue

        results.append(
            {
                "simplified": simplified,
                "traditional": traditional,
                "pinyin": pinyin,
                "defs": defs,
            }
        )

    return results


# ── Main import ───────────────────────────────────────────────────────────────

def main() -> None:
    if not DATA_FILE.exists():
        print(f"[ERROR] 未找到文件: {DATA_FILE}")
        print("请将 现汉7.mdx 复制到 backend/data/ 目录")
        sys.exit(1)

    try:
        from mdict_utils.reader import MDX
    except ImportError:
        print("[ERROR] 缺少依赖: pip install mdict-utils")
        sys.exit(1)

    print(f"[INFO] 打开文件: {DATA_FILE}")
    mdx = MDX(str(DATA_FILE))
    total_keys = len(mdx)
    print(f"[INFO] 共 {total_keys:,} 个词条")

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # ── Upsert DictionarySource ──────────────────────────────────
        source = session.exec(
            select(DictionarySource).where(DictionarySource.name == SOURCE_NAME)
        ).first()
        if source:
            print(f"[INFO] Source '{SOURCE_NAME}' 已存在 (id={source.id})，删除旧 definitions...")
            session.exec(delete(Definition).where(Definition.source_id == source.id))
            session.commit()
        else:
            source = DictionarySource(name=SOURCE_NAME)
            session.add(source)
            session.commit()
            session.refresh(source)
            print(f"[INFO] 创建 source '{SOURCE_NAME}' (id={source.id})")

        total_entries = 0
        total_skipped = 0
        batch_count = 0

        for key_bytes, val_bytes in mdx.items():
            key_str = key_bytes.decode("utf-8", errors="replace").strip()

            # Skip special reference entries (prefixed with '0')
            if key_str.startswith("0"):
                total_skipped += 1
                continue

            html = val_bytes.decode("utf-8", errors="replace")
            parsed = parse_mdx_value(key_str, html)
            if not parsed:
                total_skipped += 1
                continue

            for entry in parsed:
                simplified = entry["simplified"]
                traditional = entry["traditional"]
                pinyin = entry["pinyin"]
                defs = entry["defs"]

                # ── Upsert character ─────────────────────────────────
                char_row = session.exec(
                    select(Character).where(Character.simplified == simplified)
                ).first()
                if not char_row:
                    char_row = Character(simplified=simplified, traditional=traditional)
                    session.add(char_row)
                    session.flush()
                elif traditional and not char_row.traditional:
                    char_row.traditional = traditional
                    session.add(char_row)
                    session.flush()

                # ── Upsert pinyin reading (diacritic) ────────────────
                existing_py = session.exec(
                    select(PinyinReading)
                    .where(PinyinReading.character_id == char_row.id)
                    .where(PinyinReading.pinyin == pinyin)
                ).first()
                if not existing_py:
                    session.add(PinyinReading(
                        character_id=char_row.id,
                        pinyin=pinyin,
                        pinyin_numeric=None,
                    ))
                    session.flush()

                # ── Insert definition row (one per entry/reading) ────
                meaning_json = json.dumps(
                    {"pinyin": pinyin, "defs": defs},
                    ensure_ascii=False,
                )
                session.add(Definition(
                    character_id=char_row.id,
                    source_id=source.id,
                    language="zh",
                    meaning_text=meaning_json,
                    pos=None,
                ))
                total_entries += 1
                batch_count += 1

                if batch_count >= BATCH_SIZE:
                    session.commit()
                    batch_count = 0
                    print(f"  → {total_entries:,} entries imported...", end="\r")

        session.commit()

        source.entry_count = total_entries
        source.imported_at = datetime.now(timezone.utc).isoformat()
        session.add(source)
        session.commit()

    print(f"\n[DONE] 导入完成!")
    print(f"  ✓ {total_entries:,} 个 definition 行已导入")
    print(f"  ✗ {total_skipped:,} 个词条已跳过（特殊条目/无法解析）")


if __name__ == "__main__":
    main()
