import time
import os
import redis
from fastapi import HTTPException

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

def rate_limit(user_id: str, limit: int = 20, window: int = 3600):
    key = f"rate_limit:{user_id}"
    current = redis_client.get(key)
    
    if current and int(current) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    pipe = redis_client.pipeline()
    pipe.incr(key)
    if not current:
        pipe.expire(key, window)
    pipe.execute()
