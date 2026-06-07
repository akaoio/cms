// Minimal zero-dependency YAML serializer — covers the subset FS.write needs
// (plain objects, arrays, scalars). Not a full YAML 1.2 implementation: no
// anchors, aliases, multi-document streams, or flow collections.

const NEEDS_QUOTING = /^[\s]|[\s]$|^[-?:,\[\]{}#&*!|>'"%@`]|: |:$|[\n\t]|^(true|false|null|yes|no|on|off|~)$|^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/i

function scalar(value) {
    if (value === null || value === undefined) return "null"
    if (typeof value === "boolean" || typeof value === "number") return String(value)
    const str = String(value)
    if (str === "" || NEEDS_QUOTING.test(str)) return JSON.stringify(str)
    return str
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value)
}

function block(value, indent) {
    const pad = "  ".repeat(indent)

    if (Array.isArray(value)) {
        if (!value.length) return " []\n"
        let out = "\n"
        for (const item of value) {
            if (isPlainObject(item) || Array.isArray(item)) out += `${pad}-${block(item, indent + 1)}`
            else out += `${pad}- ${scalar(item)}\n`
        }
        return out
    }

    if (isPlainObject(value)) {
        const keys = Object.keys(value)
        if (!keys.length) return " {}\n"
        let out = "\n"
        for (const key of keys) {
            const val = value[key]
            const keyStr = NEEDS_QUOTING.test(key) ? JSON.stringify(key) : key
            if (isPlainObject(val) || Array.isArray(val)) out += `${pad}${keyStr}:${block(val, indent + 1)}`
            else out += `${pad}${keyStr}: ${scalar(val)}\n`
        }
        return out
    }

    return ` ${scalar(value)}\n`
}

/**
 * Serialize a plain JS value to a YAML string.
 * @param {*} value
 * @returns {string}
 */
export function stringify(value) {
    if (isPlainObject(value) || Array.isArray(value)) return block(value, 0).slice(1)
    return `${scalar(value)}\n`
}

export const YAML = { stringify }

export default YAML
