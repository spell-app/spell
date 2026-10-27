/**
 * Constants the site bundle's glue (`SiteShell`, `SiteRouter`, `SiteSections`) shares -- and the site's checks
 * (`src/tools/SiteCheck.ts`), which is why they live here.
 * - Pure data, at the bottom of the folder's imports:  no imports at all, so a node tool loads it by path without
 *   pulling in the browser code beside it.
 */

/** The page's own content box:  what a page file holds besides its `<head>`, and what the router swaps. */
export const PAGE_MAIN = "main#main"

/**
 * `localStorage` key prefix of a page's closed sections (`SiteSections`), + the page's path:  `{ [section id]: closed }`.
 * - The docs runtime's key and shape (spell-epic's `spell-doc-runtime.js`), so a component set's page and a guide
 *   remember their folds alike, and spell-epic's page check clears either (`check-spell.js`).
 */
export const FOLDS_KEY = "spell-folds:"

/** The site's key before (epic `epic-engine` I142):  moved over to `FOLDS_KEY` on a page's first read. */
export const OLD_FOLDS_KEY = "spell-ui-site:folds:"
