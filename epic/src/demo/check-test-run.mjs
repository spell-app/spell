/**
 * Check TESTING ON THE PAGE (epic `epic-engine` P51, Q53) in a real browser, as Owen walks it:  the Manual tests
 * section's Start testing, Claude preparing the tests, the first test opening, Next test, a screenshot pasted in a
 * test's note, Approve closing one;  every step read back from the copy's review inbox.
 * - P4's separate test run (`<epic-test-run>`) is gone:  this script checked it before P51, and now checks what took
 *   its place.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-test-run.mjs [--doc <name>] [--bundle <spell-ui.js>] [outDir]
 * - `--bundle`:  a scratch build of the docs bundle, served in place of `spell-ui.js`
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox or details,
 *   copied to `src/demo/shots/test-run/epics/test-run-sample/` (git-ignored), its Manual tests section REPLACED by
 *   scratch tests:
 *   - `m1`, the explicit shape:  Step, Should;  `m2`, an older one, prose only;  `m3`, Step and Should
 *   - `m4`, one Claude can check itself;  `m5`, done:  never offered
 *   - and a second copy, `test-run-next`, every test prepared already:  the next epic of `epic test --all`
 * - the server:  a page server of its OWN (`DemoServer`) over `src/demo/shots/test-run/`, THIS checkout's pack and
 *   routes:  it wakes nobody
 * - the walk, at 390px (the side bar's width), light:
 *   - "Start testing · 4" on the Manual tests title;  a click asks Claude (`now`:  `prepare` under `tests`), the
 *     button "Preparing tests"
 *   - Claude's agent, played by the epic tool:  closes `m4` (checked itself), writes `m3` out with an Example
 *     screenshot, stamps the order (`m3` `m1` `m2`), `inbox done <copy>#tests`
 *   - the page opens `m3` (`#m3`, its details open), the button "Next test · 3 left"
 *   - a screenshot PASTED in `m3`'s note box:  its thumbnail, the file in the copy's `tests/`, a revisit carrying it
 *   - Next test:  `m1`;  Approve on it;  "Next test · 1 left"
 *   - `epic inbox apply --all`:  `m1` closed (passed), `m3` left open for the session (his note)
 *   - `?test=1&all=1` on the next copy:  every test prepared, so no request, its first test opens;  both approved,
 *     the section's last line names no next epic (none left)
 * - and at 1200 and 420px, light and dark:  nothing wider than the window;  screenshots (outDir, default
 *   `src/demo/shots/test-run/`):  `tests-before-<w>-<scheme>.png`, `tests-preparing.png`, `test-open-<w>-<scheme>.png`,
 *   `note-picture-<w>-<scheme>.png`, `note-picture-in-box.png`, `test-approved.png`, `next-epic.png`
 * - fails (exit 1) unless each shows on the page AND lands in the inbox
 * - re-runs itself under `tsx` (the page server and the tool are TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")
const EPICS = join(EpicConfig.contentOf(ROOT), "epics")
const CONTENT = join(HERE, "shots", "test-run")
const TSCONFIG = join(ROOT, "tsconfig.json")

if (!process.env.CHECK_TEST_RUN_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_TEST_RUN_UNDER_TSX: "1", TSX_TSCONFIG_PATH: TSCONFIG }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { bundleRoutes, logInto } = await import("./demoPages.mjs")
const { PlanDocCommands } = await import("spell/epic/tool/PlanDocCommands.ts")
const { PlanDocFiles } = await import("spell/epic/tool/PlanDocFiles.ts")

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
const NOTE = "The second title still ends in an ellipsis"
/** What marks the scratch tests in a copy:  the replacement happened. */
const SCRATCH_MARK = 'data-check="test-run"'
const problems = []
const summary = { from, bundle: bundle ?? null }

////////////////
// ## The copies
////////////////

rmSync(CONTENT, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const sampleFolder = copyEpic(SAMPLE, "A testing sample", SAMPLE_TESTS())
copyEpic(NEXT, "B the next epic", NEXT_TESTS())
// the tool links a doc's bare file names through its checkout's `packages/`:  the copies' folder has none
mkdirSync(join(CONTENT, "packages"), { recursive: true })
const tool = new PlanDocCommands({ files: new PlanDocFiles({ root: CONTENT, content: CONTENT }) })
const said = []
tool.print = (text) => void said.push(text)
tool.warn = (text) => void said.push(`! ${text}`)

const server = await DemoServer.start({ content: CONTENT })
const pagePath = `/epics/${SAMPLE}/${SAMPLE}.plan.html`
const nextPath = `/epics/${NEXT}/${NEXT}.plan.html`
const url = `${server.base}${pagePath}`
summary.url = url

const browser = await BrowserPage.launch()
try {
  await exampleShot()
  await walk()
  await looks()
  await acrossEpics()
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
summary.tool = said.join("\n")
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
  const logs = []
  const page = await newPage({ width: 390, height: 844 }, { context: { deviceScaleFactor: 2 }, logs })
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await open(page, url)

  // Start testing, on the Manual tests section's title
  expect("Start testing, on the Manual tests title", await page.evaluate(() => buttonText()), "Start testing · 4")
  await page.evaluate(() => testsSection().scrollIntoView({ block: "center" }))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "tests-before-390-light.png") })
  await page.evaluate(() => testButton().click())
  const asked = await waitFor(async () => (await readInbox()).now?.find((each) => each.id === "tests"))
  expect("Start testing asks Claude for now", pick(asked, ["id", "action"]), { id: "tests", action: "prepare" })
  await page
    .waitForFunction(() => buttonText() === "Preparing tests", null, { timeout: 6000 })
    .catch(() => problems.push(`the button didn't say Preparing tests:  ${"" /* read below */}`))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "tests-preparing.png") })

  // Claude's agent:  m4 checked and closed, m3 written out with an Example, the order stamped, the request done
  await claudePrepares(SAMPLE, sampleFolder)
  await page
    .waitForFunction(() => location.hash === "#m3", null, { timeout: 15_000 })
    .catch(() => problems.push(`the first test never opened:  ${page.url()}`))
  await page
    .waitForFunction(() => document.getElementById("m3")?.hasAttribute("open"), null, { timeout: 6000 })
    .catch(() => problems.push("m3 opened in the address, but not on the page"))
  await page
    .waitForFunction(() => buttonText() === "Next test · 3 left", null, { timeout: 6000 })
    .catch(async () => problems.push(`the button after preparing:  ${await page.evaluate(() => buttonText())}`))
  expect("m4, checked by Claude, is closed", await page.evaluate(() => document.getElementById("m4")?.getAttribute("status")), "done")
  await page.waitForTimeout(600)
  await page.screenshot({ path: join(out, "test-open-390-light.png") })

  // a screenshot pasted in m3's note box:  a revisit carrying it, its thumbnail
  await pasteImage(page, "m3")
  await page
    .waitForFunction(() => noteRoot("m3")?.querySelector(".note-picture img[src^='tests/']"), null, { timeout: 8000 })
    .catch(() => problems.push("the pasted screenshot never showed as a thumbnail in m3's note"))
  await page.evaluate(() => noteRoot("m3").querySelector(".note-box").scrollIntoView({ block: "center" }))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "note-picture-in-box.png") })
  await page.evaluate(() => noteField("m3").focus())
  await page.keyboard.type(NOTE)
  // leaving the box saves it at once
  await page.evaluate(() => noteField("m3").blur())
  const m3 = await waitForMark("m3", (mark) => mark?.shot && mark?.note === NOTE)
  expect(
    "m3's mark:  a revisit, his words, the screenshot",
    { ...pick(m3, ["action", "note"]), shot: /^tests\/m3-\d{8}-\d{4}\.png$/.test(m3?.shot ?? "") },
    { action: "revisit", note: NOTE, shot: true }
  )
  if (m3?.shot && !existsSync(join(sampleFolder, m3.shot))) problems.push(`the screenshot isn't in the copy:  ${m3.shot}`)
  await page.evaluate(() => noteRoot("m3").querySelector(".note-box").scrollIntoView({ block: "center" }))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "note-picture-390-light.png") })

  // Next test:  m1;  Approve on it
  await page.evaluate(() => testButton().click())
  await page
    .waitForFunction(() => location.hash === "#m1", null, { timeout: 6000 })
    .catch(() => problems.push(`Next test didn't open m1:  ${page.url()}`))
  await page.evaluate(() => reviewButton("m1", "approve").click())
  await waitForMark("m1", (mark) => mark?.action === "approve")
  await page
    .waitForFunction(() => buttonText() === "Next test · 1 left", null, { timeout: 6000 })
    .catch(async () => problems.push(`after Approve:  ${await page.evaluate(() => buttonText())}`))
  await page.evaluate(() => document.getElementById("m1").scrollIntoView({ block: "start" }))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "test-approved.png") })

  // applied:  m1 closed as passed;  m3 left for the session (his note and screenshot)
  await tool.run(["inbox", SAMPLE, "apply", "--all"])
  const html = readFileSync(join(sampleFolder, `${SAMPLE}.plan.html`), "utf8")
  expect("after apply, m1 is closed", /id="m1"[^>]*status="done"/.test(html), true)
  expect("after apply, m3 waits for the session", /id="m3"[^>]*status="open"/.test(html), true)
  expect("the walk's page errors", logs, [])
  await page.close()
}

/** At 1200 and 420px, light and dark:  the section before, a prepared test open, a picture in its note. */
async function looks() {
  for (const width of [1200, 420]) {
    for (const scheme of ["light", "dark"]) {
      const page = await newPage({ width, height: 900 }, { context: { deviceScaleFactor: 2 } })
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" })
      await open(page, `${url}#m3`)
      await page.waitForFunction(() => document.getElementById("m3")?.hasAttribute("open"), null, { timeout: 8000 }).catch(() => undefined)
      await page.waitForTimeout(800)
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
      if (wide > 0) problems.push(`${width}px ${scheme}:  the page is ${wide}px wider than the window:  ${await page.evaluate(() => widest())}`)
      await page.screenshot({ path: join(out, `test-open-${width}-${scheme}.png`) })
      await page.evaluate(() => noteRoot("m3")?.querySelector(".note-box")?.scrollIntoView({ block: "center" }))
      await page.waitForTimeout(300)
      await page.screenshot({ path: join(out, `note-picture-${width}-${scheme}.png`) })
      await page.evaluate(() => testsSection().scrollIntoView({ block: "center" }))
      await page.waitForTimeout(300)
      await page.screenshot({ path: join(out, `tests-before-${width}-${scheme}.png`) })
      await page.close()
    }
  }
}

/** `?test=1&all=1` on the next copy:  every test prepared, so its first opens at once;  both approved, the last line. */
async function acrossEpics() {
  const page = await newPage({ width: 390, height: 844 })
  await open(page, `${server.base}${nextPath}?test=1&all=1`)
  await page
    .waitForFunction(() => location.hash === "#m1", null, { timeout: 8000 })
    .catch(() => problems.push(`?test=1 on a prepared page didn't open its first test:  ${page.url()}`))
  expect("?test= leaves the address, all=1 stays", new URL(page.url()).search, "?all=1")
  expect("no request for a page already prepared", (await readInbox(nextPath)).now ?? [], [])
  for (const id of ["m1", "m2"]) {
    await page.evaluate((id) => reviewButton(id, "approve").click(), id)
    await waitForMark(id, (mark) => mark?.action === "approve", nextPath)
  }
  await page
    .waitForFunction(() => testsSection().shadowRoot.querySelector(".next-epic")?.textContent.trim(), null, { timeout: 6000 })
    .catch(() => problems.push("the section's last line never showed, every test answered"))
  summary.nextEpic = await page.evaluate(() => testsSection().shadowRoot.querySelector(".next-epic")?.textContent.trim())
  await page.evaluate(() => testsSection().shadowRoot.querySelector(".next-epic")?.scrollIntoView({ block: "center" }))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, "next-epic.png") })
  await page.close()
}

/**
 * Claude's agent, as the epic skill's "Start testing" says, by the epic tool on copy `name`:  `m4` checked and
 * closed, `m3` written out with an Example, each open test stamped in order, the request done.
 */
async function claudePrepares(name, folder) {
  const run = async (...words) => {
    const code = await tool.run(words)
    if (code) problems.push(`epic ${words.join(" ")}:  exit ${code} ${said.at(-1)}`)
  }
  await run("status", name, "m4", "underway", "<p>Checking it headless.</p>")
  await run("status", name, "m4", "done", "<p>Checked by Claude:  a headless screenshot.</p>")
  await run(
    "details", name, "m3",
    "--step", "1. In VS Code's side bar, open the Review tab.\n2. Fold the Judgement calls section, then open it again.",
    "--should", "Every title wraps in full, folded or open.",
    "--example", join(folder, "tests", "m1.png"),
    "--prepared", "1"
  )
  await run("details", name, "m1", "--prepared", "2")
  await run("details", name, "m2", "--prepared", "3")
  await run("close", name, "m4")
  await run("inbox", name, "done", "tests")
}

/** The Example's screenshot "Claude took":  drawn and shot in the browser, into the copy's `tests/`. */
async function exampleShot() {
  const page = await browser.newPage({ viewport: { width: 480, height: 200 } })
  await page.setContent(
    `<div id="shot" style="font: 18px system-ui; padding: 16px; width: 440px; background: #f7f7ff">` +
      `<p style="margin: 0 0 8px"><b>J12</b> A long folded title that wraps onto a second line in full</p>` +
      `<p style="margin: 0"><b>J13</b> Another, never cut short with an ellipsis</p></div>`
  )
  await page.locator("#shot").screenshot({ path: join(sampleFolder, "tests", "m1.png") })
  await page.close()
}

////////////////
// ## Helpers
////////////////

/** A new page at `viewport`, with the page-side helpers (`HELPERS`);  `logs`:  its errors pushed there. */
async function newPage(viewport, { context, logs } = {}) {
  const page = await BrowserPage.newPage(browser, {
    viewport,
    context,
    routes: bundleRoutes(bundle),
    ...(logs && { ignore: /Failed to load resource/, onProblem: logInto(logs) })
  })
  if (logs)
    page.on("response", (response) => response.status() >= 400 && logs.push(`${response.status()}:  ${response.url()}`))
  await page.addInitScript(HELPERS)
  return page
}

/** The page-side helpers, on `window`. */
function HELPERS() {
  window.testsSection = () => document.getElementById("tests")
  window.testButton = () => testsSection()?.shadowRoot?.querySelector("ui-button.start-testing") ?? null
  window.buttonText = () => (testButton()?.textContent ?? "").replace(/\s+/g, " ").trim()
  window.reviewRoots = (id) => {
    const root = document.getElementById(id)?.shadowRoot
    if (!root) return []
    return [root, ...Array.from(root.querySelectorAll("epic-review"), (review) => review.shadowRoot).filter(Boolean)]
  }
  window.reviewButton = (id, action) =>
    reviewRoots(id).map((root) => root.querySelector(`ui-button[data-action="${action}"]`)).find(Boolean) ?? null
  window.noteRoot = (id) =>
    document.getElementById(id)?.shadowRoot?.querySelector('epic-review[shows="note"]')?.shadowRoot ?? null
  window.widest = () => {
    const out = []
    const walk = (root) => {
      for (const element of root.querySelectorAll("*")) {
        const box = element.getBoundingClientRect()
        if (box.right > innerWidth + 0.5 && box.width && !element.closest("spell-site-header, .site-header"))
          out.push(`${element.localName}.${element.className} (${Math.round(box.right)})`)
        if (element.shadowRoot) walk(element.shadowRoot)
      }
    }
    walk(document)
    return out.slice(0, 6).join(", ")
  }
  window.noteField = (id) => noteRoot(id)?.querySelector("ui-textarea")?.shadowRoot?.querySelector("textarea") ?? null
}

/** Load `address`, wait for the review controls and the pack. */
async function open(page, address) {
  await page.goto(address)
  await page
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${address}:  never reviewed (<epic-page reviewing>)`))
  await page
    .waitForFunction(() => window.testButton?.(), null, { timeout: 8000 })
    .catch(() => problems.push(`${address}:  no Start testing button`))
}

/** Paste a PNG made in the page (a canvas) into test `id`'s note box, as ⌘V with a screenshot on the clipboard. */
async function pasteImage(page, id) {
  await page.evaluate(async (id) => {
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
    noteField(id).dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, composed: true, cancelable: true }))
  }, id)
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

/** Wait for item `id`'s mark to pass `ok`;  the mark. */
async function waitForMark(id, ok, path = pagePath) {
  const mark = await waitFor(async () => {
    const found = (await readInbox(path)).marks?.[id]
    return ok(found) ? found : undefined
  })
  if (!mark) problems.push(`${id}'s mark never came:  ${JSON.stringify((await readInbox(path)).marks?.[id])}`)
  return mark
}

/** `object`'s `keys` only. */
function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object?.[key]]))
}

function expect(what, actual, wanted) {
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    problems.push(`${what}:  ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`)
}

/**
 * Copy epic `from`'s page (skeleton and parts) as epic `name`, titled `title`, its Manual tests section replaced by
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
  if (!html.includes(SCRATCH_MARK)) {
    console.error(`check-test-run:  ${from}'s page has no Manual tests section to replace`)
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

/** The sample's scratch tests:  explicit ones, an older prose-only one, one Claude checks, a done one. */
function SAMPLE_TESTS() {
  return {
    skeleton:
      `<epic-section id="tests" kind="tests" ${SCRATCH_MARK}>` +
      testItem("m1", "Folded titles show in full") +
      testItem("m2", "Both tabs come back on their page") +
      testItem("m3", "Every folded title wraps") +
      testItem("m4", "The commands page lists spell content") +
      `<epic-item id="m5" title="Already passed" status="done" state="recent"></epic-item>` +
      `</epic-section>`,
    parts: {
      m1:
        `<epic-field label="Step"><p>Open the scratch guide, its Judgement calls section.</p></epic-field>` +
        `<epic-field label="Should"><p>Every folded title shows all its words, wrapped;  none cut with …</p></epic-field>`,
      m2: `<p>Reload each tab once first.  Select all highlights the page.</p>`,
      m3: `<p>Fold the judgement calls and look at the titles.</p>`,
      m4: `<p>The commands page lists <code>spell content</code>.</p>`
    }
  }
}

/** The next epic's scratch tests:  two open, both prepared already. */
function NEXT_TESTS() {
  return {
    skeleton:
      `<epic-section id="tests" kind="tests" ${SCRATCH_MARK}>` +
      testItem("m1", "The next epic's first test", ` prepared="1"`) +
      testItem("m2", "The next epic's second test", ` prepared="2"`) +
      `</epic-section>`,
    parts: {
      m1: `<epic-field label="Step"><p>Open it.</p></epic-field><epic-field label="Should"><p>It opens.</p></epic-field>`,
      m2: `<p>An older test.</p>`
    }
  }
}
