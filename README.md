# UMBC Advisor Packet Generator — Starter

A minimal starter package for a web-based tool that helps UMBC advisors generate consistent pre‑transfer advising packets.

## Tech

- **Frontend (vanilla-first):** HTML, CSS, JavaScript (upgrade path to React + Tailwind documented below)
- **Backend:** Flask + SQLAlchemy (SQLite by default)
- **Doc Engine:** `python-docx` for Word; LaTeX export scaffold for high-quality PDFs
- **Email:** simple SMTP stub (replace with real creds / provider later)

## Quick Start

### 1) Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env  # then edit values
python scripts/seed.py    # creates an admin user (admin@umbc.edu / Passw0rd! — change it)
flask --app app run --debug
```

The API will run at http://127.0.0.1:5000

### 2) Frontend
Open `frontend/public/index.html` in your browser, or use a static server:
```bash
cd frontend
python -m http.server 5173
# visit http://127.0.0.1:5173
```

## Default Roles
- **admin**: manage templates & sections
- **advisor**: create student requests and packets

## GitHub Flow for 3‑person team

1. Protect `main` (require PR reviews, status checks).
2. Branch per task: `feature/auth-ui`, `chore/ci`, `fix/login-bug`.
3. PR template + CODEOWNERS (e.g., 2 reviewers: 1 FE, 1 BE).
4. Use Issues & Labels: `fe`, `be`, `docs`, `good-first`, `blocked`.
5. Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`.
6. Run `pytest` & lint in CI (GitHub Actions example included).

## Upgrade to React + Tailwind (optional)

```
cd frontend-react
npm i
npm run dev
```
Then port API calls from `frontend/js/app.js` into React services/hooks.

## Env

See `.env.example` for configuration keys.

---

**Security note:** This starter is for local dev. Before production: add CSRF, proper auth (JWT or sessions with secure cookies), input validation, rate limiting, and secure email/PDF infrastructure.
