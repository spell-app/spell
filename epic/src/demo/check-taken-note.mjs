/**
 * Check a note Claude has TAKEN in a real browser (epic `epic-engine` I190;  Owen, 2026-10-31:  "I typed the comment in
 * at a previous send, but the text still shows in the comment box").
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-taken-note.mjs [outDir]
 * - the doc:  a SCRATCH COPY of `review-sample.html`, as `src/demo/shots/taken-note/epics/taken-note/` (git-ignored)
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - Owen's side, clicked and typed:  Revisit on Q1, a note typed (Revisit turns on), the box left (Tab)
 * - Claude's side, on the copy:  the send and `inbox working q1 on` (the mark taken), then the tool's `update q1
 *   underway` (a status card;  the doc changing reloads the page)
 * - fails (exit 1) unless, once taken:
 *   - the note box is EMPTY, and wears no mark
 *   - the note shows quiet and read-only, "You, 10:11 · ...", with no Edit, just above Claude's status card
 *   - a new note typed is a NEW revisit waiting for Send, the taken one kept in the inbox's `taken`
 *   - after a reload, the same:  the box empty, the taken note shown
 * - screenshot (outDir, default `src/demo/shots/`):  `taken-note.png`, the card and both notes
 * - re-runs itself under `tsx` (the page server, `ReviewInbox` and the tool are TypeScript)
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_TAKEN_NOTE_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_TAKEN_NOTE_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")
const { PlanDocCommands } = await import("spell/epic/tool/PlanDocCommands.ts")
const { PlanDocFiles } = await import("spell/epic/tool/PlanDocFiles.ts")
const { ReviewInbox } = await import("spell/epic/tool/ReviewInbox.ts")

////////////////
// ## Settings
////////////////

const NAME = "taken-note"
const CONTENT = join(HERE, "shots", NAME)
const out = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? join(HERE, "shots")
const ID = "q1"
const NOTE = "Some themes want the panes attached, some floating"
const NEW_NOTE = "and the gap a theme setting too"
const folder = join(CONTENT, "epics", NAME)
const file = join(folder, `${NAME}.plan.html`)
const inboxFile = ReviewInbox.pathFor(file)
const problems = []

/**
 * The page-side helpers:  `within(id)` queries item `id`'s shadow root and its review controls' (and their
 * `<ui-textarea>`'s);  `field(id)` is its note box's native textarea.
 */
const HELPERS = `
globalThis.within = (id) => {
  const root = document.getElementById(id).shadowRoot
  const inner = (parent) => Array.from(parent.querySelectorAll("epic-review, ui-textarea"), (it) => it.shadowRoot).filter(Boolean)
  const roots = () => { const controls = inner(root);  return [root, ...controls, ...controls.flatMap(inner)] }
  return {
    querySelector: (selector) => roots().map((it) => it.querySelector(selector)).find(Boolean) ?? null,
    querySelectorAll: (selector) => roots().flatMap((it) => Array.from(it.querySelectorAll(selector)))
  }
}
globalThis.field = (id) => {
  const box = document.getElementById(id).shadowRoot.querySelector("[part~='details'] epic-review[shows='note']")
  return box?.shadowRoot?.querySelector("ui-textarea")?.shadowRoot?.querySelector("textarea") ?? null
}
`

////////////////
// ## The run
////////////////

rmSync(CONTENT, { recursive: true, force: true })
mkdirSync(folder, { recursive: true })
// the tool links a doc's bare file names through its checkout's `packages/`:  the copy has none
mkdirSync(join(CONTENT, "packages"), { recursive: true })
writeFileSync(file, readFileSync(join(HERE, "review-sample.html"), "utf8"))

const tool = new PlanDocCommands({ files: new PlanDocFiles({ root: CONTENT, content: CONTENT }) })
tool.print = () => undefined
tool.warn = () => undefined

const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
const logs = []
try {
  await run()
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
for (const log of logs) problems.push(log)
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}
console.log("check-taken-note:  the taken note shows read-only above Claude's card, the box is empty, a new note is a new mark")

async function run() {
  const page = await BrowserPage.newPage(browser, {
    viewport: { width: 900, height: 1000 },
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.addInitScript(HELPERS)
  await open(page)

  // Owen:  Revisit, a note typed (Revisit turns on at the first words), the box left
  await page.evaluate((id) => globalThis.within(id).querySelector('ui-button[data-action="revisit"]').click(), ID)
  await page.waitForFunction((id) => !!globalThis.field(id), ID, { timeout: 5000 })
  await typeInto(page, NOTE)
  await waitFor("the note saved as a revisit", () => ReviewInbox.read(inboxFile).marks[ID]?.note === NOTE)

  // Claude:  the send taken, its agent at work (`epic inbox working q1 on`):  the inbox alone changes, so the page
  // keeps what it holds in memory, as Owen's did (the doc changing reloads the demo's page)
  ReviewInbox.update(inboxFile, (inbox) => {
    inbox.markSent()
    inbox.setWorking(ID, "revisit")
  })
  if (ReviewInbox.read(inboxFile).taken[ID]?.note !== NOTE) problems.push("the inbox didn't keep the taken mark")
  await page
    .waitForFunction((id) => globalThis.field(id)?.value === "", ID, { timeout: 8000 })
    .catch(() => problems.push("the note box still holds the taken note"))
  await checkTaken(page, "once taken")

  // a NEW note:  a new revisit, waiting for Send;  the taken one kept
  await typeInto(page, NEW_NOTE)
  await waitFor("the new note saved as a new mark", () => ReviewInbox.read(inboxFile).marks[ID]?.note === NEW_NOTE)
  const inbox = ReviewInbox.read(inboxFile)
  if (inbox.marks[ID]?.when !== "soon" || inbox.unsentMarks.length !== 1)
    problems.push(`the new note isn't a revisit waiting for Send:  ${JSON.stringify(inbox.marks[ID])}`)
  if (inbox.taken[ID]?.note !== NOTE) problems.push("the new note replaced the taken one in the inbox's `taken`")

  // Claude's status card (`epic update q1 underway`):  the doc changes, the page reloads;  the taken note above the card
  if ((await tool.run(["status", NAME, ID, "underway", "Weighing attached against floating panes."])) !== 0)
    problems.push("epic update q1 underway failed")
  await page.waitForTimeout(1500)
  await open(page)
  await checkTaken(page, "after the status card and a reload")
  const card = await page.evaluate((id) => !!document.querySelector(`#${id} > epic-status[slot="status"]`), ID)
  if (!card) problems.push("no status card on Q1")
  await page.locator(`#${ID}`).screenshot({ path: join(out, "taken-note.png") })
  const said = await page.evaluate((id) => globalThis.within(id).querySelector("[part~='base'].said")?.textContent ?? "", ID)
  if (!said.includes(NEW_NOTE)) problems.push(`after a reload, the new note isn't shown as his, unsent:  "${said}"`)
  await page.close()
}

/** The page loaded, reviewed, Q1 open. */
async function open(page) {
  await page.goto(`${server.base}/epics/${NAME}/${NAME}.plan.html`)
  await page.waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, {
    timeout: 15_000
  })
  await page.evaluate((id) => {
    for (const fold of document.querySelectorAll("epic-overview, epic-section")) fold.setAttribute("open", "")
    document.getElementById(id).open = true
  }, ID)
  await page.waitForTimeout(600)
}

/** Type `text` into Q1's note box, then leave it (Tab:  saved at once). */
async function typeInto(page, text) {
  await page.evaluate((id) => globalThis.field(id).focus(), ID)
  await page.keyboard.type(text)
  await page.keyboard.press("Tab")
}

/** The taken note:  quiet, read-only, no Edit, just above Claude's status card;  the box empty and unmarked. */
async function checkTaken(page, when) {
  const seen = await page.evaluate((id) => {
    const taken = globalThis.within(id).querySelector("[part~='taken']")
    const details = document.getElementById(id).shadowRoot.querySelector("[part~='details']")
    const order = Array.from(details.children, (it) => it.getAttribute("part") ?? `slot:${it.getAttribute("name")}`)
    const box = globalThis.within(id).querySelector(".note-box")
    return {
      text: taken?.textContent ?? null,
      edit: !!taken?.querySelector("button"),
      order: order.slice(-3),
      field: globalThis.field(id)?.value ?? null,
      mark: box?.getAttribute("data-mark") ?? null
    }
  }, ID)
  if (!seen.text || !/^You, \d+:\d\d ·/.test(seen.text) || !seen.text.includes(NOTE))
    problems.push(`${when}:  the taken note isn't shown as "You, <time> · <note>":  ${JSON.stringify(seen.text)}`)
  if (seen.edit) problems.push(`${when}:  the taken note has a button (Edit?)`)
  if (seen.order.join(",") !== "said,slot:status,note-box")
    problems.push(`${when}:  the order under Q1 is ${seen.order.join(", ")}`)
  if (seen.field !== "" && when === "once taken") problems.push(`${when}:  the box holds "${seen.field}"`)
  if (when !== "once taken" && seen.field?.includes(NOTE)) problems.push(`${when}:  the box holds the taken note`)
  // after the new note, the box wears ITS mark (Later, dashed):  only the taken one must not show there
  if (seen.mark && when === "once taken") problems.push(`${when}:  the box wears the mark ${seen.mark}`)
}

/** Wait for `test()` (node side) to hold, 6s at most. */
async function waitFor(what, test) {
  for (let tries = 0; tries < 60; tries++) {
    if (test()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  problems.push(`never:  ${what}`)
}
