import { chromium, type Browser, type BrowserContext, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * A value kept in a data place, in the side bar (epic `editor`, Data In Side Bar):  Recipe Box, whose recipes are kept
 * in a database on this device.
 * - Writable:  the field names its place, marks it as the real data, and links to the line that declares it;
 *   a change is held as it's typed, and sent on Enter as one undo step, with the file left clean.
 * - Read only:  the field can't be changed, and says why.
 * - Worked out from the recipes:  read only, naming the place it read.
 * - A sample:  the app pane's header says so, and a change to it never reaches the real data.
 * - NOTHING reaches the disk:  the file routes are answered here.  Nothing reaches another server:  any request off
 *   this machine is refused, and counted.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The place Recipe Box keeps its recipes in, as the program names it. */
const PLACE = "family_cookbook"

/** What the test calls of the page's `Inspector`. */
type InspectorOnPage = {
  openQuietly(): void
  select(element: Element | undefined): void
  inspect(step: string): void
}

/** What the page answers about the side bar and the program, for a check. */
type Seen = {
  origins: Record<string, { kind: string; mark?: string; from?: string; readonly?: boolean }>
  source?: string
  sourceKind?: string
  title: unknown
  dirty: boolean[]
  steps: number
  sampleBar?: string
}

describe.skipIf(!SERVING)("data in the side bar", { timeout: 240_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page
  /** Writes the editor asked of the disk, and requests that left this machine. */
  const fileWrites: string[] = []
  const offMachine: string[] = []

  /** What the side bar and the program show now. */
  function seen(): Promise<Seen> {
    return page.evaluate(() => {
      const w = window as unknown as {
        Inspector: { inspected?: { value: { title?: unknown } } }
        editor: { project: { spellFiles: { isDirty: boolean }[] }; history: { steps: unknown[] } }
      }
      const form = document.querySelector("ui-property-editor") as unknown as { currentOrigins?: Seen["origins"] }
      const source = document.querySelector(".InspectorDataSource")
      return {
        origins: form?.currentOrigins ?? {},
        source: source?.querySelector(".InspectorDataSourceWords")?.textContent ?? undefined,
        sourceKind: source?.className,
        title: w.Inspector.inspected?.value.title,
        dirty: w.editor.project.spellFiles.map((file) => file.isDirty),
        steps: w.editor.history.steps.length,
        sampleBar: document.querySelector(".SampleBar")?.textContent ?? undefined
      }
    })
  }

  /** The Inspector's field `name`'s text box. */
  const fieldInput = (name: string) => page.locator(`ui-property-editor ui-property[name="${name}"] input`).first()

  /** Inspect the first recipe the app shows:  the app, then its Matches, then the first. */
  async function inspectFirstRecipe(): Promise<void> {
    await selectApp()
    // each step once the last has drawn, as a click on its link would
    for (const step of ["matches", "#0"]) {
      await page.evaluate((step) => (window as unknown as { Inspector: InspectorOnPage }).Inspector.inspect(step), step)
      await page.waitForTimeout(400)
    }
    await page.waitForSelector(".InspectorDataSource", { timeout: 15_000 })
  }

  /** Select the app itself, afresh, with the Inspector open. */
  async function selectApp(): Promise<void> {
    await page.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: InspectorOnPage }
      Inspector.openQuietly()
      Inspector.select(undefined)
    })
    await page.waitForTimeout(400)
    await page.evaluate(() => {
      const { Inspector } = window as unknown as { Inspector: InspectorOnPage }
      Inspector.select(document.querySelector(".AppPaneBody recipe-box-app")!)
    })
    await page.waitForTimeout(400)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1280, height: 760 } })
    await context.route(/\/api\/projects\/file\//, (route) => {
      // the source files:  what the editor builds from them goes beside them, never into them
      const url = route.request().url()
      if (route.request().method() !== "GET" && /\.spell(ml)?$/.test(url)) fileWrites.push(url)
      return route.fulfill({ status: 200, body: "{}" })
    })
    // only this machine:  a write to anywhere else would be real data somewhere
    await context.route(
      (url) => !/^(localhost|127\.0\.0\.1)$/.test(url.hostname) && url.protocol.startsWith("http"),
      (route) => {
        offMachine.push(`${route.request().method()} ${route.request().url()}`)
        return route.abort()
      }
    )
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/RecipeBox`, { timeout: 60_000 })
    await page.waitForSelector(".AppPaneBody recipe-box-app ui-card", { timeout: 60_000 })
    await page.waitForTimeout(3000)
    await inspectFirstRecipe()
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a writable field names its place, marks it as the real data, and links to the line that declares it", async () => {
    const { origins, source, sourceKind } = await seen()
    expect(origins.title).toMatchObject({ kind: "data", mark: "Real data · family cookbook", action: "show code" })
    expect(origins.title!.readonly).toBeUndefined()
    expect(origins.title!.from).toContain("family cookbook, among its recipes")
    expect(sourceKind).toContain("real")
    expect(source).toContain("Real data, kept in family cookbook")
    // its mark is the link:  the line that declares the field, selected in the code
    await page.locator('ui-property-editor ui-property[name="title"] button.origin.mark').first().click()
    await expect
      .poll(() =>
        page.evaluate(() => {
          const code = (
            window as unknown as {
              editor: {
                getInputEditor(): { getModel(): { getValueInRange(range: unknown): string }; getSelection(): unknown }
              }
            }
          ).editor.getInputEditor()
          return code?.getModel().getValueInRange(code.getSelection())
        })
      )
      .toContain('its "title" is text')
  })

  test("a worked-out value is read only, and names the places it read", async () => {
    await selectApp()
    // the box's Matches:  every recipe whose title holds the search, worked out from the recipes
    const mark = page.locator(".InspectorThingLink .InspectorDataMark").first()
    await expect.poll(() => mark.textContent()).toBe("From family cookbook")
    expect(await mark.getAttribute("title")).toBe(
      "Worked out from what it reads in family cookbook:  change those instead."
    )
    await inspectFirstRecipe()
  })

  test("a change is held as it's typed, sent on Enter as ONE undo step, and the file stays clean", async () => {
    const before = await seen()
    const was = String(before.title)
    await fieldInput("title").click()
    await page.keyboard.press("Meta+a")
    await page.keyboard.type("Stew")
    await expect.poll(async () => (await seen()).title).toBe("Stew")
    // shown at once, and nothing recorded yet:  the step is made when it's committed
    expect((await seen()).steps).toBe(before.steps)
    await page.keyboard.press("Enter")
    await expect.poll(async () => (await seen()).steps).toBe(before.steps + 1)
    const after = await seen()
    expect(after.dirty.every((dirty) => !dirty)).toBe(true)
    expect(fileWrites).toEqual([])
    const sent = await page.evaluate(async (placeName) => {
      const { editor } = window as unknown as {
        editor: {
          loadRuntime(): Promise<{
            core: {
              _placesNow(): { places: { pendingFor(name: string): { settled: Promise<boolean>; hasPending: boolean } } }
            }
          }>
          history: { undoTitle: string }
        }
      }
      const pending = (await editor.loadRuntime()).core._placesNow().places.pendingFor(placeName)
      await pending.settled
      return { hasPending: pending.hasPending, undoTitle: editor.history.undoTitle }
    }, PLACE)
    expect(sent).toEqual({ hasPending: false, undoTitle: "Undo Change Title" })
    // one undo takes it back, in the place too
    await page.evaluate(() => (window as unknown as { editor: { history: { undo(): void } } }).editor.history.undo())
    await expect.poll(async () => (await seen()).title).toBe(was)
    expect((await seen()).dirty.every((dirty) => !dirty)).toBe(true)
  })

  test("a field the place won't let change is read only, and says why", async () => {
    const { origins } = await seen()
    expect(origins.id).toMatchObject({ kind: "data", readonly: true, mark: "Read only · family cookbook" })
    expect(origins.id!.from).toBe("Read only:  family cookbook doesn't let this field change.")
  })

  test("a place that takes no changes:  every field read only, and the side bar says so", async () => {
    // stands in for a place declared read only, a sheet:  no built-in example declares one
    await page.evaluate(async (placeName) => {
      const { editor } = window as unknown as {
        editor: {
          loadRuntime(): Promise<{
            core: {
              _placesNow(): {
                places: {
                  placeFor(name: string): { describe(): object }
                  swap(name: string, place: object): object
                }
              }
            }
          }>
        }
      }
      const { places } = (await editor.loadRuntime()).core._placesNow()
      const real = places.placeFor(placeName)
      const readOnly = Object.create(real) as { describe(): object }
      readOnly.describe = () => ({ ...real.describe(), write: "none" })
      ;(window as unknown as { realPlace: object }).realPlace = places.swap(placeName, readOnly)
    }, PLACE)
    // asked again as the part is
    await inspectFirstRecipe()
    const { origins, source, sourceKind } = await seen()
    expect(origins.title).toMatchObject({ kind: "data", readonly: true, mark: "Read only · family cookbook" })
    expect(origins.title!.from).toBe("Read only:  family cookbook takes no changes.")
    expect(sourceKind).toContain("read-only")
    expect(source).toContain("takes no changes here")
    expect(await fieldInput("title").getAttribute("readonly")).not.toBeNull()
    await page.evaluate(async (placeName) => {
      const w = window as unknown as {
        realPlace: object
        editor: {
          loadRuntime(): Promise<{ core: { _placesNow(): { places: { swap(name: string, place: object): object } } } }>
        }
      }
      ;(await w.editor.loadRuntime()).core._placesNow().places.swap(placeName, w.realPlace)
    }, PLACE)
    await inspectFirstRecipe()
  })

  test("a sample:  the app's header says so, and its changes never reach the real data", async () => {
    const real = await realTitles()
    await page.locator(".InspectorSampleSwitch").click()
    await expect
      .poll(async () => (await seen()).sampleBar ?? "", { timeout: 10_000 })
      .toContain("sample data for family cookbook")
    await inspectFirstRecipe()
    const withSample = await seen()
    expect(withSample.origins.title).toMatchObject({ kind: "data", mark: "Sample · family cookbook" })
    expect(withSample.sourceKind).toContain("sample")
    await fieldInput("title").click()
    await page.keyboard.press("Meta+a")
    await page.keyboard.type("Sample soup")
    await page.keyboard.press("Enter")
    await expect.poll(async () => (await seen()).title).toBe("Sample soup")
    // the real place back:  its records as they were, the sample's change never in them
    await page.locator(".SampleBar ui-button.SampleBarRealData").click()
    await expect.poll(async () => (await seen()).sampleBar, { timeout: 10_000 }).toBeUndefined()
    expect(await realTitles()).toEqual(real)
    expect(real).not.toContain("Sample soup")
    await inspectFirstRecipe()
    expect((await seen()).origins.title).toMatchObject({ kind: "data", mark: "Real data · family cookbook" })
    expect((await seen()).dirty.every((dirty) => !dirty)).toBe(true)
  })

  /** The recipes' titles, as the place behind Recipe Box's line holds them now. */
  function realTitles(): Promise<string[]> {
    return page.evaluate(async (placeName) => {
      const { editor } = window as unknown as {
        editor: {
          loadRuntime(): Promise<{
            core: {
              _placesNow(): {
                places: {
                  placeFor(name: string): {
                    list(collection: string, query: object, context: object): Promise<{ rows: { title: string }[] }>
                  }
                }
              }
            }
          }>
        }
      }
      const place = (await editor.loadRuntime()).core._placesNow().places.placeFor(placeName)
      return (await place.list("recipes", {}, {})).rows.map((row) => row.title).sort()
    }, PLACE)
  }

  test("nothing reached the disk, or any server off this machine", () => {
    expect(fileWrites).toEqual([])
    expect(offMachine.filter((request) => !request.startsWith("GET "))).toEqual([])
  })
})
