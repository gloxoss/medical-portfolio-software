# Root Codebase Audit and Cleanup Report

Date: 2026-04-13  
Scope: Workspace root and nested project structure

---

## 1. Objective

Requested goal was completed in two layers:
1. Full root-to-project audit and categorization
2. Removal of unnecessary, duplicated, and generated clutter

---

## 2. Final Workspace Categorization

## 2.1 Canonical Product Project
Primary implementation tree:
- medicore-his/

Contains the full app source and runtime modules:
- apps/
- packages/
- docs/
- infra/
- showcase/

Status:
- Kept as canonical project

## 2.2 Product Planning and Strategy Assets
Kept at root:
- pre-dev/
- his-predev/
- docs/
- Researchs/
- blueprint and planning markdown assets

Status:
- Kept

## 2.3 Tooling and Agent Metadata
Kept at root:
- .agent/
- .claude/
- .github/
- .code-review-graph/
- .obsidian/
- workspace instruction/config files

Status:
- Kept

---

## 3. Redundancy and Duplication Findings

Main duplication found before cleanup:
- A second root-level source monorepo (apps/packages/infra + root monorepo manifests)
- A full nested product monorepo at medicore-his/

Decision applied:
- Keep medicore-his/ as single canonical source tree
- Remove duplicate root source/build trees and orphaned root monorepo manifests

---

## 4. Cleanup Actions Executed

## 4.1 Generated/Temporary Cleanup
Removed generated artifact directories from project trees:
- node_modules
- .next
- dist
- coverage
- .turbo
- __pycache__
- .pytest_cache

Removed temporary build logs:
- medicore-his/api_tsc.log
- medicore-his/shared_tsc.log
- medicore-his/web_tsc.log

Result count from cleanup pass:
- Removed artifact directories: 3588
- Removed temporary log files: 3

## 4.2 Source-Level Deduplication at Root
Removed duplicate root source trees:
- apps/
- packages/
- infra/

Removed orphaned root monorepo manifests:
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- turbo.json

---

## 5. Final Root State

Root now acts as:
- planning/documentation workspace
- canonical project host via medicore-his/

Key remaining root items include:
- docs/
- pre-dev/
- his-predev/
- Researchs/
- medicore-his/
- top-level planning/spec files

---

## 6. Operational Note

Since generated dependencies/artifacts were removed, reinstall before running app:

From canonical project:
- cd medicore-his
- pnpm install

Then run project commands from medicore-his root.

---

## 7. Outcome

Completed:
- Root-to-project codebase audit
- Folder/file categorization
- Removal of unnecessary generated clutter
- Source-level deduplication to one canonical project tree

No remaining parallel source monorepo at root.
