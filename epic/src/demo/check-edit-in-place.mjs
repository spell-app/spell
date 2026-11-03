/**
 * Check EDITING IN PLACE in a real browser (epic `epic-engine` P60):  a `<ui-markdown>` cell of a guide ⌥-clicked,
 * typed in and kept, straight into the page's file, the page never moving.
 *
 * Usage (from `epic/`):
 *   node src/demo/check-edit-in-place.mjs [--base <page server URL>] [--guide <page>] [outDir]
 * - `--base`:  the page server to use, default this checkout's (`spell server status`):  it must serve this branch's
 *   live client and docs bundle (`readElement()`, `SPELL_SERVER.writable`, the inline saver)
 * - the page:  a COPY of the guide (default `guides/atmosphere/spaces-and-spell.html`, its LOE table) in the epic
 *   folder's `pages/`, `check-edit-in-place.html`, deleted at the end:  never the guide itself
 * - checks, with the LOE table half way down the window:
 *   - every `<ui-markdown>` is `editable`, and the page says it may be saved
 *   - ⌥-click on the "Sign-in" cell:  a box holding its markdown, where the cell was
 *   - End, typing and Enter:  the file differs in that cell alone, its blocks' one-line tags and ignore lines kept;
 *     the page didn't reload, and neither the scroll nor the cell moved
 *   - a change behind the page (another cell, in the file):  patched in, beside the edit
 *   - another cell kept by the 5-second save, the box still open where it was, the scroll unmoved;  Escape puts it
 *     back, in the file too
 *   - the formatting bar (P61):  above the box;  ⌘A, ⌘B and Enter bold a cell in the file, the page unmoved;  again,
 *     the bold off
 *   - no page errors
 * - a screenshot of the table:  `edit-in-place.png` in outDir (default a temporary folder)
 * - exits 1 on any miss
 */
import { execFileSync } from "node:child_process"
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium } from "playwright"

const HERE = dirname(fileURLToPath(import.meta.url))
const KIT = resolve(HERE, "../../..")

const args = process.argv.slice(2)
const flag = (name) => {
  const at = args.indexOf(name)
  return at < 0 ? undefined : args.splice(at, 2)[1]
}
const base = flag("--base") ?? serverBase()
const guide = flag("--guide") ?? "guides/atmosphere/spaces-and-spell.html"
const outDir = args[0] ?? mkdtempSync(join(tmpdir(), "edit-in-place-"))
const content = execFileSync(process.execPath, [join(KIT, "epic/bin/epic"), "config", "contentFolder"], {
  encoding: "utf8"
}).trim()
const COPY = "pages/check-edit-in-place.html"
const file = join(content, COPY)
copyFileSync(join(content, guide), file)
const original = readFileSync(file, "utf8")

const misses = []
const check = (isOk, what) => {
  console.log(`${isOk ? "ok  " : "MISS"}  ${what}`)
  if (!isOk) misses.push(what)
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
  const errors = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => message.type() === "warning" && console.log(`      (page:  ${message.text()})`))
  page.on("framenavigated", (frame) => frame === page.mainFrame() && console.log(`      (navigated:  ${frame.url()})`))
  await page.goto(`${base}/${COPY}#loe`, { waitUntil: "load" })
  await page.waitForFunction(() => document.querySelector("#loe ui-markdown")?.shadowRoot?.querySelector("td"))
  // the page lands on #loe and settles first:  a scroll before that is undone
  await page.waitForTimeout(2_500)
  await page.evaluate(() => (window.__notReloaded = true))
  const facts = await page.evaluate(() => ({
    writable: window.SPELL_SERVER?.writable,
    all: document.querySelectorAll("ui-markdown").length,
    editable: document.querySelectorAll("ui-markdown[editable]").length
  }))
  check(facts.writable === true, "the page says it may be saved (SPELL_SERVER.writable)")
  check(
    facts.all > 0 && facts.editable === facts.all,
    `every <ui-markdown> is editable (${facts.editable}/${facts.all})`
  )

  ////////////////
  // ## Enter keeps one cell
  ////////////////

  await halfWay(page, "Sign-in")
  const before = await placeOf(page, "Sign-in")
  await altClick(page, before)
  const opened = await page.evaluate(boxFacts)
  check(opened.text === "Sign-in", `⌥-click shows the cell's markdown in a box ("${opened.text}")`)
  check(Math.abs(opened.top - before.top) < 1, `the box is where the cell was (${opened.top} vs ${before.top})`)
  await page.keyboard.press("End")
  await page.keyboard.type(" and out")
  const saved = savedOnce(page)
  await page.keyboard.press("Enter")
  await saved
  const kept = readFileSync(file, "utf8")
  const changed = changedLines(original, kept)
  check(
    changed.length === 1 && changed[0].after.includes("| 4 | Sign-in and out |"),
    `the file differs in that cell alone (${changed.map((line) => line.after.trim()).join(" / ")})`
  )
  check(count(kept, "<!-- prettier-ignore -->") === count(original, "<!-- prettier-ignore -->"), "ignore lines kept")
  check(splitTags(kept) === 0, "every block's tags still on one line")
  const after = await placeOf(page, "Sign-in and out")
  check(after.scroll === before.scroll, `the page didn't scroll (${before.scroll} -> ${after.scroll})`)
  check(after.top === before.top, `the cell didn't move (${before.top} -> ${after.top})`)
  check(await page.evaluate(() => window.__notReloaded === true), "the page didn't reload")

  ////////////////
  // ## A change behind the page
  ////////////////

  writeFileSync(file, kept.replace("| 1 | Drafts and versions |", "| 1 | Drafts and history |"))
  await page
    .waitForFunction(
      () => document.querySelector("#loe ui-markdown").shadowRoot.textContent.includes("Drafts and history"),
      undefined,
      { timeout: 10_000 }
    )
    .catch(() => {})
  const both = await page.evaluate(() => document.querySelector("#loe ui-markdown").shadowRoot.textContent)
  check(
    both.includes("Drafts and history") && both.includes("Sign-in and out"),
    "a change behind the page shows beside the edit"
  )

  ////////////////
  // ## The 5-second keep, then Escape
  ////////////////

  const cell = "Command to set up an org"
  await halfWay(page, cell)
  const at = await placeOf(page, cell)
  await altClick(page, at)
  await page.keyboard.press("End")
  await page.keyboard.type(" now")
  const autoSaved = savedOnce(page)
  await autoSaved
  const open = await page.evaluate(boxFacts)
  check(readFileSync(file, "utf8").includes(`| ${cell} now |`), "5 seconds without typing saved it")
  check(open.text === `${cell} now`, "the box stayed open after the 5-second save")
  check(
    open.scroll === at.scroll && Math.abs(open.top - at.top) < 1,
    `neither the page nor the box moved (${at.scroll} -> ${open.scroll})`
  )
  const putBack = savedOnce(page)
  await page.keyboard.press("Escape")
  await putBack
  check(readFileSync(file, "utf8").includes(`| ${cell} |`), "Escape put it back, in the file too")
  ////////////////
  // ## The formatting bar (P61)
  ////////////////

  const bold = "Projections"
  await halfWay(page, bold)
  const boldAt = await placeOf(page, bold)
  await altClick(page, boldAt)
  const barFacts = await page.evaluate(() => {
    const root = document.querySelector("#loe ui-markdown").shadowRoot
    const bar = root.querySelector("[part~=edit-bar]")?.getBoundingClientRect()
    const box = root.querySelector("[part~=edit-box]")?.getBoundingClientRect()
    return { bar: bar && { top: bar.top, bottom: bar.bottom, height: bar.height }, box: box && { top: box.top } }
  })
  check(
    !!barFacts.bar && barFacts.bar.height > 0 && barFacts.bar.bottom <= barFacts.box.top + 1,
    `the formatting bar sits just above the box (${barFacts.bar?.bottom} vs ${barFacts.box?.top})`
  )
  await page.keyboard.press("Meta+a")
  const scrolled = await page.evaluate(() => scrollY)
  const bolded = savedOnce(page)
  await page.keyboard.press("Meta+b")
  await page.keyboard.press("Enter")
  await bolded
  check(readFileSync(file, "utf8").includes(`| **${bold}** |`), "⌘B made the cell bold, in the file")
  check((await page.evaluate(() => scrollY)) === scrolled, "the bar and the bold didn't move the page")
  await altClick(page, await placeOf(page, bold))
  await page.keyboard.press("Meta+a")
  const unbolded = savedOnce(page)
  await page.keyboard.press("Meta+b")
  await page.keyboard.press("Enter")
  await unbolded
  check(readFileSync(file, "utf8").includes(`| ${bold} |`), "⌘B again took the bold off")
  await page.locator("#loe").screenshot({ path: join(outDir, "edit-in-place.png") })
  check(!errors.length, `no page errors${errors.length ? `:  ${errors.join(" / ")}` : ""}`)
} finally {
  await browser.close()
  rmSync(file, { force: true })
  for (const extra of ["inbox.json5", "draft.json5"]) rmSync(file.replace(/\.html$/, `.${extra}`), { force: true })
}
console.log(`screenshot:  ${join(outDir, "edit-in-place.png")}`)
process.exit(misses.length ? 1 : 0)

////////////////
// ## Helpers
////////////////

/** This checkout's page server, from `spell server status`. */
function serverBase() {
  const status = execFileSync(process.execPath, [join(KIT, "bin/spell.mjs"), "server", "status"], { encoding: "utf8" })
  return JSON.parse(status.slice(status.indexOf("{"))).base
}

/** Open the LOE section and put the cell saying `text` half way down the window. */
async function halfWay(page, text) {
  await page.evaluate(() => document.getElementById("loe").setAttribute("open", ""))
  // a folded section lays nothing out:  it opens first
  await page.waitForTimeout(600)
  await page.evaluate((text) => {
    const cells = document.querySelector("#loe ui-markdown").shadowRoot.querySelectorAll("td")
    ;[...cells].find((cell) => cell.textContent.trim() === text)?.scrollIntoView({ block: "center" })
  }, text)
  await page.waitForTimeout(600)
}

/** Where the cell saying `text` is:  its end's point, its top, and the page's scroll. */
async function placeOf(page, text) {
  return page.evaluate((text) => {
    const cells = document.querySelector("#loe ui-markdown").shadowRoot.querySelectorAll("td")
    const cell = [...cells].find((each) => each.textContent.trim() === text)
    const box = cell.getBoundingClientRect()
    return { x: box.right - 6, y: box.top + box.height / 2, top: box.top, scroll: scrollY }
  }, text)
}

/** ⌥-click at `place`. */
async function altClick(page, place) {
  await page.keyboard.down("Alt")
  await page.mouse.click(place.x, place.y)
  await page.keyboard.up("Alt")
  await page.waitForTimeout(200)
}

/** The open box:  its text, its top, and the page's scroll. */
function boxFacts() {
  const box = document.querySelector("#loe ui-markdown").shadowRoot.querySelector("[part~=edit-box]")
  return { text: box?.textContent, top: box?.closest("td").getBoundingClientRect().top, scroll: scrollY }
}

/** Resolves on the LOE block's next `ui-saved` (or `ui-error`), and the page's update after it. */
function savedOnce(page) {
  return page.evaluate(
    () =>
      new Promise((done) => {
        const markdown = document.querySelector("#loe ui-markdown")
        const finish = () => setTimeout(done, 800)
        markdown.addEventListener("ui-saved", finish, { once: true })
        markdown.addEventListener("ui-error", finish, { once: true })
      })
  )
}

/** The lines that differ between `before` and `after` (same line count). */
function changedLines(before, after) {
  const old = before.split("\n")
  return after
    .split("\n")
    .map((line, index) => ({ before: old[index], after: line }))
    .filter((line) => line.before !== line.after)
}

/** How often `text` holds `word`. */
function count(text, word) {
  return text.split(word).length - 1
}

/** How many `<ui-markdown>` start tags aren't followed by their script on the same line. */
function splitTags(text) {
  return (text.match(/<ui-markdown[^>]*>\s*\n\s*<script/g) ?? []).length
}
