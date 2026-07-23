---
name: codebase-learning-auditor
description: "Understand and audit codebases step by step. Use when you need file or folder logic explanations, auth and data flow tracing, security review, problem location mapping, fix suggestions, and React learning page generation from audited code. Always run session-report, karpathy-guidelines, medicore-his-dev, and the full caveman skill stack first for structured execution."
argument-hint: "Describe target scope and learning goal, for example: audit medicore-his/apps/api/src/modules/auth and teach tenant flow."
---

# Codebase Learning Auditor

## What This Skill Produces
- A full audit path from simplest files to most complex flows.
- Clear explanations of file, folder, service, and module logic.
- Task and plan alignment before every audit pass.
- Problem-location mapping with concrete file paths and hypotheses.
- Fix options with tradeoffs and recommended next action.
- Learning artifacts for revision:
  - executable React lesson page
  - markdown learning document

## Mandatory Companion Skill Stack (Always Run)
Before any audit, explanation, diagnosis, enhancement suggestion, or learning artifact generation, this skill must load and follow these skills in this exact order:

1. `/session-report`
  - Source: `c:\Users\zakio\.claude\skills\session-report\SKILL.md`
  - Purpose: enforce structured reporting and session progress discipline.

2. `karpathy-guidelines`
  - Source: `c:\Users\zakio\.claude\skills\karpathy-guidelines\SKILL.md`
  - Purpose: enforce assumptions clarity, simplicity-first decisions, and surgical changes.

3. `medicore-his-dev`
  - Source: `c:\Users\zakio\.claude\skills\medicore-his-dev\SKILL.md`
  - Purpose: enforce MediCore architecture, source-of-truth docs, security, and workflow gates.

4. `caveman`
  - Source: `c:\Users\zakio\.claude\skills\caveman\SKILL.md`
  - Purpose: enforce token-efficient concise communication mode.

5. `caveman-commit`
  - Source: `c:\Users\zakio\.claude\skills\caveman-commit\SKILL.md`
  - Purpose: enforce compact commit message style when relevant.

6. `caveman-compress`
  - Source: `c:\Users\zakio\.claude\skills\caveman-compress\SKILL.md`
  - Purpose: enforce memory and context compression workflows when needed.

7. `caveman-help`
  - Source: `c:\Users\zakio\.claude\skills\caveman-help\SKILL.md`
  - Purpose: keep caveman command and mode references available.

8. `caveman-review`
  - Source: `c:\Users\zakio\.claude\skills\caveman-review\SKILL.md`
  - Purpose: enforce concise review feedback format when reviewing code changes.

Enforcement rules:
- Do not continue if this stack has not been loaded.
- If one skill cannot be loaded, stop and report which skill is missing.
- Continue only after loading all required skills in this list.

## When to Use
- "Help me understand this file"
- "Explain this folder architecture"
- "Audit auth and branch or facility flow"
- "Find likely bug locations"
- "Suggest safe improvements"
- "Create a learning page from what we audited"

## Core Logic (Karpathy-Aligned)
1. Think before coding.
- State assumptions.
- Surface uncertainty.
- Ask consequence-driven questions when path choices matter.

2. Simplicity first.
- Prefer the smallest working explanation or fix.
- Avoid speculative abstractions.

3. Surgical changes.
- Touch only files needed for the requested outcome.
- Do not refactor unrelated code while auditing.

4. Goal-driven execution.
- Define success criteria for each audit checkpoint.
- Verify before moving forward.

## Workflow: Brainstorm -> Plan -> Enhance

### Guided File-by-File Mode (User-Led)
Use this mode whenever the user asks to go one by one, learn interactively, or drive the audit manually.

Rules:
- The user picks the file order.
- Explain only the currently selected file unless the user asks to expand scope.
- After each file explanation, stop and wait for user questions.
- Do not jump to the next file without explicit user confirmation.
- Do not run broad autonomous scans while in guided mode.

Per-file output contract:
1. Why this file exists
2. What inputs it receives and outputs it produces
3. How the internal logic works
4. What it depends on and what depends on it
5. Where it sits in the runtime/data flow
6. Auth/tenant/facility implications (if applicable)
7. Common failure points
8. Fast confidence checks

Checkpoint behavior in guided mode:
- A checkpoint can span multiple files, but each file is explained in a separate user-approved step.
- Stage 4 and Stage 5 (issues and A/B/C options) are deferred until the user asks for diagnosis or improvements.
- Stage 6 (learning artifact generation) runs only on explicit user request.

### Stage 0: Task and Plan Sync
Actions:
- Restate the current objective in one sentence.
- Map the objective to the active project plan items and pending tasks.
- Define the current checkpoint scope so the audit stays focused.
- State explicit completion criteria for this checkpoint.

Output:
- Objective line
- Plan mapping
- Checkpoint boundaries
- Done criteria

### Stage 1: Brainstorm (Scope and Unknowns)
Actions:
- Confirm target scope (file, folder, module, or end-to-end flow).
- Confirm objective (understand, debug, secure, refactor, teach).
- Capture unknown terms and unclear decisions.
- Ask up to 4 high-impact clarification questions only if needed.

Output:
- Scope statement
- Known vs unknown list
- Initial risk focus

### Stage 2: Plan (Simple to Complex)
Build a checkpoint sequence from low complexity to high complexity.

Default sequence:
1. Config and constants
2. Types, DTOs, schemas
3. API clients and hooks
4. Controllers, services, repositories
5. Auth, tenancy, branch or facility boundaries and context propagation
6. Cross-module orchestration and events
7. End-to-end request and response path
8. Security and compliance pass

For each checkpoint, define:
- Goal
- Files
- Verification check
- Next dependency

### Stage 3: Explain (Per File or Folder)
For each file, explain in this order:
1. Why it exists
2. Inputs and outputs
3. Internal decision logic
4. Dependencies in and out
5. Data flow position
6. Auth or tenancy implications
7. Common failure points
8. How to test confidence quickly

Use plain language first, then code-level details.

### Stage 4: Locate Problems
Run a focused diagnosis pass:
- Gather static and runtime errors.
- Trace callers and callees around failing symbols.
- Map symptoms to likely root causes.
- Produce issue cards using ./references/audit-checklists.md.

Each issue card must include:
- location
- symptom
- likely cause
- confidence level
- minimal fix path

### Stage 5: Suggest Enhancements
Offer exactly 3 options:
- Option A: Minimal safe patch
- Option B: Moderate cleanup
- Option C: Structural improvement

For each option, include:
- effort
- risk
- expected impact
- recommended choice and why

### Stage 6: Teach Mode (React Course Artifact)
When a checkpoint is understood and user asks for a lesson artifact, run:

pwsh -File ./.claude/skills/codebase-learning-auditor/scripts/generate-react-learning-page.ps1 -Topic "patient-api" -SourcePath "medicore-his/apps/web/src/lib/api/patient.api.ts" -Summary "Typed patient API wrapper and request contracts." -DataFlow "UI form submits to hook, hook calls API client, API client sends request, response updates query cache."

Generated outputs:
- medicore-his/apps/web/src/app/(ops)/learn/<topic>/page.tsx
- medicore-his/docs/reports/learning-courses/<topic>.md

Teaching quality requirements:
- Include both plain-language and code-level explanations.
- Include the auth and tenant or branch boundaries when relevant.
- Include hotspots, fix options, and review questions for revision.

### Stage 7: Completion Checks
Only mark checkpoint complete when all are true:
- Scope logic explained in plain language and technical detail.
- Data flow traced from entry to persistence or external side effect.
- Auth and tenant or branch boundaries verified.
- Risks and fix options documented.
- Learning artifact generated if requested.

## Response Structure
Use this structure in explanations:
- summary
- context
- details
- next steps

## Constraints
- No mock data for production code updates.
- No hardcoded secrets or environment constants.
- No speculative refactors during audit mode.
- Keep every suggestion traceable to observed code.

## Manual Audit Report Format
For every completed checkpoint, report in this order:
- summary
- context
- details
- next steps

The details section must include:
- file and folder logic summary
- data flow trace
- auth and tenant or branch boundary verification
- problem locations with confidence
- enhancement options A/B/C with recommendation

## Resources
- [Audit Checklist and Issue Cards](./references/audit-checklists.md)
- [React Learning Page Generator](./scripts/generate-react-learning-page.ps1)
