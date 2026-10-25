import { describe, expect, test } from "vite-plus/test"

import { bareName, importsOf, moduleFileFor, type MappedRepo } from "spell/cli/map"

/** The kit and one child repo, as `CodeMap.repos` lists them. */
const REPOS: MappedRepo[] = [
  { name: "spell", root: "/kit", folder: "", packageName: "spell" },
  { name: "spell-ui", root: "/kit/spell-ui", folder: "spell-ui", packageName: "spell-ui" }
]

/** The files "there", from the checkout's root. */
const FILES = new Set([
  "src/util/node/json5.ts",
  "src/cli/index.ts",
  "spell-ui/src/components/ui-button/UIButton.tsx",
  "spell-ui/src/index.ts"
])

describe("importsOf()", () => {
  test("named, renamed, type-only, default, namespace and side-effect imports;  re-exports;  each with its line", () => {
    const text = [
      'import chalk from "chalk"',
      'import { readJSON5File, type JSON5Value, json5Edited as edited } from "spell/util/node/json5"',
      'import * as NS from "./peer"',
      'export * as P from "."',
      'export * from "./Rule"',
      'import "spell-parser/parser/rulex"',
      "import {",
      "  CLI",
      '} from "spell/cli"'
    ].join("\n")
    expect(importsOf(text)).toEqual([
      { from: "chalk", names: [{ name: "default", local: "chalk" }], line: 1 },
      {
        from: "spell/util/node/json5",
        names: [
          { name: "readJSON5File", local: "readJSON5File" },
          { name: "JSON5Value", local: "JSON5Value" },
          { name: "json5Edited", local: "edited" }
        ],
        line: 2
      },
      { from: "./peer", names: [{ name: "NS", local: "NS", namespace: true }], line: 3 },
      { from: ".", names: [{ name: "P", local: "P", namespace: true }], line: 4 },
      { from: "./Rule", names: [], line: 5 },
      { from: "spell-parser/parser/rulex", names: [], line: 6 },
      { from: "spell/cli", names: [{ name: "CLI", local: "CLI" }], line: 7 }
    ])
  })

  test("NEVER takes an export of a value, or a string that merely says `from`", () => {
    const text = ['export const label = "from"', 'export function load(from = "x") {}', "const a = 1"].join("\n")
    expect(importsOf(text)).toEqual([])
  })
})

describe("moduleFileFor()", () => {
  const fileFor = (from: string) => moduleFileFor(from, REPOS, (path) => FILES.has(path))

  test("a package-name import is the file its `exports` mean:  `.ts`, `.tsx`, a folder's index", () => {
    expect(fileFor("spell/util/node/json5")).toBe("src/util/node/json5.ts")
    expect(fileFor("spell/util/node/json5.ts")).toBe("src/util/node/json5.ts")
    expect(fileFor("spell/cli")).toBe("src/cli/index.ts")
    expect(fileFor("spell-ui/components/ui-button/UIButton")).toBe("spell-ui/src/components/ui-button/UIButton.tsx")
    expect(fileFor("spell-ui")).toBe("spell-ui/src/index.ts")
  })

  test("NOT a library, a relative import, or a file that isn't there", () => {
    expect(fileFor("chalk")).toBeUndefined()
    expect(fileFor("./Peer")).toBeUndefined()
    expect(fileFor("spell/util/gone")).toBeUndefined()
    expect(fileFor("spell-uix/thing")).toBeUndefined()
  })
})

describe("bareName()", () => {
  test("a graphify label's name, without a call's `()` or a method's `.`", () => {
    expect([bareName("readJSON5File()"), bareName(".getAt()"), bareName("PrefStore")]).toEqual([
      "readJSON5File",
      "getAt",
      "PrefStore"
    ])
  })
})
