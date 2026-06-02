// src/components/RemovalItem.js
import {
    fmtTH,
    toNum,
    handleNumericFocus,
    handleNumericBlur,
} from "../lib/utils.js";
import { CALC } from "../lib/calculations.js";
import { ITEM_CONFIG } from "../lib/config.js";
import {
    cloneTemplate,
    setupRecalcPipeline,
    setupMoreDetailsButton,
    updateMoreBtnSummary,
    loadSuspendState,
} from "./baseItem.js";

/**
 *
 * @param data
 */
export function createRemovalItem(data = {}) {
    const itemEl = cloneTemplate("#removalTpl", "removal");
    if (!itemEl) return null;

    const config = ITEM_CONFIG["removal"] || { name: "รื้อถอน" };
    itemEl.classList.add("removal-item");

    // --- Element Querying ---
    const typeDisplay = itemEl.querySelector(".item-type-display");
    const quantityInput = itemEl.querySelector('input[name="quantity"]');
    const pricePerItemInput = itemEl.querySelector(
        'input[name="price_per_item"]'
    );
    const descriptionInput = itemEl.querySelector('input[name="description"]');
    const notesInput = itemEl.querySelector('[name="notes"]');
    const summaryEl = itemEl.querySelector("[data-removal-summary]");
    const detailsEl = itemEl.querySelector(".item-details-more");

    // --- Shared setup ---
    const { moreBtn } = setupMoreDetailsButton(itemEl);

    const getValues = () => ({
        quantity: quantityInput.value,
        price_per_item: pricePerItemInput.value,
        is_suspended: itemEl.classList.contains("is-suspended"),
    });

    const recalc = () => {
        const values = getValues();
        const price = CALC.calculateRemovalPrice(values);
        itemEl.dataset.totalPrice = price.total;

        let summaryHtml = `รวม: <b>${fmtTH(price.total)}</b> บ.`;
        const qty = toNum(values.quantity);
        if (qty > 0) {
            summaryHtml += ` <small>(${qty} ชุด)</small>`;
        }
        if (summaryEl) summaryEl.innerHTML = summaryHtml;

        const rawPrice = toNum(values.price_per_item);
        const priceSummary = rawPrice > 0 ? `ชุดละ: ${fmtTH(rawPrice)}` : "";
        updateMoreBtnSummary(moreBtn, detailsEl, priceSummary);
    };

    const debouncedRecalc = setupRecalcPipeline(itemEl, recalc);

    // --- Event Listeners ---
    itemEl.addEventListener("input", debouncedRecalc);
    quantityInput.addEventListener("focus", handleNumericFocus);
    quantityInput.addEventListener("blur", handleNumericBlur);
    pricePerItemInput.addEventListener("focus", handleNumericFocus);
    pricePerItemInput.addEventListener("blur", handleNumericBlur);

    // --- Initialization ---
    if (typeDisplay) typeDisplay.textContent = config.name;
    quantityInput.value = toNum(data.quantity) > 0 ? data.quantity : "";
    pricePerItemInput.value =
        data.price_per_item > 0 ? fmtTH(data.price_per_item) : "";
    descriptionInput.value = data.description || "";
    notesInput.value = data.notes || "";

    loadSuspendState(itemEl, data);
    recalc();

    // Expose data extraction for buildPayload/duplicate
    const getItemData = () => ({
        type: "removal",
        is_suspended: itemEl.classList.contains("is-suspended"),
        quantity: toNum(quantityInput.value),
        price_per_item: toNum(pricePerItemInput.value),
        description: descriptionInput.value || "",
        notes: notesInput.value || "",
    });
    itemEl.getItemData = getItemData;

    return itemEl;
}
