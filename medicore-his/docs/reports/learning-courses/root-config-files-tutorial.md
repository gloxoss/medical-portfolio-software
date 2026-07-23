# Root Config Files Tutorial

## Summary
This tutorial explains the core workspace files in `medicore-his/`, whether they are generated or manual, how safe they are to edit, and simple edit recipes.

## File-by-File Guide

### `package.json`
- Type: Manual project config
- Generated: No
- Editable: Yes (high)
- Why it exists: Defines workspace scripts, engines, and root dev dependencies.
- Safe edits:
  - Add scripts in `scripts`
  - Add/remove root dev tools in `devDependencies`
- Risky edits:
  - Changing existing script names used in CI without updating pipelines
  - Removing required engines or packageManager pin

Example edit:
```json
{
  "scripts": {
    "ai:test": "cd apps/ai && python -m pytest tests -q"
  }
}
```

### `pnpm-workspace.yaml`
- Type: Manual workspace map
- Generated: No
- Editable: Yes (medium)
- Why it exists: Declares which folders are part of the pnpm monorepo.
- Safe edits:
  - Add a new package glob
- Risky edits:
  - Removing `apps/*` or `packages/*` can hide projects from pnpm commands

Example edit:
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tools/*"
```

### `pnpm-lock.yaml`
- Type: Generated lock file
- Generated: Yes
- Editable: Avoid manual edits
- Why it exists: Pins exact dependency versions for reproducible installs.
- How to change correctly:
  1. Edit `package.json`
  2. Run `pnpm install`
  3. Commit updated lock file

### `.env.example`
- Type: Manual template
- Generated: No
- Editable: Yes (high)
- Why it exists: Documents required environment variables for local setup.
- Safe edits:
  - Add new env key with comment
  - Keep placeholder values only
- Risky edits:
  - Putting real secrets in example file

### `.gitignore`
- Type: Manual repo hygiene
- Generated: No
- Editable: Yes (high)
- Why it exists: Prevents accidental commits of build outputs, secrets, and local artifacts.
- Safe edits:
  - Add generated paths (`coverage/`, `.cache/`, local DB files)

### `.dockerignore`
- Type: Manual docker context optimization
- Generated: No
- Editable: Yes (high)
- Why it exists: Reduces Docker build context size and secret leakage risk.
- Safe edits:
  - Exclude logs, build output, lock caches, local virtual envs

### `CHANGELOG.md`
- Type: Manual project history
- Generated: No
- Editable: Yes (high)
- Why it exists: Human-readable release/session log and validation evidence.

## Quick Edit Workflow
1. Decide file class: manual config vs generated artifact.
2. Edit only manual files directly.
3. For generated files (`pnpm-lock.yaml`), regenerate via command.
4. Validate:
   - `pnpm typecheck`
   - `pnpm test`
   - If AI touched: `pnpm ai:test`

## Enhancement Ideas
- Add script aliases for AI workflows (`ai:dev`, `ai:test`).
- Add a lockfile policy note in docs to avoid manual lock edits.
- Add a tiny CI check that verifies required env keys are documented in `.env.example`.
