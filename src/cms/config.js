import { FS } from '../core/FS.js'

const REQUIRED = [
    'default_og_image',
    'min_word_count',
]

export async function loadConfig(path) {
    const config = await FS.load(path)

    for (const key of REQUIRED) {
        if (config[key] == null) {
            const err = new Error(`config missing required key: ${key}`)
            err.code = 'MISSING_FIELD'
            err.field = key
            throw err
        }
    }

    // Reconstruct nested structure needed by the app from flat YAML parser output
    const activeStr = config.active || '[en]'
    const activeMatch = activeStr.match(/\[(.*)\]/)
    const activeLocales = activeMatch ? activeMatch[1].split(',').map(s => s.trim()) : ['en']

    const structuredConfig = {
        locales: { active: activeLocales },
        site: { 
            title: config.title, 
            url: config.url, 
            description: config.description, 
            default_og_image: config.default_og_image 
        },
        adsense: {
            publisher_id: config.publisher_id,
            slots: { top: config.top, mid: config.mid, bottom: config.bottom }
        },
        analytics: { ga4_measurement_id: config.ga4_measurement_id },
        quality_gate: { min_word_count: config.min_word_count },
        categories: config.categories || []
    }

    return Object.freeze(structuredConfig)
}
