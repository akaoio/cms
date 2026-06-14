import { FS } from '../core/FS.js'

/**
 * scanArticleFolders — Recursively scans a content root for article folders.
 * An article folder is identified by the presence of 'meta.yaml'.
 *
 * @param {string[]} root
 * @returns {Promise<string[][]>} Array of directory paths (as string arrays)
 */
async function scanArticleFolders(root) {
    const results = []

    async function walk(currentPath) {
        const entries = await FS.dir(currentPath)

        // If meta.yaml exists, this is an article folder
        if (entries.includes('meta.yaml')) {
            results.push(currentPath)
            return // Don't recurse deeper into article folders
        }

        for (const entry of entries) {
            const nextPath = [...currentPath, entry]
            if (await FS.isDirectory(nextPath)) {
                await walk(nextPath)
            }
        }
    }

    if (await FS.exist(root)) {
        await walk(root)
    }

    return results
}

/**
 * ingest — Recursively scans content/posts/staged/** for article folders.
 *
 * @returns {Promise<string[][]>} Array of directory paths (as string arrays)
 */
export async function ingest() {
    return scanArticleFolders(['content', 'posts', 'staged'])
}

/**
 * ingestArchived — Recursively scans content/posts/archived/** for article folders.
 * Used to emit redirect stubs so previously published URLs never 404.
 *
 * @returns {Promise<string[][]>} Array of directory paths (as string arrays)
 */
export async function ingestArchived() {
    return scanArticleFolders(['content', 'posts', 'archived'])
}
