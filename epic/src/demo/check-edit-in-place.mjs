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
 *     the bold off;  its inline code button (T67) there
 *   - a paragraph of the page's own HTML (T66):  ⌥-click, End, typing and Enter change that paragraph alone in the
 *     file, the page unmoved and not reloaded
 *   - a code block of the page's own (T66):  ⌥-click, End, a new line typed, ⌘Enter:  that block's text alone changed,
 *     escaped
 *   - the guide's opening paragraph (T86), with no element with an id around it in the file:  ⌥-click, End, typing
 *     and Enter change it alone, the whole file read and written back
 *   - a table of the page's own (T86):  ⌥-click a cell shows the bar of row and column buttons above it;  "Row" (+)
 *     adds an empty row below in the file and the page, its first cell open;  typed in and kept;  "Column" (+) adds
 *     an empty column;  "Row" (-) and "Column" (-) remove them again:  the file back as it was
 *   - no page errors
 * - `--engine-here`:  the page server is another checkout's (main's, on 4747), which serves its own docs bundle and
 *   live client under every address:  this checkout's are sent instead (`spell-ui.js`, `spell-doc.css`,
 *   `/api/server/live.js`), so
 *   a worktree's change is checked before it merges
 * - screenshots:  `edit-in-place.png` (the LOE table) and `table-edit.png` (the table bar) in outDir (default a
 *   temporary folder)
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
const engineHere = args.includes("--engine-here") && Boolean(args.splice(args.indexOf("--engine-here"), 1))
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
  if (engineHere) await useThisEngine(page)
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
  check(
    await page.evaluate(
      () =>
        !!document.querySelector("#loe ui-markdown").shadowRoot.querySelector('[part~=edit-bar] ui-button[icon="code"]')
    ),
    "the bar has the inline code button (T67)"
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
  ////////////////
  // ## The page's own HTML (T66)
  ////////////////

  const paragraph = await page.evaluate(() => {
    const blocks = "p, ul, ol, li, div, table, pre, blockquote, section, ui-section"
    const found = [...document.querySelectorAll("main ui-section[id] p")].find(
      (each) =>
        !each.closest("ui-markdown, [data-spell-added], [source], epic-page") &&
        !each.querySelector(blocks) &&
        (each.textContent ?? "").trim().length > 30
    )
    if (!found) return undefined
    for (let section = found.closest("ui-section"); section; section = section.parentElement?.closest("ui-section"))
      section.setAttribute("open", "")
    found.setAttribute("data-check-edit", "")
    return found.textContent.trim()
  })
  check(!!paragraph, "the guide has a paragraph of its own HTML")
  if (paragraph) {
    await page.waitForTimeout(600)
    await page.evaluate(() => document.querySelector("[data-check-edit]").scrollIntoView({ block: "center" }))
    await page.waitForTimeout(400)
    const spot = await page.evaluate(() => {
      const box = document.querySelector("[data-check-edit]").getBoundingClientRect()
      return { x: box.left + 8, y: box.top + 8, top: box.top, scroll: scrollY }
    })
    const fileBefore = readFileSync(file, "utf8")
    await altClick(page, spot)
    check(
      await page.evaluate(() => document.querySelector("[data-check-edit]").isContentEditable),
      "⌥-click made the paragraph editable"
    )
    await page.keyboard.press("End")
    const typingAt = await page.evaluate(() => scrollY)
    await page.keyboard.type(" Checked in place.")
    await page.keyboard.press("Enter")
    let fileAfter = fileBefore
    for (let wait = 0; wait < 25 && fileAfter === fileBefore; wait++) {
      await page.waitForTimeout(200)
      fileAfter = readFileSync(file, "utf8")
    }
    const lines = changedLines(fileBefore, fileAfter)
    writeFileSync(join(outDir, "paragraph-before.html"), fileBefore)
    writeFileSync(join(outDir, "paragraph-after.html"), fileAfter)
    check(
      fileAfter.includes(" Checked in place.") && fileAfter.replace(" Checked in place.", "") === fileBefore,
      `the paragraph alone changed in the file (${lines.length} line${lines.length === 1 ? "" : "s"})`
    )
    const moved = await page.evaluate(() => ({
      top: document.querySelector("[data-check-edit]").getBoundingClientRect().top,
      scroll: scrollY,
      editable: document.querySelector("[data-check-edit]").isContentEditable
    }))
    check(!moved.editable, "Enter kept it, the paragraph no longer editable")
    check(moved.scroll === typingAt, `keeping it didn't scroll the page (${typingAt} -> ${moved.scroll})`)
    check(await page.evaluate(() => window.__notReloaded === true), "the page didn't reload")
  }

  ////////////////
  // ## A code block of the page's own (T66)
  ////////////////

  const hasCode = await page.evaluate(() => {
    const found = [...document.querySelectorAll("main ui-section[id] pre > code")].find(
      (each) => !each.closest("ui-markdown, [data-spell-added], [source]")
    )
    if (!found) return false
    for (let section = found.closest("ui-section"); section; section = section.parentElement?.closest("ui-section"))
      section.setAttribute("open", "")
    // a code block is folded in its accordion (spell-code)
    found.closest("ui-accordion")?.setAttribute("open", "0")
    found.setAttribute("data-check-code", "")
    return true
  })
  check(hasCode, "the guide has a code block of its own")
  if (hasCode) {
    // a tall window:  the folded page may be too short to scroll the block to the middle
    await page.setViewportSize({ width: 1100, height: 1600 })
    await page.waitForTimeout(600)
    await page.evaluate(() => document.querySelector("[data-check-code]").scrollIntoView({ block: "center" }))
    await page.waitForTimeout(400)
    const spot = await page.evaluate(() => {
      // its middle:  its copy button sits at its first line's left
      const box = document.querySelector("[data-check-code]").getBoundingClientRect()
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    })
    const codeBefore = readFileSync(file, "utf8")
    await altClick(page, spot)
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await page.keyboard.type("// a < b, checked")
    await page.keyboard.press("Meta+Enter")
    let codeAfter = codeBefore
    for (let wait = 0; wait < 25 && codeAfter === codeBefore; wait++) {
      await page.waitForTimeout(200)
      codeAfter = readFileSync(file, "utf8")
    }
    writeFileSync(join(outDir, "code-before.html"), codeBefore)
    writeFileSync(join(outDir, "code-after.html"), codeAfter)
    const added = codeAfter.includes("// a &lt; b, checked")
    const at = codeAfter.indexOf("// a &lt; b, checked")
    const rest = codeAfter.slice(0, at - 1) + codeAfter.slice(at + "// a &lt; b, checked".length)
    check(added && rest === codeBefore, "the code block's text alone changed in the file, escaped")
  }

  await page.locator("#loe").screenshot({ path: join(outDir, "edit-in-place.png") })

  ////////////////
  // ## The opening paragraph, no id around it (T86)
  ////////////////

  await page.setViewportSize({ width: 1100, height: 900 })
  const lede = await page.evaluate(() => {
    const found = document.querySelector("main > p.lede")
    if (!found || found.parentElement.closest("[id]") !== null) return undefined
    found.setAttribute("data-check-lede", "")
    return found.textContent.trim()
  })
  check(!!lede, "the guide opens with a paragraph that has no element with an id around it")
  if (lede) {
    await page.evaluate(() => scrollTo(0, 0))
    await page.waitForTimeout(400)
    const spot = await page.evaluate(() => {
      const box = document.querySelector("[data-check-lede]").getBoundingClientRect()
      return { x: box.left + 8, y: box.top + 8 }
    })
    const ledeBefore = readFileSync(file, "utf8")
    await altClick(page, spot)
    await page.keyboard.press("End")
    await page.keyboard.type(" Opening checked.")
    await page.keyboard.press("Enter")
    const ledeAfter = await fileChange(ledeBefore)
    check(
      ledeAfter.includes(" Opening checked.") && ledeAfter.replace(" Opening checked.", "") === ledeBefore,
      "the opening paragraph alone changed in the file"
    )
  }

  ////////////////
  // ## A table's rows and columns (T86)
  ////////////////

  const table = await page.evaluate(() => {
    const cell = [...document.querySelectorAll("main ui-section[id] td")].find(
      (each) => !each.closest("ui-markdown, [data-spell-added], [source]") && each.textContent.trim().length > 2
    )
    if (!cell) return undefined
    for (let section = cell.closest("ui-section"); section; section = section.parentElement?.closest("ui-section"))
      section.setAttribute("open", "")
    cell.setAttribute("data-check-cell", "")
    cell.closest("table").setAttribute("data-check-table", "")
    return {
      cell: cell.textContent.trim(),
      rows: cell.closest("table").rows.length,
      columns: cell.parentElement.cells.length
    }
  })
  check(!!table, "the guide has a table of its own")
  if (table) {
    await page.waitForTimeout(600)
    await page.evaluate(() => document.querySelector("[data-check-table]").scrollIntoView({ block: "center" }))
    await page.waitForTimeout(400)
    const tableBefore = readFileSync(file, "utf8")
    await altClick(page, await spotOf(page, "[data-check-cell]"))
    const bar = await page.evaluate(() => {
      const box = document.querySelector(".spell-table-edit")?.getBoundingClientRect()
      const cell = document.querySelector("[data-check-cell]").getBoundingClientRect()
      const buttons = [...document.querySelectorAll(".spell-table-edit ui-button")].map((each) => each.dataset.tooltip)
      return box && { bottom: box.bottom, left: box.left, cellTop: cell.top, cellLeft: cell.left, buttons }
    })
    check(
      bar?.buttons.length === 4 && bar.bottom <= bar.cellTop + 1 && bar.cellTop - bar.bottom < 24,
      `the cell's bar sits just above it (${bar?.bottom} vs ${bar?.cellTop}, left ${bar?.left} vs ${bar?.cellLeft}), ` +
        `with its 4 buttons (${bar?.buttons.join(" / ")})`
    )
    await clickBar(page, "Add an empty row below this one")
    const rowAdded = await fileChange(tableBefore)
    const facts = await page.evaluate(() => {
      const editing = document.querySelector("[data-spell-editing]")
      return { rows: document.querySelector("[data-check-table]").rows.length, empty: editing?.textContent === "" }
    })
    check(facts.rows === table.rows + 1, `a row was added on the page (${table.rows} -> ${facts.rows})`)
    check(facts.empty, "the new row's first cell is open to type in")
    const newRow = /\n\s*<tr>(\s*<td><\/td>)+\s*<\/tr>/.exec(rowAdded)?.[0]
    check(
      !!newRow && rowAdded.replace(newRow, "") === tableBefore && newRow.split("\n").length === table.columns + 3,
      `the file gained an empty row, a line for each of its parts (${JSON.stringify(newRow)})`
    )
    await page.keyboard.type("Typed")
    await page.keyboard.press("Enter")
    const typed = await fileChange(rowAdded)
    check(typed === rowAdded.replace("<td></td>", "<td>Typed</td>"), "typing in the new cell saved it there")

    await altClick(page, await spotOf(page, "[data-check-cell]"))
    await clickBar(page, "Add an empty column to the right of this one")
    const columnAdded = await fileChange(typed)
    // its icons load as they are first drawn
    await page.waitForTimeout(1000)
    await page.locator("[data-check-table]").screenshot({ path: join(outDir, "table-edit.png") })
    const columns = await page.evaluate(() =>
      [...document.querySelector("[data-check-table]").rows].map((row) => row.cells.length)
    )
    check(new Set(columns).size === 1, `a column was added to every row on the page (${columns.join(", ")})`)
    check(columnAdded.length > typed.length, "and in the file")
    await page.keyboard.press("Escape")

    // the added column (right of the checked cell) and the added row (holding "Typed") go again
    await altClick(page, await spotOf(page, "[data-check-cell] + *", true))
    await clickBar(page, "Remove this column")
    const columnGone = await fileChange(columnAdded)
    check(columnGone === typed, "removing the column put the file back as it was before it")
    await page.evaluate(() =>
      [...document.querySelectorAll("[data-check-table] td")]
        .find((each) => each.textContent === "Typed")
        .setAttribute("data-check-typed", "")
    )
    await altClick(page, await spotOf(page, "[data-check-typed]"))
    await clickBar(page, "Remove this row")
    const rowGone = await fileChange(columnGone)
    check(rowGone === tableBefore, "removing the row put the file back as it was before the table changed")
    check(
      (await page.evaluate(() => document.querySelector("[data-check-table]").rows.length)) === table.rows,
      "and the page's table too"
    )
    check(await page.evaluate(() => window.__notReloaded === true), "the page never reloaded")
  }
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

/** The file, once it differs from `before`:  waits up to 5 seconds. */
async function fileChange(before) {
  let after = before
  for (let wait = 0; wait < 25 && after === before; wait++) {
    await new Promise((done) => setTimeout(done, 200))
    after = readFileSync(file, "utf8")
  }
  return after
}

/** Where to click in the element `selector` names:  near its top left (`empty`:  its middle, for an empty cell). */
async function spotOf(page, selector, empty = false) {
  return page.evaluate(
    ([selector, empty]) => {
      const element = document.querySelector(selector)
      element.scrollIntoView({ block: "center" })
      const box = element.getBoundingClientRect()
      return empty ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : { x: box.left + 6, y: box.top + 6 }
    },
    [selector, empty]
  )
}

/** Press the table bar's button whose tooltip is `tip`. */
async function clickBar(page, tip) {
  await page.locator(`.spell-table-edit ui-button[data-tooltip="${tip}"]`).click()
}

/** This checkout's docs bundle and live client, in place of the page server's (`--engine-here`). */
async function useThisEngine(page) {
  const bundle = readFileSync(join(KIT, "epic/src/tools/_assets/spell-ui.js"))
  const live = execFileSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      "import('spell/server/liveClient').then((m) => process.stdout.write(m.liveClientScript()))"
    ],
    { cwd: KIT, encoding: "utf8" }
  )
  await page.route("**/_epic/assets/spell-ui.js", (route) =>
    route.fulfill({ body: bundle, contentType: "text/javascript; charset=utf-8" })
  )
  const sheet = readFileSync(join(KIT, "epic/src/tools/_assets/spell-doc.css"))
  await page.route("**/_epic/assets/spell-doc.css", (route) =>
    route.fulfill({ body: sheet, contentType: "text/css; charset=utf-8" })
  )
  await page.route("**/api/server/live.js", (route) =>
    route.fulfill({ body: live, contentType: "text/javascript; charset=utf-8" })
  )
}

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
