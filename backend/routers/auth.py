from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, UserRole, Doctor
from schemas import UserCreate, UserLogin, Token, UserResponse
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from config import get_settings
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=Token)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    role = UserRole.patient if data.role == "patient" else UserRole.doctor
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        role=role,
    )
    db.add(user)
    await db.flush()
    if role == UserRole.doctor:
        doc = Doctor(user_id=user.id, specialty="General", experience_years=0)
        db.add(doc)
    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token, user_id=user.id, role=user.role.value)


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token, user_id=user.id, role=user.role.value)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse(id=user.id, email=user.email, full_name=user.full_name, role=user.role.value)


@router.post("/seed-demo")
async def seed_demo(db: AsyncSession = Depends(get_db)):
    """Create demo accounts if they don't exist. Safe to call multiple times."""
    # Use plain demo password so we never rely on bcrypt (avoids platform issues)
    hashed = "demo:demo123"

    for email, full_name, role in [
        ("patient@test.com", "Demo Patient", UserRole.patient),
        ("doctor@test.com", "Dr. Demo", UserRole.doctor),
    ]:
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            continue
        user = User(
            email=email,
            hashed_password=hashed,
            full_name=full_name,
            role=role,
        )
        db.add(user)
        await db.flush()
        if role == UserRole.doctor:
            doc = Doctor(user_id=user.id, specialty="General", experience_years=5)
            db.add(doc)
    await db.commit()
    return {"ok": True, "message": "Demo accounts ready (patient@test.com / doctor@test.com, password: demo123)"}


@router.post("/google", response_model=Token)
async def google_login(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange Google ID token for app JWT.
    Payload:
      - id_token: string (required)
      - role: 'patient'|'doctor' (required for first-time users)
    """
    google_client_id = settings.google_client_id
    if not google_client_id:
        raise HTTPException(status_code=500, detail="Google login not configured")

    raw_id_token = payload.get("id_token")
    desired_role = payload.get("role")
    if not raw_id_token:
        raise HTTPException(status_code=400, detail="id_token required")

    try:
        info = google_id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            google_client_id,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = info.get("email")
    full_name = info.get("name") or info.get("given_name") or "Google User"
    if not email:
        raise HTTPException(status_code=400, detail="Google account email not available")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        if desired_role not in ("patient", "doctor"):
            raise HTTPException(status_code=400, detail="role_required")
        role = UserRole.patient if desired_role == "patient" else UserRole.doctor
        user = User(
            email=email,
            hashed_password="demo:google",  # not used for Google accounts
            full_name=full_name,
            role=role,
        )
        db.add(user)
        await db.flush()
        if role == UserRole.doctor:
            db.add(Doctor(user_id=user.id, specialty="General", experience_years=0))
        await db.commit()
        await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token, user_id=user.id, role=user.role.value)
