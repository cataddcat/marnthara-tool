// src/components/WallpaperItem.js
import {
    fmtTH,
    fmt,
    toNum,
    fmtDimension,
    handleCmToMBlur,
} from "../lib/utils.js";
import { CALC } from "../lib/calculations.js";
import { SELECTORS } from "../lib/config.js";
import {
    cloneTemplate,
    setupRecalcPipeline,
    setupMoreDetailsButton,
    updateMoreBtnSummary,
    setupOverride,
    applyOverrideIfActive,
    loadOverrideData,
    loadSuspendState,
} from "./baseItem.js";

// Helper function to create a single wall input row
/**
 *
 * @param data
 */
export function createWall(data = {}) {
    const wallTemplate = document.querySelector(SELECTORS.wallTpl);
    if (!wallTemplate) return null;

    const clone = wallTemplate.content.cloneNode(true);
    const wallEl = clone.firstElementChild;
    const input = wallEl.querySelector('input[name="wall_width_m"]');
    input.value = fmtDimension(data.width);

    const uniqueId = `wall_width_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    input.id = uniqueId;
    const label = wallEl.querySelector("label");
    if (label) label.setAttribute("for", uniqueId);

    return wallEl;
}

/**
 *
 * @param data
 */
export function createWallpaperItem(data = {}) {
    const itemEl = cloneTemplate(SELECTORS.wallpaperTpl, "wallpaper");
    if (!itemEl) return null;

    // --- Element Querying ---
    const heightInput = itemEl.querySelector('[name="wallpaper_height_m"]');
    const priceRollInput = itemEl.querySelector(
        '[name="wallpaper_price_roll"]'
    );
    const installCostInput = itemEl.querySelector(
        '[name="wallpaper_install_cost"]'
    );
    const codeInput = itemEl.querySelector('[name="wallpaper_code"]');
    const notesInput = itemEl.querySelector('[name="notes"]');
    const wallsContainer = itemEl.querySelector("[data-walls-container]");
    const summaryEl = itemEl.querySelector("[data-wallpaper-summary]");
    const detailsEl = itemEl.querySelector(".item-details-more");

    // --- Shared setup ---
    const { moreBtn } = setupMoreDetailsButton(itemEl);

    const getValues = () => ({
        height_m: heightInput.value,
        price_per_roll: priceRollInput.value,
        install_cost_per_roll: installCostInput.value,
        widths: Array.from(
            wallsContainer.querySelectorAll('input[name="wall_width_m"]')
        ).map((i) => i.value),
        is_suspended: itemEl.classList.contains("is-suspended"),
        enable_set_price: override.enableOverrideCheckbox.checked,
        set_price_override: override.overridePriceInput.value,
    });

    const recalc = () => {
        const values = getValues();
        if (applyOverrideIfActive(itemEl, values, summaryEl, moreBtn)) return;

        const price = CALC.calculateWallpaperPrice(values);
        itemEl.dataset.totalPrice = price.total;

        let summaryHtml = `รวม: <b>${fmtTH(price.total)}</b> บ. `;
        if (price.material > 0 || price.install > 0)
            summaryHtml += `<small>(วอลล์: ${fmtTH(price.material)}, ค่าช่าง: ${fmtTH(price.install)})</small>`;
        if (price.rolls > 0)
            summaryHtml += ` &bull; พื้นที่: ${fmt(price.sqm, 2)} ตร.ม. &bull; ใช้: ${price.rolls} ม้วน`;

        if (summaryEl) summaryEl.innerHTML = summaryHtml;

        // Build price summary for more-details button
        const priceSummaryParts = [];
        const rawPriceRoll = toNum(values.price_per_roll);
        const rawInstallCostVal = values.install_cost_per_roll;

        if (rawPriceRoll > 0) {
            priceSummaryParts.push(`ม้วน: ${fmtTH(rawPriceRoll)}`);
        }
        if (rawInstallCostVal === "0") {
            priceSummaryParts.push(`ช่าง: 0`);
        } else {
            const numInstallCost = toNum(rawInstallCostVal);
            if (numInstallCost > 0) {
                priceSummaryParts.push(`ช่าง: ${fmtTH(numInstallCost)}`);
            }
        }

        updateMoreBtnSummary(moreBtn, detailsEl, priceSummaryParts.join(" | "));
    };

    const debouncedRecalc = setupRecalcPipeline(itemEl, recalc);
    const override = setupOverride(itemEl, debouncedRecalc);

    // --- Event Listeners ---
    itemEl.addEventListener("input", debouncedRecalc);

    // Dimension blur for height input
    const handleDimensionBlur = (e) => {
        handleCmToMBlur(e);
        debouncedRecalc();
    };
    heightInput.addEventListener("blur", handleDimensionBlur);

    // Delegated blur for dynamically added wall inputs (capture phase)
    itemEl.addEventListener(
        "blur",
        (e) => {
            if (e.target.name === "wall_width_m") {
                handleDimensionBlur(e);
            }
        },
        true
    );

    // --- Initialization ---
    if (data.widths && data.widths.length > 0) {
        data.widths.forEach((width) => {
            const wallEl = createWall({ width });
            if (wallEl) wallsContainer.appendChild(wallEl);
        });
    } else {
        const wallEl = createWall();
        if (wallEl) wallsContainer.appendChild(wallEl);
    }

    heightInput.value = fmtDimension(data.height_m);
    priceRollInput.value =
        data.price_per_roll > 0 ? fmtTH(data.price_per_roll) : "";

    if (Object.prototype.hasOwnProperty.call(data, "install_cost_per_roll")) {
        installCostInput.value =
            data.install_cost_per_roll === 0
                ? "0"
                : data.install_cost_per_roll > 0
                  ? fmtTH(data.install_cost_per_roll)
                  : "";
    }

    codeInput.value = data.wallpaper_code || "";
    notesInput.value = data.notes || "";

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
        const rawInstallCost = installCostInput.value;
        let finalInstallCost;
        if (rawInstallCost === "0") {
            finalInstallCost = 0;
        } else if (toNum(rawInstallCost) > 0) {
            finalInstallCost = toNum(rawInstallCost);
        } else {
            finalInstallCost = undefined;
        }

        return {
            type: "wallpaper",
            is_suspended: itemEl.classList.contains("is-suspended"),
            enable_set_price: override.enableOverrideCheckbox.checked,
            set_price_override: toNum(override.overridePriceInput.value),
            height_m: toNum(heightInput.value),
            wallpaper_code: codeInput.value || "",
            price_per_roll: toNum(priceRollInput.value),
            install_cost_per_roll: finalInstallCost,
            notes: notesInput.value || "",
            widths: Array.from(
                wallsContainer.querySelectorAll('input[name="wall_width_m"]')
            ).map((el) => toNum(el.value)),
        };
    };
    itemEl.getItemData = getItemData;

    return itemEl;
}
