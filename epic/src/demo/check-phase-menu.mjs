/**
 * Check a phase's gear menu and its drag by the title (epic `epic-engine` T169, I480;  Owen, 2026-11-26:  "Add to this
 * menu 'Remove this phase' for an unstarted phase.  Above it, add 'Defer this phase' and remove icon from the pill
 * menu";  "Dragging to reorder phases doesn't always seem to work, and you don't see the drag cursor when over the
 * phase title, only when over the background").
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-phase-menu.mjs [--doc <name>] [--bundle <spell-ui.js>] [--tries <n>] [--verbose]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox, as
 *   `src/demo/shots/phase-menu/epics/phase-menu/` (git-ignored):  its first phase done, the second active, every fourth
 *   done after them (hidden by the page's filter), the rest to do, every third one's build plan waiting;  its inbox written here, a session listening
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - what, at 1200 x 760:
 *   - the pills:  no Defer (clock) on any phase
 *   - each phase's gear:  "Defer this phase" and "Remove this phase" on a to-do phase, neither on a started one
 *   - Defer and Remove picked:  each makes its mark (`defer`, `remove`)
 *   - the cursor over a to-do phase's title words, its chevron, its status icon and its row's empty space:  `grab`
 *   - a drag by the title words, the chevron, the status icon and the row's empty space, `--tries` times each (default
 *     4), onto the to-do phase two below, past a done one the page hides:  the phase moves, its `move` mark is made,
 *     and every done phase keeps its place
 * - dragged the way a person does:  the mouse moved onto the title, down, moved in steps, up
 * - fails (exit 1) on any of those not holding, or an error the page logged
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import JSON5 from "json5"

import { after } from "spell/util/timing.ts"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_PHASE_MENU_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_PHASE_MENU_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
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
const tries = Number(flagValue("--tries") ?? 4)
const verbose = args.includes("--verbose")
const CONTENT = join(HERE, "shots", "phase-menu")
const NAME = "phase-menu"
/** How long an inbox file's change takes to settle before a page opens, ms:  else live reload reloads it. */
const SETTLE_MS = 1200
/** The window. */
const WINDOW = { width: 1200, height: 760 }
/** Where in a to-do phase's title row a drag starts. */
const GRIPS = ["words", "chevron", "icon", "space"]
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
  if (!args.includes("--drag-only")) await checkMenus()
  for (const grip of GRIPS) for (let n = 0; n < tries; n++) await dragOnce(grip, n)
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
console.log(`${results.length} checks, every one held`)

/** The pills and the gear's entries, on a started phase and a to-do one;  Defer and Remove picked. */
async function checkMenus() {
  writeInbox()
  await after(SETTLE_MS / 1000)
  const { page, frame } = await openPage("menus")
  try {
    const clocks = await frame.evaluate(() => globalThis.clockPills())
    note("no clock in the pills", clocks === 0, `${clocks} phases still show the clock`)
    // a to-do phase with commits (started once, in the real page):  Defer, no Remove
    for (const which of ["done", "active", "todo", "unstarted"]) {
      const id = await frame.evaluate((which) => globalThis.phaseOf(which)?.id, which)
      if (!id) {
        note(`gear of a ${which} phase`, false, "none on the page")
        continue
      }
      const entries = await openGear(page, frame, id)
      const has = (text) => entries.some((entry) => entry.includes(text))
      note(
        `gear of a ${which} phase`,
        has("Defer this phase") === (which === "todo" || which === "unstarted") &&
          has("Remove this phase") === (which === "unstarted"),
        `entries:  ${entries.join(" | ")}`
      )
      await page.keyboard.press("Escape")
    }
    // Defer, then Remove, each on a to-do phase of its own:  the mark made
    for (const [text, action, nth] of [
      ["Defer this phase", "defer", 0],
      ["Remove this phase", "remove", 1]
    ]) {
      const id = await frame.evaluate((nth) => globalThis.unstartedPhases()[nth]?.id, nth)
      await openGear(page, frame, id)
      // clicked where it's drawn:  the menu draws its entries itself, so the slotted host has no box
      const box = await frame.evaluate(
        ([id, text]) => {
          const rows = []
          const walk = (root) => {
            for (const node of root.querySelectorAll("*")) {
              const rect = node.getBoundingClientRect()
              if (rect.width && rect.height && node.textContent.trim() === text) rows.push(rect)
              if (node.shadowRoot) walk(node.shadowRoot)
            }
          }
          walk(document.getElementById(id).shadowRoot)
          const rect = rows.sort((a, b) => a.width * a.height - b.width * b.height)[0]
          return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        },
        [id, text]
      )
      await page.mouse.click(box.x, box.y)
      const marked = await markMade(id, action)
      note(`${action} from the gear`, marked, `mark:  ${markOf(id)}`)
    }
    await page.screenshot({ path: join(CONTENT, "menus.png") })
  } finally {
    await page.close()
  }
}

/** Open phase `id`'s gear;  its entries' words. */
async function openGear(page, frame, id) {
  await frame.evaluate((id) => globalThis.showPhase(id), id)
  await frame.waitForTimeout(300)
  await frame.locator(`#${id}`).scrollIntoViewIfNeeded()
  await frame.waitForTimeout(300)
  const gear = frame.locator(`#${id}`).locator("ui-dropdown.gear")
  await gear.click()
  await frame.waitForTimeout(400)
  return frame.locator(`#${id}`).locator("ui-dropdown ui-item").allInnerTexts()
}

/**
 * One drag of a to-do phase, pressed on its title row's `grip`, onto the to-do phase two below it:  did it move, and
 * was its mark made?  The cursor there first.
 */
async function dragOnce(grip, n) {
  const tag = `drag-${grip}-${n}`
  writeInbox()
  await after(SETTLE_MS / 1000)
  const { page, frame } = await openPage(tag)
  try {
    const shown = await frame.evaluate((n) => globalThis.showToDo(n), n)
    await frame.waitForTimeout(300)
    await frame.locator(`#${shown}`).scrollIntoViewIfNeeded()
    await frame.evaluate(() => scrollBy(0, -innerHeight / 3))
    await frame.waitForTimeout(300)
    const plan = await frame.evaluate(([grip, n]) => globalThis.planDrag(grip, n), [grip, n])
    if (!plan) {
      note(tag, false, "no to-do phase to drag")
      return
    }
    const { x, y, toY, id, cursor } = plan
    note(`cursor-${grip}-${n}`, cursor === "grab", `cursor ${cursor} at ${Math.round(x)},${Math.round(y)}`)
    await page.mouse.move(x - 40, y + 30)
    await page.mouse.move(x, y, { steps: 4 })
    await frame.waitForTimeout(150)
    await page.mouse.down()
    await page.mouse.move(x, y + 8, { steps: 2 })
    await page.mouse.move(x, toY, { steps: 8 })
    const dragging = await frame.evaluate(() => !!document.querySelector("[data-dragged]"))
    const doneBefore = await frame.evaluate(() => globalThis.donePlaces())
    await page.mouse.up()
    const moved = await frame.evaluate((id) => globalThis.placeOf(id), id)
    const marked = await markMade(id, "move")
    const why = []
    if (!dragging) why.push("no drag started")
    if (moved === plan.from) why.push(`still at ${moved}`)
    if (!marked) why.push("no move mark")
    const doneAfter = await frame.evaluate(() => globalThis.donePlaces())
    if (doneAfter !== doneBefore) why.push(`a done phase moved:  ${doneBefore} -> ${doneAfter}`)
    note(tag, !why.length, why.join(";  "))
  } finally {
    await page.close()
  }
}

////////////////
// ## Helpers
////////////////

/** Phase `id`'s mark in the copy's inbox file:  its action. */
function markOf(id) {
  const inbox = JSON5.parse(readFileSync(join(CONTENT, "epics", NAME, `${NAME}.inbox.json5`), "utf8"))
  return inbox.marks?.[id]?.action
}

/** Wait up to 4 seconds for phase `id`'s mark to be `action`. */
async function markMade(id, action) {
  for (let n = 0; n < 20; n++) {
    if (markOf(id) === action) return true
    await after(0.2)
  }
  return false
}

/** A result, and a problem when it failed. */
function note(tag, ok, why) {
  results.push({ tag, ok, why })
  if (!ok) problems.push(`${tag}:  ${why}`)
}

/** Open the copy;  the page-side helpers in it. */
async function openPage(tag) {
  const logs = []
  const page = await BrowserPage.newPage(browser, {
    viewport: WINDOW,
    routes: bundleRoutes(bundle),
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.addInitScript(HELPERS)
  await page.goto(`${server.base}/epics/${NAME}/${NAME}.plan.html`)
  const frame = page.mainFrame()
  await frame
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${tag}:  never reviewed`))
  await frame
    .waitForFunction(() => globalThis.toDoPhases().some((phase) => phase.matches(":state(movable)")), null, {
      timeout: 8000
    })
    .catch(() => problems.push(`${tag}:  no movable phase drawn`))
  page.on("close", () => logs.length && problems.push(`${tag}:  ${logs.join(" | ")}`))
  return { page, frame }
}

/** The page-side helpers. */
function HELPERS() {
  if (!location.pathname.endsWith(".plan.html")) return

  /** Every phase, in page order. */
  globalThis.phases = () => Array.from(document.querySelectorAll("epic-phase"))
  /** The to-do phases. */
  globalThis.toDoPhases = () => globalThis.phases().filter((phase) => phase.getAttribute("status") === "todo")
  /** The to-do phases not started:  no commits. */
  globalThis.unstartedPhases = () =>
    globalThis
      .toDoPhases()
      .filter((phase) => !phase.hasAttribute("commits") && !phase.querySelector(":scope > epic-commit"))
  /** The first phase in `status`, or `unstarted`;  `todo`:  one with commits, if any. */
  globalThis.phaseOf = (status) => {
    if (status === "unstarted") return globalThis.unstartedPhases()[0]
    const all = globalThis.phases().filter((phase) => phase.getAttribute("status") === status)
    const unstarted = globalThis.unstartedPhases()
    return (status === "todo" && all.find((phase) => !unstarted.includes(phase))) || all[0]
  }
  /** Where the done phases are:  their places, as text. */
  globalThis.donePlaces = () =>
    globalThis
      .phases()
      .flatMap((phase, index) => (phase.getAttribute("status") === "done" ? [index + 1] : []))
      .join(",")
  /** Phase `id`'s place, 1-based. */
  globalThis.placeOf = (id) => globalThis.phases().findIndex((phase) => phase.id === id) + 1
  /** How many phases' pills hold a Defer (clock) button. */
  globalThis.clockPills = () =>
    globalThis
      .phases()
      .filter((phase) =>
        phase.shadowRoot
          ?.querySelector('epic-review[shows="buttons"]')
          ?.shadowRoot?.querySelector('ui-button[data-action="defer"]')
      ).length
  /** Phase `id` on screen, its section open. */
  globalThis.showPhase = (id) => {
    const phase = document.getElementById(id)
    phase.closest("epic-section")?.setAttribute("open", "")
    phase.removeAttribute("open")
    phase.scrollIntoView({ block: "center" })
  }
  /** Phase `phase`'s `ui-section` shadow root. */
  const titleRoot = (phase) => phase.shadowRoot?.querySelector("ui-section")?.shadowRoot
  /** The deepest element at (`x`, `y`), through shadow roots. */
  const deepAt = (x, y) => {
    let hit = document.elementFromPoint(x, y)
    while (hit?.shadowRoot) {
      const deeper = hit.shadowRoot.elementFromPoint(x, y)
      if (!deeper || deeper === hit) break
      hit = deeper
    }
    return hit
  }
  /** The cursor over `hit`, and what it is. */
  const describe = (hit) =>
    hit?.nodeType === 1 ? getComputedStyle(hit).cursor : `nothing (${hit})`
  /**
   * The `n`th to-do phase but the last two, on screen;  where its `grip` is, the cursor there, and the top of the to-do
   * phase two below it (a drop there lands before it).
   */
  globalThis.showToDo = (n) => {
    const todo = globalThis.toDoPhases()
    const phase = todo[n % Math.max(1, todo.length - 2)]
    if (phase) globalThis.showPhase(phase.id)
    return phase?.id
  }
  globalThis.planDrag = (grip, n) => {
    const todo = globalThis.toDoPhases()
    const phase = todo[n % Math.max(1, todo.length - 2)]
    const target = todo[todo.indexOf(phase) + 2]
    if (!phase || !target) return null
    const root = titleRoot(phase)
    const part = { words: "header", chevron: "fold-icon", icon: "icon", space: "title" }[grip]
    const box = root.querySelector(`[part~="${part}"]`).getBoundingClientRect()
    let x = box.left + Math.min(box.width / 2, 40)
    if (grip === "space") {
      // between the title's end and the row's tools
      const words = root.querySelector('[part~="toggle"]').getBoundingClientRect()
      const tools = root.querySelector('[part~="actions"]')?.getBoundingClientRect()
      x = (words.right + (tools?.left ?? box.right)) / 2
    }
    const y = box.top + Math.min(box.height / 2, 18)
    return {
      id: phase.id,
      from: globalThis.placeOf(phase.id),
      x,
      y,
      toY: target.getBoundingClientRect().top + 4,
      cursor: describe(deepAt(x, y))
    }
  }
}

/**
 * Copy epic `from`'s page (skeleton and parts) as `phase-menu`:  building, its first phase done, its second active, the
 * rest to do, every third one's build plan waiting.
 */
function copyEpic() {
  const source = join(EpicConfig.contentOf(ROOT), "epics", from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-phase-menu:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", NAME)
  mkdirSync(join(folder, "parts"), { recursive: true })
  for (const part of readdirSync(join(source, "parts")))
    writeFileSync(join(folder, "parts", part), readFileSync(join(source, "parts", part)))
  let phase = 0
  let html = readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${NAME}"`)
  html = html.replace(/<epic-phase\b([^>]*?)>/g, (_whole, attributes) => {
    const n = phase++
    let kept = attributes.replace(/\s(status|plan|took|done-at)="[^"]*"/g, "")
    // every other to-do phase lists no commits:  not started, so Remove shows on it
    if (n > 1 && n % 2 === 0 && n % 4 !== 3) kept = kept.replace(/\scommits(?=[\s>]|$)/, "")
    // done ones among the to-do ones, as an epic built out of order has them (I480):  the page hides them
    const status = n === 0 || n % 4 === 3 ? "done" : n === 1 ? "active" : "todo"
    const plan = n % 3 === 2 ? "waiting" : "accepted"
    return `<epic-phase${kept} status="${status}" plan="${plan}">`
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
    listening: { session: "check-phase-menu", since: now, seen: now, pid: process.pid },
    comments: {},
    woken: null,
    doing: null,
    reviewAsked: null
  }
  writeFileSync(join(CONTENT, "epics", NAME, `${NAME}.inbox.json5`), JSON.stringify(inbox, null, 2))
}
