# Marnthara Tool — Developer Handbook

ระบบคำนวณและออกใบเสนอราคาสำหรับงานติดตั้งผ้าม่าน วอลล์เปเปอร์ และมู่ลี่  
Single-Page Application · Vite + Vanilla JavaScript (ไม่มี Framework) · Deploy บน GitHub Pages

---

## สารบัญ

1. [Quick Start](#1-quick-start)
2. [Tech Stack & เครื่องมือ](#2-tech-stack--เครื่องมือ)
3. [โครงสร้างโปรเจกต์](#3-โครงสร้างโปรเจกต์)
4. [สถาปัตยกรรมหลัก (Architecture)](#4-สถาปัตยกรรมหลัก-architecture)
5. [Data Flow — วงจรข้อมูล](#5-data-flow--วงจรข้อมูล)
6. [Module Dependency Map](#6-module-dependency-map)
7. [CSS Architecture](#7-css-architecture)
8. [การเพิ่ม Item Type ใหม่](#8-การเพิ่ม-item-type-ใหม่)
9. [การเพิ่ม Modal ใหม่](#9-การเพิ่ม-modal-ใหม่)
10. [การทดสอบ](#10-การทดสอบ)
11. [Linting & Formatting](#11-linting--formatting)
12. [ประวัติการ Refactor (Phase Log)](#12-ประวัติการ-refactor-phase-log)
13. [Known Issues & งานที่ยังค้างอยู่](#13-known-issues--งานที่ยังค้างอยู่)
14. [LocalStorage Schema](#14-localstorage-schema)

---

## 1. Quick Start

```bash
# ติดตั้ง dependencies
npm install

# เริ่ม dev server (http://localhost:5173)
npm run dev

# Build สำหรับ production
npm run build

# รันทุก lint + unit tests (ต้องผ่านก่อน commit)
npm test
```

> **หมายเหตุ:** โปรเจกต์นี้ไม่มี git repository โปรดสร้าง git repo ก่อนเริ่มพัฒนาต่อ:
> ```bash
> git init && git add . && git commit -m "initial commit"
> ```

---

## 2. Tech Stack & เครื่องมือ

| หมวด | เครื่องมือ | หมายเหตุ |
|---|---|---|
| Build | **Vite 7** | `base: "./"` สำหรับ GitHub Pages |
| Language | Vanilla JavaScript (ES Modules) | ไม่มี framework |
| Styling | CSS Custom Properties (Material Design 3) | ไม่มี CSS-in-JS |
| PDF | **html2canvas** | Capture DOM เป็นภาพ |
| Unit Test | **Vitest** (jsdom environment) | `src/lib/__tests__/` |
| E2E Test | **Playwright** | `tests/` (ยังไม่มีไฟล์ test) |
| JS Lint | **ESLint 9** (flat config) + JSDoc + Prettier | `eslint.config.js` |
| CSS Lint | **Stylelint** (`stylelint-config-standard`) | `.stylelintrc.json` |
| Format | **Prettier** | `.prettierrc.json` — 4 spaces, double quotes |

---

## 3. โครงสร้างโปรเจกต์

```
/
├── index.html                  # SPA shell — มี <template> elements และ HTML ทั้งหมด
├── src/
│   ├── main.js                 # Entry point — init sequence
│   ├── styles/
│   │   ├── main.css            # Aggregator (@import เท่านั้น ห้ามเขียน CSS ที่นี่)
│   │   ├── tokens.css          # CSS Custom Properties (สี, spacing, radius, shadow)
│   │   ├── base.css            # Reset, typography, layout shell
│   │   ├── components.css      # Room cards, item cards, menus, SVG previews
│   │   ├── forms.css           # Form groups, inputs, radio cards, fieldsets
│   │   ├── buttons.css         # .btn variants, .btn-icon, .btn-chip
│   │   ├── modals.css          # Dialog framework + modal-specific content styles
│   │   ├── utilities.css       # Animations, toast, visibility helpers, SVG classes
│   │   └── print.css           # PDF/print layout (A4 page structure)
│   ├── lib/
│   │   ├── config.js           # Constants: APP_VERSION, PRICING, SELECTORS, ITEM_CONFIG
│   │   ├── calculations.js     # CALC object — สูตรคำนวณทุกอย่าง
│   │   ├── utils.js            # toNum, fmtTH, bahttext, debounce, sanitizeHTML
│   │   ├── storage.js          # buildPayload(), saveData() — DOM → JSON → localStorage
│   │   ├── migrate.js          # migratePayload() — normalize payload จาก localStorage/import
│   │   ├── store.js            # In-memory room total cache (Map-based)
│   │   ├── shopConfig.js       # Shop config state (localStorage key: marnthara.shop.config.v1)
│   │   ├── undoManager.js      # Undo stack (max 10 steps, JSON clone)
│   │   ├── modal.js            # showModal(), showToast(), showConfirmation()
│   │   ├── favorites.js        # Favorites data management
│   │   ├── ui.js               # Orchestrator — recalcRoom, recalcGrandTotal, loadPayload
│   │   ├── ui-actions.js       # addRoom, duplicateItem, moveItem
│   │   ├── ui-click-actions.js # Delegated click handler (data-act routing)
│   │   ├── ui-form-handlers.js # Delegated form events (input, change, blur, keydown)
│   │   ├── ui-toolbar.js       # Toolbar buttons (save, export, import, undo)
│   │   ├── ui-modals.js        # Modal-specific open/populate/close logic
│   │   ├── ui-favorites.js     # Favorites panel UI
│   │   └── documentGenerator.js # PDF/quotation generation (jsPDF + html2canvas)
│   ├── components/
│   │   ├── baseItem.js         # Shared helpers: cloneTemplate, setupRecalcPipeline
│   │   ├── SetItem.js          # ผ้าม่าน (ชุด) — factory function
│   │   ├── WallpaperItem.js    # วอลล์เปเปอร์ — factory function
│   │   ├── AreaBasedItem.js    # มู่ลี่ไม้/ม้วน/ปรับแสง/ฉาก/มุ้งจีบ/อลูมิเนียม
│   │   ├── RemovalItem.js      # รื้อถอน — factory function
│   │   ├── CustomItem.js       # รายการอื่นๆ (custom price) — factory function
│   │   └── RoomCard.js         # Room container — factory function
│   └── lib/__tests__/
│       ├── calculations.test.js  # 56 unit tests
│       └── utils.test.js         # 26 unit tests
├── src/styles_Backup/
│   └── main.css                # CSS ต้นฉบับ 4,603 บรรทัด (ก่อน Phase 5B split)
│                               # เก็บไว้สำหรับ reference เท่านั้น ห้ามแก้ไข
├── eslint.config.js            # ESLint flat config (JS + CSS + JSON + Markdown)
├── .stylelintrc.json           # Stylelint config
├── .prettierrc.json            # Prettier config
├── vite.config.js              # Vite + Vitest config
└── CLAUDE.md                   # Instructions สำหรับ Claude Code AI
```

---

## 4. สถาปัตยกรรมหลัก (Architecture)

### 4.1 Template-Cloning Component Pattern

Components ใน `src/components/` ไม่ใช่ Custom Elements — เป็น **factory functions** ที่ clone `<template>` จาก `index.html`:

```javascript
// ตัวอย่างการทำงาน
export function createSetItem(data) {
    const el = cloneTemplate(SELECTORS.setTpl, "set"); // clone <template id="setTpl">
    // ... populate fields from data ...
    el.getItemData = () => ({ type: "set", ... }); // expose ให้ storage.js เรียก
    return el;
}
```

**Flow:** `index.html` defines template → factory clones it → wire up events → insert into DOM

### 4.2 DOM-Centric State

**ไม่มี global state object** — state อยู่ใน DOM ทั้งหมด:
- ค่า input ← HTML `<input>` values
- สถานะ suspended ← `.is-suspended` class บน element
- ข้อมูลห้อง ← `data-room-defaults` attribute บน `.room-card`
- ราคาต่อ item ← `data-total-price` attribute บน `.item-card`

**ข้อยกเว้น:** `store.js` เก็บ per-room total cache ใน `Map` เพื่อ performance (ไม่ใช่ source of truth — เป็นแค่ cache)

### 4.3 Calculation Pipeline

```
User input (input/change event)
    → debounced (200ms) → item's internal recalcFn()
    → sets data-total-price on item element
    → dispatches "item-update" CustomEvent (bubbles)
    → ui-form-handlers.js ดัก → recalcRoom(roomEl)
    → store.setRoomTotal(roomId, total, count, suspended)
    → recalcGrandTotal()
    → reads store.computeSubTotal()
    → applies discount/VAT
    → updates #grandTotal display
    → saveData()
```

### 4.4 Modal System (Native `<dialog>`)

Modal ทุกตัวใช้ HTML `<dialog class="modal">` + `showModal.js`:

```javascript
// เปิด modal แบบ Promise
const result = await showModal("#myModal");
if (result === true) { /* confirmed */ }
if (result?.cancelled) { /* cancelled/closed */ }
```

**Magic Bridge:** `modal.js` ใช้ `MutationObserver` สังเกต `.show` class → เรียก `dialog.showModal()` อัตโนมัติ ทำให้ code เดิมที่ toggle class ยังทำงานได้

### 4.5 Save Cycle

```
user action → DOM changes → saveData() (debounced 300ms)
                              ↓
                         buildPayload()     ← อ่านจาก DOM
                              ↓
                    localStorage.setItem(STORAGE_KEY, JSON)
```

**ไม่มี server** — ข้อมูลอยู่ใน localStorage ทั้งหมด

---

## 5. Data Flow — วงจรข้อมูล

### Load (เปิดหน้า / Import ไฟล์)

```
localStorage / JSON file
    → migratePayload(raw)      ← normalize schema, fill missing fields
    → loadPayload(clean, isImport)
    → สร้าง room cards + item cards จาก payload.rooms
    → recalcAll()
```

### Save (เกิดทุกครั้งที่ user แก้ไข)

```
DOM state
    → buildPayload()           ← traverse DOM, เรียก el.getItemData() ต่อ item
    → JSON.stringify()
    → localStorage.setItem(STORAGE_KEY, ...)
```

### Export / PDF

```
buildPayload() → JSON file download   (Export JSON)
DOM elements  → html2canvas → jsPDF  (Export PDF)
```

---

## 6. Module Dependency Map

```
main.js
  └─→ ui.js  (orchestrator)
        ├─→ store.js           (room total cache)
        ├─→ migrate.js         (payload normalization)
        ├─→ storage.js         (buildPayload, saveData)
        ├─→ calculations.js    (CALC formulas)
        ├─→ shopConfig.js      (shop config state)
        ├─→ undoManager.js     (undo/redo stack)
        ├─→ modal.js           (showModal, showToast)
        ├─→ favorites.js       (favorites data)
        ├─→ ui-actions.js      (addRoom, duplicateItem)
        ├─→ ui-click-actions.js (delegated click handler)
        ├─→ ui-form-handlers.js (delegated form events)
        ├─→ ui-toolbar.js      (toolbar buttons)
        ├─→ ui-modals.js       (modal open/populate)
        ├─→ ui-favorites.js    (favorites panel)
        └─→ components/
              ├─→ RoomCard.js
              ├─→ SetItem.js
              ├─→ WallpaperItem.js
              ├─→ AreaBasedItem.js
              ├─→ RemovalItem.js
              └─→ CustomItem.js

documentGenerator.js
  └─→ ui.js  (imports getShopConfig — cross-dependency, ระวัง circular)
```

> **ข้อระวัง:** `documentGenerator.js` import `getShopConfig` จาก `ui.js` ซึ่ง import จาก `shopConfig.js` อีกทอดหนึ่ง หากต้องการแก้ circular dependency ในอนาคต ให้ import จาก `shopConfig.js` โดยตรง

---

## 7. CSS Architecture

### ลำดับ @import (ห้ามสลับ — ส่งผลต่อ Specificity)

```
tokens.css      → CSS variables ทั้งหมด (--primary, --surface, --border-radius-md ฯลฯ)
base.css        → Reset, body, layout shell, theme classes
components.css  → Room/item cards, menus, quick-nav, dropdown
forms.css       → Form groups, inputs, radio cards, fieldsets
buttons.css     → .btn, .btn-icon, .btn-chip, .btn-primary ฯลฯ
modals.css      → dialog framework + discount/overview/lookbook/RCC/favorites modals
utilities.css   → Animations, toast, visibility helpers, SVG visualization classes
print.css       → PDF/print layout (A4, @page)
mobile.css      → Mobile overrides (≤480px, ≤360px) + iOS safe-area + date inputs
```

> **หมายเหตุ:** `mobile.css` ต้อง import **หลังสุด** เสมอ เพราะ override breakpoints ของไฟล์อื่น

### Theming

มี 3 themes ใน `tokens.css`:
- `:root` — Light theme (default)
- `body.dark-theme` — Dark theme
- `body.neutral-theme` — Neutral/Greige theme

### SVG Visualization Classes

`.blind-frame`, `.curtain-panel-opaque`, `.wooden-blind-slat` ฯลฯ อยู่ท้าย `utilities.css`  
ใช้สำหรับ SVG previews ใน Lookbook modal — สีทั้งหมดอิงจาก CSS custom properties เพื่อ dark mode support

### CSS Backup

`src/styles_Backup/main.css` คือต้นฉบับ 4,603 บรรทัดก่อน Phase 5B split  
**ห้ามแก้ไข** — เก็บไว้สำหรับ reference และการ migrate รูปแบบเก่าเท่านั้น

---

## 8. การเพิ่ม Item Type ใหม่

ตัวอย่าง: เพิ่ม item type "ม่านโรลเลอร์ชนิดใหม่"

### ขั้นตอน

**1. เพิ่ม `<template>` ใน `index.html`**
```html
<template id="myNewItemTpl">
  <article class="item-card" data-type="my_new_type">
    <!-- form fields -->
  </article>
</template>
```

**2. ลงทะเบียนใน `config.js`**
```javascript
// ใน ITEM_CONFIG
my_new_type: { templateId: "#myNewItemTpl", name: "ม่านใหม่" },
```

**3. สร้าง factory function ใน `src/components/MyNewItem.js`**
```javascript
import { cloneTemplate, setupRecalcPipeline } from "./baseItem.js";
import { SELECTORS } from "../lib/config.js";

export function createMyNewItem(data = {}) {
    const el = cloneTemplate(SELECTORS.myNewItemTpl, "my_new_type");
    // wire up fields, set data from data object
    el.getItemData = () => ({ type: "my_new_type", /* ... */ });
    return el;
}
```

**4. Register ใน `ui.js`**
```javascript
import { createMyNewItem } from "../components/MyNewItem.js";

// ใน loadPayload() switch/if block — เพิ่ม case
case "my_new_type":
    itemEl = createMyNewItem(item);
    break;
```

**5. Register ใน `ui-actions.js`** สำหรับปุ่ม "เพิ่มรายการ"
```javascript
// ใน createItemByType()
case "my_new_type":
    return createMyNewItem();
```

**6. เพิ่ม selector ใน `config.js`**
```javascript
// ใน SELECTORS
myNewItemTpl: "#myNewItemTpl",
```

**7. เพิ่ม CSS color token** (ถ้าต้องการสี unique) ใน `tokens.css`
```css
--my-new-type-color: oklch(55% 0.15 250);
--my-new-type-container-color: oklch(92% 0.06 250);
```

**8. เพิ่ม normalize ใน `migrate.js`** (ถ้า item มี fields พิเศษ)

---

## 9. การเพิ่ม Modal ใหม่

**1. เพิ่ม `<dialog>` ใน `index.html`**
```html
<dialog class="modal" id="myNewModal" aria-modal="true">
  <div class="modal-header">
    <h2 class="modal-title">หัวข้อ</h2>
    <button class="btn-close-modal" data-act="close-modal">
      <i class="ph-bold ph-x"></i>
    </button>
  </div>
  <div class="modal-body">
    <!-- content -->
  </div>
  <div class="modal-footer">
    <button id="myNewModalConfirm" class="btn btn-primary">ยืนยัน</button>
  </div>
</dialog>
```

**2. เพิ่ม selector ใน `config.js`**
```javascript
myNewModal: "#myNewModal",
```

**3. เปิด/ปิดผ่าน `modal.js`**
```javascript
import { showModal } from "./modal.js";

const result = await showModal(SELECTORS.myNewModal);
if (result === true) {
    // user กด Confirm
}
```

**4. เพิ่ม CSS ใน `modals.css`** (ถ้า modal มี content พิเศษ)

> **ข้อกำหนด:** ปุ่มปิดต้องมี `data-act="close-modal"` หรือ class `.btn-close-modal`  
> ปุ่มยืนยัน ID ต้องลงท้ายด้วย `Confirm` หรือ `ConfirmBtn` หรืออยู่ใน `.modal-footer .btn-primary`

---

## 10. การทดสอบ

```bash
# Unit tests (Vitest + jsdom) — เร็ว ไม่ต้อง browser
npm run test:unit

# E2E tests (Playwright) — เปิด browser จริง
npm run test:e2e    # (ยังไม่มีไฟล์ test ใน ./tests/)

# รันทั้งหมด (lint + unit)
npm test
```

### Unit Tests ที่มีอยู่

| ไฟล์ | จำนวน | ครอบคลุม |
|---|---|---|
| `calculations.test.js` | 56 tests | CALC formulas ทุกตัว (fabric yardage, wallpaper rolls, area pricing) |
| `utils.test.js` | 26 tests | toNum, fmtTH, bahttext, fmtDimension, debounce |

### การเพิ่ม Unit Test

สร้างไฟล์ใน `src/lib/__tests__/` ชื่อ `*.test.js`:
```javascript
import { describe, it, expect } from "vitest";
import { CALC } from "../calculations.js";

describe("CALC.myNewFunction", () => {
    it("should return correct value", () => {
        expect(CALC.myNewFunction(2.4)).toBe(6.9);
    });
});
```

> **หมายเหตุ:** Vitest exclude โฟลเดอร์ `./tests/` (ของ Playwright) อัตโนมัติ — ห้ามวาง unit test ที่นั่น

---

## 11. Linting & Formatting

```bash
npm run lint          # รัน JS lint + CSS lint (ต้องผ่าน 0 errors)
npm run lint:js       # ESLint เฉพาะ JS/CSS/JSON/Markdown
npm run lint:css      # Stylelint เฉพาะ CSS
npm run lint:fix      # Auto-fix ทุกอย่างที่ fix ได้
npm run format        # Prettier format (4 spaces, double quotes, trailing comma)
```

### Config Highlights

**`.stylelintrc.json`**
```json
{
  "rules": {
    "selector-class-pattern": null,   // ยอมรับ camelCase class (Thai naming)
    "selector-id-pattern": null,      // ยอมรับ camelCase ID (#discountVatAmountRow)
    "no-descending-specificity": null, // ปิด เพราะ CSS มีการ nest แบบ cascade
    "selector-not-notation": null,    // ยอมรับ :not(a):not(b) syntax เก่า
    "property-no-deprecated": null    // ยอมรับ -webkit- prefix และ clip
  }
}
```

**`eslint.config.js`**
- JS: ESLint recommended + JSDoc (typescript mode) + Prettier
- CSS: `@eslint/css` ปิด `css/no-invalid-properties` และ `css/use-baseline` (ไม่ support CSS variables)
- Ignore: `dist/`, `node_modules/`, `src/styles_Backup/`

---

## 12. ประวัติการ Refactor (Phase Log)

โปรเจกต์นี้ผ่านการ refactor มาหลาย phase จาก monolithic codebase (app.js เดียว) สู่ modular architecture:

| Phase | สิ่งที่ทำ | ไฟล์หลักที่เกี่ยวข้อง |
|---|---|---|
| **1** | Vite migration — แยก entry point, setup build | `main.js`, `vite.config.js` |
| **2A** | แยก form event delegation | `ui-form-handlers.js` |
| **2B** | แยก click action routing | `ui-click-actions.js` |
| **3A** | แยก component factory pattern — `baseItem.js` | `baseItem.js`, `components/` |
| **3B** | แยก RoomCard component | `RoomCard.js` |
| **4A** | สร้าง in-memory store สำหรับ room totals | `store.js` |
| **4B** | สร้าง payload migration/normalization | `migrate.js` |
| **4C** | Targeted recalc — `recalcRoom()` + `recalcGrandTotal()` | `ui.js`, `ui-form-handlers.js` |
| **4D** | Integrate migrate.js เข้า loadPayload() | `ui.js` |
| **5A** | Native `<dialog>` migration — แทน div-based modals | `modal.js`, `modals.css` |
| **5B** | CSS split — main.css 4,600+ บรรทัด → 8 ไฟล์ | `src/styles/` |
| **5B fix** | Restore missing CSS หลัง split (modals, SVG styles) | `modals.css`, `utilities.css` |
| **6A** | PWA + Mobile — vite-plugin-pwa, mobile.css, PWA icons | `vite.config.js`, `mobile.css`, `public/` |
| **6B** | Multi-line notes — textarea แทน input, `_nlToBr()` ใน PDF | `index.html`, `documentGenerator.js`, components |
| **6C** | Fix Clear/Delete handlers + RCC grid/scroll bugs | `ui-toolbar.js`, `modals.css` |

### สิ่งสำคัญที่เปลี่ยนใน Phase 4C (Targeted Recalc)

เดิม: ทุก event trigger `recalcAll()` → traverse DOM ทุก room  
ปัจจุบัน:
- `item-update` event → `recalcRoom(roomEl)` → `recalcGrandTotal()` (O(1) per room)
- `recalcAll()` ยังอยู่สำหรับ full resync (load, delete room, suspend room)
- ลด latency grand total update จาก ~400ms → ~200ms

### สิ่งสำคัญที่เปลี่ยนใน Phase 5A (Native Dialog)

เดิม: `.modal-wrapper` div + `classList.add("is-open")`  
ปัจจุบัน: `<dialog class="modal">` + `classList.add("show")` → `MutationObserver` → `dialog.showModal()`

Code เก่าที่ toggle `.show` class ยังทำงานได้ผ่าน Magic Bridge ใน `modal.js`

---

## 13. Known Issues & งานที่ยังค้างอยู่

### งาน High Priority

- **[ ] สร้าง Git repository** — โปรเจกต์ยังไม่มี git history ทั้งหมด
- **[ ] E2E Tests** — โฟลเดอร์ `./tests/` ว่างอยู่ ยังไม่มี Playwright test ใดๆ
- **[ ] JSDoc บาง function ใน `ui.js`** ยังขาด `@param` description (ส่งผลให้ `lint:js` มี warnings)

### งาน Medium Priority

- **[ ] `WEBHOOK_URL` ใน `config.js`** ยังเป็น placeholder URL — ต้องตั้งค่าก่อน deploy จริง
- **[ ] `checkAndPromptShopConfig()`** ถูก comment ออกใน `main.js` — shop config prompt ไม่ทำงาน ต้องกรอกเองผ่าน Settings
- **[ ] `MIGRATIONS` object ใน `migrate.js`** ว่างอยู่ — เมื่อมี breaking schema change ในอนาคตต้องเพิ่ม migration function ที่นี่

### Technical Debt

- **`documentGenerator.js` (~2,400+ บรรทัด)** — ใหญ่มาก ควร split เป็น PDF generator / quotation builder / summary builder
- **CSS ใน `print.css` บรรทัด 295+** — มี shop settings styles ปน (misplaced จาก Phase 5B split) ยังทำงานได้แต่ควรย้ายไป `modals.css`
- **`ui.js` ยังใหญ่อยู่ (~1,200+ บรรทัด)** — `loadPayload()` ยาวมาก อาจ split ต่อได้
- **`documentGenerator.js` import `getShopConfig` จาก `ui.js`** — cross-dependency ที่ควรแก้โดย import จาก `shopConfig.js` โดยตรง

---

## 14. LocalStorage Schema

### Key: `marnthara.input.v6.1` (quotation data)

```typescript
{
  app_version: string,          // เช่น "vite-refactor/6.2.0"
  customer_name: string,
  customer_phone: string,
  customer_address: string,
  customer_card_open: boolean,  // สถานะ <details> ของ customer card
  discount: {
    type: "amount" | "percent",
    value: number,
  },
  favorites: object | null,     // favorites data
  rooms: Array<{
    id: string,                 // DOM element id เช่น "room-1713500000000-abc12"
    room_name: string,
    is_suspended: boolean,
    is_open: boolean,
    room_defaults: object,      // defaults สำหรับ force-apply
    items: Array<ItemData>,     // ดู getItemData() ของแต่ละ component
  }>
}
```

### Key: `marnthara.shop.config.v1` (shop settings)

```typescript
{
  name: string,
  address: string,
  phone: string,
  taxId: string,                // ใช้เป็น email ในเอกสาร
  logoUrl: string,
  baseVatRate: number,          // เช่น 0.07 = 7%
  pdf: {
    paymentTerms: string,
    priceValidity: string,
    notes: string[],
  }
}
```

### การ Migrate Schema

เมื่อต้องเพิ่ม/ลบ field ใน payload schema:

1. อัพเดท `APP_VERSION` ใน `config.js`
2. เพิ่ม migration function ใน `migrate.js`:

```javascript
const MIGRATIONS = {
    "vite-refactor/6.2.0": (data) => ({
        ...data,
        newField: data.oldField ?? "default_value",
    }),
};
```

3. อัพเดท `_normalizeRoom()` หรือ `migratePayload()` ให้รองรับ field ใหม่

---

## 15. PWA (Progressive Web App)

โปรเจกต์ติดตั้ง PWA ด้วย `vite-plugin-pwa` + Workbox แล้วเรียบร้อย

### ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `vite.config.js` | `VitePWA()` plugin config, manifest, workbox cache rules |
| `public/pwa-icon.svg` | Source icon (ผ้าม่าน, พื้นม่วง `#6750a4`) |
| `public/pwa-64x64.png` | Favicon |
| `public/pwa-192x192.png` | Home screen icon |
| `public/pwa-512x512.png` | Large icon (any purpose) |
| `public/maskable-icon-512x512.png` | Maskable icon (Android adaptive icon) |
| `public/apple-touch-icon-180x180.png` | iOS home screen icon |

### รีเจนเนอเรต Icons

```bash
# สร้าง PNG icons ใหม่จาก SVG source
npx pwa-assets-generator --preset minimal-2023 public/pwa-icon.svg
```

### Workbox Cache Strategy

| URL Pattern | Strategy | Cache Name |
|---|---|---|
| `fonts.googleapis.com/*` | StaleWhileRevalidate | `google-fonts-stylesheets` |
| `fonts.gstatic.com/*` | CacheFirst (1 year) | `google-fonts-webfonts` |
| `cdn.jsdelivr.net/*` | CacheFirst (30 days) | `jsdelivr-cdn` |

---

## 16. Phase 6 — รายละเอียดการเปลี่ยนแปลงล่าสุด

### 6A — PWA & Mobile Optimization

**`vite.config.js`** — เพิ่ม `VitePWA()` plugin พร้อม manifest และ workbox config  
**`src/styles/mobile.css`** — ไฟล์ใหม่: responsive overrides สำหรับ ≤480px และ ≤360px  
**`src/styles/main.css`** — เพิ่ม `@import url("./mobile.css")` เป็น import สุดท้าย  
**`index.html`** — เพิ่ม PWA meta tags: `theme-color`, `mobile-web-app-capable`, `apple-mobile-web-app-*`, `<link rel="apple-touch-icon">`

### 6B — Multi-line Notes (Textarea)

**ปัญหาเดิม:** ช่องหมายเหตุทุก item type เป็น `<input type="text">` — ขึ้นบรรทัดใหม่ไม่ได้  
**การแก้:**

- `index.html` — เปลี่ยน `<input type="text" name="notes">` เป็น `<textarea rows="2" name="notes">` ใน 5 templates: `setTpl`, `areaBasedTpl`, `wallpaperTpl`, `removalTpl`, `customItemTpl`
- `src/components/SetItem.js`, `CustomItem.js`, `RemovalItem.js` — เปลี่ยน selector จาก `'input[name="notes"]'` เป็น `'[name="notes"]'`
- `src/lib/config.js` — `setNotesInput: '[name="notes"]'` (ลบ `input` prefix)
- `src/lib/documentGenerator.js` — เพิ่ม helper `_nlToBr(text)` ที่ทำ `sanitizeHTML(text).replace(/\n/g, "<br>")` และใช้แทน `sanitizeHTML()` ใน `detailsHtml` ทุกตำแหน่ง

### 6C — Bug Fixes

**`src/lib/ui-toolbar.js` — "ล้างทุกรายการ" (Clear Items)**  
เดิมขาด: `saveData()`, reset `documentState`, reset lock state  
แก้โดยเพิ่ม:
```javascript
setDocumentState({ quoteNumber: "", quoteDate: today, locked: false, receipt: null, signatures: null });
document.querySelector(SELECTORS.quoteDateInput).value = today;
updateLockState();
saveData();
```

**`src/lib/ui-toolbar.js` — "ลบข้อมูลทั้งหมด" (Delete All)**  
เดิมไม่ได้ลบ `SHOP_CONFIG_KEY` ทำให้ shop config ยังเหลืออยู่  
แก้โดยเพิ่ม: `localStorage.removeItem(SHOP_CONFIG_KEY);`

**`src/styles/modals.css` — RCC Modal (ศูนย์ควบคุมห้อง)**
- `dialog.room-control-center-modal` — เพิ่ม `display: flex; flex-direction: column; max-height: min(90vh, 90svh)` เพื่อให้ tab bar ไม่เลื่อนหาย
- `.modal-body` ภายใน RCC — เพิ่ม `display: flex; flex-direction: column; overflow: hidden; flex: 1 1 0; min-height: 0`
- `#general-settings .defaults-inputs-grid` — เพิ่ม `display: grid` (เดิมหายไปทำให้ form เป็น single column เสมอ)

---

## หมายเหตุสำหรับทีม

**UI ทั้งหมดเป็นภาษาไทย** — string literals ในโค้ดมักเป็น Thai text โดยตรง  
**ไม่มี i18n framework** — ถ้าต้องการรองรับภาษาอื่นจะต้อง refactor ส่วนนี้ใหม่ทั้งหมด

**Deploy:** Build แล้ว copy ทุกไฟล์ใน `dist/` ขึ้น GitHub Pages — `base: "./"` ใน `vite.config.js` จัดการ asset paths แบบ relative ให้แล้ว (ใช้ได้กับทุก subdirectory path)

**ข้อมูลของ user อยู่ใน localStorage เท่านั้น** — ไม่มี backend, ไม่มี sync — user ต้อง export JSON เองหากต้องการสำรองข้อมูล
