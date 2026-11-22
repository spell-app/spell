import { describe, expect, test } from "vite-plus/test"

import { absoluteImports } from "spell/app/app/runner"

describe("absoluteImports()", () => {
  test("makes relative imports absolute, so a `blob:` copy can load them", () => {
    const source = `import{a as b}from"./spell-shared.js";import "../x.js";const c=import("./lazy.js");import d from "react"`
    expect(absoluteImports(source, "https://example.com/element/spell-runtime.js")).toBe(
      `import{a as b}from"https://example.com/element/spell-shared.js";import "https://example.com/x.js";` +
        `const c=import("https://example.com/element/lazy.js");import d from "react"`
    )
  })

  test("makes the dev server's root paths absolute too, never a protocol-relative one (epic `solid-2-final` P12)", () => {
    const source = `import "/@vite/client";import{x}from"/src/app/runner/runCompiled.ts";import y from "//cdn.example.com/y.js"`
    expect(absoluteImports(source, "http://localhost:3000/src/app/runner/spellRuntime.ts")).toBe(
      `import "http://localhost:3000/@vite/client";import{x}from"http://localhost:3000/src/app/runner/runCompiled.ts";` +
        `import y from "//cdn.example.com/y.js"`
    )
  })
})
