// src/lib/ui-click-actions.js
// --- CLICK ACTION HANDLERS (extracted from ui.js Phase 2B) ---
import { SELECTORS, ITEM_CONFIG, HARDWARE_FIELDS } from "./config.js";
import { toNum } from "./utils.js";
import { saveData, buildPayload } from "./storage.js";
import { pushState } from "./undoManager.js";
import { getTopModal } from "./modal.js";
import {
    addRoom,
    replacePlaceholderWithItem,
    handleChangeItemType,
    duplicateItem,
    jumpToItem,
} from "./ui-actions.js";
import {
    showDiscountModal,
    showHardwareModal,
    showItemTypeModal,
} from "./ui-modals.js";
import { showFavoritesModal, populateFavManagerList } from "./ui-favorites.js";
import { addOrUpdateFavorite, deleteFavorite } from "./favorites.js";
import { createSetItem } from "../components/SetItem.js";
import {
    createWallpaperItem,
    createWall,
} from "../components/WallpaperItem.js";
import { createAreaBasedItem } from "../components/AreaBasedItem.js";
import { createRemovalItem } from "../components/RemovalItem.js";
import { createCustomItem } from "../components/CustomItem.js";

/** Actions allowed while the form is locked. */
const ALLOWED_WHILE_LOCKED = new Set([
    "toggle-more-details",
    "collapse-room",
    "show-discount-modal",
    "show-suspended-items",
    "clear-filter",
    "close-modal",
    "jump-to-item",
    "manage-favorites",
    "show-favorites",
    "open-shop-settings",
    "save-shop-config",
]);

/** Actions that should NOT call preventDefault. */
const NO_PREVENT_DEFAULT = new Set([
    "toggle-more-details",
    "close-modal",
    "collapse-room",
]);

/**
 * Creates the action handler map. Each handler receives { btn, itemCardEl, roomEl, ctx }.
 * @param {object} ctx - Context object with functions from ui.js.
 * @returns {Record<string, (params: object) => void|Promise<void>>}
 */
function createActionHandlers(ctx) {
    const {
        recalcAll,
        renumberItemTitles,
        animateAndRemove,
        toggleDetails,
        updateToggleAllButtonState,
        updateUndoButtonState,
        applySuspendedFilter,
        clearFilter,
        updateSuspendedItemsWarning,
        getActiveFilter,
        setActiveHardwareItem,
        getActiveHardwareItem,
        getSelectedFavItem,
        setFavManagerChangesMade,
        populateShopSettingsModal,
        handleShopConfigSave,
        showModal,
        showConfirmation,
        showToast,
    } = ctx;

    return {
        "open-shop-settings": () => {
            const modalEl = document.querySelector(SELECTORS.shopSettingsModal);
            if (modalEl) {
                populateShopSettingsModal();
                showModal(SELECTORS.shopSettingsModal);
            }
        },

        "save-shop-config": () => {
            handleShopConfigSave();
        },

        "show-discount-modal": () => {
            showDiscountModal();
        },

        "show-suspended-items": () => {
            applySuspendedFilter();
        },

        "clear-filter": () => {
            clearFilter();
        },

        "add-room": () => {
            addRoom();
        },

        "add-item": async ({ roomEl }) => {
            if (!roomEl) return;

            const itemTypeModal = document.querySelector("#itemTypeModal");
            if (!itemTypeModal) return;

            itemTypeModal.querySelector("#itemTypeModalTitle").textContent =
                "เลือกประเภทรายการ";
            itemTypeModal
                .querySelector('label[data-item-type="all"]')
                ?.style.setProperty("display", "none");
            let radioToCheck = itemTypeModal.querySelector(
                'input[name="item_type_option"][value="set"]'
            );
            if (radioToCheck) radioToCheck.checked = true;

            const result = await showModal("#itemTypeModal");

            if (!result || result.cancelled) return;

            if (result === true) {
                await handleSingleAdd(itemTypeModal, roomEl, ctx);
            }
        },

        "select-item-type": async ({ itemCardEl }) => {
            if (
                itemCardEl &&
                itemCardEl.classList.contains("placeholder-item")
            ) {
                const dimensions = {
                    width_m: parseFloat(itemCardEl.dataset.widthM || 0),
                    height_m: parseFloat(itemCardEl.dataset.heightM || 0),
                };
                if (dimensions.width_m > 0 && dimensions.height_m > 0) {
                    const selectedType =
                        await showItemTypeModal("เลือกประเภทสินค้า");
                    if (selectedType) {
                        replacePlaceholderWithItem(
                            itemCardEl,
                            selectedType,
                            dimensions
                        );
                    }
                } else {
                    showToast("ขนาดไม่ถูกต้องบน Placeholder", "error");
                }
            }
        },

        "collapse-room": ({ roomEl }) => {
            if (roomEl) {
                roomEl.open = false;
                setTimeout(() => {
                    updateToggleAllButtonState();
                    saveData();
                }, 50);
            }
        },

        "toggle-room-menu": ({ btn }) => {
            btn.nextElementSibling?.classList.toggle("show");
        },

        "toggle-suspend-room": ({ btn, roomEl }) => {
            if (roomEl) {
                roomEl.classList.toggle("is-suspended");
                btn.closest(".room-options-menu")?.classList.remove("show");
                recalcAll();
                if (getActiveFilter() === "suspended") applySuspendedFilter();
                else updateSuspendedItemsWarning();
            }
        },

        "clear-room": async ({ roomEl }) => {
            if (roomEl && (await showConfirmation("ล้างข้อมูลในห้อง", "?"))) {
                pushState(buildPayload());
                updateUndoButtonState();
                roomEl.getItemsContainer().innerHTML = "";
                renumberItemTitles();
                recalcAll();
                showToast("ล้างแล้ว", "success");
            }
        },

        "del-room": async ({ roomEl }) => {
            if (roomEl && (await showConfirmation("ลบห้อง", "?"))) {
                animateAndRemove(roomEl, "ลบแล้ว");
            }
        },

        "del-item": async ({ itemCardEl }) => {
            if (itemCardEl && (await showConfirmation("ลบรายการ", "?"))) {
                animateAndRemove(itemCardEl, "ลบแล้ว");
            }
        },

        "duplicate-item": ({ itemCardEl }) => {
            if (itemCardEl) duplicateItem(itemCardEl);
        },

        "toggle-suspend": ({ itemCardEl }) => {
            if (itemCardEl) {
                itemCardEl.classList.toggle("is-suspended");
                recalcAll();
                if (getActiveFilter() === "suspended") applySuspendedFilter();
                else updateSuspendedItemsWarning();
            }
        },

        "change-type": ({ itemCardEl }) => {
            if (itemCardEl) handleChangeItemType(itemCardEl);
        },

        "toggle-more-details": ({ itemCardEl }) => {
            if (
                itemCardEl &&
                !itemCardEl
                    .querySelector(".item-details-more")
                    ?.classList.contains("show")
            ) {
                document
                    .querySelectorAll(".item-details-more.show")
                    .forEach((d) => {
                        if (d.closest(".item-card") !== itemCardEl)
                            toggleDetails(d.closest(".item-card"), false);
                    });
            }
            toggleDetails(itemCardEl);
        },

        "open-hardware-modal": ({ itemCardEl }) => {
            setActiveHardwareItem(itemCardEl);
            if (getActiveHardwareItem()) showHardwareModal();
        },

        "apply-hardware-to-room": ({ btn }) => {
            const modalEl = btn.closest("#hardwareModal");
            const currentRoom = getActiveHardwareItem()?.closest(
                SELECTORS.room
            );
            if (!modalEl || !currentRoom || !getActiveHardwareItem()) return;
            const activeStyle =
                getActiveHardwareItem().querySelector(
                    '[name="set_style"]'
                )?.value;
            if (activeStyle === "ม่านพับ" || activeStyle === "หลุยส์") {
                showToast("ไม่สามารถใช้กับม่านพับหรือม่านหลุยส์ได้", "warning");
                return;
            }
            const modalValues = Object.fromEntries(
                HARDWARE_FIELDS.map(({ name, modalName }) => [
                    name,
                    modalEl.querySelector(`[name="${modalName}"]`)?.value,
                ])
            );
            currentRoom
                .querySelectorAll(
                    '.set-item:not(:has(select[name="set_style"][value="ม่านพับ"])):not(:has(select[name="set_style"][value="หลุยส์"]))'
                )
                .forEach((setItem) => {
                    const itemStyle = setItem.querySelector(
                        'select[name="set_style"]'
                    )?.value;
                    HARDWARE_FIELDS.forEach(({ name, showFor }) => {
                        if (showFor !== null && !showFor.includes(itemStyle))
                            return;
                        const input = setItem.querySelector(`[name="${name}"]`);
                        if (input && modalValues[name] !== undefined) {
                            input.value = modalValues[name];
                        }
                    });
                });
            saveData();
            showToast("ใช้กับรายการที่เข้ากันได้ในห้องแล้ว", "success");
        },

        "add-wall": ({ btn }) => {
            const wc = btn
                .closest(".walls-section")
                ?.querySelector("[data-walls-container]");
            if (wc) {
                const nw = createWall();
                if (nw) {
                    wc.appendChild(nw);
                    nw.querySelector("input")?.focus();
                    recalcAll();
                }
            }
        },

        "del-wall": async ({ btn }) => {
            const wr = btn.closest(".wall-input-row");
            if (wr && (await showConfirmation("ลบผนัง", "?"))) {
                animateAndRemove(wr, "ลบแล้ว");
            }
        },

        "show-favorites": ({ btn }) => {
            const inputEl = btn.previousElementSibling?.matches(
                "input[data-favorite-type]"
            )
                ? btn.previousElementSibling
                : btn
                      .closest(".form-group-with-favorites")
                      ?.querySelector("input[data-favorite-type]");
            if (inputEl) {
                showFavoritesModal(inputEl);
            } else {
                console.warn(
                    "Could not find associated input for show-favorites button:",
                    btn
                );
            }
        },

        "add-new-fav-form": async ({ btn }) => {
            const managerModal = btn.closest("#favManagerModal");
            const type = managerModal?.dataset.currentType;
            if (!type) return;
            const addModal = document.querySelector("#favAddModal");
            if (!addModal) return;
            let favTypeDisplayName = ITEM_CONFIG[type]?.name || type;
            if (type === "fabric") favTypeDisplayName = "ผ้าทึบ";
            else if (type === "sheer") favTypeDisplayName = "ผ้าโปร่ง";
            addModal.querySelector("h3").textContent =
                `เพิ่ม '${favTypeDisplayName}'`;
            const codeInput = addModal.querySelector('[name="fav_code_add"]');
            const priceInput = addModal.querySelector('[name="fav_price_add"]');
            codeInput.value = "";
            priceInput.value = "";
            const result = await showModal("#favAddModal");
            if (result && !result.cancelled) {
                const code = codeInput.value.trim();
                const price = toNum(priceInput.value);
                if (code && price >= 0) {
                    if (addOrUpdateFavorite(type, code, price)) {
                        setFavManagerChangesMade(true);
                        populateFavManagerList(type);
                        showToast("เพิ่มแล้ว", "success");
                    } else {
                        showToast("ล้มเหลว", "error");
                    }
                } else if (!code) {
                    showToast("ต้องระบุรหัส", "warning");
                } else {
                    showToast("ราคาต้องไม่ติดลบ", "warning");
                }
            }
        },

        "edit-selected-fav": async ({ btn }) => {
            if (!getSelectedFavItem()) return;
            const managerModal = btn.closest("#favManagerModal");
            const type = managerModal?.dataset.currentType;
            if (!type) return;
            const editModal = document.querySelector("#favEditModal");
            if (!editModal) return;
            editModal.querySelector("h3").textContent =
                `แก้ไข '${getSelectedFavItem().code}'`;
            const codeInput = editModal.querySelector('[name="fav_code_edit"]');
            const priceInput = editModal.querySelector(
                '[name="fav_price_edit"]'
            );
            codeInput.value = getSelectedFavItem().code;
            priceInput.value =
                getSelectedFavItem().price !== null &&
                getSelectedFavItem().price >= 0
                    ? getSelectedFavItem().price
                    : "";
            const result = await showModal("#favEditModal");
            if (result && !result.cancelled) {
                const newCode = codeInput.value.trim();
                const newPrice = toNum(priceInput.value);
                if (newCode && newPrice >= 0) {
                    if (newCode !== getSelectedFavItem().code) {
                        deleteFavorite(type, getSelectedFavItem().code);
                    }
                    addOrUpdateFavorite(type, newCode, newPrice);
                    setFavManagerChangesMade(true);
                    populateFavManagerList(type);
                    showToast("แก้ไขรายการโปรดแล้ว", "success");
                } else if (!newCode) {
                    showToast("ต้องระบุรหัส", "warning");
                } else {
                    showToast("ราคาต้องไม่ติดลบ", "warning");
                }
            }
        },

        "del-selected-fav": async ({ btn }) => {
            if (!getSelectedFavItem()) return;
            const managerModal = btn.closest("#favManagerModal");
            const type = managerModal?.dataset.currentType;
            if (!type) return;
            if (
                await showConfirmation(
                    "ลบรายการโปรด",
                    `"${getSelectedFavItem().code}"?`
                )
            ) {
                if (deleteFavorite(type, getSelectedFavItem().code)) {
                    setFavManagerChangesMade(true);
                    populateFavManagerList(type);
                    showToast("ลบแล้ว", "success");
                } else {
                    showToast("ล้มเหลว", "error");
                }
            }
        },

        "jump-to-item": ({ btn }) => {
            jumpToItem(btn);
        },

        "close-modal": ({ btn }) => {
            const modalToClose = btn.closest(".modal-wrapper");
            if (modalToClose && typeof modalToClose.closeModal === "function") {
                if (getTopModal() === modalToClose) {
                    modalToClose.closeModal({ cancelled: true });
                }
            } else if (modalToClose) {
                console.warn(
                    "Modal is missing .closeModal() function.",
                    modalToClose
                );
            }
        },

        "manage-favorites": () => {
            // Handled by modal system
        },
    };
}

/**
 * Handles single item addition with type selection and room defaults.
 * @param {HTMLElement} itemTypeModal - The item type modal element.
 * @param {HTMLElement} roomEl - The room card element.
 * @param {object} ctx - Context from ui.js.
 */
async function handleSingleAdd(itemTypeModal, roomEl, ctx) {
    const {
        recalcAll,
        scrollToViewIfNeeded,
        renumberItemTitles,
        updateUndoButtonState,
        showToast,
    } = ctx;

    const selectedType = itemTypeModal.querySelector(
        'input[name="item_type_option"]:checked'
    )?.value;
    if (!selectedType) {
        showToast("ไม่ได้เลือกประเภท", "warning");
        return;
    }

    pushState(buildPayload());
    updateUndoButtonState();

    const itemData = {};

    let newItemEl;
    if (selectedType === "set") newItemEl = createSetItem(itemData);
    else if (selectedType === "wallpaper")
        newItemEl = createWallpaperItem(itemData);
    else if (selectedType === "removal")
        newItemEl = createRemovalItem(itemData);
    else if (selectedType === "custom") newItemEl = createCustomItem(itemData);
    else if (ITEM_CONFIG[selectedType]?.templateId === "#areaBasedTpl")
        newItemEl = createAreaBasedItem(selectedType, itemData);
    else {
        showToast(`ไม่รู้จักประเภทรายการ: ${selectedType}`, "error");
        return;
    }

    if (!newItemEl) return;

    const itemsContainer = roomEl.getItemsContainer();
    if (itemsContainer) {
        itemsContainer.appendChild(newItemEl);
        newItemEl.classList.add("item-created");
        scrollToViewIfNeeded(newItemEl);
        let firstInput = newItemEl.querySelector(
            'input[name="width_m"], input[name="area_width_m"], input[name="wallpaper_height_m"], input[name="quantity"]'
        );
        if (firstInput) {
            firstInput.focus();
        } else {
            newItemEl
                .querySelector('input:not([type="hidden"]), select, textarea')
                ?.focus();
        }
        renumberItemTitles();
        recalcAll();
        showToast(
            `เพิ่ม ${ITEM_CONFIG[selectedType]?.name || "รายการ"} แล้ว`,
            "success"
        );
    }
}

/**
 * Sets up the global click handler with dismissals, filter clicks, and data-act dispatch.
 * @param {object} ctx - Context with functions and state from ui.js.
 * @param {object} menuRefs - References to menu elements.
 * @param {HTMLElement|null} menuRefs.menuDropdown - The menu dropdown element.
 * @param {HTMLElement|null} menuRefs.menuBtn - The menu button element.
 * @param {HTMLElement|null} menuRefs.quickNavDropdown - The quick nav dropdown.
 * @param {HTMLElement|null} menuRefs.quickNavBtn - The quick nav button.
 */
export function setupGlobalClickHandler(ctx, menuRefs) {
    const {
        getIsLocked,
        applyFilter,
        setSelectedFavItem,
        getSelectedFavItem,
        showToast,
        showBatchTypeSelectModal,
    } = ctx;
    const { menuDropdown, menuBtn, quickNavDropdown, quickNavBtn } = menuRefs;

    const actionHandlers = createActionHandlers(ctx);

    document.addEventListener("click", async (e) => {
        // --- Dismiss menus on outside click ---
        if (!e.target.closest(".menu-container")) {
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            quickNavDropdown?.classList.remove("show");
            quickNavBtn?.setAttribute("aria-expanded", "false");
        }
        if (!e.target.closest(".room-options-container")) {
            document
                .querySelectorAll(".room-options-menu.show")
                .forEach((menu) => menu.classList.remove("show"));
        }

        // --- Filter tag in overview modal ---
        const filterBtn = e.target.closest(".summary-tag[data-filter-type]");
        if (filterBtn && filterBtn.closest("#overviewModal")) {
            const filterType = filterBtn.dataset.filterType;
            const filterDisplayName = filterBtn.textContent
                .trim()
                .replace(/\s*\d+\s*$/, "");
            const overviewModal = document.querySelector("#overviewModal");
            if (
                overviewModal &&
                typeof overviewModal.closeModal === "function"
            ) {
                overviewModal.closeModal({ cancelled: true });
            }
            applyFilter(filterType, filterDisplayName);
            return;
        }

        // --- Favorites manager item click ---
        const favManagerItem = e.target.closest(".fav-manager-item");
        if (favManagerItem) {
            const managerModal = favManagerItem.closest("#favManagerModal");
            const currentSelected = managerModal?.querySelector(
                ".fav-manager-item.is-selected"
            );
            if (currentSelected)
                currentSelected.classList.remove("is-selected");
            if (currentSelected !== favManagerItem) {
                favManagerItem.classList.add("is-selected");
                setSelectedFavItem({
                    code: favManagerItem.dataset.code,
                    price: toNum(favManagerItem.dataset.price),
                });
            } else {
                setSelectedFavItem(null);
            }
            if (managerModal) {
                managerModal.querySelector(
                    '[data-act="edit-selected-fav"]'
                ).disabled = !getSelectedFavItem();
                managerModal.querySelector(
                    '[data-act="del-selected-fav"]'
                ).disabled = !getSelectedFavItem();
            }
            return;
        }

        // --- Batch type selection buttons ---
        if (e.target.closest('[data-act="batch-select-type"]')) {
            const button = e.target.closest('[data-act="batch-select-type"]');
            const displayEl = document.querySelector(
                button.dataset.targetDisplay
            );
            const valueInput = document.getElementById(
                "batch-select-device-type-value"
            );
            const currentValue = valueInput?.value || "all";

            const result = await showBatchTypeSelectModal(currentValue, true);

            if (result) {
                valueInput.value = result.type === "all" ? "" : result.type;
                if (displayEl) displayEl.textContent = result.displayName;

                button.classList.toggle(
                    "is-placeholder",
                    result.type === "all" || !result.type
                );

                document.dispatchEvent(
                    new CustomEvent("batch-type-filter-change", {
                        detail: { type: result.type },
                    })
                );
            }
            return;
        }

        if (e.target.closest('[data-act="batch-select-target-type"]')) {
            const button = e.target.closest(
                '[data-act="batch-select-target-type"]'
            );
            const displayEl = document.querySelector(
                button.dataset.targetDisplay
            );
            const valueInput = document.getElementById(
                "batch-target-device-type-value"
            );
            const currentValue = valueInput?.value || null;

            const result = await showBatchTypeSelectModal(currentValue, false);

            if (result) {
                valueInput.value = result.type;
                if (displayEl) displayEl.textContent = result.displayName;
                button.classList.remove("is-placeholder");
                valueInput.dispatchEvent(
                    new Event("change", { bubbles: true, cancelable: false })
                );
            }
            return;
        }

        // --- data-act dispatch ---
        const btn = e.target.closest("[data-act]");
        if (btn) {
            const action = btn.dataset.act;
            const itemCardEl = btn.closest(".item-card");
            const roomEl = btn.closest(".room-card");

            if (
                getIsLocked() &&
                !btn.closest(".unlockable") &&
                !ALLOWED_WHILE_LOCKED.has(action)
            ) {
                showToast("ฟอร์มถูกล็อคอยู่", "warning");
                return;
            }
            if (!NO_PREVENT_DEFAULT.has(action)) {
                e.preventDefault();
            }
            if (action !== "close-modal") {
                e.stopPropagation();
            }

            const handler = actionHandlers[action];
            if (handler) {
                await handler({ btn, itemCardEl, roomEl });
            }
        } else {
            // --- Summary/details toggle ---
            const summary = e.target.closest("summary");
            if (summary && summary.closest("details.card")) {
                setTimeout(() => {
                    ctx.updateToggleAllButtonState();
                    saveData();
                }, 50);
            }
        }
    });
}
