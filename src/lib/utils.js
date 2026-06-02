// src/lib/utils.js
// --- UTILITY FUNCTIONS ---

export const toNum = (v) => {
    if (typeof v === "string") v = v.replace(/,/g, "");
    const num = parseFloat(v);
    return Number.isFinite(num) ? num : 0;
};

/**
 * Formats a number to a dimension string (x.xx).
 * Returns an empty string if the number is zero.
 * @param {number|string} v The value to format.
 * @returns {string} The formatted string.
 */
export const fmtDimension = (v) => {
    const num = toNum(v);
    return num > 0 ? num.toFixed(2) : "";
};

/**
 * [NEW] Handles blur event on dimension inputs (CM -> M conversion).
 * Converts CM input (e.g., "150") to Meters ("1.50").
 * Formats M input (e.g., "1.5") to Meters ("1.50").
 * @param {Event} e - The blur event.
 */
export const handleCmToMBlur = (e) => {
    const input = e.target;
    const value = input.value.trim();

    if (value === "") {
        input.value = ""; // Clear if empty
        return;
    }

    let num = toNum(value); // toNum handles commas
    if (num <= 0) {
        input.value = ""; // Clear if zero or invalid
        return;
    }

    // [FIXED] CM to M Logic:
    // If the number is >= 5 (e.g., 5, 10, 29, 150)
    // AND it's a whole number (no decimal)
    // Assume it was entered in CM.
    if (num >= 5 && num % 1 === 0) {
        num = num / 100; // Convert CM to M
    }

    // Now format the result (which is in meters) back to "X.XX" format.
    // e.g., 1.5 -> "1.50"
    // e.g., 0.8 -> "0.80"
    input.value = fmtDimension(num);
};

export const fmt = (n, fixed = 2, asCurrency = false) => {
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString("en-US", {
        minimumFractionDigits: asCurrency ? 2 : fixed,
        maximumFractionDigits: asCurrency ? 2 : fixed,
    });
};

/**
 * [MODIFIED] Formats a number to a Thai locale string.
 * Defaults to 2 decimal places (satang) instead of 0.
 * @param {number} n The number to format
 * @param {number} [fixed] The number of decimal places
 * @returns {string} Formatted number string
 */
export const fmtTH = (n, fixed = 2) => {
    if (!Number.isFinite(n)) return "0.00"; // Return 0.00 if not finite
    return n.toLocaleString("th-TH", {
        minimumFractionDigits: fixed,
        maximumFractionDigits: fixed,
    });
};

export const debounce = (fn, ms = 150) => {
    let t;
    return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...a), ms);
    };
};

export const throttle = (fn, delay = 200) => {
    let lastCall = 0;
    let timeout;

    return (...args) => {
        const now = new Date().getTime();

        // Clear any existing timeout
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }

        // If the time elapsed since the last call is more than the delay
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args); // Execute the function
        } else {
            // Otherwise, schedule it to run after the remaining delay
            timeout = setTimeout(
                () => {
                    lastCall = new Date().getTime();
                    fn(...args);
                    timeout = null; // Clear the timeout reference
                },
                delay - (now - lastCall)
            );
        }
    };
};

export const sanitizeHTML = (str) => {
    if (!str) return "";
    return str.replace(/[<>"'&]/g, (match) => {
        switch (match) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case '"':
                return "&quot;";
            case "'":
                return "&#39;";
            case "&":
                return "&amp;";
            default:
                return match;
        }
    });
};

export const sanitizeForFilename = (str) => {
    if (!str) return "file";
    // Remove invalid file path characters and replace spaces with underscores
    return str
        .replace(/[<>:"/\\|?*]/g, "") // Remove invalid chars
        .replace(/[\s\n\t]+/g, "_") // Replace whitespace with underscore
        .substring(0, 100); // Truncate to 100 chars
};

/**
 *
 * @param number
 */
export function bahttext(number) {
    // Ensure number is valid and in the correct range
    number = toNum(number);
    if (number === 0) return "ศูนย์บาทถ้วน";
    if (number < 0 || number > 999999999999.99) {
        // console.warn("bahttext: Number out of range or invalid.");
        return "N/A";
    }

    const TxtNumArr = [
        "ศูนย์",
        "หนึ่ง",
        "สอง",
        "สาม",
        "สี่",
        "ห้า",
        "หก",
        "เจ็ด",
        "แปด",
        "เก้า",
        "สิบ",
    ];
    const TxtDigitArr = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    // Round to 2 decimal places
    number = parseFloat(number.toFixed(2));

    let integerPart = Math.floor(number);
    let decimalPart = Math.round((number - integerPart) * 100);

    const read = (n) => {
        if (n === 0) return "";
        let str = "";
        const s = String(n);
        for (let i = 0; i < s.length; i++) {
            const digit = s[i];
            // const isLastDigit = i === s.length - 1; // Unused variable
            const position = s.length - i - 1;

            if (digit === "0") continue;

            if (position === 1 && digit === "1") {
                str += TxtDigitArr[position];
            } else if (position === 1 && digit === "2") {
                str += "ยี่" + TxtDigitArr[position];
            } else if (position === 0 && digit === "1" && s.length > 1) {
                str += "เอ็ด";
            } else {
                str += TxtNumArr[parseInt(digit)] + TxtDigitArr[position];
            }
        }
        return str;
    };

    let bahtStr = "";
    if (integerPart > 0) {
        const millions = Math.floor(integerPart / 1000000);
        const remainder = integerPart % 1000000;
        if (millions > 0) {
            bahtStr += read(millions) + "ล้าน";
        }
        bahtStr += read(remainder);
        bahtStr += "บาท";
    } else {
        // [MODIFIED] Check if it's purely decimal (e.g., 0.50)
        if (decimalPart > 0) {
            bahtStr = ""; // Don't say "ศูนย์บาท" if there's satang
        } else {
            bahtStr = "ศูนย์บาท"; // Only say "ศูนย์บาท" if it's truly 0
        }
    }

    if (decimalPart === 0) {
        // Only add "ถ้วน" if integer part was > 0
        if (integerPart > 0) bahtStr += "ถ้วน";
    } else {
        // If integer part was 0, bahtStr is empty, so it will just say "ห้าสิบสตางค์"
        bahtStr += read(decimalPart) + "สตางค์";
    }

    return bahtStr;
}

/**
 * [MODIFIED] Handles focus event on numeric inputs to show raw number.
 * Handles "0.00" as well as "0".
 * @param {Event} e - The focus event.
 */
export function handleNumericFocus(e) {
    const val = e.target.value;
    // Keep '0' or '0.00' as is on focus, but unformat other numbers
    if (val !== "0" && val !== "0.00" && toNum(val) > 0) {
        e.target.value = toNum(val);
    }
}

/**
 * [MODIFIED] Handles blur event on numeric inputs to format with commas.
 * Now formats to 2 decimal places (e.g., "1,205.59" or "0.00").
 * @param {Event} e - The blur event.
 */
export function handleNumericBlur(e) {
    const numValue = toNum(e.target.value);
    // Display 0 as "0.00", otherwise format to 2 decimal places
    e.target.value =
        numValue === 0
            ? "0.00" // [MODIFIED]
            : numValue !== undefined && numValue !== null && numValue > 0
              ? fmtTH(numValue, 2) // [MODIFIED] Explicitly format to 2 decimals
              : "";
}
