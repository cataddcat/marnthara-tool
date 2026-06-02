// src/lib/storage.js
// --- DATA STORAGE & PAYLOAD MANAGEMENT ---
import { APP_VERSION, STORAGE_KEY, SELECTORS } from "./config.js";
import { toNum } from "./utils.js";
import { getFavorites } from "./favorites.js"; // Assuming favorites management is separate

// Document-state fields that survive across buildPayload calls (set by
// document generators when they cache numbers, by the receipt flow when it
// records payment metadata, and by the signature modal). These live in
// memory + localStorage, but are not bound to DOM inputs.
let documentState = {
    quoteNumber: "",
    quoteDate: "",
    locked: false,
    receipt: null,
    signatures: null,
};

/**
 * Patches the in-memory document state. Caller should saveData() after.
 * @param {object} patch
 */
export function updateDocumentState(patch) {
    documentState = { ...documentState, ...patch };
}

/**
 * Returns a shallow copy of the current document state.
 * @returns {object}
 */
export function getDocumentState() {
    return { ...documentState };
}

/**
 * Replaces document state wholesale (used when loading a payload from disk).
 * @param {object} state
 */
export function setDocumentState(state) {
    documentState = {
        quoteNumber: state?.quoteNumber || "",
        quoteDate: state?.quoteDate || "",
        locked: !!state?.locked,
        receipt: state?.receipt || null,
        signatures: state?.signatures || null,
    };
}

/**
 *
 */
export function buildPayload() {
    const favorites = getFavorites(); // Get current favorites state

    const payload = {
        app_version: APP_VERSION,
        customer_name:
            document.querySelector(SELECTORS.customerNameInput)?.value || "",
        customer_phone:
            document.querySelector(SELECTORS.customerPhoneInput)?.value || "",
        customer_address:
            document.querySelector(SELECTORS.customerAddressInput)?.value || "",
        quoteDate:
            document.querySelector(SELECTORS.quoteDateInput)?.value ||
            documentState.quoteDate ||
            "",
        quoteNumber: documentState.quoteNumber || "",
        locked: documentState.locked,
        receipt: documentState.receipt,
        signatures: documentState.signatures,
        discount: {
            type:
                document.querySelector(SELECTORS.discountTypeInput)?.value ||
                "amount",
            value: toNum(
                document.querySelector(SELECTORS.discountValueInput)?.value
            ),
        },
        rooms: [],
        favorites: favorites, // Include favorites in the payload
    };

    document.querySelectorAll(SELECTORS.room).forEach((roomEl) => {
        const roomData = {
            id: roomEl.id,
            room_name:
                roomEl.querySelector(SELECTORS.roomNameInput)?.value || "",
            is_suspended: roomEl.classList.contains("is-suspended"),
            is_open: roomEl.open,
            items: [],
        };

        roomEl
            .querySelector(SELECTORS.allItemsContainer)
            ?.childNodes.forEach((itemEl) => {
                // Ensure it's an element node and has the .item-card class
                if (
                    itemEl.nodeType !== 1 ||
                    !itemEl.matches(SELECTORS.itemCard)
                )
                    return;

                // [MODIFIED] Check for placeholder item
                if (itemEl.classList.contains("placeholder-item")) {
                    // Save placeholder data
                    const placeholderData = {
                        type: "placeholder",
                        is_suspended: itemEl.classList.contains("is-suspended"),
                        width_m: toNum(itemEl.dataset.widthM),
                        height_m: toNum(itemEl.dataset.heightM),
                    };
                    roomData.items.push(placeholderData);
                    return; // Skip to next item
                }
                // --- [END MODIFIED] ---

                // Use component-exposed getItemData()
                if (typeof itemEl.getItemData === "function") {
                    roomData.items.push(itemEl.getItemData());
                }
            });
        payload.rooms.push(roomData);
    });
    return payload;
}

/**
 *
 */
export function saveData() {
    try {
        const currentPayload = buildPayload();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPayload));
        // console.log("Data saved:", currentPayload); // Optional: for debugging
    } catch (error) {
        console.error("Failed to save data to localStorage:", error);
        // Maybe show a user-facing error here if saving is critical
    }
}
