import { describe, expect, it } from "vite-plus/test"

import { BenchEdits } from "spell-ui/docs-components/ui-docs-theme-bench/BenchEdits"
import { BenchTokens } from "spell-ui/docs-components/ui-docs-theme-bench/BenchTokens"
import type { BenchEditSet } from "spell-ui/docs-components/ui-docs-theme-bench/UIDocsThemeBench.types"

/** Two small theme files:  `base`, and `kid` on it. */
const tokens = new BenchTokens({
  themes: {
    base: {
      surfaces: { panel: { light: "#ffffff", dark: "#101010" } },
      own: { "base-bar": "#eeeeee" },
      components: { menu: { "segmented-background": "{own.base-bar}" } }
    },
    kid: { extends: "base", own: { "kid-glow": "#ff00ff" } }
  },
  palettes: {}
})

describe("BenchEdits.set() / reset()", () => {
  it("keeps a value for both schemes, or one per scheme, without touching other themes", () => {
    let edits: BenchEditSet = {}
    edits = BenchEdits.set(edits, { theme: "kid", token: "--ui-radius", value: "8px" })
    edits = BenchEdits.set(edits, { theme: "kid", token: "--ui-surface", value: "#fafafa", scheme: "light" })
    edits = BenchEdits.set(edits, { theme: "kid", token: "--ui-surface", value: "#000000", scheme: "dark" })
    expect(edits).toEqual({
      kid: { "--ui-radius": { both: "8px" }, "--ui-surface": { light: "#fafafa", dark: "#000000" } }
    })
    expect(BenchEdits.valueFor(edits, "kid", "--ui-surface", "dark")).toBe("#000000")
    expect(BenchEdits.count(edits, "kid")).toBe(2)
    expect(BenchEdits.reset(edits, "kid", "--ui-radius")).toEqual({
      kid: { "--ui-surface": { light: "#fafafa", dark: "#000000" } }
    })
    expect(BenchEdits.reset(edits, "kid")).toEqual({})
  })
})

describe("BenchEdits.css()", () => {
  it("lays each tuning on :root, a scheme's under its class, important", () => {
    const edits: BenchEditSet = {
      kid: { "--ui-radius": { both: "8px" }, "--ui-surface": { dark: "#000000" } }
    }
    expect(BenchEdits.css(edits, "kid")).toBe(
      ":root {\n  --ui-radius: 8px !important;\n}\n:root.ui-dark {\n  --ui-surface: #000000 !important;\n}"
    )
    expect(BenchEdits.css(edits, "base")).toBe("")
  })
})

describe("BenchEdits.themeFile()", () => {
  it("writes the tunings in the file's nested groups, a pair's other half from what the theme extends", () => {
    const edits: BenchEditSet = {
      kid: {
        "--ui-surface": { light: "rgb(250 250 250 / 0.5)" },
        "--ui-menu-segmented-background": { both: "#123456" },
        "--kid-glow": { both: "rgba(255, 0, 255, 1)" },
        "--spell-pane-radius": { both: "20px" }
      }
    }
    const text = BenchEdits.themeFile(edits, "kid", tokens)
    expect(text.split("\n")[0]).toBe("// kid.theme.json5:  merge these into the file, then `yarn gen:styles`")
    expect(JSON.parse(text.slice(text.indexOf("{")))).toEqual({
      surfaces: { panel: { light: "#fafafa80", dark: "#101010" } },
      components: { menu: { "segmented-background": "#123456" } },
      own: { "kid-glow": "#ff00ff" }
    })
  })

  it("the editor's own tokens:  a rule for its sheet, not the theme file", () => {
    const edits: BenchEditSet = { kid: { "--spell-pane-radius": { both: "20px" } } }
    expect(BenchEdits.themeFile(edits, "kid", tokens)).toBe("")
    expect(BenchEdits.editorCss(edits, "kid", tokens)).toContain(
      ':root[data-spell-theme="kid"] {\n  --spell-pane-radius: 20px;\n}'
    )
  })
})

describe("BenchEdits.hex()", () => {
  it("writes plain rgb() colours as hex, the alpha kept when it isn't 1", () => {
    expect(BenchEdits.hex("rgb(255 255 255 / 0.5)")).toBe("#ffffff80")
    expect(BenchEdits.hex("rgba(0, 0, 0, 1)")).toBe("#000000")
    expect(BenchEdits.hex("0 1px 2px rgb(0 0 0 / 30%)")).toBe("0 1px 2px #0000004d")
    expect(BenchEdits.hex("blur(20px)")).toBe("blur(20px)")
  })
})
