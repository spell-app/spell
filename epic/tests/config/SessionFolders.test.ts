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
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SessionFolders } from "$/epics/config/SessionFolders"

/** A throwaway Claude Code folder:  never the real `~/.claude`. */
const HOME = realpathSync(mkdtempSync(join(tmpdir(), "session-folders-")))
afterAll(() => rmSync(HOME, { recursive: true, force: true }))

const MAIN = "/Users/owen/www/spell-app/spell-app"
const BESIDE = "/Users/owen/www/spell-app/spell-app.worktrees/seo"

describe("SessionFolders", () => {
  test("the slug:  every character but letters and digits becomes `-`, as Claude Code names the folder", () => {
    expect(SessionFolders.slug(BESIDE)).toBe("-Users-owen-www-spell-app-spell-app-worktrees-seo")
    expect(SessionFolders.folderOf(MAIN, HOME)).toBe(join(HOME, "projects", "-Users-owen-www-spell-app-spell-app"))
  })

  test("home():  $CLAUDE_CONFIG_DIR when set, else ~/.claude", () => {
    const before = process.env.CLAUDE_CONFIG_DIR
    process.env.CLAUDE_CONFIG_DIR = HOME
    try {
      expect(SessionFolders.home()).toBe(HOME)
    } finally {
      if (before === undefined) delete process.env.CLAUDE_CONFIG_DIR
      else process.env.CLAUDE_CONFIG_DIR = before
    }
  })

  test("link():  the worktree's folder becomes a link to main's (made first);  again:  ok;  unlink():  gone", () => {
    const made = SessionFolders.link(BESIDE, MAIN, HOME)
    expect(made).toMatchObject({ action: "linked" })
    expect(lstatSync(made.folder).isSymbolicLink()).toBe(true)
    expect(readlinkSync(made.folder)).toBe(made.target)
    expect(SessionFolders.link(BESIDE, MAIN, HOME).action).toBe("ok")
    expect(SessionFolders.unlink(BESIDE, MAIN, HOME).action).toBe("removed")
    expect(lstatSync(made.folder, { throwIfNoEntry: false })).toBeUndefined()
    expect(lstatSync(made.target).isDirectory()).toBe(true)
    expect(SessionFolders.unlink(BESIDE, MAIN, HOME).action).toBe("none")
  })

  test("never loses a session:  a folder with sessions, or a link elsewhere, is kept;  an empty folder is replaced", () => {
    const busy = "/repo.worktrees/busy"
    mkdirSync(SessionFolders.folderOf(busy, HOME), { recursive: true })
    writeFileSync(join(SessionFolders.folderOf(busy, HOME), "a.jsonl"), "{}\n")
    expect(SessionFolders.link(busy, "/repo", HOME)).toMatchObject({
      action: "kept",
      why: "a folder with sessions in it"
    })
    expect(SessionFolders.unlink(busy, "/repo", HOME).action).toBe("kept")

    const empty = "/repo.worktrees/empty"
    mkdirSync(SessionFolders.folderOf(empty, HOME), { recursive: true })
    expect(SessionFolders.link(empty, "/repo", HOME).action).toBe("linked")

    const elsewhere = "/repo.worktrees/elsewhere"
    mkdirSync(join(HOME, "other"), { recursive: true })
    symlinkSync(join(HOME, "other"), SessionFolders.folderOf(elsewhere, HOME))
    expect(SessionFolders.link(elsewhere, "/repo", HOME)).toMatchObject({
      action: "kept",
      why: "a link to another folder"
    })
    expect(SessionFolders.unlink(elsewhere, "/repo", HOME).action).toBe("kept")
  })

  test("listed():  each real folder once, a linked worktree's skipped;  a link to an unlisted folder kept", () => {
    const projects = join(HOME, "listing")
    mkdirSync(join(projects, "-main"), { recursive: true })
    mkdirSync(join(projects, "-other"), { recursive: true })
    symlinkSync(join(projects, "-main"), join(projects, "-main-worktrees-seo"))
    mkdirSync(join(HOME, "outside"), { recursive: true })
    symlinkSync(join(HOME, "outside"), join(projects, "-moved"))
    symlinkSync(join(HOME, "nowhere"), join(projects, "-dangling"))
    writeFileSync(join(projects, "notes.txt"), "not a folder")
    expect(SessionFolders.listed(projects)).toEqual(["-main", "-moved", "-other"])
    expect(SessionFolders.listed(join(HOME, "missing"))).toEqual([])
  })

  // epic `epic-engine` I50, I51:  a resumed session's record has a made-up name;  its transcript has its title
  test("recordTitle():  the record's name, or its transcript's last custom title when the name was made up", () => {
    const home = join(HOME, "titles")
    const line = (entry: object) => JSON.stringify(entry) + "\n"
    const write = (folder: string, id: string, text: string) => {
      mkdirSync(join(home, "projects", folder), { recursive: true })
      writeFileSync(join(home, "projects", folder, `${id}.jsonl`), text)
    }
    write(
      "-a",
      "s1",
      line({ type: "custom-title", customTitle: "🚧 old" }) + line({ type: "custom-title", customTitle: "🚧 seo" })
    )
    // an ai-title is Claude Code's guess:  never the title asked for
    write("-a", "s2", line({ type: "ai-title", aiTitle: "seo work" }))
    // the title far from the end (a long turn since):  found in the whole file
    write(
      "-b",
      "s3",
      line({ type: "custom-title", customTitle: "🚧 far" }) + `{"pad":"${"x".repeat(5 * 1024 * 1024)}"}\n`
    )
    expect(SessionFolders.recordTitle({ sessionId: "s1", name: "seo-cb", nameSource: "derived" }, home)).toBe("🚧 seo")
    expect(SessionFolders.recordTitle({ sessionId: "s1", name: "🚧 given", nameSource: "hook" }, home)).toBe("🚧 given")
    expect(SessionFolders.recordTitle({ sessionId: "s1" }, home)).toBe("🚧 seo")
    expect(SessionFolders.recordTitle({ sessionId: "s2", name: "seo-a1", nameSource: "derived" }, home)).toBe("seo-a1")
    expect(SessionFolders.recordTitle({ sessionId: "none", nameSource: "derived" }, home)).toBe("")
    expect(SessionFolders.customTitle("s3", home)).toBe("🚧 far")
    expect(SessionFolders.transcriptOf("s3", home)).toBe(join(home, "projects", "-b", "s3.jsonl"))
  })
})
