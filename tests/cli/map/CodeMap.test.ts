import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { CodeMap, type MapGraph, type MapLink } from "spell/cli/map"

/**
 * A made-up checkout:  the kit (a json5 reader, a parser barrel with a `Tokenizer`) and one of its folders, `ui/`,
 * whose files import them by package name;  graphify maps the kit, ONE repo, folders and all (epic `repo-split` P20).
 */
const CHECKOUT = mkdtempSync(join(tmpdir(), "spell-map-"))
afterAll(() => rmSync(CHECKOUT, { recursive: true, force: true }))

write("repos.json5", "{ repos: [] }")
write("package.json", JSON.stringify({ name: "spell", workspaces: ["ui"] }))
write("ui/package.json", JSON.stringify({ name: "spell-ui" }))
write("src/util/json5.ts", "export function readJSON5File() {}\n")
write("src/parser/index.ts", 'export * as P from "."\nexport * from "./Tokenizer"\n')
write("src/parser/Tokenizer.ts", "export class Tokenizer {}\n")
write(
  "ui/src/Reader.ts",
  [
    'import { readJSON5File } from "spell/util/json5"',
    'import { P } from "spell/parser"',
    "",
    "export class MarkTokenizer extends P.Tokenizer {",
    "  read() { return readJSON5File() }",
    "}"
  ].join("\n")
)

/** The kit's map, as graphify writes it:  ids from paths, placeholders for the imports it can't follow. */
const KIT_GRAPH: MapGraph = {
  directed: true,
  nodes: [
    { id: "ui_src_reader", label: "Reader.ts", file_type: "code", source_file: "ui/src/Reader.ts" },
    { id: "ui_src_reader_mark", label: "MarkTokenizer", file_type: "code", source_file: "ui/src/Reader.ts" },
    { id: "ref_spell_util_json5", label: "spell/util/json5", file_type: "concept" },
    { id: "ref_spell_parser", label: "spell/parser", file_type: "concept" },
    { id: "src_util_json5", label: "json5.ts", file_type: "code", source_file: "src/util/json5.ts" },
    { id: "src_util_json5_read", label: "readJSON5File()", file_type: "code", source_file: "src/util/json5.ts" },
    { id: "src_parser_index", label: "index.ts", file_type: "code", source_file: "src/parser/index.ts" },
    { id: "src_parser_tokenizer", label: "Tokenizer.ts", file_type: "code", source_file: "src/parser/Tokenizer.ts" },
    { id: "src_parser_tokenizer_cls", label: "Tokenizer", file_type: "code", source_file: "src/parser/Tokenizer.ts" }
  ],
  links: [
    { source: "ui_src_reader", target: "ref_spell_util_json5", relation: "imports_from", confidence: "EXTRACTED" },
    { source: "ui_src_reader", target: "ref_spell_parser", relation: "imports_from", confidence: "EXTRACTED" },
    { source: "ui_src_reader", target: "ui_src_reader_mark", relation: "contains", confidence: "EXTRACTED" }
  ]
}

describe("CodeMap.merge()", () => {
  const map = new CodeMap(CHECKOUT)
  const [kit] = map.repos
  const merged = map.merge([{ repo: kit!, graph: KIT_GRAPH }])
  const ours = (relation: string) =>
    merged.links.filter((each: MapLink) => each.relation === relation && each._origin === "spell-map")

  test("ONE repo, the kit:  its ids prefixed with its name, a folder's paths as graphify wrote them", () => {
    expect(map.repos.map((repo) => repo.name)).toEqual(["spell"])
    expect(map.importRoots.map((root) => root.packageName)).toEqual(["spell/ui", "spell"])
    expect(merged.nodes.find((node) => node.label === "Reader.ts")).toMatchObject({
      id: "spell::ui_src_reader",
      repo: "spell",
      source_file: "ui/src/Reader.ts"
    })
  })

  test("a package-name import links the file to the module, and to each name it uses, a barrel's members too", () => {
    expect(ours("imports_from").map((each) => [each.source, each.target])).toEqual([
      ["spell::ui_src_reader", "spell::src_util_json5"],
      ["spell::ui_src_reader", "spell::src_parser_index"]
    ])
    expect(ours("uses").map((each) => [each.target, each.source_location])).toEqual([
      ["spell::src_util_json5_read", "L1"],
      ["spell::src_parser_tokenizer_cls", "L2"]
    ])
  })

  test("a class extending an imported one is its subclass:  `extends P.Tokenizer`", () => {
    expect(ours("inherits").map((each) => [each.source, each.target, each.source_location])).toEqual([
      ["spell::ui_src_reader_mark", "spell::src_parser_tokenizer_cls", "L4"]
    ])
  })

  test("graphify's placeholders for the imports it couldn't follow are gone, with their links", () => {
    expect(merged.nodes.some((node) => node.id.includes("::ref_"))).toBe(false)
    expect(merged.links.some((each) => each.target.includes("::ref_"))).toBe(false)
    expect(merged.links.filter((each) => each.relation === "contains")).toHaveLength(1)
  })
})

/** Write `text` to `path` in the made-up checkout. */
function write(path: string, text: string): void {
  mkdirSync(dirname(join(CHECKOUT, path)), { recursive: true })
  writeFileSync(join(CHECKOUT, path), text)
}
