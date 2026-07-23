from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from middleware.jwt_auth import verify_jwt
from middleware.rate_limit import rate_limit
from services.context_service import get_patient_context
from services.llm_service import generate_completion
from services.cache_service import get_cached_response, set_cached_response
from prompts.templates import SUMMARY_PROMPT

router = APIRouter(prefix="/ai/copilot", tags=["copilot"])

class CopilotRequest(BaseModel):
    patient_id: str

@router.post("/summary")
async def summarize_patient(req: CopilotRequest, user: dict = Depends(verify_jwt)):
    # 1. Rate Limit
    rate_limit(user["sub"])
    
    # 2. Check Cache
    cached = get_cached_response(req.patient_id, "summary")
    if cached:
        return {"summary": cached, "cached": True}
        
    # 3. Fetch Context from NestJS securely
    context = await get_patient_context(req.patient_id, user["__raw_token"])
    if not context:
        raise HTTPException(status_code=404, detail="Patient not found or access denied")
        
    # 4. Generate Prompt
    prompt = SUMMARY_PROMPT.render(patient=context.get("patient", {}))
    
    # 5. Call LLM
    try:
        summary = await generate_completion(prompt)
    except Exception as e:
        raise HTTPException(status_code=503, detail="AI service unavailable. Standard protocols apply.")
        
    # 6. Cache and Return
    set_cached_response(req.patient_id, "summary", summary)
    return {"summary": summary, "cached": False}
