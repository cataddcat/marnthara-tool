// src/lib/store.js
// --- LIGHTWEIGHT STATE STORE (Phase 4A) ---
// Tracks per-room totals so recalcGrandTotal() can sum from memory
// instead of re-traversing the DOM on every change.

/**
 * @typedef {{ total: number, itemCount: number, suspended: boolean }} RoomEntry
 */

/** @type {Map<string, RoomEntry>} */
const _roomData = new Map();

/** @type {Set<() => void>} */
const _listeners = new Set();

/** Notify all subscribers of a state change. */
function _notify() {
    _listeners.forEach((fn) => fn());
}

/**
 * Subscribe to any store change.
 * @param {() => void} fn - Callback invoked on each change.
 * @returns {() => void} Unsubscribe function.
 */
export function subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
}

/**
 * Record a room's computed totals.
 * @param {string} roomId - The DOM element id of the room card.
 * @param {number} total - Sum of active (non-suspended) item prices.
 * @param {number} itemCount - Number of active items counted.
 * @param {boolean} suspended - Whether the whole room is suspended.
 */
export function setRoomTotal(roomId, total, itemCount, suspended) {
    _roomData.set(roomId, { total, itemCount, suspended });
    _notify();
}

/**
 * Remove a room entry. Call when a room element is deleted from the DOM.
 * @param {string} roomId - The DOM element id of the room card to remove.
 */
export function removeRoom(roomId) {
    if (_roomData.delete(roomId)) {
        _notify();
    }
}

/**
 * Return the current room data map (read-only by convention).
 * @returns {Map<string, RoomEntry>} The room data map.
 */
export function getRoomData() {
    return _roomData;
}

/**
 * Wipe all room entries. Call at the start of a full resync (recalcAll).
 */
export function clearAllRooms() {
    _roomData.clear();
}

/**
 * Sum totals of all non-suspended rooms.
 * @returns {number} The computed sub-total (before discount/VAT).
 */
export function computeSubTotal() {
    let subTotal = 0;
    _roomData.forEach(({ total, suspended }) => {
        if (!suspended) subTotal += total;
    });
    return Math.round(subTotal * 100) / 100;
}
