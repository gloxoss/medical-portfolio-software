from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/ai", tags=["advanced-ai-stubs"])


@router.post("/optimize/schedule")
async def optimize_schedule_stub() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented", "route": "/ai/optimize/schedule"},
    )


@router.get("/population/risk-scores")
async def risk_scores_stub() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented", "route": "/ai/population/risk-scores"},
    )


@router.get("/trends/{patientId}")
async def trends_stub(patientId: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented", "route": f"/ai/trends/{patientId}"},
    )
