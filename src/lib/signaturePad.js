// src/lib/signaturePad.js
// --- DIGITAL SIGNATURE MODAL ---
// Wraps the signature_pad library and exposes a Promise-based modal that
// resolves to { dataUrl, name } or null on cancel.
import SignaturePad from "signature_pad";
import { SELECTORS } from "./config.js";
import { showModal } from "./modal.js";

/**
 * Resizes the canvas backing store to match its CSS size and the device pixel
 * ratio. Must be called after the modal becomes visible (canvas has layout).
 * @param {HTMLCanvasElement} canvas
 */
function _resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(ratio, ratio);
}

/**
 * Opens the signature modal. Resolves with { dataUrl, name, signedAt } or null
 * if the user cancels.
 *
 * @param {object} opts
 * @param {string} opts.roleLabel - Display label (e.g., "ผู้รับเงิน")
 * @param {object} [opts.existing] - Existing signature to pre-load
 * @returns {Promise<object|null>}
 */
export async function captureSignature(opts) {
    const modalEl = document.querySelector(SELECTORS.signatureModal);
    if (!modalEl) return null;

    const roleLabel = modalEl.querySelector("#signatureModalRoleLabel");
    const nameInput = modalEl.querySelector("#signatureSignerName");
    const canvas = modalEl.querySelector("#signaturePadCanvas");
    const clearBtn = modalEl.querySelector("#signatureClearBtn");
    const saveBtn = modalEl.querySelector("#signatureSaveBtn");

    if (!canvas || !saveBtn) return null;

    if (roleLabel) roleLabel.textContent = opts.roleLabel || "";
    if (nameInput) nameInput.value = opts.existing?.name || "";

    // Make canvas visible before sizing so getBoundingClientRect is non-zero.
    // <dialog> is display:none until showModal() runs, so defer sizing until
    // after the modal opens by using requestAnimationFrame inside showModal's
    // microtask. We do that by sizing inside a setTimeout(0) below.
    let pad;
    let saveHandler;
    let clearHandler;

    const initPad = () => {
        _resizeCanvas(canvas);
        pad = new SignaturePad(canvas, {
            penColor: "#1a1a1a",
            backgroundColor: "rgba(255,255,255,0)",
            minWidth: 0.6,
            maxWidth: 2.2,
        });
        if (opts.existing?.dataUrl) {
            pad.fromDataURL(opts.existing.dataUrl);
        }
    };

    let resolveSave;
    const savePromise = new Promise((resolve) => {
        resolveSave = resolve;
    });

    saveHandler = () => {
        if (!pad || pad.isEmpty()) {
            resolveSave(null);
            return;
        }
        const dataUrl = pad.toDataURL("image/png");
        resolveSave({
            dataUrl,
            name: nameInput?.value?.trim() || "",
            signedAt: new Date().toISOString(),
        });
    };
    clearHandler = () => pad?.clear();

    saveBtn.addEventListener("click", saveHandler);
    clearBtn?.addEventListener("click", clearHandler);

    // Defer init until the dialog is actually displayed.
    queueMicrotask(initPad);

    const modalResultPromise = showModal(SELECTORS.signatureModal);

    // Whichever resolves first wins. If the user clicks Save, savePromise
    // resolves with a value; we then close the modal manually. If they cancel
    // (Esc / X / cancel button), modalResultPromise resolves with cancel.
    let result = null;
    try {
        const winner = await Promise.race([
            savePromise.then((v) => ({ kind: "save", value: v })),
            modalResultPromise.then((v) => ({ kind: "modal", value: v })),
        ]);
        if (winner.kind === "save" && winner.value) {
            result = winner.value;
            modalEl.close();
        } else if (winner.kind === "save" && !winner.value) {
            // Empty signature — keep modal open so user can try again
            saveBtn.removeEventListener("click", saveHandler);
            clearBtn?.removeEventListener("click", clearHandler);
            return await captureSignature(opts);
        }
    } finally {
        saveBtn.removeEventListener("click", saveHandler);
        clearBtn?.removeEventListener("click", clearHandler);
        pad?.off();
    }

    return result;
}
