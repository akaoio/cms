import { loadConfig } from '../cms/config.js'
import { ingest, ingestArchived } from './ingest.js'
import { readMeta } from '../cms/meta.js'
import { parseMarkdown } from '../cms/markdown.js'
import { renderPage } from './render.js'
import { generateSEO } from '../cms/seo.js'
import { appendError } from './errors.js'
import { FS } from '../core/FS.js'
import { loadManifest, saveManifest, saveIndex, sha256 } from '../cms/index.js'
import { injectRoutes } from './routes-inject.js'
import { generateSitemap, generateRSS, generateRobots } from '../cms/feed.js'

export async function runPipeline() {
    console.log('🚀 Starting Akao CMS Build Pipeline...')
    
    const config = await loadConfig(['src', 'cms', 'config.yaml'])
    const articleDirs = await ingest()
    const oldManifest = await loadManifest()
    const newEntries = {}
    const seenSlugs = new Set()

    let built = 0
    let errors = 0
    let skipped = 0
    let unchanged = 0

    // Reset errors.log at start of build
    await FS.write(['build', 'errors.log'], '')

    for (const dir of articleDirs) {
        try {
            // 1. Read shared meta to check global constraints
            const baseMeta = await readMeta(dir)

            // Quality Gate: publish_at check
            if (baseMeta.publish_at && new Date(baseMeta.publish_at) > new Date()) {
                skipped++
                continue
            }

            // Quality Gate: duplicate slug check
            if (seenSlugs.has(baseMeta.slug)) {
                await appendError({ code: 'DUPLICATE_SLUG', slug: baseMeta.slug, dir: dir.join('/') })
                errors++
                continue
            }
            seenSlugs.add(baseMeta.slug)

            // Pre-compute sibling locale URLs (for hreflang) from shared meta — date/category/
            // subcategory/slug come from meta.yaml and do not vary by locale frontmatter
            const baseDateStr = new Date(baseMeta.date).toISOString().slice(0, 10).replace(/-/g, '')
            const baseCat1 = baseMeta.category || 'uncategorized'
            const baseCat2 = baseMeta.subcategory || 'general'
            const siblingLocales = []
            for (const locale of config.locales.active) {
                if (await FS.exist([...dir, `${locale}.md`])) {
                    siblingLocales.push({ locale, url: `/${baseDateStr}/${baseCat1}/${baseCat2}/${baseMeta.slug}/${locale}/` })
                }
            }

            // 2. Process each active locale
            for (const locale of config.locales.active) {
                const articleId = `${baseMeta.slug}:${locale}`
                try {
                    const mdPath = [...dir, `${locale}.md`]
                    if (!(await FS.exist(mdPath))) continue

                    const mdText = await FS.load(mdPath)
                    const metaYamlText = await FS.load([...dir, 'meta.yaml'])
                    
                    // Content Hash: combine meta.yaml and <locale>.md content
                    const contentHash = await sha256(metaYamlText + mdText)
                    
                    // Incremental check: Skip if hash matches old manifest
                    if (oldManifest?.entries?.[articleId]?.hash === contentHash) {
                        newEntries[articleId] = oldManifest.entries[articleId]
                        unchanged++
                        continue
                    }

                    // Quality Gate: word count
                    const wordCount = mdText.split(/\s+/).length
                    if (wordCount < config.quality_gate.min_word_count) {
                        await appendError({ code: 'THIN_CONTENT', wordCount, dir: dir.join('/'), locale })
                        errors++
                        continue
                    }

                    const meta = await readMeta(dir, locale)
                    const bodyHtml = parseMarkdown(mdText)
                    
                    // Construct Output Path: /{YYYYMMDD}/{cat1}/{cat2}/{slug}/{locale}/
                    const dateObj = new Date(meta.date)
                    const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '')
                    const cat1 = meta.category || 'uncategorized'
                    const cat2 = meta.subcategory || 'general'
                    const slug = meta.slug
                    
                    const outDir = ['build', dateStr, cat1, cat2, slug, locale]
                    const url = `/${dateStr}/${cat1}/${cat2}/${slug}/${locale}/`
                    
                    const seoHtml = generateSEO(meta, config, url)
                    const html = renderPage(meta, bodyHtml, seoHtml, config, siblingLocales)

                    // Write Output and Hash
                    const htmlHash = await sha256(html)
                    await FS.ensure(outDir)
                    await FS.write([...outDir, 'index.html'], html)
                    await FS.write([...outDir, 'index.hash'], htmlHash)
                    
                    // Record in new manifest
                    newEntries[articleId] = {
                        hash: contentHash,
                        locale,
                        category: cat1,
                        subcategory: cat2,
                        date: dateStr,
                        date_iso: meta.date,
                        slug,
                        title: meta.title,
                        description: meta.description,
                        tags: meta.tags,
                        url
                    }
                    
                    built++
                } catch (err) {
                    await appendError({ dir: dir.join('/'), locale, error: err.message })
                    errors++
                }
            }
        } catch (err) {
            await appendError({ dir: dir.join('/'), error: err.message })
            errors++
        }
    }

    // Archived articles: emit redirect stubs so old URLs never 404
    let redirects = 0
    const archivedDirs = await ingestArchived()
    for (const dir of archivedDirs) {
        try {
            const meta = await readMeta(dir)

            const dateObj = new Date(meta.date)
            const dateStr = dateObj.toISOString().slice(0, 10).replace(/-/g, '')
            const cat1 = meta.category || 'uncategorized'
            const cat2 = meta.subcategory || 'general'
            const slug = meta.slug
            const targetUrl = `/${cat1}/${cat2}/`

            for (const locale of config.locales.active) {
                const outDir = ['build', dateStr, cat1, cat2, slug, locale]
                const stub = `<!DOCTYPE html>
<html lang="${meta.lang || 'en'}">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${targetUrl}">
<link rel="canonical" href="${targetUrl}">
<title>${meta.title}</title>
</head>
<body>
<p>This article has been archived. Redirecting to <a href="${targetUrl}">${targetUrl}</a>.</p>
</body>
</html>`

                await FS.ensure(outDir)
                await FS.write([...outDir, 'index.html'], stub)
                redirects++
            }
        } catch (err) {
            await appendError({ dir: dir.join('/'), error: err.message })
            errors++
        }
    }

    // Save final artifacts
    await saveManifest(newEntries)
    await saveIndex(newEntries)
    await injectRoutes()
    
    // Story 1.9: Distribution files
    console.log('📦 Generating distribution files...')
    await generateSitemap(newEntries, config)
    await generateRSS(newEntries, config)
    await generateRobots(config)
    console.log('   - sitemap.xml, rss.xml, robots.txt updated')

    console.log(`\n✅ Build Complete:`)
    console.log(`   - ${built} articles built`)
    console.log(`   - ${unchanged} articles unchanged (skipped)`)
    console.log(`   - ${errors} errors (see build/errors.log)`)
    console.log(`   - ${skipped} skipped (scheduled)`)
    console.log(`   - ${redirects} archived redirect stub(s) written`)
}
