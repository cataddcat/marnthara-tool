// src/lib/favorites.js
// --- FAVORITE CODES MANAGEMENT (V4.1 - Simplified) ---

const FAVORITES_KEY = "marnthara.favorites.v4";

const defaultFavorites = {
    fabric: [],
    sheer: [],
    wallpaper: [],
    wooden_blind: [],
    roller_blind: [],
    vertical_blind: [],
    partition: [],
    pleated_screen: [],
    aluminum_blind: [],
};

/**
 * Retrieves the favorites object from localStorage.
 * @returns {object} The favorites object.
 */
export function getFavorites() {
    try {
        const stored = localStorage.getItem(FAVORITES_KEY);
        return stored
            ? { ...defaultFavorites, ...JSON.parse(stored) }
            : defaultFavorites;
    } catch (e) {
        console.error("Failed to parse favorites from localStorage", e);
        return defaultFavorites;
    }
}

/**
 * Saves the entire favorites object to localStorage.
 * @param {object} favorites - The complete favorites object to save.
 */
function saveFavorites(favorites) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (e) {
        console.error("Failed to save favorites to localStorage", e);
    }
}

/**
 * Safely imports and overwrites favorites from a file.
 * @param {object} newFavorites - The favorites object from an imported payload.
 * @returns {boolean} True on success, false on failure.
 */
export function importFavorites(newFavorites) {
    if (!newFavorites || typeof newFavorites !== "object") {
        console.error("Invalid favorites data for import.");
        return false;
    }
    const validatedFavorites = { ...defaultFavorites, ...newFavorites };
    saveFavorites(validatedFavorites);
    return true;
}

/**
 * Merges new favorites into the existing list, skipping duplicates.
 * @param {object} newFavorites - The favorites object to merge from.
 * @returns {number} The number of new items actually added.
 */
export function mergeFavorites(newFavorites) {
    if (!newFavorites || typeof newFavorites !== "object") {
        console.error("Invalid favorites data for merge.");
        return 0;
    }

    const currentFavorites = getFavorites();
    let addedCount = 0;

    for (const type in newFavorites) {
        // [FIX] Use Object.prototype.hasOwnProperty.call
        if (
            Object.prototype.hasOwnProperty.call(newFavorites, type) &&
            Array.isArray(newFavorites[type])
        ) {
            if (!currentFavorites[type]) {
                currentFavorites[type] = [];
            }

            newFavorites[type].forEach((newItem) => {
                // Ensure newItem has code and price (even if price is 0)
                if (
                    newItem &&
                    newItem.code &&
                    Object.prototype.hasOwnProperty.call(newItem, "price")
                ) {
                    const codeExists = currentFavorites[type].some(
                        (existingItem) => existingItem.code === newItem.code
                    );
                    if (!codeExists) {
                        currentFavorites[type].push({
                            code: newItem.code,
                            price: newItem.price,
                        }); // Ensure structure
                        addedCount++;
                    }
                } else {
                    console.warn(
                        `Skipping invalid favorite item during merge for type ${type}:`,
                        newItem
                    );
                }
            });

            // Sort after merging
            currentFavorites[type].sort((a, b) => a.code.localeCompare(b.code));
        }
    }

    if (addedCount > 0) {
        saveFavorites(currentFavorites);
    }

    return addedCount;
}

/**
 * Adds a new favorite code or updates the price if the code already exists.
 * Now exported for use by manager.
 * @param {string} type - The category (e.g., 'fabric', 'roller_blind').
 * @param {string} code - The code to add/update.
 * @param {number} price - The price to set (can be 0).
 * @returns {boolean} True on success, false on failure.
 */
export function addOrUpdateFavorite(type, code, price) {
    const favorites = getFavorites();
    const cleanCode = code?.trim(); // Ensure code is trimmed

    if (!cleanCode) {
        console.error(
            `Attempted to add favorite with empty code for type: ${type}`
        );
        return false;
    }
    // Validate price is a number >= 0
    if (typeof price !== "number" || isNaN(price) || price < 0) {
        console.error(
            `Attempted to add favorite with invalid price (${price}) for code ${cleanCode}`
        );
        return false;
    }

    // [STABILITY] Prevent adding a favorite type that doesn't exist in the default schema
    if (!Object.prototype.hasOwnProperty.call(defaultFavorites, type)) {
        console.error(`Attempted to add favorite to an invalid type: ${type}`);
        return false;
    }
    if (!favorites[type]) {
        favorites[type] = [];
    }

    const targetArray = favorites[type];
    const item = targetArray.find((fav) => fav.code === cleanCode);

    if (item) {
        item.price = price;
    } else {
        targetArray.push({ code: cleanCode, price });
    }

    targetArray.sort((a, b) => a.code.localeCompare(b.code));
    saveFavorites(favorites);
    return true;
}

/**
 * Deletes a favorite by its type and code.
 * @param {string} type - The category.
 * @param {string} code - The code to delete.
 */
export function deleteFavorite(type, code) {
    const favorites = getFavorites();
    const cleanCode = code?.trim(); // Ensure code is trimmed
    if (!favorites[type] || !cleanCode) return false;

    const index = favorites[type].findIndex((fav) => fav.code === cleanCode);
    if (index > -1) {
        favorites[type].splice(index, 1);
        saveFavorites(favorites);
        return true;
    }
    return false;
}

/**
 * Retrieves a single favorite object by its code.
 * Still needed for applying favorites from the modal.
 * @param {string} type - The category of the code.
 * @param {string} code - The code to find.
 * @returns {object|undefined} The favorite object {code, price} or undefined if not found.
 */
export function getFavorite(type, code) {
    const cleanCode = code?.trim();
    if (!type || !cleanCode) return undefined;
    const favorites = getFavorites();
    const targetArray = favorites[type] || [];
    return targetArray.find((fav) => fav.code === cleanCode);
}

// [REMOVED] isCodeFavorite function
// [REMOVED] toggleFavorite function

/**
 * Removes all favorites data from localStorage.
 */
export function clearAllFavorites() {
    localStorage.removeItem(FAVORITES_KEY);
    console.log("All favorites have been cleared.");
}
