// src/lib/calculations.js
// --- CALCULATION LOGIC (REFACTORED & CENTRALIZED) ---
import { PRICING, SQM_TO_SQYD, WALLPAPER_SPECS } from "./config.js";
import { toNum } from "./utils.js";

/**
 * A collection of centralized calculation functions.
 * This is the single source of truth for all pricing and measurement logic.
 */
export const CALC = {
    /**
     * Calculates the style surcharge from config.
     * @param {string} style - The style of the curtain.
     * @param s
     * @returns {number} The surcharge amount per meter.
     */
    getStyleSurcharge: (s) => PRICING.style_surcharge[s] || 0,

    /**
     * Calculates the fabric yardage required based on style and width.
     * [REVISED]: Separate formula for Wave/S-Fold (x2.3)
     * @param {string} style - The style of the curtain.
     * @param {number|string} width_m - The width in meters.
     * @returns {number} The required fabric in yards (หลา).
     */
    fabricYardage: (style, width_m) => {
        const w = toNum(width_m);
        if (w <= 0) return 0;

        let fabricInMeters = 0;

        switch (style) {
            case "ลอน": // Wave / S-Fold [UPDATED FIX]
                // สูตรใหม่ตามคำขอ: (Width + 0.3) * 2.3
                // ตัวอย่าง 2.40ม. -> (2.4+0.3)*2.3 / 0.9 = 6.9 หลา
                fabricInMeters = (w + 0.3) * 2.3;
                break;

            case "ตาไก่": // Eyelet
            case "จีบ": // Pleated
            case "หลุยส์": // Louis
            case "ม่านแป๊บ": // Rod Pocket
                // สูตรมาตรฐานเดิม: (Width + 0.3) * 2.0
                fabricInMeters = (w + 0.3) * 2;
                break;

            case "ม่านพับ": // Roman
                fabricInMeters = w * 1.3;
                break;

            default:
                return 0; // Unknown style
        }

        // Convert meters to yards
        const baseFabricInYards = fabricInMeters / 0.9;

        // [New Rule] Add 1 extra yard for every 50 yards for tie-backs
        // Calculates how many full 50-yard increments there are
        const tieBackYards = Math.floor(baseFabricInYards / 50);

        // Add the extra allowance to the base calculation
        const finalFabricInYards = baseFabricInYards + tieBackYards;

        return finalFabricInYards;
    },

    /**
     * Calculates the number of grommets needed for a curtain set.
     * @param {object} set - The curtain set item data.
     * @returns {number} The total number of grommets.
     */
    calculateGrommets: (set) => {
        const w = toNum(set.width_m);
        if (w <= 0 || set.style !== "ตาไก่") return 0;

        // Estimate based on fabric width / spacing (w * 2.5) / 12cm
        const estimatedFabricWidth = w * 2.5;
        const approxSpacingCm = 12;
        let count = Math.ceil((estimatedFabricWidth * 100) / approxSpacingCm);

        // Ensure total count is even
        if (count % 2 !== 0) {
            count++;
        }
        return count;
    },

    /**
     * Calculates the total price for a curtain set (ผ้าม่าน).
     * [MODIFIED: Removed rounding to 10, now rounds to 2 decimal places]
     * @param {object} set - A set object from getValues().
     * @returns {object} An object containing total, opaque, sheer, and louis prices.
     */
    calculateSetPrice: function (set) {
        // !! === FORMULA PROTECTION === !!
        // สูตรนี้ถูกแก้ไข (Oct 2025) ตามกฎ:
        // 1. ลบ MIN_FABRIC_PRICE (1200)
        // 2. ลบ Height Surcharge (> 2.5m)
        // 3. Style Surcharge (จาก config.js) ใช้กับ *ผ้าทึบ* เท่านั้น
        // 4. คง MIN_SET_PRICE (1200) ไว้
        // !! === [USER REQUEST: NOV 2025] === !!
        // 5. [MODIFIED] เปลี่ยนจากการปัดเศษ 10 บาท เป็นปัดเศษ 2 ตำแหน่งทศนิยม (สตางค์)
        // !! ================================= !!
        const MIN_SET_PRICE = 1200; // [KEPT] Minimum price *per set*

        if (!set || set.is_suspended) {
            return { total: 0, opaque: 0, sheer: 0, louis: 0 };
        }

        // [NEW] Check for override
        if (set.enable_set_price && toNum(set.set_price_override) > 0) {
            return {
                total: toNum(set.set_price_override),
                opaque: 0,
                sheer: 0,
                louis: 0,
            };
        }

        const variant = set.fabric_variant || "ทึบ";
        const style = set.style || "ลอน";
        const w = toNum(set.width_m);

        let opaquePrice = 0;
        let sheerPrice = 0;
        let louisPrice = 0;

        // --- Calculate Surcharges (per meter) ---
        // [MODIFIED] Get surcharge from config
        const styleSurcharge = this.getStyleSurcharge(style);

        const rawOpaquePricePerM = toNum(set.price_per_m_raw);
        const rawSheerPricePerM = toNum(set.sheer_price_per_m);

        // --- Calculate Price ---
        if (style === "หลุยส์") {
            const rawLouisPricePerM = toNum(set.louis_price_per_m);

            // [MODIFIED] Apply styleSurcharge ONLY to opaque fabric.
            if (variant.includes("ทึบ")) {
                const finalOpaquePricePerM =
                    rawOpaquePricePerM + styleSurcharge;
                opaquePrice = w * finalOpaquePricePerM;
            }
            if (variant.includes("โปร่ง")) {
                // [MODIFIED] No surcharge for sheer.
                const finalSheerPricePerM = rawSheerPricePerM;
                sheerPrice = w * finalSheerPricePerM;
            }
            // Louis component price
            if (rawLouisPricePerM > 0) {
                louisPrice = w * rawLouisPricePerM;
            }
        } else {
            // --- Standard Calculation (จีบ, ตาไก่, ลอน, พับ, แป๊บ) ---
            if (variant.includes("ทึบ")) {
                // [MODIFIED] Apply surcharge ONLY to opaque.
                const finalOpaquePricePerM =
                    rawOpaquePricePerM + styleSurcharge;
                opaquePrice = w * finalOpaquePricePerM;
            }
            if (variant.includes("โปร่ง")) {
                // [MODIFIED] No surcharge for sheer.
                const finalSheerPricePerM = rawSheerPricePerM;
                sheerPrice = w * finalSheerPricePerM;
            }
        }

        const calculatedTotal = opaquePrice + sheerPrice + louisPrice;

        // Apply Minimum Set Price (Kept)
        let finalTotal = calculatedTotal;
        if (calculatedTotal > 0 && calculatedTotal < MIN_SET_PRICE) {
            finalTotal = MIN_SET_PRICE;
        }

        // [NEW] Round the final total and components to 2 decimal places
        finalTotal = Math.round(finalTotal * 100) / 100;

        return {
            total: finalTotal,
            opaque: Math.round(opaquePrice * 100) / 100,
            sheer: Math.round(sheerPrice * 100) / 100,
            louis: Math.round(louisPrice * 100) / 100,
        };
    },

    /**
     * Calculates the total price for a removal item.
     * [MODIFIED] Rounds to 2 decimal places.
     * @param {object} item - A removal item object.
     * @returns {object} An object containing total price.
     */
    calculateRemovalPrice: function (item) {
        if (!item || item.is_suspended) {
            return { total: 0 };
        }
        const quantity = toNum(item.quantity);
        const price = toNum(item.price_per_item);

        if (quantity <= 0 || price <= 0) {
            return { total: 0 };
        }
        const total = quantity * price;
        // [MODIFIED] Round to 2 decimal places
        return { total: Math.round(total * 100) / 100 };
    },

    /**
     * Calculates the total price for a custom item.
     * [NEW] Custom item calculation (Quantity x Price Per Item)
     * @param {object} item - A custom item object.
     * @returns {object} An object containing total price.
     */
    calculateCustomPrice: function (item) {
        if (!item || item.is_suspended) {
            return { total: 0 };
        }
        const quantity = toNum(item.quantity) || 1; // Default quantity to 1 if not specified
        const price = toNum(item.price_per_item);

        if (quantity <= 0 || price <= 0) {
            return { total: 0 };
        }

        const total = quantity * price;
        return { total: Math.round(total * 100) / 100 };
    },

    /**
     * Calculates the number of wallpaper rolls needed.
     * [MODIFIED: Uses STRIPS_PER_ROLL_UNDER_2_5M from config]
     * @param {number} totalWidth - Total width of all walls in meters.
     * @param {number} height - Height of the room in meters.
     * @returns {number} The number of rolls.
     */
    wallpaperRolls: (totalWidth, height) => {
        // !! === FORMULA PROTECTION === !!
        // สูตรนี้ใช้ค่าจาก config.js (Oct 2025)
        // ห้าม Hardcode ค่าจำนวนแผ่น (strips)
        // !! ========================== !!
        if (totalWidth <= 0 || height <= 0) return 0;

        const { ROLL_WIDTH_M, STRIPS_PER_ROLL_UNDER_2_5M } = WALLPAPER_SPECS;

        // Calculate strips needed
        const stripsNeeded = Math.ceil(totalWidth / ROLL_WIDTH_M);

        // Calculate strips per roll (New Logic)
        let stripsPerRoll;
        if (height <= 2.5) {
            stripsPerRoll = STRIPS_PER_ROLL_UNDER_2_5M; // (e.g., 3)
        } else {
            stripsPerRoll = 2; // Covers > 2.5m
        }

        // Calculate rolls needed
        const rollsNeeded = Math.ceil(stripsNeeded / stripsPerRoll);
        return rollsNeeded;
    },

    /**
     * Calculates the total price for an area-based item (blinds, partitions, etc.).
     * [MODIFIED] Rounds to 2 decimal places.
     * @param {object} item - An area-based item object.
     * @returns {object} An object containing total price and area.
     */
    calculateAreaBasedPrice: function (item) {
        if (!item || item.is_suspended) {
            return { total: 0, sqm: 0, sqyd: 0 };
        }

        // [NEW] Check for override
        if (item.enable_set_price && toNum(item.set_price_override) > 0) {
            return {
                total: toNum(item.set_price_override),
                sqm: 0,
                sqyd: 0,
            };
        }

        const w = toNum(item.width_m);
        const h = toNum(item.height_m);
        const pricePerSqyd = toNum(item.price_sqyd);

        if (w <= 0 || h <= 0 || pricePerSqyd <= 0) {
            return { total: 0, sqm: 0, sqyd: 0 };
        }

        const totalSqm = w * h;
        let totalSqyd = totalSqm * SQM_TO_SQYD;

        // Minimum area charge: 1 ตร.หลา (1 SqYd)
        if (totalSqyd < 1) {
            totalSqyd = 1;
        } else {
            // Round up to the nearest 0.5 sqyd
            totalSqyd = Math.ceil(totalSqyd * 2) / 2;
        }

        const price = totalSqyd * pricePerSqyd;

        return {
            // [MODIFIED] Round final price to 2 decimal places
            total: Math.round(price * 100) / 100,
            sqm: totalSqm,
            sqyd: totalSqyd,
        };
    },

    /**
     * Calculates the total price for a wallpaper item.
     * [MODIFIED] Rounds to 2 decimal places.
     * @param {object} wp - A wallpaper object.
     * @returns {object} An object containing detailed price and material calculations.
     */
    calculateWallpaperPrice: function (wp) {
        if (!wp || wp.is_suspended) {
            return { total: 0, material: 0, install: 0, rolls: 0, sqm: 0 };
        }

        // [NEW] Check for override
        if (wp.enable_set_price && toNum(wp.set_price_override) > 0) {
            return {
                total: toNum(wp.set_price_override),
                material: 0,
                install: 0,
                rolls: 0,
                sqm: 0,
            };
        }

        const totalWidth =
            wp.widths?.reduce((sum, w) => sum + toNum(w), 0) || 0;
        if (totalWidth <= 0) {
            return { total: 0, material: 0, install: 0, rolls: 0, sqm: 0 };
        }

        const height = toNum(wp.height_m);
        const rolls = this.wallpaperRolls(totalWidth, height);
        const materialPrice = rolls * toNum(wp.price_per_roll);

        let installCostPerRoll = 300; // Default
        const savedInstallCost = wp.install_cost_per_roll;
        const numInstallCost = toNum(savedInstallCost);
        if (savedInstallCost === 0 || savedInstallCost === "0") {
            installCostPerRoll = 0;
        } else if (numInstallCost > 0) {
            installCostPerRoll = numInstallCost;
        }

        const installPrice = rolls * installCostPerRoll;

        // [MODIFIED] Round all currency values to 2 decimal places
        const total = materialPrice + installPrice;

        return {
            total: Math.round(total * 100) / 100,
            material: Math.round(materialPrice * 100) / 100,
            install: Math.round(installPrice * 100) / 100,
            rolls: rolls,
            sqm: totalWidth * height,
        };
    },
};
