// src/lib/migrate.js
// --- PAYLOAD MIGRATION & NORMALIZATION (Phase 4D) ---
// Normalizes payloads loaded from localStorage or imported files so that
// every field expected by loadPayload() is guaranteed to exist with a
// valid type.  Add entries to MIGRATIONS when breaking schema changes are
// introduced in future versions.

import { APP_VERSION } from "./config.js";

// Version-specific upgrade functions.
// Key = source app_version string; function receives the raw data object
// and should return a new object upgraded to the next schema.
// Example:
//   "vite-refactor/6.1.0": (data) => ({ ...data, newField: data.oldField ?? "" }),
const MIGRATIONS = {};

/**
 * Normalizes and optionally migrates a raw payload object.
 * Safe to call with any untrusted value from localStorage or a file import.
 * @param {object} raw - The value read from storage or parsed from JSON.
 * @returns {object|null} A clean, fully-populated payload object,
 *   or null if the input is not a plain object.
 */
export function migratePayload(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

    // Apply any registered version-specific migrations.
    let data = { ...raw };
    const srcVersion = String(data.app_version || "");
    if (Object.prototype.hasOwnProperty.call(MIGRATIONS, srcVersion)) {
        data = MIGRATIONS[srcVersion](data);
    }

    return {
        app_version: APP_VERSION,
        customer_name:
            typeof data.customer_name === "string" ? data.customer_name : "",
        customer_phone:
            typeof data.customer_phone === "string" ? data.customer_phone : "",
        customer_address:
            typeof data.customer_address === "string"
                ? data.customer_address
                : "",
        customer_card_open: data.customer_card_open !== false,
        quoteNumber:
            typeof data.quoteNumber === "string" ? data.quoteNumber : "",
        quoteDate: typeof data.quoteDate === "string" ? data.quoteDate : "",
        locked: data.locked === true,
        receipt: _normalizeReceipt(data.receipt),
        signatures: _normalizeSignatures(data.signatures),
        discount: _normalizeDiscount(data.discount),
        rooms: Array.isArray(data.rooms)
            ? data.rooms.map(_normalizeRoom).filter(Boolean)
            : [],
        favorites: data.favorites ?? null,
    };
}

/**
 * @param {object} r - Raw receipt object.
 * @returns {object|null} Normalized receipt, or null if absent.
 */
function _normalizeReceipt(r) {
    if (!r || typeof r !== "object") return null;
    return {
        receiptNumber:
            typeof r.receiptNumber === "string" ? r.receiptNumber : "",
        paidAt: typeof r.paidAt === "string" ? r.paidAt : "",
        method: typeof r.method === "string" ? r.method : "cash",
        methodNote: typeof r.methodNote === "string" ? r.methodNote : "",
        paidAmount: typeof r.paidAmount === "number" ? r.paidAmount : 0,
        issuerName: typeof r.issuerName === "string" ? r.issuerName : "",
        refQuoteNumber:
            typeof r.refQuoteNumber === "string" ? r.refQuoteNumber : "",
        notes: typeof r.notes === "string" ? r.notes : "",
    };
}

/**
 * @param {object} s - Raw signatures object.
 * @returns {object|null} Normalized signatures, or null if absent.
 */
function _normalizeSignatures(s) {
    if (!s || typeof s !== "object") return null;
    const out = {};
    for (const role of ["issuer", "customer"]) {
        const sig = s[role];
        if (!sig || typeof sig !== "object") continue;
        out[role] = {
            dataUrl: typeof sig.dataUrl === "string" ? sig.dataUrl : "",
            name: typeof sig.name === "string" ? sig.name : "",
            signedAt: typeof sig.signedAt === "string" ? sig.signedAt : "",
        };
    }
    return Object.keys(out).length > 0 ? out : null;
}

/**
 * @param {object} discount - Raw discount object from the payload.
 * @returns {{ type: string, value: number }} Normalized discount.
 */
function _normalizeDiscount(discount) {
    if (!discount || typeof discount !== "object") {
        return { type: "amount", value: 0 };
    }
    return {
        type: discount.type === "percent" ? "percent" : "amount",
        value: typeof discount.value === "number" ? discount.value : 0,
    };
}

/**
 * @param {object} room - Raw room object from the payload.
 * @returns {object|null} Normalized room, or null if the input is invalid.
 */
function _normalizeRoom(room) {
    if (!room || typeof room !== "object" || Array.isArray(room)) return null;
    return {
        id:
            typeof room.id === "string" && room.id
                ? room.id
                : `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        room_name: typeof room.room_name === "string" ? room.room_name : "",
        is_suspended: room.is_suspended === true,
        is_open: room.is_open !== false,
        room_defaults:
            room.room_defaults && typeof room.room_defaults === "object"
                ? room.room_defaults
                : {},
        items: Array.isArray(room.items) ? room.items.filter(Boolean) : [],
    };
}
