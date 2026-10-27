import { describe, expect, test } from "vite-plus/test"

import { CLI } from "spell/app/cli"

/**
 * `NotebookFromPage`:  a Spell UI page as notebooks (epic `elemental-spell` P19, P25, P26).
 * - Here, what it writes for the web's own tags (P26):  Spell UI's, with an `<html>` block only where there's no
 *   other way.
 * - Every bare name stands for `ui-<name>`, as Spell UI's pack would say.
 */
describe("NotebookFromPage:  the web's tags as Spell UI's (P26)", () => {
  test("a paragraph and its inline tags are `<text>`s;  a link `<link>`", () => {
    const example = examplesOf(
      `<p>It's <b>free</b>, <em>today</em> only:  run <code>yarn</code>, see <a href="#x">this</a>.</p>`
    )
    expect(example).toContain(
      `<text paragraph>It's <text bold>free</text>, <text italic>today</text> only:  run <text code>yarn</text>, ` +
        `see <link link="#x">this</link>.</text>`
    )
    expect(example).not.toContain("<html>")
  })

  test("a paragraph's `<br>` is a blank line in its text;  lines of elements between `<br>`s a `<stack>`", () => {
    const paragraph = examplesOf(`<p>One<br>Two</p>`)
    expect(paragraph).toContain("\t\t\t\t<text paragraph>\n\t\t\t\t\tOne\n\n\t\t\t\t\tTwo\n\t\t\t\t</text>")
    const lines = examplesOf(`<ui-rating></ui-rating><br><ui-rating></ui-rating> <ui-icon></ui-icon>`)
    expect(lines).toContain(`<stack spacing="none">\n\t\t\t\t\t<rating/>\n\t\t\t\t\t<text>\n\t\t\t\t\t\t<rating/>\n`)
  })

  test("a table's rows and cells are `<row>`s and `<cell>`s;  a class word a cell can't say keeps the table", () => {
    const rows = examplesOf(
      `<ui-table celled><table><thead><tr><th>Name</th></tr></thead>` +
        `<tbody><tr><td class="right aligned" colspan="2">Ann</td></tr></tbody></table></ui-table>`
    )
    expect(rows).toContain(`<row header>\n\t\t\t\t\t\t<cell>Name</cell>`)
    expect(rows).toContain(`<cell span="2" align="right">Ann</cell>`)
    const kept = examplesOf(`<ui-table><table><tbody><tr><td class="positive">Ann</td></tr></tbody></table></ui-table>`)
    expect(kept).toContain("<html>")
  })

  test("a form's native `<form>` goes, a field's `<label>` is its `label`, a list is `<list>` of `<item>`s", () => {
    const example = examplesOf(
      `<ui-form><form method="dialog"><ui-field><label for="n">Name</label><ui-input id="n"></ui-input></ui-field>` +
        `</form></ui-form><ol><li>One</li></ol><div style="width: 8em"><ui-button>Go</ui-button></div>`
    )
    expect(example).toContain(`<form>\n\t\t\t\t\t<field label="Name">\n\t\t\t\t\t\t<input id="n"/>`)
    expect(example).toContain(`<list ordered>\n\t\t\t\t\t<item>One</item>`)
    expect(example).toContain(`<stack style="width: 8em">`)
  })

  test("an example is always named, its description paragraph one attribute:  code backticked, a link Markdown's", () => {
    const example = examplesOf(
      `<p slot="description">Use <code>icon</code>, as <a href="#y">here</a>.</p>` +
        `<ui-message slot="description">More</ui-message><ui-button>Go</ui-button>`
    )
    expect(example).toContain('<example "Animated" description="Use `icon`, as \\[here](#y).">')
    expect(example).toContain(`<message slot="description">More</message>`)
  })
})

/** The Examples notebook of a page whose one example, in section "Animated", holds `markup`. */
function examplesOf(markup: string): string {
  const page =
    `<html><body><h1 class="site-title">Button</h1><ui-tabs class="site-tabs"><ui-tab label="Examples">` +
    `<ui-section label="Types"><ui-section label="Animated"><ui-example>${markup}</ui-example></ui-section>` +
    `</ui-section></ui-tab></ui-tabs></body></html>`
  const converter = new CLI.NotebookFromPage(page, {
    page: "/components/ui/ui-button.html",
    into: "@spell/notebooks",
    tagFor: (bare) => `ui-${bare}`
  })
  return converter.files.get("Examples.spellx")!
}
