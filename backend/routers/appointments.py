from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from database import get_db
from models import User, Doctor, Appointment, AppointmentStatus, UserRole
from schemas import AppointmentCreate, AppointmentResponse
from auth import get_current_user, get_current_patient

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentResponse)
async def create_appointment(
    data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_patient),
):
    result = await db.execute(select(Doctor).where(Doctor.id == data.doctor_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    existing = await db.execute(
        select(Appointment).where(
            and_(
                Appointment.doctor_id == data.doctor_id,
                Appointment.appointment_date == data.appointment_date,
                Appointment.slot_start == data.slot_start,
                Appointment.status.in_([AppointmentStatus.scheduled, AppointmentStatus.live]),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slot already booked")
    apt = Appointment(
        patient_id=user.id,
        doctor_id=data.doctor_id,
        appointment_date=data.appointment_date,
        slot_start=data.slot_start,
        slot_end=data.slot_end,
        status=AppointmentStatus.scheduled,
    )
    db.add(apt)
    await db.commit()
    await db.refresh(apt)
    doctor_user = (await db.execute(select(User).where(User.id == doc.user_id))).scalar_one_or_none()
    return AppointmentResponse(
        id=apt.id,
        doctor_id=apt.doctor_id,
        doctor_name=doctor_user.full_name if doctor_user else "Doctor",
        doctor_specialty=doc.specialty,
        appointment_date=apt.appointment_date,
        slot_start=apt.slot_start,
        slot_end=apt.slot_end,
        status=apt.status.value,
    )


@router.get("/my", response_model=list[AppointmentResponse])
async def my_appointments(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if user.role == UserRole.patient:
        result = await db.execute(
            select(Appointment, Doctor, User)
            .join(Doctor, Appointment.doctor_id == Doctor.id)
            .join(User, Doctor.user_id == User.id)
            .where(Appointment.patient_id == user.id)
            .order_by(Appointment.appointment_date, Appointment.slot_start)
        )
    else:
        doc_result = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
        doc = doc_result.scalar_one_or_none()
        if not doc:
            return []
        result = await db.execute(
            select(Appointment, Doctor, User)
            .join(Doctor, Appointment.doctor_id == Doctor.id)
            .join(User, Doctor.user_id == User.id)
            .where(Appointment.doctor_id == doc.id)
            .order_by(Appointment.appointment_date, Appointment.slot_start)
        )
    rows = result.all()
    out = []
    for row in rows:
        apt, doctor, doctor_user = row
        if user.role == UserRole.patient:
            out.append(
                AppointmentResponse(
                    id=apt.id,
                    doctor_id=apt.doctor_id,
                    doctor_name=doctor_user.full_name,
                    doctor_specialty=doctor.specialty,
                    appointment_date=apt.appointment_date,
                    slot_start=apt.slot_start,
                    slot_end=apt.slot_end,
                    status=apt.status.value,
                )
            )
        else:
            patient = await db.get(User, apt.patient_id)
            out.append(
                AppointmentResponse(
                    id=apt.id,
                    doctor_id=apt.doctor_id,
                    doctor_name=doctor_user.full_name,
                    doctor_specialty=doctor.specialty,
                    appointment_date=apt.appointment_date,
                    slot_start=apt.slot_start,
                    slot_end=apt.slot_end,
                    status=apt.status.value,
                    patient_name=patient.full_name if patient else None,
                )
            )
    return out


@router.post("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    apt = result.scalar_one_or_none()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if user.role == UserRole.patient and apt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Not your appointment")
    if user.role == UserRole.doctor:
        doc = (await db.execute(select(Doctor).where(Doctor.user_id == user.id))).scalar_one_or_none()
        if not doc or apt.doctor_id != doc.id:
            raise HTTPException(status_code=403, detail="Not your appointment")
    apt.status = AppointmentStatus.cancelled
    await db.commit()
    return {"ok": True}
