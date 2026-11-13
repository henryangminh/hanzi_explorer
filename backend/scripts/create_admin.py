"""
Create an admin account (also creates app.db on a fresh install).

Usage:
    python scripts/create_admin.py
"""

import sys
from getpass import getpass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session

from app.core.database import engine, init_db
from app.schemas.user import AdminUserCreate
from app.services.admin_service import create_user


def run():
    init_db()

    username = input("Username: ").strip()
    display_name = input("Display name: ").strip()
    password = getpass("Password: ").strip()

    with Session(engine) as session:
        try:
            user = create_user(session, AdminUserCreate(
                username=username, display_name=display_name, password=password, is_admin=True,
            ))
        except ValueError as exc:
            sys.exit(f"[ERROR] {exc}")
        print(f"\nAdmin created: {user.username} (id={user.id})")


if __name__ == "__main__":
    run()
