import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { DefaultsTable } from "spell/ui/tools/DefaultsTable"
import { DEFAULTS_TABLE } from "spell/ui/vocabulary/defaults.generated"
import { HELP_TABLE, SHARED_HELP } from "spell/ui/vocabulary/help.generated"
import { HOOKS_TABLE } from "spell/ui/vocabulary/hooks.generated"
import { PARTS_OF_SPEECH } from "spell/ui/vocabulary/partsOfSpeech.generated"

/** Spell UI's folder. */
const UI = fileURLToPath(new URL("../../", import.meta.url))

describe("DefaultsTable.output()", () => {
  test("is current (else run `yarn site:data`)", async () => {
    const [file, text] = await DefaultsTable.output(UI, `${UI}src/components`)
    expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })

  test("its help is current too (else run `yarn site:data`)", async () => {
    const [file, text] = await DefaultsTable.helpOutput(UI, `${UI}src/components`)
    expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })

  test("its parts of speech are current too (else run `yarn site:data`)", async () => {
    const [file, text] = await DefaultsTable.partsOfSpeechOutput(UI, `${UI}src/components`)
    expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })

  test("its hooks are current too (else run `yarn site:data`)", async () => {
    const [file, text] = await DefaultsTable.hooksOutput(UI, `${UI}src/components`)
    expect(readFileSync(file, "utf8") === text, file).toBe(true)
  })

  test("...each tag's hooks and their words:  `<ui-tree>`'s `rowClass`", () => {
    expect(HOOKS_TABLE["ui-tree"]).toEqual([{ name: "rowClass", words: "give the row class of (an item)" }])
    expect(HOOKS_TABLE["ui-button"]).toBeUndefined()
  })

  test("...each tag's band colour, as its vocabulary says (epic `language` T124)", () => {
    expect(PARTS_OF_SPEECH["ui-segment"]).toBe("structure")
    expect(PARTS_OF_SPEECH["ui-button"]).toBe("action")
    expect(PARTS_OF_SPEECH["ui-header"]).toBe("property")
    expect(PARTS_OF_SPEECH["ui-divider"]).toBe("plain")
  })

  test("holds each tag's own attributes, cut down:  `<ui-button appearance>` and its words", () => {
    const appearance = DEFAULTS_TABLE["ui-button"]?.find((attribute) => attribute.name === "appearance")
    expect(appearance).toEqual({
      name: "appearance",
      kind: "multiple",
      group: "appearance",
      values: expect.arrayContaining(["pill"])
    })
  })

  test("its help says what each tag and attribute is, in one sentence:  `<ui-button color>`, `disabled`", () => {
    expect(HELP_TABLE["ui-button"]?.description).toMatch(/\.$/)
    expect(HELP_TABLE["ui-button"]?.attributes.color).toMatch(/\S/)
    expect(SHARED_HELP.disabled).toMatch(/\S/)
  })

  test("...and which tags hold nothing (no default slot), for an editor to write them closed (epic `editor` I70)", () => {
    expect(HELP_TABLE["ui-icon"]?.empty).toBe(true)
    expect(HELP_TABLE["ui-input"]?.empty).toBe(true)
    expect(HELP_TABLE["ui-button"]?.empty).toBeUndefined()
    expect(HELP_TABLE["ui-content"]?.empty).toBeUndefined()
  })
})
