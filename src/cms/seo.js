function escAttr(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

export function generateSEO(meta, config, url = '') {
    const ogImage = meta.image || config.site?.default_og_image || ''
    const fbDescription = meta.fb_caption || (meta.description || '').slice(0, 160)
    const dateModified = meta.updated_at || meta.date || ''

    const og = [
        `<meta property="og:type" content="article">`,
        `<meta property="og:title" content="${escAttr(meta.title || '')}">`,
        `<meta property="og:description" content="${escAttr(meta.description || '')}">`,
        `<meta property="og:image" content="${escAttr(ogImage)}">`,
        `<meta property="og:url" content="${escAttr(url)}">`,
        `<meta property="fb:description" content="${escAttr(fbDescription)}">`,
    ].join('\n')

    const jsonld = `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: meta.title,
        description: meta.description,
        image: ogImage,
        datePublished: meta.date,
        dateModified,
        url,
    })}</script>`

    const ga4 = config.analytics?.ga4_measurement_id
        ? [
            `<script async src="https://www.googletagmanager.com/gtag/js?id=${config.analytics.ga4_measurement_id}"></script>`,
            `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${config.analytics.ga4_measurement_id}');</script>`,
          ].join('\n')
        : ''

    return [og, jsonld, ga4].filter(Boolean).join('\n')
}
