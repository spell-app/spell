import { flush } from "solid-js"

import type { DropdownOptions } from "$/components/components.types"

/**
 * The dropdown filtering benchmark, shared by `dropdown.perf.test.tsx` and `demo/perf.html`:  1000 options,
 * a search dropdown, ten keystrokes.
 * - Each keystroke:  set the input's value, dispatch `input`, then `flush()` -- Solid 2 batches signal writes
 *   to a microtask, and `flush()` applies them (memos, `<For>` diff, DOM writes) synchronously, so the
 *   measured span is exactly "event => DOM updated".  `layout` adds a forced reflow (`offsetHeight`) to include
 *   style + layout of the new rows.
 * - Pure measurement:  no assertions here.
 */
export class PerfRun {
  /** Query typed, one character per keystroke. */
  static query = "united sta"

  /** `count` options with words the query narrows progressively. */
  static options(count = 1000): DropdownOptions {
    const first = ["United", "Unity", "Union", "Uni", "Upper", "Under", "Utah", "Ural", "Umbria", "Ulster"]
    const second = ["States", "Stations", "Stars", "Kingdom", "Nations", "Arab", "Rivers", "Lakes", "Hills", "Towns"]
    return Array.from({ length: count }, (_, index) => ({
      value: `option-${index}`,
      text: `${first[index % first.length]} ${second[Math.floor(index / first.length) % second.length]} ${index}`
    }))
  }

  /** Time opening (first render of every row), then each keystroke, on a rendered, empty search dropdown. */
  static async run(host: HTMLElement & { options?: DropdownOptions }, count = 1000): Promise<PerfResult> {
    host.options = PerfRun.options(count)
    flush()
    const root = host.shadowRoot!
    const input = root.querySelector<HTMLInputElement>("input.search")!
    const menu = root.querySelector<HTMLElement>("[role=listbox]")!
    input.focus()
    const openStart = performance.now()
    input.click()
    flush()
    const openRows = menu.querySelectorAll("[role=option]").length
    const openScript = performance.now() - openStart
    void menu.offsetHeight
    const open = performance.now() - openStart
    const keystrokes: Keystroke[] = []
    for (let length = 1; length <= PerfRun.query.length; length++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
      const start = performance.now()
      input.value = PerfRun.query.slice(0, length)
      input.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText" }))
      flush()
      const script = performance.now() - start
      void menu.offsetHeight
      keystrokes.push({
        query: input.value,
        rows: menu.querySelectorAll("[role=option]").length,
        script,
        layout: performance.now() - start
      })
    }
    return {
      count,
      open: { rows: openRows, script: openScript, layout: open },
      keystrokes,
      ...PerfRun.stats(keystrokes)
    }
  }

  /** Min / avg / max of the keystrokes. */
  private static stats(keystrokes: Keystroke[]) {
    const script = keystrokes.map((keystroke) => keystroke.script)
    const layout = keystrokes.map((keystroke) => keystroke.layout)
    return {
      script: { min: Math.min(...script), avg: average(script), max: Math.max(...script) },
      layout: { min: Math.min(...layout), avg: average(layout), max: Math.max(...layout) }
    }

    /** Mean of `values`. */
    function average(values: number[]) {
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }
  }
}

/** One measured keystroke. */
export type Keystroke = {
  query: string
  /** rows after it */
  rows: number
  /** ms, event => DOM updated */
  script: number
  /** ms, including a forced layout */
  layout: number
}

/** `PerfRun.run()` result. */
export type PerfResult = {
  count: number
  open: { rows: number; script: number; layout: number }
  keystrokes: Keystroke[]
  script: { min: number; avg: number; max: number }
  layout: { min: number; avg: number; max: number }
}
