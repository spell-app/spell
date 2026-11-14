import { describe, expect, test } from "vite-plus/test"

import { withoutAccents } from "spell/util/string"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import { ROOT_CATALOG } from "spell/ui/components/ui-root/UIRoot.catalog"
import { es } from "spell/ui/components/components.es"
import { SPACES } from "spell/app/spaces"

/** Spell UI, as a drawing names its components bare (epic `elemental-spell` P7, Q46). */
describe("SPELL_UI_PACK", () => {
  test("English:  a catalog tag without its ui-", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("button", "en")).toBe("ui-button")
    expect(SPACES.SPELL_UI_PACK.tagFor("text", "en")).toBe("ui-text")
    expect(SPACES.SPELL_UI_PACK.tagFor("div", "en")).toBeUndefined()
  })

  test("Spanish:  Spell UI's Spanish name, es- before it, accents or not", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("botón", "es")).toBe("es-boton")
    expect(SPACES.SPELL_UI_PACK.tagFor("boton", "es")).toBe("es-boton")
    expect(SPACES.SPELL_UI_PACK.tagFor("texto", "es")).toBe("es-texto")
  })

  test("loading spaces registers it:  a drawing's <button> compiles to ui-button", () => {
    const contents = ['a "card" is a view:', "\tto draw it:", "\t\t<button>Go</>"].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-button", "Go")')
  })

  test("<acción> takes Spell UI's Spanish names, as a Spanish ui-* tag does:  the same button as English's (P53)", () => {
    expect(
      SPACES.SPELL_UI_PACK.readAttribute!({ tag: "ui-button", attribute: "tamano", value: "pequeño" }, "es")
    ).toEqual({
      attribute: "size",
      value: "small"
    })
    expect(SPACES.SPELL_UI_PACK.readAttribute!({ tag: "ui-button", attribute: "basico", value: true }, "es")).toEqual({
      attribute: "basic",
      value: true
    })
    expect(
      SPACES.SPELL_UI_PACK.readAttribute!({ tag: "ui-button", attribute: "icono", value: "refresh" }, "es")
    ).toEqual({
      attribute: "icon",
      value: "refresh"
    })
    expect(
      SPACES.SPELL_UI_PACK.readAttribute!({ tag: "ui-button", attribute: "class", value: "x" }, "es")
    ).toBeUndefined()
    const drawn = (path: string, lines: string[]) => {
      const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
      expect(file!.errors).toEqual([])
      return /core\.drawAction\(this, "undo"[^)]*\)/.exec(file!.compiled)?.[0]
    }
    const english = drawn("/card.spell", [
      'a "card" is a view',
      "\tto draw it",
      "\t\t<buttons>",
      '\t\t\t<action "undo" icon-only basic size="small" icon="refresh" class="Undo"/>',
      "\t\t</>"
    ])
    const spanish = drawn("/carta.es.spell", [
      'una "carta" es una vista',
      "\tpara dibujar eso",
      "\t\t<botones>",
      '\t\t\t<acción "deshacer" solo-icono basico tamano="pequeño" icono="refresh" class="Undo"/>',
      "\t\t</>"
    ])
    expect(english).toBe(
      'core.drawAction(this, "undo", { class: "Undo", "icon-only": true, basic: true, size: "small", icon: "refresh" })'
    )
    expect(spanish).toBe(english)
  })

  test("<json> is ui-json (P31):  its text as written, braces and brackets JSON's", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("json", "en")).toBe("ui-json")
    expect(SPACES.SPELL_UI_PACK.tagFor("json", "es")).toBe("es-json")
    const contents = [
      'a "card" is a view:',
      "\tto draw it:",
      "\t\t<json>",
      '\t\t\t{ "label": "[not a fill-in]", "children": [{ "label": "x" }] }',
      "\t\t</>",
      '\t\t<json source="/data.json"/>'
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-json", ')
    expect(file!.compiled).toContain("[not a fill-in]")
    expect(file!.compiled).toContain("/data.json")
  })

  test('<tree-node "If"> is ui-tree-node (P32):  a bare quoted name is its label;  <nodo-arbol> in Spanish', () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("tree-node", "en")).toBe("ui-tree-node")
    expect(SPACES.SPELL_UI_PACK.tagFor("nodo-arbol", "es")).toBe("es-nodo-arbol")
    expect(SPACES.SPELL_UI_PACK.tagFor("nodo-árbol", "es")).toBe("es-nodo-arbol")
    const contents = [
      'a "card" is a view:',
      "\tto draw it:",
      "\t\t<tree-diagram>",
      '\t\t\t<tree-node "If" edge-label="body">',
      '\t\t\t\t<tree-node "Print"/>',
      "\t\t\t</tree-node>",
      "\t\t</tree-diagram>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-tree-node"')
    expect(file!.compiled).toMatch(/label: "If"/)
  })

  test("<space/> is ui-space (<espacio/> in Spanish):  a drawing's line break (P28)", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("space", "en")).toBe("ui-space")
    expect(SPACES.SPELL_UI_PACK.tagFor("espacio", "es")).toBe("es-espacio")
    const contents = ['a "card" is a view:', "\tto draw it:", "\t\t<button>Go</>", "\t\t<space fluid/>"].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-space"')
  })

  test("<comment> in a drawing is ui-comment (epic `data` P31, I60):  a page has no notes", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("comment", "en")).toBe("ui-comment")
    const contents = [
      'a "post" is a view:',
      "\tto draw it:",
      "\t\t<comment>",
      "\t\t\t<content>",
      "\t\t\t\t<description>hello</description>",
      "\t\t\t</content>",
      "\t\t</comment>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/post.spell", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-comment"')
    expect(file!.compiled).toContain('h("ui-description"')
  })
})

/**
 * A page's control tags keep their short words, `<if>`, `<for each>` (epic `data` P31, Q27):
 * so no Spell UI element may take one as its short name, or a drawing could never draw it.
 */
describe("no Spell UI element's short name is a page's control word", () => {
  test.each([
    ["en", Object.keys(ROOT_CATALOG).map((tag) => tag.replace(/^ui-/, ""))],
    ["es", Object.values(es.tags ?? {})]
  ])("%s", (lang, names) => {
    const page = SP.Language.for(lang).words.page!
    expect(page.prefix).toBe(lang === "es" ? "encanto" : "spell")
    const words = Object.keys(page.controls)
    const firstWords = new Set(words.map((word) => withoutAccents(word.split(" ")[0]!)))
    expect(names.length).toBeGreaterThan(50)
    expect(names.filter((name) => firstWords.has(withoutAccents(name)))).toEqual([])
  })
})
