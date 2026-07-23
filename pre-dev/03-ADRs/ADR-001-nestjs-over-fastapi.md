# ADR-001 — NestJS over FastAPI for Main Backend

**Status**: Accepted  
**Date**: 2025  
**Author**: Oussama Zaki

---

## Context

The original blueprint used FastAPI (Python) for all backend logic. After reflection on the full product scope, the stack was reconsidered.

## Decision

Use NestJS (TypeScript) as the primary backend for all HIS business logic. FastAPI is retained only as a dedicated AI microservice.

## Rationale

| Factor | FastAPI (original) | NestJS (chosen) |
|---|---|---|
| Type safety | Pydantic (Python) | TypeScript end-to-end — shared types with Next.js frontend |
| Prisma ORM | Not available | First-class Prisma support |
| Module architecture | Manual structure | Built-in DI, decorators, modules — scales cleanly |
| API documentation | Auto via OpenAPI | Auto via Swagger decorator |
| Testing | pytest | Jest — same ecosystem as frontend |
| Developer experience | Good | Familiar to Oussama — same language as frontend |
| CQRS / event patterns | Manual | NestJS has built-in EventEmitter + CQRS module |

The strongest argument: TypeScript across Next.js + NestJS means shared DTOs, shared validation schemas (Zod), and one `packages/shared-types` package that both apps import. When a field changes in an API response, the frontend catches the type error immediately.

## Consequences

- FastAPI is now an AI-only sidecar service. It has no database access.
- NestJS handles all 12 business domain modules.
- The monorepo now has 3 apps: `apps/web` (Next.js), `apps/api` (NestJS), `apps/ai` (FastAPI).
