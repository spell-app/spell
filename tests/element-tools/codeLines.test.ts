import { describe, expect, test } from "vite-plus/test"

import { codeLines } from "spell/element-tools/codeLines"

describe("codeLines()", () => {
  test("leaves out blank lines, `//` lines and `/* ... */` blocks;  a line with code AND a comment counts", () => {
    const text = [
      "/**",
      " * A docstring",
      " */",
      "",
      "// a line comment",
      "const a = 1 // a trailing comment",
      "/* a block */ const b = 2",
      "/* one line */",
      "const c = 3",
      ""
    ].join("\n")
    expect(codeLines(text, ".ts")).toEqual([
      "const a = 1 // a trailing comment",
      "/* a block */ const b = 2",
      "const c = 3"
    ])
  })

  test("a `/*` further along a line is code:  a glob never swallows the lines after it", () => {
    const text = ['const globs = ["src/*.ts", "src/components/*/UI*.tsx"]', "const d = 4"].join("\n")
    expect(codeLines(text, ".ts")).toHaveLength(2)
  })

  test("HTML's `<!-- -->` blocks;  CSS's `/* */` only, so `//` is code there;  Python's `#` lines", () => {
    expect(codeLines("<!-- a\n  comment -->\n<p>hi</p>\n", ".html")).toEqual(["<p>hi</p>"])
    expect(codeLines("/* a */\n.a { color: red }\n// not a comment in CSS\n", ".css")).toHaveLength(2)
    expect(codeLines("# a comment\nx = 1\n  # indented\n", ".py")).toEqual(["x = 1"])
  })
})
