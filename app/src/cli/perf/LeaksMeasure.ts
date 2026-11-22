import type { Page } from "playwright"

import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * Leak loops:  an interaction repeated, the heap (after a forced garbage collection), DOM nodes and listeners compared
 * before and after.
 * - A warm-up round first (a first open fills caches), then the baseline, then the loop.
 * - Growth per cycle:  (after - before) / cycles.
 * - The editor:  switch files 20x, fold an Inspector card 30x, open the View menu 30x, type 200 characters.
 * - The docs page (the kitchen sink):  open a dropdown 50x, a modal 50x.
 * - The epic page:  open and fold items 30x.
 * - Run mode has none.
 */
export class LeaksMeasure {
  /** Each loop of `page` under `profile`;  a loop that fails says why, and the rest go on. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<LeaksResult> {
    const browser = await PerfBrowser.open(page, profile, servers)
    const results: LeakLoopResult[] = []
    try {
      await browser.load({ quietMs: 2000 })
      for (const loop of LOOPS[page] ?? []) {
        try {
          await loop.setup?.(browser.page)
          for (let index = 0; index < Math.min(3, loop.cycles); index++) await loop.cycle(browser.page, index)
          await browser.page.waitForTimeout(500)
          const before = await browser.metricsAfterGC()
          const started = Date.now()
          for (let index = 0; index < loop.cycles; index++) await loop.cycle(browser.page, index)
          const elapsed = Date.now() - started
          await browser.page.waitForTimeout(1000)
          const after = await browser.metricsAfterGC()
          const perCycle = (key: keyof typeof after) => +((after[key] - before[key]) / loop.cycles).toFixed(1)
          results.push({
            name: loop.name,
            cycles: loop.cycles,
            elapsed,
            heapBefore: before.JSHeapUsedSize,
            heapAfter: after.JSHeapUsedSize,
            heapPerCycle: Math.round(perCycle("JSHeapUsedSize")),
            nodesPerCycle: perCycle("Nodes"),
            listenersPerCycle: perCycle("JSEventListeners")
          })
        } catch (error) {
          results.push({ name: loop.name, cycles: loop.cycles, error: String(error).slice(0, 300) })
        }
      }
    } finally {
      await browser.close()
    }
    return { page, profile, results, errors: browser.errors.slice(0, 10) }
  }
}

/** The editor's file tabs, switched through in turn. */
const SOLITAIRE_FILES = ["Pile.spell", "Deck.spell", "Solitaire.spell", "Card.spell"]

/** A comment typed into, a character a cycle. */
const TYPED = " the quick brown fox jumps over the lazy dog"

/** Each page's loops. */
const LOOPS: Partial<Record<PerfPageName, LeakLoop[]>> = {
  editor: [
    {
      name: "switch files",
      cycles: 20,
      async cycle(page, index) {
        const name = SOLITAIRE_FILES[index % SOLITAIRE_FILES.length]!
        await page.getByText(name, { exact: true }).filter({ visible: true }).first().click({ force: true })
        await page.waitForTimeout(400)
      }
    },
    {
      name: "fold / unfold the Inspector's Code card",
      cycles: 30,
      async cycle(page) {
        const header = page.locator(".InspectorCard").getByText("Code", { exact: true }).first()
        await header.click()
        await page.waitForTimeout(150)
        await header.click()
        await page.waitForTimeout(150)
      }
    },
    {
      name: "open / close the View menu",
      cycles: 30,
      async cycle(page) {
        await page.locator(".EditorBar").getByText("View", { exact: true }).first().click()
        await page.waitForTimeout(150)
        await page.keyboard.press("Escape")
        await page.waitForTimeout(150)
      }
    },
    {
      name: "type 200 characters into a comment",
      cycles: 200,
      async setup(page) {
        await page.getByText("Card.spell", { exact: true }).filter({ visible: true }).first().click({ force: true })
        await page.waitForTimeout(800)
        await page.evaluate(focusLineTwo)
      },
      async cycle(page, index) {
        await page.keyboard.type(TYPED[index % TYPED.length]!)
        await page.waitForTimeout(60)
      }
    }
  ],
  docs: [
    {
      name: "open / close a dropdown (open attribute)",
      cycles: 50,
      async cycle(page) {
        await page.evaluate(async () => {
          const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
          const dropdown = document.querySelectorAll("ui-dropdown")[1]!
          dropdown.setAttribute("open", "")
          await wait(80)
          dropdown.removeAttribute("open")
          await wait(80)
        })
      }
    },
    {
      name: "open / close a modal (open attribute)",
      cycles: 50,
      async cycle(page) {
        await page.evaluate(async () => {
          const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
          const modal = document.querySelector("ui-modal")!
          modal.setAttribute("open", "")
          await wait(120)
          modal.removeAttribute("open")
          await wait(120)
        })
      }
    }
  ],
  epic: [
    {
      name: "open / fold items (open attribute), 10 items in turn",
      cycles: 30,
      async cycle(page, index) {
        await page.evaluate(async (at) => {
          const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
          const items = document.querySelectorAll("epic-item")
          const item = items[(at * 7) % Math.max(1, Math.min(70, items.length))]!
          item.setAttribute("open", "")
          await wait(200)
          item.removeAttribute("open")
          await wait(100)
        }, index)
      }
    }
  ]
}

/**
 * In the editor's page:  the caret at the end of the shown file's line 2 (a comment), the code pane focused.
 * - MUST stay self-contained:  Playwright sends its source
 */
export function focusLineTwo(): void {
  const { view } = (window as unknown as EditorWindow).editor.shownCodeEditor
  const line = view.state.doc.line(2)
  view.dispatch({ selection: { anchor: line.to }, scrollIntoView: true })
  view.focus()
}

/** What a page function reads of the editor's page:  its code pane's view (CodeMirror's). */
export type EditorWindow = Window & {
  editor: {
    shownCodeEditor: {
      view: {
        state: { doc: { line(number: number): { to: number; text: string } } }
        dispatch(spec: { selection: { anchor: number }; scrollIntoView?: boolean }): void
        focus(): void
      }
    }
  }
}

/** One leak loop:  `cycles` of `cycle()`, after `setup()`. */
type LeakLoop = {
  name: string
  cycles: number
  setup?: (page: Page) => Promise<void>
  cycle: (page: Page, index: number) => Promise<void>
}

/** One loop's growth, or why it failed. */
export type LeakLoopResult = {
  name: string
  cycles: number
  elapsed?: number
  heapBefore?: number
  heapAfter?: number
  heapPerCycle?: number
  nodesPerCycle?: number
  listenersPerCycle?: number
  error?: string
}

/** A page's leak loops. */
export type LeaksResult = { page: PerfPageName; profile: PerfProfileName; results: LeakLoopResult[]; errors: string[] }
