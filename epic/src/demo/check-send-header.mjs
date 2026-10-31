/**
 * Check the epic page HEADER of epic `epic-engine` P53 (Send Countdown) in a real browser:  Send at the header's
 * middle with Auto Send's ring part-filled round the plane, the session's bare spinner beside it, the gear's menu with
 * each sub-menu open (Auto Send, Theme);  and a page in each stage (epic `epic-engine` I180):  the header still the plain
 * paper plane, with its ring, and the stage's Accept on the title row of what it accepts:  Accept Overview on the
 * Overview's, Accept Phases on the Phases section's, before its gear.
 *
 * Usage (from the `epic/` folder):
 *   node src/demo/check-send-header.mjs [--doc <name>] [--bundle <spell-ui.js>] [outDir]
 * - the copy:  epic `<name>`'s page (default `epic-engine`), its skeleton and parts, NEVER its inbox, as
 *   `src/demo/shots/send-header/epics/send-header/` (git-ignored);  its inbox written here:  a session listening and
 *   "Building P53" (so the spinner shows), one item marked and not sent (so the ring counts)
 * - the server:  a page server of its OWN (`DemoServer`), THIS checkout's pack and routes;  it wakes nobody
 * - the browser's clock is Playwright's:  45 seconds on, the ring is part-filled
 * - at 1200px and 400px (VS Code's side bar), light and dark;  measures:
 *   - the plane at the header's exact middle (1px), or narrow:  after the h1, before the right side, never over either
 *   - the ring round the plane, inside the header;  the spinner and the gear on the plane's middle line (1px)
 *   - nothing wider than the window, the gear's menu and its sub-menus included
 * - screenshots (outDir, default `src/demo/shots/send-header/`):  `header-<w>-<scheme>.png`, `gear-<w>-<scheme>.png`,
 *   `auto-send-<w>-<scheme>.png`, `theme-<w>-<scheme>.png`, `stage-<stage>-<w>-<scheme>.png`, and each stage's Accept
 *   pressed, 2 minutes into its 5-minute countdown (I181):  `stage-<stage>-counting-<w>-<scheme>.png`
 * - Send's TURNING ring (P55):  the inbox says the session is answering two sent items, nothing unsent:  the ring
 *   turns round the plane, centred on it (1px), the element's height, no spinner beside it;  then idle:  neither ring;
 *   `working-<w>-<scheme>.png`
 * - fails (exit 1) on a page error or a measure off;  re-runs itself under `tsx` (the page server is TypeScript)
 */
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, "../..")

if (!process.env.CHECK_SEND_HEADER_UNDER_TSX) {
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      cwd: ROOT,
      env: { ...process.env, CHECK_SEND_HEADER_UNDER_TSX: "1", TSX_TSCONFIG_PATH: join(ROOT, "tsconfig.json") }
    }
  )
  process.exit(run.status ?? 1)
}

const { BrowserPage } = await import("spell/element-tools/BrowserPage")
const { DemoServer } = await import("./DemoServer.ts")
const { bundleRoutes, logInto } = await import("./demoPages.mjs")
const { EpicConfig } = await import("spell/epic/config/EpicConfig.ts")

////////////////
// ## Settings
////////////////

const args = process.argv.slice(2)
const flagValue = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined)
const from = flagValue("--doc") ?? "epic-engine"
const bundle = flagValue("--bundle")
const flagged = new Set(["--doc", "--bundle"].flatMap((name) => (args.includes(name) ? [args.indexOf(name) + 1] : [])))
const CONTENT = join(HERE, "shots", "send-header")
const out = args.find((arg, index) => !arg.startsWith("--") && !flagged.has(index)) ?? CONTENT
const NAME = "send-header"
const STAGED = { overview: "send-header-overview", phases: "send-header-phases" }
const problems = []
const summary = {}

////////////////
// ## The copies
////////////////

rmSync(join(CONTENT, "epics"), { recursive: true, force: true })
mkdirSync(out, { recursive: true })
const marked = copyEpic(NAME, "")
for (const [stage, name] of Object.entries(STAGED)) copyEpic(name, stage)
const server = await DemoServer.start({ content: CONTENT })
const browser = await BrowserPage.launch()
try {
  for (const width of [1200, 400])
    for (const scheme of ["light", "dark"]) {
      await header(width, scheme)
      await working(width, scheme)
      for (const which of Object.keys(STAGED)) await stage(which, width, scheme)
    }
} catch (error) {
  problems.push(`threw:  ${error.stack ?? error}`)
} finally {
  await browser.close()
  await server.stop()
}
console.log(JSON.stringify(summary, null, 2))
if (problems.length) {
  console.error(problems.map((problem) => `- ${problem}`).join("\n"))
  process.exit(1)
}

////////////////
// ## The header
////////////////

/** The header at `width`, in `scheme`:  the ring part-filled, the spinner, the gear and its sub-menus. */
async function header(width, scheme) {
  const tag = `${width}-${scheme}`
  writeInbox(NAME)
  const page = await openPage(NAME, width, scheme)
  await page
    .waitForFunction(() => sendRoot()?.querySelector('[part~="ring"]'), null, { timeout: 8000 })
    .catch(() => problems.push(`${tag}:  no ring round the plane (marked ${marked})`))
  await page
    .waitForFunction(() => spinner(), null, { timeout: 8000 })
    .catch(() => problems.push(`${tag}:  no spinner beside Send`))
  await page.clock.fastForward(45_000)
  await page.waitForTimeout(1300)
  const measured = await page.evaluate(() => measure())
  summary[tag] = measured
  if (width > 600 && Math.abs(measured.plane.middle - measured.header.middle) > 1)
    problems.push(`${tag}:  the plane ${measured.plane.middle} is off the header's middle ${measured.header.middle}`)
  if (measured.heading.right > measured.plane.left + 0.5) problems.push(`${tag}:  the h1 runs under the plane`)
  if (measured.ring.right > measured.status.left + 0.5) problems.push(`${tag}:  the ring runs into the right side`)
  if (measured.ring.top < measured.header.top - 0.5 || measured.ring.bottom > measured.header.bottom + 0.5)
    problems.push(`${tag}:  the ring leaves the header (${JSON.stringify(measured.ring)})`)
  if (!(measured.done > 0.15 && measured.done < 0.5))
    problems.push(`${tag}:  the ring isn't part-filled (${measured.done})`)
  for (const name of ["spinner", "gear"])
    if (Math.abs(measured[name].centre - measured.plane.centre) > 1)
      problems.push(
        `${tag}:  the ${name} is off the plane's middle line by ${measured[name].centre - measured.plane.centre}px`
      )
  await page.screenshot({ path: join(out, `header-${tag}.png`), clip: clipOf(measured.header, width) })
  // Send close up:  the ring, its gap, its ends
  const near = measured.ring ?? measured.plane
  await page.screenshot({
    path: join(out, `send-${tag}.png`),
    clip: {
      x: near.left - 40,
      y: measured.header.top,
      width: near.right - near.left + 80,
      height: measured.header.bottom - measured.header.top
    }
  })

  // the gear's menu, then each sub-menu
  await page.evaluate(() => gearButton().click())
  await page.waitForFunction(() => gearMenu()?.matches(":popover-open"), null, { timeout: 4000 })
  await page.waitForTimeout(400)
  await shotMenu(page, `gear-${tag}`, width)
  await page.evaluate(() => gearRows()[0].click())
  await page.waitForTimeout(300)
  await shotMenu(page, `auto-send-${tag}`, width)
  await page.keyboard.press("ArrowLeft")
  await page.evaluate(() => gearRows()[1].click())
  await page.waitForFunction(() => page_().querySelector('[part~="theme-menu"]:not([hidden])'), null, { timeout: 4000 })
  await page.waitForTimeout(400)
  summary[tag].rows = await page.evaluate(() => gearRows().map((row) => row.textContent.replace(/\s+/g, " ").trim()))
  await shotMenu(page, `theme-${tag}`, width)
  await page.close()
}

/**
 * Send while the session answers what was sent (P55):  the turning ring round the plane, centred, no countdown ring,
 * no spinner;  then idle, neither.
 */
async function working(width, scheme) {
  const tag = `working-${width}-${scheme}`
  writeInbox(NAME, "working")
  const page = await openPage(NAME, width, scheme)
  await page
    .waitForFunction(() => sendRoot()?.querySelector('[part~="working"]'), null, { timeout: 8000 })
    .catch(() => problems.push(`${tag}:  no turning ring round the plane`))
  const found = await page.evaluate(() => {
    const ring = sendRoot()?.querySelector('[part~="working"]')
    const host = page_().querySelector('[part~="send"]')
    if (!ring) return null
    const plane = measure().plane
    const rect = ring.getBoundingClientRect()
    return {
      dx: Math.round((rect.left + rect.width / 2 - plane.middle) * 10) / 10,
      dy: Math.round((rect.top + rect.height / 2 - plane.centre) * 10) / 10,
      size: Math.round(rect.height * 10) / 10,
      hostHeight: Math.round(host.getBoundingClientRect().height * 10) / 10,
      turning: getComputedStyle(ring.querySelector(".arc")).animationName,
      countdown: !!sendRoot().querySelector('[part~="ring"]'),
      spinner: !!spinner(),
      title: sendRoot().querySelector('[part~="send"]').title
    }
  })
  summary[tag] = found
  if (found) {
    if (Math.abs(found.dx) > 1 || Math.abs(found.dy) > 1) problems.push(`${tag}:  the ring is off the plane's centre`)
    if (found.size > found.hostHeight + 0.5) problems.push(`${tag}:  the ring is wider than Send (${found.size})`)
    if (found.turning !== "epic-ring-turn") problems.push(`${tag}:  the ring doesn't turn`)
    if (found.countdown) problems.push(`${tag}:  the countdown ring shows too`)
    if (found.spinner) problems.push(`${tag}:  the spinner still shows beside Send`)
    const header = await page.evaluate(() => measure().header)
    await page.screenshot({ path: join(out, `${tag}.png`), clip: clipOf(header, width) })
  }
  await page.close()
  writeInbox(NAME, "idle")
  const idle = await openPage(NAME, width, scheme)
  const rings = await idle.evaluate(() => [
    !!sendRoot()?.querySelector('[part~="working"]'),
    !!sendRoot()?.querySelector('[part~="ring"]')
  ])
  if (rings.some(Boolean)) problems.push(`idle-${width}-${scheme}:  a ring shows with nothing to do (${rings})`)
  await idle.close()
}

/**
 * A page in `which` stage (`overview`, `phases`;  epic `epic-engine` I180):  the header's Send still the paper plane,
 * its ring counting;  the stage's Accept on the title row of its block (the Overview, the Phases section), folded,
 * before the Phases section's gear;  nothing wider than the window.
 */
async function stage(which, width, scheme) {
  const tag = `${which}-${width}-${scheme}`
  const name = STAGED[which]
  writeInbox(name)
  const page = await openPage(name, width, scheme)
  await page
    .waitForFunction((which) => stageButton(which), which, { timeout: 8000 })
    .catch(() => problems.push(`${tag}:  no Accept on its block's title row`))
  await page.clock.fastForward(45_000)
  await page.waitForTimeout(1300)
  const found = await page.evaluate((which) => {
    const button = stageButton(which)
    const block = stageBlock(which)
    const row = block.shadowRoot.querySelector('[part~="tools"]')
    const gear = block.shadowRoot.querySelector('[part~="gear"]')
    const icon = sendRoot().querySelector('[part~="send"] ui-icon')?.getAttribute("name")
    const box = (element) => element && element.getBoundingClientRect().toJSON()
    return {
      plane: icon,
      planeWords: sendRoot().querySelector('[part~="send"]').textContent.trim(),
      ring: !!sendRoot().querySelector('[part~="ring"]'),
      words: button?.textContent.trim(),
      button: box(button),
      row: box(row),
      gear: box(gear),
      folded: block.getAttribute("open") !== "true" && !block.hasAttribute("open"),
      header: measure().header,
      wide: widest()
    }
  }, which)
  const words = which === "overview" ? "Accept Overview" : "Accept Phases"
  if (found.plane !== "paper plane" || found.planeWords)
    problems.push(`${tag}:  the header's Send isn't the plain plane (${found.plane}, "${found.planeWords}")`)
  if (!found.ring) problems.push(`${tag}:  no ring round the plane`)
  if (found.words !== words) problems.push(`${tag}:  Accept says "${found.words}", not "${words}"`)
  if (found.button) {
    const middle = found.button.top + found.button.height / 2
    if (middle < found.row.top - 0.5 || middle > found.row.bottom + 0.5)
      problems.push(`${tag}:  Accept isn't on its block's title row`)
    if (found.gear && found.button.right > found.gear.left + 0.5) problems.push(`${tag}:  Accept isn't before the gear`)
    if (found.button.right > width + 0.5) problems.push(`${tag}:  Accept leaves the window`)
  }
  if (found.wide) problems.push(`${tag}:  wider than the window:  ${found.wide}`)
  summary[tag] = { words: found.words, folded: found.folded, button: found.button }
  const bottom = Math.max(found.header.bottom, found.row?.bottom ?? 0)
  await page.screenshot({ path: join(out, `stage-${tag}.png`), clip: { x: 0, y: 0, width, height: Math.ceil(bottom + 24) } })
  // pressed (I181):  its 5-minute countdown, the green ring round its thumbs up, inside the button;  2 minutes on
  await page.evaluate((which) => stageButton(which).click(), which)
  await page.waitForTimeout(600)
  await page.clock.fastForward(120_000)
  await page.waitForTimeout(1300)
  const counting = await page.evaluate((which) => {
    const button = stageButton(which)
    const ring = button?.querySelector('[part~="ring"]')
    const box = (element) => element && element.getBoundingClientRect().toJSON()
    return { state: button?.dataset.state, title: button?.title, ring: box(ring), button: box(button) }
  }, which)
  if (counting.state !== "counting") problems.push(`${tag}:  pressed, Accept isn't counting (${counting.state})`)
  if (!counting.ring) problems.push(`${tag}:  pressed, no ring round its thumbs up`)
  else if (
    counting.ring.top < counting.button.top - 0.5 ||
    counting.ring.bottom > counting.button.bottom + 0.5 ||
    counting.ring.left < counting.button.left - 0.5
  )
    problems.push(`${tag}:  the ring leaves the button`)
  if (!/goes to Claude in \d:\d\d/.test(counting.title ?? "")) problems.push(`${tag}:  no time left in its tooltip`)
  summary[`${tag}-counting`] = { title: counting.title, ring: counting.ring }
  await page.screenshot({
    path: join(out, `stage-${which}-counting-${width}-${scheme}.png`),
    clip: { x: 0, y: 0, width, height: Math.ceil(bottom + 24) }
  })
  await page.close()
}
/** Screenshot the gear's menu, from the header down to its bottom;  check nothing leaves the window. */
async function shotMenu(page, name, width) {
  const box = await page.evaluate(() => {
    const menu = gearMenu().shadowRoot?.querySelector('[part~="popup"]') ?? gearMenu()
    const rect = menu.getBoundingClientRect()
    return { left: rect.left, right: rect.right, bottom: rect.bottom }
  })
  if (box.left < -0.5 || box.right > width + 0.5)
    problems.push(`${name}:  the menu leaves the window (${Math.round(box.left)} to ${Math.round(box.right)})`)
  const wide = await page.evaluate(() => widest())
  if (wide) problems.push(`${name}:  wider than the window:  ${wide}`)
  await page.screenshot({
    path: join(out, `${name}.png`),
    clip: { x: 0, y: 0, width, height: Math.ceil(box.bottom + 16) }
  })
}

////////////////
// ## Helpers
////////////////

/** Open copy `name` at `width` in `scheme`, its clock Playwright's, the page-side helpers on `window`. */
async function openPage(name, width, scheme) {
  const logs = []
  const page = await BrowserPage.newPage(browser, {
    viewport: { width, height: 760 },
    context: { deviceScaleFactor: 2 },
    routes: bundleRoutes(bundle),
    ignore: /Failed to load resource/,
    onProblem: logInto(logs)
  })
  await page.emulateMedia({ colorScheme: scheme })
  await page.clock.install()
  await page.addInitScript(HELPERS)
  await page.goto(`${server.base}/epics/${name}/${name}.plan.html`)
  await page
    .waitForFunction(() => document.querySelector("epic-page")?.hasAttribute("reviewing"), null, { timeout: 15_000 })
    .catch(() => problems.push(`${name}:  never reviewed`))
  await page.waitForTimeout(800)
  page.on("close", () => logs.length && problems.push(`${name} ${width} ${scheme}:  ${logs.join(" | ")}`))
  return page
}

/** The page-side helpers. */
function HELPERS() {
  window.page_ = () => document.querySelector("epic-page")?.shadowRoot
  window.sendRoot = () => page_()?.querySelector('[part~="send"]')?.shadowRoot
  window.spinner = () =>
    page_()?.querySelector('epic-agents[draws="spinner"]')?.shadowRoot?.querySelector(".spinner") ?? null
  window.gearButton = () => page_().querySelector('[part~="gear"]')
  window.stageBlock = (which) =>
    document.querySelector(which === "overview" ? "epic-page > epic-overview" : 'epic-page > epic-section[kind="phases"]')
  window.stageButton = (which) =>
    stageBlock(which)
      ?.shadowRoot?.querySelector('[part~="stage-button"]')
      ?.shadowRoot?.querySelector('[part~="base"]') ?? null
  window.gearMenu = () => page_().querySelector('[part~="gear-menu"]')
  window.gearRows = () => Array.from(page_().querySelectorAll('[part~="gear-row"]'))
  window.measure = () => {
    const box = (element) => {
      const rect = element.getBoundingClientRect()
      const round = (n) => Math.round(n * 10) / 10
      return {
        left: round(rect.left),
        right: round(rect.right),
        top: round(rect.top),
        bottom: round(rect.bottom),
        middle: round(rect.left + rect.width / 2),
        centre: round(rect.top + rect.height / 2)
      }
    }
    const done = sendRoot()?.querySelector(".ring .done")
    return {
      header: box(page_().querySelector('[part~="header"]')),
      heading: box(page_().querySelector('[part~="heading"]')),
      status: box(page_().querySelector('[part~="status"]')),
      plane: box(sendRoot().querySelector('[part~="send"] .glyph')),
      ring: sendRoot().querySelector('[part~="ring"]') ? box(sendRoot().querySelector('[part~="ring"]')) : null,
      done: done ? parseFloat(done.style.strokeDasharray) / 100 : null,
      spinner: spinner() ? box(spinner()) : null,
      gear: box(gearButton())
    }
  }
  window.widest = () => {
    const out = []
    const walk = (root) => {
      for (const element of root.querySelectorAll("*")) {
        const rect = element.getBoundingClientRect()
        const host = element.getRootNode().host
        const site = element.closest("spell-site-header, .site-header") || host?.closest?.("spell-site-header")
        if (rect.right > innerWidth + 0.5 && rect.width && !site)
          out.push(`${element.localName}.${element.className} (${Math.round(rect.right)})`)
        if (element.shadowRoot) walk(element.shadowRoot)
      }
    }
    walk(document)
    return out.slice(0, 6).join(", ")
  }
}

/** The screenshot's box:  the header, and a little round it. */
function clipOf(header, width) {
  return { x: 0, y: 0, width, height: Math.ceil(header.bottom + 24) }
}

/**
 * Copy epic `from`'s page (skeleton and parts) as epic `name`, in `stage` (none:  building);  the id of the open item
 * its inbox marks.
 */
function copyEpic(name, stage) {
  const source = join(EpicConfig.contentOf(ROOT), "epics", from)
  const skeleton = join(source, `${from}.plan.html`)
  if (!existsSync(skeleton)) {
    console.error(`check-send-header:  no ${skeleton}`)
    process.exit(2)
  }
  const folder = join(CONTENT, "epics", name)
  mkdirSync(join(folder, "parts"), { recursive: true })
  for (const part of readdirSync(join(source, "parts")))
    writeFileSync(join(folder, "parts", part), readFileSync(join(source, "parts", part)))
  let html = readFileSync(skeleton, "utf8").replaceAll(`epic="${from}"`, `epic="${name}"`)
  html = html.replace(/(<epic-page\b[^>]*?)\sstage="[^"]*"/, "$1")
  if (stage) html = html.replace(/<epic-page\b/, `<epic-page stage="${stage}"`)
  writeFileSync(join(folder, `${name}.plan.html`), html)
  return /<epic-item\s+id="([qj]\d+)"[^>]*status="open"/.exec(html)?.[1] ?? "q1"
}

/**
 * Copy `name`'s inbox, as `mode` says:
 * - `counting`:  a session listening and building, one item marked and not sent
 * - `working`:  the session answering two sent items, nothing unsent (P55)
 * - `idle`:  listening, nothing marked, nothing doing
 */
function writeInbox(name, mode = "counting") {
  const now = new Date().toISOString()
  const doing = {
    counting: { text: "Building P53", at: now },
    working: {
      text: "Responding",
      items: [
        { id: marked, title: "the marked item" },
        { id: "c1", title: "a comment" }
      ],
      at: now
    },
    idle: null
  }[mode]
  const inbox = {
    version: 1,
    marks: mode === "counting" ? { [marked]: { action: "approve", at: now } } : {},
    drafts: {},
    urgency: {},
    sent: null,
    now: [],
    working: {},
    canceled: {},
    listening: { session: "check-send-header", since: now, seen: now, pid: process.pid },
    comments: {},
    woken: null,
    doing,
    reviewAsked: null
  }
  writeFileSync(join(CONTENT, "epics", name, `${name}.inbox.json5`), JSON.stringify(inbox, null, 2))
}
