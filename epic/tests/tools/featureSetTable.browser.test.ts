import { afterEach, expect, test } from "vite-plus/test"
import { page } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-table"

import docCSS from "spell/epic/tools/_assets/spell-doc.css?inline"

/**
 * A Feature Set's table at each width, in a real browser's layout, with the docs pages' own sheet (epic
 * `epic-engine` P80's design review):  desktop's three columns as they are;  at the side bar's width and a phone's,
 * Your pick first, then Item with the Facts under it, and nothing to scroll sideways to.
 */

/** The page:  one item's row, as the tool writes it, a plain box for its pick. */
const PAGE =
  `<main class="spell-doc-main" style="display: block"><ui-section id="s1" style="display: block">` +
  `<ui-table class="spell-feature-table spell-full-width" celled compact><table>` +
  `<colgroup><col class="spell-feature-col-item"><col class="spell-feature-col-pick"><col class="spell-feature-col-facts"></colgroup>` +
  `<thead><tr><th>Item</th><th>Your pick</th><th>Facts</th></tr></thead>` +
  `<tbody><tr id="s1f1" data-feature-item>` +
  `<td class="spell-feature-item"><p class="spell-feature-title"><b>Share a list by link</b></p>` +
  `<p>One or two sentences about what it is and who it helps, written so a person can decide from them.</p></td>` +
  `<td class="spell-feature-pick"><p>Yes, No, Modify or Revisit</p></td>` +
  `<td class="spell-feature-facts"><p><b>Risk</b> low</p></td>` +
  `</tr></tbody></table></ui-table></ui-section></main>`

/** The page at `width`, laid out:  its cells' boxes and its heads'. */
async function laidOut(width: number) {
  await page.viewport(width, 900)
  const sheet = document.createElement("style")
  sheet.textContent = docCSS
  sheet.dataset.test = ""
  document.head.append(sheet)
  document.body.className = "spell-doc-page spell-details-page"
  document.body.style.margin = "0"
  const root = await ElementFixture.render(PAGE)
  await ElementFixture.settle()
  const boxOf = (selector: string) => root.querySelector(selector)!.getBoundingClientRect()
  return {
    table: root.querySelector("table")!,
    frame: boxOf("ui-table"),
    item: boxOf("td.spell-feature-item"),
    pick: boxOf("td.spell-feature-pick"),
    facts: boxOf("td.spell-feature-facts"),
    itemHead: boxOf("th:nth-child(1)"),
    pickHead: boxOf("th:nth-child(2)"),
    factsHead: boxOf("th:nth-child(3)")
  }
}

afterEach(() => {
  document.head.querySelector("style[data-test]")?.remove()
  document.body.className = ""
  document.body.removeAttribute("style")
})

for (const width of [390, 560, 700])
  test(`${width} wide:  Your pick first, then Item with the Facts in it;  nothing off to the side`, async () => {
    const { table, frame, item, pick, facts, itemHead, pickHead, factsHead } = await laidOut(width)
    expect(table.getBoundingClientRect().right).toBeLessThanOrEqual(frame.right + 1)
    expect(pick.left).toBeLessThan(item.left)
    expect(item.right).toBeLessThanOrEqual(frame.right + 1)
    expect(pick.width).toBeGreaterThan(140)
    expect(pick.width).toBeLessThanOrEqual(172)
    // the Facts are in Item's column, right under it, beside the pick
    expect(Math.abs(facts.left - item.left)).toBeLessThan(2)
    expect(Math.abs(facts.right - item.right)).toBeLessThan(2)
    expect(Math.abs(facts.top - item.bottom)).toBeLessThan(2)
    expect(Math.abs(pick.bottom - facts.bottom)).toBeLessThan(2)
    expect(Math.abs(pickHead.left - pick.left)).toBeLessThan(2)
    expect(Math.abs(itemHead.left - item.left)).toBeLessThan(2)
    // still a table:  the head's there for a screen reader, with no room of its own
    expect(factsHead.width).toBeLessThanOrEqual(1)
  })

test("desktop:  three columns, Item | Your pick | Facts, as they are", async () => {
  const { table, item, pick, facts } = await laidOut(1440)
  expect(getComputedStyle(table).display).toBe("table")
  expect([item.top, pick.top, facts.top].map(Math.round)).toEqual([item.top, item.top, item.top].map(Math.round))
  expect(item.right).toBeLessThanOrEqual(pick.left + 1)
  expect(pick.right).toBeLessThanOrEqual(facts.left + 1)
  expect(pick.width / table.getBoundingClientRect().width).toBeCloseTo(0.2, 1)
})
