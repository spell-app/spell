import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, describe, expect, it } from "vite-plus/test"

import { findPages } from "spell/epic/tools/pages.js"
import { PlanDoc, PlanDocFiles, sharedDocLog } from "spell/epic/tools/plan-doc.js"

/**
 * The docs tools with SHARED content (epic `shared-content`):  pages through a link to a folder in the epic repo.
 * - real links, in a temp folder
 */
const temp = mkdtempSync(join(tmpdir(), "docs-shared-"))
afterAll(() => rmSync(temp, { recursive: true, force: true }))

/** Write `text` at `path` under `temp`, making folders. */
function put(path, text = "<!doctype html><title>x</title>\n") {
  const file = join(temp, path)
  mkdirSync(join(file, ".."), { recursive: true })
  writeFileSync(file, text)
  return file
}

describe("findPages", () => {
  it("walks a linked folder, keeping the link's paths", () => {
    put("peer/content/a.html")
    put("peer/content/epics/x/x.plan.html")
    put("peer/elsewhere/b.html")
    mkdirSync(join(temp, "checkout"))
    symlinkSync("../peer/content", join(temp, "checkout/content"))
    symlinkSync("../elsewhere", join(temp, "peer/content/more"))
    const link = join(temp, "checkout/content")
    expect(findPages(link)).toEqual([
      join(link, "a.html"),
      join(link, "epics/x/x.plan.html"),
      join(link, "more/b.html")
    ])
  })
})

describe("sharedDocLog", () => {
  it("keeps this epic's commits:  `<epic> ...`, or a phase number with that phase's name", () => {
    const checkout = join(temp, "repo")
    mkdirSync(checkout)
    const git = (...args) => execFileSync("git", args, { cwd: checkout, encoding: "utf8" })
    git("init", "-q")
    for (const subject of [
      "P1:  Spike -- the throwaway test",
      "P1:  Other Name -- another epic's P1",
      "P2:  Move Logic Out -- the move",
      "Fix I3:  could be any epic's",
      "demo I3:  this epic's fix",
      "unrelated work"
    ])
      git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", subject)

    // the `epic` tool's own template, in <epic-*> markup (epic `epic-components` P8)
    const plan = PlanDoc.parse(readFileSync(new PlanDocFiles().template, "utf8"))
    plan.addPhase("Spike")
    plan.addPhase("Move Logic Out")
    const file = put("repo/packages/docs/content/epics/demo/demo.plan.html", plan.toString())

    expect(sharedDocLog(file, checkout).map((entry) => entry.subject)).toEqual([
      "demo I3:  this epic's fix",
      "P2:  Move Logic Out -- the move",
      "P1:  Spike -- the throwaway test"
    ])
  })

  it("reads every repo given, newest first, each commit with its repo's page and time;  a phase's name in the TITLE only, no other epic's (r17);  no merge commits (epic-engine P52)", () => {
    const repo = (folder, remote, subjects) => {
      const checkout = join(temp, folder)
      mkdirSync(checkout, { recursive: true })
      const git = (...args) => execFileSync("git", args, { cwd: checkout, encoding: "utf8" })
      git("init", "-q")
      git("remote", "add", "origin", remote)
      for (const [subject, at] of subjects)
        execFileSync(
          "git",
          ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", subject],
          {
            cwd: checkout,
            env: { ...process.env, GIT_COMMITTER_DATE: at, GIT_AUTHOR_DATE: at }
          }
        )
      return checkout
    }
    const kit = repo("kit", "https://github.com/spell-app/spell.git", [
      ["P1:  Fussbudget -- every epic's Doc Review runs it", "2026-10-20T10:00:00"],
      ["other P2:  Doc Review -- another epic's, naming its own", "2026-10-20T11:00:00"],
      ["demo P1:  Spike -- the kit's part", "2026-10-20T12:00:00"]
    ])
    // a merge commit naming the epic:  no change of its own (J145)
    const kitGit = (...args) =>
      execFileSync("git", args, {
        cwd: kit,
        encoding: "utf8",
        env: { ...process.env, GIT_COMMITTER_DATE: "2026-10-20T14:00:00", GIT_AUTHOR_DATE: "2026-10-20T14:00:00" }
      }).trim()
    const merge = kitGit(
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "commit-tree",
      "HEAD^{tree}",
      "-p",
      "HEAD",
      "-p",
      "HEAD~1",
      "-m",
      "demo P1:  Spike -- merged"
    )
    kitGit("update-ref", "HEAD", merge)
    const lang = repo("kit/spell-parser", "git@github.com:spell-app/spell-parser.git", [
      ["demo P2:  Doc Review -- spell-parser's part", "2026-10-20T13:00:00"]
    ])
    const plan = PlanDoc.parse(readFileSync(new PlanDocFiles().template, "utf8"))
    plan.addPhase("Spike")
    plan.addPhase("Doc Review")
    const file = put("kit-content/epics/demo/demo.plan.html", plan.toString())

    expect(sharedDocLog(file, [kit, lang])).toEqual([
      {
        sha: expect.any(String),
        subject: "demo P2:  Doc Review -- spell-parser's part",
        repo: "https://github.com/spell-app/spell-parser",
        time: expect.stringMatching(/^2026-10-20T13:00:00(Z|[+-]\d\d:\d\d)$/)
      },
      {
        sha: expect.any(String),
        subject: "demo P1:  Spike -- the kit's part",
        repo: "https://github.com/spell-app/spell",
        time: expect.stringMatching(/^2026-10-20T12:00:00(Z|[+-]\d\d:\d\d)$/)
      }
    ])
  })
})
