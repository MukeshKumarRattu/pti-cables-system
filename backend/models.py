from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class Line(Base):
    __tablename__ = "lines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class Job(Base):
    __tablename__ = "jobs"
    id = Column(Integer, primary_key=True, index=True)
    line_name = Column(String, index=True)
    wire_type = Column(String) 
    pallets_needed = Column(Integer)
    spools_per_pallet = Column(Integer)
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0) # <--- NEW PRIORITY SYSTEM

class PalletLog(Base):
    __tablename__ = "pallet_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"))
    line_name = Column(String, index=True)
    
    operator_name = Column(String, default="")
    wire_type = Column(String, default="")
    comments = Column(String, default="")
    pallet_num = Column(Integer, default=1)
    qty_requested = Column(Integer, default=0)
    
    audit_start = Column(Integer)
    audit_end = Column(Integer)
    total_spools = Column(Integer)
    
    shift = Column(String) 
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class CustomWire(Base):
    __tablename__ = "custom_wires"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

class ShiftNote(Base):
    __tablename__ = "shift_notes"
    id = Column(Integer, primary_key=True, index=True)
    line_name = Column(String, index=True)
    message = Column(String)
    author = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)