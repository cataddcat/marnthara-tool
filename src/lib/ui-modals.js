// src/lib/ui-modals.js
// --- SPECIFIC MODAL LOGIC & HANDLERS ---
// [VERSION: FINAL REFACTORED - COMPLETE & CORRECTED]
import {
    SELECTORS,
    ITEM_CONFIG,
    HARDWARE_FIELDS,
} from "./config.js";
import { fmtTH, toNum, fmt } from "./utils.js";
import {
    buildPayload,
    saveData,
    getDocumentState,
    updateDocumentState,
} from "./storage.js";

import { getShopConfig } from "./shopConfig.js";

// Import Core UI functions & state accessors
import {
    showModal,
    showToast,
    recalcAll,
    getActiveHardwareItem,
} from "./ui.js";

import { captureSignature } from "./signaturePad.js";
import { calculateSubTotal } from "./documentGenerator.js";

// --- LOCAL STATE ---
let isUpdatingDiscount = false; // State for discount modal

// --- EXPORT OPTIONS MODAL ---
/**
 *
 */
export async function showExportOptionsModal() {
    const modalEl = document.querySelector(SELECTORS.exportOptionsModal);
    if (!modalEl) return null;
    const pageBreakSlider = modalEl.querySelector("#pageBreakBuffer");
    const pageBreakValueDisplay = modalEl.querySelector(
        "#pageBreakBufferValue"
    );
    if (pageBreakSlider && pageBreakValueDisplay) {
        pageBreakValueDisplay.textContent = pageBreakSlider.value;
        pageBreakSlider.oninput = () => {
            pageBreakValueDisplay.textContent = pageBreakSlider.value;
        };
    }
    // [NEW] Sync VAT default with global state
    const vatEnabledInput = document.querySelector("#vat_enabled");
    const defaultVatOption =
        vatEnabledInput && vatEnabledInput.value === "1"
            ? "include"
            : "exclude";
    const radioToCheck = modalEl.querySelector(
        `input[name="vat_option"][value="${defaultVatOption}"]`
    );
    if (radioToCheck) {
        radioToCheck.checked = true;
    }
    const cleanupSig = _bindSignatureButtons(modalEl, "quote");
    const confirmed = await showModal(SELECTORS.exportOptionsModal);
    cleanupSig();
    if (pageBreakSlider) pageBreakSlider.oninput = null;
    if (!confirmed || confirmed.cancelled) return null;
    return {
        vatOption:
            modalEl.querySelector('input[name="vat_option"]:checked')?.value ||
            "include",
        showDetails:
            (modalEl.querySelector('input[name="item_details_option"]:checked')
                ?.value || "show_details") === "show_details",
        exportMethod: modalEl.querySelector("#exportMethod")?.value || "direct",
        pageBreakBuffer: parseInt(pageBreakSlider?.value, 10) || 3,
    };
}

// --- RECEIPT OPTIONS MODAL ---
/**
 * Returns today's date as YYYY-MM-DD in local time.
 * @returns {string}
 */
function _todayIsoLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

const SIGNATURE_ROLE_LABELS = {
    "quote-issuer": "ผู้เสนอราคา",
    "quote-customer": "ลูกค้า",
    "receipt-issuer": "ผู้รับเงิน",
    "receipt-customer": "ลูกค้า",
};

/**
 * Updates a signature button's status indicator (✓ or empty).
 * @param {HTMLElement} modalEl
 * @param {string} statusKey - e.g., "receipt-issuer"
 * @param {boolean} hasSignature
 */
function _updateSignatureStatus(modalEl, statusKey, hasSignature) {
    const el = modalEl.querySelector(
        `[data-signature-status="${statusKey}"]`
    );
    if (!el) return;
    el.textContent = hasSignature ? "✓" : "";
    el.classList.toggle("has-signature", hasSignature);
}

/**
 * Refreshes all signature status indicators within a modal from current state.
 * @param {HTMLElement} modalEl
 * @param {string} modalKind - "quote" or "receipt"
 */
function _refreshSignatureStatuses(modalEl, modalKind) {
    const sig = getDocumentState().signatures || {};
    _updateSignatureStatus(
        modalEl,
        `${modalKind}-issuer`,
        !!sig.issuer?.dataUrl
    );
    _updateSignatureStatus(
        modalEl,
        `${modalKind}-customer`,
        !!sig.customer?.dataUrl
    );
}

/**
 * Wires signature capture buttons inside a modal. Returns a cleanup function.
 * @param {HTMLElement} modalEl
 * @param {string} modalKind - "quote" or "receipt"
 * @returns {() => void} cleanup
 */
function _bindSignatureButtons(modalEl, modalKind) {
    _refreshSignatureStatuses(modalEl, modalKind);

    const handler = async (e) => {
        const btn = e.target.closest(
            `[data-act="capture-signature"][data-signature-modal="${modalKind}"]`
        );
        if (!btn || !modalEl.contains(btn)) return;
        e.preventDefault();
        const role = btn.dataset.signatureRole; // "issuer" | "customer"
        if (!role) return;
        const sig = getDocumentState().signatures || {};
        const existing = sig[role] || null;
        const result = await captureSignature({
            roleLabel: SIGNATURE_ROLE_LABELS[`${modalKind}-${role}`] || "",
            existing,
        });
        if (result) {
            updateDocumentState({
                signatures: { ...sig, [role]: result },
            });
            saveData();
            _refreshSignatureStatuses(modalEl, modalKind);
        }
    };

    modalEl.addEventListener("click", handler);
    return () => modalEl.removeEventListener("click", handler);
}

/**
 * Opens the receipt options modal, pre-filling values from the existing
 * receipt state (if any). Resolves to a config object or null on cancel.
 * @returns {Promise<object|null>}
 */
export async function showReceiptOptionsModal() {
    const modalEl = document.querySelector(SELECTORS.receiptOptionsModal);
    if (!modalEl) return null;

    const payload = buildPayload();
    const existing = payload.receipt || {};

    // Populate the read-only summary card so the user can verify shop /
    // customer / quote-ref / grand total before issuing — no re-typing needed.
    const shopCfg = getShopConfig();
    const summaryShopEl = modalEl.querySelector("#receiptSummaryShop");
    const summaryCustomerEl = modalEl.querySelector("#receiptSummaryCustomer");
    const refQuoteInput = modalEl.querySelector("#receipt_ref_quote");
    const summaryGrandTotalEl = modalEl.querySelector(
        "#receiptSummaryGrandTotal"
    );

    if (summaryShopEl) {
        const parts = [
            shopCfg.name || "-",
            shopCfg.phone ? `โทร ${shopCfg.phone}` : "",
        ].filter(Boolean);
        summaryShopEl.textContent = parts.join(" • ");
        if (!shopCfg.name) {
            summaryShopEl.classList.add("text-warning");
            summaryShopEl.textContent =
                "(ยังไม่ได้ตั้งชื่อร้าน — โปรดตั้งค่าร้านค้าก่อน)";
        } else {
            summaryShopEl.classList.remove("text-warning");
        }
    }
    if (summaryCustomerEl) {
        const parts = [
            payload.customer_name || "-",
            payload.customer_phone || "",
        ].filter(Boolean);
        summaryCustomerEl.textContent = parts.join(" • ");
    }
    if (refQuoteInput) {
        // Editable: existing receipt override > current quote# > blank
        refQuoteInput.value =
            existing.refQuoteNumber || payload.quoteNumber || "";
    }
    let computedGrandTotal = 0;
    if (summaryGrandTotalEl) {
        const subTotal = calculateSubTotal(payload);
        let discountAmount = 0;
        if (payload.discount && payload.discount.value > 0) {
            discountAmount =
                payload.discount.type === "percent"
                    ? Math.round(subTotal * (payload.discount.value / 100))
                    : payload.discount.value;
        }
        const afterDiscount =
            Math.round((subTotal - discountAmount) * 100) / 100;
        const vatEnabled =
            document.querySelector("#vat_enabled")?.value === "1";
        const vatRate = vatEnabled ? shopCfg.baseVatRate || 0 : 0;
        computedGrandTotal =
            Math.round(afterDiscount * (1 + vatRate) * 100) / 100;
        summaryGrandTotalEl.textContent = `${fmt(computedGrandTotal, 2, true)} บาท${vatEnabled ? " (รวม VAT)" : ""}`;
    }

    const paidAtInput = modalEl.querySelector("#receipt_paid_at");
    const methodSelect = modalEl.querySelector("#receipt_method");
    const methodNoteInput = modalEl.querySelector("#receipt_method_note");
    const paidAmountInput = modalEl.querySelector("#receipt_paid_amount");
    const issuerNameInput = modalEl.querySelector("#receipt_issuer_name");
    const pageBreakSlider = modalEl.querySelector("#receiptPageBreakBuffer");
    const pageBreakValueDisplay = modalEl.querySelector(
        "#receiptPageBreakBufferValue"
    );

    if (paidAtInput) paidAtInput.value = existing.paidAt || _todayIsoLocal();
    if (methodSelect) methodSelect.value = existing.method || "cash";
    if (methodNoteInput) methodNoteInput.value = existing.methodNote || "";
    if (paidAmountInput) {
        // Pre-fill: existing receipt > grand total > blank
        paidAmountInput.value =
            existing.paidAmount ||
            (computedGrandTotal > 0 ? computedGrandTotal.toFixed(2) : "");
    }
    if (issuerNameInput) {
        // Pre-fill priority: existing receipt → previous issuer signature name
        // → empty (so the placeholder hints at the shop-name fallback).
        const sig = getDocumentState().signatures || {};
        issuerNameInput.value =
            existing.issuerName || sig.issuer?.name || "";
    }

    if (pageBreakSlider && pageBreakValueDisplay) {
        pageBreakValueDisplay.textContent = pageBreakSlider.value;
        pageBreakSlider.oninput = () => {
            pageBreakValueDisplay.textContent = pageBreakSlider.value;
        };
    }

    const cleanupSig = _bindSignatureButtons(modalEl, "receipt");
    const confirmed = await showModal(SELECTORS.receiptOptionsModal);
    cleanupSig();
    if (pageBreakSlider) pageBreakSlider.oninput = null;
    if (!confirmed || confirmed.cancelled) return null;

    return {
        paidAt: paidAtInput?.value || _todayIsoLocal(),
        method: methodSelect?.value || "cash",
        methodNote: methodNoteInput?.value || "",
        paidAmount: toNum(paidAmountInput?.value) || 0,
        issuerName: issuerNameInput?.value?.trim() || "",
        refQuoteNumber: refQuoteInput?.value?.trim() || "",
        showDetails:
            (modalEl.querySelector(
                'input[name="receipt_item_details_option"]:checked'
            )?.value || "show_details") === "show_details",
        exportMethod:
            modalEl.querySelector("#receiptExportMethod")?.value || "direct",
        pageBreakBuffer: parseInt(pageBreakSlider?.value, 10) || 3,
    };
}

// --- DISCOUNT MODAL HELPERS & MAIN FUNCTION ---
/**
 *
 * @param modalEl
 * @param subTotal
 */
function _setupDiscountModalLogic(modalEl, subTotal) {
    const discountToggle = modalEl.querySelector("#discountToggle");
    const vatToggle = modalEl.querySelector("#vatToggle");
    const discountInputsGroup = modalEl.querySelector("#discountInputsGroup");
    const discountVatResultRow = modalEl.querySelector("#discountVatResultRow");
    const percentInput = modalEl.querySelector("#discountPercent");
    const amountInput = modalEl.querySelector("#discountAmount");
    const finalTotalEl = modalEl.querySelector("#discountFinalTotal");
    const finalTotalVatEl = modalEl.querySelector("#discountFinalTotalWithVat");
    // [NEW]
    const discountVatAmountRow = modalEl.querySelector("#discountVatAmountRow");
    const discountVatAmountEl = modalEl.querySelector("#discountVatAmount");

    const updateModalUI = (source) => {
        if (isUpdatingDiscount) return;
        isUpdatingDiscount = true;

        const isDiscountEnabled = discountToggle.checked;
        const isVatEnabled = vatToggle.checked;

        // --- 1. Enable/Disable Input Group ---
        discountInputsGroup.classList.toggle("is-disabled", !isDiscountEnabled);
        percentInput.disabled = !isDiscountEnabled;
        amountInput.disabled = !isDiscountEnabled;

        // --- 2. Calculate Discount ---
        let discountAmount = 0;
        if (isDiscountEnabled) {
            if (source === "percent") {
                const percent = toNum(percentInput.value);
                discountAmount = Math.round(
                    subTotal * (Math.max(0, percent) / 100)
                );
                amountInput.value =
                    discountAmount > 0 ? fmtTH(discountAmount) : "";
            } else {
                discountAmount = toNum(amountInput.value);
            }
            discountAmount = Math.max(0, Math.min(discountAmount, subTotal));
            if (source !== "percent") {
                const percent =
                    subTotal > 0 ? (discountAmount / subTotal) * 100 : 0;
                percentInput.value =
                    percent > 0 && isFinite(percent) ? fmt(percent, 2) : "";
            }
        } else {
            // [MODIFIED] Request 1: Don't clear inputs when toggle is off
            // percentInput.value = '';
            // amountInput.value = '';
        }

        // --- 3. Calculate Final Total (Pre-VAT) ---
        const finalTotal =
            Math.round((subTotal - discountAmount) * 100) / 100;
        if (finalTotalEl) finalTotalEl.textContent = fmtTH(finalTotal);

        // --- 4. Handle VAT Display ---
        discountVatResultRow.classList.toggle("hidden", !isVatEnabled);
        // [NEW] Toggle VAT amount row
        if (discountVatAmountRow)
            discountVatAmountRow.classList.toggle("hidden", !isVatEnabled);

        if (isVatEnabled) {
            // [NEW] Calculate and show VAT amount
            const vatAmount =
                Math.round(
                    finalTotal * getShopConfig().baseVatRate * 100
                ) / 100;
            if (discountVatAmountEl)
                discountVatAmountEl.textContent = fmtTH(vatAmount);

            const totalWithVat =
                Math.round((finalTotal + vatAmount) * 100) / 100;
            if (finalTotalVatEl)
                finalTotalVatEl.textContent = fmtTH(totalWithVat);
        }

        setTimeout(() => {
            isUpdatingDiscount = false;
        }, 50);
    };

    const percentListener = () => updateModalUI("percent");
    const amountListener = () => updateModalUI("amount");
    const toggleListener = () => updateModalUI("toggle");
    const amountFocusListener = (e) => {
        if (toNum(e.target.value) > 0) e.target.value = toNum(e.target.value);
    };
    const amountBlurListener = (e) => {
        const numValue = toNum(e.target.value);
        e.target.value = numValue > 0 ? fmtTH(numValue) : "";
        updateModalUI("amount");
    };

    discountToggle.addEventListener("change", toggleListener);
    vatToggle.addEventListener("change", toggleListener);
    percentInput.addEventListener("input", percentListener);
    amountInput.addEventListener("input", amountListener);
    amountInput.addEventListener("focus", amountFocusListener);
    amountInput.addEventListener("blur", amountBlurListener);

    return {
        runInitialUpdate: (source) => updateModalUI(source),
        cleanup: () => {
            percentInput.removeEventListener("input", percentListener);
            amountInput.removeEventListener("input", amountListener);
            amountInput.removeEventListener("focus", amountFocusListener);
            amountInput.removeEventListener("blur", amountBlurListener);
            discountToggle.removeEventListener("change", toggleListener);
            vatToggle.removeEventListener("change", toggleListener);
            isUpdatingDiscount = false;
        },
    };
}
/**
 *
 */
export async function showDiscountModal() {
    const modalEl = document.querySelector("#discountModal");
    if (!modalEl) return Promise.resolve({ cancelled: true });
    const subtotalEl = modalEl.querySelector("#discountSubtotal");
    const percentInput = modalEl.querySelector("#discountPercent");
    const amountInput = modalEl.querySelector("#discountAmount");
    const discountToggle = modalEl.querySelector("#discountToggle");
    const vatToggle = modalEl.querySelector("#vatToggle");

    const discountTypeInput = document.querySelector("#discount_type");
    const discountValueInput = document.querySelector("#discount_value");
    const vatEnabledInput = document.querySelector("#vat_enabled");

    const subTotal = toNum(
        document.querySelector("#originalTotal").dataset.rawTotal ||
            document.querySelector("#grandTotal").textContent
    );
    if (subtotalEl) subtotalEl.textContent = fmtTH(subTotal);

    // --- Setup Listeners ---
    const { runInitialUpdate, cleanup } = _setupDiscountModalLogic(
        modalEl,
        subTotal
    );

    // --- Set Initial State ---
    const currentType = discountTypeInput.value;
    const currentValue = toNum(discountValueInput.value);
    const currentVatState = vatEnabledInput.value === "1";

    // [MODIFIED] Request 1: Do not clear inputs on load.
    // percentInput.value = '';
    // amountInput.value = '';

    discountToggle.checked = currentValue > 0;
    vatToggle.checked = currentVatState;

    let initialUpdateSource = "amount";
    if (discountToggle.checked) {
        if (currentType === "percent") {
            percentInput.value = currentValue;
            initialUpdateSource = "percent";
        } else {
            amountInput.value = currentValue;
            amountInput.value = fmtTH(currentValue); // Format it for display
        }
    } else {
        // [NEW] Request 1: If toggle is off, keep existing modal values (if any)
        if (toNum(percentInput.value) > 0) {
            initialUpdateSource = "percent";
        } else if (toNum(amountInput.value) > 0) {
            initialUpdateSource = "amount";
        }
    }

    runInitialUpdate(initialUpdateSource);

    const result = await showModal("#discountModal");

    cleanup();

    if (result && !result.cancelled) {
        const isDiscountEnabled = discountToggle.checked;
        const finalPercent = toNum(percentInput.value);
        const finalAmount = toNum(amountInput.value);
        const focusedElement = document.activeElement;

        if (isDiscountEnabled) {
            if (
                finalPercent > 0 &&
                (focusedElement === percentInput ||
                    focusedElement !== amountInput)
            ) {
                discountTypeInput.value = "percent";
                discountValueInput.value = finalPercent;
            } else if (finalAmount > 0) {
                discountTypeInput.value = "amount";
                discountValueInput.value = finalAmount;
            } else {
                // Discount was on, but no value entered
                discountTypeInput.value = "amount";
                discountValueInput.value = 0;
            }
        } else {
            discountTypeInput.value = "amount";
            discountValueInput.value = 0;
        }
        vatEnabledInput.value = vatToggle.checked ? "1" : "0";
        recalcAll();
    }
}

// --- HARDWARE MODAL ---
/**
 *
 */
export async function showHardwareModal() {
    const activeHardwareItem = getActiveHardwareItem();
    if (!activeHardwareItem) return;
    const modalEl = document.querySelector("#hardwareModal");
    if (!modalEl) return;
    const currentStyle =
        activeHardwareItem.querySelector('[name="set_style"]')?.value ?? null;
    const applyToRoomBtn = modalEl.querySelector("#hardwareApplyToRoom");

    // Populate modal inputs from item values and toggle group visibility
    HARDWARE_FIELDS.forEach(
        ({ name, modalName, groupId, default: def, showFor }) => {
            const modalInput = modalEl.querySelector(`[name="${modalName}"]`);
            if (modalInput) {
                modalInput.value =
                    activeHardwareItem.querySelector(`[name="${name}"]`)
                        ?.value || def;
            }
            if (groupId) {
                const group = modalEl.querySelector(`#${groupId}`);
                if (group) {
                    const visible =
                        showFor === null || showFor.includes(currentStyle);
                    group.classList.toggle("hidden", !visible);
                }
            }
        }
    );

    if (applyToRoomBtn) {
        applyToRoomBtn.disabled =
            currentStyle === "ม่านพับ" || currentStyle === "หลุยส์";
    }

    const result = await showModal("#hardwareModal");
    if (result && !result.cancelled) {
        // Write back only fields that are relevant for this style
        HARDWARE_FIELDS.forEach(({ name, modalName, showFor }) => {
            const isRelevant =
                showFor === null || showFor.includes(currentStyle);
            if (!isRelevant) return;
            const itemInput = activeHardwareItem.querySelector(
                `[name="${name}"]`
            );
            const modalInput = modalEl.querySelector(`[name="${modalName}"]`);
            if (itemInput && modalInput) itemInput.value = modalInput.value;
        });
        saveData();
        showToast("บันทึกการตั้งค่าอุปกรณ์แล้ว", "success");
    }
}

// --- OTHER MODAL HELPERS ---
/**
 *
 * @param title
 * @param currentType
 */
export async function showItemTypeModal(title, currentType = null) {
    const modalEl = document.querySelector("#itemTypeModal");
    if (!modalEl) return null;
    modalEl.querySelector("#itemTypeModalTitle").textContent = title;
    const allOptionLabel = modalEl.querySelector('label[data-item-type="all"]');
    if (allOptionLabel) allOptionLabel.style.display = "none";
    let typeToSelect = currentType || "set";
    if (currentType && !ITEM_CONFIG[currentType]) typeToSelect = "set";
    const radioToCheck = modalEl.querySelector(
        `input[name="item_type_option"][value="${typeToSelect}"]`
    );
    if (radioToCheck) radioToCheck.checked = true;
    else {
        const defaultRadio = modalEl.querySelector(
            `input[name="item_type_option"][value="set"]`
        );
        if (defaultRadio) defaultRadio.checked = true;
    }
    const confirmed = await showModal("#itemTypeModal");
    if (!confirmed || confirmed.cancelled) return null;
    const selectedOption = modalEl.querySelector(
        'input[name="item_type_option"]:checked'
    );
    return selectedOption ? selectedOption.value : null;
}
/**
 *
 * @param currentType
 * @param includeAllOption
 */
export async function showBatchTypeSelectModal(
    currentType,
    includeAllOption = false
) {
    const modalEl = document.querySelector("#itemTypeModal");
    if (!modalEl) return null;
    const modalTitle = modalEl.querySelector("#itemTypeModalTitle");
    const radioGroup = modalEl.querySelector(".radio-card-group");
    if (!modalTitle || !radioGroup) return null;
    modalTitle.textContent = includeAllOption
        ? "เลือกประเภทเพื่อกรอง"
        : "เลือกประเภทปลายทาง";
    let allOptionLabel = radioGroup.querySelector(
        'label[data-item-type="all"]'
    );
    if (includeAllOption) {
        if (!allOptionLabel) {
            allOptionLabel = document.createElement("label");
            allOptionLabel.dataset.itemType = "all";
            allOptionLabel.innerHTML = `<input type="radio" name="item_type_option" value="all"><span class="radio-card-content"><strong><i class="ph-fill ph-asterisk"></i> ทั้งหมด</strong><small>All Item Types</small></span>`;
            radioGroup.prepend(allOptionLabel);
        }
        allOptionLabel.style.display = "";
    } else if (allOptionLabel) {
        allOptionLabel.style.display = "none";
    }
    let typeToSelect =
        includeAllOption &&
        (currentType === null || currentType === "all" || currentType === "")
            ? "all"
            : currentType && ITEM_CONFIG[currentType]
              ? currentType
              : "set";
    const radioToCheck = radioGroup.querySelector(
        `input[name="item_type_option"][value="${typeToSelect}"]`
    );
    if (radioToCheck) radioToCheck.checked = true;
    else {
        const firstRadio = radioGroup.querySelector(
            `input[name="item_type_option"][value="${includeAllOption ? "all" : "set"}"]`
        );
        if (firstRadio) firstRadio.checked = true;
    }
    const confirmed = await showModal("#itemTypeModal");
    if (!confirmed || confirmed.cancelled) return null;
    const selectedRadio = modalEl.querySelector(
        'input[name="item_type_option"]:checked'
    );
    if (!selectedRadio) return null;
    const selectedType = selectedRadio.value;
    const selectedLabel = selectedRadio
        .closest("label")
        ?.querySelector("strong");
    const selectedDisplayName = selectedLabel
        ? selectedLabel.textContent.trim()
        : selectedType;
    return { type: selectedType, displayName: selectedDisplayName };
}