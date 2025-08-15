import os
import asyncio
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from dotenv import load_dotenv

from services.resume_parser import ResumeParser
from services.ai_processor import AIProcessor
from services.chatbot import ChatbotService
from services.job_matcher import JobMatcher

load_dotenv()

app = FastAPI(title="Resume Screening AI Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
resume_parser = ResumeParser()
ai_processor = AIProcessor()
chatbot_service = ChatbotService()
job_matcher = JobMatcher()

# Pydantic models
class ResumeProcessRequest(BaseModel):
    file_url: str
    file_name: str

class ChatMessage(BaseModel):
    message: str
    conversation_history: List[Dict[str, str]] = []
    user_role: str = "candidate"
    context: Dict[str, Any] = {}

class JobMatchRequest(BaseModel):
    resume_data: Dict[str, Any]
    job_data: Dict[str, Any]

class ResumeAnalysisResponse(BaseModel):
    parsed_data: Dict[str, Any]
    ai_score: int
    analysis: Dict[str, Any]
    processing_time: float

class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    entities: List[Dict[str, Any]]
    updated_context: Dict[str, Any]

@app.get("/")
async def root():
    return {"message": "Resume Screening AI Service", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "resume_parser": "active",
            "ai_processor": "active",
            "chatbot": "active",
            "job_matcher": "active"
        }
    }

@app.post("/process-resume", response_model=ResumeAnalysisResponse)
async def process_resume(request: ResumeProcessRequest):
    """Process resume using GROQ + GEMINI AI services"""
    try:
        import time
        start_time = time.time()
        
        # Parse resume content
        parsed_data = await resume_parser.parse_resume(request.file_url, request.file_name)
        
        # Process with AI for scoring and analysis
        ai_result = await ai_processor.analyze_resume(parsed_data)
        
        processing_time = time.time() - start_time
        
        return ResumeAnalysisResponse(
            parsed_data=parsed_data,
            ai_score=ai_result["score"],
            analysis=ai_result["analysis"],
            processing_time=processing_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume processing failed: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_bot(request: ChatMessage):
    """Process chat message using GROQ + GEMINI"""
    try:
        response = await chatbot_service.process_message(
            message=request.message,
            conversation_history=request.conversation_history,
            user_role=request.user_role,
            context=request.context
        )
        
        return ChatResponse(**response)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.post("/match-job")
async def match_job_to_resume(request: JobMatchRequest):
    """Calculate job match score using AI"""
    try:
        match_result = await job_matcher.calculate_match(
            resume_data=request.resume_data,
            job_data=request.job_data
        )
        
        return match_result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job matching failed: {str(e)}")

@app.post("/upload-resume")
async def upload_resume_file(file: UploadFile = File(...)):
    """Upload and process resume file directly"""
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Save uploaded file temporarily
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Parse the file
        parsed_data = await resume_parser.parse_file(temp_path)
        
        # Process with AI
        ai_result = await ai_processor.analyze_resume(parsed_data)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return {
            "parsed_data": parsed_data,
            "ai_score": ai_result["score"],
            "analysis": ai_result["analysis"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@app.post("/analyze-skills")
async def analyze_skills(skills: List[str]):
    """Analyze and categorize skills using AI"""
    try:
        analysis = await ai_processor.analyze_skills(skills)
        return analysis
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skills analysis failed: {str(e)}")

@app.post("/generate-interview-questions")
async def generate_interview_questions(job_data: Dict[str, Any], candidate_data: Dict[str, Any]):
    """Generate interview questions based on job and candidate profile"""
    try:
        questions = await ai_processor.generate_interview_questions(job_data, candidate_data)
        return {"questions": questions}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )