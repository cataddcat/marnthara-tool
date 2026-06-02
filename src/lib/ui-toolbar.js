// src/lib/ui-toolbar.js
// --- TOOLBAR & MENU EVENT LISTENERS (extracted from ui.js Phase 2C) ---
import { SELECTORS, STORAGE_KEY, SHOP_CONFIG_KEY } from "./config.js";
import { sanitizeForFilename, throttle } from "./utils.js";
import {
    saveData,
    buildPayload,
    setDocumentState,
    updateDocumentState,
    getDocumentState,
} from "./storage.js";
import { pushState } from "./undoManager.js";
import { showModal, showConfirmation, showToast } from "./modal.js";
import {
    getFavorites,
    mergeFavorites,
    clearAllFavorites,
} from "./favorites.js";
import { addRoom } from "./ui-actions.js";
import {
    showExportOptionsModal,
    showReceiptOptionsModal,
} from "./ui-modals.js";
import { getShopConfig } from "./shopConfig.js";
import { CALC } from "./calculations.js";
import {
    generateSummaryText,
    generateQuotationHtml,
    generateReceiptHtml,
    generateOverviewHtml,
    generateLookBookModalHtml,
    exportLookBookAsJpg,
} from "./documentGenerator.js";

/**
 * Returns today's date as YYYY-MM-DD in local time.
 * @returns {string}
 */
function _todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

/**
 * Sets up all toolbar, menu, and global window event listeners.
 * @param {object} ctx - Context object with functions from ui.js.
 * @param {() => boolean} ctx.getIsLocked - Returns current lock state.
 * @param {() => void} ctx.recalcAll - Debounced recalculation function.
 * @param {() => void} ctx.handleUndo - Undo handler.
 * @param {() => void} ctx.toggleLock - Toggle lock state.
 * @param {() => void} ctx.handleToggleAllRooms - Toggle all rooms open/close.
 * @param {() => void} ctx.updateToggleAllButtonState - Update toggle button UI.
 * @param {() => void} ctx.updateUndoButtonState - Update undo button UI.
 * @param {() => void} ctx.renumberItemTitles - Renumber item titles.
 * @param {() => void} ctx.toggleTheme - Toggle light/dark theme.
 * @param {(el: Element) => void} ctx.smartScrollToHeader - Scroll to room header.
 * @param {(el: Element, force?: boolean|null) => void} ctx.toggleDetails - Toggle item details.
 * @param {() => void} ctx.populateShopSettingsModal - Populate shop settings form.
 * @param {(html: string, method: string) => Promise<void>} ctx.renderPdf - Render PDF.
 * @param {(quotation: object) => void} ctx.exportAsHtmlFile - Export as HTML file.
 * @param {(data: object, isImport?: boolean) => Promise<void>} ctx.loadPayload - Load payload data.
 * @param {object} refs - DOM element references.
 * @param {HTMLElement|null} refs.menuDropdown - The menu dropdown element.
 * @param {HTMLElement|null} refs.menuBtn - The menu button element.
 * @param {HTMLElement|null} refs.quickNavDropdown - The quick nav dropdown.
 * @param {HTMLElement|null} refs.quickNavBtn - The quick nav button.
 * @param {HTMLInputElement|null} refs.fileImporter - The file import input.
 * @param {HTMLInputElement|null} refs.favImporter - The favorites import input.
 */
export function setupToolbarListeners(ctx, refs) {
    const {
        getIsLocked,
        recalcAll,
        handleUndo,
        toggleLock,
        handleToggleAllRooms,
        updateToggleAllButtonState,
        updateUndoButtonState,
        renumberItemTitles,
        toggleTheme,
        smartScrollToHeader,
        toggleDetails,
        populateShopSettingsModal,
        renderPdf,
        exportAsHtmlFile,
        loadPayload,
        updateLockState,
    } = ctx;
    const {
        menuDropdown,
        menuBtn,
        quickNavDropdown,
        quickNavBtn,
        fileImporter,
        favImporter,
    } = refs;

    // --- Undo ---
    document.querySelector("#undoBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        handleUndo();
    });

    // --- Lock ---
    document
        .querySelector(SELECTORS.lockBtn)
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            toggleLock();
        });

    // --- Toggle all rooms ---
    document
        .querySelector(SELECTORS.toggleAllRoomsBtn)
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            handleToggleAllRooms();
        });

    // --- Quick nav ---
    if (quickNavBtn && quickNavDropdown) {
        quickNavBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menuDropdown?.classList.remove("show");
            const isOpening = !quickNavDropdown.classList.contains("show");
            quickNavDropdown.classList.toggle("show", isOpening);
            quickNavBtn.setAttribute("aria-expanded", isOpening);
            if (isOpening) menuBtn?.setAttribute("aria-expanded", "false");
        });
        document
            .querySelector(SELECTORS.quickNavRoomList)
            ?.addEventListener("click", (e) => {
                const link = e.target.closest("a[data-jump-to]");
                if (link) {
                    e.preventDefault();
                    const targetId = link.dataset.jumpTo;
                    const targetRoom = document.getElementById(targetId);
                    if (targetRoom) {
                        targetRoom.open = true;
                        smartScrollToHeader(targetRoom);
                        targetRoom.classList.add("scrolling-jump");
                        setTimeout(
                            () => targetRoom.classList.remove("scrolling-jump"),
                            2500
                        );
                        setTimeout(updateToggleAllButtonState, 100);
                    }
                    quickNavDropdown.classList.remove("show");
                    quickNavBtn.setAttribute("aria-expanded", "false");
                }
            });
        const addRoomQuickBtn = document.querySelector("#addRoomQuickNavBtn");
        if (addRoomQuickBtn) {
            const addRoomThrottled = throttle(addRoom, 700);
            addRoomQuickBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                addRoomThrottled();
                quickNavDropdown.classList.remove("show");
                quickNavBtn.setAttribute("aria-expanded", "false");
            });
        }
    }

    // --- Menu ---
    if (menuBtn && menuDropdown) {
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            quickNavDropdown?.classList.remove("show");
            const isOpening = !menuDropdown.classList.contains("show");
            menuDropdown.classList.toggle("show", isOpening);
            menuBtn.setAttribute("aria-expanded", isOpening);
            if (isOpening) quickNavBtn?.setAttribute("aria-expanded", "false");
        });
    }

    // --- Theme toggle ---
    document
        .querySelector("#themeToggleBtn")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            toggleTheme();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
        });

    // --- Overview ---
    document
        .querySelector("#overviewBtn")
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            const payload = buildPayload();
            const overviewHeader = document.querySelector(
                "#overviewModalHeader"
            );
            const modalBody = document.querySelector("#overviewModalBody");
            if (overviewHeader && modalBody) {
                const totalItems = payload.rooms.reduce(
                    (acc, room) =>
                        acc +
                        (room.is_suspended
                            ? 0
                            : (room.items || []).filter(
                                  (item) =>
                                      !item.is_placeholder &&
                                      !item.is_suspended &&
                                      (CALC.calculateSetPrice(item)?.total >
                                          0 ||
                                          CALC.calculateWallpaperPrice(item)
                                              ?.total > 0 ||
                                          CALC.calculateRemovalPrice(item)
                                              ?.total > 0 ||
                                          (CALC.calculateCustomPrice
                                              ? CALC.calculateCustomPrice(item)
                                                    ?.total
                                              : 0) > 0 ||
                                          CALC.calculateAreaBasedPrice(item)
                                              ?.total > 0)
                              ).length),
                    0
                );
                const grandTotalText =
                    document.querySelector(SELECTORS.grandTotal)?.textContent ||
                    "0";
                const activeRooms = payload.rooms.filter(
                    (room) =>
                        !room.is_suspended &&
                        room.items?.some((item) => !item.is_suspended)
                ).length;
                overviewHeader.innerHTML = `<div class="overview-stats-grid"><div class="overview-stat-card"><i class="ph-bold ph-map-pin-line"></i><div class="stat-value">${activeRooms}</div><div class="stat-label">ห้อง</div></div><div class="overview-stat-card"><i class="ph-bold ph-stack"></i><div class="stat-value">${totalItems}</div><div class="stat-label">รายการ</div></div><div class="overview-stat-card"><i class="ph-bold ph-coins"></i><div class="stat-value">${grandTotalText}</div><div class="stat-label">ยอดรวม</div></div></div>`;
                modalBody.innerHTML = generateOverviewHtml(payload);
                showModal("#overviewModal");
            }
        });

    // --- Copy text ---
    document
        .querySelector("#copyTextBtn")
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            const copyModal = document.querySelector(
                SELECTORS.copyOptionsModal
            );
            if (!copyModal) return;
            copyModal.querySelector(
                'input[name="copy_option"][value="customer"]'
            ).checked = true;
            const result = await showModal(SELECTORS.copyOptionsModal);
            if (result && !result.cancelled) {
                const selectedOption = copyModal.querySelector(
                    'input[name="copy_option"]:checked'
                ).value;
                const summary = generateSummaryText(
                    buildPayload(),
                    selectedOption
                );
                try {
                    await navigator.clipboard.writeText(summary);
                    showToast("คัดลอกสำเร็จ!", "success");
                } catch {
                    showToast("คัดลอกล้มเหลว", "error");
                }
            }
        });

    // --- Visual reports → jump straight to Client Look Book ---
    document
        .querySelector("#visualReportsBtn")
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            const payload = buildPayload();
            const reportHtml = generateLookBookModalHtml(payload);
            const lookbookBody =
                document.querySelector("#lookbookModalBody");
            if (reportHtml && lookbookBody) {
                lookbookBody.innerHTML = reportHtml;
                showModal("#lookbookModal");
            } else {
                showToast("ไม่มีข้อมูล", "warning");
            }
        });

    // --- Look Book: Export JPG ---
    document
        .getElementById("lookbookExportJpgBtn")
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            const btn = e.currentTarget;
            btn.disabled = true;
            try {
                await exportLookBookAsJpg(buildPayload());
                showToast("ดาวน์โหลด JPG สำเร็จ", "success");
            } catch (err) {
                console.error("LookBook JPG export failed:", err);
                showToast("ดาวน์โหลด JPG ไม่สำเร็จ", "error");
            } finally {
                btn.disabled = false;
            }
        });

    // --- Customer info (from menu) ---
    document
        .querySelector(SELECTORS.customerInfoBtn)
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            showModal(SELECTORS.customerModal);
        });
    document
        .querySelector(SELECTORS.customerModal)
        ?.addEventListener("input", () => saveData());
    document
        .querySelector(SELECTORS.customerModal)
        ?.addEventListener("change", () => saveData());

    // --- Shop settings (from menu) ---
    document
        .querySelector(SELECTORS.shopSettingsBtn)
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            const modalEl = document.querySelector(SELECTORS.shopSettingsModal);
            if (modalEl) {
                populateShopSettingsModal();
                showModal(SELECTORS.shopSettingsModal);
            } else {
                console.error("Shop settings modal element not found.");
                showToast("ไม่พบหน้าต่างตั้งค่าร้านค้า", "error");
            }
        });

    // --- Export PDF ---
    document
        .querySelector(SELECTORS.exportPdfBtn)
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            const options = await showExportOptionsModal();
            if (!options) return;

            const payload = buildPayload();
            const quotation = generateQuotationHtml(payload, {
                vatRate:
                    options.vatOption === "include"
                        ? getShopConfig().baseVatRate
                        : 0,
                pageBreakBuffer: options.pageBreakBuffer,
                showDetails: options.showDetails,
            });

            if (!quotation) {
                showToast("ไม่มีรายการ", "warning");
                return;
            }
            // Cache quote number + date so subsequent renders + the receipt
            // reuse the same identity instead of regenerating from the hash.
            if (!payload.quoteNumber) {
                updateDocumentState({
                    quoteNumber: quotation.documentNumber,
                    quoteDate: payload.quoteDate || _todayIso(),
                });
                saveData();
            }
            if (options.exportMethod === "html") exportAsHtmlFile(quotation);
            else renderPdf(quotation.html, options.exportMethod);
        });

    // --- Export Receipt PDF ---
    document
        .querySelector(SELECTORS.exportReceiptBtn)
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");

            const docState = getDocumentState();

            const options = await showReceiptOptionsModal();
            if (!options) return;

            // Persist receipt metadata before generating, so the document
            // number locks in and survives reloads.
            const vatEnabled =
                document.querySelector("#vat_enabled")?.value === "1";
            const vatRate = vatEnabled ? getShopConfig().baseVatRate : 0;

            const existingReceipt = docState.receipt || {};
            const receiptPatch = {
                receiptNumber: existingReceipt.receiptNumber || "",
                paidAt: options.paidAt,
                method: options.method,
                methodNote: options.methodNote,
                paidAmount: options.paidAmount,
                issuerName: options.issuerName || "",
                refQuoteNumber: options.refQuoteNumber || "",
                notes: options.notes || "",
            };
            updateDocumentState({ receipt: receiptPatch });
            saveData();

            const payload = buildPayload();
            const receipt = generateReceiptHtml(payload, {
                vatRate,
                pageBreakBuffer: options.pageBreakBuffer,
                showDetails: options.showDetails,
            });

            if (!receipt) {
                showToast("ไม่มีรายการ", "warning");
                return;
            }

            // Lock receipt number on first issue + lock the form against edits.
            if (!receiptPatch.receiptNumber) {
                updateDocumentState({
                    receipt: {
                        ...receiptPatch,
                        receiptNumber: receipt.documentNumber,
                    },
                    locked: true,
                });
                saveData();
                if (typeof updateLockState === "function") {
                    updateLockState();
                }
            }

            if (options.exportMethod === "html") exportAsHtmlFile(receipt);
            else renderPdf(receipt.html, options.exportMethod);
        });

    // --- Submit ---
    document
        .querySelector(SELECTORS.submitBtn)
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            if (await showConfirmation("ส่งข้อมูล", "?")) {
                const payload = buildPayload();
                if (!payload.customer_name && !payload.customer_phone) {
                    showToast("ใส่ชื่อ/เบอร์", "warning");
                    return;
                }
                showToast("กำลังส่ง...", "default");
                try {
                    showToast(
                        "ฟีเจอร์ส่งข้อมูล (Webhook) ไม่ได้ตั้งค่า",
                        "error"
                    );
                } catch {
                    showToast("เชื่อมต่อผิดพลาด", "error");
                }
            }
        });

    // --- Import JSON ---
    document
        .querySelector(SELECTORS.importBtn)
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            fileImporter?.click();
        });
    fileImporter?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const loadedData = JSON.parse(event.target.result);
                if (loadedData && typeof loadedData === "object") {
                    await loadPayload(loadedData, true);
                } else {
                    throw new Error("Invalid JSON");
                }
            } catch (err) {
                showToast("ไฟล์ JSON ไม่ถูก", "error");
                console.error(err);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    });

    // --- Export JSON ---
    document
        .querySelector(SELECTORS.exportBtn)
        ?.addEventListener("click", (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            try {
                const payload = buildPayload();
                // Strip embedded signature images by default — they're PII and
                // bloat the file. User can re-sign on import if needed.
                let exportablePayload = payload;
                if (payload.signatures) {
                    const stripped = {};
                    for (const [role, sig] of Object.entries(
                        payload.signatures || {}
                    )) {
                        if (!sig) continue;
                        // eslint-disable-next-line no-unused-vars
                        const { dataUrl, ...rest } = sig;
                        stripped[role] = rest;
                    }
                    exportablePayload = {
                        ...payload,
                        signatures: stripped,
                    };
                }
                const dataStr = JSON.stringify(exportablePayload, null, 4);
                const blob = new Blob([dataStr], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const today = new Date();
                const datePart = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}`;
                const timePart = `${today.getHours().toString().padStart(2, "0")}${today.getMinutes().toString().padStart(2, "0")}`;
                const customerName = sanitizeForFilename(
                    payload.customer_name || "data"
                );
                a.href = url;
                a.download = `MTR-${datePart}${timePart}-${customerName}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast("Export สำเร็จ", "success");
            } catch {
                showToast("Export ล้มเหลว", "error");
            }
        });

    // --- Import favorites ---
    document.querySelector("#importFavsBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        menuDropdown?.classList.remove("show");
        menuBtn?.setAttribute("aria-expanded", "false");
        favImporter?.click();
    });
    favImporter?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const favPayload = JSON.parse(event.target.result);
                const count = mergeFavorites(favPayload);
                if (count > 0) {
                    showToast(`เพิ่ม ${count} รายการ`, "success");
                } else {
                    showToast("ไม่พบรายการใหม่", "default");
                }
            } catch {
                showToast("ไฟล์ JSON ไม่ถูก", "error");
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    });

    // --- Export favorites ---
    document.querySelector("#exportFavsBtn")?.addEventListener("click", (e) => {
        e.preventDefault();
        menuDropdown?.classList.remove("show");
        menuBtn?.setAttribute("aria-expanded", "false");
        try {
            const favoritesPayload = getFavorites();
            if (
                Object.values(favoritesPayload).every((arr) => arr.length === 0)
            ) {
                showToast("ไม่มีรายการ", "warning");
                return;
            }
            const dataStr = JSON.stringify(favoritesPayload, null, 4);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const datePart = new Date()
                .toISOString()
                .slice(0, 10)
                .replace(/-/g, "");
            a.href = url;
            a.download = `MTR-Favorites-${datePart}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Export สำเร็จ", "success");
        } catch {
            showToast("Export ล้มเหลว", "error");
        }
    });

    // --- Clear items ---
    document
        .querySelector(SELECTORS.clearItemsBtn)
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            if (await showConfirmation("ล้างทุกรายการ", "?")) {
                pushState(buildPayload());
                updateUndoButtonState();
                document.querySelectorAll(SELECTORS.room).forEach((roomEl) => {
                    roomEl.getItemsContainer().innerHTML = "";
                });
                const dt = document.querySelector("#discount_type");
                const dv = document.querySelector("#discount_value");
                if (dt) dt.value = "amount";
                if (dv) dv.value = "0";
                const today = _todayIso();
                setDocumentState({
                    quoteNumber: "",
                    quoteDate: today,
                    locked: false,
                    receipt: null,
                    signatures: null,
                });
                const quoteDateEl = document.querySelector("#quote_date");
                if (quoteDateEl) quoteDateEl.value = today;
                if (typeof updateLockState === "function") updateLockState();
                renumberItemTitles();
                recalcAll();
                saveData();
                showToast("ล้างแล้ว", "success");
            }
        });

    // --- Clear all ---
    document
        .querySelector(SELECTORS.clearAllBtn)
        ?.addEventListener("click", async (e) => {
            e.preventDefault();
            menuDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            if (
                await showConfirmation(
                    "ลบข้อมูลทั้งหมด",
                    "คำเตือน! ข้อมูลทั้งหมดรวมถึงรายการโปรดจะถูกลบถาวร ยืนยันหรือไม่?"
                )
            ) {
                const roomsContainer = document.querySelector(
                    SELECTORS.roomsContainer
                );
                if (roomsContainer) roomsContainer.innerHTML = "";
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(SHOP_CONFIG_KEY);
                clearAllFavorites();
                showToast("ลบข้อมูลทั้งหมดแล้ว กำลังรีโหลด...", "success");
                setTimeout(() => window.location.reload(), 500);
            }
        });

    // --- Window click (dismiss menus, close details) ---
    window.addEventListener("click", (e) => {
        if (!e.target.closest(".menu-container")) {
            menuDropdown?.classList.remove("show");
            quickNavDropdown?.classList.remove("show");
            menuBtn?.setAttribute("aria-expanded", "false");
            quickNavBtn?.setAttribute("aria-expanded", "false");
        }
        if (!e.target.closest(".room-options-container")) {
            document
                .querySelectorAll(".room-options-menu.show")
                .forEach((menu) => menu.classList.remove("show"));
        }
        const clickedCard = e.target.closest(".item-card");
        document
            .querySelectorAll(".item-details-more.show")
            .forEach((detailsEl) => {
                const parentCard = detailsEl.closest(".item-card");
                if (parentCard !== clickedCard) {
                    toggleDetails(parentCard, false);
                }
            });
    });

    // --- Beforeunload ---
    window.addEventListener("beforeunload", saveData);

}
