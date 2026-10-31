/**
 * Take README-pages.md's picture of an epic page, `docs/images/epic-page.png`, as the page looks today
 * (epic `epic-engine` I177:  the old one still showed the wand and the git toggle).
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/shoot-epic-page.mjs [--doc <name>] [--open <kind,kind>] [--bundle <spell-ui.js>] [outFile]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox, under its own
 *   name in `src/demo/shots/epic-page/epics/` (git-ignored);  its inbox written here:  a session listening, nothing
 *   marked, so the header shows Send with no ring and no spinner
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - 1280 x 856, light, at 1x:  the picture's size since it was first taken
 * - every section folded but the ones `--open` names (`<epic-section kind>`, default `issues`), each
 *   filtered to its coloured items (every chip but the grey one), scrolled to the sections:  the header (Send, the step
 *   label, the gear) and the toolbar's counts stick above them
 * - writes `outFile` (default `docs/images/epic-page.png`);  fails (exit 1) on a page error
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.SHOOT_EPIC_PAGE_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, SHOOT_EPIC_PAGE_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
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
const NAME = flagValue("--doc") ?? "epic-engine"
const OPEN = (flagValue("--open") ?? "issues").split(",").filter(Boolean)
const bundle = flagValue("--bundle")
const FLAGS = ["--doc", "--open", "--bundle"]
const flagged = new Set(FLAGS.flatMap((name) => (args.includes(name) ? [args.indexOf(name) + 1] : [])))
const out = resolve(args.find((arg, index) => !arg.startsWith("--") && !flagged.has(index)) ?? "docs/images/epic-page.png")
const CONTENT = join(HERE, "shots", "epic-page")
/** The picture's size since it was first taken. */
const SIZE = { width: 1280, height: 856 }

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
    routes: bundleRoutes(bundle),
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.emulateMedia({ colorScheme: "light" })
  await page.addInitScript(() => {
    /** An open section's state chips, in their order. */
    window.chipsOf = (kind) => {
      const section = document.querySelector(`epic-page > epic-section[kind="${kind}"]`)
      const filter = section?.shadowRoot?.querySelector("epic-state-filter")
      return [...(filter?.shadowRoot?.querySelectorAll('[part~="chip"]') ?? [])]
    }
  })
  await page.goto(`${server.base}/epics/${NAME}/${NAME}.plan.html`)
  await page.waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, {
    timeout: 15_000
  })
  await page.waitForFunction(
    () => document.querySelector("epic-page")?.shadowRoot?.querySelector('[part~="send"]')?.shadowRoot,
    null,
    { timeout: 8000 }
  )
  for (const kind of OPEN) {
    await page.evaluate((kind) => {
      const section = document.querySelector(`epic-page > epic-section[kind="${kind}"]`)
      if (!section) throw new TypeError(`shoot-epic-page:  no ${kind} section`)
      section.open = true
    }, kind)
  }
  // the open sections' parts load, and the fonts and icons settle
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1500)
  // each open section shows its coloured items only:  the first coloured chip ⌥-clicked (only its state), each next one
  // clicked (its state added), the grey one (older, done) left out;  each after the last has drawn
  for (const kind of OPEN) {
    const states = await page.evaluate(
      (kind) => chipsOf(kind).flatMap((chip) => (chip.dataset.color === "grey" ? [] : [chip.dataset.state])),
      kind
    )
    for (const [order, state] of states.entries()) {
      await page.evaluate(
        ([kind, state, only]) =>
          chipsOf(kind)
            .find((chip) => chip.dataset.state === state)
            ?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, altKey: only })),
        [kind, state, order === 0]
      )
      await page
        .waitForFunction(
          ([kind, state]) =>
            chipsOf(kind).find((chip) => chip.dataset.state === state)?.getAttribute("aria-pressed") !== "false",
          [kind, state],
          { timeout: 4000 }
        )
        .catch(() => undefined)
      await page.waitForTimeout(200)
    }
  }
  await page.waitForTimeout(400)
  // scrolled down to the sections, the meta lines and See Also gone under the header, which sticks:
  // the Overview's title just under the toolbar
  await page.evaluate(() => {
    const page = document.querySelector("epic-page")
    const bar = page.shadowRoot.querySelector('[part~="toolbar"]') ?? page.shadowRoot.querySelector('[part~="header"]')
    const first = page.querySelector(":scope > epic-overview") ?? page.querySelector(":scope > epic-section")
    window.scrollTo(0, first.getBoundingClientRect().top + window.scrollY - bar.getBoundingClientRect().bottom - 12)
  })
  await page.waitForTimeout(600)
  mkdirSync(dirname(out), { recursive: true })
  await page.screenshot({ path: out })
  console.log(`shoot-epic-page:  wrote ${out}`)
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

/** Copy epic `NAME`'s page (skeleton and parts) into the scratch epic folder, with an inbox of its own. */
function copyEpic() {
  const source = join(EpicConfig.contentOf(ROOT), "epics", NAME)
  const skeleton = join(source, `${NAME}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`shoot-epic-page:  no ${skeleton}`)
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
    listening: { session: "shoot-epic-page", since: now, seen: now, pid: process.pid },
    comments: {},
    woken: null,
    doing: null,
    reviewAsked: null
  }
  writeFileSync(join(folder, `${NAME}.inbox.json5`), JSON.stringify(inbox, null, 2))
}
