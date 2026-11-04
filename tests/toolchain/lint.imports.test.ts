import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"
import { RuleTester } from "vite-plus/lint/plugins-dev"

import { IMPORT_RULES, importNameFor } from "spell/toolchain/lint/imports"

/**
 * The `spell/*` lint rule (`lint.imports.ts`, the toolchain's):  what it flags, and what it lets through.
 * - The rules read where a file IS, so every case names its file (`at()`), in a made-up kit (`KIT`):
 *   the kit and three of its folders (its `workspaces`, epic `repo-split` P20), each with its code under ONE `src/`,
 *   and a project beside it.
 * - Made up, not the kit on disk:  the rules find a file's package by the nearest `package.json`.
 */

////////////////
// ## The rule
////////////////

RuleTester.describe = describe
RuleTester.it = test

const tester = new RuleTester()

describe("spell/no-parent-import", () => {
  tester.run("no-parent-import", IMPORT_RULES["no-parent-import"], {
    valid: [
      // by package name, inside its own repo too
      at("src/element/a.ts", `import { kebabCase } from "spell/util/string"`),
      at("ui/src/runtime/Focus.ts", `import { E } from "spell/element"`),
      // a same-folder peer
      at("src/element/a.ts", `import { DOMElement } from "./DOMElement"`),
      // a climb to a file outside `src/`:  a config, a glue tool
      at("app/app/vite.shared.ts", `import { x } from "../vite.config.ts"`),
      at("tests/tools/a.test.ts", `import { ReadmeCheck } from "../../tools/readme-check.ts"`),
      at("parser/tests/core/a.test.ts", `import { x } from "../../vitest.config.ts"`),
      // a glob names files, not a module
      at("tests/element/a.test.ts", `const files = import.meta.glob("../../src/element/**/*.ts")`),
      // a file path read, not imported
      at("src/server/a.ts", `const root = new URL("../..", import.meta.url)`),
      // a package name of another repo
      at("app/src/app/a.ts", `import { UI } from "spell/ui/core"`)
    ],
    invalid: [
      climbs("src/element/a.ts", `import { x } from "../util/string.ts"`, "spell/util/string"),
      climbs("src/element/a.ts", `import { U } from "../util"`, "spell/util"),
      climbs("tests/element/a.test.ts", `import { E } from "../../src/element/index.ts"`, "spell/element"),
      climbs("ui/tests/tools/a.test.ts", `import { Tool } from "../../src/tools/Tool.ts"`, "spell/ui/tools/Tool"),
      climbs("app/src/app/a.ts", "const m = await import(`../../../ui/src/index.ts`)", "spell/ui"),
      climbs("app/src/app/a.ts", `export * from "../lsp/index.ts"`, "spell/app/lsp"),
      climbs("app/tests/app/a.test.ts", `vi.mock("../../src/spaces/index.ts")`, "spell/app/spaces"),
      climbs("app/src/app/a.ts", `type T = import("../../../parser/src/core/model").Thing`, "spell/parser/core/model"),
      climbs("ui/src/a.ts", `declare module "../../src/element/vocabulary.types" {}`, "spell/element/vocabulary.types"),
      climbs(
        "ui/src/components/ui-x/a.ts",
        `import css from "../ui-parts/UIParts.css?inline"`,
        "spell/ui/components/ui-parts/UIParts.css"
      )
    ]
  })
})

describe("spell/no-upward-import", () => {
  tester.run("no-upward-import", IMPORT_RULES["no-upward-import"], {
    valid: [
      // down:  a folder uses the kit, and the folders before it
      at("app/src/app/a.ts", `import { UI } from "spell/ui/core"`),
      at("app/tests/a.test.ts", `import { P } from "spell/parser/parser"`),
      at("ui/src/a.ts", `import { E } from "spell/element"`),
      at("src/server/a.ts", `import { kebabCase } from "spell/util/string"`),
      // its own folder
      at("ui/src/a.ts", `import { E } from "spell/ui/core"`),
      // a library, a peer
      at("parser/src/a.ts", `import chalk from "chalk"`),
      at("parser/src/a.ts", `import { x } from "./b"`),
      // a project beside the kit uses any of them
      at("../lint-beside/src/a.ts", `import { UI } from "spell/app/app"`)
    ],
    invalid: [
      upward("src/cli/a.ts", `import { UI } from "spell/ui/core"`, "ui", "the kit"),
      upward("parser/src/a.ts", `import { UI } from "spell/ui/core"`, "ui", "parser"),
      upward("ui/tests/a.test.ts", `vi.mock("spell/app/app")`, "app", "ui"),
      upward("ui/vite.config.ts", "const m = await import(`spell/app/cli`)", "app", "ui")
    ]
  })
})

describe("importNameFor():  a file's import name, by where it is", () => {
  test("a file under a package's src/:  the package name + its path, no extension, no index", () => {
    expect(importNameFor(join(KIT, "src/util/string.ts"))).toEqual({ pkg: "spell", name: "spell/util/string" })
    expect(importNameFor(join(KIT, "src/element/index.ts"))).toEqual({ pkg: "spell", name: "spell/element" })
    expect(importNameFor(join(KIT, "ui/src/components/ui-button/UIButton.tsx"))).toEqual({
      pkg: "spell/ui",
      name: "spell/ui/components/ui-button/UIButton"
    })
    expect(importNameFor(join(KIT, "ui/src/index.ts"))).toEqual({ pkg: "spell/ui", name: "spell/ui" })
    expect(importNameFor(join(`${KIT}/../lint-beside`, "src/a.ts"))).toEqual({ pkg: "beside", name: "beside/a" })
  })
  test("outside any src/:  none", () => {
    expect(importNameFor(join(KIT, "tools/repos.ts"))).toBeUndefined()
    expect(importNameFor(join(KIT, "parser/vite.config.ts"))).toBeUndefined()
    expect(importNameFor(join(KIT, "ui/tests/a.test.ts"))).toBeUndefined()
  })
})

////////////////
// ## Helpers
////////////////

/**
 * A made-up kit `spell`, its folders `parser/`, `ui/` and `app/`, and a project beside it:  a `package.json` each,
 * all the rules read.
 */
const KIT = join(realpathSync(mkdtempSync(join(tmpdir(), "lint-imports-"))), "spell")
afterAll(() => rmSync(join(KIT, ".."), { recursive: true, force: true }))
for (const [folder, json] of [
  [".", { name: "spell", workspaces: ["parser", "ui", "app"] }],
  ["parser", { name: "spell-parser" }],
  ["ui", { name: "spell-ui" }],
  ["app", { name: "spell-app" }],
  ["../lint-beside", { name: "beside" }]
] as const) {
  mkdirSync(join(KIT, folder), { recursive: true })
  writeFileSync(join(KIT, folder, "package.json"), JSON.stringify(json))
}

/** A case:  `code`, in the file at `file` (from the made-up kit). */
function at(file: string, code: string) {
  return { code, filename: join(KIT, file) }
}

/** A case `no-upward-import` flags once:  `target`'s, above `from`. */
function upward(file: string, code: string, target: string, from: string) {
  return { ...at(file, code), errors: [{ message: new RegExp(`is ${target}'s, above ${from}:`) }] }
}

/** A case the rule flags once, its message naming the import name `fix`. */
function climbs(file: string, code: string, fix: string) {
  return {
    ...at(file, code),
    errors: [{ message: new RegExp(`by its package name, \`${fix.replace(/[.?]/g, "\\$&")}\``) }]
  }
}
