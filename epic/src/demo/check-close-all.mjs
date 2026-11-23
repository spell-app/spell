/**
 * Check a section's Close all in a real browser (epic `epic-engine` T158):  the Judgement calls, Issues and Todos
 * sections' title button on a reviewed epic page, its confirm, its notice and Undo.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-close-all.mjs [outDir]
 * - the page:  the tool's test fixture as epic `close-all`, in `src/demo/shots/close-all/` (git-ignored), with J1-J3
 *   decided, J4 open, I1 and I2 fixed for review, T1 done;  J3 carries a mark of the person's, so it never counts
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - checks:
 *   - "Close 2 decided" on Judgement calls (J3's mark leaves it out), "Close 2 fixed" on Issues, "Close 1 done" on Todos
 *   - a click asks first, naming how many;  OK closes both calls, grey;  the notice says so, with Undo
 *   - Undo puts them back, open to tick again;  the button counts 2 again
 *   - no page errors
 * - screenshots in outDir:  `close-all-light.png`, `close-all-dark.png`, `close-all-phone.png` (the Judgement calls
 *   title), `close-all-confirm.png`, `close-all-notice.png`
 * - exits 1 on any miss
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_CLOSE_ALL_UNDER_TSX) {
  const run = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, CHECK_CLOSE_ALL_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
  })
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")
const { PlanDoc } = await import("spell/epic/tool/PlanDoc.ts")
const { PlanDocFiles } = await import("spell/epic/tool/PlanDocFiles.ts")
const { ReviewInbox } = await import("spell/epic/tool/ReviewInbox.ts")

const NAME = "close-all"
const CONTENT = join(HERE, "shots", NAME)
const FOLDER = join(CONTENT, "epics", NAME)
const FILE = join(FOLDER, `${NAME}.plan.html`)
const outDir = process.argv[2] ?? mkdtempSync(join(tmpdir(), "close-all-"))

const misses = []
const check = (isOk, what) => {
  console.log(`${isOk ? "ok  " : "MISS"}  ${what}`)
  if (!isOk) misses.push(what)
}

////////////////
// ## The page
////////////////

rmSync(CONTENT, { recursive: true, force: true })
mkdirSync(FOLDER, { recursive: true })
const fixture = readFileSync(join(ROOT, "tests", "tool", "fixtures", "epic-plan.html"), "utf8")
// without the fixture's highlight.js from cdnjs, as today's pages are:  the server swaps it for its own copy in the page
// it sends with a change, which the page's own source doesn't match, so every edit reloaded the page
const plan = PlanDoc.parse(
  fixture.replace('epic="demo"', `epic="${NAME}"`).replace(/\s*<script src="https:\/\/cdnjs[^>]*><\/script>/, "")
)
for (const title of ["Keep the toolbar at the top", "Name the files by their component", "Draw the chips in colour"]) {
  plan.addItem("judgement", title, { calm: true })
}
for (const id of ["j1", "j2", "j3"]) plan.setItem(id, "done")
plan.addItem("judgement", "Which font for the headings", { calm: true })
for (const title of ["The popup covers its button", "The count is one too many"]) {
  const id = plan.addItem("issue", title)
  plan.item(id).setAttribute("urgent", "")
  plan.fixedForReview(id, "the fix")
}
plan.addItem("todo", "Add a Close all button")
plan.setItem("t1", "done")
const files = new PlanDocFiles({ root: CONTENT })
await files.writeDoc(FILE, plan, true)
// once through the tool's own edit, as every real page is:  its states, "While you were out" and its formatting written,
// so Close all's edit is a small one the page patches in place (the first edit of a page written raw reloads it, and
// takes the notice and its Undo with it)
await files.edit(FILE, (page) => page.log("Demo page ready"))
// J3:  his mark on it, not taken yet
ReviewInbox.update(ReviewInbox.pathFor(FILE), (inbox) => inbox.setMark("j3", { action: "revisit", note: "hmm" }))

////////////////
// ## The browser
////////////////

const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
const logs = []
const url = `${server.base}/epics/${NAME}/${NAME}.plan.html`

/** The Close all button's words in section `id`, or "" when it isn't drawn. */
const words = (page, id) =>
  page.evaluate(
    (section) =>
      document.querySelector(`epic-section#${section}`)?.shadowRoot?.querySelector(".close-all")?.textContent?.trim() ??
      "",
    id
  )

/** A page at `viewport`, in `colorScheme`, open on the Judgement calls, its button drawn. */
async function open(viewport, colorScheme = "light") {
  const page = await BrowserPage.newPage(browser, {
    viewport,
    colorScheme,
    context: { deviceScaleFactor: 2 },
    consoleTypes: ["error", "warning"],
    ignore: /Failed to load resource|LOWERCASE_EVENT_ATTRIBUTE/,
    onProblem: logInto(logs)
  })
  await page.goto(`${url}#judgements`)
  await page.waitForFunction(
    () => document.querySelector("epic-section#judgements")?.shadowRoot?.querySelector(".close-all"),
    null,
    { timeout: 20000 }
  )
  await page.waitForTimeout(500)
  return page
}

/** A shot of section `id`'s title row. */
async function shootTitle(page, id, name) {
  const box = await page.evaluate((section) => {
    const host = document.querySelector(`epic-section#${section}`)
    host.scrollIntoView({ block: "start" })
    const rect = host.getBoundingClientRect()
    return { x: 0, y: Math.max(0, rect.top - 8), width: window.innerWidth, height: window.innerWidth < 600 ? 170 : 120 }
  }, id)
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(outDir, name), clip: box })
}

try {
  const page = await open({ width: 1200, height: 900 })
  check((await words(page, "judgements")) === "Close 2 decided", `Judgement calls:  ${await words(page, "judgements")}`)
  check((await words(page, "issues")) === "Close 2 fixed", `Issues:  ${await words(page, "issues")}`)
  check((await words(page, "todos")) === "Close 1 done", `Todos:  ${await words(page, "todos")}`)
  check((await words(page, "questions")) === "", "no Close all on Questions")
  await shootTitle(page, "judgements", "close-all-light.png")

  // the click asks first
  await page.evaluate(() =>
    document.querySelector("epic-section#judgements").shadowRoot.querySelector(".close-all").click()
  )
  await page.waitForSelector("ui-modal[open], ui-modal:state(open)", { timeout: 5000 }).catch(() => undefined)
  await page.waitForTimeout(600)
  const asked = await page.getByText("Close 2 decided judgement calls?").count()
  check(asked > 0, "the confirm names how many")
  await page.screenshot({ path: join(outDir, "close-all-confirm.png") })
  await page.getByText("Close them", { exact: true }).last().click()
  await page.waitForFunction(
    () => /Closed 2/.test(document.querySelector("[data-spell-notices]")?.shadowRoot?.textContent ?? ""),
    null,
    { timeout: 10000 }
  )
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(outDir, "close-all-notice.png") })
  const after = files.read(FILE)
  check(
    ["j1", "j2"].every((id) => after.item(id).getAttribute("review-as") === "approve"),
    "J1 and J2 closed, as his ✓ would"
  )
  check(!after.item("j3").getAttribute("review-as"), "J3, with his mark on it, left alone")
  check(after.item("j4").getAttribute("status") === "open", "J4, still open, left alone")
  await page.waitForFunction(
    () => !document.querySelector("epic-section#judgements")?.shadowRoot?.querySelector(".close-all"),
    null,
    { timeout: 4000 }
  ).catch(() => undefined)
  check((await words(page, "judgements")) === "", "the button goes once nothing is left to close")

  // Undo
  await page.evaluate(() =>
    document.querySelector("[data-spell-notices]").shadowRoot.querySelector("ui-button").click()
  )
  await page.waitForFunction(
    () => document.querySelector("epic-section#judgements")?.shadowRoot?.querySelector(".close-all"),
    null,
    { timeout: 10000 }
  ).catch(() => undefined)
  const undone = files.read(FILE)
  check(
    ["j1", "j2"].every((id) => !undone.item(id).getAttribute("review-as")),
    "Undo:  J1 and J2 back as they were"
  )
  check((await words(page, "judgements")) === "Close 2 decided", `Undo:  the button back (${await words(page, "judgements")})`)
  await page.close()

  const dark = await open({ width: 1200, height: 900 }, "dark")
  await shootTitle(dark, "judgements", "close-all-dark.png")
  await dark.close()
  const phone = await open({ width: 390, height: 844 })
  await shootTitle(phone, "judgements", "close-all-phone.png")
  await phone.close()
} catch (error) {
  check(false, `the check threw:  ${error.message.split("\n")[0]}`)
} finally {
  await browser.close()
  await server.stop()
}

check(!logs.length, `no page errors${logs.length ? `:  ${logs.join(" | ")}` : ""}`)
console.log(`screenshots:  ${outDir}`)
process.exit(misses.length ? 1 : 0)
