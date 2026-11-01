import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"
import { SPACES } from "spell/app/spaces"

/** Spell UI, as a spellx drawing names its components bare (epic `elemental-spell` P7, Q46). */
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

  test("loading spaces registers it:  a spellx drawing's <button> compiles to ui-button", () => {
    const contents = ['<spell-view "card">', "\t<draw>", "\t\t<button>Go</>", "\t</draw>", "</spell-view>"].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spellml", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-button", "Go")')
  })

  test("<json> is ui-json (P31):  its text as written, braces and brackets JSON's", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("json", "en")).toBe("ui-json")
    expect(SPACES.SPELL_UI_PACK.tagFor("json", "es")).toBe("es-json")
    const contents = [
      '<spell-view "card">',
      "\t<draw>",
      "\t\t<json>",
      '\t\t\t{ "label": "[not a fill-in]", "children": [{ "label": "x" }] }',
      "\t\t</>",
      '\t\t<json source="/data.json"/>',
      "\t</draw>",
      "</spell-view>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spellml", contents }]).files
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
      '<spell-view "card">',
      "\t<draw>",
      "\t\t<tree-diagram>",
      '\t\t\t<tree-node "If" edge-label="body">',
      '\t\t\t\t<tree-node "Print"/>',
      "\t\t\t</tree-node>",
      "\t\t</tree-diagram>",
      "\t</draw>",
      "</spell-view>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spellml", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-tree-node"')
    expect(file!.compiled).toMatch(/label: "If"/)
  })

  test("<space/> is ui-space (<espacio/> in Spanish):  a drawing's line break (P28)", () => {
    expect(SPACES.SPELL_UI_PACK.tagFor("space", "en")).toBe("ui-space")
    expect(SPACES.SPELL_UI_PACK.tagFor("espacio", "es")).toBe("es-espacio")
    const contents = [
      '<spell-view "card">',
      "\t<draw>",
      "\t\t<button>Go</>",
      "\t\t<space fluid/>",
      "\t</draw>",
      "</spell-view>"
    ].join("\n")
    const [file] = parseSpellProject([{ path: "/card.spellml", contents }]).files
    expect(file!.errors).toEqual([])
    expect(file!.compiled).toContain('h("ui-space"')
  })
})
