import { describe, expect, test } from "vite-plus/test"

import { readTypeScript, walk, type SourceNode } from "spell/util/node/typescript"

/**
 * The kit's ONE reader of our TypeScript (`spell/util/node/typescript`, epic `coherence` P26):
 * the tree, the comments, the imports and the docstring above a node, all by offsets.
 * - What the hand scanners it replaced got wrong is tested here:  a `//` in JSX text, a regex, a template string.
 */

describe("readTypeScript()", () => {
  test("a class and a call:  the tree, with offsets into the text", () => {
    const text = 'export class Await extends SpellStatement {}\n_async.addRule(Await, { syntax: "wait" })\n'
    const { program, errors } = readTypeScript("async.en.ts", text)
    expect(errors).toEqual([])
    const [exported, call] = program.body as SourceNode[]
    const declaration = exported!.declaration as SourceNode
    expect([declaration.type, (declaration.id as SourceNode).name]).toEqual(["ClassDeclaration", "Await"])
    expect(text.slice(call!.start, call!.end)).toBe('_async.addRule(Await, { syntax: "wait" })')
  })

  test("what doesn't parse is in `errors`, never thrown", () => {
    expect(readTypeScript("broken.ts", "const = 1").errors.length).toBeGreaterThan(0)
  })
})

describe("TypeScriptSource.comments", () => {
  test("JSX text holding `//` is no comment", () => {
    const { comments } = readTypeScript("Link.tsx", "const a = <a>http://example.com</a> // the link\n")
    expect(comments.map((it) => it.value)).toEqual([" the link"])
  })

  test("a regex literal holding `//` or `/*` is no comment", () => {
    const { comments } = readTypeScript("url.ts", "const URL = /https?:\\/\\/|\\/\\*/g // a URL\n")
    expect(comments.map((it) => it.value)).toEqual([" a URL"])
  })

  test("a template string holding `//` is no comment;  its `${}` code is read", () => {
    const text = "const a = `http://x ${/* inside */ 1} // not`\n// after\n"
    expect(readTypeScript("t.ts", text).comments.map((it) => [it.type, it.value])).toEqual([
      ["Block", " inside "],
      ["Line", " after"]
    ])
  })

  test("`commentsAbove()`:  the comment lines right above a line, a blank line ending them", () => {
    const text = "// far\n\n// one\n// two\nfoo()\n"
    const source = readTypeScript("x.ts", text)
    expect(source.commentsAbove(text.indexOf("foo")).map((it) => it.value)).toEqual([" one", " two"])
  })
})

describe("TypeScriptSource.docstringOf()", () => {
  test("the `/** */` right above a node, its stars gone;  decorators are part of the node", () => {
    const text = ["/**", " * A card.", " * - in a pile", " */", "@thing", "export class Card {}"].join("\n")
    const source = readTypeScript("Card.ts", text)
    expect(source.docstringOf((source.program.body as SourceNode[])[0]!)).toBe("A card.\n- in a pile")
  })

  test("none for a plain comment, or code between", () => {
    const source = readTypeScript("x.ts", "/* plain */\nconst a = 1\n/** doc */\nlet b\nconst c = 2\n")
    const [a, , c] = source.program.body as SourceNode[]
    expect([source.docstringOf(a!), source.docstringOf(c!)]).toEqual([undefined, undefined])
  })
})

describe("TypeScriptSource.imports", () => {
  test("named, renamed, type-only, default, namespace, side-effect, re-exports and `import()`, in file order", () => {
    const text = [
      'import chalk from "chalk"',
      'import { a, type B, c as d } from "m"',
      'import * as NS from "./peer"',
      'export * as P from "."',
      'export { e as f } from "./e"',
      'export * from "./Rule"',
      'import "spell/parser/parser/rulex"',
      'const lazy = import("./Lazy")',
      "const computed = import(name)",
      'const text = "import x from \\"not\\""'
    ].join("\n")
    expect(readTypeScript("x.ts", text).imports.map(({ from, kind, names }) => ({ from, kind, names }))).toEqual([
      { from: "chalk", kind: "import", names: [{ name: "default", local: "chalk" }] },
      {
        from: "m",
        kind: "import",
        names: [
          { name: "a", local: "a" },
          { name: "B", local: "B", isType: true },
          { name: "c", local: "d" }
        ]
      },
      { from: "./peer", kind: "import", names: [{ name: "NS", local: "NS", namespace: true }] },
      { from: ".", kind: "re-export", names: [{ name: "P", local: "P", namespace: true }] },
      { from: "./e", kind: "re-export", names: [{ name: "e", local: "f" }] },
      { from: "./Rule", kind: "re-export", names: [] },
      { from: "spell/parser/parser/rulex", kind: "import", names: [] },
      { from: "./Lazy", kind: "dynamic", names: [] }
    ])
  })
})

describe("walk()", () => {
  test("every node, parents first;  `false` skips what's inside", () => {
    const { program } = readTypeScript("x.ts", "f(g(1))\n")
    const calls: string[] = []
    walk(program, (node) => {
      if (node.type === "CallExpression") calls.push((node.callee as SourceNode).name as string)
    })
    expect(calls).toEqual(["f", "g"])
    const outer: string[] = []
    walk(program, (node) => {
      if (node.type !== "CallExpression") return
      outer.push((node.callee as SourceNode).name as string)
      return false
    })
    expect(outer).toEqual(["f"])
  })
})
