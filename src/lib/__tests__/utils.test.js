import { describe, it, expect } from "vitest";
import {
    toNum,
    fmtDimension,
    fmtTH,
    fmt,
    sanitizeHTML,
    bahttext,
} from "../utils.js";

// --- toNum ---
describe("toNum", () => {
    it("parses numbers", () => {
        expect(toNum(42)).toBe(42);
        expect(toNum(3.14)).toBe(3.14);
    });

    it("parses numeric strings", () => {
        expect(toNum("42")).toBe(42);
        expect(toNum("3.14")).toBe(3.14);
    });

    it("strips commas from formatted numbers", () => {
        expect(toNum("1,000")).toBe(1000);
        expect(toNum("1,234,567.89")).toBe(1234567.89);
    });

    it("returns 0 for non-numeric values", () => {
        expect(toNum("")).toBe(0);
        expect(toNum("abc")).toBe(0);
        expect(toNum(null)).toBe(0);
        expect(toNum(undefined)).toBe(0);
        expect(toNum(NaN)).toBe(0);
        expect(toNum(Infinity)).toBe(0);
    });

    it("handles negative numbers", () => {
        expect(toNum(-5)).toBe(-5);
        expect(toNum("-5")).toBe(-5);
    });
});

// --- fmtDimension ---
describe("fmtDimension", () => {
    it("formats positive numbers to 2 decimals", () => {
        expect(fmtDimension(1.5)).toBe("1.50");
        expect(fmtDimension(2)).toBe("2.00");
        expect(fmtDimension(0.8)).toBe("0.80");
    });

    it("returns empty string for zero", () => {
        expect(fmtDimension(0)).toBe("");
        expect(fmtDimension("0")).toBe("");
    });

    it("returns empty string for negative", () => {
        expect(fmtDimension(-1)).toBe("");
    });

    it("accepts string input", () => {
        expect(fmtDimension("1.5")).toBe("1.50");
    });
});

// --- fmtTH ---
describe("fmtTH", () => {
    it("formats numbers with Thai locale", () => {
        const result = fmtTH(1234.56);
        // Should contain comma separator and 2 decimals
        expect(result).toContain("1,234.56");
    });

    it("formats with custom decimal places", () => {
        const result = fmtTH(1234.5, 0);
        expect(result).toContain("1,235"); // rounded
    });

    it("returns 0.00 for non-finite values", () => {
        expect(fmtTH(NaN)).toBe("0.00");
        expect(fmtTH(Infinity)).toBe("0.00");
    });

    it("defaults to 2 decimal places", () => {
        const result = fmtTH(100);
        expect(result).toContain("100.00");
    });
});

// --- fmt ---
describe("fmt", () => {
    it("formats numbers with en-US locale", () => {
        expect(fmt(1234.56)).toContain("1,234.56");
    });

    it("returns 0 for non-finite values", () => {
        expect(fmt(NaN)).toBe("0");
        expect(fmt(Infinity)).toBe("0");
    });
});

// --- sanitizeHTML ---
describe("sanitizeHTML", () => {
    it("escapes HTML special characters", () => {
        expect(sanitizeHTML("<script>")).toBe("&lt;script&gt;");
        expect(sanitizeHTML('"hello"')).toBe("&quot;hello&quot;");
        expect(sanitizeHTML("it's")).toBe("it&#39;s");
        expect(sanitizeHTML("a & b")).toBe("a &amp; b");
    });

    it("returns empty string for falsy input", () => {
        expect(sanitizeHTML("")).toBe("");
        expect(sanitizeHTML(null)).toBe("");
        expect(sanitizeHTML(undefined)).toBe("");
    });

    it("leaves safe text unchanged", () => {
        expect(sanitizeHTML("Hello World")).toBe("Hello World");
        expect(sanitizeHTML("ผ้าม่าน")).toBe("ผ้าม่าน");
    });

    it("escapes all special chars in combination", () => {
        expect(sanitizeHTML('<img src="x" onerror="alert(1)">')).toBe(
            "&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;"
        );
    });
});

// --- bahttext ---
describe("bahttext", () => {
    it("converts 0 to ศูนย์บาทถ้วน", () => {
        expect(bahttext(0)).toBe("ศูนย์บาทถ้วน");
    });

    it("converts whole numbers correctly", () => {
        expect(bahttext(1)).toBe("หนึ่งบาทถ้วน");
        expect(bahttext(10)).toBe("สิบบาทถ้วน");
        expect(bahttext(11)).toBe("สิบเอ็ดบาทถ้วน");
        expect(bahttext(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
        expect(bahttext(100)).toBe("หนึ่งร้อยบาทถ้วน");
    });

    it("converts decimal amounts correctly", () => {
        expect(bahttext(0.5)).toBe("ห้าสิบสตางค์");
        expect(bahttext(1.5)).toBe("หนึ่งบาทห้าสิบสตางค์");
        expect(bahttext(100.25)).toBe("หนึ่งร้อยบาทยี่สิบห้าสตางค์");
    });

    it("handles large numbers", () => {
        const result = bahttext(1000000);
        expect(result).toBe("หนึ่งล้านบาทถ้วน");
    });

    it("returns N/A for out of range", () => {
        expect(bahttext(-1)).toBe("N/A");
        expect(bahttext(1000000000000)).toBe("N/A");
    });

    it("handles common pricing amounts", () => {
        // 1,200 baht - minimum set price
        expect(bahttext(1200)).toBe("หนึ่งพันสองร้อยบาทถ้วน");
        // 3,600 baht
        expect(bahttext(3600)).toBe("สามพันหกร้อยบาทถ้วน");
    });

    it("accepts string input", () => {
        expect(bahttext("1000")).toBe("หนึ่งพันบาทถ้วน");
    });
});
