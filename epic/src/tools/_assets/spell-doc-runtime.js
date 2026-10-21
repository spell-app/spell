/*
 * Page behaviour for the `.html` docs.
 * Bundled into `spell-ui.js` (a classic IIFE, beside spell-ui) by `scripts/bundle-spell-ui.js`;
 * side effects only.  The page's markup is hand-authored;  this only DRIVES it.
 * - Two page markups, read into ONE outline (`outlineOf()`) that everything below works from:
 *   - SECTIONS (every page but the saga pages):
 *     `<ui-section id header sticky collapsible dividing>` in `main`, nested for sub-sections,
 *     `collapsed` to start folded.
 *     - the element draws the title, the fold button, the rule and the stack of stuck titles
 *     - this runtime sets the top-level `offset`s, remembers folds, writes counts
 *     - an EPIC PAGE is `<epic-page>` markup (the `epics` pack, `$/epics`):
 *       its folding blocks (`<epic-overview>`, `<epic-section>`, `<epic-phase>`, `EPIC_FOLDS`) are its sections.
 *       They draw and stick themselves, count their items, filter them,
 *       and draw the page header, the review line, the commits and every review control;
 *       this runtime only lists them (each host's `contentsEntry`, with label, icon and count),
 *       remembers their folds, and lands links inside them
 *   - HEADINGS (the saga pages):  `section.s2|s3` > `<ui-sticky class="spell-h2|spell-h3">` > `<h2|h3 id>`;
 *     this runtime adds the fold chevrons and every sticky's `offset`
 * - the TOOLBAR, the page's one navigation (epic `airplane` P8;  the floating right-edge rail before):  a row of the
 *   top-level sections' buttons, the last row of the sticky page header (`buildPageToolbar()`):  mark and title,
 *   the titles shrinking, then gone on a narrow window.  No contents list:  Owen, 2026-10-08
 *   - an EPIC PAGE's (`buildToolbar()`):  its blocks' icons only, with badges of the items waiting on Owen, in
 *     `<epic-page>`'s header;  and Cmd / Ctrl + K asks for an item to jump to (`wireJumpKey()`)
 *   - at its right, on any page that takes comments, a bullhorn counting the threads waiting on Owen, landing on the
 *     next at each click (`PageComments.drawWaiting()`);  Cmd / Ctrl + K takes a comment's id there too (`M3`)
 * - sticky headers:  the page header (`ui-sticky.spell-h1`) sticks at the top, each top-level title below it,
 *   nested ones below their parents' (re-measured on resize);
 *   CSS variables on the sections let anchors land below them all
 * - everything that sticks or lands at the top starts BELOW the fixed site header (`<spell-site-header>`,
 *   `siteHeaderHeight()`):  the page header and its toolbar, the titles
 * - folding:  every section folds from a chevron on its title;  folds are remembered per page, and `collapsed`
 *   (`data-fold="closed"` on HEADINGS pages) starts one folded
 * - counts:  a top-level section holding `[data-status]` items (the Epics index's epic cards, the saga pages' items)
 *   shows open / all on its title;
 *   the toolbar shows, with a red badge, how many NEED OWEN (none:  no badge;  `countItems()`);
 *   an epic card section also gets state chips with counts, filtering its items (`wireItemFilters()`)
 * - scroll-follow:  the toolbar's button of the section being read is highlighted, and the address follows it
 * - links to any id in `main` (a section, a heading, a plan item) land below the stuck titles, unfolding what
 *   hides it;  a `#hash` in another case than the page's id (`#T1` for `t1`) lands too
 * - SHORT ADDRESSES (`wireAddresses()`, epic `epic-workflow` P15):  a link to `SAGA:/<saga>[/<epic>][#<id>]`
 *   becomes the saga or epic page and its `#id`, so both kinds of link work
 * - the CHEATSHEET card filters
 * - highlight.js, when the page loaded it
 * - COMMENTS (`wireComments()`):  served by the page server, a bullhorn beside every major block (and in the page
 *   header), and ⌘ I or a floating bullhorn on selected text, which open a comment box under the block;  the
 *   comments wait in an inbox file (a docs page's own, an epic page's review inbox), drawn under their blocks.
 *   Their own module, `spell-doc-comments.js` (epic `epic-engine` P2), which Epic UI's pages load alone too.
 *   PAGE NOTES (`wireNotes()`), written into docs pages before them:  each `<spell-note>` a folded card
 * - the EPICS PAGE's sort buttons, `<epic-sort>`, in its header (`wireEpicSort()`):  its list, its cards' stars and
 *   saga chips are the epics pack's elements (`<epic-list>`, `<epic-card>`), which do their own
 * LANDING -- where a jump puts its target, ONE model for every kind of jump:
 * - the line:  just below the lowest title that will be stuck over the target:  site header + `--spell-top` (page
 *   header, filter bar) + the stack of the target's sections' titles
 * - CSS `scroll-margin-top` holds that line MINUS the site header (`spell-doc.css`);  the site header is added by
 *   whoever does the scrolling, once:
 *   - our jumps (link clicks, a `#hash` load, `hashchange` / `popstate`, so also `location.hash = id`):
 *     `scrollTo()` with a computed top, which `scroll-padding` never touches:  `offsetFor()` adds the site header
 *   - the browser's own (a `#hash` before this runs, `scrollIntoView()`, focus):
 *     `:root`'s `scroll-padding-top`, the site header's height (`<spell-site-header>` installs it)
 *   - paging (Page Down / Up, Space):  ours (`wirePaging()`), measured at the destination:
 *     the old bottom lands just below the titles stuck THERE
 *   - the browser's own paging (where ours stands aside) goes by `scroll-padding-top`:
 *     while titles are stuck, `<ui-section>` / `<ui-sticky>` (`StickyWatch`) write the lowest stuck edge
 *     as an INLINE `scroll-padding-top` on `<html>`, overriding `:root`'s;  removed once none is stuck
 *     - it includes the site header:  titles stick below it
 *     - that's where it STARTS, so a title that sticks on the way can cover the old bottom
 * - NOTE: a browser jump made WHILE titles are stuck adds that inline padding to the margin, landing one stack lower:
 *   every such jump that changes the hash (`hashchange`) lands again through ours;
 *   `scrollIntoView()` from code doesn't --
 *   call `jump`'s path (a click on a `#id` link, or set `location.hash`) instead
 * NOTE: panels open and close through the accordion's `open` PROPERTY (panel indexes as text):
 * that's `<ui-accordion>`'s controlled state, and writing it announces nothing (`ui-open` / `ui-close` mean the user).
 */

import { wireComments } from "./spell-doc-comments.js"
import {
  FIELDS,
  addBlockAction,
  addHeadTool,
  alignBlockActions,
  dropBlockAction,
  el,
  growField,
  nextFrames,
  noteToast,
  postJSON,
  readJSON,
  titleInside,
  writeJSON
} from "./spell-doc-helpers.js"
import {
  fitTitles,
  keepFitted,
  removeToolbar,
  shortLabel,
  titledItems,
  toolbarItem,
  toolbarMenu,
  wireJumpKey
} from "./spell-doc-toolbar.js"
import { EpicAddress, PageTargets } from "$/epics/links"
import { ComponentPacks } from "spell-ui/ui-components"

/** Custom elements this runtime drives:  wait for their definitions before wiring. */
const TAGS = [
  "ui-accordion",
  "ui-title",
  "ui-content",
  "ui-menu",
  "ui-item",
  "ui-label",
  "ui-sticky",
  "ui-button",
  "ui-input",
  "ui-select",
  "ui-icon",
  "ui-section",
  // installs `--spell-site-header-height`, which every sticky line starts from
  "spell-site-header"
]

/**
 * Frames a `<ui-section>` takes to draw what `collapsed = false` revealed:  the write lands on a microtask, the
 * render on the next frame.  A jump lands only then:  before, the target is laid out in a box of no height.
 */
const UNFOLD_FRAMES = 2

/**
 * When a jump on a `<ui-section>` page lands once more, unless the reader scrolled since:
 * a fold the BROWSER opened (a `#hash` load reveals `hidden="until-found"` content itself) grows with its transition
 * (`--ui-section-duration`, 300ms) and moves the target a few pixels after the first landing.
 */
const SETTLE_MS = 450

/** How long a closing fold's header is held in place (`holdWhileFolding()`):  its transition (300ms) and a margin. */
const FOLD_HOLD_MS = 600

/**
 * How long a live reload holds the page at its saved scroll (`holdScroll()`), ms:  while the folds it put back draw,
 * and their parts load.
 */
const RESTORE_HOLD_MS = 1500

/** What the reader does that stops the page landing by itself:  he's moving it. */
const READER_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"]

/**
 * An epic page's folding blocks (`$/epics`):  its sections, in the outline, the folds and the landing.
 * Each host has `open` (page state) and `contentsEntry` (`EpicFoldHost`).
 */
const EPIC_FOLDS = "epic-overview, epic-section, epic-phase"

/** What a link into an epic page opens on its way:  the folding blocks, and the items (which fold too). */
const EPIC_OPENERS = `${EPIC_FOLDS}, epic-item`

/** Every element the outline takes for a section:  `<ui-section>`s and an epic page's folding blocks. */
const SECTIONS = `ui-section, ${EPIC_FOLDS}`
/** What folds, for `holdWhileFolding()`:  the sections and epic blocks, and accordions (asides, code) */
const FOLDING = `${SECTIONS}, ui-accordion`

/**
 * How long `start()` waits for an epic page's elements (the `epics` pack, loaded by `<ui-root>`) to define and draw,
 * before listing the page without them:  a pack that never loads must not hold up the rest.
 */
const EPIC_WAIT_MS = 5000

/**
 * The `epics` pack's script at the engine's route (`EpicServer`'s `/_epic/pack/`), as epic pages name it:
 * what `loadEpicsPack()` loads on a page that names none.
 */
const EPICS_PACK = "/_epic/pack/epics.pack.js"

/** Space between the stuck titles and an element a link lands on inside an epic page, px (`EpicFold`'s `LAND_GAP`). */
const EPIC_LAND_GAP = 8

/**
 * `localStorage` key prefix of a page's card filter, unless its input names a key (`data-spell-filter="..."`).
 * - per page:  every `file://` page shares one origin, so one key would leak a filter between cheat sheets
 */
const FILTER_KEY_PREFIX = "spell-filter:"

/** `localStorage` key prefix of a page's folds (`{ [section or heading id]: folded }`), per page like the filter's. */
const FOLD_KEY_PREFIX = "spell-folds:"

/** `sessionStorage` key prefix of the folds a live reload puts back (`{ [id]: open }`, `keepFoldsForReload()`). */
const KEPT_FOLDS_KEY_PREFIX = "spell-doc:kept-folds:"

/**
 * `localStorage` key prefix of a page's item filters (`{ [section id]: "all" | state }`), per page.
 * - NOTE: not `spell-item-filter:`, Open | All's before P3 of `review-review`:  its saved "open" meant "not done"
 */
const ITEM_FILTER_KEY_PREFIX = "spell-item-state:"

/** The listeners of the last `wireFolds()` call:  aborted by the next, so a rebuilt page doesn't double them. */
let foldWiring = null

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true })
else void start()

////////////////
// ## Start
////////////////

/**
 * Is the page an epic page showing its TEST RUN (epic `epic-engine` P4)?  `<epic-page testing>`, or the address's
 * `?test` before the page has set it.
 * - the run owns the address's `#id` then (the test it's on):  scroll-follow and a live reload leave it alone (J44)
 */
function isTestRun() {
  return !!document.querySelector("epic-page[testing]") || new URLSearchParams(location.search).has("test")
}

/** Highlight at once (plain DOM);  wire the widgets once their elements are defined. */
async function start() {
  loadEpicsPack()
  nameTab()
  const main = document.querySelector("main.spell-doc-main") ?? document.querySelector("main")
  if (!main) return
  // where to land, read before anything scrolls:  scroll-follow rewrites the address as the page moves
  const landing = { hash: hashId(), scroll: window.SPELL_SERVER?.takeScroll?.() }
  // a LIVE reload (the page's code changed) comes back as the reader left it:  every fold, and the scroll
  const kept = takeKeptFolds(landing.scroll !== undefined)
  keepFoldsForReload(main)
  if (landing.scroll !== undefined) {
    // never the section the address names:  `<epic-*>` blocks follow the address's `#hash` by themselves as they
    // first connect, and landed on its top (I23 of `epic-engine`);  the address follows the scroll again once landed
    landing.hash = undefined
    // a test run's `#v3` is the run's place, not a section (epic `epic-engine` J44)
    if (location.hash && !isTestRun()) history.replaceState(history.state, "", `${location.pathname}${location.search}`)
  }
  // an old phase address (`#p7`) shows the phase's stable id it landed on (`addressedId()`)
  else if (landing.hash && landing.hash !== decodeHash(location.hash.slice(1)))
    history.replaceState(null, "", `#${landing.hash}`)
  // listening at once:  an edit that comes in while this is still wiring waits for `live.ready()`
  const live = wireLiveUpdate(main)
  highlight()
  // an epic page:  its saved folds before its blocks first draw (so nothing animates), then the blocks, which the
  // outline reads (their labels, icons and counts)
  if (main.querySelector("epic-page")) {
    restoreEpicFolds(main, kept)
    await epicsDrawn(main)
  }
  const outline = outlineOf(main)
  oneLineHead(main)
  const counts = countItems(outline)
  // the saga pages (HEADINGS) get no filter, but their id chips are coloured by state too
  if (outline.sections) wireItemFilters(main)
  else markItemStates(main)
  const rail = buildNavigation(main, outline, counts)
  // before the sections first draw, so a saved fold doesn't animate shut
  const folds = wireFolds(main, outline, kept)
  const used = TAGS.filter((tag) => document.querySelector(tag))
  await Promise.all(used.map((tag) => customElements.whenDefined(tag)))
  const sticky = trackStickyHeights(main, outline)
  const follow = followScroll(main, outline, rail)
  // before the anchors:  a short address into this page becomes a `#id` link they take
  wireAddresses()
  const { jump, go, canGo } = wireAnchors(main, outline, sticky, follow, folds)
  wirePaging(main)
  wireJumpKey(go, canGo)
  wireFilter(main)
  wireTableWidths(main)
  wireTableHeads(main)
  wireStuckTrail(main)
  // UI renders its shadow content a little after the definitions:  land once it has
  await nextFrames(2)
  sticky.measure()
  land(landing, jump, follow)
  live.ready({ main, rail, sticky, follow, entries: railKey(outline, counts) })
  wireNotes(main)
  void wireComments(main, { go, fitToolbar: fitTitles })
  wireNewEpic(main)
  wireEpicSort(main)
  // the docs index tool rewrites this page after a new epic:  its header comes back without the pill and the sort
  addEventListener("spell-doc:updated", () => {
    wireNewEpic(main)
    wireEpicSort(main)
  })
}

/**
 * Load the `epics` pack on EVERY page this runtime runs on (epic `epic-engine` P3), so an `<epic-*>` element in it,
 * written or drawn by our tools, upgrades:  a guide, a list or details page, the changelog, not only an epic page.
 * - Through `ComponentPacks.load()`, as `<ui-root>` loads a `<ui-components source>`:  ONE script per page, keyed by
 *   its URL, the pack registered once.  So a page that names the pack already (an epic page's root, a saga page's old
 *   path) loads it by THAT source, and its root's load and this one are the same.
 * - No `<ui-root>` needed:  the pack defines its tags for the whole document.  Most guides have none.
 * - Async (a `<script>` added):  it never holds up the first paint, or `start()`.
 *   An element made before it registers upgrades as it does;  wait with `customElements.whenDefined()`.
 * - A pack that can't load (a page from `file://`):  a console warning, and the page goes on without.
 */
function loadEpicsPack() {
  const declared = [...document.querySelectorAll("ui-components[source]")]
    .map((element) => element.getAttribute("source"))
    .find((source) => source && ComponentPacks.nameFor(new URL(source, document.baseURI).href) === "epics")
  ComponentPacks.load(declared ?? EPICS_PACK).catch((error) => console.warn("spell-doc:  the epics pack", error))
}

/**
 * The page's head on ONE line, as an epic page's (Owen, 2026-10-13:  "Make the header changes in the other doc
 * files"):  `DOCS / SPELL SYNTAX`, the crumbs then the title, in the crumbs' own type, the title twice their size
 * and bold (`spell-doc.css`, "The page's head on one line").
 * - a copy of the page's breadcrumb (`.spell-crumbs`, before the sticky head) goes INTO the h1, before its text;
 *   `data-spell-added`, so a live update steps around it
 *   - its last section (the page itself) stays, emptied:  the title says its words;  so the `/` before the title is
 *     the breadcrumb's own divider (epic `epic-engine` P3:  a `<span>` of ours before)
 * - the breadcrumb itself stays where it was, hidden (`<body class="spell-one-line-head">`):  live updates still
 *   patch it, and the copy follows when the page reloads
 * - a page with no breadcrumb:  the title alone, in the same type
 */
function oneLineHead(main) {
  const h1 = main.querySelector(":scope > ui-sticky.spell-h1 > .spell-page-head > h1")
  if (!h1) return
  document.body.classList.add("spell-one-line-head")
  const crumbs = main.querySelector(":scope > ui-breadcrumb.spell-crumbs")
  if (!crumbs || h1.querySelector(":scope > .spell-head-crumbs")) return
  const trail = crumbs.cloneNode(true)
  trail.classList.add("spell-head-crumbs")
  trail.dataset.spellAdded = ""
  trail.removeAttribute("id")
  const page = trail.querySelector(":scope > ui-breadcrumb-section[active]")
  if (page) {
    page.textContent = ""
    // the space before it too:  the divider sits as the old one did, `spell-doc.css` spacing it
    if (page.previousSibling?.nodeType === Node.TEXT_NODE && !page.previousSibling.textContent.trim())
      page.previousSibling.remove()
  }
  h1.prepend(trail)
}

/**
 * The wide layout, every page's (`spell-doc.css`, "Layout";  epic `epic-engine` P2):  every table sits in the reading
 * column, as prose does, with an EXPAND button over its top right corner that runs it the page's full width
 * (Owen, 2026-10-13:  "make tables fit in the column by default, but have an expand button ... Remember that setting
 * per table").
 * - The button is a bare icon (`.spell-table-toggle`, a `<ui-button basic>` with no edge:  `spell-doc.css`) in the table's ACTIONS ROW
 *   (`addBlockAction()`), right of its bullhorn (Owen, 2026-10-19:  "The expand button should be to the right of the
 *   bullhorn rather than in its own line"):  a line of no height, so it takes no room;  a click flips it back.
 * - Expanded, the row moves with the table:  its buttons stay over the table's top right corner.
 * - Expanded:  CSS can't know how far in a table starts (a list's indent, an item's inset), so this measures it,
 *   moving the table out to the page's gutter with the page's width, less the gutter on both sides.
 *   Again whenever its parent changes size (a section or item opening, the window resizing).
 * - Never past a box that CLIPS it (`roomFor()`):  an ancestor between it and `main` that hides its overflow (an
 *   epic element's reply card, `div.reply`) would cut the widened table off on both sides (epic `epic-engine` r10:
 *   "the expand table button made the table unusable").  With less than `MIN_WIDE_GAIN` to gain on its width in the
 *   column, the button hides.
 * - Inside a `<ui-table>`, the host is what moves.
 * - Remembered in this browser, per page, by the table's key (`tableKey()`):  `spell-table-wide:<path>`.
 * - Tables a part's body or a live update adds later get theirs too.
 */
function wireTableWidths(main) {
  // a page in the layout (`spell-doc.css`'s `body.spell-doc-page`), not one that only loads the bundle
  if (!document.body.classList.contains("spell-doc-page")) return
  const storeKey = `spell-table-wide:${location.pathname}`
  const toggles = new Map()
  const narrow = new WeakMap()
  const sizes = new ResizeObserver((entries) => {
    for (const entry of entries) for (const box of boxesIn(entry.target)) place(box)
  })
  // the box that moves:  a `<ui-table>` host, else the bare table
  const boxesIn = tableBoxes
  const isWide = (box) => !!readJSON(storeKey)[tableKey(box, main)]
  const place = (box) => {
    const toggle = toggles.get(box)
    const parent = box.parentElement
    if (!toggle || !parent || !box.isConnected) return
    const row = toggle.closest(".spell-block-actions")
    // its width in the column, measured while not widened:  the column is often the table's own `max-width`, not
    // its parent's
    if (!box.style.width && box.getClientRects().length) narrow.set(box, box.getBoundingClientRect().width)
    toggle.hidden = roomWidth(box, main) <= (narrow.get(box) ?? 0) + MIN_WIDE_GAIN
    const wide = isWide(box) && !toggle.hidden
    toggle.toggleAttribute("active", wide)
    toggle.title = wide ? "Back into the column" : "Expand to the page's width"
    toggle.setAttribute("aria-label", toggle.title)
    toggle.setAttribute("icon", wide ? "arrows left right to line" : "arrows left right")
    titleInside(toggle)
    if (!wide) {
      for (const each of [box, row]) each.style.removeProperty("margin-inline-start")
      for (const each of [box, row]) each.style.removeProperty("width")
      box.style.removeProperty("max-width")
      return alignBlockActions(row)
    }
    if (!parent.getClientRects().length) return
    const room = roomFor(box, main)
    const style = getComputedStyle(parent)
    const contentLeft =
      parent.getBoundingClientRect().left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)
    const start = `${room.left - contentLeft}px`
    box.style.maxWidth = "none"
    box.style.width = `${room.right - room.left}px`
    box.style.marginInlineStart = start
    row.style.width = box.style.width
    row.style.marginInlineStart = start
    alignBlockActions(row)
  }
  const flip = (box) => {
    const saved = readJSON(storeKey)
    const key = tableKey(box, main)
    if (saved[key]) delete saved[key]
    else saved[key] = true
    writeJSON(storeKey, saved)
    place(box)
  }
  const toggleFor = (box) => {
    const toggle = document.createElement("ui-button")
    toggle.className = "spell-table-toggle"
    toggle.setAttribute("basic", "")
    toggle.setAttribute("size", "mini")
    toggle.addEventListener("click", () => flip(box))
    return toggle
  }
  const watch = () => {
    // a table a live update replaced:  its button goes with it
    for (const [box, toggle] of toggles) {
      const row = toggle.closest(".spell-block-actions")
      if (box.isConnected && row?.nextElementSibling === box) continue
      for (const name of ["width", "margin-inline-start"]) row?.style.removeProperty(name)
      dropBlockAction(toggle)
      toggles.delete(box)
    }
    for (const box of boxesIn(main)) {
      if (toggles.has(box) || !box.parentElement) continue
      const toggle = toggleFor(box)
      addBlockAction(box, toggle, "expand")
      toggles.set(box, toggle)
      sizes.observe(box.parentElement)
      place(box)
    }
  }
  watch()
  new MutationObserver(() => requestAnimationFrame(watch)).observe(main, { childList: true, subtree: true })
  addEventListener("resize", () => requestAnimationFrame(() => toggles.forEach((_toggle, box) => place(box))))
}

/**
 * A table's HEADER ROW sticks (epic `epic-engine` r4;  Owen, 2026-10-19:  "make the table headers sticky"):  while its
 * rows scroll past, it stays just under the stuck titles, the page header's and the sections', until the table ends.
 * - its header:  its `<thead>`, else a first row of `<th>`s alone
 * - a PIN, not the row itself:  `position: sticky` on a `<thead>` holds only inside its nearest scroll box, and a table
 *   wider than its column scrolls sideways in its own box (every `<ui-table>`, a bare table at phone width), which
 *   scrolls nothing up or down.  So a COPY of the header (`.spell-table-pin`, `data-spell-added`) sticks instead:
 *   - a line of no height just before the table (and its actions row), sticking at the line below the titles:  the
 *     browser holds it there while the page scrolls, as it holds the titles
 *   - shown only while the table's own header is under that line, over the table's width as it shows (its box's,
 *     wide or not, scrolled sideways or not), its columns as wide as the table's, moved sideways with them
 *   - as the table ends, it goes up with the table's last row, cut off at the line:  never over a title
 *   - the copy draws as the table does:  the same classes in the same place (a `<ui-table>` copy for a `<ui-table>`);
 *     no pointer, no ids, hidden from readers
 * - the line, below the titles stuck over the table (`tableLine()`)
 * - read only for the tables on screen (an IntersectionObserver), a frame at a time, on any scroll (the page's, or a
 *   table's sideways) or resize;  tables a part's body or a live update adds later get theirs too
 */
function wireTableHeads(main) {
  const pins = new Map()
  const onScreen = new Set()
  const watched = new WeakSet()
  // tables whose copy can't stick (a scroll box between them and the page):  left alone until the window changes
  let unpinnable = new WeakSet()
  const screen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) onScreen.add(entry.target)
      else onScreen.delete(entry.target)
    }
    schedule()
  })
  let frame = 0
  const schedule = () => {
    frame ||= requestAnimationFrame(() => {
      frame = 0
      update()
    })
  }
  const watch = () => {
    for (const box of tableBoxes(main)) {
      if (watched.has(box) || !headRows(tableOf(box)).length) continue
      watched.add(box)
      screen.observe(box)
    }
  }
  const update = () => {
    for (const [box, pin] of pins) {
      if (box.isConnected) continue
      pin.remove()
      pins.delete(box)
      onScreen.delete(box)
    }
    for (const [box, pin] of pins) if (!onScreen.has(box)) pin.hidden = true
    for (const box of onScreen) if (box.isConnected && !unpinnable.has(box)) place(box)
  }
  const place = (box) => {
    const table = tableOf(box)
    const rows = headRows(table)
    if (!rows.length) return
    const head = rows[0].getBoundingClientRect()
    const height = rows.at(-1).getBoundingClientRect().bottom - head.top
    const line = tableLine(box)
    const end = table.getBoundingClientRect().bottom
    let pin = pins.get(box)
    if (!(head.top < line - 0.5 && end > line + 1)) {
      if (pin) pin.hidden = true
      return
    }
    if (!pin) {
      pin = el("div", { class: "spell-table-pin", "data-spell-added": true, "aria-hidden": "true", inert: true })
      pin.hidden = true
      pins.set(box, pin)
      const row = box.previousElementSibling
      ;(row?.classList.contains("spell-block-actions") ? row : box).before(pin)
    }
    // shown again:  the header as it is now (a live update may have changed it)
    if (pin.hidden) copyHead(pin, box, table, rows)
    pin.hidden = false
    setStyle(pin, "top", `${line}px`)
    const view = pin.firstElementChild
    const area = box.getBoundingClientRect()
    const at = pin.getBoundingClientRect()
    // not held at the line:  nothing, rather than a copy out of place
    if (Math.abs(at.top - line) > 1) {
      pin.hidden = true
      unpinnable.add(box)
      return
    }
    setStyle(view, "left", `${area.left - at.left}px`)
    setStyle(view, "width", `${area.width}px`)
    // each column as wide as the table's, and the copy moved to where the table's header is (sideways too)
    const copies = [...view.querySelectorAll("tr")].flatMap((each) => [...each.cells])
    const widths = rows.flatMap((each) => [...each.cells]).map((cell) => cell.getBoundingClientRect().width)
    widths.forEach((width, n) => copies[n] && setStyle(copies[n], "width", `${width}px`))
    const copy = view.querySelector("table")
    const first = view.querySelector("tr")
    // the copy as wide as the row, its own edges added (`table-layout: fixed` keeps the columns as set)
    const edges = copy.getBoundingClientRect().width - first.getBoundingClientRect().width
    setStyle(copy, "width", `${head.width + edges}px`)
    const shift = parseFloat(copy.style.translate) || 0
    setStyle(copy, "translate", `${shift + head.left - first.getBoundingClientRect().left}px`)
    // leaving with the table's last row:  up, the part above the line cut off
    const up = Math.min(0, end - (line + height))
    setStyle(view, "translate", up ? `0 ${up}px` : "")
    setStyle(view, "clip-path", up ? `inset(${-up}px 0 0 0)` : "")
  }
  watch()
  new MutationObserver(() => requestAnimationFrame(watch)).observe(main, { childList: true, subtree: true })
  // capture:  a table's own sideways scroll too, which doesn't bubble
  document.addEventListener("scroll", schedule, { capture: true, passive: true })
  addEventListener("resize", () => {
    unpinnable = new WeakSet()
    schedule()
  })
}

/** Set `element`'s inline style `name` to `value` ("" removes it), unless it's that already. */
function setStyle(element, name, value) {
  if (element.style.getPropertyValue(name) === value) return
  if (value) element.style.setProperty(name, value)
  else element.style.removeProperty(name)
}

/** The `<table>` of a table's box (`tableBoxes()`):  the box itself, or the `<ui-table>`'s own. */
function tableOf(box) {
  return box.localName === "table" ? box : box.querySelector(":scope > table")
}

/** A table's header rows (`wireTableHeads()`):  its `<thead>`'s, else its first row when it holds `<th>`s alone. */
function headRows(table) {
  if (!table) return []
  if (table.tHead?.rows.length) return [...table.tHead.rows]
  const first = table.rows[0]
  return first?.cells.length && [...first.cells].every((cell) => cell.localName === "th") ? [first] : []
}

/**
 * Draw a copy of `table`'s header `rows` into `pin` (`wireTableHeads()`):  the table's own tag and classes, in a
 * shallow copy of its `<ui-table>`, so the page's rules draw it as they draw the table;  never its ids, the table's
 * inline styles (the expand button's widths) or its body.
 */
function copyHead(pin, box, table, rows) {
  const copy = table.cloneNode(false)
  const head = el("thead", {}, ...rows.map((row) => row.cloneNode(true)))
  copy.append(head)
  const host = box === table ? undefined : box.cloneNode(false)
  host?.append(copy)
  for (const each of [copy, host]) {
    each?.removeAttribute("id")
    each?.removeAttribute("style")
  }
  for (const each of head.querySelectorAll("[id]")) each.removeAttribute("id")
  pin.replaceChildren(el("div", { class: "spell-table-pin-view" }, host ?? copy))
}

/**
 * Where a table's header sticks (`wireTableHeads()`), px from the window's top:  the bottom of what is stuck over it.
 * - an epic page's:  its `--epic-stack` (the page header and bar, the stuck block titles), and the line of the item
 *   it's in, which sticks there too
 * - a `<ui-section>` page's:  the site header and the TOP-LEVEL section's stack (`--spell-stack`, the page header and
 *   its title):  a nested section's stuck title joins that one's row (`wireStuckTrail()`), its own room left empty
 * - a headings page's (the saga pages):  the page header, then the h2's and h3's above it
 */
function tableLine(box) {
  const style = getComputedStyle(box)
  const px = (name) => parseFloat(style.getPropertyValue(name)) || 0
  if (box.closest("epic-page")) {
    const line = box.parentElement?.closest("epic-item")?.shadowRoot?.querySelector('[part~="line"]')
    return (px("--epic-stack") || siteHeaderHeight()) + (line?.getBoundingClientRect().height ?? 0)
  }
  let section = box.closest("ui-section")
  while (section?.parentElement?.closest("ui-section")) section = section.parentElement.closest("ui-section")
  if (section) return siteHeaderHeight() + (parseFloat(section.style.getPropertyValue("--spell-stack")) || 0)
  return siteHeaderHeight() + px("--spell-top") + px("--spell-h2-h") + px("--spell-h3-h")
}

/**
 * Stuck titles on ONE row (Owen, 2026-10-13:  "This could collapse to one row when stickified"):  while a nested
 * section's title is stuck under its parent's, the top-level stuck title reads `2. Files on disk › 2.1 The repo`, and
 * the nested stuck titles under it hide (their room shows the text scrolling under them).
 * - the trail is the top-level title's `::part(header)::after`, from `--spell-stuck-trail` on it, with
 *   `data-spell-trail`;  each hidden one has `data-spell-merged` (`spell-doc.css`, "Stuck titles on one row")
 * - worked out again on every scroll and resize, a frame at a time, and once more as it settles:  `:state(stuck)`
 *   (`<ui-section sticky>`'s) sends no event
 * - every page's `<ui-section>`s;  an epic page draws its own sections, in its elements' shadow roots
 */
function wireStuckTrail(main) {
  const marked = new Set()
  const isStuck = (section) => section.matches("[sticky]") && section.matches(":state(stuck)")
  // the sections directly under `section` (none between), as nesting goes
  const childrenOf = (section) =>
    [...section.querySelectorAll("ui-section")].filter((each) => each.parentElement.closest("ui-section") === section)
  const titleOf = (section) =>
    (
      section.getAttribute("label") ??
      section.getAttribute("header") ??
      section.querySelector(':scope > [slot="label"], :scope > [slot="header"]')?.textContent ??
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
  const update = () => {
    const merged = new Set()
    const trails = new Map()
    for (const top of main.querySelectorAll("ui-section")) {
      if (top.parentElement.closest("ui-section") || !isStuck(top)) continue
      const trail = []
      for (let at = top; ;) {
        const child = childrenOf(at).find(isStuck)
        if (!child) break
        trail.push(titleOf(child))
        merged.add(child)
        at = child
      }
      if (trail.length) trails.set(top, JSON.stringify(` › ${trail.join(" › ")}`))
    }
    for (const section of marked) {
      if (!merged.has(section)) section.removeAttribute("data-spell-merged")
      if (!trails.has(section)) {
        section.removeAttribute("data-spell-trail")
        section.style.removeProperty("--spell-stuck-trail")
      }
    }
    marked.clear()
    for (const section of merged) {
      if (!section.hasAttribute("data-spell-merged")) section.setAttribute("data-spell-merged", "")
      marked.add(section)
    }
    for (const [section, trail] of trails) {
      if (section.style.getPropertyValue("--spell-stuck-trail") !== trail)
        section.style.setProperty("--spell-stuck-trail", trail)
      if (!section.hasAttribute("data-spell-trail")) section.setAttribute("data-spell-trail", "")
      marked.add(section)
    }
  }
  let queued = false
  const soon = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      update()
    })
  }
  // `:state(stuck)` follows a moment after the scroll (`StickyWatch` hears it from an observer):  so again once the
  // scrolling settles, or the last frame would read the titles as they were
  let settle
  const later = () => {
    soon()
    clearTimeout(settle)
    settle = setTimeout(soon, STUCK_SETTLE_MS)
  }
  addEventListener("scroll", later, { passive: true })
  addEventListener("resize", later)
  later()
}

/** How long after the last scroll the stuck titles are read again (`wireStuckTrail()`), ms. */
const STUCK_SETTLE_MS = 120

/**
 * A table's key, for remembering its width:  its id, else the nearest id above it and which table it is under that
 * (`p14#table-1`, `memory#table-2`);  `page#table-<n>` with no id above it.
 */
function tableKey(box, main) {
  if (box.id) return box.id
  const holder = box.parentElement.closest("[id]")
  const root = holder && main.contains(holder) ? holder : main
  return `${root === main ? "page" : root.id}#table-${tableBoxes(root).indexOf(box) + 1}`
}

/**
 * How far a widened table `box` may run, as window x's `{ left, right }`:  `main`'s width less its gutter
 * (`--spell-gutter`) on both sides, cut to every ancestor between them that clips its overflow (`overflow-x` not
 * `visible`), at that ancestor's inner edges.
 * - up through slots and shadow roots:  a table in an `<epic-*>` element's light DOM is laid out in its shadow root's
 *   boxes
 */
function roomFor(box, main) {
  const page = main.getBoundingClientRect()
  const gutter = parseFloat(getComputedStyle(main).getPropertyValue("--spell-gutter")) || 16
  const room = { left: page.left + gutter, right: page.right - gutter }
  for (let el = layoutParent(box); el && el !== main; el = layoutParent(el)) {
    if (getComputedStyle(el).overflowX === "visible") continue
    const left = el.getBoundingClientRect().left + el.clientLeft
    room.left = Math.max(room.left, left)
    room.right = Math.min(room.right, left + el.clientWidth)
  }
  return room
}

/** How wide `roomFor()` lets `box` run. */
function roomWidth(box, main) {
  const room = roomFor(box, main)
  return room.right - room.left
}

/** The least a widened table must gain on its column (px) for the expand button to show. */
const MIN_WIDE_GAIN = 24

/** The box `el` is laid out in:  its slot when it's slotted, else its parent, else its shadow root's host. */
function layoutParent(el) {
  return el.assignedSlot ?? el.parentElement ?? el.getRootNode().host ?? null
}

/**
 * The tables in `root`, each by its BOX:  its `<ui-table>` host, else the bare table.  Never a pinned header's copy
 * (`wireTableHeads()`), which isn't the page's.
 */
function tableBoxes(root) {
  const tables = [...root.querySelectorAll("table")].filter((table) => !table.closest(".spell-table-pin"))
  return [...new Set(tables.map((table) => table.closest("ui-table") ?? table))]
}

/**
 * Land where the page should open, once its sections have drawn and folded:
 * - a live reload's saved scroll position (`SPELL_SERVER.takeScroll()`):  exactly there, held while the page settles
 *   (`holdScroll()`);  its `#hash` was dropped (`start()`)
 * - else the URL's `#hash`:
 *   - a section or heading WITHOUT unfolding the target itself:  the address follows the section being read
 *     (`followScroll()`), so a reload (or VS Code restarting) lands on it, folded or not, as the reader left it
 *   - a plan item (`<epic-item>`) OPENS:  the address never follows items, so an item's `#q16` is a link someone
 *     followed (`spell dev docs link --hash q16 --show`), and a folded item shows nothing of what it pointed at
 * - else nowhere:  the top
 * - then the address starts following the scroll;  after a `#hash`, only once the jump has landed:
 *   a target in a body not loaded yet (a split epic page's part) lands a moment later, and following before that saw
 *   the top of the page, and wrote the hash away (I3 of `windows-and-review`)
 */
function land({ hash, scroll }, jump, follow) {
  if (scroll !== undefined) {
    holdScroll(scroll)
    follow?.update()
  } else if (hash) {
    const landed = jump(hash, { unfoldTarget: document.getElementById(hash)?.localName === "epic-item" })
    // the browser's own jump to the `#hash` can come AFTER ours and land the target under the stuck titles (an
    // item has no box of its own:  `display: contents`), so land once more when the page has settled, unless the
    // reader has moved meanwhile
    let moved = false
    for (const type of READER_INPUT) addEventListener(type, () => (moved = true), { once: true, passive: true })
    setTimeout(() => !moved && jump(hash, { unfoldTarget: false }), SETTLE_MS * 2)
    void landed.then(() => follow?.followAddress())
    return
  } else follow?.update()
  follow?.followAddress()
}

/**
 * Keep the page at `top` while it settles after a live reload:  every frame for `RESTORE_HOLD_MS`,
 * until the reader does anything (`READER_INPUT`).
 * - why:  the page grows as it settles (the folds put back draw, their parts load), and the browser and the elements
 *   scroll it meanwhile;  one scroll, and one more after `SETTLE_MS` only when nothing else had moved it, landed short
 *   (I23 of `epic-engine`:  1150 -> 671)
 * - the page may be too short for `top` at first:  it gets there as it grows
 */
function holdScroll(top) {
  const reader = new AbortController()
  for (const type of READER_INPUT)
    addEventListener(type, () => reader.abort(), { once: true, passive: true, signal: reader.signal })
  const until = performance.now() + RESTORE_HOLD_MS
  const hold = () => {
    if (reader.signal.aborted) return
    if (Math.abs(scrollY - top) >= 1) scrollTo({ top, behavior: "instant" })
    if (performance.now() < until) requestAnimationFrame(hold)
    else reader.abort()
  }
  hold()
}

/**
 * Resolves once an epic page's elements are defined and have drawn (their hosts' `ready`), so their
 * `contentsEntry` can be read;  after `EPIC_WAIT_MS` at most (a pack that won't load:  the page goes on without).
 */
async function epicsDrawn(main) {
  const tags = ["epic-page", ...EPIC_FOLDS.split(", ")]
  const drawn = Promise.all(tags.map((tag) => customElements.whenDefined(tag))).then(() =>
    Promise.all(Array.from(main.querySelectorAll(EPIC_FOLDS), (host) => host.ready))
  )
  await Promise.race([drawn, new Promise((done) => setTimeout(done, EPIC_WAIT_MS))])
}

/**
 * An epic page (`epics/<name>/<name>.plan.html`;  before 2026-10-04 `<name>.html`) names its tab `<name>`:
 * every link to it has `target="<name>"` (`doc-links.js`),
 * so they reuse this tab, as `epic open <name>` does.
 */
function nameTab() {
  const plan = /\/epics\/([^/]+)\/\1(?:\.plan)?\.html$/.exec(decodeURIComponent(location.pathname))
  if (plan) window.name = plan[1]
}

/** highlight.js colors every `pre code`;  without it (offline) the code stays plain monospace. */
function highlight() {
  try {
    globalThis.hljs?.highlightAll()
  } catch {
    // plain monospace is fine
  }
}

////////////////
// ## Live update
////////////////

/**
 * Elements the runtime adds INSIDE `main`, so not in the page's source:  the patch steps around them.
 * - NOTE: anything else the runtime (or a page script) adds in `main` should carry `data-spell-added`;
 *   an unknown extra is stepped around too when its tag doesn't collide with its source siblings' (`liveKids()`)
 */
const ADDED = ".spell-item-filter, .spell-hidden-note, [data-spell-added]"

/**
 * The page state of an `<epic-*>` element (epic `epic-components`, P10):  folded or open (items, sections, phases,
 * the Overview), and the page being reviewed (`<epic-page reviewing>`);  never in the file, so a patch keeps them
 * (`KEPT_ATTRIBUTES`), and a replaced subtree carries them over (`carryEpicState()`).
 * - NOTE: their review controls and note boxes are in their shadow roots (P9):  a patch never sees them
 */
const EPIC_PAGE_STATE = ["open", "reviewing"]

/**
 * Attributes the reader's state lives in (folds, counts, the item filter, `EPIC_PAGE_STATE`):
 * a patch keeps them (`planAttributes()`).
 */
const KEPT_ATTRIBUTES = new Set(["collapsed", "badge", "data-show", ...EPIC_PAGE_STATE])

/**
 * Elements that manage their children (panels and tabs by index, options):  a change inside replaces the whole
 * element, its open panels carried over (`carryState()`).
 */
const MANAGERS = "ui-accordion, ui-tabs, ui-select, ui-dropdown"

/**
 * A tag of the `epics` pack's elements (`<epic-page>`, `<epic-item>` ...):  NEVER replaced by a patch while its tag
 * stays (`planMorph()`):  each keeps its fold, its loaded part and what's typed in it.
 */
const EPIC_TAG = /^epic-/

/** `squash()`ed `outerHTML` of source nodes, computed once per patch. */
const squashed = new WeakMap()

/**
 * An edit to this page's file updates it IN PLACE, instead of reloading it (epic page `review-review`, D10).
 * - `liveClient()` (`$/server`, `packages/server/src/liveClient.ts`) fetches the new version when the file changes,
 *   and fires a cancelable `spell-server:change` on `window`, `detail` `{ path, html, etag, reload() }`:
 *   taking it (`preventDefault()`) stops its reload
 * - the patch compares the page's source as it LOADED (fetched once, `SPELL_SERVER.readPage()`, trusted only when
 *   its `ETag` is the one served) with the new source, and changes only what differs in the live page
 *   (`patchPage()`):  everything else keeps its scroll, folds, open panels, focus and typed text
 * - then re-wires what the runtime built from the markup (`rewire()`) and fires `spell-doc:updated` on `window`,
 *   `detail.changed`:  the elements added, replaced or re-attributed
 * - a full reload instead (`reload()`, which keeps the scroll) when the page can't be patched safely:
 *   - not `<ui-section>` markup (the saga pages), a CHEATSHEET's filter, or a script besides the bundle and
 *     highlight.js (it may have built from the markup):  never taken.  An INERT script (a data block,
 *     `<script type="text/plain">`:  an epic page's "Plan hung?" prompt) never runs, so it doesn't count
 *   - stylesheets, scripts or anything outside `main` changed (but `<body>`'s attributes:  patched too, e.g. a plan
 *     doc's `data-recent-since`, which every edit may move;  not its `class`), more than half of `main` changed,
 *     the source as loaded couldn't be read, or the patch threw
 * - BODIES from files (`<ui-section source>`, `<ui-accordion source>`:  a split epic page's parts) live their own
 *   life (`wireSourceBodies()`):  the patch leaves what a host loaded alone (`planHost()`), a changed body file
 *   re-fetches its open host in place, and each body that loads re-wires the page (`refresh()`)
 * - an epic page in `<epic-*>` markup (epic `epic-components`):  its elements are patched, never replaced
 *   (`planMorph()`), their page state kept (`EPIC_PAGE_STATE`);
 *   their parts (`<epic-item source>` ...) live the bodies' life above
 * - returns `{ ready(page), refresh(changed) }`:  `start()` hands over what it wired;  a change waits for it.
 *   `refresh()` re-wires after `changed` elements changed under the runtime (a body loaded), in turn with updates
 */
function wireLiveUpdate(main) {
  const server = window.SPELL_SERVER
  let ready = () => {}
  const started = new Promise((resolve) => (ready = resolve))
  // one update at a time, in order:  patches, re-fetched bodies, re-wiring
  let queue = Promise.resolve()
  const live = { ready, refresh }
  wireSourceBodies(main, live, enqueue)
  if (!server?.readPage || !canPatch(main)) return live
  // the source as loaded:  null when it can't be trusted (the file changed before it was read)
  let base = server.readPage().then(
    ({ html, etag }) => (etag && etag === server.etag ? html : null),
    () => null
  )
  addEventListener("spell-server:change", (event) => {
    const { html, reload } = event.detail ?? {}
    if (typeof html !== "string" || typeof reload !== "function") return
    event.preventDefault()
    queue = queue.then(() => update(html, reload)).catch(() => reload())
  })
  return live

  /** Patch the page to `html`, then re-wire it;  reload when it can't be patched. */
  async function update(html, reload) {
    const [before, page] = await Promise.all([base, started])
    const patched = before === null ? null : patchPage(page.main, parse(before), parse(html))
    if (!patched) return reload()
    base = Promise.resolve(html)
    await rewire(page, patched.changed)
  }

  /** Re-wire the page once it's started, after `changed` (elements) changed:  queued behind the updates. */
  function refresh(changed) {
    enqueue(async () => rewire(await started, changed))
  }

  /** Run `job` (async) after every update queued before it;  a failure doesn't stop the queue. */
  function enqueue(job) {
    queue = queue.then(job).catch(() => undefined)
  }
}

/**
 * Can this page be patched in place?
 * - `<ui-section>` markup (or an epic page in `<epic-*>` markup:  its `<epic-page>`)
 * - no CHEATSHEET filter
 * - no script but the bundle, highlight.js, what the page server injects,
 *   component packs (`<ui-components source="x.pack.js">`'s script, which only defines elements)
 *   and inert data blocks (`isInert()`)
 */
function canPatch(main) {
  if (!main.querySelector(":scope > :is(ui-section, epic-page)")) return false
  if (document.querySelector("[data-spell-filter], [data-spell-filter-badge]")) return false
  return Array.from(document.scripts).every((script) => {
    const src = script.getAttribute("src")
    if (!src) return isInert(script) || script.textContent.includes("SPELL_SERVER")
    return /^\/api\/server\//.test(src) || /(^|\/)(spell-ui|highlight(\.min)?|[\w-]+\.pack)\.js$/.test(src)
  })
}

/**
 * Is `script` INERT:  a data block the browser never runs (`type="text/plain"`, JSON ...), not JavaScript or a
 * module?  Epic pages' "Plan hung?" notice keeps its prompt in one.
 */
function isInert(script) {
  const type = (script.getAttribute("type") ?? "").trim().toLowerCase()
  return type !== "" && type !== "module" && !/^(text|application)\/(x-)?(java|ecma)script$/.test(type)
}

////////////////
// ## Bodies from files
////////////////

/**
 * Hosts whose body comes from a file, in step with the files and the page:
 * `<ui-section source>`, `<ui-accordion source>`, and an epic page's parts
 * (`epics/<name>/parts/<id>.html`, epic `claude-design` P3, on its `<epic-*>` blocks and items).
 * - a body loads (`ui-load`, the first open or a re-fetch):  the page is re-wired around it (`live.refresh()`):
 *   the outline (headings inside), contents, counts, item filters, code colors
 * - a body's FILE changed (the page server's `spell-server:file`, `liveClient.ts`):  a host that has loaded it
 *   re-fetches it in place (`reload()`), the reading position kept (`readingAnchor()`);  one that hasn't drops the
 *   cached copy, so its first open fetches the new one
 * - `enqueue`:  the live update's queue (`wireLiveUpdate()`):  a re-fetch waits for a patch in flight
 */
function wireSourceBodies(main, live, enqueue) {
  main.addEventListener("ui-load", (event) => {
    const host = event.target
    if (host instanceof Element && host.hasAttribute("source") && main.contains(host)) live.refresh([host])
  })
  addEventListener("spell-server:file", (event) => {
    const path = event.detail?.path
    if (typeof path !== "string") return
    const changed = decodeURIComponent(path)
    for (const host of main.querySelectorAll("[source]")) {
      const url = sourceUrl(host)
      if (!url || decodeURIComponent(url.pathname) !== changed) continue
      if (hasLoaded(host)) enqueue(() => reloadBody(host))
      else forgetSource(url.href)
    }
  })

  /**
   * Re-fetch `host`'s body, keeping the line being read where it is.
   * - what had the focus inside it, a note box being typed in:  focused again, its caret where it was
   *   - `dock()` puts the same box back;
   *     an `<epic-item>`'s is in its shadow root, which the reload may hide for a moment
   */
  async function reloadBody(host) {
    const anchor = readingAnchor(main)
    const active = host.contains(document.activeElement) ? deepActiveElement() : null
    const caret = active && "selectionStart" in active ? [active.selectionStart, active.selectionEnd] : null
    // the body goes in on the host's `ui-load`, which can come after `reload()` resolves;
    // the runtime's pieces go back on it (`live.refresh()`):  wait for it (2s at most), then for them
    const loaded =
      active &&
      new Promise((done) => {
        host.addEventListener("ui-load", done, { once: true })
        setTimeout(done, 2000)
      })
    await host.reload?.()
    keepAnchor(anchor)
    if (!active) return
    await loaded
    for (let frame = 0; frame < 60 && !active.isConnected; frame++) await nextFrames(1)
    // the host draws what it hid while loading (a frame):  hidden, the box can't take the focus
    await nextFrames(1)
    if (!active.isConnected || deepActiveElement() === active) return
    active.focus({ preventScroll: true })
    if (caret) active.setSelectionRange(...caret)
  }
}

/** The element with the focus, inside shadow roots too (`document.activeElement` stops at their hosts). */
function deepActiveElement() {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/** Absolute URL of `host`'s `source`, when it's on this page's origin;  else null. */
function sourceUrl(host) {
  try {
    const url = new URL(host.getAttribute("source"), document.baseURI)
    return url.origin === location.origin ? url : null
  } catch {
    return null
  }
}

/** Has `host` started on its body (loading, loaded, or failed:  then a re-fetch tries again)? */
function hasLoaded(host) {
  try {
    return host.matches(":state(loaded), :state(loading), :state(error)")
  } catch {
    return false
  }
}

/** Drop `url` from UI's cache of fetched files (`UI.sources`), so the next load fetches it. */
function forgetSource(url) {
  try {
    void window.SpellUI?.UI?.load?.()?.then((ui) => ui.sources.forget(url))
  } catch {
    // no UI yet:  nothing cached either
  }
}

/**
 * The host whose unloaded body holds element `id`:  its `data-part-ids` (the ids inside, written by
 * `PlanParts`;  an epic page's `<epic-*>`:  `part-ids`), when the element isn't in the page yet;  else null.
 */
function hostHolding(main, id) {
  if (!id || document.getElementById(id)) return null
  const ids = (host) => (host.getAttribute("data-part-ids") ?? host.getAttribute("part-ids") ?? "").split(/\s+/)
  return (
    Array.from(main.querySelectorAll("[source]:is([data-part-ids], [part-ids])")).find((host) =>
      ids(host).includes(id)
    ) ?? null
  )
}

/** Parse a page's HTML into an inert document. */
function parse(html) {
  return new DOMParser().parseFromString(html, "text/html")
}

/** A document's (or body's) `main`, as `start()` finds it. */
function mainIn(root) {
  return root.querySelector("main.spell-doc-main") ?? root.querySelector("main")
}

/**
 * Patch the live page from source `before` to source `after` (parsed documents);  the plan, or null when it
 * can't be done safely (see `wireLiveUpdate()`).
 * - plans everything first (`planMorph()`), so a patch too big is refused before anything changes
 * - keeps the line being read where it is (`readingAnchor()`), whatever changed above it
 * - the `<title>` follows
 */
function patchPage(main, before, after) {
  const was = mainIn(before)
  const now = mainIn(after)
  if (!was || !now || headKey(before) !== headKey(after) || shellKey(before) !== shellKey(after)) return null
  const plan = { ops: [], weight: 0, changed: [] }
  planBodyAttributes(before.body, after.body, plan)
  if (planMorph(was, now, main, plan) !== main || plan.weight > now.outerHTML.length / 2) return null
  const anchor = readingAnchor(main)
  if (after.title !== before.title) document.title = after.title
  for (const op of plan.ops) op()
  keepAnchor(anchor)
  return plan
}

/**
 * What a page loads:  its stylesheets and scripts (not what the page server injects, nor inert data blocks:
 * `isInert()`), one line each.
 */
function headKey(doc) {
  const parts = Array.from(
    doc.querySelectorAll('link[rel~="stylesheet"]'),
    (link) => `css ${link.getAttribute("href")}`
  )
  for (const script of doc.querySelectorAll("script")) {
    const src = script.getAttribute("src")
    if (src?.startsWith("/api/server/") || (!src && script.textContent.includes("SPELL_SERVER"))) continue
    if (!src && isInert(script)) continue
    parts.push(src ? `js ${src}` : `inline ${squash(script.textContent)}`)
  }
  return parts.join("\n")
}

/**
 * Everything in a page's `<body>` but `main`'s content, the scripts and `<body>`'s attributes (bar its `class`:
 * the runtime adds classes of its own), whitespace squashed.  The attributes are patched (`planBodyAttributes()`).
 */
function shellKey(doc) {
  const body = doc.body.cloneNode(true)
  mainIn(body)?.replaceChildren()
  for (const script of body.querySelectorAll("script")) script.remove()
  for (const name of body.getAttributeNames()) if (name !== "class") body.removeAttribute(name)
  return squash(body.outerHTML)
}

/**
 * Plan setting the `<body>` attributes whose source changed from `before` to `after` (`data-recent-since`,
 * `data-bedtime` ...) on the live `<body>`;  never `class` (`shellKey()` holds it).
 */
function planBodyAttributes(before, after, plan) {
  for (const name of new Set([...before.getAttributeNames(), ...after.getAttributeNames()])) {
    const value = after.getAttribute(name)
    if (name === "class" || value === before.getAttribute(name)) continue
    plan.ops.push(() =>
      value === null ? document.body.removeAttribute(name) : document.body.setAttribute(name, value)
    )
  }
}

/**
 * Plan turning `live` (whose source was `before`) into `after`;  returns the node that ends up in `live`'s place:
 * `live` itself when it's patched in place, else its replacement.
 * - unchanged (`sameNode()`):  nothing
 * - in place:  its source attributes that changed (not `KEPT_ATTRIBUTES`), then its children, matched by `id`, else
 *   in order by tag (`matchOf()`):  each patched in turn, new ones added, gone ones removed
 * - REPLACED, its reader's state carried over (`carryState()`):  a tag change, text of its own (a paragraph, a
 *   title:  the smallest thing that holds the changed text), a `MANAGERS` element, or children the live page
 *   doesn't line up with
 * - an `<epic-*>` element (`EPIC_TAG`) is NEVER replaced while its tag stays (P10 of `epic-components`):
 *   it keeps its fold, its loaded part and its controller.
 *   Its attributes are patched in place (its page state kept:  `EPIC_PAGE_STATE`), its children morphed as above;
 *   only where they can't be (text of its own changed, children that don't line up)
 *   are its CHILDREN replaced (`planContent()`), never the element
 * - SIDE EFFECT:  pushes the live changes onto `plan.ops`, and what's new onto `plan.changed`
 */
function planMorph(before, after, live, plan) {
  if (sameNode(before, after)) return live
  if (isHost(before, after, live)) return planHost(before, after, live, plan)
  const sameTag = live.localName === after.localName && before.localName === after.localName
  const epic = sameTag && EPIC_TAG.test(after.localName)
  if (!sameTag || (!epic && (live.matches(MANAGERS) || hasText(before) || hasText(after))))
    return planReplace(after, live, plan)
  const was = Array.from(before.children)
  const kids = liveKids(was, live)
  if (epic && (!kids || hasText(before) || hasText(after))) return planContent(before, after, live, plan)
  if (!kids) return planReplace(after, live, plan)
  planAttributes(before, after, live, plan)
  const now = Array.from(after.children)
  const free = new Set(was)
  let cursor = 0
  const slots = now.map((kid, index) => {
    const match = matchOf(kid, index)
    if (!match) return planNew(kid, plan)
    free.delete(match)
    const at = was.indexOf(match)
    if (!kid.id) cursor = at + 1
    return planMorph(match, kid, kids[at], plan)
  })
  if (slots.length !== kids.length || slots.some((slot, index) => slot !== kids[index]))
    plan.ops.push(() => placeChildren(live, kids, slots))
  return live

  /**
   * The old child new child `kid` (at `index`) is:  by `id`;  else the next unmatched one of its tag, preferring
   * one that's unchanged, but never one a LATER new child is identical to (then `kid` was inserted before it).
   */
  function matchOf(kid, index) {
    if (kid.id) {
      const match = was.find((old) => old.id === kid.id)
      return match && free.has(match) && match.localName === kid.localName ? match : undefined
    }
    const candidates = was.slice(cursor).filter((old) => free.has(old) && !old.id && old.localName === kid.localName)
    const equal = candidates.find((old) => sameNode(old, kid))
    if (equal) return equal
    const first = candidates[0]
    const later = now.slice(index + 1)
    if (first && !later.some((next) => !next.id && sameNode(first, next))) return first
    return undefined
  }
}

/**
 * Is `live` a section whose body comes from a file (`source`), the same file before and after?
 * Its body is the file's (`wireSourceBodies()`), not the page source's:  `planHost()`.
 * - not an accordion host (`<ui-accordion source>`):  a `MANAGERS` element, replaced whole as ever, its open panel
 *   carried over, so it loads its body again
 */
function isHost(before, after, live) {
  const source = after.getAttribute("source")
  return (
    source !== null &&
    before.getAttribute("source") === source &&
    live.getAttribute("source") === source &&
    live.localName === after.localName &&
    before.localName === after.localName &&
    !live.matches(MANAGERS)
  )
}

/**
 * Plan patching host `live` (`isHost()`):  its attributes, and its SLOTTED children (icon, header), each patched in
 * turn;  the body (every other child:  what the file put there, or the placeholder) is left alone.
 * - slotted children that don't line up:  the whole host is replaced, and loads its body again when open
 */
function planHost(before, after, live, plan) {
  const was = slottedOf(before)
  const now = slottedOf(after)
  const kids = slottedOf(live).filter((kid) => !kid.matches(ADDED))
  const lined =
    was.length === now.length &&
    kids.length === was.length &&
    was.every((kid, at) => kid.localName === now[at].localName && kids[at].localName === kid.localName)
  if (!lined) return planReplace(after, live, plan)
  planAttributes(before, after, live, plan)
  was.forEach((kid, at) => {
    const slot = planMorph(kid, now[at], kids[at], plan)
    if (slot !== kids[at]) plan.ops.push(() => kids[at].replaceWith(slot))
  })
  return live
}

/** `element`'s children headed for a named slot (`slot="icon"` ...). */
function slottedOf(element) {
  return Array.from(element.children).filter((kid) => kid.hasAttribute("slot"))
}

/**
 * `live`'s children that stand for source children `was`, in order:  the next live child of each one's tag (and
 * `id`), stepping over what the runtime added (`ADDED`) and other extras;  null when they don't line up.
 */
function liveKids(was, live) {
  const kids = Array.from(live.children).filter((kid) => !kid.matches(ADDED))
  const mapped = []
  let at = 0
  for (const old of was) {
    while (at < kids.length && (kids[at].localName !== old.localName || (old.id && kids[at].id !== old.id))) at++
    if (at === kids.length) return null
    mapped.push(kids[at++])
  }
  return mapped
}

/** Plan setting the source attributes that changed from `before` to `after` on `live`. */
function planAttributes(before, after, live, plan) {
  const changes = []
  for (const name of new Set([...before.getAttributeNames(), ...after.getAttributeNames()])) {
    const value = after.getAttribute(name)
    if (!KEPT_ATTRIBUTES.has(name) && value !== before.getAttribute(name)) changes.push([name, value])
  }
  if (!changes.length) return
  plan.changed.push(live)
  plan.ops.push(() => {
    for (const [name, value] of changes)
      if (value === null) live.removeAttribute(name)
      else live.setAttribute(name, value)
  })
}

/**
 * Plan giving `<epic-*>` element `live` the children of `after`, the element itself kept (`planMorph()`):
 * its source attributes patched, then its children replaced by copies of `after`'s, the reader's state carried over
 * (`carryState()`);  what the runtime or the page's review controls added (`ADDED`) stays.  Returns `live`.
 */
function planContent(before, after, live, plan) {
  planAttributes(before, after, live, plan)
  const nodes = Array.from(after.childNodes, (node) => {
    const copy = node.cloneNode(true)
    if (copy.nodeType === Node.ELEMENT_NODE) carryState(live, copy)
    return document.importNode(copy, true)
  })
  plan.weight += after.innerHTML.length
  plan.changed.push(...nodes.filter((node) => node.nodeType === Node.ELEMENT_NODE))
  plan.ops.push(() => {
    const kept = Array.from(live.children).filter((kid) => kid.matches(ADDED))
    live.replaceChildren(...nodes, ...kept)
  })
  return live
}

/** Plan replacing `live` with a copy of `after`, the reader's state carried over;  returns the copy. */
function planReplace(after, live, plan) {
  const copy = after.cloneNode(true)
  carryState(live, copy)
  return adopt(copy, after, plan)
}

/** Plan adding a copy of source element `after`, folded as a new section should be;  returns the copy. */
function planNew(after, plan) {
  const copy = after.cloneNode(true)
  carryFolds(copy)
  return adopt(copy, after, plan)
}

/**
 * `copy` (still in the parsed document) brought into this one, counted in the plan's weight.
 * - NOTE: its folds and panels are set BEFORE it's imported, so it draws that way first:  nothing animates
 */
function adopt(copy, source, plan) {
  const node = document.importNode(copy, true)
  plan.weight += source.outerHTML.length
  plan.changed.push(node)
  return node
}

/**
 * Put `slots` in `parent` in that order:  `kids` (its children as they were) not among them go, the rest stay where
 * they are when already in order, new ones go in after the slot before them.
 * - extras (`ADDED`, or anything else not in the source) stay where they are
 */
function placeChildren(parent, kids, slots) {
  for (const kid of kids) if (!slots.includes(kid)) kid.remove()
  let previous = null
  for (const node of slots) {
    const placed =
      node.parentNode === parent &&
      (!previous || previous.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
    if (!placed) {
      if (previous) previous.after(node)
      else {
        const next = slots.find((slot) => slot !== node && slot.parentNode === parent)
        if (next) next.before(node)
        else parent.prepend(node)
      }
    }
    previous = node
  }
}

/**
 * Carry the reader's state from `live` to `copy`, its replacement (not yet imported):
 * - folds:  every section keeps its fold, new ones fold as `carryFolds()` says
 * - open panels:  each accordion's, matched by its nearest ancestor with an `id` and its order under it
 * - `<epic-*>` page state:  `carryEpicState()`
 * - typed text:  fields with an `id`
 */
function carryState(live, copy) {
  carryFolds(copy)
  carryEpicState(copy)
  const panels = accordionsOf(live)
  for (const [key, accordion] of accordionsOf(copy)) {
    const old = panels.get(key)
    if (!old) continue
    const open = openIndexes(old).join(" ")
    if (open) accordion.setAttribute("open", open)
    else accordion.removeAttribute("open")
  }
  for (const field of withSelf(copy, "textarea[id], input[id]")) {
    const old = document.getElementById(field.id)
    if (!old || !live.contains(old) || old.value === undefined) continue
    if (field.localName === "textarea") field.textContent = old.value
    else field.setAttribute("value", old.value)
  }
}

/**
 * Fold every collapsible section in `copy` as the reader has it:  as the live one with its `id`, else as saved
 * (`spell-folds:<path>`), else an epic page's start-folded (`wireFolds()`);  else the markup's `collapsed` stands.
 */
function carryFolds(copy) {
  const saved = readJSON(`${FOLD_KEY_PREFIX}${location.pathname}`)
  const planDoc = document.body.classList.contains("plan-doc")
  for (const section of withSelf(copy, "ui-section[collapsible]")) {
    const old = section.id ? document.getElementById(section.id) : null
    if (old?.localName === "ui-section") section.toggleAttribute("collapsed", isCollapsed(old))
    else if (section.id && section.id in saved) section.toggleAttribute("collapsed", !!saved[section.id])
    else if (planDoc) section.setAttribute("collapsed", "")
  }
}

/**
 * Give every `<epic-*>` element with an `id` in `copy` the page state (`EPIC_PAGE_STATE`:  `open` ...) of the live one
 * with that `id` and tag;  a new one starts as its markup says (folded:  `open` is never in the file).
 */
function carryEpicState(copy) {
  for (const element of withSelf(copy, "[id]")) {
    if (!EPIC_TAG.test(element.localName)) continue
    const old = document.getElementById(element.id)
    if (old?.localName !== element.localName) continue
    for (const name of EPIC_PAGE_STATE) {
      const value = old.getAttribute(name)
      if (value === null) element.removeAttribute(name)
      else element.setAttribute(name, value)
    }
  }
}

/** `root`'s accordions (itself included), by `<owner id>:<n>`:  the nearest ancestor with an `id` inside `root`. */
function accordionsOf(root) {
  const byKey = new Map()
  const counts = new Map()
  for (const accordion of withSelf(root, "ui-accordion")) {
    let owner = accordion === root ? null : accordion.parentElement
    while (owner && owner !== root && !owner.id) owner = owner.parentElement
    const name = accordion === root ? "" : (owner?.id ?? "")
    const n = counts.get(name) ?? 0
    counts.set(name, n + 1)
    byKey.set(`${name}:${n}`, accordion)
  }
  return byKey
}

/** `root` (when it matches `selector`) and every element under it that does, in document order. */
function withSelf(root, selector) {
  return [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)]
}

/** Are two source elements the same, ignoring how whitespace falls (a reformat re-wraps lines)? */
function sameNode(a, b) {
  return a.isEqualNode(b) || squashedOf(a) === squashedOf(b)
}

/** `squash()`ed `outerHTML` of source node `node`, cached. */
function squashedOf(node) {
  let value = squashed.get(node)
  if (value === undefined) squashed.set(node, (value = squash(node.outerHTML)))
  return value
}

/** Markup with every run of whitespace one space, and none between tags. */
function squash(html) {
  return html.replace(/\s+/g, " ").replace(/> </g, "><").trim()
}

/** Does `element` hold text of its own (not just whitespace between its children)? */
function hasText(element) {
  return Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.data.trim())
}

/** What the reader is looking at:  the element just below the stuck titles, mid-column, and its top. */
function readingAnchor(main) {
  const box = main.getBoundingClientRect()
  const element = document.elementFromPoint(box.left + box.width / 2, Math.min(innerHeight - 1, stuckBottom(main) + 8))
  return element && main.contains(element) ? { element, top: element.getBoundingClientRect().top } : null
}

/** Scroll so `anchor` (`readingAnchor()`) is where it was, if it's still in the page. */
function keepAnchor(anchor) {
  if (!anchor?.element.isConnected) return
  const moved = anchor.element.getBoundingClientRect().top - anchor.top
  if (Math.abs(moved) >= 1) scrollBy({ top: moved, behavior: "instant" })
}

/**
 * After a patch, redo what the runtime built from the markup, as `start()` did:
 * - the outline (ids for new entries), counts, item filters
 * - the toolbar, rebuilt only when its entries, icons or counts changed (`railKey()`)
 * - sticky lines, re-tracked when new sections came in
 * - code colors in what's new;  scroll-follow re-read
 * - then `spell-doc:updated` on `window`, `detail.changed`
 * - `page`:  what `start()` wired (`{ main, rail, sticky, follow, entries }`);  updated here
 */
async function rewire(page, changed) {
  const { main } = page
  // an epic page's blocks take the change in a microtask (Solid batches):  each `contentsEntry` reads it after
  if (main.querySelector("epic-page")) await nextFrames(1)
  const outline = outlineOf(main)
  const counts = countItems(outline)
  wireItemFilters(main)
  highlightIn(changed)
  const entries = railKey(outline, counts)
  if (entries !== page.entries) page.rail = buildNavigation(main, outline, counts)
  page.entries = entries
  if (changed.some((node) => withSelf(node, "ui-section").length)) page.sticky = trackStickyHeights(main, outline)
  page.follow.rescan(page.rail)
  await nextFrames(UNFOLD_FRAMES)
  page.sticky.measure()
  page.follow?.update()
  dispatchEvent(new CustomEvent("spell-doc:updated", { detail: { changed } }))
}

/** What the toolbar is built from, as one string:  entries, labels, icons, what needs Owen. */
function railKey(outline, counts) {
  return JSON.stringify(outline.groups.map(entry))

  /** One top-level entry:  its id, label, icon and state, and how many of its items need Owen (and how). */
  function entry(node) {
    const count = counts.get(node.element)
    return [node.id, node.label, node.glyph, node.element.dataset.state, count?.attention ?? 0, count?.replied ?? 0]
  }
}

/** Color the code blocks in `elements` that aren't yet (`highlight()` colored the rest at load). */
function highlightIn(elements) {
  const hljs = globalThis.hljs
  if (!hljs?.highlightElement) return
  for (const element of elements)
    for (const code of withSelf(element, "pre code"))
      try {
        if (!code.dataset.highlighted) hljs.highlightElement(code)
      } catch {
        // plain monospace is fine
      }
}

////////////////
// ## Outline
////////////////

/**
 * The page's outline, from either markup (see the header):  what the toolbar, the counts, scroll-follow
 * and the anchors work from.
 * - SECTIONS markup (`main > ui-section`, or an epic page's `<epic-page>`):  top-level sections are the groups
 *   - their entries, at any depth:
 *     nested sections, and the h3s / h4s in a section's own content (CHEATSHEET cards, sub-sub-items)
 *   - an h4 right after an h3 of the same section goes under it
 *   - an epic page's sections are its folding blocks
 *     (`EPIC_FOLDS`:  the Overview and its parts, the sections, the phases)
 * - HEADINGS markup:  h2s are the groups, h3s their entries, h4s under the h3 before them
 * - a node:  `{ element, id, label, glyph, children }` -- `glyph` the name of its (first) `<ui-icon>`, for the toolbar
 * - returns `{ sections, groups, orphans, targets, entryOf, groupOf, folded }`:
 *   - `orphans`:  entries before or outside any group
 *   - `targets`:  selector of every entry's element, for scroll-follow
 *   - `entryOf(element)`:  the entry holding `element`, which a jump to it makes current
 *   - `groupOf(entry)`:  its top-level element, for the toolbar
 *   - `folded(element)`:  hidden by a folded section around it (SECTIONS;  HEADINGS hide those with `display`)
 * - SIDE EFFECT:  gives an entry with no `id` a slug of its label (`-2`, `-3` ... when taken)
 */
function outlineOf(main) {
  const sections = !!main.querySelector(":scope > :is(ui-section, epic-page)")
  const groups = []
  const orphans = []
  if (sections) readSections()
  else readHeadings()
  return {
    sections,
    groups,
    orphans,
    targets: sections ? `:is(${SECTIONS}, h3, h4)[id]` : "h2[id], h3[id], h4[id]",
    entryOf,
    groupOf,
    folded
  }

  /**
   * SECTIONS:  every section, h3 and h4 in `main`, under the section it's in.
   * - not the headings in a plan item's earlier versions (`<epic-original>`):  earlier text, not the page's
   */
  function readSections() {
    const nodes = new Map()
    const elements = Array.from(main.querySelectorAll(`${SECTIONS}, h3, h4`)).filter(
      (element) => !element.closest("epic-original")
    )
    for (const element of elements) {
      const node = nodeOf(element)
      nodes.set(element, node)
      const owner = element.parentElement?.closest(SECTIONS)
      const list = owner ? nodes.get(owner).children : element.matches(SECTIONS) ? groups : orphans
      const last = list.at(-1)
      if (element.localName === "h4" && last?.element.localName === "h3") last.children.push(node)
      else list.push(node)
    }
  }

  /** HEADINGS:  h2 / h3 / h4 in document order. */
  function readHeadings() {
    for (const heading of main.querySelectorAll("h2, h3, h4")) {
      const node = nodeOf(heading)
      const group = groups.at(-1)
      if (heading.localName === "h2") groups.push(node)
      else if (heading.localName === "h3") (group?.children ?? orphans).push(node)
      else {
        const parent = group?.children.at(-1)
        if (parent?.element.localName === "h3") parent.children.push(node)
        else (group?.children ?? orphans).push(node)
      }
    }
  }

  /** The entry a jump to `element` makes current:  itself, else its section's (heading's) entry. */
  function entryOf(element) {
    if (sections) return element.closest(`${SECTIONS}, h3, h4`)
    if (/^H[234]$/.test(element.tagName)) return element
    return element.closest("section")?.querySelector(":scope > ui-sticky > :is(h2, h3)") ?? null
  }

  /** The top-level element `entry` is in:  the outermost section, or the h2. */
  function groupOf(entry) {
    if (!sections) return entry.localName === "h2" ? entry : entry.closest("section.s2")?.querySelector("h2")
    let top = null
    for (let section = entry.closest(SECTIONS); section; section = section.parentElement?.closest(SECTIONS))
      top = section
    return top
  }

  /** Is `element` inside a folded section (not counting itself)? */
  function folded(element) {
    if (!sections) return false
    for (let section = element.parentElement?.closest(SECTIONS); section;) {
      if (isCollapsed(section)) return true
      section = section.parentElement?.closest(SECTIONS)
    }
    return false
  }
}

/**
 * An outline node for a heading, a `<ui-section>` or an epic page's block;  gives it an id if it has none.
 * - a block:  what its host says (`contentsEntry`), its id before it has drawn
 */
function nodeOf(element) {
  if (element.matches(EPIC_FOLDS)) {
    const entry = element.contentsEntry
    return { element, id: element.id, label: entry?.label ?? element.id, glyph: entry?.icon, children: [] }
  }
  const section = element.localName === "ui-section"
  const label = section ? sectionLabel(element) : labelOf(element)
  if (!element.id) element.id = uniqueId(slug(label) || "section")
  const glyph = section
    ? (element.querySelector(':scope > ui-icon[slot="icon"]')?.getAttribute("name") ?? element.getAttribute("icon"))
    : element.querySelector("ui-icon")?.getAttribute("name")
  return { element, id: element.id, label, glyph: glyph || undefined, children: [] }
}

/**
 * A `<ui-section>`'s label:  its `label` (`header`, its old name), else the text of its `slot="label"` (`"header"`)
 * child.  Spell UI's pages say `label` since spell-app's epic `property-editor` P10.
 */
function sectionLabel(section) {
  const label = (section.getAttribute("label") ?? section.getAttribute("header"))?.trim()
  if (label) return label
  const slotted = section.querySelector(':scope > [slot="label"], :scope > [slot="header"]')
  return slotted ? labelOf(slotted) : ""
}

/** `id`, or `id-2`, `id-3` ... if the page already has it. */
function uniqueId(id) {
  let candidate = id
  for (let n = 2; document.getElementById(candidate); n++) candidate = `${id}-${n}`
  return candidate
}

/**
 * Is `section` folded?  A `<ui-section>`:  its `collapsed` property, else (not upgraded yet) the attribute;
 * an epic page's block (or item):  not `open`, by the property, else the attribute.
 */
function isCollapsed(section) {
  if (section.matches(EPIC_OPENERS))
    return !(typeof section.open === "boolean" ? section.open : section.hasAttribute("open"))
  return typeof section.collapsed === "boolean" ? section.collapsed : section.hasAttribute("collapsed")
}

/**
 * Fold or unfold a section without an event:  `collapsed` (`<ui-section>`) and `open` (an epic page's blocks and
 * items) are controlled, so writing them announces nothing.
 */
function setCollapsed(section, collapsed) {
  if (section.matches(EPIC_OPENERS)) section.toggleAttribute("open", !collapsed)
  else section.toggleAttribute("collapsed", collapsed)
}

/**
 * The shadow title bar of a `<ui-section>` (its public `title` part), once it has rendered;  an epic page's block's:
 * the one of the `<ui-section>` it draws in its own shadow root.
 */
function titleOf(section) {
  const inner = section.matches(EPIC_FOLDS) ? section.shadowRoot?.querySelector("ui-section") : section
  return inner?.shadowRoot?.querySelector('[part~="title"]') ?? null
}

////////////////
// ## Text
////////////////

/** A heading's label:  its text without badges, whitespace collapsed. */
function labelOf(heading) {
  const clone = heading.cloneNode(true)
  for (const badge of clone.querySelectorAll(".tag, ui-label")) badge.remove()
  return clone.textContent.replace(/\s+/g, " ").trim()
}

/** Slug for a heading id. */
function slug(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
}

////////////////
// ## Counts
////////////////

/**
 * Item statuses that DON'T count as open:  finished (`done`), made moot (`canceled`), and a plan's answered
 * questions (`decided`) -- in "Questions" only the questions waiting on the reader are open.
 * - `$/epics/tool/planDoc.types` `CLOSED` is the same set
 */
const CLOSED = new Set(["done", "decided", "canceled"])

/**
 * An epic page's block's items that need Owen, when its `contentsEntry` count doesn't say:
 * its own items (`COUNTED` in `$/epics`' `EpicSection.types.ts`) the `epic` tool marked
 * - `attention` (red)
 * - or `replied` (orange:  Claude answered with options, Owen's turn to pick;  `EpicItem.types.ts` `NEEDS_OWEN`).
 */
const EPIC_ATTENTION =
  ':scope > epic-item:is([state="attention"], [state="replied"]), :scope > epic-phase[state="attention"]'

/**
 * Of those, the ones Claude answered with options, waiting on Owen's pick (`replied`, orange):  the plan-doc toolbar
 * shows them apart from the urgent ones (red;  `buildToolbar()`).
 */
const EPIC_REPLIED = ':scope > :is(epic-item, epic-phase)[state="replied"]'

/** A count pill's tooltip:  "2 need you", "1 needs you". */
function needYou({ attention }) {
  return `${attention} ${attention === 1 ? "needs" : "need"} you`
}

/**
 * Each top-level section's items -- `[data-status]` elements, not counting ones inside another --
 * as `{ open, total, attention }`, by the group's element (the `<ui-section>`, or the h2).
 * - "open":  any status but `CLOSED`'s
 * - "attention":  the items that need Owen (`stateOf()`:  the toolbar's red badge, Q20 of epic `epic-components`)
 * - sections without items are left out;  nested sections get no count of their own
 * - the Epics index's epic cards, the saga pages' items
 * - an epic page's sections count themselves (`<epic-section>`, on their titles):  their count is read from their
 *   hosts' `contentsEntry`, never written;
 *   its `attention` too, else the items' `state="attention"` (`EPIC_ATTENTION`);
 *   and `replied`, how many of those wait on Owen's pick (`EPIC_REPLIED`:  the toolbar's orange badge)
 * - SIDE EFFECT:  writes `open/total` on the section's title:  its `badge` (SECTIONS), or a `ui-label.spell-count`
 *   at the right of the h2 (HEADINGS);  callable again (it replaces both)
 */
function countItems(outline) {
  const counts = new Map()
  for (const { element } of outline.groups) {
    if (element.matches(EPIC_FOLDS)) {
      const count = element.contentsEntry?.count
      if (count) {
        const attention = count.attention ?? element.querySelectorAll(EPIC_ATTENTION).length
        const replied = Math.min(attention, element.querySelectorAll(EPIC_REPLIED).length)
        counts.set(element, { ...count, attention, replied })
      }
      continue
    }
    const section = outline.sections ? element : headingSection(element)
    if (!section) continue
    const items = Array.from(section.querySelectorAll("[data-status]")).filter((item) => outermost(item, section))
    if (!items.length) continue
    const open = items.filter((item) => !CLOSED.has(item.dataset.status)).length
    const attention = items.filter((item) => stateOf(item) === "attention").length
    counts.set(element, { open, total: items.length, attention })
    if (outline.sections) {
      element.setAttribute("badge", `${open}/${items.length}`)
      continue
    }
    element.querySelector(":scope > ui-label.spell-count")?.remove()
    const label = document.createElement("ui-label")
    label.className = "spell-count"
    label.setAttribute("size", "tiny")
    label.setAttribute("basic", "")
    label.title = `${open} open of ${items.length}`
    label.textContent = `${open}/${items.length}`
    element.append(label)
  }
  return counts
}

/** The `section.s2` an h2 heads (`section > ui-sticky.spell-h2 > h2`), else null. */
function headingSection(h2) {
  const sticky = h2.parentElement
  return sticky?.matches("section > ui-sticky.spell-h2") ? sticky.parentElement : null
}

/** Is `item` the outermost `[data-status]` within `section` (not an item's part)? */
function outermost(item, section) {
  const outer = item.parentElement?.closest("[data-status]")
  return !outer || !section.contains(outer)
}

////////////////
// ## Item states and filter
////////////////

/**
 * Where an item stands, in the colours Owen reads at a glance:  `[state, tooltip words]` (an id chip's tooltip,
 * `stateTip()`;  the filter's chips are `<epic-state-filter>`'s, in its order, `FILTER_STATES`).
 * - the colour scheme (Q20 of epic `epic-components`, 2026-10-08;  `templates/epics/plan-doc.md`, "Colours"):
 *   attention red, progress blue (Claude is working on it), open yellow, recent green, old grey;
 *   `spell-doc.css`'s `--spell-state-*` tokens
 * - for the Epics index's epic cards (`.spell-epics`) and the saga pages' items (`.plan-items`, coloured by
 *   `goals.css`);  an epic page's items colour and filter themselves (`<epic-item>`, `<epic-section>`)
 * - `data-state` when the page writes one;  else from the status (`stateOf()`)
 */
const ITEM_STATES = [
  ["attention", "needs you"],
  ["progress", "Claude is working on it"],
  ["open", "open, still undecided"],
  ["recent", "decided or done"],
  ["old", "no longer relevant"]
]

/**
 * A closed item's state, by its status:  decided or done stay `recent` (green) however old;  only `canceled` is `old`
 * (grey:  no longer relevant).  Owen, 2026-10-08;  `$/epics` `PlanReader.itemState()`, the same rule.
 */
const CLOSED_STATES = { done: "recent", decided: "recent", canceled: "old" }

/** The state names, for checking a `data-state`. */
const STATE_NAMES = new Set(ITEM_STATES.map(([state]) => state))

/** The saga pages' items, and the index's epic cards:  what states and the filter apply to. */
const STATE_ITEMS = ":is(.plan-items, .spell-epics) > [data-status]"

/** The saga pages' items that wait on Owen while open:  their questions (`/goals` talks them through with him). */
const ASKS_OWEN = '.plan-items[data-kind="question"] > *'

/**
 * An item's state:  its `data-state`, else (the index's epic cards, the saga pages' items) from its status:
 * `done` / `decided` are `recent`, `canceled` `old` (`CLOSED_STATES`);  an open goals question (`ASKS_OWEN`)
 * `attention`;  anything else `open`.
 */
function stateOf(item) {
  const state = item.dataset.state
  if (STATE_NAMES.has(state)) return state
  if (CLOSED.has(item.dataset.status)) return CLOSED_STATES[item.dataset.status]
  return item.matches(ASKS_OWEN) ? "attention" : "open"
}

/**
 * An item's id chip's tooltip:  where it stands in words, then its review marks (Owen, 2026-10-04), e.g.
 * "Needs your attention · not reviewed yet", "Decided or reviewed recently · reviewed 2026-10-03".
 */
function stateTip(item) {
  const words = ITEM_STATES.find(([state]) => state === item.dataset.spellState)?.[1] ?? ""
  const parts = [words.charAt(0).toUpperCase() + words.slice(1)]
  const { reviewed, deferred, queued, work, status } = item.dataset
  if (queued) parts.push(`to do:  ${work || "queued"}`)
  if (reviewed) parts.push(`reviewed ${reviewed}`)
  else if (deferred) parts.push(`deferred ${deferred}`)
  else if (status === "open") parts.push("not reviewed yet")
  return parts.join(" · ")
}

/**
 * Mark every item's state as `data-spell-state` (`stateOf()`), so CSS has ONE attribute to color by;
 * an item's id chip (`.plan-id`, the saga pages') says it in words.
 * - SIDE EFFECT:  sets `data-spell-state`;
 *   callable again (a page updated in place:  a replaced item comes back without it)
 */
function markItemStates(main) {
  for (const item of main.querySelectorAll(STATE_ITEMS)) {
    item.dataset.spellState = stateOf(item)
    const chip = item.querySelector(".plan-id")
    if (chip) chip.title = stateTip(item)
  }
}

/**
 * The status filter on every top-level `<ui-section>` with a filterable list
 * (the index's `.spell-epics`, a `.plan-items` list, each holding `[data-status]` children):
 * - its chips are the epics pack's, `<epic-state-filter>` (epic `epic-engine` P3:  the ONE chip element, an epic page's
 *   too):  a chip per state the section has items in, in its colour, with how many (Owen, 2026-10-10:  no filter
 *   icon);  SOLID while its items show, OUTLINED while hidden
 * - a click (`epic-state-pick`), by the one rule (`StateFilter.nextShown()`, in the element):  everything showing, only
 *   that state;  else a hidden state shows too and a shown one hides;  the only one showing, everything again
 * - in the title's `actions` slot (`.spell-item-filter`);  `spell-doc.css` puts it left of the count badge
 * - a filtered list shows "3 hidden · show all" under it (`<epic-hidden-note class="spell-hidden-note">`):  a click
 *   there (`epic-show-all`) shows all
 * - the choice:  `data-show="<states shown>"` on the section (none for all), `data-spell-hidden` on the items it
 *   hides (CSS hides them);  remembered per page (`localStorage`, `{ [section id]: [states] }`);  all by default
 * - an epic page's sections filter themselves (`<epic-section>`), with the same element
 * - SIDE EFFECT:  marks the items' states (`markItemStates()`), adds the chips and notes to the page;
 *   callable again (it replaces the ones it added)
 */
function wireItemFilters(main) {
  const key = `${ITEM_FILTER_KEY_PREFIX}${location.pathname}`
  const saved = readJSON(key)
  for (const old of main.querySelectorAll(":scope > ui-section > .spell-item-filter, .spell-hidden-note")) old.remove()
  markItemStates(main)
  for (const section of main.querySelectorAll(":scope > ui-section[id]")) {
    const lists = Array.from(section.querySelectorAll(".plan-items, .spell-epics")).filter((list) =>
      list.querySelector(":scope > [data-status]")
    )
    if (!lists.length) continue
    const counts = new Map()
    for (const item of lists.flatMap(itemsOf))
      counts.set(item.dataset.spellState, (counts.get(item.dataset.spellState) ?? 0) + 1)
    const states = [...counts.keys()]
    const chips = el("epic-state-filter", {
      class: "spell-item-filter",
      slot: "actions",
      counts: [...counts].map(([state, count]) => `${state}:${count}`).join(" "),
      "data-spell-added": true
    })
    chips.addEventListener("epic-state-pick", (event) => choose(event.detail.shown))
    const notes = lists.map((list) => {
      const note = el("epic-hidden-note", { class: "spell-hidden-note", hidden: true, "data-spell-added": true })
      note.addEventListener("epic-show-all", () => choose(states))
      list.after(note)
      return note
    })
    section.append(chips)
    const filter = { section, lists, notes, chips, states }
    const remembered = Array.isArray(saved[section.id]) ? saved[section.id].filter((state) => counts.has(state)) : []
    showItems(filter, remembered.length ? remembered : states)

    /** The reader picked the states `shown`:  apply them and remember. */
    function choose(shown) {
      showItems(filter, shown)
      saved[section.id] = shown
      writeJSON(key, saved)
    }
  }
}

/**
 * Show the items of the states `shown` in a filter's section (`{ section, lists, notes, chips, states }`):  its chips
 * say which (`shown`, none while every state shows);  an "N hidden" note under each list that hides any.
 */
function showItems({ section, lists, notes, chips, states }, shown) {
  const showing = new Set(shown)
  const everything = states.every((state) => showing.has(state))
  if (everything) {
    delete section.dataset.show
    chips.removeAttribute("shown")
  } else {
    section.dataset.show = [...showing].join(" ")
    chips.setAttribute("shown", section.dataset.show)
  }
  lists.forEach((list, index) => {
    let hidden = 0
    for (const item of itemsOf(list)) {
      const hide = !showing.has(item.dataset.spellState)
      item.toggleAttribute("data-spell-hidden", hide)
      if (hide) hidden++
    }
    notes[index].hidden = hidden === 0
    notes[index].setAttribute("count", String(hidden))
  })
}

/** A filterable list's items:  its `[data-status]` children. */
function itemsOf(list) {
  return Array.from(list.querySelectorAll(":scope > [data-status]"))
}

////////////////
// ## Toolbar
////////////////

/**
 * The page's navigation:  an epic page's toolbar (`buildToolbar()`), else the page toolbar (`buildPageToolbar()`).
 * - both the SAME element, Spell UI's menu (`toolbarMenu()`):  a guide's and an epic page's band look and behave alike
 * - returns the menu, whose `[data-rail]` items scroll-follow marks `selected`;  none without top-level sections
 * - `data-rail`:  the name the floating rail gave them (gone since epic `airplane` P8);  kept, as scroll-follow,
 *   a details page's `<epic-ask>` and `check-spell.js` read it
 */
function buildNavigation(main, outline, counts) {
  const page = document.body.classList.contains("plan-doc") ? main.querySelector("epic-page") : null
  return page ? buildToolbar(page, outline, counts) : buildPageToolbar(main, outline, counts)
}

/**
 * Every other page's navigation (Owen, 2026-10-10:  "Make the floating sidebar in guides a sticky top toolbar like the
 * epic page.  Have section titles in this one"):  a row of buttons, one per top-level section, in the sticky page
 * header, in place of the floating rail.
 * - each:  the section's mark and its title, a link to it (`wireAnchors()` lands it);  scroll-follow marks the current
 *   one `selected`, by `data-rail`
 *   - the mark:  an item's number, an icon, a number or a letter (`titledItems()`, `spell-doc-toolbar.js`, which Epic
 *     UI's pages build theirs with too)
 *   - a red badge:  how many of its items need Owen (`counts`, `attention`);  none, none
 * - titles too long for the row end in `...`;  when each would get under 50px, they go, and the buttons show their
 *   marks only, the title as their tooltip (`fitTitles()`);  still too wide, the row scrolls sideways
 * - where:  the last row of the sticky page header (`ui-sticky.spell-h1 > header.spell-page-head`), so it sticks with
 *   it and the titles stick below it;  a page without one (the saga pages, a cheat sheet):  the last row of its
 *   filter bar (`.spell-filter`), else a sticky bar of its own before the first section (`.spell-toolbar-alone`,
 *   measured as the filter bar is:  `trackStickyHeights()`)
 * - HEADINGS (the saga pages):  only the h2s that head a sticky section
 * - callable again (a page updated in place):  replaces the toolbar it built before
 * - SIDE EFFECT:  adds the menu inside `main`, marked `data-spell-added` so the live patch steps around it;
 *   removes a hand-written `.spell-toc-open` (pages before 2026-10-01 had a "Contents" button)
 */
function buildPageToolbar(main, outline, counts) {
  const groups = outline.sections ? outline.groups : outline.groups.filter((group) => headingSection(group.element))
  const items = titledItems(groups, (element) => {
    const count = counts.get(element)
    return count?.attention ? [["urgent", count.attention, needYou(count)]] : []
  })
  if (!items.length) {
    removeToolbar()
    return undefined
  }
  const toolbar = toolbarMenu(items, { titled: true })
  const head =
    main.querySelector(":scope > ui-sticky.spell-h1 > .spell-page-head") ?? main.querySelector(".spell-filter")
  if (head) head.append(toolbar)
  else {
    toolbar.classList.add("spell-toolbar-alone")
    const first = groups[0].element
    ;(outline.sections ? first : (headingSection(first) ?? first)).before(toolbar)
  }
  // fitted again as the window changes width, as the items draw and the fonts load
  keepFitted(toolbar)
  return toolbar
}

/**
 * An EPIC PAGE's navigation (epic `airplane` P8, Owen 2026-10-10:  "The contents sidebar on the epic page should be a
 * sticky top toolbar instead"):  a row of buttons across the bottom of `<epic-page>`'s sticky header, one per
 * top-level block (Overview, Phases, Questions ... Log), in place of the floating rail it had before.
 * - each:  the block's icon, a link to it (`wireAnchors()` lands it);  its title without its number (`Questions`)
 *   only as its tooltip and name (Owen, 2026-10-10:  "lose the titles ... when I click on the thing it goes to that
 *   section anyway");  scroll-follow marks the current one `selected`, by `data-rail` (as the rail's)
 * - BADGES:  how many of the block's items wait on Owen, from `counts` (none:  no badge)
 *   - red:  urgent (`state="attention"`)
 *   - orange:  Claude answered with options, his turn to pick (`state="replied"`)
 *   - both kinds:  both badges, red first
 *   - over the icon's top right, a third of a badge on the icon (Owen, 2026-10-10:  "Make badge 1/3 way overlap the
 *     icon"):  every button is the same width, badge or not
 * - in the header's `toolbar` slot (`<epic-page>`'s):  it sticks with the header, and the header's measured height,
 *   where every title below sticks (`--epic-stack`), takes it in;  `<epic-page>` draws the rest of that row at its
 *   right (the page's state filter, collapse-all, the new item button)
 * - a window too narrow for every button:  the row scrolls sideways (`spell-toolbar.css`), the current button
 *   scrolled into view
 * - callable again (a page updated in place):  replaces the toolbar built before
 * - SIDE EFFECT:  appends the menu to `page`, marked `data-spell-added` so the live patch steps around it
 */
function buildToolbar(page, outline, counts) {
  const items = outline.groups.map(({ element, id, label, glyph }) => {
    const count = counts.get(element)
    const replied = count?.replied ?? 0
    const urgent = (count?.attention ?? 0) - replied
    const name = shortLabel(label)
    const waits = replied === 1 ? "waits" : "wait"
    return toolbarItem({
      id,
      tip: name,
      glyph,
      // no icon:  the label's first letter stands in
      mark: glyph ? undefined : el("b", { slot: "icon" }, name.charAt(0)),
      badges: [
        ["urgent", urgent, `${urgent} urgent`],
        ["replied", replied, `${replied} replied:  ${waits} for your pick`]
      ].filter(([, number]) => number > 0)
    })
  })
  if (!items.length) {
    removeToolbar()
    return undefined
  }
  const toolbar = toolbarMenu(items, { titled: false })
  toolbar.slot = "toolbar"
  page.append(toolbar)
  return toolbar
}

// the menu itself, its items, fitting their titles and the jump key:  `spell-doc-toolbar.js`, which Epic UI's pages
// load too (epic `epic-engine` T11)

////////////////
// ## Folding
////////////////

/**
 * Every section folds, and the reader's folds are remembered per page (`localStorage`, `{ [id]: folded }`).
 * - SECTIONS:  `<ui-section collapsible>` folds itself;
 *   this restores the saved folds (else the markup's `collapsed` stands)
 *   and saves the reader's toggles (`ui-open` / `ui-close`)
 *   - an EPIC PAGE (`body.plan-doc`):  every section and sub-section not in the saved folds starts FOLDED,
 *     whatever its markup says:  Owen opens what he wants to read (2026-10-03)
 *     - a link to an id inside still lands (`reveal()` unfolds around it)
 *     - its `<epic-*>` blocks start folded by themselves;
 *       the ones the reader left open open again (`restoreEpicFolds()`, before they draw),
 *       and their toggles are saved as a section's
 * - HEADINGS:  a chevron button starts each h2 / h3,
 *   and a click anywhere on the heading (not on a link or button in it) toggles it too;
 *   folded:  `section.spell-folded`, all but the heading hidden by CSS.
 *   Starts folded as saved, else when the section says `data-fold="closed"`.
 * - `reveal()` unfolding for a link is never saved
 * - returns `{ reveal(element) }`:  unfold every section hiding `element` (an epic page's blocks and items too),
 *   and open its own panel, or itself if it's a folded plan item;
 *   true when it unfolded something (it draws a little later)
 *   - a `<ui-section>` unfolds WITHOUT its height animation (`--ui-section-duration: 0s` on `main` for a few frames):
 *     the jump measures the target once it has drawn,
 *     and a growing box would move it (scroll anchoring) after the page has landed
 * - `kept`:  the folds a live reload puts back (`takeKeptFolds()`), over the saved ones and the markup's
 * - callable again (a page updated in place):  drops the listeners of the call before (`foldWiring`);
 *   a heading that has its chevron keeps it
 */
function wireFolds(main, outline, kept) {
  foldWiring?.abort()
  foldWiring = new AbortController()
  const { signal } = foldWiring
  const key = `${FOLD_KEY_PREFIX}${location.pathname}`
  const saved = readJSON(key)
  if (outline.sections) wireSectionFolds()
  else wireHeadingFolds()
  return { reveal }

  /** SECTIONS:  restore the saved folds (an epic page:  the rest start folded), save the reader's. */
  function wireSectionFolds() {
    const startFolded = document.body.classList.contains("plan-doc")
    for (const section of main.querySelectorAll("ui-section[collapsible][id]"))
      if (kept && section.id in kept) setCollapsed(section, !kept[section.id])
      else if (section.id in saved) setCollapsed(section, !!saved[section.id])
      else if (startFolded) setCollapsed(section, true)
    main.addEventListener("ui-open", onToggle, { signal })
    main.addEventListener("ui-close", onToggle, { signal })
    main.addEventListener("ui-close", holdWhileFolding, { signal })
  }

  /**
   * Any fold closing (a section, an epic page's Overview part, phase or item):  its header stays where it is on screen
   * while the content folds away under it.
   * - why:  the browser's scroll anchoring kept something BELOW the fold in place instead, so the clicked header slid
   *   down hundreds of pixels as its body shrank, then wobbled (Owen, 2026-10-10:  "the 1.1 sections bounce when
   *   closed";  measured:  the header moved 336 -> 692px)
   * - anchoring is off for the page while it folds;  each frame, the header is put back where it was
   * - starts after the toggle's own handlers (a microtask):  `keepTitlePut()` / an item's `keepLinePut()` may first
   *   scroll a STUCK title into place, and that's the place kept
   * - near the end of a short page (everything else folded), the page would get shorter than where it's scrolled to,
   *   and the browser pulls it back:  the header jumps down.  So the page keeps its height (`min-height`) until the
   *   reader scrolls back far enough for the shorter page to hold him
   * - stops after `FOLD_HOLD_MS`, or at once when the reader scrolls
   * - ONLY a fold's `ui-close` (a section, an epic block, an accordion):  a `<ui-popup>` sends a cancelable `ui-close`
   *   as it hides, and a hidden popup's top is 0, so holding it scrolled the page to the top (epic `epic-engine` r5)
   */
  function holdWhileFolding(event) {
    if (event.defaultPrevented || !event.cancelable || !(event.target instanceof Element)) return
    const element = event.target
    if (!element.matches(FOLDING) || !element.getClientRects().length) return
    queueMicrotask(() => {
      const root = document.documentElement
      const before = element.getBoundingClientRect().top
      const until = performance.now() + FOLD_HOLD_MS
      let stopped = false
      const stop = () => (stopped = true)
      addEventListener("wheel", stop, { once: true, passive: true })
      addEventListener("touchmove", stop, { once: true, passive: true })
      root.style.overflowAnchor = "none"
      root.style.minHeight = `${root.scrollHeight}px`
      const hold = () => {
        const off = element.getBoundingClientRect().top - before
        if (!stopped && Math.abs(off) >= 1) scrollTo({ top: scrollY + off, behavior: "instant" })
        if (!stopped && performance.now() < until) return requestAnimationFrame(hold)
        root.style.overflowAnchor = ""
        removeEventListener("wheel", stop)
        removeEventListener("touchmove", stop)
        releaseHeight(root)
      }
      requestAnimationFrame(hold)
    })
  }

  /**
   * Let the page take its natural height again once that no longer pulls the reader back:  at once if it fits where
   * he's scrolled to, else as soon as he scrolls up far enough.
   * - the held height only ever shrinks to the window's bottom (`scrollY + clientHeight`), never below:
   *   the page is then exactly as tall as it must be to stay where it's scrolled;
   *   if it's still taller than that, the content is, and the hold can go
   * - NEVER measures the natural height by taking the hold off for a moment:  that layout alone makes the browser
   *   clamp the scroll to the shorter page, and the reader dropped by however much shorter it was (I7 of `airplane`:
   *   the line of an item a link had landed near the page's end fell 20-80px when the hold ended)
   */
  function releaseHeight(root) {
    const release = () => {
      const bottom = scrollY + root.clientHeight
      if (bottom < parseFloat(root.style.minHeight)) root.style.minHeight = `${bottom}px`
      if (root.scrollHeight <= bottom + 1) return false
      root.style.minHeight = ""
      removeEventListener("scroll", release)
      return true
    }
    if (!release()) addEventListener("scroll", release, { passive: true })
  }

  /**
   * The reader folded or unfolded a section (accordions' `ui-open` / `ui-close` bubble here too:  not ours).
   * - a `ui-open` that can't be cancelled is the BROWSER's reveal (find-in-page, a `#hash` load):
   *   not saved, as a link's unfold isn't
   */
  function onToggle(event) {
    const section = event.target
    if (event.defaultPrevented || !event.cancelable || !section.matches?.(SECTIONS) || !section.id) return
    saved[section.id] = !event.detail?.open
    writeJSON(key, saved)
    if (!event.detail?.open) keepTitlePut(section)
  }

  /**
   * Folding a section the reader is INSIDE (its title stuck, its top scrolled past):  scroll at once so the title
   * stays where it's stuck, and the content folds away below it.
   * - why:  else the title drops back to the section's top, far above, and the page slides up after the
   *   shrinking content (Owen's "bounce", 2026-10-04)
   */
  function keepTitlePut(section) {
    const title = titleOf(section)
    if (!title) return
    const stuckAt = title.getBoundingClientRect().top
    const top = section.getBoundingClientRect().top
    if (top >= stuckAt - 1) return
    scrollTo({ top: scrollY + top - stuckAt, behavior: "instant" })
  }

  /** HEADINGS:  a chevron on every h2 / h3 of a sticky section. */
  function wireHeadingFolds() {
    for (const sticky of main.querySelectorAll("section > ui-sticky:is(.spell-h2, .spell-h3)")) {
      const heading = sticky.firstElementChild
      if (!heading?.id || heading.querySelector(":scope > ui-button.spell-fold")) continue
      const section = sticky.parentElement
      const button = document.createElement("ui-button")
      button.className = "spell-fold"
      // its tooltip the browser's own, on the button the pointer lands on ("TOOLTIPS";  a `<ui-popup>` before I32)
      const tip = "Fold / unfold"
      const attributes = { circular: "", basic: "", size: "mini", icon: "chevron down", title: tip, "aria-label": tip }
      for (const [name, value] of Object.entries(attributes)) button.setAttribute(name, value)
      titleInside(button)
      heading.prepend(button)
      heading.classList.add("spell-foldable")
      if (kept && heading.id in kept) setFolded(section, !kept[heading.id])
      else setFolded(section, heading.id in saved ? !!saved[heading.id] : section.dataset.fold === "closed")
      heading.addEventListener("click", (event) => {
        // the chevron's own `<button>` (in its shadow root) comes first in the path:  look for the HOST
        const path = event.composedPath()
        if (!path.includes(button)) {
          const before = path.slice(0, Math.max(0, path.indexOf(heading)))
          if (before.some((node) => node instanceof Element && node.matches("a, ui-button, button"))) return
        }
        event.preventDefault()
        const folded = !section.classList.contains("spell-folded")
        setFolded(section, folded)
        saved[heading.id] = folded
        writeJSON(key, saved)
      })
    }
  }

  /**
   * Unfold every section around `element`;  open `element`'s own folded panel.
   * - `self: false`:  only what's AROUND it -- a folded section, or an item's closed panel, stays as it is
   */
  function reveal(element, { self = true } = {}) {
    let unfolded = false
    if (outline.sections) {
      const folds = `ui-section, ${EPIC_OPENERS}`
      for (
        let section = self ? element.closest(folds) : element.parentElement?.closest(folds);
        section;
        section = section.parentElement?.closest(folds)
      ) {
        if (!isCollapsed(section)) continue
        if (!unfolded) main.style.setProperty("--ui-section-duration", "0s")
        setCollapsed(section, false)
        unfolded = true
      }
      if (unfolded) void nextFrames(UNFOLD_FRAMES + 1).then(() => main.style.removeProperty("--ui-section-duration"))
    } else {
      for (
        let section = element.closest("section.spell-folded");
        section;
        section = section.parentElement?.closest("section.spell-folded")
      )
        setFolded(section, false)
    }
    const panel = self ? element.querySelector(":scope > ui-accordion > ui-title") : null
    if (panel && !isPanelOpen(panel)) setPanel(panel, true)
    // an id INSIDE a closed panel (an old decision's `#d7`, now the answer card in its question):
    // open the panels around it, or the jump lands on nothing
    for (
      let content = element.closest("ui-accordion > ui-content");
      content;
      content = content.parentElement.parentElement?.closest("ui-accordion > ui-content")
    ) {
      const accordion = content.parentElement
      const contents = Array.from(accordion.children).filter((child) => child.localName === "ui-content")
      const title = titlesOf(accordion)[contents.indexOf(content)]
      if (!title || isPanelOpen(title)) continue
      setPanel(title, true)
      unfolded = true
    }
    return unfolded
  }
}

/**
 * An epic page's blocks the reader left open on this page (saved folds, `spell-folds:<path>`):
 * open again, before they first draw (their `open` attribute), so nothing animates;
 * the rest start folded, as the blocks do.
 * - `kept`:  after a live reload, every block AND item open before it (`takeKeptFolds()`), whoever opened it
 */
function restoreEpicFolds(main, kept) {
  const saved = readJSON(`${FOLD_KEY_PREFIX}${location.pathname}`)
  for (const block of main.querySelectorAll(kept ? EPIC_OPENERS : EPIC_FOLDS)) {
    if (!block.id) continue
    if (kept && block.id in kept) block.toggleAttribute("open", kept[block.id])
    else if (saved[block.id] === false) block.setAttribute("open", "")
  }
}

/**
 * Keep every fold as it is as the page goes (`pagehide`), for a LIVE reload to put back (`takeKeptFolds()`):
 * `{ [id]: open }` in `sessionStorage`, of every section, folding heading, epic page block and ITEM with an id.
 * - why:  the saved folds (`spell-folds:<path>`) hold only what the reader folded or unfolded himself, never an
 *   item nor what a link opened;  a reload for new code must come back as he left it (I23 of `epic-engine`)
 * - written on every `pagehide`;  read only after a live reload:  a reload the reader asks for starts from the saved
 *   folds, as before
 */
function keepFoldsForReload(main) {
  addEventListener("pagehide", () => {
    const folds = {}
    for (const block of main.querySelectorAll(`ui-section[collapsible][id], ${EPIC_OPENERS}`))
      if (block.id) folds[block.id] = !isCollapsed(block)
    for (const heading of main.querySelectorAll(".spell-foldable[id]"))
      folds[heading.id] = !heading.parentElement.parentElement.classList.contains("spell-folded")
    try {
      sessionStorage.setItem(`${KEPT_FOLDS_KEY_PREFIX}${location.pathname}`, JSON.stringify(folds))
    } catch {
      // storage blocked:  a live reload starts from the saved folds
    }
  })
}

/**
 * The folds `keepFoldsForReload()` kept as the page last went, when this load is a LIVE reload (`live`);
 * else `undefined`.  Forgets them either way.
 */
function takeKeptFolds(live) {
  const key = `${KEPT_FOLDS_KEY_PREFIX}${location.pathname}`
  try {
    const kept = live ? JSON.parse(sessionStorage.getItem(key) ?? "null") : null
    sessionStorage.removeItem(key)
    return kept ?? undefined
  } catch {
    return undefined
  }
}

/**
 * HEADINGS:  fold or unfold `section`:
 * its class, its chevron (down / right) and the chevron's state for screen readers.
 */
function setFolded(section, folded) {
  section.classList.toggle("spell-folded", folded)
  const button = section.querySelector(":scope > ui-sticky > * > ui-button.spell-fold")
  if (!button) return
  button.setAttribute("icon", folded ? "chevron right" : "chevron down")
  button.setAttribute("aria-label", folded ? "Unfold section" : "Fold section")
  button.setAttribute("aria-expanded", String(!folded))
}

////////////////
// ## Sticky headers
////////////////

/** `trackStickyHeights()`'s current observer:  disconnected when it runs again. */
let stickyObserver

/**
 * Where each sticky title sticks:  below the fixed site header (`siteHeaderHeight()`), then whatever sticks above
 * every section -- the page header (`ui-sticky.spell-h1`) and the CHEATSHEET's filter bar (`.spell-filter`), whose
 * heights are `--spell-top` on `main`.
 * - SECTIONS:  sets each top-level `<ui-section>`'s `offset`;  nested ones stack themselves below their parents'.
 *   Writes `--spell-section-top` (where its title sticks) and `--spell-stack` (the bottom of its stack of stuck
 *   titles) on every section, which `scroll-margin-top` reads (`spell-doc.css`):  a section lands at its sticky
 *   line, anything in it below its stack.
 * - HEADINGS:  h2s below the bar, h3s just below their section's h2;  sets each sticky's `offset`, and
 *   `--spell-h2-h` / `--spell-h3-h` on the sections, which the headings' `scroll-margin-top` reads
 * - also sticks the page header just below the site header (its `offset`), and writes
 *   the page header's height as `--spell-head-h` on `main` (the filter bar sticks below it)
 * - NOTE: the `offset`s are from the VIEWPORT top, so they include the site header;  the CSS variables (and so
 *   every `scroll-margin-top`) leave it OUT, as the browser adds it (see "Landing" in the header)
 * - re-measured whenever a title changes size (fonts loading, the window narrowing and titles wrapping)
 * - returns `{ measure, offsetFor }`:  `offsetFor(target)` is how far below the viewport top it should land
 * - callable again (a page updated in place):  disconnects the previous call's observer (`stickyObserver`)
 */
function trackStickyHeights(main, outline) {
  const head = main.querySelector(":scope > ui-sticky.spell-h1")
  // the filter bar, or a page toolbar sticking by itself (`buildPageToolbar()`):  never both
  const bar = main.querySelector(".spell-filter, nav.spell-toolbar-alone")
  const h2Stickies = outline.sections ? [] : Array.from(main.querySelectorAll("ui-sticky.spell-h2"))
  const h3Stickies = outline.sections ? [] : Array.from(main.querySelectorAll("ui-sticky.spell-h3"))
  const sections = outline.sections ? Array.from(main.querySelectorAll("ui-section")) : []
  // called again after an in-place update:  the previous call's observer stops first
  stickyObserver?.disconnect()
  const observer = new ResizeObserver(() => measure())
  stickyObserver = observer
  for (const sticky of [head, ...h2Stickies, ...h3Stickies]) {
    const heading = sticky?.firstElementChild
    if (heading) observer.observe(heading)
  }
  if (bar) observer.observe(bar)
  measure()
  return { measure, offsetFor }

  /** The site header and what sticks above the sections;  then each section's (heading's) sticky line. */
  function measure() {
    const header = siteHeaderHeight()
    const headHeight = head ? heightOf(head) : 0
    const top = Math.round(headHeight + (bar ? bar.getBoundingClientRect().height : 0))
    setPixels(main, "--spell-head-h", headHeight)
    setPixels(main, "--spell-top", top)
    if (head) setOffset(head, header)
    if (outline.sections) measureSections(header, top)
    else measureHeadings(header, top)
  }

  /**
   * SECTIONS:  top-level `offset`s, and each section's sticky line and stack bottom, parents first.
   * - `header`:  the site header's height;  `top`:  what sticks below it, above every section
   */
  function measureSections(header, top) {
    const bottoms = new Map()
    for (const section of sections) {
      const parent = section.parentElement?.closest("ui-section")
      const line = parent ? (bottoms.get(parent) ?? top) : top
      const title = titleOf(section)
      // a title renders once UI has loaded:  observe it when it's there (observing twice is a no-op)
      if (title) observer.observe(title)
      const height = title && section.hasAttribute("sticky") ? title.getBoundingClientRect().height : 0
      bottoms.set(section, line + height)
      setPixels(section, "--spell-section-top", line)
      setPixels(section, "--spell-stack", line + height)
      if (!parent) setOffset(section, header + top)
    }
  }

  /** HEADINGS:  the h2 / h3 stickies' `offset`s and heights. */
  function measureHeadings(header, top) {
    for (const sticky of h2Stickies) {
      sticky.parentElement.style.setProperty("--spell-h2-h", `${heightOf(sticky)}px`)
      setOffset(sticky, header + top)
    }
    for (const sticky of h3Stickies) {
      sticky.parentElement.style.setProperty("--spell-h3-h", `${heightOf(sticky)}px`)
      setOffset(sticky, header + top + h2HeightAbove(sticky))
    }
  }

  /** How far below the viewport top a target lands (`landingLine()`). */
  function offsetFor(target) {
    return landingLine(target)
  }
}

/**
 * How far below the viewport top `target` lands, px:
 * - inside an epic page (`<epic-page>`):  where the titles stuck over it end, the `--epic-stack` it inherits (a block's
 *   own title sticks there;  anything else lands `EPIC_LAND_GAP` below), and below its item's line when it's in an
 *   item's details (the line sticks there too)
 * - else:  the site header, then its own `scroll-margin-top` (CSS derives it from the sections)
 */
function landingLine(target) {
  const stack = target.closest("epic-page")
    ? parseFloat(getComputedStyle(target).getPropertyValue("--epic-stack"))
    : NaN
  if (Number.isNaN(stack)) return siteHeaderHeight() + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0)
  if (target.matches(EPIC_OPENERS)) return stack
  const item = target.parentElement?.closest("epic-item")
  const line = item?.shadowRoot?.querySelector('[part~="line"]')
  return stack + EPIC_LAND_GAP + (line ? line.getBoundingClientRect().height : 0)
}

/**
 * Height of the fixed `<spell-site-header>` on top of the page, px:  its `--spell-site-header-height` on `:root`.
 * - 0 when the page has none (or it isn't defined yet):  then everything sticks at the viewport top, as before
 */
function siteHeaderHeight() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--spell-site-header-height")
  return parseFloat(value) || 0
}

/** Write `pixels` as custom property `name` on `element`, unless it's already that. */
function setPixels(element, name, pixels) {
  const value = `${Math.round(pixels * 100) / 100}px`
  if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value)
}

/**
 * A sticky's (top-level section's) `offset`, in whole pixels;
 * re-setting the same value would restart its observer for nothing.
 */
function setOffset(sticky, offset) {
  const text = String(Math.round(offset))
  if (sticky.getAttribute("offset") !== text) sticky.setAttribute("offset", text)
}

/** Height of a sticky's heading (the sticky host is `display: contents`, so measure what it holds). */
function heightOf(sticky) {
  return sticky.firstElementChild?.getBoundingClientRect().height ?? 0
}

/** Height of the h2 whose section holds `sticky`'s section:  where an h3 sticks. */
function h2HeightAbove(sticky) {
  for (let section = sticky.parentElement?.parentElement; section; section = section.parentElement) {
    const h2 = section.querySelector(":scope > ui-sticky.spell-h2")
    if (h2) return heightOf(h2)
  }
  return 0
}

////////////////
// ## Anchors
////////////////

/**
 * Same-page links to anything with an id in `main` (a section, a heading, a plan item) jump there ourselves, and
 * the toolbar follows AT ONCE.
 * - a section lands with its title at its sticky line;  anything else below every stuck title above it (both by
 *   the site header plus their `scroll-margin-top`, "Landing" in the header):  the browser's own jump would add
 *   the stuck titles' scroll padding (they reserve it) on top
 * - HEADINGS:  a STICKY heading's jump goes to its section:  a stuck heading already "is" at the top, so the
 *   browser's own jump to it does nothing -- e.g. the toolbar's entry of the section you're reading
 * - folded sections around the target unfold first, and a target that is a folded item opens (`folds.reveal()`);
 *   an unfolded `<ui-section>` draws on the next frames, so the jump lands once it has, and once more after a fold's
 *   transition (`SETTLE_MS`) unless the reader scrolled meanwhile
 * - the target's entry becomes the current one even when the page can't scroll it up to its line (the last
 *   short sections), until the user scrolls on (`follow.pin()`)
 * - `hashchange` / `popstate` (back, forward, a typed hash) jump the same way
 * - in a frame (VS Code's view), the parent's `{ spell: "go", hash }` too:  the view showing the page it already
 *   shows, at an id (`packages/vscode/src/DocView.ts`);  a history entry, as a click's
 * - a jump that moves the address says so (`spell-doc:place`):  `pushState()` fires no `hashchange`
 * - returns `{ jump, go, canGo }`:
 *   - `jump(id, { unfoldTarget })`:  `unfoldTarget: false` unfolds only what's AROUND a folded target section
 *     (`land()`:  a reload lands on the section being read as it was, folded or not)
 *   - `go(id)`:  as a click on a link to `#id` (a history entry, then the jump), resolving once landed;
 *     `canGo(id)`:  is there one to land on
 */
function wireAnchors(main, outline, sticky, follow, folds) {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    const id = targetIdOf(event)
    if (!id || !(targetIn(id) || hostHolding(main, id))) return
    event.preventDefault()
    go(id)
  })
  addEventListener("popstate", () => jump(hashId()))
  addEventListener("hashchange", () => jump(hashId()))
  if (window.parent !== window) addEventListener("message", onMessage)
  return { jump, go, canGo: (id) => !!(targetIn(id) || hostHolding(main, id)) }

  /**
   * Follow a same-page link to `id`:  a history entry (unless the address is there already), then the jump;  resolves
   * once it has landed (`jump()`).
   */
  function go(id) {
    if (hashId() !== id) {
      history.pushState(null, "", `#${id}`)
      dispatchEvent(new Event("spell-doc:place"))
    }
    return jump(id)
  }

  /** The frame's parent posted `{ spell: "go", hash }`:  go there, as a link to it would. */
  function onMessage(event) {
    const data = event.data
    if (event.source !== window.parent || data?.spell !== "go" || typeof data.hash !== "string") return
    const id = addressedId(decodeHash(data.hash.replace(/^#/, "")))
    if (targetIn(id) || hostHolding(main, id)) go(id)
  }

  /**
   * Scroll to `id` and make its entry the current one;  once what it unfolded has drawn.
   * Returns a promise that settles once it has landed (or found nothing to land on).
   * - `id` inside a body not loaded yet (a split epic page's part:  an Overview `h4`, an old `#d7` answer card):
   *   its host loads the body first (`hostHolding()`, `load()`), then the jump goes on (caveat C8 of `claude-design`)
   */
  function jump(id, { unfoldTarget = true } = {}) {
    const target = targetIn(id)
    if (!target) {
      const host = hostHolding(main, id)
      if (!host?.load) return Promise.resolve()
      return host.load().then(
        () => (targetIn(id) ? jump(id, { unfoldTarget }) : undefined),
        () => undefined
      )
    }
    let landed = NaN
    // what a jump unfolds opens at once, without the fold animation, so the page gets there quickly (Owen,
    // 2026-10-04):  `spell-doc.css` zeroes `--ui-section-duration` under `data-spell-jumping`
    const root = document.documentElement
    root.setAttribute("data-spell-jumping", "")
    const done = folds.reveal(target, { self: unfoldTarget })
      ? nextFrames(UNFOLD_FRAMES).then(land)
      : (land(), undefined)
    setTimeout(() => root.removeAttribute("data-spell-jumping"), SETTLE_MS)
    if (outline.sections) setTimeout(() => Math.abs(scrollY - landed) < 2 && land(), SETTLE_MS)
    return done ?? Promise.resolve()

    /** Scroll to the target, pin its entry. */
    function land() {
      scrollToId(id, sticky)
      const entry = outline.entryOf(target)
      if (entry) follow?.pin(entry)
      landed = scrollY
    }
  }

  /** The `id` a click goes to:  a same-page `#hash` link's. */
  function targetIdOf(event) {
    for (const node of event.composedPath()) {
      if (!(node instanceof Element)) continue
      const href = node.getAttribute("href")
      if (node.localName === "a" && href?.startsWith("#") && href.length > 1)
        return addressedId(decodeURIComponent(href.slice(1)))
    }
    return undefined
  }

  /** The element with `id` in `main`, if any. */
  function targetIn(id) {
    const element = id ? document.getElementById(id) : null
    return element && main.contains(element) ? element : null
  }
}

/**
 * Scroll so `id` sits where its anchor should:  by its own box, the site header and its `scroll-margin-top`
 * (`offsetFor()`);  a HEADINGS sticky heading by its SECTION's box (it can't be measured where it is while stuck).
 * Instant, as the browser's own jump.
 */
function scrollToId(id, sticky) {
  const element = document.getElementById(id)
  if (!element) return
  const stuck = element.parentElement?.localName === "ui-sticky"
  const box = stuck ? element.parentElement.parentElement : element
  const top = topOf(box) + scrollY - sticky.offsetFor(element)
  scrollTo({ top: Math.max(0, top), behavior: "instant" })
}

/**
 * Viewport top of `element`'s box;
 * for a host with no box of its own (`display: contents`, e.g. `<ui-item>`), of what it holds.
 */
function topOf(element) {
  if (element.getClientRects().length) return element.getBoundingClientRect().top
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect().top
}

////////////////
// ## Short addresses
////////////////

/**
 * Links to a SHORT ADDRESS (epic `epic-workflow` P15, J32), `<a href="SAGA:/drawable-spell/python-target#T1">`,
 * become links to the page and its `#id` (`EpicAddress`), so a page may link either way:
 * - the epic or saga page, from the checkout's root (`PageTargets.rootUrlOf()`), opening in that epic's tab (as every
 *   link to an epic page) unless the link names one;  the page there lands on the id, loading its part first
 * - into THIS page:  a `#id` link, which `wireAnchors()` lands on
 * - every such link as the page starts, and one added later as it's clicked (before the anchors see the click)
 * - a malformed address, or no root to build from:  left as it is
 */
function wireAddresses() {
  const root = PageTargets.rootUrlOf(document)
  if (!root) return
  const here = EpicAddress.pageOf(location.href, root)
  for (const link of document.querySelectorAll("a[href]")) rewrite(link)
  document.addEventListener(
    "click",
    (event) => {
      for (const node of event.composedPath())
        if (node instanceof Element && node.localName === "a" && node.hasAttribute("href")) return rewrite(node)
    },
    { capture: true }
  )

  /** `link`'s address, if it has one, as the page and `#id` it means. */
  function rewrite(link) {
    const href = link.getAttribute("href")
    if (!EpicAddress.isAddress(href)) return
    let address
    try {
      address = EpicAddress.parse(href)
    } catch {
      return
    }
    const samePage = address.page === here
    link.setAttribute("href", samePage ? `#${address.id ?? ""}` : address.hrefFrom(root))
    if (!samePage && !link.hasAttribute("target")) link.setAttribute("target", address.epic ?? `saga-${address.saga}`)
    link.setAttribute("data-spell-address", href)
  }
}

// ## Jump to an item (Cmd / Ctrl + K):  `wireJumpKey()`, in `spell-doc-toolbar.js`

////////////////
// ## Paging
////////////////

/**
 * Page Down / Page Up / Space / Shift+Space page the document ourselves, so a page always continues just below the
 * stuck titles.
 * - why:  the browser pages by the `scroll-padding-top` of where it STARTS (`StickyWatch`'s stuck edge), but paging
 *   down can stick more titles (entering a nested section), which then cover the old bottom lines
 * - down:  the old viewport bottom lands just below the lowest title stuck at the NEW position (`stuckBottom()`,
 *   measured there:  a sticky box's position is computed in layout, so an instant scroll and a read find it);
 *   up:  the old first line below the stuck titles lands at the viewport bottom
 * - measured with instant scrolls, then put back and scrolled there for real (smooth, unless reduced motion):
 *   nothing paints in between
 * - left to the browser:
 *   modifier keys, a key in a field, button, link or a scrolling box of its own (a wide `pre`), an open dialog
 */
function wirePaging(main) {
  const keys = { PageDown: 1, PageUp: -1, " ": 1 }
  document.addEventListener("keydown", (event) => {
    let direction = keys[event.key]
    if (!direction || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === " " && event.shiftKey) direction = -1
    if (document.querySelector("dialog[open]") || !pageOwnsKey(event, event.key === " ")) return
    event.preventDefault()
    const from = scrollY
    const to = direction > 0 ? pageDownTo() : pageUpTo()
    if (Math.abs(to - from) < 1) return
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches
    scrollTo({ top: from, behavior: "instant" })
    scrollTo({ top: to, behavior: smooth ? "smooth" : "instant" })
  })

  /**
   * Where Page Down goes:  the old viewport bottom just below the titles stuck THERE (settles in a few tries).
   * - the furthest try that leaves the old bottom uncovered:  where the old bottom IS a title, the two positions
   *   either side of its sticking alternate, and the nearer one shows it below the stack instead of stuck on it
   */
  function pageDownTo() {
    const bottom = scrollY + innerHeight
    const max = document.documentElement.scrollHeight - innerHeight
    let top = scrollY
    let best = top
    for (let tries = 0; tries < 4; tries++) {
      const next = Math.min(max, Math.max(0, bottom - stuckBottom(main)))
      if (Math.abs(next - top) < 1) break
      top = next
      scrollTo({ top, behavior: "instant" })
      if (bottom - top >= stuckBottom(main) - 1) best = Math.max(best, top)
    }
    return best
  }

  /** Where Page Up goes:  the first line below the stuck titles to the viewport bottom. */
  function pageUpTo() {
    return Math.max(0, scrollY + stuckBottom(main) - innerHeight)
  }
}

/**
 * Whether a paging key belongs to the page:  not to a field or a box that scrolls on its own;
 * Space not to a control either (it presses a button, follows a link).
 */
function pageOwnsKey(event, space) {
  for (const node of event.composedPath()) {
    if (!(node instanceof Element) || node === document.body || node === document.documentElement) continue
    if (node.isContentEditable || node.matches(FIELDS) || (space && node.matches(CONTROLS))) return false
    const overflow = getComputedStyle(node).overflowY
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight) return false
  }
  return true
}

/** What Space presses. */
const CONTROLS = "a[href], button, summary, [tabindex], ui-button, ui-checkbox, ui-title, ui-item"

/**
 * The bottom of the lowest box stuck at the top now, from the viewport top:  the site header, the page header, the
 * filter bar, every stuck (or being pushed out) section title or sticky heading in `main`.
 * - a sticky box is stuck when it sits at (or above:  pushed out by its section's end) its computed `top`
 */
function stuckBottom(main) {
  let bottom = siteHeaderHeight()
  const boxes = Array.from(main.querySelectorAll(".spell-filter"))
  // a `<ui-sticky>` host is `display: contents`:  the box that sticks is its shadow `sticky` part
  for (const sticky of main.querySelectorAll("ui-sticky"))
    boxes.push(sticky.shadowRoot?.querySelector('[part~="sticky"]'))
  for (const section of main.querySelectorAll(`ui-section[sticky], ${EPIC_FOLDS}`)) boxes.push(titleOf(section))
  // an epic page's page header and its toolbar's bar under it (the title between them scrolls away);  an OPEN item's
  // line sticks below the titles (a closed one's isn't sticky:  skipped)
  for (const page of main.querySelectorAll("epic-page"))
    boxes.push(...(page.shadowRoot?.querySelectorAll('[part~="header"], [part~="bar"]') ?? []))
  for (const item of main.querySelectorAll("epic-item")) boxes.push(item.shadowRoot?.querySelector('[part~="line"]'))
  for (const box of boxes) {
    if (!box) continue
    const style = getComputedStyle(box)
    const line = parseFloat(style.top)
    if (style.position !== "sticky" || Number.isNaN(line)) continue
    const rect = box.getBoundingClientRect()
    if (rect.height && rect.top <= line + 1 && rect.bottom > bottom) bottom = rect.bottom
  }
  return bottom
}

/** The URL's `#hash` as an id, or "";  an old phase address as the phase's id (`addressedId()`). */
function hashId() {
  return addressedId(decodeHash(location.hash.slice(1)))
}

/**
 * The id an address names on this page:  `id`, unless it's an OLD phase id (`p7`, from before stable phase ids, epic
 * `epic-workflow` P15) that no element has:  then the 7th phase's id (`p-epic-migrate`), so old links and bookmarks
 * still land.  As `$/epics` `PhaseIds.landing()`.
 */
function addressedId(id) {
  if (document.getElementById(id)) return id
  // ids in any case (`#T1` ~== `#t1`, epic `epic-workflow` J32):  the page's own spelling when it has no other
  const n = /^p(\d+)$/i.exec(id)?.[1]
  if (!n) return id.toLowerCase()
  return (
    document.querySelectorAll('epic-page > epic-section[kind="phases"] > epic-phase')[Number(n) - 1]?.id ??
    id.toLowerCase()
  )
}

/** A `#hash` (without its `#`) as an id:  percent-decoded, or as it is when that fails. */
function decodeHash(hash) {
  try {
    return decodeURIComponent(hash)
  } catch {
    return hash
  }
}

////////////////
// ## Scroll-follow
////////////////

/**
 * Mark the toolbar's entry of the section being read, and let the address follow it.
 * - "Current":  the last entry (section, heading) whose top has reached its landing line (the site header and its
 *   `scroll-margin-top`, plus a little);  entries hidden by the filter or inside a folded section don't count
 * - the toolbar's entry of the current entry's top-level section is `selected`
 * - the ADDRESS follows too, once `followAddress()` has been called (`land()`, after the page has landed):
 *   the current entry's `#id` replaces the URL's hash (`history.replaceState()`:  no history entry, no jump);
 *   not while a followed link is pinned (its click set the hash), and no hash above the first entry;
 *   never while an epic page shows its TEST RUN (`isTestRun()`):  its `#v3` is the test it's on (epic `epic-engine` J44)
 *   - so a reload, or VS Code restarting the view, lands on the section being read
 *   - `replaceState()` fires no `hashchange`:  `spell-doc:place` on `window` tells the live client, which tells
 *     VS Code's view (`liveClient.ts` `reportPlace()`)
 * - returns `{ update, pin, followAddress, rescan }`:
 *   - `pin(entry)` makes it current until the page scrolls again (a link was followed)
 *   - `rescan(rail)` reads the entries and the toolbar again:  the page was updated in place (`rewire()`)
 */
function followScroll(main, outline, rail) {
  let headings = []
  let railItems = []
  let active = null
  let scheduled = false
  let pinned = null
  let addressing = false

  rescan(rail)
  addEventListener("scroll", schedule, { passive: true })
  addEventListener("resize", schedule, { passive: true })
  return { update, pin, followAddress, rescan }

  /** Read the entries and the toolbar's items;  a rebuilt toolbar gets its mark again on the next update. */
  function rescan(nextRail) {
    headings = Array.from(main.querySelectorAll(outline.targets))
    const items = Array.from(nextRail?.querySelectorAll("[data-rail]") ?? [])
    if (items[0] !== railItems[0]) active = null
    railItems = items
  }

  /** From now on, the address follows the current entry. */
  function followAddress() {
    addressing = true
    update()
  }

  /** At most one update per frame. */
  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      update()
    })
  }

  /** Find the current heading and mark it;  a pinned one stays while the page hasn't scrolled. */
  function update() {
    if (pinned && Math.abs(scrollY - pinned.scrollY) < 2) return setActive(pinned.heading)
    pinned = null
    let current = headings[0]
    let reached = null
    for (const heading of headings) {
      if (!heading.isConnected) continue // replaced by an in-place update, until `rescan()`
      if (heading.offsetParent === null && !heading.getClientRects().length) continue // hidden by the filter
      if (outline.folded(heading)) continue // laid out in a folded box, but not shown
      const line = landingLine(heading) + 4
      if (heading.getBoundingClientRect().top > line) break // document order:  the first below its line ends it
      current = reached = heading
    }
    setActive(current)
    writeAddress(reached?.id ?? "")
  }

  /**
   * Put `#id` in the address ("":  no hash) without a history entry or a jump, and say so (`spell-doc:place`).
   * - only once `followAddress()` was called, and only when it changes
   */
  function writeAddress(id) {
    if (!addressing || hashId() === id || isTestRun()) return
    history.replaceState(history.state, "", `${location.pathname}${location.search}${id ? `#${id}` : ""}`)
    dispatchEvent(new Event("spell-doc:place"))
  }

  /** Mark the toolbar's entry of `heading`'s top-level section. */
  function setActive(heading) {
    if (!heading || heading === active) return
    active = heading
    const group = outline.groupOf(heading)
    for (const item of railItems) item.toggleAttribute("selected", item.dataset.rail === group?.id)
  }

  /** `heading` is current, wherever it is, until the page scrolls from here. */
  function pin(heading) {
    pinned = { heading, scrollY }
    setActive(heading)
  }
}

////////////////
// ## Panels
////////////////

/** Is `title`'s panel open? */
function isPanelOpen(title) {
  return openIndexes(title.parentElement).includes(titlesOf(title.parentElement).indexOf(title))
}

/** Open or close `title`'s panel, keeping the accordion's other panels as they are. */
function setPanel(title, open) {
  const accordion = title.parentElement
  const index = titlesOf(accordion).indexOf(title)
  const indexes = new Set(openIndexes(accordion))
  if (open) indexes.add(index)
  else indexes.delete(index)
  accordion.open = [...indexes].sort((a, b) => a - b).join(" ")
}

/** An accordion's open panel indexes, from its `open` property (or attribute, before it upgraded). */
function openIndexes(accordion) {
  const text = accordion.open ?? accordion.getAttribute("open") ?? ""
  return String(text)
    .split(/[\s,]+/)
    .filter((word) => /^\d+$/.test(word))
    .map(Number)
}

/** The `<ui-title>` children of `accordion`:  one per panel, in order. */
function titlesOf(accordion) {
  return Array.from(accordion.children).filter((child) => child.localName === "ui-title")
}

////////////////
// ## CHEATSHEET filter
////////////////

/**
 * `ui-input[data-spell-filter]` shows only the cards holding every typed word, and `ui-select[data-spell-filter-badge]`
 * only those with a `ui-label` badge of the chosen text ("" = any);  sections without a visible card hide too, and
 * so do their toolbar buttons.
 * - reads values from the events' `detail`:  during `ui-input` / `ui-change` the element's `value` is still the old one
 * - SIDE EFFECT:  remembers the typed filter (not the badge) in `localStorage` (when the browser allows it), per
 *   page:  under the input's `data-spell-filter` value, or `FILTER_KEY_PREFIX` + the page's path
 */
function wireFilter(main) {
  const input = document.querySelector("ui-input[data-spell-filter]")
  const badge = document.querySelector("ui-select[data-spell-filter-badge]")
  if (!input && !badge) return
  const key = input?.dataset.spellFilter || `${FILTER_KEY_PREFIX}${location.pathname}`
  const cards = Array.from(main.querySelectorAll("ui-card"))
  // HEADINGS' `section`s, or `<ui-section>`s (`:host([hidden])` hides one)
  const sections = Array.from(main.querySelectorAll("section, ui-section")).filter((section) =>
    section.querySelector("ui-card")
  )
  const empty = document.getElementById("empty")
  let typed = input ? readSaved(key) : ""
  let chosen = String(badge?.value ?? "")
  /** Folded sections the filter unfolded, to fold back when it's cleared. */
  const filterOpened = new Set()
  input?.addEventListener("ui-input", onType)
  input?.addEventListener("ui-change", onType)
  badge?.addEventListener("ui-change", (event) => {
    chosen = String(event.detail?.value ?? badge.value ?? "")
    apply()
  })
  if (typed) input.value = typed
  if (typed || chosen) apply()

  /** The typed filter changed:  apply and save it. */
  function onType(event) {
    typed = String(event.detail?.value ?? input.value ?? "")
    apply()
    try {
      localStorage.setItem(key, typed)
    } catch {
      // private window:  the filter just isn't remembered
    }
  }

  /**
   * Hide what doesn't match.
   * - while a filter is set, a folded section holding a match unfolds
   *   (not saved:  sections start folded, so matches would hide in them);
   *   clearing the filter folds back the ones it opened
   */
  function apply() {
    const words = typed.toLowerCase().split(/\s+/).filter(Boolean)
    const wanted = chosen.trim().toLowerCase()
    let shown = 0
    for (const card of cards) {
      const content = card.textContent.toLowerCase()
      const badges = Array.from(card.querySelectorAll("ui-label"), (label) => label.textContent.trim().toLowerCase())
      card.hidden = !words.every((word) => content.includes(word)) || (!!wanted && !badges.includes(wanted))
      if (!card.hidden) shown++
    }
    const filtering = words.length > 0 || !!wanted
    for (const section of sections) {
      section.hidden = !section.querySelector("ui-card:not([hidden])")
      if (section.localName !== "ui-section") continue
      if (filtering && !section.hidden && isCollapsed(section)) {
        setCollapsed(section, false)
        filterOpened.add(section)
      } else if (!filtering && filterOpened.has(section)) {
        setCollapsed(section, true)
        filterOpened.delete(section)
      }
    }
    if (empty) empty.hidden = shown > 0
    for (const item of document.querySelectorAll("nav.spell-toolbar [data-rail]")) {
      item.hidden = !!document.getElementById(item.dataset.rail)?.closest("[hidden]")
    }
  }
}

/** The filter saved under `key`, or "" (storage can throw, e.g. blocked site data). */
function readSaved(key) {
  try {
    return localStorage.getItem(key) ?? ""
  } catch {
    return ""
  }
}

////////////////
// ## Page notes
////////////////

/**
 * PAGE NOTES (epic `airplane`, P3):  notes written INTO a page (`<spell-notes>` / `<spell-note>`;  the markup and its
 * rules:  `src/tools/PageNotes.js`), each drawn as a folded card (`drawNoteCards()`), its head line an
 * `<epic-page-note-head>` (the epics pack;  epic `epic-engine` P3).
 * - READ ONLY since P11:  comments (below) replaced the bubbles and the Note pill that wrote them;
 *   the notes already written still show, and `epic notes` still answers them
 * - every page, `file://` too;  drawn again on `spell-doc:updated` (an answer changes the page)
 */
function wireNotes(main) {
  drawNoteCards(main)
  addEventListener("spell-doc:updated", () => drawNoteCards(main))
}

/**
 * Give each `<spell-note>` its head line, again after every update (the status or replies may have changed):
 * an `<epic-page-note-head>`, "Owen · 10/10 14:02", the first line of the note while folded, its status, how many
 * replies.
 * - a click on it folds and unfolds the card (the note's `open`, which a live patch keeps)
 */
function drawNoteCards(main) {
  for (const note of main.querySelectorAll("spell-note")) {
    note.querySelector(":scope > epic-page-note-head")?.remove()
    const head = el("epic-page-note-head", {
      "data-spell-added": true,
      at: note.getAttribute("at") ?? undefined,
      status: note.getAttribute("status") || "new",
      replies: note.querySelectorAll(":scope > spell-note-reply").length,
      preview: noteText(note).split("\n")[0],
      open: note.hasAttribute("open")
    })
    head.addEventListener("epic-page-note-fold", (event) => note.toggleAttribute("open", !!event.detail?.open))
    note.prepend(head)
  }
}

////////////////
// ## The Epics page's sort
////////////////

/**
 * The Epics page's SORT buttons (Owen, 2026-10-13:  "Add buttons to epics header to sort by date or alphabetical,
 * within the sessions"):  an `<epic-sort>` (the epics pack, epic `epic-engine` P3) in the page header, beside the New
 * epic pill.
 * - only where the page has an `<epic-list>`, which follows it;  the elements do the rest:  the buttons, remembering,
 *   the sorting, the groups, the saga chips, the stars
 * - callable again (a page updated in place):  one at most
 * - SIDE EFFECT:  adds it to the header, marked `data-spell-added` so the live patch steps around it
 */
function wireEpicSort(main) {
  const head = main.querySelector(".spell-page-head")
  if (!head || !main.querySelector("epic-list") || head.querySelector("epic-sort")) return
  addHeadTool(head, el("epic-sort", { "data-spell-added": true }), "page")
}

////////////////
// ## New epic
////////////////

/** The page server's New epic route (`src/tool/epicRoutes.ts`). */
const NEW_EPIC_API = "/api/epics/new"

/** `localStorage` key of the New epic box's unsaved text (`{ title, prompt }`), one for every Epics page. */
const NEW_EPIC_DRAFT_KEY = "spell-new-epic-draft"

/**
 * NEW EPIC (epic `airplane` P7):  on the Epics page (`epics/index.html`), a New epic pill in the page header.
 * - its box:  a title and the kickoff prompt (a textarea that grows with its text);  ⌘ / Ctrl Enter saves
 * - the page server writes a FUTURE epic at once (`epicRoutes.ts`):  no Claude needed, so it works on a plane;
 *   the home page is rewritten, so the new card shows here with its seedling;  `/airplane land` offers to start it
 * - only served by the page server with a token:  from `file://`, no pill
 * - what's typed and not saved is kept (`NEW_EPIC_DRAFT_KEY`) until it's saved
 */
function wireNewEpic(main) {
  if (!/(^|\/)epics\/(index\.html)?$/.test(location.pathname)) return
  if (!window.SPELL_SERVER?.token || location.protocol === "file:") return
  const head = main.querySelector(".spell-page-head")
  if (!head || head.querySelector(".spell-new-epic")) return
  // the browser's own tooltip, a `title` (Owen, 2026-10-10:  never a `<ui-popup>` as a tooltip)
  const tip = "Write an idea down as a future epic"
  const button = el(
    "ui-button",
    { circular: true, basic: true, size: "tiny", icon: "seedling", title: tip },
    "New epic"
  )
  button.addEventListener("click", openNewEpicBox)
  titleInside(button)
  addHeadTool(head, el("span", { class: "spell-new-epic", "data-spell-added": true }, button), "page")
}

/** Open the New epic box, with the draft typed so far. */
function openNewEpicBox() {
  const box = newEpicBox()
  const draft = readJSON(NEW_EPIC_DRAFT_KEY)
  const [title, prompt] = box.querySelectorAll("input, textarea")
  title.value = typeof draft.title === "string" ? draft.title : ""
  prompt.value = typeof draft.prompt === "string" ? draft.prompt : ""
  box.visible = true
  requestAnimationFrame(() => {
    growField(prompt)
    ;(title.value ? prompt : title).focus()
  })
}

/** The New epic box, made once (outside `main`:  a live patch never sees it). */
function newEpicBox() {
  let box = document.getElementById("spell-new-epic-box")
  if (box) return box
  const template = document.createElement("template")
  template.innerHTML = `<ui-modal id="spell-new-epic-box" class="spell-note-box" size="small" closable>
  <ui-header><ui-icon name="seedling"></ui-icon> A new epic</ui-header>
  <ui-content>
    <input class="spell-note-field spell-new-epic-title" type="text" aria-label="Title" placeholder="Title:  a few words" />
    <textarea class="spell-note-field" rows="4" aria-label="What it's for"
      placeholder="What it's for, as you'd type it after /epic <name>:  the kickoff prompt."></textarea>
    <p class="spell-note-hint">⌘ Enter saves.  It's written down as a future epic, with a seedling on this page;  /airplane land asks whether to start it.</p>
  </ui-content>
  <ui-actions>
    <ui-button class="spell-note-cancel" circular basic>Cancel</ui-button>
    <ui-button class="spell-note-save" circular primary icon="seedling">Make the epic</ui-button>
  </ui-actions>
</ui-modal>`
  box = template.content.firstElementChild
  const [title, prompt] = box.querySelectorAll("input, textarea")
  const save = box.querySelector(".spell-note-save")
  const close = () => (box.visible = false)
  const keep = () => writeJSON(NEW_EPIC_DRAFT_KEY, { title: title.value, prompt: prompt.value })
  const submit = async () => {
    if (!title.value.trim()) return title.focus()
    save.setAttribute("loading", "")
    try {
      const { name } = await postJSON(NEW_EPIC_API, { title: title.value.trim(), prompt: prompt.value.trim() })
      writeJSON(NEW_EPIC_DRAFT_KEY, {})
      close()
      noteToast(`Future epic ${name} written down`, "success")
    } catch (error) {
      noteToast(`Couldn't make the epic:  ${error.message}`, "error")
    } finally {
      save.removeAttribute("loading")
    }
  }
  title.addEventListener("input", keep)
  prompt.addEventListener("input", () => {
    growField(prompt)
    keep()
  })
  for (const field of [title, prompt])
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit()
    })
  save.addEventListener("click", () => void submit())
  box.querySelector(".spell-note-cancel").addEventListener("click", close)
  document.body.append(box)
  return box
}

/**
 * A note's text as typed:  paragraphs split by blank lines, `<br>` a newline, `<code>` in backticks;
 * its head and replies left out.  `PageNotes.js` `textOf()` is the same, on the server.
 */
function noteText(note) {
  const blocks = []
  for (const child of note.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE && child.matches("epic-page-note-head, spell-note-reply")) continue
    const words = child.nodeType === Node.ELEMENT_NODE ? inlineText(child) : child.textContent
    if (words.trim()) blocks.push(words.trim())
  }
  return blocks.join("\n\n")

  /** `node`'s text:  `<br>` a newline, `<code>` in backticks, white space as one space. */
  function inlineText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/\s+/g, " ")
    if (node.nodeType !== Node.ELEMENT_NODE) return ""
    if (node.localName === "br") return "\n"
    const inner = Array.from(node.childNodes, inlineText).join("")
    return node.localName === "code" ? `\`${inner}\`` : inner
  }
}
