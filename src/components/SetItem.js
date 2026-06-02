// src/components/SetItem.js
import { fmtTH, fmtDimension, toNum } from "../lib/utils.js";
import { CALC } from "../lib/calculations.js";
import { SELECTORS, HARDWARE_FIELDS } from "../lib/config.js";
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
 * @param data
 */
export function createSetItem(data = {}) {
    const itemEl = cloneTemplate(SELECTORS.setTpl, "set");
    if (!itemEl) return null;

    // --- Element Querying ---
    const widthInput = itemEl.querySelector('input[name="width_m"]');
    const heightInput = itemEl.querySelector('input[name="height_m"]');
    const styleSelect = itemEl.querySelector('select[name="set_style"]');
    const fabricVariantSelect = itemEl.querySelector(
        'select[name="fabric_variant"]'
    );
    const pricePerMSelect = itemEl.querySelector(
        'select[name="set_price_per_m"]'
    );
    const sheerPricePerMSelect = itemEl.querySelector(
        'select[name="sheer_price_per_m"]'
    );
    const louisPricePerMSelect = itemEl.querySelector(
        'select[name="louis_price_per_m"]'
    );
    const fabricCodeInput = itemEl.querySelector('input[name="fabric_code"]');
    const sheerCodeInput = itemEl.querySelector(
        'input[name="sheer_fabric_code"]'
    );
    const openingStyleSelect = itemEl.querySelector(
        'select[name="opening_style"]'
    );
    const adjustmentSideSelect = itemEl.querySelector(
        'select[name="adjustment_side"]'
    );
    const notesInput = itemEl.querySelector('[name="notes"]');

    // Control Wrappers
    const openingStyleWrap = itemEl.querySelector(
        '[data-set-control="opening_style_wrap"]'
    );
    const adjustmentSideWrap = itemEl.querySelector(
        '[data-set-control="adjustment_side_wrap"]'
    );
    const louisPriceWrap = itemEl.querySelector(
        '[data-set-control="louis_price_wrap"]'
    );
    const fabricPriceWrap = itemEl.querySelector(
        '[data-set-control="fabric_price_wrap"]'
    );
    const fabricCodeWrap = itemEl.querySelector(
        '[data-set-control="fabric_code_wrap"]'
    );
    const sheerWrap = itemEl.querySelector("[data-sheer-wrap]");
    const sheerCodeWrap = itemEl.querySelector("[data-sheer-code-wrap]");

    const summaryEl = itemEl.querySelector("[data-set-summary]");
    const detailsEl = itemEl.querySelector(".item-details-more");

    // --- Shared setup ---
    const { moreBtn } = setupMoreDetailsButton(itemEl);

    const getValues = () => ({
        width_m: widthInput.value,
        height_m: heightInput.value,
        style: styleSelect.value,
        fabric_variant: fabricVariantSelect.value,
        price_per_m_raw: pricePerMSelect.value,
        sheer_price_per_m: sheerPricePerMSelect.value,
        louis_price_per_m: louisPricePerMSelect.value,
        is_suspended: itemEl.classList.contains("is-suspended"),
        enable_set_price: override.enableOverrideCheckbox.checked,
        set_price_override: override.overridePriceInput.value,
    });

    const recalc = () => {
        const values = getValues();
        if (applyOverrideIfActive(itemEl, values, summaryEl, moreBtn)) return;

        const price = CALC.calculateSetPrice(values);
        itemEl.dataset.totalPrice = price.total;

        let summaryHtml = `ราคา: <b>${fmtTH(price.total)}</b> บ.`;

        if (values.style === "หลุยส์") {
            const parts = [];
            if (price.opaque > 0) parts.push(`ทึบ: ${fmtTH(price.opaque)}`);
            if (price.sheer > 0) parts.push(`โปร่ง: ${fmtTH(price.sheer)}`);
            if (price.louis > 0) parts.push(`หลุยส์: ${fmtTH(price.louis)}`);
            if (parts.length > 0)
                summaryHtml += ` <small>(${parts.join(", ")})</small>`;
        } else if (price.opaque > 0 && price.sheer > 0) {
            summaryHtml += ` <small>(ทึบ: ${fmtTH(price.opaque)}, โปร่ง: ${fmtTH(price.sheer)})</small>`;
        }

        const yardage = CALC.fabricYardage(values.style, values.width_m);
        if (yardage > 0) {
            summaryHtml += ` <small>&bull; ${yardage.toFixed(2)} หลา</small>`;
        }

        // Height warning
        const h = toNum(values.height_m);
        if (h > 2.8) {
            summaryHtml +=
                '<div class="height-warning" style="margin-top: 0.5rem; width: fit-content;">(กลับหน้าผ้า ตัดตามยาว)</div>';
        } else if (h > 2.5) {
            summaryHtml +=
                '<div class="height-warning" style="margin-top: 0.5rem; width: fit-content;">(ต้องใช้ผ้าหน้า 3.20)</div>';
        }

        if (summaryEl) summaryEl.innerHTML = summaryHtml;

        // Build price summary for more-details button
        const priceSummaryParts = [];
        const rawOpaque = toNum(values.price_per_m_raw);
        const rawSheer = toNum(values.sheer_price_per_m);
        const rawLouis = toNum(values.louis_price_per_m);

        if (values.style === "หลุยส์") {
            if (rawLouis > 0)
                priceSummaryParts.push(`หลุยส์: ${fmtTH(rawLouis)}`);
        } else {
            if (values.fabric_variant.includes("ทึบ") && rawOpaque > 0) {
                priceSummaryParts.push(`ทึบ: ${fmtTH(rawOpaque)}`);
            }
            if (values.fabric_variant.includes("โปร่ง") && rawSheer > 0) {
                priceSummaryParts.push(`โปร่ง: ${fmtTH(rawSheer)}`);
            }
        }

        updateMoreBtnSummary(moreBtn, detailsEl, priceSummaryParts.join(" | "));
    };

    const debouncedRecalc = setupRecalcPipeline(itemEl, recalc);
    const override = setupOverride(itemEl, debouncedRecalc);

    // --- Style-specific UI helpers ---
    const updateFabricVariantUI = () => {
        const style = styleSelect.value;
        const variant = fabricVariantSelect.value;
        const isLouis = style === "หลุยส์";
        const hasSheer = variant.includes("โปร่ง");
        const isSheerOnly = variant === "โปร่ง" && !isLouis;
        const isOpaqueOnly = variant === "ทึบ" && !isLouis;

        sheerWrap?.classList.toggle("hidden", !hasSheer || isLouis);
        sheerCodeWrap?.classList.toggle("hidden", !hasSheer || isLouis);

        const disableOpaque = isSheerOnly || isLouis;
        if (pricePerMSelect) {
            pricePerMSelect.disabled = disableOpaque;
            if (disableOpaque) pricePerMSelect.value = "";
        }
        if (fabricCodeInput) {
            fabricCodeInput.disabled = disableOpaque;
            if (disableOpaque) fabricCodeInput.value = "";
        }

        const disableSheer = isOpaqueOnly || isLouis;
        if (sheerPricePerMSelect) {
            sheerPricePerMSelect.disabled = disableSheer;
            if (disableSheer) sheerPricePerMSelect.value = "";
        }
        if (sheerCodeInput) {
            sheerCodeInput.disabled = disableSheer;
            if (disableSheer) sheerCodeInput.value = "";
        }
    };

    const updateSetControlsVisibility = () => {
        const style = styleSelect.value;
        const isRomanBlind = style === "ม่านพับ";
        const isLouis = style === "หลุยส์";
        const hideOpeningStyle =
            isRomanBlind || isLouis || style === "ม่านแป๊บ";

        if (openingStyleWrap)
            openingStyleWrap.classList.toggle("hidden", hideOpeningStyle);
        if (adjustmentSideWrap)
            adjustmentSideWrap.classList.toggle("hidden", !isRomanBlind);
        if (louisPriceWrap) louisPriceWrap.classList.toggle("hidden", !isLouis);
        if (fabricPriceWrap)
            fabricPriceWrap.classList.toggle("hidden", isLouis);
        if (fabricCodeWrap) fabricCodeWrap.classList.toggle("hidden", isLouis);

        updateFabricVariantUI();
    };

    // --- Event Listeners ---
    itemEl.addEventListener("input", (e) => {
        if (e.target === fabricVariantSelect) updateFabricVariantUI();
        if (e.target === styleSelect) updateSetControlsVisibility();
        debouncedRecalc();
    });
    setupDimensionBlur([widthInput, heightInput], debouncedRecalc);

    // --- Initialization ---
    widthInput.value = fmtDimension(data.width_m);
    heightInput.value = fmtDimension(data.height_m);
    styleSelect.value = data.style || "ลอน";
    fabricVariantSelect.value = data.fabric_variant || "ทึบ";
    pricePerMSelect.value = data.price_per_m_raw || "";
    sheerPricePerMSelect.value = data.sheer_price_per_m || "";
    louisPricePerMSelect.value = data.louis_price_per_m || "";
    fabricCodeInput.value = data.fabric_code || "";
    sheerCodeInput.value = data.sheer_fabric_code || "";
    openingStyleSelect.value = data.opening_style || "แยกกลาง";
    adjustmentSideSelect.value = data.adjustment_side || "ปรับขวา";
    notesInput.value = data.notes || "";

    HARDWARE_FIELDS.forEach(({ name, default: def }) => {
        const el = itemEl.querySelector(`input[name="${name}"]`);
        if (el) el.value = data[name] || def;
    });

    loadSuspendState(itemEl, data);
    loadOverrideData(
        override.enableOverrideCheckbox,
        override.overridePriceInput,
        data
    );
    updateSetControlsVisibility();
    override.updateOverrideState();
    recalc();

    // Expose data extraction for buildPayload/duplicate
    const getItemData = () => ({
        type: "set",
        is_suspended: itemEl.classList.contains("is-suspended"),
        enable_set_price: override.enableOverrideCheckbox.checked,
        set_price_override: toNum(override.overridePriceInput.value),
        width_m: toNum(widthInput.value),
        height_m: toNum(heightInput.value),
        style: styleSelect.value || "",
        fabric_variant: fabricVariantSelect.value || "",
        price_per_m_raw: toNum(pricePerMSelect.value),
        sheer_price_per_m: toNum(sheerPricePerMSelect.value),
        louis_price_per_m: toNum(louisPricePerMSelect.value),
        fabric_code: fabricCodeInput.value || "",
        sheer_fabric_code: sheerCodeInput.value || "",
        opening_style: openingStyleSelect.value || "",
        adjustment_side: adjustmentSideSelect.value || "ปรับขวา",
        notes: notesInput.value || "",
        ...Object.fromEntries(
            HARDWARE_FIELDS.map(({ name, default: def }) => [
                name,
                itemEl.querySelector(`input[name="${name}"]`)?.value || def,
            ])
        ),
    });
    itemEl.getItemData = getItemData;

    return itemEl;
}
