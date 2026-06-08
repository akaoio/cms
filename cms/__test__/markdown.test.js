// Fixture-first test for src/cms/markdown.js — see TEST_PLAN.md B4/B5 / STORIES.md Story 1.2 & 1.3
import { test } from "node:test"
import assert from "node:assert"
import { FS } from "../../src/core/FS.js"
import { parseMarkdown } from "../markdown.js"

const FIXTURES = ["cms", "__test__", "fixtures"]
const dir = (...parts) => [...FIXTURES, ...parts]

test("markdown — body loader", async (t) => {
    await t.test("loads a body .md with no frontmatter fence — first character is article content", async () => {
        const body = await FS.load(dir("published", "2026", "06", "01", "00", "01", "en.md"))

        assert.strictEqual(typeof body, "string")
        assert.strictEqual(body.startsWith("---"), false)
        assert.strictEqual(body[0], "#")
        assert.strictEqual(body.startsWith("# How Static Site Generators"), true)
    })

    await t.test("loads thin-content fixture body verbatim, with no fence stripping needed", async () => {
        const body = await FS.load(dir("published", "2026", "06", "01", "00", "06", "en.md"))

        assert.strictEqual(body.startsWith("# A Short Note"), true)
    })
})

test("markdown — converter", async (t) => {
    await t.test("converts headings h1 through h6", () => {
        const html = parseMarkdown("# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6")

        assert.match(html, /<h1>H1<\/h1>/)
        assert.match(html, /<h2>H2<\/h2>/)
        assert.match(html, /<h3>H3<\/h3>/)
        assert.match(html, /<h4>H4<\/h4>/)
        assert.match(html, /<h5>H5<\/h5>/)
        assert.match(html, /<h6>H6<\/h6>/)
    })

    await t.test("converts bold and italic emphasis", () => {
        const html = parseMarkdown("This is **bold** and this is *italic*.")

        assert.match(html, /<strong>bold<\/strong>/)
        assert.match(html, /<em>italic<\/em>/)
    })

    await t.test("converts inline code", () => {
        const html = parseMarkdown("Use the `parseMarkdown` function.")

        assert.match(html, /<code>parseMarkdown<\/code>/)
    })

    await t.test("converts fenced code blocks", () => {
        const html = parseMarkdown("```\nconst x = 1\n```")

        assert.match(html, /<pre><code>/)
        assert.match(html, /const x = 1/)
        assert.match(html, /<\/code><\/pre>/)
    })

    await t.test("converts links", () => {
        const html = parseMarkdown("See the [W3C spec](https://www.w3.org/TR/html52/) for details.")

        assert.match(html, /<a href="https:\/\/www\.w3\.org\/TR\/html52\/">W3C spec<\/a>/)
    })

    await t.test("converts images", () => {
        const html = parseMarkdown("![Diagram of the pipeline](https://example.com/diagram.png)")

        assert.match(html, /<img src="https:\/\/example\.com\/diagram\.png" alt="Diagram of the pipeline"/)
    })

    await t.test("converts unordered lists", () => {
        const html = parseMarkdown("- First item\n- Second item\n- Third item")

        assert.match(html, /<ul>/)
        assert.match(html, /<li>First item<\/li>/)
        assert.match(html, /<li>Second item<\/li>/)
        assert.match(html, /<li>Third item<\/li>/)
        assert.match(html, /<\/ul>/)
    })

    await t.test("converts ordered lists", () => {
        const html = parseMarkdown("1. First step\n2. Second step\n3. Third step")

        assert.match(html, /<ol>/)
        assert.match(html, /<li>First step<\/li>/)
        assert.match(html, /<li>Second step<\/li>/)
        assert.match(html, /<li>Third step<\/li>/)
        assert.match(html, /<\/ol>/)
    })

    await t.test("converts blockquotes", () => {
        const html = parseMarkdown("> A quoted line of wisdom.")

        assert.match(html, /<blockquote>/)
        assert.match(html, /A quoted line of wisdom\./)
        assert.match(html, /<\/blockquote>/)
    })

    await t.test("converts horizontal rules", () => {
        const html = parseMarkdown("Above the line.\n\n---\n\nBelow the line.")

        assert.match(html, /<hr\s*\/?>/)
    })

    await t.test("converts the full fixture article body without throwing", async () => {
        const body = await FS.load(dir("published", "2026", "06", "01", "00", "01", "en.md"))
        const html = parseMarkdown(body)

        assert.strictEqual(typeof html, "string")
        assert.match(html, /<h1>How Static Site Generators Are Reshaping Modern Publishing<\/h1>/)
        assert.match(html, /<h2>Why Speed Still Wins<\/h2>/)
        assert.match(html, /<blockquote>/)
        assert.match(html, /<hr\s*\/?>/)
        assert.match(html, /<img src="https:\/\/example\.com\/images\/pipeline-diagram\.png"/)
    })
})
