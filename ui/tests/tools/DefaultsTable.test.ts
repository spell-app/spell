import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

import { DefaultsTable } from "spell/ui/tools/DefaultsTable"
import { DEFAULTS_TABLE } from "spell/ui/vocabulary/defaults.generated"

/** Spell UI's folder. */
const UI = fileURLToPath(new URL("../../", import.meta.url))

describe("DefaultsTable.output()", () => {
  test("is current (else run `yarn site:data`)", async () => {
    const [file, text] = await DefaultsTable.output(UI, `${UI}src/components`)
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
})
