/**
 * The DESIGNER REVIEW's screenshots (`/designer`, epic `epic-engine` P24):  a page at three widths, light and dark,
 * plus the states asked for, for a reviewer to hold up against `designer/designer.md`.
 * Usage:  node src/tools/designer-shots.js <page | URL> [--out <dir>] [--base <url>] [--full]
 *           [--scroll <px | selector>]... [--hover <selector>]... [--click <selector>]...
 * - `<page>`:  a docs page, as `check-spell.js` takes it (`guides/x.html`, a component set's page), from this
 *   checkout's page server when it needs one (`browserUrlFor()`);  or any URL
 * - shots, into `--out` (default a temp folder), each width in both schemes (`-light`, `-dark`):
 *   - `desk-*` (1440 x 900), `mid-*` (900 x 900:  where bars wrap first), `phone-*` (390 x 844):  the first screen
 *   - `--full`:  the whole page at desk and phone width, cut into slices a reader can see (`desk-light-full-1.png`
 *     ...;  `SLICE` tall)
 *   - each `--scroll`:  desk and phone, scrolled that far down, or to the selector's top (then a little further, so
 *     content passes under the stuck bars):  `desk-dark-scroll-1.png` ...;  stuck headers show only here
 *   - each `--hover` / `--click`:  desk, the pointer over the selector's first shown match, or after clicking it (a
 *     menu, a popup, an open fold):  `desk-light-hover-1.png` ...
 * - prints a JSON summary on stdout (last thing written):  the URL, every shot's path, the page's console errors and
 *   any state it couldn't reach
 * - NEVER Claude-in-Chrome:  headless only (Owen's standing rule)
 */
import { mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { chromium } from "playwright"

import { openPage } from "./browserPage.js"
import { browserUrlFor, pageFile } from "./pages.js"

/** The widths every review looks at:  a laptop's window, a narrow window (where bars wrap first), a phone. */
const VIEWPORTS = {
  desk: { width: 1440, height: 900 },
  mid: { width: 900, height: 900 },
  phone: { width: 390, height: 844 }
}

/** The widths `--full` and `--scroll` shoot:  the two ends. */
const ENDS = ["desk", "phone"]

/** Both colour schemes:  every page has a dark look too. */
const SCHEMES = ["light", "dark"]

/** The tallest slice of a whole-page shot:  a reader can't see detail in a 12,000px image. */
const SLICE = 1800

/** How far past a `--scroll` selector's top to go:  so content is under the stuck bars, where they show through. */
const PAST_SELECTOR = 160

const args = process.argv.slice(2)
const flag = (name) => args.flatMap((arg, at) => (arg === name && args[at + 1] ? [args[at + 1]] : []))
const target = args.find((arg, at) => !arg.startsWith("--") && !args[at - 1]?.startsWith("--"))
if (!target) {
  console.error(
    "usage:  node src/tools/designer-shots.js <page | URL> [--out <dir>] [--base <url>] [--full] " +
      "[--scroll <px | selector>]... [--hover <selector>]... [--click <selector>]..."
  )
  process.exit(2)
}
const out = flag("--out")[0] ?? mkdtempSync(join(tmpdir(), "designer-"))
mkdirSync(out, { recursive: true })
const states = [
  ...flag("--hover").map((selector) => ({ how: "hover", selector })),
  ...flag("--click").map((selector) => ({ how: "click", selector }))
]
const scrolls = flag("--scroll")

let url
try {
  url = /^(https?|file):/.test(target) ? target : browserUrlFor(pageFile(target), { base: flag("--base")[0] })
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const problems = []
const shots = []
const browser = await chromium.launch()
try {
  for (const [name, viewport] of Object.entries(VIEWPORTS))
    for (const colorScheme of SCHEMES) {
      const page = await openPage(browser, url, { viewport, colorScheme, onProblem: (text) => problems.push(text) })
      const stem = `${name}-${colorScheme}`
      await shoot(page, stem)
      if (ENDS.includes(name)) {
        if (args.includes("--full")) await shootWhole(page, `${stem}-full`)
        for (const [at, to] of scrolls.entries()) await shootScrolled(page, `${stem}-scroll-${at + 1}`, to)
      }
      if (name === "desk")
        for (const [at, { how, selector }] of states.entries())
          await shootState(page, `${stem}-${how}-${at + 1}`, how, selector)
      await page.close()
    }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  await browser.close()
}
console.log(JSON.stringify({ url, out, shots, problems: [...new Set(problems)] }, null, 2))

/** Screenshot `page` as `<stem>.png` in `out`, and list it. */
async function shoot(page, stem, options = {}) {
  const path = join(out, `${stem}.png`)
  await page.screenshot({ path, ...options })
  shots.push(path)
}

/** The whole page, in slices `SLICE` tall:  `<stem>-1.png` ... */
async function shootWhole(page, stem) {
  const { width, height } = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight
  }))
  for (let top = 0, at = 1; top < height; top += SLICE, at++)
    await shoot(page, `${stem}-${at}`, {
      fullPage: true,
      clip: { x: 0, y: top, width, height: Math.min(SLICE, height - top) }
    })
}

/**
 * The window scrolled to `to`:  a number of px, else a selector's top plus `PAST_SELECTOR`;  then back to the top.
 * - a selector that matches nothing:  a problem, no shot
 */
async function shootScrolled(page, stem, to) {
  const reached = await page.evaluate(
    ({ to, past }) => {
      if (/^\d+$/.test(to)) return scrollTo(0, Number(to)) ?? true
      const element = document.querySelector(to)
      if (!element) return false
      scrollTo(0, element.getBoundingClientRect().top + scrollY + past)
      return true
    },
    { to, past: PAST_SELECTOR }
  )
  if (!reached) {
    problems.push(`--scroll ${to}:  nothing on the page matches it`)
    return
  }
  await page.waitForTimeout(600)
  await shoot(page, stem)
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(300)
}

/**
 * Screenshot `page` with the pointer over `selector`'s first SHOWN match (`hover`), or after clicking it (`click`);
 * then reload, so the next state starts clean.
 * - a selector that matches nothing shown, or a pointer that can't reach it in 5s:  a problem, no shot
 */
async function shootState(page, stem, how, selector) {
  const element = page.locator(selector).filter({ visible: true }).first()
  if (!(await element.count())) {
    problems.push(`${selector}:  nothing shown on the page matches it`)
    return
  }
  try {
    await element.scrollIntoViewIfNeeded({ timeout: 5000 })
    await (how === "hover" ? element.hover({ timeout: 5000 }) : element.click({ timeout: 5000 }))
  } catch (error) {
    problems.push(`${selector}:  couldn't ${how} it (${error.message.split("\n")[0]})`)
    return
  }
  await page.waitForTimeout(400)
  await shoot(page, stem)
  await page.mouse.move(0, 0)
  await page.reload()
  await page.waitForTimeout(1000)
}
