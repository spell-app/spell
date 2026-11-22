import { describe, expect, test, vi } from "vite-plus/test"

import { absoluteImports, RuntimeCopies, type RuntimeCopy } from "spell/app/app/runner"

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

describe("RuntimeCopies:  a copy an app lets go of goes to the next (solid-2-final P10)", () => {
  /** A copy whose app takedowns are counted. */
  function copyNamed(coreUrl: string) {
    const unmounted: string[] = []
    const runtime = { unmountApp: () => unmounted.push(coreUrl) } as unknown as RuntimeCopy["runtime"]
    return { copy: { runtime, coreUrl }, unmounted }
  }

  test("loads a copy only when none is waiting;  a released one is taken next, its app taken down first", async () => {
    const copies = new RuntimeCopies()
    const first = copyNamed("blob:1")
    const load = vi.fn(async () => first.copy)
    const taken = await copies.take("x.js", load)
    expect(load).toHaveBeenCalledTimes(1)
    expect(copies.idleCount("x.js")).toBe(0)
    taken.release()
    taken.release()
    expect(first.unmounted).toEqual(["blob:1"])
    expect(copies.idleCount("x.js")).toBe(1)
    const again = await copies.take("x.js", load)
    expect(load).toHaveBeenCalledTimes(1)
    expect(again.coreUrl).toBe("blob:1")
    expect(copies.idleCount("x.js")).toBe(0)
  })

  test("two apps at once each have a copy of their own;  copies of another URL are never taken", async () => {
    const copies = new RuntimeCopies()
    let made = 0
    const load = async () => copyNamed(`blob:${++made}`).copy
    const [a, b] = await Promise.all([copies.take("x.js", load), copies.take("x.js", load)])
    expect(a.coreUrl).not.toBe(b.coreUrl)
    a.release()
    expect((await copies.take("y.js", load)).coreUrl).toBe("blob:3")
  })
})
