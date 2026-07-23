import jwt
from fastapi import Request, HTTPException
from typing import Optional
import os

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-for-dev")

async def verify_jwt(request: Request) -> dict:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        # Pass the token string itself so we can proxy it to NestJS
        payload["__raw_token"] = token
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
