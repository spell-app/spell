import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { BubblyValues } from "spell/app/app/components/spell-code/BubblyValues"

/** The look's sheet and its table, beside `BubblyValues`. */
const FOLDER = dirname(createRequire(import.meta.url).resolve("spell/app/app/components/spell-code/BubblyValues.ts"))
const SHEET = readFileSync(join(FOLDER, "bubbly.css"), "utf8")

describe("BubblyValues.of()", () => {
  test("works out each setting in each scheme:  `light-dark()`, `color-mix()`, `var()`", () => {
    const { settings, parts } = BubblyValues.of(SHEET)
    expect(settings["--bubbly-paper"]).toEqual({ light: "#ffffff", dark: "#1c1b22" })
    expect(settings["--bubbly-font-size"]).toEqual({ light: "16px", dark: "16px" })
    // 20% of the thing hue over white, 34% over the dark paper
    expect(parts.thing!["--bubbly-pill"]).toEqual({ light: "#e5def7", dark: "#3d315f" })
    expect(parts.action!["--bubbly-hue"]!.light).toBe("#2f9e5b")
  })

  test("its table beside the sheet is up to date:  `yarn tsx scripts/bubbly-values.ts` writes it", () => {
    const table = JSON.parse(readFileSync(join(FOLDER, "bubbly.values.json"), "utf8"))
    expect(table).toEqual(BubblyValues.of(SHEET))
  })
})
