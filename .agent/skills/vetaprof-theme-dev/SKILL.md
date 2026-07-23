---
name: vetaprof-theme-dev
description: >
  Full-stack development skill for the VetaProf WordPress custom theme — a French medical workwear
  e-commerce brand. Covers theme architecture, WooCommerce customization, GSAP animation system,
  Tailwind CSS design tokens, ACF fields, the VetaProf editorial light design system, dynamic nav
  menus, footer architecture, color swatch system, and Fast Product Creator admin tool.
  USE THIS SKILL whenever working on: the my-theme WordPress theme, VetaProf site features,
  blur-text animations, WooCommerce templates, footer/header redesigns, product pages, shop pages,
  front-page sections, admin tools, or any PHP/JS/CSS changes in the theme.
category: project-specific
risk: safe
source: personal
date_added: "2026-04-01"
date_updated: "2026-04-03"
---

# VetaProf Theme — Development Skill

## Project Overview

**VetaProf** is a French medical workwear brand (scrubs, blouses, accessories for healthcare professionals). The site is a **WordPress + WooCommerce** store built on a fully custom theme called `my-theme`.

- **Local URL**: LocalWP (Local by Flywheel) dev environment
- **Theme path**: `wp-content/themes/my-theme/`
- **Language**: French (fr_FR) — all UI copy is in French

---

## Stack & Dependencies

| Layer | Technology |
|---|---|
| CMS | WordPress + WooCommerce |
| PHP templating | Custom theme — NO block editor, NO FSE |
| CSS | Tailwind CSS (source: `assets/css/tailwind-input.css` → output: `assets/css/tailwind-output.css`) |
| JS | Vanilla JS modules in `assets/js/` |
| Animation | GSAP 3.12.2 + ScrollTrigger (loaded globally via CDN in `functions.php`) |
| Icons | Material Symbols Outlined (Google Fonts CDN) |
| Content fields | ACF (Advanced Custom Fields) — all editable content uses `get_field()` |
| Font | Monument Grotesk (self-hosted via `@font-face` in `tailwind-input.css`) |

### Build command
```bash
npx tailwindcss -i ./assets/css/tailwind-input.css -o ./assets/css/tailwind-output.css
```
Run after any changes to `tailwind-input.css` or new Tailwind class usage.

---

## Design System — "VetaProf Editorial Light"

### Color Token System
CSS custom properties injected by `functions.php` (`my_theme_print_ui_system_variables`).
Use these Tailwind utility names — **never hardcode hex colors**:

| Token class | Meaning | Approx value |
|---|---|---|
| `bg-surface` / `text-on-surface` | Page background / primary text | White / #1a1c1d |
| `bg-on-surface` | Dark fill (footer, dark sections) | #1a1c1d |
| `bg-surface-container` | Subtle card background | Off-white |
| `text-on-surface-variant` | Secondary text | Medium gray |
| `text-secondary` | Accent / hover color | Teal (#3b6567 approx) |
| `border-outline-variant` | Subtle dividers | — |

### Typography Rules
- **Headings**: `font-headline font-black uppercase tracking-tighter` — Monument Grotesk
- **Labels**: `font-bold uppercase tracking-[0.3em] text-[10px]` (small caps labels)
- **Body**: `text-on-surface-variant leading-relaxed opacity-80`
- **h1 hero**: `text-[11vw] sm:text-6xl lg:text-[80px] font-black leading-none tracking-tight uppercase`
- **Section h2**: `text-5xl font-black uppercase tracking-tighter leading-none`

### Icons — Material Symbols
```html
<span class="material-symbols-outlined" style="font-size:24px; font-variation-settings:'FILL' 0,'wght' 300,'GRAD' 0,'opsz' 24;">
  icon_name
</span>
```
Common icons: `local_shipping`, `support_agent`, `verified`, `autorenew`, `trending_flat`, `add`, `close`, `search`, `shopping_bag`, `expand_more`, `lock`

---

## Animation System — BlurText

All text reveal animations use the **blur-text system** (`assets/js/blur-text.js`).

### Data attributes
```html
data-blur-text                          <!-- marks element for animation -->
data-blur-animate-on="load|scroll"      <!-- load = page load, scroll = IntersectionObserver -->
data-blur-delay="0.3"                   <!-- seconds before animation starts (load only) -->
data-blur-stagger="0.04"               <!-- seconds between each word -->
data-blur-strength="10"                 <!-- initial blur in px -->
```

### Rules
- Hero elements → `data-blur-animate-on="load"` with staggered delays (0.1 → 0.3 → 0.6 → 0.9)
- Below-fold headings → `data-blur-animate-on="scroll"`
- **Skip**: marquee text, elements with existing CSS animations, price/cart UI
- The engine splits text into `<span class="blur-word">` and animates with GSAP ScrollTrigger

### Pages wired
- `front-page.php` — hero span/h1/p/CTA (load), gender split h2, newsletter h2, instagram h2, why-us h2, FAQ h3 (scroll)
- `woocommerce/archive-product.php` — shop h1, category p (load)
- `woocommerce/content-single-product.php` — product h1 (load), details h2, recommendations h3 (scroll)
- `template-parts/section-about-header.php` — h1, subtitle p (load)
- `template-contact.php` — h2, subtitle p (load)

---

## Key File Map

```
my-theme/
├── functions.php              # Enqueues, ACF setup, WooCommerce hooks, customizer, UI tokens,
│                              # nav menu walkers (Veta_Header_Walker, Veta_Mobile_Walker,
│                              # Veta_Shop_Dropdown_Walker, Veta_Mobile_Cats_Walker),
│                              # vetaprof_get_color_value(), color term meta hooks
├── front-page.php             # Home page: hero, marquee, gender split, why-us, newsletter, instagram
├── header.php                 # Fixed nav, mega menu (dynamic via header-shop menu),
│                              # search panel, mobile menu overlay (dynamic via primary menu)
├── footer.php                 # Trust/promise strip + dark footer
├── template-contact.php       # Contact page template
├── template-about.php         # About page
├── woocommerce/
│   ├── archive-product.php    # Shop page: filter bar, AJAX filter, product grid
│   ├── content-single-product.php  # Product page: gallery, variations, details
│   └── content-product.php    # Product card in grid
├── template-parts/
│   ├── section-about-header.php
│   ├── ui/
│   │   ├── mini-cart.php      # NO BOM — was stripped 2026-04-01
│   │   └── product-gallery.php
│   └── sections/
├── assets/
│   ├── css/
│   │   ├── tailwind-input.css
│   │   └── admin-fast-products.css   # Fast Product Creator admin UI
│   └── js/
│       ├── blur-text.js
│       ├── admin-fast-products.js    # Fast Product Creator JS
│       └── ...
└── inc/
    ├── fast-products-admin.php       # Fast Product Creator + Couleurs/Tailles admin menu shortcuts
    ├── acf-blocks.php
    ├── acf-fields.php
    ├── acf-options.php
    ├── cpt-registration.php
    └── fast-checkout.php
```

---

## Navigation Menu System

### Registered locations (in `functions.php` → `my_theme_setup()`)
| Location slug | Label | Used in |
|---|---|---|
| `primary` | Navigation principale (Header) | Desktop nav links + mobile overlay items |
| `header-shop` | Header — Boutique Dropdown | Mega menu category links + mobile category pills |
| `footer-shop` | Footer — Vêtements Médicaux | Footer left nav column |
| `footer-info` | Footer — Informations | Footer right nav column |

### Walker classes (all in `functions.php`)
| Class | Renders |
|---|---|
| `Veta_Header_Walker` | Desktop nav `<a>` with active state classes |
| `Veta_Mobile_Walker` | Mobile overlay `<li><a>` full-width items |
| `Veta_Shop_Dropdown_Walker` | Mega menu `<a class="mega-link">` items |
| `Veta_Mobile_Cats_Walker` | Mobile category pill `<a>` links |

### Boutique dropdown fallback
If `header-shop` menu is not assigned → falls back to all WooCommerce top-level `product_cat` terms automatically. "Tous les Modèles" link is always hardcoded at the bottom.

### Setup
- Go to **Appearance → Menus** to create and assign menus to locations
- `primary`: add À propos, Contact, any other pages
- `header-shop`: add product category links to control which appear in the dropdown

---

## WooCommerce Architecture

- **Products**: Variable products with `pa_couleur` (color) and `pa_taille` (size) global attributes
- **Attributes admin**: **Products → Couleurs** and **Products → Tailles** shortcuts added to admin menu (via `inc/fast-products-admin.php`)
- **Color hex values**: `vetaprof_get_color_value( $name, $term_id )` in `functions.php`
  - Priority: term meta `color_code` → name lookup table → `#cccccc` fallback
  - Color picker field added to `pa_couleur` term edit form (**Products → Couleurs → Edit**)
- **Cart**: Custom AJAX cart sidebar (not the WC cart page)
- **Templates**: All WC templates overridden in `woocommerce/` folder

### ACF Fields used
| Page/Context | Field name | Use |
|---|---|---|
| Front page | `hero_title_line_1/2` | Hero heading |
| Front page | `hero_paragraph` | Hero subtext |
| Front page | `hero_background_image` | Hero right-side image |
| Front page | `featured_category_left/right` | Gender split (returns term ID) |
| Front page | `cta_background_image` | Newsletter section image |
| Front page | `instagram_gallery` (options) | Instagram grid |
| About | `about_header_title/subtitle/image` | About hero |
| Contact | `contact_page_title/subtitle` | Contact hero |
| Global options | `instagram_handle` | Instagram @handle |

---

## Customizer Settings

**Appearance → Customize** controls (via `my_theme_customize_register`):

| Section | Settings |
|---|---|
| Header Content | `header_logo`, mega menu images/links |
| Footer Content | `footer_logo`, `footer_description`, `footer_phone`, `footer_email`, `footer_address`, `footer_copyright` |
| Social Media | `social_instagram`, `social_facebook`, `social_twitter`, `social_linkedin`, `social_youtube` |
| UI System Controls | `ui_primary_color`, `ui_accent_color`, `ui_surface_color`, `ui_text_color` |

---

## Footer Architecture

Two parts in `footer.php`:

1. **Trust strip** (`#veta-promise`, white bg): 4 trust cards (Livraison, Retours, Service, Qualité) with GSAP stagger. H2 uses `data-blur-text`.

2. **Dark footer** (`#1a1c1d`): logo (customizer → WP custom logo → site name, inverted white via `filter: brightness(0) invert(1)`), description, social SVG icons; `footer-shop` nav; `footer-info` nav; contact column.

`veta_footer_social_icon( $key )` returns inline SVG for: `instagram`, `facebook`, `twitter`, `linkedin`, `youtube`, `tiktok`.

---

## Fast Product Creator (`inc/fast-products-admin.php`)

Admin tool under **WooCommerce → ⚡ Produits Rapide**.

### Features
- Single product form: name, category, type (variable/simple), prices, stock, descriptions, fast-buy toggle, SKU, featured image, gallery
- Color swatches (from `pa_couleur` terms with hex dots) + size pills (from `pa_taille` terms)
- Color-per-image assignment
- Variation matrix: price/stock override per color×size combination
- Bulk CSV import (sequential AJAX, one row at a time)

### HTML structure
All form fields use `.vfp-field` div containers — NOT label-as-container:
```html
<div class="vfp-field">
    <label for="id">Label</label>
    <input type="text" id="id" name="name">
</div>
```
Checkboxes use `.vfp-field-check`. All buttons need both base `vfp-btn` + modifier class.

### AJAX actions
| Action | Purpose |
|---|---|
| `veta_get_attributes` | Returns `pa_couleur` + `pa_taille` terms with hex |
| `veta_get_categories` | Returns product categories (with children) |
| `veta_create_product` | Creates single variable or simple product |
| `veta_bulk_import_row` | Creates one product from CSV row |
| `veta_csv_template` | Downloads CSV template file |

### Variation key format
`colorSlug + "||" + sizeSlug` (double pipe to avoid collision with single-word slugs)

---

## Development Conventions

### PHP
- Always use `esc_html()`, `esc_url()`, `wp_kses_post()` for output
- ACF fields: `get_field( 'field_name' ) ?: 'fallback'`
- WooCommerce checks: `class_exists('WooCommerce')` before WC function calls
- Enqueue scripts with `filemtime()` for cache busting

### CSS / Tailwind
- Use design token classes, never raw hex colors
- `inline-block` on animated elements (required for blur-word spans)
- Admin CSS: scope all selectors under `.vfp-wrap`, use `!important` on all layout/display properties to win against WP admin cascades

### JS
- All JS is vanilla — no jQuery (except WooCommerce internals and admin pages)
- GSAP is global — check `typeof gsap !== 'undefined'` before using
- New animation modules follow `blur-text.js` pattern

---

## Known Patterns to Avoid

- **Don't hardcode colors** — use `bg-on-surface`, `text-secondary` etc.
- **Don't use Webflow-style `translate3d(0, 120%, 0)` inline styles** — legacy animations on About/Contact replaced with blur-text
- **Don't double-init blur-text** — engine checks for `.blur-initialized` class
- **Don't load heavy scripts globally** — conditional enqueue with `is_product()`, `is_shop()` etc.
- **Don't add BOM to PHP files** — mini-cart.php had a BOM causing `&#xFEFF;` whitespace (fixed 2026-04-01)
- **Admin CSS**: don't use label-as-container pattern — use `.vfp-field` divs; always add `!important` to display/layout props

---

## Admin Menu Additions

Extra items added to the Products admin menu (via `inc/fast-products-admin.php`):
- **Products → Couleurs** → `edit-tags.php?taxonomy=pa_couleur&post_type=product`
- **Products → Tailles** → `edit-tags.php?taxonomy=pa_taille&post_type=product`

Menu highlighting is handled via `parent_file` and `submenu_file` filters.
