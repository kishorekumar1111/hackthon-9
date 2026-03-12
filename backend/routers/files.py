import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, Doctor, Appointment, Session, SessionFile, SessionStatus, UserRole
from schemas import SessionFileResponse
from auth import get_current_user
from config import get_settings

router = APIRouter(prefix="/files", tags=["files"])
settings = get_settings()


async def _get_session_for_user(session_id: int, user: User, db: AsyncSession) -> Session:
    result = await db.execute(select(Session).where(Session.id == session_id))
    sess = result.scalar_one_or_none()
    if not sess or sess.status != SessionStatus.active:
        raise HTTPException(status_code=404, detail="Session not found or ended")
    apt = await db.get(Appointment, sess.appointment_id)
    if user.role == UserRole.patient:
        if apt.patient_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        doc = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        if not doc or apt.doctor_id != doc.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if not sess.doctor_consent:
            raise HTTPException(status_code=403, detail="Patient revoked access")
    return sess


@router.post("/session/{session_id}/upload", response_model=SessionFileResponse)
async def upload_file(
    session_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sess = await _get_session_for_user(session_id, user, db)
    if user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Only patient can upload")
    ext = (file.filename or "").split(".")[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(status_code=400, detail="Allowed: PDF, JPG, PNG")
    os.makedirs(settings.upload_dir, exist_ok=True)
    stored_name = f"{session_id}_{uuid.uuid4().hex}.{ext}"
    path = os.path.join(settings.upload_dir, stored_name)
    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Max size {settings.max_upload_mb}MB")
    with open(path, "wb") as f:
        f.write(content)
    sf = SessionFile(
        session_id=session_id,
        original_filename=file.filename or "file",
        stored_path=stored_name,
        content_type=file.content_type or "application/octet-stream",
    )
    db.add(sf)
    await db.commit()
    await db.refresh(sf)
    return SessionFileResponse(
        id=sf.id,
        original_filename=sf.original_filename,
        content_type=sf.content_type,
        uploaded_at=sf.uploaded_at,
    )


@router.get("/session/{session_id}/list", response_model=list[SessionFileResponse])
async def list_session_files(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_session_for_user(session_id, user, db)
    result = await db.execute(select(SessionFile).where(SessionFile.session_id == session_id))
    return [SessionFileResponse(id=f.id, original_filename=f.original_filename, content_type=f.content_type, uploaded_at=f.uploaded_at) for f in result.scalars().all()]


@router.get("/session/{session_id}/file/{file_id}")
async def get_file_view(
    session_id: int,
    file_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sess = await _get_session_for_user(session_id, user, db)
    result = await db.execute(select(SessionFile).where(SessionFile.id == file_id, SessionFile.session_id == session_id))
    sf = result.scalar_one_or_none()
    if not sf:
        raise HTTPException(status_code=404, detail="File not found")
    path = os.path.join(settings.upload_dir, sf.stored_path)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=sf.original_filename, media_type=sf.content_type)
