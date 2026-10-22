import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"
import { RuleTester } from "vite-plus/lint/plugins-dev"

import { IMPORT_RULES, importNameFor } from "spell-kit/toolchain/lint/imports"

/**
 * The `spell/*` lint rule (`lint.imports.ts`, the toolchain's):  what it flags, and what it lets through.
 * - The rule reads where a file IS, so every case names its file, from the kit `spell-kit` (`at()`):
 *   the kit and its child repos as they are on disk, each one package with its code under ONE `src/`.
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
      at("src/element/a.ts", `import { kebabCase } from "spell-kit/util/string"`),
      at("spell-ui/src/runtime/Focus.ts", `import { E } from "spell-kit/element"`),
      // a same-folder peer
      at("src/element/a.ts", `import { DOMElement } from "./DOMElement"`),
      // a climb to a file outside `src/`:  a config, a glue tool
      at("spell-app/app/vite.shared.ts", `import { x } from "../vite.config.ts"`),
      at("tests/tools/a.test.ts", `import { ReadmeCheck } from "../../tools/readme-check.ts"`),
      at("spell-lang/tests/core/a.test.ts", `import { x } from "../../vitest.config.ts"`),
      // a glob names files, not a module
      at("tests/element/a.test.ts", `const files = import.meta.glob("../../src/element/**/*.ts")`),
      // a file path read, not imported
      at("src/server/a.ts", `const root = new URL("../..", import.meta.url)`),
      // a package name of another repo
      at("spell-app/src/app/a.ts", `import { UI } from "spell-ui/core"`)
    ],
    invalid: [
      climbs("src/element/a.ts", `import { x } from "../util/string.ts"`, "spell-kit/util/string"),
      climbs("src/element/a.ts", `import { U } from "../util"`, "spell-kit/util"),
      climbs("tests/element/a.test.ts", `import { E } from "../../src/element/index.ts"`, "spell-kit/element"),
      climbs("spell-ui/tests/tools/a.test.ts", `import { Tool } from "../../src/tools/Tool.ts"`, "spell-ui/tools/Tool"),
      climbs("spell-app/src/app/a.ts", "const m = await import(`../../../spell-ui/src/index.ts`)", "spell-ui"),
      climbs("spell-app/src/app/a.ts", `export * from "../lsp/index.ts"`, "spell-app/lsp"),
      climbs("spell-app/tests/app/a.test.ts", `vi.mock("../../src/spaces/index.ts")`, "spell-app/spaces"),
      climbs(
        "spell-app/src/app/a.ts",
        `type T = import("../../../spell-lang/src/core/model").Thing`,
        "spell-lang/core/model"
      ),
      climbs(
        "spell-ui/src/a.ts",
        `declare module "../../src/element/vocabulary.types" {}`,
        "spell-kit/element/vocabulary.types"
      ),
      climbs(
        "spell-ui/src/components/ui-x/a.ts",
        `import css from "../ui-parts/UIParts.css?inline"`,
        "spell-ui/components/ui-parts/UIParts.css"
      )
    ]
  })
})

describe("importNameFor():  a file's import name, by where it is", () => {
  test("a file under a package's src/:  the package name + its path, no extension, no index", () => {
    expect(importNameFor(join(TOP, "src/util/string.ts"))).toEqual({ pkg: "spell-kit", name: "spell-kit/util/string" })
    expect(importNameFor(join(TOP, "src/element/index.ts"))).toEqual({ pkg: "spell-kit", name: "spell-kit/element" })
    expect(importNameFor(join(TOP, "spell-ui/src/components/ui-button/UIButton.tsx"))).toEqual({
      pkg: "spell-ui",
      name: "spell-ui/components/ui-button/UIButton"
    })
    expect(importNameFor(join(TOP, "spell-ui/src/index.ts"))).toEqual({ pkg: "spell-ui", name: "spell-ui" })
  })
  test("outside any src/:  none", () => {
    expect(importNameFor(join(TOP, "tools/repos.ts"))).toBeUndefined()
    expect(importNameFor(join(TOP, "spell-lang/vite.config.ts"))).toBeUndefined()
    expect(importNameFor(join(TOP, "spell-ui/tests/a.test.ts"))).toBeUndefined()
  })
})

////////////////
// ## Helpers
////////////////

/** The kit `spell-kit`, holding every child repo:  this file is in its `tests/toolchain/`. */
const TOP = fileURLToPath(new URL("../../", import.meta.url))

/** A case:  `code`, in the file at `file` (from the kit). */
function at(file: string, code: string) {
  return { code, filename: join(TOP, file) }
}

/** A case the rule flags once, its message naming the import name `fix`. */
function climbs(file: string, code: string, fix: string) {
  return {
    ...at(file, code),
    errors: [{ message: new RegExp(`by its package name, \`${fix.replace(/[.?]/g, "\\$&")}\``) }]
  }
}
