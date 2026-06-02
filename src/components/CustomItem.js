// src/components/CustomItem.js
import { SELECTORS } from "../lib/config.js";
import { toNum, fmtTH } from "../lib/utils.js";
import { CALC } from "../lib/calculations.js";
import { cloneTemplate, loadSuspendState } from "./baseItem.js";

/**
 *
 * @param data
 */
export function createCustomItem(data = {}) {
    const itemEl = cloneTemplate(SELECTORS.customItemTpl, "custom");
    if (!itemEl) return null;

    const descInput = itemEl.querySelector('input[name="description"]');
    const qtyInput = itemEl.querySelector('input[name="quantity"]');
    const priceInput = itemEl.querySelector('input[name="price_per_item"]');
    const notesInput = itemEl.querySelector('[name="notes"]');
    const summaryEl = itemEl.querySelector("[data-custom-summary]");

    // Load data
    if (data.description) descInput.value = data.description;
    if (data.quantity !== undefined && data.quantity !== null)
        qtyInput.value = data.quantity;
    if (data.price_per_item !== undefined && data.price_per_item !== null)
        priceInput.value = data.price_per_item;
    if (data.notes) notesInput.value = data.notes;
    loadSuspendState(itemEl, data);

    /**
     *
     */
    function updateSummary() {
        let total = 0;
        if (CALC && typeof CALC.calculateCustomPrice === "function") {
            const calcData = {
                quantity: toNum(qtyInput.value),
                price_per_item: toNum(priceInput.value),
            };
            total = CALC.calculateCustomPrice(calcData).total;
        } else {
            const qty = toNum(qtyInput.value) || 1;
            const price = toNum(priceInput.value);
            total = qty * price;
        }

        itemEl.dataset.totalPrice = total;
        if (summaryEl) summaryEl.textContent = fmtTH(total);
        itemEl.dispatchEvent(new CustomEvent("item-update", { bubbles: true }));
    }

    itemEl.addEventListener("input", (e) => {
        if (
            e.target.matches(
                'input[name="quantity"], input[name="price_per_item"]'
            )
        ) {
            updateSummary();
        }
    });

    updateSummary();

    // Expose data extraction for buildPayload/duplicate
    const getItemData = () => ({
        type: "custom",
        is_suspended: itemEl.classList.contains("is-suspended"),
        quantity: toNum(qtyInput.value),
        price_per_item: toNum(priceInput.value),
        description: descInput.value || "",
        notes: notesInput.value || "",
    });
    itemEl.getItemData = getItemData;

    return itemEl;
}
