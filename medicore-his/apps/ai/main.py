import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from middleware.consent_gate import ConsentGateMiddleware
from routers import copilot
from routers import copilot_stubs
from routers import ambient_stubs
from routers import advanced_stubs
from routers import soap_suggestions
from routers import ambient
from routers import health
from services.invalidation_service import redis_listener

app = FastAPI(
    title="MediCore AI Sidecar",
    description="Clinical AI assistant — Blueprint Step 9",
    version="1.0.0",
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(redis_listener())

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ConsentGateMiddleware)

app.include_router(copilot.router)
app.include_router(copilot_stubs.router)
app.include_router(ambient_stubs.router)
app.include_router(advanced_stubs.router)
app.include_router(soap_suggestions.router)
app.include_router(ambient.router)
app.include_router(health.router)
