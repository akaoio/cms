import { FS } from '../core/FS.js'

/**
 * ingest — Recursively scans content/posts/published/** for article folders.
 * An article folder is identified by the presence of 'meta.yaml'.
 * 
 * @returns {Promise<string[][]>} Array of directory paths (as string arrays)
 */
export async function ingest() {
    const root = ['content', 'posts', 'published']
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
