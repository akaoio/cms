import { FS } from '../core/FS.js'

/**
 * generateSitemap — Creates a sitemap.xml for all published articles.
 */
export async function generateSitemap(entries, config) {
    const baseUrl = config.site?.url || ''
    const urls = Object.values(entries).map(e => {
        const priority = 0.8
        const date = e.date_iso.split('T')[0]
        return `  <url>
    <loc>${baseUrl}${e.url}</loc>
    <lastmod>${date}</lastmod>
    <priority>${priority}</priority>
  </url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    await FS.write(['build', 'sitemap.xml'], xml)
}

/**
 * generateRSS — Creates an rss.xml for the latest 20 articles.
 */
export async function generateRSS(entries, config) {
    const baseUrl = config.site?.url || ''
    const siteTitle = config.site?.title || 'Akao CMS'
    const siteDesc = config.site?.description || ''

    const latest = Object.values(entries)
        .sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime())
        .slice(0, 20)

    const items = latest.map(e => `    <item>
      <title>${e.title}</title>
      <link>${baseUrl}${e.url}</link>
      <guid isPermaLink="true">${baseUrl}${e.url}</guid>
      <pubDate>${new Date(e.date_iso).toUTCString()}</pubDate>
      <description>${e.description || ''}</description>
      <category>${e.category}</category>
    </item>`)

    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${siteTitle}</title>
    <link>${baseUrl}</link>
    <description>${siteDesc}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`

    await FS.write(['build', 'rss.xml'], xml)
}

/**
 * generateRobots — Creates a standard robots.txt file.
 */
export async function generateRobots(config) {
    const baseUrl = config.site?.url || ''
    const content = `User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
`
    await FS.write(['build', 'robots.txt'], content)
}
