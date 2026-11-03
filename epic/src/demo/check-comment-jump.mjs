/**
 * Check JUMPING TO COMMENTS in a real browser (epic `epic-workflow` P23):  the ids threads show, the toolbar's
 * bullhorn and its count, Cmd / Ctrl + K on a comment's id, and the list of threads waiting on Owen under its box.
 *
 * Usage (from the repo root):
 *   node src/demo/check-comment-jump.mjs [--guide <page>] [--doc <epic>] [--bundle <spell-ui.js>] [outDir]
 * - `--bundle`:  that file served as the pages' `spell-ui.js`, a bundle built elsewhere (a runtime not yet in `_assets/`)
 * - the pages:  a guide (default `guides/python-target.html`) and an epic page (default `epic-workflow`), served by a
 *   page server of its OWN (`DemoServer`:  spell-epic's `EpicServer` on a free port, no pid file), so the runtime is
 *   this branch's bundle;  stopped at the end
 *   - the epic page:  a SCRATCH COPY of `epics/<epic>/` (its skeleton and parts) in `src/demo/shots/jump/epics/`
 *     (git-ignored);  the guide:  the real one, read only (the demo server serves the real `guides/` beside it)
 * - their COMMENTS ARE STUBBED (Playwright's `page.route`):  three threads on each page, on its first top-level
 *   sections (a guide) or its first items (an epic page), Claude having spoken last on the first and the third, so two
 *   wait on Owen.  The ids are keyed `c1` ... as an inbox file keys them
 * - reads and writes NOTHING of the real pages:  no inbox file is read for comments, and every POST to `/api/` is
 *   aborted, so nothing is sent and no session is woken (nor could one be:  the demo server's wake is stubbed)
 * - checks, on each page:
 *   - each thread's header shows its id, `C1` ...
 *   - the toolbar's bullhorn shows, its count 2
 *   - a click lands on the first waiting thread in page order, opened, on screen;  the next on the other;  the next
 *     round to the first again
 *   - Cmd-K lists the two waiting threads under its box, `C1 · ...` then `C3 · ...`;  `C99` says it isn't there and
 *     stays open;  the old spelling `cm3` lands on C3's thread, opened (and Enter doesn't fold it again)
 *   - no page errors
 * - a guide's folded sections show their comments as rows;  a click opens only that section, the thread where the row was
 * - and with no thread waiting:  the bullhorn, no count
 * - screenshots (outDir, default a temporary folder):  `<page>-top.png`, `<page>-landed.png`, `<page>-jump.png`
 * - exits 1 on any miss
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_JUMP_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_JUMP_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { bundleRoutes } = await import("./demoPages.mjs")
const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")
const { pageFile } = await import("spell/epic/tools/pages.js")

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const guide = flag("--guide", "guides/python-target.html")
const epic = flag("--doc", "epic-workflow")
const bundle = flag("--bundle", undefined)
const out =
  args.find((arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--")) ??
  mkdtempSync(join(tmpdir(), "check-comment-jump-"))
mkdirSync(out, { recursive: true })
pageFile(guide)

// the epic page's copy:  its skeleton and parts, never its inbox (as deep as the real one:  its links need no change)
const CONTENT = join(HERE, "shots", "jump")
const source = join(EpicConfig.contentOf(ROOT), "epics", epic)
if (!existsSync(join(source, `${epic}.plan.html`))) {
  console.error(`check-comment-jump:  no epic page ${join(source, `${epic}.plan.html`)}`)
  process.exit(2)
}
rmSync(CONTENT, { recursive: true, force: true })
cpSync(join(source, `${epic}.plan.html`), join(CONTENT, "epics", epic, `${epic}.plan.html`))
if (existsSync(join(source, "parts"))) cpSync(join(source, "parts"), join(CONTENT, "epics", epic, "parts"), { recursive: true })
const served = await DemoServer.start({ content: CONTENT })
const problems = []
const browser = await BrowserPage.launch()

await checkPage("guide", `${served.base}/${guide}`, () =>
  [...document.querySelectorAll("main > ui-section[id], main ui-section[id]")].map((each) => each.id)
)
await checkPage("epic", `${served.base}/epics/${epic}/${epic}.plan.html`, () =>
  [...document.querySelectorAll("epic-item[id]")].map((each) => each.id)
)
await checkPromoted(`${served.base}/${guide}`)
await checkMarkdown(`${served.base}/${guide}`)
await checkNoneWaiting(`${served.base}/${guide}`)

await browser.close()
await served.stop()
console.log(`screenshots:  ${out}`)
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join("\n")}` : "\nall good")
process.exitCode = problems.length ? 1 : 0

/** Say whether `what` held;  a miss counts. */
function check(what, ok, extra = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${extra ? `  (${extra})` : ""}`)
  if (!ok) problems.push(what)
}

/**
 * A new page at `url`, its comments stubbed:  on the first three anchors `anchors()` finds in it, Claude having
 * answered the first and the third (`answered`:  which of the three);  every POST to the page server's API aborted.
 */
async function stubbedPage(url, anchors, answered = [true, false, true], { quote } = {}) {
  const errors = []
  const page = await BrowserPage.newPage(browser, {
    viewport: { width: 1200, height: 900 },
    consoleTypes: [],
    onProblem: (text) => errors.push(text),
    routes: bundleRoutes(bundle)
  })
  page.errors = errors
  await page.route("**/api/**", (route) => (route.request().method() === "POST" ? route.abort() : route.fallback()))
  await page.route("**/api/docs/comments?*", async (route) => {
    const ids = (await page.evaluate(anchors)).slice(0, 3)
    const at = "2026-10-17T10:00:00.000Z"
    const comments = ids.map((anchor, index) => ({
      id: `c${index + 1}`,
      anchor,
      kind: "section",
      label: "",
      excerpt: "",
      ...(quote && index === 0 && { quote }),
      text: `Comment ${index + 1}:  what about this?`,
      at,
      status: answered[index] ? "answered" : "new",
      ...(answered[index] && { replies: [{ by: "Ana", agent: "claude", at, html: "<p>Answered.</p>" }] }),
      turn: answered[index] ? "person" : "agent"
    }))
    await route.fulfill({ json: { takesComments: true, comments } })
  })
  await page.goto(url)
  return page
}

/** Where the page stands:  the bullhorn, the thread the focus is in, the thread ids drawn. */
function state(page) {
  return page.evaluate(() => {
    const box = document.querySelector(".spell-toolbar-waiting")
    // a thread is an `<epic-thread>`:  the focus on its fold, in its shadow root, is the thread's
    const thread = document.activeElement?.closest?.("epic-thread") ?? null
    const rect = thread?.getBoundingClientRect()
    return {
      shown: box ? !box.hidden : false,
      count: box?.querySelector(".spell-toolbar-count")?.textContent ?? null,
      thread: thread?.id ?? null,
      open: thread?.hasAttribute("open") ?? null,
      onScreen: rect ? rect.top >= 0 && rect.top < innerHeight - 40 : null,
      ids: [...document.querySelectorAll("epic-thread")].map(
        (each) => each.shadowRoot?.querySelector('[part~="id"]')?.textContent ?? ""
      )
    }
  })
}

/** Every check on page `name` at `url`, its comments on what `anchors()` finds. */
async function checkPage(name, url, anchors) {
  const page = await stubbedPage(url, anchors)
  try {
    // the toolbar's menu item:  its host has no box of its own (`display: contents`), so attached, not visible
    await page.waitForSelector(".spell-toolbar-waiting:not([hidden])", { state: "attached", timeout: 20_000 })
  } catch {
    check(`${name}:  the toolbar's bullhorn shows`, false)
    await page.screenshot({ path: join(out, `${name}-top.png`) })
    return page.close()
  }
  let now = await state(page)
  check(`${name}:  the toolbar's bullhorn shows, counting 2`, now.shown && now.count === "2", `count ${now.count}`)
  check(`${name}:  each thread shows its id, C1 ...`, now.ids.join(" ") === "C1 C2 C3", now.ids.join(" "))
  await page.screenshot({ path: join(out, `${name}-top.png`) })
  if (name === "guide") await checkFoldAll(page)
  const order = await page.evaluate(() =>
    [...document.querySelectorAll("epic-thread")].filter((each) => each.comment?.turn === "person").map((each) => each.id)
  )
  for (const [step, want] of [
    ["lands on the first waiting thread", order[0]],
    ["goes on to the next", order[1]],
    ["comes round to the first again", order[0]]
  ]) {
    // the button the `<ui-item>` draws, in its shadow root
    await page.click('.spell-toolbar-waiting ui-button, .spell-toolbar-waiting [part~="item"]')
    await page.waitForTimeout(900)
    now = await state(page)
    check(
      `${name}:  a click ${step}, opened, on screen`,
      now.thread === want && now.open && now.onScreen,
      JSON.stringify(now)
    )
    if (step.startsWith("lands")) await page.screenshot({ path: join(out, `${name}-landed.png`) })
  }
  await page.mouse.click(4, 400)
  await page.keyboard.press("ControlOrMeta+k")
  await page.waitForSelector("ui-modal .spell-jump input", { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(400)
  const listed = await page.$$eval(".spell-jump-thread > b", (each) => each.map((id) => id.textContent))
  check(
    `${name}:  Cmd-K lists the threads waiting on Owen, in page order`,
    listed.join(" ") === "C1 C3",
    listed.join(" ")
  )
  await page.screenshot({ path: join(out, `${name}-jump.png`) })
  await page.keyboard.type("C99")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const miss = await page.$eval(".spell-jump-miss", (each) => (each.hidden ? "" : each.textContent)).catch(() => "")
  check(`${name}:  Cmd-K C99 says it isn't there, and stays open`, /No C99/.test(miss), miss)
  await page.fill("ui-modal .spell-jump input", "cm3")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(1200)
  now = await state(page)
  check(
    `${name}:  Cmd-K cm3 (the old spelling) lands on C3's thread, opened, on screen`,
    now.thread === "comment-c3" && now.open && now.onScreen,
    JSON.stringify(now)
  )
  check(`${name}:  no page errors`, page.errors.length === 0, page.errors.join(" | "))
  await page.close()
}

/** A folded section's comments show as rows under its title;  a click opens only its section, the thread where the row was. */
async function checkPromoted(url) {
  const page = await stubbedPage(url, () => [...document.querySelectorAll("main ui-section[id]")].slice(0, 3).map((each) => each.id))
  await page.waitForSelector(".spell-promoted-row", { state: "attached", timeout: 20_000 }).catch(() => {})
  await page.waitForTimeout(300)
  const rows = await page.$$eval(".spell-promoted-row b", (each) => each.map((id) => id.textContent))
  check("guide:  folded sections' comments show as rows", rows.join(" ") === "C1 C2 C3", rows.join(" "))
  const before = await page.$eval(".spell-promoted-row:nth-child(1)", (row) => row.getBoundingClientRect().top)
  await page.screenshot({ path: join(out, "guide-promoted.png") })
  await page.click(".spell-promoted-row")
  await page.waitForTimeout(400)
  const now = await page.evaluate(() => {
    const thread = document.querySelector("#comment-c1")
    return {
      top: thread.getBoundingClientRect().top,
      open: [...document.querySelectorAll("main > * ui-section[collapsible], main ui-section[collapsible]")].filter((each) => each.open).length,
      left: document.querySelectorAll(".spell-promoted-row").length
    }
  })
  await page.screenshot({ path: join(out, "guide-promoted-shown.png") })
  check("guide:  a row's click shows its thread where the row was, one section open", Math.abs(now.top - before) < 6 && now.open === 1 && now.left === 2, JSON.stringify({ before, ...now }))
  await page.close()
}

/**
 * Text drawn by a `<ui-markdown>` takes comments:  selected text opens the pane with its quote;
 * a thread on it shows under its paragraph, its quote highlighted.
 */
async function checkMarkdown(url) {
  const page = await stubbedPage(url, () => [...document.querySelectorAll("main ui-section[id]")].slice(0, 3).map((each) => each.id))
  await page.waitForSelector("ui-markdown", { state: "attached", timeout: 20_000 }).catch(() => {})
  await page.evaluate(() => [...document.querySelectorAll("main ui-section[collapsible]")].forEach((each) => each.removeAttribute("open")))
  await page.waitForTimeout(800)
  const has = await page.evaluate(() => !!document.querySelector("ui-markdown")?.shadowRoot?.querySelector("p"))
  if (!has) return page.close(), check("markdown:  the guide has a <ui-markdown> paragraph", false)
  const quote = await page.evaluate(() => document.querySelector("ui-markdown").shadowRoot.querySelectorAll("p")[1].textContent.slice(0, 30).trim())
  const paragraph = page.locator("ui-markdown p").first()
  const box = await paragraph.boundingBox()
  await paragraph.scrollIntoViewIfNeeded()
  const at = await paragraph.boundingBox()
  await page.mouse.move(at.x + 5, at.y + at.height / 2)
  await page.mouse.down()
  await page.mouse.move(at.x + 150, at.y + at.height / 2, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const floating = await page.evaluate(() => !!getSelection().toString())
  await page.keyboard.press("Meta+i")
  await page.waitForTimeout(300)
  const pane = await page.evaluate(() => {
    const pane = document.querySelector("epic-comment-pane")
    return { open: !!pane, quote: pane?.place?.quote ?? pane?.quote ?? "" }
  })
  await page.screenshot({ path: join(out, "markdown-pane.png") })
  check("markdown:  selected text opens the comment pane", pane.open, JSON.stringify({ floating, ...pane, box: !!box }))
  await page.close()

  const quoted = await stubbedPage(url, () => [...document.querySelectorAll("main ui-section[id]")].slice(0, 3).map((each) => each.id), [true, false, true], { quote })
  await quoted.waitForSelector("epic-thread", { state: "attached", timeout: 20_000 }).catch(() => {})
  await quoted.waitForTimeout(1500)
  await quoted.evaluate(() => document.querySelector("#comment-c1")?.closest("ui-section")?.removeAttribute("open"))
  await quoted.waitForTimeout(500)
  const placed = await quoted.evaluate(() => {
    const thread = document.querySelector("#comment-c1")
    const box = thread?.parentElement
    const slot = box?.assignedSlot
    return {
      inMarkdown: box?.parentElement?.localName,
      afterText: slot?.previousElementSibling?.localName ?? slot?.parentElement?.localName,
      highlighted: CSS.highlights?.get("spell-comment-quote-waiting")?.size + CSS.highlights?.get("spell-comment-quote")?.size,
      top: thread?.getBoundingClientRect().height
    }
  })
  await quoted.$eval("#comment-c1", (each) => each.scrollIntoView({ block: "center" }))
  await quoted.waitForTimeout(200)
  await quoted.screenshot({ path: join(out, "markdown-thread.png") })
  check("markdown:  a quote's thread shows under its paragraph", placed.inMarkdown === "ui-markdown" && placed.afterText === "p" && placed.top > 0, JSON.stringify(placed))
  check("markdown:  its quote is highlighted", placed.highlighted >= 1, JSON.stringify(placed))
  await quoted.close()
}

/** A guide's tools:  one button, Expand all while any section is folded, else Collapse all, then the bullhorn. */
async function checkFoldAll(page) {
  const tip = () => page.$eval(".spell-toolbar-fold", (each) => each.getAttribute("aria-label"))
  const openCount = () =>
    page.evaluate(() => [...document.querySelectorAll("main ui-section[collapsible]")].filter((each) => each.open).length)
  const row = await page.$$eval(".spell-toolbar-tools > *", (each) => each.map((item) => item.className))
  check("guide:  the tools hold the fold button, then the bullhorn", /fold/.test(row[0]) && /waiting/.test(row[1]) && row.length === 2, row.join(" | "))
  check("guide:  it says Expand all while a section is folded", (await tip()) === "Expand all", await tip())
  await page.$eval(".spell-toolbar-fold", (each) => each.click())
  await page.waitForTimeout(200)
  const opened = await openCount()
  check("guide:  it opens everything, then says Collapse all", opened > 3 && (await tip()) === "Collapse all", `${opened} open`)
  await page.$eval(".spell-toolbar-fold", (each) => each.click())
  await page.waitForTimeout(200)
  await page.setViewportSize({ width: 560, height: 700 })
  await page.waitForTimeout(400)
  const narrow = await page.evaluate(() => {
    const bar = document.querySelector(".spell-toolbar")
    const shown = (each) => each && !each.hidden && each.getClientRects().length > 0
    const keys = [...bar.shadowRoot.querySelectorAll("button, ui-button")].filter(shown).length
    return { keys, overflow: bar.matches(":state(overflow)"), scrolling: bar.matches(":state(overflowing)") }
  })
  await page.screenshot({ path: join(out, "guide-narrow.png") })
  await page.setViewportSize({ width: 1200, height: 900 })
  await page.waitForTimeout(300)
  check("guide:  too narrow, the sections scroll with arrows, no overflow button", narrow.scrolling && !narrow.overflow && narrow.keys > 0, JSON.stringify(narrow))
  check("guide:  it folds everything", (await openCount()) === 0, `${await openCount()} open`)
}

/** With no thread waiting on Owen:  the bullhorn, no count (it goes through the open threads). */
async function checkNoneWaiting(url) {
  const page = await stubbedPage(
    url,
    () => [...document.querySelectorAll("main ui-section[id]")].map((each) => each.id),
    [false, false, false]
  )
  await page.waitForSelector("epic-thread", { timeout: 20_000 }).catch(() => {})
  await page.waitForTimeout(500)
  const now = await state(page)
  check("none waiting:  threads drawn, bullhorn with no count", now.ids.length === 3 && now.shown, JSON.stringify(now))
  await page.close()
}
