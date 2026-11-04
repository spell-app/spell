/**
 * Check "0. WHILE YOU WERE OUT" in a real browser (epic `epic-engine` P62):  an epic page after a night, as the epic
 * tool writes it, drawn by this branch.
 *
 * Usage (from `epic/`):
 *   node src/demo/check-away.mjs [--base <page server URL>] [outDir]
 * - `--base`:  a page server running this branch (default this checkout's, `spell server status`)
 * - the page:  a SCRATCH epic page made from the tool's test fixture, a night written on it by `PlanDoc` itself (P1 done,
 *   P2 under way, a red question, an issue, a manual test), at `pages/check-away.html` in the epic folder;  deleted at
 *   the end
 * - checks:
 *   - the section is FIRST on the page, titled "0. While you were out", open by itself
 *   - the page's toolbar has its button, with a red badge
 *   - its What was done and Still to do lines, and a link landing on its item
 *   - each line and part heading an `<epic-away-line>` (I206);  a line's Read applied as `epic inbox apply` would (the
 *     tool's `applyMark()` on `away:q1`, the page rewritten):  that line gone, live, the rest still there
 *   - no page errors
 * - a screenshot:  `away.png` in outDir (default a temporary folder)
 * - exits 1 on any miss;  re-runs itself under `tsx` (the epic tool is TypeScript)
 */
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")
const KIT = resolve(ROOT, "..")

if (!process.env.CHECK_AWAY_UNDER_TSX) {
  const run = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, CHECK_AWAY_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
  })
  process.exit(run.status ?? 1)
}

const { chromium } = await import("playwright")
const { Markup } = await import("spell/epic/markup")
const { PlanDoc } = await import("spell/epic/tool/PlanDoc")

const args = process.argv.slice(2)
const flag = (name) => {
  const at = args.indexOf(name)
  return at < 0 ? undefined : args.splice(at, 2)[1]
}
const base = flag("--base") ?? serverBase()
const outDir = args[0] ?? mkdtempSync(join(tmpdir(), "away-"))
const content = execFileSync(process.execPath, [join(ROOT, "bin/epic"), "config", "contentFolder"], {
  encoding: "utf8"
}).trim()
const PAGE = "pages/check-away.html"
const file = join(content, PAGE)
const night = nightPage()
writeFileSync(file, night.toString())

const misses = []
const check = (isOk, what) => {
  console.log(`${isOk ? "ok  " : "MISS"}  ${what}`)
  if (!isOk) misses.push(what)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${base}/${PAGE}`, { waitUntil: "load" })
  await page.waitForFunction(() => document.querySelector("#away")?.shadowRoot)
  await page.waitForTimeout(2_500)
  const facts = await page.evaluate(() => {
    const away = document.querySelector("#away")
    const page = document.querySelector("epic-page")
    const toggle = away.shadowRoot.querySelector("ui-section")?.shadowRoot?.querySelector('[part~="toggle"]')
    const toolbar = [...document.querySelectorAll(".spell-toolbar ui-item[data-rail]")]
    const item = toolbar.find((each) => each.getAttribute("data-rail") === "away")
    return {
      first: page.firstElementChild === away || [...page.children].find((child) => !child.hasAttribute("slot")) === away,
      title: away.shadowRoot.textContent.includes("0. While you were out"),
      open: toggle?.getAttribute("aria-expanded"),
      rail: !!item,
      badge: item?.querySelector("ui-label")?.textContent?.trim(),
      text: away.textContent.replace(/\s+/g, " "),
      overview: document.querySelector("epic-overview")?.contentsEntry?.label
    }
  })
  check(facts.first, "the section is first on the page")
  check(facts.title, 'titled "0. While you were out"')
  check(facts.open === "true", `it opened by itself (${facts.open})`)
  check(facts.rail, "the toolbar has its button")
  check(facts.badge === "4", `its button's red badge counts what waits (${facts.badge})`)
  check(facts.text.includes("P1 · Build it done: the thing, built"), "What was done names the phase and what it built")
  check(facts.text.includes("Q1 needs your call: Which colour?") && facts.text.includes("M1 to test"), "Still to do, in order, with each item's title")
  check(facts.overview === "1. Overview", `the Overview keeps its number (${facts.overview})`)
  await page.screenshot({ path: join(outDir, "away.png") })
  await page.locator("#away a[href='#q1']").click()
  await page.waitForTimeout(800)
  const landed = await page.evaluate(() => {
    const item = document.querySelector("#q1")
    const box = item?.getBoundingClientRect()
    return !!box && box.top >= 0 && box.top < innerHeight
  })
  check(landed, "a line's link lands on its item")
  const before = await page.evaluate(() => [...document.querySelectorAll("#away epic-away-line")].map((line) => line.getAttribute("line")))
  check(before.includes("done") && before.includes("todo") && before.includes("q1"), `every line and part heading is an <epic-away-line> (${before.join(" ")})`)
  // Owen ticks Q1's line Read, and `epic inbox apply` applies it:  the page rewritten, the live update brings it in
  night.now = new Date(2026, 10, 3, 8, 0)
  night.applyMark({ id: "away:q1", action: "seen" })
  night.refreshAway({ isMerged: () => false })
  writeFileSync(file, night.toString())
  await page
    .waitForFunction(() => !document.querySelector("#away epic-away-line[line='q1']"), undefined, { timeout: 10_000 })
    .catch(() => {})
  const after = await page.evaluate(() => [...document.querySelectorAll("#away epic-away-line")].map((line) => line.getAttribute("line")))
  check(!after.includes("q1") && after.includes("i1") && after.includes("done"), `a line read leaves;  the rest stays (${after.join(" ")})`)
  check(!errors.length, `no page errors${errors.length ? `:  ${errors.join(" / ")}` : ""}`)
} finally {
  await browser.close()
  rmSync(file, { force: true })
}
console.log(`screenshot:  ${join(outDir, "away.png")}`)
process.exit(misses.length ? 1 : 0)

/** An epic page after a night:  the tool's test fixture, the night written on it by `PlanDoc` (kept, to apply a Read). */
function nightPage() {
  const html = readFileSync(join(ROOT, "tests/tool/fixtures/epic-plan.html"), "utf8")
  const plan = PlanDoc.parse(html, new Date(2026, 10, 2, 22, 0), { person: "Owen" })
  plan.addPhase("Build it")
  plan.addPhase("Polish it")
  plan.refreshAway()
  plan.now = new Date(2026, 10, 2, 23, 0)
  plan.log("P1 active")
  plan.setPhase(1, "done", { done: "<ul><li>the thing, built</li></ul>" })
  Markup.place(plan.phase(1), Markup.element(plan.document, "epic-commit", { sha: "a10023c2a0475c4b" }))
  plan.log("P2 active")
  plan.setPhase(2, "active")
  plan.addItem("question", "Which colour?")
  plan.addItem("issue", "It flickers")
  plan.addItem("test", "Try it live")
  plan.updateStates()
  plan.log("Bedtime done:  1 done, 1 part done")
  plan.refreshAway({ isMerged: () => false })
  return plan
}

/** This checkout's page server, from `spell server status`. */
function serverBase() {
  const status = execFileSync(process.execPath, [join(KIT, "bin/spell.mjs"), "server", "status"], { encoding: "utf8" })
  return JSON.parse(status.slice(status.indexOf("{"))).base
}
