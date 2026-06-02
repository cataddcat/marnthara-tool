// src/components/AreaBasedItem.js
import { fmtTH, toNum, fmt, fmtDimension } from "../lib/utils.js";
import { CALC } from "../lib/calculations.js";
import { SELECTORS, ITEM_CONFIG } from "../lib/config.js";
import {
    cloneTemplate,
    setupRecalcPipeline,
    setupDimensionBlur,
    setupMoreDetailsButton,
    updateMoreBtnSummary,
    setupOverride,
    applyOverrideIfActive,
    loadOverrideData,
    loadSuspendState,
} from "./baseItem.js";

/**
 *
 * @param type
 * @param data
 */
export function createAreaBasedItem(type, data = {}) {
    const itemEl = cloneTemplate(SELECTORS.areaBasedTpl, type);
    if (!itemEl) return null;

    const config = ITEM_CONFIG[type] || {
        name: "ของตกแต่ง",
        className: "default-item",
    };
    itemEl.classList.add(`${type.replace(/_/g, "-")}-item`);

    // --- Element Querying ---
    const typeDisplay = itemEl.querySelector(".item-type-display");
    const widthInput = itemEl.querySelector('[name="area_width_m"]');
    const heightInput = itemEl.querySelector('[name="area_height_m"]');
    const priceSqydInput = itemEl.querySelector('[name="area_price_sqyd"]');
    const codeInput = itemEl.querySelector('[name="area_code"]');
    const notesInput = itemEl.querySelector('[name="notes"]');
    const favButton = itemEl.querySelector(".btn-favorite");
    const showFavsButton = itemEl.querySelector(".btn-show-favs");
    const summaryEl = itemEl.querySelector("[data-area-summary]");

    // --- Dynamic Fields ---
    const detailsEl = itemEl.querySelector(".item-details-more");
    const detailsGrid = detailsEl?.querySelector(".item-grid");
    const priceGroup = detailsGrid
        ?.querySelector('[name="area_price_sqyd"]')
        ?.closest(".form-group");
    let openingStyleSelect, adjustmentSideSelect;

    if (detailsGrid && priceGroup) {
        if (type === "partition" || type === "pleated_screen") {
            const group = document.createElement("div");
            group.className = "form-group";
            group.innerHTML = `
                <label>รูปแบบเปิด
                    <select name="opening_style">
                        <option value="แยกกลาง">แยกกลาง</option>
                        <option value="เก็บข้างเดียว">เก็บข้างเดียว</option>
                    </select>
                </label>
            `;
            detailsGrid.insertBefore(group, priceGroup);
            openingStyleSelect = group.querySelector("select");
        } else if (
            [
                "wooden_blind",
                "roller_blind",
                "vertical_blind",
                "aluminum_blind",
            ].includes(type)
        ) {
            const group = document.createElement("div");
            group.className = "form-group";
            group.innerHTML = `
                <label>เชือกปรับ
                    <select name="adjustment_side">
                        <option value="ปรับขวา">ปรับขวา</option>
                        <option value="ปรับซ้าย">ปรับซ้าย</option>
                    </select>
                </label>
            `;
            detailsGrid.insertBefore(group, priceGroup);
            adjustmentSideSelect = group.querySelector("select");
        }
        if (openingStyleSelect || adjustmentSideSelect) {
            if (priceGroup) priceGroup.classList.remove("full-width-item");
        }
    }

    // --- Shared setup ---
    const { moreBtn } = setupMoreDetailsButton(itemEl);

    const getValues = () => ({
        width_m: widthInput.value,
        height_m: heightInput.value,
        price_sqyd: priceSqydInput.value,
        is_suspended: itemEl.classList.contains("is-suspended"),
        enable_set_price: override.enableOverrideCheckbox.checked,
        set_price_override: override.overridePriceInput.value,
    });

    const recalc = () => {
        const values = getValues();
        if (applyOverrideIfActive(itemEl, values, summaryEl, moreBtn)) return;

        const price = CALC.calculateAreaBasedPrice(values);
        itemEl.dataset.totalPrice = price.total;

        const areaSummary =
            price.sqyd > 0
                ? ` &bull; พื้นที่: ${fmt(price.sqyd, 2)} ตร.หลา`
                : "";
        if (summaryEl)
            summaryEl.innerHTML = `ราคา: <b>${fmtTH(price.total)}</b> บ.${areaSummary}`;

        // Price summary for more-details button
        const rawPriceSqyd = toNum(values.price_sqyd);
        const priceSummary =
            rawPriceSqyd > 0 ? `ตร.หลา: ${fmtTH(rawPriceSqyd)}` : "";
        updateMoreBtnSummary(moreBtn, detailsEl, priceSummary);
    };

    const debouncedRecalc = setupRecalcPipeline(itemEl, recalc);
    const override = setupOverride(itemEl, debouncedRecalc);

    // --- Event Listeners ---
    itemEl.addEventListener("input", debouncedRecalc);
    setupDimensionBlur([widthInput, heightInput], debouncedRecalc);

    // --- Initialization ---
    if (typeDisplay) typeDisplay.textContent = config.name;
    if (codeInput) codeInput.dataset.favoriteType = type;
    if (favButton) favButton.dataset.type = type;
    if (showFavsButton) showFavsButton.dataset.type = type;

    widthInput.value = fmtDimension(data.width_m);
    heightInput.value = fmtDimension(data.height_m);
    priceSqydInput.value = data.price_sqyd > 0 ? fmtTH(data.price_sqyd) : "";
    codeInput.value = data.code || "";
    notesInput.value = data.notes || "";

    if (openingStyleSelect)
        openingStyleSelect.value = data.opening_style || "แยกกลาง";
    if (adjustmentSideSelect)
        adjustmentSideSelect.value = data.adjustment_side || "ปรับขวา";

    loadSuspendState(itemEl, data);
    loadOverrideData(
        override.enableOverrideCheckbox,
        override.overridePriceInput,
        data
    );
    override.updateOverrideState();
    recalc();

    // Expose data extraction for buildPayload/duplicate
    const getItemData = () => {
        const data = {
            type,
            is_suspended: itemEl.classList.contains("is-suspended"),
            enable_set_price: override.enableOverrideCheckbox.checked,
            set_price_override: toNum(override.overridePriceInput.value),
            width_m: toNum(widthInput.value),
            height_m: toNum(heightInput.value),
            price_sqyd: toNum(priceSqydInput.value),
            code: codeInput.value || "",
            notes: notesInput.value || "",
        };
        if (openingStyleSelect)
            data.opening_style = openingStyleSelect.value || "แยกกลาง";
        if (adjustmentSideSelect)
            data.adjustment_side = adjustmentSideSelect.value || "ปรับขวา";
        return data;
    };
    itemEl.getItemData = getItemData;

    return itemEl;
}
