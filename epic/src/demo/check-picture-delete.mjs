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
 * - screenshots:  `picture-item.png` (both pictures, the trash), `picture-deleted.png` (after the delete) in outDir
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

const NAME = "picture-delete"
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
  check(/picture deleted from the page/.test(files.read(FILE).section("log").textContent), "the log says so")
  await page
    .waitForFunction(() => document.querySelectorAll("epic-item#i1 epic-picture").length === 1, null, {
      timeout: 10000
    })
    .catch(() => undefined)
  check(
    (await page.evaluate(() => document.querySelectorAll("epic-item#i1 epic-picture").length)) === 1,
    "the page's live update shows one picture"
  )
  await page.screenshot({ path: join(outDir, "picture-deleted.png") })
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
