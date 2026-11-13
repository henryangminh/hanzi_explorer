"""
Import HSK vocabulary from complete-hsk-vocabulary/complete.json
into hanzi_explorer database.

Creates:
  - drkameleon_characters   : one row per simplified word
  - drkameleon_forms        : one row per pronunciation variant (forms[])

Also creates Global notebooks for every HSK scheme/level combination,
named according to the system language (vi / en).

Usage (from backend/ directory):
    python scripts/import_drkameleon.py [path/to/complete.json]

Default path: ../../complete-hsk-vocabulary/complete.json  (relative to backend/)
"""
import json
import locale
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from app.core.database import engine, init_db

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).parent.parent
DEFAULT_JSON = BACKEND_DIR.parent.parent / "complete-hsk-vocabulary" / "complete.json"

# ---------------------------------------------------------------------------
# Language detection
# ---------------------------------------------------------------------------

def detect_lang() -> str:
    """Return 'vi' if the system locale is Vietnamese, else 'en'."""
    # 1. explicit override
    override = os.environ.get("DRKAMELEON_LANG", "").lower()
    if override in ("vi", "en"):
        return override
    # 2. LANG env var
    lang_env = os.environ.get("LANG", "")
    if lang_env.lower().startswith("vi"):
        return "vi"
    # 3. Python locale
    try:
        loc = locale.getdefaultlocale()[0] or ""
        if loc.lower().startswith("vi"):
            return "vi"
    except Exception:
        pass
    return "en"


def notebook_name(scheme: str, level: int, lang: str) -> str:
    # Level 7 of HSK 3.0 covers the combined 7-9 band
    level_label = "7-9" if (scheme in ("new", "newest") and level == 7) else str(level)
    if scheme == "old":
        return f"HSK{level_label} 2.0"
    if scheme == "new":
        return f"HSK{level_label} 3.0"
    if scheme == "newest":
        if lang == "vi":
            return f"HSK{level_label} 3.0 mới nhất"
        return f"HSK{level_label} 3.0 newest"
    raise ValueError(f"Unknown scheme: {scheme!r}")


# ---------------------------------------------------------------------------
# DDL
# ---------------------------------------------------------------------------

DDL = """
CREATE TABLE IF NOT EXISTS drkameleon_characters (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    simplified  TEXT    NOT NULL UNIQUE,
    radical     TEXT,
    frequency   INTEGER,
    pos         TEXT    NOT NULL DEFAULT '[]',
    levels      TEXT    NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_dkc_simplified ON drkameleon_characters(simplified);

CREATE TABLE IF NOT EXISTS drkameleon_forms (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id    INTEGER NOT NULL
                        REFERENCES drkameleon_characters(id) ON DELETE CASCADE,
    traditional     TEXT,
    pinyin          TEXT,
    pinyin_numeric  TEXT,
    wadegiles       TEXT,
    bopomofo        TEXT,
    romatzyh        TEXT,
    meanings        TEXT    NOT NULL DEFAULT '[]',
    classifiers     TEXT    NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_dkf_char_id ON drkameleon_forms(character_id);
"""

# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _jdump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)


def run(json_path: Path):
    lang = detect_lang()
    print(f"[info] system language: {lang}")

    if not json_path.exists():
        print(f"[error] File not found: {json_path}")
        sys.exit(1)

    print(f"[info] loading {json_path} ...")
    with open(json_path, encoding="utf-8") as f:
        data: list[dict] = json.load(f)
    print(f"[info] {len(data):,} entries loaded")

    init_db()

    with engine.connect() as conn:
        # ── Create tables ────────────────────────────────────────────────
        for stmt in DDL.strip().split(";"):
            stmt = stmt.strip()
            if stmt:
                conn.execute(text(stmt))
        conn.commit()
        print("[info] tables ready")

        # ── Clear existing drkameleon data ───────────────────────────────
        conn.execute(text("DELETE FROM drkameleon_forms"))
        conn.execute(text("DELETE FROM drkameleon_characters"))
        conn.commit()
        print("[info] cleared old drkameleon data")

        # ── Collect levels for notebook creation ─────────────────────────
        level_sets: dict[str, set[int]] = {"old": set(), "new": set(), "newest": set()}

        # ── Import characters ─────────────────────────────────────────────
        inserted_chars = 0
        inserted_forms = 0

        for entry in data:
            simplified = entry["simplified"]
            radical     = entry.get("radical")
            frequency   = entry.get("frequency")
            pos         = _jdump(entry.get("pos", []))
            levels_list = entry.get("level", [])
            levels_json = _jdump(levels_list)

            # Collect scheme/level numbers
            for lv in levels_list:
                if "-" in lv:
                    scheme, _, num = lv.rpartition("-")
                    if scheme in level_sets:
                        try:
                            level_sets[scheme].add(int(num))
                        except ValueError:
                            pass

            # Insert character (upsert)
            result = conn.execute(
                text("""
                    INSERT INTO drkameleon_characters
                        (simplified, radical, frequency, pos, levels)
                    VALUES
                        (:simplified, :radical, :frequency, :pos, :levels)
                    ON CONFLICT(simplified) DO UPDATE SET
                        radical   = excluded.radical,
                        frequency = excluded.frequency,
                        pos       = excluded.pos,
                        levels    = excluded.levels
                    RETURNING id
                """),
                dict(
                    simplified=simplified,
                    radical=radical,
                    frequency=frequency,
                    pos=pos,
                    levels=levels_json,
                ),
            )
            char_id = result.fetchone()[0]
            inserted_chars += 1

            # Insert forms
            for form in entry.get("forms", []):
                t = form.get("transcriptions", {})
                conn.execute(
                    text("""
                        INSERT INTO drkameleon_forms
                            (character_id, traditional, pinyin, pinyin_numeric,
                             wadegiles, bopomofo, romatzyh, meanings, classifiers)
                        VALUES
                            (:cid, :trad, :py, :pyn, :wg, :bpmf, :rtz, :mn, :cl)
                    """),
                    dict(
                        cid=char_id,
                        trad=form.get("traditional"),
                        py=t.get("pinyin"),
                        pyn=t.get("numeric"),
                        wg=t.get("wadegiles"),
                        bpmf=t.get("bopomofo"),
                        rtz=t.get("romatzyh"),
                        mn=_jdump(form.get("meanings", [])),
                        cl=_jdump(form.get("classifiers", [])),
                    ),
                )
                inserted_forms += 1

            if inserted_chars % 1000 == 0:
                conn.commit()
                print(f"  [{inserted_chars:,} chars / {inserted_forms:,} forms]")

        conn.commit()
        print(f"[info] imported {inserted_chars:,} characters, {inserted_forms:,} forms")

        # ── Resolve admin user id ─────────────────────────────────────────
        admin_row = conn.execute(
            text("SELECT id FROM users WHERE is_admin = 1 LIMIT 1")
        ).fetchone()
        admin_id = admin_row[0] if admin_row else None
        if admin_id is None:
            print("[warn] no admin user found — notebooks will have owner_id = NULL")

        # ── Create HSK notebooks ──────────────────────────────────────────
        now = datetime.now(timezone.utc).isoformat()
        notebooks_created = 0
        entries_added = 0

        for scheme in ("old", "new", "newest"):
            for level in sorted(level_sets[scheme]):
                name = notebook_name(scheme, level, lang)
                level_tag = f"{scheme}-{level}"

                # Get or create notebook
                existing = conn.execute(
                    text("SELECT id FROM notebooks WHERE name = :n"),
                    {"n": name},
                ).fetchone()

                if existing:
                    nb_id = existing[0]
                else:
                    res = conn.execute(
                        text("""
                            INSERT INTO notebooks (name, description, type, owner_id, created_at, updated_at)
                            VALUES (:name, :desc, 'global', :owner, :now, :now)
                            RETURNING id
                        """),
                        dict(
                            name=name,
                            desc=f"{'HSK 2.0' if scheme == 'old' else 'HSK 3.0 newest' if scheme == 'newest' else 'HSK 3.0'} — Level {'7-9' if level == 7 and scheme != 'old' else level}",
                            owner=admin_id,
                            now=now,
                        ),
                    )
                    nb_id = res.fetchone()[0]
                    notebooks_created += 1
                    print(f"  [notebook] created: {name}")

                # Populate notebook entries — match level_tag inside JSON levels array
                chars = conn.execute(
                    text("""
                        SELECT simplified FROM drkameleon_characters
                        WHERE levels LIKE :pat
                    """),
                    {"pat": f'%"{level_tag}"%'},
                ).fetchall()

                for (simplified,) in chars:
                    conn.execute(
                        text("""
                            INSERT OR IGNORE INTO notebook_entries (notebook_id, char, added_at)
                            VALUES (:nb, :ch, :now)
                        """),
                        {"nb": nb_id, "ch": simplified, "now": now},
                    )
                    entries_added += 1

                conn.commit()

        print(f"[info] notebooks: {notebooks_created} created, {entries_added:,} entries added")

    print("\n[done]")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_JSON
    run(path)
