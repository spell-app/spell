/**
 * Tests of the epic server's repo list (`RepoList`, `~/.spell-epic/repos.json5`),
 * in a temp home folder:  never the real one.
 */
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { RepoList, RepoListError } from "spell/epic/server/RepoList"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** A scratch folder, removed after the test. */
function scratch(prefix: string): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)))
  dirs.push(dir)
  return dir
}

/**
 * A repo's main checkout whose `.epic/config.json5` puts its content in `content` (relative to it),
 * with that folder made;  its path.
 * - no git:  it counts as its own main checkout
 */
function repo(name: string, content = "docs"): string {
  const checkout = join(scratch("epic-repos-"), name)
  mkdirSync(join(checkout, ".epic"), { recursive: true })
  mkdirSync(join(checkout, content, "epics", "seo"), { recursive: true })
  writeFileSync(join(checkout, ".epic", "config.json5"), `// ${name}'s\n{ "contentFolder": "${content}" }\n`)
  return checkout
}

describe("RepoList", () => {
  test("no file:  no repos, no default;  the home folder from SPELL_EPIC_HOME", () => {
    const home = scratch("epic-home-")
    const before = process.env.SPELL_EPIC_HOME
    process.env.SPELL_EPIC_HOME = home
    try {
      const list = new RepoList()
      expect(list.file).toBe(join(home, "repos.json5"))
      expect(list.repos()).toEqual([])
      expect(list.defaultRepo).toBeUndefined()
    } finally {
      if (before === undefined) delete process.env.SPELL_EPIC_HOME
      else process.env.SPELL_EPIC_HOME = before
    }
  })

  test("add:  its folder's name, its content from its config;  the first is the default;  --default moves it", () => {
    const list = new RepoList({ home: join(scratch("epic-home-"), "nested") })
    const one = repo("one")
    const two = repo("two", "content")
    expect(list.add(one)).toEqual({
      name: "one",
      checkout: one,
      content: join(one, "docs"),
      prefix: "/r/one/",
      isDefault: true
    })
    expect(list.add(two).isDefault).toBe(false)
    expect(list.repos().map((each) => [each.name, each.content, each.isDefault])).toEqual([
      ["one", join(one, "docs"), true],
      ["two", join(two, "content"), false]
    ])
    expect(list.add(two, { isDefault: true }).isDefault).toBe(true)
    expect(list.defaultRepo?.name).toBe("two")
    expect(list.read()).toEqual({
      default: "two",
      repos: [
        { name: "one", checkout: one },
        { name: "two", checkout: two }
      ]
    })
  })

  test("add again:  the same entry;  --name renames it, and the default follows;  a name taken or bad is refused", () => {
    const list = new RepoList({ home: scratch("epic-home-") })
    const one = repo("one")
    list.add(one, { isDefault: true })
    expect(list.add(one).name).toBe("one")
    expect(list.add(one, { name: "first" })).toMatchObject({ name: "first", prefix: "/r/first/", isDefault: true })
    expect(list.read()).toEqual({ default: "first", repos: [{ name: "first", checkout: one }] })
    expect(() => list.add(repo("other"), { name: "first" })).toThrow(RepoListError)
    expect(() => list.add(repo("x"), { name: "no/slash" })).toThrow(/can't be a repo name/)
  })

  test("remove and setDefault;  the file keeps Owen's comments", () => {
    const list = new RepoList({ home: scratch("epic-home-") })
    const [one, two] = [repo("one"), repo("two")]
    list.add(one)
    list.add(two, { isDefault: true })
    writeFileSync(list.file, `// Owen:  my repos\n${readFileSync(list.file, "utf8")}`)
    expect(list.remove("two")).toBe(true)
    expect(list.remove("two")).toBe(false)
    expect(list.defaultRepo?.name).toBe("one")
    expect(list.read().default).toBeUndefined()
    list.add(two)
    list.setDefault("two")
    expect(list.defaultRepo?.name).toBe("two")
    expect(() => list.setDefault("nope")).toThrow(/no repo "nope"/)
    expect(readFileSync(list.file, "utf8")).toMatch(/^\/\/ Owen:  my repos/)
  })

  test("urlPathFor():  at / for the default repo, at /r/<repo>/ for another;  through a link too;  else undefined", () => {
    const list = new RepoList({ home: scratch("epic-home-") })
    const [one, two] = [repo("one"), repo("two")]
    list.add(one)
    list.add(two)
    const page = join(one, "docs", "epics", "seo", "seo.plan.html")
    writeFileSync(page, "<p>seo</p>")
    expect(list.urlPathFor(page)).toBe("/epics/seo/seo.plan.html")
    expect(list.urlPathFor(join(two, "docs", "epics", "a b.html"))).toBe("/r/two/epics/a%20b.html")
    // a checkout's link into its content (as spell-app's `epics/` is):  the same page
    symlinkSync(join(one, "docs", "epics"), join(one, "epics"))
    expect(list.urlPathFor(join(one, "epics", "seo", "seo.plan.html"))).toBe("/epics/seo/seo.plan.html")
    expect(list.repoOf(page)?.repo.name).toBe("one")
    expect(list.urlPathFor(join(one, "package.json"))).toBeUndefined()
  })

  test("linkRootOf():  the registered repo whose content another checkout shares (I22);  else the checkout", () => {
    const list = new RepoList({ home: scratch("epic-home-") })
    const app = repo("app")
    // the engine's own epics are the app's content:  its config names the app's epic folder
    const engine = join(scratch("epic-engine-"), "engine")
    mkdirSync(join(engine, ".epic"), { recursive: true })
    writeFileSync(join(engine, ".epic", "config.json5"), `{ "contentFolder": "${join(app, "docs")}" }\n`)
    const own = scratch("epic-own-")
    // nobody registered yet:  each its own
    expect(list.linkRootOf(engine)).toBe(engine)
    list.add(app)
    expect(list.linkRootOf(engine)).toBe(app)
    expect(list.linkRootOf(app)).toBe(app)
    // a checkout holding its own pages
    expect(list.linkRootOf(own)).toBe(own)
    // an epic folder of its own (a demo check's scratch copies):  no repo's
    expect(list.linkRootOf(engine, join(own, "docs"))).toBe(engine)
  })

  test("linkRootOf():  a multi-repo top's pages are laid under the TOP, which serves them (readme P14)", () => {
    const list = new RepoList({ home: scratch("epic-home-") })
    const top = scratch("epic-top-")
    mkdirSync(join(top, ".epic"), { recursive: true })
    mkdirSync(join(top, "content"), { recursive: true })
    writeFileSync(join(top, ".epic", "config.json5"), `{ "contentFolder": "content", "repos": ["app", "engine"] }\n`)
    for (const child of ["app", "engine"]) {
      mkdirSync(join(top, child, ".epic"), { recursive: true })
      writeFileSync(join(top, child, ".epic", "config.json5"), `{ "contentFolder": "../content" }\n`)
    }
    // the app registered first, as on Owen's machine:  still the top
    list.add(join(top, "app"))
    list.add(top)
    expect(list.linkRootOf(join(top, "engine"))).toBe(top)
    expect(list.linkRootOf(join(top, "app"))).toBe(top)
    expect(list.linkRootOf(top)).toBe(top)
  })

  test("a repo whose config won't read is left out, the rest still listed", () => {
    const list = new RepoList({ home: scratch("epic-home-") })
    const [good, bad] = [repo("good"), repo("bad")]
    list.add(good)
    list.add(bad)
    writeFileSync(join(bad, ".epic", "config.json5"), "{ nope")
    const errors: unknown[] = []
    const error = console.error
    console.error = (...args: unknown[]) => void errors.push(args)
    try {
      expect(list.repos().map((each) => each.name)).toEqual(["good"])
    } finally {
      console.error = error
    }
    expect(errors).toHaveLength(1)
  })
})
