import { FS } from '../core/FS.js'

/**
 * injectRoutes — Create build/routes.json with pattern-based routes.
 * This file size stays constant regardless of article count.
 */
export async function injectRoutes() {
    const routes = [
        // Article Page: /20260630/sport/worldcup/my-article/en/
        { 
            pattern: "/{date}/{cat1}/{cat2}/{slug}/{locale}/", 
            component: "cms-page" 
        },
        // Sub-category Listing: /sport/worldcup/
        { 
            pattern: "/{cat1}/{cat2}/", 
            component: "cms-list" 
        },
        // Category Listing: /sport/
        { 
            pattern: "/{cat1}/", 
            component: "cms-list" 
        },
        // Tag Listing: /tag/football/
        { 
            pattern: "/tag/{tag}/", 
            component: "cms-list" 
        },
        // Static Pages: /about/ (locale will be handled via Context)
        { 
            pattern: "/{page}/", 
            component: "cms-page" 
        }
    ]

    await FS.write(['build', 'routes.json'], JSON.stringify(routes, null, 2))
    console.log('   - build/routes.json updated (5 patterns)')
}
