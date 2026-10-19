/**
 * Check COMMENTS ON EPIC UI'S PAGES in a real browser (epic `epic-engine` P2, T3):  the docs pages' bullhorns, pane,
 * threads and Send, drawn by `spell-comments.js` beside the site's own Spell UI.
 *
 * Usage (from the repo root):
 *   node src/demo/check-comments-epic-ui.mjs [--page <element>] [--docs <folder>] [--bundle <spell-ui.js>]
 *     [--comments <spell-comments.js>] [--keep] [outDir]
 * - `--comments`:  that file served as Epic UI's pages' `spell-comments.js`, one built elsewhere (as `--bundle`)
 * - the pages:  Epic UI's (`--page`, default `epic-item`, then `epic-page` for the router's swap), served as spell-app's
 *   page server serves them, at `/components/epics/`, by a page server of its OWN (`DemoServer`:  this checkout's
 *   `EpicServer` on a free port, no pid file, nobody woken), with the sets' build of Spell UI's site laid over them
 *   (spell-app's `packages/ui/site/_assets/sets/`, built by its page server:  run it once if that folder is missing)
 *   - `--docs`:  the folder served there;  default a SCRATCH COPY of `src/docs/` in `src/demo/shots/epic-ui/`
 *     (git-ignored), so no real inbox is written.  `--docs src/docs` writes the real (git-ignored) inbox beside the
 *     page:  `epic comments list` sees it then
 *   - `--keep`:  leave the comments made;  else each is cleared at the end
 * - checks, at 1200 and 390px:
 *   - no docs bundle on the page (one Spell UI):  only the site's
 *   - the bullhorns:  in the masthead (the page), each section's title row, a table's corner;  one click opens ONE pane
 *   - a comment on the page:  saved as typed (the floppy), its thread drawn under the masthead once the pane closes
 *   - a comment on selected text (⌘ / Ctrl I) in a section's list:  its quote highlighted, its thread in the list item
 *   - Send:  "no epic owns this page" (Epic UI's pages are no epic's), a click sends both
 *   - the router's swap to another page:  that page's bullhorns, no thread from the last;  back:  the threads again
 *   - the server's inbox holds what the page shows
 *   - no page errors
 * - and on a GUIDE (`guides/python-target.html`), served with `--bundle` as its `spell-ui.js` when given:  the docs
 *   runtime still draws bullhorns, and a thread has the comments' look (`spell-comments.css`, through `spell-doc.css`)
 * - screenshots (outDir, default a temporary folder):  `<width>-<step>.png`
 * - exits 1 on any miss
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_EPIC_UI_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_EPIC_UI_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { chromium } = await import("playwright")
const { DemoServer } = await import("./DemoServer.ts")
const { GuideInbox } = await import("../tool/GuideInbox.ts")

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)
const element = flag("--page", "epic-item")
const bundle = flag("--bundle", undefined)
const commentsScript = flag("--comments", undefined)
const keep = args.includes("--keep")
/** The flags that take a value:  the word after one isn't the out folder. */
const VALUED = ["--page", "--docs", "--bundle", "--comments"]
const out =
  args.find((arg, at) => !arg.startsWith("--") && !VALUED.includes(args[at - 1])) ??
  mkdtempSync(join(tmpdir(), "check-comments-epic-ui-"))
mkdirSync(out, { recursive: true })

/** The sets' build of Spell UI's site, as spell-app's page server lays it over a set's folder (`SETS_BUNDLE`). */
const SETS_BUNDLE = join(ROOT, ".spell-app/packages/ui/site/_assets/sets")
if (!existsSync(join(SETS_BUNDLE, "site.js"))) {
  console.error(`check-comments-epic-ui:  no ${SETS_BUNDLE}/site.js:  start spell-app's page server once to build it`)
  process.exit(2)
}

const SHOTS = join(HERE, "shots", "epic-ui")
const docs = flag("--docs", undefined) ? resolve(flag("--docs")) : join(SHOTS, "docs")
if (!flag("--docs", undefined)) {
  rmSync(SHOTS, { recursive: true, force: true })
  cpSync(join(ROOT, "src", "docs"), docs, { recursive: true, filter: (from) => !/\.inbox\.json5?$/.test(from) })
}
const pageUrl = (name) => `${served.base}/components/epics/${name}.html`
const inbox = (name) => GuideInbox.fileFor(join(docs, `${name}.html`))
if (existsSync(inbox(element))) {
  console.error(`check-comments-epic-ui:  ${inbox(element)} exists:  it would be mixed in;  move it first`)
  process.exit(2)
}

// the server mounts Epic UI itself (epic `epic-eject` I21):  told to serve the scratch copy, so no real inbox is written
const served = await DemoServer.start({ content: join(SHOTS, "content"), epicUi: docs })
const problems = []
const browser = await chromium.launch()

for (const width of [1200, 390]) await checkWidth(width)
await checkGuide()

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

/** A new page at `width`, its errors kept. */
async function newPage(width) {
  const page = await browser.newPage({ viewport: { width, height: width > 600 ? 900 : 844 } })
  page.errors = []
  page.on("pageerror", (error) => page.errors.push(String(error)))
  page.on("console", (message) => message.type() === "error" && page.errors.push(message.text()))
  if (commentsScript) {
    const code = readFileSync(resolve(commentsScript))
    await page.route("**/spell-comments.js", (route) => route.fulfill({ body: code, contentType: "text/javascript" }))
  }
  return page
}

/** Every check at `width`. */
async function checkWidth(width) {
  const name = `${width}`
  const page = await newPage(width)
  await page.goto(pageUrl(element))
  try {
    await page.waitForSelector(".site-masthead > .spell-comment-mark.at-page", { state: "attached", timeout: 20_000 })
  } catch {
    check(`${name}:  the bullhorns draw`, false)
    await page.screenshot({ path: join(out, `${name}-none.png`) })
    return page.close()
  }
  const marks = await page.evaluate(() => ({
    docsBundle: document.querySelectorAll('script[src*="spell-ui.js"]').length,
    sheet: !!document.querySelector('link[href$="spell-comments.css"]'),
    page: document.querySelectorAll(".site-masthead > .spell-comment-mark.at-page").length,
    sections: document.querySelectorAll("ui-section > .spell-comment-mark.at-section").length,
    corners: document.querySelectorAll(".spell-comment-mark.at-block").length,
    titles: document.querySelectorAll(".spell-comment-mark.at-title").length
  }))
  check(`${name}:  only the site's Spell UI (no docs bundle), and the comments' sheet`, !marks.docsBundle && marks.sheet)
  check(
    `${name}:  a bullhorn in the masthead, on every section, over blocks`,
    marks.page === 1 && marks.sections > 3 && marks.corners > 0,
    JSON.stringify(marks)
  )

  // the page's bullhorn:  ONE pane, saved as typed, a thread under the masthead once closed
  await page.hover(".site-masthead")
  await page.click(".site-masthead > .spell-comment-mark.at-page > ui-button")
  await page.waitForSelector("epic-comment-pane > textarea", { timeout: 5000 })
  check(`${name}:  the page's bullhorn opens one pane`, (await page.$$("epic-comment-pane")).length === 1)
  await page.keyboard.type(`A comment on the whole page, at ${width}px.`)
  // the pane's floppy:  its `saved` (the tooltip), not `failed`
  await page.waitForSelector("epic-comment-pane[saved]:not([failed])", {
    timeout: 5000
  }).catch(() => {})
  const saved = await page.$("epic-comment-pane[saved]:not([failed])")
  check(`${name}:  the pane saves as Owen types`, !!saved)
  await page.screenshot({ path: join(out, `${name}-pane.png`) })
  await page.keyboard.press("Escape")
  await page.waitForSelector(".site-masthead + epic-threads > epic-thread", { timeout: 5000 }).catch(() => {})
  check(
    `${name}:  the page's comment draws as a thread under the masthead`,
    !!(await page.$(".site-masthead + epic-threads > epic-thread"))
  )

  // selected text in a section's list:  ⌘ / Ctrl I
  const section = await page.evaluate(() => {
    const found = [...document.querySelectorAll("main ui-section[id]")].find((each) =>
      each.querySelector(":scope > ul > li")
    )
    if (!found) return null
    found.collapsed = false
    return found.id
  })
  await page.waitForTimeout(500)
  const quote = await page.evaluate((id) => {
    const li = document.querySelector(`#${CSS.escape(id)} > ul > li`)
    li.scrollIntoView({ block: "center" })
    const text = [...li.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim().length > 8)
    if (!text) return ""
    const start = text.textContent.search(/\S/)
    const range = document.createRange()
    range.setStart(text, start)
    range.setEnd(text, Math.min(text.textContent.length, start + 12))
    getSelection().removeAllRanges()
    getSelection().addRange(range)
    return range.toString()
  }, section)
  await page.waitForTimeout(300)
  await page.keyboard.press("ControlOrMeta+i")
  const textPane = await page.waitForSelector("epic-comment-pane > textarea", { timeout: 5000 }).catch(() => null)
  check(`${name}:  ⌘ I on text selected in section ${section} opens the pane`, !!textPane && !!quote, quote)
  if (textPane) {
    await page.keyboard.type("What does this line mean?")
    await page.waitForTimeout(1200)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
  }
  const inItem = await page.evaluate(
    (id) => !!document.querySelector(`#${CSS.escape(id)} > ul > li > epic-threads > epic-thread`),
    section
  )
  check(`${name}:  the text comment's thread is in its list item`, inItem)
  await page.screenshot({ path: join(out, `${name}-threads.png`) })
  // a section's bullhorn, in its title row, while it's hovered
  const { hovered, header } = await page.evaluate(() => {
    const section = document.querySelectorAll("main > .site-body ui-section[id]:not(ui-section ui-section)")[1]
    section?.scrollIntoView({ block: "center" })
    return { hovered: section?.id, header: section?.getAttribute("header") }
  })
  // its title, drawn in its shadow root (the host itself has no box of its own to aim at)
  await page.locator(`[id="${hovered}"]`).getByText(header, { exact: true }).first().hover().catch(() => {})
  await page.waitForTimeout(300)
  const shown = await page.evaluate(
    (id) => getComputedStyle(document.querySelector(`#${CSS.escape(id)} > .spell-comment-mark`)).opacity,
    hovered
  )
  check(`${name}:  a section's bullhorn shows in its title row while hovered`, shown === "1", `#${hovered} ${shown}`)
  await page.screenshot({ path: join(out, `${name}-hover.png`) })

  // what the server holds
  const held = GuideInbox.read(inbox(element)).commentList.all
  check(`${name}:  the inbox holds both comments`, held.length >= 2, held.map((each) => `${each.id} ${each.kind}`).join(", "))

  // Send
  const send = await page.evaluate(() => {
    const box = document.querySelector(".site-masthead > .spell-send")
    return box && { state: box.dataset.state, who: box.querySelector(".spell-send-who")?.textContent }
  })
  check(
    `${name}:  Send shows, unsent, "no epic owns this page"`,
    send?.state === "unsent" && send.who === "no epic owns this page",
    JSON.stringify(send)
  )
  await page.click(".site-masthead > .spell-send > .spell-send-button")
  await page.waitForSelector('.site-masthead > .spell-send[data-state="sent"]', { timeout: 5000 }).catch(() => {})
  check(`${name}:  a click on Send sends them`, !!(await page.$('.site-masthead > .spell-send[data-state="sent"]')))
  check(`${name}:  the inbox says they were sent`, !!GuideInbox.read(inbox(element)).sent)
  check(`${name}:  nobody woken`, !served.wakes.length, served.wakes.join(", "))
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `${name}-sent.png`) })

  // the router's swap:  the next page's bullhorns, none of this page's threads;  back, they're there again
  // a link in the page, as the article's own are:  the router takes the click
  await page.evaluate(() => {
    const link = document.createElement("a")
    link.href = "epic-page.html"
    link.textContent = "epic-page"
    document.querySelector("main .site-article").append(link)
    link.click()
  })
  await page.waitForFunction(() => location.pathname.endsWith("/epic-page.html"), null, { timeout: 10_000 })
  await page.waitForTimeout(2500)
  const swapped = await page.evaluate(() => ({
    page: document.querySelectorAll(".site-masthead > .spell-comment-mark.at-page").length,
    threads: document.querySelectorAll("epic-thread").length,
    floats: document.querySelectorAll(".spell-comment-float").length,
    send: document.querySelector(".site-masthead > .spell-send")?.dataset.state
  }))
  check(
    `${name}:  the router's swap draws the next page's bullhorns, and none of the last page's threads`,
    swapped.page === 1 && swapped.threads === 0 && swapped.floats <= 1 && swapped.send === "idle",
    JSON.stringify(swapped)
  )
  await page.goBack()
  await page.waitForFunction((name) => location.pathname.endsWith(`/${name}.html`), element, { timeout: 10_000 })
  await page.waitForTimeout(2500)
  const back = await page.evaluate(() => document.querySelectorAll("epic-thread").length)
  check(`${name}:  back again, the threads draw again`, back === held.length, `${back}`)

  check(`${name}:  no page errors`, !page.errors.length, page.errors.slice(0, 3).join(" | "))
  await page.close()
  if (!keep) await clear(element)
}

/** Clear every comment on Epic UI page `name` through the route, as the trash does. */
async function clear(name) {
  const page = await newPage(1200)
  await page.goto(pageUrl(name))
  await page.waitForFunction(() => window.SPELL_SERVER?.token, null, { timeout: 10_000 })
  for (const { id } of GuideInbox.read(inbox(name)).commentList.all)
    await page.evaluate(
      async ({ id, path }) =>
        fetch("/api/docs/comments", {
          method: "POST",
          headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER.token },
          body: JSON.stringify({ page: path, action: "clear", id })
        }),
      { id, path: `/components/epics/${name}.html` }
    )
  check(`cleared the comments on ${name}`, !GuideInbox.read(inbox(name)).commentList.all.length)
  await page.close()
}

/** A guide:  the docs runtime still draws the bullhorns, and a thread has the comments' look. */
async function checkGuide() {
  const page = await newPage(1200)
  if (bundle) {
    const code = readFileSync(resolve(bundle))
    await page.route("**/_epic/assets/spell-ui.js", (route) =>
      route.fulfill({ body: code, contentType: "text/javascript" })
    )
  }
  await page.route("**/api/**", (route) => (route.request().method() === "POST" ? route.abort() : route.fallback()))
  await page.route("**/api/docs/comments?*", async (route) => {
    const anchor = await page.evaluate(() => document.querySelector("main ui-section[id]")?.id)
    const at = "2026-10-19T10:00:00.000Z"
    await route.fulfill({
      json: {
        takesComments: true,
        comments: [
          {
            id: "m1",
            anchor,
            kind: "section",
            label: "",
            excerpt: "",
            text: "A stubbed comment",
            at,
            status: "answered",
            replies: [{ by: "Claude", at, html: "<p>Answered.</p>" }],
            turn: "owen"
          }
        ]
      }
    })
  })
  await page.goto(`${served.base}/guides/python-target.html`)
  const drawn = await page
    .waitForSelector("epic-thread", { state: "attached", timeout: 20_000 })
    .then(() => true)
    .catch(() => false)
  const look = await page.evaluate(() => {
    // an `<epic-thread>`:  its host is the ivory box
    const thread = document.querySelector("epic-thread")
    return thread && { radius: getComputedStyle(thread).borderTopLeftRadius, marks: document.querySelectorAll(".spell-comment-mark").length }
  })
  check(
    "guide:  the docs runtime draws bullhorns and a thread, in the comments' look",
    drawn && look?.marks > 3 && look.radius === "10px",
    JSON.stringify(look)
  )
  await page.screenshot({ path: join(out, "guide.png") })
  check("guide:  no page errors", !page.errors.length, page.errors.slice(0, 3).join(" | "))
  await page.close()
}
