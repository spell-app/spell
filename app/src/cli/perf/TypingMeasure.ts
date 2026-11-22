import type { PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser, median, percentile, type PerfWindow } from "./PerfBrowser"
import { focusLineTwo } from "./LeaksMeasure"

/**
 * Typing in the editor's code pane:  100 keys into a comment (Card.spell's line 2), one every 120ms, a quick typist.
 * - Two measures a key:
 *   - Event Timing (as INP measures it):  the longest key event of the interaction, to the next paint after its
 *     handlers
 *   - a frame:  from the key's time stamp to a task queued after the next animation frame
 * - Autosave is off and writes are refused:  nothing on disk changes.
 * - At phone width the editor shows no code pane:  the phone is measured at `phonewide`.
 */
export class TypingMeasure {
  /** Type into the editor under `profile`. */
  static async measure(profile: PerfProfileName, servers: PerfServers): Promise<TypingResult> {
    const browser = await PerfBrowser.open("editor", profile, servers)
    try {
      await browser.load()
      const { page } = browser
      await page.getByText("Card.spell", { exact: true }).filter({ visible: true }).first().click({ force: true })
      await page.waitForTimeout(800)
      await page.evaluate(focusLineTwo)
      await page.evaluate(watchFrames)
      await page.waitForTimeout(500)
      const before = await browser.metricsAfterGC()
      for (let index = 0; index < KEYS; index++) {
        await page.keyboard.type(TYPED[index % TYPED.length]!)
        await page.waitForTimeout(GAP_MS)
      }
      await page.waitForTimeout(2000)
      const after = await browser.metricsAfterGC()
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

/** How many keys are typed. */
const KEYS = 100

/** The gap between keys, ms. */
const GAP_MS = 120

/** What's typed, a character a key. */
const TYPED = " the quick brown fox jumps over the lazy dog and keeps on typing a long comment"

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
