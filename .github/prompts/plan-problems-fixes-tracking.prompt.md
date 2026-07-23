---
description: "Create a full remediation plan with problems, fixes, task lists, docs tracking files, and a status-aware changelog."
name: "Plan Problems Fixes And Tracking"
argument-hint: "Scope + known problems + constraints (example: encounter signoff flow, auth issue, API timeout, target this week)"
agent: "agent"
---
Create a complete remediation package for the current workspace using the prompt arguments as scope and constraints.

Goal:
- Build one end-to-end plan that identifies all in-scope problems, proposes concrete fixes, and tracks execution through docs files and changelog entries.

Required workflow:
1. Identify all in-scope problems from the provided arguments and workspace context.
2. For each problem, document:
   - symptom
   - likely root cause
   - user and business impact
   - recommended fix
   - alternative fix options
   - dependencies and blockers
   - risk level
   - effort estimate
   - validation steps
3. Create a prioritized task list with clear owners, order, and acceptance criteria.
4. Create or update tracking files in docs/:
   - docs/PLAN-<scope>.md
   - docs/TASKLIST-<scope>.md
   - docs/CHANGELOG-<scope>.md
5. In the changelog, explicitly track:
   - what changed
   - what works
   - what does not work yet
   - what must be tested next

Output format:
- Summary
- Scope and assumptions
- Problem register (table)
- Prioritized task list (phased)
- Tracking files created or updated
- Changelog entries
- Open questions
- Recommended next 3 actions

Quality rules:
- Keep every item actionable and testable.
- Avoid vague language.
- Flag unknowns instead of guessing.
- Keep naming consistent for scope slugs in docs filenames.
