from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
import models
import re # NEW: Used to intelligently swap the wire lengths!
from database import engine, SessionLocal

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PTI Cables Production Log System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    
    try:
        db.execute(text("UPDATE pallet_logs SET timestamp = CURRENT_TIMESTAMP WHERE timestamp IS NULL;"))
        db.execute(text("UPDATE jobs SET is_active = true WHERE is_active IS NULL;"))
        db.execute(text("UPDATE jobs SET priority = 0 WHERE priority IS NULL;"))
        db.commit()
    except Exception: db.rollback()

    columns_to_add = [
        ("pallet_logs", "operator_name", "VARCHAR"), ("pallet_logs", "wire_type", "VARCHAR"),
        ("pallet_logs", "comments", "VARCHAR"), ("pallet_logs", "pallet_num", "INTEGER"),
        ("pallet_logs", "qty_requested", "INTEGER DEFAULT 0"), ("jobs", "priority", "INTEGER DEFAULT 0"),
        ("quarantine_reels", "job_id", "INTEGER DEFAULT 0")
    ]
    for table, col, col_type in columns_to_add:
        try: db.execute(text(f'ALTER TABLE {table} ADD COLUMN {col} {col_type};')); db.commit()
        except Exception: db.rollback() 
    
    try:
        db.execute(text('''CREATE TABLE IF NOT EXISTS rework_jobs (id SERIAL PRIMARY KEY, source_wire VARCHAR, instruction VARCHAR, target_qty INTEGER, is_active BOOLEAN DEFAULT true)'''))
        db.execute(text('''CREATE TABLE IF NOT EXISTS rework_logs (id SERIAL PRIMARY KEY, job_id INTEGER, operator_name VARCHAR, source_wire VARCHAR, instruction VARCHAR, qty_produced INTEGER, comments VARCHAR, shift VARCHAR, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'''))
        db.execute(text('''CREATE TABLE IF NOT EXISTS quarantine_reels (id SERIAL PRIMARY KEY, job_id INTEGER DEFAULT 0, line_name VARCHAR, operator_name VARCHAR, wire_type VARCHAR, length VARCHAR, reason VARCHAR, shift VARCHAR, status VARCHAR DEFAULT 'Pending', timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'''))
        db.commit()
    except Exception as e: db.rollback()
    db.close()

# --- PYDANTIC MODELS ---
class NoteSubmit(BaseModel): line_name: str; message: str; author: str
class PalletSubmit(BaseModel): line_name: str; job_id: int; operator_name: str; wire_type: str; comments: str; pallet_num: int; qty_requested: int; audit_start: int; audit_end: int; total_spools: int; shift: str
class JobSubmit(BaseModel): line_name: str; wire_type: str; pallets_needed: int; spools_per_pallet: int
class JobUpdate(BaseModel): target_amount: int
class WireSubmit(BaseModel): name: str
class ReworkJobCreate(BaseModel): source_wire: str; instruction: str; target_qty: int
class ReworkLogSubmit(BaseModel): job_id: int; operator_name: str; source_wire: str; instruction: str; qty_produced: int; comments: str; shift: str
class QuarantineSubmit(BaseModel): job_id: int; line_name: str; operator_name: str; wire_type: str; length: str; reason: str; shift: str
class QuarantineToRework(BaseModel): instruction: str; target_qty: int

@app.get("/")
def test_server(): return {"message": "PTI Cables Production Log System API is running!"}

# ==========================================
# 1. PALLETS & HISTORY
# ==========================================
@app.post("/api/pallets")
def submit_pallet(pallet: PalletSubmit, db: Session = Depends(get_db)):
    new_log = models.PalletLog(job_id=pallet.job_id, line_name=pallet.line_name, operator_name=pallet.operator_name, wire_type=pallet.wire_type, comments=pallet.comments, pallet_num=pallet.pallet_num, qty_requested=pallet.qty_requested, audit_start=pallet.audit_start, audit_end=pallet.audit_end, total_spools=pallet.total_spools, shift=pallet.shift)
    db.add(new_log); db.commit()
    return {"message": "Pallet saved!"}

@app.get("/api/history/{line_name}")
def get_line_history(line_name: str, db: Session = Depends(get_db)):
    return [dict(row) for row in db.execute(text("SELECT * FROM pallet_logs WHERE line_name = :ln ORDER BY timestamp DESC LIMIT 500"), {"ln": line_name}).mappings().all()]

@app.get("/api/history")
def get_all_history(db: Session = Depends(get_db)):
    return [dict(row) for row in db.execute(text("SELECT * FROM pallet_logs ORDER BY timestamp DESC LIMIT 1000")).mappings().all()]

# ==========================================
# 2. JOBS 
# ==========================================
@app.post("/api/jobs")
def dispatch_job(job: JobSubmit, db: Session = Depends(get_db)):
    existing_job = db.query(models.Job).filter(models.Job.line_name == job.line_name, models.Job.wire_type == job.wire_type, models.Job.is_active == True).first()
    if existing_job:
        if existing_job.pallets_needed == 0 and job.pallets_needed == 0: 
            existing_job.spools_per_pallet += job.spools_per_pallet; db.commit(); return {"message": "Merged"}
    new_job = models.Job(line_name=job.line_name, wire_type=job.wire_type, pallets_needed=job.pallets_needed, spools_per_pallet=job.spools_per_pallet, is_active=True)
    db.add(new_job); db.commit(); return {"message": "Job dispatched!"}

@app.get("/api/jobs/closed")
def get_closed_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).filter(models.Job.is_active == False).order_by(models.Job.id.desc()).limit(500).all()

@app.get("/api/jobs")
def get_all_active_jobs(db: Session = Depends(get_db)):
    return db.query(models.Job).filter(models.Job.is_active == True).order_by(models.Job.line_name.asc(), models.Job.id.asc()).all()

@app.get("/api/jobs/{line_name}")
def get_active_jobs_line(line_name: str, db: Session = Depends(get_db)):
    return db.query(models.Job).filter(models.Job.line_name == line_name, models.Job.is_active == True).order_by(models.Job.id.asc()).all()

@app.put("/api/jobs/{job_id}")
def update_job(job_id: int, update_data: JobUpdate, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job:
        if job.pallets_needed == 0: job.spools_per_pallet = update_data.target_amount
        else: job.pallets_needed = update_data.target_amount
        db.commit()
    return {"message": "Job updated!"}

@app.put("/api/jobs/{job_id}/priority")
def toggle_priority(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job: job.priority = 1 if job.priority == 0 else 0; db.commit()
    return {"message": "Priority toggled!"}

@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if job: job.is_active = False; db.commit()
    return {"message": "Job canceled"}

@app.post("/api/jobs/{job_id}/close")
def close_job(job_id: int, db: Session = Depends(get_db)):
    db.query(models.Job).filter(models.Job.id == job_id).update({"is_active": False}); db.commit()
    return {"message": "Job closed"}

# ==========================================
# 3. REWORK & QUARANTINE
# ==========================================
@app.post("/api/rework-jobs")
def dispatch_rework(job: ReworkJobCreate, db: Session = Depends(get_db)):
    db.execute(text("INSERT INTO rework_jobs (source_wire, instruction, target_qty, is_active) VALUES (:w, :i, :q, true)"), {"w": job.source_wire, "i": job.instruction, "q": job.target_qty})
    db.commit(); return {"message": "Rework dispatched!"}

@app.get("/api/rework-jobs")
def get_rework_jobs(db: Session = Depends(get_db)):
    return [dict(row) for row in db.execute(text("SELECT * FROM rework_jobs WHERE is_active = true")).mappings().all()]

@app.get("/api/rework-jobs/closed")
def get_closed_rework_jobs(db: Session = Depends(get_db)):
    return [dict(row) for row in db.execute(text("SELECT * FROM rework_jobs WHERE is_active = false ORDER BY id DESC LIMIT 500")).mappings().all()]

@app.get("/api/rework-history")
def get_rework_history(db: Session = Depends(get_db)):
    return [dict(row) for row in db.execute(text("SELECT * FROM rework_logs ORDER BY timestamp DESC LIMIT 500")).mappings().all()]

@app.delete("/api/rework-jobs/{job_id}")
def delete_rework_job(job_id: int, db: Session = Depends(get_db)):
    db.execute(text("DELETE FROM rework_jobs WHERE id = :jid"), {"jid": job_id}); db.commit(); return {"message": "Deleted"}

@app.post("/api/rework-jobs/{job_id}/close")
def close_rework_job(job_id: int, db: Session = Depends(get_db)):
    db.execute(text("UPDATE rework_jobs SET is_active = false WHERE id = :jid"), {"jid": job_id}); db.commit(); return {"message": "Closed"}

@app.post("/api/rework-logs")
def submit_rework_log(log: ReworkLogSubmit, db: Session = Depends(get_db)):
    db.execute(text("INSERT INTO rework_logs (job_id, operator_name, source_wire, instruction, qty_produced, comments, shift) VALUES (:jid, :op, :w, :i, :q, :c, :s)"), {"jid": log.job_id, "op": log.operator_name, "w": log.source_wire, "i": log.instruction, "q": log.qty_produced, "c": log.comments, "s": log.shift})
    db.commit(); return {"message": "Logged"}

# --- QUARANTINE ENDPOINTS ---
@app.post("/api/quarantine")
def submit_quarantine(q: QuarantineSubmit, db: Session = Depends(get_db)):
    db.execute(text("INSERT INTO quarantine_reels (job_id, line_name, operator_name, wire_type, length, reason, shift) VALUES (:jid, :ln, :op, :wt, :len, :rsn, :sh)"), {"jid": q.job_id, "ln": q.line_name, "op": q.operator_name, "wt": q.wire_type, "len": q.length, "rsn": q.reason, "sh": q.shift})
    db.commit(); return {"message": "Quarantined!"}

@app.get("/api/quarantine")
def get_quarantine(db: Session = Depends(get_db)):
    return [dict(row) for row in db.execute(text("SELECT * FROM quarantine_reels WHERE status = 'Pending' ORDER BY timestamp DESC")).mappings().all()]

@app.post("/api/quarantine/{q_id}/scrap")
def scrap_quarantine(q_id: int, db: Session = Depends(get_db)):
    db.execute(text("UPDATE quarantine_reels SET status = 'Scrapped' WHERE id = :qid"), {"qid": q_id})
    q_rec = db.execute(text("SELECT wire_type, length, reason FROM quarantine_reels WHERE id = :qid"), {"qid": q_id}).mappings().first()
    if q_rec:
        source_label = f"{q_rec['wire_type']} (Odd Reel: {q_rec['length']})"
        instruction = f"SCRAP COMPLETELY - Reason: {q_rec['reason']}"
        db.execute(text("INSERT INTO rework_jobs (source_wire, instruction, target_qty, is_active) VALUES (:w, :i, :q, true)"), {"w": source_label, "i": instruction, "q": 0})
    db.commit(); return {"message": "Scrapped and routed to rework!"}

@app.post("/api/quarantine/{q_id}/rework")
def quarantine_to_rework(q_id: int, req: QuarantineToRework, db: Session = Depends(get_db)):
    db.execute(text("UPDATE quarantine_reels SET status = 'Reworked' WHERE id = :qid"), {"qid": q_id})
    q_rec = db.execute(text("SELECT wire_type, length FROM quarantine_reels WHERE id = :qid"), {"qid": q_id}).mappings().first()
    if q_rec:
        source_label = f"{q_rec['wire_type']} (Odd Reel: {q_rec['length']})"
        db.execute(text("INSERT INTO rework_jobs (source_wire, instruction, target_qty, is_active) VALUES (:w, :i, :q, true)"), {"w": source_label, "i": req.instruction, "q": req.target_qty})
    db.commit(); return {"message": "Sent to Rework"}

@app.post("/api/quarantine/{q_id}/ship")
def ship_quarantine(q_id: int, db: Session = Depends(get_db)):
    db.execute(text("UPDATE quarantine_reels SET status = 'Shipped' WHERE id = :qid"), {"qid": q_id})
    q_rec = db.execute(text("SELECT * FROM quarantine_reels WHERE id = :qid"), {"qid": q_id}).mappings().first()
    if q_rec:
        # CLEAN THE WIRE STRING FOR SHIPPING
        odd_length = str(q_rec['length']).strip()
        if not odd_length.lower().endswith('m'):
            odd_length += 'm'
            
        # This regex removes the old "3000m" from the end and swaps in "3030m"
        base_wire = re.sub(r'\s*\d+m$', '', q_rec['wire_type'], flags=re.IGNORECASE)
        new_wire_type = f"{base_wire} {odd_length}"
        
        comments = f"PASSED TO SHIPPING - Reason: {q_rec['reason']}"
        
        new_log = models.PalletLog(
            job_id=q_rec['job_id'],
            line_name=q_rec['line_name'],
            operator_name=q_rec['operator_name'],
            wire_type=new_wire_type,
            comments=comments,
            pallet_num=0,
            qty_requested=0,
            audit_start=0,
            audit_end=0,
            total_spools=1,
            shift=q_rec['shift']
        )
        db.add(new_log)
    db.commit()
    return {"message": "Shipped and Logged to Production!"}

# ==========================================
# 4. CUSTOM WIRES & NOTES
# ==========================================
@app.get("/api/custom-wires")
def get_custom_wires(db: Session = Depends(get_db)): return [w.name for w in db.query(models.CustomWire).order_by(models.CustomWire.name.asc()).all()]
@app.post("/api/custom-wires")
def add_custom_wire(wire: WireSubmit, db: Session = Depends(get_db)): db.add(models.CustomWire(name=wire.name)); db.commit(); return {"message": "Saved"}
@app.delete("/api/custom-wires")
def delete_wire(name: str, db: Session = Depends(get_db)):
    w = db.query(models.CustomWire).filter(models.CustomWire.name == name).first(); 
    if w: db.delete(w); db.commit()
    return {"message": "Deleted"}
@app.post("/api/notes")
def add_note(note: NoteSubmit, db: Session = Depends(get_db)): db.add(models.ShiftNote(line_name=note.line_name, message=note.message, author=note.author)); db.commit(); return {"message": "Pinned!"}
@app.get("/api/notes/{line_name}")
def get_notes(line_name: str, db: Session = Depends(get_db)): return db.query(models.ShiftNote).filter(models.ShiftNote.line_name == line_name).order_by(models.ShiftNote.timestamp.desc()).limit(5).all()
@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db)):
    n = db.query(models.ShiftNote).filter(models.ShiftNote.id == note_id).first()
    if n: db.delete(n); db.commit()
    return {"message": "Removed!"}