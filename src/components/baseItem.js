// src/components/baseItem.js
// --- SHARED COMPONENT HELPERS (Phase 3A) ---
import {
    debounce,
    handleCmToMBlur,
    handleNumericFocus,
    handleNumericBlur,
    toNum,
    fmtTH,
} from "../lib/utils.js";

/**
 * Clones a <template> element and returns its first child with dataset.type set.
 * @param {string} selector - CSS selector for the template element.
 * @param {string} type - The item type string (e.g. "set", "wallpaper").
 * @returns {HTMLElement|null} The cloned element, or null if template not found.
 */
export function cloneTemplate(selector, type) {
    const template = document.querySelector(selector);
    if (!template) {
        console.error(`Template not found: ${selector}`);
        return null;
    }
    const clone = template.content.cloneNode(true);
    const itemEl = clone.firstElementChild;
    itemEl.dataset.type = type;
    return itemEl;
}

/**
 * Creates a debounced recalc function that dispatches "item-update" after recalc.
 * @param {HTMLElement} itemEl - The item card element.
 * @param {() => void} recalcFn - The recalculation function.
 * @param {number} [delay] - Debounce delay in ms.
 * @returns {() => void} The debounced function.
 */
export function setupRecalcPipeline(itemEl, recalcFn, delay = 200) {
    return debounce(() => {
        recalcFn();
        itemEl.dispatchEvent(new CustomEvent("item-update", { bubbles: true }));
    }, delay);
}

/**
 * Sets up CM→M blur handlers on dimension inputs that trigger recalc.
 * @param {HTMLInputElement[]} inputs - Array of dimension input elements.
 * @param {() => void} debouncedRecalc - The debounced recalc function.
 */
export function setupDimensionBlur(inputs, debouncedRecalc) {
    const handler = (e) => {
        handleCmToMBlur(e);
        debouncedRecalc();
    };
    inputs.forEach((input) => {
        if (input) input.addEventListener("blur", handler);
    });
}

/**
 * Moves the "More Details" button wrapper into the main item-grid.
 * @param {HTMLElement} itemEl - The item card element.
 */
export function setupMoreDetailsButton(itemEl) {
    const moreBtn = itemEl.querySelector('[data-act="toggle-more-details"]');
    const moreBtnWrapper = moreBtn?.parentElement;
    const detailsEl = itemEl.querySelector(".item-details-more");
    if (detailsEl && moreBtnWrapper) {
        const mainGrid = itemEl.querySelector(".item-grid");
        if (mainGrid) mainGrid.appendChild(moreBtnWrapper);
    }
    return { moreBtn, moreBtnWrapper, detailsEl };
}

/**
 * Updates the "More Details" button text with a collapsed price summary.
 * @param {HTMLElement|null} moreBtn - The more-details button element.
 * @param {HTMLElement|null} detailsEl - The details panel element.
 * @param {string} priceSummary - The summary text to show when collapsed.
 */
export function updateMoreBtnSummary(moreBtn, detailsEl, priceSummary) {
    if (!moreBtn) return;
    moreBtn.dataset.priceSummary = priceSummary;
    const moreBtnSpan = moreBtn.querySelector("span");
    if (detailsEl && moreBtnSpan && !detailsEl.classList.contains("show")) {
        if (priceSummary) {
            moreBtnSpan.innerHTML = `เพิ่มเติม <small>(${priceSummary})</small>`;
        } else {
            moreBtnSpan.textContent = "เพิ่มเติม";
        }
    }
}

/**
 * Sets up override price checkbox and input behavior.
 * Shared by SetItem, AreaBasedItem, and WallpaperItem.
 * @param {HTMLElement} itemEl - The item card element.
 * @param {() => void} debouncedRecalc - The debounced recalc function.
 * @returns {{ enableOverrideCheckbox: HTMLInputElement, overridePriceInput: HTMLInputElement, updateOverrideState: () => void }}
 */
export function setupOverride(itemEl, debouncedRecalc) {
    const enableOverrideCheckbox = itemEl.querySelector(
        '[name="enable_price_override"]'
    );
    const overridePriceInput = itemEl.querySelector(
        '[name="set_price_override"]'
    );
    const calculableFields = itemEl.querySelector(".calculable-fields");

    const updateOverrideState = () => {
        const isEnabled = enableOverrideCheckbox.checked;
        overridePriceInput.disabled = !isEnabled;
        itemEl.classList.toggle("is-override-active", isEnabled);
        if (calculableFields) {
            calculableFields.classList.toggle("is-override-active", isEnabled);
        }
        if (!isEnabled) overridePriceInput.value = "";
        debouncedRecalc();
    };

    enableOverrideCheckbox.addEventListener("change", updateOverrideState);
    overridePriceInput.addEventListener("focus", handleNumericFocus);
    overridePriceInput.addEventListener("blur", handleNumericBlur);

    return { enableOverrideCheckbox, overridePriceInput, updateOverrideState };
}

/**
 * Applies override recalc logic: if override is active, set totalPrice and summary, return true.
 * If not active, return false so the caller continues with normal calculation.
 * @param {HTMLElement} itemEl - The item card element.
 * @param {object} values - The getValues() result (must have enable_set_price, set_price_override).
 * @param {HTMLElement|null} summaryEl - The summary display element.
 * @param {HTMLElement|null} moreBtn - The more-details button.
 * @returns {boolean} True if override was applied (caller should return early).
 */
export function applyOverrideIfActive(itemEl, values, summaryEl, moreBtn) {
    if (!values.enable_set_price) return false;
    const overridePrice = toNum(values.set_price_override);
    itemEl.dataset.totalPrice = overridePrice;
    if (summaryEl) {
        summaryEl.innerHTML = `ราคาเหมา: <b>${fmtTH(overridePrice)}</b> บ.`;
    }
    if (moreBtn) moreBtn.dataset.priceSummary = "";
    return true;
}

/**
 * Loads initial override data from a data object.
 * @param {HTMLInputElement} enableOverrideCheckbox - The override enable checkbox.
 * @param {HTMLInputElement} overridePriceInput - The override price input.
 * @param {object} data - The item data.
 */
export function loadOverrideData(
    enableOverrideCheckbox,
    overridePriceInput,
    data
) {
    if (data.enable_set_price) {
        enableOverrideCheckbox.checked = true;
    }
    if (data.set_price_override > 0) {
        overridePriceInput.value =
            data.set_price_override === 0
                ? "0"
                : fmtTH(data.set_price_override);
    }
}

/**
 * Loads initial suspend state from data.
 * @param {HTMLElement} itemEl - The item card element.
 * @param {object} data - The item data (checks data.is_suspended).
 */
export function loadSuspendState(itemEl, data) {
    if (data.is_suspended) {
        itemEl.classList.add("is-suspended");
    }
}
