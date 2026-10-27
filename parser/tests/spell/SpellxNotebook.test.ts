import { beforeAll, describe, test, expect } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { SX } from "spell-parser/spellx"
import {
  incrementalSpellProject,
  parseSpellProject,
  registerTestComponentPack,
  summarize,
  summarizeIncremental
} from "spell-parser/spell/test"

/**
 * A NOTEBOOK in spellx (epic `elemental-spell` P16):  `<spell-notebook "...">`, a page made from spell's built-in
 * `notebook` template, its body a drawing of markdown, markup and `<example>`s, with templates of its own.
 * - It reads as its code-spell twin:  `counter notebook is a notebook :`, its drawing `- to draw its content :`,
 *   each run of prose a `<markdown>` block (a new one at each `##`), its templates before it, and `start` after it.
 * - A notebook is only ever a `.spellx` file:  its `.spell` twin is made in memory (`SX.CodeSpellWriter`), and must
 *   compile to the same program.
 */
describe("a spellx notebook", () => {
  beforeAll(registerTestComponentPack)

  test("compiles:  its templates first, its content's drawing, then it starts", () => {
    const { code, errors } = compiled(COUNTER)
    expect(errors).toEqual([])
    expect(code).toContain("export class Counter extends View {")
    expect(code).toContain("export class CounterNotebook extends Notebook {")
    expect(code).toContain(
      [
        "  drawContent() {",
        "    return [",
        '      h("ui-markdown", "# A counter\\nA button that counts its clicks."),',
        '      h("ui-markdown", "## Try it"),',
        '      h("spell-example", { name: "one counter" }, h("test-project-counter")),',
        '      h("ui-markdown", "## Two of them\\nEach counts on its own:"),',
        '      h("ui-text", { color: "grey" }, "Click either one.")',
        "    ]",
        "  }"
      ].join("\n")
    )
    expect(code).toMatch(/if \(!core\.isCarryingOver\) counterNotebook\.start\(\)$/)
    // a JSX text's spaces on its own line stay:  `Clicked {its count} times`, not `Clicked0times`
    expect(code).toContain('"Clicked ",\n      () => this.count,\n      " times"')
    expect(code.indexOf("class Counter ")).toBeLessThan(code.indexOf("class CounterNotebook "))
  })

  test("written as code spell, in memory, it compiles to the same program", () => {
    const written = SX.CodeSpellWriter.write(COUNTER, {
      path: "/Counter.spellx",
      // the project's own views, as the editor reads them off the parse
      componentTag: (word) => (word === "counter" ? "test-project-counter" : SP.ComponentPacks.tagFor(word, "en"))
    })
    expect(written).toContain("counter notebook is a notebook:\n\t- to draw its content:\n\t\t<markdown>\n")
    expect(written).toContain('\t\t<example "one counter">\n\t\t\t<test-project-counter/>\n\t\t</example>\n')
    expect(written).toMatch(/\nstart counter notebook\n$/)
    const twin = compiled(written, "/Counter.spell")
    expect(twin.errors).toEqual([])
    expect(twin.code).toBe(compiled(COUNTER).code)
  })

  test("its chunk tree keeps every cell where it's written:  prose, its template, its examples", () => {
    const file = SX.SpellxView.read(COUNTER, { path: "/Counter.spellx" })
    expect(file.diagnostics).toEqual([])
    const [notebook] = file.nodes
    expect(notebook).toMatchObject({ kind: "template", type: "notebook", name: "counter notebook" })
    const cells = notebook!.kind === "template" ? notebook.children : []
    expect(cells.map((cell) => (cell.kind === "element" ? `<${cell.name}>` : cell.kind))).toEqual([
      "prose",
      "template",
      "prose",
      "<example>",
      "prose",
      "<text>"
    ])
    const example = cells[3]
    expect(example?.kind === "element" && example.attributes[0]).toMatchObject({ name: "name", value: "one counter" })
  })

  test("locked, in Spanish:  `<encanto-cuaderno ... bloqueado>` is `su candado es bloqueado`", () => {
    const text = [
      '<encanto-cuaderno "cuaderno del contador" bloqueado>',
      "\t# Un contador",
      '\t<encanto-vista "contador">',
      '\t\t<propiedad "cuenta">un número</>',
      '\t\t<dibujar><botón>{"Clics: " + su cuenta}</botón></dibujar>',
      "\t</encanto-vista>",
      '\t<ejemplo "un contador">',
      "\t\t<contador/>",
      "\t</ejemplo>",
      "</encanto-cuaderno>"
    ].join("\n")
    const { code, errors } = compiled(text, "/Contador.es.spellx")
    expect(errors).toEqual([])
    expect(code).toContain("export class CuadernoDelContador extends Notebook {")
    expect(code).toContain('return "bloqueado"')
    expect(code).toContain('h("spell-example", { name: "un contador" }, h("test-project-contador"))')
    expect(code).toMatch(/cuadernoDelContador\.start\(\)$/)
  })

  test("an `<html>` block:  its markup drawn as written, `<div>` the web's;  its twin, that markup alone", () => {
    const text = [
      '<spell-notebook "raw notebook">',
      "\t# Raw",
      "\t<html>",
      '\t\t<ui-button color="primary">Go</ui-button>',
      '\t\t<div class="note">hi</div>',
      "\t</html>",
      '\t<example "a button">',
      "\t\t<button>Go</button>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Raw.spellx")
    expect(errors).toEqual([])
    expect(code).toContain('h("ui-button", { color: "primary" }, "Go"),')
    expect(code).toContain('h("div", { class: "note" }, "hi"),')
    expect(code).toContain('h("spell-example", { name: "a button" }, h("ui-button", "Go"))')
    const written = SX.CodeSpellWriter.write(text, { path: "/Raw.spellx" })
    expect(written).toContain('\t\t<ui-button color="primary">Go</ui-button>\n\t\t<div class="note">hi</div>\n')
    expect(compiled(written, "/Raw.spell").code).toBe(code)
    // a cell of its own in the chunk tree
    const [notebook] = SX.SpellxView.read(text, { path: "/Raw.spellx" }).templates
    expect(notebook!.children.map((cell) => (cell.kind === "declaration" ? cell.type : cell.kind))).toEqual([
      "prose",
      "html",
      "element"
    ])
  })

  test("`<html>` and `<markdown>` blocks inside markup:  drawn in place, `<img>` the web's;  the twin compiles the same", () => {
    const text = [
      '<spell-notebook "avatar notebook">',
      '\t<segment label="Image">',
      "\t\t<markdown>",
      "\t\t\tSlot your own `<img>`.",
      "\t\t</markdown>",
      '\t\t<example description="A slotted image.">',
      "\t\t\t<html>",
      '\t\t\t\t<ui-avatar><img src="joe.jpg" alt="Joe" /></ui-avatar>',
      "\t\t\t\t<span>hi</span>",
      "\t\t\t</html>",
      "\t\t</example>",
      "\t</segment>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Avatar.spellx")
    expect(errors).toEqual([])
    expect(code).toContain(
      [
        '      h("spell-example", { description: "A slotted image." },',
        "        [",
        '          h("ui-avatar", h("img", { src: "joe.jpg", alt: "Joe" })),',
        '          h("span", "hi")',
        "        ]"
      ].join("\n")
    )
    expect(code).not.toContain('h("html"')
    const written = SX.CodeSpellWriter.write(text, { path: "/Avatar.spellx" })
    expect(compiled(written, "/Avatar.spell").code).toBe(code)
  })

  test("an attribute starting `on` is a handler only before a capital or a dash:  `only=` is text (P18)", () => {
    const text = [
      '<spell-notebook "api notebook">',
      "\t<html>",
      '\t\t<ui-docs-api tag="ui-avatar" only="attributes"></ui-docs-api>',
      "\t</html>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/API.spellx")
    expect(errors).toEqual([])
    expect(code).toContain('h("ui-docs-api", { tag: "ui-avatar", only: "attributes"')
  })

  // epic `elemental-spell` P24:  Spell UI's pages hold JSON, markdown and CSS in `<script>`s
  test("a `<script>`'s or `<style>`'s text is drawn as written:  its `{`, `[` and lines its own", () => {
    const text = [
      '<spell-notebook "script notebook">',
      '\t<example "data">',
      "\t\t<html>",
      '\t\t\t<script type="application/json">',
      '\t\t\t\t{"days": [1, 3, 5]}',
      "\t\t\t\t[x]",
      "\t\t\t</script>",
      "\t\t\t<style>:root { --brand: red; }</style>",
      "\t\t</html>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Script.spellx")
    expect(errors).toEqual([])
    expect(code).toContain('h("script", { type: "application/json" }, "{\\"days\\": [1, 3, 5]}\\n[x]")')
    expect(code).toContain('h("style", ":root { --brand: red; }")')
    const written = SX.CodeSpellWriter.write(text, { path: "/Script.spellx" })
    expect(compiled(written, "/Script.spell").code).toBe(code)
  })

  test("a text's entities are its characters, as JSX reads them:  `&lt;` is `<`, `&#123;` is `{`", () => {
    const text = [
      '<spell-notebook "entity notebook">',
      '\t<example "code">',
      "\t\t<html>",
      "\t\t\t<code>&lt;ui-button&gt; &amp; &#123;x&#125;</code>",
      "\t\t</html>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const { code, errors } = compiled(text, "/Entity.spellx")
    expect(errors).toEqual([])
    expect(code).toContain('h("code", "<ui-button> & {x}")')
  })

  // epic `elemental-spell` P24:  `<text>B</text> <text>C</text>` was written `ui-textt>C`
  test("written as code spell, an element after a space on its line keeps its `<`", () => {
    const text = [
      '<spell-notebook "inline notebook">',
      "\t<example>",
      "\t\t<segment><text>B</text> <text>C</text></segment>",
      "\t</example>",
      "</spell-notebook>",
      ""
    ].join("\n")
    const written = SX.CodeSpellWriter.write(text, { path: "/Inline.spellx" })
    expect(written).toContain("<ui-segment><ui-text>B</ui-text> <ui-text>C</ui-text></ui-segment>")
    expect(compiled(written, "/Inline.spell").code).toBe(compiled(text, "/Inline.spellx").code)
  })

  test("an edit re-parses as a fresh parse would", () => {
    const project = incrementalSpellProject([{ path: "/Counter.spellx", contents: COUNTER }])
    for (const edit of [
      ["Clicked", "Pressed"],
      ["## Try it", "## Try this"],
      ["one counter", "a counter"]
    ]) {
      const contents = COUNTER.replace(edit[0]!, edit[1]!)
      project.update("/Counter.spellx", contents)
      expect(summarizeIncremental(project), edit[1]).toEqual(
        summarize(parseSpellProject([{ path: "/Counter.spellx", contents }]))
      )
    }
  })

  describe("SP.SpellProject.compileChunk():  one cell, compiled on its own", () => {
    test("an example:  its drawing, an expression", () => {
      const project = incrementalSpellProject([{ path: "/Counter.spellx", contents: COUNTER }])
      const text = COUNTER.replace("one counter", "a counter")
      const start = text.indexOf("<example")
      const end = text.indexOf("</example>") + "</example>".length
      const chunk = SP.SpellProject.compileChunk({
        into: project,
        path: "/Counter.spellx",
        text,
        span: { start, end },
        kind: "drawing"
      })
      expect(chunk).toEqual({
        code: 'h("spell-example", { name: "a counter" }, h("test-project-counter"))',
        errors: []
      })
    })

    test("a template:  its whole class, by its name", () => {
      const project = incrementalSpellProject([{ path: "/Counter.spellx", contents: COUNTER }])
      const text = COUNTER.replace("Clicked", "Pressed")
      const start = text.indexOf("<spell-view")
      const end = text.indexOf("</spell-view>") + "</spell-view>".length
      const chunk = SP.SpellProject.compileChunk({
        into: project,
        path: "/Counter.spellx",
        text,
        span: { start, end },
        kind: "template"
      })
      expect(chunk.className).toBe("Counter")
      expect(chunk.errors).toEqual([])
      expect(chunk.code).toMatch(/^class Counter extends View \{\n/)
      expect(chunk.code).toContain('"Pressed ",')
      expect(chunk.code).toMatch(/\n}$/)
    })

    test("an `<html>` block inside markup:  its markup, as an expression (P18)", () => {
      const text = [
        '<spell-notebook "api notebook">',
        '\t<segment label="Slots">',
        "\t\t<html>",
        '\t\t\t<ui-docs-api tag="ui-avatar" only="slots"></ui-docs-api>',
        "\t\t</html>",
        "\t</segment>",
        "</spell-notebook>",
        ""
      ].join("\n")
      const project = incrementalSpellProject([{ path: "/API.spellx", contents: text }])
      const start = text.indexOf("<html>")
      const end = text.indexOf("</html>") + "</html>".length
      const chunk = SP.SpellProject.compileChunk({
        into: project,
        path: "/API.spellx",
        text,
        span: { start, end },
        kind: "drawing"
      })
      expect(chunk.errors).toEqual([])
      expect(chunk.code).toContain('h("ui-docs-api", { tag: "ui-avatar", only: "slots" })')
    })

    test("a broken one:  its errors, on its lines", () => {
      const project = incrementalSpellProject([{ path: "/Counter.spellx", contents: COUNTER }])
      const text = COUNTER.replace("<counter/>", "<countr/>")
      const start = text.indexOf("<example")
      const end = text.indexOf("</example>") + "</example>".length
      const chunk = SP.SpellProject.compileChunk({
        into: project,
        path: "/Counter.spellx",
        text,
        span: { start, end },
        kind: "drawing"
      })
      expect(chunk.errors).toEqual([expect.stringMatching(/^14:2 <countr> isn't a component/)])
    })
  })
})

/** The Counter notebook, as P16's plan writes it (its `<section>` left out:  the tests' pack has none). */
const COUNTER = [
  '<spell-notebook "counter notebook">',
  "\t# A counter",
  "\tA button that counts its clicks.",
  "",
  '\t<spell-view "counter">',
  '\t\t<property "count">a number</>',
  '\t\t<action "create it">set its count to 0</>',
  '\t\t<action "count up">set its count to its count + 1</>',
  "\t\t<draw><button onClick={count up}>Clicked {its count} times</button></draw>",
  "\t</spell-view>",
  "",
  "\t## Try it",
  '\t<example "one counter">',
  "\t\t<counter/>",
  "\t</example>",
  "",
  "\t## Two of them",
  "\tEach counts on its own:",
  '\t<text color="grey">Click either one.</text>',
  "</spell-notebook>",
  ""
].join("\n")

/** `text`, one file at `path` of its own project, compiled:  its code without markers or comments, and its errors. */
function compiled(text: string, path = "/Counter.spellx") {
  const [file] = parseSpellProject([{ path, contents: text }]).files
  const code = file!.compiled
    .replace(/\/\*! SPELL: DECLARES[^]*?\*\/\n?/g, "")
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("//"))
    .join("\n")
  return { code, errors: file!.errors }
}
