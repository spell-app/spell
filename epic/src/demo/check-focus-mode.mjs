/**
 * Check FOCUS MODE (`<epic-focus>`, epic `epic-engine` P57) in a real browser, on a copy of a real epic page:
 * opened from the header's gear, its tabs, chips and item, Back / Next, at 1200 and 390px, light and dark, nothing
 * wider than the window;  screenshots to look at.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-focus-mode.mjs [--doc <name>] [outDir]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox or details,
 *   copied to `src/demo/shots/focus-mode/epics/focus-sample/` (git-ignored)
 * - the server:  a page server of its OWN (`DemoServer`) over the copy, THIS checkout's pack and routes:  it wakes
 *   nobody, and the page is reviewed (its inbox answers)
 * - at each width and scheme:
 *   - the gear's "Focus mode" opens the overlay:  `focus-<w>-<scheme>.png`
 *   - Next, three times:  `focus-next-<w>-<scheme>.png`;  the Questions tab:  `focus-questions-<w>-<scheme>.png`
 *   - the overlay's widest box never past the window;  its parts lined up (the chips' row and the item's head
 *     inside the window, Back left of Next, Send in the top bar)
 * - fails (exit 1) on a page error, a missing piece, or anything wider than the window
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")
const EPICS = join(EpicConfig.contentOf(ROOT), "epics")
const CONTENT = join(HERE, "shots", "focus-mode")
const TSCONFIG = join(ROOT, "tsconfig.json")

if (!process.env.CHECK_FOCUS_UNDER_TSX) {
  const run = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, CHECK_FOCUS_UNDER_TSX: "1", TSX_TSCONFIG_PATH: TSCONFIG }
  })
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")

const args = process.argv.slice(2)
const from = args.includes("--doc") ? args[args.indexOf("--doc") + 1] : "epic-engine"
const out = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--doc") ?? CONTENT
const SAMPLE = "focus-sample"
const problems = []
const summary = { from, shots: [] }

rmSync(CONTENT, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
copyEpic()

const server = await DemoServer.start({ content: CONTENT })
const url = `${server.base}/epics/${SAMPLE}/${SAMPLE}.plan.html`
summary.url = url
const browser = await BrowserPage.launch()
try {
  for (const width of [1200, 390]) for (const scheme of ["light", "dark"]) await look(width, scheme)
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
console.log(JSON.stringify(summary, null, 2))
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}

/** Open the page at `width`, in `scheme`;  open Focus mode from the gear, step, change tab;  measure, shoot. */
async function look(width, scheme) {
  const logs = []
  const page = await BrowserPage.newPage(browser, {
    viewport: { width, height: width > 600 ? 900 : 844 },
    colorScheme: scheme,
    context: { deviceScaleFactor: 2, reducedMotion: "reduce" },
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.addInitScript(HELPERS)
  await page.goto(url)
  await page
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${width} ${scheme}:  never reviewed`))
  await page.waitForFunction(() => focusEl(), null, { timeout: 8000 }).catch(() => problems.push("no <epic-focus>"))
  // the gear, then its Focus mode row
  await page.evaluate(() => pageRoot().querySelector('[part~="gear"]').click())
  await page
    .waitForFunction(() => pageRoot().querySelector(".focus-row"), null, { timeout: 4000 })
    .catch(() => problems.push(`${width} ${scheme}:  no Focus mode in the gear`))
  await page.evaluate(() => pageRoot().querySelector(".focus-row")?.click())
  await page
    .waitForFunction(() => focusEl()?.open && focusRoot()?.querySelector(".head .chip"), null, { timeout: 6000 })
    .catch(() => problems.push(`${width} ${scheme}:  Focus mode didn't open`))
  await page.waitForTimeout(900)
  await measure(page, width, scheme, "opened")
  await shot(page, `focus-${width}-${scheme}.png`)
  for (let step = 0; step < 3; step++) await page.evaluate(() => focusRoot().querySelector("ui-button.next").click())
  await page.waitForTimeout(500)
  await measure(page, width, scheme, "after Next")
  await shot(page, `focus-next-${width}-${scheme}.png`)
  const hasQuestions = await page.evaluate(() => !!focusRoot().querySelector('.tabs ui-item[data-kind="questions"]'))
  if (hasQuestions) {
    await page.evaluate(() => focusRoot().querySelector('.tabs ui-item[data-kind="questions"]').click())
    await page.waitForTimeout(500)
    await measure(page, width, scheme, "Questions")
    await shot(page, `focus-questions-${width}-${scheme}.png`)
  }
  summary[`${width}-${scheme}`] = await page.evaluate(() => ({
    tabs: Array.from(focusRoot().querySelectorAll(".tabs ui-item"), (item) => item.textContent.replace(/\s+/g, " ").trim()),
    where: focusRoot().querySelector(".where")?.textContent,
    head: focusRoot().querySelector(".head")?.textContent.replace(/\s+/g, " ").trim()
  }))
  if (logs.length) problems.push(`${width} ${scheme}:  ${logs.join(" | ")}`)
  await page.close()
}

/** Nothing wider than the window;  the bars' pieces inside it, Back before Next, Send in the top bar. */
async function measure(page, width, scheme, when) {
  const found = await page.evaluate(() => {
    const box = (element) => element?.getBoundingClientRect()
    const root = focusRoot()
    const back = box(root.querySelector("ui-button.back"))
    const next = box(root.querySelector("ui-button.next"))
    const send = focusEl().querySelector('[slot="send"]')
    return {
      wide: widest(root),
      scrollX: document.documentElement.scrollWidth - innerWidth,
      order: back && next ? back.right <= next.left : false,
      nextInside: next ? next.right <= innerWidth + 0.5 : false,
      send: !!send && !pageRoot().querySelector('header [part~="send"]'),
      // the overlay's own box:  the window's, never shifted or scrolled sideways
      box: (() => {
        const focus = box(root.querySelector(".focus"))
        const dialog = root.querySelector("ui-modal")?.shadowRoot?.querySelector("dialog")
        return { left: Math.round(focus.left), right: Math.round(focus.right), scrolled: dialog?.scrollLeft ?? 0 }
      })()
    }
  })
  const where = `${width} ${scheme} ${when}`
  if (found.wide) problems.push(`${where}:  wider than the window:  ${found.wide}`)
  if (found.scrollX > 0) problems.push(`${where}:  the page scrolls sideways by ${found.scrollX}px`)
  if (!found.order) problems.push(`${where}:  Back isn't left of Next`)
  if (!found.nextInside) problems.push(`${where}:  Next runs past the window`)
  if (!found.send) problems.push(`${where}:  Send isn't in the overlay's bar`)
  const { left, right, scrolled } = found.box
  if (left !== 0 || right !== width || scrolled) problems.push(`${where}:  the overlay's box is ${left}-${right}, scrolled ${scrolled}`)
}

/** A screenshot into `out`, listed in the summary. */
async function shot(page, name) {
  await page.screenshot({ path: join(out, name) })
  summary.shots.push(join(out, name))
}

/** The page-side helpers, on `window`. */
function HELPERS() {
  window.pageRoot = () => document.querySelector("epic-page")?.shadowRoot
  window.focusEl = () => pageRoot()?.querySelector("epic-focus")
  window.focusRoot = () => focusEl()?.shadowRoot
  // what runs past the window's right edge, in `root` and the shadow roots under it, but a scroller's insides
  window.widest = (root) => {
    const found = []
    const walk = (node) => {
      for (const element of node.querySelectorAll("*")) {
        const rect = element.getBoundingClientRect()
        const scrolls = element.closest(".tabs, pre, table, .scroller > .body :is(pre, table)")
        if (rect.width && (rect.right > innerWidth + 0.5 || rect.left < -0.5) && !scrolls)
          found.push(`${element.localName}.${element.className} (${Math.round(rect.right)})`)
        // a scroller's insides scroll in it:  not past the window
        if (element.shadowRoot && !scrolls) walk(element.shadowRoot)
      }
    }
    walk(root)
    return found.slice(0, 6).join(", ")
  }
}

/** Copy epic `from`'s page (skeleton and parts) as `SAMPLE`. */
function copyEpic() {
  const source = join(EPICS, from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-focus-mode:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", SAMPLE)
  mkdirSync(join(folder, "parts"), { recursive: true })
  const parts = join(source, "parts")
  if (existsSync(parts))
    for (const part of readdirSync(parts)) writeFileSync(join(folder, "parts", part), readFileSync(join(parts, part)))
  const html = readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${SAMPLE}"`)
  writeFileSync(join(folder, `${SAMPLE}.plan.html`), html)
  // the tool links a doc's bare file names through its checkout's `packages/`:  the copy's folder has none
  mkdirSync(join(CONTENT, "packages"), { recursive: true })
}
