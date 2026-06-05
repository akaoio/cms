import { BROWSER, driver } from "./shared.js"
import { join } from "./join.js"

// crypto.subtle is available globally in browser and Node 18+ — no npm dep needed
async function _sha256(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Calculate hash of a file, directory, or multiple paths
 * @param {string[]|string[][]} path - Path segments (1D array for single path, 2D array for multiple paths)
 * @param {string[]} exclude - Array of file paths to exclude from hashing (relative to directory, only used for directories)
 * @returns {Promise<string>} SHA-256 hash of the file/directory/multiple paths contents
 */
export async function hash(path, exclude = []) {
    if (BROWSER) {
        const buf = await driver.readBytes(path)
        if (!buf) return ""
        const hashBuf = await crypto.subtle.digest("SHA-256", buf)
        return Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
    }

    // Detect if path is a 2D array (multiple paths) or 1D array (single path)
    const isMultiplePaths = Array.isArray(path[0])

    if (isMultiplePaths) {
        let combined = ""

        const sorted = [...path].sort((a, b) => join(a).localeCompare(join(b)))

        for (const segments of sorted) {
            if (!await driver.exists(segments)) {
                console.error("Path doesn't exist:", join(segments))
                continue
            }
            const item = join(segments)
            if (await driver.isDir(segments)) {
                combined += item
                combined += await hashDir(segments, exclude)
            } else {
                combined += item
                const bytes = await driver.readBytes(segments)
                combined += new TextDecoder().decode(bytes)
            }
        }

        return _sha256(combined)
    }

    // Single path
    if (!await driver.exists(path)) {
        console.error("Path doesn't exist:", join(path))
        return ""
    }

    try {
        if (await driver.isDir(path)) return _sha256(await hashDir(path, exclude))
        const bytes = await driver.readBytes(path)
        return _sha256(new TextDecoder().decode(bytes))
    } catch (error) {
        console.error("Error hashing:", error)
        return ""
    }
}

async function hashDir(pathArr, exclude = []) {
    let combined = ""

    async function processDir(currentArr, relativePath = "") {
        const entries = await driver.entries(currentArr)
        entries.sort((a, b) => a.name.localeCompare(b.name))

        for (const { name, isDir } of entries) {
            const relPath = relativePath ? `${relativePath}/${name}` : name
            if (exclude.some((ex) => relPath === ex || relPath.startsWith(ex + "/"))) continue

            combined += name
            if (isDir) await processDir([...currentArr, name], relPath)
            else {
                const bytes = await driver.readBytes([...currentArr, name])
                combined += new TextDecoder().decode(bytes)
            }
        }
    }

    await processDir(pathArr)
    return combined
}
