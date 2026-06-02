// src/components/RoomCard.js
import { SELECTORS } from "../lib/config.js"; // Assuming SELECTORS are in config

/**
 *
 * @param data
 */
export function createRoomCard(data = {}) {
    const template = document.querySelector(SELECTORS.roomTpl); // Use SELECTORS
    if (!template) {
        console.error("Room template not found");
        return null;
    }

    const clone = template.content.cloneNode(true);
    const roomEl = clone.firstElementChild; // Should be the <details class="card room-card">
    roomEl.id = data.id || `room-${Date.now()}`;
    roomEl.open = data.is_open !== false; // Open by default or based on loaded data

    // --- Element Querying (using specific selectors relative to roomEl) ---
    const nameInput = roomEl.querySelector(SELECTORS.roomNameInput);
    const nameDisplay = roomEl.querySelector("[data-room-name-display]");
    const briefDisplay = roomEl.querySelector("[data-room-brief]");
    const itemsContainer = roomEl.querySelector(SELECTORS.allItemsContainer);

    // --- Functions ---
    const updateNameDisplay = () => {
        const newName = nameInput.value || "ห้อง (ไม่มีชื่อ)";
        if (nameDisplay) nameDisplay.textContent = newName;
        // The 'room-update' event will be handled globally in ui.js based on input/change
    };

    // --- Event Listeners (Internal to the component's setup) ---
    if (nameInput) {
        nameInput.addEventListener("input", updateNameDisplay);
    }

    // Optional: If summary click needs immediate UI update beyond default toggle
    const summaryEl = roomEl.querySelector("summary");
    if (summaryEl) {
        summaryEl.addEventListener("click", () => {
            // Allow default <details> toggle behavior, then maybe trigger a global state update if needed
            // setTimeout(() => { /* dispatch global update if necessary */ }, 0);
        });
    }

    // --- Initialization ---
    const initialRoomName =
        data.room_name ||
        `ห้อง ${document.querySelectorAll(SELECTORS.room).length + 1}`;
    if (nameInput) {
        nameInput.value = initialRoomName;
        // Set unique ID for label association if template uses placeholder ID
        const uniqueId = `room_name_${roomEl.id}`;
        nameInput.id = uniqueId;
        const label = nameInput.closest(".form-group")?.querySelector("label");
        if (label) label.setAttribute("for", uniqueId);
    }
    if (nameDisplay) nameDisplay.textContent = initialRoomName;

    if (data.is_suspended) {
        roomEl.classList.add("is-suspended");
    }

    // Public methods for interaction from ui.js
    roomEl.getItemsContainer = () => itemsContainer;
    roomEl.updateBrief = (text, count) => {
        if (!briefDisplay) return;
        briefDisplay.textContent = "";
        if (count !== undefined) {
            const span = document.createElement("span");
            span.textContent = count;
            briefDisplay.appendChild(span);
            briefDisplay.appendChild(
                document.createTextNode(` \u2022 ${text}`)
            );
        } else {
            briefDisplay.textContent = text;
        }
    };

    return roomEl; // Return the created DOM element
}
