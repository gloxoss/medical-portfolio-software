# ADR-004: Redis Pub/Sub over Dedicated Message Queue

**Status:** Accepted  
**Date:** 2026-04-07  
**Author:** Oussama Zaki

## Context
MediCore modules communicate via events (e.g., encounter sign-off triggers billing). We need an event transport mechanism. Options: Redis pub/sub, BullMQ (Redis-backed queue), RabbitMQ, AWS SQS, Kafka.

## Decision
Use Redis pub/sub for inter-module events in MVP. No dedicated message queue.

## Rationale
| Factor | Redis Pub/Sub | BullMQ | RabbitMQ | Kafka |
|--------|--------------|--------|----------|-------|
| Complexity | Minimal — already using Redis | Low (Redis-backed) | Medium (separate service) | High (separate cluster) |
| Cost | $0 (existing Redis) | $0 (existing Redis) | +$5–10/mo | +$50+/mo |
| Solo developer DX | ioredis is trivial | Moderate | Moderate | Complex |
| At-least-once delivery | No (fire-and-forget) | Yes | Yes | Yes |
| Scale needed | 50 users | 50 users | 500+ users | 10,000+ users |

At MVP scale (50 concurrent users, ~100 events/hour), Redis pub/sub is sufficient. The risk of lost events is low and the consequence is a missed invoice draft — catchable by a daily reconciliation cron job.

## Alternatives Considered
- **BullMQ**: Adds job queue semantics (retry, delay, dead letter). Strong candidate for Phase 2 if event reliability becomes a problem. Not needed for MVP.
- **RabbitMQ**: Overkill — requires a separate service, exchange/queue configuration, and monitoring.
- **Kafka**: Designed for 100K+ events/second. Absurdly over-engineered for MVP.

## Consequences
- **Easier**: No additional infrastructure. One Redis instance does cache + events + locks.
- **Harder**: If Redis goes down, events are lost (no persistence). Mitigated by: managed Redis with persistence enabled (`save 60 1` in docker-compose), daily reconciliation checks.
- **Migration path**: If Phase 2 needs guaranteed delivery, switch event publishing from `redis.publish()` to BullMQ `queue.add()` — same Redis, different client. ~2 hours of migration.

---

# ADR-005: SaaS Multi-Tenant over Single-Tenant Instances

**Status:** Accepted  
**Date:** 2026-04-07  
**Author:** Oussama Zaki

## Context
MediCore serves multiple clinic organizations. Two models: (A) One shared instance with tenant isolation via `org_id` scoping, (B) Separate infrastructure per customer.

## Decision
SaaS multi-tenant. Single shared instance. Tenant isolation enforced at the application layer via `org_id` + `facility_id` on every query.

## Rationale
| Factor | Multi-Tenant (A) | Single-Tenant (B) |
|--------|-----------------|-------------------|
| Infrastructure cost | $80–120/mo for ALL customers | $80–120/mo PER customer |
| Deployment time | 0 — new org is a database row | 1–2 hours per customer |
| Solo builder feasibility | ✅ One codebase, one deployment | ❌ N codebases to manage |
| Data isolation | Application-level (Prisma middleware + Mongoose guards) | Infrastructure-level (separate DBs) |
| Compliance risk | Higher — coding error could leak data | Lower — physical separation |

For a solo builder, managing separate infrastructure per customer is operationally impossible. Multi-tenancy trades compliance simplicity for operational feasibility.

## Isolation Enforcement
1. **PostgreSQL**: Prisma middleware auto-injects `org_id` into every WHERE clause (see `01-architecture.md`)
2. **MongoDB**: Repository layer includes `org_id` + `facility_id` in every query
3. **Redis**: Event envelopes carry `org_id` — subscribers filter
4. **Testing**: E2E test: create 2 orgs, add data to each, verify zero cross-contamination

## Consequences
- **Easier**: Single deployment, single monitoring, single database backup strategy.
- **Harder**: Must be extremely disciplined about tenant scoping. One missed `org_id` filter = data leak = game over.
- **Future**: Enterprise plan may offer dedicated database instances (logical isolation within Atlas, not separate clusters) for an upcharge.
