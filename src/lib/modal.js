// src/lib/modal.js
import { SELECTORS } from "./config.js";
import { sanitizeHTML } from "./utils.js";

const modalStack = [];

/**
 *
 */
export function getTopModal() {
    return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
}

/**
 *
 * @param message
 * @param type
 */
export function showToast(message, type = "default") {
    const container = document.querySelector(
        SELECTORS.toastContainer || "#toast-container"
    );
    if (!container) return;
    const icons = {
        success: "ph-bold ph-check-circle",
        warning: "ph-bold ph-warning",
        error: "ph-bold ph-x-circle",
        default: "ph-bold ph-info",
    };
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="${icons[type] || icons.default}"></i> ${sanitizeHTML(message)}`;
    container.appendChild(toast);

    toast.offsetHeight; // Trigger reflow

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove());
    }, 3000);
}

// --- The Magic Bridge (ตัวเชื่อม Native Dialog) ---
const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
            const target = mutation.target;
            if (target.tagName && target.tagName.toLowerCase() === "dialog") {
                const hasShow = target.classList.contains("show");
                if (hasShow && !target.open) {
                    target.showModal();
                    if (!modalStack.includes(target)) modalStack.push(target);
                } else if (!hasShow && target.open) {
                    target.close();
                    const idx = modalStack.indexOf(target);
                    if (idx > -1) modalStack.splice(idx, 1);
                }
            }
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("dialog.modal").forEach((dialog) => {
        modalObserver.observe(dialog, { attributes: true });
    });
});

/**
 *
 * @param selector
 * @param persistent
 */
export function showModal(selector, persistent = false) {
    return new Promise((resolve) => {
        const modalEl = document.querySelector(selector);
        if (!modalEl) {
            resolve(false);
            return;
        }

        let isResolved = false;

        const cleanup = (result) => {
            if (isResolved) return;
            isResolved = true;

            // ล้าง Events ทิ้งเมื่อหน้าต่างปิด
            modalEl.removeEventListener("click", clickHandler);
            document.removeEventListener("keydown", keydownHandler);
            delete modalEl.closeModal;

            // ปิด Modal
            modalEl.classList.remove("show");
            resolve(result);
        };

        // ลอจิกการกดปุ่มที่เฉียบขาดขึ้น
        const clickHandler = (e) => {
            const target = e.target;

            // 1. กลุ่มยกเลิก (Cancel / Close / X)
            if (
                target.closest('[data-act="close-modal"]') ||
                target.closest(".btn-close-modal")
            ) {
                e.preventDefault();
                cleanup({ cancelled: true });
                return;
            }

            // 2. คลิกพื้นที่ว่างนอกกรอบ (Backdrop)
            if (target === modalEl && !persistent) {
                cleanup({ cancelled: true });
                return;
            }

            // 3. กลุ่มยืนยัน (Confirm / Save / Apply)
            // เช็คว่าเป็นปุ่มที่อยู่ใน Footer หรือมีชื่อ ID ลงท้ายด้วย Confirm หรือไม่
            const isConfirmBtn =
                target.closest('[id$="Confirm"]') ||
                target.closest('[id$="ConfirmBtn"]') ||
                target.closest('[data-act="save-shop-config"]') ||
                (target.closest(".modal-footer") &&
                    (target.closest(".btn-primary") ||
                        target.closest(".btn-danger")));

            if (isConfirmBtn) {
                e.preventDefault(); // กันฟอร์มรีเฟรชหน้าเว็บ
                cleanup(true);
            }
        };

        // ดักปุ่ม ESC บนคีย์บอร์ด
        const keydownHandler = (e) => {
            if (e.key === "Escape" && !persistent) {
                cleanup({ cancelled: true });
            }
        };

        // ผูก Events
        modalEl.addEventListener("click", clickHandler);
        document.addEventListener("keydown", keydownHandler);

        // Programmatic close: callers may invoke modalEl.closeModal(result) to
        // close from outside (e.g. after a save handler completes). The
        // property is deleted automatically by cleanup() once the modal closes.
        modalEl.closeModal = cleanup;

        // สั่งเปิด Modal
        modalEl.classList.add("show");

        // Safety Net: เผื่อสคริปต์ภายนอกสั่งลบคลาส .show โดยตรง
        const checkClose = setInterval(() => {
            if (!modalEl.classList.contains("show") && !modalEl.open) {
                clearInterval(checkClose);
                if (!isResolved) {
                    cleanup({ cancelled: true });
                }
            }
        }, 100);
    });
}

/**
 *
 * @param title
 * @param body
 */
export async function showConfirmation(title, body) {
    const modalEl = document.querySelector("#confirmationModal");
    if (!modalEl) return true;

    modalEl.querySelector(".modal-title").textContent = title;
    modalEl.querySelector(".modal-body").innerHTML = body;

    const result = await showModal("#confirmationModal");
    return result === true;
}
