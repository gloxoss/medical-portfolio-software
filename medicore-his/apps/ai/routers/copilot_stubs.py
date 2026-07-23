from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/ai/copilot", tags=["copilot-stubs"])


@router.post("/differentials")
async def copilot_differentials_stub() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented", "route": "/ai/copilot/differentials"},
    )


@router.post("/investigations")
async def copilot_investigations_stub() -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"status": "not_implemented", "route": "/ai/copilot/investigations"},
    )
