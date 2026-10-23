/**
 * Entry of `spell-comments.js`:  the docs pages' TOOLBAR and COMMENTS, for the pages that load Spell UI's site bundle
 * instead of the docs bundle (epic `epic-engine` P2, T3;  the toolbar since T11).
 * - Epic UI's pages (`src/docs/`, served at `/components/epics/`), and App UI's and Brand's (spell-app's
 *   `packages/<set>/docs/`, at `/components/app/`, `/components/brand/`):  each loads it in its `<head>`, after the
 *   site's (their layouts load the epics pack, whose elements draw the threads and the pane):
 *
 *     <script defer src="/_epic/assets/spell-comments.js"></script>
 *
 * - Built by `node src/tools/bundle-spell-ui.js` beside `spell-ui.js` (`--comments`:  only this one, which needs no
 *   UI build);  edit THIS, never the bundle.
 * - NO Spell UI in it, so a page never has two (epic `epic-engine` I18:  two copies handle every event twice):  the
 *   toolbar and the comments make `<ui-*>` markup, and the page's own Spell UI draws it;  a toast goes through the
 *   page's `window.SpellUI` (the sets' build of the site sets it).  A plain IIFE, no global of its own:
 *   `window.SpellUI` stays the page's.  The build checks it (`checkNoSpellUI()`).
 * - Its look:  `spell-comments.css` and `spell-toolbar.css`, beside this script, linked as it runs (the docs pages have
 *   them through `spell-doc.css`).  The site has no `spell-doc.css`, so the sheets name the tokens they read for
 *   `.site-main` too.
 * - THE TOOLBAR (`wireToolbar()`;  Owen, 2026-10-20:  "Epic UI pages should have a toolbar"):  a guide's, built by the
 *   same code (`spell-doc-toolbar.js`):  a sticky band at the top of the page's article, under the site's masthead,
 *   one button per top-level section, the comments' bullhorn at its right, the section being read marked
 *   - a `<ui-sticky class="site-sticky-bar">`:  the site's own page bar (`SiteSections`' `PAGE_BAR`), so the site
 *     sticks the section titles below it and lands links below both
 *   - the site's "On this page" column stays (1200px and wider):  it lists every section, nested ones too, and holds
 *     the site's header and look controls;  the toolbar is the page's top level and its comments (epic `epic-engine`
 *     T11, J)
 * - CMD / CTRL + K (`wireJumpKey()`, the docs pages' own):  a comment's id, or any id on the page;  anything else
 *   typed goes to the site's search, which Cmd / Ctrl + K opened before (`searchSite()`;  `/` still opens it
 *   straight away).  Only on a page that takes comments:  elsewhere the key stays the search's.
 * - WHEN:  once the site has put the page in its layout (`html.site-mounted`) and `<ui-root>` is defined;  then again
 *   for each page the site's router swaps in (its `spell-site:page` event):  the last page's taken down first
 *   (`wire()`'s `signal`), what's typed there and not saved yet sent.
 * - The comments only on a page the page server serves (`window.SPELL_SERVER`), that takes comments:
 *   `wireComments()` asks.
 * - Not on a docs page or an epic page:  their runtime wires the toolbar and the comments (`spell-doc-runtime.js`).
 */

import { wireComments } from "./spell-doc-comments.js"
import { el, nextFrames } from "./spell-doc-helpers.js"
import { fitTitles, keepFitted, markCurrent, titledItems, toolbarMenu, wireJumpKey } from "./spell-doc-toolbar.js"

/** The page's own content box, as the site names it (`PAGE_MAIN`, `packages/ui/site/_src/site.types.ts`). */
const PAGE_MAIN = "main#main"

/** What the site's router dispatches on `document` once it swapped another page in (`SiteRouter`'s `PAGE_EVENT`). */
const PAGE_EVENT = "spell-site:page"

/** The class the site puts on `<html>` once its layout is in (`SiteShell`'s `MOUNTED_CLASS`). */
const MOUNTED_CLASS = "site-mounted"

/** How long to wait for the site's layout and `<ui-root>`, ms:  a page that never mounts gets its comments anyway. */
const READY_MS = 10_000

/** The site's page bar (`SiteSections`' `PAGE_BAR`):  it sticks below the site's top, the section titles below it. */
const PAGE_BAR_CLASS = "site-sticky-bar"

/** The line the site's section titles stick at, px, on `main` (`SiteSections`' `--site-sections-top`). */
const SECTIONS_TOP = "--site-sections-top"

/** How long a jump's landing takes the site (`SiteSections.go()`:  the root ready, the unfold, two frames), ms. */
const LANDING_MS = 350

/** The sheets:  beside this script, wherever it's served from. */
const SHEETS = ["spell-comments.css", "spell-toolbar.css"].map(
  (name) => new URL(name, document.currentScript?.src ?? location.href).href
)

/** The current page's wiring:  aborted when the router swaps the next page in. */
let wiring = null

linkSheets()
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void wire(), { once: true })
else void wire()
document.addEventListener(PAGE_EVENT, () => void wire())
wireJumpKey(go, canGo, { search: searchSite, host: () => document.querySelector("ui-root.site"), first: true })

/** Wire the toolbar and comments of the page shown, once the site is ready;  the last page's taken down first. */
async function wire() {
  wiring?.abort()
  const controller = (wiring = new AbortController())
  const { signal } = controller
  await siteReady()
  const main = document.querySelector(PAGE_MAIN)
  if (!main || signal.aborted) return
  wireToolbar(main, { signal })
  await wireComments(main, { signal, go, fitToolbar: fitTitles })
}

/**
 * The page's TOOLBAR (see the header):  a `<ui-sticky class="site-sticky-bar">` first in the page's article, holding
 * the toolbar's menu (`toolbarMenu()`, titled), a button per top-level `<ui-section>` (`titledItems()`:  its number and
 * its title, `1` `Example`);  none without sections.
 * - a page in TABS (a components page's Examples, Usage, API, Theming:  Brand's element pages):  the SHOWN pane's
 *   sections, its bar first in that pane;  drawn again for the next pane as the tabs switch (`ui-show`), the
 *   comments' bullhorn kept (`toolbarMenu()` keeps what was added to the row);  a pane without sections, none
 *   - before:  one bar in the first pane, a button for every pane's sections, the hidden ones' too
 * - the section being read marked (`markCurrent()`):  the last whose top has reached the line the site sticks titles
 *   at (`--site-sections-top`, which counts the bar)
 * - a click lands as the site lands any `#id` link (`SiteSections`:  unfolded, below the stuck titles)
 * - the site measured again once it's drawn (a `resize`):  its titles stick below the bar, its links land below it
 * - SIDE EFFECT:  the bar in `main` (`data-spell-added`:  the comments step around it);  a scroll, a resize and a
 *   `ui-show` listener, until `signal`
 */
function wireToolbar(main, { signal }) {
  const sections = topSections(main)
  const tabs = sections[0]?.parentElement?.closest("ui-tab")?.closest("ui-tabs")
  if (!tabs) return drawToolbar(sections, { signal })
  // the toolbar drawn for the pane shown now:  aborted for the next
  let pane = null
  const drawPane = () => {
    pane?.abort()
    pane = new AbortController()
    signal.addEventListener("abort", () => pane.abort(), { once: true, signal: pane.signal })
    const shown = [...tabs.querySelectorAll(":scope > ui-tab")].find(isShownPane)
    drawToolbar(
      sections.filter((section) => section.parentElement.closest("ui-tab") === shown),
      { signal: pane.signal }
    )
  }
  tabs.addEventListener("ui-show", (event) => event.target.parentElement === tabs && requestAnimationFrame(drawPane), {
    signal
  })
  drawPane()
}

/**
 * Draw the toolbar over `sections`, first in their parent (the page's article, or a tab's pane);  none, none.
 * - `signal`:  takes it down again (the bar, its listeners);  what the comments added to its row is kept for the next
 *   (`toolbarMenu()`)
 */
function drawToolbar(sections, { signal }) {
  if (!sections.length) return
  const groups = sections.map((element) => ({
    element,
    id: element.id,
    label: sectionLabel(element),
    glyph:
      element.querySelector(':scope > ui-icon[slot="icon"]')?.getAttribute("name") ??
      element.getAttribute("icon") ??
      undefined
  }))
  const toolbar = toolbarMenu(
    titledItems(groups, () => []),
    // under a page's tabs:  pills as the tabs are
    { titled: true, segmented: !!sections[0].closest("ui-tabs") }
  )
  for (const old of document.querySelectorAll(`.${PAGE_BAR_CLASS}.spell-site-toolbar`)) old.remove()
  const bar = el("ui-sticky", { class: `${PAGE_BAR_CLASS} spell-site-toolbar`, "data-spell-added": true }, toolbar)
  const article = sections[0].parentElement
  article.prepend(bar)
  toolbar.addEventListener("click", glideTo, { signal })
  keepFitted(toolbar, { signal })
  // the site re-measures its sticky lines on a resize:  now the bar is in, and once it has drawn
  const remeasure = () => !signal.aborted && dispatchEvent(new Event("resize"))
  void Promise.all(["ui-sticky", "ui-menu", "ui-item"].map((tag) => customElements.whenDefined(tag)))
    .then(() => nextFrames(2))
    .then(remeasure)
  let scheduled = false
  const follow = () => {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      if (!signal.aborted)
        markCurrent(toolbar, currentSection(document.querySelector(PAGE_MAIN), sections)?.id ?? sections[0].id)
    })
  }
  addEventListener("scroll", follow, { passive: true, signal })
  addEventListener("resize", follow, { passive: true, signal })
  follow()
}

/** Is `<ui-tab>` `tab` the pane its `<ui-tabs>` shows (its `:state(selected)`)?  No `:state()`:  unless hidden. */
function isShownPane(tab) {
  try {
    return tab.matches(":state(selected)")
  } catch {
    return !tab.hidden
  }
}

/** The page's top-level `<ui-section>`s:  its article's own, else every one not inside another (or an example). */
function topSections(main) {
  const article = main.querySelector(".site-article")
  const own = article ? [...article.querySelectorAll(":scope > ui-section[id]")] : []
  if (own.length) return own
  return [...main.querySelectorAll("ui-section[id]")].filter(
    (section) => !section.parentElement?.closest("ui-section, ui-docs-example, template")
  )
}

/** A `<ui-section>`'s label:  its `label`, else the text of its `slot="label"` child. */
function sectionLabel(section) {
  const label = section.getAttribute("label")?.trim()
  if (label) return label
  const slotted = section.querySelector(':scope > [slot="label"]')
  return slotted?.textContent.replace(/\s+/g, " ").trim() ?? section.id
}

/**
 * The last of `sections` whose top has reached the line the site sticks its titles at;  none above the first.
 * - at the page's end, the last one showing on screen:  a short last section can't scroll up to the line, so a click
 *   on it would leave the one above marked (Owen, 2026-10-23:  "Not showing Themes as selected when I click it")
 */
function currentSection(main, sections) {
  const line = (parseFloat(main.style.getPropertyValue(SECTIONS_TOP)) || 0) + 4
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2
  let current
  for (const section of sections) {
    const box = section.getBoundingClientRect()
    if (!box.height && !box.width) continue
    if (box.top > (atEnd ? innerHeight - 1 : line)) break
    current = section
  }
  return current
}

/**
 * A click on a section's button GLIDES there (Owen, 2026-10-23:  "Clicking secondary tab jumps the entire page rather
 * than tabs gliding up"):  the browser's own jump to `#id` is stopped, the address set without a scroll, and the
 * site's landing told by the `hashchange` it listens for (`SiteSections`:  a smooth scroll, the stuck bars put)
 * - a click with a modifier (a new tab, a new window) is left to the browser
 */
function glideTo(event) {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const item = event.composedPath().find((node) => node.localName === "ui-item" && node.hasAttribute("data-rail"))
  const hash = item?.getAttribute("href")
  if (!hash?.startsWith("#")) return
  event.preventDefault()
  const oldURL = location.href
  history.pushState(history.state, "", hash)
  dispatchEvent(new HashChangeEvent("hashchange", { oldURL, newURL: location.href }))
}

/**
 * Land on `id` in the page shown, as a link to it does:  the site's own landing (`SiteSections`, on `hashchange`:
 * what hides it unfolds, it lands below the stuck titles);  resolves once it has.
 * - the address cleared first, so the same `#id` again still lands
 */
async function go(id) {
  if (decodeURIComponent(location.hash.slice(1)) === id)
    history.replaceState(history.state, "", `${location.pathname}${location.search}`)
  location.hash = id
  await new Promise((resolve) => setTimeout(resolve, LANDING_MS))
}

/** Is there an element `id` in the page shown? */
function canGo(id) {
  const element = document.getElementById(id)
  return !!element && !!document.querySelector(PAGE_MAIN)?.contains(element)
}

/**
 * Search the site for `words`:  its search field (`<ui-docs-search>`, in the side column's nav, or the narrow
 * screens' flyout), summoned as Cmd / Ctrl + K summoned it before, the words typed in.
 * - the visible field, else one in a drawer (the flyout:  `summon()` opens it), as the site's own key picks
 */
async function searchSite(words) {
  const fields = [...document.querySelectorAll("ui-docs-nav")]
    .map((nav) => nav.shadowRoot?.querySelector("ui-docs-search") ?? nav.querySelector("ui-docs-search"))
    .filter(Boolean)
  const field = fields.find((each) => each.checkVisibility()) ?? fields[0]
  if (!field?.summon) return
  await field.summon()
  const input = field.shadowRoot?.querySelector('input[part~="input"]') ?? field.shadowRoot?.querySelector("input")
  if (!input) return
  input.value = words
  input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: words }))
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

/** Link the sheets into the page's `<head>`, once each. */
function linkSheets() {
  for (const sheet of SHEETS) {
    if (document.querySelector(`link[rel="stylesheet"][href="${CSS.escape(sheet)}"]`)) continue
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = sheet
    document.head.append(link)
  }
}
