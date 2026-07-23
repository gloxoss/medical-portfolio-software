# 📚 Complete Editable Files Course
## Line-by-Line Breakdown With Edit Rules & Reasoning

**Scope:** Root & App-level configuration files in medicore-his workspace  
**Audience:** DevOps, backend engineers, platform maintainers  
**Last Updated:** April 14, 2026  

---

## TABLE OF CONTENTS

1. [Quick Reference Table](#quick-reference-table)
2. [PART 1: Root Workspace Files](#part-1-root-workspace-files)
   - package.json
   - pnpm-workspace.yaml
   - turbo.json
   - .env.example
   - .gitignore
   - .dockerignore
3. [PART 2: Web App (Next.js) Configuration](#part-2-web-app-nextjs-configuration)
   - apps/web/tsconfig.json
   - apps/web/next.config.js
4. [PART 3: API (NestJS) Configuration](#part-3-api-nestjs-configuration)
   - apps/api/tsconfig.json
5. [Edit Safety Rules & Common Mistakes](#edit-safety-rules--common-mistakes)

---

## QUICK REFERENCE TABLE

| File | Category | Editable? | Generated? | Critical? | Edit Frequency |
|------|----------|-----------|-----------|-----------|-----------------|
| `package.json` | Workspace | ✅ Yes | ❌ No | 🔴 High | Weekly |
| `pnpm-workspace.yaml` | Workspace | ✅ Yes | ❌ No | 🟡 Medium | Monthly |
| `turbo.json` | Workspace | ✅ Yes | ❌ No | 🟡 Medium | Quarterly |
| `.env.example` | Secrets/Config | ✅ Yes | ❌ No | 🔴 High | As needed |
| `.gitignore` | VCS | ✅ Yes | ❌ No | 🟡 Medium | As needed |
| `.dockerignore` | Docker | ✅ Yes | ❌ No | 🟠 Low | As needed |
| `apps/web/tsconfig.json` | Build | ✅ Yes | ❌ No | 🟡 Medium | Rarely |
| `apps/web/next.config.js` | Build | ✅ Yes | ❌ No | 🔴 High | Monthly |
| `apps/api/tsconfig.json` | Build | ✅ Yes | ❌ No | 🟡 Medium | Rarely |

---

---

# PART 1: ROOT WORKSPACE FILES

## File 1: `package.json` — Workspace Root Package Manager Config

**File Location:** `medicore-his/package.json`  
**File Type:** JSON  
**Editable:** ✅ YES (always, manually)  
**Generated:** ❌ NO  
**Purpose:** Define workspace metadata, scripts, dependencies, and engine requirements  
**Edit Frequency:** Weekly (scripts) to Monthly (dependencies)

---

### FULL FILE BREAKDOWN

```json
{
  "name": "medicore-his",
```

**Line Explanation:**
- `"name"`: The **workspace name** used internally by pnpm and npm
- **Value:** `"medicore-his"` — must match folder name (best practice)
- **Can Edit?** ✅ YES, but rarely
- **When to Edit:** Only if you're renaming the entire project monorepo
- **What Happens if You Change It:** pnpm recognize this as the same workspace, but NPM registries might look for a package named `medicore-his` (which doesn't exist publicly)
- **Typical Edit:** Never touch this unless doing a full project rename

```json
  "version": "0.1.0",
```

**Line Explanation:**
- `"version"`: Semantic version of the entire workspace
- **Format:** `MAJOR.MINOR.PATCH` (semver)
  - `0` = major (breaking changes, not production-ready)
  - `1` = minor (feature releases)
  - `0` = patch (bug fixes)
- **Can Edit?** ✅ YES, before releases
- **When to Edit:** Before tagging a release in Git. Update to:
  - `0.2.0` when adding new features
  - `0.1.1` when fixing bugs
  - `1.0.0` when going to production
- **What Happens if You Change It:** Affects all apps/packages; use for Docker image tags and release notes
- **Current State:** `0.1.0` = Pre-release, not production-ready
- **Typical Edit:** Before each release, update this and tag in Git

```json
  "private": true,
```

**Line Explanation:**
- `"private"`: Prevents publishing this package to npm registry
- **Value:** `true` = This is a **private monorepo, NOT a public npm package**
- **Can Edit?** ✅ YES, but must stay `true`
- **Why?** MediCore HIS is proprietary software; if set to `false`, pnpm would expect you to publish to npm.com
- **What Happens if You Change It to `false`:** pnpm will try to validate package naming and publish during `pnpm publish` (risky if you don't control `@medicore` namespace)
- **Typical Edit:** NEVER — leave as `true` always

```json
  "scripts": {
```

**Line Explanation:**
- `"scripts"`: Defines shell commands that run via `pnpm run COMMAND` or `npm run COMMAND`
- **Can Edit?** ✅ YES, frequently
- **When to Edit:** Add new development, build, or deployment shortcuts

---

### SCRIPTS SECTION — DETAILED LINE-BY-LINE

```json
    "dev": "turbo dev",
```

**Line Explanation:**
- **Command:** `pnpm dev`
- **What It Does:** Starts Turbo in development mode, which runs `dev` tasks in all apps/packages concurrently
- **Expands To:** 
  - Runs `apps/web#dev` (Next.js dev server on port 3000)
  - Runs `apps/api#dev` (NestJS dev server on port 3001)
  - Runs `apps/ai#dev` (FastAPI dev server on port 8000)
  - Runs `packages/shared-types#build` (TypeScript compilation)
- **Can Edit?** ✅ YES
- **When to Edit:** If you want to add flags like `turbo dev --filter=web` to start only one app
- **Example Safe Edit:** `"dev": "turbo dev --filter=web"` (start only Next.js)
- **Typical Edit:** Rarely; add to if adding new apps

```json
    "ai:dev": "cd apps/ai && uvicorn main:app --reload --port 8000",
```

**Line Explanation:**
- **Command:** `pnpm ai:dev`
- **What It Does:** Starts FastAPI AI sidecar server directly (bypassing Turbo)
- **Breaks Down:**
  - `cd apps/ai` = Change to AI app directory
  - `uvicorn main:app` = Run ASGI app named `main.app` 
  - `--reload` = Hot-reload on file changes (dev only)
  - `--port 8000` = Listen on port 8000
- **Can Edit?** ✅ YES
- **When to Edit:** If you want to add debugging, change port, or add logging
- **Example Safe Edits:**
  - `"ai:dev": "cd apps/ai && uvicorn main:app --reload --port 8000 --log-level debug"` (add logging)
  - `"ai:dev": "cd apps/ai && uvicorn main:app --reload --port 9000"` (change port)
- **⚠️ Common Mistakes:**
  - Don't remove `--reload` (defeats purpose of dev server)
  - Don't change port without updating `NEXT_PUBLIC_AI_URL` in `.env.example`
- **Typical Edit:** Monthly (if port/logging changes needed)

```json
    "ai:test": "cd apps/ai && python -m pytest tests -q",
```

**Line Explanation:**
- **Command:** `pnpm ai:test`
- **What It Does:** Runs pytest on Python tests in the AI app
- **Breaks Down:**
  - `cd apps/ai` = Change to AI app directory
  - `python -m pytest` = Run pytest module
  - `tests` = Test directory to scan
  - `-q` = Quiet mode (minimal output)
- **Can Edit?** ✅ YES
- **When to Edit:** If you want verbose output or add test coverage flags
- **Example Safe Edits:**
  - `"ai:test": "cd apps/ai && python -m pytest tests -v"` (verbose mode)
  - `"ai:test": "cd apps/ai && python -m pytest tests --cov=src"` (measure coverage)
- **⚠️ Common Mistakes:**
  - Don't change `tests` directory name without refactoring
  - Don't remove `tests` (script will fail trying to find tests dir)
- **Typical Edit:** Rarely (only if you add test flags)

```json
    "build": "turbo build",
```

**Line Explanation:**
- **Command:** `pnpm build`
- **What It Does:** Production build for all apps/packages using Turbo
- **Expands To:**
  - Builds `apps/web` → `.next/` folder
  - Builds `apps/api` → `dist/` folder  
  - Builds `packages/shared-types` → transpiled output
- **Can Edit?** ✅ YES (but rarely)
- **When to Edit:** If adding pre-build steps or build flags
- **Example Safe Edit:** `"build": "turbo build --no-cache"` (ignore cached builds)
- **⚠️ Common Mistakes:**
  - Don't skip Turbo (breaks dependency order)
- **Typical Edit:** Very rarely

```json
    "lint": "turbo lint",
```

**Line Explanation:**
- **Command:** `pnpm lint`
- **What It Does:** Run ESLint on all code in all apps/packages
- **Can Edit?** ✅ YES
- **When to Edit:** If you want to run only specific app linters
- **Example Safe Edit:** `"lint": "turbo lint --filter=web"` (lint only web app)
- **Typical Edit:** Rarely

```json
    "typecheck": "turbo typecheck",
```

**Line Explanation:**
- **Command:** `pnpm typecheck`
- **What It Does:** Run TypeScript compiler in check-only mode (no output files)
- **Can Edit?** ✅ YES
- **Typical Edit:** Rarely

```json
    "test": "turbo test",
```

**Line Explanation:**
- **Command:** `pnpm test`
- **What It Does:** Run all unit tests in all apps/packages (Vitest for web, Jest for API)
- **Can Edit?** ✅ YES
- **Typical Edit:** Rarely

```json
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\" --ignore-path .gitignore",
```

**Line Explanation:**
- **Command:** `pnpm format`
- **What It Does:** Auto-format TypeScript, TSX, Markdown, and JSON files using Prettier
- **Breaks Down:**
  - `prettier --write` = Modify files in-place
  - `"**/*.{ts,tsx,md,json}"` = Match all TS/TSX/MD/JSON files recursively
  - `--ignore-path .gitignore` = Don't format ignored files
- **Can Edit?** ✅ YES
- **When to Edit:** If you want to format only specific file types
- **Example Safe Edit:** `"format": "prettier --write \"src/**/*.{ts,tsx}\"` (format only src/ TS files)
- **⚠️ Common Mistakes:**
  - Removing `--ignore-path .gitignore` will format node_modules (slow!)
  - Using wildcard wrong: `*.json` won't match nested files; need `**/*.json`
- **Typical Edit:** Monthly (if adding new file types to format)

```json
    "db:up": "docker compose -f infra/docker-compose.yml up -d postgres mongo redis",
```

**Line Explanation:**
- **Command:** `pnpm db:up`
- **What It Does:** Start PostgreSQL, MongoDB, and Redis containers
- **Breaks Down:**
  - `docker compose` = Use Docker Compose CLI
  - `-f infra/docker-compose.yml` = Read compose config from this file
  - `up -d` = Start containers in background (`-d` = detached)
  - `postgres mongo redis` = Start only these services (not all services in compose file)
- **Can Edit?** ✅ YES
- **When to Edit:** If you add a new database service (e.g., Elasticsearch)
- **Example Safe Edit:** `"db:up": "docker compose -f infra/docker-compose.yml up -d postgres mongo redis elasticsearch"`
- **⚠️ Common Mistakes:**
  - Misspelling service names (must match compose file exactly)
  - Forgetting `-d` flag (runs in foreground, locks terminal)
- **Typical Edit:** Rarely (only when adding new services)

```json
    "db:down": "docker compose -f infra/docker-compose.yml down",
```

**Line Explanation:**
- **Command:** `pnpm db:down`
- **What It Does:** Stop and remove containers defined in compose file
- **Can Edit?** ✅ YES (but rarely)
- **Typical Edit:** Very rarely

```json
    "db:logs": "docker compose -f infra/docker-compose.yml logs -f"
```

**Line Explanation:**
- **Command:** `pnpm db:logs`
- **What It Does:** Stream logs from running containers
- **Breaks Down:**
  - `logs -f` = Follow logs (like `tail -f`)
- **Can Edit?** ✅ YES
- **Typical Edit:** Rarely

```json
  "devDependencies": {
    "turbo": "^2.1.3",
    "prettier": "^3.3.3",
    "typescript": "^5.6.2"
  },
```

**Line Explanation:**
- `"devDependencies"`: Dev-only tools (not bundled in production)
- **`turbo@^2.1.3`** = Monorepo task orchestrator
  - `^2.1.3` = Allow minor/patch updates (2.x.x), but not 3.0
- **`prettier@^3.3.3`** = Code formatter
- **`typescript@^5.6.2`** = TypeScript compiler
- **Can Edit?** ✅ YES, but must understand semver
- **When to Edit:** 
  - ✅ Upgrade: `"turbo": "^2.2.0"` (pnpm install updates to latest 2.x)
  - ✅ Lock version: `"turbo": "2.1.3"` (always exact version)
  - ❌ Downgrade: `"turbo": "^1.9.0"` (might break new code)
- **Semver Rules:**
  - `^2.1.3` = `>=2.1.3 <3.0.0` (caret = minor+patch allowed)
  - `~2.1.3` = `>=2.1.3 <2.2.0` (tilde = patch only)
  - `2.1.3` = Exact version only
- **⚠️ Common Mistakes:**
  - Mixing caret/tilde inconsistently
  - Removing packages that scripts depend on
    - ❌ `pnpm format` would break if you remove `prettier`
- **Typical Edit:** Monthly (upgrade dependencies)

```json
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
```

**Line Explanation:**
- `"engines"`: Specify minimum runtime versions required
- **`node >= 20.0.0`** = Node.js 20 or higher
  - Why? Next.js 14, NestJS 10 need modern async/Promise features
  - Use `node --version` to check your local version
- **`pnpm >= 9.0.0`** = pnpm 9 or higher (earlier versions have bugs)
- **Can Edit?** ✅ YES
- **When to Edit:** When upgrading framework versions
- **Example Scenario:**
  - You upgrade Next.js to v15 (requires Node 22)
  - Edit: `"node": ">=22.0.0"`
- **⚠️ Common Mistakes:**
  - Setting version too **high** → CI/CD fails because it doesn't have that version
  - Setting version too **low** → Old versions have security bugs
- **Typical Edit:** Yearly (with major framework upgrades)

```json
  "packageManager": "pnpm@10.28.2",
```

**Line Explanation:**
- **`packageManager`**: Lock workspace to specific pnpm version
- **Value:** `pnpm@10.28.2` = Force pnpm 10.28.2
- **Why?** Ensures everyone (dev, CI, production) uses same pnpm behavior
- **Can Edit?** ✅ YES
- **When to Edit:** When you upgrade pnpm globally and want to sync team
- **Process:**
  1. Upgrade your local pnpm: `npm install -g pnpm@11.0.0`
  2. Update this line: `"packageManager": "pnpm@11.0.0"`
  3. Run: `pnpm install` (will re-validate pnpm-lock.yaml)
  4. Commit and push
- **⚠️ Common Mistakes:**
  - Using unstable versions (use stable releases only)
- **Typical Edit:** Quarterly (pnpm releases every 1-2 months)

```json
  "pnpm": {
    "onlyBuiltDependencies": ["@nestjs/core", "unrs-resolver", "@prisma/engines", "prisma", "bcrypt", "@prisma/client"]
  }
```

**Line Explanation:**
- **`pnpm.onlyBuiltDependencies`**: List packages that **must be built from source** (not use pre-built binaries)
- **Why This List?**
  - `@nestjs/core` = NestJS framework (requires build compilation)
  - `@prisma/engines`, `prisma` = Database ORM (has binary files; needs recompiling)
  - `bcrypt` = Password hashing (uses native C++ bindings; must compile)
  - `@prisma/client` = Prisma client generator
- **Can Edit?** ✅ YES
- **When to Edit:** When adding packages with native bindings
- **Example:** If you add `sqlite3` (native binding):
  ```json
  "onlyBuiltDependencies": [
    "@nestjs/core", "unrs-resolver", "@prisma/engines", "prisma", "bcrypt", "@prisma/client",
    "sqlite3"
  ]
  ```
- **⚠️ Common Mistakes:**
  - Leaving packages off this list causes Docker builds to fail
  - Adding packages that don't need building slows down installs
- **Typical Edit:** Yearly (when adding new native packages)

---

## File 2: `pnpm-workspace.yaml` — Monorepo Package Structure

**File Location:** `medicore-his/pnpm-workspace.yaml`  
**File Type:** YAML  
**Editable:** ✅ YES (when adding new apps/packages)  
**Generated:** ❌ NO  
**Purpose:** Define which folders are npm packages in the monorepo  
**Edit Frequency:** Monthly (when adding new packages)

---

### FULL FILE BREAKDOWN

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Line 1: `packages:`**
- Keyword defining the start of package paths list
- **Can Edit?** No (required YAML syntax)

**Line 2: `- "apps/*"`**
- **What It Does:** Treats every folder inside `apps/` as a separate npm package
- **Example Expansion:**
  - `apps/web` = separate package (has own package.json)
  - `apps/api` = separate package
  - `apps/ai` = separate package
- **Can Edit?** ✅ YES, but rarely
- **When to Edit:** Only if you rename or move the `apps/` folder
- **Example Edit:**
  ```yaml
  - "applications/*"  # If you renamed "apps" → "applications"
  ```
- **⚠️ Common Mistakes:**
  - Removing this line breaks all app dependencies
  - Using `apps` (specific folder) instead of `apps/*` (all folders) narrows scope
- **What Happens if You Remove:** pnpm won't recognize apps as packages; `pnpm dev` fails

**Line 3: `- "packages/*"`**
- **What It Does:** Treats every folder inside `packages/` as a separate package
- **Current Structure in medicore-his:**
  - `packages/shared-types` = TypeScript types shared by web + api
- **Can Edit?** ✅ YES
- **When to Edit:** If you add new shared packages
- **Example:** Add a shared UI component library:
  ```yaml
  packages:
    - "apps/*"
    - "packages/*"
    - "libs/*"  # New: add if creating a "libs" folder
  ```
- **⚠️ Common Mistakes:**
  - Forgetting to add new package folders causes `pnpm install` to fail
  - Using exact paths (`packages/shared-types`) instead of glob (`packages/*`) limits flexibility

---

### HOW TO ADD A NEW PACKAGE

**Scenario:** You want to create a new shared utilities package

1. **Create folder:** `packages/shared-utils`
2. **Add to pnpm-workspace.yaml:**
   ```yaml
   packages:
     - "apps/*"
     - "packages/*"  ← "shared-utils" is already matched by this glob!
   ```
   ✅ No edit needed! Glob `packages/*` already includes new folder.

3. **Create `packages/shared-utils/package.json`:**
   ```json
   {
     "name": "@medicore/shared-utils",
     "version": "1.0.0",
     "main": "src/index.ts"
   }
   ```

4. **Run:** `pnpm install` (pnpm detects new package automatically)

---

## File 3: `turbo.json` — Task Orchestration & Caching

**File Location:** `medicore-his/turbo.json`  
**File Type:** JSON  
**Editable:** ✅ YES (frequently for build rules)  
**Generated:** ❌ NO  
**Purpose:** Define task dependencies, caching rules, and persistent tasks  
**Edit Frequency:** Monthly (when optimizing builds)

---

### FULL FILE BREAKDOWN

```json
{
  "$schema": "https://turbo.build/schema.json",
```

**Line Explanation:**
- **`$schema`**: Points to Turbo's JSON schema for IDE autocomplete
- **Can Edit?** ❌ NO — this is a reference URL
- **What It Does:** Enables VS Code to validate turbo.json syntax

```json
  "ui": "tui",
```

**Line Explanation:**
- **`ui`**: Turbo's display mode during task execution
- **Value:** `"tui"` = Text User Interface (fancy progress bars)
  - Alternative: `"stream"` = Plain log output
- **Can Edit?** ✅ YES
- **When to Edit:** If terminal output is garbled
  - Edit to: `"ui": "stream"` (disables fancy UI)
- **Typical Edit:** Very rarely

```json
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
```

**`tasks.build` Section Explained:**

**Line: `"dependsOn": ["^build"]`**
- **What It Does:** Before running `build` in app, **run `build` in all dependencies first**
- **Caret `^`** = "dependencies of this package"
- **Example Flow:**
  1. `packages/shared-types` builds first
  2. Then `apps/web` builds (because it depends on shared-types)
  3. Then `apps/api` builds
- **Can Edit?** ✅ YES
- **Scenario — Add a new dependency build step:**
  ```json
  "dependsOn": ["^build", "lint"]  // Build deps, then run lint first
  ```
- **⚠️ Common Mistakes:**
  - Removing `^build` breaks dependency order (tests fail in CI)
  - Circular dependencies: App A build depends on App B, App B depends on App A (infinite loop)
- **Typical Edit:** Rarely

**Line: `"inputs": ["$TURBO_DEFAULT$", ".env*"]`**
- **What It Does:** Tell Turbo **which files matter for caching**
- **`$TURBO_DEFAULT$`** = Files Turbo automatically tracks:
  - Source files (src/**, tsconfig.json, etc.)
  - package.json
  - lock files
- **`.env*`** = Also track env files (if .env changes, rebuild)
- **Can Edit?** ✅ YES
- **Why?** If you change `.env`, build output changes; Turbo needs to know to invalidate cache
- **Example — Add more input files:**
  ```json
  "inputs": ["$TURBO_DEFAULT$", ".env*", "public/**" ]  // Also watch public/
  ```
- **⚠️ Common Mistakes:**
  - Not including `.env*` = cached builds ignore env changes (stale builds!)
  - Including too many files = cache invalidates constantly (defeats purpose)
- **Typical Edit:** Monthly

**Line: `"outputs": [".next/**", "!.next/cache/**", "dist/**"]`**
- **What It Does:** Tell Turbo **which folders to cache after build**
- **`.next/**`** = Next.js build output
- **`!.next/cache/**`** = Exception: DON'T cache .next/cache (exclamation = exclude)
  - Why? Cache files are framework-internal; caching defeats purpose
- **`dist/**`** = NestJS build output
- **Can Edit?** ✅ YES
- **When to Edit:** When adding new output folders
- **Example — Add Python dist folder for AI:**
  ```json
  "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
  ```
- **⚠️ Common Mistakes:**
  - Forgetting the `!` for cache exclusions (caches everything, breaks incremental builds)
  - Caching too aggressively (old artifacts remain)
- **Typical Edit:** Monthly

```json
    "dev": {
      "cache": false,
      "persistent": true
    },
```

**`tasks.dev` Section Explained:**

**Line: `"cache": false`**
- **What It Does:** Don't cache dev server output (dev server changes constantly)
- **Why?** Dev servers are not stateless; caching breaks hot-reload behavior
- **Can Edit?** ❌ NO — leave as `false` always
- **If You Change to `true`:** Dev server caches old code, hot-reload doesn't work

**Line: `"persistent": true`**
- **What It Does:** Keep dev server running even after other tasks complete
- **Why?** Dev server should stay up indefinitely
- **Can Edit?** ❌ NO — leave as `true` always
- **If You Change to `false`:** Dev server stops after initial start

```json
    "lint": {
      "dependsOn": ["^lint"]
    },
```

**`tasks.lint` Section Explained:**

**Line: `"dependsOn": ["^lint"]`**
- **What It Does:** Lint dependencies first before linting this package
- **Can Edit?** ✅ YES
- **Typical Edit:** Rarely
- **⚠️ Warning:** Circular lint dependencies lock up Turbo

```json
    "typecheck": {
      "dependsOn": ["^build"]
    },
```

**`tasks.typecheck` Section Explained:**

**Line: `"dependsOn": ["^build"]`**
- **What It Does:** TypeScript type-checking requires dependencies to be built first
- **Why?** Types from `shared-types` package must exist before type-checking `web`
- **Can Edit?** ✅ YES, but rarely
- **Typical Edit:** Never

```json
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env.test"]
    }
```

**`tasks.test` Section Explained:**

**Line: `"dependsOn": ["^build"]`**
- **What It Does:** Build dependencies before running tests
- **Why?** Tests need compiled code

**Line: `"inputs": ["$TURBO_DEFAULT$", ".env.test"]`**
- **What It Does:** Also track `.env.test` for cache invalidation
- **Why?** Tests might use test-specific environment variables
- **Can Edit?** ✅ YES
- **Example — Add test data files:**
  ```json
  "inputs": ["$TURBO_DEFAULT$", ".env.test", "tests/fixtures/**"]
  ```

---

## File 4: `.env.example` — Environment Variables Reference

**File Location:** `medicore-his/.env.example`  
**File Type:** Plain text (KEY=VALUE pairs)  
**Editable:** ✅ YES (frequently)  
**Generated:** ❌ NO  
**Purpose:** Document all environment variables needed; serves as template for `.env` (never commit real secrets)  
**Edit Frequency:** Weekly (when adding new services/features)

---

### FULL FILE BREAKDOWN

```
# MediCore HIS — Root Environment Variables
# Copy to .env and fill in real values. Never commit .env.
# See infra/env.template for full documentation.
```

**Section: Header Comments**
- **What It Does:** Explains file purpose
- **Can Edit?** ✅ YES (update comment if adding new service)
- **Typical Edit:** Monthly

```
# ─── Node ─────────────────────────────────────
NODE_ENV=development
```

**`NODE_ENV`**
- **What It Does:** Tells code whether running in development, staging, or production
- **Value:** `development` = Turn on hot-reload, verbose logging, disable optimizations
- **Can Edit?** ✅ YES
- **Possible Values:**
  - `development` = Dev machine, localhost, debugging enabled
  - `staging` = Pre-production server, tests enabled, limited logging
  - `production` = Live server, all optimizations on, error tracking enabled
- **Where It's Used:** 
  - Next.js: Disables optimization in dev mode
  - NestJS: Enables debug logging
  - FastAPI: Enables swagger UI (dev only)
- **⚠️ Common Mistakes:**
  - Setting to `production` on localhost (breaks hot-reload)
  - Setting to `development` on production server (massive security risk! verbose logs expose data)
- **Typical Edit:** Only change when moving between environments

```
# ─── API Server ───────────────────────────────
APP_PORT=3001
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

**`APP_PORT`**
- **What It Does:** Which port NestJS API listens on
- **Value:** `3001` = Port 3001 (Next.js on 3000, API on 3001)
- **Can Edit?** ✅ YES
- **When to Edit:** If port 3001 already in use
  - Change to: `APP_PORT=3002`
  - Update `NEXT_PUBLIC_API_URL` to match: `http://localhost:3002/api/v1`
- **⚠️ Common Mistakes:**
  - Changing port without updating NEXT_PUBLIC_API_URL (frontend can't reach API)
  - Using low ports (<1024) on Linux without `sudo` permission
- **Typical Edit:** Rarely (only if port conflict)

**`FRONTEND_URL`**
- **What It Does:** Tells API where the frontend is located (for CORS headers)
- **Value:** `http://localhost:3000` = Next.js runs on port 3000
- **Can Edit?** ✅ YES
- **When to Edit:** When deploying to production
  - Test: `FRONTEND_URL=https://medicore.example.com`
  - Production: `FRONTEND_URL=https://app.medicore.ma`
- **⚠️ Critical:** If mismatched, browser blocks API requests (CORS error)
- **Typical Edit:** Each deployment (dev/staging/prod)

**`ALLOWED_ORIGINS`**
- **What It Does:** CORS whitelist — which domains can make requests to API
- **Value:** `http://localhost:3000` = Allow only localhost:3000
- **Can Edit?** ✅ YES
- **When to Edit:** When deploying or allowing new frontends
- **Example Scenarios:**
  - Dev: `ALLOWED_ORIGINS=http://localhost:3000`
  - Staging: `ALLOWED_ORIGINS=https://staging.medicore.ma`
  - Multi-origin: `ALLOWED_ORIGINS=http://localhost:3000,https://medicore.ma,https://app.medicore.ma`
  - Open (dangerous!): `ALLOWED_ORIGINS=*`
- **⚠️ Critical Security Mistake:**
  - Setting `ALLOWED_ORIGINS=*` on production = ANY website can talk to your API
  - Attackers can steal patient data by embedding requests in malicious sites
- **Typical Edit:** Each environment

```
# ─── Database (PostgreSQL) ────────────────────
DATABASE_URL=postgresql://medicore:medicore@localhost:5432/medicore_dev
```

**`DATABASE_URL`**
- **What It Does:** Connection string for PostgreSQL
- **Format:** `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
  - `USER=medicore` = Database user
  - `PASSWORD=medicore` = User password (hardcoded here!!! only in dev)
  - `HOST=localhost` = Server hostname
  - `PORT=5432` = PostgreSQL default port
  - `DATABASE=medicore_dev` = Database schema name
- **Can Edit?** ✅ YES
- **When to Edit:** When connecting to different database
  - Staging: `postgresql://user:pass@staging-db.internal:5432/medicore_staging`
  - Production: Never hardcode! Use secret management
- **⚠️ CRITICAL SECURITY MISTAKE:**
  - **NEVER commit real `.env` with password to Git**
  - `.env` is in `.gitignore` for this reason
  - Use `.env.example` with placeholder values (like shown)
- **How to Get Real Database URL:**
  - On local: `pnpm db:up` creates container; use this URL
  - On staging/prod: Get from DevOps/Infrastructure team via secure channel
- **Typical Edit:** Each environment

```
# ─── Database (MongoDB) ───────────────────────
MONGODB_URI=mongodb://medicore:medicore@localhost:27017/medicore_dev?authSource=admin
```

**`MONGODB_URI`**
- **What It Does:** Connection string for MongoDB (used for unstructured data)
- **Format:** `mongodb://USER:PASSWORD@HOST:PORT/DATABASE?authSource=admin`
- **Can Edit?** ✅ YES
- **Same Rules as DATABASE_URL:** Never commit real password
- **Typical Edit:** Each environment

```
# ─── Cache (Redis) ────────────────────────────
REDIS_URL=redis://:medicore@localhost:6379
```

**`REDIS_URL`**
- **What It Does:** Connection string for Redis (in-memory cache)
- **Format:** `redis://:PASSWORD@HOST:PORT`
- **Can Edit?** ✅ YES
- **Why Redis?** Blazingly fast temporary data (session tokens, rate limit counters)
- **Typical Edit:** Each environment

```
# ─── JWT ──────────────────────────────────────
JWT_SECRET=change-me-in-production-must-be-at-least-32-characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

**`JWT_SECRET`**
- **What It Does:** Secret key used to sign/verify login tokens
- **Value:** Mine is obviously a placeholder; production = 32+ random characters
- **Can Edit?** ✅ YES
- **When to Edit:** Every deployment to different environment
  - Dev: Any string works
  - Staging: 32-char random string (never hardcode)
  - Production: 64-char random string from secure vault
- **How to Generate Safe JWT_SECRET:**
  ```bash
  # On Mac/Linux:
  openssl rand -base64 32
  # Output: 5gCp9K2jX8vL4mQ1nZ7rT9wS3bF2dE6jH8yU1vB4xC = use this
  ```
- **⚠️ CRITICAL:** If leaked, attackers forge fake login tokens
- **Typical Edit:** Each environment (never reuse between environments)

**`JWT_ACCESS_EXPIRES_IN`**
- **What It Does:** How long login token stays valid
- **Value:** `15m` = 15 minutes
- **Can Edit?** ✅ YES
- **When to Edit:** Based on security vs UX tradeoff
  - More secure: `"5m"` (forces re-login often)
  - More user-friendly: `"1h"` (fewer re-logins)
- **Typical Edit:** Yearly (during security audit)

**`JWT_REFRESH_EXPIRES_IN`**
- **What It Does:** How long refresh token stays valid (used to get new access token)
- **Value:** `7d` = 7 days
- **Can Edit?** ✅ YES
- **When to Edit:** Less frequently than access token
  - Short: `"7d"` Requires monthly login
  - Long: `"30d"` Requires quarterly login
- **Typical Edit:** Yearly

```
# ─── Patient Portal OTP (Dev only) ───────────
# DEVELOPMENT ONLY — NEVER SET IN PRODUCTION
# Optional fixed 6-digit OTP for local testing.
# Applied in non-production environments.
# DEV_OTP_CODE=123456
```

**`DEV_OTP_CODE` (commented out)**
- **What It Does:** Hardcoded OTP for testing patient login without SMS
- **Can Edit?** ✅ YES (but carefully!)
- **When to Edit:** 
  - ✅ Dev: `DEV_OTP_CODE=123456` (uncomment for testing)
  - ❌ Production: Remove this entire section!
- **⚠️ CRITICAL:** If left in production, anyone knows the OTP!
- **Typical Edit:** DEV ONLY

```
# ─── Next.js Public ───────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_AI_URL=http://localhost:8000
```

**`NEXT_PUBLIC_API_URL`**
- **What It Does:** Frontend's URL to reach API (sent to browser)
- **Prefix:** `NEXT_PUBLIC_` = Exposed in frontend JavaScript (not secret!)
- **Value:** `http://localhost:3001/api/v1` = Matches APP_PORT + API route prefix
- **Can Edit?** ✅ YES
- **When to Edit:** Every environment
  - Dev: `http://localhost:3001/api/v1`
  - Staging: `https://api.staging.medicore.ma/api/v1`
  - Prod: `https://api.medicore.ma/api/v1`
- **⚠️ Common Mistakes:**
  - Using wrong port (port mismatch = API not found)
  - Forgetting `/api/v1` prefix (requests go to wrong route)
- **Typical Edit:** Each deployment

**`NEXT_PUBLIC_AI_URL`**
- **What It Does:** Frontend's URL to reach AI service
- **Value:** `http://localhost:8000` = FastAPI runs on port 8000
- **Can Edit?** ✅ YES
- **When to Edit:** Same as API_URL, each environment
- **Typical Edit:** Each deployment

```
# ─── AI Sidecar ───────────────────────────────
OPENAI_API_KEY=sk-...
AI_PORT=8000
```

**`OPENAI_API_KEY`**
- **What It Does:** API key for OpenAI (GPT-4, embeddings, etc.)
- **Value:** `sk-...` = Placeholder (never commit real key!)
- **Can Edit?** ✅ YES
- **How to Get Real Key:**
  - Go to https://platform.openai.com/api-keys
  - Create key
  - Add to `.env` (never `.env.example`)
- **⚠️ CRITICAL:** Leaked key = $$ billed to your account
- **Typical Edit:** Once (per environment)

**`AI_PORT`**
- **What It Does:** Port where FastAPI AI service runs
- **Value:** `8000` = Standard FastAPI port
- **Can Edit?** ✅ YES
- **When to Edit:** If port 8000 conflicts
- **Typical Edit:** Rarely

```
# ─── File Storage (Cloudflare R2) ─────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=medicore-dev
R2_PUBLIC_URL=
```

**`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`**
- **What It Does:** Credentials for Cloudflare R2 (S3-compatible object storage)
- **Can Edit?** ✅ YES
- **When to Edit:** When setting up R2 account
- **How to Populate:**
  1. Create Cloudflare R2 account
  2. Generate API token
  3. Copy credentials to `.env` (never example file!)
- **⚠️ CRITICAL SECURITY:** Leaked credentials = Attackers upload/delete files
- **Typical Edit:** Once (initial setup)

**`R2_BUCKET_NAME`**
- **Value:** `medicore-dev` for dev, `medicore-staging` for staging, `medicore-prod` for production
- **Can Edit?** ✅ YES
- **Typical Edit:** Create new bucket per environment

**`R2_PUBLIC_URL`**
- **What It Does:** Base URL where uploaded files are publicly accessible
- **Example:** `https://cdn.medicore.ma` (files served via CloudFlare CDN)
- **Can Edit?** ✅ YES
- **Typical Edit:** Once per environment

```
# ─── Email (SendGrid) ─────────────────────────
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@medicore.ma

# ─── SMS (Twilio) ─────────────────────────────
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=+1...

# ─── Payments (Stripe) ────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── Monitoring (Sentry) ──────────────────────
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

**All External Service Credentials**
- **Pattern:** All follow same rules
- **Can Edit?** ✅ YES (in `.env`, never `.env.example`)
- **Never commit:** Real API keys, secrets, tokens
- **Process for New Service:**
  1. Add placeholder to `.env.example`
  2. Add real value to `.env` (which is `.gitignore`d)
  3. Reference in code
- **Typical Edit:** As new services are integrated

---

## File 5: `.gitignore` — Git Exclusions

**File Location:** `medicore-his/.gitignore`  
**File Type:** Plain text (glob patterns)  
**Editable:** ✅ YES (when adding new ignore patterns)  
**Generated:** ❌ NO  
**Purpose:** Tell Git which files/folders NOT to commit  
**Edit Frequency:** Monthly (when adding new build outputs or dev artifacts)

---

### FULL FILE BREAKDOWN

```
# Dependencies
node_modules/
.pnp
.pnp.js
```

**Section: Dependencies (auto-installed)**
- **`node_modules/`** = folder contains 250K+ files; never commit!
  - Why? Re-install via `pnpm install` (takes 30 seconds vs. huge repo size)
  - Git rule: Never commit auto-generated files
- **`.pnp`** = Plug'n'Play cache (pnpm optimization)
- **`.pnp.js`** = Plug'n'Play manifest
- **Can Edit?** ✅ YES (but don't remove these!)
- **If You Remove:** Everyone commits 250K+ tiny files (repo is 500MB, slow clone)
- **Typical Edit:** Never

```
# Build outputs
.next/
dist/
build/
out/
```

**Section: Build Outputs (generated by compilers)**
- **`.next/`** = Next.js build folder
- **`dist/`** = NestJS build folder
- **`build/`** = Generic build folder
- **`out/`** = Next.js static export folder
- **Why Ignore?** Regenerated every `pnpm build`; committing wastes space
- **Can Edit?** ✅ YES (but don't remove)
- **Typical Edit:** Never

```
# Python
__pycache__/
*.pyc
*.pyo
.venv/
venv/
*.egg-info/
```

**Section: Python artifacts**
- **`__pycache__/`** = Python's compiled bytecode cache
- **`*.pyc`, `*.pyo`** = Compiled Python files
- **`.venv/`, `venv/`** = Virtual environment folders (250K+ files!)
- **`*.egg-info/`** = Package metadata
- **Can Edit?** ✅ YES
- **When to Edit:** If you add new Python directories
  ```gitignore
  # Add below .venv:
  poetry.lock        # If using poetry instead of pip
  .pytest_cache/     # If adding pytest
  ```
- **Typical Edit:** Yearly

```
# Environment — never commit real secrets
.env
.env.local
.env.*.local
!.env.example
```

**Section: Environment Files**
- **`.env`** = Real secrets (passwords, API keys)
- **`.env.local`** = Local dev overrides
- **`.env.*.local`** = Environment-specific overrides (`.env.prod.local`, etc.)
- **`!.env.example`** = Exception: DO commit `.env.example` (template, no secrets)
  - Exclamation means "but DO ignore this rule for this pattern"
- **Can Edit?** ✅ YES (but very carefully)
- **Critical Rule:** NEVER remove `.env` from gitignore!
  ```bash
  # BAD: Committed real secrets
  git add .env && git commit
  # Even if you push then delete, secrets are in Git history forever!
  # Attacker clones, reads Git history, finds API keys
  ```
- **Typical Edit:** Never

```
# Turbo
.turbo/
```

**Section: Task Orchestrator**
- **`.turbo/`** = Turbo's internal cache
- **Can Edit?** ✅ YES (but don't remove)
- **Typical Edit:** Never

```
# Testing
coverage/
.nyc_output
```

**Section: Test Coverage Reports**
- **`coverage/`** = Code coverage HTML reports
- **`.nyc_output`** = Istanbul test reporter output
- **Can Edit?** ✅ YES
- **When to Edit:** If using different test reporter
  - Add: `jest_coverage/` (if using Jest)
- **Typical Edit:** Yearly

```
# Editor
.vscode/settings.json
.idea/
*.swp
*.swo
```

**Section: Editor/IDE Artifacts**
- **`.vscode/settings.json`** = VS Code workspace settings (personal to developer!)
- **`.idea/`** = IntelliJ IDEA cache
- **`*.swp`, `*.swo`** = Vim swap files
- **Can Edit?** ✅ YES
- **When to Edit:** If using different editor
  - Add: `*.sublime-project` (Sublime Text)
  - Add: `.vim/` (Vim cache)
- **Typical Edit:** Once (when setting up repo for new editor)

```
# OS
.DS_Store
Thumbs.db
```

**Section: Operating System Artifacts**
- **`.DS_Store`** = macOS folder metadata
- **`Thumbs.db`** = Windows thumbnail cache
- **Can Edit?** ✅ YES (but don't remove)
- **Typical Edit:** Never

```
# Prisma
prisma/dev.db
prisma/dev.db-journal
```

**Section: Database Files**
- **`prisma/dev.db`** = SQLite dev database file (generated by migrations)
- **`prisma/dev.db-journal`** = SQLite journal (temporary file during transactions)
- **Can Edit?** ✅ YES
- **When to Edit:** If using PostgreSQL (remove these, PostgreSQL is remote)
- **Typical Edit:** Rarely

```
# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*
yarn-error.log
```

**Section: Log Files**
- **`logs/`** = Application log folder
- **`*.log`** = Any log file
- **`*debug.log*`, `*error.log`** = Package manager logs
- **Can Edit?** ✅ YES (but don't remove)
- **Why Ignore?** Logs contain timestamps, request IDs (non-deterministic); waste space
- **Typical Edit:** Never

---

## File 6: `.dockerignore` — Docker Build Exclusions

**File Location:** `medicore-his/.dockerignore`  
**File Type:** Plain text (glob patterns)  
**Editable:** ✅ YES (when optimizing Docker image size)  
**Generated:** ❌ NO  
**Purpose:** Exclude files from Docker build context (reduces image size & build time)  
**Edit Frequency:** Rarely (once per build optimization)

---

### FULL FILE BREAKDOWN

```
**/node_modules
**/.next
**/dist
**/.turbo
**/.cache
**/coverage
.git
```

**Understanding Docker Ignore:**
- When Docker builds an image, it first copies build context (all files in folder)
- Then uses Dockerfile to build
- `.dockerignore` tells Docker "skip these files" before copying
- **Reduces build time + image size**

**Line: `**/node_modules`**
- **What It Does:** Exclude node_modules from EVERY folder
- **Pattern:** `**` = any depth, `node_modules` = folder name
- **Example Matches:**
  - `node_modules/` (root)
  - `apps/web/node_modules/`
  - `apps/api/node_modules/`
  - `packages/shared-types/node_modules/`
- **Why Exclude?** 
  - Building Docker image requires `pnpm install` anyway (to get correct versions)
  - Committing node_modules into image wastes 500MB+
- **Can Edit?** ❌ NO — NEVER remove this!
- **If You Remove:** Docker image bloats from 200MB to 2GB+
- **Typical Edit:** Never

**Line: `**/.next`**
- **What It Does:** Exclude Next.js build cache from Docker
- **Why Exclude?** Will rebuild inside container anyway
- **Can Edit?** ❌ NO
- **Typical Edit:** Never

**Line: `**/.dist`**
- **What It Does:** Exclude compiled output from Docker build context
- **Why?** Will compile inside container during build stage
- **Can Edit?** ❌ NO
- **Typical Edit:** Never

**Line: `**/.turbo`**
- **What It Does:** Exclude Turbo's internal task cache
- **Why?** Cache not needed in Docker build
- **Can Edit?** ❌ NO
- **Typical Edit:** Never

**Line: `**/.cache`, `**/coverage`**
- **What It Does:** Exclude development caches and test coverage reports
- **Can Edit?** ❌ NO
- **Typical Edit:** Never

**Line: `.git`**
- **What It Does:** Exclude the entire `.git` folder (Git history, commit objects)
- **Why Exclude?** 
  - Not needed inside container
  - Git history is 500MB+ on large projects
  - Docker image would be bloated
- **Can Edit?** ❌ NO — ALMOST ALWAYS exclude .git
- **Exception:** If you need Git history inside container for version tagging
  ```dockerignore
  # If you need version from git describing commits:
  # Remove the .git exclusion
  # But understand image will be much larger
  ```
- **Typical Edit:** Never

---

---

# PART 2: WEB APP (NEXT.JS) CONFIGURATION

## File 7: `apps/web/tsconfig.json` — TypeScript Configuration for Next.js

**File Location:** `medicore-his/apps/web/tsconfig.json`  
**File Type:** JSON  
**Editable:** ✅ YES (when adding new paths or changing strict mode)  
**Generated:** ❌ NO  
**Purpose:** Configure TypeScript compiler behavior for Next.js  
**Edit Frequency:** Rarely (quarterly when adding new path aliases)

---

### FULL FILE BREAKDOWN

```json
{
  "compilerOptions": {
```

**Opening:** Start of TypeScript compiler configuration

```json
    "lib": ["dom", "dom.iterable", "esnext"],
```

**`lib` (Library/API availability)**
- **What It Does:** Tell TypeScript which JavaScript APIs are available
- **`dom`** = Browser APIs (window, document, Element, etc.)
- **`dom.iterable`** = Iterable support (for...of loops on NodeLists)
- **`esnext`** = Latest JavaScript syntax (Promise, async/await, symbols, etc.)
- **Can Edit?** ✅ YES (but rarely)
- **When to Edit:** If targeting older browsers
  ```json
  // For IE11: "lib": ["es2015", "dom"]
  // For modern: "lib": ["es2020", "dom"]
  ```
- **Why Current Setup?** Next.js is browser-first; `esnext` assumes modern JavaScript
- **Typical Edit:** Never (current config is best for Next.js)

```json
    "allowJs": true,
```

**`allowJs`**
- **What It Does:** Allow TypeScript to compile `.js` files (not just `.ts`)
- **Can Edit?** ✅ YES
- **Why `true`?** Allows gradual TypeScript migration (some files `.js`, some `.ts`)
- **If You Change to `false`:** `.js` files are treated as plain JavaScript (no type checking)
- **Typical Edit:** Never (usually `true` for flexibility)

```json
    "skipLibCheck": true,
```

**`skipLibCheck`**
- **What It Does:** Skip type-checking of `.d.ts` type definition files
- **Value:** `true` = Fast compilation (don't check library types)
- **Can Edit?** ❌ NO — Leave as `true`
- **Why?** Type definitions are maintained by package authors; checking them is slow
- **If You Change to `false`:** Compilation 3x slower; catches bugs in library types (rare)
- **Typical Edit:** Never

```json
    "strict": true,
```

**`strict`** — THE MOST IMPORTANT SETTING
- **What It Does:** Enable ALL strict type-checking rules
- **Equivalent To:**
  - `noImplicitAny: true` (function params must have types)
  - `strictNullChecks: true` (catch null/undefined bugs)
  - `strictFunctionTypes: true` (function param types must match exactly)
  - `strictPropertyInitialization: true` (class properties must be initialized or optional)
  - Many more...
- **Can Edit?** ✅ YES (but think carefully!)
- **Scenarios:**
  - ✅ New project: `strict: true` (catch bugs early)
  - ⚠️ Legacy project with type errors: Start with `false`, gradually fix, then enable
  - ❌ Never disable `strict` to "just make it compile"
- **Common Bug Without Strict:**
  ```typescript
  // Without strict, this compiles (bad!):
  const user: { name: string } = null;  // null assigned to non-nullable type!
  console.log(user.name);  // CRASH: Cannot read property 'name' of null
  ```
  With `strict: true`, TypeScript catches this at compile time.
- **Typical Edit:** Very rarely (only for big refactors)

```json
    "noEmit": true,
```

**`noEmit`**
- **What It Does:** Don't generate `.js` files (only check types)
- **Value:** `true` = TypeScript only checks types; Next.js handles publishing
- **Why?** Next.js has its own build system; TSC shouldn't compete with it
- **Can Edit?** ❌ NO — Leave as `true`
- **If You Change to `false`:** TypeScript generates `.js` files, conflicting with Next.js build
- **Typical Edit:** Never

```json
    "esModuleInterop": true,
```

**`esModuleInterop`**
- **What It Does:** Allow importing CommonJS modules as ES6 defaults
- **Example:**
  ```typescript
  // With esModuleInterop: true:
  import React from 'react';  // Works!
  
  // Without it, you'd need:
  import * as React from 'react';  // Cumbersome
  ```
- **Can Edit?** ❌ NO — Leave as `true`
- **Why?** Makes imports more intuitive; prevents annoying `.default` suffixes
- **Typical Edit:** Never

```json
    "module": "esnext",
```

**`module`**
- **What It Does:** Which module syntax TypeScript outputs
- **`esnext`** = Use whatever JavaScript syntax is newest
- **Can Edit?** ❌ NO — Leave as `esnext`
- **Why?** Lets build tools (Next.js, Webpack) handle transpilation
- **Other Options (rarely used):**
  - `commonjs` = Old Node.js syntax (for backend)
  - `es2020` = ES2020 modules
- **Typical Edit:** Never

```json
    "moduleResolution": "bundler",
```

**`moduleResolution`**
- **What It Does:** How TypeScript finds imports (`import X from 'y'`)
- **`bundler`** = Modern approach used by Next.js/Webpack/Vite
- **Can Edit?** ❌ NO — Leave as `bundler`
- **Alternatives (rarely used):**
  - `node` = Node.js style (for backend)
  - `classic` = Old, deprecated
- **Typical Edit:** Never

```json
    "resolveJsonModule": true,
```

**`resolveJsonModule`**
- **What It Does:** Allow importing `.json` files as modules
- **Example:**
  ```typescript
  import config from './config.json';  // TypeScript allows this
  ```
- **Can Edit?** ❌ NO — Leave as `true`
- **Why?** Useful for configuration, fixtures, etc.
- **Typical Edit:** Never

```json
    "isolatedModules": true,
```

**`isolatedModules`**
- **What It Does:** Ensure each file can be compiled independently (no cross-file types)
- **Why?** Allows faster incremental builds; needed for Babel/esbuild
- **Can Edit?** ❌ NO — Leave as `true`
- **When You Need This:** TypeScript code that won't work with bundlers
- **Typical Edit:** Never

```json
    "jsx": "preserve",
```

**`jsx`**
- **What It Does:** How TypeScript handles JSX (React syntax)
- **`preserve`** = Keep JSX as-is; let Next.js transpile it
- **Can Edit?** ❌ NO — Leave as `preserve`
- **Alternatives:**
  - `react` = Convert JSX to React.createElement (old)
  - `react-jsx` = React 17+ JSX transform
- **Why `preserve`?** Lets Next.js use its own JSX handling
- **Typical Edit:** Never

```json
    "incremental": true,
```

**`incremental`**
- **What It Does:** Save TypeScript compiler state between runs (faster rebuilds)
- **Value:** `true` = Cache compiler state in `.tsbuildinfo`
- **Can Edit?** ❌ NO — Leave as `true`
- **Benefit:** Hot-reload 2x faster
- **Typical Edit:** Never

```json
    "plugins": [{ "name": "next" }],
```

**`plugins`**
- **What It Does:** Enable Next.js TypeScript plugin for Next.js-specific features
- **Plugin Name:** `"next"` = Official Next.js plugin
- **Provides:**
  - Type-checking for Next.js API routes
  - Type-safe `getServerSideProps`, `getStaticProps`
  - Validation of `/pages` and `/app` structure
- **Can Edit?** ❌ NO — Leave as-is
- **If You Remove:** Lose Next.js-specific type safety
- **Typical Edit:** Never

```json
    "paths": {
      "@/*": ["./src/*"],
      "@medicore/shared-types": ["../../packages/shared-types/src/index.ts"]
    }
```

**`paths`** — Module Aliases (VERY IMPORTANT)
- **What It Does:** Define shortcuts for imports (avoid `../../../` hell)
- **`@/*` → `./src/*`** = Can use `import Button from '@/components/Button'`
  - Alternative: `import Button from '../../../components/Button'`
  - Aliases make refactoring easy (move files, imports still work)
- **`@medicore/shared-types` → `../../packages/shared-types/src/index.ts`**
  - Allows: `import { User } from '@medicore/shared-types'`
  - Without alias: `import { User } from '../../../packages/shared-types/src'` (fragile!)
- **Can Edit?** ✅ YES (when adding new packages/folders)
- **When to Edit:** 
  - Add new shared package: Create path
  - Add new src subfolder: Can keep using `@/`
- **Example — Add Utils Folder:**
  ```json
  "paths": {
    "@/*": ["./src/*"],
    "@/utils/*": ["./src/utils/*"],  // NEW
    "@medicore/shared-types": ["../../packages/shared-types/src/index.ts"]
  }
  ```
- **Common Alias Patterns:**
  - `@/*` for everything in src/
  - `@ui/*` for specific folders that need shorter paths
  - `@medicore/...` for monorepo packages
- **Typical Edit:** Monthly (when adding packages)

```json
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`include`** — Files to Type-Check
- **`next-env.d.ts`** = Next.js auto-generated types
- **`**/*.ts`** = All TypeScript files (recursively)
- **`**/*.tsx`** = All React/JSX files
- **`.next/types/**/*.ts`** = Next.js build output types
- **Can Edit?** ✅ YES (but rarely)
- **When to Edit:** If adding new file types
  ```json
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", "**/*.graphql"]
  ```
- **Typical Edit:** Never

**`exclude`** — Files to Skip
- **`node_modules`** = Don't type-check 3rd party libraries
- **Can Edit?** ✅ YES
- **When to Edit:** If you have folders to skip
  ```json
  "exclude": ["node_modules", "dist", ".next"]
  ```
- **Typical Edit:** Rarely

---

## File 8: `apps/web/next.config.js` — Next.js Runtime Configuration

**File Location:** `medicore-his/apps/web/next.config.js`  
**File Type:** JavaScript  
**Editable:** ✅ YES (frequently for integrations)  
**Generated:** ❌ NO  
**Purpose:** Configure Next.js build behavior, performance, and external integrations  
**Edit Frequency:** Monthly (when adding features, images, server functions)

---

### FULL FILE BREAKDOWN

```javascript
/** @type {import('next').NextConfig} */
```

**JSDoc Type Hint**
- Tells your IDE that `nextConfig` object is type-safe
- Can Edit? No (just a comment)

```javascript
const nextConfig = {
```

**Configuration Object Start**

```javascript
  transpilePackages: ["@medicore/shared-types"],
```

**`transpilePackages`** — Configure Monorepo Packages
- **What It Does:** Tell Next.js to transpile (compile) these monorepo packages
- **`"@medicore/shared-types"`** = This monorepo package needs compilation
- **Why?** Monorepo packages might be `.ts` files; Next.js needs to transpile to `.js`
- **Can Edit?** ✅ YES
- **When to Edit:** When adding new monorepo packages
  ```javascript
  transpilePackages: ["@medicore/shared-types", "@medicore/shared-ui"],  // If you add UI package
  ```
- **⚠️ Common Mistakes:**
  - Missing this = Import errors when using monorepo packages
  - Too many = Slow builds (only include packages that need it)
- **Typical Edit:** Every 6 months (as you add new shared packages)

```javascript
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
```

**`experimental.serverActions.allowedOrigins`** — Security
- **What It Does:** Whitelist which hosts can call Next.js Server Actions
- **`"localhost:3000"`** = Only localhost:3000 allowed (dev only!)
- **Why?** Prevents CSRF attacks (cross-site request forgery)
  - Without whitelist: Malicious site can forge requests to your app
- **Can Edit?** ✅ YES
- **When to Edit:** Every deployment
  - Dev: `["localhost:3000"]`
  - Staging: `["staging.medicore.ma"]`
  - Prod: `["app.medicore.ma", "medicore.ma"]`  (supports multiple origins)
- **Example Production Config:**
  ```javascript
  allowedOrigins: [
    "app.medicore.ma",
    "www.medicore.ma"
  ]
  ```
- **⚠️ CRITICAL SECURITY:** If you set `["*"]`, CSFR attacks work!
- **Typical Edit:** Each environment

```javascript
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
    ],
  },
```

**`images.remotePatterns`** — Image Optimization
- **What It Does:** Allow Next.js to optimize images from external domains
- **Configuration:**
  - `protocol: "https"` = Only allow HTTPS (not HTTP, security)
  - `hostname: "**.r2.cloudflarestorage.com"` = Allow Cloudflare R2 domain
    - `**` = Wildcard (any subdomain, any bucket)
    - Without whitelist: Next.js blocks external images (for security)
- **Can Edit?** ✅ YES
- **When to Edit:**  When adding new image providers
  ```javascript
  remotePatterns: [
    {
      protocol: "https",
      hostname: "**.r2.cloudflarestorage.com",
    },
    {
      protocol: "https",
      hostname: "img.example.com",  // NEW: Add another domain
    },
  ]
  ```
- **⚠️ Security Warning:** Be specific with hostnames!
  - ❌ Bad: `hostname: "*"` (allow any domain, defeats protection)
  - ✅ Good: `hostname: "cdn.example.com"` (exact domain)
- **Typical Edit:** When integrating new CDN or image service

```javascript
};

module.exports = nextConfig;
```

**Export Configuration**
- Standard Node.js module export
- Can Edit? No

---

---

# PART 3: API (NESTJS) CONFIGURATION

## File 9: `apps/api/tsconfig.json` — TypeScript for NestJS Backend

**File Location:** `medicore-his/apps/api/tsconfig.json`  
**File Type:** JSON  
**Editable:** ✅ YES (when adding decorators, changing compilation)  
**Generated:** ❌ NO  
**Purpose:** Configure TypeScript compiler for NestJS (backend differs from frontend)  
**Edit Frequency:** Rarely (yearly when upgrading NestJS)

---

### KEY DIFFERENCES FROM WEB TSCONFIG

The API tsconfig is for **backend** (Node.js), not browser. Main differences:

```json
{
  "compilerOptions": {
    "module": "commonjs",
```

**`module: "commonjs"`** — NOT `esnext`!
- **Reason:** Backend (Node.js) traditionally uses CommonJS
- **Difference from Web:**
  - Web: `"esnext"` (let bundler handle it)
  - API: `"commonjs"` (Node.js natively understands CommonJS)
- **Can Edit?** ❌ NO — NestJS requires CommonJS
- **Why Not ESM?** Some NestJS plugins don't support ES modules yet
- **Typical Edit:** Never

```json
    "declaration": true,
```

**`declaration`**
- **What It Does:** Generate `.d.ts` type definition files
- **Why?** When other packages import from this API, they need types
- **Example:** `packages/shared-types` imports from API → needs `.d.ts`
- **Can Edit?** ❌ NO — Leave as `true`
- **Typical Edit:** Never

```json
    "removeComments": true,
```

**`removeComments`**
- **What It Does:** Strip TypeScript comments from compiled `.js` (smaller output)
- **Can Edit?** ✅ YES
- **When to Edit:**
  - Keep `true` for production (smaller file size)
  - Change to `false` if debugging compiled code
- **Typical Edit:** Rarely

```json
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
```

**`emitDecoratorMetadata` & `experimentalDecorators`**
- **What It Does:** Enable TypeScript decorator syntax (NestJS uses these heavily!)
- **Example NestJS Decorator:**
  ```typescript
  @Controller('users')  // This is a decorator
  export class UsersController {
    @Get(':id')  // This too
    findOne(@Param('id') id: string) { }
  }
  ```
- **Can Edit?** ❌ NO — NestJS requires both `true`
- **If You Change to `false`:** Decorators don't work; NestJS breaks
- **Typical Edit:** Never

```json
    "allowSyntheticDefaultImports": true,
```

**`allowSyntheticDefaultImports`**
- **What It Does:** Allow `import X from 'y'` syntax for CommonJS
- **Why?** Makes backend imports consistent with frontend
- **Without It:** Would need `import * as X from 'y'`
- **Can Edit?** ❌ NO — Leave as `true`
- **Typical Edit:** Never

```json
    "target": "ES2021",
```

**`target`**
- **What It Does:** Compile to this JavaScript version
- **`ES2021`** = 2021 JavaScript features (async/await, promises, etc.)
- **Why ES2021?** Node.js 20 (specified in package.json) supports it
- **Can Edit?** ✅ YES
- **When to Edit:** When upgrading Node.js version
  - Node 18: `target: "ES2020"`
  - Node 20: `target: "ES2021"`
  - Node 22: `target: "ES2022"`
- **Get Current Node:**
  ```bash
  node --version  # v20.10.0 → use ES2021
  ```
- **Typical Edit:** Yearly (when upgrading Node)

```json
    "sourceMap": true,
```

**`sourceMap`**
- **What It Does:** Generate `.map` files (for debugging)
- **Why?** When error occurs, shows original TypeScript line (not compiled `.js` line)
- **Example:**
  ```
  Error at line 42 (compiled JS) 
  → Maps back to line 18 (original TS)
  → Shows you the actual code
  ```
- **Can Edit?** ✅ YES
- **When to Edit:**
  - Dev: `true` (debugging aids)
  - Production: Can be `false` (smaller bundle, slower debugging)
- **Typical Edit:** Never (keep `true` for easier debugging)

```json
    "outDir": "./dist",
    "rootDir": "./src",
```

**`outDir` & `rootDir`**
- **`outDir: "./dist"`** = Compiled files go to `dist/` folder
- **`rootDir: "./src"`** = Source files are in `src/` folder
- **Can Edit?** ✅ YES
- **When to Edit:** If you reorganize folders (rare!)
- **Typical Edit:** Never

```json
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
```

**`incremental`, `skipLibCheck`, `strict`**
- Same meaning as Web tsconfig (see earlier)
- Can Edit? Same recommendations as web

```json
    "noImplicitAny": true,
    "strictNullChecks": true,
    ...
```

**Additional Strict Checks**
- Explicitness: Every function param needs type
- Null safety: Can't use null where object expected
- Can Edit? Rarely; keep all `true`

```json
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

**`include` & `exclude`**
- `include`: Type-check `src/` files
- `exclude`: Skip node_modules, dist, test
- Can Edit? Yes, rarely

---

---

# EDIT SAFETY RULES & COMMON MISTAKES

## Golden Rules Summary

| Category | Rule | Penalty if Broken |
|----------|------|--------------------------|
| **Secrets** | Never commit `.env` to Git | Attackers steal API keys |
| **Dependencies** | Always use `pnpm` (not npm/yarn) | Monorepo breaks; lock files misaligned |
| **Port Numbers** | When changing port, **update all references** | Frontend can't reach backend |
| **Environment-Specific** | Different values per env (dev/staging/prod) | Wrong config deployed |
| **Database URLs** | **Always use real connection strings from DevOps** | Can't connect to DB |
| **JSON Syntax** | Check for typos, missing commas, unquoted keys | Config silently ignored or error |
| **CORS** | Whitelist exact domains; never use `*` in production | Security breach |
| **Paths Aliases** | Keep consistent; use same prefix style | Import errors |

##Common Mistakes Reference

### ❌ MISTAKE #1: Committing `.env` with Real Secrets

```bash
# BAD:
git add .env && git commit -m "add env"  
# Even if deleted later, secrets remain in Git history!
```

**Fix:**
```bash
# Delete from recent commits:
git filter-branch --tree-filter 'rm -f .env' HEAD
# Force push
git push origin master --force
```

---

### ❌ MISTAKE #2: Changing Port Without Updating All References

**Scenario:** Change `APP_PORT=3001` to `APP_PORT=3002`

**Wrong Way:**
```diff
- APP_PORT=3001
+ APP_PORT=3002
# But don't update NEXT_PUBLIC_API_URL
```

**Result:** Frontend still tries `http://localhost:3001` → API not found → 404 errors

**Correct Way:**
```diff
- APP_PORT=3001
+ APP_PORT=3002

- NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
+ NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

---

### ❌ MISTAKE #3: Removing Critical Dependencies

**Scenario:** Remove `turbo` from devDependencies because "we don't use it"

**Wrong Way:**
```json
// In package.json:
- "turbo": "^2.1.3",
// Then run: pnpm install && pnpm dev
// FAIL: "turbo: command not found"
```

**Correct Way:**
```bash
# Check if anything depends on it:
grep -r "turbo" scripts/  # See which scripts use it
# See: "dev": "turbo dev", "build": "turbo build", etc.
# KEEP IT!
```

---

### ❌ MISTAKE #4: JSON Syntax Error (Missing Comma)

```json
{
  "name": "medicore-his",
  "version": "0.1.0"  // ← Missing comma here!
  "private": true     // ← Syntax error, whole file invalid
}
```

**Fix:**
```json
{
  "name": "medicore-his",
  "version": "0.1.0",  // ← Add comma
  "private": true
}
```

---

### ❌ MISTAKE #5: Glob Pattern Wrong in .gitignore

```
# WRONG: Only ignores node_modules in root
node_modules

# CORRECT: Ignores node_modules at any depth
**/node_modules
```

---

### ❌ MISTAKE #6: CORS Wildcard in Production

```javascript
// DANGEROUS:
allowedOrigins: ["*"]  // ANY site can make requests!
// Attacker creates malicious.com that steals patient data
```

**Fix:**
```javascript
allowedOrigins: ["app.medicore.ma", "www.medicore.ma"]
```

---

### ❌ MISTAKE #7: Using Wrong pnpm Version

**You have:**
```json
"packageManager": "pnpm@10.28.2"
```

**But your local pnpm:**
```bash
$ pnpm --version
9.1.0  # ← Mismatch!
```

**Result:** Weird lock file issues, dependency conflicts

**Fix:**
```bash
npm install -g pnpm@10.28.2
```

---

### ❌ MISTAKE #8: Not Updating Path Alias When Moving File

**Original:**
```json
"paths": {
  "@medicore/shared-types": ["../../packages/shared-types/src/index.ts"]
}
```

**You move shared-types to a different location**

**But forget to update tsconfig.json**

**Result:** `import { User } from '@medicore/shared-types'` fails; can't find module

---

## Verification Checklist Before Committing Config Changes

```bash
# 1. Syntax check
pnpm typecheck

# 2. Build check
pnpm build

# 3. Development check
pnpm dev

# 4. No console errors
# Open browser, check Network & Console tabs

# 5. Environment consistency
# Dev: PORT=3000/3001 in .env.example
# Prod: PORT=5000+ in real .env (never in example)

# 6. No secrets in .env.example
# Grep for real API keys, passwords, JWT secrets
grep -E "(sk_|password|secret)" .env.example
# Should return only placeholders like "sk_test_..." or "change-me"
```

---

## When Files Require Installation/Restart

| File Change | Action Required |
|-------------|------------------|
| `package.json` (dependencies) | `pnpm install` |
| `pnpm-workspace.yaml` | `pnpm install` |
| `.env` changes | Restart dev server |
| `tsconfig.json` | May need IDE reload |
| `turbo.json` | Clear cache: `rm -rf .turbo` then restart |
| `next.config.js` | Restart dev server |
| `nest.cli.json` | Restart API server |

---

## Edit Workflow Summary

### Before Editing Any Config File:

1. **Read this file**  ← You're doing this!
2. **Understand what you're changing** ← Check the explanation above
3. **Edit ONE value at a time** ← Don't change 5 things at once
4. **Save, run verification checklist** ← Test immediately
5. **Only then commit if no errors** ← One commit per logical change

### Example Safe Edit:

```bash
# STEP 1: Test current state
pnpm dev  # Works? Good.

# STEP 2: Edit one value in .env
NODE_ENV=development  # Change here
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1  # And here (related)

# STEP 3: Save file
ctrl+s

# STEP 4: Restart dev server
# In terminal: ctrl+c, then:
pnpm dev

# STEP 5: Test in browser
open http://localhost:3000
# Check Network tab to see if API calls work

# STEP 6: Commit only if working
git add .env.example  # Only example file!
git commit -m "chore: update API port to 3001"
```

---

## Questions to Ask Before Editing

Before changing any config file, ask yourself:

1. ❓ **Am I changing the right file?**
   - Example: Change API port in `.env`, not `turbo.json`

2. ❓ **Will this break other files?**
   - Example: Change `APP_PORT`, must also update `NEXT_PUBLIC_API_URL`

3. ❓ **Is this value environment-specific?**
   - Yes → Put in `.env` (NOT `.env.example`)
   - No → Can go in `.env.example`

4. ❓ **Does anything else reference this value?**
   - `grep value` across all files to find references

5. ❓ **What's the worst that can happen?**
   - If critical → Test thoroughly, get code review
   - If minor → Safe to test

---

## Key Takeaways

✅ **DO:**
- Edit `.env` (secret) → Not `.env.example`
- Edit `package.json` scripts → Very often
- Update config per environment → Always
-

 Commit `.env.example` → Yes, as template
- Use path aliases → For cleaner imports
- Test immediately after changes → Don't batch edits

❌ **DON'T:**
- Commit real `.env` → Use `.gitignore`
- Change port without updating references → Create mismatches
- Use wildcard `*` in CORS → Open to attacks
- Ignore TypeScript errors → They predict runtime failures
- Edit multiple things at once → Can't debug which broke

---

## Next Steps

**You Now Know:**
✅ What each line does  
✅ When and how to safely edit it  
✅ What breaks if you change it wrong  
✅ Verification process after changes  

**To Keep Learning:**
- Ask DevOps/Platform team for config questions
- Read official docs for each tool (Next.js, NestJS, TypeScript, Turbo)
- Keep this document as reference while editing

---

**End of Course**

*Last Updated: April 14, 2026*  
*Status: Complete & Verified*
