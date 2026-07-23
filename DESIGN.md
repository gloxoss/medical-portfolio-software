# Design System: MediCore HIS

> Adapted from [Linear](https://linear.app)'s design system. Dark-mode-native, precision-engineered UI for clinical workflows. The Linear DNA (Inter Variable, luminance stacking, semi-transparent borders) is preserved; the brand accent shifts from Linear's indigo-violet to MediCore's **clinical teal** palette — communicating trust, health, and precision.

---

## 1. Visual Theme & Atmosphere

MediCore HIS is a **dark-mode-first clinical workspace** — a near-black canvas where patient data, encounter forms, and dashboards emerge with surgical clarity. The design philosophy: **clinical precision meets modern SaaS elegance**. Every element exists in a carefully calibrated hierarchy of luminance. This isn't a dark theme bolted onto a white design — darkness is the native medium, reducing eye strain during long clinical shifts and creating focus on the data that matters most.

The typography is built entirely on **Inter Variable** with OpenType features `"cv01", "ss03"` enabled globally, giving the typeface a cleaner, more geometric character. Headlines use aggressive negative letter-spacing for compressed authority. **Berkeley Mono** serves as the monospace companion for clinical codes (ICD-10, MRN numbers, lab values).

The color system is **almost entirely achromatic** — dark backgrounds with white/gray text — punctuated by two functional accents:
- **Clinical Teal** (`#0EA5E9` / `#38BDF8`) — primary interactive accent: CTAs, active states, links, selected items
- **Medical Green** (`#22C55E`) — success, health, vitals normal, encounter signed-off

Status colors (amber, red, emerald) are used **only** for clinical meaning — abnormal lab values, urgent alerts, triage urgency.

**Key Characteristics:**
- Dark-mode-native: `#09090B` marketing/app background, `#0F1117` sidebar, `#18181B` elevated surfaces
- Inter Variable with `"cv01", "ss03"` globally
- Signature weight 510 (between regular and medium) for most UI text
- Aggressive negative letter-spacing at display sizes
- Clinical teal: `#0EA5E9` (bg) / `#38BDF8` (accent) / `#7DD3FC` (hover)
- Semi-transparent white borders: `rgba(255,255,255,0.06)` to `rgba(255,255,255,0.10)`
- Luminance stacking for depth (deeper = darker, elevated = lighter)
- Light mode available: clean white `#FAFAFA` with slate-900 text (for clinical printing contexts)

---

## 2. Color Palette & Roles

### Background Surfaces (Dark Mode — Default)
| Token | Hex | Role |
|-------|-----|------|
| `--bg-base` | `#09090B` | Deepest background — the app canvas |
| `--bg-sidebar` | `#0F1117` | Sidebar and navigation panels |
| `--bg-surface` | `#18181B` | Cards, dropdowns, elevated containers |
| `--bg-elevated` | `#27272A` | Hover states, secondary surfaces, tooltips |
| `--bg-input` | `rgba(255,255,255,0.03)` | Input backgrounds — translucent |
| `--bg-card` | `rgba(255,255,255,0.04)` | Card backgrounds — translucent |

### Background Surfaces (Light Mode)
| Token | Hex | Role |
|-------|-----|------|
| `--bg-base-light` | `#FAFAFA` | Page background |
| `--bg-sidebar-light` | `#F4F4F5` | Sidebar |
| `--bg-surface-light` | `#FFFFFF` | Cards |
| `--bg-elevated-light` | `#F4F4F5` | Hover, secondary |

### Text & Content
| Token | Hex | Role |
|-------|-----|------|
| `--text-primary` | `#F4F4F5` | Primary text — near-white (dark mode) |
| `--text-secondary` | `#D4D4D8` | Body text, descriptions |
| `--text-tertiary` | `#A1A1AA` | Placeholders, metadata, timestamps |
| `--text-muted` | `#71717A` | De-emphasized, disabled, subtle labels |
| `--text-primary-light` | `#18181B` | Primary text (light mode) |
| `--text-secondary-light` | `#3F3F46` | Body text (light mode) |

### Brand & Interactive Accent
| Token | Hex | Role |
|-------|-----|------|
| `--accent` | `#0EA5E9` | Primary CTA backgrounds, active tab indicators |
| `--accent-bright` | `#38BDF8` | Links, interactive highlights, selected states |
| `--accent-hover` | `#7DD3FC` | Hover states on accent elements |
| `--accent-muted` | `rgba(14,165,233,0.15)` | Subtle accent backgrounds (badges, highlights) |
| `--accent-text` | `#FFFFFF` | Text on accent-colored backgrounds |

### Clinical Status Colors
| Token | Hex | Role | Clinical Use |
|-------|-----|------|-------------|
| `--status-success` | `#22C55E` | Success, healthy, normal | Vitals in range, encounter signed off, payment complete |
| `--status-success-bg` | `rgba(34,197,94,0.12)` | Success background | Normal lab result row |
| `--status-warning` | `#F59E0B` | Caution, attention needed | Borderline lab values, drug interactions, appointment soon |
| `--status-warning-bg` | `rgba(245,158,11,0.12)` | Warning background | Expiring medication badge |
| `--status-danger` | `#EF4444` | Critical, urgent, error | Abnormal lab values, allergy alert, system errors |
| `--status-danger-bg` | `rgba(239,68,68,0.12)` | Danger background | Allergy warning banner |
| `--status-info` | `#6366F1` | Informational | AI suggestions, in-progress items |
| `--status-info-bg` | `rgba(99,102,241,0.12)` | Info background | AI copilot suggestion card |

### Triage Colors (Clinical-Specific)
| Token | Hex | Role |
|-------|-----|------|
| `--triage-red` | `#DC2626` | Emergency — go to ER |
| `--triage-amber` | `#D97706` | Urgent — book within 24h |
| `--triage-green` | `#16A34A` | Routine — book at convenience |

### Border & Divider
| Token | Value | Role |
|-------|-------|------|
| `--border-subtle` | `rgba(255,255,255,0.06)` | Default border — whisper-thin |
| `--border-default` | `rgba(255,255,255,0.10)` | Standard border for cards, inputs |
| `--border-strong` | `rgba(255,255,255,0.15)` | Emphasis borders, focused inputs |
| `--border-accent` | `rgba(14,165,233,0.5)` | Accent-colored border for focused states |

### Overlay
| Token | Value | Role |
|-------|-------|------|
| `--overlay` | `rgba(0,0,0,0.80)` | Modal backdrop |
| `--overlay-light` | `rgba(0,0,0,0.50)` | Lighter overlay (slide-overs) |

---

## 3. Typography Rules

### Font Family
- **Primary**: `Inter Variable`, fallbacks: `SF Pro Display, -apple-system, system-ui, Segoe UI, Roboto, sans-serif`
- **Monospace**: `Berkeley Mono`, fallbacks: `JetBrains Mono, Fira Code, ui-monospace, monospace`
- **OpenType Features**: `"cv01", "ss03"` enabled globally — non-negotiable for the design identity
- **Rendering**: `font-smoothing: antialiased` on dark backgrounds

### Hierarchy

| Role | Size | Weight | Line Height | Letter Spacing | Use |
|------|------|--------|-------------|----------------|-----|
| Display XL | 48px | 510 | 1.00 | -1.056px | Marketing hero, landing page |
| Display | 36px | 510 | 1.10 | -0.90px | Section headers |
| Heading 1 | 28px | 590 | 1.20 | -0.56px | Page titles ("Patients", "Encounters") |
| Heading 2 | 22px | 590 | 1.30 | -0.33px | Card headers, section titles |
| Heading 3 | 18px | 590 | 1.40 | -0.20px | Subsection titles, encounter section headers |
| Body Large | 16px | 400 | 1.60 | -0.10px | SOAP note text, clinical descriptions |
| Body | 14px | 400 | 1.55 | normal | Standard reading text, table cells |
| Body Medium | 14px | 510 | 1.55 | normal | Navigation labels, sidebar items, table headers |
| Body Semibold | 14px | 590 | 1.55 | normal | Strong emphasis, form labels |
| Small | 13px | 400 | 1.50 | -0.08px | Secondary text, metadata |
| Small Medium | 13px | 510 | 1.50 | -0.08px | Tab labels, pill text |
| Caption | 12px | 510 | 1.40 | normal | Timestamps, badge text, button text |
| Micro | 11px | 510 | 1.30 | 0.02em | Tiny labels, overline |
| Mono Body | 14px (Berkeley) | 400 | 1.55 | normal | ICD-10 codes, MRN numbers, lab values |
| Mono Small | 12px (Berkeley) | 400 | 1.40 | normal | Code references, version numbers |

### Type Principles
- **510 is the signature weight** — between regular (400) and medium (500). Used for UI text, nav, labels
- **590 for headings** — semibold emphasis without heavy-handedness
- **400 for reading** — clinical notes, SOAP text, descriptions
- **Negative letter-spacing** scales with size: -1.056px at 48px, -0.56px at 28px, normal below 16px
- **No bold (700+)** — the maximum weight is 590
- **Berkeley Mono** for all clinical codes: MRN (MC-2026-00001), ICD-10 (E11.2), lab values (WBC: 15,000)

---

## 4. Component Stylings

### Buttons

**Primary Button**
```css
background: var(--accent); /* #0EA5E9 */
color: #FFFFFF;
font: 13px Inter Variable weight 510;
padding: 8px 16px;
border-radius: 6px;
border: none;
transition: background 150ms ease;
/* hover: #38BDF8 */
/* active: #0284C7 */
```
Use: Primary actions — "Sign Off Encounter", "Book Appointment", "Save Patient"

**Secondary Button (Ghost)**
```css
background: rgba(255,255,255,0.04);
color: var(--text-secondary); /* #D4D4D8 */
font: 13px Inter Variable weight 510;
padding: 8px 14px;
border-radius: 6px;
border: 1px solid rgba(255,255,255,0.10);
transition: background 150ms ease;
/* hover: rgba(255,255,255,0.08) */
```
Use: Secondary actions — "Cancel", "Back", "Close"

**Danger Button**
```css
background: var(--status-danger); /* #EF4444 */
color: #FFFFFF;
padding: 8px 16px;
border-radius: 6px;
```
Use: Destructive actions — "Delete Patient", "Void Invoice" (with confirmation dialog)

**Icon Button**
```css
background: rgba(255,255,255,0.04);
color: var(--text-tertiary);
width: 32px; height: 32px;
border-radius: 6px;
border: 1px solid rgba(255,255,255,0.08);
/* hover: color -> var(--text-primary) */
```
Use: Toolbar actions, close modals, navigation toggles

**Pill Button / Filter Chip**
```css
background: transparent;
color: var(--text-secondary);
font: 12px Inter Variable weight 510;
padding: 4px 10px;
border-radius: 9999px;
border: 1px solid rgba(255,255,255,0.12);
/* active: background: var(--accent-muted), border: var(--border-accent), color: var(--accent-bright) */
```
Use: Filters, status indicators, tags

### Cards & Containers

**Data Card (Patient card, Encounter card, Invoice card)**
```css
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 10px;
padding: 20px;
transition: border-color 150ms ease;
/* hover: border-color: rgba(255,255,255,0.15) */
```

**Metric Card (Dashboard KPI card)**
```css
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 10px;
padding: 20px;
/* top label: 12px weight 510 color var(--text-muted) */
/* value: 28px weight 590 color var(--text-primary) letter-spacing -0.56px */
/* trend: 13px weight 510 color var(--status-success) or var(--status-danger) */
```

**Encounter Section Card (Vitals, SOAP, Diagnoses)**
```css
background: var(--bg-surface); /* #18181B */
border: 1px solid rgba(255,255,255,0.06);
border-radius: 8px;
padding: 16px 20px;
/* section title: 14px weight 590 color var(--text-primary) */
```

### Inputs & Forms

**Text Input**
```css
background: rgba(255,255,255,0.03);
color: var(--text-primary);
font: 14px Inter Variable weight 400;
padding: 10px 14px;
border-radius: 6px;
border: 1px solid rgba(255,255,255,0.10);
transition: border-color 150ms ease;
/* focus: border-color: var(--accent), box-shadow: 0 0 0 3px var(--accent-muted) */
/* placeholder: color var(--text-muted) */
```

**Textarea (SOAP Notes)**
```css
background: rgba(255,255,255,0.02);
color: var(--text-primary);
font: 16px Inter Variable weight 400; /* larger for clinical notes */
line-height: 1.60;
padding: 14px 16px;
border-radius: 8px;
border: 1px solid rgba(255,255,255,0.08);
min-height: 120px;
resize: vertical;
```

**Search Input**
```css
background: rgba(255,255,255,0.04);
color: var(--text-primary);
font: 14px Inter Variable weight 400;
padding: 10px 14px 10px 40px; /* icon-aware */
border-radius: 8px;
border: 1px solid rgba(255,255,255,0.10);
/* search icon: color var(--text-muted), left: 12px */
/* shortcut hint: "⌘K" in var(--text-muted) */
```

**Select / Dropdown**
```css
/* same as text input + chevron icon right */
/* dropdown menu: bg var(--bg-surface), border: rgba(255,255,255,0.10), radius: 8px */
/* dropdown item: padding 8px 12px, hover: bg rgba(255,255,255,0.06) */
/* selected item: bg var(--accent-muted), color var(--accent-bright) */
```

### Badges & Pills

**Status Badge**
```css
/* Success (normal vitals, signed off) */
background: var(--status-success-bg);
color: var(--status-success);
font: 11px Inter Variable weight 590;
padding: 2px 8px;
border-radius: 9999px;
text-transform: uppercase;
letter-spacing: 0.03em;

/* Warning (borderline) */
background: var(--status-warning-bg); color: var(--status-warning);

/* Danger (abnormal, critical) */
background: var(--status-danger-bg); color: var(--status-danger);

/* Info (AI suggestion, in-progress) */
background: var(--status-info-bg); color: var(--status-info);

/* Neutral (default, draft) */
background: rgba(255,255,255,0.06); color: var(--text-tertiary);
```

**Count Badge (Notification count, queue count)**
```css
background: var(--accent);
color: #FFFFFF;
font: 10px Inter Variable weight 590;
min-width: 18px; height: 18px;
border-radius: 9999px;
padding: 0 5px;
display: flex; align-items: center; justify-content: center;
```

### Tables (Critical for Clinical Data)

```css
/* Table container */
border: 1px solid rgba(255,255,255,0.06);
border-radius: 10px;
overflow: hidden;

/* Header */
background: rgba(255,255,255,0.03);
border-bottom: 1px solid rgba(255,255,255,0.06);
th { font: 12px Inter Variable weight 590; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; padding: 10px 16px; }

/* Rows */
td { font: 14px Inter Variable weight 400; color: var(--text-secondary); padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }

/* Row hover */
tr:hover { background: rgba(255,255,255,0.03); }

/* Selected row */
tr.selected { background: var(--accent-muted); }

/* Abnormal value cell */
td.abnormal { color: var(--status-danger); font-weight: 590; }
td.normal { color: var(--status-success); }
```

### Navigation

**Sidebar**
```css
background: var(--bg-sidebar); /* #0F1117 */
width: 240px;
border-right: 1px solid rgba(255,255,255,0.06);
padding: 12px 8px;

/* logo area: padding 16px 16px, margin-bottom 8px */
/* nav item: padding 8px 12px, border-radius 6px, font 13px weight 510, color var(--text-tertiary) */
/* nav item hover: background rgba(255,255,255,0.05), color var(--text-secondary) */
/* nav item active: background var(--accent-muted), color var(--accent-bright) */
/* nav section label: 11px weight 590, color var(--text-muted), uppercase, letter-spacing 0.06em, padding 20px 12px 6px */
```

**Top Bar**
```css
background: var(--bg-base);
height: 56px;
border-bottom: 1px solid rgba(255,255,255,0.06);
padding: 0 24px;
display: flex; align-items: center; justify-content: space-between;
/* breadcrumb: 13px weight 510 color var(--text-muted), separator ">" color var(--text-muted) */
/* current page: color var(--text-primary) */
```

### Data Visualization (Charts)

```css
/* Chart container */
background: rgba(255,255,255,0.03);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 10px;
padding: 20px;

/* Chart colors (ordered by priority) */
--chart-1: #0EA5E9;  /* primary metric */
--chart-2: #22C55E;  /* secondary / positive */
--chart-3: #6366F1;  /* tertiary / info */
--chart-4: #F59E0B;  /* quaternary / warning */
--chart-5: #A855F7;  /* quinary */

/* Axis labels: 11px Berkeley Mono weight 400 color var(--text-muted) */
/* Grid lines: rgba(255,255,255,0.04) */
/* Tooltip: bg var(--bg-elevated), border rgba(255,255,255,0.10), radius 6px */
```

---

## 5. Layout Principles

### Spacing System
- Base unit: **4px**
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
- **Clinical density rule**: Clinical screens (encounters, lab results, patient view) use tighter spacing (8px-16px gaps). Admin/marketing screens use generous spacing (24px-48px gaps)

### Grid & Container
- App max-width: **1440px** (constrained in larger viewports)
- Content max-width: **1200px** (within the app container)
- Sidebar: **240px** (collapsible to 64px icon mode on smaller screens)
- Main content: `calc(100% - 240px)` fluid
- Encounter editor: **3-column** layout (patient sidebar 280px | encounter form flexible | AI copilot 320px)
- Dashboard: **4-column** metric card grid with 16px gap
- Tables: full-width within content container, horizontal scroll on overflow

### Clinical Layout Patterns

**3-Column Encounter Editor** (desktop):
```
[Patient Summary 280px] | [Encounter Form flex] | [AI Copilot 320px]
                           ├── Vitals section
                           ├── SOAP section
                           ├── Diagnoses section
                           ├── Prescriptions section
                           └── Actions bar
```

**2-Panel Queue View**:
```
[Queue List 360px] | [Selected Patient Detail flex]
```

**Dashboard Grid**:
```
[Metric][Metric][Metric][Metric]
[Revenue Chart ───────][Appointments Chart ──]
[Recent Encounters ─────────────────────────]
```

### Border Radius Scale
| Token | Value | Use |
|-------|-------|-----|
| `--radius-xs` | 4px | Inline badges, micro elements |
| `--radius-sm` | 6px | Buttons, inputs, tags |
| `--radius-md` | 8px | Cards, encounter sections |
| `--radius-lg` | 10px | Data cards, tables, chart containers |
| `--radius-xl` | 12px | Panels, modals, slide-overs |
| `--radius-2xl` | 16px | Featured cards, marketing sections |
| `--radius-pill` | 9999px | Pill badges, status chips, avatar |

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Level 0 (Base) | `#09090B` bg, no shadow | App background |
| Level 1 (Sidebar) | `#0F1117` bg, right border | Navigation panel |
| Level 2 (Surface) | `#18181B` or `rgba(255,255,255,0.04)` bg + border | Cards, encounter sections |
| Level 3 (Elevated) | `#27272A` bg | Hover states, tooltips |
| Level 4 (Dropdown) | `#18181B` bg + `box-shadow: 0 4px 16px rgba(0,0,0,0.4)` | Dropdown menus, command palette |
| Level 5 (Modal) | `#18181B` bg + `box-shadow: 0 8px 32px rgba(0,0,0,0.5)` | Modals, dialogs |
| Level 6 (Toast) | `#27272A` bg + `box-shadow: 0 4px 12px rgba(0,0,0,0.3)` | Toast notifications |

**Shadow Philosophy**: On dark surfaces, elevation is communicated through **background luminance stepping** — each level slightly increases the lightness. Shadows are secondary, providing subtle depth cues. The primary depth indicator is always the surface color itself.

---

## 7. Do's and Don'ts

### Do ✅
- Use Inter Variable with `"cv01", "ss03"` on ALL text — this is the design identity
- Use weight 510 as default emphasis weight — menus, labels, navigation
- Use `#F4F4F5` (not pure white) for primary text — prevents eye strain
- Use semi-transparent white borders (`rgba(255,255,255,0.06)` to `rgba(255,255,255,0.10)`)
- Use clinical status colors ONLY for clinical meaning (green = normal, red = critical)
- Use Berkeley Mono for all clinical codes (ICD-10, MRN, lab values)
- Keep the accent teal (`#0EA5E9`) for interactive elements only — not decoration
- Use luminance stacking for depth — darker = deeper, lighter = elevated
- Use generous whitespace on admin/marketing pages, tight spacing on clinical data screens
- Show loading skeletons (pulsing `rgba(255,255,255,0.06)` blocks) — never blank screens
- Animate state transitions (150ms ease) — sidebar collapse, modal open, tab switch

### Don't ❌
- Don't use pure white `#FFFFFF` as primary text — use `#F4F4F5`
- Don't use solid colored backgrounds on buttons — use translucent rgba
- Don't use bright colors for decoration — color = meaning in clinical UI
- Don't use drop shadows as primary depth cue on dark surfaces — use luminance stepping
- Don't use weight 700+ (bold) — max weight is 590
- Don't skip the OpenType features `"cv01", "ss03"` — without them it's generic Inter
- Don't use warm colors in UI chrome — the palette is cool zinc with blue accent
- Don't use red for non-critical information — red means "danger" in clinical context
- Don't use small text (<12px) for patient-visible clinical data — accessibility matters
- Don't leave clinical actions without confirmation dialogs (sign-off, delete, void)

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <768px | Sidebar hidden (overlay), single column, encounter editor stacked |
| Tablet | 768–1024px | Sidebar collapsible (icon mode), 2-column layouts, AI copilot hidden by default |
| Desktop | 1024–1440px | Full sidebar, 3-column encounter editor, all panels visible |
| Large | >1440px | Max-width container, generous side margins |

### Clinical-Specific Responsive Rules
- **Patient queue (TV display)**: `>1920px` — large fonts (24px+), high contrast, auto-scroll
- **Encounter editor**: collapses from 3-column → 2-column (AI copilot → slide-over) → 1-column (all stacked)
- **Lab results table**: horizontal scroll on mobile, sticky first column
- **Bed map**: switches from grid to list view below 768px
- **Video consultation**: video takes full width on mobile, encounter sidebar becomes overlay

### Touch Targets
- All clickable elements: minimum 44px touch target (WCAG 2.5.8)
- Buttons: minimum 36px height
- Sidebar nav items: 44px height with 8px padding
- Table rows: 48px minimum height on touch devices

---

## 9. Agent Prompt Guide

### Quick Color Reference (Dark Mode)
```
Background:     #09090B
Sidebar:        #0F1117
Surface:        #18181B
Elevated:       #27272A
Text Primary:   #F4F4F5
Text Secondary: #D4D4D8
Text Tertiary:  #A1A1AA
Text Muted:     #71717A
Accent:         #0EA5E9
Accent Bright:  #38BDF8
Accent Hover:   #7DD3FC
Success:        #22C55E
Warning:        #F59E0B
Danger:         #EF4444
Info:           #6366F1
Border:         rgba(255,255,255,0.08)
```

### Example Component Prompts

**Encounter Editor Card:**
"Create an encounter section card on `#18181B` background, `1px solid rgba(255,255,255,0.06)` border, 8px radius. Section title at 14px Inter Variable weight 590, color `#F4F4F5`. SOAP text area at 16px weight 400, line-height 1.60, color `#F4F4F5` on `rgba(255,255,255,0.02)` background. Focus border: `#0EA5E9`."

**Patient Data Table:**
"Build a data table with `rgba(255,255,255,0.03)` header, `12px` uppercase headers in `#71717A` weight 590. Body rows at 14px weight 400 in `#D4D4D8`. Row hover: `rgba(255,255,255,0.03)`. Abnormal lab values in `#EF4444` weight 590. Normal values in `#22C55E`."

**Dashboard Metric Card:**
"Design a KPI card: `rgba(255,255,255,0.04)` background, `1px solid rgba(255,255,255,0.08)` border, 10px radius. Label at 12px weight 510 in `#71717A`. Value at 28px weight 590 in `#F4F4F5`, letter-spacing -0.56px. Trend arrow in `#22C55E` (up) or `#EF4444` (down) at 13px weight 510."

**Sidebar Navigation:**
"Build sidebar on `#0F1117` with right border `rgba(255,255,255,0.06)`. Logo area 16px padding. Nav items: 13px weight 510, `#A1A1AA` text, 8px 12px padding, 6px radius. Hover: bg `rgba(255,255,255,0.05)`, color `#D4D4D8`. Active: bg `rgba(14,165,233,0.15)`, color `#38BDF8`. Section label: 11px weight 590, `#71717A`, uppercase, letter-spacing 0.06em."

**AI Copilot Sidebar:**
"Design AI copilot panel with `#0F1117` background, left border `rgba(255,255,255,0.06)`. AI response cards: `rgba(99,102,241,0.08)` background, `1px solid rgba(99,102,241,0.15)` border, 8px radius. Label '🤖 AI Suggestion — Verify' at 11px weight 590, `#6366F1`. Content at 14px weight 400, `#D4D4D8`."

### Iteration Guide
1. Set `font-feature-settings: "cv01", "ss03"` on all Inter text — non-negotiable
2. Three weights: 400 (read), 510 (navigate/label), 590 (announce/heading)
3. Clinical status colors are SEMANTIC — green=normal, amber=caution, red=critical, purple=AI
4. Borders are always semi-transparent white, never solid on dark backgrounds
5. Surface elevation via luminance stepping: `#09090B` → `#0F1117` → `#18181B` → `#27272A`
6. Berkeley Mono for clinical codes (MRN, ICD-10, lab values, encounter IDs)
7. Accent teal (`#0EA5E9` / `#38BDF8`) is the ONLY chromatic accent — everything else is zinc gray + status colors
8. Confirmation dialogs are mandatory for irreversible clinical actions
