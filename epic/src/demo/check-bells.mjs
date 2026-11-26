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
  // the last group, Background programs:  its steps by cost, the timesaver last (T171)
  await page.evaluate(() => bellsRoot().querySelector(".group:last-of-type").scrollIntoView({ block: "end" }))
  await page.waitForTimeout(200)
  await shot(page, `bells-background-${width}-${scheme}.png`)
  await page.evaluate(() => bellsRoot().querySelector(".scroller").scrollTo(0, 0))

  // the slider to Low, by its keys:  the switches follow at once
  await page.evaluate(() => thumb().focus())
  await page.keyboard.press("Home")
  await page.waitForTimeout(300)
  const low = await page.evaluate(() => ({ shown: shown(), design: isOn("designReview"), stuck: isOn("stopStuckTests") }))
  if (low.shown !== "low" || low.design || !low.stuck) problems.push(`${where}:  the slider at Low:  ${JSON.stringify(low)}`)
  await shot(page, `bells-low-${width}-${scheme}.png`)

  // a hand flip below High:  Custom
  await page.evaluate(() => rowOf("designReview").querySelector("ui-checkbox").click())
  await page.waitForTimeout(300)
  const custom = await page.evaluate(() => ({ shown: shown(), design: isOn("designReview") }))
  if (custom.shown !== "custom" || !custom.design) problems.push(`${where}:  a flip at Low:  ${JSON.stringify(custom)}`)
  await measure(page, where, "custom")
  await shot(page, `bells-custom-${width}-${scheme}.png`)

  // Escape drops the draft:  open again, High as saved
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => !bellsEl().open, null, { timeout: 4000 }).catch(() => problems.push(`${where}:  Escape didn't close it`))
  await openFromGear(page, where)
  if ((await page.evaluate(() => shown())) !== "high") problems.push(`${where}:  Escape kept the draft`)

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
  // its bell drawn, in the icon column the other rows' icons (Focus mode's, Tidy's) share (T171)
  const icons = await page.evaluate(async () => {
    const leads = [...pageRoot().querySelectorAll(".gear-panel [role=menu] ui-icon.lead")]
    await new Promise((done) => setTimeout(done, 300))
    return leads.map((icon) => {
      const drawn = icon.shadowRoot?.querySelector("svg")
      const box = (drawn ?? icon).getBoundingClientRect()
      return { name: icon.getAttribute("name"), drawn: Boolean(drawn) && box.width > 0, x: +(box.left + box.width / 2).toFixed(1) }
    })
  })
  const bell = icons.find((icon) => icon.name === "bell")
  if (!bell?.drawn) problems.push(`${where}:  the gear's bell isn't drawn:  ${JSON.stringify(icons)}`)
  if (icons.some((icon) => Math.abs(icon.x - icons[0].x) > 0.75)) problems.push(`${where}:  gear icons not in one column:  ${JSON.stringify(icons)}`)
  summary[`${where} gear icons`] = icons
  if (!summary.gearShot) {
    summary.gearShot = true
    await shot(page, `bells-gear-${where.replace(" ", "-")}.png`)
  }
  await page.evaluate(() => pageRoot().querySelector(".bells-row")?.click())
  await page
    .waitForFunction(() => bellsEl()?.open && !rowOf("designReview")?.querySelector("ui-checkbox")?.hasAttribute("disabled"), null, {
      timeout: 6000
    })
    .catch(() => problems.push(`${where}:  it didn't open with its switches`))
  await page.waitForTimeout(500)
}

/**
 * Nothing wider than the window;  each row's toggle on its title's first line, its cost badge under it, both centred in
 * the switch column, every row's column the same (T171);  the Token burn band one row:  its name and the slider side by
 * side, no line under them, Custom drawn only when it reads Custom.
 */
async function measure(page, where, when) {
  const found = await page.evaluate(() => {
    const rows = [...bellsRoot().querySelectorAll(".row")]
    const off = []
    const centres = new Set()
    const sides = new Set()
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
      const side = row.querySelector(".side").getBoundingClientRect()
      const lineMid = line.top + line.height / 2
      const toggleMid = t.top + t.height / 2
      const toggleX = t.left + t.width / 2
      const badgeX = badge.left + badge.width / 2
      const sideX = side.left + side.width / 2
      centres.add(Math.round(toggleX * 2) / 2)
      sides.add(`${Math.round(side.left)}-${Math.round(side.width)}`)
      if (Math.abs(toggleMid - lineMid) > 1.5) off.push(`${row.dataset.step}:  toggle ${(toggleMid - lineMid).toFixed(1)} off the title's line`)
      if (Math.abs(toggleX - sideX) > 0.75 || Math.abs(badgeX - sideX) > 0.75)
        off.push(`${row.dataset.step}:  toggle ${(toggleX - sideX).toFixed(1)}, badge ${(badgeX - sideX).toFixed(1)} off the column's centre`)
      if (badge.top < t.bottom) off.push(`${row.dataset.step}:  badge not under the toggle`)
      if (badge.left < side.left - 0.5 || badge.right > side.right + 0.5) off.push(`${row.dataset.step}:  badge wider than the column`)
    }
    const burn = bellsRoot().querySelector(".burn")
    const name = burn.querySelector(".burn-name").getBoundingClientRect()
    const slider = burn.querySelector("ui-slider").getBoundingClientRect()
    const band = burn.getBoundingClientRect()
    const box = bellsRoot().querySelector(".bells").getBoundingClientRect()
    return {
      rows: rows.length,
      off,
      centres: [...centres],
      sides: [...sides],
      burn: {
        height: Math.round(band.height),
        oneRow: name.top >= slider.top - 0.5 && name.bottom <= slider.bottom + 0.5,
        nameMidToSliderMid: +(name.top + name.height / 2 - (slider.top + slider.height / 2)).toFixed(1),
        line: Boolean(burn.querySelector(".burn-note")),
        custom: Boolean(burn.querySelector(".burn-custom")),
        shown: burn.dataset.shown
      },
      wide: box.right > innerWidth + 0.5 || box.left < -0.5,
      scrollX: document.documentElement.scrollWidth - innerWidth
    }
  })
  if (found.off.length) problems.push(`${where} ${when}:  rows out of line:  ${found.off.join("; ")}`)
  if (found.centres.length > 1) problems.push(`${where} ${when}:  toggles not in one column:  ${found.centres}`)
  if (found.sides.length > 1) problems.push(`${where} ${when}:  switch columns differ:  ${found.sides}`)
  if (!found.burn.oneRow) problems.push(`${where} ${when}:  Token burn not on one row:  ${JSON.stringify(found.burn)}`)
  if (found.burn.line) problems.push(`${where} ${when}:  a line under the slider`)
  if (found.burn.custom !== (found.burn.shown === "custom")) problems.push(`${where} ${when}:  the Custom chip:  ${JSON.stringify(found.burn)}`)
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
  window.shown = () => bellsRoot().querySelector(".burn").dataset.shown
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
