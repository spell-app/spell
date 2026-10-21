import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"
import { RuleTester } from "vite-plus/lint/plugins-dev"

import { IMPORT_RULES, packageOf } from "../../../toolchain/src/lint.imports.ts"

/**
 * The `spell/*` lint rules (`lint.imports.ts`, the toolchain's):  what each flags, and what it lets through.
 * - The rules read where a file IS, so every case names its file, from the kit `spell-kit` (`at()`).
 */

////////////////
// ## The rules
////////////////

RuleTester.describe = describe
RuleTester.it = test

const tester = new RuleTester()

describe("spell/no-cross-package-import", () => {
  tester.run("no-cross-package-import", IMPORT_RULES["no-cross-package-import"], {
    valid: [
      // its own package, by `../`, and other packages by alias or npm name
      at("spell-ui/src/runtime/Focus.ts", `import { E } from "../elements/index.ts"`),
      at("spell-app/spaces/src/server/node/environment.ts", `import { checkoutOf } from "spell-kit/server"`),
      at("spell-app/app/vite.config.ts", `import env from "spell-app/spaces/server/node/environment"`),
      // a package and its tests are ONE package:  a flat repo's `tests/`, a multi-package repo's `tests/<name>/`
      at("spell-ui/tests/tools/LintPatterns.test.ts", `import { Tool } from "../../tools/Tool.ts"`),
      at("tests/toolchain/src/a.test.ts", `import { x } from "../../../toolchain/src/lint.ts"`),
      // the kit's folders:  each a package, its tests in `tests/<folder>/`;  `$/` inside the kit
      at("element/src/a.ts", `import { camelCase } from "spell-kit/util/string"`),
      at("tests/element/src/a.test.ts", `import { E } from "../../../element/src/index.ts"`),
      at("spell-lang/core/vitest.config.ts", `const x = import("../tests/core/tests.types.ts")`),
      // a repo root's own files belong to no package
      at("spell-lang/core/vite.config.ts", `import { x } from "../vite.config.ts"`),
      at("spell-lang/tests/core/src/x.test.ts", `import { x } from "../../../vitest.config.ts"`),
      // a file at a multi-package repo's root is in no package itself
      at("spell-lang/vite.config.ts", `import { x } from "./core/vite.config.ts"`),
      // a file path, not a module:  no alias reaches it
      at(
        "spell-app/tests/cli/src/schemas.test.ts",
        `const f = new URL("../../spaces/@spell/test/x.ts", import.meta.url)`
      ),
      at("spell-app/tests/lsp/src/server.test.ts", `const dir = resolve(import.meta.dirname, "../../../cli")`),
      // a path built at run time
      at("spell-app/app/src/a.ts", "const m = await import(`../../../spell-ui/src/${name}.ts`)")
    ],
    invalid: [
      climbs(
        "spell-app/spaces/src/server/node/environment.ts",
        `import { x } from "../../../../../server/src/checkout.ts"`
      ),
      climbs("spell-app/app/vite.shared.ts", `export { CSS_TARGETS } from "../../spell-ui/vite.config.ts"`),
      climbs("spell-app/app/src/a.ts", `export * from "../../../spell-lang/core/src/index.ts"`),
      climbs("spell-app/app/src/a.ts", `export * from "../../lsp/src/index.ts"`),
      climbs("spell-app/app/src/a.ts", "const m = await import(`../../../spell-ui/src/index.ts`)"),
      climbs("spell-app/app/src/a.ts", `type T = import("../../../spell-ui/src/index.ts").Thing`),
      climbs("spell-app/cli/src/a.ts", `const ui = require("../../../spell-ui/src/index.ts")`),
      climbs("spell-app/tests/app/src/a.test.ts", `vi.mock("../../../spaces/src/index.ts")`),
      climbs("spell-app/tests/app/src/a.test.ts", `await vi.importActual("../../../../spell-ui/src/index.ts")`),
      climbs("spell-app/tests/app/src/a.test.ts", `import { helper } from "../../spaces/test/helper.ts"`),
      climbs("spell-ui/tests/src/a.test.ts", `import.meta.glob(["./*.ts", "!../../../element/src/skip.ts"])`),
      climbs("spell-ui/src/a.ts", `declare module "../../element/src/vocabulary.types" {}`),
      climbs("tests/element/src/a.test.ts", `import { setup } from "../../../spell-ui/test/setup.ts"`),
      climbs("element/src/a.ts", `import { x } from "../../util/src/string.ts"`)
    ]
  })
})

// epic `repo-split` P6:  another repo's package by its npm name;  `$/` inside a repo
describe("spell/no-cross-repo-alias", () => {
  tester.run("no-cross-repo-alias", IMPORT_RULES["no-cross-repo-alias"], {
    valid: [
      // inside one repo:  spell-lang's `spell` and `parser`, spell-app's `app` and `lsp`, a package's own
      at("spell-lang/spell/src/a.ts", `import { P } from "$/parser"`),
      at("spell-app/app/src/a.ts", `import { LSP } from "$/lsp"`),
      at("spell-ui/tests/components/a.test.ts", `import { ElementFixture } from "$/ui/test/ElementFixture"`),
      // another repo's, by its npm name
      at("spell-app/app/src/a.ts", `import { E } from "spell-ui/core"`),
      at("spell-ui/src/a.ts", `declare module "spell-kit/element/vocabulary.types" {}`),
      // inside the kit:  one repo
      at("element/src/a.ts", `import { proto } from "$/util/decorators"`),
      at("assembler/src/a.ts", `import { SRV } from "$/server"`),
      // a string that only names a module:  a page's `packModules` key
      at("spell-app/app/vite.shared.ts", `const SHARED = ["$/ui/core", "$/spell-element"]`),
      // a file at a multi-package repo's root, or in no known repo:  left alone
      at("spell-app/vite.config.ts", `import { x } from "$/ui"`),
      at("nowhere/src/a.ts", `import { x } from "$/ui"`)
    ],
    invalid: [
      crosses("spell-app/app/src/a.ts", `import { E } from "$/ui/core"`, "spell-ui/core"),
      crosses("spell-ui/src/a.ts", `export * from "$/spell-element"`, "spell-kit/element"),
      crosses("spell-brand/tests/components/a.test.ts", `import { A11y } from "$/ui/test/A11y"`, "spell-ui/test/A11y"),
      crosses(
        "spell-lang/parser/src/a.ts",
        `const m = await import("$/util/spell/Logger")`,
        "spell-kit/util/spell/Logger"
      ),
      crosses("spell-app/app/src/a.ts", `type T = import("$/spell").SP`, "spell-lang/spell"),
      crosses("spell-app/tests/app/src/a.test.ts", `vi.mock("$/spell")`, "spell-lang/spell"),
      crosses("spell-ui/src/a.ts", `declare module "$/spell-element/vocabulary.types" {}`, "spell-kit/element"),
      crosses("spell-epic/src/a.ts", `import { SRV } from "$/server"`, "spell-kit/server"),
      crosses("server/src/a.ts", `import { UI } from "$/ui/core"`, "spell-ui/core")
    ]
  })
})

describe("packageOf():  a file's package, by where it is in the kit", () => {
  test("a multi-package repo's package and its tests;  a flat repo's;  a repo root's own files in none", () => {
    expect(packageOf(join(TOP, "spell-lang/core/src/a.ts"))).toEqual({ name: "core", folder: "spell-lang/core" })
    expect(packageOf(join(TOP, "spell-lang/tests/core/src/a.test.ts"))).toEqual({
      name: "core",
      folder: "spell-lang/tests/core"
    })
    expect(packageOf(join(TOP, "spell-ui/components/ui-button/UIButton.tsx"))).toEqual({
      name: "ui",
      folder: "spell-ui"
    })
    expect(packageOf(join(TOP, "spell-ui/tests/src/a.test.ts"))).toEqual({ name: "ui", folder: "spell-ui/tests" })
    expect(packageOf(join(TOP, "spell-lang/vite.config.ts"))).toBeUndefined()
    expect(packageOf(join(TOP, "spell-lang/tests/vitest.shared.ts"))).toBeUndefined()
    expect(packageOf(join(TOP, "README.md"))).toBeUndefined()
  })

  test("the kit's own folders and their tests (epic `repo-split` P9);  element's name is its alias's", () => {
    expect(packageOf(join(TOP, "util/src/a.ts"))).toEqual({ name: "util", folder: "util" })
    expect(packageOf(join(TOP, "element/src/a.ts"))).toEqual({ name: "spell-element", folder: "element" })
    expect(packageOf(join(TOP, "tests/element/src/a.test.ts"))).toEqual({
      name: "spell-element",
      folder: "tests/element"
    })
    expect(packageOf(join(TOP, "tools/repos.ts"))).toBeUndefined()
    expect(packageOf(join(TOP, "tests/vitest.shared.ts"))).toBeUndefined()
  })
})

////////////////
// ## Helpers
////////////////

/** The kit `spell-kit`, holding every child repo:  this file is in its `tests/toolchain/src/`. */
const TOP = fileURLToPath(new URL("../../../", import.meta.url))

/** A case:  `code`, in the file at `file` (from the kit). */
function at(file: string, code: string) {
  return { code, filename: join(TOP, file) }
}

/** A case the rule flags once, naming the fix. */
function climbs(file: string, code: string) {
  return {
    ...at(file, code),
    errors: [{ message: /climbs out of `[\w-]+(\/tests)?(\/[\w-]+)?` into .*(\$\/|spell-kit\/)/ }]
  }
}

/** A `no-cross-repo-alias` case, flagged once, its message naming `fix`. */
function crosses(file: string, code: string, fix: string) {
  return { ...at(file, code), errors: [{ message: new RegExp(`import it by its npm name, \`${fix}`) }] }
}
