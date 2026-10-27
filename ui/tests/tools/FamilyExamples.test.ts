import { basename, join } from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { FamilyExamples } from "spell-ui/tools/FamilyExamples"
import { COMPONENTS, SPELL_UI_ROOT } from "spell-ui/tools/tools.types"

/** Spell UI's families. */
const FAMILIES = join(SPELL_UI_ROOT, COMPONENTS)

describe("FamilyExamples.files()", () => {
  test("puts a family's MAIN file first:  `types.html`, else the one `MAIN_FILES` names;  the rest A-Z", () => {
    const button = FamilyExamples.files(FAMILIES, "ui-button").map((file) => basename(file))
    expect(button[0]).toBe("types.html")
    expect(button.slice(1)).toEqual(button.slice(1).toSorted())
    expect(FamilyExamples.files(FAMILIES, "ui-parts").map((file) => basename(file))[0]).toBe("header.html")
    expect(FamilyExamples.files(FAMILIES, "no-such-family")).toEqual([])
  })
})

describe("FamilyExamples.sections()", () => {
  test("reads each top-level section:  its `<h4>` the title, its class, its body dedented;  comments left out", () => {
    const html = [
      "<!-- the file's note -->",
      '<div class="ui-stack">',
      "  <section>",
      "    <h4>Button</h4>",
      "    <ui-button>Follow</ui-button>",
      "  </section>",
      "",
      '  <section class="ui-dark">',
      "    <h4>Inverted</h4>",
      "    <ui-segment>",
      "      <!-- a note,",
      "        two lines long -->",
      "      <ui-button>Save</ui-button>",
      "    </ui-segment>",
      "  </section>",
      "</div>"
    ].join("\n")
    expect(FamilyExamples.sections(html)).toEqual([
      { title: "Button", className: undefined, body: ["<ui-button>Follow</ui-button>"] },
      {
        title: "Inverted",
        className: "ui-dark",
        body: ["<ui-segment>", "  <ui-button>Save</ui-button>", "</ui-segment>"]
      }
    ])
  })

  test("a file without sections is ONE untitled section;  a `<section>` with its own attributes is markup", () => {
    const html = [
      "<!-- a note -->",
      '<div class="ui-cluster">',
      '  <section id="content">x</section>',
      "</div>",
      ""
    ].join("\n")
    expect(FamilyExamples.sections(html)).toEqual([
      { title: "", body: ['<div class="ui-cluster">', '  <section id="content">x</section>', "</div>"] }
    ])
  })
})
