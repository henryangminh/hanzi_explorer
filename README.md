# 漢 Hanzi Explorer

> A personal Mandarin Chinese study tool — dictionary aggregator, radical browser, and note-taking system.
>
> Công cụ học tiếng Trung cá nhân — tra từ điển, khám phá bộ thủ và ghi chú từ vựng.

---

## Features / Tính năng

- **Radical Browser** — Browse all 214 Kangxi radicals grouped by stroke count. Click any radical to see every character that contains it (powered by hanzipy), then click any character for its full dictionary entry.
- **Dictionary Lookup** — Type a Chinese phrase; the app segments it using Forward Maximum Matching, shows compound words first, then individual characters. Each entry aggregates CC-CEDICT and Wiktionary EN/VI.
- **Personal Notes** — Add Vietnamese meanings, free-form notes, and tags to any character. Notes are stored per-user and layered on top of dictionary data.
- **Light / Dark mode** and **Vietnamese / English UI**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLModel, SQLite |
| Auth | JWT (python-jose) + bcrypt |
| Dictionary data | CC-CEDICT (~124k entries), Wiktionary REST API |
| Decomposition | hanzipy |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| State | Zustand |
| i18n | i18next |
| Visualization | D3.js |

---

## Project Structure

```
hanzi-explorer/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI routers
│   │   ├── core/            # Config, DB, security, pinyin utils
│   │   ├── models/          # SQLModel table definitions
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   └── services/        # Business logic
│   ├── data/                # SQLite DB + CC-CEDICT raw file
│   ├── scripts/             # One-time import/seed scripts
│   ├── main.py
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/      # Shared UI (Button, Input, Card, Navbar)
        ├── features/        # auth, dictionary, radicals, settings
        ├── i18n/            # EN + VI translations
        ├── lib/             # axios instance, classname utility
        ├── router/          # React Router + ProtectedRoute
        ├── store/           # Zustand stores (auth, settings)
        ├── styles/          # Global CSS + brown theme tokens
        └── types/           # Shared TypeScript interfaces
```

---

## Getting Started / Cài đặt

### Prerequisites / Yêu cầu

- Python 3.11+
- Node.js 18+
- pip

### 1. Backend

```bash
cd backend

# Copy and configure environment
cp .env.example .env
# Edit .env — set a strong SECRET_KEY

# Install dependencies
pip install -r requirements.txt

# Create your user account
python scripts/create_admin.py

# Import CC-CEDICT dictionary data
# Download cedict_ts.u8 from https://www.mdbg.net/chinese/dictionary?page=cedict
# Place it in backend/data/cedict_ts.u8, then:
python scripts/import_cedict.py

# Import radicals from CSV (place radical.csv in backend/data/)
python scripts/import_radicals_csv.py

# Start the server
uvicorn main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` to `localhost:8000`.

---

## Data Sources / Nguồn dữ liệu

| Source | Usage | License |
|---|---|---|
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) | Chinese–English dictionary (~124k entries) | CC BY-SA 4.0 |
| [Wiktionary](https://en.wiktionary.org) | Additional definitions via REST API | CC BY-SA 3.0 |
| [hanzipy](https://github.com/mshenfield/hanzipy) | Character decomposition by radical | MIT |
| Kangxi radicals CSV | 214 radicals with Vietnamese names | Personal |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing key — **change in production** | *(required)* |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime | `10080` (7 days) |
| `DATABASE_URL` | SQLite path | `sqlite:///./data/hanzi.db` |
| `CORS_ORIGINS` | Allowed frontend origins | `["http://localhost:5173"]` |

---

## Scripts

| Script | Description |
|---|---|
| `scripts/create_admin.py` | Interactive prompt to create a user account |
| `scripts/import_cedict.py` | Import CC-CEDICT into SQLite (run once, ~2 min) |
| `scripts/import_radicals_csv.py` | Import 214 Kangxi radicals from `data/radical.csv` |

All scripts must be run from the `backend/` directory.

---

## Roadmap / Kế hoạch

- [ ] Flashcard / spaced repetition
- [ ] HSK vocabulary lists
- [ ] Stroke order animation
- [ ] Export notes to Anki
- [ ] Docker Compose deployment with Nginx

---

## License

Personal project — no license. Dictionary data retains its own licenses as listed above.
