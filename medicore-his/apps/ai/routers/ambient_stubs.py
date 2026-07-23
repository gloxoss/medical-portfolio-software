from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/ai/ambient", tags=["ambient-stubs"])


@router.post("/start")
async def ambient_start_stub() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented", "route": "/ai/ambient/start"},
    )


@router.post("/{sessionId}/stop")
async def ambient_stop_stub(sessionId: str) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={
            "status": "not_implemented",
            "route": f"/ai/ambient/{sessionId}/stop",
        },
    )
