# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Marnthara Tool** — a curtain and interior decoration pricing/quotation calculator. Single-page application built with Vite + vanilla JavaScript (no framework). Deployed to GitHub Pages (`base: "./"`). UI text is primarily in Thai.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build

npm run lint         # Run JS + CSS linters (zero warnings allowed)
npm run lint:js      # ESLint only
npm run lint:css     # Stylelint only
npm run lint:fix     # Auto-fix lint + format issues
npm run format       # Prettier format all files

npm run test:unit    # Vitest unit tests (jsdom environment)
npm run test:e2e     # Playwright E2E tests (auto-starts dev server, tests in ./tests/)
npm test             # lint + unit tests

# Run a single unit test file
npx vitest run path/to/file.test.js
```

## Architecture

### Template-Cloning Component Pattern

Components in `src/components/` are **not** Custom Elements. They are factory functions (e.g., `createSetItem(data)`) that clone `<template>` elements defined in `index.html` and wire up event listeners. The flow:

1. `index.html` defines `<template id="setTpl">`, `<template id="wallpaperTpl">`, etc.
2. Factory functions call `template.content.cloneNode(true)`, populate from `data`, attach listeners
3. The cloned element is inserted into the DOM under a room's items container

All template IDs and DOM selectors are centralized in the `SELECTORS` object in `src/lib/config.js`. Item type metadata (template ID, Thai display name) is in `ITEM_CONFIG`.

### State Management

- **DOM-centric**: state lives in HTML `data-*` attributes on item/room elements
- **LocalStorage**: persisted under keys `marnthara.input.v6.1` (quotation) and `marnthara.shop.config.v1` (shop config)
- **Undo/Redo**: managed in `src/lib/undoManager.js` (stack of JSON-cloned payloads, max 10)
- **Save cycle**: user action → `buildPayload()` reads DOM → serializes to localStorage

### Module Dependency Flow

```
main.js → ui.js (orchestrator)
             ├→ ui-actions.js (add/duplicate/move items)
             ├→ ui-modals.js (modal dialogs)
             ├→ ui-favorites.js (favorites panel)
             ├→ storage.js → config.js
             ├→ calculations.js → config.js
             └→ components/* (factory functions)
documentGenerator.js → ui.js (imports getShopConfig)
```

Note: `documentGenerator.js` imports `getShopConfig()` from `ui.js`, creating a cross-dependency between these large modules.

### Key Source Files

- **`src/lib/config.js`** — Central constants: `PRICING` (price lists), `SELECTORS` (all DOM selectors), `ITEM_CONFIG` (item type registry), `HARDWARE_FIELDS` (curtain hardware options)
- **`src/lib/calculations.js`** — Exports `CALC` object with all pricing/measurement formulas (fabric yardage, area-based pricing, wallpaper rolls)
- **`src/lib/utils.js`** — Shared utilities: `toNum`, `fmtTH`, `bahttext` (number-to-Thai-text), `handleCmToMBlur` (auto CM→M conversion), `sanitizeHTML`
- **`src/lib/ui.js`** — Core UI orchestrator; holds module-level `activeShopConfig` state
- **`src/lib/documentGenerator.js`** — PDF/quotation/summary generation via jsPDF + html2canvas
- **`src/styles/main.css`** — Single stylesheet (Material Design 3 theme, light/dark modes)
- **`src/main.js`** — Entry point; init sequence: theme → dropdowns → event listeners → load shop config → restore localStorage → recalculate → update UI

### Item Types

Curtain Sets, Wallpaper, Wooden/Roller/Vertical/Aluminum Blinds, Room Dividers, Pleated Screens, Custom Items, Removal Services. Each type maps to a factory function and template — see `ITEM_CONFIG` in `config.js`.

**Code/SKU field**: Only `setTpl`, `areaBasedTpl`, and `wallpaperTpl` include a code/SKU input (used to look up items in favorites). `removalTpl` and `customItemTpl` intentionally omit it — removal services are not catalogued, and custom items are free-text by definition.

### Pricing

All pricing constants live in the `PRICING` object in `src/lib/config.js`. Calculation formulas are in `CALC` (`calculations.js`). Dimension inputs auto-convert CM→M on blur (whole numbers ≥ 5 are assumed centimeters).

### Styling & Linting

- Prettier: 4-space indentation (spaces), double quotes, semicolons, trailing commas (ES5)
- ESLint: flat config (`eslint.config.js`), Babel parser, JSDoc in TypeScript mode, zero warnings allowed
- Stylelint: `stylelint-config-standard` with relaxed `selector-class-pattern` and `custom-property-pattern`

### Testing

- **Unit tests** (Vitest): jsdom environment. Vitest excludes `**/tests/**` (Playwright's directory)
- **E2E tests** (Playwright): live in `./tests/`, auto-start dev server, headless by default

### Runtime Dependencies of Note

- `html2canvas` — Used in PDF export to capture DOM as images

## PWA

Installed via `vite-plugin-pwa` + Workbox (`vite.config.js`). Icons are in `public/` (pwa-64x64.png, pwa-192x192.png, pwa-512x512.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png). Source SVG: `public/pwa-icon.svg`. Regenerate icons: `npx pwa-assets-generator --preset minimal-2023 public/pwa-icon.svg`.

## Recent Changes (Phase 6, Apr 2026)

### Notes fields: input → textarea
All notes fields in `index.html` templates are unified as `<textarea name="notes" rows="2">` — `area_notes` and `wallpaper_notes` were renamed to `notes` for consistency. Selectors in components and `config.js` use `'[name="notes"]'` scoped to each item element. `documentGenerator.js` uses `_nlToBr(text)` helper (sanitize + `\n→<br>`) for all notes in PDF output.

### Clear vs Delete fix (`ui-toolbar.js`)
- **"ล้างทุกรายการ"** now calls `setDocumentState(…)`, resets `#quote_date`, calls `updateLockState()`, and calls `saveData()`.
- **"ลบข้อมูลทั้งหมด"** now also calls `localStorage.removeItem(SHOP_CONFIG_KEY)`.

### RCC Modal fixes (`modals.css`)
- `dialog.room-control-center-modal` is now a flex column with `max-height: min(90vh, 90svh)` so the tab bar stays pinned.
- `#general-settings .defaults-inputs-grid` now has `display: grid` (was missing, causing single-column layout).

### Mobile CSS (`src/styles/mobile.css`)
New file — imported last in `main.css`. Contains `@media (width <= 480px)` and `@media (width <= 360px)` overrides, iOS safe-area inset on `.summary-footer`, date/time input styling, and `overscroll-behavior-y: contain`.
