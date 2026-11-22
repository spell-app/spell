import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * Huge lists:  a `<ui-table>` and a `<ui-tree>` of `HUGE_LIST_ROWS` rows each, scrolled top to bottom
 * (epic `solid-2-final` P17).
 * - On the docs page (the kitchen sink), where both are defined:  each is put on the page in a box filling the window,
 *   given its rows, and scrolled a screen a frame until its end, or for at most `SCROLL_CAP_MS`.
 * - What's measured, for each:
 *   - `drawnMs`:  from its rows given to its first row drawn
 *   - frame time while scrolling (`frame.median`, `p95`, `max`, `over50`):  one screen a frame, a fast fling
 *   - `reached`:  the last row drawn when the scrolling stopped;  `drawnRows`:  how many rows are drawn then
 *   - `heapAfter` and `nodesAfter`, after a garbage collection, against `heapBefore` and `nodesBefore`
 * - A list that keeps every row it has shown ends with thousands of rows drawn;  one that lets go of the far-off ones,
 *   a few hundred.
 */
export class HugeListsMeasure {
  /** Both lists, on `page` under `profile`. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<HugeListsResult> {
    const browser = await PerfBrowser.open(page, profile, servers)
    const lists: HugeListResult[] = []
    try {
      await browser.load({ quietMs: 2000 })
      for (const kind of HUGE_LIST_KINDS) {
        try {
          const before = await browser.metricsAfterGC()
          const scrolled = await browser.page.evaluate(scrollHugeList, {
            kind,
            rows: HUGE_LIST_ROWS,
            capMs: SCROLL_CAP_MS
          })
          const after = await browser.metricsAfterGC()
          await browser.page.evaluate(() => document.getElementById("perf-huge-list")?.remove())
          lists.push({
            kind,
            rows: HUGE_LIST_ROWS,
            ...scrolled,
            heapBefore: before.JSHeapUsedSize,
            heapAfter: after.JSHeapUsedSize,
            nodesBefore: before.Nodes,
            nodesAfter: after.Nodes
          })
        } catch (error) {
          lists.push({ kind, rows: HUGE_LIST_ROWS, error: String(error).slice(0, 300) })
        }
      }
    } finally {
      await browser.close()
    }
    return { page, profile, lists, errors: browser.errors.slice(0, 10) }
  }
}

/** The lists measured. */
export const HUGE_LIST_KINDS = ["table", "tree"] as const

/** One of `HUGE_LIST_KINDS`. */
export type HugeListKind = (typeof HUGE_LIST_KINDS)[number]

/** How many rows each list holds. */
const HUGE_LIST_ROWS = 100_000

/** How long a list is scrolled, at most. */
const SCROLL_CAP_MS = 90_000

/**
 * In the page:  put a huge `kind` list on it, scroll it to its end, and say how it went.
 * - MUST stay self-contained:  Playwright sends its source
 */
async function scrollHugeList({ kind, rows, capMs }: { kind: string; rows: number; capMs: number }) {
  // how long the end stays put, scrolled to, before it's the end
  const END_QUIET_MS = 3000
  const firstText = (row: Element) => (row.querySelector("td, .words")?.textContent ?? "").trim()
  const frame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))
  const box = document.createElement("div")
  box.id = "perf-huge-list"
  box.style.cssText = "position: fixed; inset: 0; overflow: auto; z-index: 2147483647; background: Canvas"
  document.body.append(box)
  const element = document.createElement(kind === "table" ? "ui-table" : "ui-tree") as HTMLElement & {
    rows?: unknown
    columnDefs?: unknown
    items?: unknown
  }
  if (kind === "tree") {
    element.setAttribute("appearance", "columns")
    element.style.height = "100%"
  }
  box.append(element)
  await (element as HTMLElement & { ready?: Promise<unknown> }).ready
  const drawnRows = () =>
    kind === "table"
      ? element.querySelectorAll("tbody tr:not(.spacer)")
      : (element.shadowRoot?.querySelectorAll("li.column-row") ?? [])
  const started = performance.now()
  if (kind === "table") {
    element.columnDefs = [
      { key: "name", label: "Name" },
      { key: "number", label: "Number", type: "number" }
    ]
    element.rows = Array.from({ length: rows }, (_, at) => ({ name: `Row ${at}`, number: at }))
  } else {
    element.items = Array.from({ length: rows }, (_, at) => ({ id: `r${at}`, label: `Row ${at}` }))
  }
  while (!drawnRows().length && performance.now() - started < 30_000) await frame()
  const drawnMs = performance.now() - started
  const scroller =
    kind === "tree" ? ((element.shadowRoot?.querySelector("ul.column") as HTMLElement | null) ?? box) : box
  const frames: number[] = []
  let last = await frame()
  // at the end, and it hasn't grown for a while:  done
  let endSince: number | undefined
  let height = scroller.scrollHeight
  const scrollStarted = performance.now()
  while (performance.now() - scrollStarted < capMs && (endSince === undefined || last - endSince < END_QUIET_MS)) {
    const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
    if (!atEnd || scroller.scrollHeight !== height) endSince = undefined
    else endSince ??= last
    height = scroller.scrollHeight
    scroller.scrollTop += scroller.clientHeight
    const now = await frame()
    frames.push(now - last)
    last = now
  }
  const drawn = [...drawnRows()]
  const reached = drawn.reduce((most, row) => Math.max(most, Number(/^Row (\d+)/.exec(firstText(row))?.[1] ?? -1)), -1)
  const sorted = [...frames].sort((one, other) => one - other)
  const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0
  return {
    drawnMs: Math.round(drawnMs),
    scrollMs: Math.round(performance.now() - scrollStarted),
    reached,
    drawnRows: drawn.length,
    frame: {
      count: frames.length,
      median: +at(0.5).toFixed(1),
      p95: +at(0.95).toFixed(1),
      max: +(sorted.at(-1) ?? 0).toFixed(1),
      over50: frames.filter((each) => each > 50).length
    }
  }
}

/** One list scrolled, or why it failed. */
export type HugeListResult = {
  kind: HugeListKind
  rows: number
  drawnMs?: number
  scrollMs?: number
  reached?: number
  drawnRows?: number
  frame?: { count: number; median: number; p95: number; max: number; over50: number }
  heapBefore?: number
  heapAfter?: number
  nodesBefore?: number
  nodesAfter?: number
  error?: string
}

/** A page's huge lists. */
export type HugeListsResult = {
  page: PerfPageName
  profile: PerfProfileName
  lists: HugeListResult[]
  errors: string[]
}
