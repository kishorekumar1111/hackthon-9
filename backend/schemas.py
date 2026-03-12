from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # "patient" | "doctor"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    class Config:
        from_attributes = True


class DoctorCreate(BaseModel):
    specialty: str
    experience_years: int = 0
    bio: Optional[str] = None


class DoctorResponse(BaseModel):
    id: int
    full_name: str
    specialty: str
    experience_years: int
    bio: Optional[str] = None

    class Config:
        from_attributes = True


class DoctorListResponse(BaseModel):
    id: int
    full_name: str
    specialty: str
    experience_years: int

    class Config:
        from_attributes = True


class SlotResponse(BaseModel):
    start: str
    end: str


class AppointmentCreate(BaseModel):
    doctor_id: int
    appointment_date: date
    slot_start: str
    slot_end: str


class AppointmentResponse(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str
    doctor_specialty: str
    appointment_date: date
    slot_start: str
    slot_end: str
    status: str
    patient_name: Optional[str] = None

    class Config:
        from_attributes = True


class SessionStartResponse(BaseModel):
    session_id: int
    room_name: str
    token: Optional[str] = None


class SessionResponse(BaseModel):
    id: int
    appointment_id: int
    status: str
    room_name: Optional[str]
    started_at: datetime
    ended_at: Optional[datetime]
    doctor_consent: bool


class SessionFileResponse(BaseModel):
    id: int
    original_filename: str
    content_type: str
    uploaded_at: datetime

    class Config:
        from_attributes = True
