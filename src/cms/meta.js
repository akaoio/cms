import { FS } from '../core/FS.js'
import { extractFrontmatter } from './markdown.js'

const REQUIRED = ['title']

export async function readMeta(dir, locale) {
    const raw = await FS.load([...dir, 'meta.yaml'])

    let localeMeta = {}
    if (locale) {
        const mdText = await FS.load([...dir, `${locale}.md`])
        if (typeof mdText === 'string') {
            const { meta } = extractFrontmatter(mdText)
            if (meta) localeMeta = meta
        }
    }

    const merged = { ...raw, ...localeMeta }

    for (const field of REQUIRED) {
        if (merged[field] == null) {
            const err = new Error(`MISSING_FIELD: ${field}`)
            err.code = 'MISSING_FIELD'
            err.field = field
            err.dir = dir
            throw err
        }
    }

    const { draft, status, ...meta } = merged
    return meta
}
