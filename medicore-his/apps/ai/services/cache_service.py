import json
from middleware.rate_limit import redis_client

def get_cached_response(patient_id: str, feature: str) -> str:
    key = f"ai_cache:{patient_id}:{feature}"
    return redis_client.get(key)

def set_cached_response(patient_id: str, feature: str, response: str, ttl: int = 3600):
    key = f"ai_cache:{patient_id}:{feature}"
    redis_client.setex(key, ttl, response)
