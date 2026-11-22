import { tmpdir } from "node:os"
import { join } from "node:path"

import type { Page } from "playwright"

import { HeapGrowth, type HeapGrowthRow } from "./HeapGrowth"
import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * Leak loops:  an interaction repeated, the heap (after a forced garbage collection), DOM nodes and listeners compared
 * before and after.
 * - A warm-up round first (a first open fills caches), then the baseline, then the loop.
 * - Growth per cycle:  (after - before) / cycles.
 * - Each loop also takes a heap snapshot before and after, and lists the 10 kinds of thing that grew most, by what
 *   holds them (`HeapGrowth`, epic `solid-2-final` P10).
 *   - With `SPELL_PERF_HEAP_SNAPSHOTS=1` both snapshots are saved too, for Chrome's Memory tab:
 *     in the system's temporary folder, `spell-perf-heap/<when>-<page>/`, 400-500 MB each for the editor.
 *   - `SPELL_PERF_LEAK_LOOPS=<words>` runs only the loops whose names hold them, e.g. `examples`.
 * - The editor:  switch files 20x, fold an Inspector card 30x, open the View menu 30x, visit 10 examples,
 *   type 200 characters, edit Solitaire 100x (each edit run as it's typed).
 * - The docs page (the kitchen sink):  open a dropdown 50x by its attribute and 20x by a click, a modal 50x.
 * - The epic page:  open and fold items 30x.
 * - Run mode has none.
 */
export class LeaksMeasure {
  /** Each loop of `page` under `profile`;  a loop that fails says why, and the rest go on. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<LeaksResult> {
    const browser = await PerfBrowser.open(page, profile, servers)
    const results: LeakLoopResult[] = []
    const heapFolder = !process.env.SPELL_PERF_HEAP_SNAPSHOTS
      ? undefined
      : join(tmpdir(), "spell-perf-heap", `${new Date().toISOString().replace(/[:.]/g, "-")}-${page}`)
    try {
      await browser.load({ quietMs: 2000 })
      // `SPELL_PERF_LEAK_LOOPS=examples`:  only the loops whose names say it, to look at one closely
      const only = process.env.SPELL_PERF_LEAK_LOOPS
      for (const loop of (LOOPS[page] ?? []).filter((it) => !only || it.name.includes(only))) {
        try {
          await loop.setup?.(browser.page)
          for (let index = 0; index < Math.min(3, loop.cycles); index++) await loop.cycle(browser.page, index)
          await browser.page.waitForTimeout(500)
          const before = await browser.metricsAfterGC()
          const fileName = loop.name.replace(/[^\w]+/g, "-").slice(0, 40)
          const heapBefore = await HeapGrowth.snapshot(browser.cdp, heapFolder, `${fileName}-before`)
          const started = Date.now()
          for (let index = 0; index < loop.cycles; index++) await loop.cycle(browser.page, index)
          const elapsed = Date.now() - started
          await browser.page.waitForTimeout(1000)
          const after = await browser.metricsAfterGC()
          const heapAfter = await HeapGrowth.snapshot(browser.cdp, heapFolder, `${fileName}-after`)
          const perCycle = (key: keyof typeof after) => +((after[key] - before[key]) / loop.cycles).toFixed(1)
          results.push({
            name: loop.name,
            cycles: loop.cycles,
            elapsed,
            heapBefore: before.JSHeapUsedSize,
            heapAfter: after.JSHeapUsedSize,
            heapPerCycle: Math.round(perCycle("JSHeapUsedSize")),
            nodesPerCycle: perCycle("Nodes"),
            listenersPerCycle: perCycle("JSEventListeners"),
            grewMost: HeapGrowth.grewMost(heapBefore, heapAfter),
            ...(heapFolder && { snapshots: heapFolder })
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

/**
 * The examples the editor visits in turn:  ones that draw with no outside service to wait on.
 * - Ten, so more than the last few projects shown (`editor`'s recent projects) are left behind.
 */
const VISITED_EXAMPLES = [
  "Counter",
  "TaskList",
  "ShoppingList",
  "calculator",
  "fizzbuzz",
  "flash-cards",
  "habit-tracker",
  "tic-tac-toe",
  "Checkers",
  "RecipeBox"
]

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
        // by the editor, as `showCardFile()` does:  a tab's label is drawn where a text search can't see it
        await page.evaluate(
          (path) => (window as unknown as EditorWindow).editor.showFileAt(path),
          `@spell/examples/Solitaire/${name}`
        )
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
      name: "visit 10 examples in turn",
      cycles: 10,
      async cycle(page, index) {
        await page.evaluate(showProjectAndWait, `@spell/examples/${VISITED_EXAMPLES[index % VISITED_EXAMPLES.length]}`)
      }
    },
    {
      name: "type 200 characters into a comment",
      cycles: 200,
      async setup(page) {
        await page.evaluate(showCardFile)
        await page.waitForTimeout(800)
        await page.evaluate(focusLineTwo)
      },
      async cycle(page, index) {
        await page.keyboard.type(TYPED[index % TYPED.length]!)
        await page.waitForTimeout(60)
      }
    },
    {
      name: "edit Solitaire 100 times, each edit run",
      cycles: 100,
      async setup(page) {
        await page.evaluate(showCardFile)
        await page.waitForTimeout(800)
        await page.evaluate(focusLineTwo)
      },
      async cycle(page, index) {
        const runs = await page.evaluate(() => (window as unknown as EditorWindow).editor.programRuns)
        await page.keyboard.type(TYPED[index % TYPED.length]!)
        await page.waitForFunction((was) => (window as unknown as EditorWindow).editor.programRuns > was, runs, {
          timeout: 15_000,
          polling: 100
        })
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
      name: "open / close a dropdown (click, Escape)",
      cycles: 20,
      async cycle(page) {
        const dropdown = page.locator("ui-dropdown").filter({ visible: true }).nth(1)
        await dropdown.click()
        await page.waitForTimeout(150)
        await page.keyboard.press("Escape")
        await page.waitForTimeout(150)
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
 * In the page:  show Solitaire's `Card.spell` in the code pane, as a click on its tab would.
 * - By the editor, not by its tab's text:  the tab's label is drawn where a text search can't see it.
 */
export async function showCardFile(): Promise<void> {
  const { editor } = window as unknown as EditorWindow
  await editor.showFileAt("@spell/examples/Solitaire/Card.spell")
}

/**
 * In the page:  show project `path` in the editor, and wait till it has run (at most 15 seconds).
 * - MUST stay self-contained:  Playwright sends its source
 */
export async function showProjectAndWait(path: string): Promise<void> {
  const { editor } = window as unknown as EditorWindow
  const runs = editor.programRuns
  await editor.showFileAt(path)
  const until = Date.now() + 15_000
  while (editor.programRuns === runs && Date.now() < until) await new Promise((resolve) => setTimeout(resolve, 100))
  await new Promise((resolve) => setTimeout(resolve, 300))
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
    project: { path: string }
    programRuns: number
    showFileAt(path: string): Promise<void>
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
  /** the 10 kinds of thing that grew most on the heap, by what holds them -- see `HeapGrowth` */
  grewMost?: HeapGrowthRow[]
  /** folder the loop's two heap snapshots are saved in, when asked (`SPELL_PERF_HEAP_SNAPSHOTS`) */
  snapshots?: string
  error?: string
}

/** A page's leak loops. */
export type LeaksResult = { page: PerfPageName; profile: PerfProfileName; results: LeakLoopResult[]; errors: string[] }
