import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SessionFolders } from "spell-epic/config/SessionFolders"

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
  })

  // epic `epic-engine` r2:  after a handoff, ba126030's tab showed Claude Code's own title, written after its custom one
  test("shownTitle():  the record's name, else the transcript's LAST title line, custom or Claude's own", () => {
    const home = join(HOME, "shown")
    const custom = { type: "custom-title", customTitle: "🚧 editor" }
    const ai = { type: "ai-title", aiTitle: "Claude in Chrome browser automation" }
    const write = (id: string, ...entries: object[]) => {
      mkdirSync(join(home, "projects", "-a"), { recursive: true })
      writeFileSync(
        join(home, "projects", "-a", `${id}.jsonl`),
        entries.map((it) => JSON.stringify(it) + "\n").join("")
      )
    }
    write("custom-ai", custom, ai)
    write("ai-custom", ai, custom)
    write("custom", custom)
    write("cleared", ai, { type: "custom-title", customTitle: "" })

    expect(SessionFolders.shownTitle("custom-ai", home)).toBe("Claude in Chrome browser automation")
    expect(SessionFolders.shownTitle("ai-custom", home)).toBe("🚧 editor")
    expect(SessionFolders.shownTitle("custom", home)).toBe("🚧 editor")
    expect(SessionFolders.shownTitle("cleared", home)).toBeNull()
    expect(SessionFolders.shownTitle("none", home)).toBeNull()
    // running, titled by the prompt hook:  its record says what the tab shows;  a made-up name doesn't
    const hook = { sessionId: "custom-ai", name: "🚧 editor", nameSource: "hook" }
    expect(SessionFolders.shownTitle("custom-ai", home, hook)).toBe("🚧 editor")
    const derived = { sessionId: "custom-ai", name: "editor-cb", nameSource: "derived" }
    expect(SessionFolders.shownTitle("custom-ai", home, derived)).toBe("Claude in Chrome browser automation")
    // finding a session BY its name is unchanged:  the last custom title (I51)
    expect(SessionFolders.customTitle("custom-ai", home)).toBe("🚧 editor")
    expect(SessionFolders.recordTitle(derived, home)).toBe("🚧 editor")
  })

  test("requeueTitle():  the session's own title queued for its next prompt (the handoff), unless one is", () => {
    const home = join(HOME, "requeue")
    mkdirSync(join(home, "projects", "-a"), { recursive: true })
    const line = (entry: object) => JSON.stringify(entry) + "\n"
    writeFileSync(
      join(home, "projects", "-a", "moved.jsonl"),
      line({ type: "custom-title", customTitle: "🚧 editor" }) +
        line({ type: "ai-title", aiTitle: "Chrome automation" })
    )
    writeFileSync(
      join(home, "projects", "-a", "untitled.jsonl"),
      line({ type: "ai-title", aiTitle: "Chrome automation" })
    )
    const queued = (id: string) => readFileSync(join(home, "session-titles", id), "utf8")

    expect(SessionFolders.requeueTitle("moved", home)).toBe("🚧 editor")
    expect(queued("moved")).toBe("🚧 editor")
    // another title queued (a ✅, say) stays
    writeFileSync(join(home, "session-titles", "moved"), "✅ editor")
    expect(SessionFolders.requeueTitle("moved", home)).toBeNull()
    expect(queued("moved")).toBe("✅ editor")
    // no title of its own, no transcript, a bad id:  nothing
    expect(SessionFolders.requeueTitle("untitled", home)).toBeNull()
    expect(SessionFolders.requeueTitle("none", home)).toBeNull()
    expect(SessionFolders.requeueTitle("../x", home)).toBeNull()
  })
})
