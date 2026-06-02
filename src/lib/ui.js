// src/lib/ui.js
// --- UI ORCHESTRATOR & EVENT HANDLING (REMASTERED V8.3 - Dimension First Flow) ---
import { SELECTORS, PDF_EXPORT_DELAY_MS, ITEM_CONFIG } from "./config.js";
import { getShopConfig, saveShopConfig, loadShopConfig } from "./shopConfig.js";
import {
    showToast as _showToast,
    showModal as _showModal,
    showConfirmation as _showConfirmation,
} from "./modal.js";
import { fmtTH, toNum, debounce, fmtDimension, sanitizeHTML } from "./utils.js";
import {
    saveData,
    buildPayload,
    setDocumentState,
} from "./storage.js";

/**
 * Returns today's date as YYYY-MM-DD in local time.
 * @returns {string}
 */
function _todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}
import { importFavorites, mergeFavorites } from "./favorites.js";
import { pushState, popState, canUndo } from "./undoManager.js";
// Import Component Factory Functions
import { createRoomCard } from "../components/RoomCard.js";
import { createSetItem } from "../components/SetItem.js";
import { createWallpaperItem } from "../components/WallpaperItem.js";
import { createAreaBasedItem } from "../components/AreaBasedItem.js";
import { createRemovalItem } from "../components/RemovalItem.js";
import { createCustomItem } from "../components/CustomItem.js"; // [NEW] นำเข้า CustomItem

import { addRoom } from "./ui-actions.js";
import { setupFormDelegation } from "./ui-form-handlers.js";
import { setupGlobalClickHandler } from "./ui-click-actions.js";
import { setupToolbarListeners } from "./ui-toolbar.js";

import { showBatchTypeSelectModal } from "./ui-modals.js";
import * as store from "./store.js";
import { migratePayload } from "./migrate.js";


/**
 *
 */
export function checkAndPromptShopConfig() {
    const config = getShopConfig();
    if (!config.name) {
        console.warn("Shop name is missing. Prompting user to configure shop.");
        const modalEl = document.querySelector(SELECTORS.shopSettingsModal);
        if (modalEl) {
            populateShopSettingsModal();
            showModal(SELECTORS.shopSettingsModal, { persistent: true });
        }
    }
}

/**
 *
 */
export function populateShopSettingsModal() {
    const form = document.querySelector(SELECTORS.shopSettingsForm);
    if (!form) return;

    const config = getShopConfig();
    form.elements["shop_name"].value = config.name || "";
    form.elements["shop_address"].value = config.address || "";
    form.elements["shop_phone"].value = config.phone || "";
    form.elements["shop_taxid_email"].value = config.taxId || "";
    form.elements["shop_pdf_notes"].value = (config.pdf.notes || []).join("\n");
}

/**
 *
 */
export function handleShopConfigSave() {
    const form = document.querySelector(SELECTORS.shopSettingsForm);
    if (!form) return;

    const newName = form.elements["shop_name"].value.trim();
    if (!newName) {
        showToast("โปรดใส่ชื่อร้านค้า", "error");
        form.elements["shop_name"].focus();
        return;
    }

    const pdfNotes = form.elements["shop_pdf_notes"].value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const currentConfig = getShopConfig();
    const newConfig = {
        ...currentConfig,
        name: newName,
        address: form.elements["shop_address"].value.trim(),
        phone: form.elements["shop_phone"].value.trim(),
        taxId: form.elements["shop_taxid_email"].value.trim(),
        pdf: {
            ...currentConfig.pdf,
            notes: pdfNotes,
        },
    };

    const saved = saveShopConfig(newConfig);
    if (!saved) {
        showToast("ไม่สามารถบันทึกข้อมูลร้านค้าได้", "error");
        return;
    }
    showToast("บันทึกข้อมูลร้านค้าแล้ว", "success");

    const modalEl = document.querySelector(SELECTORS.shopSettingsModal);
    if (modalEl && typeof modalEl.closeModal === "function") {
        modalEl.closeModal();
    }
}

// --- MODAL RE-EXPORTS (with app-specific cleanup) ---

// --- LOCAL UI STATE VARIABLES ---
let isLocked = false;
/** @returns {boolean} Current lock state. */
export function getIsLocked() {
    return isLocked;
}
let roomObserver = null;
let activeFilter = null;
/** @returns {string|null} Current active filter type. */
export function getActiveFilter() {
    return activeFilter;
}
const undoBtn = document.querySelector("#undoBtn");
const THEME_KEY = "marnthara.theme";

// --- State for Modals/Actions ---
let _activeHardwareItem = null;
export const getActiveHardwareItem = () => _activeHardwareItem;
export const setActiveHardwareItem = (item) => {
    _activeHardwareItem = item;
};

let _favManagerChangesMade = false;
export const getFavManagerChangesMade = () => _favManagerChangesMade;
export const setFavManagerChangesMade = (value) => {
    _favManagerChangesMade = value;
};

let _selectedFavItem = null;
export const getSelectedFavItem = () => _selectedFavItem;
export const setSelectedFavItem = (item) => {
    _selectedFavItem = item;
};

let _activeFavoriteInput = null;
export const getActiveFavoriteInput = () => _activeFavoriteInput;
export const setActiveFavoriteInput = (input) => {
    _activeFavoriteInput = input;
};

// --- DYNAMIC SCRIPT LOADER ---
const loadedScripts = {};
/**
 *
 * @param src
 */
function loadScript(src) {
    if (loadedScripts[src]) return loadedScripts[src];
    const promise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => {
            console.error(`Script load error for ${src}`);
            delete loadedScripts[src];
            reject(new Error(`Script load error for ${src}`));
        };
        document.head.appendChild(script);
    });
    loadedScripts[src] = promise;
    return promise;
}

// --- THEME & UNDO ---
/**
 *
 */
export function applyInitialTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const themeToggleLink = document.querySelector("#themeToggleBtn");
    if (!themeToggleLink) return;
    const icon = themeToggleLink.querySelector("i");
    const text = themeToggleLink.querySelector("span");
    document.body.classList.remove("dark-theme", "neutral-theme");
    switch (savedTheme) {
        case "dark":
            document.body.classList.add("dark-theme");
            if (icon) icon.className = "ph-fill ph-sun";
            if (text) text.textContent = " Theme สว่าง";
            break;
        case "neutral":
            document.body.classList.add("neutral-theme");
            if (icon) icon.className = "ph-fill ph-moon";
            if (text) text.textContent = "Theme มืด";
            break;
        default:
            if (icon) icon.className = "ph-fill ph-palette";
            if (text) text.textContent = "Theme กลาง";
            break;
    }
}
/**
 *
 */
export function toggleTheme() {
    const currentTheme = localStorage.getItem(THEME_KEY);
    let nextTheme = "neutral";
    if (!currentTheme || currentTheme === "light") nextTheme = "neutral";
    else if (currentTheme === "neutral") nextTheme = "dark";
    else nextTheme = "light";
    localStorage.setItem(THEME_KEY, nextTheme);
    applyInitialTheme();
}
/**
 *
 */
export function updateUndoButtonState() {
    if (undoBtn) undoBtn.disabled = !canUndo();
}
/**
 *
 */
function handleUndo() {
    const lastState = popState();
    if (lastState) {
        loadPayload(lastState, false);
        showToast("ยกเลิกการกระทำล่าสุดแล้ว", "success");
    }
    updateUndoButtonState();
}

/**
 *
 */
export function updateSuspendedItemsWarning() {
    const warningBtn = document.getElementById("suspendedItemsBtn");
    if (!warningBtn) return;
    if (activeFilter) {
        warningBtn.classList.remove("is-visible");
        return;
    }
    const badgeEl = document.getElementById("suspendedCountBadge");
    const suspendedItemsCount = document.querySelectorAll(
        ".item-card.is-suspended:not(.placeholder-item)"
    ).length;
    const suspendedRooms = document.querySelectorAll(".room-card.is-suspended");
    let itemsInSuspendedRoomsCount = 0;
    suspendedRooms.forEach((room) => {
        itemsInSuspendedRoomsCount += room.querySelectorAll(
            ".item-card:not(.is-suspended):not(.placeholder-item)"
        ).length;
    });
    const totalSuspended = suspendedItemsCount + itemsInSuspendedRoomsCount;
    if (badgeEl) badgeEl.textContent = totalSuspended;
    warningBtn.classList.toggle("is-visible", totalSuspended > 0);
}

// --- FILTER LOGIC ---
/**
 *
 */
export function applySuspendedFilter() {
    activeFilter = "suspended";
    const filterBar = document.getElementById("filterStatusBar");
    let totalVisible = 0;
    document.querySelectorAll(".room-card").forEach((roomEl) => {
        let hasVisibleItemInRoom = false;
        const isRoomSuspended = roomEl.classList.contains("is-suspended");
        roomEl.querySelectorAll(".item-card").forEach((itemEl) => {
            const isItemSuspended = itemEl.classList.contains("is-suspended");
            const isVisible = isItemSuspended || isRoomSuspended;
            itemEl.classList.toggle("item-hidden", !isVisible);
            if (isVisible) {
                hasVisibleItemInRoom = true;
                if (!itemEl.classList.contains("placeholder-item")) {
                    totalVisible++;
                }
            }
        });
        const isRoomVisible = isRoomSuspended || hasVisibleItemInRoom;
        roomEl.classList.toggle("item-hidden", !isRoomVisible);
    });

    const nonPlaceholderVisibleCount =
        document.querySelectorAll(
            ".item-card.is-suspended:not(.placeholder-item)"
        ).length +
        Array.from(
            document.querySelectorAll(
                ".room-card.is-suspended .item-card:not(.is-suspended):not(.placeholder-item)"
            )
        ).length;

    if (nonPlaceholderVisibleCount === 0) {
        clearFilter();
        showToast("ไม่มีรายการที่ถูกระงับแล้ว", "success");
        return;
    }
    if (filterBar) {
        filterBar.innerHTML = `
            <span><i class="ph ph-warning"></i> รายการที่ถูกระงับ (${totalVisible} รายการ)</span>
            <button type="button" class="btn-chip" data-act="clear-filter" title="ยกเลิกการกรอง">
                <i class="ph ph-x"></i>&nbsp;ปิด
            </button>
        `;
        filterBar.classList.add("is-visible");
        filterBar.dataset.filterType = "suspended";
    }
    renumberItemTitles();
    updateToggleAllButtonState();
    updateSuspendedItemsWarning();
}
/**
 *
 * @param filterType
 * @param filterDisplayName
 */
export function applyFilter(filterType, filterDisplayName) {
    if (!filterType) return;
    activeFilter = filterType;
    const filterBar = document.getElementById("filterStatusBar");
    let totalMatches = 0;
    document.querySelectorAll(SELECTORS.room).forEach((roomEl) => {
        let visibleItemsInRoom = 0;
        roomEl.querySelectorAll(".item-card").forEach((itemEl) => {
            const isMatch =
                itemEl.dataset.type === filterType &&
                !itemEl.classList.contains("placeholder-item");
            itemEl.classList.toggle("item-hidden", !isMatch);
            if (isMatch) visibleItemsInRoom++;
        });
        roomEl
            .querySelectorAll(".placeholder-item")
            .forEach((pEl) =>
                pEl.classList.toggle("item-hidden", visibleItemsInRoom === 0)
            );
        roomEl.classList.toggle("item-hidden", visibleItemsInRoom === 0);
        if (visibleItemsInRoom > 0) totalMatches += visibleItemsInRoom;
    });
    if (filterBar) {
        filterBar.innerHTML = `
            <span>เฉพาะ: <strong>${sanitizeHTML(filterDisplayName)}</strong> (${totalMatches} รายการ)</span>
            <button type="button" class="btn-chip" data-act="clear-filter" title="ยกเลิกการกรอง">
                <i class="ph ph-x"></i>&nbsp;ปิด
            </button>
        `;
        filterBar.classList.add("is-visible");
        filterBar.dataset.filterType = filterType;
    }
    renumberItemTitles();
    updateToggleAllButtonState();
    updateSuspendedItemsWarning();
}
/**
 *
 */
export function clearFilter() {
    activeFilter = null;
    const filterBar = document.getElementById("filterStatusBar");
    if (filterBar) {
        filterBar.classList.remove("is-visible");
        filterBar.innerHTML = "";
        filterBar.removeAttribute("data-filter-type");
    }
    document
        .querySelectorAll(".item-hidden")
        .forEach((el) => el.classList.remove("item-hidden"));
    renumberItemTitles();
    updateToggleAllButtonState();
    updateSuspendedItemsWarning();
}

// --- NOTIFICATIONS & MODALS (delegated to modal.js) ---
export const showToast = _showToast;
export const showConfirmation = _showConfirmation;

/**
 * Wrapper around modal.js showModal that adds app-specific cleanup
 * for roomControlCenter and favorites modals.
 * @param selector
 * @param options
 */
export function showModal(selector, options = {}) {
    const opts =
        typeof options === "function" ? { onCancel: options } : { ...options };

    // Inject app-specific cleanup via onClose
    const originalOnClose = opts.onClose;
    opts.onClose = (result) => {
        if (selector === "#favoritesModal") setActiveFavoriteInput(null);

        if (typeof originalOnClose === "function") {
            originalOnClose(result);
        }
    };

    return _showModal(selector, opts);
}

// --- DOM & UI HELPERS ---
/**
 *
 * @param element
 * @param toastMessage
 */
export function animateAndRemove(element, toastMessage) {
    if (!element) return;
    pushState(buildPayload());
    updateUndoButtonState();
    element.classList.add("item-removing");
    element.addEventListener(
        "animationend",
        () => {
            element.remove();
            if (toastMessage) showToast(toastMessage);
            updateQuickNavMenu();
            renumberItemTitles();
            recalcAll();
            updateRoomObserver();
        },
        { once: true }
    );
}
/**
 *
 * @param element
 */
export function smartScrollToHeader(element) {
    if (!element) return;
    const mainHeader = document.querySelector(".main-header");
    if (!mainHeader) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
    }
    const headerHeight = mainHeader.offsetHeight;
    const scrollBuffer = 16;
    const targetElement = element.querySelector(".item-header") || element;
    const elementRect = targetElement.getBoundingClientRect();
    const desiredPosition = headerHeight + scrollBuffer;
    const scrollAmount = elementRect.top - desiredPosition;
    if (Math.abs(scrollAmount) > 5) {
        window.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }
}
/**
 *
 * @param element
 */
export function scrollToViewIfNeeded(element) {
    if (!element) return;
    const mainHeader = document.querySelector(".main-header");
    const footer = document.querySelector(".summary-footer");
    const headerHeight = mainHeader ? mainHeader.offsetHeight + 16 : 80;
    const footerHeight = footer ? footer.offsetHeight + 16 : 100;
    requestAnimationFrame(() => {
        const elementRect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const isFullyVisible =
            elementRect.top >= headerHeight &&
            elementRect.bottom <= viewportHeight - footerHeight;
        if (!isFullyVisible) {
            const availableHeight =
                viewportHeight - headerHeight - footerHeight;
            const scrollBlock =
                elementRect.height > availableHeight ? "start" : "center";
            element.scrollIntoView({
                behavior: "smooth",
                block: scrollBlock,
            });
        }
    });
}
/**
 *
 */
export function renumberItemTitles() {
    document.querySelectorAll(SELECTORS.room).forEach((room) => {
        const allItems = room.querySelectorAll(".item-card:not(.item-hidden)");
        let activeIndex = 0;
        const totalActiveVisible = Array.from(allItems).filter(
            (el) =>
                !el.classList.contains("is-suspended") &&
                !el.classList.contains("placeholder-item")
        ).length;

        allItems.forEach((item) => {
            const titleEl = item.querySelector("[data-item-title]");
            if (!titleEl) return;

            if (item.classList.contains("placeholder-item")) {
                titleEl.textContent = "...";
            } else if (item.classList.contains("is-suspended")) {
                titleEl.textContent = "-";
            } else {
                activeIndex++;
                titleEl.textContent = `${activeIndex}/${totalActiveVisible}`;
            }
        });
        room.querySelectorAll(".item-card.item-hidden").forEach((item) => {
            const titleEl = item.querySelector("[data-item-title]");
            if (titleEl) titleEl.textContent = "-";
        });
    });
}
/**
 *
 */
export function updateLockState() {
    const form = document.querySelector(SELECTORS.orderForm);
    const lockBtn = document.querySelector(SELECTORS.lockBtn);
    if (!form || !lockBtn) return;
    form.classList.toggle("is-locked", isLocked);
    lockBtn.classList.toggle("is-locked", isLocked);
    lockBtn.querySelector("i").className = isLocked
        ? "ph-bold ph-lock-key"
        : "ph ph-paw-print";
    form.querySelectorAll(
        'input:not([type="hidden"]), select, textarea, button:not(.unlockable):not([data-act="toggle-more-details"]):not([data-act="collapse-room"])'
    ).forEach((el) => {
        if (
            !el.closest(".main-header") &&
            !el.closest(".summary-footer") &&
            !el.closest(".modal-wrapper")
        ) {
            el.disabled = isLocked;
        }
    });
    document
        .querySelectorAll(".unlockable")
        .forEach((el) => (el.disabled = false));
}
/**
 *
 */
export function toggleLock() {
    isLocked = !isLocked;
    updateLockState();
    showToast(
        isLocked ? "ฟอร์มถูกล็อค" : "ปลดล็อคฟอร์มแล้ว",
        isLocked ? "warning" : "success"
    );
}
/**
 *
 */
export function updateToggleAllButtonState() {
    const allVisibleRoomDetails = document.querySelectorAll(
        SELECTORS.room + ":not(.item-hidden)"
    );
    if (allVisibleRoomDetails.length === 0) {
        const toggleBtn = document.querySelector(SELECTORS.toggleAllRoomsBtn);
        if (toggleBtn) {
            toggleBtn.querySelector("i").className = "ph ph-caret-down";
            toggleBtn.querySelector("span").textContent = "ขยายทั้งหมด";
        }
        return;
    }
    const isAnythingOpen = [...allVisibleRoomDetails].some((d) => d.open);
    const toggleBtn = document.querySelector(SELECTORS.toggleAllRoomsBtn);
    if (toggleBtn) {
        toggleBtn.querySelector("i").className = isAnythingOpen
            ? "ph ph-caret-up"
            : "ph ph-caret-down";
        toggleBtn.querySelector("span").textContent = isAnythingOpen
            ? "ย่อทั้งหมด"
            : "ขยายทั้งหมด";
    }
}
/**
 *
 */
export function handleToggleAllRooms() {
    const allVisibleRoomDetails = document.querySelectorAll(
        SELECTORS.room + ":not(.item-hidden)"
    );
    if (allVisibleRoomDetails.length === 0) return;
    const isAnythingOpen = [...allVisibleRoomDetails].some((d) => d.open);
    allVisibleRoomDetails.forEach((d) => {
        d.open = !isAnythingOpen;
    });
    const quickNavDropdown = document.querySelector(SELECTORS.quickNavDropdown);
    if (quickNavDropdown && quickNavDropdown.classList.contains("show")) {
        quickNavDropdown.classList.remove("show");
        document
            .querySelector(SELECTORS.quickNavBtn)
            ?.setAttribute("aria-expanded", "false");
    }
    setTimeout(() => {
        updateToggleAllButtonState();
        saveData();
    }, 50);
}
/**
 *
 */
export function updateQuickNavMenu() {
    const list = document.querySelector(SELECTORS.quickNavRoomList);
    if (!list) return;
    list.innerHTML = "";
    document.querySelectorAll(SELECTORS.room).forEach((room) => {
        const roomName =
            room.querySelector(SELECTORS.roomNameInput)?.value || `ห้อง`;
        const link = document.createElement("a");
        link.href = `#${room.id}`;
        link.dataset.jumpTo = room.id;
        link.innerHTML = `<i class="ph ph-share-fat"></i> ${sanitizeHTML(roomName) || "ห้อง (ไม่มีชื่อ)"}`;
        list.appendChild(link);
    });
}
/**
 *
 * @param roomElement
 */
function setActiveRoomIndicator(roomElement) {
    const quickNavBtnText = document.getElementById("quickNavBtnText");
    if (!quickNavBtnText) return;
    if (roomElement) {
        quickNavBtnText.textContent =
            roomElement.querySelector('input[name="room_name"]')?.value ||
            "...";
    } else {
        quickNavBtnText.textContent = "ไปยังห้อง";
    }
}
/**
 *
 */
export function updateRoomObserver() {
    if (roomObserver) roomObserver.disconnect();
    const quickNavBtnText = document.getElementById("quickNavBtnText");
    if (!quickNavBtnText) return;
    const options = {
        root: null,
        rootMargin: "-60px 0px -150px 0px",
        threshold: 0,
    };
    const callback = (entries) => {
        const visibleRooms = entries
            .filter((e) => e.isIntersecting)
            .sort(
                (a, b) =>
                    a.target.getBoundingClientRect().top -
                    b.target.getBoundingClientRect().top
            );
        if (visibleRooms.length > 0) {
            setActiveRoomIndicator(visibleRooms[0].target);
        }
    };
    roomObserver = new IntersectionObserver(callback, options);
    document
        .querySelectorAll(SELECTORS.room)
        .forEach((room) => roomObserver.observe(room));
    const rooms = Array.from(document.querySelectorAll(SELECTORS.room));
    if (rooms.length > 0) {
        rooms.sort(
            (a, b) =>
                a.getBoundingClientRect().top - b.getBoundingClientRect().top
        );
        const firstVisible = rooms.find(
            (room) => room.getBoundingClientRect().bottom > 60
        );
        setActiveRoomIndicator(firstVisible || rooms[0]);
    } else {
        setActiveRoomIndicator(null);
    }
}

/**
 *
 * @param itemCardEl
 * @param forceState
 */
export function toggleDetails(itemCardEl, forceState = null) {
    if (!itemCardEl || itemCardEl.classList.contains("placeholder-item"))
        return;
    const detailsEl = itemCardEl.querySelector(".item-details-more");
    const btn = itemCardEl.querySelector('[data-act="toggle-more-details"]');
    const buttonWrapper = btn?.parentElement;
    if (!detailsEl || !btn || !buttonWrapper) return;
    const currentState = detailsEl.classList.contains("show");
    const isExpanded = forceState !== null ? forceState : !currentState;
    if (currentState === isExpanded) return;
    detailsEl.classList.toggle("show", isExpanded);
    btn.classList.toggle("expanded", isExpanded);
    const icon = btn.querySelector("i");

    const span = btn.querySelector("span");
    if (icon)
        icon.className = isExpanded ? "ph ph-caret-up" : "ph ph-caret-down";
    if (span) {
        if (isExpanded) {
            span.textContent = "ย่อน้อยลง";
        } else {
            const priceSummary = btn.dataset.priceSummary;
            if (priceSummary) {
                span.innerHTML = `เพิ่มเติม <small>(${priceSummary})</small>`;
            } else {
                span.textContent = "เพิ่มเติม";
            }
        }
    }

    if (isExpanded) {
        detailsEl.appendChild(buttonWrapper);
        setTimeout(() => smartScrollToHeader(itemCardEl), 100);
    } else {
        const mainGrid = itemCardEl.querySelector(".item-grid");
        if (mainGrid) mainGrid.appendChild(buttonWrapper);
    }
}

/**
 *
 * @param itemEl
 */
export function _extractItemData(itemEl) {
    if (
        !itemEl ||
        !itemEl.matches(SELECTORS.itemCard) ||
        itemEl.classList.contains("placeholder-item")
    )
        return null;
    if (!itemEl.dataset.type) return null;

    if (typeof itemEl.getItemData === "function") {
        return itemEl.getItemData();
    }

    return null;
}

// --- RECALCULATION & DATA HANDLING ---

/**
 * Recalculates a single room's total, writes to the store, and refreshes
 * the room's brief display.  Call this when an item inside the room changes.
 * @param {HTMLElement} roomEl - The .room-card element.
 */
export function recalcRoom(roomEl) {
    if (!roomEl) return;
    let roomTotal = 0;
    let roomItemsCount = 0;
    const isRoomSuspended = roomEl.classList.contains("is-suspended");

    if (!isRoomSuspended) {
        roomEl
            .querySelectorAll(
                ".item-card:not(.is-suspended):not(.placeholder-item)"
            )
            .forEach((itemEl) => {
                const price = toNum(itemEl.dataset.totalPrice);
                if (price > 0) {
                    roomTotal += price;
                    roomItemsCount++;
                }
            });
    }

    store.setRoomTotal(
        roomEl.id,
        Math.round(roomTotal * 100) / 100,
        roomItemsCount,
        isRoomSuspended
    );

    if (typeof roomEl.updateBrief === "function") {
        const placeholderCount = roomEl.querySelectorAll(
            ".placeholder-item:not(.is-suspended)"
        ).length;
        if (isRoomSuspended) {
            roomEl.updateBrief("(ระงับชั่วคราว)");
        } else if (roomItemsCount > 0) {
            let briefText = `${fmtTH(roomTotal)} บาท`;
            if (placeholderCount > 0)
                briefText += ` (+${placeholderCount} รอเลือก)`;
            roomEl.updateBrief(briefText, roomItemsCount);
        } else if (placeholderCount > 0) {
            roomEl.updateBrief("รอเลือกประเภท", placeholderCount);
        } else {
            roomEl.updateBrief("รายการ", 0);
        }
    }
}

/**
 * Reads room totals from the store, applies discount + VAT, updates the
 * footer display, and persists to localStorage.
 * Call this after recalcRoom() to push the updated sum to the UI.
 */
export function recalcGrandTotal() {
    const subTotal = store.computeSubTotal();

    const discountTypeInput = document.querySelector("#discount_type");
    const discountValueInput = document.querySelector("#discount_value");
    const discountType = discountTypeInput ? discountTypeInput.value : "amount";
    const discountValue = discountValueInput
        ? toNum(discountValueInput.value)
        : 0;

    let discountAmount = 0;
    if (discountValue > 0) {
        discountAmount =
            discountType === "percent"
                ? Math.round(subTotal * (discountValue / 100))
                : discountValue;
        discountAmount = Math.min(subTotal, discountAmount);
    }
    let grandTotal = Math.round((subTotal - discountAmount) * 100) / 100;

    const vatEnabledInput = document.querySelector("#vat_enabled");
    if (vatEnabledInput && vatEnabledInput.value === "1") {
        grandTotal =
            Math.round(
                grandTotal * (1 + getShopConfig().baseVatRate) * 100
            ) / 100;
    }

    const grandTotalEl = document.querySelector("#grandTotal");
    const originalTotalEl = document.querySelector("#originalTotal");
    if (grandTotalEl) grandTotalEl.textContent = fmtTH(grandTotal);
    if (originalTotalEl) {
        originalTotalEl.dataset.rawTotal = subTotal;
        if (discountAmount > 0) {
            originalTotalEl.textContent = fmtTH(subTotal);
            originalTotalEl.style.display = "block";
        } else {
            originalTotalEl.style.display = "none";
        }
    }

    updateSuspendedItemsWarning();
    saveData();
}

/**
 * Full resync: rebuilds the store from the DOM for every room, then
 * recomputes the grand total.  Debounced to coalesce rapid calls.
 */
export const recalcAll = debounce(() => {
    store.clearAllRooms();
    document.querySelectorAll(SELECTORS.room).forEach(recalcRoom);
    recalcGrandTotal();
}, 200);

// --- LOAD PAYLOAD ---
/**
 *
 * @param raw
 * @param isManualImport
 */
export async function loadPayload(raw, isManualImport = false) {
    const payload = migratePayload(raw);
    if (!payload) {
        showToast("ข้อมูลสำหรับโหลดไม่ถูกต้อง", "error");
        return;
    }

    if (!isManualImport) {
        loadShopConfig();
    }

    if (payload.favorites) {
        if (isManualImport) {
            const conflictModal = document.querySelector(
                "#favoritesConflictModal"
            );
            if (conflictModal) {
                const mergeRadio = conflictModal.querySelector(
                    'input[name="fav_conflict_option"][value="merge"]'
                );
                if (mergeRadio) mergeRadio.checked = true;
                const result = await showModal("#favoritesConflictModal");
                if (!result || result.cancelled) {
                    showToast("ยกเลิกการนำเข้า", "warning");
                    return;
                }
                const choice = conflictModal.querySelector(
                    'input[name="fav_conflict_option"]:checked'
                ).value;
                let favCount = 0;
                switch (choice) {
                    case "overwrite":
                        if (importFavorites(payload.favorites))
                            showToast("เขียนทับรายการโปรดสำเร็จ", "success");
                        break;
                    case "merge":
                        favCount = mergeFavorites(payload.favorites);
                        showToast(
                            `รวมข้อมูลสำเร็จ (เพิ่ม ${favCount} รายการใหม่)`,
                            "success"
                        );
                        break;
                    case "skip":
                        showToast("ข้ามการนำเข้ารายการโปรด", "default");
                        break;
                }
            } else {
                mergeFavorites(payload.favorites);
            }
        } else {
            importFavorites(payload.favorites);
        }
    }
    const roomsContainer = document.querySelector(SELECTORS.roomsContainer);
    if (!roomsContainer) return;
    roomsContainer.innerHTML = "";
    const customerNameInput = document.querySelector("#customer_name");
    const customerPhoneInput = document.querySelector("#customer_phone");
    const customerAddressInput = document.querySelector("#customer_address");
    if (customerNameInput)
        customerNameInput.value = payload.customer_name || "";
    if (customerPhoneInput)
        customerPhoneInput.value = payload.customer_phone || "";
    if (customerAddressInput)
        customerAddressInput.value = payload.customer_address || "";
    const quoteDateInput = document.querySelector("#quote_date");
    if (quoteDateInput)
        quoteDateInput.value = payload.quoteDate || _todayIso();
    setDocumentState({
        quoteNumber: payload.quoteNumber,
        quoteDate: quoteDateInput?.value || payload.quoteDate || _todayIso(),
        locked: payload.locked,
        receipt: payload.receipt,
        signatures: payload.signatures,
    });
    if (payload.locked) {
        isLocked = true;
    }
    const discountTypeInput = document.querySelector("#discount_type");
    const discountValueInput = document.querySelector("#discount_value");
    if (payload.discount && discountTypeInput && discountValueInput) {
        discountTypeInput.value = payload.discount.type || "amount";
        discountValueInput.value = payload.discount.value || 0;
    } else if (discountTypeInput && discountValueInput) {
        discountTypeInput.value = "amount";
        discountValueInput.value = 0;
    }
    if (!Array.isArray(payload.rooms)) {
        showToast("ไม่พบข้อมูลห้องในไฟล์", "warning");
        if (roomsContainer.children.length === 0) addRoom();
        return;
    }
    for (const roomData of payload.rooms) {
        const newRoomEl = createRoomCard(roomData);
        if (!newRoomEl) continue;
        roomsContainer.appendChild(newRoomEl);
        const itemsContainer = newRoomEl.getItemsContainer();
        if (itemsContainer && Array.isArray(roomData.items)) {
            for (const itemData of roomData.items) {
                let newItemEl;
                if (itemData.type === "placeholder") {
                    const template = document.querySelector(
                        "#placeholderItemTpl"
                    );
                    if (template) {
                        const clone = template.content.cloneNode(true);
                        newItemEl = clone.firstElementChild;
                        newItemEl.dataset.widthM = itemData.width_m || 0;
                        newItemEl.dataset.heightM = itemData.height_m || 0;
                        const widthDisplay = newItemEl.querySelector(
                            "[data-placeholder-width]"
                        );
                        const heightDisplay = newItemEl.querySelector(
                            "[data-placeholder-height]"
                        );
                        if (widthDisplay)
                            widthDisplay.textContent = fmtDimension(
                                itemData.width_m
                            );
                        if (heightDisplay)
                            heightDisplay.textContent = fmtDimension(
                                itemData.height_m
                            );
                        if (itemData.is_suspended)
                            newItemEl.classList.add("is-suspended");
                    } else {
                        console.warn(
                            "Placeholder template not found during load."
                        );
                        continue;
                    }
                } else if (itemData.type === "set")
                    newItemEl = createSetItem(itemData);
                else if (itemData.type === "wallpaper")
                    newItemEl = createWallpaperItem(itemData);
                else if (itemData.type === "removal")
                    newItemEl = createRemovalItem(itemData);
                else if (itemData.type === "custom")
                    newItemEl = createCustomItem(itemData); // [NEW]
                else if (
                    ITEM_CONFIG[itemData.type]?.templateId === "#areaBasedTpl"
                )
                    newItemEl = createAreaBasedItem(itemData.type, itemData);
                else {
                    continue;
                }
                if (newItemEl) itemsContainer.appendChild(newItemEl);
            }
        }
    }
    renumberItemTitles();
    updateQuickNavMenu();
    updateToggleAllButtonState();
    updateRoomObserver();
    updateUndoButtonState();
    recalcAll();
    if (isManualImport) {
        showToast("นำเข้าข้อมูลฟอร์มสำเร็จ", "success");
    }
}

// --- PDF / HTML EXPORT ---
/**
 *
 * @param htmlContent
 * @param method
 */
async function renderPdf(htmlContent, method) {
    const printableContent = document.querySelector(SELECTORS.printableContent);
    if (!printableContent || !htmlContent) {
        showToast("ไม่พบข้อมูลสำหรับสร้างเอกสาร", "error");
        return;
    }
    const fileName = document.title;
    if (method === "direct") {
        showToast("กำลังสร้าง PDF...", "default");
        let stagingEl;
        try {
            if (typeof window.html2pdf === "undefined") {
                showToast("กำลังโหลดไลบรารี PDF...", "default");
                await loadScript(
                    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
                );
            }
            stagingEl = document.createElement("div");
            stagingEl.style.position = "fixed";
            stagingEl.style.left = "-300mm";
            stagingEl.style.top = "0";
            stagingEl.style.width = "210mm";
            stagingEl.style.background = "#fff";
            stagingEl.innerHTML = htmlContent;
            document.body.appendChild(stagingEl);
            await new Promise((resolve) => setTimeout(resolve, 300));
            const opt = {
                margin: 0,
                filename: `${fileName}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    width:
                        stagingEl.querySelector(".pdf-page")?.scrollWidth ||
                        794,
                    windowWidth:
                        stagingEl.querySelector(".pdf-page")?.scrollWidth ||
                        794,
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            };
            await window.html2pdf().from(stagingEl).set(opt).save();
            showToast("ดาวน์โหลด PDF สำเร็จ", "success");
        } catch (error) {
            console.error("PDF Generation Error:", error);
            showToast("สร้าง PDF ล้มเหลว, โปรดลองวิธีที่ 2 (พิมพ์)", "error");
        } finally {
            if (stagingEl && document.body.contains(stagingEl)) {
                document.body.removeChild(stagingEl);
            }
        }
    } else if (method === "print") {
        printableContent.innerHTML = htmlContent;
        setTimeout(() => {
            window.print();
            setTimeout(() => {
                printableContent.innerHTML = "";
            }, 1000);
        }, PDF_EXPORT_DELAY_MS);
    }
}
/**
 *
 * @param quotation
 */
export function exportAsHtmlFile(quotation) {
    if (!quotation || !quotation.html) {
        showToast("ไม่พบข้อมูลสำหรับสร้างไฟล์ HTML", "error");
        return;
    }
    try {
        const fullHtml = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${quotation.fileName}</title><link rel="stylesheet" href="./src/styles/main.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/bold/style.css"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1/src/fill/style.css"><style>body { background-color: #eee; } #printable-content { display: block !important; max-width: 210mm; margin: 10mm auto; } .pdf-page { border: 1px solid #ccc; box-shadow: 0 0 10px rgba(0,0,0,0.1); margin-bottom: 10mm; background: #fff; page-break-inside: avoid; } .pdf-page-content { padding: 12mm; } @media print { body { background-color: #fff; } #printable-content { max-width: 100%; margin: 0; } .pdf-page { border: none; box-shadow: none; margin-bottom: 0; page-break-after: always; } .pdf-page:last-child { page-break-after: avoid; } } i.ph { vertical-align: middle; }</style></head><body><div id="printable-content">${quotation.html}</div></body></html>`;
        const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${quotation.fileName}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("ดาวน์โหลดไฟล์ HTML สำเร็จ", "success");
    } catch (_error) {
        console.error("HTML Export Error:", _error);
        showToast("สร้างไฟล์ HTML ล้มเหลว", "error");
    }
}

// --- GLOBAL EVENT LISTENER INITIALIZER ---
/**
 *
 */
export function initializeGlobalEventListeners() {
    const orderForm = document.querySelector(SELECTORS.orderForm);
    const fileImporter = document.querySelector(SELECTORS.fileImporter);
    const favImporter = document.querySelector("#favImporter");
    const menuDropdown = document.querySelector(SELECTORS.menuDropdown);
    const quickNavDropdown = document.querySelector(SELECTORS.quickNavDropdown);
    const menuBtn = document.querySelector(SELECTORS.menuBtn);
    const quickNavBtn = document.querySelector(SELECTORS.quickNavBtn);
    if (!orderForm) return;

    setupFormDelegation(orderForm, {
        getIsLocked,
        recalcAll,
        recalcRoom,
        recalcGrandTotal,
        scrollToViewIfNeeded,
        updateQuickNavMenu,
        updateRoomObserver,
    });
    setupGlobalClickHandler(
        {
            getIsLocked,
            recalcAll,
            scrollToViewIfNeeded,
            renumberItemTitles,
            animateAndRemove,
            toggleDetails,
            updateToggleAllButtonState,
            updateUndoButtonState,
            applySuspendedFilter,
            applyFilter,
            clearFilter,
            updateSuspendedItemsWarning,
            getActiveFilter,
            setActiveHardwareItem,
            getActiveHardwareItem,
            setSelectedFavItem,
            getSelectedFavItem,
            setFavManagerChangesMade,
            populateShopSettingsModal,
            handleShopConfigSave,
            showModal,
            showConfirmation,
            showToast,
            showBatchTypeSelectModal,
        },
        { menuDropdown, menuBtn, quickNavDropdown, quickNavBtn }
    );
    setupToolbarListeners(
        {
            getIsLocked,
            recalcAll,
            handleUndo,
            toggleLock,
            handleToggleAllRooms,
            updateToggleAllButtonState,
            updateUndoButtonState,
            renumberItemTitles,
            toggleTheme,
            smartScrollToHeader,
            toggleDetails,
            populateShopSettingsModal,
            renderPdf,
            exportAsHtmlFile,
            loadPayload,
            updateLockState,
        },
        {
            menuDropdown,
            menuBtn,
            quickNavDropdown,
            quickNavBtn,
            fileImporter,
            favImporter,
        }
    );
}
