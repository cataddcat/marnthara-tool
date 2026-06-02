import { describe, it, expect } from "vitest";
import { CALC } from "../calculations.js";

// --- getStyleSurcharge ---
describe("CALC.getStyleSurcharge", () => {
    it("returns 0 for known styles with no surcharge", () => {
        expect(CALC.getStyleSurcharge("ลอน")).toBe(0);
        expect(CALC.getStyleSurcharge("ตาไก่")).toBe(0);
        expect(CALC.getStyleSurcharge("จีบ")).toBe(0);
        expect(CALC.getStyleSurcharge("ม่านพับ")).toBe(0);
        expect(CALC.getStyleSurcharge("ม่านแป๊บ")).toBe(0);
        expect(CALC.getStyleSurcharge("หลุยส์")).toBe(0);
    });

    it("returns 0 for unknown styles", () => {
        expect(CALC.getStyleSurcharge("unknown")).toBe(0);
        expect(CALC.getStyleSurcharge("")).toBe(0);
    });
});

// --- fabricYardage ---
describe("CALC.fabricYardage", () => {
    it("returns 0 for zero or negative width", () => {
        expect(CALC.fabricYardage("ลอน", 0)).toBe(0);
        expect(CALC.fabricYardage("ลอน", -1)).toBe(0);
    });

    it("returns 0 for unknown style", () => {
        expect(CALC.fabricYardage("unknown", 2.4)).toBe(0);
    });

    it("calculates Wave/S-Fold (ลอน) correctly: (w+0.3)*2.3 / 0.9", () => {
        // 2.40m -> (2.4+0.3)*2.3 / 0.9 = 6.2/0.9 ≈ 6.9
        const result = CALC.fabricYardage("ลอน", 2.4);
        const expected = ((2.4 + 0.3) * 2.3) / 0.9;
        expect(result).toBeCloseTo(expected, 5);
    });

    it("calculates Eyelet (ตาไก่) correctly: (w+0.3)*2 / 0.9", () => {
        const result = CALC.fabricYardage("ตาไก่", 2.4);
        const expected = ((2.4 + 0.3) * 2) / 0.9;
        expect(result).toBeCloseTo(expected, 5);
    });

    it("calculates Pleated (จีบ) the same as Eyelet", () => {
        expect(CALC.fabricYardage("จีบ", 3.0)).toBeCloseTo(
            CALC.fabricYardage("ตาไก่", 3.0),
            5
        );
    });

    it("calculates Louis (หลุยส์) the same as Eyelet", () => {
        expect(CALC.fabricYardage("หลุยส์", 3.0)).toBeCloseTo(
            CALC.fabricYardage("ตาไก่", 3.0),
            5
        );
    });

    it("calculates Rod Pocket (ม่านแป๊บ) the same as Eyelet", () => {
        expect(CALC.fabricYardage("ม่านแป๊บ", 3.0)).toBeCloseTo(
            CALC.fabricYardage("ตาไก่", 3.0),
            5
        );
    });

    it("calculates Roman (ม่านพับ) correctly: w*1.3 / 0.9", () => {
        const result = CALC.fabricYardage("ม่านพับ", 2.0);
        const expected = (2.0 * 1.3) / 0.9;
        expect(result).toBeCloseTo(expected, 5);
    });

    it("adds 1 yard per 50 yards for tie-backs", () => {
        // Need a large width so base yardage exceeds 50
        // For ตาไก่: (w+0.3)*2/0.9 >= 50 → w >= (50*0.9/2)-0.3 = 22.2
        const result = CALC.fabricYardage("ตาไก่", 23);
        const baseYards = ((23 + 0.3) * 2) / 0.9;
        const tieBack = Math.floor(baseYards / 50);
        expect(result).toBeCloseTo(baseYards + tieBack, 5);
    });

    it("accepts string width", () => {
        const result = CALC.fabricYardage("ลอน", "2.4");
        const expected = ((2.4 + 0.3) * 2.3) / 0.9;
        expect(result).toBeCloseTo(expected, 5);
    });
});

// --- calculateGrommets ---
describe("CALC.calculateGrommets", () => {
    it("returns 0 for non-Eyelet styles", () => {
        expect(CALC.calculateGrommets({ width_m: 2.4, style: "ลอน" })).toBe(0);
        expect(CALC.calculateGrommets({ width_m: 2.4, style: "จีบ" })).toBe(0);
    });

    it("returns 0 for zero width", () => {
        expect(CALC.calculateGrommets({ width_m: 0, style: "ตาไก่" })).toBe(0);
    });

    it("calculates even grommet count for Eyelet", () => {
        const result = CALC.calculateGrommets({
            width_m: 2.4,
            style: "ตาไก่",
        });
        expect(result).toBeGreaterThan(0);
        expect(result % 2).toBe(0); // Must be even
    });

    it("returns consistent results for same input", () => {
        const a = CALC.calculateGrommets({ width_m: 3.0, style: "ตาไก่" });
        const b = CALC.calculateGrommets({ width_m: 3.0, style: "ตาไก่" });
        expect(a).toBe(b);
    });
});

// --- calculateSetPrice ---
describe("CALC.calculateSetPrice", () => {
    it("returns zeros for suspended items", () => {
        const result = CALC.calculateSetPrice({ is_suspended: true });
        expect(result).toEqual({ total: 0, opaque: 0, sheer: 0, louis: 0 });
    });

    it("returns zeros for null/undefined", () => {
        expect(CALC.calculateSetPrice(null)).toEqual({
            total: 0,
            opaque: 0,
            sheer: 0,
            louis: 0,
        });
        expect(CALC.calculateSetPrice(undefined)).toEqual({
            total: 0,
            opaque: 0,
            sheer: 0,
            louis: 0,
        });
    });

    it("returns override price when enabled", () => {
        const result = CALC.calculateSetPrice({
            enable_set_price: true,
            set_price_override: 5000,
            width_m: 2.4,
            price_per_m_raw: 1000,
            fabric_variant: "ทึบ",
            style: "ลอน",
        });
        expect(result.total).toBe(5000);
    });

    it("does not use override when price is 0", () => {
        const result = CALC.calculateSetPrice({
            enable_set_price: true,
            set_price_override: 0,
            width_m: 2.4,
            price_per_m_raw: 1000,
            fabric_variant: "ทึบ",
            style: "ลอน",
        });
        expect(result.total).toBeGreaterThan(0);
        expect(result.total).not.toBe(0);
    });

    it("calculates opaque-only price: width * pricePerM", () => {
        const result = CALC.calculateSetPrice({
            width_m: 2.4,
            price_per_m_raw: 1500,
            sheer_price_per_m: 0,
            fabric_variant: "ทึบ",
            style: "ลอน",
        });
        expect(result.opaque).toBeCloseTo(2.4 * 1500, 2);
        expect(result.sheer).toBe(0);
        expect(result.total).toBeCloseTo(2.4 * 1500, 2);
    });

    it("calculates opaque + sheer combined price", () => {
        const result = CALC.calculateSetPrice({
            width_m: 2.4,
            price_per_m_raw: 1500,
            sheer_price_per_m: 1000,
            fabric_variant: "ทึบ+โปร่ง",
            style: "ลอน",
        });
        expect(result.opaque).toBeCloseTo(2.4 * 1500, 2);
        expect(result.sheer).toBeCloseTo(2.4 * 1000, 2);
        expect(result.total).toBeCloseTo(2.4 * 1500 + 2.4 * 1000, 2);
    });

    it("enforces minimum set price of 1200", () => {
        const result = CALC.calculateSetPrice({
            width_m: 0.5,
            price_per_m_raw: 1000,
            sheer_price_per_m: 0,
            fabric_variant: "ทึบ",
            style: "ลอน",
        });
        // 0.5 * 1000 = 500, which is below MIN_SET_PRICE (1200)
        expect(result.total).toBe(1200);
    });

    it("does not apply minimum when calculated price is above 1200", () => {
        const result = CALC.calculateSetPrice({
            width_m: 2.0,
            price_per_m_raw: 1500,
            sheer_price_per_m: 0,
            fabric_variant: "ทึบ",
            style: "จีบ",
        });
        // 2.0 * 1500 = 3000
        expect(result.total).toBe(3000);
    });

    it("rounds to 2 decimal places", () => {
        const result = CALC.calculateSetPrice({
            width_m: 2.33,
            price_per_m_raw: 1100,
            sheer_price_per_m: 0,
            fabric_variant: "ทึบ",
            style: "ลอน",
        });
        // Check total has at most 2 decimal places
        const decimalStr = result.total.toString().split(".")[1] || "";
        expect(decimalStr.length).toBeLessThanOrEqual(2);
    });

    it("calculates Louis style with separate louis component", () => {
        const result = CALC.calculateSetPrice({
            width_m: 2.0,
            price_per_m_raw: 1500,
            sheer_price_per_m: 1000,
            louis_price_per_m: 2500,
            fabric_variant: "ทึบ+โปร่ง",
            style: "หลุยส์",
        });
        expect(result.opaque).toBeCloseTo(2.0 * 1500, 2);
        expect(result.sheer).toBeCloseTo(2.0 * 1000, 2);
        expect(result.louis).toBeCloseTo(2.0 * 2500, 2);
        expect(result.total).toBeCloseTo(
            2.0 * 1500 + 2.0 * 1000 + 2.0 * 2500,
            2
        );
    });

    it("returns 0 total when width is 0", () => {
        const result = CALC.calculateSetPrice({
            width_m: 0,
            price_per_m_raw: 1500,
            fabric_variant: "ทึบ",
            style: "ลอน",
        });
        expect(result.total).toBe(0);
    });
});

// --- calculateRemovalPrice ---
describe("CALC.calculateRemovalPrice", () => {
    it("returns 0 for suspended items", () => {
        expect(CALC.calculateRemovalPrice({ is_suspended: true })).toEqual({
            total: 0,
        });
    });

    it("returns 0 for null", () => {
        expect(CALC.calculateRemovalPrice(null)).toEqual({ total: 0 });
    });

    it("calculates quantity * price", () => {
        const result = CALC.calculateRemovalPrice({
            quantity: 3,
            price_per_item: 500,
        });
        expect(result.total).toBe(1500);
    });

    it("returns 0 when quantity is 0", () => {
        expect(
            CALC.calculateRemovalPrice({ quantity: 0, price_per_item: 500 })
        ).toEqual({ total: 0 });
    });

    it("returns 0 when price is 0", () => {
        expect(
            CALC.calculateRemovalPrice({ quantity: 3, price_per_item: 0 })
        ).toEqual({ total: 0 });
    });

    it("rounds to 2 decimal places", () => {
        const result = CALC.calculateRemovalPrice({
            quantity: 3,
            price_per_item: 333.333,
        });
        expect(result.total).toBeCloseTo(999.999, 2);
    });
});

// --- calculateCustomPrice ---
describe("CALC.calculateCustomPrice", () => {
    it("returns 0 for suspended items", () => {
        expect(CALC.calculateCustomPrice({ is_suspended: true })).toEqual({
            total: 0,
        });
    });

    it("calculates quantity * price", () => {
        expect(
            CALC.calculateCustomPrice({
                quantity: 2,
                price_per_item: 750,
            })
        ).toEqual({ total: 1500 });
    });

    it("defaults quantity to 1 when zero or missing", () => {
        // quantity 0 → fallback to 1 via `|| 1`
        const result = CALC.calculateCustomPrice({
            quantity: 0,
            price_per_item: 500,
        });
        expect(result.total).toBe(500); // 1 * 500
    });

    it("returns 0 when price is 0", () => {
        expect(
            CALC.calculateCustomPrice({ quantity: 1, price_per_item: 0 })
        ).toEqual({ total: 0 });
    });
});

// --- wallpaperRolls ---
describe("CALC.wallpaperRolls", () => {
    it("returns 0 for zero or negative dimensions", () => {
        expect(CALC.wallpaperRolls(0, 2.5)).toBe(0);
        expect(CALC.wallpaperRolls(5, 0)).toBe(0);
        expect(CALC.wallpaperRolls(-1, 2.5)).toBe(0);
    });

    it("calculates rolls for height <= 2.5m (3 strips per roll)", () => {
        // totalWidth=3m, height=2.5m
        // strips = ceil(3/0.53) = 6
        // stripsPerRoll = 3 (height<=2.5)
        // rolls = ceil(6/3) = 2
        expect(CALC.wallpaperRolls(3, 2.5)).toBe(2);
    });

    it("calculates rolls for height > 2.5m (2 strips per roll)", () => {
        // totalWidth=3m, height=3.0m
        // strips = ceil(3/0.53) = 6
        // stripsPerRoll = 2 (height>2.5)
        // rolls = ceil(6/2) = 3
        expect(CALC.wallpaperRolls(3, 3.0)).toBe(3);
    });

    it("rounds up strips needed", () => {
        // totalWidth=1m, height=2.0m
        // strips = ceil(1/0.53) = 2
        // rolls = ceil(2/3) = 1
        expect(CALC.wallpaperRolls(1, 2.0)).toBe(1);
    });

    it("handles small width", () => {
        // totalWidth=0.4m (less than one roll width)
        // strips = ceil(0.4/0.53) = 1
        // rolls = ceil(1/3) = 1
        expect(CALC.wallpaperRolls(0.4, 2.0)).toBe(1);
    });
});

// --- calculateAreaBasedPrice ---
describe("CALC.calculateAreaBasedPrice", () => {
    it("returns zeros for suspended items", () => {
        expect(CALC.calculateAreaBasedPrice({ is_suspended: true })).toEqual({
            total: 0,
            sqm: 0,
            sqyd: 0,
        });
    });

    it("returns zeros for null", () => {
        expect(CALC.calculateAreaBasedPrice(null)).toEqual({
            total: 0,
            sqm: 0,
            sqyd: 0,
        });
    });

    it("returns override price when enabled", () => {
        const result = CALC.calculateAreaBasedPrice({
            enable_set_price: true,
            set_price_override: 3000,
            width_m: 2.0,
            height_m: 1.5,
            price_sqyd: 500,
        });
        expect(result.total).toBe(3000);
    });

    it("returns zeros for zero dimensions", () => {
        expect(
            CALC.calculateAreaBasedPrice({
                width_m: 0,
                height_m: 1.5,
                price_sqyd: 500,
            })
        ).toEqual({ total: 0, sqm: 0, sqyd: 0 });
    });

    it("calculates area-based price with sqyd conversion", () => {
        // 2.0 * 1.5 = 3.0 sqm
        // 3.0 * 1.19599 = 3.58797 sqyd → ceil to 0.5 = 4.0 sqyd
        // 4.0 * 500 = 2000
        const result = CALC.calculateAreaBasedPrice({
            width_m: 2.0,
            height_m: 1.5,
            price_sqyd: 500,
        });
        expect(result.sqm).toBeCloseTo(3.0, 5);
        expect(result.sqyd).toBe(4.0); // ceil to nearest 0.5
        expect(result.total).toBe(2000);
    });

    it("enforces minimum 1 sqyd", () => {
        // Very small area: 0.3 * 0.3 = 0.09 sqm = 0.1076 sqyd → minimum 1 sqyd
        const result = CALC.calculateAreaBasedPrice({
            width_m: 0.3,
            height_m: 0.3,
            price_sqyd: 1000,
        });
        expect(result.sqyd).toBe(1);
        expect(result.total).toBe(1000);
    });

    it("rounds sqyd up to nearest 0.5", () => {
        // 1.0 * 1.0 = 1.0 sqm = 1.19599 sqyd → ceil(*2)/2 = 1.5 sqyd
        const result = CALC.calculateAreaBasedPrice({
            width_m: 1.0,
            height_m: 1.0,
            price_sqyd: 100,
        });
        expect(result.sqyd).toBe(1.5);
    });
});

// --- calculateWallpaperPrice ---
describe("CALC.calculateWallpaperPrice", () => {
    it("returns zeros for suspended items", () => {
        expect(CALC.calculateWallpaperPrice({ is_suspended: true })).toEqual({
            total: 0,
            material: 0,
            install: 0,
            rolls: 0,
            sqm: 0,
        });
    });

    it("returns override price when enabled", () => {
        const result = CALC.calculateWallpaperPrice({
            enable_set_price: true,
            set_price_override: 8000,
            widths: [3, 4],
            height_m: 2.5,
            price_per_roll: 2000,
        });
        expect(result.total).toBe(8000);
    });

    it("returns zeros for zero total width", () => {
        const result = CALC.calculateWallpaperPrice({
            widths: [0, 0],
            height_m: 2.5,
            price_per_roll: 2000,
        });
        expect(result.total).toBe(0);
    });

    it("calculates wallpaper price with default install cost", () => {
        // widths=[3], height=2.5
        // rolls = wallpaperRolls(3, 2.5) = 2
        // material = 2 * 2000 = 4000
        // install = 2 * 300 = 600 (default)
        // total = 4600
        const result = CALC.calculateWallpaperPrice({
            widths: [3],
            height_m: 2.5,
            price_per_roll: 2000,
        });
        expect(result.rolls).toBe(2);
        expect(result.material).toBe(4000);
        expect(result.install).toBe(600);
        expect(result.total).toBe(4600);
    });

    it("uses custom install cost when provided", () => {
        const result = CALC.calculateWallpaperPrice({
            widths: [3],
            height_m: 2.5,
            price_per_roll: 2000,
            install_cost_per_roll: 500,
        });
        expect(result.install).toBe(1000); // 2 rolls * 500
    });

    it("allows zero install cost", () => {
        const result = CALC.calculateWallpaperPrice({
            widths: [3],
            height_m: 2.5,
            price_per_roll: 2000,
            install_cost_per_roll: 0,
        });
        expect(result.install).toBe(0);
        expect(result.total).toBe(4000); // material only
    });

    it("sums multiple wall widths", () => {
        // widths=[2, 3] = total 5m
        const result = CALC.calculateWallpaperPrice({
            widths: [2, 3],
            height_m: 2.5,
            price_per_roll: 1000,
        });
        // strips = ceil(5/0.53) = 10
        // rolls = ceil(10/3) = 4
        expect(result.rolls).toBe(4);
    });
});
