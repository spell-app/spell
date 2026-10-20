/**
 * Check the TEST RUN (`<epic-test-run>`, epic `epic-engine` P4) in a real browser, as Owen walks it:  a run on a
 * scratch copy of an epic page, every answer read back from the copy's review inbox.
 *
 * Usage (from the repo root):
 *   node src/demo/check-test-run.mjs [--doc <name>] [--bundle <spell-ui.js>] [outDir]
 * - `--bundle`:  a scratch build of the docs bundle, served in place of `spell-ui.js` (a runtime change, checked before
 *   the real one is rebuilt)
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox or details,
 *   copied to `src/demo/shots/test-run/epics/test-run-sample/` (git-ignored), its To test section REPLACED by scratch
 *   tests:
 *   - `v1`, the new shape:  Step (with an action link), Should, Example (a screenshot and a line), If not
 *   - `v2`, the new shape:  Step and Should
 *   - `v3`, an OLDER test:  prose only, shown as its Step
 *   - `v4`, older and deferred (an earlier run's Not now):  last in the order
 *   - `v5`, the new shape, failed before (`failed="i9"`)
 *   - `v6`, done:  not in the run
 *   - so the run's order is v1 v2 v3 v5 v4
 *   - and a second copy, `test-run-next`, with two open tests:  the next epic of a run across every epic
 * - the server:  a page server of its OWN (`DemoServer`) over `src/demo/shots/test-run/` as its content folder:  it
 *   wakes nobody
 *   - its `GET /api/epics/tests` reads the content folder it serves, the copies (epic `epic-engine` I45)
 * - a part's Example image is written from the PART's folder, `../tests/v1.png`:  a part's relative URLs are
 *   rewritten against it as it loads (`LoadableBody`)
 * - the walk, at 390px (the side bar's width), light:
 *   - the To test section's "Start testing · 5" starts it:  `?test=1` on the address, "1 of 5", the blocks hidden
 *   - v1:  its fields, the action button, the Example zoomed and closed (Esc closes the zoom, not the run);  P:
 *     passed, on to v2
 *   - v2:  Failed opens the failure;  a note typed, a screenshot PASTED (a PNG made in the page):  its thumbnail, the
 *     file in the copy's `tests/`, the mark carrying both
 *   - scrolling the page never takes the run's `#v2` off the address (the docs runtime's scroll-follow, J44:  needs
 *     the runtime rebuilt into `spell-ui.js`, or `--bundle`)
 *   - Next, v3 (prose as its Step):  Skip, on to v5
 *   - RELOAD mid-run:  back at v5, "4 of 5", v2's note and screenshot still there (Back to it, and forward again)
 *   - v5:  N, not now, on to v4;  → past it, the summary:  1 passed, 1 failed, 1 skipped, 1 not now, 1 not answered
 *   - Send results:  the inbox's `sent` moves, the button says so
 *   - a COMMENT on v1 (then Passed) and on v5 before its answer (the inbox's draft, back after the reload, then Not
 *     now):  each in its mark;  the summary lists the tests commented on;  after `epic inbox <copy> apply`, each is
 *     Owen's reply in its test's details
 *   - Esc:  the blocks back, `?test` off the address;  v5's line says "failed → I9" (`failed="i9"`)
 *   - a run across every epic (`?test=1&all=1`):  the summary's "Next:  test-run-next (2 tests)" opens it, in test
 *     mode, "1 of 2"
 *   - on the next epic, P and S, then Done testing at once:  both answers SENT in its copy's inbox, no Send pressed
 *     (I52), the notice line saying so
 *   - progress right throughout ("N of 5", the bar's answered count)
 * - and at 390 and 1200px, light and dark, reduced motion:  nothing wider than the window;  screenshots (outDir,
 *   default `src/demo/shots/test-run/`):  `run-<width>-<scheme>.png`, `run-failed.png`, `run-zoom.png`,
 *   `run-summary.png`, `run-start.png`, `run-button.png`, `run-failed-line.png`
 * - fails (exit 1) unless each shows on the page AND lands in the inbox
 * - re-runs itself under `tsx` (the page server and the tool are TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "../config/EpicConfig.ts"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")
const EPICS = join(EpicConfig.contentOf(ROOT), "epics")
const CONTENT = join(HERE, "shots", "test-run")
const TSCONFIG = join(ROOT, "tsconfig.json")

if (!process.env.CHECK_TEST_RUN_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", "--import", import.meta.resolve("@spell-app/toolchain/aliases"), fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_TEST_RUN_UNDER_TSX: "1", TSX_TSCONFIG_PATH: TSCONFIG }
    }
  )
  process.exit(run.status ?? 1)
}

const { chromium } = await import("playwright")
const { DemoServer } = await import("./DemoServer.ts")
const { PlanDocCommands } = await import("../tool/PlanDocCommands.ts")
const { PlanDocFiles } = await import("../tool/PlanDocFiles.ts")
const JSON5 = (await import("json5")).default

////////////////
// ## Settings
////////////////

const args = process.argv.slice(2)
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const from = flagValue("--doc") ?? "epic-engine"
const bundle = flagValue("--bundle")
const flagged = new Set(["--doc", "--bundle"].flatMap((name) => (args.includes(name) ? [args.indexOf(name) + 1] : [])))
const out = args.find((arg, index) => !arg.startsWith("--") && !flagged.has(index)) ?? CONTENT
const SAMPLE = "test-run-sample"
const NEXT = "test-run-next"
const NOTE = "check-test-run:  the card never showed"
const PASSED_COMMENT = "It did, but the second title wrapped a beat late"
const NOTNOW_COMMENT = "Needs main first"
const problems = []
const summary = { from, bundle: bundle ?? null }

////////////////
// ## The copies
////////////////

rmSync(CONTENT, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const sampleFolder = copyEpic(SAMPLE, "A test run sample", SAMPLE_TESTS())
copyEpic(NEXT, "B the next epic", NEXT_TESTS())
// the tool links a doc's bare file names through its checkout's `packages/`:  the copies' folder has none
mkdirSync(join(CONTENT, "packages"), { recursive: true })
const inboxFile = join(sampleFolder, `${SAMPLE}.inbox.json5`)

const server = await DemoServer.start({ content: CONTENT })
const pagePath = `/epics/${SAMPLE}/${SAMPLE}.plan.html`
const url = `${server.base}${pagePath}`
summary.url = url

const browser = await chromium.launch()
try {
  await exampleShot()
  await walk()
  await looks()
  await acrossEpics()
  await applied()
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
summary.wakes = server.wakes
console.log(JSON.stringify(summary, null, 2))
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}

////////////////
// ## The walk
////////////////

async function walk() {
  const context = await newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await context.addInitScript(HELPERS)
  const page = await context.newPage()
  const logs = watchLogs(page)
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await open(page, url)

  // Start testing, on the To test section's title:  "Start testing · 5"
  const start = await page.evaluate(() => {
    const button = document.getElementById("tests").shadowRoot.querySelector("ui-button.start-testing")
    return button && { text: button.textContent.trim(), title: button.getAttribute("title") }
  })
  expect("Start testing, on the To test title", start?.text, "Start testing · 5")
  await page.evaluate(() => document.getElementById("tests").scrollIntoView({ block: "center" }))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "run-button.png") })
  await page.evaluate(() => document.getElementById("tests").shadowRoot.querySelector("ui-button.start-testing").click())
  await waitForCard(page, "v1")
  expect("Start testing puts ?test=1 on the address", new URL(page.url()).searchParams.get("test"), "1")
  expect("the blocks hide in test mode", await page.evaluate(() => blocksShown()), false)
  await page.screenshot({ path: join(out, "run-start.png") })

  // v1:  its fields, the action button;  the Example zoomed, Esc closing only the zoom
  expect("v1's card", await page.evaluate(() => cardFacts()), {
    at: "1 of 5",
    answered: 0,
    id: "V1",
    title: "Folded titles show in full",
    fields: ["Step", "Should", "Example", "If not"],
    step: "Open the scratch guide, its Judgement calls section.",
    actions: [{ text: "Open the guide", href: "/guides/changelog.html", target: "_blank" }],
    shots: 1,
    labels: []
  })
  await page.evaluate(() => runRoot().querySelector(".example ui-button.shot").click())
  await page.waitForFunction(() => runRoot().querySelector("ui-modal.zoom")?.hasAttribute("visible"), null, {
    timeout: 4000
  }).catch(() => problems.push("the Example's screenshot didn't zoom"))
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, "run-zoom.png") })
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => !runRoot().querySelector("ui-modal.zoom")?.hasAttribute("visible"), null, {
    timeout: 4000
  }).catch(() => problems.push("Esc didn't close the zoom"))
  expect("Esc on the zoom leaves the run running", await page.evaluate(() => !!run()), true)

  // a COMMENT on v1 (Owen, 2026-10-19:  "it did part of what you asked"), then Esc out of its box and P:  passed,
  // the comment with it, on to v2
  expect("every card has its comment box", await page.evaluate(() => noteField()?.placeholder), "Comment (optional)")
  await page.evaluate(() => noteField().focus())
  await page.keyboard.type(PASSED_COMMENT)
  await page.keyboard.press("Escape")
  await page.keyboard.press("p")
  await waitForCard(page, "v2")
  await expectMark("P on v1, with its comment", "v1", { action: "test", result: "passed", note: PASSED_COMMENT })
  expect("on to v2:  2 of 5, 1 answered", pick(await page.evaluate(() => cardFacts()), ["at", "answered"]), {
    at: "2 of 5",
    answered: 1
  })
  // J44:  the docs runtime's scroll-follow leaves the run's `#v2` alone as the page scrolls:  it never takes the hash
  // off (the run would put it back, so the address alone can't tell)
  await page.evaluate(() => (window.hashesWiped = 0))
  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(500)
  await page.mouse.wheel(0, -300)
  await page.waitForTimeout(500)
  expect("scrolling keeps the run's #v2 in the address", new URL(page.url()).hash, "#v2")
  expect("the runtime never takes the run's #id off the address", await page.evaluate(() => window.hashesWiped), 0)

  // v2:  Failed, a note, a pasted screenshot
  await page.evaluate(() => answerButton("failed").click())
  await page.waitForFunction(() => runRoot().querySelector(".failure"), null, { timeout: 4000 })
  await expectMark("Failed on v2", "v2", { action: "test", result: "failed" })
  expect("Failed focuses the note box", await page.evaluate(() => noteField() === deepActive()), true)
  await page.keyboard.type("The second title still ends in an ellipsis")
  await pasteImage(page)
  await page
    .waitForFunction(() => runRoot().querySelector(".drop ui-button.shot img") && !runRoot().querySelector(".drop.saving"), null, { timeout: 8000 })
    .catch(() => problems.push("the pasted screenshot never showed as a thumbnail"))
  const v2 = await waitForMark("v2", (mark) => mark?.shot && mark?.note)
  expect("v2's mark:  failed, the note, the screenshot", { ...v2, shot: /^tests\/v2-\d{8}-\d{4}\.png$/.test(v2?.shot ?? "") }, {
    action: "test",
    result: "failed",
    note: "The second title still ends in an ellipsis",
    shot: true,
    at: v2?.at
  })
  if (v2?.shot && !existsSync(join(sampleFolder, v2.shot))) problems.push(`the screenshot isn't in the copy:  ${v2.shot}`)
  expect("v2's failed button dashed red", await page.evaluate(() => answerFacts("failed")), {
    fill: "dashed",
    color: "red",
    pressed: "true"
  })
  await page.screenshot({ path: join(out, "run-failed.png") })

  // Next:  v3, prose as its Step;  Skip
  await page.evaluate(() => moveButton("next").click())
  await waitForCard(page, "v3")
  const v3 = await page.evaluate(() => cardFacts())
  expect("v3, an older test:  its prose is its Step", pick(v3, ["at", "fields", "step"]), {
    at: "3 of 5",
    fields: ["Step"],
    step: "Reload each tab once first. Select all highlights the page."
  })
  await page.evaluate(() => answerButton("skip").click())
  await waitForCard(page, "v5")
  await expectMark("Skip on v3", "v3", { action: "test", result: "skip" })
  expect("v5:  failed before, 4 of 5", pick(await page.evaluate(() => cardFacts()), ["at", "answered", "labels"]), {
    at: "4 of 5",
    answered: 3,
    labels: ["failed before · I9"]
  })

  // a comment on v5 BEFORE its answer:  the inbox's draft for it
  await page.evaluate(() => noteField().focus())
  await page.keyboard.type(NOTNOW_COMMENT)
  await page.keyboard.press("Escape")
  const draft = await waitFor(async () => (await readInbox()).drafts?.v5?.note)
  expect("v5's comment, typed before an answer:  the inbox's draft", draft, NOTNOW_COMMENT)

  // RELOAD mid-run:  back at v5, the answers kept, its comment too
  expect("the address names the test", new URL(page.url()).hash, "#v5")
  await page.reload()
  await waitForCard(page, "v5")
  expect("reloaded:  back at v5, 3 answered", pick(await page.evaluate(() => cardFacts()), ["at", "answered"]), {
    at: "4 of 5",
    answered: 3
  })
  await page
    .waitForFunction((said) => noteField()?.value === said, NOTNOW_COMMENT, { timeout: 4000 })
    .catch(() => problems.push("v5's comment didn't survive the reload"))
  await page.keyboard.press("ArrowLeft")
  await waitForCard(page, "v3")
  expect("← :  v3, its Skip shown", (await page.evaluate(() => answerFacts("skip"))).pressed, "true")
  await page.keyboard.press("ArrowLeft")
  await waitForCard(page, "v2")
  expect("v2 after the reload:  its note and screenshot", await page.evaluate(() => ({
    note: noteField()?.value,
    thumbnail: !!runRoot().querySelector(".drop ui-button.shot img")
  })), { note: "The second title still ends in an ellipsis", thumbnail: true })
  await page.keyboard.press("ArrowRight")
  await waitForCard(page, "v3")
  await page.keyboard.press("ArrowRight")
  await waitForCard(page, "v5")

  // v5:  N, not now;  v4 (deferred, last);  → the summary
  await page.keyboard.press("n")
  await waitForCard(page, "v4")
  await expectMark("N on v5, its comment with it", "v5", { action: "test", result: "notnow", note: NOTNOW_COMMENT })
  expect("the draft gone once the answer carries it", (await readInbox()).drafts?.v5, undefined)
  expect("v4, deferred, last:  5 of 5", pick(await page.evaluate(() => cardFacts()), ["at", "answered", "labels"]), {
    at: "5 of 5",
    answered: 4,
    labels: ["not now 2026-10-18"]
  })
  await page.keyboard.press("ArrowRight")
  await page.waitForFunction(() => runRoot()?.querySelector(".summary"), null, { timeout: 4000 })
  expect("the summary", await page.evaluate(() => summaryFacts()), {
    at: "5 of 5",
    counts: ["1 passed", "1 failed", "1 skipped", "1 not now", "1 not answered"],
    commented: ["V1", "V2", "V5"],
    send: "Send results"
  })
  await page.screenshot({ path: join(out, "run-summary.png") })

  // Send results:  every mark sent
  await page.evaluate(() => runRoot().querySelector("ui-button.send").click())
  await page.waitForFunction(() => runRoot().querySelector("ui-button.send")?.textContent.trim() === "Results sent", null, {
    timeout: 5000
  }).catch(() => problems.push("Send results never said the results went"))
  const inbox = await readInbox()
  if (!inbox.sent) problems.push("Send results:  the inbox has no `sent`")
  summary.marks = inbox.marks
  const onDisk = JSON5.parse(readFileSync(inboxFile, "utf8"))
  expect("the marks, in the copy's inbox FILE", Object.fromEntries(Object.entries(onDisk.marks).map(([id, mark]) => [id, mark.result])), {
    v1: "passed",
    v2: "failed",
    v3: "skip",
    v5: "notnow"
  })

  // Esc:  the blocks back, `?test` off the address
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => !run(), null, { timeout: 4000 }).catch(() => problems.push("Esc didn't leave the run"))
  expect("left:  the blocks back", await page.evaluate(() => blocksShown()), true)
  expect("left:  ?test off the address", new URL(page.url()).search, "")
  // a test failed before shows it on its line:  "failed → I9", linking the issue
  expect("v5's line:  its failed mark", await page.evaluate(() => {
    const mark = document.getElementById("v5").shadowRoot.querySelector("ui-label.failed")
    return mark && { text: text(mark), href: mark.getAttribute("href"), title: mark.getAttribute("title") }
  }), { text: "failed → I9", href: "#i9", title: "Failed in your test run:  filed as I9" })
  await page.evaluate(() => {
    const tests = document.getElementById("tests")
    tests.setAttribute("open", "")
    tests.scrollIntoView({ block: "start" })
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, "run-failed-line.png") })
  summary.logs = logs
  if (logs.length) problems.push(`page errors:  ${logs.join(" | ")}`)
  await context.close()
}

/**
 * Claude's side, on the copy:  `epic inbox <copy> apply` (the tool, in this process):  each COMMENT lands on its test
 * as Owen's reply (`<epic-reply from="Owen">`), in its details:  the passed one's and the not-now one's.
 */
async function applied() {
  const tool = new PlanDocCommands({ files: new PlanDocFiles({ root: CONTENT, content: CONTENT }) })
  const said = []
  tool.print = (text) => void said.push(text)
  tool.warn = (text) => void said.push(`! ${text}`)
  await tool.run(["inbox", SAMPLE, "apply"])
  summary.applied = said.join("\n")
  const parts = join(sampleFolder, "parts")
  const files = [join(sampleFolder, `${SAMPLE}.plan.html`), ...readdirSync(parts).map((name) => join(parts, name))]
  const html = files.map((file) => readFileSync(file, "utf8")).join("\n")
  for (const [id, comment, re] of [
    ["v1", PASSED_COMMENT, "test passed"],
    ["v5", NOTNOW_COMMENT, "test not now"]
  ]) {
    const reply = new RegExp(`<epic-reply[^>]*from="Owen"[^>]*re="${re}"[^>]*>\\s*<p>\\s*${comment.replace(/ /g, "\\s+")}\\s*</p>`)
    if (!reply.test(html)) problems.push(`after apply:  ${id}'s comment isn't its reply ("${re}")`)
  }
}

/** v1's Example:  a screenshot "Claude took", drawn and shot in the browser, into the copy's `tests/`. */
async function exampleShot() {
  const page = await browser.newPage({ viewport: { width: 480, height: 200 } })
  await page.setContent(
    `<div id="shot" style="font: 18px system-ui; padding: 16px; width: 440px; background: #f7f7ff">` +
      `<p style="margin: 0 0 8px"><b>J12</b> A long folded title that wraps onto a second line in full</p>` +
      `<p style="margin: 0"><b>J13</b> Another, never cut short with an ellipsis</p></div>`
  )
  await page.locator("#shot").screenshot({ path: join(sampleFolder, "tests", "v1.png") })
  await page.close()
}

/** The run at 390 and 1200px, light and dark, reduced motion:  nothing wider than the window;  a screenshot each. */
async function looks() {
  for (const width of [390, 1200])
    for (const scheme of ["light", "dark"]) {
      const context = await newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2 })
      await context.addInitScript(HELPERS)
      const page = await context.newPage()
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
      await open(page, `${url}?test=1#v2`)
      await waitForCard(page, "v2")
      await page.waitForTimeout(300)
      const wide = await page.evaluate(() => document.documentElement.scrollWidth)
      if (wide > width) problems.push(`${width}px ${scheme}:  the page is ${wide}px wide`)
      await page.screenshot({ path: join(out, `run-${width}-${scheme}.png`) })
      await context.close()
    }
}

/** A run across every epic (`?test=1&all=1`):  the summary leads to the next epic with open tests, in test mode. */
async function acrossEpics() {
  const context = await newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(HELPERS)
  const page = await context.newPage()
  await open(page, `${url}?test=1&all=1`)
  // every test but v4 answered:  it starts there
  await waitForCard(page, "v4")
  await page.keyboard.press("ArrowRight")
  await page.waitForFunction(() => runRoot()?.querySelector("ui-button.next-epic"), null, { timeout: 6000 })
    .catch(() => problems.push("the summary never offered the next epic"))
  const next = await page.evaluate(() => {
    const button = runRoot().querySelector("ui-button.next-epic")
    return button && { text: button.textContent.trim(), href: new URL(button.getAttribute("href")).pathname + new URL(button.getAttribute("href")).search }
  })
  expect("Next:  the next epic with open tests", next, {
    text: `Next:  ${NEXT} (2 tests)`,
    href: `/epics/${NEXT}/${NEXT}.plan.html?test=1&all=1`
  })
  await page.evaluate(() => runRoot().querySelector("ui-button.next-epic").click())
  await page.waitForURL(`**/${NEXT}.plan.html?**`, { timeout: 8000 })
  await waitForCard(page, "v1")
  expect("the next epic, in test mode", pick(await page.evaluate(() => cardFacts()), ["at", "id"]), { at: "1 of 2", id: "V1" })
  await leaveSends(page)
  await context.close()
}

/**
 * I52 (Owen, 2026-10-19:  "I pressed 'Done Testing' ... and you later said 'no test results have come in'"):  on the
 * next epic's copy, two answers, then Done testing at once -- the run gone, both answers SENT in that copy's inbox
 * (no Send pressed), and the notice line saying so.
 */
async function leaveSends(page) {
  const nextPath = `/epics/${NEXT}/${NEXT}.plan.html`
  await page.keyboard.press("p")
  await waitForCard(page, "v2")
  await page.keyboard.press("s")
  await page.evaluate(() => runRoot().querySelector("ui-button.leave").click())
  await page.waitForFunction(() => !run(), null, { timeout: 4000 }).catch(() => problems.push("Done testing didn't leave the run"))
  const sentAll = await waitFor(async () => {
    const inbox = await readInbox(nextPath)
    const marks = Object.values(inbox.marks ?? {})
    const sent = inbox.sent && marks.length === 2 && marks.every((mark) => Date.parse(mark.at) <= Date.parse(inbox.sent))
    return sent ? inbox : undefined
  })
  if (!sentAll) problems.push("Done testing with 2 answers:  the copy's inbox doesn't show them sent")
  else
    expect("Done testing SENT the answers:  the copy's inbox", Object.fromEntries(Object.entries(sentAll.marks).map(([id, mark]) => [id, mark.result])), {
      v1: "passed",
      v2: "skip"
    })
  const notice = await page.evaluate(() => {
    const line = Array.from(document.body.querySelectorAll(":scope > [role=status]")).find((each) => !each.hidden)
    return line?.shadowRoot?.querySelector("p")?.textContent ?? ""
  })
  // nobody listens to the copy:  Send's own notice (saved, and the wake);  a listening session:  "2 results sent"
  if (!/^(2 results sent to Claude|Saved\.)/.test(notice)) problems.push(`Done testing's notice:  "${notice}"`)
  summary.leftNotice = notice
}

////////////////
// ## Helpers
////////////////

/** A browser context with `options`;  with `--bundle`, that file served as the docs bundle (`spell-ui.js`). */
async function newContext(options) {
  const context = await browser.newContext(options)
  if (bundle) {
    const script = readFileSync(resolve(bundle))
    await context.route("**/spell-ui.js", (route) => route.fulfill({ body: script, contentType: "text/javascript" }))
  }
  return context
}

/** Page-side helpers, on every load:  the run, its parts, facts about its card. */
function HELPERS() {
  // every address written with the run's query but no `#id`:  the docs runtime's scroll-follow, before J44
  window.hashesWiped = 0
  const replace = history.replaceState.bind(history)
  history.replaceState = (state, unused, url) => {
    const next = url === undefined || url === null ? null : new URL(url, location.href)
    if (next?.searchParams.has("test") && !next.hash) window.hashesWiped++
    return replace(state, unused, url)
  }
  window.run = () => document.querySelector("epic-page")?.shadowRoot?.querySelector("epic-test-run") ?? null
  window.runRoot = () => run()?.shadowRoot ?? null
  window.blocksShown = () => {
    const slot = document.querySelector("epic-page").shadowRoot.querySelector("slot:not([name])")
    return getComputedStyle(slot).display !== "none"
  }
  window.text = (element) => (element?.textContent ?? "").replace(/\s+/g, " ").trim()
  window.answerButton = (result) => runRoot().querySelector(`ui-button.answer[data-result="${result}"]`)
  window.answerFacts = (result) => {
    const button = answerButton(result)
    return { fill: button.dataset.fill, color: button.dataset.color, pressed: button.getAttribute("aria-pressed") }
  }
  window.moveButton = (which) => Array.from(runRoot().querySelectorAll(".moves ui-button")).at(which === "next" ? -1 : 0)
  window.noteField = () => runRoot().querySelector("epic-text-box")?.shadowRoot?.querySelector("textarea") ?? null
  window.deepActive = () => {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    return active
  }
  window.cardFacts = () => {
    const root = runRoot()
    const card = root.querySelector(".card")
    const bar = root.querySelector("ui-progress")
    return {
      at: text(root.querySelector(".where")),
      answered: Number(bar.getAttribute("value")),
      id: text(card.querySelector(".id")),
      title: text(card.querySelector(".test-title")),
      fields: Array.from(card.querySelectorAll(".field h3"), (h3) => text(h3)),
      step: text(card.querySelector(".step .prose")),
      actions: Array.from(card.querySelectorAll(".step ui-button.action"), (button) => ({
        text: text(button),
        href: button.getAttribute("href"),
        target: button.getAttribute("target")
      })),
      shots: card.querySelectorAll(".example ui-button.shot").length,
      labels: Array.from(card.querySelectorAll(".card-head .before"), (label) => text(label))
    }
  }
  window.summaryFacts = () => {
    const root = runRoot()
    return {
      at: text(root.querySelector(".where")),
      counts: Array.from(root.querySelectorAll(".counts li:not([data-zero])"), (li) => text(li)),
      commented: Array.from(root.querySelectorAll(".commented li .id"), (id) => text(id)),
      send: text(root.querySelector("ui-button.send"))
    }
  }
}

/** Load `address`, wait for the review controls and the pack. */
async function open(page, address) {
  await page.goto(address)
  await page
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${address}:  never reviewed (<epic-page reviewing>)`))
}

/** Wait for test `id`'s card. */
async function waitForCard(page, id) {
  await page
    .waitForFunction(
      (id) => {
        const card = runRoot()?.querySelector(".card:not(.summary)")
        return card && card.querySelector(".id")?.textContent.trim() === id.toUpperCase() && !card.querySelector(".step .prose")?.textContent.includes("Loading")
      },
      id,
      { timeout: 8000 }
    )
    .catch(() => problems.push(`${id}:  ${NOTE}`))
}

/** Paste a PNG made in the page (a canvas) into the note box, as ⌘V with a screenshot on the clipboard does. */
async function pasteImage(page) {
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas")
    canvas.width = 320
    canvas.height = 180
    const draw = canvas.getContext("2d")
    draw.fillStyle = "#c7d7f5"
    draw.fillRect(0, 0, 320, 180)
    draw.fillStyle = "#1a3d7c"
    draw.font = "24px sans-serif"
    draw.fillText("pasted screenshot", 40, 100)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
    const data = new DataTransfer()
    data.items.add(new File([blob], "shot.png", { type: "image/png" }))
    noteField().dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, composed: true, cancelable: true }))
  })
}

/** The copy's inbox (`path`:  another copy's page), as the page server answers it. */
async function readInbox(path = pagePath) {
  const response = await fetch(`${server.base}/api/epics/review/inbox?page=${encodeURIComponent(path)}`)
  return response.json()
}

/** Wait until `read()` answers something (6s at most);  its answer. */
async function waitFor(read) {
  for (let tries = 0; tries < 40; tries++) {
    const value = await read()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return read()
}

/** Wait for test `id`'s mark to pass `ok`;  the mark. */
async function waitForMark(id, ok) {
  for (let tries = 0; tries < 40; tries++) {
    const mark = (await readInbox()).marks?.[id]
    if (ok(mark)) return mark
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return (await readInbox()).marks?.[id]
}

/** Test `id`'s mark, once it's there, must hold `wanted` (its time aside). */
async function expectMark(what, id, wanted) {
  const mark = await waitForMark(id, (mark) => mark?.result === wanted.result)
  expect(`${what}:  the inbox`, pick(mark ?? {}, Object.keys(wanted)), wanted)
}

/** `object`'s `keys` only. */
function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object?.[key]]))
}

function expect(what, actual, wanted) {
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    problems.push(`${what}:  ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`)
}

/** The page's errors, as they come. */
function watchLogs(page) {
  const logs = []
  page.on("pageerror", (error) => logs.push(`pageerror:  ${error.message}`))
  page.on("console", (message) => {
    // a missing file says which below (`response`)
    if (message.type() === "error" && !/Failed to load resource/.test(message.text())) logs.push(`console:  ${message.text()}`)
  })
  page.on("response", (response) => response.status() >= 400 && logs.push(`${response.status()}:  ${response.url()}`))
  return logs
}

/**
 * Copy epic `from`'s page (skeleton and parts) as epic `name`, titled `title`, its To test section replaced by
 * `tests` (`{ skeleton, parts }`);  its folder.
 */
function copyEpic(name, title, tests) {
  const source = join(EPICS, from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-test-run:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", name)
  mkdirSync(join(folder, "parts"), { recursive: true })
  mkdirSync(join(folder, "tests"), { recursive: true })
  const parts = join(source, "parts")
  if (existsSync(parts))
    for (const part of readdirSync(parts)) writeFileSync(join(folder, "parts", part), readFileSync(join(parts, part)))
  const html = readFileSync(skeleton, "utf8")
    .replace(/<epic-section id="tests" kind="tests"[\s\S]*?<\/epic-section>(?=\s*<epic-section id="log")/, tests.skeleton)
    .replaceAll(`epic="${from}"`, `epic="${name}"`)
    .replace(/(<epic-page\b[^>]*?\btitle=")[^"]*"/, `$1${title}"`)
  if (!html.includes('id="v1"')) {
    console.error(`check-test-run:  ${from}'s page has no To test section to replace`)
    process.exit(2)
  }
  writeFileSync(join(folder, `${name}.plan.html`), html)
  for (const [id, part] of Object.entries(tests.parts)) writeFileSync(join(folder, "parts", `${id}.html`), part)
  return folder
}

/** A test item's line in the skeleton. */
function testItem(id, title, extra = "") {
  return `<epic-item id="${id}" title="${title}" status="open" state="open" source="parts/${id}.html"${extra}></epic-item>`
}

/** The sample's scratch tests:  the new shape, older prose-only ones, a deferred one, a done one. */
function SAMPLE_TESTS() {
  return {
    skeleton:
      `<epic-section id="tests" kind="tests">` +
      testItem("v1", "Folded titles show in full") +
      testItem("v2", "Every folded title wraps") +
      testItem("v3", "Both tabs come back on their page") +
      testItem("v4", "The pane opens under the selection", ` deferred="2026-10-18"`) +
      testItem("v5", "A thread's reply box saves as you type", ` failed="i9"`) +
      `<epic-item id="v6" title="Already passed" status="done" state="recent"></epic-item>` +
      `</epic-section>`,
    parts: {
      v1:
        `<epic-field label="Step"><p>Open the scratch guide, its Judgement calls section.</p>` +
        `<p><a class="epic-test-action" href="/guides/changelog.html">Open the guide</a></p></epic-field>` +
        `<epic-field label="Should"><p>Every folded title shows all its words, wrapped;  none cut with …</p></epic-field>` +
        `<epic-field label="Example"><img src="../tests/v1.png" alt="the folded titles, wrapped"><p>Claude's screenshot, at 390px.</p></epic-field>` +
        `<epic-field label="If not"><p>Say which title, and paste a screenshot.</p></epic-field>`,
      v2:
        `<epic-field label="Step"><p>Fold the Judgement calls section, then open it again.</p></epic-field>` +
        `<epic-field label="Should"><p>Every title wraps in full, folded or open.</p></epic-field>`,
      v3: `<p>Reload each tab once first.  Select all highlights the page.</p>`,
      v4: `<p>The pane opens just below the selection, and the page does not scroll.</p>`,
      v5:
        `<epic-field label="Step"><p>Type a reply in a thread, then reload.</p></epic-field>` +
        `<epic-field label="Should"><p>The reply is still there.</p></epic-field>`
    }
  }
}

/** The next epic's scratch tests:  two open. */
function NEXT_TESTS() {
  return {
    skeleton:
      `<epic-section id="tests" kind="tests">` +
      testItem("v1", "The next epic's first test") +
      testItem("v2", "The next epic's second test") +
      `</epic-section>`,
    parts: {
      v1: `<epic-field label="Step"><p>Open it.</p></epic-field><epic-field label="Should"><p>It opens.</p></epic-field>`,
      v2: `<p>An older test.</p>`
    }
  }
}
