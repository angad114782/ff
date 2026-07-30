# Master Prompt for Claude Code — F&F Global Stock Checker Web App

> Copy-paste this entire prompt into Claude Code as your first instruction for the project. It contains the full scope (from Quotation QT/26-27/0002) + F&F's official brand design system (from their Brand Guidelines PDF) so every screen is generated on-brand from the first commit.

---

## 1. PROJECT OVERVIEW

Build a **Stock Checker Web Application** for F&F Global Pvt. Ltd. (a home decor / furnishings brand — tagline: "Designed for a life well lived").

**Tech stack:**
- Frontend: React (Vite), configured as a **Progressive Web App (PWA)** — installable, offline shell, no native APK/IPA
- Backend: Node.js + Express REST API
- Two frontend roles: **Admin Dashboard** and **Salesman Dashboard**
- Styling: Tailwind CSS, using the exact design tokens defined in Section 2 below (do not use default Tailwind blue/gray palette anywhere)

**Core modules (per signed quotation):**
1. React PWA Frontend — Admin Dashboard + Salesman Dashboard
2. Node.js REST API Backend (core engine)
3. API Integration Module — Admin Config Form (for MS Business Central API + other dealer portal credentials — Client ID, Secret, Tenant ID, Login/API key fields)
4. Barcode Scanner & Item Code Search Module (camera-based barcode scan using device camera + manual item-code search fallback)
5. FTP Integration & Shareable Link Generator (upload stock file to FTP, generate a shareable link for salesman to send to dealers/customers)

**Key functional flow:**
- Admin logs in → configures API credentials (Business Central, dealer portal, FTP) → uploads/syncs stock file (CSV/Excel) → manages salesman list (name, email, phone, branch)
- Salesman logs in (lightweight role) → scans barcode or searches item code → sees live stock status → generates a shareable FTP link for that item/stock file to send to a dealer/customer over WhatsApp

---

## 2. F&F BRAND DESIGN SYSTEM (from official Brand Guidelines)

Implement this as a `tailwind.config.js` theme extension + a `:root` CSS variables block. Use ONLY these colors, fonts, and spacing values across the entire app — no default Tailwind colors, no random hex codes.

### 2.1 Color Palette

**Primary palette (use for Master brand touchpoints — most of the app UI):**

| Name | Hex | Usage |
|---|---|---|
| Wild Terracotta | `#B25E44` | Primary brand accent — primary buttons, active nav item, key CTAs, brand icon color |
| Sand | `#F2E5D6` | Warm background tint — card backgrounds, subtle section backgrounds, hover states |
| Soft Sage | `#AEAC90` | Secondary accent — secondary buttons, borders, muted UI elements, tags |
| Linen White | `#FCFDF5` | Base app background (replaces plain white everywhere) |

**Secondary palette (earthy accents — use for depth, contrast, status/data-viz, not as base colors):**

| Name | Hex | Usage |
|---|---|---|
| Lived In Green | `#525937` | Success states, "in stock" badges, positive indicators |
| Grey Sage | `#C9C6B3` | Disabled states, dividers, table row stripes, placeholder text backgrounds |
| Deep Terracotta | `#8D381E` | Error states, "out of stock" badges, destructive action buttons, alerts |

**Tailwind config:**
```js
// tailwind.config.js
theme: {
  extend: {
    colors: {
      terracotta: { DEFAULT: '#B25E44', deep: '#8D381E' },
      sand: '#F2E5D6',
      sage: { soft: '#AEAC90', grey: '#C9C6B3' },
      linen: '#FCFDF5',
      green: { livedin: '#525937' },
    }
  }
}
```

**Usage rules:**
- App background: `linen` (`#FCFDF5`), never pure white `#FFFFFF`
- Primary button: `terracotta` bg, `linen` text, hover = darken 8%
- Secondary/outline button: `sage-soft` border, `terracotta` text
- Cards/panels: `linen` bg with `sand` as a subtle inner background or hover tint, 1px `sage-grey` border
- "In Stock" badge: `green-livedin` bg (10% opacity) + `green-livedin` text
- "Out of Stock" / error badge: `terracotta-deep` bg (10% opacity) + `terracotta-deep` text
- Table stripes / dividers: `sage-grey` at low opacity
- Never place `terracotta` text on `sand`/`linen` at low contrast — check WCAG AA before finalizing

### 2.2 Typography

- **Primary typeface — Spline Sans** (Google Fonts, free) — use for ALL headings, sub-headings, and body copy. Weights: Regular (400), Medium (500), SemiBold (600).
- **Secondary typeface — Adventures Unlimited** (Adobe/paid font) — use **only** for large hero-style headings or key brand statements (e.g. login screen welcome text, empty-state headline). **Never** use it for body copy, table text, form labels, or anything below ~24px — it hurts readability at small sizes.
  - If Adventures Unlimited isn't available/licensed for this project, fall back to Spline Sans SemiBold italic for those spots and flag it to the client — do not substitute a random script font.

```html
<!-- Google Fonts import -->
<link href="https://fonts.googleapis.com/css2?family=Spline+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

```js
// tailwind.config.js
fontFamily: {
  sans: ['Spline Sans', 'sans-serif'],       // default body/UI font
  display: ['Adventures Unlimited', 'cursive'] // hero/marketing headings ONLY
}
```

**Type scale (use consistently, don't invent new sizes):**

| Token | Size | Weight | Use |
|---|---|---|---|
| `text-xs` | 12px | Regular | table meta, timestamps |
| `text-sm` | 14px | Regular/Medium | body, form labels, table cells |
| `text-base` | 16px | Regular | default body text |
| `text-lg` | 18px | Medium | card titles, section labels |
| `text-xl`/`text-2xl` | 20–24px | SemiBold | page titles, dashboard headers |
| `text-4xl`+ | 36px+ | Adventures Unlimited | login screen / empty states only |

### 2.3 Spacing, Padding & Sizing

Use Tailwind's default 4px base spacing scale consistently — don't mix arbitrary pixel values:

- **Component internal padding:** `p-4` (16px) for cards/panels, `p-3` (12px) for compact list items, `p-6` (24px) for main content containers
- **Gap between form fields:** `gap-4` (16px)
- **Gap between cards in a grid:** `gap-4` to `gap-6`
- **Page container padding:** `px-4 py-6` on mobile, `px-8 py-8` on desktop (`md:` breakpoint)
- **Buttons:** `px-5 py-2.5` for primary buttons, `text-sm` font, `rounded-lg` (8px radius)
- **Inputs:** `px-3 py-2.5`, `rounded-md` (6px radius), `border border-sage-grey`, focus ring in `terracotta` at 40% opacity
- **Border radius scale:** `rounded-md` (6px) for inputs/small elements, `rounded-lg` (8px) for buttons/cards, `rounded-xl` (12px) for modals/large containers — stay within this scale, don't use `rounded-full` except for avatars/status dots
- **Shadows:** keep subtle — `shadow-sm` on cards, `shadow-md` only on modals/dropdowns. Brand feels warm and understated, not glossy/heavy-shadow SaaS style.

### 2.4 Brand Visual Motifs (optional but on-brand touches)

- **"The Arch"** — F&F's signature shape is a soft arch (from the negative space of their monogram). Use a subtle arch-shaped border-radius (e.g. `rounded-t-full` on card tops, or an arch SVG divider) on the login screen and empty states for brand flavor — don't overuse in dense data screens (tables, dashboards should stay clean/functional).
- **"The Line"** — a simple horizontal rule/divider element; can be used as a section separator styled in `terracotta`, thin (1–2px).
- Overall tone: warm, earthy, uncluttered, "quiet luxury" — not a generic bright-blue SaaS dashboard. Avoid pure blues/purples/neon anywhere.

---

## 3. SCREENS TO BUILD

1. **Login** (role-based: Admin / Salesman) — Adventures Unlimited headline, Linen White bg, Terracotta CTA
2. **Admin Dashboard** — stock overview stats, recent syncs, quick links
3. **Admin Config Form** — Business Central API (Client ID, Secret, Tenant ID), Dealer Portal login/API key, FTP server details (host, port, username, password), domain input, hosting preference
4. **Salesman Management** — list/add/edit salesmen (name, email, phone, branch)
5. **Stock Upload** — CSV/Excel upload, validation, sync status
6. **Barcode Scanner / Item Search** — camera scan (use `react-qr-barcode-scanner` or similar) + manual search fallback, live stock result card (In Stock / Out of Stock badge using the color rules above)
7. **Shareable Link Generator** — generate FTP-hosted shareable link for a stock file/item, copy-to-clipboard + WhatsApp share button

---

## 4. INSTRUCTIONS TO CLAUDE CODE

1. First scaffold the Vite React + PWA project and Express backend as two folders (`/client`, `/server`) in a monorepo structure.
2. Set up `tailwind.config.js` and global CSS variables exactly as specified in Section 2 before building any screen.
3. Build a shared component library first: `Button`, `Input`, `Card`, `Badge`, `Table`, `Modal` — all styled per Section 2 — before building full pages, so every screen reuses the same primitives.
4. Build screens in the order listed in Section 3.
5. Keep barcode scanning and FTP/API credential logic in clearly separated backend service files (`services/barcodeService.js`, `services/ftpService.js`, `services/bcApiService.js`) for maintainability.
6. Do not hardcode any client secrets — all API credentials come from the Admin Config Form and are stored securely (env-based encryption or DB with encryption at rest).
7. Confirm the color/type tokens are wired into Tailwind config correctly before generating any UI — ask me to review the design system implementation on a blank styled page before building out full screens.
