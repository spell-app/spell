import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { chromium, webkit, type Browser, type Page } from "playwright"
import { afterAll, describe, expect, test } from "vite-plus/test"

/**
 * The Inspector's outline round what's selected (epic `editor`):  its marching ants, measured on screen.
 * - EVEN:  the same 2px line on all four sides, at a fractional place and size, at 1.5 and 2 device pixels a pixel,
 *   in Chromium and WebKit (Owen, 2026-11-06:  "right and bottom read 1px")
 *   - WebKit's showed it:  at 1.5, the old SVG line was 1.68px on the right, 1.99px at the bottom
 * - TURNED:  under a rotated ancestor, the outline turns with the part
 *   (Owen:  "selection doesn't rotate with the thing underneath it").
 * - Both kinds:  a RING, the part's own `::after`, and a BOX over a part that can't ring itself (in a shadow root).
 * - The parts are plain `<div>`s added to PokéSpell's page, on a white backdrop, so nothing else on the page is dark.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does it answer? */
async function isServing(address: string | undefined): Promise<boolean> {
  if (!address) return false
  try {
    return (await fetch(address)).ok
  } catch (ignored) {
    return false
  }
}

const EDITOR = editorAddress()
const SERVING = await isServing(EDITOR)

/** The browsers it's checked in. */
const ENGINES = { chromium, webkit }
type Engine = keyof typeof ENGINES

/** Which kind of outline a part gets:  its own `::after`, or a box over it (a part in a shadow root). */
type Kind = "ring" | "box"

/** The page's globals these tests reach. */
type TestWindow = Window & { Inspector: { select(element: Element): void }; probe: HTMLElement }

/**
 * Add a part to the page and select it:  `probe`, on a white backdrop.
 * - `turn`:  its parent's `rotate`, in degrees:  the part itself is upright in its parent.
 */
async function selectProbe(page: Page, kind: Kind, turn = 0): Promise<void> {
  await page.evaluate(
    ({ kind, turn }) => {
      document.querySelector("#probe-backdrop")?.remove()
      const backdrop = document.createElement("div")
      backdrop.id = "probe-backdrop"
      Object.assign(backdrop.style, { position: "fixed", inset: "0", background: "white", zIndex: "2147481000" })
      const parent = document.createElement("div")
      Object.assign(parent.style, { position: "absolute", left: "200.37px", top: "150.62px", rotate: `${turn}deg` })
      const part = document.createElement("div")
      Object.assign(part.style, { width: "307.75px", height: "120.4px", background: "white" })
      if (kind === "ring") parent.append(part)
      else parent.attachShadow({ mode: "open" }).append(part)
      backdrop.append(parent)
      document.body.append(backdrop)
      const page = window as unknown as TestWindow
      page.probe = part
      page.Inspector.select(part)
    },
    { kind, turn }
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
        const [dx, dy] = [x - g.width / 2, -g.height / 2 - 2]
        turnedPoints.push([centreX + cos * dx - sin * dy, centreY + sin * dx + cos * dy])
        uprightPoints.push([g.left + (x / g.width) * (g.right - g.left), g.top - 2])
      }
      const darkShare = (points: [number, number][]) =>
        points.filter(([x, y]) => light(x * dpr, y * dpr) < 0.3).length / points.length
      return { ink, onTurned: darkShare(turnedPoints), onUpright: darkShare(uprightPoints) }
    },
    { shot, geometry, dpr }
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
    await page.waitForSelector(".pokemon", { timeout: 60_000 })
    await page.waitForTimeout(1500)
    return page
  }

  afterAll(async () => {
    await Promise.all(Object.values(browsers).map((browser) => browser.close()))
  })

  for (const engine of Object.keys(ENGINES) as Engine[]) {
    for (const dpr of [1.5, 2]) {
      for (const kind of ["ring", "box"] as const) {
        test(`${engine}:  a ${kind}'s line is 2px on EVERY side, at a fractional place, ${dpr} device pixels a pixel`, async () => {
          const page = await open(dpr, engine)
          await selectProbe(page, kind)
          const hasRing = await page.evaluate(() =>
            (window as unknown as TestWindow).probe.hasAttribute("data-inspect-selected")
          )
          expect(hasRing).toBe(kind === "ring")
          const { ink } = await measure(page, { dpr })
          for (const side of ink) expect(Math.abs(side - 2)).toBeLessThan(0.15)
          await page.context().close()
        })
      }
    }
  }

  for (const kind of ["ring", "box"] as const) {
    test(`a ${kind} under a rotated ancestor TURNS with it`, async () => {
      const page = await open(2)
      await selectProbe(page, kind, 20)
      const { onTurned, onUpright } = await measure(page, { dpr: 2, turn: 20 })
      // dashes 10px of every 16:  most of the turned line is dark, almost none of the upright one
      expect(onTurned).toBeGreaterThan(0.4)
      expect(onUpright).toBeLessThan(0.1)
      await page.context().close()
    })
  }
})
