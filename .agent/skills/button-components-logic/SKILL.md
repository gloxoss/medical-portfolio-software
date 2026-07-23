---
name: button-components-logic
description: "Expert guidelines for building modern, highly-aesthetic button components using ZDream's specific UI tokens, including GradientButton and ShinyButton."
version: 1.0.0
author: ZDream AI
created: 2026-02-25
updated: 2026-02-25
platforms: [claude-code, codex]
category: frontend
tags: [ui, react, components, buttons, cta, zdream]
risk: safe
source: local
---

# Button Components Logic

## Purpose

Enforce strict, highly-polished UI guidelines for primary Call To Action (CTA) buttons across the ZDream application. This skill ensures that components correctly utilize the `GradientButton` and `ShinyButton` components to maintain the premium Brand Gold aesthetic instead of generic buttons.

## When to Use This Skill

This skill should be used when:
- The user asks to "build a button", "add a CTA", "create a header CTA", or "add buttons in the hero".
- You are refactoring existing links or generic buttons to look more premium.
- The user requests highly engaging, animated UI elements for CTAs.

## Core Principles

1. **Brand Gold Aesthetics**: Primary actions should utilize the Gold brand tokens (`#EEE8AA` / `primary-500`) to ensure they immediately grab user attention in a dark-mode canvas.
2. **Dynamic Highlights**: Buttons should not be static blocks of color. They must use advanced radial gradients or conic gradients (shine effects).
3. **Usage Hierarchy**:
   - `GradientButton`: Best for massive, central CTAs (e.g., Hero sections). It has a pronounced color spread. Use `variant="variant"` for secondary but highly-visible actions.
   - `ShinyButton`: Best for sleeker, smaller spaces where a high-tech tracking shine is appropriate (e.g., Header/Navigation, smaller inline cards).

---

## 1. Components Reference

### GradientButton
A complex button relying on CSS `@property` animations that flow radially through the ZDream Gold palette.

**Usage:**
```tsx
import { GradientButton } from "@/components/ui/gradient-button";

// Primary
<GradientButton>Book a Call</GradientButton>

// Secondary
<GradientButton variant="variant">Explore Services</GradientButton>

// As a Link (using Radix Slot via asChild)
<GradientButton asChild>
  <Link href="/contact">Contact Us</Link>
</GradientButton>
```

### ShinyButton
A highly modern button utilizing a conic-gradient tracking highlight wrapping its borders, perfect for a sleek tech feel.

**Usage:**
```tsx
import { ShinyButton } from "@/components/ui/shiny-button";

// Standard
<ShinyButton onClick={handleClick}>Sign Up</ShinyButton>

// As a Link natively (automatically renders Next/Link)
<ShinyButton href="/pricing">View Pricing</ShinyButton>
```

---

## Implementation Checklist

Before completing a button implementation, ensure:
1. [ ] Is this a primary CTA? If so, have I evaluated whether `GradientButton` or `ShinyButton` is the correct fit?
2. [ ] Did I use `asChild` and Next.js `<Link>` for internal links when using `GradientButton`?
3. [ ] Did I simply pass `href="/path"` when using `ShinyButton` instead of manually nesting a link?
4. [ ] Does the button stand out clearly against the `bg-canvas` or dark surfaces?
