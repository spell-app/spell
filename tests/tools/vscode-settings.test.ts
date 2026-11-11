import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import JSON5 from "json5"
import { describe, expect, test } from "vite-plus/test"

/**
 * The kit's VS Code settings (`.vscode/settings.json`, epic `epic-engine` P73):  what makes a save format with oxfmt
 * in every window, whose first folder is always the kit's root.
 * - Before P73 they were app's own, which VS Code never read once app became a folder of the one repo.
 */

/** the kit's root:  `tests/tools/` is two folders down */
const KIT = join(import.meta.dirname, "..", "..")
/** oxfmt, through the Oxc extension */
const OXC = "oxc.oxc-vscode"
/** every language oxfmt formats;  NOT Markdown, which the `fmt` settings ignore */
const LANGUAGES = [
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "json",
  "jsonc",
  "css",
  "less",
  "yaml"
]

const settings = JSON5.parse(readFileSync(join(KIT, ".vscode", "settings.json"), "utf8")) as Record<string, any>

describe("the kit's VS Code settings", () => {
  test("format on save with the Oxc extension, for every file and each language", () => {
    expect(settings["editor.defaultFormatter"]).toBe(OXC)
    expect(settings["editor.formatOnSave"]).toBe(true)
    for (const language of LANGUAGES) {
      expect(settings[`[${language}]`], language).toEqual({
        "editor.defaultFormatter": OXC,
        "editor.formatOnSave": true
      })
    }
    expect(settings["[markdown]"]).toBeUndefined()
  })

  test("nested configs stay on:  each big folder's own `vite.config.ts` is read", () => {
    expect(settings["oxc.disableNestedConfig"]).toBeUndefined()
    expect(settings["oxc.fmt.disableNestedConfig"]).toBeUndefined()
  })

  test("the people schemas are under app's build folder", () => {
    const urls = (settings["json.schemas"] as { url: string }[]).map(({ url }) => url)
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(url).toMatch(/^\.\/app\/build\//)
  })

  test("no folder below the root keeps settings VS Code would never read", () => {
    for (const folder of ["parser", "ui", "epic", "app"]) {
      expect(existsSync(join(KIT, folder, ".vscode", "settings.json")), folder).toBe(false)
    }
  })
})
