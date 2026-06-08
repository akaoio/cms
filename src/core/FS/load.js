import { BROWSER, driver, isBinary } from "./shared.js"
import { join } from "./join.js"

/**
 * Load content from files or directories (JSON or plain text).
 * Browser: HTTP fetch only — IndexedDB caching is handled by DB.js above this layer.
 * Node.js: direct filesystem read.
 * @param {string|string[]|object} path
 * @returns {Promise<*>} Parsed content, raw text, Uint8Array for binary, or object map for dirs
 */
export async function load(path, options = {}) {
    const quiet = options.quiet === true

    if (typeof path === "string") path = [path]

    if (Array.isArray(path)) {
        const _path = join(path)
        let text

        if (BROWSER) {
            const _isBinary = isBinary(_path)
            let httpStatus = null
            try {
                const response = await fetch(_path)
                httpStatus = response.status
                if (response.ok) {
                    if (_isBinary) return new Uint8Array(await response.arrayBuffer())
                    text = await response.text()
                } else {
                    if (!quiet) console.error(`Path not found: ${_path} (${httpStatus})`)
                    return
                }
            } catch {
                if (!quiet) console.error("Network error loading:", _path)
                return
            }
        } else if (await driver.exists(path)) {
            if (await driver.isDir(path)) {
                const files = {}
                for (const { name } of await driver.entries(path)) {
                    const child = await load([...path, name], options)
                    if (child) files[name.replace(/\.\w{2,4}$/, "")] = child
                }
                return files
            }

            if (isBinary(_path)) return await driver.readBytes(path)
            const bytes = await driver.readBytes(path)
            if (!bytes) {
                if (!quiet) console.error("Error reading from", _path)
                return
            }
            text = new TextDecoder().decode(bytes)
        }

        if (typeof text === "string") text = text.trim()
        const ext = _path.match(/\.\w+$/)?.[0]?.slice(1).toLowerCase() || ""
        if (ext === "json")
            try { return JSON.parse(text) } catch { return text }

        return text
    }

    // Object input: load multiple paths in parallel as key-value pairs
    if (typeof path === "object" && path !== null) {
        const content = {}
        await Promise.all(
            Object.entries(path).map(async ([key, value]) => {
                content[key] = await load(value, options)
            })
        )
        return content
    }
}
