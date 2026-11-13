"""
Final step: refresh query-planner statistics, compact the file and verify integrity.

Usage:
    python migration/dictionary/11_optimize.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import DICTIONARY_DB, connect_dictionary  # noqa: E402


def main():
    conn = connect_dictionary()
    conn.execute("ANALYZE")
    conn.execute("VACUUM")
    result = conn.execute("PRAGMA integrity_check").fetchone()[0]
    conn.close()
    if result != "ok":
        raise SystemExit(f"[ERROR] integrity_check failed: {result}")
    print(f"Optimized {DICTIONARY_DB} ({DICTIONARY_DB.stat().st_size / 1e6:.1f} MB), integrity ok.")


if __name__ == "__main__":
    main()
