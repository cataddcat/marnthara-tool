// src/lib/shopConfig.js
// --- SHOP CONFIGURATION STATE ---
import { SHOP_CONFIG_KEY, DEFAULT_SHOP_CONFIG } from "./config.js";

let activeShopConfig = { ...DEFAULT_SHOP_CONFIG };

/**
 * Returns the current shop configuration.
 * @returns {object} The active shop config.
 */
export function getShopConfig() {
    return activeShopConfig;
}

/**
 * Saves a new shop configuration to memory and localStorage.
 * @param {object} newConfig - The new configuration to save.
 * @returns {boolean} Whether the save succeeded.
 */
export function saveShopConfig(newConfig) {
    try {
        const configToSave = { ...DEFAULT_SHOP_CONFIG, ...newConfig };

        if (newConfig.pdf && newConfig.pdf.notes) {
            configToSave.pdf.notes = newConfig.pdf.notes;
        } else {
            configToSave.pdf.notes = DEFAULT_SHOP_CONFIG.pdf.notes;
        }

        activeShopConfig = configToSave;
        localStorage.setItem(SHOP_CONFIG_KEY, JSON.stringify(configToSave));
        console.log("Shop config saved.");
        return true;
    } catch (error) {
        console.error("Failed to save shop config:", error);
        return false;
    }
}

/**
 * Loads shop configuration from localStorage into memory.
 */
export function loadShopConfig() {
    try {
        const storedConfig = localStorage.getItem(SHOP_CONFIG_KEY);
        if (storedConfig) {
            const parsedConfig = JSON.parse(storedConfig);
            activeShopConfig = { ...DEFAULT_SHOP_CONFIG, ...parsedConfig };

            if (parsedConfig.pdf) {
                activeShopConfig.pdf = {
                    ...DEFAULT_SHOP_CONFIG.pdf,
                    ...parsedConfig.pdf,
                };
            }

            console.log("Shop config loaded from localStorage.");
        } else {
            activeShopConfig = { ...DEFAULT_SHOP_CONFIG };
            console.log("No local shop config found, using defaults.");
        }
    } catch (error) {
        console.error("Failed to load/parse shop config:", error);
        activeShopConfig = { ...DEFAULT_SHOP_CONFIG };
    }
}
