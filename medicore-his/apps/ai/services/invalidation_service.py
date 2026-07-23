import asyncio
import os
import json
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def redis_listener():
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe("clinics.encounter.signed_off", "consent.revoked")
        
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                try:
                    channel = message.get("channel")
                    from middleware.rate_limit import redis_client
                    data = json.loads(message["data"])

                    if channel == "clinics.encounter.signed_off":
                        patient_id = data.get("patientId")
                        if patient_id:
                            key = f"ai_cache:{patient_id}:summary"
                            redis_client.delete(key)
                            print(f"Invalidated AI Cache for patient_id: {patient_id}")

                    if channel == "consent.revoked":
                        from middleware.consent_gate import process_consent_revocation_event
                        process_consent_revocation_event(data)
                        print("Invalidated consent cache after consent.revoked event")
                except Exception as e:
                    print(f"Failed to process invalidation: {e}")
            await asyncio.sleep(0.1)
    except Exception as e:
        print(f"Redis Listener failed: {e}")

