/**
 * Pictures of the staged demo's key moments (epic `epic-engine` P77), from the demo epic as it is now:  run after a
 * step (`epic demo run 03 --quiet` ...) to see what the room will see.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/shoot-staged-demo.mjs <moment> [outFile]
 * - `<moment>`:  what's opened and scrolled to
 *   - `overview`:  the Overview and its parts, then the questions
 *   - `phases`:  the Phases section, each phase open
 *   - `away`:  "0. While you were out"
 *   - `items`:  the judgement calls, todos, issues and manual tests, every colour showing
 * - the copy, the server and the inbox as `shoot-epic-page.mjs`'s:  the demo epic's skeleton and parts copied under
 *   `src/demo/shots/staged-demo/` (git-ignored), served by a page server of its own (`DemoServer`) that wakes nobody
 * - 1280 x 1000, light, at 1x;  writes `outFile` (default `<moment>.png` in the staged demo's `shots/` folder in the
 *   epic folder);  fails (exit 1) on a page error
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.SHOOT_STAGED_DEMO_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, SHOOT_STAGED_DEMO_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")
const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
const { STAGED_DEMO } = await import("spell/epic/command/command.types.ts")

////////////////
// ## Settings
////////////////

/** What each moment opens:  CSS selectors of `<epic-page>`'s children, each set `open`, the first scrolled to. */
const MOMENTS = {
  overview: ["epic-overview", 'epic-section[kind="questions"]'],
  phases: ['epic-section[kind="phases"]'],
  away: ['epic-section[kind="away"]'],
  items: [
    'epic-section[kind="judgements"]',
    'epic-section[kind="todos"]',
    'epic-section[kind="issues"]',
    'epic-section[kind="tests"]'
  ]
}

const [moment, given] = process.argv.slice(2)
if (!MOMENTS[moment]) {
  console.error(`shoot-staged-demo:  which moment?  ${Object.keys(MOMENTS).join(", ")}`)
  process.exit(2)
}
const NAME = STAGED_DEMO.epic
const CONTENT_FOLDER = EpicConfig.contentOf(ROOT)
const out = resolve(given ?? join(CONTENT_FOLDER, STAGED_DEMO.folder, "shots", `${moment}.png`))
const CONTENT = join(HERE, "shots", "staged-demo")
/** Tall enough for an open Overview. */
const SIZE = { width: 1280, height: 1000 }

////////////////
// ## The shot
////////////////

rmSync(join(CONTENT, "epics"), { recursive: true, force: true })
copyEpic()
const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
const logs = []
try {
  const page = await BrowserPage.newPage(browser, {
    viewport: SIZE,
    context: { deviceScaleFactor: 1 },
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto(`${server.base}/epics/${NAME}/${NAME}.plan.html`)
  await page.waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, {
    timeout: 15_000
  })
  const opened = await page.evaluate((selectors) => {
    const found = []
    for (const selector of selectors) {
      const block = document.querySelector(`epic-page > ${selector}`)
      if (!block) continue
      block.open = true
      // its own blocks too:  the Overview's parts, each phase
      for (const inner of block.querySelectorAll(":scope > epic-section, :scope > epic-phase")) inner.open = true
      found.push(selector)
    }
    return found
  }, MOMENTS[moment])
  if (!opened.length) throw new Error(`shoot-staged-demo:  nothing to open for ${moment} on the demo page yet`)
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  // the first opened block's title just under the stuck header and toolbar
  await page.evaluate((selector) => {
    const page = document.querySelector("epic-page")
    const bar = page.shadowRoot.querySelector('[part~="toolbar"]') ?? page.shadowRoot.querySelector('[part~="header"]')
    const first = page.querySelector(`:scope > ${selector}`)
    window.scrollTo(0, first.getBoundingClientRect().top + window.scrollY - bar.getBoundingClientRect().bottom - 12)
  }, opened[0])
  await page.waitForTimeout(600)
  mkdirSync(dirname(out), { recursive: true })
  await page.screenshot({ path: out })
  console.log(`shoot-staged-demo:  wrote ${out}`)
} finally {
  await browser.close()
  await server.stop()
}
if (logs.length) {
  console.error(logs.map((line) => `- ${line}`).join("\n"))
  process.exit(1)
}

////////////////
// ## Helpers
////////////////

/** Copy the demo epic's page (skeleton and parts) into the scratch epic folder, with an inbox of its own. */
function copyEpic() {
  const source = join(CONTENT_FOLDER, "epics", NAME)
  const skeleton = join(source, `${NAME}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`shoot-staged-demo:  no demo epic yet (${skeleton}):  epic demo run 01 --quiet`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", NAME)
  mkdirSync(join(folder, "parts"), { recursive: true })
  for (const part of readdirSync(join(source, "parts")))
    writeFileSync(join(folder, "parts", part), readFileSync(join(source, "parts", part)))
  writeFileSync(join(folder, `${NAME}.plan.html`), readFileSync(skeleton))
  const now = new Date().toISOString()
  const inbox = {
    version: 1,
    marks: {},
    drafts: {},
    urgency: {},
    sent: null,
    now: [],
    working: {},
    canceled: {},
    listening: { session: "shoot-staged-demo", since: now, seen: now, pid: process.pid },
    comments: {},
    woken: null,
    doing: null,
    reviewAsked: null
  }
  writeFileSync(join(folder, `${NAME}.inbox.json5`), JSON.stringify(inbox, null, 2))
}
