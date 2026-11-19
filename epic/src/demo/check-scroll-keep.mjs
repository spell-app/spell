/**
 * Check that a click folding or filtering much of an epic page keeps the reader's place (epic `epic-engine` I350), in
 * a real browser:  the section, phase or item at the top of the window stays where it is on screen, within 2px.
 * - Owen, 2026-11-18:  "When I collapse by status, especially by clicking on the top, the page scroll changes --
 *   often to the very bottom so it looks like the page went away.  Keep the current top item scrolled into view."
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-scroll-keep.mjs [--doc <name>] [--small <name>] [--no-expand] [--bundle <spell-ui.js>] [outDir]
 * - `--base <url>`:  a page server already running (main's, `http://127.0.0.1:4747`), its real pages and its pack,
 *   instead of copies on a server of its own;  the clicks change only the headless browser's own storage
 * - `--small none`:  the big page only
 * - `--no-expand`:  leave out expand-all and collapse-all, minutes on epic-engine's page (every part loads)
 * - the pages:  a copy of epic `<name>`'s page (default `epic-engine`, the biggest) and of `<small>`'s (default
 *   `vite-plus`), skeleton and parts, NEVER their inboxes, under `src/demo/shots/scroll-keep/epics/` (git-ignored)
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - at 1200px and 520px wide (VS Code's side bar), every section open and its items folded, as Owen reads a page;
 *   the cases, each from the page's middle:
 *   - every toolbar chip in turn, clicked to hide, then again to show;  from the middle, and from 85% of the way down
 *   - the chip of the section the top item is in, on its stuck title
 *   - expand-all (the toolbar's toggle), which opens everything, then collapse-all (the toggle again)
 *   - a reload after a chip hides its colour:  the chip still says hidden, as many items still show (Owen's rule:
 *     state stays the same across reloads)
 * - each case:  the ANCHOR before the click (the first section, phase or item that shows whose top is at or below
 *   the titles stuck over it, `--epic-stack`;  `ScrollAnchor`'s rule, written again here) and its top;  once the page
 *   stops changing height (1.5s at least), the same element's top, or, when the click hid it, the nearest one before it that shows
 *   - fails past 2px, or when the page ends up at its very bottom having not started there
 * - prints a table:  case, anchor, top before, top after, scroll before / after / most
 * - screenshots (outDir, default `src/demo/shots/scroll-keep/`):  `<page>-<width>-<case>.png`, after each click
 * - fails (exit 1) on a page error or a case off;  re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_SCROLL_KEEP_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_SCROLL_KEEP_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { bundleRoutes, logInto } = await import("./demoPages.mjs")
const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")

////////////////
// ## Settings
////////////////

const args = process.argv.slice(2)
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const big = flagValue("--doc") ?? "epic-engine"
const small = flagValue("--small") ?? "vite-plus"
const bundle = flagValue("--bundle")
const base = flagValue("--base")
const flagged = new Set(
  ["--doc", "--small", "--bundle", "--base"].flatMap((name) => (args.includes(name) ? [args.indexOf(name) + 1] : []))
)
const CONTENT = join(HERE, "shots", "scroll-keep")
const out = args.find((arg, index) => !arg.startsWith("--") && !flagged.has(index)) ?? CONTENT
const SIZES = [
  { width: 1200, height: 900 },
  { width: 520, height: 900 }
]
/** How far from its spot the anchor may end up, px. */
const TOLERANCE = 2
/** How long after a click the page is left to settle before measuring, ms:  the keep runs 1.2s. */
const SETTLE_MS = 1500
const problems = []
const rows = []

if (!base) {
  rmSync(join(CONTENT, "epics"), { recursive: true, force: true })
  const pages = small === "none" ? [big] : [big, small]
for (const name of pages) copyEpic(name)
}
mkdirSync(out, { recursive: true })

const server = base ? { base, stop: async () => undefined } : await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
try {
  const pages = small === "none" ? [big] : [big, small]
for (const name of pages) for (const size of SIZES) await checkPage(name, size)
  for (const size of SIZES) await reloadCase(big, size)
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
console.table(rows)
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}
console.log(`check-scroll-keep:  ${rows.length} clicks, every anchor kept within ${TOLERANCE}px`)

////////////////
// ## Cases
////////////////

/** Every click case on `name`'s page at `size`, from the page's middle each time. */
async function checkPage(name, size) {
  const { page, logs } = await openPage(name, size)
  const where = (what) => `${name} ${size.width}px ${what}`

  // as Owen reads it:  every section open, its items folded
  await page.evaluate(() => {
    for (const section of document.querySelectorAll("epic-overview, epic-section")) section.setAttribute("open", "")
  })
  await page.waitForTimeout(1500)

  // every chip, hidden then shown, from the middle and from near the end:  some hide the top item itself
  const chips = await chipCount(page)
  for (const at of [0.5, 0.85])
    for (let index = 0; index < chips; index++) {
      await toMiddle(page, at)
      const state = await page.evaluate((index) => toolbarChips()[index].dataset.state, index)
      await clickCase(page, where(`at ${at} chip ${state} hide`), () => clickChip(page, index))
      await clickCase(page, where(`at ${at} chip ${state} show`), () => clickChip(page, index))
    }

  await toMiddle(page)
  const section = await page.evaluate(() => sectionChipOfAnchor())
  if (section) {
    await clickCase(page, where(`section ${section} chip hide`), () => clickSectionChip(page, section))
    await clickCase(page, where(`section ${section} chip show`), () => clickSectionChip(page, section))
  } else rows.push({ case: where("section chip"), anchor: "(no section chip at the top:  skipped)" })

  if (args.includes("--no-expand")) return finish(page, logs, where("page"))
  await toMiddle(page)
  await clickCase(page, where("expand-all"), () => clickToggleAll(page))
  await toMiddle(page)
  await clickCase(page, where("collapse-all"), () => clickToggleAll(page))
  await finish(page, logs, where("page"))
}

/** A toolbar chip hides its colour, then the page reloads:  the chip still hidden, as many items still shown. */
async function reloadCase(name, size) {
  const where = `${name} ${size.width}px reload`
  const { page, logs } = await openPage(name, size)
  await clickChip(page, 0)
  await page.waitForTimeout(SETTLE_MS)
  const before = await page.evaluate(() => filterState())
  await page.reload()
  await waitForPage(page)
  const after = await page.evaluate(() => filterState())
  const same = JSON.stringify(before) === JSON.stringify(after)
  rows.push({ case: where, anchor: same ? "filter kept" : "filter CHANGED", before: before.pressed, after: after.pressed })
  if (!same) problems.push(`${where}:  the filter changed across the reload:  ${JSON.stringify(before)} => ${JSON.stringify(after)}`)
  // put it back, so the next run starts the same
  await clickChip(page, 0)
  await page.waitForTimeout(400)
  await finish(page, logs, where)
}

/** One click (`act()`), measured:  the anchor before and its spot after;  the scroll every frame meanwhile. */
async function clickCase(page, where, act) {
  const before = await page.evaluate(() => anchorNow())
  if (!before) return problems.push(`${where}:  nothing to anchor on`)
  await page.evaluate(() => watchScroll())
  await act()
  await page.waitForTimeout(SETTLE_MS)
  // expand-all loads every part:  wait till the page stops changing height (a minute on epic-engine's)
  const settled = await page
    .waitForFunction(() => pageSettled(), null, { timeout: 180_000, polling: 250 })
    .then(() => true)
    .catch(() => false)
  if (!settled) problems.push(`${where}:  the page still changed height 3 minutes on:  measured as it was`)
  const after = await page.evaluate(() => anchorAfter())
  const off = after.top === null ? null : Math.round((after.top - before.top) * 10) / 10
  rows.push({
    case: where,
    anchor: before.label + (after.label === before.label ? "" : ` -> ${after.label}`),
    "top before": Math.round(before.top),
    "top after": after.top === null ? "(gone)" : Math.round(after.top),
    off,
    scroll: `${before.scrollY} -> ${after.scrollY} / ${after.maxScroll}`
  })
  const slug = where.replace(/[^\w-]+/g, "-")
  // a page expand-all made 300,000px tall can take long to shoot:  the measure stands without the picture
  await page.screenshot({ path: join(out, `${slug}.png`), timeout: 10_000 }).catch(() => undefined)
  if (off === null) problems.push(`${where}:  ${before.label} and everything before it hidden`)
  else if (Math.abs(off) > TOLERANCE) problems.push(`${where}:  ${after.label} moved ${off}px`)
  if (after.atBottom && !before.atBottom && after.maxScroll > 0 && Math.abs(off ?? 99) > TOLERANCE)
    problems.push(`${where}:  the page jumped to its bottom`)
}

////////////////
// ## Helpers
////////////////

/** A fresh browser page on `name`'s copy (no remembered folds or filters), the in-page helpers installed. */
async function openPage(name, size) {
  const logs = []
  const page = await BrowserPage.newPage(browser, {
    viewport: size,
    ignore: /^Failed to load resource/,
    onProblem: logInto(logs),
    routes: bundleRoutes(bundle)
  })
  await page.addInitScript(inPage)
  await page.goto(`${server.base}/epics/${name}/${name}.plan.html`)
  await waitForPage(page)
  return { page, logs }
}

/** The page drawn:  its toolbar's chips there, and its items' lines. */
async function waitForPage(page) {
  await page.waitForFunction(() => toolbarChips().length > 0 && document.querySelector("epic-item")?.shadowRoot, null, {
    timeout: 30_000
  })
  await page.waitForTimeout(800)
}

/** Scroll to the middle of the page (`at`:  that share of the way down), and let it settle (lines near the screen draw). */
async function toMiddle(page, at = 0.5) {
  await page.evaluate(
    (at) => scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * at, behavior: "instant" }),
    at
  )
  await page.waitForTimeout(600)
}

/** How many chips the toolbar has, the blue badge counted. */
async function chipCount(page) {
  return page.evaluate(() => toolbarChips().length)
}

/** A real mouse click on the toolbar's `index`th chip (the blue badge counts as one). */
async function clickChip(page, index) {
  const point = await page.evaluate((index) => centreOf(toolbarChips()[index]), index)
  await page.mouse.click(point.x, point.y)
}

/** A real mouse click on the expand-all / collapse-all toggle. */
async function clickToggleAll(page) {
  const point = await page.evaluate(() => centreOf(pageRoot().querySelector('[part~="toggle-all"]')))
  await page.mouse.click(point.x, point.y)
}

/** A real mouse click on section `id`'s first chip, on its (stuck) title. */
async function clickSectionChip(page, id) {
  const point = await page.evaluate((id) => centreOf(sectionChips(document.getElementById(id))[0]), id)
  await page.mouse.click(point.x, point.y)
}

/** Its errors reported, its context closed. */
async function finish(page, logs, where) {
  if (logs.length) problems.push(...logs.map((log) => `${where}:  ${log}`))
  await page.context().close()
}

/** Copy epic `name`'s page and parts into the demo server's epic folder, as deep as the real one;  no inbox. */
function copyEpic(name) {
  const source = join(EpicConfig.contentOf(ROOT), "epics", name)
  const skeleton = join(source, `${name}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-scroll-keep:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", name)
  mkdirSync(join(folder, "parts"), { recursive: true })
  writeFileSync(join(folder, `${name}.plan.html`), readFileSync(skeleton))
  if (!existsSync(join(source, "parts"))) return
  for (const part of readdirSync(join(source, "parts")))
    writeFileSync(join(folder, "parts", part), readFileSync(join(source, "parts", part)))
}

/**
 * Installed in every page before it loads:  the measures, as globals the cases call.
 * - the anchor's rule is `ScrollAnchor`'s, written again so the check doesn't trust the code it checks
 */
function inPage() {
  const CANDIDATES = "epic-overview, epic-section, epic-phase, epic-item"
  const shows = (element) => element.getClientRects().length > 0
  const stackOf = (element) => parseFloat(getComputedStyle(element).getPropertyValue("--epic-stack")) || 0
  const labelOf = (element, index) => `${element.localName}#${element.id || `[${index}]`}`
  const scrollState = () => {
    const maxScroll = Math.round(document.documentElement.scrollHeight - innerHeight)
    return { scrollY: Math.round(scrollY), maxScroll, atBottom: scrollY >= maxScroll - 2 }
  }

  globalThis.pageRoot = () => document.querySelector("epic-page").shadowRoot
  globalThis.toolbarChips = () => {
    const filter = pageRoot()?.querySelector("epic-state-filter")
    return Array.from(filter?.shadowRoot?.querySelectorAll("button[data-state]") ?? [])
  }
  globalThis.sectionChips = (section) => {
    const filter = section?.shadowRoot?.querySelector("epic-state-filter")
    return Array.from(filter?.shadowRoot?.querySelectorAll("button[data-state]") ?? [])
  }
  globalThis.centreOf = (element) => {
    const box = element.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }
  globalThis.anchorNow = () => {
    const candidates = Array.from(document.querySelectorAll(CANDIDATES))
    let inside
    for (const [index, element] of candidates.entries()) {
      if (!shows(element)) continue
      const box = element.getBoundingClientRect()
      const line = stackOf(element)
      if (box.top >= line - 1) {
        if (box.top >= innerHeight) break
        return remember(element, index, candidates, box.top)
      }
      if (box.bottom > line) inside = [element, index, candidates, box.top]
    }
    return inside && remember(...inside)
  }
  /** The anchor kept for `anchorAfter()`:  by the element itself, as parts loaded later add candidates. */
  const remember = (element, index, candidates, top) => {
    globalThis.lastAnchor = { element, index, candidates }
    return { index, label: labelOf(element, index), top, ...scrollState() }
  }
  globalThis.anchorAfter = () => {
    const { index, candidates } = globalThis.lastAnchor
    for (let at = index; at >= 0; at--) {
      const element = candidates[at]
      if (element.isConnected && shows(element))
        return { label: labelOf(element, at), top: element.getBoundingClientRect().top, ...scrollState() }
    }
    return { label: "(none)", top: null, ...scrollState() }
  }
  /** The page's height unchanged for a second. */
  let height = 0
  let since = 0
  globalThis.pageSettled = () => {
    const now = document.documentElement.scrollHeight
    if (now !== height) [height, since] = [now, performance.now()]
    return performance.now() - since > 1000
  }
  globalThis.watchScroll = () => {
    globalThis.scrolls = []
    const start = performance.now()
    const tick = () => {
      globalThis.scrolls.push(Math.round(scrollY))
      if (performance.now() - start < 1500) requestAnimationFrame(tick)
    }
    tick()
  }
  /** The section the anchor is in that has its own chips, its id;  `undefined`:  none. */
  globalThis.sectionChipOfAnchor = () => {
    const anchor = anchorNow()
    const element = anchor && globalThis.lastAnchor.element
    for (let section = element?.closest("epic-section"); section; section = section.parentElement?.closest("epic-section"))
      if (section.id && sectionChips(section).length) {
        const box = sectionChips(section)[0].getBoundingClientRect()
        if (box.top >= 0 && box.bottom <= innerHeight) return section.id
      }
    return undefined
  }
  /** What the toolbar's chips say, and how many items show. */
  globalThis.filterState = () => ({
    pressed: toolbarChips()
      .map((chip) => `${chip.dataset.state}:${chip.getAttribute("aria-pressed")}`)
      .join(" "),
    items: Array.from(document.querySelectorAll("epic-item")).filter(
      (item) => !item.closest("[data-epic-filtered]") && !item.matches("[data-epic-filtered]")
    ).length
  })
}
