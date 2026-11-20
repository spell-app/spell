import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test"

import { PathLink } from "spell/cli/PathLink"

/**
 * `PathLink` in a made-up home:  two checkouts, two projects, a bin folder on a made-up `PATH`.
 * - NEVER the real `~/.local/bin` or `~/.spell/`:  `home` and `SPELL_BIN_DIR` are temporary folders.
 */
let root: string
let home: string
let binDir: string
let link: string
let checkoutA: string
let checkoutB: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), "path-link-")))
  home = join(root, "home")
  binDir = join(root, "bin")
  link = join(binDir, "spell")
  checkoutA = fileIn("spell-a/bin/spell.mjs")
  checkoutB = fileIn("spell-b/bin/spell.mjs")
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

/** A file at `path` under `root`, its full path. */
function fileIn(path: string, text = ""): string {
  const file = join(root, path)
  mkdirSync(join(file, ".."), { recursive: true })
  writeFileSync(file, text)
  return file
}

/** A project under `root` that runs a checkout (its `.spell/kit.json5`), its full path. */
function localProject(name: string): string {
  fileIn(`${name}/.spell/kit.json5`, `{ kit: "~/www/spell" }`)
  return join(root, name)
}

/** A `PathLink` in the made-up home, linking into `binDir`, which is on `PATH` unless `onPath` is false. */
function pathLink(onPath = true): PathLink {
  return new PathLink({ home, env: { SPELL_BIN_DIR: binDir, PATH: onPath ? `/usr/bin:${binDir}` : "/usr/bin" } })
}

describe("link():  yarn cli:install", () => {
  test("links, says whether the folder is on PATH, and repoints an older link", () => {
    expect(pathLink(false).link(checkoutA)).toMatchObject({
      link,
      target: checkoutA,
      outcome: "linked",
      isOnPath: false
    })
    expect(readlinkSync(link)).toBe(checkoutA)
    expect(pathLink().link(checkoutB)).toMatchObject({ outcome: "repointed", before: checkoutA, isOnPath: true })
    expect(readlinkSync(link)).toBe(checkoutB)
  })

  test("a file that isn't a link is never replaced", () => {
    fileIn("bin/spell", "#!/bin/sh")
    expect(pathLink().link(checkoutA).outcome).toBe("blocked")
    expect(lstatSync(link).isSymbolicLink()).toBe(false)
  })

  test("the link is yours after:  spell local off leaves it", () => {
    const project = localProject("app")
    pathLink().linkFor(project, checkoutA)
    pathLink().link(checkoutA)
    rmSync(join(project, ".spell"), { recursive: true })
    expect(pathLink().unlinkFor(project).outcome).toBe("not-ours")
    expect(readlinkSync(link)).toBe(checkoutA)
  })
})

describe("linkFor() and unlinkFor():  spell local on and off", () => {
  test("on links and records it;  off, the last project, removes it", () => {
    const project = localProject("app")
    expect(pathLink().linkFor(project, checkoutA)).toMatchObject({ outcome: "linked", isOnPath: true })
    expect(pathLink().status()).toMatchObject({
      link,
      target: checkoutA,
      isLink: true,
      madeByLocal: true,
      projects: [project]
    })
    rmSync(join(project, ".spell"), { recursive: true })
    expect(pathLink().unlinkFor(project)).toMatchObject({ outcome: "removed", link })
    expect(() => lstatSync(link)).toThrow()
    expect(pathLink().status()).toBeUndefined()
  })

  test("off keeps the link while another project still runs a checkout;  a project gone is forgotten", () => {
    const [one, two, gone] = [localProject("one"), localProject("two"), localProject("gone")]
    for (const project of [one, two, gone]) pathLink().linkFor(project, checkoutA)
    rmSync(gone, { recursive: true })
    expect(pathLink().linkFor(one, checkoutA).outcome).toBe("kept")
    expect(pathLink().unlinkFor(one)).toMatchObject({ outcome: "in-use", projects: [two] })
    expect(readlinkSync(link)).toBe(checkoutA)
    expect(pathLink().unlinkFor(two).outcome).toBe("removed")
  })

  test("a link you made to the same checkout:  changed nothing, recorded nothing, never removed", () => {
    pathLink().link(checkoutA)
    const project = localProject("app")
    expect(pathLink().linkFor(project, checkoutA)).toMatchObject({ outcome: "kept" })
    expect(pathLink().status()?.madeByLocal).toBe(false)
    expect(pathLink().unlinkFor(project).outcome).toBe("not-ours")
    expect(readlinkSync(link)).toBe(checkoutA)
  })

  test("a link to another checkout is repointed, and put back by the last off", () => {
    symlinkSync(checkoutB, (mkdirSync(binDir, { recursive: true }), link))
    const project = localProject("app")
    expect(pathLink().linkFor(project, checkoutA)).toMatchObject({ outcome: "repointed", before: checkoutB })
    expect(readlinkSync(link)).toBe(checkoutA)
    expect(pathLink().unlinkFor(project)).toMatchObject({ outcome: "restored", target: checkoutB })
    expect(readlinkSync(link)).toBe(checkoutB)
  })

  test("a file in the way:  nothing linked, nothing recorded", () => {
    fileIn("bin/spell", "#!/bin/sh")
    const project = localProject("app")
    expect(pathLink().linkFor(project, checkoutA).outcome).toBe("blocked")
    expect(pathLink().record()).toBeUndefined()
    expect(pathLink().status()).toMatchObject({ link, isLink: false, madeByLocal: false })
  })

  test("the link changed by someone else since:  no longer spell local's", () => {
    const project = localProject("app")
    pathLink().linkFor(project, checkoutA)
    rmSync(link)
    symlinkSync(checkoutB, link)
    expect(pathLink().record()).toBeUndefined()
    expect(pathLink().unlinkFor(project).outcome).toBe("not-ours")
  })
})

describe("status()", () => {
  test("the first spell on PATH, skipping yarn's own folders", () => {
    const yarnBin = fileIn("app/node_modules/.bin/spell")
    pathLink().link(checkoutA)
    const env = { PATH: `${join(yarnBin, "..")}:${binDir}`, SPELL_BIN_DIR: binDir }
    expect(new PathLink({ home, env }).status()).toMatchObject({ link, target: checkoutA })
  })
})
