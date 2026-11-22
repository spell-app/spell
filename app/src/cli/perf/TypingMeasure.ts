import type { PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser, median, percentile, type PerfWindow } from "./PerfBrowser"

/**
 * Typing in the editor's code pane:  100 keys into a comment (Card.spell's line 2), one every 120ms, a quick typist.
 * - Two measures a key:
 *   - Event Timing (as INP measures it):  the longest key event of the interaction, to the next paint after its
 *     handlers
 *   - a frame:  from the key's time stamp to a task queued after the next animation frame
 * - Autosave is off and writes are refused:  nothing on disk changes.
 * - At phone width the editor shows no code pane:  the phone is measured at `phonewide`.
 * - Into any file and line (`TypingFile`):  Solitaire's Card.spell by default;  `BIG_FILE`, the Spell UI guide's
 *   longest page, shows how a key's cost grows with the file (epic `solid-2-final` T20, P18).
 */
export class TypingMeasure {
  /** Type into the editor under `profile`. */
  static async measure(
    profile: PerfProfileName,
    servers: PerfServers,
    typed: TypingFile = CARD_FILE
  ): Promise<TypingResult> {
    const browser = await PerfBrowser.open("editor", profile, servers)
    try {
      await browser.load()
      const { page } = browser
      await page.evaluate(showFileAndWait, typed.path)
      // its project started:  a big one draws for a minute on the phone, which would be measured as typing
      await browser.waitReadyAndQuiet({ quietMs: 3000, capMs: 180_000 })
      await page.waitForTimeout(typed.settle)
      await page.evaluate(focusLine, typed.line)
      await page.evaluate(watchFrames)
      await page.waitForTimeout(500)
      const before = await browser.metricsAfterGC()
      for (let index = 0; index < KEYS; index++) {
        await page.keyboard.type(TYPED[index % TYPED.length]!)
        await page.waitForTimeout(GAP_MS)
      }
      await page.waitForTimeout(2000)
      const after = await browser.metricsAfterGC()
      // the keys went into the code:  else nothing here measures typing
      const typedIntoCode = await page.evaluate(lineEndsWith, { number: typed.line, tail: TYPED.slice(0, 20) })
      if (!typedIntoCode)
        throw new Error(`TypingMeasure:  the keys didn't reach the code, line ${typed.line} of ${typed.path}`)
      const { frames, events } = await page.evaluate(() => {
        const holder = window as unknown as PerfWindow & { __frames: number[] }
        return { frames: holder.__frames, events: holder.__perf.events }
      })
      // the longest key event of each interaction
      const byInteraction = new Map<number, (typeof events)[number]>()
      for (const event of events) {
        if (!/^key/.test(event.name) || !event.interactionId) continue
        const known = byInteraction.get(event.interactionId)
        if (!known || event.duration > known.duration) byInteraction.set(event.interactionId, event)
      }
      const keys = [...byInteraction.values()]
      const durations = keys.map((event) => event.duration)
      return {
        profile,
        keys: KEYS,
        gap: GAP_MS,
        eventTiming: {
          interactions: durations.length,
          median: median(durations),
          p90: percentile(durations, 0.9),
          worst: Math.max(0, ...durations),
          over50: durations.filter((value) => value > 50).length,
          medianProcessing: median(keys.map((event) => event.processing)),
          medianInputDelay: median(keys.map((event) => event.delay))
        },
        frame: {
          samples: frames.length,
          median: median(frames),
          p90: percentile(frames, 0.9),
          worst: Math.max(0, ...frames)
        },
        heapPerKey: Math.round((after.JSHeapUsedSize - before.JSHeapUsedSize) / KEYS)
      }
    } finally {
      await browser.close()
    }
  }
}

/** Where keys are typed:  a file, and the line whose end they go at (from 1). */
export type TypingFile = {
  /** the file's path, `@spell/examples/Solitaire/Card.spell` */
  path: string
  /** the line, from 1:  a comment's, so the program still compiles */
  line: number
  /** how long the editor settles once it's shown and quiet, msec */
  settle: number
}

/** Solitaire's Card.spell, its line 2:  a comment. */
export const CARD_FILE: TypingFile = { path: "@spell/examples/Solitaire/Card.spell", line: 2, settle: 800 }

/** The Spell UI guide's longest page (2,731 lines), its line 4:  its heading's text, so the page still compiles. */
export const BIG_FILE: TypingFile = { path: "@spell/guides/SpellUI/Table/Examples.spell", line: 4, settle: 1000 }

/** How many keys are typed. */
const KEYS = 100

/** The gap between keys, ms. */
const GAP_MS = 120

/** What's typed, a character a key. */
const TYPED = " the quick brown fox jumps over the lazy dog and keeps on typing a long comment"

/**
 * In the page:  show the file at `path`, waiting for it to be shown (at most 30 seconds).
 * - MUST stay self-contained:  Playwright sends its source
 */
async function showFileAndWait(path: string): Promise<void> {
  const { editor } = window as unknown as {
    editor: { showFileAt(path: string): Promise<void>; shownCodeEditor?: { file?: { path: string } } }
  }
  await editor.showFileAt(path)
  const started = Date.now()
  while (editor.shownCodeEditor?.file?.path !== path && Date.now() - started < 30_000)
    await new Promise((resolve) => setTimeout(resolve, 100))
}

/**
 * In the page:  does line `number` of the code pane hold `tail`?
 * - MUST stay self-contained:  Playwright sends its source
 */
function lineEndsWith({ number, tail }: { number: number; tail: string }): boolean {
  const { view } = (
    window as unknown as {
      editor: { shownCodeEditor: { view: { state: { doc: { line(number: number): { text: string } } } } } }
    }
  ).editor.shownCodeEditor
  return view.state.doc.line(number).text.includes(tail)
}

/**
 * In the page:  the caret at the end of line `number` of the code pane, focused, waiting till it keeps the focus
 * (at most 10 seconds):  a notice that shows as a project opens takes it.
 * - MUST stay self-contained:  Playwright sends its source
 */
async function focusLine(number: number): Promise<void> {
  const { view } = (
    window as unknown as {
      editor: {
        shownCodeEditor: {
          view: {
            state: { doc: { line(number: number): { to: number } } }
            dispatch(spec: { selection: { anchor: number }; scrollIntoView?: boolean }): void
            focus(): void
            hasFocus: boolean
          }
        }
      }
    }
  ).editor.shownCodeEditor
  const line = view.state.doc.line(number)
  view.dispatch({ selection: { anchor: line.to }, scrollIntoView: true })
  const started = Date.now()
  do {
    view.focus()
    await new Promise((resolve) => setTimeout(resolve, 500))
  } while (!view.hasFocus && Date.now() - started < 10_000)
}

/**
 * In the page:  from each key's time stamp to a task after the next frame, into `window.__frames`;
 * the page's events so far forgotten.
 * - MUST stay self-contained:  Playwright sends its source
 */
function watchFrames(): void {
  const holder = window as unknown as PerfWindow & { __frames: number[] }
  holder.__frames = []
  addEventListener(
    "keydown",
    (event) => {
      const stamp = event.timeStamp
      requestAnimationFrame(() => {
        const channel = new MessageChannel()
        channel.port1.onmessage = () => holder.__frames.push(performance.now() - stamp)
        channel.port2.postMessage(0)
      })
    },
    { capture: true }
  )
  holder.__perf.events.length = 0
}

/** What typing measured, ms. */
export type TypingResult = {
  profile: PerfProfileName
  keys: number
  gap: number
  eventTiming: Record<string, number | undefined>
  frame: Record<string, number | undefined>
  heapPerKey: number
}
