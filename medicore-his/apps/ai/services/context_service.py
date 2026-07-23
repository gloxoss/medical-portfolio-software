import os
import httpx

NESTJS_INTERNAL_URL = os.getenv("API_URL", "http://localhost:3001/internal")

async def get_patient_context(patient_id: str, raw_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        # Pass-through JWT Authentication to NestJS
        response = await client.get(
            f"{NESTJS_INTERNAL_URL}/ai-context/{patient_id}",
            headers={"Authorization": f"Bearer {raw_token}"},
            timeout=10.0
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()
