---
name: awesome-design-md
description: "Professional DESIGN.md reference library from VoltAgent's awesome-design-md repo. Use when building UI, selecting a design system, applying a brand's visual language, or generating pixel-perfect components matching a known style. Contains 58 curated design systems from top brands."
risk: safe
source: "https://github.com/VoltAgent/awesome-design-md"
---

# Awesome DESIGN.md — Professional Design References

You have access to a curated library of **58 professional DESIGN.md files** extracted from real-world websites. These files capture complete design systems — colors, typography, spacing, components, depth, and responsive behavior — in a format optimized for AI agents to consume and reproduce.

## When to Use This Skill

Use this skill when:
- **Building new UI pages or components** and you want them to match a professional brand aesthetic
- **The user says** "make it look like Linear", "use Stripe's style", "Vercel-style design", etc.
- **Starting a new project** and a design direction hasn't been established yet — offer the catalog
- **Creating a DESIGN.md** for a custom project — use these as structural templates
- **Generating Stitch prompts** — DESIGN.md files provide the exact tokens Stitch needs
- **Reviewing UI decisions** — check if your colors, typography, or spacing match the intended style

## How It Works

### 1. Locate the Design File

All DESIGN.md files live in: `.agent/design-references/design-md/{brand-name}/`

Each brand folder contains:
- `DESIGN.md` — The complete design system specification
- `README.md` — Brand summary and quick reference
- `preview.html` — Light mode preview (HTML)
- `preview-dark.html` — Dark mode preview (HTML)

### 2. Read the DESIGN.md

Use `view_file` to read the DESIGN.md for the target brand. Each file follows this structure:

```
1. Visual Theme & Atmosphere — Overall mood, density, aesthetic philosophy
2. Color Palette & Roles — Every color with hex code, descriptive name, and functional role
3. Typography Rules — Font families, sizes, weights, line-heights, letter-spacing
4. Component Stylings — Buttons, cards, inputs, badges, navigation patterns
5. Layout Principles — Spacing, grid, whitespace philosophy, border radius scale
6. Depth & Elevation — Shadow system, layering strategy
7. Do's and Don'ts — Guardrails to stay on-brand
8. Responsive Behavior — Breakpoints, collapsing strategies, touch targets
9. Agent Prompt Guide — Ready-to-use component prompts with exact values
```

### 3. Apply to Your Project

After reading the DESIGN.md:
- Extract the color palette and set up CSS custom properties or Tailwind config
- Apply the typography system (font family, weight scale, letter-spacing rules)
- Use the component stylings as your component library foundation
- Follow the layout principles for spacing and grid decisions
- Reference the Do's and Don'ts to stay consistent

## Available Design Systems (58 Total)

### AI & LLM Platforms
| Brand | Style Description | Path |
|-------|-------------------|------|
| Claude | Warm terracotta accent, clean editorial layout | `claude/` |
| Cohere | Vibrant gradients, data-rich dashboard aesthetic | `cohere/` |
| ElevenLabs | Dark cinematic UI, audio-waveform aesthetics | `elevenlabs/` |
| Minimax | Bold dark interface with neon accents | `minimax/` |
| Mistral AI | French-engineered minimalism, purple-toned | `mistral.ai/` |
| Ollama | Terminal-first, monochrome simplicity | `ollama/` |
| OpenCode AI | Developer-centric dark theme | `opencode.ai/` |
| Replicate | Clean white canvas, code-forward | `replicate/` |
| RunwayML | Cinematic dark UI, media-rich layout | `runwayml/` |
| Together AI | Technical, blueprint-style design | `together.ai/` |
| VoltAgent | Void-black canvas, emerald accent, terminal-native | `voltagent/` |
| xAI | Stark monochrome, futuristic minimalism | `x.ai/` |

### Developer Tools
| Brand | Style Description | Path |
|-------|-------------------|------|
| Cursor | AI-first code editor. Sleek dark, gradient accents | `cursor/` |
| Expo | React Native platform. Dark, tight letter-spacing | `expo/` |
| Linear | Ultra-minimal, precise, purple accent | `linear.app/` |
| Lovable | AI full-stack builder. Playful gradients | `lovable/` |
| Mintlify | Documentation platform. Clean, green-accented | `mintlify/` |
| PostHog | Product analytics. Playful hedgehog, developer dark UI | `posthog/` |
| Raycast | Productivity launcher. Vibrant gradient accents | `raycast/` |
| Resend | Email API. Minimal dark, monospace accents | `resend/` |
| Sentry | Error monitoring. Data-dense, pink-purple accent | `sentry/` |
| Supabase | Open-source Firebase. Dark emerald, code-first | `supabase/` |
| Superhuman | Fast email. Premium dark, keyboard-first, purple glow | `superhuman/` |
| Vercel | Deployment platform. Black/white precision, Geist font | `vercel/` |
| Warp | Modern terminal. Dark IDE-like, block-based | `warp/` |
| Zapier | Automation. Warm orange, friendly illustration-driven | `zapier/` |

### Infrastructure & Cloud
| Brand | Style Description | Path |
|-------|-------------------|------|
| ClickHouse | Analytics DB. Yellow-accented, technical docs style | `clickhouse/` |
| Composio | Tool integration. Modern dark, colorful icons | `composio/` |
| HashiCorp | Infrastructure automation. Enterprise-clean B&W | `hashicorp/` |
| MongoDB | Document DB. Green leaf, developer docs focus | `mongodb/` |
| Sanity | Headless CMS. Red accent, editorial layout | `sanity/` |
| Stripe | Payments. Signature purple gradients, weight-300 elegance | `stripe/` |

### Design & Productivity
| Brand | Style Description | Path |
|-------|-------------------|------|
| Airtable | Spreadsheet-DB hybrid. Colorful, structured data | `airtable/` |
| Cal.com | Open-source scheduling. Neutral UI, developer-oriented | `cal/` |
| Clay | Creative agency. Organic shapes, soft gradients | `clay/` |
| Figma | Collaborative design. Vibrant multi-color, playful | `figma/` |
| Framer | Website builder. Bold black/blue, motion-first | `framer/` |
| Intercom | Customer messaging. Friendly blue, conversational UI | `intercom/` |
| Miro | Visual collaboration. Bright yellow, infinite canvas | `miro/` |
| Notion | All-in-one workspace. Warm minimalism, serif headings | `notion/` |
| Pinterest | Visual discovery. Red accent, masonry grid, image-first | `pinterest/` |
| Webflow | Visual web builder. Blue-accented, polished marketing | `webflow/` |

### Fintech & Crypto
| Brand | Style Description | Path |
|-------|-------------------|------|
| Coinbase | Crypto exchange. Clean blue, trust-focused | `coinbase/` |
| Kraken | Crypto trading. Purple-accented dark, data-dense | `kraken/` |
| Revolut | Digital banking. Sleek dark, gradient cards | `revolut/` |
| Wise | Money transfer. Bright green, friendly and clear | `wise/` |

### Enterprise & Consumer
| Brand | Style Description | Path |
|-------|-------------------|------|
| Airbnb | Travel marketplace. Warm coral, photography-driven | `airbnb/` |
| Apple | Consumer electronics. Premium white space, cinematic | `apple/` |
| IBM | Enterprise tech. Carbon design system, structured blue | `ibm/` |
| NVIDIA | GPU computing. Green-black energy, technical power | `nvidia/` |
| SpaceX | Space tech. Stark B&W, full-bleed imagery, futuristic | `spacex/` |
| Spotify | Music streaming. Vibrant green on dark, bold type | `spotify/` |
| Uber | Mobility platform. Bold B&W, tight type, urban energy | `uber/` |

### Car Brands
| Brand | Style Description | Path |
|-------|-------------------|------|
| BMW | Luxury automotive. Dark premium, precise German aesthetic | `bmw/` |
| Ferrari | Luxury automotive. Chiaroscuro editorial, Ferrari Red | `ferrari/` |
| Lamborghini | Luxury automotive. True black, gold accent, Neo-Grotesk | `lamborghini/` |
| Renault | French automotive. Aurora gradients, NouvelR typeface | `renault/` |
| Tesla | Electric vehicles. Radical subtraction, cinematic photos | `tesla/` |

## Recommended Design Systems by Project Type

### For Medical / Healthcare SaaS
1. **Linear** — Ultra-clean, precise, professional dark UI
2. **Stripe** — Trustworthy, elegant, enterprise-grade
3. **Vercel** — Minimal, accessible, high-contrast
4. **IBM** — Enterprise-grade Carbon design system
5. **Notion** — Warm minimalism, content-focused

### For Developer Tools / Dashboards
1. **Linear** — The gold standard for dev tool design
2. **Supabase** — Dark emerald, code-first
3. **Sentry** — Data-dense dashboard patterns
4. **Raycast** — Vibrant, productivity-focused
5. **Resend** — Minimal dark, monospace accents

### For Consumer / Marketing Sites
1. **Apple** — Premium white space, cinematic
2. **Airbnb** — Warm, photography-driven
3. **Spotify** — Bold, colorful, engaging
4. **Figma** — Playful yet professional
5. **Framer** — Motion-first, design-forward

### For Fintech / Data-Heavy Apps
1. **Stripe** — Payment-grade precision
2. **Revolut** — Modern dark fintech
3. **Coinbase** — Trust-focused, institutional
4. **Kraken** — Data-dense dashboards
5. **Cohere** — Data-rich with vibrant gradients

## Workflow: Applying a Design System

1. **User selects** a brand (or ask them to choose from the catalog)
2. **Read** the `DESIGN.md` from `.agent/design-references/design-md/{brand}/DESIGN.md`
3. **Extract** the key tokens:
   - Color palette → CSS custom properties
   - Typography → font imports + utility classes
   - Spacing → spacing scale
   - Components → component patterns
4. **Create** a project-specific `DESIGN.md` at the project root, adapted with:
   - Project-specific colors and branding
   - Relevant component patterns
   - Modified tokens where needed
5. **Build** components following the design system's rules
6. **Validate** against the Do's and Don'ts section

## Creating a Custom DESIGN.md

Use any design from this library as a **template structure**. A good custom DESIGN.md should have:

```markdown
# Design System: [Project Name]

## 1. Visual Theme & Atmosphere
## 2. Color Palette & Roles  
## 3. Typography Rules
## 4. Component Stylings
## 5. Layout Principles
## 6. Depth & Elevation
## 7. Do's and Don'ts
## 8. Responsive Behavior
## 9. Agent Prompt Guide
```

This is the [Google Stitch DESIGN.md format](https://stitch.withgoogle.com/docs/design-md/format/) extended with additional sections for comprehensive coverage.

## Updating the Library

To update the design reference library with latest additions:
```bash
cd .agent/design-references
git pull origin main
```

## Tips
- **Start with Section 9 (Agent Prompt Guide)** — it gives you ready-to-use component specs
- **The Do's and Don'ts** are the most important guardrails for staying on-brand
- **Combine styles** — e.g., Linear's typography + Stripe's gradient buttons
- **Preview files** — open `preview.html` or `preview-dark.html` in a browser to see the design
