/**
 * Types 10 characters into a 1000-option search dropdown and reports the time per keystroke:
 * - `update`:  `performance.now()` around the `input` event + `await el.updateComplete` (Lit's render only)
 * - `frame`:  the same, plus the next animation frame (style, layout and paint included, roughly)
 * - also the first open (1000 items rendered) and a "churn" run alternating two broad queries.
 * - Result goes to `#result` and the console;  `window.perfResult` for scripted runs.
 */

import type { MenuOption } from "$/elements"
import type { UIDropdown } from "../src/index"

import "../src/index"

/** Vocabulary for the generated option texts. */
const WORDS = ["apple", "banana", "cherry", "lemon", "mango", "olive", "peach", "plum", "grape", "melon", "kiwi"]
/** Narrowing query, one character per keystroke. */
const QUERY = "a lemon 12"
/** Alternating broad queries:  each keystroke re-renders hundreds of rows. */
const CHURN = ["a", "e", "a", "e", "a", "e", "a", "e", "a", "e"]

const element = document.querySelector<UIDropdown>("#perf")!
element.options = Array.from({ length: 1000 }, (_, index): MenuOption => ({
  value: `v${index}`,
  text: `${WORDS[index % WORDS.length]} ${WORDS[(index * 7) % WORDS.length]} ${index}`
}))

document.querySelector("#run")!.addEventListener("click", () => void run())
await run()

/** One full measurement. */
async function run() {
  await element.updateComplete
  element.open = false
  await element.updateComplete
  const input = element.shadowRoot!.querySelector<HTMLInputElement>("input.search")!
  let start = performance.now()
  element.open = true
  await element.updateComplete
  const openUpdate = performance.now() - start
  await frame()
  const openFrame = performance.now() - start
  const narrowing = await typeAll(
    input,
    Array.from({ length: QUERY.length }, (_, index) => QUERY.slice(0, index + 1))
  )
  const churn = await typeAll(input, CHURN)
  const result = { options: 1000, openUpdateMs: round(openUpdate), openFrameMs: round(openFrame), narrowing, churn }
  console.log("[perf]", JSON.stringify(result))
  ;(window as unknown as { perfResult: unknown }).perfResult = result
  document.querySelector("#result")!.textContent = JSON.stringify(result, null, 2)

  /** Set each query in turn, timing update and frame. */
  async function typeAll(field: HTMLInputElement, queries: string[]) {
    const update: number[] = []
    const painted: number[] = []
    for (const query of queries) {
      field.value = query
      start = performance.now()
      field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
      await element.updateComplete
      update.push(performance.now() - start)
      await frame()
      painted.push(performance.now() - start)
    }
    return { update: stats(update), frame: stats(painted) }
  }
}

/** Next animation frame. */
function frame() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}

/** min / avg / max. */
function stats(times: number[]) {
  const average = times.reduce((sum, time) => sum + time, 0) / times.length
  return { min: round(Math.min(...times)), avg: round(average), max: round(Math.max(...times)) }
}

/** Two decimals. */
function round(value: number) {
  return Math.round(value * 100) / 100
}
