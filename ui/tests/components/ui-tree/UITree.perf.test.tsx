import { expect, it } from "vite-plus/test"
import { commands } from "vite-plus/test/browser"

import { localDate } from "spell/util/time"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { TreeItemData } from "spell/ui/components/ui-tree"

import "spell/ui/components/ui-tree"

/** Timed runs of each size, after one warm-up. */
const RUNS = 7

/** The sizes timed:  a column that fits, and a big one. */
const SIZES = [300, 5_000]

/**
 * A column from `items` opens as fast with 5,000 rows as with 300:
 * it draws the first rows, and more as you scroll (`drawnInWindow()`).
 * - Timed from setting `items` until the tree has settled and painted;  the median is the number to quote.
 * - SIDE EFFECT:  writes `results/tree-perf.json` (browser-mode `console.log` doesn't reach the terminal).
 */
it("opens a column of 5,000 rows about as fast as one of 300", { timeout: 60_000 }, async () => {
  const medians: Record<number, number> = {}
  const drawn: Record<number, number> = {}
  for (const size of SIZES) {
    await open(size)
    const times: number[] = []
    for (let run = 0; run < RUNS; run++) times.push((await open(size)).time)
    medians[size] = [...times].sort((a, b) => a - b)[Math.floor(RUNS / 2)]!
    drawn[size] = (await open(size)).rows
  }
  await commands.writeFile(
    "results/tree-perf.json",
    `${JSON.stringify({ medians, drawn, runs: RUNS, date: localDate() }, null, 2)}\n`
  )
  expect(drawn[5_000]).toBeLessThan(200)
  // generous, so a busy machine doesn't fail it:  drawing every row took about 20 times as long
  expect(medians[5_000]!).toBeLessThan(medians[300]! * 3 + 50)
})

/** A tree of `count` rows in one column, put in the page and settled:  the ms it took, and the rows it drew. */
async function open(count: number): Promise<{ time: number; rows: number }> {
  const items: TreeItemData[] = Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    label: `Row ${index}`,
    which: index % 3 ? "file" : "folder"
  }))
  const container = document.createElement("div")
  document.body.append(container)
  const start = performance.now()
  container.innerHTML = `<ui-tree appearance="columns" label="Big" style="height: 400px; width: 600px"></ui-tree>`
  const host = container.firstElementChild as HTMLElement & { items?: TreeItemData[] }
  host.items = items
  await ElementFixture.settle(container)
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))
  const time = performance.now() - start
  const rows = host.shadowRoot!.querySelectorAll(".column-row").length
  container.remove()
  return { time, rows }
}
