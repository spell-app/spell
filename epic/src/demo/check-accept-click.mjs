/**
 * Check that ONE click on a review button takes, and nothing moves under it (epic `epic-engine` I189;  Owen,
 * 2026-10-31:  "I click the thumbs up, then the page jumps without accepting the click, sometimes scrolls up, sometimes
 * down.  Then I have to click again").
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-accept-click.mjs [--doc <name>] [--bundle <spell-ui.js>] [--verbose]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox, as
 *   `src/demo/shots/accept-click/epics/accept-click/` (git-ignored);  every third phase's build plan waiting
 *   (`plan="waiting"`), the rest to do, their plans accepted;  its inbox written here, a session listening
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - where:  1200 x 760, the page itself;  400 x 760 and 320 x 600 in an IFRAME, as VS Code's side bar shows it
 * - what:  a waiting plan's Accept (thumbs up), Revisit and Defer;  an item's Approve (thumbs up), Revisit and Make
 *   Todo
 * - placed two ways:
 *   - `mid`:  its phase or item folded, the button mid-screen
 *   - `stuck`:  its phase or item OPEN, scrolled into its body, so its title row is stuck under the page's titles, the
 *     button on it:  the case that lost the first click (I189)
 * - clicked the way a person does:  the mouse moved onto the button, down, ~110ms, up
 * - measured at the press (`pointerdown`) and the release (`pointerup`), before any handler runs:  `scrollY` and the
 *   button's box;  then whether the click reached the button
 * - fails (exit 1) when the click didn't reach the button, `scrollY` or the button moved more than 1px between the
 *   press and the release, Accept / Approve / Make Todo made no mark, or the page logged an error
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_ACCEPT_CLICK_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_ACCEPT_CLICK_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
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
const from = flagValue("--doc") ?? "epic-engine"
const bundle = flagValue("--bundle")
const verbose = args.includes("--verbose")
const CONTENT = join(HERE, "shots", "accept-click")
const NAME = "accept-click"
/** How long the button is held down, ms:  a person's click. */
const HOLD_MS = 110
/** How far anything may move between the press and the release, px. */
const TOLERANCE = 1
/** How long an inbox file's change takes to settle before a page opens, ms:  else live reload reloads it. */
const SETTLE_MS = 1200
/** The windows:  the page itself, wide;  in an iframe, narrow, as VS Code's side bar (its Review tab) shows it. */
const WINDOWS = [
  { width: 1200, height: 760, framed: false },
  { width: 400, height: 760, framed: true },
  { width: 320, height: 600, framed: true }
]
/** The buttons:  `family`'s `action` button, its `nth` (a different one each, so each starts unmarked);  `marks`:  a click makes a mark. */
const BUTTONS = [
  { what: "plan-accept", family: "phase", action: "approve", nth: 0, marks: true },
  { what: "plan-revisit", family: "phase", action: "revisit", nth: 1, marks: false },
  { what: "plan-defer", family: "phase", action: "defer", nth: 2, marks: true },
  { what: "item-approve", family: "item", action: "approve", nth: 0, marks: true },
  { what: "item-revisit", family: "item", action: "revisit", nth: 1, marks: false },
  { what: "item-todo", family: "item", action: "todo", nth: 2, marks: true }
]
const PLACES = ["mid", "stuck"]
/** How many buttons of a kind to try for one that can be placed. */
const TRIES = 12
const problems = []
const results = []

////////////////
// ## The run
////////////////

rmSync(join(CONTENT, "epics"), { recursive: true, force: true })
copyEpic()
writeInbox()
const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
try {
  for (const window of WINDOWS)
    for (const place of PLACES) for (const button of BUTTONS) await clickOnce(window, place, button)
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
console.log(`${results.length} clicks, every one took, nothing moved`)

/**
 * One click on `button`, in a fresh page in `window`, placed `place`:  did it reach the button, and did anything move
 * between the press and the release?
 */
async function clickOnce(window, place, button) {
  const tag = `${button.what}-${place}-${window.width}x${window.height}${window.framed ? "-framed" : ""}`
  writeInbox()
  await new Promise((settled) => setTimeout(settled, SETTLE_MS))
  const { page, frame } = await openPage(window, tag)
  try {
    // the first such button from its `nth` on that can be placed:  `stuck` needs an open body taller than the window
    let placed = false
    for (let nth = button.nth; !placed && nth < button.nth + TRIES; nth++) {
      const found = await frame.evaluate(
        ([button, nth, place]) => globalThis.pickTarget(button.family, button.action, nth, place === "stuck"),
        [button, nth, place]
      )
      if (!found) break
      // an opened phase loads its part;  an opened item draws its details
      await frame.waitForTimeout(place === "stuck" ? 800 : 150)
      placed = await frame.evaluate((place) => globalThis.placeTarget(place), place)
      if (!placed) await frame.evaluate(() => globalThis.targetHost()?.removeAttribute("open"))
    }
    if (!placed) return void problems.push(`${tag}:  no ${button.family} ${button.action} button to place ${place}`)
    await frame.waitForTimeout(300)
    const at = await frame.evaluate(() => globalThis.measureTarget())
    if (!at?.hits)
      return void problems.push(`${tag}:  something covers the button before the click (${JSON.stringify(at)})`)
    const x = at.box.left + at.box.width / 2
    const y = at.box.top + at.box.height / 2
    // a person's pointer comes from somewhere else, in a few steps, and rests a moment
    await page.mouse.move(x - 60, y + 40)
    await page.mouse.move(x, y, { steps: 6 })
    await frame.waitForTimeout(200)
    await page.mouse.down()
    await frame.waitForTimeout(HOLD_MS)
    await page.mouse.up()
    const marked = button.marks
      ? await frame
          .waitForFunction(() => globalThis.isMarked(), null, { timeout: 3000 })
          .then(() => true)
          .catch(() => false)
      : true
    const seen = await frame.evaluate(() => globalThis.seen)
    const why = []
    if (!(await frame.evaluate(() => globalThis.loadedOnce))) why.push("the page reloaded under the click")
    const { down, up } = seen
    if (!down || !up) why.push(`no press or release seen (${seen.events.join(", ")})`)
    else {
      if (Math.abs(down.scrollY - up.scrollY) > TOLERANCE)
        why.push(
          `scrollY ${down.scrollY} -> ${up.scrollY} (press handled:  ${seen.pressPrevented}; ${seen.events.join(", ")})`
        )
      if (Math.abs(down.top - up.top) > TOLERANCE || Math.abs(down.left - up.left) > TOLERANCE)
        why.push(`the button ${down.left},${down.top} -> ${up.left},${up.top}`)
    }
    if (!seen.clicked) why.push(`the click missed the button (${seen.events.join(", ")})`)
    if (!marked) why.push("no mark made")
    results.push({ tag, ok: !why.length, why: why.join(";  "), seen, marked })
    if (why.length) problems.push(`${tag}:  ${why.join(";  ")}`)
  } finally {
    await page.close()
  }
}

////////////////
// ## Helpers
////////////////

/**
 * Open the copy in `window`:  the page itself, or in an iframe filling it (VS Code's side bar);  the page-side helpers
 * in its frame.
 */
async function openPage(window, tag) {
  const logs = []
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
    // VS Code's webview:  a page of its own, the epic page in an iframe filling it
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style><iframe src="${url}"></iframe>`
    )
    const handle = await page.waitForSelector("iframe")
    frame = await handle.contentFrame()
    await frame.waitForLoadState("load")
  } else await page.goto(url)
  await frame
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${tag}:  never reviewed`))
  await frame
    .waitForFunction(() => globalThis.reviewButtons("phase", "approve").length > 0, null, { timeout: 8000 })
    .catch(() => problems.push(`${tag}:  no waiting plan's Accept drawn`))
  page.on("close", () => logs.length && problems.push(`${tag}:  ${logs.join(" | ")}`))
  // a reload under the click would reset what it measures:  a mark on this load, looked for after the click
  await frame.evaluate(() => (globalThis.loadedOnce = true))
  return { page, frame }
}

/** The page-side helpers, in the epic page's frame. */
function HELPERS() {
  if (!location.pathname.endsWith(".plan.html")) return

  /** Each `family`'s (`phase`, `item`) review button for `action`, in page order, with its host. */
  globalThis.reviewButtons = (family, action) => {
    const hosts = Array.from(document.querySelectorAll(family === "phase" ? "epic-phase" : "epic-item"))
    return hosts.flatMap((host) => {
      const review = host.shadowRoot?.querySelector('epic-review[shows="buttons"]')
      const kind = review?.getAttribute("buttons")
      if (family === "phase" ? kind !== "plan" : kind !== "item") return []
      const button = review.shadowRoot?.querySelector(`ui-button[data-action="${action}"]`)
      return button ? [{ host, button }] : []
    })
  }

  /** Pick the `nth` such button, every fold holding it open;  its own host too when `open`. */
  globalThis.pickTarget = (family, action, nth, open) => {
    const found = globalThis.reviewButtons(family, action)[nth]
    if (!found) return false
    globalThis.picked = { action, id: found.host.id }
    const holder = (element) => element.parentElement?.closest("epic-section, epic-phase, epic-overview")
    for (let fold = holder(found.host); fold; fold = holder(fold)) fold.setAttribute("open", "")
    if (open) found.host.setAttribute("open", "")
    else found.host.removeAttribute("open")
    return true
  }

  /** The target's host and button, found again:  a redraw may have replaced the button. */
  globalThis.targetHost = () => document.getElementById(globalThis.picked.id)
  globalThis.targetButton = () =>
    globalThis
      .targetHost()
      ?.shadowRoot?.querySelector('epic-review[shows="buttons"]')
      ?.shadowRoot?.querySelector(`ui-button[data-action="${globalThis.picked.action}"]`) ?? null

  /**
   * Scroll so the button is mid-screen (`mid`), or into its OPEN host's body, its title row stuck under the page's
   * titles (`stuck`);  false when it can't.
   */
  globalThis.placeTarget = (place) => {
    const button = globalThis.targetButton()
    if (!button) return false
    if (place === "mid") {
      scrollBy(0, button.getBoundingClientRect().top - innerHeight / 2)
      return true
    }
    const host = globalThis.targetHost()
    const hostTop = host.getBoundingClientRect().top + scrollY
    // a third of a window into its body, at most what's left of it:  its title row sticks
    const into = Math.min(innerHeight / 3, host.getBoundingClientRect().height - innerHeight / 2)
    if (into < 60) return false
    scrollTo(0, hostTop + into)
    const stuck = button.getBoundingClientRect().top > host.getBoundingClientRect().top + 10
    return stuck
  }

  /** The target's box and `scrollY` (rounded to 0.1px), and whether a click at its middle reaches it. */
  globalThis.measureTarget = () => {
    const button = globalThis.targetButton()
    if (!button) return null
    const rect = button.getBoundingClientRect()
    const round = (n) => Math.round(n * 10) / 10
    return {
      scrollY: round(scrollY),
      box: { left: round(rect.left), top: round(rect.top), width: round(rect.width), height: round(rect.height) },
      hits: globalThis.hitsAt(rect.left + rect.width / 2, rect.top + rect.height / 2, button)
    }
  }

  /** Does a click at (`x`, `y`) reach `button`:  the deepest element there, through shadow roots, inside it? */
  globalThis.hitsAt = (x, y, button) => {
    let hit = document.elementFromPoint(x, y)
    while (hit?.shadowRoot) {
      const deeper = hit.shadowRoot.elementFromPoint(x, y)
      if (!deeper || deeper === hit) break
      hit = deeper
    }
    for (let node = hit; node; node = node.parentNode ?? node.host) if (node === button) return true
    return false
  }

  /** Its mark made:  its fill no longer `none`. */
  globalThis.isMarked = () => {
    const fill = globalThis.targetButton()?.dataset.fill
    return !!fill && fill !== "none"
  }

  /**
   * What the page saw of the click, measured as each event STARTS (window, capturing:  before any handler, and before
   * the browser's own focus):  the press, the release, whether a click reached the button, every event in order.
   */
  globalThis.seen = { down: null, up: null, clicked: false, events: [] }
  const where = () => {
    const rect = globalThis.targetButton()?.getBoundingClientRect()
    return {
      scrollY: Math.round(scrollY * 10) / 10,
      left: Math.round(rect?.left * 10) / 10,
      top: Math.round(rect?.top * 10) / 10
    }
  }
  const onTarget = (event) => event.composedPath().includes(globalThis.targetButton())
  // the press, once every handler has had it:  was the browser's own focus (which scrolls) stopped?
  addEventListener("mousedown", (event) => (globalThis.seen.pressPrevented = event.defaultPrevented))
  for (const type of ["pointerdown", "pointerup", "click", "focusin", "scroll"])
    addEventListener(
      type,
      (event) => {
        const seen = globalThis.seen
        seen.events.push(
          `${type}${type === "scroll" ? "" : onTarget(event) ? "@button" : `@${event.composedPath()[0]?.localName}`}@${Math.round(scrollY)}`
        )
        if (type === "pointerdown") seen.down = where()
        if (type === "pointerup") seen.up = where()
        if (type === "click" && onTarget(event)) seen.clicked = true
      },
      { capture: true }
    )
}

/**
 * Copy epic `from`'s page (skeleton and parts) as `accept-click`:  building, every third phase's build plan waiting,
 * the rest to do, accepted.
 */
function copyEpic() {
  const source = join(EpicConfig.contentOf(ROOT), "epics", from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-accept-click:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", NAME)
  mkdirSync(join(folder, "parts"), { recursive: true })
  for (const part of readdirSync(join(source, "parts")))
    writeFileSync(join(folder, "parts", part), readFileSync(join(source, "parts", part)))
  let phase = 0
  let html = readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${NAME}"`)
  html = html.replace(/<epic-phase\b([^>]*?)>/g, (_whole, attributes) => {
    const kept = attributes.replace(/\s(status|plan|took|done-at)="[^"]*"/g, "")
    const plan = phase++ % 3 === 0 ? "waiting" : "accepted"
    return `<epic-phase${kept} status="todo" plan="${plan}">`
  })
  writeFileSync(join(folder, `${NAME}.plan.html`), html)
}

/** The copy's inbox:  a session listening, nothing marked. */
function writeInbox() {
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
    listening: { session: "check-accept-click", since: now, seen: now, pid: process.pid },
    comments: {},
    woken: null,
    doing: null,
    reviewAsked: null
  }
  writeFileSync(join(CONTENT, "epics", NAME, `${NAME}.inbox.json5`), JSON.stringify(inbox, null, 2))
}
