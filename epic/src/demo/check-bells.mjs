/**
 * Check BELLS & WHISTLES (`<epic-bells>`, epic `epic-engine` P86) in a real browser, on a copy of a real epic page:
 * opened from the header's gear, the Token burn slider setting the switches, a hand flip showing Custom, Escape
 * dropping the draft, Save keeping it, at 1200 and 390px, light and dark;  rows lined up;  screenshots to look at.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-bells.mjs [--doc <name>] [outDir]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, copied to
 *   `src/demo/shots/bells/epics/bells-sample/` (git-ignored)
 * - the server:  a page server of its OWN (`DemoServer`) over the copy, THIS checkout's pack and routes;  the settings
 *   it saves go to a scratch home (`$SPELL_SETTINGS_HOME`), never yours
 * - fails (exit 1) on a page error, a step that didn't do what it should, a row out of line, or anything wider than
 *   the window
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")
const EPICS = join(EpicConfig.contentOf(ROOT), "epics")
const CONTENT = join(HERE, "shots", "bells")
const TSCONFIG = join(ROOT, "tsconfig.json")

if (!process.env.CHECK_BELLS_UNDER_TSX) {
  const run = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: ROOT,
    env: {
      ...process.env,
      CHECK_BELLS_UNDER_TSX: "1",
      TSX_TSCONFIG_PATH: TSCONFIG,
      SPELL_SETTINGS_HOME: mkdtempSync(join(tmpdir(), "check-bells-home-"))
    }
  })
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")

const args = process.argv.slice(2)
const from = args.includes("--doc") ? args[args.indexOf("--doc") + 1] : "epic-engine"
const out = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--doc") ?? CONTENT
const SAMPLE = "bells-sample"
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

/** At `width`, in `scheme`:  open it from the gear;  the slider, a flip, Escape, Save;  measure, shoot. */
async function look(width, scheme) {
  const logs = []
  const where = `${width} ${scheme}`
  const page = await BrowserPage.newPage(browser, {
    viewport: { width, height: width > 600 ? 900 : 844 },
    colorScheme: scheme,
    context: { deviceScaleFactor: 2, reducedMotion: "reduce" },
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.addInitScript(HELPERS)
  await page.goto(url)
  await page.waitForFunction(() => bellsEl(), null, { timeout: 15_000 }).catch(() => problems.push(`${where}:  no <epic-bells>`))
  await openFromGear(page, where)
  await measure(page, where, "opened")
  await shot(page, `bells-${width}-${scheme}.png`)

  // the slider to Low, by its keys:  the switches follow at once
  await page.evaluate(() => thumb().focus())
  await page.keyboard.press("Home")
  await page.waitForTimeout(300)
  const low = await page.evaluate(() => ({ shown: shown(), design: isOn("designReview"), stuck: isOn("stopStuckTests") }))
  if (low.shown !== "Low" || low.design || !low.stuck) problems.push(`${where}:  the slider at Low:  ${JSON.stringify(low)}`)
  await shot(page, `bells-low-${width}-${scheme}.png`)

  // a hand flip below High:  Custom
  await page.evaluate(() => rowOf("designReview").querySelector("ui-checkbox").click())
  await page.waitForTimeout(300)
  const custom = await page.evaluate(() => ({ shown: shown(), design: isOn("designReview") }))
  if (custom.shown !== "Custom" || !custom.design) problems.push(`${where}:  a flip at Low:  ${JSON.stringify(custom)}`)
  await measure(page, where, "custom")
  await shot(page, `bells-custom-${width}-${scheme}.png`)

  // Escape drops the draft:  open again, High as saved
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => !bellsEl().open, null, { timeout: 4000 }).catch(() => problems.push(`${where}:  Escape didn't close it`))
  await openFromGear(page, where)
  if ((await page.evaluate(() => shown())) !== "High") problems.push(`${where}:  Escape kept the draft`)

  // a switch off, saved;  the page reloaded, still off
  await page.evaluate(() => rowOf("speedTest").querySelector("ui-checkbox").click())
  await page.evaluate(() => bellsRoot().querySelector("ui-button.save").click())
  await page.waitForFunction(() => !bellsEl().open, null, { timeout: 4000 }).catch(() => problems.push(`${where}:  Save didn't close it`))
  await page.reload()
  await page.waitForFunction(() => bellsEl(), null, { timeout: 15_000 })
  await openFromGear(page, where)
  if (await page.evaluate(() => isOn("speedTest"))) problems.push(`${where}:  the saved switch came back on after a reload`)
  // put it back, for the next look
  await page.evaluate(() => rowOf("speedTest").querySelector("ui-checkbox").click())
  await page.evaluate(() => bellsRoot().querySelector("ui-button.save").click())
  await page.waitForFunction(() => !bellsEl().open, null, { timeout: 4000 })

  if (logs.length) problems.push(`${where}:  ${logs.join(" | ")}`)
  await page.close()
}

/** The gear, then its Bells & Whistles row;  wait for the switches to read. */
async function openFromGear(page, where) {
  await page.evaluate(() => pageRoot().querySelector('[part~="gear"]').click())
  await page
    .waitForFunction(() => pageRoot().querySelector(".bells-row"), null, { timeout: 4000 })
    .catch(() => problems.push(`${where}:  no Bells & Whistles in the gear`))
  await page.evaluate(() => pageRoot().querySelector(".bells-row")?.click())
  await page
    .waitForFunction(() => bellsEl()?.open && !rowOf("designReview")?.querySelector("ui-checkbox")?.hasAttribute("disabled"), null, {
      timeout: 6000
    })
    .catch(() => problems.push(`${where}:  it didn't open with its switches`))
  await page.waitForTimeout(500)
}

/** Nothing wider than the window;  each row's switch, title and badge on one line;  the switches in one column. */
async function measure(page, where, when) {
  const found = await page.evaluate(() => {
    const rows = [...bellsRoot().querySelectorAll(".row")].slice(0, 12)
    const off = []
    const lefts = new Set()
    for (const row of rows) {
      const toggle = row.querySelector("ui-checkbox").shadowRoot?.querySelector("label") ?? row.querySelector("ui-checkbox")
      const t = toggle.getBoundingClientRect()
      const title = row.querySelector(".title")
      const range = document.createRange()
      range.selectNodeContents(title)
      const line = range.getClientRects()[0]
      const cost = row.querySelector(".cost")
      // the label's host draws no box:  its drawn label does
      const badge = (cost.shadowRoot?.querySelector(".label") ?? cost).getBoundingClientRect()
      const lineMid = line.top + line.height / 2
      const toggleMid = t.top + t.height / 2
      const badgeMid = badge.top + badge.height / 2
      lefts.add(Math.round(t.left))
      if (Math.abs(toggleMid - lineMid) > 1.5 || Math.abs(badgeMid - lineMid) > 1.5)
        off.push(`${row.dataset.step}:  toggle ${(toggleMid - lineMid).toFixed(1)}, badge ${(badgeMid - lineMid).toFixed(1)}`)
    }
    const box = bellsRoot().querySelector(".bells").getBoundingClientRect()
    return { off, lefts: [...lefts], wide: box.right > innerWidth + 0.5 || box.left < -0.5, scrollX: document.documentElement.scrollWidth - innerWidth }
  })
  if (found.off.length) problems.push(`${where} ${when}:  rows out of line:  ${found.off.join("; ")}`)
  if (found.lefts.length > 1) problems.push(`${where} ${when}:  switches not in one column:  ${found.lefts}`)
  if (found.wide || found.scrollX > 0) problems.push(`${where} ${when}:  wider than the window`)
  summary[`${where} ${when}`] = found
}

/** A screenshot into `out`, listed in the summary. */
async function shot(page, name) {
  await page.screenshot({ path: join(out, name) })
  summary.shots.push(join(out, name))
}

/** The page-side helpers, on `window`. */
function HELPERS() {
  window.pageRoot = () => document.querySelector("epic-page")?.shadowRoot
  window.bellsEl = () => pageRoot()?.querySelector("epic-bells")
  window.bellsRoot = () => bellsEl()?.shadowRoot
  window.rowOf = (key) => bellsRoot()?.querySelector(`.row[data-step="${key}"]`)
  window.isOn = (key) => rowOf(key).querySelector("ui-checkbox").hasAttribute("selected")
  window.shown = () => bellsRoot().querySelector(".burn-shown").textContent.trim()
  window.thumb = () => bellsRoot().querySelector("ui-slider").shadowRoot.querySelector('[role="slider"]')
}

/** Copy epic `from`'s page (skeleton and parts) as `SAMPLE`. */
function copyEpic() {
  const source = join(EPICS, from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-bells:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", SAMPLE)
  mkdirSync(join(folder, "parts"), { recursive: true })
  const parts = join(source, "parts")
  if (existsSync(parts))
    for (const part of readdirSync(parts)) writeFileSync(join(folder, "parts", part), readFileSync(join(parts, part)))
  writeFileSync(join(folder, `${SAMPLE}.plan.html`), readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${SAMPLE}"`))
  mkdirSync(join(CONTENT, "packages"), { recursive: true })
}
