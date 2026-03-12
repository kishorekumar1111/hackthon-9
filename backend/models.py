from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text, Column, Date, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class UserRole(str, enum.Enum):
    patient = "patient"
    doctor = "doctor"


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    live = "live"
    completed = "completed"
    cancelled = "cancelled"


class SessionStatus(str, enum.Enum):
    active = "active"
    ended = "ended"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    doctor = relationship("Doctor", back_populates="user", uselist=False)
    patient_appointments = relationship("Appointment", back_populates="patient", foreign_keys="Appointment.patient_id")


class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    specialty = Column(String(255), nullable=False)
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    user = relationship("User", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")


class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_date = Column(Date, nullable=False)
    slot_start = Column(String(10), nullable=False)
    slot_end = Column(String(10), nullable=False)
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.scheduled, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    patient = relationship("User", back_populates="patient_appointments", foreign_keys=[patient_id])
    doctor = relationship("Doctor", back_populates="appointments")
    session = relationship("Session", back_populates="appointment", uselist=False)


class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.active, nullable=False)
    room_name = Column(String(255), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    doctor_consent = Column(Boolean, default=True)
    appointment = relationship("Appointment", back_populates="session")
    files = relationship("SessionFile", back_populates="session", cascade="all, delete-orphan")


class SessionFile(Base):
    __tablename__ = "session_files"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(512), nullable=False)
    content_type = Column(String(64), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    session = relationship("Session", back_populates="files")
