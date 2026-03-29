"""
Create the first user (admin / yourself).

Usage:
    python scripts/create_admin.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import engine, init_db
from app.services.user_service import create_user, get_by_username
from sqlmodel import Session


def run():
    init_db()

    username = input("Username: ").strip()
    display_name = input("Display name: ").strip()
    password = input("Password: ").strip()

    with Session(engine) as session:
        if get_by_username(session, username):
            print(f"[ERROR] User '{username}' already exists.")
            sys.exit(1)

        user = create_user(session, username, password, display_name)
        print(f"\nUser created: {user.username} (id={user.id})")


if __name__ == "__main__":
    run()
