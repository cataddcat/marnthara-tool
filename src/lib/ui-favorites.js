// src/lib/ui-favorites.js
// --- FAVORITES UI LOGIC (Modals & Manager) ---
import { ITEM_CONFIG } from "./config.js";
import { fmtTH, toNum, sanitizeHTML } from "./utils.js";
import { getFavorites } from "./favorites.js";

// Import Core UI functions & state accessors
// This creates a circular dependency (ui.js -> ui-favorites.js -> ui.js),
// which is acceptable and common in ES Modules for splitting large files.
import {
    showModal,
    showToast,
    getActiveFavoriteInput,
    setActiveFavoriteInput,
    getFavManagerChangesMade,
    setFavManagerChangesMade,
    setSelectedFavItem,
} from "./ui.js";

// --- FAVORITES MODAL & MANAGER HELPERS ---

/**
 *
 */
export async function showManageFavsTypeModal() {
    const modalEl = document.querySelector("#manageFavsTypeModal");
    const bodyEl = document.querySelector("#manageFavsTypeBody");
    if (!modalEl || !bodyEl) return;
    const favTypes = Object.keys(getFavorites());
    let optionsHtml = "";
    let firstType = null;
    const typeIcons = {
        fabric: "ph-rows",
        sheer: "ph-waves",
        wallpaper: "ph-paint-roller",
        wooden_blind: "ph-table",
        roller_blind: "ph-scroll",
        vertical_blind: "ph-sidebar-simple",
        partition: "ph-columns",
        pleated_screen: "ph-squares-four",
        aluminum_blind: "ph-stack-simple",
    };
    if (favTypes.includes("fabric")) {
        optionsHtml += `
             <label data-item-type="fabric">
                 <input type="radio" name="manage_fav_type_option" value="fabric">
                 <span class="radio-card-content">
                     <strong><i class="ph ${typeIcons["fabric"] || "ph-star"}"></i> ผ้าทึบ</strong>
                     <small>Fabric Codes</small>
                 </span>
             </label>`;
        if (!firstType) firstType = "fabric";
    }
    if (favTypes.includes("sheer")) {
        optionsHtml += `
              <label data-item-type="sheer">
                  <input type="radio" name="manage_fav_type_option" value="sheer">
                  <span class="radio-card-content">
                      <strong><i class="ph ${typeIcons["sheer"] || "ph-star"}"></i> ผ้าโปร่ง</strong>
                      <small>Sheer Codes</small>
                  </span>
              </label>`;
        if (!firstType) firstType = "sheer";
    }
    favTypes.forEach((type) => {
        if (type === "fabric" || type === "sheer") return;
        const config = ITEM_CONFIG[type];
        if (config) {
            const displayName = config.name;
            const iconClass = typeIcons[type] || "ph-star";
            optionsHtml += `
                <label data-item-type="${type}">
                    <input type="radio" name="manage_fav_type_option" value="${type}">
                    <span class="radio-card-content">
                        <strong><i class="ph ${iconClass}"></i> ${sanitizeHTML(displayName)}</strong>
                        <small>${type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())} Codes</small>
                    </span>
                </label>`;
            if (!firstType) firstType = type;
        }
    });
    bodyEl.innerHTML = optionsHtml;
    if (firstType) {
        const firstRadio = bodyEl.querySelector(`input[value="${firstType}"]`);
        if (firstRadio) firstRadio.checked = true;
    }
    const result = await showModal("#manageFavsTypeModal");
    if (result && !result.cancelled) {
        const selectedType = bodyEl.querySelector(
            'input[name="manage_fav_type_option"]:checked'
        )?.value;
        if (selectedType) {
            await showFavManager(selectedType);
        }
    }
}

/**
 *
 * @param favButton
 */
export function applyFavoriteFromModal(favButton) {
    const activeFavoriteInput = getActiveFavoriteInput(); // Use getter
    if (!activeFavoriteInput) return;

    // Determine the context (Item Card)
    const itemCard = activeFavoriteInput.closest(".item-card");

    let inputToAnimate = activeFavoriteInput; // The code input
    let priceInput = null; // The corresponding price input/select

    const type = inputToAnimate.dataset.favoriteType;
    const code = favButton.dataset.code;
    const price = toNum(favButton.dataset.price);

    // Find the price input based on context
    if (itemCard) {
        let priceInputName;
        if (type === "fabric") priceInputName = "set_price_per_m";
        else if (type === "sheer") priceInputName = "sheer_price_per_m";
        else if (type === "wallpaper") priceInputName = "wallpaper_price_roll";
        else priceInputName = "area_price_sqyd";
        priceInput = itemCard.querySelector(`[name="${priceInputName}"]`);
    }

    const priceToAnimate = priceInput;

    // Apply code
    inputToAnimate.value = code;
    inputToAnimate.classList.add("input-highlight");
    setTimeout(() => {
        if (inputToAnimate) inputToAnimate.classList.remove("input-highlight");
    }, 1200);

    // Apply price
    if (priceToAnimate && price >= 0) {
        // Allow 0
        if (priceToAnimate.tagName === "SELECT") {
            if (
                Array.from(priceToAnimate.options).some(
                    (opt) => toNum(opt.value) === price
                )
            ) {
                priceToAnimate.value = price;
            } else {
                showToast(`ราคา ${fmtTH(price)} ไม่มีในตัวเลือก`, "warning");
            }
        } else {
            // Input field
            // Format 0 correctly, otherwise use fmtTH
            priceToAnimate.value =
                price === 0 ? "0" : price > 0 ? fmtTH(price) : "";
        }
        priceToAnimate.classList.add("input-highlight");
        setTimeout(() => {
            if (priceToAnimate)
                priceToAnimate.classList.remove("input-highlight");
        }, 1200);
    }

    // Trigger events to update calculations/save data only if in an item card
    if (itemCard) {
        const inputToDispatchFrom = priceToAnimate || inputToAnimate;
        inputToDispatchFrom.dispatchEvent(
            new Event("input", { bubbles: true, cancelable: true })
        );
        // Trigger blur for numeric formatting if needed
        if (
            priceToAnimate &&
            priceToAnimate.matches('input[inputmode="numeric"]')
        ) {
            priceToAnimate.dispatchEvent(
                new Event("blur", { bubbles: true, cancelable: true })
            );
        }
    }

    // Close the favorites modal
    const favModal = document.querySelector("#favoritesModal");
    if (favModal && typeof favModal.closeModal === "function") {
        favModal.closeModal({ cancelled: false, applied: true });
    }
}

/**
 *
 * @param inputEl
 */
export async function showFavoritesModal(inputEl) {
    if (!inputEl || !inputEl.dataset.favoriteType) {
        console.warn(
            "showFavoritesModal called without a valid input element or favorite type."
        );
        return;
    }
    setActiveFavoriteInput(inputEl); // Store context using setter
    const type = inputEl.dataset.favoriteType;

    const modal = document.querySelector("#favoritesModal");
    const titleEl = modal.querySelector("#favoritesModalTitle");
    const bodyEl = modal.querySelector("#favoritesModalBody");
    const searchInput = modal.querySelector("#favSearchInput");
    const manageBtn = modal.querySelector('[data-act="manage-favorites"]'); // Use data-act selector
    const tpl = document.querySelector("#favSelectorItemTpl");

    if (!modal || !titleEl || !bodyEl || !searchInput || !manageBtn || !tpl) {
        console.error("Missing elements for favorites modal");
        return;
    }

    let favTypeDisplayName = ITEM_CONFIG[type]?.name || type;
    if (type === "fabric") favTypeDisplayName = "ผ้าทึบ";
    else if (type === "sheer") favTypeDisplayName = "ผ้าโปร่ง";
    titleEl.textContent = `เลือก '${sanitizeHTML(favTypeDisplayName)}'`;

    // Function to populate the list
    const populateList = () => {
        const favorites = getFavorites();
        const items = favorites[type] || [];
        if (items.length > 0) {
            bodyEl.innerHTML = items
                .map((fav) => {
                    let priceDisplay = "-";
                    // Handle 0 price correctly
                    if (fav.price >= 0) {
                        priceDisplay = fmtTH(fav.price);
                    }
                    return tpl.innerHTML
                        .replace(/{CODE}/g, sanitizeHTML(fav.code))
                        .replace(/{PRICE}/g, priceDisplay)
                        .replace(/{RAW_PRICE}/g, fav.price);
                })
                .join("");
        } else {
            bodyEl.innerHTML =
                '<p class="empty-state">ไม่มีรายการโปรดที่บันทึกไว้</p>';
        }
        searchInput.value = ""; // Reset search on populate
    };

    populateList(); // Initial population

    // --- Define listeners *before* attaching ---
    const handleSearch = () => {
        const query = searchInput.value.toLowerCase();
        bodyEl.querySelectorAll(".fav-selector-item").forEach((item) => {
            const code = item.dataset.code.toLowerCase();
            item.classList.toggle("is-hidden", !code.includes(query));
        });
    };

    const handleItemClick = (e) => {
        const favButton = e.target.closest(".fav-selector-item");
        if (favButton) {
            applyFavoriteFromModal(favButton); // This will close the modal
        }
    };

    const handleManageClick = async () => {
        await showFavManager(type);
        if (getFavManagerChangesMade()) {
            // Use getter
            populateList();
        }
    };

    // Centralized cleanup function (called by showModal on close)
    const cleanupLocalListeners = () => {
        searchInput.removeEventListener("input", handleSearch);
        bodyEl.removeEventListener("click", handleItemClick);
        if (manageBtn) manageBtn.onclick = null;
    };

    // Attach listeners
    searchInput.addEventListener("input", handleSearch);
    bodyEl.addEventListener("click", handleItemClick);
    manageBtn.onclick = handleManageClick;

    // Show the modal. Pass the *centralized cleanup* as the onCancel callback.
    await showModal("#favoritesModal", cleanupLocalListeners);
}

/**
 *
 * @param type
 */
export function populateFavManagerList(type) {
    const bodyEl = document.querySelector("#favManagerBody");
    const tpl = document.querySelector("#favManagerItemTpl");
    const favorites = getFavorites();
    const items = favorites[type] || [];
    if (!bodyEl || !tpl) return;
    if (items.length === 0) {
        bodyEl.innerHTML =
            '<p class="empty-state">ไม่มีรายการโปรดที่บันทึกไว้</p>';
    } else {
        bodyEl.innerHTML = items
            .map((fav) => {
                let priceDisplay = "-";
                if (fav.price >= 0) {
                    // Check includes 0
                    priceDisplay = fmtTH(fav.price);
                }
                return tpl.innerHTML
                    .replace(/{CODE}/g, sanitizeHTML(fav.code))
                    .replace(/{PRICE}/g, priceDisplay)
                    .replace(/{RAW_PRICE}/g, fav.price);
            })
            .join("");
    }
    setSelectedFavItem(null); // Use setter
    const editBtn = document.querySelector(
        '#favManagerModal [data-act="edit-selected-fav"]'
    );
    const delBtn = document.querySelector(
        '#favManagerModal [data-act="del-selected-fav"]'
    );
    if (editBtn) editBtn.disabled = true;
    if (delBtn) delBtn.disabled = true;
}

/**
 *
 * @param type
 */
export async function showFavManager(type) {
    const modalEl = document.querySelector("#favManagerModal");
    if (!modalEl || !type) return;
    let favTypeDisplayName = ITEM_CONFIG[type]?.name || type;
    if (type === "fabric") favTypeDisplayName = "ผ้าทึบ";
    else if (type === "sheer") favTypeDisplayName = "ผ้าโปร่ง";
    modalEl.dataset.currentType = type;
    setFavManagerChangesMade(false); // Reset flag each time manager is opened
    setSelectedFavItem(null); // Use setter
    document.querySelector("#favManagerTitle").textContent =
        `จัดการ '${sanitizeHTML(favTypeDisplayName)}'`;
    populateFavManagerList(type);

    await showModal("#favManagerModal");
}
