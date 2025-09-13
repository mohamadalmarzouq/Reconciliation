from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import json
import asyncio
from dotenv import load_dotenv
from typing import List, Optional, Dict, Any
import uuid

# Load environment variables
load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/reconcileai")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OpenAI settings
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Database Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    company_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)

class BankStatement(Base):
    __tablename__ = "bank_statements"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="uploaded")  # uploaded, processing, processed, error
    total_transactions = Column(Integer, default=0)
    matched_transactions = Column(Integer, default=0)
    unmatched_transactions = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    user_id = Column(Integer, nullable=False)
    bank_name = Column(String(255))
    account_number = Column(String(255))

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    bank_statement_id = Column(Integer, nullable=False)
    date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    reference = Column(String(255))
    balance = Column(Float)
    transaction_type = Column(String(50))  # debit, credit
    is_matched = Column(Boolean, default=False)
    match_confidence = Column(Float, default=0.0)
    matched_with = Column(String(255))  # Reference to matched accounting entry
    ai_explanation = Column(Text)  # AI explanation of the match
    suggested_action = Column(String(50))  # match, split, defer, flag
    created_at = Column(DateTime, default=datetime.utcnow)

class AccountingEntry(Base):
    __tablename__ = "accounting_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    source_system = Column(String(50))  # xero, quickbooks
    entry_id = Column(String(255))  # External system ID
    date = Column(DateTime, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    account_code = Column(String(50))
    account_name = Column(String(255))
    reference = Column(String(255))
    entry_type = Column(String(50))  # invoice, payment, journal
    created_at = Column(DateTime, default=datetime.utcnow)

class ReconciliationSession(Base):
    __tablename__ = "reconciliation_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    bank_statement_id = Column(Integer, nullable=False)
    status = Column(String(50), default="pending")  # pending, processing, completed, error
    total_matches = Column(Integer, default=0)
    total_unmatched = Column(Integer, default=0)
    ai_processing_time = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    company_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class BankStatementResponse(BaseModel):
    id: int
    filename: str
    file_type: str
    upload_date: datetime
    status: str
    total_transactions: int
    matched_transactions: int
    unmatched_transactions: int
    confidence_score: float
    bank_name: Optional[str]
    account_number: Optional[str]
    
    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: int
    date: datetime
    amount: float
    description: str
    reference: Optional[str]
    balance: Optional[float]
    transaction_type: Optional[str]
    is_matched: bool
    match_confidence: float
    matched_with: Optional[str]
    ai_explanation: Optional[str]
    suggested_action: Optional[str]
    
    class Config:
        from_attributes = True

class ReconciliationResult(BaseModel):
    session_id: int
    total_transactions: int
    matched_count: int
    unmatched_count: int
    confidence_score: float
    processing_time: float
    status: str

# Utility functions
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# FastAPI app
app = FastAPI(
    title="ReconcileAI - Autonomous Bank Reconciliation Agent",
    description="AI-powered bank reconciliation platform with OpenAI integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Routes
@app.get("/")
async def root():
    return {
        "message": "ReconcileAI - Autonomous Bank Reconciliation Agent",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

@app.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        company_name=user.company_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/upload", response_model=BankStatementResponse)
async def upload_bank_statement(
    file: UploadFile = File(...),
    bank_name: str = Form(None),
    account_number: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["text/csv", "application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not supported. Please upload CSV, PDF, or XLSX files.")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"/mnt/data/uploads/{unique_filename}"
    
    # Create upload directory if it doesn't exist
    os.makedirs("/mnt/data/uploads", exist_ok=True)
    
    # Save file
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Create bank statement record
    bank_statement = BankStatement(
        filename=file.filename,
        file_path=file_path,
        file_type=file.content_type,
        user_id=current_user.id,
        bank_name=bank_name,
        account_number=account_number
    )
    db.add(bank_statement)
    db.commit()
    db.refresh(bank_statement)
    
    return bank_statement

@app.get("/statements", response_model=List[BankStatementResponse])
async def get_bank_statements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    statements = db.query(BankStatement).filter(BankStatement.user_id == current_user.id).all()
    return statements

@app.get("/statements/{statement_id}/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    statement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify statement belongs to user
    statement = db.query(BankStatement).filter(
        BankStatement.id == statement_id,
        BankStatement.user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    transactions = db.query(Transaction).filter(Transaction.bank_statement_id == statement_id).all()
    return transactions

@app.post("/reconcile/{statement_id}", response_model=ReconciliationResult)
async def start_reconciliation(
    statement_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify statement belongs to user
    statement = db.query(BankStatement).filter(
        BankStatement.id == statement_id,
        BankStatement.user_id == current_user.id
    ).first()
    
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    
    # Create reconciliation session
    session = ReconciliationSession(
        user_id=current_user.id,
        bank_statement_id=statement_id,
        status="processing"
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Start background reconciliation
    background_tasks.add_task(process_reconciliation, session.id, statement_id, current_user.id)
    
    return ReconciliationResult(
        session_id=session.id,
        total_transactions=statement.total_transactions,
        matched_count=0,
        unmatched_count=0,
        confidence_score=0.0,
        processing_time=0.0,
        status="processing"
    )

async def process_reconciliation(session_id: int, statement_id: int, user_id: int):
    """Background task to process reconciliation using AI"""
    db = SessionLocal()
    try:
        # Get statement and transactions
        statement = db.query(BankStatement).filter(BankStatement.id == statement_id).first()
        transactions = db.query(Transaction).filter(Transaction.bank_statement_id == statement_id).all()
        
        # Get accounting entries for the user
        accounting_entries = db.query(AccountingEntry).filter(AccountingEntry.user_id == user_id).all()
        
        # Process with AI (simplified for now)
        matched_count = 0
        total_confidence = 0.0
        
        for transaction in transactions:
            # Simple matching logic (replace with OpenAI integration)
            best_match = find_best_match(transaction, accounting_entries)
            
            if best_match:
                transaction.is_matched = True
                transaction.match_confidence = best_match["confidence"]
                transaction.matched_with = best_match["reference"]
                transaction.ai_explanation = best_match["explanation"]
                transaction.suggested_action = "match"
                matched_count += 1
                total_confidence += best_match["confidence"]
        
        # Update statement
        statement.matched_transactions = matched_count
        statement.unmatched_transactions = len(transactions) - matched_count
        statement.confidence_score = total_confidence / len(transactions) if transactions else 0
        statement.status = "processed"
        
        # Update session
        session = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
        session.status = "completed"
        session.total_matches = matched_count
        session.total_unmatched = len(transactions) - matched_count
        session.completed_at = datetime.utcnow()
        
        db.commit()
        
    except Exception as e:
        # Update session with error
        session = db.query(ReconciliationSession).filter(ReconciliationSession.id == session_id).first()
        session.status = "error"
        db.commit()
        print(f"Reconciliation error: {e}")
    finally:
        db.close()

def find_best_match(transaction, accounting_entries):
    """Simple matching logic - replace with OpenAI integration"""
    best_match = None
    best_confidence = 0.0
    
    for entry in accounting_entries:
        # Simple amount matching
        if abs(transaction.amount - entry.amount) < 0.01:
            confidence = 0.8
            if confidence > best_confidence:
                best_match = {
                    "reference": entry.reference or entry.entry_id,
                    "confidence": confidence,
                    "explanation": f"Matched by amount: {transaction.amount}"
                }
                best_confidence = confidence
    
    return best_match

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
