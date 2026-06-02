/* [UPDATED] lib/documentGenerator.js */
// src/lib/documentGenerator.js
// --- DOCUMENT & TEXT SUMMARY GENERATION (REFACTORED) ---
import { ITEM_CONFIG, HARDWARE_DEFAULTS } from "./config.js";
import {
    bahttext,
    fmt,
    fmtTH,
    sanitizeHTML,
    sanitizeForFilename,
    toNum,
} from "./utils.js";
import { CALC } from "./calculations.js";
import { getShopConfig } from "./shopConfig.js";

const ITEM_TYPE_DISPLAY_NAMES = Object.entries(ITEM_CONFIG).reduce(
    (acc, [key, value]) => {
        acc[key] = value.name;
        return acc;
    },
    {}
);
ITEM_TYPE_DISPLAY_NAMES["set_louis"] = "ม่านหลุยส์";

/** Escapes HTML and converts newlines to &lt;br&gt; for PDF rendering. */
function _nlToBr(text) {
    return sanitizeHTML(text).replace(/\n/g, "<br>");
}

/**
 *
 * @param dimensions
 */
function _getSvgFrame(dimensions) {
    const { width = 0, height = 0 } = dimensions;
    const PADDING = 15;
    const MAX_W = 100 - PADDING * 2;
    const MAX_H = 100 - PADDING * 2;

    const scale =
        width > 0 && height > 0 ? Math.min(MAX_W / width, MAX_H / height) : 1;
    const svgWidth = width * scale;
    const svgHeight = height * scale;

    const x = (100 - svgWidth) / 2;
    const y = (100 - svgHeight) / 2;

    const lines = `
        <line x1="${x}" y1="${y + svgHeight + 5}" x2="${x + svgWidth}" y2="${y + svgHeight + 5}" class="dimension-line" />
        <line x1="${x}" y1="${y + svgHeight + 3}" x2="${x}" y2="${y + svgHeight + 7}" class="dimension-tick" />
        <line x1="${x + svgWidth}" y1="${y + svgHeight + 3}" x2="${x + svgWidth}" y2="${y + svgHeight + 7}" class="dimension-tick" />
        <text x="50" y="${y + svgHeight + 14}" class="dimension-text">${width.toFixed(2)} ม.</text>

        <line x1="${x - 5}" y1="${y}" x2="${x - 5}" y2="${y + svgHeight}" class="dimension-line" />
        <line x1="${x - 7}" y1="${y}" x2="${x - 3}" y2="${y}" class="dimension-tick" />
        <line x1="${x - 7}" y1="${y + svgHeight}" x2="${x - 3}" y2="${y + svgHeight}" class="dimension-tick" />
        <text x="${x - 9}" y="50" class="dimension-text" transform="rotate(-90, ${x - 9}, 50)">${height.toFixed(2)} ม.</text>
    `;

    return { x, y, svgWidth, svgHeight, lines };
}

/**
 *
 * @param item
 * @param root0
 * @param root0.y
 * @param root0.svgHeight
 */
function _getOpeningIndicatorSvg(item, { y, svgHeight }) {
    if (!item.opening_style || item.opening_style === "สไลด์เดี่ยว") return "";
    if (item.type === "set" && item.style === "ม่านแป๊บ") return "";
    const symbol = item.opening_style === "แยกกลาง" ? "< >" : "→";
    return `
        <rect x="40" y="${y + svgHeight / 2 - 8}" width="20" height="16" rx="3" class="opening-text-bg" />
        <text x="50" y="${y + svgHeight / 2 + 1}" class="opening-text">${symbol}</text>
    `;
}

/**
 *
 * @param item
 * @param root0
 * @param root0.x
 * @param root0.y
 * @param root0.svgWidth
 */
function _getAdjustmentCordSvg(item, { x, y, svgWidth }) {
    if (!item.adjustment_side) return "";
    const isLeft = item.adjustment_side === "ปรับซ้าย";
    const cordX = isLeft ? x + 8 : x + svgWidth - 8;
    return `
        <g class="adjustment-cord">
            <circle cx="${cordX}" cy="${y + 3}" r="2"/>
            <line x1="${cordX}" y1="${y + 5}" x2="${cordX}" y2="${y + 15}"/>
        </g>
    `;
}

/**
 *
 * @param item
 */
function _generateStandardCurtainSvg(item) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);

    if (width <= 0 || height <= 0) {
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;
    }

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let panels = "";
    const hasSheer = item.fabric_variant.includes("โปร่ง");
    const hasOpaque = item.fabric_variant.includes("ทึบ");

    const drawPanels = (className, yOffset) => {
        const openingStyle = item.opening_style || "แยกกลาง";
        if (openingStyle === "แยกกลาง") {
            return `
                <rect x="${x}" y="${y + yOffset}" width="${svgWidth / 2 - 1}" height="${svgHeight}" class="${className}" />
                <rect x="${x + svgWidth / 2 + 1}" y="${y + yOffset}" width="${svgWidth / 2 - 1}" height="${svgHeight}" class="${className}" />
            `;
        }
        return `<rect x="${x}" y="${y + yOffset}" width="${svgWidth}" height="${svgHeight}" class="${className}" />`;
    };

    if (hasSheer) panels += drawPanels("curtain-panel-sheer", 0);
    if (hasOpaque)
        panels += drawPanels("curtain-panel-opaque", hasSheer ? -2 : 0);

    let styleDecor = "";
    if (item.style === "ตาไก่") {
        const grommetCount =
            CALC.calculateGrommets(item) /
            ((item.opening_style || "แยกกลาง") === "แยกกลาง" ? 2 : 1);
        const displayCount = Math.min(
            Math.floor(grommetCount),
            Math.max(8, Math.floor(svgWidth / 8))
        );
        for (let i = 0; i < displayCount; i++) {
            const gx =
                x + (svgWidth / (displayCount > 1 ? displayCount - 1 : 1)) * i;
            styleDecor += `<circle cx="${gx}" cy="${y + 2}" r="2" class="style-grommet" />`;
        }
    } else if (item.style === "ลอน") {
        const waveCount = Math.max(4, Math.floor(svgWidth / 10));
        let path = `M ${x},${y}`;
        for (let i = 0; i < waveCount; i++) path += ` q 5,-4 10,0`;
        styleDecor = `<path d="${path}" class="style-ripplefold-path" />`;
    } else if (item.style === "จีบ") {
        styleDecor = `<text x="${x + 2}" y="${y + 5}" class="style-pleat-text">||| ||| ||| ||| |||</text>`;
    }

    const openingNode = _getOpeningIndicatorSvg(item, {
        x,
        y,
        svgWidth,
        svgHeight,
    });

    return `<svg viewBox="0 0 100 100">${panels}${styleDecor}${openingNode}${lines}</svg>`;
}

/**
 *
 * @param item
 */
function _generateLouisCurtainSvg(item) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);

    if (width <= 0 || height <= 0) {
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;
    }

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let panels = "";
    const hasSheer = item.fabric_variant.includes("โปร่ง");
    const hasOpaque = item.fabric_variant.includes("ทึบ");

    const drawBasePanels = (className, yOffset) => `
        <rect x="${x}" y="${y + yOffset}" width="${svgWidth / 2 - 1}" height="${svgHeight}" class="${className}" />
        <rect x="${x + svgWidth / 2 + 1}" y="${y + yOffset}" width="${svgWidth / 2 - 1}" height="${svgHeight}" class="${className}" />
    `;

    if (hasSheer) panels += drawBasePanels("curtain-panel-sheer", 0);
    if (hasOpaque)
        panels += drawBasePanels("curtain-panel-opaque", hasSheer ? -2 : 0);

    const loopCount = Math.max(3, Math.floor(svgWidth / 15));
    const loopWidth = svgWidth / loopCount;
    let valance = "";
    for (let i = 0; i < loopCount; i++) {
        const loopX = x + i * loopWidth;
        valance += `<path d="M ${loopX},${y} Q ${loopX + loopWidth / 2},${y + 10} ${loopX + loopWidth},${y}" class="louis-swag" />`;
    }
    valance += `
        <polygon points="${x},${y} ${x + 8},${y} ${x},${y + 15}" class="louis-tail" />
        <polygon points="${x + svgWidth},${y} ${x + svgWidth - 8},${y} ${x + svgWidth},${y + 15}" class="louis-tail" />
    `;

    let tassels = "";
    if (item.louis_tassels && item.louis_tassels !== "ไม่มี") {
        tassels += `<circle cx="${x + 5}" cy="${y + 18}" r="2" class="louis-tassel" />`;
        tassels += `<circle cx="${x + svgWidth - 5}" cy="${y + 18}" r="2" class="louis-tassel" />`;
        for (let i = 1; i < loopCount; i++) {
            tassels += `<circle cx="${x + i * loopWidth}" cy="${y + 8}" r="2" class="louis-tassel" />`;
        }
    }

    return `<svg viewBox="0 0 100 100">${panels}${valance}${tassels}${lines}</svg>`;
}

/**
 *
 * @param item
 */
function _generateRomanBlindSvg(item) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    if (width <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let panels = `<rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="blind-frame" />`;
    const slatCount = 5;
    const slatHeight = svgHeight / slatCount;
    for (let i = 0; i < slatCount; i++) {
        panels += `<rect x="${x + 1}" y="${y + i * slatHeight}" width="${svgWidth - 2}" height="${slatHeight - 1.5}" class="blind-slat" />`;
    }

    const cordNode = _getAdjustmentCordSvg(item, { x, y, svgWidth });
    return `<svg viewBox="0 0 100 100">${panels}${lines}${cordNode}</svg>`;
}

/**
 *
 * @param item
 */
function _generateRodPocketSvg(item) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    if (width <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let panels = "";
    const hasSheer = item.fabric_variant.includes("โปร่ง");
    const hasOpaque = item.fabric_variant.includes("ทึบ");
    const panelClass = hasOpaque
        ? "curtain-panel-opaque"
        : hasSheer
          ? "curtain-panel-sheer"
          : "blind-slat";

    panels += `<rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="${panelClass}" />`;

    const pocketHeight = 3;
    panels += `<line x1="${x}" y1="${y + pocketHeight / 2}" x2="${x + svgWidth}" y2="${y + pocketHeight / 2}" class="style-pleat-line" stroke-width="0.8"/>`;
    panels += `<line x1="${x}" y1="${y + pocketHeight}" x2="${x + svgWidth}" y2="${y + pocketHeight}" class="style-pleat-line"/>`;
    panels += `<line x1="${x}" y1="${y + svgHeight - pocketHeight}" x2="${x + svgWidth}" y2="${y + svgHeight - pocketHeight}" class="style-pleat-line"/>`;
    panels += `<line x1="${x}" y1="${y + svgHeight - pocketHeight / 2}" x2="${x + svgWidth}" y2="${y + svgHeight - pocketHeight / 2}" class="style-pleat-line" stroke-width="0.8"/>`;

    const lineCount = Math.max(8, Math.floor(svgWidth / 4));
    for (let i = 1; i < lineCount; i++) {
        const lineX = x + (svgWidth / lineCount) * i;
        panels += `<line x1="${lineX}" y1="${y + pocketHeight}" x2="${lineX}" y2="${y + svgHeight - pocketHeight}" class="style-pleat-line" opacity="0.5"/>`;
    }

    const tieY = y + svgHeight * 0.5;
    const tieHeight = 8;
    panels += `<rect x="${x + svgWidth * 0.1}" y="${tieY - tieHeight / 2}" width="${svgWidth * 0.8}" height="${tieHeight}" rx="2" class="blind-slat" filter="brightness(0.95)" />`;
    panels += `<rect x="${x + svgWidth * 0.12}" y="${tieY - tieHeight / 2 + 1.5}" width="${svgWidth * 0.76}" height="${tieHeight - 3}" rx="1" class="blind-frame" opacity="0.3" />`;

    return `<svg viewBox="0 0 100 100">${panels}${lines}</svg>`;
}

/**
 *
 * @param item
 * @param isVertical
 */
function _generateBlindSvg(item, isVertical = false) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    if (width <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let slats = `<rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="blind-frame" />`;
    if (isVertical) {
        const slatCount = Math.max(4, Math.floor(svgWidth / 8));
        const slatWidth = svgWidth / slatCount;
        for (let i = 0; i < slatCount; i++) {
            slats += `<rect x="${x + i * slatWidth + 1}" y="${y}" width="${slatWidth - 2}" height="${svgHeight}" class="blind-slat" />`;
        }
    } else {
        const slatCount = Math.max(3, Math.floor(svgHeight / 6));
        const slatHeight = svgHeight / slatCount;
        for (let i = 0; i < slatCount; i++) {
            slats += `<rect x="${x + 1}" y="${y + i * slatHeight + 0.5}" width="${svgWidth - 2}" height="${slatHeight - 1}" class="blind-slat" />`;
        }
    }

    const cordNode = _getAdjustmentCordSvg(item, { x, y, svgWidth });
    return `<svg viewBox="0 0 100 100">${slats}${lines}${cordNode}</svg>`;
}

/**
 *
 * @param item
 */
function _generateWoodenBlindSvg(item) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    if (width <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let slats = `<rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="blind-frame" />`;
    const slatCount = Math.max(3, Math.floor(svgHeight / 8));
    const slatHeight = svgHeight / slatCount;
    for (let i = 0; i < slatCount; i++) {
        slats += `<rect x="${x + 1}" y="${y + i * slatHeight}" width="${svgWidth - 2}" height="${slatHeight - 1.5}" rx="0.5" class="wooden-blind-slat" />`;
    }

    const stripWidth = Math.max(2, svgWidth * 0.05);
    const strip1_x = x + svgWidth * 0.25 - stripWidth / 2;
    const strip2_x = x + svgWidth * 0.75 - stripWidth / 2;
    const strips = `
        <rect x="${strip1_x}" y="${y}" width="${stripWidth}" height="${svgHeight}" class="wooden-blind-strip" />
        <rect x="${strip2_x}" y="${y}" width="${stripWidth}" height="${svgHeight}" class="wooden-blind-strip" />
    `;

    const cordNode = _getAdjustmentCordSvg(item, { x, y, svgWidth });
    return `<svg viewBox="0 0 100 100">${slats}${strips}${lines}${cordNode}</svg>`;
}

/**
 *
 * @param item
 */
function _generateRollerBlindSvg(item) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    if (width <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    const content = `
        <rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="roller-fabric" />
        <rect x="${x - 1}" y="${y - 4}" width="${svgWidth + 2}" height="5" rx="2" class="roller-roll" />
        <line x1="${x}" y1="${y + svgHeight}" x2="${x + svgWidth}" y2="${y + svgHeight}" class="roller-bar" />
    `;
    const cordNode = _getAdjustmentCordSvg(item, { x, y: y - 2, svgWidth });
    return `<svg viewBox="0 0 100 100">${content}${lines}${cordNode}</svg>`;
}

/**
 *
 * @param item
 * @param isPleated
 */
function _generatePartitionSvg(item, isPleated = false) {
    const width = toNum(item.width_m);
    const height = toNum(item.height_m);
    if (width <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width,
        height,
    });

    let content = "";
    if (isPleated) {
        content = `
            <defs>
                <pattern id="pleated-mesh" width="6" height="6" patternUnits="userSpaceOnUse">
                    <path d="M -1 1 L 1 -1 M 0 6 L 6 0" class="pleated-screen-mesh" />
                </pattern>
            </defs>
            <rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="blind-frame" />
            <rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" fill="url(#pleated-mesh)" />
        `;
    } else {
        const panelCount = Math.max(4, Math.floor(svgWidth / 10));
        const panelWidth = svgWidth / panelCount;
        for (let i = 0; i < panelCount; i++) {
            content += `<rect x="${x + i * panelWidth}" y="${y}" width="${panelWidth}" height="${svgHeight}" class="partition-panel" />`;
            if (i > 0)
                content += `<line x1="${x + i * panelWidth}" y1="${y}" x2="${x + i * panelWidth}" y2="${y + svgHeight}" class="partition-hinge" />`;
        }
    }
    const openingNode = _getOpeningIndicatorSvg(item, {
        x,
        y,
        svgWidth,
        svgHeight,
    });
    return `<svg viewBox="0 0 100 100">${content}${openingNode}${lines}</svg>`;
}

/**
 *
 * @param item
 */
function _generateWallpaperSvg(item) {
    const totalWidth = (item.widths || []).reduce(
        (sum, w) => sum + toNum(w),
        0
    );
    const height = toNum(item.height_m);
    if (totalWidth <= 0 || height <= 0)
        return `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">ไม่มีขนาด</text></svg>`;

    const { x, y, svgWidth, svgHeight, lines } = _getSvgFrame({
        width: totalWidth,
        height,
    });

    let pattern = "";
    const cols = Math.floor(svgWidth / 10);
    const rows = Math.floor(svgHeight / 10);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            pattern += `<circle cx="${x + c * 10 + 5}" cy="${y + r * 10 + 5}" r="1.5" class="wallpaper-pattern" />`;
        }
    }
    const content = `<rect x="${x}" y="${y}" width="${svgWidth}" height="${svgHeight}" class="blind-frame" /> ${pattern}`;
    return `<svg viewBox="0 0 100 100">${content}${lines}</svg>`;
}

/**
 *
 * @param item
 * @param roomId
 * @param itemIndex
 */
function _generateVisualPlaceholder(item, roomId, itemIndex) {
    let svgContent = "";
    let displayName = ITEM_TYPE_DISPLAY_NAMES[item.type] || "ของตกแต่ง";

    switch (item.type) {
        case "set":
            if (item.style === "ม่านพับ") {
                svgContent = _generateRomanBlindSvg(item);
            } else if (item.style === "หลุยส์") {
                svgContent = _generateLouisCurtainSvg(item);
                displayName =
                    ITEM_TYPE_DISPLAY_NAMES["set_louis"] || "ม่านหลุยส์";
            } else if (item.style === "ม่านแป๊บ") {
                svgContent = _generateRodPocketSvg(item);
            } else {
                svgContent = _generateStandardCurtainSvg(item);
            }
            break;
        case "wooden_blind":
            svgContent = _generateWoodenBlindSvg(item);
            break;
        case "aluminum_blind":
            svgContent = _generateBlindSvg(item, false);
            break;
        case "vertical_blind":
            svgContent = _generateBlindSvg(item, true);
            break;
        case "roller_blind":
            svgContent = _generateRollerBlindSvg(item);
            break;
        case "partition":
            svgContent = _generatePartitionSvg(item, false);
            break;
        case "pleated_screen":
            svgContent = _generatePartitionSvg(item, true);
            break;
        case "wallpaper":
            svgContent = _generateWallpaperSvg(item);
            break;
        case "custom": // [NEW] รูปภาพสำหรับรายการอื่นๆ
            svgContent = `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">รายการอื่นๆ</text></svg>`;
            displayName = ITEM_TYPE_DISPLAY_NAMES["custom"] || "รายการอื่นๆ";
            break;
        default:
            svgContent = `<svg viewBox="0 0 100 100"><text x="50" y="50" class="fallback-text">${sanitizeHTML(displayName)}</text></svg>`;
            break;
    }
    return `<div class="visual-placeholder is-clickable"
                 data-act="jump-to-item"
                 data-room-id="${roomId}"
                 data-item-index="${itemIndex}"
                 title="คลิกเพื่อไปยังรายการนี้">${svgContent}</div>`;
}

/**
 *
 * @param payload
 */
function _generateSimpleSummary(payload) {
    let summaryText = "\n📃 *สรุปรายการสินค้า*\n";
    let hasItems = false;
    payload.rooms.forEach((room) => {
        if (room.is_suspended || !room.items) return;
        const activeItems = room.items.filter((i) => {
            if (i.is_suspended) return false;

            // [FIXED BUG & NEW CUSTOM CHECK]
            if (
                i.type === "set" ||
                ITEM_CONFIG[i.type]?.templateId === "#areaBasedTpl"
            ) {
                return toNum(i.width_m) > 0;
            }
            if (i.type === "wallpaper") {
                return (i.widths || []).reduce((a, b) => a + toNum(b), 0) > 0;
            }
            if (i.type === "removal" || i.type === "custom") {
                return toNum(i.quantity) > 0;
            }
            return true;
        });

        if (activeItems.length === 0) return;

        hasItems = true;
        summaryText += `\n*🚪 ห้อง: ${room.room_name || "ไม่ระบุ"}*\n`;
        let itemCount = 0;
        activeItems.forEach((item) => {
            itemCount++;
            let displayName =
                ITEM_TYPE_DISPLAY_NAMES[item.type] || "สินค้าตกแต่ง";
            if (item.type === "set") {
                if (item.style === "หลุยส์") {
                    displayName =
                        ITEM_TYPE_DISPLAY_NAMES["set_louis"] || "ม่านหลุยส์";
                    summaryText += ` ${itemCount}) ${displayName} (${item.fabric_variant || ""})\n`;
                } else {
                    summaryText += ` ${itemCount}) ${displayName} ${item.style || ""} (${item.fabric_variant || ""})\n`;
                }
            } else {
                // [MODIFIED] Custom Item logic
                if (item.type === "custom") {
                    summaryText += ` ${itemCount}) ${sanitizeHTML(item.description) || displayName}`;
                } else {
                    summaryText += ` ${itemCount}) ${displayName}`;
                }

                if (item.type === "removal" || item.type === "custom") {
                    summaryText += ` (${toNum(item.quantity)} หน่วย)`;
                }
                summaryText += `\n`;
            }
            if (item.notes) {
                summaryText += `  > _${sanitizeHTML(item.notes)}_\n`;
            }
        });
    });

    return hasItems ? summaryText + "------------------------------\n" : "";
}

/**
 *
 * @param payload
 */
export function calculateSubTotal(payload) {
    const raw = payload.rooms.reduce((roomSum, room) => {
        if (room.is_suspended) return roomSum;

        const itemsTotal =
            room.items?.reduce((itemSum, item) => {
                if (item.is_suspended) return itemSum;

                switch (item.type) {
                    case "set":
                        return itemSum + CALC.calculateSetPrice(item).total;
                    case "wallpaper":
                        return (
                            itemSum + CALC.calculateWallpaperPrice(item).total
                        );
                    case "removal":
                        return itemSum + CALC.calculateRemovalPrice(item).total;
                    case "custom": // [NEW]
                        // ป้องกัน Error หากไฟล์ calculations.js ยังไม่อัปเดต
                        return (
                            itemSum +
                            (CALC.calculateCustomPrice
                                ? CALC.calculateCustomPrice(item).total
                                : toNum(item.quantity || 1) *
                                  toNum(item.price_per_item))
                        );
                    default:
                        if (
                            ITEM_CONFIG[item.type]?.templateId ===
                            "#areaBasedTpl"
                        ) {
                            return (
                                itemSum +
                                CALC.calculateAreaBasedPrice(item).total
                            );
                        }
                        return itemSum;
                }
            }, 0) || 0;

        return roomSum + itemsTotal;
    }, 0);
    return Math.round(raw * 100) / 100;
}

/**
 *
 * @param payload
 * @param type
 */
export function generateSummaryText(payload, type) {
    const SHOP_CONFIG = getShopConfig();

    const subTotal = calculateSubTotal(payload);
    let discountAmount = 0;
    let discountText = "";

    if (payload.discount && payload.discount.value > 0) {
        if (payload.discount.type === "percent") {
            discountAmount = Math.round(subTotal * (payload.discount.value / 100));
            discountText = `🏷️ ส่วนลด (${payload.discount.value}%): -${fmtTH(discountAmount)} บาท\n`;
        } else {
            discountAmount = payload.discount.value;
            discountText = `🏷️ ส่วนลด: -${fmtTH(discountAmount)} บาท\n`;
        }
    }
    const grandTotal = Math.round((subTotal - discountAmount) * 100) / 100;

    let text = `🗓️ สรุปข้อมูล (${new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })})\n`;
    text += `👤 ลูกค้า: ${payload.customer_name || "-"}\n`;
    if (type === "customer" || type === "owner") {
        text += `📞 โทร: ${payload.customer_phone || "-"}\n`;
        text += `🏠 ที่อยู่: ${payload.customer_address || "-"}\n`;
    }
    text += "------------------------------\n";

    switch (type) {
        case "customer":
            text += _generateSimpleSummary(payload);
            if (discountAmount > 0) {
                text += `\nยอดรวม: ${fmtTH(subTotal)} บาท\n`;
                text += discountText;
            }
            text += `\n💰 *ยอดสุทธิ: ${fmtTH(grandTotal)} บาท*\n`;
            text += `\nขอบคุณที่ใช้บริการค่ะ\n${SHOP_CONFIG.name}\nโทร: ${SHOP_CONFIG.phone}`;
            return text;

        case "purchase_order":
        case "owner":
            {
                if (type === "owner") {
                    text += _generateSimpleSummary(payload);
                }

                const materials = {
                    opaqueFabrics: [],
                    sheerFabrics: [],
                    wallpapers: [],
                    removals: [],
                    customs: [], // [NEW]
                    allSets: [],
                };

                payload.rooms.forEach((room) => {
                    if (room.is_suspended || !room.items) return;
                    room.items.forEach((item) => {
                        let isValid = !item.is_suspended;
                        if (
                            item.type === "set" ||
                            ITEM_CONFIG[item.type]?.templateId ===
                                "#areaBasedTpl"
                        ) {
                            isValid =
                                isValid &&
                                toNum(item.width_m) > 0 &&
                                toNum(item.height_m) > 0;
                        } else if (item.type === "wallpaper") {
                            const totalWidth = (item.widths || []).reduce(
                                (a, b) => a + toNum(b),
                                0
                            );
                            isValid =
                                isValid &&
                                totalWidth > 0 &&
                                toNum(item.height_m) > 0;
                        } else if (item.type === "custom") {
                            isValid =
                                isValid &&
                                toNum(item.quantity) > 0 &&
                                toNum(item.price_per_item) > 0;
                        }
                        if (!isValid) return;

                        switch (item.type) {
                            case "set":
                                materials.allSets.push(item);
                                if (item.fabric_variant.includes("ทึบ")) {
                                    materials.opaqueFabrics.push({
                                        code: item.fabric_code || "??",
                                        yards: CALC.fabricYardage(
                                            item.style,
                                            item.width_m
                                        ),
                                        notes: item.notes,
                                    });
                                }
                                if (item.fabric_variant.includes("โปร่ง")) {
                                    materials.sheerFabrics.push({
                                        code: item.sheer_fabric_code || "??",
                                        yards: CALC.fabricYardage(
                                            item.style,
                                            item.width_m
                                        ),
                                        notes: item.notes,
                                    });
                                }
                                break;
                            case "wallpaper": {
                                const totalWidth = (item.widths || []).reduce(
                                    (a, b) => a + toNum(b),
                                    0
                                );
                                const rolls = CALC.wallpaperRolls(
                                    totalWidth,
                                    item.height_m
                                );
                                if (rolls > 0) {
                                    materials.wallpapers.push({
                                        code: item.wallpaper_code || "xxx",
                                        rolls: rolls,
                                        notes: item.notes,
                                    });
                                }
                                break;
                            }
                            case "removal":
                                materials.removals.push({
                                    ...item,
                                    total: CALC.calculateRemovalPrice(item)
                                        .total,
                                });
                                break;
                            case "custom": // [NEW]
                                materials.customs.push({
                                    ...item,
                                    total: CALC.calculateCustomPrice
                                        ? CALC.calculateCustomPrice(item).total
                                        : toNum(item.quantity || 1) *
                                          toNum(item.price_per_item),
                                });
                                break;
                            default:
                                if (
                                    ITEM_CONFIG[item.type]?.templateId ===
                                    "#areaBasedTpl"
                                ) {
                                    const itemTypeKey = item.type;
                                    if (!materials[itemTypeKey]) {
                                        materials[itemTypeKey] = [];
                                    }
                                    materials[itemTypeKey].push({
                                        code: item.code || "xxx",
                                        width: toNum(item.width_m),
                                        height: toNum(item.height_m),
                                        opening_style: item.opening_style,
                                        adjustment_side: item.adjustment_side,
                                        notes: item.notes,
                                    });
                                }
                                break;
                        }
                    });
                });

                const fabricTotals = {};
                [...materials.opaqueFabrics, ...materials.sheerFabrics].forEach(
                    (f) => {
                        if (f.yards > 0) {
                            fabricTotals[f.code] =
                                (fabricTotals[f.code] || 0) + f.yards;
                        }
                    }
                );

                if (Object.keys(fabricTotals).length > 0) {
                    text += "✂️ *รายการสั่งซื้อ (ผ้า)*\n";
                    text += "------------------------------\n";
                    materials.opaqueFabrics
                        .filter((f) => f.yards > 0)
                        .forEach((f, i) => {
                            text += `- ผ้าทึบ (Curtain) #${i + 1}\n`;
                            text += `  รหัส: #${f.code || "??"}\n`;
                            text += `  จำนวน: ${f.yards.toFixed(2)} หลา\n`;
                            if (f.notes) {
                                text += `  📝 หมายเหตุ: ${f.notes}\n`;
                            }
                            text += `\n`;
                        });
                    materials.sheerFabrics
                        .filter((f) => f.yards > 0)
                        .forEach((f, i) => {
                            text += `- ผ้าโปร่ง (Sheer) #${i + 1}\n`;
                            text += `  รหัส: #${f.code || "??"}\n`;
                            text += `  จำนวน: ${f.yards.toFixed(2)} หลา\n`;
                            if (f.notes) {
                                text += `  📝 หมายเหตุ: ${f.notes}\n`;
                            }
                            text += `\n`;
                        });
                    text += "------------------------------\n";
                    text += "📊 *สรุปยอดรวมผ้า (ตามรหัส)*\n";
                    text += "------------------------------\n";
                    for (const [code, totalYards] of Object.entries(
                        fabricTotals
                    )) {
                        text += `  - รหัส #${code}: ${totalYards.toFixed(2)} หลา\n`;
                    }
                    text += "\n";
                }

                // --- Track/Rod Summary ---
                const louisSets = materials.allSets.filter(
                    (s) => s.style === "หลุยส์"
                );
                const romanBlindSets = materials.allSets.filter(
                    (s) => s.style === "ม่านพับ"
                );
                const grommetSets = materials.allSets.filter(
                    (s) => s.style === "ตาไก่"
                );
                const rodPocketSets = materials.allSets.filter(
                    (s) => s.style === "ม่านแป๊บ"
                );
                const otherSets = materials.allSets.filter(
                    (s) =>
                        !["ม่านพับ", "ตาไก่", "หลุยส์", "ม่านแป๊บ"].includes(
                            s.style
                        )
                );

                if (louisSets.length > 0) {
                    text += "------------------------------\n";
                    text += "👑 *รายการสั่งซื้อ ราง (หลุยส์)*\n";
                    text += "------------------------------\n\n";
                    let louisSetCounter = 1;
                    louisSets.forEach((set) => {
                        text += `(${louisSetCounter++}) ราง ${set.style}, สี: ${set.track_color || HARDWARE_DEFAULTS.track_color}\n`;
                        text += `  - รางหลัก (ทึบ/โปร่ง): ${Number(set.width_m).toFixed(2)} ม.\n`;
                        text += `  - หัวหลุยส์: ${set.louis_valance || HARDWARE_DEFAULTS.louis_valance}\n`;
                        text += `  - พู่: ${set.louis_tassels || HARDWARE_DEFAULTS.louis_tassels}\n`;
                        if (set.notes) {
                            text += `  📝 หมายเหตุ: ${set.notes}\n`;
                        }
                        text += `\n`;
                    });
                    const louisTrackLengths = [];
                    louisSets.forEach((set) => {
                        louisTrackLengths.push(Number(set.width_m));
                        if (set.fabric_variant === "ทึบ&โปร่ง") {
                            louisTrackLengths.push(Number(set.width_m));
                        }
                    });
                    const louisLengthCounts = louisTrackLengths.reduce(
                        (acc, length) => {
                            const key = length.toFixed(2);
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                        },
                        {}
                    );
                    const louisSortedCounts = Object.entries(
                        louisLengthCounts
                    ).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                    if (louisSortedCounts.length > 0) {
                        text += "--- สรุปยอดรวมรางหลุยส์ ---\n";
                        text += "*จำนวนรางที่ต้องตัด (โดยประมาณ):*\n";
                        for (const [length, count] of louisSortedCounts)
                            text += `  - ขนาด ${length} ม. = ${count} เส้น\n`;
                        text += "\n";
                    }
                }

                if (romanBlindSets.length > 0) {
                    text += "------------------------------\n";
                    text += "📏 *รายการสั่งซื้อ รางม่านพับ*\n";
                    text += "------------------------------\n\n";
                    let romanSetCounter = 1;
                    romanBlindSets.forEach((set) => {
                        text += `(${romanSetCounter++}) รางม่านพับ\n`;
                        text += `  - ขนาด: ${Number(set.width_m).toFixed(2)} ม.\n`;
                        text += `  - สีราง: ${set.track_color || HARDWARE_DEFAULTS.track_color}\n`;
                        text += `  - เชือกปรับ: ${set.adjustment_side || "ปรับขวา"}\n`;
                        if (set.notes) {
                            text += `  📝 หมายเหตุ: ${set.notes}\n`;
                        }
                        text += `\n`;
                    });
                    const romanLengthCounts = romanBlindSets.reduce(
                        (acc, set) => {
                            const key = Number(set.width_m).toFixed(2);
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                        },
                        {}
                    );
                    const romanSortedCounts = Object.entries(
                        romanLengthCounts
                    ).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                    if (romanSortedCounts.length > 0) {
                        text += "--- สรุปยอดรวมรางม่านพับ ---\n";
                        text += "*จำนวนรางที่ต้องตัด:*\n";
                        for (const [length, count] of romanSortedCounts)
                            text += `  - ขนาด ${length} ม. = ${count} เส้น\n`;
                        text += "\n";
                    }
                }

                if (otherSets.length > 0) {
                    text += "------------------------------\n";
                    text += "📏 *รายการสั่งซื้อ ราง (ลอน/จีบ)*\n";
                    text += "------------------------------\n\n";
                    let trackSetCounter = 1;
                    otherSets.forEach((set) => {
                        text += `(${trackSetCounter++}) ราง ${set.style}, สี: ${set.track_color || HARDWARE_DEFAULTS.track_color}\n`;
                        if (set.fabric_variant.includes("ทึบ")) {
                            text += `  - รางทึบ: ${Number(set.width_m).toFixed(2)} ม.\n`;
                        }
                        if (set.fabric_variant.includes("โปร่ง")) {
                            text += `  - รางโปร่ง: ${Number(set.width_m).toFixed(2)} ม.\n`;
                        }
                        if (set.notes) {
                            text += `  📝 หมายเหตุ: ${set.notes}\n`;
                        }
                        text += `\n`;
                    });
                    const otherTrackLengths = [];
                    otherSets.forEach((set) => {
                        if (set.fabric_variant.includes("ทึบ"))
                            otherTrackLengths.push(Number(set.width_m));
                        if (set.fabric_variant.includes("โปร่ง"))
                            otherTrackLengths.push(Number(set.width_m));
                    });
                    const otherLengthCounts = otherTrackLengths.reduce(
                        (acc, length) => {
                            const key = length.toFixed(2);
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                        },
                        {}
                    );
                    const otherSortedCounts = Object.entries(
                        otherLengthCounts
                    ).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                    if (otherSortedCounts.length > 0) {
                        text += "--- สรุปยอดรวมรางลอน/จีบ ---\n";
                        text += "*จำนวนรางที่ต้องตัด:*\n";
                        for (const [length, count] of otherSortedCounts)
                            text += `  - ขนาด ${length} ม. = ${count} เส้น\n`;
                        text += "\n";
                    }
                }

                if (grommetSets.length > 0) {
                    text += "------------------------------\n";
                    text += "📏 *รายการสั่งซื้อ ราง (ตาไก่)*\n";
                    text += "------------------------------\n\n";
                    let grommetSetCounter = 1;
                    grommetSets.forEach((set) => {
                        text += `(${grommetSetCounter++}) ราง ${set.style}, สี: ${set.track_color || HARDWARE_DEFAULTS.track_color}\n`;
                        if (set.fabric_variant.includes("ทึบ")) {
                            text += `  - รางทึบ: ${Number(set.width_m).toFixed(2)} ม.\n`;
                        }
                        if (set.fabric_variant.includes("โปร่ง")) {
                            text += `  - รางโปร่ง: ${Number(set.width_m).toFixed(2)} ม.\n`;
                        }
                        if (set.notes) {
                            text += `  📝 หมายเหตุ: ${set.notes}\n`;
                        }
                        text += `\n`;
                    });
                    text += "--- สรุปยอดรวมรางตาไก่ ---\n";
                    const grommetRodLengths = [];
                    grommetSets.forEach((set) => {
                        if (set.fabric_variant.includes("ทึบ"))
                            grommetRodLengths.push(Number(set.width_m));
                        if (set.fabric_variant.includes("โปร่ง"))
                            grommetRodLengths.push(Number(set.width_m));
                    });
                    const STOCK_ROD_LENGTH = 6.0;
                    grommetRodLengths.sort((a, b) => b - a);
                    const bins = [];
                    for (const length of grommetRodLengths) {
                        let placed = false;
                        for (let i = 0; i < bins.length; i++) {
                            if (bins[i] >= length - 0.001) {
                                bins[i] -= length;
                                placed = true;
                                break;
                            }
                        }
                        if (!placed) {
                            bins.push(STOCK_ROD_LENGTH - length);
                        }
                    }
                    text += `ใช้รางเต็ม (6 ม.) ทั้งหมด: *${bins.length} เส้น*\n\n`;
                    const lengthCounts = grommetRodLengths.reduce(
                        (acc, length) => {
                            const key = length.toFixed(2);
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                        },
                        {}
                    );
                    const sortedCounts = Object.entries(lengthCounts).sort(
                        (a, b) => parseFloat(b[0]) - parseFloat(a[0])
                    );
                    if (sortedCounts.length > 0) {
                        text += "*สรุปจำนวนรางที่ต้องตัด:*\n";
                        for (const [length, count] of sortedCounts)
                            text += `  - ขนาด ${length} ม. = ${count} เส้น\n`;
                        text += "\n";
                    }
                }

                if (rodPocketSets.length > 0) {
                    text += "------------------------------\n";
                    text += "📏 *รายการสั่งซื้อ ราง (ม่านแป๊บ)*\n";
                    text += "------------------------------\n\n";
                    let rodPocketCounter = 1;
                    rodPocketSets.forEach((set) => {
                        text += `(${rodPocketCounter++}) ราง ${set.style}, สี: ${set.track_color || HARDWARE_DEFAULTS.track_color}\n`;
                        text += `  - ราง: ${Number(set.width_m).toFixed(2)} ม.\n`;
                        if (set.notes) {
                            text += `  📝 หมายเหตุ: ${set.notes}\n`;
                        }
                        text += `\n`;
                    });

                    const rodPocketLengths = rodPocketSets.map((set) =>
                        Number(set.width_m)
                    );
                    const rodPocketLengthCounts = rodPocketLengths.reduce(
                        (acc, length) => {
                            const key = length.toFixed(2);
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                        },
                        {}
                    );
                    const rodPocketSortedCounts = Object.entries(
                        rodPocketLengthCounts
                    ).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
                    if (rodPocketSortedCounts.length > 0) {
                        text += "--- สรุปยอดรวมรางม่านแป๊บ ---\n";
                        text += "*จำนวนรางที่ต้องตัด:*\n";
                        for (const [length, count] of rodPocketSortedCounts)
                            text += `  - ขนาด ${length} ม. = ${count} เส้น\n`;
                        text += "\n";
                    }
                }

                // --- Hardware Summary ---
                const hardware_summary = {};
                let louisTassels = {};

                materials.allSets.forEach((set) => {
                    const trackColor =
                        set.track_color || HARDWARE_DEFAULTS.track_color;

                    const w = toNum(set.width_m);
                    const style = set.style;
                    const isDouble = set.fabric_variant === "ทึบ&โปร่ง";

                    let bracketCount = 0;

                    if (style === "ตาไก่") {
                        bracketCount = w >= 1.6 ? 3 : 2;
                    } else if (style === "ลอน" || style === "จีบ") {
                        bracketCount = Math.round(w / 0.8) + 1;
                    }

                    if (!hardware_summary[trackColor]) {
                        hardware_summary[trackColor] = {
                            brackets: {},
                            finials: 0,
                            grommets: {},
                            rodPocketBrackets: 0,
                        };
                    }

                    if (!hardware_summary[trackColor].brackets[style]) {
                        hardware_summary[trackColor].brackets[style] = {
                            single: 0,
                            double: 0,
                        };
                    }

                    if (bracketCount > 0) {
                        if (isDouble) {
                            hardware_summary[trackColor].brackets[
                                style
                            ].double += bracketCount;
                        } else {
                            hardware_summary[trackColor].brackets[
                                style
                            ].single += bracketCount;
                        }
                    } else if (style === "ม่านแป๊บ") {
                        hardware_summary[trackColor].rodPocketBrackets += 4;
                    }

                    if (style === "ตาไก่") {
                        const finialCount = isDouble ? 4 : 2;
                        hardware_summary[trackColor].finials += finialCount;
                    }

                    if (style === "ตาไก่") {
                        const grommetColor =
                            set.grommet_color ||
                            HARDWARE_DEFAULTS.grommet_color;
                        const grommetCount = CALC.calculateGrommets(set);
                        if (
                            !hardware_summary[trackColor].grommets[grommetColor]
                        ) {
                            hardware_summary[trackColor].grommets[
                                grommetColor
                            ] = 0;
                        }
                        hardware_summary[trackColor].grommets[grommetColor] +=
                            grommetCount;
                    }

                    if (style === "หลุยส์") {
                        const tasselType =
                            set.louis_tassels ||
                            HARDWARE_DEFAULTS.louis_tassels;
                        if (tasselType !== "ไม่มี") {
                            louisTassels[tasselType] =
                                (louisTassels[tasselType] || 0) + 2;
                        }
                    }
                });

                const totalStandardTiebackHooks =
                    materials.allSets.filter(
                        (s) =>
                            !["ม่านพับ", "หลุยส์", "ม่านแป๊บ"].includes(s.style)
                    ).length * 2;

                const hasStandardBrackets = Object.values(
                    hardware_summary
                ).some((data) =>
                    Object.values(data.brackets).some(
                        (bData) => bData.single > 0 || bData.double > 0
                    )
                );
                const hasRodPocketBrackets = Object.values(
                    hardware_summary
                ).some((data) => data.rodPocketBrackets > 0);
                const hasFinials = Object.values(hardware_summary).some(
                    (data) => data.finials > 0
                );
                const hasGrommets = Object.values(hardware_summary).some(
                    (data) =>
                        Object.values(data.grommets).some((count) => count > 0)
                );
                const hasLouisTassels = Object.keys(louisTassels).length > 0;
                const hasAnyHardware =
                    hasStandardBrackets ||
                    hasRodPocketBrackets ||
                    hasFinials ||
                    hasGrommets ||
                    totalStandardTiebackHooks > 0 ||
                    hasLouisTassels;

                if (hasAnyHardware) {
                    text += "------------------------------\n";
                    text += "🔩 *รายการสั่งซื้อ อุปกรณ์ (Hardware)*\n";
                    text += "------------------------------\n\n";

                    for (const [color, data] of Object.entries(
                        hardware_summary
                    )) {
                        let colorHasItems = false;
                        let colorText = `**สี${color}**\n`;

                        const bracketStyles = Object.keys(data.brackets);
                        if (bracketStyles.length > 0) {
                            let bracketText = "";
                            bracketStyles.forEach((style) => {
                                if (
                                    !["ม่านพับ", "หลุยส์", "ม่านแป๊บ"].includes(
                                        style
                                    ) &&
                                    (data.brackets[style].single > 0 ||
                                        data.brackets[style].double > 0)
                                ) {
                                    bracketText += `    - ${style} (ชั้นเดียว): ${data.brackets[style].single} ตัว\n`;
                                    bracketText += `    - ${style} (2ชั้น): ${data.brackets[style].double} ตัว\n`;
                                }
                            });
                            if (bracketText) {
                                colorHasItems = true;
                                colorText += `  - ขาจับ (มาตรฐาน):\n${bracketText}`;
                            }
                        }

                        if (data.rodPocketBrackets > 0) {
                            colorHasItems = true;
                            colorText += `  - ขาจับ (ม่านแป๊บ): ${data.rodPocketBrackets} ตัว\n`;
                        }

                        if (data.finials > 0) {
                            colorHasItems = true;
                            colorText += `  - หัวราง (ตาไก่): ${data.finials} ตัว\n`;
                        }

                        const grommetColors = Object.keys(data.grommets);
                        if (grommetColors.length > 0) {
                            let grommetText = "";
                            grommetColors.forEach((gColor) => {
                                const count = data.grommets[gColor];
                                if (count > 0) {
                                    grommetText += `    - สี${gColor}: ${count} ตัว\n`;
                                }
                            });
                            if (grommetText) {
                                colorHasItems = true;
                                colorText += `  - ตาไก่:\n${grommetText}`;
                            }
                        }

                        if (colorHasItems) {
                            text += colorText + "\n";
                        }
                    }

                    let accessoryText = "";
                    if (totalStandardTiebackHooks > 0) {
                        accessoryText += `  - ตะขอรวบม่าน (มาตรฐาน): ${totalStandardTiebackHooks} ตัว\n`;
                    }
                    if (hasLouisTassels) {
                        accessoryText += `  - พู่/สายรวบ (หลุยส์):\n`;
                        for (const [tasselType, count] of Object.entries(
                            louisTassels
                        )) {
                            accessoryText += `    - ${tasselType}: ${count} ชุด\n`;
                        }
                    }
                    if (accessoryText) {
                        text += "**อุปกรณ์รวม**\n" + accessoryText + "\n";
                    }
                }

                const otherItemTypes = Object.keys(materials).filter(
                    (k) =>
                        ![
                            "opaqueFabrics",
                            "sheerFabrics",
                            "wallpapers",
                            "removals",
                            "customs", // [NEW]
                            "allSets",
                        ].includes(k)
                );
                if (otherItemTypes.length > 0) {
                    otherItemTypes.sort().forEach((itemType) => {
                        const items = materials[itemType];
                        const displayName =
                            ITEM_TYPE_DISPLAY_NAMES[itemType] || itemType;
                        text += "------------------------------\n";
                        text += `📦 *รายการสั่งซื้อ ${displayName}*\n`;
                        text += "------------------------------\n\n";
                        items.forEach((d) => {
                            text += `- รหัส: #${d.code || "xxx"}\n  ขนาด: ${d.width.toFixed(2)} x ${d.height.toFixed(2)} ม.\n`;
                            if (d.opening_style) {
                                text += `  รูปแบบเปิด: ${d.opening_style}\n`;
                            }
                            if (d.adjustment_side) {
                                text += `  เชือกปรับ: ${d.adjustment_side}\n`;
                            }
                            if (d.notes) {
                                text += `  📝 หมายเหตุ: ${d.notes}\n`;
                            }
                            text += `\n`;
                        });
                    });
                }

                const wallpaperTotals = {};
                materials.wallpapers.forEach((w) => {
                    wallpaperTotals[w.code] =
                        (wallpaperTotals[w.code] || 0) + w.rolls;
                });

                if (Object.keys(wallpaperTotals).length > 0) {
                    text += "------------------------------\n";
                    text += "🎨 *รายการสั่งซื้อ (Wallpaper)*\n";
                    text += "------------------------------\n\n";
                    materials.wallpapers.forEach((w, i) => {
                        text += `  - รายการ #${i + 1}\n`;
                        text += `    รหัส: #${w.code || "xxx"}\n`;
                        text += `    จำนวน: ${w.rolls} ม้วน\n`;
                        if (w.notes) {
                            text += `    📝 หมายเหตุ: ${w.notes}\n`;
                        }
                        text += `\n`;
                    });

                    if (Object.keys(wallpaperTotals).length > 1) {
                        text += "--- สรุปยอดรวมวอลล์ ---\n";
                        for (const [code, totalRolls] of Object.entries(
                            wallpaperTotals
                        )) {
                            text += `  - รหัส #${code}: ${totalRolls} ม้วน\n`;
                        }
                        text += "\n";
                    }
                }

                if (materials.removals.length > 0) {
                    text += "------------------------------\n";
                    text += "📦 *รายการรื้อถอนของเก่า*\n";
                    text += "------------------------------\n\n";
                    materials.removals.forEach((item, i) => {
                        text += `  - รายการ #${i + 1}: ${
                            sanitizeHTML(item.description) || "ไม่ระบุ"
                        }\n`;
                        text += `    จำนวน: ${toNum(item.quantity)} ชุด\n`;
                        text += `    ราคาเหมา: ${fmtTH(item.total)} บาท\n`;
                        if (item.notes) {
                            text += `    📝 หมายเหตุ: ${item.notes}\n`;
                        }
                        text += `\n`;
                    });
                }

                // [NEW] Custom Items Summary
                if (materials.customs.length > 0) {
                    text += "------------------------------\n";
                    text += "📦 *รายการอื่นๆ / บริการเพิ่มเติม*\n";
                    text += "------------------------------\n\n";
                    materials.customs.forEach((item, i) => {
                        text += `  - รายการ #${i + 1}: ${sanitizeHTML(item.description) || "ไม่ระบุ"}\n`;
                        text += `    จำนวน: ${toNum(item.quantity)} หน่วย\n`;
                        text += `    ราคารวม: ${fmtTH(item.total)} บาท\n`;
                        if (item.notes) {
                            text += `    📝 หมายเหตุ: ${item.notes}\n`;
                        }
                        text += `\n`;
                    });
                }

                if (type === "purchase_order") {
                    text += "------------------------------\n";
                    return text;
                }
            }
            break;
    }

    if (type === "seamstress" || type === "owner") {
        text += "\n🧵 *รายละเอียดสำหรับช่างเย็บผ้า*\n";

        let roomCount = 0;
        payload.rooms.forEach((room) => {
            if (room.is_suspended || !room.items) return;
            const activeSets = room.items.filter(
                (s) =>
                    s.type === "set" &&
                    !s.is_suspended &&
                    toNum(s.width_m) > 0 &&
                    toNum(s.height_m) > 0
            );
            if (activeSets.length === 0) return;

            if (roomCount > 0) text += "==============================\n";

            text += `\n*🚪 ห้อง: ${room.room_name || "ไม่ระบุ"}*\n\n`;
            activeSets.forEach((s, itemIndex) => {
                if (itemIndex > 0) text += "--------------------\n";
                const styleName =
                    s.style === "หลุยส์"
                        ? ITEM_TYPE_DISPLAY_NAMES["set_louis"] || "ม่านหลุยส์"
                        : s.style;
                text += `*ชุดที่ ${itemIndex + 1}/${activeSets.length}: ${styleName} ${s.fabric_variant}*\n`;

                if (s.style === "ม่านพับ") {
                    text += `  - เชือกปรับ: ${s.adjustment_side || "ปรับขวา"}\n`;
                } else if (s.style === "หลุยส์") {
                    text += `  - หัวหลุยส์: ${s.louis_valance || HARDWARE_DEFAULTS.louis_valance}\n`;
                    text += `  - พู่: ${s.louis_tassels || HARDWARE_DEFAULTS.louis_tassels}\n`;
                } else if (s.style !== "ม่านแป๊บ") {
                    text += `  - รูปแบบเปิด: ${s.opening_style || "แยกกลาง"}\n`;
                }

                if (s.style === "หลุยส์") {
                    if (s.fabric_variant.includes("ทึบ"))
                        text += `  - ผ้าฐาน (ทึบ): #${s.fabric_code || "-"}\n`;
                    if (s.fabric_variant.includes("โปร่ง"))
                        text += `  - ผ้าฐาน (โปร่ง): #${s.sheer_fabric_code || "-"}\n`;
                } else {
                    if (s.fabric_variant.includes("ทึบ"))
                        text += `  - ผ้าทึบ: #${s.fabric_code || "-"}\n`;
                    if (s.fabric_variant.includes("โปร่ง"))
                        text += `  - ผ้าโปร่ง: #${s.sheer_fabric_code || "-"}\n`;
                }

                text += `  - ขนาด: กว้าง ${Number(s.width_m).toFixed(2)} x สูง ${Number(s.height_m).toFixed(2)} ม.\n`;
                if (s.notes) {
                    text += `  📝 หมายเหตุ: ${s.notes}\n`;
                }
            });
            text += "\n";
            roomCount++;
        });

        if (roomCount > 0) text += "==============================\n";
        else text += "ไม่มีรายการสำหรับช่าง\n------------------------------\n";

        if (type === "seamstress") return text;
    }

    if (type === "owner") {
        text += `\n💰 *สรุปยอดรวม: ${fmtTH(grandTotal)} บาท*\n`;
        if (discountAmount > 0) {
            text += `   (ยอดก่อนลด: ${fmtTH(subTotal)} บาท ${discountText.trim()})\n`;
        }
    }

    return text;
}

/**
 *
 * @param payload
 */
export function generateOverviewHtml(payload) {
    if (!payload.rooms || payload.rooms.length === 0) {
        return '<p class="empty-summary">ไม่มีข้อมูลสำหรับแสดงผล</p>';
    }

    let finalHtml = "";
    const grandTotalSummary = {};
    let totalItemsPriced = 0;

    payload.rooms.forEach((room) => {
        if (room.is_suspended || !room.items) return;
        room.items.forEach((item) => {
            if (item.is_suspended) return;
            let key = null;
            let price = 0;
            switch (item.type) {
                case "set":
                    price = CALC.calculateSetPrice(item).total;
                    if (price > 0) {
                        key = item.style === "หลุยส์" ? "set_louis" : "set";
                    }
                    break;
                case "wallpaper":
                    price = CALC.calculateWallpaperPrice(item).total;
                    if (price > 0) key = item.type;
                    break;
                case "removal":
                    price = CALC.calculateRemovalPrice(item).total;
                    if (price > 0) key = item.type;
                    break;
                case "custom": // [NEW]
                    price = CALC.calculateCustomPrice
                        ? CALC.calculateCustomPrice(item).total
                        : toNum(item.quantity || 1) *
                          toNum(item.price_per_item);
                    if (price > 0) key = item.type;
                    break;
                default:
                    if (
                        ITEM_CONFIG[item.type]?.templateId === "#areaBasedTpl"
                    ) {
                        price = CALC.calculateAreaBasedPrice(item).total;
                        if (price > 0) key = item.type;
                    }
                    break;
            }
            if (key) {
                grandTotalSummary[key] = (grandTotalSummary[key] || 0) + 1;
                totalItemsPriced++;
            }
        });
    });

    if (totalItemsPriced > 0) {
        const summaryTags = Object.entries(grandTotalSummary)
            .map(([typeKey, count]) => {
                const displayName =
                    ITEM_TYPE_DISPLAY_NAMES[typeKey] ||
                    ITEM_TYPE_DISPLAY_NAMES[typeKey.split("_")[0]] ||
                    "ของตกแต่ง";
                return `
                <span class="summary-tag" data-filter-type="${sanitizeHTML(typeKey)}" title="คลิกเพื่อกรองเฉพาะรายการนี้">
                    ${sanitizeHTML(displayName)} <strong>${count}</strong>
                </span>`;
            })
            .join("");

        if (summaryTags) {
            finalHtml += `
                <div class="overview-summary-group">
                    <h4><i class="ph ph-stack"></i> สรุปประเภทรายการ</h4>
                    <div class="summary-tags-container">
                        ${summaryTags}
                    </div>
                </div>`;
        }
    }

    let roomCardsHtml = "";
    let grandTotalItemsInRooms = 0;
    payload.rooms.forEach((room) => {
        if (room.is_suspended || !room.items) return;

        const roomSummary = {};
        let roomItemCountPriced = 0;
        room.items.forEach((item) => {
            if (item.is_suspended) return;
            let key = null;
            let price = 0;
            switch (item.type) {
                case "set":
                    price = CALC.calculateSetPrice(item).total;
                    if (price > 0) {
                        key = item.style === "หลุยส์" ? "set_louis" : "set";
                    }
                    break;
                case "wallpaper":
                    price = CALC.calculateWallpaperPrice(item).total;
                    if (price > 0) key = item.type;
                    break;
                case "removal":
                    price = CALC.calculateRemovalPrice(item).total;
                    if (price > 0) key = item.type;
                    break;
                case "custom": // [NEW]
                    price = CALC.calculateCustomPrice
                        ? CALC.calculateCustomPrice(item).total
                        : toNum(item.quantity || 1) *
                          toNum(item.price_per_item);
                    if (price > 0) key = item.type;
                    break;
                default:
                    if (
                        ITEM_CONFIG[item.type]?.templateId === "#areaBasedTpl"
                    ) {
                        price = CALC.calculateAreaBasedPrice(item).total;
                        if (price > 0) key = item.type;
                    }
                    break;
            }
            if (key) {
                roomSummary[key] = (roomSummary[key] || 0) + 1;
                roomItemCountPriced++;
            }
        });

        if (roomItemCountPriced > 0) {
            grandTotalItemsInRooms += roomItemCountPriced;
            const roomItemsHtml = Object.entries(roomSummary)
                .map(([typeKey, count]) => {
                    const displayName =
                        ITEM_TYPE_DISPLAY_NAMES[typeKey] ||
                        ITEM_TYPE_DISPLAY_NAMES[typeKey.split("_")[0]] ||
                        "ของตกแต่ง";
                    return `
                    <div class="overview-item">
                        <span>${sanitizeHTML(displayName)}</span>
                        <span>${count}</span>
                    </div>`;
                })
                .join("");

            roomCardsHtml += `
                <details class="overview-room-card">
                    <summary class="overview-room-summary">
                        <span class="room-name">${sanitizeHTML(room.room_name) || "ไม่ระบุชื่อห้อง"}</span>
                        <div class="summary-tags">
                            <span class="room-item-count">${roomItemCountPriced} รายการ</span>
                            <i class="ph ph-caret-down expand-icon"></i>
                        </div>
                    </summary>
                    <div class="overview-room-items">${roomItemsHtml}</div>
                </details>`;
        }
    });

    if (roomCardsHtml) {
        finalHtml += `
            <div class="overview-breakdown-group">
                <h4><i class="ph ph-map-pin-line"></i> แจกแจงตามห้อง</h4>
                ${roomCardsHtml}
            </div>`;
    }

    if (totalItemsPriced === 0 && grandTotalItemsInRooms === 0) {
        return '<p class="empty-summary">ไม่มีรายการที่มีราคาสำหรับแสดงผล</p>';
    }

    return finalHtml;
}

/**
 *
 * @param startIndex
 * @param itemsList
 */
function _calculateRoomUnits(startIndex, itemsList) {
    let totalUnits = 0;
    for (let i = startIndex; i < itemsList.length; i++) {
        const item = itemsList[i];
        if (i > startIndex && item.isSpacer) {
            break;
        }
        totalUnits += item.units;
    }
    return totalUnits;
}

/**
 * Collects line items from payload, grouped by room with headers/spacers, ready for paginated rendering.
 * @param payload
 * @param showDetails
 */
function _collectLineItems(payload, showDetails) {
    const groupedLineItems = [];
    payload.rooms.forEach((room) => {
        if (room.is_suspended || !room.items) return;

        const roomItemsForProcessing = [];

        room.items.forEach((item) => {
            if (item.is_suspended) return;

            let desc = "",
                unitPrice = 0,
                quantity = 1,
                total = 0,
                units = 1,
                isGroupable = true;
            let displayName =
                item.type === "set" && item.style === "หลุยส์"
                    ? ITEM_TYPE_DISPLAY_NAMES["set_louis"] || "ม่านหลุยส์"
                    : ITEM_TYPE_DISPLAY_NAMES[item.type] || "สินค้าตกแต่ง";
            let detailsHtml = "";

            switch (item.type) {
                case "set": {
                    total = CALC.calculateSetPrice(item).total;
                    unitPrice = total;
                    if (total > 0) {
                        const width = toNum(item.width_m);
                        const height = toNum(item.height_m);
                        const styleDesc =
                            item.style === "หลุยส์"
                                ? ""
                                : ` ${sanitizeHTML(item.style || "")}`;
                        desc = `${displayName}${styleDesc} (${sanitizeHTML(item.fabric_variant || "")})`;
                        if (showDetails) {
                            detailsHtml = `<br><small>ขนาด ${width.toFixed(2)} x ${height.toFixed(2)} ม.${item.notes ? ` - ${_nlToBr(item.notes)}` : ""}</small>`;
                        }
                        units = showDetails ? 1.5 : 1;
                    }
                    break;
                }
                case "wallpaper": {
                    total = CALC.calculateWallpaperPrice(item).total;
                    unitPrice = total;
                    if (total > 0) {
                        const totalWidth = (item.widths || []).reduce(
                            (a, b) => a + toNum(b),
                            0
                        );
                        const rolls = CALC.wallpaperRolls(
                            totalWidth,
                            item.height_m
                        );
                        const height = toNum(item.height_m);
                        desc = `${displayName}`;
                        if (showDetails) {
                            detailsHtml = `<br><small>รหัส: ${sanitizeHTML(item.wallpaper_code) || "-"}, สูง ${height.toFixed(2)} ม. (ใช้ ${rolls} ม้วน)${item.notes ? ` - ${_nlToBr(item.notes)}` : ""}</small>`;
                        }
                        units = showDetails ? 1.5 : 1;
                    }
                    break;
                }
                case "removal": {
                    const calc = CALC.calculateRemovalPrice(item);
                    total = calc.total;
                    isGroupable = false;
                    if (total > 0) {
                        unitPrice = toNum(item.price_per_item);
                        quantity = toNum(item.quantity);
                        displayName =
                            ITEM_TYPE_DISPLAY_NAMES[item.type] || "รื้อถอน";
                        const itemDesc = item.description
                            ? ` (${sanitizeHTML(item.description)})`
                            : "";
                        desc = `${displayName}${itemDesc}`;
                        if (showDetails) {
                            detailsHtml = item.notes
                                ? `<br><small>${_nlToBr(item.notes)}</small>`
                                : "";
                        }
                        units = showDetails ? 1.5 : 1;
                    }
                    break;
                }
                case "custom": {
                    // [NEW] Custom PDF Row
                    total = CALC.calculateCustomPrice
                        ? CALC.calculateCustomPrice(item).total
                        : toNum(item.quantity || 1) *
                          toNum(item.price_per_item);
                    isGroupable = false; // Usually custom items have unique descriptions
                    if (total > 0) {
                        unitPrice = toNum(item.price_per_item);
                        quantity = toNum(item.quantity) || 1;
                        displayName =
                            ITEM_TYPE_DISPLAY_NAMES[item.type] || "รายการอื่นๆ";

                        // Use description if provided, otherwise just "รายการอื่นๆ"
                        const title = item.description
                            ? sanitizeHTML(item.description)
                            : displayName;
                        desc = title;

                        if (showDetails) {
                            detailsHtml = item.notes
                                ? `<br><small>${_nlToBr(item.notes)}</small>`
                                : "";
                        }
                        units = showDetails ? 1.5 : 1;
                    }
                    break;
                }
                default: {
                    if (
                        ITEM_CONFIG[item.type]?.templateId === "#areaBasedTpl"
                    ) {
                        total = CALC.calculateAreaBasedPrice(item).total;
                        unitPrice = total;
                        if (total > 0) {
                            const width = toNum(item.width_m);
                            const height = toNum(item.height_m);
                            desc = `${displayName}`;
                            if (showDetails) {
                                detailsHtml = `<br><small>รหัส: ${sanitizeHTML(item.code) || "-"}, ขนาด ${width.toFixed(2)} x ${height.toFixed(2)} ม.${item.notes ? ` - ${_nlToBr(item.notes)}` : ""}</small>`;
                            }
                            units = showDetails ? 1.5 : 1;
                        }
                    }
                    break;
                }
            }

            if (total > 0 && desc) {
                roomItemsForProcessing.push({
                    description: desc + detailsHtml,
                    unitPrice: unitPrice,
                    quantity: quantity,
                    total: total,
                    units: units,
                    isGroupable: isGroupable,
                });
            }
        });

        if (roomItemsForProcessing.length > 0) {
            if (groupedLineItems.length > 0) {
                groupedLineItems.push({ isSpacer: true, units: 0.5 });
            }
            groupedLineItems.push({
                isRoomHeader: true,
                roomName: sanitizeHTML(room.room_name) || "ไม่ระบุชื่อห้อง",
                units: 1.2,
            });

            const groupedMap = new Map();

            roomItemsForProcessing.forEach((item) => {
                if (item.isGroupable) {
                    const key = `${item.description}::${item.unitPrice}`;
                    if (groupedMap.has(key)) {
                        const existing = groupedMap.get(key);
                        existing.quantity += 1;
                        existing.total = existing.quantity * existing.unitPrice;
                    } else {
                        groupedMap.set(key, item);
                        groupedLineItems.push(item);
                    }
                } else {
                    groupedLineItems.push(item);
                }
            });
        }
    });

    return groupedLineItems;
}

/**
 * Calculates discount/VAT/grand total from line items + payload discount config.
 */
function _calcTotals(groupedLineItems, payload, vatRate) {
    const subTotal = groupedLineItems.reduce(
        (sum, item) => sum + (item.total || 0),
        0
    );

    let discountAmount = 0;
    let discountRowHtml = "";
    let subTotalAfterDiscount = subTotal;

    if (payload.discount && payload.discount.value > 0) {
        if (payload.discount.type === "percent") {
            discountAmount = Math.round(subTotal * (payload.discount.value / 100));
            discountRowHtml = `<tr><td class="pdf-label">ส่วนลด (${payload.discount.value}%)</td><td class="pdf-amount">-${fmt(discountAmount, 2, true)}</td></tr>`;
        } else {
            discountAmount = payload.discount.value;
            discountRowHtml = `<tr><td class="pdf-label">ส่วนลด</td><td class="pdf-amount">-${fmt(discountAmount, 2, true)}</td></tr>`;
        }
        subTotalAfterDiscount =
            Math.round((subTotal - discountAmount) * 100) / 100;
    }

    const vatAmount = Math.round(subTotalAfterDiscount * vatRate * 100) / 100;
    const grandTotal =
        Math.round((subTotalAfterDiscount + vatAmount) * 100) / 100;

    return {
        subTotal,
        discountAmount,
        discountRowHtml,
        subTotalAfterDiscount,
        vatRate,
        vatAmount,
        grandTotal,
    };
}

/**
 * Splits line items into pages, respecting room headers/spacers and orphan rules.
 */
function _paginateItems(groupedLineItems, showDetails, pageBreakBuffer) {
    const UNITS_PER_FIRST_PAGE = showDetails ? 17 : 20;
    const UNITS_PER_SUBSEQUENT_PAGE = showDetails ? 23 : 28;
    const pages = [];
    let currentPageItems = [];
    let currentUnits = 0;

    groupedLineItems.forEach((item, index) => {
        let pageLimit =
            pages.length === 0
                ? UNITS_PER_FIRST_PAGE
                : UNITS_PER_SUBSEQUENT_PAGE;

        if (item.isRoomHeader && currentUnits > 0) {
            const totalRoomUnits = _calculateRoomUnits(index, groupedLineItems);
            const spaceRemaining = pageLimit - currentUnits;

            const willThisRoomBreak = totalRoomUnits > spaceRemaining;
            const canHeaderStart = item.units <= spaceRemaining;

            if (willThisRoomBreak && canHeaderStart) {
                pages.push(currentPageItems);
                currentPageItems = [];
                currentUnits = 0;

                pageLimit =
                    pages.length === 0
                        ? UNITS_PER_FIRST_PAGE
                        : UNITS_PER_SUBSEQUENT_PAGE;
            }
        }

        const willOverflow = currentUnits + item.units > pageLimit;

        let willOrphanHeader = false;
        if (item.isRoomHeader && index < groupedLineItems.length - 1) {
            const nextItemUnits =
                groupedLineItems[index + 1].units || (showDetails ? 1.5 : 1);
            if (currentUnits + item.units + nextItemUnits > pageLimit) {
                if (currentUnits + item.units <= pageLimit) {
                    willOrphanHeader = true;
                }
            }
        }

        let leavesUnusableSpace = false;
        if (
            !willOverflow &&
            !willOrphanHeader &&
            index < groupedLineItems.length - 1
        ) {
            const spaceRemainingAfterAdd =
                pageLimit - (currentUnits + item.units);
            const nextItemUnits =
                groupedLineItems[index + 1].units || (showDetails ? 1.5 : 1);
            if (
                spaceRemainingAfterAdd > 0 &&
                spaceRemainingAfterAdd < pageBreakBuffer &&
                spaceRemainingAfterAdd < nextItemUnits &&
                !item.isRoomHeader &&
                !item.isSpacer
            ) {
                leavesUnusableSpace = true;
            }
        }

        if (
            (willOverflow || willOrphanHeader || leavesUnusableSpace) &&
            currentPageItems.length > 0
        ) {
            pages.push(currentPageItems);
            currentPageItems = [];
            currentUnits = 0;
        }
        currentPageItems.push(item);
        currentUnits += item.units;
    });
    if (currentPageItems.length > 0) {
        pages.push(currentPageItems);
    }

    return pages;
}

/**
 * Generates a 4-digit hash-based document number from a customer identity string.
 * Stable for the same input — used for offline-friendly QT-/RC- numbers.
 */
function _hashDocumentNumber(prefix, customerKey, dateObj, salt = "") {
    const datePart = `${dateObj.getFullYear().toString().slice(-2)}${(dateObj.getMonth() + 1).toString().padStart(2, "0")}${dateObj.getDate().toString().padStart(2, "0")}`;
    const str = (customerKey || "Customer") + salt;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash = hash & hash;
    }
    const fourDigitHash = (Math.abs(hash) % 9000) + 1000;
    return `${prefix}-${fourDigitHash}-${datePart}`;
}

/**
 * Resolves the absolute logo URL from shop config (best-effort).
 */
function _resolveLogoUrl(shopConfig) {
    if (!shopConfig.logoUrl) return "";
    try {
        return new URL(shopConfig.logoUrl, document.baseURI).href;
    } catch {
        return shopConfig.logoUrl;
    }
}

/**
 * Formats a Date as a Thai long-form date string.
 */
function _formatThaiDate(dateObj) {
    return dateObj.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

/**
 * Renders paginated HTML for a quotation- or receipt-style document.
 *
 * docContext shape:
 *   - title: heading text (e.g., "ใบเสนอราคา")
 *   - containerId: outer div id (e.g., "quotation-template")
 *   - documentNumber, documentDate (Date)
 *   - extraMetaRows: HTML for extra <tr> rows in the meta table
 *   - extraSummaryRows: HTML for extra summary <tr> rows (paid/balance, etc.)
 *   - signatures: { left: { label, name }, right: { label, name } }
 *   - paidStamp: boolean
 *   - notesOverride: string[] | null (null = use SHOP_CONFIG.pdf.notes)
 */
function _renderDocumentPages(payload, pages, totals, docContext, options) {
    const SHOP_CONFIG = getShopConfig();
    const { showDetails } = options;
    const { subTotal, discountRowHtml, vatRate, vatAmount, grandTotal } =
        totals;

    const dateThai = _formatThaiDate(docContext.documentDate);
    const absoluteLogoUrl = _resolveLogoUrl(SHOP_CONFIG);

    const notesList = docContext.notesOverride ?? SHOP_CONFIG.pdf?.notes ?? [];

    let allPagesHtml = "";
    let cumulativeTotal = 0;
    let itemNo = 1;

    pages.forEach((pageItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === pages.length - 1;

        const pageHeader = `
            <div class="pdf-page-header">
                <div class="pdf-header">
                     <div class="pdf-shop-info">
                        ${absoluteLogoUrl ? `<img src="${absoluteLogoUrl}" alt="Logo" class="pdf-logo">` : ""}
                        <div class="pdf-shop-address">
                            <strong><i class=""></i> ${sanitizeHTML(SHOP_CONFIG.name)}</strong><br>
                            ${sanitizeHTML(SHOP_CONFIG.address).replace(/\n/g, "<br>")}<br>
							โทร: ${sanitizeHTML(SHOP_CONFIG.phone)}<br>email: ${sanitizeHTML(SHOP_CONFIG.taxId)}
                        </div>
                    </div>
                     <div class="pdf-quote-details">
                        <div class="pdf-title-box"><h1>${sanitizeHTML(docContext.title)} ${pages.length > 1 ? (isFirstPage ? "" : "(ต่อ)") : ""}</h1></div>
                        <table class="pdf-quote-meta">
                            <tr><td>เลขที่:</td><td>${sanitizeHTML(docContext.documentNumber)}</td></tr>
                            <tr><td>วันที่:</td><td>${dateThai}</td></tr>
                            ${docContext.extraMetaRows || ""}
                        </table>
                    </div>
                </div>
                ${
                    isFirstPage
                        ? `
                <section class="pdf-customer-details">
                     <div class="pdf-customer-info">
                        <strong>ลูกค้า:</strong> ${sanitizeHTML(payload.customer_name) || "-"}<br>
                        <strong>ที่อยู่:</strong> ${sanitizeHTML(payload.customer_address || "-").replace(/\n/g, "<br>")}<br>
                        <strong>โทร:</strong> ${sanitizeHTML(payload.customer_phone) || "-"}
                    </div>
                    </section>`
                        : ""
                }
            </div>`;

        const pageFooter = `
            <div class="pdf-page-footer">
                <div class="pdf-footer-info">
                    <span><i class=""></i> ${sanitizeHTML(SHOP_CONFIG.name)} | โทร: ${sanitizeHTML(SHOP_CONFIG.phone)}</span>
                    <span>หน้า ${pageIndex + 1} / ${pages.length}</span>
                </div>
            </div>`;

        let tableRows = "";
        if (!isFirstPage) {
            tableRows += `<tr class="pdf-subtotal-row"><td colspan="4">ยอดยกมา (Brought Forward)</td><td class="pdf-text-right">${fmt(cumulativeTotal, 2, true)}</td></tr>`;
        }

        pageItems.forEach((item) => {
            if (item.isSpacer) {
                tableRows += `<tr class="pdf-room-spacer" style="page-break-inside: avoid; background: #fff !important;"><td colspan="5" style="border: none; padding: 1.5mm 0 !important; line-height: 1.5mm;">&nbsp;</td></tr>`;
            } else if (item.isRoomHeader) {
                tableRows += `<tr class="pdf-room-header" style="page-break-after: avoid;"><td colspan="5">ห้อง: ${item.roomName}</td></tr>`;
            } else {
                tableRows += `<tr>
                    <td class="pdf-text-center">${itemNo++}</td>
                    <td>${item.description}</td>
                    <td class="pdf-text-center">${item.quantity}</td>
                    <td class="pdf-text-right">${fmt(item.unitPrice, 2, true)}</td>
                    <td class="pdf-text-right">${fmt(item.total, 2, true)}</td>
                </tr>`;
                cumulativeTotal += item.total;
            }
        });

        let tableFooter = "";
        if (!isLastPage) {
            tableFooter = `<tfoot><tr class="pdf-subtotal-row"><td colspan="4">ยอดยกไป (Carried Forward)</td><td class="pdf-text-right">${fmt(cumulativeTotal, 2, true)}</td></tr></tfoot>`;
        }

        let notesHtml = "";
        if (showDetails && notesList && notesList.length > 0) {
            notesHtml = `
                <strong>หมายเหตุ:</strong>
                <ul>${notesList.map((n) => `<li>${sanitizeHTML(n)}</li>`).join("")}</ul>
            `;
        }

        const sig = docContext.signatures || {};
        const sigLeft = sig.left || {
            label: "ผู้เสนอราคา",
            name: SHOP_CONFIG.name,
        };
        const sigRight = sig.right || {
            label: "ลูกค้า / ผู้มีอำนาจลงนาม",
            name: "",
        };

        const renderSignatureBox = (s, dateText) => {
            const imgHtml = s.dataUrl
                ? `<img src="${s.dataUrl}" alt="signature" class="pdf-signature-img">`
                : `<p>.................................................</p>`;
            const nameLine = s.name
                ? `<p>(<i class=""></i> ${sanitizeHTML(s.name)})</p>`
                : `<p>(.................................................)</p>`;
            return `<div class="pdf-signature-box">${imgHtml}<p>&nbsp;</p><p>${sanitizeHTML(s.label)}</p>${nameLine}<p>วันที่: ${dateText}</p></div>`;
        };

        const stampHtml = docContext.paidStamp
            ? `<div class="pdf-paid-stamp">ชำระแล้ว / PAID</div>`
            : "";

        const summarySection = isLastPage
            ? `
            <div class="pdf-summary-wrapper">
                ${stampHtml}
                <section class="pdf-summary-section">
                    <div class="pdf-amount-in-words">
                        ${notesHtml}
                        <div class="pdf-amount-text">( ${bahttext(grandTotal)} )</div>
                    </div>
                    <div class="pdf-totals-block">
                        <table>
                            <tr><td class="pdf-label">รวมเป็นเงิน</td><td class="pdf-amount">${fmt(subTotal, 2, true)}</td></tr>
                            ${discountRowHtml}
                            ${vatRate > 0 ? `<tr><td class="pdf-label">ภาษีมูลค่าเพิ่ม ${(vatRate * 100).toFixed(0)}%</td><td class="pdf-amount">${fmt(vatAmount, 2, true)}</td></tr>` : ""}
                            <tr class="pdf-grand-total"><td class="pdf-label">ยอดรวมสุทธิ${vatRate > 0 ? "(รวมภาษีมูลค่าเพิ่ม)" : ""}</td><td class="pdf-amount">${fmt(grandTotal, 2, true)}</td></tr>
                            ${docContext.extraSummaryRows || ""}
                        </table>
                    </div>
                </section>
                <footer class="pdf-footer-section">
                    ${renderSignatureBox(sigLeft, dateThai)}
                    ${renderSignatureBox(sigRight, "......./......./............")}
                </footer>
            </div>
        `
            : "";

        allPagesHtml += `
            <div class="pdf-page">
                <div class="pdf-page-content">
                    ${pageHeader}
                    <div class="pdf-page-body">
                        <table class="pdf-items-table">
                            <thead><tr><th style="width:5%;">ลำดับ</th><th style="width:45%;">รายการ</th><th style="width:10%;">จำนวน</th><th style="width:17.5%;">ราคา/หน่วย</th><th style="width:17.5%;">รวม (บาท)</th></tr></thead>
                            <tbody>${tableRows}</tbody>
                            ${tableFooter}
                        </table>
                        ${summarySection}
                    </div>
                    ${pageFooter}
                </div>
            </div>`;
    });

    return `<div id="${docContext.containerId}">${allPagesHtml}</div>`;
}

/**
 * Parses an ISO date string (YYYY-MM-DD) into a local Date, or returns today.
 */
function _parsePayloadDate(isoStr) {
    if (!isoStr) return new Date();
    const parts = isoStr.split("-").map((n) => parseInt(n, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return new Date();
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 *
 * @param payload
 * @param options
 */
export function generateQuotationHtml(payload, options) {
    const SHOP_CONFIG = getShopConfig();
    const {
        vatRate = SHOP_CONFIG.baseVatRate,
        pageBreakBuffer = 3,
        showDetails = true,
    } = options;

    const groupedLineItems = _collectLineItems(payload, showDetails);
    if (groupedLineItems.length === 0) return null;

    const totals = _calcTotals(groupedLineItems, payload, vatRate);
    if (totals.subTotal === 0) return null;

    const pages = _paginateItems(
        groupedLineItems,
        showDetails,
        pageBreakBuffer
    );

    const documentDate = _parsePayloadDate(payload.quoteDate);
    const customerKey =
        payload.customer_name || payload.customer_phone || "Customer";
    const documentNumber =
        payload.quoteNumber ||
        _hashDocumentNumber("QT", customerKey, documentDate);

    const sig = payload.signatures || {};
    const docContext = {
        title: "ใบเสนอราคา",
        containerId: "quotation-template",
        documentNumber,
        documentDate,
        extraMetaRows: "",
        extraSummaryRows: "",
        signatures: {
            left: {
                label: "ผู้เสนอราคา",
                name: SHOP_CONFIG.name,
                dataUrl: sig.issuer?.dataUrl || "",
            },
            right: {
                label: "ลูกค้า / ผู้มีอำนาจลงนาม",
                name: sig.customer?.name || "",
                dataUrl: sig.customer?.dataUrl || "",
            },
        },
        paidStamp: false,
        notesOverride: null,
    };

    const html = _renderDocumentPages(payload, pages, totals, docContext, {
        showDetails,
    });

    const cleanCustomerName = sanitizeForFilename(
        payload.customer_name || "quote"
    );
    return {
        html,
        fileName: `${documentNumber}_${cleanCustomerName}`,
        documentNumber,
    };
}

/**
 * Generates HTML for a receipt document, reusing quotation line-item collection
 * but locking VAT to the issued quote, adding payment meta, and a paid stamp.
 *
 * @param payload
 * @param options
 */
export function generateReceiptHtml(payload, options) {
    const SHOP_CONFIG = getShopConfig();
    const {
        vatRate = SHOP_CONFIG.baseVatRate,
        pageBreakBuffer = 3,
        showDetails = true,
    } = options;

    const groupedLineItems = _collectLineItems(payload, showDetails);
    if (groupedLineItems.length === 0) return null;

    const totals = _calcTotals(groupedLineItems, payload, vatRate);
    if (totals.subTotal === 0) return null;

    const pages = _paginateItems(
        groupedLineItems,
        showDetails,
        pageBreakBuffer
    );

    const receipt = payload.receipt || {};
    const documentDate = _parsePayloadDate(receipt.paidAt);
    const customerKey =
        payload.customer_name || payload.customer_phone || "Customer";
    const documentNumber =
        receipt.receiptNumber ||
        _hashDocumentNumber("RC", customerKey, documentDate, "|receipt");

    const methodLabels = {
        cash: "เงินสด",
        transfer: "โอนเงิน",
        credit_card: "บัตรเครดิต",
        cheque: "เช็ค",
        other: "อื่นๆ",
    };
    const methodText = methodLabels[receipt.method] || "เงินสด";
    const methodNote = receipt.methodNote
        ? ` (${sanitizeHTML(receipt.methodNote)})`
        : "";

    // Reference quote number: explicit per-receipt override (used when the
    // payload was imported from an older version that lacks quoteNumber)
    // wins, falling back to the cached quoteNumber on the payload.
    const refQuoteValue = receipt.refQuoteNumber || payload.quoteNumber || "";
    const refQuote = refQuoteValue
        ? `<tr><td>อ้างอิงใบเสนอราคา:</td><td>${sanitizeHTML(refQuoteValue)}</td></tr>`
        : "";
    const extraMetaRows = `${refQuote}<tr><td>วิธีชำระ:</td><td>${methodText}${methodNote}</td></tr>`;

    const paidAmount = toNum(receipt.paidAmount) || totals.grandTotal;
    const balance = totals.grandTotal - paidAmount;
    const extraSummaryRows = `
        <tr><td class="pdf-label">ยอดรับชำระ</td><td class="pdf-amount">${fmt(paidAmount, 2, true)}</td></tr>
        ${balance !== 0 ? `<tr><td class="pdf-label">${balance > 0 ? "ยอดคงเหลือ" : "เงินทอน"}</td><td class="pdf-amount">${fmt(Math.abs(balance), 2, true)}</td></tr>` : ""}
    `;

    const sig = payload.signatures || {};
    // Receipt issuer name resolution: explicit per-receipt value wins, then
    // the name attached to the issuer signature, then the shop name as a
    // last resort. Shop name in the page header is always SHOP_CONFIG.name
    // (driven by _renderDocumentPages) and is independent of this.
    const issuerName =
        receipt.issuerName || sig.issuer?.name || SHOP_CONFIG.name || "";
    const docContext = {
        title: "ใบเสร็จรับเงิน",
        containerId: "receipt-template",
        documentNumber,
        documentDate,
        extraMetaRows,
        extraSummaryRows,
        signatures: {
            left: {
                label: "ผู้รับเงิน",
                name: issuerName,
                dataUrl: sig.issuer?.dataUrl || "",
            },
            right: {
                label: "ลูกค้า",
                name: sig.customer?.name || "",
                dataUrl: sig.customer?.dataUrl || "",
            },
        },
        paidStamp: balance <= 0,
        notesOverride: SHOP_CONFIG.pdf?.receiptNotes ?? null,
    };

    const html = _renderDocumentPages(payload, pages, totals, docContext, {
        showDetails,
    });

    const cleanCustomerName = sanitizeForFilename(
        payload.customer_name || "receipt"
    );
    return {
        html,
        fileName: `${documentNumber}_${cleanCustomerName}`,
        documentNumber,
    };
}

/**
 *
 * @param payload
 */
export function generateLookBookModalHtml(payload) {
    const subTotal = calculateSubTotal(payload);
    let discountAmount = 0;
    if (payload.discount?.value > 0) {
        discountAmount =
            payload.discount.type === "percent"
                ? Math.round(subTotal * (payload.discount.value / 100))
                : payload.discount.value;
    }
    const grandTotal = Math.round((subTotal - discountAmount) * 100) / 100;

    let hasPricedItems = false;
    let totalPricedItems = 0;

    let roomsHtml = payload.rooms
        .map((room) => {
            if (room.is_suspended) return "";
            const pricedItems = room.items.filter((item) => {
                if (item.is_suspended) return false;
                if (
                    item.type === "set" ||
                    ITEM_CONFIG[item.type]?.templateId === "#areaBasedTpl"
                ) {
                    return toNum(item.width_m) > 0 && toNum(item.height_m) > 0;
                } else if (item.type === "wallpaper") {
                    const totalWidth = (item.widths || []).reduce(
                        (a, b) => a + toNum(b),
                        0
                    );
                    return totalWidth > 0 && toNum(item.height_m) > 0;
                } else if (item.type === "removal" || item.type === "custom") {
                    return (
                        toNum(item.quantity) > 0 &&
                        toNum(item.price_per_item) > 0
                    );
                }
                return false;
            });
            if (pricedItems.length === 0) return "";
            totalPricedItems += pricedItems.length;
            const curtainCount = pricedItems.filter(
                (i) => i.type === "set"
            ).length;

            const itemsHtml = pricedItems
                .map((item, index) => {
                    let specHtml = "";
                    let titleHtml = "";
                    let dimensionRow = "";
                    let displayName = "";

                    if (item.type === "set") {
                        if (item.style === "หลุยส์") {
                            displayName =
                                ITEM_TYPE_DISPLAY_NAMES["set_louis"] ||
                                "ม่านหลุยส์";
                            titleHtml = `<h5 class="lookbook-item-title">${sanitizeHTML(displayName)}</h5>`;
                        } else if (item.style === "ม่านแป๊บ") {
                            displayName =
                                ITEM_TYPE_DISPLAY_NAMES["set"] || "ผ้าม่าน";
                            titleHtml = `<h5 class="lookbook-item-title">${sanitizeHTML(displayName)} ${sanitizeHTML(item.style)}</h5>`;
                        } else {
                            displayName =
                                ITEM_TYPE_DISPLAY_NAMES["set"] || "ผ้าม่าน";
                        }
                    } else if (item.type === "custom") {
                        displayName = item.description
                            ? sanitizeHTML(item.description)
                            : ITEM_TYPE_DISPLAY_NAMES["custom"] ||
                              "รายการอื่นๆ";
                        titleHtml = `<h5 class="lookbook-item-title">${displayName}</h5>`;
                    } else {
                        displayName =
                            ITEM_TYPE_DISPLAY_NAMES[item.type] || "ของตกแต่ง";
                        titleHtml = `<h5 class="lookbook-item-title">${sanitizeHTML(displayName)}</h5>`;
                    }

                    switch (item.type) {
                        case "set":
                            dimensionRow = `<tr><td>ขนาด</td><td>${toNum(item.width_m).toFixed(2)} x ${toNum(item.height_m).toFixed(2)} ม.</td></tr>`;
                            if (item.style === "หลุยส์") {
                                specHtml = `
                            <tr><td>แบบ</td><td>${displayName} (${sanitizeHTML(item.fabric_variant || "")})</td></tr>
                            ${item.fabric_variant.includes("ทึบ") ? `<tr><td>ผ้าฐาน</td><td>#${sanitizeHTML(item.fabric_code) || "-"}</td></tr>` : ""}
                            ${item.fabric_variant.includes("โปร่ง") ? `<tr><td>ผ้าโปร่ง</td><td>#${sanitizeHTML(item.sheer_fabric_code) || "-"}</td></tr>` : ""}
                            <tr><td>หัวหลุยส์</td><td>${sanitizeHTML(item.louis_valance || HARDWARE_DEFAULTS.louis_valance)}</td></tr>
                            <tr><td>พู่</td><td>${sanitizeHTML(item.louis_tassels || HARDWARE_DEFAULTS.louis_tassels)}</td></tr>
                         `;
                            } else if (item.style === "ม่านแป๊บ") {
                                specHtml = `
                             <tr><td>แบบ</td><td>${sanitizeHTML(item.style)} (${sanitizeHTML(item.fabric_variant || "")})</td></tr>
                             ${item.fabric_variant.includes("ทึบ") ? `<tr><td>ผ้า</td><td>#${sanitizeHTML(item.fabric_code) || "-"}</td></tr>` : ""}
                             ${item.fabric_variant.includes("โปร่ง") ? `<tr><td>ผ้า</td><td>#${sanitizeHTML(item.sheer_fabric_code) || "-"}</td></tr>` : ""}
                         `;
                            } else {
                                specHtml = `
                            <tr><td>แบบ</td><td>${sanitizeHTML(item.style || "")} (${sanitizeHTML(item.fabric_variant || "")})</td></tr>
                            ${item.fabric_variant.includes("ทึบ") ? `<tr><td>ทึบ</td><td>#${sanitizeHTML(item.fabric_code) || "-"}</td></tr>` : ""}
                            ${item.fabric_variant.includes("โปร่ง") ? `<tr><td>โปร่ง</td><td>#${sanitizeHTML(item.sheer_fabric_code) || "-"}</td></tr>` : ""}
                        `;
                                if (item.style === "ม่านพับ") {
                                    specHtml += `<tr><td>เชือก</td><td>${sanitizeHTML(item.adjustment_side || "ปรับขวา")}</td></tr>`;
                                } else {
                                    specHtml += `<tr><td>เปิด</td><td>${sanitizeHTML(item.opening_style || "แยกกลาง")}</td></tr>`;
                                }
                            }
                            break;
                        case "wallpaper": {
                            const totalWidth = (item.widths || []).reduce(
                                (a, b) => a + toNum(b),
                                0
                            );
                            const rolls = CALC.wallpaperRolls(
                                totalWidth,
                                item.height_m
                            );
                            dimensionRow = `<tr><td>ขนาด</td><td>รวม ${totalWidth.toFixed(2)} ม., สูง ${toNum(item.height_m).toFixed(2)} ม.</td></tr>`;
                            specHtml = `
                        <tr><td>รหัส</td><td>#${sanitizeHTML(item.wallpaper_code) || "-"}</td></tr>
                        <tr><td>ใช้</td><td>${rolls} ม้วน</td></tr>
                    `;
                            break;
                        }
                        case "removal":
                            dimensionRow = `<tr><td>จำนวน</td><td>${toNum(item.quantity)} ชุด</td></tr>`;
                            specHtml = `
                                <tr><td>รายละเอียด</td><td>${sanitizeHTML(item.description) || "-"}</td></tr>
                                <tr class="lookbook-price-row"><td>ราคา/ชุด</td><td>${fmtTH(toNum(item.price_per_item))}</td></tr>
                                <tr class="lookbook-price-row"><td>รวม</td><td><strong>${fmtTH(CALC.calculateRemovalPrice(item).total)}</strong></td></tr>
                            `;
                            hasPricedItems = true;
                            break;
                        case "custom": // [NEW] Custom Spec
                            dimensionRow = `<tr><td>จำนวน</td><td>${toNum(item.quantity)} หน่วย</td></tr>`;
                            specHtml = `
                                <tr class="lookbook-price-row"><td>ราคา/หน่วย</td><td>${fmtTH(toNum(item.price_per_item))}</td></tr>
                                <tr class="lookbook-price-row"><td>รวม</td><td><strong>${fmtTH(CALC.calculateCustomPrice ? CALC.calculateCustomPrice(item).total : toNum(item.quantity || 1) * toNum(item.price_per_item))}</strong></td></tr>
                            `;
                            hasPricedItems = true;
                            break;
                        default:
                            if (
                                ITEM_CONFIG[item.type]?.templateId ===
                                "#areaBasedTpl"
                            ) {
                                dimensionRow = `<tr><td>ขนาด</td><td>${toNum(item.width_m).toFixed(2)} x ${toNum(item.height_m).toFixed(2)} ม.</td></tr>`;
                                specHtml = `<tr><td>รหัส</td><td>#${sanitizeHTML(item.code) || "-"}</td></tr>`;
                                if (item.opening_style) {
                                    specHtml += `<tr><td>เปิด</td><td>${sanitizeHTML(item.opening_style)}</td></tr>`;
                                }
                                if (item.adjustment_side) {
                                    specHtml += `<tr><td>เชือก</td><td>${sanitizeHTML(item.adjustment_side)}</td></tr>`;
                                }
                            }
                            break;
                    }
                    if (specHtml) hasPricedItems = true;

                    return `
                 <div class="lookbook-details" data-item-type="${sanitizeHTML(item.type)}">
                    ${_generateVisualPlaceholder(item, room.id, index)}
                    <div class="spec-table-wrapper">
                        ${titleHtml}
                        <table class="spec-table">
                            ${specHtml}
                            ${dimensionRow}
                            ${item.notes ? `<tr><td>โน้ต</td><td style="white-space:pre-wrap">${_nlToBr(item.notes)}</td></tr>` : ""}
                        </table>
                    </div>
                </div>
            `;
                })
                .join('<hr class="lookbook-hr">');

            if (!itemsHtml.trim()) return "";

            return `
            <div class="lookbook-room">
                <h4><i class="ph ph-map-pin"></i> ${sanitizeHTML(room.room_name) || "ไม่ระบุชื่อห้อง"}${curtainCount > 0 ? ` <span class="lookbook-room-count">(${curtainCount} ผ้าม่าน)</span>` : ""}</h4>
                <div class="lookbook-items-grid">${itemsHtml}</div>
            </div>
        `;
        })
        .join("");

    if (!hasPricedItems) {
        return `<p class="empty-summary">ไม่มีรายการสำหรับสร้างรายงาน</p>`;
    }

    const summaryHtml = `
        <div class="lookbook-summary">
            <div class="lookbook-customer-info">
                <strong>ลูกค้า:</strong> ${sanitizeHTML(payload.customer_name) || "-"}
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <strong>งานทั้งหมด:</strong> ${totalPricedItems} รายการ
            </div>
            <div class="lookbook-totals">
                <span>ยอดรวม (ก่อนส่วนลด): ${fmtTH(subTotal)} บาท</span>
                ${discountAmount > 0 ? `<span>ส่วนลด: -${fmtTH(discountAmount)} บาท</span>` : ""}
                <span class="grand-total">ยอดสุทธิ: ${fmtTH(grandTotal)} บาท</span>
            </div>
        </div>
    `;

    return summaryHtml + roomsHtml;
}

/**
 * A4 portrait dimensions in pixels at 150 DPI (1mm = 150/25.4 px).
 * 210mm × 297mm → 1240 × 1754 px. Margin 12.7mm (½ inch) = 75 px.
 */
const A4_DPI = 150;
const A4_WIDTH_PX = Math.round((210 * A4_DPI) / 25.4); // 1240
const A4_HEIGHT_PX = Math.round((297 * A4_DPI) / 25.4); // 1754
const A4_MARGIN_PX = Math.round((12.7 * A4_DPI) / 25.4); // 75
const A4_INNER_HEIGHT_PX = A4_HEIGHT_PX - 2 * A4_MARGIN_PX; // 1604

/**
 * Export the currently-open Look Book modal as a print-ready A4-portrait JPG.
 * Prices are hidden, rooms are kept whole (no mid-room page breaks), and the
 * image is paginated to fill an integer number of A4 pages stacked vertically.
 * @param {object} payload Quotation payload (used for filename).
 * @returns {Promise<void>}
 */
export async function exportLookBookAsJpg(payload) {
    const source = document.getElementById("lookbookModalBody");
    if (!source || !source.innerHTML.trim()) return;

    const { default: html2canvas } = await import("html2canvas");

    const stage = document.createElement("div");
    stage.className = "lookbook-modal-body lookbook-export-stage is-exporting";
    stage.style.cssText = [
        "position: fixed",
        "left: -99999px",
        "top: 0",
        `width: ${A4_WIDTH_PX}px`,
        // Standard A4 margins: 25.4mm = 150 px @ 150 DPI on top/left/right.
        // No padding-bottom — last page's bottom margin comes from the final
        // height being padded to a full multiple of A4_HEIGHT_PX.
        `padding: ${A4_MARGIN_PX}px ${A4_MARGIN_PX}px 0 ${A4_MARGIN_PX}px`,
        "margin: 0",
        "background: #ffffff",
        "box-sizing: border-box",
        "overflow: visible",
        "z-index: -1",
    ].join(";");
    stage.innerHTML = source.innerHTML;
    document.body.appendChild(stage);

    try {
        // Force 2-column layout via inline styles so html2canvas renders it
        // reliably (CSS mirror rules + calc() can be misinterpreted under
        // html2canvas's simulated viewport).
        // Inner content width inside A4 margins = 1240 - 2*75 = 1090 px.
        // Two cards per row → width ≈ 525, plus 6 px margin per side.
        const CARD_WIDTH_PX = 525;
        const CARD_MARGIN_PX = 6;
        const CARD_PADDING_PX = 12;
        stage.querySelectorAll(".lookbook-items-grid").forEach((grid) => {
            Object.assign(grid.style, {
                display: "flex",
                flexWrap: "wrap",
                padding: `${CARD_MARGIN_PX}px`,
                boxSizing: "border-box",
                width: "100%",
            });
            grid.querySelectorAll(":scope > .lookbook-details").forEach(
                (card) => {
                    Object.assign(card.style, {
                        flex: `0 0 ${CARD_WIDTH_PX}px`,
                        width: `${CARD_WIDTH_PX}px`,
                        boxSizing: "border-box",
                        margin: `${CARD_MARGIN_PX}px`,
                        padding: `${CARD_PADDING_PX}px`,
                        border: "1px solid #c5c6d0",
                        borderRadius: "12px",
                        backgroundColor: "#f6f6ff",
                    });
                }
            );
            grid.querySelectorAll(":scope > .lookbook-hr").forEach((hr) => {
                hr.style.display = "none";
            });
        });

        // Wait two frames so fonts/images can settle and layout stabilises.
        await new Promise((r) =>
            requestAnimationFrame(() => requestAnimationFrame(r))
        );

        // Walk top-level blocks; push any block that would cross an A4 page
        // boundary down so it starts at the next page's inner content top.
        // Page boundaries (with M = A4_MARGIN_PX, P = A4_HEIGHT_PX):
        //   Page N inner content area: [(N-1)*P + M, N*P - M]
        // First block's offsetTop already includes stage padding-top (= M).
        const blocks = Array.from(stage.children);
        let lastPageIdx = 0;
        for (const block of blocks) {
            const top = block.offsetTop;
            const height = block.offsetHeight;
            if (height === 0 || height > A4_INNER_HEIGHT_PX) continue;

            const startPage = Math.floor(
                (top - A4_MARGIN_PX) / A4_HEIGHT_PX
            );
            const pageInnerEnd =
                startPage * A4_HEIGHT_PX + A4_MARGIN_PX + A4_INNER_HEIGHT_PX;

            if (top + height > pageInnerEnd) {
                const nextInnerStart =
                    (startPage + 1) * A4_HEIGHT_PX + A4_MARGIN_PX;
                const extra = nextInnerStart - top;
                const current = parseFloat(block.style.marginTop) || 0;
                block.style.marginTop = `${current + extra}px`;
            }

            // Re-read offsetTop after possible margin shift to find which
            // page this block ends on.
            const endTop = block.offsetTop;
            const endPageIdx = Math.floor(
                (endTop + block.offsetHeight - 1 - A4_MARGIN_PX) / A4_HEIGHT_PX
            );
            if (endPageIdx > lastPageIdx) lastPageIdx = endPageIdx;
        }

        const pageCount = lastPageIdx + 1;
        const finalHeight = pageCount * A4_HEIGHT_PX;
        stage.style.height = `${finalHeight}px`;

        // Render page number "N / total" at the bottom margin of every page.
        for (let i = 0; i < pageCount; i++) {
            const pn = document.createElement("div");
            pn.style.cssText = [
                "position: absolute",
                "left: 0",
                "right: 0",
                `top: ${(i + 1) * A4_HEIGHT_PX - 50}px`,
                "text-align: center",
                "font-size: 18px",
                "color: #555",
                "font-family: inherit",
                "pointer-events: none",
            ].join(";");
            pn.textContent = `${i + 1} / ${pageCount}`;
            stage.appendChild(pn);
        }

        const canvas = await html2canvas(stage, {
            scale: 1,
            backgroundColor: "#ffffff",
            useCORS: true,
            logging: false,
            width: A4_WIDTH_PX,
            height: finalHeight,
            windowWidth: A4_WIDTH_PX,
            windowHeight: finalHeight,
        });

        const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
        const customer = sanitizeForFilename(
            payload?.customer_name || "Customer"
        );
        const dateStr = new Date().toISOString().slice(0, 10);

        const link = document.createElement("a");
        link.download = `LookBook_${customer}_${dateStr}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        try {
            link.click();
        } finally {
            document.body.removeChild(link);
        }
    } finally {
        document.body.removeChild(stage);
    }
}
