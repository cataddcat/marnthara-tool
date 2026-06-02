// src/lib/ui-form-handlers.js
// --- FORM EVENT DELEGATION (extracted from ui.js Phase 2A) ---
import { SELECTORS } from "./config.js";
import { fmtTH, toNum, debounce, fmtDimension } from "./utils.js";
import { saveData } from "./storage.js";

/**
 * Sets up all form-level delegated event listeners on the order form.
 * @param {HTMLFormElement} orderForm - The main order form element.
 * @param {object} deps - Dependencies from ui.js.
 * @param {() => boolean} deps.getIsLocked - Returns current lock state.
 * @param {() => void} deps.recalcAll - Debounced recalculation function.
 * @param {(el: Element) => void} deps.scrollToViewIfNeeded - Scrolls element into view.
 * @param {() => void} deps.updateQuickNavMenu - Updates quick nav dropdown.
 * @param {() => void} deps.updateRoomObserver - Updates room intersection observer.
 */
export function setupFormDelegation(orderForm, deps) {
    const {
        getIsLocked,
        recalcAll,
        recalcRoom,
        recalcGrandTotal,
        scrollToViewIfNeeded,
        updateQuickNavMenu,
        updateRoomObserver,
    } = deps;

    const debouncedSave = debounce(saveData, 300);

    // --- Custom event from components (targeted recalc: only the changed room) ---
    orderForm.addEventListener("item-update", (e) => {
        const roomEl = e.target.closest(".room-card");
        if (roomEl && recalcRoom && recalcGrandTotal) {
            recalcRoom(roomEl);
            recalcGrandTotal();
        } else {
            recalcAll();
        }
    });

    // --- INPUT event (delegated) ---
    orderForm.addEventListener("input", (e) => {
        if (getIsLocked()) {
            e.preventDefault();
            return;
        }
        // Bug fix: discount value input was never wired to recalc.
        if (e.target.id === "discount_value") {
            recalcGrandTotal ? recalcGrandTotal() : recalcAll();
        }
        if (e.target.matches(SELECTORS.roomNameInput)) {
            const roomCard = e.target.closest(".room-card");
            const displaySpan = roomCard?.querySelector(
                "[data-room-name-display]"
            );
            if (displaySpan) displaySpan.textContent = e.target.value || "ห้อง";
            updateQuickNavMenu();
            updateRoomObserver();
            debouncedSave();
        }
        if (
            e.target.matches(
                'input[name$="_m"], input[name$="price_sqyd"], input[name$="price_roll"], input[name$="install_cost"]'
            )
        ) {
            recalcAll();
        }
    });

    // --- CHANGE event (delegated) ---
    orderForm.addEventListener("change", (e) => {
        if (getIsLocked()) {
            e.preventDefault();
            return;
        }
        if (e.target.matches("select")) {
            recalcAll();
        }
    });

    // --- BLUR event (capture phase) ---
    orderForm.addEventListener(
        "blur",
        (e) => {
            const el = e.target;
            const priceInputs =
                '[name$="_price_sqyd"], [name$="_price_roll"], [name$="_install_cost"], [name="price_per_item"], [name="set_price_override"]';
            const dimInputs =
                'input[name$="_m"], input[name^="wall_width_m"], input[name^="modal_"]';

            if (el.matches(priceInputs)) {
                if (
                    (el.name === "wallpaper_install_cost" ||
                        el.name === "set_price_override") &&
                    toNum(el.value) === 0
                ) {
                    el.value = "0.00";
                } else {
                    el.value =
                        toNum(el.value) > 0 ? fmtTH(toNum(el.value), 2) : "";
                }
            } else if (el.matches(dimInputs)) {
                el.value = fmtDimension(el.value);
            }
            if (
                !el.closest(".modal-wrapper") &&
                el.matches('input:not([type="hidden"]), select, textarea')
            ) {
                saveData();
            }
        },
        true
    );

    // --- FOCUSIN event (capture phase) ---
    orderForm.addEventListener(
        "focusin",
        (e) => {
            const el = e.target;
            const priceInputs =
                '[name$="_price_sqyd"], [name$="_price_roll"], [name$="_install_cost"], [name="price_per_item"], [name="set_price_override"]';

            if (el.matches(priceInputs)) {
                if (
                    !(
                        (el.name === "wallpaper_install_cost" ||
                            el.name === "set_price_override") &&
                        (el.value === "0" || el.value === "0.00")
                    )
                ) {
                    if (toNum(el.value) > 0) el.value = toNum(el.value);
                }
            }
            if (el.matches('input:not([type="hidden"]), select, textarea')) {
                const mainHeader = document.querySelector(".main-header");
                const footer = document.querySelector(".summary-footer");
                const headerHeight = mainHeader
                    ? mainHeader.offsetHeight + 16
                    : 80;
                const footerHeight = footer ? footer.offsetHeight + 16 : 100;
                const viewportHeight = window.innerHeight;
                const elRect = el.getBoundingClientRect();
                const isObscured =
                    elRect.top < headerHeight ||
                    elRect.bottom > viewportHeight - footerHeight;
                if (isObscured && !el.closest(".modal-wrapper")) {
                    const card = el.closest(".item-card, .room-card");
                    if (card) {
                        scrollToViewIfNeeded(card);
                    }
                }
            }
        },
        true
    );

    // --- KEYDOWN event (Enter key navigation) ---
    orderForm.addEventListener("keydown", (e) => {
        if (getIsLocked()) {
            e.preventDefault();
            return;
        }
        const target = e.target;

        if (
            e.key === "Enter" &&
            target.matches("input, select") &&
            !target.closest(".modal-wrapper")
        ) {
            e.preventDefault();

            const parentCard = target.closest(".item-card, .card");
            if (parentCard) {
                const focusable = Array.from(
                    parentCard.querySelectorAll(
                        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
                    )
                ).filter(
                    (el) =>
                        el.offsetParent !== null &&
                        !el.closest(".hidden") &&
                        (!el.closest(".item-details-more") ||
                            el.closest(".item-details-more.show"))
                );

                const currentIndex = focusable.indexOf(target);

                if (currentIndex > -1 && currentIndex < focusable.length - 1) {
                    const nextElement = focusable[currentIndex + 1];
                    nextElement.focus();
                    if (typeof nextElement.select === "function") {
                        nextElement.select();
                    }
                } else if (currentIndex === focusable.length - 1) {
                    target.blur();
                }
            }
        }
    });
}
