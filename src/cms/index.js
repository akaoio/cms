import { FS } from '../core/FS.js'

/**
 * loadManifest — Load build/manifest.json. 
 * If manifest.tmp.json exists, a previous build crashed; return null to force full rebuild.
 */
export async function loadManifest() {
    const path = ['build', 'manifest.json']
    const tmpPath = ['build', 'manifest.tmp.json']

    if (await FS.exist(tmpPath)) {
        console.warn('⚠️  manifest.tmp.json detected (crash recovery). Forcing full rebuild.')
        return null
    }

    if (!(await FS.exist(path))) return null

    try {
        return await FS.load(path)
    } catch (err) {
        console.error('Failed to load manifest.json', err)
        return null
    }
}

/**
 * saveManifest — Write to manifest.tmp.json then rename to manifest.json (atomic).
 */
export async function saveManifest(entries) {
    const manifest = {
        v: 1,
        built: new Date().toISOString(),
        entries
    }
    const path = ['build', 'manifest.json']
    const tmpPath = ['build', 'manifest.tmp.json']

    await FS.write(tmpPath, JSON.stringify(manifest, null, 2))
    await FS.move(tmpPath, path)
}

/**
 * saveIndex — Emit build/index.json for the UI to consume.
 */
export async function saveIndex(entries) {
    // Transform manifest entries into a flat array of index records
    const records = Object.values(entries).map(e => ({
        slug: e.slug,
        title: e.title,
        date: e.date_iso, // Original ISO date
        category: e.category,
        subcategory: e.subcategory,
        tags: e.tags || [],
        description: e.description || '',
        locale: e.locale,
        url: e.url
    }))

    // Sort by date descending
    records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    await FS.write(['build', 'index.json'], JSON.stringify(records, null, 2))
}

/**
 * sha256 — Simple SHA-256 implementation for strings.
 */
export async function sha256(message) {
    const msgUint8 = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
