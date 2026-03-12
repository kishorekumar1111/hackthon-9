# Ephemeral Care Room

Privacy-first digital clinic: discover doctors, book by date/slot, video consultation, temporary file upload. No medical data stored permanently.

## Tech stack

- **Frontend:** React (Vite), Tailwind CSS
- **Backend:** FastAPI, JWT, SQLite (async)
- **Video:** Placeholder (ready for Daily/LiveKit)

## Run locally

### 1. Backend

From project root:

```bash
npm run backend
```

Or manually:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Google Authentication (optional)

To enable Google Sign-In:

- **Frontend**: set `VITE_GOOGLE_CLIENT_ID` in your environment (or a `.env` file in the project root).
- **Backend**: set `GOOGLE_CLIENT_ID` in `backend/.env`.

Example:

**Project root** `.env`:

```
VITE_GOOGLE_CLIENT_ID=523204758799-u9lov5rhr9mlp83j6dpsgi8mkpm9vqqj.apps.googleusercontent.com
```

**backend** `.env`:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_OAUTH_CLIENT_ID
SECRET_KEY=change-this-in-production
```

Notes:
- The backend verifies the Google ID token and returns an **app JWT**.
- First-time Google users will be asked to choose **Patient** or **Doctor**.

### 2. Frontend

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the backend.

### Demo login

With the backend running, use the **Login as demo patient** or **Login as demo doctor** buttons on the login page. They create demo accounts on first use:

- **Patient:** patient@test.com / demo123  
- **Doctor:** doctor@test.com / demo123

## Features

- **Patient:** Register/login → Find doctors (search, specialty) → Book by date & time slot → Dashboard (upcoming, start consultation, cancel) → Care room (video placeholder, upload PDF/JPG/PNG, end session)
- **Doctor:** Register/login → Dashboard (today’s appointments) → Join care room when patient has started → View-only file list
- **Session:** Patient starts → Session active → Doctor can join → Files visible only in session → Patient ends → Files deleted

## Environment

- Backend: optional `.env` in `backend/` with `SECRET_KEY`, `DATABASE_URL`
- Frontend: no env required (API via proxy)
