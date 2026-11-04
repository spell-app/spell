import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, parse } from "node:path"

import { afterAll, describe, expect, test } from "vite-plus/test"

import { findUp } from "spell/util/node/findUp"

/**
 * `findUp()` (`spell/util/node/findUp`, epic `coherence` P29):  the nearest folder up that holds something.
 */

const top = mkdtempSync(join(tmpdir(), "find-up-"))
const deep = join(top, "a", "b", "c")
mkdirSync(deep, { recursive: true })
writeFileSync(join(top, "marker.json5"), "{}")
writeFileSync(join(top, "a", "package.json"), "{}")

afterAll(() => rmSync(top, { recursive: true, force: true }))

describe("findUp()", () => {
  test("the nearest folder holding the marker", () => {
    expect(findUp(deep, "package.json")).toBe(join(top, "a"))
    expect(findUp(deep, "marker.json5")).toBe(top)
  })

  test("`from` itself is looked at first", () => {
    expect(findUp(join(top, "a"), "package.json")).toBe(join(top, "a"))
  })

  test("a test of the folder", () => {
    expect(findUp(deep, (folder) => folder.endsWith(`${join("a", "b")}`))).toBe(join(top, "a", "b"))
  })

  test("a `from` that isn't there:  the folders above it", () => {
    expect(findUp(join(deep, "not", "made"), "package.json")).toBe(join(top, "a"))
  })

  test("none up to the disk's root:  `undefined`", () => {
    expect(findUp(deep, "no-such-marker-anywhere.p29")).toBeUndefined()
    const root = parse(top).root
    expect(findUp(root, "no-such-marker-anywhere.p29")).toBeUndefined()
    expect(findUp(root, () => true)).toBe(root)
  })
})
