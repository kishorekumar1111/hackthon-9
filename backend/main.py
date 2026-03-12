from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import models  # noqa: F401 - register tables with Base
from database import init_db
from routers import auth, doctors, appointments, sessions, files


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Ephemeral Care Room API",
    description="Privacy-first healthcare. No medical data stored permanently.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(sessions.router)
app.include_router(files.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
