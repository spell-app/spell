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
 *   wait on Owen.  The ids are keyed `m1` ... as an inbox file keys them
 * - reads and writes NOTHING of the real pages:  no inbox file is read for comments, and every POST to `/api/` is
 *   aborted, so nothing is sent and no session is woken (nor could one be:  the demo server's wake is stubbed)
 * - checks, on each page:
 *   - each thread's header shows its id, `M1` ...
 *   - the toolbar's bullhorn shows, its count 2
 *   - a click lands on the first waiting thread in page order, opened, on screen;  the next on the other;  the next
 *     round to the first again
 *   - Cmd-K lists the two waiting threads under its box, `M1 · ...` then `M3 · ...`;  `M99` says it isn't there and
 *     stays open;  the old spelling `cm3` lands on M3's thread, opened (and Enter doesn't fold it again)
 *   - no page errors
 * - and with no thread waiting:  no bullhorn
 * - screenshots (outDir, default a temporary folder):  `<page>-top.png`, `<page>-landed.png`, `<page>-jump.png`
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

const { chromium } = await import("playwright")
const { DemoServer } = await import("./DemoServer.ts")
const { EpicConfig } = await import("spell-epic/config/EpicConfig.ts")
const { pageFile } = await import("spell-epic/tools/pages.js")

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
const browser = await chromium.launch()

await checkPage("guide", `${served.base}/${guide}`, () =>
  [...document.querySelectorAll("main > ui-section[id], main ui-section[id]")].map((each) => each.id)
)
await checkPage("epic", `${served.base}/epics/${epic}/${epic}.plan.html`, () =>
  [...document.querySelectorAll("epic-item[id]")].map((each) => each.id)
)
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
async function stubbedPage(url, anchors, answered = [true, false, true]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  if (bundle) {
    const code = readFileSync(resolve(bundle))
    await page.route("**/_epic/assets/spell-ui.js", (route) => route.fulfill({ body: code, contentType: "text/javascript" }))
  }
  page.errors = []
  page.on("pageerror", (error) => page.errors.push(String(error)))
  await page.route("**/api/**", (route) => (route.request().method() === "POST" ? route.abort() : route.fallback()))
  await page.route("**/api/docs/comments?*", async (route) => {
    const ids = (await page.evaluate(anchors)).slice(0, 3)
    const at = "2026-10-17T10:00:00.000Z"
    const comments = ids.map((anchor, index) => ({
      id: `m${index + 1}`,
      anchor,
      kind: "section",
      label: "",
      excerpt: "",
      text: `Comment ${index + 1}:  what about this?`,
      at,
      status: answered[index] ? "answered" : "new",
      ...(answered[index] && { replies: [{ by: "Claude", at, html: "<p>Answered.</p>" }] }),
      turn: answered[index] ? "owen" : "claude"
    }))
    await route.fulfill({ json: { takesComments: true, comments } })
  })
  await page.goto(url)
  return page
}

/** Where the page stands:  the bullhorn, the thread the focus is in, the thread ids drawn. */
function state(page) {
  return page.evaluate(() => {
    const box = document.querySelector(".spell-toolbar > .spell-toolbar-waiting")
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
    await page.waitForSelector(".spell-toolbar > .spell-toolbar-waiting:not([hidden])", { state: "attached", timeout: 20_000 })
  } catch {
    check(`${name}:  the toolbar's bullhorn shows`, false)
    await page.screenshot({ path: join(out, `${name}-top.png`) })
    return page.close()
  }
  let now = await state(page)
  check(`${name}:  the toolbar's bullhorn shows, counting 2`, now.shown && now.count === "2", `count ${now.count}`)
  check(`${name}:  each thread shows its id, M1 ...`, now.ids.join(" ") === "M1 M2 M3", now.ids.join(" "))
  await page.screenshot({ path: join(out, `${name}-top.png`) })
  const order = await page.evaluate(() =>
    [...document.querySelectorAll("epic-thread")].filter((each) => each.comment?.turn === "owen").map((each) => each.id)
  )
  for (const [step, want] of [
    ["lands on the first waiting thread", order[0]],
    ["goes on to the next", order[1]],
    ["comes round to the first again", order[0]]
  ]) {
    // the button the `<ui-item>` draws, in its shadow root
    await page.click('.spell-toolbar > .spell-toolbar-waiting [part~="item"]')
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
    listed.join(" ") === "M1 M3",
    listed.join(" ")
  )
  await page.screenshot({ path: join(out, `${name}-jump.png`) })
  await page.keyboard.type("M99")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(300)
  const miss = await page.$eval(".spell-jump-miss", (each) => (each.hidden ? "" : each.textContent)).catch(() => "")
  check(`${name}:  Cmd-K M99 says it isn't there, and stays open`, /No M99/.test(miss), miss)
  await page.fill("ui-modal .spell-jump input", "cm3")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(1200)
  now = await state(page)
  check(
    `${name}:  Cmd-K cm3 (the old spelling) lands on M3's thread, opened, on screen`,
    now.thread === "comment-m3" && now.open && now.onScreen,
    JSON.stringify(now)
  )
  check(`${name}:  no page errors`, page.errors.length === 0, page.errors.join(" | "))
  await page.close()
}

/** With no thread waiting on Owen, no bullhorn. */
async function checkNoneWaiting(url) {
  const page = await stubbedPage(
    url,
    () => [...document.querySelectorAll("main ui-section[id]")].map((each) => each.id),
    [false, false, false]
  )
  await page.waitForSelector("epic-thread", { timeout: 20_000 }).catch(() => {})
  await page.waitForTimeout(500)
  const now = await state(page)
  check("none waiting:  threads drawn, no bullhorn", now.ids.length === 3 && !now.shown, JSON.stringify(now))
  await page.close()
}
