---
name: filter-components-logic
description: "Expert guidelines for building modern, highly-aesthetic, and accessible filter components using ZDream's specific UI tokens, Framer Motion, and state management best practices."
version: 1.0.0
author: ZDream AI
created: 2026-02-25
updated: 2026-02-25
platforms: [claude-code, codex]
category: frontend
tags: [ui, react, components, filtering, animation, zdream]
risk: safe
source: local
---

# Filter Components Logic

## Purpose

Enforce strict, highly-polished UI guidelines and state management patterns when building or refactoring filter components, category selectors, or tag lists within the ZDream application. 

This skill ensures that all new filter components inherently adopt the centralized `themeConfig`, use fluid Framer Motion animations, and maintain consistent accessibility standards.

## When to Use This Skill

This skill should be used when:
- The user asks to "build a filter", "create filter components", or "add filtering logic".
- You are refactoring existing category choosers, tags, or segmented controls.
- The user requests to make a list "filterable" or "sortable".

## Core Principles

1. **Brand Aesthetics First**: Filters must look premium. Active states must vividly highlight the primary brand color (Gold). Inactive states should recede gracefully into the dark canvas.
2. **Tactile Physics**: Filter changes must feel physical. Use layout animations when lists re-order or shrink.
3. **URL-Sync Priority**: Filter state should ideally live in the URL search parameters to ensure the UI is purely a reflection of shareable, bookmark-able state.

---

## 1. UI & Styling Guidelines (ZDream Tokens)

All filter components must draw from `src/config/theme/index.ts` and `globals.css`. Do not hardcode hex values.

### The "Active" Filter State
When a filter is selected, it must use the **Brand Gold** as its background with high-contrast text to draw the eye immediately.

- **Background**: `bg-[var(--color-primary-500)]` or `bg-primary`
- **Text Color**: `text-inverse` or `text-black` (for readability against the gold)
- **Shadow**: `shadow-glow` or a subtle white/gold drop shadow.
- **Font Weight**: `font-semibold` or `font-bold`

### The "Inactive" Filter State
When a filter is not selected, it should look interactive but secondary.

- **Background**: Transparent with a border (`btn-secondary` class) OR a subtle glassmorphism (`glass-card` class or `bg-white/5 backdrop-blur-md`).
- **Text Color**: `text-secondary` or `text-white/70`
- **Border**: `border-border-default` or `border-white/10`
- **Hover**: Should subtly brighten (`hover:bg-white/10 hover:text-white`).

### Typography Integration
- Container/Section Header: `font-heading` (Quantix)
- The Filter Chips/Labels themselves: `font-body` (Montserrat), usually `text-sm` or `text-xs` with `uppercase tracking-widest` for a premium look.

---

## 2. Animation Choreography (Framer Motion)

Filters should never immediately "snap" the content below them.

### Layout Transitions
When the user clicks a filter chip, the resulting grid or list below it must use `<motion.div layout>` or `<AnimatePresence>` to gracefully reorganize the remaining items.

```tsx
import { motion, AnimatePresence } from "framer-motion";

// Wrapping the filtered content
<motion.div layout className="grid gap-6">
  <AnimatePresence mode="popLayout">
    {filteredItems.map(item => (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3, ease: [0.76, 0, 0.24, 1] }} // Match ZDream standard easing
        key={item.id}
      >
        <ItemCard data={item} />
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

### Active Indicator (The Sliding Pill)
If the filters are arranged like tabs horizontally, use a shared layout ID for the background pill that slides behind the active text:

```tsx
{filters.map((filter) => (
  <button key={filter.id} onClick={() => setFilter(filter.id)} className="relative px-4 py-2">
    {activeFilter === filter.id && (
      <motion.div
        layoutId="activeFilterBackground"
        className="absolute inset-0 bg-primary rounded-full z-0"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
    <span className={`relative z-10 ${activeFilter === filter.id ? "text-inverse" : "text-secondary"}`}>
      {filter.label}
    </span>
  </button>
))}
```

---

## 3. State Management Logic

### Rule 1: Use URL Search Params for Global Data (Server-Side approach)
If the filter applies to a main page resource (e.g., a "Portfolio" page, or a "Services" archive) and the data is fetched on the server, **the filter state must be stored in the URL**.

1. Use Next.js hooks `useRouter` and `usePathname`, `useSearchParams` to modify the URL `?category=sports`.
2. This allows users to share a link to a specifically filtered page.
3. Consider using `nuqs` (Next Use Query State) if available in the codebase.

### Rule 2: Use Local State for Immediate Client-Side Grids
If the data is fully loaded onto the page (e.g., a small gallery of 10 items) and filtering is immediate and presentational, use `useState`:

```tsx
const [activeFilter, setActiveFilter] = useState("all");

const filteredData = useMemo(() => {
  if (activeFilter === "all") return data;
  return data.filter(item => item.category === activeFilter);
}, [data, activeFilter]);
```

---

## Implementation Checklist

Before completing a filter implementation, ensure:
1. [ ] Did I use the Brand Gold (`bg-primary` or `--color-primary-500`) for the active state?
2. [ ] Are the filter text labels using `font-body` and correct spacing?
3. [ ] Does the list of filtered items animate fluidly (using `framer-motion` layout/AnimatePresence) rather than hard-snapping?
4. [ ] If the items wrap to multiple lines, are the margins/gaps consistent (using Tailwind `gap`)?
5. [ ] Is the state management appropriate for the scope (URL params vs `useState`)?
