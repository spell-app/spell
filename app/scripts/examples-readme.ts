/**
 * `yarn examples:readme [--check] [--no-pictures] [name...]`:  keeps the example apps' table in
 * [README-examples.md](../README-examples.md) true to the example projects themselves.
 * - Reads every project of the `@spell/examples` and `@spell/library` groups (`spaces/@spell/<group>/<project>/`).
 *   - What each shows:  its project file's `description`, else the first comment of its first spell file.
 *   - Its name:  its project file's `title`, else its folder's name, `lists-from-zero` => `Lists From Zero`.
 * - Takes two pictures of each project with an app (every one but a library that says `"onHome": false`):
 *   - open in the editor, its spell beside it running, into `docs/images/examples/`:  the README table's
 *   - its app running by itself, in the runner at a phone's width, its top 16 by 9, into its own folder as
 *     `__thumbnail.png`:
 *     its card's, on the editor's home page (`SPACES.PROJECT_THUMBNAIL`, epic `mockup` P18)
 *     - the app in use:  first, the steps its project file names (`"thumbnail": { "steps" }`, spaces'
 *       `ProjectThumbnailJSON`), e.g. the Calculator's `2 × 2 = 4`, a game a few moves in (epic `mockup` I41)
 *     - with room above its first thing (`THUMBNAIL_TOP_ROOM`), so nothing touches the picture's top edge
 *   - Headless Playwright, at the address the kit's editor answers on (`.spell-server.editor.json`, at the page
 *     server's root, the kit's):
 *     start it first, with `yarn start` or `spell app serve`.
 *   - A library has no app of its own (People, Games), so no picture.
 *   - An org app's thumbnail is its picture from the browser tests, signed in to a test org full of data
 *     (`ORG_APP_SHOTS`):  in the runner, nobody is signed in, so its lists are empty (epic `mockup` J78).
 * - Rewrites the table between the page's two marker comments, `<!-- examples:start -->` and `<!-- examples:end -->`;
 *   the rest of the page is written by hand (the kit's `spliceGenerated()` and `writeOrCheck()`).
 * - Options:
 *   - `--check`:  writes nothing;  exits 1 if the table is out of date, or an example has no picture
 *     (the spaces tests run this)
 *   - `--no-pictures`:  the table only, without a browser or the editor
 *   - `--thumbnails`:  only the thumbnails, leaving the table's pictures as they are
 *   - `name...`:  only these examples' pictures, e.g. `calculator`
 * - Opening a project in the editor compiles it, which may rewrite its declarations and words files:
 *   check `git status` after.
 * - Plain node and `tsx`:  no `spell-app` imports, so it needs no alias hook.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { execFileSync } from "node:child_process"
import os from "node:os"
import path from "node:path"

import JSON5 from "json5"

import { BrowserPage } from "spell/element-tools/BrowserPage"
import { spliceGenerated, writeOrCheck } from "spell/element-tools/generatedFiles"
import { pageServerRoot } from "spell/server/page/settings"

import type { ProjectFileJSON, ThumbnailStepJSON } from "spell/app/spaces/server/node/projects/server.types"

/** spell-app's checkout. */
const ROOT = path.resolve(import.meta.dirname, "..")

/** The page this keeps current. */
const README = path.join(ROOT, "README-examples.md")

/** Where the pictures go, and the page's path to them. */
const IMAGES = "docs/images/examples"

/** The built-in projects' folder:  `@spell/examples` is `spaces/@spell/examples/`. */
const SPACE = path.join(ROOT, "spaces", "@spell")

/** The groups listed, in order:  the examples, then the library (its org apps, and the libraries others import). */
const GROUPS = ["examples", "library"] as const

/** Each project's picture of its app running alone, in its folder:  spaces' `PROJECT_THUMBNAIL`. */
const PROJECT_THUMBNAIL = "__thumbnail.png"

/**
 * The window the thumbnails are taken in:  a phone's, so each app is in its phone layout (Owen, epic `mockup` P19:
 * "put the examples in phone mode and take a screenshot of the tops of the apps").
 * - Twice the pixels, so the card's picture is sharp.
 */
const THUMBNAIL_WINDOW = { width: 390, height: 844 }

/** A card's banner, wide by high:  16 by 9.  A thumbnail is the top of its app, cut to it. */
const THUMBNAIL_SHAPE = 9 / 16

/** How many pixels a thumbnail has per point:  2, a phone's screen. */
const THUMBNAIL_SCALE = 2

/**
 * Room above the app's first thing, in points, so nothing in a thumbnail touches its top edge (epic `mockup` I41):
 * the app is taken with this much more padding at its top than it has in the runner.
 */
const THUMBNAIL_TOP_ROOM = 16

/** How long a thumbnail step waits after itself, unless it says (`ThumbnailStepJSON.wait`). */
const STEP_WAIT_MS = 300

/**
 * Each group's order:  the editor's home page's, ONE list (spaces' `homeOrder.json`, epic `mockup` P19).
 * - Dragging a card on the home page, in dev, changes it;  a project it doesn't list comes after, by name.
 */
const HOME_ORDER = JSON5.parse(
  readFileSync(path.join(ROOT, "src", "spaces", "models", "homeOrder.json"), "utf8")
) as Record<string, string[]>

/**
 * The org apps' thumbnails:  each one's picture from the browser tests (`tests/spell/recipeBox.test.ts`), which sign
 * people in to a test org and fill it, by the test's name for the picture.
 * - Administración de la org has none:  the tests run only the English ones, so it keeps the runner's.
 */
const ORG_APP_SHOTS: Record<string, string> = {
  OrgAdmin: "org-admin.png",
  OrgEvents: "org-events-planning.png",
  OrgFeed: "org-feed.png",
  Inbox: "inbox.png",
  OrgChat: "org-chat.png"
}

/** The browser tests' name for the org apps' tests, `-t`:  every test of a "built-in" org app. */
const ORG_APP_TESTS = "built-in"

/** The comments the table sits between. */
const START = "<!-- examples:start -->"
const END = "<!-- examples:end -->"

/** The window the pictures are taken in:  the editor's own layout, its spell on the left and the app on the right. */
const WINDOW = { width: 1280, height: 800 }

/** How long a project gets to compile, run and draw, after the page's network is quiet. */
const SETTLE_MS = 5000

/** How wide the table draws each picture;  a click opens it whole. */
const THUMBNAIL_WIDTH = 360

const args = process.argv.slice(2)
const isCheck = args.includes("--check")
const withPictures = !isCheck && !args.includes("--no-pictures")
const thumbnailsOnly = args.includes("--thumbnails")
const only = new Set(args.filter((arg) => !arg.startsWith("--")))

const projects = readProjects()
const table = tableFor(projects)
if (withPictures) await takePictures(projects.filter((project) => project.hasPicture))
writeOrCheck([[README, pageWith(table)]], { command: "examples:readme", isCheck })
if (isCheck) checkPictures(projects)
else console.log(`${path.relative(process.cwd(), README)}:  ${projects.length} projects`)

////////////////
// ## The projects
////////////////

/** One built-in project, as the table lists it. */
type Project = {
  /** its address, e.g. `@spell/examples/fizzbuzz` */
  address: string
  /** its folder's name, e.g. `fizzbuzz`:  its picture's name too */
  name: string
  /** its name for people, e.g. `FizzBuzz` */
  title: string
  /** what it shows, one line */
  description: string
  /** its folder, from the page:  `spaces/@spell/examples/fizzbuzz` */
  folder: string
  /** a project with an app to picture;  a library that stays off the home page (`"onHome": false`) has none */
  hasPicture: boolean
  /** what to do in its app before its thumbnail:  its project file's `thumbnail.steps`, none if it says none */
  thumbnailSteps: ThumbnailStepJSON[]
}

/** Every project of the listed groups, examples first, each group in its order. */
function readProjects(): Project[] {
  return GROUPS.flatMap((group) => {
    const names = readdirSync(path.join(SPACE, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted(inHomeOrder(group))
    return names.map((name) => projectFor(group, name))
  })
}

/** Sort `group`'s folder names:  the home page's order first, then the rest by name. */
function inHomeOrder(group: string): (a: string, b: string) => number {
  const listed = HOME_ORDER[`@spell/${group}`] ?? []
  const rank = (name: string) => {
    const index = listed.indexOf(name)
    return index === -1 ? listed.length : index
  }
  return (a, b) => rank(a) - rank(b) || a.localeCompare(b)
}

/** What the table says of project `name` in `group`, from its folder. */
function projectFor(group: string, name: string): Project {
  const folder = path.join(SPACE, group, name)
  const file = JSON5.parse(readFileSync(path.join(folder, "__project.json5"), "utf8")) as ProjectFile
  return {
    address: `@spell/${group}/${name}`,
    name,
    title: file.title ?? titleFor(name),
    description: file.description ?? firstComment(folder, file) ?? "",
    folder: path.relative(ROOT, folder),
    hasPicture: file.onHome !== false,
    thumbnailSteps: file.thumbnail?.steps ?? []
  }
}

/** The parts of a project file this reads. */
type ProjectFile = Partial<Pick<ProjectFileJSON, "title" | "description" | "onHome" | "imports" | "thumbnail">>

/** A folder's name as a title, as the editor makes it:  `lists-from-zero` => `Lists From Zero`. */
function titleFor(name: string): string {
  return name.replace(/(^|-)(\w)/g, (_match, dash: string, letter: string) => (dash ? " " : "") + letter.toUpperCase())
}

/** The first comment of the project's first spell file, without its `#` or `//`;  `undefined` if none. */
function firstComment(folder: string, file: ProjectFile): string | undefined {
  const first = file.imports?.find((entry) => entry.path.endsWith(".spell"))
  if (!first) return undefined
  const lines = readFileSync(path.join(folder, first.path), "utf8").split("\n")
  const comment = lines.find((line) => /^\s*(#|\/\/|--)/.test(line))
  return comment?.replace(/^\s*(#+|\/\/|--)\s*/, "").trim()
}

////////////////
// ## The table
////////////////

/** The table's Markdown:  one row per project, its address, what it shows and its picture. */
function tableFor(projects: Project[]): string {
  const rows = projects.map((project) => {
    const address = `[\`${project.address}\`](${project.folder}/)`
    const picture = project.hasPicture
      ? `<a href="${pictureOf(project)}"><img src="${pictureOf(project)}" width="${THUMBNAIL_WIDTH}" ` +
        `alt="${altFor(project)}"></a>`
      : "a library:  no app of its own"
    return `| ${project.title} | ${address} | ${project.description} | ${picture} |`
  })
  return ["| Example | Address | What it shows | Running |", "| --- | --- | --- | --- |", ...rows].join("\n")
}

/** A project's picture, from the page. */
function pictureOf(project: Project): string {
  return `${IMAGES}/${project.name}.png`
}

/** A picture's alt text. */
function altFor(project: Project): string {
  return `${project.title} open in the Spell editor:  its Spell on the left, the app running on the right`
}

/** The page with `table` between its markers;  throws if the page has no markers. */
function pageWith(table: string): string {
  const page = readFileSync(README, "utf8")
  return spliceGenerated(page, { file: README, start: START, end: END, block: () => `\n${table}\n\n` })
}

/**
 * Every project with an app has its picture;  else says which, and sets exit code 1.
 * - Not its thumbnail:  an app that draws nothing (FizzBuzz prints) has none, and its card shows its letter.
 */
function checkPictures(projects: Project[]): void {
  const missing = projects.filter((project) => project.hasPicture && !existsSync(path.join(ROOT, pictureOf(project))))
  for (const project of missing) console.error(`no picture of ${project.address}:  run \`yarn examples:readme\``)
  if (missing.length) process.exitCode = 1
}

/** A project's thumbnail, its app running alone:  in its folder. */
function thumbnailOf(project: Project): string {
  return path.join(ROOT, project.folder, PROJECT_THUMBNAIL)
}

////////////////
// ## The pictures
////////////////

/** Open each project in this checkout's editor, headless, and save what it shows;  then in the runner, alone. */
async function takePictures(projects: Project[]): Promise<void> {
  // the page server's record of its editor, at its root:  the kit's (epic `repo-split` P16)
  const editorFile = path.join(pageServerRoot(ROOT), ".spell-server.editor.json")
  if (!existsSync(editorFile))
    throw new Error("examples-readme:  the editor isn't running here;  `yarn start` first, or pass --no-pictures")
  const editor = (JSON.parse(readFileSync(editorFile, "utf8")) as { url: string }).url
  mkdirSync(path.join(ROOT, IMAGES), { recursive: true })
  // `BrowserPage` loads Playwright only here:  `--check` and `--no-pictures` need no browser
  const orgShots = orgAppShots(projects)
  await BrowserPage.with(async (browser) => {
    for (const project of projects) {
      if (only.size && !only.has(project.name)) continue
      if (!thumbnailsOnly) {
        const page = await BrowserPage.newPage(browser, { viewport: WINDOW })
        await page.goto(new URL(`edit/${project.address}`, editor).href, { waitUntil: "networkidle" })
        await page.waitForTimeout(SETTLE_MS)
        const file = path.join(ROOT, pictureOf(project))
        await page.screenshot({ path: file })
        console.log(path.relative(process.cwd(), file))
        await page.close()
      }
      // an org app's:  its picture from the tests, signed in
      const shot = orgShots && ORG_APP_SHOTS[project.name] && path.join(orgShots, ORG_APP_SHOTS[project.name]!)
      if (shot && existsSync(shot)) {
        await cutToThumbnail(browser, shot, thumbnailOf(project))
        console.log(`${path.relative(process.cwd(), thumbnailOf(project))}  (signed in, from the tests)`)
        continue
      }
      // its card's picture:  the app by itself, in the runner
      const runner = await BrowserPage.newPage(browser, {
        viewport: THUMBNAIL_WINDOW,
        context: { deviceScaleFactor: THUMBNAIL_SCALE }
      })
      // the runner keeps a connection open, so it never goes quiet:  its load, then the settle
      await runner.goto(new URL(`run/${project.address}`, editor).href, { waitUntil: "load" })
      await runner.waitForTimeout(SETTLE_MS)
      // the app's own element, without the editor's menu bar round it
      const app = runner.locator(".AppRoot").first()
      // its elements draw in their shadow roots, so ask whether it put any element on the page at all
      const drawsSomething = await app.evaluate((element) => !!element.querySelector("#spell-app-root > *"))
      if (drawsSomething) {
        // room above its first thing, then the app in use
        await runner.addStyleTag({ content: `.AppRoot { padding-top: ${THUMBNAIL_TOP_ROOM}px !important }` })
        let scrolledTo: number | undefined
        for (const step of project.thumbnailSteps) scrolledTo = (await takeStep(runner, step)) ?? scrolledTo
        // its top, cut to the card's shape;  scrolled, from what it scrolled to, inside the app and the window
        const box = (await app.boundingBox())!
        const height = box.width * THUMBNAIL_SHAPE
        const lowest = Math.min(box.y + box.height, THUMBNAIL_WINDOW.height) - height
        const top =
          scrolledTo === undefined ? box.y : Math.max(box.y, Math.min(scrolledTo - THUMBNAIL_TOP_ROOM, lowest))
        await runner.screenshot({ path: thumbnailOf(project), clip: { x: box.x, y: top, width: box.width, height } })
        console.log(path.relative(process.cwd(), thumbnailOf(project)))
      } else {
        rmSync(thumbnailOf(project), { force: true })
        console.log(`${project.address}:  draws nothing, so no thumbnail`)
      }
      await runner.close()
    }
  })
}

/** A page of the runner, as `BrowserPage.newPage()` makes it. */
type RunnerPage = Awaited<ReturnType<typeof BrowserPage.newPage>>

/**
 * Do one of a project's thumbnail steps in its running app (`ThumbnailStepJSON`), then wait;
 * a scroll's says where the thing it scrolled to is now, in the window.
 * - Looks only inside the app, never at the runner's menu bar.
 * - throws if what it names isn't there:  the picture would show the app as it opens, not in use
 */
async function takeStep(runner: RunnerPage, step: ThumbnailStepJSON): Promise<number | undefined> {
  const app = runner.locator(".AppRoot").first()
  const nth = step.nth ?? 0
  let top: number | undefined
  // only what's showing:  a toolbar keeps a hidden copy of each button for its overflow menu
  if (step.click !== undefined)
    await app.getByText(step.click, { exact: true }).filter({ visible: true }).nth(nth).click()
  else if (step.clickOn !== undefined) await app.locator(step.clickOn).filter({ visible: true }).nth(nth).click()
  else if (step.type !== undefined) {
    if (step.into !== undefined) await app.getByPlaceholder(step.into).or(app.getByLabel(step.into)).first().click()
    await runner.keyboard.type(step.type)
  } else if (step.press !== undefined) await runner.keyboard.press(step.press)
  else if (step.scrollTo !== undefined)
    top = await scrollToTop(app.getByText(step.scrollTo, { exact: true }).filter({ visible: true }).nth(nth))
  else if (step.scrollToOn !== undefined) top = await scrollToTop(app.locator(step.scrollToOn).nth(nth))
  await runner.waitForTimeout(step.wait ?? STEP_WAIT_MS)
  return top
}

/**
 * Scroll the app so `target` is `THUMBNAIL_TOP_ROOM` below its top, as far as it scrolls;
 * where that thing's top is now, in the window.
 * - An app too short to scroll that far doesn't move:  its picture starts lower down instead (`takePictures()`).
 */
async function scrollToTop(target: ReturnType<RunnerPage["locator"]>): Promise<number> {
  return await target.evaluate((found, room) => {
    // the first that draws a box of its own, inside it, else round it:
    // a Spell UI element or label may draw none itself (`display: contents`)
    const hasBox = (element: Element) => element.getBoundingClientRect().height > 0
    const boxInside = (element: Element): Element | undefined => {
      for (const child of [...(element.shadowRoot?.children ?? []), ...element.children])
        if (hasBox(child)) return child
        else {
          const inside = boxInside(child)
          if (inside) return inside
        }
      return undefined
    }
    let element: Element = hasBox(found) ? found : (boxInside(found) ?? found)
    while (!hasBox(element) && (element.parentElement ?? (element.getRootNode() as ShadowRoot).host))
      element = element.parentElement ?? (element.getRootNode() as ShadowRoot).host
    ;(element as HTMLElement).style.scrollMarginTop = `${room}px`
    element.scrollIntoView({ block: "start" })
    return element.getBoundingClientRect().top
  }, THUMBNAIL_TOP_ROOM)
}

/**
 * Run the org apps' browser tests, which save a picture of each app signed in, into a scratch folder;  its path.
 * - `undefined` when no org app is being pictured.
 * - throws if the tests fail:  their pictures would be of a broken app
 */
function orgAppShots(projects: Project[]): string | undefined {
  const wanted = projects.some((project) => ORG_APP_SHOTS[project.name] && (!only.size || only.has(project.name)))
  if (!wanted) return undefined
  const shots = mkdtempSync(path.join(os.tmpdir(), "org-app-shots-"))
  console.log("the org apps' tests, for their pictures signed in ...")
  execFileSync(
    "yarn",
    ["vp", "test", "run", "--project", "spell", "tests/spell/recipeBox.test.ts", "-t", ORG_APP_TESTS],
    {
      cwd: ROOT,
      env: { ...process.env, SPELL_TEST_SHOTS: shots },
      stdio: "ignore"
    }
  )
  return shots
}

/** Cut the picture at `from` to a thumbnail's shape, its top, at `to`:  drawn on a page the thumbnail's size. */
async function cutToThumbnail(
  browser: Parameters<typeof BrowserPage.newPage>[0],
  from: string,
  to: string
): Promise<void> {
  // the test's picture is a wide window's:  drawn at a phone's width, its top cut to the card's shape
  const size = { width: THUMBNAIL_WINDOW.width, height: Math.round(THUMBNAIL_WINDOW.width * THUMBNAIL_SHAPE) }
  const page = await BrowserPage.newPage(browser, { viewport: size, context: { deviceScaleFactor: THUMBNAIL_SCALE } })
  const picture = `data:image/png;base64,${readFileSync(from).toString("base64")}`
  await page.setContent(
    `<body style="margin:0"><img src="${picture}" style="width:100vw;height:100vh;object-fit:cover;object-position:top"></body>`
  )
  await page.screenshot({ path: to })
  await page.close()
}
