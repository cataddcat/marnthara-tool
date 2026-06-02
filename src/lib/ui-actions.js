// src/lib/ui-actions.js
// --- ENTITY (ROOM/ITEM) ACTION HANDLERS ---
import { SELECTORS, ITEM_CONFIG } from "./config.js";
import { toNum, fmtDimension } from "./utils.js";
import { buildPayload, saveData } from "./storage.js";
import { pushState } from "./undoManager.js";

// Import Component Factory Functions
import { createRoomCard } from "../components/RoomCard.js";
import { createSetItem } from "../components/SetItem.js";
import { createWallpaperItem } from "../components/WallpaperItem.js";
import { createAreaBasedItem } from "../components/AreaBasedItem.js";
import { createRemovalItem } from "../components/RemovalItem.js";
import { createCustomItem } from "../components/CustomItem.js"; // [NEW] Import CustomItem

// Import Core UI functions (เฉพาะฟังก์ชัน UI และ Orchestration)
import {
    showToast,
    scrollToViewIfNeeded,
    updateQuickNavMenu,
    updateToggleAllButtonState,
    updateRoomObserver,
    showConfirmation,
    recalcAll,
    renumberItemTitles,
    toggleDetails,
    smartScrollToHeader,
    updateUndoButtonState,
    _extractItemData,
} from "./ui.js";

// Import Modal functions (for item creation/changing)
import { showItemTypeModal } from "./ui-modals.js";

// --- ROOM & ITEM MANAGEMENT ---

/**
 *
 * @param data
 */
export function addRoom(data = {}) {
    const roomsContainer = document.querySelector(SELECTORS.roomsContainer);
    if (!roomsContainer) return null;
    if (Object.keys(data).length === 0) {
        pushState(buildPayload());
        updateUndoButtonState();
    }
    const newRoom = createRoomCard(data);
    if (!newRoom) return null;
    roomsContainer.appendChild(newRoom);
    if (Object.keys(data).length === 0) {
        newRoom.classList.add("item-created");
        scrollToViewIfNeeded(newRoom);
        newRoom.querySelector('input[name="room_name"]')?.focus();
    }
    updateQuickNavMenu();
    updateToggleAllButtonState();
    updateRoomObserver();
    if (Object.keys(data).length === 0) saveData();
    return newRoom;
}

/**
 *
 * @param dimensions
 * @param roomEl
 */
export function addPlaceholderItem(dimensions, roomEl) {
    if (
        !roomEl ||
        !dimensions ||
        dimensions.width_m <= 0 ||
        dimensions.height_m <= 0
    )
        return;
    const itemsContainer = roomEl.getItemsContainer();
    if (!itemsContainer) return;

    const template = document.querySelector("#placeholderItemTpl");
    if (!template) {
        console.error("Placeholder template not found");
        return null;
    }

    const clone = template.content.cloneNode(true);
    const placeholderEl = clone.firstElementChild;

    placeholderEl.dataset.widthM = dimensions.width_m;
    placeholderEl.dataset.heightM = dimensions.height_m;

    const widthDisplay = placeholderEl.querySelector(
        "[data-placeholder-width]"
    );
    const heightDisplay = placeholderEl.querySelector(
        "[data-placeholder-height]"
    );
    if (widthDisplay)
        widthDisplay.textContent = fmtDimension(dimensions.width_m);
    if (heightDisplay)
        heightDisplay.textContent = fmtDimension(dimensions.height_m);

    itemsContainer.appendChild(placeholderEl);
    placeholderEl.classList.add("item-created");
    return placeholderEl;
}

/**
 *
 * @param placeholderEl
 * @param selectedType
 * @param dimensions
 */
export function replacePlaceholderWithItem(
    placeholderEl,
    selectedType,
    dimensions
) {
    if (!placeholderEl || !selectedType || !dimensions) return;
    const roomEl = placeholderEl.closest(SELECTORS.room);
    if (!roomEl) return;

    pushState(buildPayload());
    updateUndoButtonState();

    const roomDefaults = JSON.parse(roomEl.dataset.roomDefaults || "{}");
    let itemData = {
        width_m: dimensions.width_m,
        height_m: dimensions.height_m,
    };
    const isDefaultEnabled = (sectionKey) =>
        roomDefaults[`enable_defaults_${sectionKey}`] === true;

    // Apply defaults based on selectedType
    switch (selectedType) {
        case "set":
            if (isDefaultEnabled("set")) {
                itemData.fabric_code = roomDefaults.defaults_fabric_code;
                itemData.price_per_m_raw = roomDefaults.defaults_fabric_price;
                itemData.sheer_fabric_code = roomDefaults.defaults_sheer_code;
                itemData.sheer_price_per_m = roomDefaults.defaults_sheer_price;
            }
            break;
        case "wallpaper":
            if (isDefaultEnabled("wallpaper")) {
                itemData.wallpaper_code = roomDefaults.defaults_wallpaper_code;
                itemData.price_per_roll =
                    roomDefaults.defaults_wallpaper_price_roll;
                itemData.install_cost_per_roll =
                    roomDefaults.defaults_wallpaper_install_cost;
            }
            break;
        case "removal":
        case "custom": // [NEW] ไม่มี Default สำหรับรายการอิสระ
            delete itemData.width_m;
            break;
        case "wooden_blind":
            if (isDefaultEnabled("wooden_blind")) {
                itemData.code = roomDefaults.defaults_wooden_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_wooden_blind_price_sqyd;
            }
            break;
        case "roller_blind":
            if (isDefaultEnabled("roller_blind")) {
                itemData.code = roomDefaults.defaults_roller_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_roller_blind_price_sqyd;
            }
            break;
        case "vertical_blind":
            if (isDefaultEnabled("vertical_blind")) {
                itemData.code = roomDefaults.defaults_vertical_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_vertical_blind_price_sqyd;
            }
            break;
        case "partition":
            if (isDefaultEnabled("partition")) {
                itemData.code = roomDefaults.defaults_partition_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_partition_price_sqyd;
            }
            break;
        case "pleated_screen":
            if (isDefaultEnabled("pleated_screen")) {
                itemData.code = roomDefaults.defaults_pleated_screen_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_pleated_screen_price_sqyd;
            }
            break;
        case "aluminum_blind":
            if (isDefaultEnabled("aluminum_blind")) {
                itemData.code = roomDefaults.defaults_aluminum_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_aluminum_blind_price_sqyd;
            }
            break;
    }

    // Create the new item element
    let newItemEl;
    if (selectedType === "set") newItemEl = createSetItem(itemData);
    else if (selectedType === "wallpaper")
        newItemEl = createWallpaperItem(itemData);
    else if (selectedType === "removal")
        newItemEl = createRemovalItem(itemData);
    else if (selectedType === "custom")
        // [NEW]
        newItemEl = createCustomItem(itemData);
    else if (ITEM_CONFIG[selectedType]?.templateId === "#areaBasedTpl")
        newItemEl = createAreaBasedItem(selectedType, itemData);
    else {
        showToast(`ไม่รู้จักประเภทรายการ: ${selectedType}`, "error");
        return;
    }

    if (!newItemEl) return;

    placeholderEl.replaceWith(newItemEl);
    newItemEl.classList.add("item-created");
    scrollToViewIfNeeded(newItemEl);
    newItemEl
        .querySelector('input:not([type="hidden"]), select, textarea')
        ?.focus();
    renumberItemTitles();
    recalcAll();
    showToast(
        `เพิ่ม ${ITEM_CONFIG[selectedType]?.name || "รายการ"} แล้ว`,
        "success"
    );
}

/**
 *
 * @param itemCardEl
 */
export async function handleChangeItemType(itemCardEl) {
    if (!itemCardEl || itemCardEl.classList.contains("placeholder-item"))
        return;
    const currentType = itemCardEl.dataset.type;
    const newType = await showItemTypeModal("เปลี่ยนประเภทรายการ", currentType);
    if (!newType || newType === currentType) return;
    if (
        !(await showConfirmation(
            "ยืนยันการเปลี่ยนแปลง",
            "ข้อมูลส่วนใหญ่ในรายการนี้จะถูกล้างและใช้ค่าเริ่มต้น (ถ้ามี) คุณแน่ใจหรือไม่?"
        ))
    )
        return;

    pushState(buildPayload());
    updateUndoButtonState();

    const dimensions = {
        width_m: toNum(
            itemCardEl.querySelector(
                'input[name$="_width_m"], input[name="width_m"]'
            )?.value
        ),
        height_m: toNum(
            itemCardEl.querySelector(
                'input[name$="_height_m"], input[name="height_m"]'
            )?.value
        ),
    };
    if (currentType === "wallpaper") {
        dimensions.height_m = toNum(
            itemCardEl.querySelector(SELECTORS.wallHeightInput)?.value
        );
    }

    const roomEl = itemCardEl.closest(SELECTORS.room);
    const roomDefaults = JSON.parse(roomEl?.dataset.roomDefaults || "{}");
    let itemData = {
        width_m: dimensions.width_m > 0 ? dimensions.width_m : undefined,
        height_m: dimensions.height_m > 0 ? dimensions.height_m : undefined,
    };

    const isDefaultEnabled = (sectionKey) =>
        roomDefaults[`enable_defaults_${sectionKey}`] === true;

    switch (newType) {
        case "set":
            if (isDefaultEnabled("set")) {
                itemData.fabric_code = roomDefaults.defaults_fabric_code;
                itemData.price_per_m_raw = roomDefaults.defaults_fabric_price;
                itemData.sheer_fabric_code = roomDefaults.defaults_sheer_code;
                itemData.sheer_price_per_m = roomDefaults.defaults_sheer_price;
            }
            break;
        case "wallpaper":
            if (isDefaultEnabled("wallpaper")) {
                itemData.wallpaper_code = roomDefaults.defaults_wallpaper_code;
                itemData.price_per_roll =
                    roomDefaults.defaults_wallpaper_price_roll;
                itemData.install_cost_per_roll =
                    roomDefaults.defaults_wallpaper_install_cost;
            }
            break;
        case "removal":
        case "custom": // [NEW]
            delete itemData.width_m;
            itemData.height_m =
                dimensions.height_m > 0 ? dimensions.height_m : undefined;
            break;
        case "wooden_blind":
            if (isDefaultEnabled("wooden_blind")) {
                itemData.code = roomDefaults.defaults_wooden_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_wooden_blind_price_sqyd;
            }
            break;
        case "roller_blind":
            if (isDefaultEnabled("roller_blind")) {
                itemData.code = roomDefaults.defaults_roller_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_roller_blind_price_sqyd;
            }
            break;
        case "vertical_blind":
            if (isDefaultEnabled("vertical_blind")) {
                itemData.code = roomDefaults.defaults_vertical_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_vertical_blind_price_sqyd;
            }
            break;
        case "partition":
            if (isDefaultEnabled("partition")) {
                itemData.code = roomDefaults.defaults_partition_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_partition_price_sqyd;
            }
            break;
        case "pleated_screen":
            if (isDefaultEnabled("pleated_screen")) {
                itemData.code = roomDefaults.defaults_pleated_screen_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_pleated_screen_price_sqyd;
            }
            break;
        case "aluminum_blind":
            if (isDefaultEnabled("aluminum_blind")) {
                itemData.code = roomDefaults.defaults_aluminum_blind_code;
                itemData.price_sqyd =
                    roomDefaults.defaults_aluminum_blind_price_sqyd;
            }
            break;
    }
    let newItemEl;
    if (newType === "set") newItemEl = createSetItem(itemData);
    else if (newType === "wallpaper") newItemEl = createWallpaperItem(itemData);
    else if (newType === "removal") newItemEl = createRemovalItem(itemData);
    else if (newType === "custom")
        newItemEl = createCustomItem(itemData); // [NEW]
    else if (ITEM_CONFIG[newType]?.templateId === "#areaBasedTpl")
        newItemEl = createAreaBasedItem(newType, itemData);
    else {
        return;
    }
    if (!newItemEl) return;
    itemCardEl.replaceWith(newItemEl);
    newItemEl.classList.add("item-created");
    scrollToViewIfNeeded(newItemEl);
    newItemEl
        .querySelector('input:not([type="hidden"]), select, textarea')
        ?.focus();
    renumberItemTitles();
    recalcAll();
    showToast("เปลี่ยนประเภทรายการแล้ว", "success");
}

/**
 *
 * @param itemCardEl
 */
export function duplicateItem(itemCardEl) {
    if (!itemCardEl) return;
    const roomEl = itemCardEl.closest(SELECTORS.room);
    if (!roomEl) return;
    const itemsContainer = roomEl.getItemsContainer();
    if (!itemsContainer) return;

    pushState(buildPayload());
    updateUndoButtonState();

    let newItemEl;
    if (itemCardEl.classList.contains("placeholder-item")) {
        const template = document.querySelector("#placeholderItemTpl");
        if (template) {
            const clone = template.content.cloneNode(true);
            newItemEl = clone.firstElementChild;
            newItemEl.dataset.widthM = itemCardEl.dataset.widthM;
            newItemEl.dataset.heightM = itemCardEl.dataset.heightM;
            const widthDisplay = newItemEl.querySelector(
                "[data-placeholder-width]"
            );
            const heightDisplay = newItemEl.querySelector(
                "[data-placeholder-height]"
            );
            if (widthDisplay)
                widthDisplay.textContent = fmtDimension(
                    itemCardEl.dataset.widthM
                );
            if (heightDisplay)
                heightDisplay.textContent = fmtDimension(
                    itemCardEl.dataset.heightM
                );
            if (itemCardEl.classList.contains("is-suspended")) {
                newItemEl.classList.add("is-suspended");
            }
        } else {
            showToast("ไม่พบ Template สำหรับ Placeholder", "error");
            return;
        }
    } else {
        const itemData = _extractItemData(itemCardEl);
        if (!itemData) {
            showToast("ไม่สามารถคัดลอกรายการได้", "error");
            return;
        }
        if (itemData.type === "set") newItemEl = createSetItem(itemData);
        else if (itemData.type === "wallpaper")
            newItemEl = createWallpaperItem(itemData);
        else if (itemData.type === "removal")
            newItemEl = createRemovalItem(itemData);
        else if (itemData.type === "custom")
            // [NEW]
            newItemEl = createCustomItem(itemData);
        else if (ITEM_CONFIG[itemData.type]?.templateId === "#areaBasedTpl")
            newItemEl = createAreaBasedItem(itemData.type, itemData);
        else {
            showToast("ไม่รู้จักประเภทรายการ", "error");
            return;
        }
    }

    if (newItemEl) {
        itemCardEl.after(newItemEl);
        newItemEl.classList.add("item-created");
        if (!newItemEl.classList.contains("placeholder-item")) {
            const originalDetails = itemCardEl.querySelector(
                SELECTORS.itemDetailsMore
            );
            if (originalDetails && originalDetails.classList.contains("show")) {
                toggleDetails(newItemEl, true);
            }
        }
        scrollToViewIfNeeded(newItemEl);
        renumberItemTitles();
        recalcAll();
        showToast("คัดลอกรายการแล้ว", "success");
    }
}

/**
 *
 * @param clickedEl
 */
export function jumpToItem(clickedEl) {
    const { roomId, itemIndex } = clickedEl.dataset;
    if (!roomId || itemIndex === undefined) return;
    const lookbookModal = document.getElementById("lookbookModal");

    if (lookbookModal && typeof lookbookModal.closeModal === "function") {
        lookbookModal.closeModal({ cancelled: true });
    }
    const targetRoom = document.getElementById(roomId);
    if (!targetRoom) {
        showToast("ไม่พบห้องที่ต้องการ", "error");
        return;
    }
    const itemsInRoom = Array.from(
        targetRoom.querySelectorAll(".item-card:not(.item-hidden)")
    );
    const targetItem = itemsInRoom[parseInt(itemIndex, 10)];
    if (!targetItem) {
        showToast("ไม่พบรายการที่ต้องการ", "error");
        return;
    }
    targetRoom.open = true;
    updateToggleAllButtonState();
    setTimeout(() => {
        smartScrollToHeader(targetItem);
        targetItem.classList.add("scrolling-jump");
        setTimeout(() => targetItem.classList.remove("scrolling-jump"), 2500);
    }, 150);
}
