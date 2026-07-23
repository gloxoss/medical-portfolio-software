# ADR-002 — Hybrid Database: PostgreSQL + MongoDB + Redis

**Status**: Accepted  
**Date**: 2025  
**Author**: Oussama Zaki

## Decision
Use PostgreSQL for relational/financial data, MongoDB for clinical documents, Redis for ephemeral/real-time data. Not one database for everything.

## Rationale
See `docs/02-database-strategy.md` for full breakdown. Short version:
- PG: invoices and auth need ACID transactions and strict typing
- Mongo: clinical encounters are deeply nested documents that don't fit rows
- Redis: queue state and event bus need sub-millisecond access

## Risk
Added complexity of two database clients in one app. Mitigated by: Prisma for PG (clean DX), Mongoose for Mongo (mature), strict module ownership so each module only touches one DB.

---

# ADR-003 — FastAPI as AI Sidecar (Not Integrated into NestJS)

**Status**: Accepted  
**Date**: 2025

## Decision
FastAPI runs as a completely separate service from the NestJS backend. It has no direct database connections. It receives context from NestJS via HTTP and returns AI responses.

## Rationale
Python's AI/ML ecosystem (LangChain, LlamaIndex, HuggingFace Transformers, NumPy, scikit-learn) has no TypeScript equivalent. Oussama's ML work at ENSAM is Python-based. Running AI logic in Python is non-negotiable for serious ML features.

The sidecar pattern keeps the boundary clean: NestJS owns data, FastAPI owns inference.

## Communication pattern
```
NestJS (encounter signed off)
  → POST /ai/copilot/summary { patient_id, encounter_id }
  → FastAPI calls NestJS: GET /internal/patients/{id}/context
  → FastAPI calls OpenAI with built prompt
  → Returns structured JSON to NestJS
  → NestJS returns to frontend
```

## Security
FastAPI validates the same JWT issued by NestJS. Shared `JWT_SECRET`. No separate auth system.

The `/internal/*` NestJS routes (used only by FastAPI) require an additional `X-Internal-Service-Key` header that's only known to FastAPI. These routes are never exposed publicly.
