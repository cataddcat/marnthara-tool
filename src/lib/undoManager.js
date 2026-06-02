// src/lib/undoManager.js
const undoStack = [];
const MAX_HISTORY = 10; // Maximum number of undo steps

/**
 * Saves the current state (payload) to the undo stack.
 * If the stack exceeds MAX_HISTORY, the oldest state is removed.
 * @param {object} state - The payload object from buildPayload()
 */
export function pushState(state) {
    // Basic check to avoid pushing undefined or null states
    if (!state) {
        console.warn("Attempted to push invalid state to undo stack.");
        return;
    }
    // Deep clone the state to prevent mutations after pushing
    try {
        const clonedState = JSON.parse(JSON.stringify(state));
        undoStack.push(clonedState);
        // If history exceeds the limit, remove the oldest entry (FIFO)
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }
    } catch (e) {
        console.error("Failed to clone state for undo history:", e);
    }
}

/**
 * Retrieves and removes the most recent state from the undo stack.
 * @returns {object|undefined} The last saved state, or undefined if the stack is empty.
 */
export function popState() {
    if (undoStack.length === 0) {
        return undefined; // Nothing to undo
    }
    return undoStack.pop();
}

/**
 * Checks if there are any states available to undo.
 * @returns {boolean} True if the undo stack is not empty.
 */
export function canUndo() {
    return undoStack.length > 0;
}
