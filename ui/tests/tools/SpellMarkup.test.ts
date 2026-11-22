import { describe, expect, test } from "vite-plus/test"

import { SpellMarkup } from "spell/ui/tools/SpellMarkup"

/** `html`'s body, as the Spell UI site's notebook page body, at `indent` tabs. */
function bodyOf(html: string, options: ConstructorParameters<typeof SpellMarkup>[0] = {}, indent = 0) {
  const document = SpellMarkup.parse(html)
  return new SpellMarkup({ document, ...options }).body(document.body, indent)
}

describe("SpellMarkup.body()", () => {
  test("a top section is its label;  a nested one keeps its attributes but its id;  an example is named", () => {
    const html = `
      <ui-section id="examples-types" label="Types" sticky="stack" collapsible dividing>
        <ui-section id="examples-types-basic" label="Basic" sticky="stack" collapsible dividing>
          <ui-example description="A plain button."><ui-button>Save</ui-button></ui-example>
        </ui-section>
      </ui-section>`
    expect(bodyOf(html)).toBe(
      [
        `<section label="Types">`,
        `\t<section label="Basic" sticky="stack" collapsible dividing>`,
        `\t\t<example "Basic" description="A plain button.">`,
        `\t\t\t<button>Save</button>`,
        `\t\t</example>`,
        `\t</>`,
        `</>`,
        ``
      ].join("\n")
    )
  })

  test("a heading names the example;  a description paragraph's code and links go into description=", () => {
    const html = `<ui-example heading="Card"><p slot="description">Holds <code>content</code>. <a href="ui-card.html">Card page</a></p><ui-card></ui-card></ui-example>`
    const text = bodyOf(html, { pageAddress: (file) => (file === "ui-card" ? "/card" : undefined) })
    expect(text).toContain('<example "Card" description="Holds `content`. \\[Card page](/card)">')
    expect(text).toContain("\t<card/>")
  })

  test("the web's tags as Spell UI's:  a paragraph, bold text, a link, a list", () => {
    const html = `<ui-example heading="Text"><p>One <b>two</b></p><a href="https://example.com">site</a><ul><li>a</li></ul></ui-example>`
    const text = bodyOf(html)
    expect(text).toContain("<text paragraph>One <text bold>two</text></text>")
    expect(text).toContain('<link link="https://example.com">site</link>')
    expect(text).toContain("<list bulleted>")
    expect(text).toContain("<item>a</item>")
  })

  test("a tag with no Spell UI word, and a docs element, are an <html> block", () => {
    const html = `<ui-section id="api-x" label="Attributes"><ui-docs-api family="ui-tree" only="attributes"></ui-docs-api></ui-section>`
    expect(bodyOf(html)).toBe(
      [
        `<section label="Attributes">`,
        `\t<html>`,
        `\t\t<ui-docs-api family="ui-tree" only="attributes"></>`,
        `\t</>`,
        `</>`,
        ``
      ].join("\n")
    )
  })

  test("prose is a <markdown> block, its link to another tab's section that page's address and the label's id", () => {
    const html = `
      <ui-tab value="usage"><ui-markdown><script type="text/markdown">
        See [the columns](#examples-types-columns).
      </script></ui-markdown></ui-tab>
      <ui-tab value="examples"><ui-section id="examples-types" label="Types"><ui-section id="examples-types-columns" label="Columns"></ui-section></ui-section></ui-tab>`
    const document = SpellMarkup.parse(html)
    const spell = new SpellMarkup({ document, addressOf: (tab) => `/tree/${tab}` })
    expect(spell.body(document.querySelector('ui-tab[value="usage"]')!, 1, { tab: "usage" })).toBe(
      "\t<markdown>See [the columns](/tree/examples#columns).</>\n"
    )
  })

  test("a page's script that drives its examples is left out, and named in warnings", () => {
    const document = SpellMarkup.parse(
      `<ui-example heading="Data"><ui-tree id="t"></ui-tree><script type="module">document.getElementById("t")</script></ui-example>`
    )
    const spell = new SpellMarkup({ document })
    expect(spell.body(document.body, 0)).not.toContain("script")
    expect(spell.warnings[0]).toMatch(/a script that drives an example is left out/)
  })

  test("comments between sections are Spell's;  braces and brackets in text are escaped", () => {
    const text = bodyOf(`<!-- GAP:  later --><ui-example heading="Text"><ui-text>{x} [y]</ui-text></ui-example>`)
    expect(text).toContain("<!-- GAP:  later -->")
    expect(text).toContain("<text>&#123;x&#125; \\[y]</text>")
  })

  test('a Semantic button (class="ui button") is a Spell UI button, its invoker command kept', () => {
    const text = bodyOf(
      `<ui-example heading="Modal"><button type="button" class="ui button" commandfor="m" command="--show">Show</button></ui-example>`
    )
    expect(text).toMatch(/<button (commandfor="m" command="--show"|command="--show" commandfor="m")>Show<\/button>/)
  })

  test("a diagram's JSON script is its <json>, the JSON kept as written", () => {
    const text = bodyOf(
      `<ui-example heading="Data"><ui-tree-diagram><script type="application/json">{ "label": "Add" }</script></ui-tree-diagram></ui-example>`
    )
    expect(text).toContain('<json>{ "label": "Add" }</json>')
  })

  test("a ui-cluster row is a horizontal stack, in the stack's own words", () => {
    const text = bodyOf(`<ui-example heading="Row"><div class="ui-cluster"><ui-button>A</ui-button></div></ui-example>`)
    expect(text).toContain('<stack direction="horizontal" wrap>')
  })
})
