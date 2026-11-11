import { describe, expect, test } from "vite-plus/test"

import { PG } from "spell/parser/page"

/** A page's CHUNK TREE (`PG.PageView`):  what a page file says, for the notebook editor. */
describe("a page's chunk tree", () => {
  const TEXT = [
    'a "counter" is a view:',
    "\tto draw it: <button>Clicked</button>",
    "",
    '"counter notebook" is a notebook page',
    "\t# A counter",
    "\tA button that counts its clicks.",
    "",
    '\t<example "one counter">',
    "\t\t<counter/>",
    "\t</example>",
    "\t<if 1 is 1>",
    "\t\t<text>yes</text>",
    "\t<otherwise>",
    "\t\t<text>no</text>",
    "\t</>",
    ""
  ].join("\n")

  test("its head, its prose, markup and tags, and plain Spell above it, each with its span", () => {
    const file = PG.PageView.read(TEXT, { path: "/Counter.spell" })
    expect(file.diagnostics).toEqual([])
    const [page] = file.pages
    expect(page).toMatchObject({ kind: "page", name: "counter notebook" })
    expect(page!.attributes.map((attribute) => attribute.name)).toEqual(["notebook"])
    expect(file.toOutline().split("\n")).toEqual([
      'code 2 lines 1:1-2:38 "a \\"counter\\" is a view:"',
      'page <page> "counter notebook" 4:1-16:1 notebook',
      '  prose 5:2-6:34 "# A counter…"',
      '  element <example> 8:2-10:12 name="one counter"',
      "    element <counter> /> 9:3-9:13",
      "  choice 2 branches 11:2-15:5",
      '    branch if <if> "1 is 1" 11:2-13:2',
      "      element <text> 12:3-12:19",
      '        text 12:9-12:12 "yes"',
      "    branch otherwise <otherwise> 13:2-15:2",
      "      element <text> 14:3-14:18",
      '        text 14:9-14:11 "no"'
    ])
  })

  test("a closer that closes nothing is its diagnostic", () => {
    const file = PG.PageView.read('"notes" is a page\n\t# Notes\n\t</>\n', { path: "/Notes.spell" })
    expect(file.errors.map((error) => error.message)).toEqual(['"</>" closes nothing:  remove it'])
  })
})
