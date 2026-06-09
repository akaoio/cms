import { FS } from '../core/FS.js'

const REQUIRED = [
    ['site', 'default_og_image'],
    ['quality_gate', 'min_word_count'],
]

export async function loadConfig(path) {
    const config = await FS.load(path)

    for (const [section, key] of REQUIRED) {
        if (config[section]?.[key] == null) {
            const err = new Error(`config.${section}.${key} is required`)
            err.code = 'MISSING_FIELD'
            err.field = `${section}.${key}`
            throw err
        }
    }

    return Object.freeze(config)
}
