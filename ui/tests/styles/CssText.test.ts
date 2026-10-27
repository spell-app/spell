import { describe, expect, test } from "vite-plus/test"

import { CssText } from "spell-ui/styles/CssText"

describe("CssText.topLevel()", () => {
  test("the first (or last) character outside every bracket that passes, quotes and escapes skipped", () => {
    const selector = '.a:is(.b > .c)[title="> x"] > .d\\>e'
    expect(CssText.topLevel(selector, (char) => char === ">")).toBe(selector.lastIndexOf(" > ") + 1)
    expect(CssText.topLevel(selector, (char) => /\s/.test(char), { last: true })).toBe(selector.lastIndexOf(" "))
    expect(CssText.topLevel("(a b)", (char) => char === " ")).toBe(-1)
    expect(CssText.topLevel("a b c", (char) => char === " ", { from: 2 })).toBe(3)
  })
})

describe("CssText.closing()", () => {
  test("where a bracket closes, nested and quoted ones skipped;  -1 for none", () => {
    expect(CssText.closing('var(--x, calc(1px + 2px), ")")', 3)).toBe(29)
    expect(CssText.closing("[a=b]", 0)).toBe(4)
    expect(CssText.closing("var(--x", 3)).toBe(-1)
  })
})

describe("CssText.splitTop()", () => {
  test("splits at top-level whitespace, a slash its own part;  or at commas", () => {
    expect(CssText.splitTop("from var(--x) calc(l - 0.05) c h / 0.5")).toEqual([
      "from",
      "var(--x)",
      "calc(l - 0.05)",
      "c",
      "h",
      "/",
      "0.5"
    ])
    expect(CssText.splitTop('light-dark(#000, rgb(1, 2, 3)), url("a,b")', ",")).toEqual([
      "light-dark(#000, rgb(1, 2, 3))",
      'url("a,b")'
    ])
  })
})

describe("CssText.isBalanced()", () => {
  test("every bracket closes, in order", () => {
    expect(CssText.isBalanced("calc(1px + var(--a))")).toBe(true)
    expect(CssText.isBalanced("a), b")).toBe(false)
    expect(CssText.isBalanced('a(")"')).toBe(false)
    expect(CssText.isBalanced('content(")")')).toBe(true)
  })
})
