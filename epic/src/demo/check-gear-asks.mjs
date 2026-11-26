/**
 * Check the epic page gear's ASKS (epic `epic-engine` T174) in a real browser, on a copy of a real epic page:
 * Where are we?, Merge and push, Tidy, Hush settled items, Start fresh, in Owen's order;  each icon drawn, every
 * icon in one column and every name on one line;  each row's click asks the page server for its ask;
 * light and dark screenshots to look at.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-gear-asks.mjs [--doc <name>] [outDir]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox, copied to
 *   `src/demo/shots/gear-asks/epics/gear-sample/` (git-ignored), with an `epics/home.json5` naming it the tooling
 *   home, so Merge and push shows
 * - the server:  a page server of its OWN (`DemoServer`) over the copy:  its `start()` records each ask, types nothing
 * - fails (exit 1) on a page error, a row out of order or out of line, an icon not drawn, or an ask not asked
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
const CONTENT = join(HERE, "shots", "gear-asks")
const TSCONFIG = join(ROOT, "tsconfig.json")

if (!process.env.CHECK_GEAR_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_GEAR_UNDER_TSX: "1", TSX_TSCONFIG_PATH: TSCONFIG }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")

const args = process.argv.slice(2)
const from = args.includes("--doc") ? args[args.indexOf("--doc") + 1] : "epic-engine"
const out = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--doc") ?? CONTENT
const SAMPLE = "gear-sample"
/** Owen's order (2026-11-26):  each row's `value`, a divider as `-` */
const ORDER = ["status", "bells", "focus", "push", "-", "tidy", "hush", "fresh", "-", "autoSend", "theme"]
const ASKS = ["status", "push", "tidy", "hush", "fresh"]
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
  for (const scheme of ["light", "dark"]) await look(scheme)
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
summary.asked = server.starts
const asked = ASKS.map((ask) => `${SAMPLE}:${ask}`)
for (const each of asked) if (!server.starts.includes(each)) problems.push(`never asked:  ${each}`)
console.log(JSON.stringify(summary, null, 2))
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}

/** Open the page in `scheme`;  open the gear, measure its rows, shoot;  click each ask (the last scheme only). */
async function look(scheme) {
  const logs = []
  const page = await BrowserPage.newPage(browser, {
    viewport: { width: 1200, height: 900 },
    colorScheme: scheme,
    context: { deviceScaleFactor: 2, reducedMotion: "reduce" },
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.addInitScript(() => (window.pageRoot = () => document.querySelector("epic-page")?.shadowRoot))
  await page.goto(url)
  await page
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${scheme}:  never reviewed`))
  const openGear = async () => {
    await page.evaluate(() => pageRoot().querySelector('[part~="gear"]').click())
    await page
      .waitForFunction(() => pageRoot().querySelector(".push-row"), null, { timeout: 6000 })
      .catch(() => problems.push(`${scheme}:  no Merge and push in the gear (the tooling home's)`))
    await page.waitForTimeout(400)
  }
  await openGear()
  const found = await page.evaluate(() => {
    const rows = pageRoot().querySelector(".push-row")?.parentElement
    if (!rows) return null
    const order = Array.from(
      rows.children,
      (child) => child.getAttribute("value") ?? (child.localName === "ui-divider" ? "-" : child.localName)
    )
    const leads = Array.from(rows.querySelectorAll(".lead"))
    // an icon drawn:  some box with size inside it (its shadow root's glyph)
    const drawn = (icon) => {
      const inner = icon.shadowRoot ? Array.from(icon.shadowRoot.querySelectorAll("*")) : []
      return [icon, ...inner].some((each) => {
        const rect = each.getBoundingClientRect()
        return rect.width > 4 && rect.height > 4
      })
    }
    const lefts = (elements) => [...new Set(elements.map((each) => Math.round(each.getBoundingClientRect().left)))]
    return {
      order,
      icons: leads.map((icon) => [icon.getAttribute("name"), drawn(icon)]),
      leadLefts: lefts(leads),
      nameLefts: lefts(leads.map((icon) => icon.nextElementSibling)),
      words: Array.from(rows.querySelectorAll(".ask-row"), (row) => [row.value, row.textContent.trim()]),
      tips: Array.from(rows.querySelectorAll(".ask-row [data-tooltip]"), (each) => each.dataset.tooltip)
    }
  })
  summary[scheme] = found
  if (!found) problems.push(`${scheme}:  no gear rows`)
  else {
    if (found.order.join() !== ORDER.join())
      problems.push(`${scheme}:  order ${found.order.join()} isn't ${ORDER.join()}`)
    for (const [name, drawn] of found.icons) if (!drawn) problems.push(`${scheme}:  icon ${name} not drawn`)
    if (found.leadLefts.length !== 1) problems.push(`${scheme}:  icons in ${found.leadLefts.length} columns`)
    if (found.nameLefts.length !== 1) problems.push(`${scheme}:  names start at ${found.nameLefts.join(", ")}`)
  }
  await shot(page, `gear-${scheme}.png`)
  if (scheme === "dark") {
    for (const ask of ASKS) {
      await page.evaluate((each) => pageRoot().querySelector(`.${each}-row`)?.click(), ask)
      await page.waitForTimeout(600)
      await openGear()
    }
  }
  if (logs.length) problems.push(`${scheme}:  ${logs.join(" | ")}`)
  await page.close()
}

/** A screenshot into `out`, listed in the summary. */
async function shot(page, name) {
  await page.screenshot({ path: join(out, name), clip: { x: 700, y: 0, width: 500, height: 520 } })
  summary.shots.push(join(out, name))
}

/** Copy epic `from`'s page (skeleton and parts) as `SAMPLE`, the tooling home. */
function copyEpic() {
  const source = join(EPICS, from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-gear-asks:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", SAMPLE)
  mkdirSync(join(folder, "parts"), { recursive: true })
  const parts = join(source, "parts")
  if (existsSync(parts))
    for (const part of readdirSync(parts)) writeFileSync(join(folder, "parts", part), readFileSync(join(parts, part)))
  const html = readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${SAMPLE}"`)
  writeFileSync(join(folder, `${SAMPLE}.plan.html`), html)
  writeFileSync(join(CONTENT, "epics", "home.json5"), `{ "epic": "${SAMPLE}" }\n`)
  mkdirSync(join(CONTENT, "packages"), { recursive: true })
}
