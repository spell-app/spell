/**
 * Check an item's picture and its trash in a real browser (epic `epic-engine` T87):  `<epic-picture>` on a reviewed
 * epic page, deleted from the page, its file too.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-picture-delete.mjs [outDir]
 * - the page:  the tool's test fixture as epic `picture-delete`, in `src/demo/shots/picture-delete/` (git-ignored),
 *   issue I1 added by the epic tool with two pictures (`add`'s `--picture`, twice:  `TestCommands.addItem()`), its
 *   page split into parts
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - checks:
 *   - I1 opened shows both pictures as thumbnails, no wider than 320px, a trash on each, its tooltip the browser's
 *   - the trash clicked:  the picture hides at once, "Picture deleted" with Undo;  Undo puts it back, nothing posted,
 *     its file still there
 *   - clicked again and left:  6 seconds on, the item's part holds one picture, the log says so, its file is gone,
 *     the other's isn't;  the page's live update shows one picture
 *   - no page errors
 *   - each picture labelled (epic `epic-engine` P75):  IMG1, IMG2, a chip on its corner;  after the delete the other
 *     keeps IMG2 (a gap:  P75's choice B)
 * - and the KICKOFF BOX (P75), on a second scratch epic, `kickoff-box`, with no prompt and no phases:
 *   - its Overview shows the box;  three pictures dropped in it are IMG1-IMG3 in its strip, saved as a `kickoff` mark
 *   - IMG2's x leaves IMG1 and IMG2 (the third renamed), in the words that name it too
 *   - Send, then the tool's `inbox apply`:  the Kickoff prompt, its two pictures labelled;  the box gone
 * - screenshots:  `picture-item.png` (both pictures, the trash), `picture-deleted.png` (after the delete),
 *   `kickoff-box.png` (three pictures in the box), `kickoff-prompt.png` (the prompt it made) in outDir
 * - exits 1 on any miss
 * - re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_PICTURE_DELETE_UNDER_TSX) {
  const run = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, CHECK_PICTURE_DELETE_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
  })
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { logInto } = await import("./demoPages.mjs")
const { PlanDoc } = await import("spell/epic/tool/PlanDoc.ts")
const { PlanDocCommands } = await import("spell/epic/tool/PlanDocCommands.ts")
const { PlanDocFiles } = await import("spell/epic/tool/PlanDocFiles.ts")
const { ItemPictures } = await import("spell/epic/tool/ItemPictures.ts")

const { ReviewInbox } = await import("spell/epic/tool/ReviewInbox.ts")

const NAME = "picture-delete"
const KICKOFF = "kickoff-box"
const KICKOFF_FOLDER = join(HERE, "shots", NAME, "epics", KICKOFF)
const KICKOFF_FILE = join(KICKOFF_FOLDER, `${KICKOFF}.plan.html`)
const CONTENT = join(HERE, "shots", NAME)
const FOLDER = join(CONTENT, "epics", NAME)
const FILE = join(FOLDER, `${NAME}.plan.html`)
const PICTURE = join(ROOT, "..", "ui", "docs", "images", "new_popup_alignment.png")
const outDir = process.argv[2] ?? mkdtempSync(join(tmpdir(), "picture-delete-"))

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
writeFileSync(FILE, PlanDoc.parse(fixture).toString())
const scratch = mkdtempSync(join(tmpdir(), "picture-delete-files-"))
copyFileSync(PICTURE, join(scratch, "popup.png"))
copyFileSync(PICTURE, join(scratch, "again.png"))
const files = new PlanDocFiles({ root: CONTENT })
// as `epic add <epic>#I ... --picture <file> --picture <file>` does (`TestCommands.addItem()`), on this scratch page
const pictures = ItemPictures.fromFiles([join(scratch, "popup.png"), join(scratch, "again.png")])
const added = await files.edit(FILE, (plan) =>
  new PlanDocCommands({ files }).tests.addItem(
    plan,
    "issue",
    "The popup covers its button",
    { details: "<p>Owen:  “the popup covers the button”</p>" },
    { file: FILE, pictures }
  )
)
ItemPictures.save(FILE, added.pictures)
check(added.id === "i1" && added.pictures.length === 2, "the epic tool added I1 with two pictures")
await files.writeDoc(FILE, files.read(FILE), true)
// the kickoff box's epic:  the fixture with no prompt and no phases, a new epic's page
mkdirSync(KICKOFF_FOLDER, { recursive: true })
const fresh = PlanDoc.parse(fixture.replace('epic="demo"', `epic="${KICKOFF}"`))
for (const phase of fresh.document.querySelectorAll("epic-phase")) phase.remove()
fresh.setPrompt("")
writeFileSync(KICKOFF_FILE, fresh.toString())
const shown = () =>
  Array.from(files.read(FILE).findItem("i1").querySelectorAll("epic-picture > img"), (img) => img.getAttribute("src"))
const [first, second] = shown()
const fileOf = (src) => join(CONTENT, src)
check(!!first && existsSync(fileOf(first)) && existsSync(fileOf(second)), "both files beside the page, in pictures/")

////////////////
// ## The browser
////////////////

const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
const logs = []
const posted = []
try {
  const page = await BrowserPage.newPage(browser, {
    viewport: { width: 1200, height: 900 },
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  page.on("request", (request) => {
    if (request.method() === "POST") posted.push(new URL(request.url()).pathname)
  })
  await page.goto(`${server.base}/epics/${NAME}/${NAME}.plan.html#i1`)
  await page.waitForFunction(() => document.querySelectorAll("epic-item#i1 epic-picture").length === 2, null, {
    timeout: 15000
  })
  // the trash shows once the page is reviewed
  const trashes = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("epic-item#i1 epic-picture"), (picture) => {
        const trash = picture.shadowRoot?.querySelector('[part~="delete"]')
        const img = picture.querySelector("img")
        const box = img?.getBoundingClientRect()
        const hidden = getComputedStyle(picture).display === "none"
        return { trash: !!trash, title: trash?.getAttribute("title"), width: box?.width ?? 0, hidden }
      })
    )
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("epic-item#i1 epic-picture")).every((picture) =>
        picture.shadowRoot?.querySelector('[part~="delete"]')
      ),
    null,
    { timeout: 15000 }
  )
  let state = await trashes()
  check(
    state.every((each) => each.trash && each.title === "Delete this picture, and its file"),
    "a trash on each picture, its tooltip a title"
  )
  const labels = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("epic-item#i1 epic-picture"), (picture) => {
        const chip = picture.shadowRoot?.querySelector('[part~="label"]')
        return chip && getComputedStyle(picture).display !== "none" ? chip.textContent : null
      }).filter(Boolean)
    )
  check(JSON.stringify(await labels()) === '["IMG1","IMG2"]', `labelled IMG1, IMG2 (${await labels()})`)
  check(
    state.every((each) => each.width > 0 && each.width <= 320),
    `thumbnails, no wider than 320px (${state.map((each) => Math.round(each.width)).join(", ")})`
  )
  await page.locator("epic-item#i1 epic-picture").first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: join(outDir, "picture-item.png") })

  // the trash, then Undo
  const clickTrash = () =>
    page.evaluate(() => {
      // the `<ui-button>`'s own button, as a person's click lands
      const trash = document.querySelector("epic-item#i1 epic-picture").shadowRoot.querySelector('[part~="delete"]')
      const button = trash.shadowRoot?.querySelector("button")
      if (button) button.click()
      else trash.click()
    })
  await clickTrash()
  await page.waitForTimeout(300)
  state = await trashes()
  check(state[0].hidden && !state[1].hidden, "clicked:  that picture hides at once, the other stays")
  const notice = () =>
    page.evaluate(() => document.querySelector("[data-spell-notices]")?.shadowRoot?.textContent ?? "")
  check(/Picture deleted/.test(await notice()), "the notice says Picture deleted, with Undo")
  await page.evaluate(() =>
    document.querySelector("[data-spell-notices]").shadowRoot.querySelector("ui-button").click()
  )
  await page.waitForTimeout(300)
  state = await trashes()
  check(!state[0].hidden, "Undo:  the picture back")
  await page.waitForTimeout(6500)
  check(!posted.some((path) => path.endsWith("/delete-picture")), "Undo:  nothing posted")
  check(existsSync(fileOf(first)), "Undo:  its file still there")

  // the trash, left alone
  await clickTrash()
  await page.waitForTimeout(7000)
  check(posted.some((path) => path.endsWith("/delete-picture")), "left alone:  the delete posted after its Undo's time")
  check(JSON.stringify(shown()) === JSON.stringify([second]), "the item's part holds the other picture alone")
  check(!existsSync(fileOf(first)) && existsSync(fileOf(second)), "its file deleted, the other's kept")
  check(/picture IMG1 deleted from the page/.test(files.read(FILE).section("log").textContent), "the log says so")
  await page
    .waitForFunction(() => document.querySelectorAll("epic-item#i1 epic-picture").length === 1, null, {
      timeout: 10000
    })
    .catch(() => undefined)
  check(
    (await page.evaluate(() => document.querySelectorAll("epic-item#i1 epic-picture").length)) === 1,
    "the page's live update shows one picture"
  )
  check(JSON.stringify(await labels()) === '["IMG2"]', `the other keeps IMG2, a gap (${await labels()})`)
  await page.screenshot({ path: join(outDir, "picture-deleted.png") })

  ////////////////
  // ## The kickoff box (P75)
  ////////////////

  await page.goto(`${server.base}/epics/${KICKOFF}/${KICKOFF}.plan.html`)
  const kickoffField = () =>
    page.waitForFunction(
      () =>
        document
          .querySelector("epic-overview")
          ?.shadowRoot?.querySelector("epic-kickoff")
          ?.shadowRoot?.querySelector("epic-text-box")?.textarea,
      null,
      { timeout: 15000 }
    )
  await kickoffField()
  check(true, "a new epic's Overview shows the kickoff box")
  const png = readFileSync(PICTURE).toString("base64")
  await page.evaluate(async (base64) => {
    const kickoff = document.querySelector("epic-overview").shadowRoot.querySelector("epic-kickoff")
    const field = kickoff.shadowRoot.querySelector("epic-text-box").textarea
    field.value = "A popup that stays clear of its button, like IMG3."
    field.setSelectionRange(field.value.length, field.value.length)
    field.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
    const dropped = new DataTransfer()
    for (const name of ["one.png", "two.png", "three.png"]) dropped.items.add(new File([bytes], name, { type: "image/png" }))
    field.dispatchEvent(new DragEvent("drop", { dataTransfer: dropped, bubbles: true, composed: true, cancelable: true }))
  }, png)
  const strip = () =>
    page.evaluate(() =>
      Array.from(
        document
          .querySelector("epic-overview")
          .shadowRoot.querySelector("epic-kickoff")
          .shadowRoot.querySelectorAll(".pictures epic-picture"),
        (picture) => picture.getAttribute("label")
      )
    )
  await page.waitForFunction(
    () =>
      document
        .querySelector("epic-overview")
        .shadowRoot.querySelector("epic-kickoff")
        .shadowRoot.querySelectorAll(".pictures epic-picture").length === 3,
    null,
    { timeout: 15000 }
  )
  check(JSON.stringify(await strip()) === '["IMG1","IMG2","IMG3"]', `three pictures dropped:  ${await strip()}`)
  const kickoffMark = () => ReviewInbox.read(ReviewInbox.pathFor(KICKOFF_FILE)).marks.kickoff
  await page.waitForTimeout(1500)
  check(
    kickoffMark()?.action === "kickoff" && (kickoffMark()?.note.match(/!\[IMG\d\]\(pictures\/kickoff-/g) ?? []).length === 3,
    "saved as a kickoff mark, its three pictures in pictures/"
  )
  await page.screenshot({ path: join(outDir, "kickoff-box.png") })
  await page.evaluate(() => {
    const picture = document
      .querySelector("epic-overview")
      .shadowRoot.querySelector("epic-kickoff")
      .shadowRoot.querySelectorAll(".pictures epic-picture")[1]
    const x = picture.shadowRoot.querySelector('[part~="remove"]')
    ;(x.shadowRoot?.querySelector("button") ?? x).click()
  })
  await page.waitForTimeout(1500)
  check(JSON.stringify(await strip()) === '["IMG1","IMG2"]', `IMG2's x leaves IMG1 and IMG2:  ${await strip()}`)
  check(/like IMG2\./.test(kickoffMark()?.note ?? ""), "the words that named IMG3 now name IMG2")
  // Send:  the header's plane, as the person presses it
  await page.locator('epic-send-buttons [part~="send"]').first().click()
  await page.waitForTimeout(1500)
  check(!!ReviewInbox.read(ReviewInbox.pathFor(KICKOFF_FILE)).sent, "Send:  the inbox sent")
  // Claude's side:  `epic inbox apply`
  const apply = new PlanDocCommands({ files: new PlanDocFiles({ root: CONTENT }) })
  apply.print = () => undefined
  await apply.inbox.run(KICKOFF, KICKOFF_FILE, ["apply"], {})
  const prompt = files.read(KICKOFF_FILE).document.querySelector("epic-overview > epic-prompt")
  const promptLabels = Array.from(prompt?.querySelectorAll("epic-picture") ?? [], (each) => each.getAttribute("label"))
  check(JSON.stringify(promptLabels) === '["IMG1","IMG2"]', `inbox apply:  the Kickoff prompt, IMG1 and IMG2 (${promptLabels})`)
  await page.reload()
  await page
    .waitForFunction(() => document.querySelectorAll("epic-prompt epic-picture").length === 2, null, { timeout: 15000 })
    .catch(() => undefined)
  const after = await page.evaluate(() => ({
    pictures: document.querySelectorAll("epic-prompt epic-picture").length,
    box: !!document.querySelector("epic-overview")?.shadowRoot?.querySelector("epic-kickoff")
  }))
  check(after.pictures === 2 && !after.box, `the page:  the prompt's two pictures, no box (${JSON.stringify(after)})`)
  await page.evaluate(() => {
    // the Overview folded again (epic pages open folded):  unfolded for the picture, as a click would
    document.querySelector("epic-overview")?.setAttribute("open", "")
    const prompt = document.querySelector("epic-prompt")
    prompt?.shadowRoot?.querySelector("details")?.setAttribute("open", "")
    prompt?.scrollIntoView()
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(outDir, "kickoff-prompt.png") })
  check(!logs.some((line) => line.startsWith("pageerror")), `no page errors${logs.length ? `:  ${logs.join(" | ")}` : ""}`)
} catch (error) {
  misses.push(`threw:  ${error.stack ?? error}`)
  console.error(error)
} finally {
  await browser.close()
  await server.stop()
  rmSync(scratch, { recursive: true, force: true })
}
console.log(`screenshots:  ${outDir}`)
if (misses.length) {
  console.error(`${misses.length} miss(es)`)
  process.exit(1)
}
