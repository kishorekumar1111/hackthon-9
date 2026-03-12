from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, Doctor, Appointment, Session, SessionFile, AppointmentStatus, SessionStatus, UserRole
from schemas import SessionStartResponse, SessionResponse
from auth import get_current_user, get_current_patient
import os
import uuid
from config import get_settings

router = APIRouter(prefix="/sessions", tags=["sessions"])
settings = get_settings()


@router.post("/start/{appointment_id}", response_model=SessionStartResponse)
async def start_session(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_patient),
):
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.patient_id == user.id)
    )
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Enforce time window: allow start only near the booked slot
    try:
        slot_start_dt = datetime.combine(apt.appointment_date, datetime.strptime(apt.slot_start, "%H:%M").time())
        slot_end_dt = datetime.combine(apt.appointment_date, datetime.strptime(apt.slot_end, "%H:%M").time())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid appointment slot")

    now = datetime.now()
    window_start = slot_start_dt - timedelta(minutes=settings.session_start_early_minutes)
    window_end = slot_end_dt + timedelta(minutes=settings.session_start_late_minutes)
    if now < window_start or now > window_end:
        raise HTTPException(
            status_code=400,
            detail=f"Consultation can start only near the appointment time ({apt.slot_start}–{apt.slot_end}).",
        )
    if apt.status == AppointmentStatus.live:
        sess = (await db.execute(select(Session).where(Session.appointment_id == appointment_id))).scalar_one_or_none()
        if sess and sess.status == SessionStatus.active:
            return SessionStartResponse(session_id=sess.id, room_name=sess.room_name or f"room-{sess.id}")
    if apt.status != AppointmentStatus.scheduled:
        raise HTTPException(status_code=400, detail="Appointment not in scheduled state")
    existing = (await db.execute(select(Session).where(Session.appointment_id == appointment_id))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Session already exists for this appointment")
    room_name = f"ephemeral-{uuid.uuid4().hex[:12]}"
    sess = Session(appointment_id=appointment_id, room_name=room_name, status=SessionStatus.active)
    db.add(sess)
    apt.status = AppointmentStatus.live
    await db.commit()
    await db.refresh(sess)
    return SessionStartResponse(session_id=sess.id, room_name=room_name)


@router.post("/{session_id}/end")
async def end_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    apt = await db.get(Appointment, sess.appointment_id)
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user.role != UserRole.patient or apt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Only patient can end session")
    sess.status = SessionStatus.ended
    sess.ended_at = datetime.utcnow()
    apt.status = AppointmentStatus.completed
    # Delete temp files from disk
    files_result = await db.execute(select(SessionFile).where(SessionFile.session_id == session_id))
    for f in files_result.scalars().all():
        path = os.path.join(settings.upload_dir, f.stored_path)
        if os.path.isfile(path):
            try:
                os.remove(path)
            except OSError:
                pass
    await db.commit()
    return {"ok": True}


@router.get("/by-appointment/{appointment_id}", response_model=SessionResponse | None)
async def get_session_by_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Session).where(Session.appointment_id == appointment_id))
    sess = result.scalar_one_or_none()
    if not sess:
        return None
    apt = await db.get(Appointment, sess.appointment_id)
    if user.role == UserRole.patient and apt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if user.role == UserRole.doctor:
        doc = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        if not doc or apt.doctor_id != doc.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if not sess.doctor_consent:
            raise HTTPException(status_code=403, detail="Patient revoked access")
    return SessionResponse(
        id=sess.id,
        appointment_id=sess.appointment_id,
        status=sess.status.value,
        room_name=sess.room_name,
        started_at=sess.started_at,
        ended_at=sess.ended_at,
        doctor_consent=sess.doctor_consent,
    )


@router.post("/{session_id}/consent")
async def set_doctor_consent(
    session_id: int,
    consent: bool = True,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_patient),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    sess = result.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    apt = await db.get(Appointment, sess.appointment_id)
    if apt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    sess.doctor_consent = consent
    await db.commit()
    return {"ok": True}
