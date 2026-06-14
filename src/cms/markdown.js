import { parse as parseYAML } from '../core/YAML.js'

export function extractFrontmatter(text) {
    const s = text.replace(/\r\n/g, '\n')
    if (!s.startsWith('---\n')) return { meta: null, body: text }
    const end = s.indexOf('\n---\n', 4)
    if (end === -1) return { meta: null, body: text }
    const yamlBlock = s.slice(4, end)
    const body = s.slice(end + 5)
    try {
        return { meta: parseYAML(yamlBlock), body }
    } catch {
        return { meta: null, body: text }
    }
}

function applyInline(text) {
    // Images before links (avoid link regex consuming image alt-text brackets)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Bold before italic to handle ** correctly
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>')
    return text
}

export function parseMarkdown(input) {
    const { body } = extractFrontmatter(input)
    const codeBlocks = []

    // Extract fenced code blocks before any other processing
    let text = body.replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code) => {
        const i = codeBlocks.length
        codeBlocks.push(`<pre><code>${code.trimEnd()}</code></pre>`)
        return `\x00CODE${i}\x00`
    })

    const lines = text.split('\n')
    const out = []
    let i = 0

    while (i < lines.length) {
        const raw = lines[i]
        const line = raw.trim()

        if (!line) { out.push(''); i++; continue }

        // Code block placeholder
        if (/^\x00CODE\d+\x00$/.test(line)) { out.push(line); i++; continue }

        // Heading
        const hm = line.match(/^(#{1,6}) (.+)/)
        if (hm) {
            out.push(`<h${hm[1].length}>${applyInline(hm[2].trim())}</h${hm[1].length}>`)
            i++; continue
        }

        // Horizontal rule
        if (line === '---') { out.push('<hr/>'); i++; continue }

        // Blockquote — gather consecutive '>' lines
        if (line.startsWith('>')) {
            const bq = []
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                bq.push(lines[i].trim().replace(/^> ?/, ''))
                i++
            }
            out.push(`<blockquote>${applyInline(bq.join(' '))}</blockquote>`)
            continue
        }

        // Unordered list — gather consecutive '- ' lines
        if (line.startsWith('- ')) {
            const items = []
            while (i < lines.length && lines[i].trim().startsWith('- ')) {
                items.push(`<li>${applyInline(lines[i].trim().slice(2))}</li>`)
                i++
            }
            out.push(`<ul>${items.join('')}</ul>`)
            continue
        }

        // Ordered list — gather consecutive 'N. ' lines
        if (/^\d+\. /.test(line)) {
            const items = []
            while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
                items.push(`<li>${applyInline(lines[i].trim().replace(/^\d+\. /, ''))}</li>`)
                i++
            }
            out.push(`<ol>${items.join('')}</ol>`)
            continue
        }

        // Paragraph — accumulate until blank line or block-level token
        const para = []
        while (i < lines.length) {
            const l = lines[i].trim()
            if (!l) break
            if (/^(#{1,6} |---|> |- |\d+\. )/.test(l) || /^\x00CODE\d+\x00$/.test(l)) break
            para.push(l)
            i++
        }
        if (para.length) out.push(`<p>${applyInline(para.join(' '))}</p>`)
    }

    let html = out.join('\n')
    html = html.replace(/\x00CODE(\d+)\x00/g, (_, idx) => codeBlocks[Number(idx)])
    return html
}
