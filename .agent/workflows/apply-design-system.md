---
description: Select and apply a professional DESIGN.md from the awesome-design-md library to your project
---

# Apply Design System Workflow

This workflow guides you through selecting a professional design system from the awesome-design-md library and applying it to your project.

## Step 1: Browse the Design Catalog

Read the skill file for the full categorized list of 58 available design systems:
// turbo
```
view_file .agent/skills/awesome-design-md/SKILL.md
```

Present the user with the **Recommended Design Systems by Project Type** table, or ask what aesthetic they're looking for.

## Step 2: Preview the Design (Optional)

If the user wants to see the design before committing, open the preview in the browser:
```
open .agent/design-references/design-md/{brand-name}/preview.html
```
or for dark mode:
```
open .agent/design-references/design-md/{brand-name}/preview-dark.html
```

## Step 3: Read the DESIGN.md

Once a brand is selected, read the full design specification:
// turbo
```
view_file .agent/design-references/design-md/{brand-name}/DESIGN.md
```

Pay special attention to:
- **Section 2 (Color Palette)** — extract all colors with their functional roles
- **Section 3 (Typography)** — note font families, weight scale, letter-spacing rules
- **Section 7 (Do's and Don'ts)** — these are hard constraints
- **Section 9 (Agent Prompt Guide)** — ready-to-use component specs

## Step 4: Create Project DESIGN.md

Create a project-specific `DESIGN.md` at the project root that adapts the reference design:

1. Copy the structure from the reference DESIGN.md
2. Customize the color palette if needed (e.g., swap brand accent color)
3. Keep the typography system, spacing, and component patterns
4. Add project-specific components or patterns
5. Update the Agent Prompt Guide with project-specific examples

## Step 5: Implement the Design Tokens

Set up the design tokens in your project's CSS or configuration:

### For Vanilla CSS:
Create CSS custom properties in `:root` and `[data-theme="dark"]`

### For Tailwind CSS:
Extend the Tailwind config with the design system's colors, fonts, and spacing

### For a framework (React/Next.js/etc.):
Create a theme configuration object with all tokens

## Step 6: Build Components

Use the **Component Stylings** section from the DESIGN.md to build your component library:
- Buttons (primary, secondary, ghost, icon, pill)
- Cards & containers
- Inputs & forms
- Badges & pills
- Navigation patterns
- Image treatments

## Step 7: Validate

Check your implementation against:
- [ ] Colors match the palette exactly (hex codes)
- [ ] Typography uses correct font family, weights, and letter-spacing
- [ ] Component styles match the specifications
- [ ] Spacing follows the documented scale
- [ ] Do's and Don'ts are respected
- [ ] Responsive behavior follows the documented breakpoints

## Step 8: Update the Library (When Needed)

To get the latest design systems from the upstream repo:
// turbo
```
cd .agent/design-references && git pull origin main
```
