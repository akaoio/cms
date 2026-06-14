/**
 * renderPage — assemble a complete static HTML page for one article + one locale.
 *
 * @param {object}   meta            Merged meta from readMeta(dir, locale)
 * @param {string}   bodyHtml        Rendered article body from parseMarkdown()
 * @param {string}   seoHtml         SEO block from generateSEO() — goes inside <head>
 * @param {object}   config          Frozen site config from loadConfig()
 * @param {Array}    siblingLocales  [{locale, url}] for hreflang; en url becomes x-default
 * @returns {string} Complete HTML page
 */
export function renderPage(meta, bodyHtml, seoHtml, config, siblingLocales = []) {
    const lang = meta.lang || 'en'
    const siteTitle = config.site?.title || ''
    const pageTitle = siteTitle ? `${meta.title} | ${siteTitle}` : meta.title
    const publisherId = config.adsense?.publisher_id || ''
    const slots = config.adsense?.slots || {}

    const hreflangLinks = siblingLocales
        .map(({ locale, url }) => `  <link rel="alternate" hreflang="${locale}" href="${url}">`)
        .join('\n')
    const enSibling = siblingLocales.find(s => s.locale === 'en')
    const xDefault = enSibling
        ? `  <link rel="alternate" hreflang="x-default" href="${enSibling.url}">`
        : ''

    const ins = (id, slotKey) =>
        `<ins class="adsbygoogle" id="${id}" style="display:block" data-ad-client="${publisherId}" data-ad-slot="${slots[slotKey] || ''}"></ins>\n<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`

    // Split body at first </h2> so ad-mid sits between article sections
    const splitIdx = bodyHtml.indexOf('</h2>')
    const bodyFirst = splitIdx === -1 ? bodyHtml : bodyHtml.slice(0, splitIdx + 5)
    const bodyRest = splitIdx === -1 ? '' : bodyHtml.slice(splitIdx + 5)

    return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${pageTitle}</title>
${seoHtml}
${hreflangLinks}
${xDefault}
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}" crossorigin="anonymous"></script>
  <script defer src="/js/app.js"></script>
  <script type="module" src="/js/cms-page.js"></script>
</head>
<body>
  ${ins('ad-top', 'top')}
  <article>
    ${bodyFirst}
    ${ins('ad-mid', 'mid')}
    ${bodyRest}
  </article>
  ${ins('ad-bottom', 'bottom')}
</body>
</html>`
}
