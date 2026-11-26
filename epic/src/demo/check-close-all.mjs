/**
 * Check a section's Close all in a real browser (epic `epic-engine` T158):  the Judgement calls, Issues and Todos
 * sections' title button on a reviewed epic page:  no confirm, the items drawn closed at once, its notice and Undo.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-close-all.mjs [outDir]
 * - the page:  the tool's test fixture as epic `close-all`, in `src/demo/shots/close-all/` (git-ignored), with J1-J3
 *   decided, J4 open, I1 and I2 fixed for review, T1 done;  J3 carries a mark of the person's, so it never counts
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - checks:
 *   - "Close 2 decided" on Judgement calls (J3's mark leaves it out), "Close 2 fixed" on Issues, "Close 1 done" on Todos
 *   - a click asks nothing (epic `epic-engine` I462):  both calls drawn ticked at once, before the server answers,
 *     the button gone;  then closed on the page;  the notice says so, with Undo
 *   - Undo puts them back, open to tick again;  the button counts 2 again
 *   - held till Send, as his own ✓ on each (epic `epic-engine` J387), beside I1 ticked by hand:  Close all again, J1
 *     and J2 stay in view, their ✓ pressed and their colour held as I1's, Send counting all three;  a second ✓ on J1
 *     puts J1 alone back;  Send lets J2 go exactly as I1, grey
 *   - no page errors
 * - screenshots in outDir:  `close-all-light.png`, `close-all-dark.png`, `close-all-phone.png` (the Judgement calls
 *   title), `close-all-at-once.png`, `close-all-notice.png`
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
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_CLOSE_ALL_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
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

/** Item `id`'s ✓ (Approve), its fill as drawn:  `none` when not pressed. */
const approveFill = (page, id) =>
  page.evaluate((item) => {
    const root = document.getElementById(item)?.shadowRoot
    const review = root?.querySelector("epic-review")?.shadowRoot
    return (review ?? root)?.querySelector('ui-button[data-action="approve"]')?.dataset.fill ?? ""
  }, id)

/** Resolves once `test()` holds, polled;  throws after `ms`. */
async function waitFor(test, ms = 10000) {
  const until = Date.now() + ms
  while (!test()) {
    if (Date.now() > until) throw new Error(`waited ${ms / 1000}s:  ${test}`)
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

/**
 * Item `id` as drawn:  whether it has a box (`shown`, else what hides it), its state (its box's class word:  `old` is
 * grey), its ✓'s fill.
 */
const drawnItem = (page, id) =>
  page.evaluate((item) => {
    const host = document.getElementById(item)
    const root = host?.shadowRoot
    const box = root?.querySelector("[part~='base']")
    const state = ["attention", "progress", "open", "recent", "old"].find((name) => box?.classList.contains(name))
    const review = root?.querySelector("epic-review")?.shadowRoot
    const fill = (review ?? root)?.querySelector('ui-button[data-action="approve"]')?.dataset.fill ?? ""
    let hiddenBy = ""
    for (let node = host; node; node = node.parentElement ?? node.getRootNode()?.host) {
      if (node.hasAttribute?.("data-epic-filtered")) hiddenBy = `${node.id || node.localName} filtered`
      else if (node.matches?.(":state(hidden)")) hiddenBy = `${node.id || node.localName} hidden`
    }
    const shown = !!host && host.getBoundingClientRect().height > 0 && !hiddenBy
    return { shown, hiddenBy, state, fill }
  }, id)

/** A click on item `id`'s ✓ (Approve), as his own:  scrolled to first, as its buttons draw near the screen. */
async function clickApprove(page, id) {
  await page.evaluate((item) => {
    const host = document.getElementById(item)
    host.closest("epic-section")?.setAttribute("open", "")
    host.scrollIntoView({ block: "center" })
  }, id)
  await page.waitForFunction(
    (item) => {
      const root = document.getElementById(item).shadowRoot
      return !!(root.querySelector("epic-review")?.shadowRoot ?? root).querySelector('ui-button[data-action="approve"]')
    },
    id,
    { timeout: 5000 }
  )
  await page.evaluate((item) => {
    const root = document.getElementById(item).shadowRoot
    ;(root.querySelector("epic-review")?.shadowRoot ?? root).querySelector('ui-button[data-action="approve"]').click()
  }, id)
}

/** The header's Send:  its state (`unsent` while anything waits for it) and its tooltip. */
const sendState = (page) =>
  page.evaluate(() => {
    const send = document.querySelector("epic-page").shadowRoot.querySelector("epic-send-buttons")
    return { state: send?.getAttribute("state") ?? "", tip: send?.getAttribute("send-tip") ?? "" }
  })

/** How many marks Send's tooltip says it sends (`Send 3 marks to Claude`):  0 when it names none. */
const marksIn = (send) => Number(/Send (\d+) marks?/.exec(send.tip)?.[1] ?? 0)

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

  // no confirm (I462):  the click closes them, each drawn as his own ✓ draws it AT ONCE, before the server answers
  // (its answer held back here a moment, so "at once" is told apart from "once the page updated")
  let release
  const held = new Promise((resolve) => (release = resolve))
  await page.route("**/api/epics/review/close-all", async (route) => {
    await held
    await route.continue()
  })
  const before = await Promise.all(["j1", "j2"].map((id) => approveFill(page, id)))
  check(
    before.every((fill) => fill === "none"),
    `J1 and J2 not ticked before (${before.join(", ")})`
  )
  await page.evaluate(() =>
    document.querySelector("epic-section#judgements").shadowRoot.querySelector(".close-all").click()
  )
  await page.waitForTimeout(300)
  check((await page.locator("ui-modal[open]").count()) === 0, "no confirm")
  check(
    (await Promise.all(["j1", "j2"].map((id) => approveFill(page, id)))).every((fill) => fill && fill !== "none"),
    "J1 and J2 drawn ticked at once, as his ✓ on each"
  )
  check((await words(page, "judgements")) === "", "the button goes at once:  nothing left to close")
  await page.screenshot({ path: join(outDir, "close-all-at-once.png") })
  release()
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
  await page
    .waitForFunction(
      () => !document.querySelector("epic-section#judgements")?.shadowRoot?.querySelector(".close-all"),
      null,
      { timeout: 4000 }
    )
    .catch(() => undefined)
  check((await words(page, "judgements")) === "", "the button goes once nothing is left to close")

  // Undo
  await page.evaluate(() =>
    document.querySelector("[data-spell-notices]").shadowRoot.querySelector("ui-button").click()
  )
  await page
    .waitForFunction(
      () => document.querySelector("epic-section#judgements")?.shadowRoot?.querySelector(".close-all"),
      null,
      { timeout: 10000 }
    )
    .catch(() => undefined)
  const undone = files.read(FILE)
  check(
    ["j1", "j2"].every((id) => !undone.item(id).getAttribute("review-as")),
    "Undo:  J1 and J2 back as they were"
  )
  check(
    (await words(page, "judgements")) === "Close 2 decided",
    `Undo:  the button back (${await words(page, "judgements")})`
  )

  // held till Send (epic `epic-engine` J387):  "as if I had clicked each manually", so drawn exactly as his own ✓ on
  // I1 (a fixed issue, ticked by hand):  in view, its ✓ pressed, its colour held from before the click (T145), counted
  // in Send;  a second ✓ on one puts that one back;  Send lets the rest go, as it lets I1 go
  const before2 = await drawnItem(page, "j2")
  // what Send counts before:  J3's mark of his
  const marksBefore = marksIn(await sendState(page))
  await page.evaluate(() =>
    document.querySelector("epic-section#judgements").shadowRoot.querySelector(".close-all").click()
  )
  await waitFor(() => ["j1", "j2"].every((id) => files.read(FILE).item(id).getAttribute("review-as") === "approve"))
  await clickApprove(page, "i1")
  await waitFor(() => files.read(FILE).item("i1").getAttribute("review-as") === "approve")
  await page.waitForTimeout(800)
  const single = await drawnItem(page, "i1")
  check(single.shown && single.fill && single.fill !== "none", `I1, ticked by hand:  in view, its ✓ pressed (${single.fill})`)
  for (const id of ["j1", "j2"]) {
    const drawn = await drawnItem(page, id)
    check(drawn.shown, `held:  ${id.toUpperCase()} still in view (${drawn.hiddenBy || "shown"})`)
    check(drawn.fill === single.fill, `held:  ${id.toUpperCase()}'s ✓ pressed as I1's (${drawn.fill} / ${single.fill})`)
    check(drawn.state === before2.state, `held:  ${id.toUpperCase()}'s colour held from before, as I1's (${drawn.state})`)
  }
  const counted = await sendState(page)
  check(marksIn(counted) === marksBefore + 3, `held:  Send counts J1, J2 and I1 (${marksBefore} before;  ${counted.tip})`)

  await clickApprove(page, "j1")
  await waitFor(() => !files.read(FILE).item("j1").getAttribute("review-as"))
  await page.waitForTimeout(800)
  const back = await drawnItem(page, "j1")
  check(back.shown && back.fill === "none", `a second ✓:  J1 back open, its ✓ not pressed (${back.fill})`)
  check(files.read(FILE).item("j2").getAttribute("review-as") === "approve", "a second ✓ on J1:  J2 stays closed")
  check((await drawnItem(page, "j2")).shown, "a second ✓ on J1:  J2 still in view")
  const recounted = await sendState(page)
  check(marksIn(recounted) === marksBefore + 2, `a second ✓ on J1:  Send counts J2 and I1 (${recounted.tip})`)

  await page.locator('epic-page epic-send-buttons [part~="send"]').first().click()
  await page.waitForTimeout(2500)
  const [gone, goneSingle] = [await drawnItem(page, "j2"), await drawnItem(page, "i1")]
  check(
    gone.shown === goneSingle.shown && gone.state === goneSingle.state && gone.fill === goneSingle.fill,
    `Send:  J2 let go as I1 is (J2 ${JSON.stringify(gone)}, I1 ${JSON.stringify(goneSingle)})`
  )
  check(gone.fill !== "dashed" && gone.state === "old", `Send:  J2 no longer pressed, grey (${gone.fill || "no ✓"}, ${gone.state})`)
  check((await drawnItem(page, "j1")).shown, "Send:  J1, open again, stays")
  check((await sendState(page)).state !== "unsent", `Send:  nothing left to send (${(await sendState(page)).state})`)
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
