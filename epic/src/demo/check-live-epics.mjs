/**
 * Check that a live edit updates an epic page in `<epic-*>` markup IN PLACE (P10 of epic `epic-components`),
 * in a real browser:  the `<epic-*>` elements are patched, never replaced, and the reader's state stays;
 * and that a change to the page's CODE reloads it ONCE, back where the reader was (I23 of epic `epic-engine`).
 * Usage (from the repo root):  node src/demo/check-live-epics.mjs [epic id] [--item <id>] [--bundle <spell-ui.js>]
 * - works on a COPY of epic page `epics/<name>/` (default `windows-and-review`;  its skeleton and parts, never its
 *   inbox), in `src/demo/shots/live/epics/<name>/` (git-ignored), as deep as a real one;  deleted afterwards
 * - the server:  a page server of its OWN (`DemoServer`:  spell-epic's `EpicServer` on a free port, no pid file),
 *   serving `src/demo/shots/live/`;  it wakes nobody;  stopped at the end
 * - the page is REVIEWED:  the review routes (`/api/epics/review/...`) are answered here, an empty inbox with a session
 *   listening, so the items draw their review controls and nothing reaches the copy's inbox
 * - the reader's state:
 *   - item `--item` (default `q2`:  one with a part, not approved) opened by a link to it (its part loads)
 *   - a half-typed note in its note box (`<epic-item>`'s, in its shadow root) with the focus
 *   - the page scrolled to put the item a third of the way down
 * - three edits, each announced as the page server's watcher would (`announce()`), waited for on the page,
 *   then checked:
 *   - the page did NOT reload (a `window` marker survives)
 *   - the item, the page and the Overview are the SAME elements (a marker on each)
 *   - the item is still open, and `<epic-page reviewing>` stays
 *   - the note's text and focus are kept, and the scroll is where it was (2px)
 * - and NO BLINK (I6):  from the reader's state on,
 *   the item's details box (in its shadow root) is never hidden,
 *   and its note box never leaves the page or loses the focus, not even for a moment
 *   - watched by a MutationObserver (every change, however brief)
 *   - and sampled on every animation frame (what the reader could have seen)
 *   1. the doc:  the item's `title` changes (an attribute patched in place)
 *   2. the item's PART (`parts/<id>.html`):  a paragraph added (the part re-fetched in place:  `wireSourceBodies()`)
 *   3. the doc:  the Overview's summary text changes (`<epic-summary>`'s text, inside `<epic-overview>`);
 *      skipped on a page without one
 * - then the CODE changes (`spell-ui.js`, announced the same way):  see `codeReload()`
 *   - first a section and two of its items opened by hand, the page scrolled into them
 *   - no reload while the note box has the focus, an "Updated:  reload" pill instead;  one once the focus leaves it
 *   - after it:  the scroll (2px), every block and item open before (the one a link opened too), the note's text
 *     (from the inbox's drafts, which the faked routes keep)
 * - `--bundle`:  serve this file in place of the checkout's `spell-ui.js` (a runtime not yet built into it)
 * - prints a JSON summary on stdout, problems on stderr;  exit 1 on any problem, 2 without the epic page
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))

/** The checkout's root. */
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_LIVE_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_LIVE_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { chromium } = await import("playwright")
const { DemoServer } = await import("./DemoServer.ts")
const { EpicConfig } = await import("spell-epic/config/EpicConfig.ts")

/** What the reader types into the note box. */
const NOTE = "half-typed note"

/** How long an edit may take to show on the page. */
const EDIT_TIMEOUT_MS = 10_000

/** How long a code change is left waiting while the note box has the focus:  past the live client's 500ms quiet. */
const RELOAD_WAIT_MS = 1500

/** How long the reloaded page gets to draw and land:  its parts, and the runtime's hold on the scroll (1.5s). */
const LANDED_MS = 3000

/**
 * The inbox the faked review routes answer with:  nothing marked, a session listening.
 * - its drafts are kept (`inboxFor()`):  a note typed before a reload comes back from them, as from the real inbox
 */
const INBOX = { marks: {}, drafts: {}, sent: null, now: [], working: {}, listening: { session: "check-live" } }

const args = process.argv.slice(2)
const name = args.find((arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--")) ?? "windows-and-review"
const itemId = valueOf("--item") ?? "q2"
const bundle = valueOf("--bundle")
const source = join(EpicConfig.contentOf(ROOT), "epics", name)
// under an `epics/<name>/` folder, as deep as the real one:  its links need no change
const copyRoot = join(HERE, "shots", "live")
const copy = join(copyRoot, "epics", name)
const docFile = join(copy, `${name}.plan.html`)
const partFile = join(copy, "parts", `${itemId}.html`)
if (!existsSync(join(source, `${name}.plan.html`))) {
  console.error(`check-live-epics:  no epic page ${join(source, `${name}.plan.html`)}`)
  process.exit(2)
}
rmSync(copyRoot, { recursive: true, force: true })
// the skeleton and its parts:  never the real page's inbox, agents or details
cpSync(join(source, `${name}.plan.html`), docFile)
if (existsSync(join(source, "parts"))) cpSync(join(source, "parts"), join(copy, "parts"), { recursive: true })
const server = await DemoServer.start({ content: copyRoot })
const url = `${server.base}/epics/${name}/${name}.plan.html`

const problems = []
const summary = { url, item: itemId, bundle: bundle ?? null, edits: [] }
const browser = await chromium.launch()

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(String(error)))
  await page.route("**/api/epics/review/**", (route) => route.fulfill({ json: inboxFor(route.request()) }))
  if (bundle) {
    const script = readFileSync(resolve(bundle))
    await page.route("**/_epic/assets/spell-ui.js", (route) =>
      route.fulfill({ body: script, contentType: "text/javascript" })
    )
  }
  await page.goto(url)
  await page.waitForFunction(() => customElements.get("epic-item") && window.SPELL_SERVER?.readPage, null, {
    timeout: 20_000
  })
  await page.waitForTimeout(800)

  // the reader's state:  the item opened through a link, its part loaded, a note typed, the item a third down
  await page.evaluate((id) => (location.hash = `#${id}`), itemId)
  await page.waitForFunction((id) => document.getElementById(id)?.matches(":state(loaded)"), itemId, {
    timeout: EDIT_TIMEOUT_MS
  })
  const note = page.locator(`#${itemId} textarea`).first()
  try {
    await note.waitFor({ timeout: EDIT_TIMEOUT_MS })
    await note.fill(NOTE)
  } catch {
    problems.push(`#${itemId} drew no note box (is the page reviewed?  is epic-review in the pack?)`)
  }
  await page.waitForTimeout(400)
  await page.evaluate(readerState, itemId)
  await page.evaluate(watchBlinks, itemId)
  const before = await page.evaluate(stateNow, itemId)
  summary.before = before
  if (!before.open) problems.push(`#${itemId} didn't open from a link to it`)
  if (before.note === NOTE && !before.focused) problems.push("the note box didn't keep the focus")

  await edit("an item's title (the doc)", "doc", () => {
    const html = readFileSync(docFile, "utf8")
    const changed = html.replace(new RegExp(`(id="${itemId}"\\s+title=")([^"]*)"`), `$1$2 (check-live)"`)
    if (changed === html) throw new Error(`no title on #${itemId} in ${docFile}`)
    writeFileSync(docFile, changed)
    return (id) => document.getElementById(id)?.getAttribute("title")?.endsWith("(check-live)")
  })
  await edit("the item's part (parts/<id>.html)", "part", () => {
    writeFileSync(partFile, `${readFileSync(partFile, "utf8")}\n<p id="check-live-part">check-live</p>\n`)
    return () => !!document.getElementById("check-live-part")
  })
  await edit("the Overview's summary (<epic-summary>'s text, in <epic-overview>)", "doc", () => {
    const html = readFileSync(docFile, "utf8")
    const changed = html.replace(/(<epic-summary>)/, `$1check-live summary. `)
    // an epic page without one (a newer one's Overview has parts instead):  nothing to edit there
    if (changed === html) return undefined
    writeFileSync(docFile, changed)
    return () => !!document.querySelector("epic-overview epic-summary")?.textContent.includes("check-live summary")
  })
  await codeReload()
  if (errors.length) problems.push(`page errors:  ${errors.join(" | ")}`)

  /**
   * 4. The page's CODE changes (`spell-ui.js` rebuilt, announced as the watcher would):  ONE reload, which keeps the
   *    reader's place (epic `epic-engine` I23).
   * - first more of the reader's state:  a section and two of its items opened by hand, the page scrolled into the
   *   second item, so the address (which follows the section being read) names the section, far above
   * - while the note box has the focus:  no reload yet, the "Updated:  reload" pill shows
   * - the focus leaves the box:  the page reloads, then must keep the scroll, every block open before (the item a
   *   link opened too), and the note's text
   */
  async function codeReload() {
    const label = "a code change (spell-ui.js rebuilt)"
    const opened = await openByHand(page, itemId)
    if (!opened.items.length) return problems.push(`${label}:  no section with two items to open by hand`)
    await page.waitForTimeout(800)
    const before = await page.evaluate(placeNow)
    const script = await page.evaluate(() => {
      const tag = document.querySelector('script[src*="spell-ui.js"]')
      return tag && new URL(tag.src).pathname
    })
    if (!script) return problems.push(`${label}:  the page loaded no spell-ui.js`)
    await page.evaluate((path) => window.__spellLiveChange(path), script)
    await page.waitForTimeout(RELOAD_WAIT_MS)
    const waited = await page.evaluate(() => ({
      marker: window.__checkLive === true,
      pill: !!document.querySelector("body > button[data-spell-added]")
    }))
    if (!waited.marker) problems.push(`${label}:  reloaded while the note box had the focus`)
    else if (!waited.pill) problems.push(`${label}:  no "Updated:  reload" pill while the note box had the focus`)
    const reloaded = page.waitForEvent("load", { timeout: EDIT_TIMEOUT_MS })
    await page.evaluate(blurNote, itemId)
    try {
      await reloaded
    } catch {
      return problems.push(`${label}:  no reload once the focus left the note box`)
    }
    await page.waitForFunction(() => customElements.get("epic-item") && window.SPELL_SERVER?.readPage, null, {
      timeout: 20_000
    })
    await page.waitForTimeout(LANDED_MS)
    const after = await page.evaluate(placeNow)
    const note = await page.evaluate(noteOf, itemId)
    summary.codeReload = { opened, before, after, note }
    const lost = []
    if (after.marker) lost.push("the page didn't reload")
    if (Math.abs(after.y - before.y) > 2) lost.push(`scroll moved:  ${before.y} -> ${after.y} (address #${before.hash})`)
    const folded = before.open.filter((id) => !after.open.includes(id))
    if (folded.length) lost.push(`folded again:  ${folded.join(", ")}`)
    if (note !== NOTE) lost.push(`the note's text lost:  ${JSON.stringify(note)}`)
    for (const problem of lost) problems.push(`${label}:  ${problem}`)
  }

  /**
   * Make one edit to `file`, announce it, wait for it on the page, then check the reader's state against `before`.
   * - `file`:  `"doc"`, or the item's `"part"`
   * - `change()` writes it, and returns a page predicate for "it's in";  `undefined`:  the page has nothing to edit
   *   there, and the edit is skipped
   */
  async function edit(label, file, change) {
    const shown = change()
    if (!shown) return summary.edits.push({ label, skipped: true })
    await page.evaluate(announce, { file, id: itemId })
    let landed = true
    try {
      await page.waitForFunction(shown, itemId, { timeout: EDIT_TIMEOUT_MS })
    } catch {
      landed = false
      problems.push(`${label}:  never showed up on the page`)
    }
    await page.waitForTimeout(800)
    const after = await page.evaluate(stateNow, itemId)
    summary.edits.push({ label, landed, after })
    const lost = []
    if (!after.marker) lost.push("the page reloaded (its window marker is gone)")
    for (const kept of ["page", "item", "overview"]) if (!after.same[kept]) lost.push(`<epic-${kept}> was replaced`)
    if (!after.open) lost.push(`#${itemId} folded`)
    if (before.reviewing && !after.reviewing) lost.push("<epic-page> lost its `reviewing` (page state)")
    if (after.note !== before.note) lost.push(`typed text lost:  "${after.note}"`)
    if (before.focused && !after.focused) lost.push("the note box lost the focus")
    if (Math.abs(after.y - before.y) > 2) lost.push(`scroll moved:  ${before.y} -> ${after.y}`)
    const blinks = await page.evaluate(takeBlinks)
    if (blinks.length) lost.push(`blinked:  ${blinks.join(", ")}`)
    for (const problem of lost) problems.push(`${label}:  ${problem}`)
  }
} catch (error) {
  problems.push(`the check itself failed:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
  rmSync(copyRoot, { recursive: true, force: true })
}

for (const problem of problems) console.error(`PROBLEM:  ${problem}`)
console.log(JSON.stringify({ ...summary, ok: !problems.length }, null, 2))
process.exit(problems.length ? 1 : 0)

////////////////
// ## In the page
////////////////

/** In the page:  mark the window and the elements that must survive, scroll the item a third of the way down. */
function readerState(id) {
  window.__checkLive = true
  const item = document.getElementById(id)
  for (const element of [document.querySelector("epic-page"), item, document.querySelector("epic-overview")])
    element.__checkLive = true
  const top = item.getBoundingClientRect().top
  scrollTo({ top: scrollY + top - innerHeight / 3, behavior: "instant" })
}

/**
 * In the page:  note every moment item `id`'s details box is hidden, or its note box gone or unfocused (I6),
 * in `window.__checkLiveBlinks`:
 * - each change as it happens (a MutationObserver on its shadow root)
 * - and each animation frame (what a reader could have seen)
 */
function watchBlinks(id) {
  const blinks = (window.__checkLiveBlinks = new Set())
  const root = document.getElementById(id).shadowRoot
  // the note box is an `<epic-review>` in the item's shadow root, its textarea in its own
  const box = root.querySelector("[part~='note-box']")
  const note = box?.shadowRoot?.querySelector("textarea")
  const look = (when) => {
    const details = root.getElementById("details")
    if (!details || details.hasAttribute("hidden")) blinks.add(`details hidden (${when})`)
    if (!note?.isConnected) blinks.add(`note box gone (${when})`)
    else if (root.activeElement !== box || box.shadowRoot.activeElement !== note)
      blinks.add(`note box unfocused (${when})`)
  }
  new MutationObserver(() => look("on a change")).observe(root, { attributes: true, childList: true, subtree: true })
  const frame = () => {
    look("on a frame")
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

/** In the page:  the blinks seen since the last call;  forgets them. */
function takeBlinks() {
  const blinks = [...(window.__checkLiveBlinks ?? [])]
  window.__checkLiveBlinks?.clear()
  return blinks
}

/**
 * In the page:  tell its live client `file` changed,
 * as the page server's watcher would (`window.__spellLiveChange`, `packages/server/src/liveClient.ts`).
 * - `file`:  `"doc"`, the page's own file;  `"part"`, item `id`'s part
 * - the demo server's own watcher announces it too, a moment later:  the patch is the same either way
 * - everything after this is the real path
 */
function announce({ file, id }) {
  const path =
    file === "doc"
      ? window.SPELL_SERVER.file
      : new URL(document.getElementById(id).getAttribute("source"), document.baseURI).pathname
  window.__spellLiveChange(path)
}

/**
 * In the page:  where the reader is:  the scroll, the address, and every `<epic-*>` block and item that's open.
 * - `marker`:  the window from before a reload (`readerState()`'s)
 */
function placeNow() {
  const open = [...document.querySelectorAll("epic-overview, epic-section, epic-phase, epic-item")]
    .filter((block) => block.id && block.hasAttribute("open"))
    .map((block) => block.id)
  return { marker: window.__checkLive === true, y: Math.round(scrollY), hash: location.hash.slice(1), open }
}

/** In the page:  take the focus away from item `id`'s note box, as a click elsewhere would. */
function blurNote(id) {
  const box = document.getElementById(id).shadowRoot.querySelector("[part~='note-box']")
  box.shadowRoot.querySelector("textarea").blur()
}

/** In the page:  what item `id`'s note box holds, `null` without one. */
function noteOf(id) {
  const box = document.getElementById(id)?.shadowRoot?.querySelector("[part~='note-box']")
  return box?.shadowRoot?.querySelector("textarea")?.value ?? null
}

/** In the page:  where things stand. */
function stateNow(id) {
  const item = document.getElementById(id)
  const box = item?.shadowRoot?.querySelector("[part~='note-box']")
  const note = box?.shadowRoot?.querySelector("textarea")
  return {
    marker: window.__checkLive === true,
    same: {
      page: document.querySelector("epic-page")?.__checkLive === true,
      item: item?.__checkLive === true,
      overview: document.querySelector("epic-overview")?.__checkLive === true
    },
    open: !!item?.hasAttribute("open"),
    reviewing: !!document.querySelector("epic-page")?.hasAttribute("reviewing"),
    note: note?.value ?? null,
    focused:
      !!note &&
      document.activeElement === item &&
      item.shadowRoot.activeElement === box &&
      box.shadowRoot.activeElement === note,
    y: scrollY
  }
}

////////////////
// ## Helpers
////////////////

/**
 * The faked review routes' answer to `request`:  `INBOX`, with a session listening.
 * - a draft (`POST .../draft`, `{ id, action, note }`) is kept in it, or dropped when empty, as the real route does
 */
function inboxFor(request) {
  if (request.method() === "POST" && request.url().endsWith("/draft")) {
    const { id, action, note } = request.postDataJSON()
    if (note?.trim()) INBOX.drafts[id] = { action, note, at: new Date().toISOString() }
    else delete INBOX.drafts[id]
  }
  return { ...INBOX, listening: listener() }
}

/** A session listening, as the routes answer it:  its heartbeat now. */
function listener() {
  return { ...INBOX.listening, seen: new Date().toISOString() }
}

/**
 * Open a folded section by a click on its title, then two of its items by clicks on their lines;
 * scroll the second a third of the way down, and give the note box of item `noteId` the focus back (it lost it to
 * the clicks), without scrolling.
 * - the section:  the first folded `<epic-section>` with items, not holding `noteId`
 * - returns `{ section, items }`:  their ids;  `items` empty when no section had two that open
 */
async function openByHand(page, noteId) {
  const section = await page.evaluate((noteId) => {
    const sections = [...document.querySelectorAll("epic-section")]
    const found = sections.find(
      (section) => !section.open && section.querySelectorAll("epic-item").length >= 2 && !section.querySelector(`#${noteId}`)
    )
    return found?.id
  }, noteId)
  if (!section) return { section, items: [] }
  await clickOn(page, section, ".header")
  await page.waitForFunction((id) => document.getElementById(id).open, section, { timeout: EDIT_TIMEOUT_MS })
  const items = []
  const candidates = await page.evaluate(
    (id) => [...document.getElementById(id).querySelectorAll("epic-item")].map((item) => item.id),
    section
  )
  for (const id of candidates) {
    if (items.length === 2) break
    await clickOn(page, id, '[part~="title"]')
    await page.waitForTimeout(500)
    if (await page.evaluate((id) => document.getElementById(id).hasAttribute("open"), id)) items.push(id)
  }
  if (items.length < 2) return { section, items: [] }
  await page.evaluate(
    ({ last, noteId }) => {
      const top = document.getElementById(last).getBoundingClientRect().top
      scrollTo({ top: scrollY + top - innerHeight / 3, behavior: "instant" })
      const box = document.getElementById(noteId).shadowRoot.querySelector("[part~='note-box']")
      box.shadowRoot.querySelector("textarea").focus({ preventScroll: true })
    },
    { last: items[1], noteId }
  )
  return { section, items }
}

/** A real mouse click on `selector` in element `id`'s shadow root, scrolled to the middle of the window first. */
async function clickOn(page, id, selector) {
  const point = await page.evaluate(
    ({ id, selector }) => {
      const target = document.getElementById(id).shadowRoot.querySelector(selector)
      target.scrollIntoView({ block: "center", behavior: "instant" })
      const box = target.getBoundingClientRect()
      return { x: box.left + Math.min(20, box.width / 2), y: box.top + Math.min(8, box.height / 2) }
    },
    { id, selector }
  )
  await page.mouse.click(point.x, point.y)
}

/** The value after flag `flag`, if given. */
function valueOf(flag) {
  const at = args.indexOf(flag)
  return at < 0 ? undefined : args[at + 1]
}

