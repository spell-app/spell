import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { DefaultsTable } from "spell/ui/tools/DefaultsTable"
import { DEFAULTS_TABLE } from "spell/ui/vocabulary/defaults.generated"
import { HELP_TABLE, SHARED_HELP } from "spell/ui/vocabulary/help.generated"

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
