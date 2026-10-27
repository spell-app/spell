/**
 * Check COMMENTS ON A COMPONENT SET'S PAGES in a real browser (epic `epic-engine` P2, T3):  the docs pages' bullhorns,
 * pane, threads and Send, drawn by `spell-comments.js` beside the site's own Spell UI.  Epic UI's by default;  Spell
 * UI's, App UI's and Brand's (spell-app's) with `--set`.
 *
 * Usage (from the repo root):
 *   node src/demo/check-comments-epic-ui.mjs [--set epics | ui | app | brand] [--checkout <spell-app>] [--page <name>]
 *     [--swap <name>] [--docs <folder>] [--bundle <spell-ui.js>] [--comments <spell-comments.js>] [--keep] [--dark]
 *     [outDir]
 * - `--comments`:  that file served as the pages' `spell-comments.js`, one built elsewhere (as `--bundle`)
 * - `--set`:  which set (`SETS`, below):  `epics` (Epic UI, the engine's `src/docs/`), `ui` (Spell UI), `app` (App
 *   UI) or `brand`, at `/components/<set>/`
 *   - `--checkout`:  the spell-app checkout Spell UI's, App UI's and Brand's pages, and their site bundle, come from
 *     (default the epic server's default repo's, `~/.spell-epic/repos.json5`):  a worktree's, to check its pages
 *     before they merge;  each set's folder and bundle as its settings name them (`componentSets()`)
 * - the pages:  the set's (`--page`, default the set's `page`, then `--swap`, default its `swap`, for the router's
 *   swap), served as spell-app's page server serves them, at `/components/<set>/`, by a page server of its OWN
 *   (`DemoServer`:  this checkout's `EpicServer` on a free port, no pid file, nobody woken), with Spell UI's site
 *   bundle laid over them (the checkout's settings' set's `assets`:  spell-ui's `site/_assets/`, built by spell-app's
 *   page server or `yarn site:bundle` in spell-ui;  else Spell UI's, the `spell-ui` workspace's)
 *   - Epic UI's:  the epic server's own (`epicUiMounts()`)
 *   - App UI's layout loads the app's element pack, `/element/spell.pack.js`, which no server here builds:  stubbed,
 *     empty, and its root's error about it let through (its live examples don't draw;  not what this checks)
 *   - `--docs`:  the folder served there;  default a SCRATCH COPY of the set's folder in `src/demo/shots/<set>-ui/`
 *     (git-ignored), so no real inbox is written.  `--docs src/docs` writes the real (git-ignored) inbox beside the
 *     page:  `epic comments list` sees it then
 *   - `--keep`:  leave the comments made;  else each is cleared at the end
 * - checks, at 1200 and 390px:
 *   - no docs bundle on the page (one Spell UI):  only the site's
 *   - the bullhorns:  in the masthead (the page), each section's title row, a table's corner;  one click opens ONE pane
 *   - a comment on the page:  saved as typed (the floppy), its thread drawn under the masthead once the pane closes
 *   - a comment on selected text (⌘ / Ctrl I) in a section's list:  its quote highlighted, its thread in the list item;
 *     a page with no list in a section (Spell UI's):  in a paragraph, its thread after it
 *   - Send:  to the standing epic `feedback` (a set's pages are no epic's;  epic `epic-engine` T9), "feedback is
 *     listening" or "nobody is listening:  Send wakes feedback";  a click sends both, and wakes feedback or nobody
 *     (the server's wake is stubbed:  `DemoServer`)
 *   - the router's swap to another page:  that page's bullhorns, no thread from the last;  back:  the threads again
 *   - the server's inbox holds what the page shows
 *   - the TOOLBAR (epic `epic-engine` T11), its comments answered in the scratch inbox so they wait on Owen:  first in
 *     the article, a button per top-level section;  a button lands its section under the stuck band and is marked;
 *     the bullhorn's count, and its clicks landing on each waiting thread in turn;  ⌘ / Ctrl K listing them, an id
 *     landing on its thread, words going to the site's search;  the router's swap:  the next page's toolbar
 *   - a page in TABS (Spell UI's and Brand's element pages, the swap's):  the toolbar the shown tab's sections, and
 *     another tab's once it's shown
 *   - Spell UI's:  the page's own live examples still draw (`<ui-example>`'s upgraded, no element left undefined)
 *   - no page errors
 * - and, for Epic UI, on a GUIDE (`guides/python-target.html`), served with `--bundle` as its `spell-ui.js` when given:
 *   the docs runtime still draws bullhorns, and a thread has the comments' look (`spell-comments.css`, through
 *   `spell-doc.css`)
 * - `--dark`:  all of it in the dark colour scheme
 * - screenshots (outDir, default a temporary folder):  `<width>-<step>.png`
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

if (!process.env.CHECK_EPIC_UI_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_EPIC_UI_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { bundleRoutes } = await import("./demoPages.mjs")
const { GuideInbox } = await import("spell-epic/tool/GuideInbox.ts")
const { RepoList } = await import("spell-epic/server/RepoList.ts")
const { packageDir } = await import("spell-epic/tools/packageDir.ts")
const { componentSets, pageServerSettings } = await import("spell/server/page/settings")

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)

/**
 * The sets it checks, by `--set`:  each one's folder (Epic UI's the engine's own;  the others from the spell-app
 * checkout, `--checkout`), its first page and the page the router's swap goes to, and what else its layout loads.
 * - `pack`:  its component pack's folder in the checkout, served at its own path (Brand's layout loads it from there)
 * - `stub`:  a script its layout loads that no server here has, answered empty
 */
const SETS = {
  epics: { dir: join(ROOT, "src", "docs"), page: "epic-item", swap: "epic-page" },
  ui: { dir: "packages/ui/docs", page: "utilities", swap: "ui-button" },
  app: { dir: "packages/app/docs", page: "AppRoot", swap: "Chooser", stub: "/element/spell.pack.js" },
  brand: { dir: "packages/brand/docs", page: "index", swap: "brand-color", pack: "packages/brand/components/__pack" }
}
const setName = flag("--set", "epics")
const set = SETS[setName]
if (!set) {
  console.error(`check-comments-epic-ui:  --set is ${Object.keys(SETS).join(", ")}, not "${setName}"`)
  process.exit(2)
}
const checkout = resolve(flag("--checkout", undefined) ?? new RepoList().defaultRepo?.checkout ?? ROOT)
/** the set's entry in the checkout's settings (`componentSets()`):  its folder and site bundle there */
const named = componentSets(pageServerSettings(checkout)).find((each) => each.prefix === `/components/${setName}`)
if (named && setName !== "epics") set.dir = named.dir
const element = flag("--page", set.page)
const swapTo = flag("--swap", set.swap)
const bundle = flag("--bundle", undefined)
const commentsScript = flag("--comments", undefined)
const keep = args.includes("--keep")
/** `--dark`:  every page in the dark colour scheme (the site follows the browser's until the viewer picks one) */
const scheme = args.includes("--dark") ? "dark" : "light"
/** The flags that take a value:  the word after one isn't the out folder. */
const VALUED = ["--page", "--swap", "--set", "--checkout", "--docs", "--bundle", "--comments"]
const out =
  args.find((arg, at) => !arg.startsWith("--") && !VALUED.includes(args[at - 1])) ??
  mkdtempSync(join(tmpdir(), "check-comments-epic-ui-"))
mkdirSync(out, { recursive: true })

/**
 * Spell UI's site bundle, as spell-app's page server lays it over a set's folder:  the checkout's settings' set's
 * `assets` (`componentSets()`), every set's since epic `epic-engine`;  else Spell UI's own, the `spell-ui`
 * workspace's `site/_assets/`.
 */
const BUNDLE = named?.assets
  ? join(checkout, named.assets)
  : join(packageDir("spell-ui") ?? "spell-ui (not installed)", "site", "_assets")
if (!existsSync(join(BUNDLE, "site.js"))) {
  console.error(`check-comments-epic-ui:  no ${BUNDLE}/site.js:  start spell-app's page server once to build it`)
  process.exit(2)
}

const SHOTS = join(HERE, "shots", setName === "epics" ? "epic-ui" : `${setName}-ui`)
const docs = flag("--docs", undefined) ? resolve(flag("--docs")) : join(SHOTS, "docs")
if (!flag("--docs", undefined)) {
  rmSync(SHOTS, { recursive: true, force: true })
  cpSync(resolve(checkout, set.dir), docs, { recursive: true, filter: (from) => !/\.inbox\.json5?$/.test(from) })
}
/** The set's address, as spell-app's page server serves it:  `/components/app`. */
const PREFIX = `/components/${setName}`
const pagePath = (name) => `${PREFIX}/${name}.html`
const pageUrl = (name) => `${served.base}${pagePath(name)}`
const inbox = (name) => GuideInbox.fileFor(join(docs, `${name}.html`))
if (existsSync(inbox(element))) {
  console.error(`check-comments-epic-ui:  ${inbox(element)} exists:  it would be mixed in;  move it first`)
  process.exit(2)
}

// the server mounts Epic UI itself (epic `epic-eject` I21):  told to serve the scratch copy, so no real inbox is written,
// with the `--checkout`'s bundle when one is named (a mount of the same prefix laid first wins);  another set:  its
// scratch copy mounted at its address, as spell-app's page server does (`componentSetPath()`)
const served = await DemoServer.start(
  setName === "epics"
    ? {
        content: join(SHOTS, "content"),
        epicUi: docs,
        mounts: flag("--checkout", undefined) ? [{ prefix: `${PREFIX}/_assets/`, dir: BUNDLE }] : []
      }
    : {
        content: join(SHOTS, "content"),
        mounts: [
          { prefix: `${PREFIX}/_assets/`, dir: BUNDLE },
          { prefix: `${PREFIX}/`, dir: docs },
          ...(set.pack ? [{ prefix: `/${set.pack}/`, dir: join(checkout, set.pack) }] : [])
        ]
      }
)
const problems = []
const browser = await BrowserPage.launch()

// the pages load the checkout's bundle
const bundleServed = await fetch(`${served.base}${PREFIX}/_assets/site.js`).then((answer) => answer.text())
check(`the set's site bundle is ${BUNDLE}'s`, bundleServed === readFileSync(join(BUNDLE, "site.js"), "utf8"))

for (const width of [1200, 390]) await checkWidth(width)
if (setName === "epics") await checkGuide()
if (setName === "ui") await checkExamples()

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

/** A new page at `width`, its errors kept;  `--bundle`'s Spell UI served on it when `withBundle`. */
async function newPage(width, { withBundle } = {}) {
  const errors = []
  // the stubbed pack (`set.stub`) registers none:  its root says so, which isn't this check's to fail on
  const stubbed = set.stub?.split("/").at(-1)
  const page = await BrowserPage.newPage(browser, {
    viewport: { width, height: width > 600 ? 900 : 844 },
    colorScheme: scheme,
    onProblem: (text, kind) => {
      if (kind === "page error" || !stubbed || !text.includes(stubbed)) errors.push(text)
    },
    routes: [
      ...(commentsScript ? [{ url: "**/spell-comments.js", fileFor: () => resolve(commentsScript) }] : []),
      ...(withBundle ? bundleRoutes(bundle) : [])
    ]
  })
  page.errors = errors
  if (set.stub)
    await page.route(`**${set.stub}`, (route) => route.fulfill({ body: "", contentType: "text/javascript" }))
  return page
}

/** Every check at `width`. */
async function checkWidth(width) {
  const name = `${width}`
  const page = await newPage(width)
  await page.goto(pageUrl(element))
  try {
    await page.waitForSelector(".site-masthead > .spell-comment-mark.at-page", { state: "attached", timeout: 20_000 })
  } catch {
    check(`${name}:  the bullhorns draw`, false)
    await page.screenshot({ path: join(out, `${name}-none.png`) })
    return page.close()
  }
  const marks = await page.evaluate(() => ({
    docsBundle: document.querySelectorAll('script[src*="spell-ui.js"]').length,
    sheet: !!document.querySelector('link[href$="spell-comments.css"]'),
    page: document.querySelectorAll(".site-masthead > .spell-comment-mark.at-page").length,
    sections: document.querySelectorAll("ui-section > .spell-comment-mark.at-section").length,
    corners: document.querySelectorAll(".spell-comment-mark.at-block").length,
    titles: document.querySelectorAll(".spell-comment-mark.at-title").length
  }))
  check(`${name}:  only the site's Spell UI (no docs bundle), and the comments' sheet`, !marks.docsBundle && marks.sheet)
  check(
    `${name}:  a bullhorn in the masthead, on every section, over blocks`,
    marks.page === 1 && marks.sections > 3 && marks.corners > 0,
    JSON.stringify(marks)
  )

  // the page's bullhorn:  ONE pane, saved as typed, a thread under the masthead once closed
  await page.hover(".site-masthead")
  await page.click(".site-masthead > .spell-comment-mark.at-page > ui-button")
  await page.waitForSelector("epic-comment-pane > textarea", { timeout: 5000 })
  check(`${name}:  the page's bullhorn opens one pane`, (await page.$$("epic-comment-pane")).length === 1)
  await page.keyboard.type(`A comment on the whole page, at ${width}px.`)
  // the pane's floppy:  its `saved` (the tooltip), not `failed`
  await page.waitForSelector("epic-comment-pane[saved]:not([failed])", {
    timeout: 5000
  }).catch(() => {})
  const saved = await page.$("epic-comment-pane[saved]:not([failed])")
  check(`${name}:  the pane saves as Owen types`, !!saved)
  await page.screenshot({ path: join(out, `${name}-pane.png`) })
  await page.keyboard.press("Escape")
  await page.waitForSelector(".site-masthead + epic-threads > epic-thread", { timeout: 5000 }).catch(() => {})
  check(
    `${name}:  the page's comment draws as a thread under the masthead`,
    !!(await page.$(".site-masthead + epic-threads > epic-thread"))
  )

  // selected text in a section's list:  ⌘ / Ctrl I;  a page with no list in a section (Spell UI's:  its prose is
  // `<ui-markdown>`'s, in a shadow root, which a text comment doesn't reach):  in a paragraph, a live example's
  const { section, holder } = await page.evaluate(() => {
    const sections = [...document.querySelectorAll("main ui-section[id]")]
    const hasText = (each) => [...each.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim().length > 8)
    const inList = sections.flatMap((each) => [...each.querySelectorAll(":scope > ul > li")]).find(hasText)
    const inParagraph = [...document.querySelectorAll("main ui-section[id] p")].find(
      (each) => hasText(each) && !each.closest("[data-spell-added], template")
    )
    const found = inList ?? inParagraph
    if (!found) return {}
    found.dataset.checkText = ""
    for (let open = found.closest("ui-section"); open; open = open.parentElement?.closest("ui-section"))
      open.open = true
    return { section: found.closest("ui-section").id, holder: found.localName }
  })
  await page.waitForTimeout(500)
  const quote = await page.evaluate(() => {
    const holder = document.querySelector("[data-check-text]")
    if (!holder) return ""
    holder.scrollIntoView({ block: "center" })
    const text = [...holder.childNodes].find((node) => node.nodeType === 3 && node.textContent.trim().length > 8)
    const start = text.textContent.search(/\S/)
    const range = document.createRange()
    range.setStart(text, start)
    range.setEnd(text, Math.min(text.textContent.length, start + 12))
    getSelection().removeAllRanges()
    getSelection().addRange(range)
    return range.toString()
  })
  await page.waitForTimeout(300)
  await page.keyboard.press("ControlOrMeta+i")
  const textPane = await page.waitForSelector("epic-comment-pane > textarea", { timeout: 5000 }).catch(() => null)
  check(`${name}:  ⌘ I on text selected in section ${section} opens the pane`, !!textPane && !!quote, quote)
  if (textPane) {
    await page.keyboard.type("What does this line mean?")
    await page.waitForTimeout(1200)
    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
  }
  // a list item holds its thread at its end;  a paragraph has it right after
  const inItem = await page.evaluate(
    () =>
      !!document.querySelector(
        "li[data-check-text] > epic-threads > epic-thread, p[data-check-text] + epic-threads > epic-thread"
      )
  )
  check(`${name}:  the text comment's thread is in its ${holder === "li" ? "list item" : "paragraph's place"}`, inItem)
  await page.screenshot({ path: join(out, `${name}-threads.png`) })
  // a section's bullhorn, in its title row, while it's hovered
  const { hovered, header } = await page.evaluate(() => {
    const section = document.querySelectorAll("main > .site-body ui-section[id]:not(ui-section ui-section)")[1]
    section?.scrollIntoView({ block: "center" })
    // its title:  `label`, or `header`, its old name (spell-app's epic `property-editor` P10)
    return { hovered: section?.id, header: section?.getAttribute("label") }
  })
  // its title, drawn in its shadow root (the host itself has no box of its own to aim at)
  await page.locator(`[id="${hovered}"]`).getByText(header, { exact: true }).first().hover().catch(() => {})
  await page.waitForTimeout(300)
  const shown = await page.evaluate(
    (id) => getComputedStyle(document.querySelector(`#${CSS.escape(id)} > .spell-comment-mark`)).opacity,
    hovered
  )
  check(`${name}:  a section's bullhorn shows in its title row while hovered`, shown === "1", `#${hovered} ${shown}`)
  await page.screenshot({ path: join(out, `${name}-hover.png`) })

  // what the server holds
  const held = GuideInbox.read(inbox(element)).commentList.all
  check(`${name}:  the inbox holds both comments`, held.length >= 2, held.map((each) => `${each.id} ${each.kind}`).join(", "))

  // Send
  const send = await page.evaluate(() => {
    const box = document.querySelector(".site-masthead > .spell-send")
    return box && { state: box.dataset.state, who: box.querySelector(".spell-send-who")?.textContent }
  })
  check(
    `${name}:  Send shows, unsent, and names feedback`,
    send?.state === "unsent" && /^(feedback is listening|nobody is listening:  Send wakes feedback)$/.test(send.who),
    JSON.stringify(send)
  )
  // Send's plane, in its `<epic-send-buttons>` (epic `epic-engine` P20)
  await page.locator('.site-masthead > .spell-send > epic-send-buttons [part~="send"]').click()
  await page.waitForSelector('.site-masthead > .spell-send[data-state="sent"]', { timeout: 5000 }).catch(() => {})
  check(`${name}:  a click on Send sends them`, !!(await page.$('.site-masthead > .spell-send[data-state="sent"]')))
  check(`${name}:  the inbox says they were sent`, !!GuideInbox.read(inbox(element)).sent)
  check(`${name}:  feedback woken, or nobody`, served.wakes.every((epic) => epic === "feedback"), served.wakes.join(", "))
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(out, `${name}-sent.png`) })

  // the router's swap:  the next page's bullhorns, none of this page's threads;  back, they're there again
  // a link in the page, as the article's own are:  the router takes the click
  await page.evaluate((swapTo) => {
    const link = document.createElement("a")
    link.href = `${swapTo}.html`
    link.textContent = swapTo
    ;(document.querySelector("main .site-article") ?? document.querySelector("main .site-body")).append(link)
    link.click()
  }, swapTo)
  await page.waitForFunction((swapTo) => location.pathname.endsWith(`/${swapTo}.html`), swapTo, { timeout: 10_000 })
  await page.waitForTimeout(2500)
  const swapped = await page.evaluate(() => ({
    page: document.querySelectorAll(".site-masthead > .spell-comment-mark.at-page").length,
    threads: document.querySelectorAll("epic-thread").length,
    floats: document.querySelectorAll(".spell-comment-float").length,
    send: document.querySelector(".site-masthead > .spell-send")?.dataset.state
  }))
  check(
    `${name}:  the router's swap draws the next page's bullhorns, and none of the last page's threads`,
    swapped.page === 1 && swapped.threads === 0 && swapped.floats <= 1 && swapped.send === "idle",
    JSON.stringify(swapped)
  )
  await page.goBack()
  await page.waitForFunction((name) => location.pathname.endsWith(`/${name}.html`), element, { timeout: 10_000 })
  await page.waitForTimeout(2500)
  const back = await page.evaluate(() => document.querySelectorAll("epic-thread").length)
  check(`${name}:  back again, the threads draw again`, back === held.length, `${back}`)

  await checkToolbar(page, name, held)

  check(`${name}:  no page errors`, !page.errors.length, page.errors.slice(0, 3).join(" | "))
  await page.close()
  if (!keep) await clear(element)
}

/**
 * The TOOLBAR (epic `epic-engine` T11):  the docs pages' band under the masthead, a button per top-level section, the
 * comments' bullhorn and Cmd / Ctrl + K.  Claude answers the page's comments first (in the scratch inbox), so they
 * wait on Owen.
 */
async function checkToolbar(page, name, held) {
  GuideInbox.update(inbox(element), (comments) => {
    for (const { id } of held) comments.answer(id, "<p>Answered, for the toolbar's check.</p>")
  })
  await page.reload()
  await page.waitForSelector(".spell-toolbar > .spell-toolbar-waiting:not([hidden])", { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(800)
  const bar = await page.evaluate(() => {
    const article = document.querySelector("main .site-article")
    const sections = [...article.querySelectorAll(":scope > ui-section[id]")].map((each) => each.id)
    const toolbar = article.querySelector(":scope > ui-sticky.site-sticky-bar > :is(ui-menu, ui-toolbar).spell-toolbar")
    const items = [...(toolbar?.querySelectorAll(":scope > [data-rail]") ?? [])].map((each) => each.dataset.rail)
    const bullhorn = toolbar?.querySelector(":scope > .spell-toolbar-waiting")
    return {
      first: article.firstElementChild?.matches("ui-sticky.spell-site-toolbar"),
      sections,
      items,
      count: bullhorn && !bullhorn.hidden ? bullhorn.querySelector(".spell-toolbar-count")?.textContent : null,
      bands: document.querySelectorAll(".spell-toolbar").length
    }
  })
  check(
    `${name}:  the toolbar, first in the article:  a button per top-level section`,
    bar.first && bar.bands === 1 && bar.items.length === bar.sections.length && bar.items.join() === bar.sections.join(),
    `${bar.items.length} of ${bar.sections.length}`
  )
  check(`${name}:  the bullhorn counts the threads waiting on Owen`, bar.count === String(held.length), `${bar.count}`)
  await page.screenshot({ path: join(out, `${name}-toolbar.png`) })

  // a button lands its section just under the band, and is marked
  const target = bar.sections[2]
  // the item's own box, in its shadow root:  the `<ui-item>` host is `display: contents`
  await page.locator(`.spell-toolbar > [data-rail="${target}"] [part~="item"]`).click()
  await page.waitForTimeout(1200)
  const landed = await page.evaluate((id) => {
    const band = document.querySelector("ui-sticky.spell-site-toolbar > ui-menu").getBoundingClientRect()
    const section = document.getElementById(id)
    const sentinel = section.shadowRoot?.querySelector(".sentinel") ?? section
    return {
      gap: Math.round(sentinel.getBoundingClientRect().top - band.bottom),
      bandTop: Math.round(band.top),
      selected: document.querySelector(".spell-toolbar > [selected]")?.dataset.rail
    }
  }, target)
  check(
    `${name}:  a button lands its section under the stuck band, and is marked`,
    Math.abs(landed.gap) <= 3 && landed.selected === target,
    JSON.stringify(landed)
  )
  await page.screenshot({ path: join(out, `${name}-landed.png`) })
  // scrolled back up, the first section's button is marked
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(300)
  const top = await page.evaluate(() => document.querySelector(".spell-toolbar > [selected]")?.dataset.rail)
  check(`${name}:  at the top, the first section's button is marked`, top === bar.sections[0], `${top}`)

  // the bullhorn:  each click the next waiting thread, opened, on screen
  const visits = []
  for (let click = 0; click < held.length + 1; click++) {
    await page.locator('.spell-toolbar > .spell-toolbar-waiting [part~="item"]').click()
    await page.waitForTimeout(1300)
    visits.push(
      await page.evaluate(() => {
        const threads = [...document.querySelectorAll("epic-thread[id^='comment-']")]
        const shown = threads.find((thread) => {
          const box = thread.getBoundingClientRect()
          return box.top >= 0 && box.top < innerHeight * 0.6 && thread.hasAttribute("open")
        })
        return shown?.id.replace("comment-", "")
      })
    )
  }
  const order = held.map((each) => each.id)
  check(
    `${name}:  the bullhorn lands on each waiting thread in turn, then round again`,
    visits.join() === [...order, order[0]].join(),
    visits.join()
  )

  // Cmd / Ctrl + K:  the waiting threads listed;  C2 lands on its thread
  await page.evaluate(() => scrollTo(0, 0))
  await page.keyboard.press("ControlOrMeta+k")
  await page.waitForSelector("ui-modal .spell-jump input", { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(400)
  const dialog = await page.evaluate(() => ({
    header: document.querySelector("ui-modal[heading]")?.getAttribute("heading"),
    open: document.querySelectorAll("dialog[open], ui-modal:not([hidden])").length,
    lines: [...document.querySelectorAll(".spell-jump-thread > b")].map((each) => each.textContent),
    search: document.querySelector("ui-docs-search")?.matches(":focus-within") ?? false
  }))
  check(
    `${name}:  ⌘ K opens the jump dialog (not the site's search), the waiting threads under its box`,
    !!dialog.header && dialog.lines.join() === order.map((id) => id.toUpperCase()).join(),
    JSON.stringify(dialog)
  )
  await page.screenshot({ path: join(out, `${name}-jump.png`) })
  const last = order.at(-1)
  await page.keyboard.type(last.toUpperCase())
  await page.keyboard.press("Enter")
  await page.waitForTimeout(1200)
  const jumped = await page.evaluate((id) => {
    const thread = document.getElementById(`comment-${id}`)
    const box = thread?.getBoundingClientRect()
    return { open: thread?.hasAttribute("open"), top: box && Math.round(box.top), modal: !!document.querySelector("ui-modal") }
  }, last)
  check(
    `${name}:  ⌘ K, ${last.toUpperCase()}:  lands on its thread, opened`,
    jumped.open && jumped.top >= 0 && jumped.top < 600 && !jumped.modal,
    JSON.stringify(jumped)
  )

  // words, not an id:  the site's search, with them typed in
  await page.keyboard.press("ControlOrMeta+k")
  await page.waitForSelector("ui-modal .spell-jump input", { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(400)
  await page.keyboard.type("thread")
  await page.keyboard.press("Enter")
  await page.waitForTimeout(1200)
  const searched = await page.evaluate(() => {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    return { value: active?.value, field: active?.getRootNode()?.host?.localName }
  })
  check(
    `${name}:  ⌘ K, words:  the site's search, the words typed in`,
    searched.value === "thread" && searched.field === "ui-docs-search",
    JSON.stringify(searched)
  )
  await page.screenshot({ path: join(out, `${name}-search.png`) })
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")

  // the router's swap:  the next page's own toolbar, no bullhorn (nothing waits there)
  await page.evaluate((swapTo) => {
    const link = document.createElement("a")
    link.href = `${swapTo}.html`
    ;(document.querySelector("main .site-article") ?? document.querySelector("main .site-body")).append(link)
    link.click()
  }, swapTo)
  await page.waitForFunction((swapTo) => location.pathname.endsWith(`/${swapTo}.html`), swapTo, { timeout: 10_000 })
  await page.waitForTimeout(2500)
  const next = await page.evaluate(shownToolbar)
  check(
    `${name}:  the router's swap:  the next page's toolbar, no bullhorn`,
    next.same && next.items > 0 && next.bands === 1 && !next.bullhorn,
    JSON.stringify(next)
  )
  await page.screenshot({ path: join(out, `${name}-swapped.png`) })

  // a page in TABS (Brand's element pages):  the toolbar follows the tab shown, its sections only
  if (!next.tabbed) return
  await page.evaluate(() => scrollTo(0, 0))
  await page.locator("ui-tabs.site-tabs").getByRole("tab", { name: "Usage" }).click()
  await page.waitForTimeout(1200)
  const usage = await page.evaluate(shownToolbar)
  check(
    `${name}:  another tab:  the toolbar its sections only, first in its pane`,
    usage.same && usage.items > 0 && usage.bands === 1 && usage.inPane && usage.pane === "usage",
    JSON.stringify(usage)
  )
  await page.screenshot({ path: join(out, `${name}-tab.png`) })
}

/**
 * What the toolbar shows against the page shown:  the page's top-level sections (its article's;  a page in tabs, the
 * shown pane's), the items, how many bands, the bullhorn;  run in the page.
 */
function shownToolbar() {
  const article = document.querySelector("main .site-article")
  const tabs = document.querySelector("main ui-tabs")
  const pane = tabs && [...tabs.querySelectorAll(":scope > ui-tab")].find((tab) => tab.matches(":state(selected)"))
  const top = [...document.querySelectorAll("main ui-section[id]")].filter(
    (section) => !section.parentElement.closest("ui-section, ui-example, template")
  )
  const sections = (
    article
      ? [...article.querySelectorAll(":scope > ui-section[id]")]
      : top.filter((section) => !pane || pane.contains(section))
  ).map((each) => each.id)
  const items = [...document.querySelectorAll(".spell-toolbar > [data-rail]")].map((each) => each.dataset.rail)
  const bullhorn = document.querySelector(".spell-toolbar > .spell-toolbar-waiting")
  return {
    same: items.join() === sections.join(),
    items: items.length,
    bands: document.querySelectorAll(".spell-toolbar").length,
    bullhorn: !!bullhorn && !bullhorn.hidden,
    tabbed: !article && !!pane,
    pane: pane?.getAttribute("value"),
    inPane: !!pane && pane.firstElementChild?.matches("ui-sticky.spell-site-toolbar")
  }
}

/** Clear every comment on the set's page `name` through the route, as the trash does. */
async function clear(name) {
  const page = await newPage(1200)
  await page.goto(pageUrl(name))
  await page.waitForFunction(() => window.SPELL_SERVER?.token, null, { timeout: 10_000 })
  for (const { id } of GuideInbox.read(inbox(name)).commentList.all)
    await page.evaluate(
      async ({ id, path }) =>
        fetch("/api/docs/comments", {
          method: "POST",
          headers: { "content-type": "application/json", "x-server-token": window.SPELL_SERVER.token },
          body: JSON.stringify({ page: path, action: "clear", id })
        }),
      { id, path: pagePath(name) }
    )
  check(`cleared the comments on ${name}`, !GuideInbox.read(inbox(name)).commentList.all.length)
  await page.close()
}

/**
 * Spell UI's own live EXAMPLES, beside the comments and the epics pack (the site's bundle shares its Spell UI with
 * the pack):  on three element pages, every example drawn and no tag left undefined, and one each still answers a
 * click:  a dropdown opens, a modal shows, a checkbox ticks.
 */
async function checkExamples() {
  const tries = [
    ["ui-dropdown", "main ui-example ui-dropdown", (element) => element.matches(":state(open)")],
    ["ui-modal", "main ui-example ui-button[commandfor]", () => !!document.querySelector("ui-modal")
      && [...document.querySelectorAll("ui-modal")].some((modal) => modal.shadowRoot?.querySelector("dialog[open]"))],
    ["ui-checkbox", "main ui-example ui-checkbox", (element) => element.checked === true]
  ]
  for (const [name, selector, answered] of tries) {
    const page = await newPage(1200)
    await page.goto(pageUrl(name))
    await page.waitForFunction(() => document.querySelector("ui-root")?.matches(":state(ready)"), null, {
      timeout: 20_000
    })
    await page.waitForTimeout(800)
    const drawn = await page.evaluate(() => {
      const examples = [...document.querySelectorAll("ui-example")]
      const tags = [...document.querySelectorAll("*")].map((each) => each.localName)
      return {
        examples: examples.length,
        upgraded: examples.filter((each) => each.shadowRoot).length,
        undefined: [...new Set(tags.filter((tag) => /^(ui|epic)-/.test(tag) && !customElements.get(tag)))]
      }
    })
    const target = page.locator(selector).first()
    await target.scrollIntoViewIfNeeded()
    await target.click()
    await page.waitForTimeout(600)
    const ok = await target.evaluate(answered)
    await page.screenshot({ path: join(out, `example-${name}.png`) })
    check(
      `${name}:  its live examples draw, and one answers a click`,
      drawn.examples > 0 && drawn.upgraded === drawn.examples && !drawn.undefined.length && ok,
      JSON.stringify({ ...drawn, clicked: ok })
    )
    check(`${name}:  no page errors`, !page.errors.length, page.errors.slice(0, 3).join(" | "))
    await page.close()
  }
}

/** A guide:  the docs runtime still draws the bullhorns, and a thread has the comments' look. */
async function checkGuide() {
  const page = await newPage(1200, { withBundle: true })
  await page.route("**/api/**", (route) => (route.request().method() === "POST" ? route.abort() : route.fallback()))
  await page.route("**/api/docs/comments?*", async (route) => {
    const anchor = await page.evaluate(() => document.querySelector("main ui-section[id]")?.id)
    const at = "2026-10-19T10:00:00.000Z"
    await route.fulfill({
      json: {
        takesComments: true,
        comments: [
          {
            id: "c1",
            anchor,
            kind: "section",
            label: "",
            excerpt: "",
            text: "A stubbed comment",
            at,
            status: "answered",
            replies: [{ by: "Claude", at, html: "<p>Answered.</p>" }],
            turn: "owen"
          }
        ]
      }
    })
  })
  await page.goto(`${served.base}/guides/python-target.html`)
  const drawn = await page
    .waitForSelector("epic-thread", { state: "attached", timeout: 20_000 })
    .then(() => true)
    .catch(() => false)
  const look = await page.evaluate(() => {
    // an `<epic-thread>`:  its host is the ivory box
    const thread = document.querySelector("epic-thread")
    return thread && { radius: getComputedStyle(thread).borderTopLeftRadius, marks: document.querySelectorAll(".spell-comment-mark").length }
  })
  check(
    "guide:  the docs runtime draws bullhorns and a thread, in the comments' look",
    drawn && look?.marks > 3 && look.radius === "10px",
    JSON.stringify(look)
  )
  await page.screenshot({ path: join(out, "guide.png") })
  check("guide:  no page errors", !page.errors.length, page.errors.slice(0, 3).join(" | "))
  await page.close()
}
