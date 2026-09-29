/**
 * `yarn test`:  every candidate draws the same 50 icons inside an open shadow root, in light AND dark
 * `color-scheme`, and the glyph pixels must be the page's `currentColor` (a deliberately non-black colour that
 * differs per scheme).
 * - Per icon (screenshot pixels, blended against the page background):  ink present, every pixel on the
 *   background -> foreground line (no stray hue), solid core pixels equal the foreground.
 * - Across candidates:  ink coverage of each icon within `TOLERANCE` of candidate 1's.
 * - Accessibility contract:  unlabelled icons are hidden from the a11y tree, a `label` becomes `img "label"`.
 * Exits non-zero on the first failing group.  Builds `dist/` first if it is missing.
 */
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, type Page } from "playwright"

import { ExperimentBuild } from "./build.ts"
import { CANDIDATES, ICONS } from "./icon-list.ts"
import { TestServer } from "./TestServer.ts"

const HERE = fileURLToPath(new URL("./", import.meta.url))
const DIST = path.join(HERE, "dist")
/** Max relative difference in ink coverage between a candidate and candidate 1. */
const TOLERANCE = 0.15

/** Ink statistics for one icon's region. */
type Ink = { name: string; mean: number; solid: number; maxResidual: number; coreOff: number }

if (!existsSync(path.join(DIST, "build-info.json"))) await new ExperimentBuild().run()

const server = new TestServer(DIST, "h1")
const origin = await server.listen()
const browser = await chromium.launch()
const failures: string[] = []
const coverage: Record<string, Record<string, number>> = {}

/** Screenshot of the page analysed in-page (canvas):  per-icon ink stats against `--bg` / `--fg`. */
async function analyse(page: Page, tag: string): Promise<Ink[]> {
  const png = (await page.screenshot()).toString("base64")
  return page.evaluate(
    async ({ png, tag, names }) => {
      const image = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
      const canvas = new OffscreenCanvas(image.width, image.height)
      const context = canvas.getContext("2d")!
      context.drawImage(image, 0, 0)
      const parse = (css: string) => (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const fg = parse(getComputedStyle(document.body).color)
      const bg = parse(getComputedStyle(document.body).backgroundColor)
      const axis = fg.map((value, index) => value - bg[index]!)
      const axisLength = axis.reduce((sum, value) => sum + value * value, 0)
      const result: Ink[] = []
      const elements = [...document.querySelectorAll(tag)]
      for (const [index, element] of elements.entries()) {
        const box = element.shadowRoot!.querySelector("span.ui.icon")!.getBoundingClientRect()
        const x = Math.floor(box.left) - 2
        const y = Math.floor(box.top) - 2
        const w = Math.ceil(box.width) + 4
        const h = Math.ceil(box.height) + 4
        const { data } = context.getImageData(x, y, w, h)
        let sum = 0
        let solid = 0
        let maxResidual = 0
        let coreOff = 0
        for (let p = 0; p < data.length; p += 4) {
          const pixel = [data[p]!, data[p + 1]!, data[p + 2]!]
          const t = Math.min(1, Math.max(0, pixel.reduce((s, v, i) => s + (v - bg[i]!) * axis[i]!, 0) / axisLength))
          const residual = Math.hypot(...pixel.map((v, i) => v - (bg[i]! + t * axis[i]!)))
          maxResidual = Math.max(maxResidual, residual)
          sum += t
          if (t > 0.95) {
            solid++
            if (Math.hypot(...pixel.map((v, i) => v - fg[i]!)) > 24) coreOff++
          }
        }
        result.push({ name: names[index]!, mean: sum / (data.length / 4), solid, maxResidual, coreOff })
      }
      return result
    },
    { png, tag, names: ICONS.map((icon) => `${icon.variant}/${icon.name}`) }
  )
}

for (const scheme of ["light", "dark"] as const) {
  for (const candidate of CANDIDATES) {
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 900, height: 500 } })
    // NOTE: tsx compiles with esbuild `keepNames`, which wraps named inner functions in a `__name()` helper the page lacks.
    await context.addInitScript("window.__name = (target) => target")
    const page = await context.newPage()
    const problems: string[] = []
    page.on("console", (message) => message.type() === "error" && problems.push(message.text()))
    await page.goto(`${origin}/page.html?variant=${candidate.id}&n=50`)
    await page.waitForFunction(() => (window as never as { __iconPainted?: number[] }).__iconPainted?.length === 50)
    await page.waitForTimeout(150)
    const inks = await analyse(page, candidate.tag)
    coverage[`${scheme}/${candidate.id}`] = Object.fromEntries(inks.map((ink) => [ink.name, ink.mean]))
    for (const ink of inks) {
      if (ink.mean < 0.03) problems.push(`${ink.name}: no ink (mean ${ink.mean.toFixed(3)})`)
      if (ink.maxResidual > 30) problems.push(`${ink.name}: off-colour pixel (residual ${ink.maxResidual.toFixed(0)})`)
      if (ink.solid > 0 && ink.coreOff / ink.solid > 0.02) problems.push(`${ink.name}: core is not the text colour`)
    }
    // Contrast check:  the colour really follows the scheme (light and dark foregrounds differ).
    const color = await page.evaluate(() => getComputedStyle(document.body).color)
    // Accessibility contract.
    await page.evaluate(
      ({ tag }) => {
        const labelled = document.createElement(tag)
        labelled.setAttribute("name", "star")
        labelled.setAttribute("label", "Favourite")
        document.body.append(labelled)
      },
      { tag: candidate.tag }
    )
    await page.waitForTimeout(100)
    // NOTE: read Chromium's real accessibility tree (CDP);  Playwright's `ariaSnapshot()` looks at DOM attributes only
    // and cannot see roles / names set through `ElementInternals`.
    const cdp = await context.newCDPSession(page)
    await cdp.send("Accessibility.enable")
    const { nodes } = (await cdp.send("Accessibility.getFullAXTree")) as {
      nodes: { ignored?: boolean; role?: { value: string }; name?: { value: string } }[]
    }
    const images = nodes.filter((node) => !node.ignored && node.role?.value === "image").map((node) => node.name?.value)
    if (images.length !== 1 || images[0] !== "Favourite") {
      problems.push(`a11y tree: expected exactly one image named "Favourite", got ${JSON.stringify(images)}`)
    }
    console.log(`${problems.length ? "FAIL" : "ok  "} ${scheme.padEnd(5)} ${candidate.label}  (text colour ${color})`)
    for (const problem of problems) console.log(`       ${problem}`)
    failures.push(...problems.map((problem) => `${scheme} ${candidate.id}: ${problem}`))
    await context.close()
  }
}

// Cross-candidate agreement, per scheme.
for (const scheme of ["light", "dark"]) {
  const base = coverage[`${scheme}/today`]!
  for (const candidate of CANDIDATES.slice(1)) {
    const other = coverage[`${scheme}/${candidate.id}`]!
    for (const [name, value] of Object.entries(base)) {
      const difference = Math.abs(other[name]! - value) / Math.max(value, 1e-6)
      if (difference > TOLERANCE)
        failures.push(
          `${scheme} ${candidate.id}: ${name} coverage differs ${(difference * 100).toFixed(0)}% from today`
        )
    }
  }
}

await browser.close()
await server.close()
if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n${failures.join("\n")}`)
  process.exit(1)
}
console.log("\nall candidates render 50 icons correctly in a shadow root, light and dark")
