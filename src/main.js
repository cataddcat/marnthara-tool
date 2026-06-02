// src/main.js
// --- MAIN APPLICATION ENTRY POINT (VITE ARCHITECTURE) ---
import "./styles/main.css";

import { STORAGE_KEY, SELECTORS, PRICING } from "./lib/config.js";
import {
    applyInitialTheme,
    initializeGlobalEventListeners,
    loadPayload,
    recalcAll,
    updateLockState,
    updateToggleAllButtonState,
    updateRoomObserver,
    updateUndoButtonState,
    // checkAndPromptShopConfig,
} from "./lib/ui.js";
import { loadShopConfig } from "./lib/shopConfig.js";
import { addRoom } from "./lib/ui-actions.js";

/**
 *
 */
function populatePriceDropdowns() {
    const setTemplate = document.querySelector(SELECTORS.setTpl);
    if (!setTemplate) return;

    const fabricSelect = setTemplate.content.querySelector(
        SELECTORS.setPricePerMSelect
    );
    const sheerSelect = setTemplate.content.querySelector(
        SELECTORS.setSheerPricePerMSelect
    );
    const louisSelect = setTemplate.content.querySelector(
        SELECTORS.setLouisPricePerMSelect
    );

    const populateSelect = (selectEl, prices) => {
        if (!selectEl || !Array.isArray(prices)) return;
        selectEl.textContent = "";
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.hidden = true;
        placeholder.textContent = "เลือกราคา";
        selectEl.appendChild(placeholder);
        prices.forEach((price) => {
            const opt = document.createElement("option");
            opt.value = price;
            opt.textContent = price.toLocaleString("th-TH");
            selectEl.appendChild(opt);
        });
    };

    populateSelect(fabricSelect, PRICING.fabric);
    populateSelect(sheerSelect, PRICING.sheer);
    populateSelect(louisSelect, PRICING.louis);
}

/**
 *
 */
function init() {
    applyInitialTheme();
    populatePriceDropdowns();
    initializeGlobalEventListeners();
    loadShopConfig();

    try {
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData && storedData !== "null" && storedData !== "{}") {
            const parsedData = JSON.parse(storedData);
            if (parsedData && Array.isArray(parsedData.rooms)) {
                loadPayload(parsedData, false);
            } else {
                console.warn(
                    "Stored data structure seems invalid, starting fresh."
                );
                localStorage.removeItem(STORAGE_KEY);
                addRoom();
                const customerCard = document.querySelector(
                    SELECTORS.customerCard
                );
                if (customerCard) customerCard.open = true;
            }
        } else {
            addRoom();
            const customerCard = document.querySelector(SELECTORS.customerCard);
            if (customerCard) customerCard.open = true;
        }
    } catch (err) {
        console.error("Failed to load or parse data from localStorage:", err);
        localStorage.removeItem(STORAGE_KEY);
        addRoom();
        const customerCard = document.querySelector(SELECTORS.customerCard);
        if (customerCard) customerCard.open = true;
    }

    // Default the quote date input to today if still empty after load.
    const quoteDateInput = document.querySelector("#quote_date");
    if (quoteDateInput && !quoteDateInput.value) {
        const d = new Date();
        quoteDateInput.value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    }

    recalcAll();
    updateLockState();
    updateToggleAllButtonState();
    updateRoomObserver();
    updateUndoButtonState();

    // [EDITED]
    // ไม่บังคับให้กรอก "ตั้งค่าร้านค้า" เมื่อเข้าใช้งาน
    // การเรียกฟังก์ชัน checkAndPromptShopConfig() ถูกคอมเมนต์ออก
    // checkAndPromptShopConfig();

    console.log("Marnthara App Initialized (Vite Refactor)");
}

document.addEventListener("DOMContentLoaded", init);
