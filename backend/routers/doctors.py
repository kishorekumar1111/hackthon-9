from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from database import get_db
from models import User, Doctor, Appointment, AppointmentStatus
from schemas import DoctorListResponse, DoctorResponse, SlotResponse
from auth import get_current_user

router = APIRouter(prefix="/doctors", tags=["doctors"])

# Slots: 9:00-17:00, 15 min each
SLOT_MINUTES = 15
SLOTS_PER_DAY = ["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45",
                 "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00", "14:15", "14:30", "14:45",
                 "15:00", "15:15", "15:30", "15:45", "16:00", "16:15", "16:30", "16:45", "17:00"]


def slot_end(s: str) -> str:
    h, m = int(s[:2]), int(s[3:5])
    m += SLOT_MINUTES
    if m >= 60:
        h += 1
        m -= 60
    return f"{h:02d}:{m:02d}"


@router.get("", response_model=list[DoctorListResponse])
async def list_doctors(
    search: str | None = Query(None),
    specialty: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Doctor, User).join(User, Doctor.user_id == User.id)
    if search:
        q = q.where(User.full_name.ilike(f"%{search}%"))
    if specialty:
        q = q.where(Doctor.specialty.ilike(f"%{specialty}%"))
    result = await db.execute(q)
    rows = result.all()
    return [
        DoctorListResponse(
            id=d.id,
            full_name=u.full_name,
            specialty=d.specialty,
            experience_years=d.experience_years,
        )
        for d, u in rows
    ]


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Doctor, User).join(User, Doctor.user_id == User.id).where(Doctor.id == doctor_id)
    )
    row = result.one_or_none()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc, user_row = row
    return DoctorResponse(
        id=doc.id,
        full_name=user_row.full_name,
        specialty=doc.specialty,
        experience_years=doc.experience_years,
        bio=doc.bio,
    )


@router.get("/{doctor_id}/slots", response_model=list[SlotResponse])
async def get_available_slots(
    doctor_id: int,
    appointment_date: date,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doc = result.scalar_one_or_none()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doctor not found")
    result = await db.execute(
        select(Appointment)
        .where(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date == appointment_date,
                Appointment.status.in_([AppointmentStatus.scheduled, AppointmentStatus.live]),
            )
        )
    )
    booked = result.scalars().all()
    booked_pairs = {(a.slot_start, a.slot_end) for a in booked}
    available = []
    for i in range(len(SLOTS_PER_DAY) - 1):
        start = SLOTS_PER_DAY[i]
        end = slot_end(start)
        if (start, end) not in booked_pairs:
            available.append(SlotResponse(start=start, end=end))
    return available
