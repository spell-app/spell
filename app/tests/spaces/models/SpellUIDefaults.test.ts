import { describe, expect, test } from "vite-plus/test"

import { SpellUIDefaults } from "spell/app/spaces/models/SpellUIDefaults"

describe("SpellUIDefaults.read()", () => {
  test("reads an English sample in Spell UI's own names", () => {
    expect(SpellUIDefaults.read({ tag: "ui-button", attribute: "appearance", value: "pill" }, "en")).toEqual({
      tag: "ui-button",
      attribute: "appearance",
      value: "pill"
    })
    expect(SpellUIDefaults.read({ tag: "button", attribute: "fluid", value: true }, "en")).toEqual({
      tag: "ui-button",
      attribute: "fluid",
      value: true
    })
  })

  test("reads a Spanish sample, by any of its tag's spellings, into English", () => {
    for (const tag of ["es-boton", "botón", "ui-botón", "ui-button"]) {
      expect(SpellUIDefaults.read({ tag, attribute: "apariencia", value: "píldora" }, "es"), tag).toEqual({
        tag: "ui-button",
        attribute: "appearance",
        value: "pill"
      })
    }
    // a segment's look, in Spanish too (epic `language` T42):  `<es-segmento apariencia="elevado">`
    expect(SpellUIDefaults.read({ tag: "es-segmento", attribute: "apariencia", value: "elevado" }, "es")).toEqual({
      tag: "ui-segment",
      attribute: "appearance",
      value: "raised"
    })
  })

  test("says what's wrong, in the sample's language:  widget, attribute, content, value", () => {
    expect(SpellUIDefaults.read({ tag: "ui-frobber", attribute: "size", value: "big" }, "en")).toEqual({
      problem: "unknown-tag"
    })
    expect(SpellUIDefaults.read({ tag: "ui-button", attribute: "colour", value: "red" }, "en")).toMatchObject({
      problem: "unknown-attribute",
      tag: "ui-button",
      attributes: expect.arrayContaining(["appearance", "size", "color"])
    })
    expect(SpellUIDefaults.read({ tag: "ui-button", attribute: "label", value: "Go" }, "en")).toMatchObject({
      problem: "content"
    })
    expect(SpellUIDefaults.read({ tag: "ui-button", attribute: "appearance", value: "round" }, "en")).toMatchObject({
      problem: "bad-value",
      values: expect.arrayContaining(["basic", "pill"])
    })
    expect(SpellUIDefaults.read({ tag: "es-boton", attribute: "apariencia", value: "redonda" }, "es")).toMatchObject({
      problem: "bad-value",
      tag: "es-boton",
      values: expect.arrayContaining(["píldora"])
    })
  })
})
