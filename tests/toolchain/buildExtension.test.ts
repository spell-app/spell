import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { buildExtension } from "spell/toolchain/buildExtension"

/**
 * `buildExtension()` (the toolchain's), on made-up extensions in a temp folder:  each its own `src/extension.ts`.
 * - They import no package of ours:  outside the kit, no `node_modules` finds one (`sourceNames()` is the kit's own).
 */
describe("buildExtension()", () => {
  test("bundles src/extension.ts into out/extension.js:  `vscode` left out, the constants built in", async () => {
    const folder = extension([
      `import * as vscode from "vscode"`,
      `declare const ENGINE_ROOT: string`,
      `export const root = ENGINE_ROOT`,
      `export function activate(): void {}`,
      // read as the file loads, as `class X extends vscode.TreeItem` would:  the load check's stub answers it
      `export const register = vscode.commands.registerCommand`
    ])
    await buildExtension({ folder, constants: { ENGINE_ROOT: "/the/checkout" } })
    const bundle = readFileSync(join(folder, "out", "extension.js"), "utf8")
    expect(bundle).toContain(`require("vscode")`)
    expect(bundle).toContain(`"/the/checkout"`)
  })

  // what it guards against:  every window's spell-epic extension dead (epic `epic-engine` I76)
  test("a bundle that throws as it loads fails the build", async () => {
    const folder = extension([`throw new Error("broken as it loads")`, `export function activate(): void {}`])
    await expect(buildExtension({ folder })).rejects.toThrow("broken as it loads")
  })
})

////////////////
// ## Helpers
////////////////

const TEMP = mkdtempSync(join(tmpdir(), "build-extension-"))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** A made-up extension in a folder of its own, its `src/extension.ts` these `lines`;  its folder. */
function extension(lines: string[]): string {
  const folder = mkdtempSync(join(TEMP, "extension-"))
  mkdirSync(join(folder, "src"))
  writeFileSync(join(folder, "src", "extension.ts"), `${lines.join("\n")}\n`)
  return folder
}
