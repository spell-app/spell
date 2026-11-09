import { chromium, webkit, type Browser, type Page } from "playwright"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector's outline round what's selected (epic `editor`):  its marching ants, measured on screen.
 * - The ants' 2px line is 4 to 6px outside the part (`Inspector.css`, epic `notebook` P9):  its middle, 5px out, is what's read.
 * - EVEN:  the same 2px line on all four sides, at a fractional place and size, at 1, 1.5 and 2 device pixels a
 *   pixel, in Chromium and WebKit (Owen, 2026-11-06:  "right and bottom read 1px")
 *   - WebKit's showed it:  at 1.5, the old SVG line was 1.68px on the right, 1.99px at the bottom
 * - INVERTING:  a dash over white is dark, a dash over near-black is light
 *   (Owen, 2026-11-07:  "The ants are not actually inverting")
 * - TURNED:  under a rotated ancestor, the outline turns with the part
 *   (Owen:  "selection doesn't rotate with the thing underneath it").
 * - Both kinds of part:  one in the page's document, and one in a shadow root.
 * - The parts are plain `<div>`s added to PokéSpell's page, on a white backdrop, so nothing else on the page is dark;
 *   the inverting check's backdrop is white on the left, near-black on the right.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The browsers it's checked in. */
const ENGINES = { chromium, webkit }
type Engine = keyof typeof ENGINES

/** Where the part is:  in the page's document, or in a shadow root. */
type Kind = "plain" | "shadow"

/** The page's globals these tests reach. */
type TestWindow = Window & { Inspector: { select(element: Element): void }; probe: HTMLElement }

/**
 * Add a part to the page and select it:  `probe`, on a backdrop.
 * - `turn`:  its parent's `rotate`, in degrees:  the part itself is upright in its parent.
 * - `split`:  the backdrop's right half near-black, from the middle of the part on;  else all white.
 */
async function selectProbe(page: Page, kind: Kind, { turn = 0, split = false } = {}): Promise<void> {
  await page.evaluate(
    ({ kind, turn, split }) => {
      document.querySelector("#probe-backdrop")?.remove()
      const backdrop = document.createElement("div")
      backdrop.id = "probe-backdrop"
      const background = split ? `linear-gradient(to right, white 354px, #111 354px)` : "white"
      Object.assign(backdrop.style, { position: "fixed", inset: "0", background, zIndex: "2147481000" })
      const parent = document.createElement("div")
      Object.assign(parent.style, { position: "absolute", left: "200.37px", top: "150.62px", rotate: `${turn}deg` })
      const part = document.createElement("div")
      Object.assign(part.style, { width: "307.75px", height: "120.4px" })
      if (kind === "plain") parent.append(part)
      else parent.attachShadow({ mode: "open" }).append(part)
      backdrop.append(parent)
      document.body.append(backdrop)
      const page = window as unknown as TestWindow
      page.probe = part
      page.Inspector.select(part)
    },
    { kind, turn, split }
  )
  await page.waitForTimeout(400)
}

/**
 * The darkness of the screen, measured along the line 2px outside the probe, the middle of the outline:
 * - `ink`:  each side's line, how thick, in CSS px (the median across the dashes)
 * - `turn`:  the probe's parent's rotation, in degrees
 * - `onTurned` / `onUpright`:  of the points along the top side, how many are dark,
 *   placed with the probe's turn, and placed upright, on its bounding box
 */
async function measure(
  page: Page,
  { dpr, turn = 0 }: { dpr: number; turn?: number }
): Promise<{ ink: number[]; onTurned: number; onUpright: number }> {
  const geometry = await page.evaluate((turn) => {
    const box = (window as unknown as TestWindow).probe.getBoundingClientRect()
    const angle = (turn * Math.PI) / 180
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, angle, width: 307.75, height: 120.4 }
  }, turn)
  const shot = (await page.screenshot()).toString("base64")
  return page.evaluate(
    async ({ shot, geometry: g, dpr }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
      /** Brightness at device pixel (x, y), 0 to 1. */
      const light = (x: number, y: number) => {
        const at = (Math.round(y) * canvas.width + Math.round(x)) * 4
        return (0.3 * pixels[at]! + 0.59 * pixels[at + 1]! + 0.11 * pixels[at + 2]!) / 255
      }

      //////
      // Each side, upright:  the ink across the line, in device pixels, at each column inside a dash
      const sides = [
        { along: [g.left, g.right], at: g.top, outward: [0, -1] },
        { along: [g.top, g.bottom], at: g.right, outward: [1, 0] },
        { along: [g.left, g.right], at: g.bottom, outward: [0, 1] },
        { along: [g.top, g.bottom], at: g.left, outward: [-1, 0] }
      ]
      const ink = sides.map(({ along, at, outward }) => {
        const inks: number[] = []
        for (let step = (along[0]! + 12) * dpr; step < (along[1]! - 12) * dpr; step++) {
          const across: number[] = []
          for (let depth = -3 * dpr; depth <= 6 * dpr; depth++) {
            const edge = at * dpr + depth * (outward[0]! + outward[1]!)
            across.push(outward[0] ? light(edge, step) : light(step, edge))
          }
          if (Math.min(...across) > 0.2) continue
          inks.push(across.reduce((sum, each) => sum + (1 - each), 0) / dpr)
        }
        inks.sort((a, b) => a - b)
        return inks[Math.floor(inks.length / 2)] ?? 0
      })

      //////
      // The top side, turned and upright:  how many of its points are dark
      const [cos, sin] = [Math.cos(g.angle), Math.sin(g.angle)]
      const [centreX, centreY] = [(g.left + g.right) / 2, (g.top + g.bottom) / 2]
      const turnedPoints: [number, number][] = []
      const uprightPoints: [number, number][] = []
      for (let x = 12; x < g.width - 12; x++) {
        const [dx, dy] = [x - g.width / 2, -g.height / 2 - 5]
        turnedPoints.push([centreX + cos * dx - sin * dy, centreY + sin * dx + cos * dy])
        uprightPoints.push([g.left + (x / g.width) * (g.right - g.left), g.top - 5])
      }
      const darkShare = (points: [number, number][]) =>
        points.filter(([x, y]) => light(x * dpr, y * dpr) < 0.3).length / points.length
      return { ink, onTurned: darkShare(turnedPoints), onUpright: darkShare(uprightPoints) }
    },
    { shot, geometry, dpr }
  )
}

/**
 * The brightness of the outline's middle, 5px above the probe's top side, at each CSS px along it:
 * left of the backdrop's split, and right of it.
 */
async function topLine(page: Page, dpr: number): Promise<{ overWhite: number[]; overDark: number[] }> {
  const box = await page.evaluate(() => {
    const { left, right, top } = (window as unknown as TestWindow).probe.getBoundingClientRect()
    return { left, right, top }
  })
  const shot = (await page.screenshot()).toString("base64")
  return page.evaluate(
    async ({ shot, box, dpr }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${shot}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      context.drawImage(image, 0, 0)
      const y = Math.floor((box.top - 5) * dpr)
      const overWhite: number[] = []
      const overDark: number[] = []
      for (let x = Math.ceil(box.left + 12); x < box.right - 12; x++) {
        if (Math.abs(x - 354) < 4) continue
        const [red, green, blue] = context.getImageData(Math.floor(x * dpr), y, 1, 1).data
        ;(x < 354 ? overWhite : overDark).push((0.3 * red! + 0.59 * green! + 0.11 * blue!) / 255)
      }
      return { overWhite, overDark }
    },
    { shot, box, dpr }
  )
}

describe.skipIf(!SERVING)("the selection's outline", { timeout: 240_000 }, () => {
  const browsers: Partial<Record<Engine, Browser>> = {}

  /** PokéSpell in `engine`, at `dpr` device pixels a pixel, its motion stopped so the ants stand still. */
  async function open(dpr: number, engine: Engine = "chromium"): Promise<Page> {
    browsers[engine] ??= await ENGINES[engine].launch()
    const context = await browsers[engine].newContext({
      viewport: { width: 900, height: 600 },
      deviceScaleFactor: dpr,
      reducedMotion: "reduce"
    })
    const page = await context.newPage()
    await page.goto(`${EDITOR}run/@spell/examples/PokeSpell`, { timeout: 60_000 })
    // the app drawn, and settled:  the Inspector puts back what was selected as it starts, which would undo ours
    await page.waitForFunction(() => (window as unknown as Partial<TestWindow>).Inspector, null, { timeout: 60_000 })
    await page.waitForSelector(".AppPaneBody poke-spell-app img", { timeout: 60_000 })
    await page.waitForTimeout(1500)
    return page
  }

  afterAll(async () => {
    await Promise.all(Object.values(browsers).map((browser) => browser.close()))
  })

  for (const engine of Object.keys(ENGINES) as Engine[]) {
    for (const dpr of [1, 1.5, 2]) {
      for (const kind of ["plain", "shadow"] as const) {
        test(`${engine}:  a ${kind} part's line is 2px on EVERY side, at a fractional place, ${dpr} device pixels a pixel`, async () => {
          const page = await open(dpr, engine)
          await selectProbe(page, kind)
          const boxes = await page.evaluate(() => document.querySelectorAll(".InspectorSelected:not([hidden])").length)
          expect(boxes).toBe(1)
          const { ink } = await measure(page, { dpr })
          for (const side of ink) expect(Math.abs(side - 2)).toBeLessThan(0.15)
          await page.context().close()
        })
      }
    }

    test(`${engine}:  the ants INVERT what's under them:  dark over white, light over near-black`, async () => {
      const page = await open(2, engine)
      await selectProbe(page, "plain", { split: true })
      const { overWhite, overDark } = await topLine(page, 2)
      // dashes 10px of every 16:  over white, a dash is black and a gap white;  over near-black, the other way round
      const share = (values: number[], test: (value: number) => boolean) => values.filter(test).length / values.length
      expect(share(overWhite, (value) => value < 0.2)).toBeGreaterThan(0.4)
      expect(share(overDark, (value) => value > 0.8)).toBeGreaterThan(0.4)
      // ... and nothing in between:  each point is the backdrop, or its opposite
      expect(share([...overWhite, ...overDark], (value) => value > 0.2 && value < 0.8)).toBeLessThan(0.1)
      await page.context().close()
    })
  }

  for (const kind of ["plain", "shadow"] as const) {
    test(`a ${kind} part's outline, under a rotated ancestor, TURNS with it`, async () => {
      const page = await open(2)
      await selectProbe(page, kind, { turn: 20 })
      const { onTurned, onUpright } = await measure(page, { dpr: 2, turn: 20 })
      // dashes 10px of every 16:  most of the turned line is dark, almost none of the upright one
      expect(onTurned).toBeGreaterThan(0.4)
      expect(onUpright).toBeLessThan(0.1)
      await page.context().close()
    })
  }
})
