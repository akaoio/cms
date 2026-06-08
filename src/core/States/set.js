/**
 * Set state values.
 * @param {string|string[]|Object} data - Property name(s) and value(s) to set
 */
export function set(data) {
    if (!data) return
    // String: set to true
    if (typeof data === "string") this.proxy[data] = true
    // Array: set each key to true
    else if (Array.isArray(data)) data.forEach((k) => (this.proxy[k] = true))
    // Object: set each key-value pair
    else Object.entries(data).forEach(([k, v]) => (this.proxy[k] = v))
    // Snapshot queue before draining to guard against re-entrant set() calls from subscribers
    const pending = this.notifications.splice(0)
    for (const n of pending) this.notify(n)
}
