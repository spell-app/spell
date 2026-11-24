/**
 * Tests of `epic guides` (`Guides`, epic `epic-engine` P79), on a SCRATCH git repo and its epic folder beside it:
 * - `list`:  where each guide is, code, plugin, epic or both
 * - `move`:  a guide copied into the repo's guides folder, with its twin, its picture and its experiments, never its
 *   comments;  a saga's guides at once;  the epic folder keeps its copy
 * - `prune`:  once the base branch tracks the moved files, the epic folder's copies go, its comments stay
 * - `check`:  the epic plugin's guides are checked too (epic `epic-engine` I402)
 * - `move --plugin`:  into the epic plugin's own guides folder (epic `epic-engine` T130)
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { EXIT } from "spell/epic/command/command.types"
import { Guides } from "spell/epic/command/Guides"

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "epic-guides-")))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** A guide page naming saga `saga`, showing `picture` when given. */
function guide(title: string, { saga, picture }: { saga?: string; picture?: string } = {}): string {
  return [
    "<!doctype html>",
    "<html>",
    "  <head>",
    `    <title>${title}</title>`,
    `    <meta name="description" content="${title}." />`,
    ...(saga ? [`    <meta name="spell-saga" content="${saga}" />`] : []),
    "  </head>",
    `  <body><main><h1>${title}</h1>${picture ? `<img src="${picture}" />` : ""}</main></body>`,
    "</html>",
    ""
  ].join("\n")
}

/** Write `files` (path => text) under `folder`. */
function write(folder: string, files: Record<string, string>): void {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
}

/** A scratch repo `repo` with its epic folder `repo.epics` beside it, its config naming both;  git, on `main`. */
function scratch(name: string): { repo: string; content: string } {
  const repo = join(TEMP, name, "repo")
  const content = join(TEMP, name, "repo.epics")
  write(repo, {
    ".epic/config.json5": '{ "contentFolder": "../repo.epics", "guidesFolder": "guides", "baseBranch": "main" }',
    "README.md": "# Repo\n"
  })
  write(content, {
    "guides/data/data.html": guide("Data", { saga: "spell", picture: "flow.png" }),
    "guides/data/data.md": "# Data, for agents\n",
    "guides/data/flow.png": "PNG",
    "guides/data/data.inbox.json5": "{ comments: [] }\n",
    "guides/data/pictures/pasted.png": "PNG",
    "guides/data/experiments/try.ts": "export {}\n",
    "guides/mockup.html": guide("Mockup", { saga: "spell" }),
    "guides/private.html": guide("Private")
  })
  execFileSync("git", ["init", "-q", "-b", "main", repo])
  execFileSync("git", ["-C", repo, "add", "-A"])
  execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "start"])
  return { repo, content }
}

describe("epic guides", () => {
  test("move copies a guide with its twin, picture and experiments, never its comments;  the epic folder keeps it", () => {
    const { repo, content } = scratch("move")
    const guides = new Guides({ checkout: repo })
    const { copied } = guides.move(["guides/data/data.html"])
    expect(copied.sort()).toEqual([
      "guides/data/data.html",
      "guides/data/data.md",
      "guides/data/experiments",
      "guides/data/flow.png"
    ])
    expect(readFileSync(join(repo, "guides/data/experiments/try.ts"), "utf8")).toBe("export {}\n")
    expect(existsSync(join(repo, "guides/data/data.inbox.json5"))).toBe(false)
    expect(existsSync(join(repo, "guides/data/pictures"))).toBe(false)
    expect(existsSync(join(content, "guides/data/data.html"))).toBe(true)
    expect(guides.list()).toEqual([
      { path: "guides/data/data.html", where: "both" },
      { path: "guides/mockup.html", where: "epic" },
      { path: "guides/private.html", where: "epic" }
    ])
  })

  test("move SAGA:/<id> copies every guide naming the saga;  a dry run copies nothing", () => {
    const { repo } = scratch("saga")
    const guides = new Guides({ checkout: repo })
    const dry = guides.move(["SAGA:/spell"], { dryRun: true })
    expect(dry.copied).toContain("guides/mockup.html")
    expect(existsSync(join(repo, "guides"))).toBe(false)
    guides.move(["SAGA:/spell"])
    expect(existsSync(join(repo, "guides/mockup.html"))).toBe(true)
    expect(existsSync(join(repo, "guides/data/data.html"))).toBe(true)
    expect(existsSync(join(repo, "guides/private.html"))).toBe(false)
    expect(() => guides.move(["guides/nope.html"])).toThrow(/no guide guides\/nope.html/)
    expect(() => guides.move(["SAGA:/none"])).toThrow(/no guide in the epic folder names saga none/)
  })

  test("prune deletes the epic folder's copy of what main tracks, and only that;  the comments stay", () => {
    const { repo, content } = scratch("prune")
    new Guides({ checkout: repo }).move(["guides/data/data.html"])
    // not committed yet:  nothing to prune
    expect(Guides.prune(repo)).toEqual([])
    execFileSync("git", ["-C", repo, "add", "-A"])
    execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "moved"])
    expect(Guides.prune(repo, { dryRun: true })).toContain("guides/data/data.html")
    expect(existsSync(join(content, "guides/data/data.html"))).toBe(true)
    expect(Guides.prune(repo).sort()).toEqual([
      "guides/data/data.html",
      "guides/data/data.md",
      "guides/data/experiments/try.ts",
      "guides/data/flow.png"
    ])
    expect(existsSync(join(content, "guides/data/data.html"))).toBe(false)
    expect(existsSync(join(content, "guides/data/experiments"))).toBe(false)
    expect(existsSync(join(content, "guides/data/data.inbox.json5"))).toBe(true)
    expect(existsSync(join(content, "guides/data/pictures/pasted.png"))).toBe(true)
    expect(existsSync(join(content, "guides/private.html"))).toBe(true)
    expect(new Guides({ checkout: repo }).list().find((each) => each.path === "guides/data/data.html")?.where).toBe(
      "code"
    )
  })

  test("move --plugin copies a guide into the epic plugin's guides folder;  list says plugin, prune takes it out", () => {
    const { repo, content } = scratch("plugin")
    const before = process.env.SPELL_EPIC_PLUGIN_GUIDES
    // the plugin inside the repo, as the kit holds it (`epic/guides/`)
    process.env.SPELL_EPIC_PLUGIN_GUIDES = join(repo, "epic/guides")
    try {
      const guides = new Guides({ checkout: repo })
      expect(guides.move(["guides/mockup.html"], { plugin: true }).copied).toEqual(["epic/guides/mockup.html"])
      expect(existsSync(join(repo, "guides/mockup.html"))).toBe(false)
      expect(guides.list().find((each) => each.path === "guides/mockup.html")?.where).toBe("both")
      execFileSync("git", ["-C", repo, "add", "-A"])
      execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "moved"])
      expect(Guides.prune(repo)).toEqual(["guides/mockup.html"])
      expect(existsSync(join(content, "guides/mockup.html"))).toBe(false)
      expect(guides.list().find((each) => each.path === "guides/mockup.html")?.where).toBe("plugin")
      // a plugin that isn't in this repo (an npm install):  nothing to move into
      process.env.SPELL_EPIC_PLUGIN_GUIDES = join(TEMP, "elsewhere/guides")
      expect(() => guides.move(["guides/private.html"], { plugin: true })).toThrow(/doesn't hold the epic plugin/)
    } finally {
      process.env.SPELL_EPIC_PLUGIN_GUIDES = before
    }
  })

  test("check reads the epic plugin's guides too, which may link each other (I402)", async () => {
    const { repo } = scratch("plugin-check")
    const before = process.env.SPELL_EPIC_PLUGIN_GUIDES
    process.env.SPELL_EPIC_PLUGIN_GUIDES = join(repo, "epic/guides")
    const said = vi.spyOn(CLI, "out").mockImplementation(() => {})
    const toldErr = vi.spyOn(CLI, "err").mockImplementation(() => {})
    try {
      mkdirSync(join(repo, "epic/guides/how"), { recursive: true })
      writeFileSync(join(repo, "epic/guides/away.html"), '<a href="/guides/how/how.html">how</a>')
      writeFileSync(join(repo, "epic/guides/how/how.html"), '<a href="/epics/x/x.plan.html">plan</a>')
      expect(await new Guides({ checkout: repo }).run(["check"])).toBe(EXIT.ERRORS)
      const lines = said.mock.calls.flat().join("\n")
      expect(lines).toContain("epic/guides/how/how.html:  links /epics/x/x.plan.html, in the epic repo")
      expect(lines).not.toContain("away.html")
    } finally {
      said.mockRestore()
      toldErr.mockRestore()
      process.env.SPELL_EPIC_PLUGIN_GUIDES = before
    }
  })

  test("a repo with no guides folder:  move says how to name one;  prune does nothing", () => {
    const { repo } = scratch("none")
    writeFileSync(join(repo, ".epic/config.json5"), '{ "contentFolder": "../repo.epics" }')
    expect(() => new Guides({ checkout: repo }).move(["guides/private.html"])).toThrow(/"guidesFolder": "guides"/)
    expect(Guides.prune(repo)).toEqual([])
  })
})
