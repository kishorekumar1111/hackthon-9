"""Seed database with sample doctors and a patient. Run once after starting the app."""
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from database import Base
from config import get_settings
from models import User, Doctor, UserRole
from auth import get_password_hash

async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        r = await db.execute(select(User).where(User.email == "patient@test.com"))
        if r.scalar_one_or_none():
            print("Already seeded.")
            return
        patient = User(
            email="patient@test.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test Patient",
            role=UserRole.patient,
        )
        db.add(patient)
        await db.flush()
        doc1_user = User(
            email="doctor1@test.com",
            hashed_password=get_password_hash("password123"),
            full_name="Dr. Sarah Chen",
            role=UserRole.doctor,
        )
        db.add(doc1_user)
        await db.flush()
        doc1 = Doctor(user_id=doc1_user.id, specialty="General Physician", experience_years=12, bio="General practice and preventive care.")
        db.add(doc1)
        doc2_user = User(
            email="doctor2@test.com",
            hashed_password=get_password_hash("password123"),
            full_name="Dr. James Wilson",
            role=UserRole.doctor,
        )
        db.add(doc2_user)
        await db.flush()
        doc2 = Doctor(user_id=doc2_user.id, specialty="Cardiology", experience_years=8)
        db.add(doc2)
        await db.commit()
    print("Seeded: patient@test.com / doctor1@test.com / doctor2@test.com (password: password123)")

if __name__ == "__main__":
    asyncio.run(seed())
