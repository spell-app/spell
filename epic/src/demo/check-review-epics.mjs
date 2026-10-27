/**
 * Check the `<epic-*>` review controls in a real browser, as Owen uses them
 * (epic `epic-components` P9, the colour scheme and fill rule of P14, decision Q20).
 * - it clicks through every flow, has the epic tool do Claude's side on the same copy, and reads the inbox back
 *
 * Usage (from the repo root):
 *   node src/demo/check-review-epics.mjs [--doc <name> [--from <folder>]] [outDir]
 * - the doc:  a SCRATCH COPY, never a real one
 *   - `review-sample.html` (default)
 *   - or `--doc <name>`, a copy of `epics/<name>/`
 *     (its skeleton and parts:  a doc in `<epic-page>` markup;  never its inbox or details)
 *   - or of `--from <folder>` (a converted copy:  `epic convert <name> --out <folder>`)
 *   - copied to `src/demo/shots/epics/<name>/<name>.plan.html` (git-ignored), as deep as a real one, so its links
 *     lead where a real page's do:  the review routes take epic pages only (`epics/<name>/<name>.plan.html`),
 *     its inbox file lands beside it, and the tool finds it there (`PlanDocFiles({ root, content }`, both `src/demo/shots`:  never the real content folder)
 * - the server:  a page server of its OWN (`DemoServer`:  spell-epic's `EpicServer` on a free port, no pid file),
 *   serving `src/demo/shots/` as its content folder, so the routes are this branch's code as it is now;
 *   stopped at the end
 *   - it WAKES NOBODY (epic `epic-engine` I11):  a Send with nobody listening reaches `DemoServer`'s
 *     stubbed wake, never a window or a session on this machine;  the check asserts the wake was asked for
 *   - airplane mode is off for it, whatever this machine's switch says
 * - Owen's side, clicked:
 *   - every item's buttons:  ONE group, Make Todo, Revisit, Approve;  no Do Now (the wand:  gone, Owen, 2026-10-25)
 *     - an Overview sub-section's:  without Approve
 *     - the note box's:  Later, the x (skip this:  Owen, 2026-10-09)
 *   - the fill:  Approve pressed dashed green, again none;  Make Todo the same
 *   - Revisit on an item with details:  it opens, its box focused;  ten lines grow it;
 *     the box's x saves a skip WITH its note, the id chip dashed in its state's colour
 *   - Revisit on an item without details (one added to the copy):  a box under its line;  typing turns Revisit on at
 *     once (epic `epic-engine` P20), saved on Tab;  after a reload, a revisit soon shown under the line;  Edit puts it
 *     back in the box, and Later keeps it
 *   - Revisit WITH a note (an Overview sub-section):  typing turns it on, dashed blue
 *   - a pick on a judgement call's REPLY cards
 *     (I8:  picks work anywhere;  the call added to the copy, its text and a reply each holding cards):
 *     the mark names that set (`choices: 1`), its pill dashed, the text's untouched
 *   - Send:  the header's button idle -> unsent -> sent;  the marks outlined;  nobody listening:  the epic woken (stubbed)
 * - Claude's side, by the epic tool on the copy (`PlanDocCommands`), the page reloaded after each:
 *   - `inbox watch`, `inbox wait`:  listening, the header's tooltips say so
 *   - on a question:  `status underway`, a blue Underway card, the item `progress`;  `status done`, the card green
 *   - `inbox apply`:
 *     - the sent Approve CLEARED (`review-as="approve"`), the chip solid green
 *     - the skip:  reviewed, still open, its note kept as Owen's reply
 *     - the pick approves its call (closed, the reply's set `chosen`, a Noted card `Chose C · ...:  recorded ...`),
 *       its pill SOLID
 *   - a countdown's send (epic `epic-engine` P20, as Review Now did;  no wand draws one since 2026-10-25, the
 *     page still takes it):  the revisit waiting asked now
 *   - a COMMENT only (Owen, 2026-10-10:  "send button at top of page doesn't appear to be hooked up"):
 *     written into the copy's inbox as the bullhorn would (the comments route takes only the shared folders' pages);
 *     Send turns blue, a click sends it (the inbox's `sent` moves, `unsentComments` empties),
 *     and `inbox wait` wakes with it, printing the comment
 * - fails (exit 1) unless each shows on the page AND lands in the inbox
 *   (read back through `GET /api/epics/review/inbox`)
 * - and at 280px and 900px, light and dark, unless:
 *   - no review control runs past the window, and none sits over its line's title
 *   - every button's glyph is centred in it (within 1px);  the page's round buttons too (Send's plane, git)
 * - screenshots (outDir, default `demo/shots/`):
 *   `review-<width>-<scheme>.png`, `review-marked.png`, `review-done.png`,
 *   `review-picked.png` / `review-picked-dark.png` (the pick applied)
 * - REFUSES to run while the copy's inbox file exists (a run killed half way:  delete it);  deletes it afterwards
 * - re-runs itself under `tsx` (the page server, `ReviewInbox` and the tool are TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { EpicConfig } from "spell/epic/config/EpicConfig.ts"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")
/** the epic pages' folder:  the repo's content folder's (`EpicConfig.contentOf()`) */
const EPICS = join(EpicConfig.contentOf(ROOT), "epics")
const SHOTS = join(HERE, "shots")
const TSCONFIG = join(ROOT, "tsconfig.json")

if (!process.env.CHECK_REVIEW_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_REVIEW_UNDER_TSX: "1", TSX_TSCONFIG_PATH: TSCONFIG }
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

const args = process.argv.slice(2)
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const docName = flagValue("--doc") ?? "review-sample"
const fromFolder = flagValue("--from")
const flagged = new Set(["--doc", "--from"].flatMap((name) => (args.includes(name) ? [args.indexOf(name) + 1] : [])))
const out = args.find((arg, index) => !arg.startsWith("--") && !flagged.has(index)) ?? SHOTS
const NOBODY = /No Claude session/
const NOTE = "check-review-epics:  why not reuse the details route?"
const SKIP_NOTE = "check-review-epics:  nothing to do, the routes settle it"
const SECTION_NOTE = "check-review-epics:  is the Overview part clear?"
const COMMENT = "check-review-epics:  is Send hooked up?"
const SESSION = "check-review-epics"
const problems = []
const summary = { doc: docName }

////////////////
// ## The copy
////////////////

const folder = join(SHOTS, "epics", docName)
const file = join(folder, `${docName}.plan.html`)
const inboxFile = join(folder, `${docName}.inbox.json5`)
if (existsSync(inboxFile)) {
  console.error(`check-review-epics:  ${inboxFile} exists (an earlier run's?):  delete it first`)
  process.exit(2)
}
copyDoc()

// the tool links a doc's bare file names (`SRV.Linker`) through its checkout's `packages/`:  shots/ has none
mkdirSync(join(SHOTS, "packages"), { recursive: true })

/** The epic tool, on the copy:  what Claude runs, its output kept for the summary. */
const tool = new PlanDocCommands({ files: new PlanDocFiles({ root: SHOTS, content: SHOTS }) })
const said = []
tool.print = (text) => void said.push(text)
tool.warn = (text) => void said.push(`! ${text}`)

/** A judgement call to pick on (I8):  its text's cards, and a reply's;  the pick is the reply's `C`. */
const pickCall = await addPickCall()

/**
 * An open item with NO details, for the flows that need one (I3 of epic `epic-engine`):  added to the copy, since a
 * real doc may have none (`epic-workflow`'s are all closed, or have details).  An item with details folds itself
 * after Later, its said note and Edit folded away with it.
 */
const bareItem = await addBareItem()

const server = await DemoServer.start({ content: SHOTS })
const base = server.base
const pagePath = `/epics/${docName}/${docName}.plan.html`
const url = `${base}${pagePath}`
summary.url = url

const browser = await BrowserPage.launch()
try {
  await run()
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
  rmSync(inboxFile, { force: true })
  rmSync(inboxFile.replace(/\.json5$/, ".json"), { force: true })
}
summary.tool = said
summary.wakes = server.wakes
console.log(JSON.stringify(summary, null, 2))
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}

////////////////
// ## Flows
////////////////

async function run() {
  // a context of its own, not `BrowserPage.newPage()`'s:  the layouts' pages share it (`layouts()`)
  const context = await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 })
  await context.addInitScript(BrowserPage.NAME_HELPER)
  // on every load, a live reload's too:  `rootOf(id)` queries element `id`'s shadow root, then those of the
  // `<epic-review>`s / `<epic-new-item>`s drawn in it (its review controls, P10)
  await context.addInitScript(() => {
    window.rootOf = (id) => {
      const root = document.getElementById(id).shadowRoot
      // the review controls' shadow roots, and their note's `<ui-textarea>`'s, where its native textarea is
      const inner = (parent) =>
        Array.from(parent.querySelectorAll("epic-review, epic-new-item, ui-textarea"), (it) => it.shadowRoot).filter(Boolean)
      const roots = () => {
        const controls = inner(root)
        return [root, ...controls, ...controls.flatMap(inner)]
      }
      return {
        querySelector: (selector) =>
          roots()
            .map((it) => it.querySelector(selector))
            .find(Boolean) ?? null,
        querySelectorAll: (selector) => roots().flatMap((it) => Array.from(it.querySelectorAll(selector))),
        // the focused element, inside the review control that holds the focus
        get activeElement() {
          let active = root.activeElement
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
          return active
        }
      }
    }
  })
  const page = await context.newPage()
  const logs = []
  BrowserPage.watch(page, { onProblem: logInto(logs) })
  await open(page)

  // Send:  in the page header from the start, grey with nothing marked (Owen, 2026-10-10);  no wand since Owen,
  // 2026-10-25 ("remove the wand EVERYWHERE")
  expect("the header's buttons, nothing marked", await headerState(page), {
    send: "idle",
    countdown: null,
    nobody: false,
    inHeader: true
  })

  // every item and Overview part:  the group (Make Todo, Revisit, Approve);  nothing apart (no Do Now since 2026-10-25)
  const ids = await page.evaluate(() =>
    Array.from(document.querySelectorAll("epic-item, epic-section[kind='overview-part']"), (element) => element.id)
  )
  const sections = ids.filter((id) => /^o\d+$/.test(id))
  const items = ids.filter((id) => !/^o\d+$/.test(id))
  summary.items = items.length
  summary.sections = sections.length
  for (const id of ids) {
    const layout = await page.evaluate(
      (id) => ({
        limit: document.getElementById(id).hasAttribute("limit"),
        group: Array.from(
          rootOf(id).querySelectorAll(".review-group ui-button[data-action]"),
          (button) => button.dataset.action
        ),
        apart: Array.from(rootOf(id).querySelectorAll(".review-controls > ui-button"), (button) => button.dataset.action)
      }),
      id
    )
    // a todo's (no `limit`;  `t`, a caveat `c` from epic `epic-engine` P32 to P44):  the plane (next phase), Revisit,
    // the x (drop) (Owen, 2026-10-09)
    const todo = /^t\d+$/.test(id) && !layout.limit
    delete layout.limit
    const group = todo
      ? ["next", "revisit", "drop"]
      : /^o\d+$/.test(id)
        ? ["todo", "revisit"]
        : ["todo", "revisit", "approve"]
    expect(`${id}'s buttons`, layout, { group, apart: [] })
  }
  expect(
    "<epic-page reviewing>",
    await page.evaluate(() => document.querySelector("epic-page").hasAttribute("reviewing")),
    true
  )

  const listed = await page.evaluate(() =>
    Array.from(document.querySelectorAll("epic-item"), (item) => ({
      id: item.id,
      open: item.getAttribute("status") === "open",
      details: item.hasAttribute("source") || Array.from(item.children).some((child) => !child.hasAttribute("slot"))
    }))
  )
  const { question, approved, withDetails, bare } = pickItems(
    listed.filter((item) => item.id !== pickCall && item.id !== bareItem),
    bareItem
  )
  const section = sections[0]
  summary.picked = { question, approved, withDetails, bare, section }

  // the fill:  pressed dashed in its colour;  pressed again, none
  await press(page, question, "approve")
  await expectMark(page, question, { action: "approve" }, "Approve")
  expect("Approve pressed:  dashed green", await buttonState(page, question, "approve"), {
    fill: "dashed",
    color: "green"
  })
  await press(page, question, "approve")
  await expectMark(page, question, undefined, "Approve again (cleared)")
  expect("Approve again:  none", (await buttonState(page, question, "approve")).fill, "none")
  await press(page, question, "todo")
  await expectMark(page, question, { action: "todo" }, "the line's Make Todo")
  expect("Make Todo pressed:  dashed green", await buttonState(page, question, "todo"), {
    fill: "dashed",
    color: "green"
  })
  await press(page, question, "todo")
  await expectMark(page, question, undefined, "Make Todo again (cleared)")

  // an Approve to see through:  sent, then applied (cleared, the chip green)
  await press(page, approved, "approve")
  await expectMark(page, approved, { action: "approve" }, `Approve on ${approved}`)

  // a todo's plane and x (Owen, 2026-10-09):  marked dashed, green and grey;  applied below
  // open ones:  a real doc's done todos can't be queued (its chip outlined only while open)
  const todos = listed.filter((item) => item.open && /^t\d+$/.test(item.id)).map((item) => item.id)
  if (todos.length >= 2) {
    await press(page, todos[0], "next")
    await expectMark(page, todos[0], { action: "next" }, `the plane on ${todos[0]}`)
    expect(`${todos[0]}'s plane:  dashed green`, await buttonState(page, todos[0], "next"), {
      fill: "dashed",
      color: "green"
    })
    await press(page, todos[1], "drop")
    await expectMark(page, todos[1], { action: "drop" }, `the x on ${todos[1]}`)
    expect(`${todos[1]}'s x:  dashed grey`, await buttonState(page, todos[1], "drop"), {
      fill: "dashed",
      color: "grey"
    })
  }

  // Revisit on an item with details:  opens, docked box focused, grows, the box's x (skip this) with the note
  await press(page, withDetails, "revisit")
  await page
    .waitForFunction(
      (id) => document.getElementById(id).open && rootOf(id).activeElement?.matches("textarea"),
      withDetails,
      { timeout: 4000 }
    )
    .catch(() => problems.push(`${withDetails}:  Revisit didn't open it with its note box focused`))
  expect(
    `${withDetails}'s note box buttons`,
    await page.evaluate(
      (id) => Array.from(rootOf(id).querySelectorAll(".note-actions button"), (button) => button.dataset.how),
      withDetails
    ),
    ["soon", "skip"]
  )
  const before = await boxHeight(page, withDetails)
  await page.keyboard.type(Array.from({ length: 10 }, (_, line) => `line ${line + 1}`).join("\n"))
  const after = await boxHeight(page, withDetails)
  if (!(after > before + 60)) problems.push(`${withDetails}:  the note box didn't grow (${before} -> ${after})`)
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.type(SKIP_NOTE)
  await noteButton(page, withDetails, "skip")
  await expectMark(page, withDetails, { action: "skip", note: SKIP_NOTE }, "the box's x (skip this)")
  expect(`${withDetails}'s box emptied`, await noteValue(page, withDetails), "")
  // no line button wears a skip:  the id chip alone shows it, dashed, in its STATE's colour (no colour of its own:
  // Owen, 2026-10-11, epic `epic-workflow` I6:  a live mark's chip keeps its state's colour, so the counts match)
  expect(
    `${withDetails}'s chip, skipped, unsent:  dashed, its state's colour`,
    await page.evaluate((id) => {
      const chip = rootOf(id).querySelector("[part~='id']")
      return { fill: chip.dataset.fill, color: chip.dataset.color ?? null }
    }, withDetails),
    { fill: "dashed", color: null }
  )

  // an item without details:  a box under its line;  typing turns Revisit on at once (epic `epic-engine` P20:  "when I
  // type in the revisit box, revisit is automatically on"), saved on Tab;  after a reload, the marked note;  Edit, Later
  await press(page, bare, "revisit")
  await page.waitForTimeout(300)
  await page.keyboard.type(NOTE)
  await page.keyboard.press("Tab")
  await waitInbox(
    page,
    (inbox) => inbox.marks[bare]?.action === "revisit" && inbox.marks[bare]?.note === NOTE && !inbox.drafts[bare],
    `${bare}:  typing turned Revisit on, saved on Tab`
  )
  expect(`${bare}'s Revisit, turned on by typing:  dashed blue`, await buttonState(page, bare, "revisit"), {
    fill: "dashed",
    color: "blue"
  })
  const floppy = await page.evaluate((id) => rootOf(id).querySelector(".note-saved")?.getAttribute("title") ?? "", bare)
  if (!/^Saved/.test(floppy)) problems.push(`${bare}:  the floppy says "${floppy}", not Saved`)
  await open(page)
  const bubble = await page.evaluate((id) => !!rootOf(id).querySelector(".review-noted"), bare)
  if (!bubble) problems.push(`${bare}:  no note bubble for its revisit after a reload`)
  const saidNote = await page.evaluate((id) => rootOf(id).querySelector(".said")?.textContent ?? "", bare)
  if (!saidNote.includes("revisit soon") || !saidNote.includes(NOTE))
    problems.push(`${bare}:  the said note reads "${saidNote}"`)
  await page.locator(`#${bare} .said-edit`).click()
  await page.waitForTimeout(300)
  expect(`${bare}:  Edit puts the note back`, await noteValue(page, bare), NOTE)
  await page.evaluate((id) => rootOf(id).querySelector("textarea").focus(), bare)
  await noteButton(page, bare, "soon")
  await expectMark(page, bare, { action: "revisit", when: "soon", note: NOTE }, "Later")
  // left in the box, not changed:  the mark stays as it was
  await page.keyboard.press("Escape")

  // Revisit WITH a note (an Overview part):  typing turns Revisit on (epic `epic-engine` P20), dashed blue
  if (section) {
    await press(page, section, "revisit")
    await page
      .waitForFunction((id) => rootOf(id).activeElement?.matches("textarea"), section, { timeout: 4000 })
      .catch(() => problems.push(`${section}:  Revisit didn't focus its note box`))
    await page.keyboard.type(SECTION_NOTE)
    await page.keyboard.press("Tab")
    await waitInbox(
      page,
      (inbox) => inbox.marks[section]?.action === "revisit" && inbox.marks[section]?.note === SECTION_NOTE,
      `${section}:  typing its note turns Revisit on`
    )
    await page.waitForTimeout(200)
    expect(`${section}'s Revisit, typed:  dashed blue`, await buttonState(page, section, "revisit"), {
      fill: "dashed",
      color: "blue"
    })
    await page.screenshot({ path: join(out, "review-marked.png") })
  }

  // a pick on the judgement call's REPLY cards (I8):  its set named by position, the pill dashed;  the text's untouched
  await openBody(page, pickCall)
  await page.waitForTimeout(400)
  expect(`${pickCall}'s pills, text then reply`, await pickPills(page, pickCall), [
    ["choose", "choose"],
    ["choose", "choose", "choose"]
  ])
  await page.locator(`#${pickCall} epic-reply epic-option[letter="C"] button[part~="choose"]`).click()
  await expectMark(page, pickCall, { action: "pick", pick: "C", choices: 1 }, "a pick on a reply's cards")
  expect(`${pickCall}'s pills, C picked`, await pickPills(page, pickCall), [
    ["choose", "choose"],
    ["choose", "choose", "dashed"]
  ])

  // the header's Send:  unsent marks, its tooltip saying nobody listens;  a click sends;  the marks outlined
  expect("the header's buttons, marks unsent", await headerState(page), {
    send: "unsent",
    countdown: null,
    nobody: true,
    inHeader: true
  })
  await page.locator('epic-page epic-send-buttons [part~="send"]').click()
  await waitInbox(page, (inbox) => !!inbox.sent, "Send:  the marks sent")
  await page.waitForTimeout(200)
  expect("the header's buttons, marks sent", await headerState(page), {
    send: "sent",
    countdown: null,
    nobody: true,
    inHeader: true
  })
  expect(`${approved}'s Approve, sent:  outlined`, (await buttonState(page, approved, "approve")).fill, "outline")
  expect(`${bare}'s Revisit, sent:  outlined`, (await buttonState(page, bare, "revisit")).fill, "outline")
  expect(`${pickCall}'s pick, sent:  outlined`, (await pickPills(page, pickCall))[1][2], "outline")
  // nobody listening:  the send woke the epic, through the demo server's stub (I11)
  expect("Send, nobody listening:  the epic woken (stubbed)", server.wakes.at(-1), docName)

  // Claude listens
  await tool.run(["inbox", docName, "watch", "--session", SESSION])
  await tool.run(["inbox", docName, "wait", "--timeout", "5", "--json"])
  await open(page)
  expect("listening:  the header's tooltips", (await headerState(page)).nobody, false)

  // a status card:  Underway (blue, the item `progress`), then Done (green)
  await tool.run(["status", docName, question, "underway", "<p>Write what the question's text leaves out.</p>"])
  await open(page)
  expect(`${question}:  an Underway card, the item in progress`, await statusOf(page, question), {
    cards: ["underway"],
    state: "progress"
  })
  await tool.run(["status", docName, question, "done", "<p>Added the cost of each option.</p>"])
  await open(page)
  const done = await statusOf(page, question)
  expect(`${question}:  the card Done`, done.cards, ["done"])

  // `inbox apply`:  the sent Approve applied, its button cleared, the chip green;  the skip reviewed, its note kept
  await tool.run(["inbox", docName, "apply"])
  await open(page)
  expect(`${approved}'s review-as`, await attribute(page, approved, "review-as"), "approve")
  expect(`${approved}'s Approve, applied:  cleared`, (await buttonState(page, approved, "approve")).fill, "none")
  expect(`${approved}'s chip, applied:  its state's, solid`, await chipState(page, approved), {
    fill: null,
    state: "recent"
  })
  await openBody(page, withDetails)
  expect(
    `${withDetails}:  skipped`,
    await page.evaluate((id) => {
      const item = document.getElementById(id)
      return {
        reviewAs: item.getAttribute("review-as"),
        status: item.getAttribute("status"),
        // the doc squeezes runs of spaces
        note: item.querySelector('epic-reply[from="Owen"][re="skip"]')?.textContent.replace(/\s+/g, " ") ?? null,
        chip: rootOf(id).querySelector("[part~='id']").dataset.fill ?? null
      }
    }, withDetails),
    { reviewAs: "skip", status: "open", note: SKIP_NOTE.replace(/\s+/g, " "), chip: null }
  )
  // a todo's plane:  queued for the next phase, a Noted card, its chip outlined green, the buttons cleared;  its x:  canceled, grey
  if (todos.length >= 2) {
    expect(`${todos[0]}'s review-as`, await attribute(page, todos[0], "review-as"), "next")
    expect(`${todos[0]}:  queued, a Noted card`, (await statusOf(page, todos[0])).cards.at(-1), "noted")
    expect(`${todos[0]}'s plane, applied:  cleared`, (await buttonState(page, todos[0], "next")).fill, "none")
    // queued, the work still due:  its chip OUTLINED (Owen, 2026-10-10)
    expect(`${todos[0]}'s chip, queued:  outlined`, (await chipState(page, todos[0])).fill, "outline")
    expect(`${todos[1]}:  canceled`, await attribute(page, todos[1], "status"), "canceled")
    expect(`${todos[1]}'s chip:  grey`, await chipState(page, todos[1]), { fill: null, state: "old" })
  }
  // the pick:  the call approved with the reply's C (closed), that set chosen, a Noted card, the pill solid
  await openBody(page, pickCall)
  expect(
    `${pickCall}, picked C from its reply`,
    await page.evaluate((id) => {
      const item = document.getElementById(id)
      return {
        status: item.getAttribute("status"),
        reviewAs: item.getAttribute("review-as"),
        chosen: Array.from(item.querySelectorAll("epic-choices"), (set) => set.getAttribute("chosen")),
        card: item.querySelector(':scope > epic-status[slot="status"]')?.textContent.trim().replace(/:.*/s, "")
      }
    }, pickCall),
    { status: "done", reviewAs: "approve", chosen: [null, "C"], card: "Chose C · Option C" }
  )
  await page.evaluate((id) => {
    const item = document.getElementById(id)
    item.open = true
    // the reply's Choices aside, unfolded:  its panels drawn
    item.querySelector("epic-reply epic-choices").shadowRoot.querySelector("[part~='toggle']").click()
  }, pickCall)
  await page.waitForTimeout(400)
  expect(`${pickCall}'s pills, applied`, await pickPills(page, pickCall), [
    [null, null],
    [null, null, "solid"]
  ])
  await page.locator(`#${pickCall} epic-reply`).scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, "review-picked.png") })
  await page.emulateMedia({ colorScheme: "dark" })
  await page.screenshot({ path: join(out, "review-picked-dark.png") })
  await page.emulateMedia({ colorScheme: "light" })
  await page.locator(`#${question}`).scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(out, "review-done.png") })

  // a countdown's send, as the wand's would be (epic `epic-engine` P20;  the wand's gone since 2026-10-25, the page still
  // takes one):
  // the revisit waiting (sent, to talk over) asked now, as Review Now did (decision Q7)
  await page.evaluate(() =>
    document
      .querySelector("epic-page")
      .shadowRoot.querySelector("epic-send-buttons")
      .dispatchEvent(new CustomEvent("epic-send-saving", { detail: { auto: true }, bubbles: true, composed: true }))
  )
  await waitInbox(
    page,
    (inbox) => inbox.now.some((each) => each.id === bare),
    `the countdown's send:  ${bare}'s revisit asked now`
  )

  // a COMMENT only:  Claude takes what the countdown's send asked first, so only the comment waits for Send
  await tool.run(["inbox", docName, "wait", "--timeout", "5", "--json"])
  // as the bullhorn writes it:  the comments route takes only the shared folders' pages, never this copy
  ReviewInbox.update(inboxFile, (box) => void box.commentList.add({ anchor: question, kind: "item" }, COMMENT))
  await waitHeader(page, (state) => state.send === "unsent", "Send, with only a comment waiting:  blue (unsent)")
  const unsent = await readInbox(page)
  expect("the inbox:  the comment unsent", unsent.unsentComments, ["c1"])
  await page.locator('epic-page epic-send-buttons [part~="send"]').click()
  await waitInbox(
    page,
    (inbox) => inbox.sent !== unsent.sent && inbox.unsentComments.length === 0,
    "Send, with only a comment:  sent"
  )
  await waitHeader(page, (state) => state.send !== "unsent", "Send, the comment sent:  no longer unsent")
  const heard = said.length
  const code = await tool.run(["inbox", docName, "wait", "--timeout", "5"])
  const woke = said.slice(heard).join("\n")
  expect("inbox wait:  woken by a send with only a comment", code ?? 0, 0)
  expect("inbox wait:  prints the comment", woke.includes(COMMENT) && /1 comment\)/.test(woke), true)
  await tool.run(["inbox", docName, "ignore"])

  await layouts(context)
  summary.inbox = await readInbox(page)
  if (logs.length) problems.push(...logs)
}

////////////////
// ## Layout
////////////////

/** At 280px and 900px, light and dark:  nothing past the window, nothing over a title, every glyph centred. */
async function layouts(context) {
  for (const scheme of ["light", "dark"]) {
    for (const width of [280, 900]) {
      const page = await context.newPage()
      await page.emulateMedia({ colorScheme: scheme })
      await page.setViewportSize({ width, height: 1100 })
      await open(page)
      const opened = await page.evaluate(() => {
        const item = document.querySelector("epic-item")
        item.open = true
        item.setAttribute("open", "")
        return item.id
      })
      await page.waitForTimeout(500)
      const { found, measured } = await page.evaluate(measure, width)
      for (const problem of found) problems.push(`${width}px ${scheme}:  ${problem}`)
      if (!measured) problems.push(`${width}px ${scheme}:  no review controls in view to measure`)
      await page.locator(`#${opened}`).scrollIntoViewIfNeeded()
      await page.screenshot({ path: join(out, `review-${width}-${scheme}.png`) })
      await page.close()
    }
  }
}

/** In the page:  what's wrong with the controls' layout at `width`. */
function measure(width) {
  const found = []
  let measured = 0
  for (const host of document.querySelectorAll("epic-item, epic-section[kind='overview-part']")) {
    const root = rootOf(host.id)
    const controls = root.querySelector(".review-controls")
    if (!controls) continue
    const box = controls.getBoundingClientRect()
    // folded away:  nothing to measure
    if (!box.width) continue
    measured++
    if (box.right > width + 0.5 || box.left < -0.5) found.push(`${host.id}'s controls run past the window`)
    const title = root.querySelector(".title, .header")
    if (title) {
      const range = document.createRange()
      range.selectNodeContents(title)
      // a title cut with "…" clips its text:  a range's rects run its full length, past what shows
      const clips = getComputedStyle(title).overflowX !== "visible"
      const shown = title.getBoundingClientRect()
      for (const whole of range.getClientRects()) {
        const right = clips ? Math.min(whole.right, shown.right) : whole.right
        const rect = { left: whole.left, top: whole.top, bottom: whole.bottom, right, width: right - whole.left }
        const overlaps =
          rect.right > box.left + 1 &&
          rect.left < box.right - 1 &&
          rect.bottom > box.top + 1 &&
          rect.top < box.bottom - 1
        if (overlaps && rect.width > 1) found.push(`${host.id}'s title runs under its controls`)
      }
    }
    for (const button of controls.querySelectorAll("ui-button")) {
      // a turning icon is mid-turn:  its box isn't centred while it turns
      if (button.hasAttribute("data-busy")) continue
      const inner = button.shadowRoot?.querySelector("button")
      const glyph = button.shadowRoot?.querySelector("svg, ui-icon")
      if (!inner || !glyph) continue
      const outer = inner.getBoundingClientRect()
      const icon = (glyph.shadowRoot?.querySelector("svg") ?? glyph).getBoundingClientRect()
      const dx = Math.abs(outer.left + outer.width / 2 - (icon.left + icon.width / 2))
      const dy = Math.abs(outer.top + outer.height / 2 - (icon.top + icon.height / 2))
      if (dx > 1 || dy > 1)
        found.push(`${host.id}'s ${button.dataset.action} glyph off centre by ${dx.toFixed(1)}, ${dy.toFixed(1)}`)
    }
  }
  // the header's round buttons (Send's plane, the git toggle):  in the window, centred
  const head = document.querySelector("epic-page")?.shadowRoot
  const round = [
    ...(head?.querySelector("epic-send-buttons")?.shadowRoot?.querySelectorAll("button") ?? []),
    ...(head?.querySelectorAll("button.git") ?? [])
  ]
  for (const button of round) {
    const outer = button.getBoundingClientRect()
    const icon = (
      button.querySelector("svg:not(.ring)") ?? button.querySelector("ui-icon")?.shadowRoot?.querySelector("svg")
    )?.getBoundingClientRect()
    if (outer.right > width + 0.5) found.push(`the header's ${button.className} runs past the window`)
    if (!icon) continue
    const dx = Math.abs(outer.left + outer.width / 2 - (icon.left + icon.width / 2))
    const dy = Math.abs(outer.top + outer.height / 2 - (icon.top + icon.height / 2))
    if (dx > 1 || dy > 1)
      found.push(`the header's ${button.className} glyph off centre by ${dx.toFixed(1)}, ${dy.toFixed(1)}`)
  }
  return { found: [...new Set(found)], measured }
}

////////////////
// ## Helpers
////////////////

/**
 * Copy the doc (and its parts) to `folder`, as they are:  the copy is as deep in the demo server's content folder
 * (`shots/epics/<name>/`) as a real doc is in the real one, so its links need no change.
 * - the sample:  `review-sample.html`, beside this script, which loads the engine from its routes (`/_epic/...`)
 */
function copyDoc() {
  rmSync(folder, { recursive: true, force: true })
  mkdirSync(folder, { recursive: true })
  if (docName === "review-sample" && !fromFolder) {
    writeFileSync(file, readFileSync(join(HERE, "review-sample.html"), "utf8"))
    return
  }
  const from = resolve(fromFolder ?? join(EPICS, docName))
  const skeleton = join(from, `${docName}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-review-epics:  no ${skeleton}`)
    process.exit(2)
  }
  writeFileSync(file, readFileSync(skeleton, "utf8"))
  const parts = join(from, "parts")
  if (!existsSync(parts)) return
  mkdirSync(join(folder, "parts"))
  for (const name of readdirSync(parts)) writeFileSync(join(folder, "parts", name), readFileSync(join(parts, name)))
  // never the real doc's inbox, agents or details:  the copy starts clean
}

/** Load the page, wait for the controls. */
async function open(page) {
  await page.goto(url)
  await page
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push("the page never said it's being reviewed (<epic-page reviewing>)"))
  // every section unfolded, as a reader looking at its items has them
  await page.evaluate(() => {
    for (const fold of document.querySelectorAll("epic-overview, epic-section")) fold.setAttribute("open", "")
  })
  await page.waitForTimeout(600)
}

/**
 * The items to click, four different ones (`items`:  `{ id, open, details }` each, in page order):
 * - a question (its status cards)
 * - an open item with details
 * - an open one without:  `bare`, the one added to the copy (`addBareItem()`)
 * - an open item Approve closes or reviews, not a question (approving one needs a recommended option)
 */
function pickItems(items, bare) {
  const taken = new Set()
  const take = (...tests) => {
    for (const test of tests) {
      const found = items.find((item) => !taken.has(item.id) && test(item))
      if (found) return taken.add(found.id) && found.id
    }
    throw new Error(`check-review-epics:  the doc hasn't the items the check needs (${JSON.stringify(items)})`)
  }
  const question = take(
    (item) => item.open && item.id.startsWith("q"),
    (item) => item.open
  )
  const withDetails = take(
    (item) => item.open && item.details && item.id.startsWith("j"),
    (item) => item.details
  )
  // not a todo:  a todo has no Approve (Owen, 2026-10-09)
  const approved = take(
    (item) => item.open && !item.id.startsWith("q") && !item.id.startsWith("t"),
    (item) => item.open && !item.id.startsWith("t")
  )
  return { question, approved, withDetails, bare }
}

/**
 * Open item `id` and wait (4s at most) for its body:  a split doc's part (`source`) loads only once it's opened,
 * and what Claude wrote into it (a reply, a chosen set) is in the page only then.
 */
async function openBody(page, id) {
  await page.evaluate((id) => (document.getElementById(id).open = true), id)
  await page
    .waitForFunction(
      (id) => {
        const item = document.getElementById(id)
        return !item.hasAttribute("source") || item.matches(":state(loaded)")
      },
      id,
      { timeout: 4000 }
    )
    .catch(() => problems.push(`${id}:  its body never loaded`))
}

/** Click `id`'s `action` button, with the mouse (Playwright's CSS reaches into open shadow roots). */
async function press(page, id, action) {
  await page.locator(`#${id} ui-button[data-action="${action}"]`).first().click()
  await page.waitForTimeout(150)
}

/** Click `id`'s note box button `how`, with the mouse. */
async function noteButton(page, id, how) {
  await page.locator(`#${id} .note-actions button[data-how="${how}"]`).first().click()
  await page.waitForTimeout(250)
}

/** `id`'s `action` button, as drawn:  its fill, its colour. */
function buttonState(page, id, action) {
  return page.evaluate(
    ({ id, action }) => {
      const button = rootOf(id).querySelector(`ui-button[data-action="${action}"]`)
      return { fill: button.dataset.fill, color: button.dataset.color }
    },
    { id, action }
  )
}

/**
 * Item `id`'s id chip, as drawn:
 * - its fill (`null`:  no live mark, so its state's colour, solid)
 * - its state (the item box's class word:  `recent`, `open` ...)
 */
function chipState(page, id) {
  return page.evaluate((id) => {
    const root = document.getElementById(id).shadowRoot
    const chip = root.querySelector("[part~='id']")
    const box = root.querySelector("[part~='base']")
    const state = ["attention", "progress", "open", "recent", "old"].find((name) => box.classList.contains(name))
    return { fill: chip.dataset.fill ?? null, state }
  }, id)
}

/**
 * Item `id`'s Choose pills, per card set (`<epic-choices>`, in page order), as the fill rule draws them:
 * `choose` (a grey outline), `dashed` (picked, unsent), `outline` (sent), `solid` (applied);  `null` with no pill.
 */
function pickPills(page, id) {
  return page.evaluate(
    (id) =>
      Array.from(document.getElementById(id).querySelectorAll("epic-choices"), (set) =>
        Array.from(set.querySelectorAll(":scope > epic-option"), (option) => {
          const pill = option.shadowRoot.querySelector("[part~='choose']")
          if (!pill) return null
          if (pill.classList.contains("applied"))
            return getComputedStyle(pill).backgroundColor === getComputedStyle(pill).borderTopColor
              ? "solid"
              : "applied, not solid"
          if (pill.getAttribute("aria-pressed") !== "true") return "choose"
          return getComputedStyle(pill).borderTopStyle === "dashed" ? "dashed" : "outline"
        })
      ),
    id
  )
}

/**
 * Add to the copy, by the tool, a judgement call whose text holds option cards,
 * and whose reply holds three more (`A`-`C`, `Option C` ...);  returns its id.
 */
async function addPickCall() {
  const cards = (letters) =>
    `<epic-choices>${letters.map((letter) => `<epic-option letter="${letter}" title="Option ${letter}"><p>why ${letter}</p></epic-option>`).join("")}</epic-choices>`
  const details =
    `<p>Two ways to store it.</p>${cards(["A", "B"])}` +
    `<epic-reply from="Claude" at="2026-10-08 10:00"><p>Or a third.</p>${cards(["A", "B", "C"])}</epic-reply>`
  await tool.run(["add", docName, "judgement", "check-review-epics:  which store?", "--details", details])
  return said.at(-1).toLowerCase()
}

/** Add to the copy, by the tool, an open issue with no details;  returns its id. */
async function addBareItem() {
  await tool.run(["add", docName, "issue", "check-review-epics:  an item with no details"])
  return said.at(-1).toLowerCase()
}

/** `id`'s status cards (their `state`, in order) and its chip's state. */
function statusOf(page, id) {
  return page.evaluate((id) => {
    const item = document.getElementById(id)
    return {
      cards: Array.from(item.querySelectorAll(':scope > epic-status[slot="status"]'), (card) =>
        card.getAttribute("state")
      ),
      state: item.getAttribute("state")
    }
  }, id)
}

/** `id`'s attribute `name`, as the doc has it. */
function attribute(page, id, name) {
  return page.evaluate(({ id, name }) => document.getElementById(id).getAttribute(name), { id, name })
}

/**
 * The page header's Send (`<epic-send-buttons>`, epic `epic-engine` P20), as drawn:  Send's state,
 * the wand's mode (`aria-pressed`;  `null`:  no wand, since 2026-10-25), whether the plane says nobody listens, and whether it sits in the sticky header.
 */
function headerState(page) {
  return page.evaluate((nobody) => {
    const group = document.querySelector("epic-page").shadowRoot.querySelector("epic-send-buttons")
    const plane = group?.shadowRoot?.querySelector('[part~="send"]')
    const wand = group?.shadowRoot?.querySelector('[part~="countdown"]')
    return {
      send: group?.getAttribute("state") ?? null,
      countdown: wand?.getAttribute("aria-pressed") ?? null,
      nobody: new RegExp(nobody).test(plane?.title ?? ""),
      inHeader: !!group?.closest("header")
    }
  }, NOBODY.source)
}

/** `id`'s note box's text;  none drawn:  `null`. */
function noteValue(page, id) {
  return page.evaluate((id) => rootOf(id).querySelector("textarea")?.value ?? null, id)
}

/** `id`'s note box's height. */
function boxHeight(page, id) {
  return page.evaluate((id) => rootOf(id).querySelector("textarea")?.getBoundingClientRect().height ?? 0, id)
}

/** The inbox, as the page's routes answer it. */
function readInbox(page) {
  return page.evaluate(
    async (pagePath) => (await fetch(`/api/epics/review/inbox?page=${encodeURIComponent(pagePath)}`)).json(),
    pagePath
  )
}

/** Wait (2s at most) for the inbox to pass `test`. */
async function waitInbox(page, test, what) {
  for (let tries = 0; tries < 20; tries++) {
    if (test(await readInbox(page))) return
    await page.waitForTimeout(100)
  }
  problems.push(`${what}:  not in the inbox`)
}

/** Wait (8s at most:  the page re-reads its inbox every 4s) for the header's buttons to pass `test`. */
async function waitHeader(page, test, what) {
  for (let tries = 0; tries < 80; tries++) {
    if (test(await headerState(page))) return
    await page.waitForTimeout(100)
  }
  problems.push(`${what}:  ${JSON.stringify(await headerState(page))}`)
}

/** Wait for `id`'s mark to be `mark` (`undefined`:  none). */
async function expectMark(page, id, mark, what) {
  await waitInbox(
    page,
    (inbox) =>
      mark ? Object.entries(mark).every(([key, value]) => inbox.marks[id]?.[key] === value) : !inbox.marks[id],
    `${what} (${id})`
  )
}

/** Note a problem unless `actual` deep-equals `wanted`. */
function expect(what, actual, wanted) {
  if (JSON.stringify(actual) !== JSON.stringify(wanted))
    problems.push(`${what}:  ${JSON.stringify(actual)}, wanted ${JSON.stringify(wanted)}`)
}

