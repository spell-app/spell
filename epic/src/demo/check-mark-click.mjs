/**
 * Check that a click on a phase's To review chip (`<epic-mark item link>`) lands on its item (epic `epic-engine` I191;
 * Owen, 2026-10-31, on the rust epic's P2 · Typed Events:  "Clicking J2 is broken").
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-mark-click.mjs [--doc <name>] [--bundle <spell-ui.js>] [--verbose]
 * - the copy:  epic `<name>`'s page (default `rust`), its skeleton and parts as they are (its STAGE too:  the rust
 *   page is still `stage="phases"`, which hides its Judgement calls), NEVER its inbox, as
 *   `src/demo/shots/mark-click/epics/mark-click/` (git-ignored)
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - where:  1200 x 760, the page itself;  400 x 760 in an IFRAME, as VS Code's side bar shows it
 * - what:  every To review chip of every phase, clicked the way a person does (the mouse onto it, down, up), each in a
 *   fresh page, its phase opened first;  and once more for each with its item's section filtered to a state the item
 *   isn't in (`filtered`), as the section's own chips would
 * - fails (exit 1) when, after the click, the item isn't open, has no box (its section or itself hidden), sits under the
 *   stuck titles or off the bottom of the window, or the page logged an error
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_MARK_CLICK_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_MARK_CLICK_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
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
const from = flagValue("--doc") ?? "rust"
const bundle = flagValue("--bundle")
const verbose = args.includes("--verbose")
const CONTENT = join(HERE, "shots", "mark-click")
const NAME = "mark-click"
/** How long a jump takes to land and settle, ms:  the runtime lands once more as the page settles. */
const LAND_MS = 2500
/** The windows:  the page itself, wide;  in an iframe, narrow, as VS Code's side bar (its Review tab) shows it. */
const WINDOWS = [
  { width: 1200, height: 760, framed: false },
  { width: 400, height: 760, framed: true }
]
const problems = []
const results = []

////////////////
// ## The run
////////////////

rmSync(join(CONTENT, "epics"), { recursive: true, force: true })
const chips = copyEpic()
if (!chips.length) {
  console.error(`check-mark-click:  epic ${from} has no To review chip`)
  process.exit(2)
}
const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
try {
  for (const window of WINDOWS)
    for (const chip of chips) for (const filtered of [false, true]) await clickChip(window, chip, filtered)
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
if (verbose) console.log(JSON.stringify(results, null, 2))
else for (const it of results) console.log(`${it.ok ? "ok  " : "FAIL"} ${it.tag}${it.ok ? "" : `  ${it.why}`}`)
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}
console.log(`${results.length} chip clicks, each landed on its item`)

/** One click on `chip` (`{ phase, item }`) in a fresh page in `window`;  `filtered`:  its item's section filtered first. */
async function clickChip(window, chip, filtered) {
  const tag = `${chip.phase}:${chip.item}${filtered ? "-filtered" : ""}-${window.width}x${window.height}${window.framed ? "-framed" : ""}`
  const logs = []
  const { page, frame } = await openPage(window, logs)
  try {
    const placed = await frame.evaluate(([chip, filtered]) => globalThis.placeChip(chip, filtered), [chip, filtered])
    if (!placed) return void problems.push(`${tag}:  couldn't show the chip (${placed})`)
    await frame.waitForTimeout(600)
    const box = await frame.evaluate((chip) => globalThis.chipBox(chip), chip)
    if (!box) return void problems.push(`${tag}:  the chip has no box`)
    const offset = await frameOffset(page, frame)
    const x = offset.x + box.left + box.width / 2
    const y = offset.y + box.top + box.height / 2
    await page.mouse.move(x - 40, y + 30)
    await page.mouse.move(x, y, { steps: 5 })
    await page.mouse.down()
    await frame.waitForTimeout(90)
    await page.mouse.up()
    await frame.waitForTimeout(LAND_MS)
    const at = await frame.evaluate((id) => globalThis.landedOn(id), chip.item)
    const why = []
    if (!at.open) why.push("the item didn't open")
    if (!at.height) why.push(`the item has no box (${at.hiddenBy || "hidden"})`)
    else {
      if (at.top < at.line - 2) why.push(`the item is under the stuck titles (top ${at.top}, line ${at.line})`)
      if (at.top > at.window - 20) why.push(`the item is off the bottom (top ${at.top}, window ${at.window})`)
    }
    if (logs.length) why.push(logs.join(" | "))
    results.push({ tag, ok: !why.length, why: why.join(";  "), at })
    if (why.length) problems.push(`${tag}:  ${why.join(";  ")}`)
  } finally {
    await page.close()
  }
}

////////////////
// ## Helpers
////////////////

/** Copy the epic's page and parts as they are;  returns every To review chip, `{ phase, item }`, in page order. */
function copyEpic() {
  const source = join(EpicConfig.contentOf(ROOT), "epics", from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-mark-click:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", NAME)
  mkdirSync(join(folder, "parts"), { recursive: true })
  const found = []
  for (const part of readdirSync(join(source, "parts"))) {
    const text = readFileSync(join(source, "parts", part))
    writeFileSync(join(folder, "parts", part), text)
    const toReview = /<epic-field name="to-review"[^>]*>([\s\S]*?)<\/epic-field/.exec(text.toString())?.[1] ?? ""
    for (const [, item] of toReview.matchAll(/<epic-mark item="([^"]+)" link/g))
      found.push({ phase: part.replace(/\.html$/, ""), item })
  }
  const html = readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${NAME}"`)
  writeFileSync(join(folder, `${NAME}.plan.html`), html)
  // only the chips whose phase the skeleton holds, and whose item it has
  return found.filter((chip) => html.includes(`id="${chip.phase}"`) && html.includes(`id="${chip.item}"`))
}

/** Open the copy in `window`:  the page itself, or in an iframe filling it (VS Code's side bar). */
async function openPage(window, logs) {
  const page = await BrowserPage.newPage(browser, {
    viewport: { width: window.width, height: window.height },
    routes: bundleRoutes(bundle),
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.addInitScript(HELPERS)
  const url = `${server.base}/epics/${NAME}/${NAME}.plan.html`
  let frame = page.mainFrame()
  if (window.framed) {
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style><iframe src="${url}"></iframe>`
    )
    const handle = await page.waitForSelector("iframe")
    frame = await handle.contentFrame()
    await frame.waitForLoadState("load")
  } else await page.goto(url)
  await frame.waitForFunction(() => customElements.get("epic-mark") && document.querySelector("epic-phase"), null, {
    timeout: 15_000
  })
  await frame.waitForTimeout(1500)
  return { page, frame }
}

/** Where `frame` sits in the page, px:  the mouse moves in the page's coordinates. */
async function frameOffset(page, frame) {
  if (frame === page.mainFrame()) return { x: 0, y: 0 }
  const box = await (await frame.frameElement()).boundingBox()
  return { x: box.x, y: box.y }
}

/** The page-side helpers, in the epic page's frame. */
function HELPERS() {
  if (!location.pathname.endsWith(".plan.html")) return

  /** The chip's link, in its phase's To review field. */
  const chipLink = ({ phase, item }) =>
    document
      .getElementById(phase)
      ?.querySelector(`epic-field[name="to-review"] epic-mark[item="${item}"]`)
      ?.shadowRoot?.querySelector("a") ?? null

  /**
   * Open the chip's phase (its part loads), scroll the chip mid-screen;  `filtered`:  first filter its item's section
   * to a state the item isn't in, as its chips would.  Resolves true once the chip shows.
   */
  globalThis.placeChip = async (chip, filtered) => {
    const item = document.getElementById(chip.item)
    if (filtered) {
      const section = item.closest("epic-section")
      const state = item.getAttribute("state") === "attention" ? "open" : "attention"
      section.showStates([state])
    }
    const phase = document.getElementById(chip.phase)
    for (let fold = phase; fold; fold = fold.parentElement?.closest("epic-section, epic-phase"))
      fold.setAttribute("open", "")
    for (let tries = 0; tries < 50 && !chipLink(chip)?.getBoundingClientRect().height; tries++)
      await new Promise((settled) => setTimeout(settled, 100))
    const link = chipLink(chip)
    if (!link) return false
    scrollBy(0, link.getBoundingClientRect().top - innerHeight / 2)
    return true
  }

  /** The chip's box in the frame. */
  globalThis.chipBox = (chip) => {
    const rect = chipLink(chip)?.getBoundingClientRect()
    return rect?.height ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null
  }

  /**
   * Where the item `id` is now:  open?  its line's top and height (its shadow root's first box:  the host is
   * `display: contents`), the line under the stuck titles, the window's height;  what hides it, if anything.
   */
  globalThis.landedOn = (id) => {
    const item = document.getElementById(id)
    const line = Array.from(item.shadowRoot?.querySelectorAll("*") ?? []).find(
      (node) => node.getBoundingClientRect().height > 4
    )
    const rect = line?.getBoundingClientRect()
    const page = item.closest("epic-page")
    const stack = parseFloat(getComputedStyle(item).getPropertyValue("--epic-stack")) || 0
    let hiddenBy = ""
    for (let node = item; node && node !== page; node = node.parentElement)
      if (node.hasAttribute("data-epic-filtered")) hiddenBy = `${node.id} filtered`
      else if (node.matches(":state(hidden)")) hiddenBy = `${node.id} hidden`
    return {
      open: item.hasAttribute("open"),
      top: Math.round(rect?.top ?? 0),
      height: Math.round(rect?.height ?? 0),
      line: Math.round(stack),
      window: innerHeight,
      hiddenBy
    }
  }
}
