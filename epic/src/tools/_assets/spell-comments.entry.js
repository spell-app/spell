/**
 * Entry of `spell-comments.js`:  the COMMENTS alone (`spell-doc-comments.js`:  the bullhorns, the pane, the threads,
 * Send), for the pages that load Spell UI's site bundle instead of the docs bundle (epic `epic-engine` P2, T3).
 * - Epic UI's pages (`src/docs/`, served at `/components/epics/`):  each loads it in its `<head>`, after the site's:
 *
 *     <script defer src="/_epic/assets/spell-comments.js"></script>
 *
 * - Built by `node src/tools/bundle-spell-ui.js` beside `spell-ui.js` (`--comments`:  only this one, which needs no
 *   UI build);  edit THIS, never the bundle.
 * - NO Spell UI in it, so a page never has two (epic `epic-engine` I18:  two copies handle every event twice):  the
 *   comments make `<ui-*>` markup, and the page's own Spell UI draws it;  a toast goes through the page's
 *   `window.SpellUI` (the sets' build of the site sets it).  A plain IIFE, no global of its own:  `window.SpellUI`
 *   stays the page's.  The build checks it (`checkNoSpellUI()`).
 * - Its look:  `spell-comments.css`, beside this script, linked as it runs (the docs pages have it through
 *   `spell-doc.css`).  The site has no `spell-doc.css`, so the sheet names the tokens it reads for `.site-main` too.
 * - WHEN:  once the site has put the page in its layout (`html.site-mounted`) and `<ui-root>` is defined;  then again
 *   for each page the site's router swaps in (its `spell-site:page` event):  the last page's comments taken down first
 *   (`wireComments()`'s `signal`), what's typed there and not saved yet sent.
 * - Only on a page the page server serves (`window.SPELL_SERVER`), that takes comments:  `wireComments()` asks.
 * - Not on a docs page or an epic page:  their runtime wires the comments (`spell-doc-runtime.js`).
 */

import { wireComments } from "./spell-doc-comments.js"

/** The page's own content box, as the site names it (`PAGE_MAIN`, `packages/ui/site/_src/site.types.ts`). */
const PAGE_MAIN = "main#main"

/** What the site's router dispatches on `document` once it swapped another page in (`SiteRouter`'s `PAGE_EVENT`). */
const PAGE_EVENT = "spell-site:page"

/** The class the site puts on `<html>` once its layout is in (`SiteShell`'s `MOUNTED_CLASS`). */
const MOUNTED_CLASS = "site-mounted"

/** How long to wait for the site's layout and `<ui-root>`, ms:  a page that never mounts gets its comments anyway. */
const READY_MS = 10_000

/** The comments' sheet:  beside this script, wherever it's served from. */
const SHEET = new URL("spell-comments.css", document.currentScript?.src ?? location.href).href

/** The current page's wiring:  aborted when the router swaps the next page in. */
let wiring = null

linkSheet()
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void wire(), { once: true })
else void wire()
document.addEventListener(PAGE_EVENT, () => void wire())

/** Wire the comments of the page shown, once the site is ready;  the last page's taken down first. */
async function wire() {
  wiring?.abort()
  const controller = (wiring = new AbortController())
  await siteReady()
  const main = document.querySelector(PAGE_MAIN)
  if (!main || controller.signal.aborted) return
  await wireComments(main, { signal: controller.signal })
}

/** Resolves once the site's layout is in and `<ui-root>` defined, or after `READY_MS`.  NEVER rejects. */
function siteReady() {
  const mounted = new Promise((resolve) => {
    if (document.documentElement.classList.contains(MOUNTED_CLASS)) return resolve()
    const watch = new MutationObserver(() => {
      if (!document.documentElement.classList.contains(MOUNTED_CLASS)) return
      watch.disconnect()
      resolve()
    })
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
  })
  const ready = mounted.then(() => customElements.whenDefined("ui-root"))
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, READY_MS))])
}

/** Link the comments' sheet into the page's `<head>`, once. */
function linkSheet() {
  if (document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(SHEET)}"]`)) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = SHEET
  document.head.append(link)
}
