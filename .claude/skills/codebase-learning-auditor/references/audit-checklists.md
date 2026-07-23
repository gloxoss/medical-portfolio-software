# Codebase Audit Checklist

## Coverage Matrix
Use this matrix to ensure nothing is missed.

0. Task and plan alignment
- Restate objective in one sentence.
- Map objective to active plan tasks and current checkpoint.
- Define done criteria before reading files.

1. Repository map
- Build tools, package structure, app boundaries.
- Verify where frontend, backend, and sidecar live.

2. Runtime and environments
- Env files and config loading path.
- Verify no hardcoded API URLs or credentials.

3. Backend architecture
- Module boundaries: controller, service, repository, dto, schema.
- Dependency inversion for third-party providers.

4. Frontend architecture
- Route groups, components, API wrappers, hooks, shared types.
- State ownership and cache boundaries.

5. Auth and tenant or branch flow
- Trace org_id and facility_id from token to DB query.
- Verify guards, decorators, and repository filters enforce scope.
- Verify branch or facility context is preserved across service calls.

6. Data flow tracing
- Request entry -> validation -> service -> repository -> response.
- Capture event publishing and side effects.

7. Security pass
- Input validation
- Authentication and role authorization
- Tenant scoping
- Error leakage checks
- Rate limiting where needed

8. Quality pass
- Unit and integration test coverage around critical paths.
- Lint and type errors.
- Known flaky tests or missing cases.

## Issue Card Template
Use one card per issue.

- Title:
- Location:
- Symptom:
- Trigger:
- Likely root cause:
- Confidence: low | medium | high
- Minimal fix path:
- Verification command or test:

## Enhancement Options Template
Always provide three options.

1. Option A - Minimal safe patch
- Scope:
- Risk:
- Time:
- Why choose it:

2. Option B - Moderate cleanup
- Scope:
- Risk:
- Time:
- Why choose it:

3. Option C - Structural redesign
- Scope:
- Risk:
- Time:
- Why choose it:

## Learning Artifact Inputs
When generating a lesson page and doc, prepare these fields first:

- Topic name
- Source path
- One paragraph summary
- Data flow sentence
- 4 to 8 key concepts
- 3 to 6 problem hotspots
- 3 to 6 fix suggestions

## Completion Gate
Mark the section done only if:
- Logic is understandable by a junior engineer.
- Security checks are explicitly covered.
- Problem locations are linked to exact files.
- Suggested fix has a concrete verification step.
- Checkpoint done criteria from the plan are satisfied.
