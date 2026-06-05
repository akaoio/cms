/**
 * DB - Hash-validated static file loader with IndexedDB cache
 *
 * Production: validates cache freshness via .hash files before serving cached data.
 * Dev mode (localhost): skips hash validation, always loads fresh — but still writes to IDB.
 *
 * Production flow:
 *   1. Check Indexes.Hashes for the cached hash of the requested path
 *   2. Load the `.hash` file from the server (lightweight, always fresh)
 *   3. If hashes match → serve from Indexes.Statics (no re-fetch)
 *   4. If hashes differ → re-fetch data, update both Indexes.Statics and Indexes.Hashes
 */
import { FS } from "./FS.js"
import { Indexes } from "./Stores.js"
import { BROWSER, DEV } from "./Utils/environment.js"

export class DB {
    // Yields to the browser scheduler between heavy operations.
    static _yield() {
        if (typeof scheduler !== "undefined" && scheduler.yield) return scheduler.yield()

        if (typeof MessageChannel !== "undefined")
            return new Promise((resolve) => {
                const ch = new MessageChannel()
                ch.port1.onmessage = resolve
                ch.port2.postMessage(null)
            })

        return new Promise((r) => setTimeout(r, 0))
    }

    static async _hash(path = []) {
        if (!(BROWSER && typeof fetch === "function")) {
            const hash = await FS.load(path, { quiet: true })
            return typeof hash === "string" ? { ok: true, status: 200, hash } : { ok: false, status: null, hash: undefined }
        }

        try {
            const url = Array.isArray(path) ? `/${path.filter(Boolean).join("/")}` : String(path ?? "")
            const response = await fetch(url)
            if (response.ok) return { ok: true, status: response.status, hash: await response.text() }
            if (response.status === 404) return { ok: false, status: 404, hash: undefined }
            return { ok: false, status: response.status, hash: undefined }
        } catch {
            return { ok: false, status: null, hash: undefined }
        }
    }

    static async get(path = []) {
        const type = path.at?.(-1)?.endsWith?.(".hash") ? "hash" : "data"

        // Dev mode: skip hash validation, always load fresh
        if (DEV) {
            if (type === "hash") return FS.load(path)
            const data = await FS.load(path, { fresh: true, quiet: true })
            if (typeof data !== "undefined") await Indexes.Statics.get(path).put(data)
            else {
                await Indexes.Statics.del(path)
                await Indexes.Hashes.del(path)
            }
            return data
        }

        const memory = await Indexes.Hashes.get(path).once()
        const hashpth = path?.with?.(-1, path?.at?.(-1)?.replace?.(/\.\w+$/, ".hash"))
        const hashres = await DB._hash(hashpth)
        const hash = hashres.hash

        if (memory && hashres.ok && memory === hash) {
            if (type === "hash") return hash
            return Indexes.Statics.get(path).once()
        }

        if (type === "hash") return hash

        const data = await FS.load(path)
        if (typeof data !== "undefined") {
            await Indexes.Statics.get(path).put(data)
            if (hashres.ok) await Indexes.Hashes.get(path).put(hash)
        }
        else if (memory && hashres.status === 404) {
            await Indexes.Hashes.del(path)
            await Indexes.Statics.del(path)
        }
        return data
    }

    // Converts a numeric article ID into a chunked path segment array.
    // e.g. 1000 → ["10", "00"], 123456 → ["12", "34", "56"]
    // Mirrors the content/posts/published/YYYY/MM/DD/XX/YY/ directory convention.
    static path(id) {
        const str = String(id)
        const segments = []
        for (let i = str.length; i > 0; i -= 2) segments.unshift(str.slice(Math.max(0, i - 2), i))
        return segments
    }
}

export default DB
