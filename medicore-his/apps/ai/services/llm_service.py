import os
import json
from openai import AsyncOpenAI

AI_API_KEY = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY", "dummy-key"))
AI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")

client = AsyncOpenAI(api_key=AI_API_KEY)

async def generate_completion(prompt: str) -> str:
    try:
        response = await client.chat.completions.create(
            model=AI_MODEL,
            messages=[
                {"role": "system", "content": "You are a clinical AI assistant summarizing patient data accurately."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        return response.choices[0].message.content
    except Exception as e:
        # Graceful fallback per specs
        raise Exception(f"OpenAI service error: {str(e)}")
