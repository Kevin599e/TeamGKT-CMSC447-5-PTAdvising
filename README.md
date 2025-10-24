<<<<<<< HEAD
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
=======
# TeamGKT-CMSC447-5-PTAdvising
UMBC Pre Transferring Advising App, made by TeamGKT, in CMSC447-Section5
Overview
- The Advisor Packet Generator is a web-based tool designed for UMBC academic advisors to streamline the process of generating pre-transfer advising packets.
- Instead of manually copying and formatting information, the tool automates packet creation, section management, and PDF export — reducing time, ensuring consistency, and maintaining data security.

Objectives
- Reduce advisor workload by automating repetitive tasks (copying, formatting, assembling).
- Preserve existing workflows — no need to retrain staff or change the advising process.
- Ensure consistency across all packets.
- Improve turnaround time for student packet delivery.

Functional Requirements

User Management

- Login & Logout
- Users authenticate via email and password.
- Roles: admin or advisor.
- Role-Based Access
- Admin: manages templates and sections.
- Advisor: creates student requests and packets.

Student Request Management

- Advisors can create a new student request with:
- Student name
- Student email
- Source institution
- Target program
- Requests are saved and listed on the dashboard.

Template Management (Admin)

- Admins can:
  - Create new templates.
  - Add sections with title, order, and content.
  - Activate/deactivate templates.
  - Templates serve as blueprints for packet generation.

Packet Creation

  - Advisors select a student request and generate a packet from an existing template.
  - The system auto-populates the packet with template sections.
  - Advisors can edit content in draft mode.

Packet Editing & Finalization

  - Draft packets can be:
  - Edited (content changed or reordered).
  - Finalized (locked and ready for export).
  - Once finalized, the packet becomes read-only.

Packet Export
  - Advisors can export finalized packets as PDFs.
  - PDF includes:
  - Title, student name, program, and section content.

Files are stored and logged in the database for future retrieval.
>>>>>>> 6eccb8cfcb91e954cb227023eb58bf57abaab300
