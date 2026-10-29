/**
 * Tests of comments shared through the content repo (`SharedComments`, epic `epic-friend` P9):  the files one
 * machine reads and writes, then two people, Ana and Ben, each with an epic home of their own and a clone of ONE bare
 * remote, all in a temp folder;  no network, never Spell's own content repo.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import { PersonCommands } from "spell/epic/command/PersonCommands"
import { Shared } from "spell/epic/command/Shared"
import { PlanDoc } from "spell/epic/tool/PlanDoc"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"
import { SharedComments } from "spell/epic/tool/SharedComments"
import { commentsOf } from "spell/epic/tools/commentsRoutes"

/** The tool's test fixtures:  `epic-plan.html`, a fresh doc in `<epic-*>` markup. */
const FIXTURES = fileURLToPath(new URL("fixtures", import.meta.url))

const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "shared-comments-")))
const REMOTE = join(TEMP, "plans.git")
const EPIC = "seo"
/** The epic home the setup gave this file ("Owen"), for the tests on one machine. */
const OWEN_HOME = process.env.SPELL_EPIC_HOME!
for (const [key, value] of Object.entries({ NAME: "Test", EMAIL: "test@example.com" })) {
  process.env[`GIT_AUTHOR_${key}`] = value
  process.env[`GIT_COMMITTER_${key}`] = value
}
afterAll(() => {
  process.env.SPELL_EPIC_HOME = OWEN_HOME
  rmSync(TEMP, { recursive: true, force: true })
})

/** A comment's place on the page:  the Overview's first part. */
const ON_O1 = { anchor: "o1#field-1", kind: "field", label: "Overview", excerpt: "its words" }

/** Run `git <args>` in `cwd`;  its output, trimmed. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", ["-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" }).trim()
}

/** A fresh epic page, at `doc`. */
function writePage(doc: string): void {
  mkdirSync(join(doc, ".."), { recursive: true })
  const plan = PlanDoc.parse(readFileSync(join(FIXTURES, "epic-plan.html"), "utf8"))
  plan.addItem("question", "which way?")
  writeFileSync(doc, plan.toString())
}

////////////////
// ## One machine
////////////////

describe("SharedComments, on one machine", () => {
  const folder = join(TEMP, "one", "epics", EPIC)
  const doc = join(folder, `${EPIC}.plan.html`)
  const inbox = ReviewInbox.pathFor(doc)

  test("a file per person, named by their name:  `seo.comments.ana-lima.json5`", () => {
    expect(SharedComments.pathFor(inbox, "Ana Lima")).toBe(join(folder, "seo.comments.ana-lima.json5"))
    expect(SharedComments.slugOf("  José  Díaz ")).toBe("josé-díaz")
    expect(SharedComments.slugOf("...")).toBe("someone")
    expect(SharedComments.isCommentsFile("guides/x.comments.ana.json5")).toBe(true)
    expect(SharedComments.isCommentsFile("guides/x.inbox.json5")).toBe(false)
    expect(SharedComments.inboxOf("guides/x.comments.ana.json5")).toBe("guides/x.inbox.json5")
  })

  test("an inbox file from before:  its comments read as they were, then moved into the person's file by the next write;  the inbox keeps its own", () => {
    writePage(doc)
    const old = {
      version: 1,
      sent: "2026-10-28T10:00:00.000Z",
      marks: { q1: { action: "approve", at: "2026-10-28T09:00:00.000Z" } },
      comments: {
        c1: { ...ON_O1, text: "Old words", at: "2026-10-28T09:30:00.000Z", status: "new" },
        // the oldest spelling of a key still reads
        m2: { ...ON_O1, text: "Older", at: "2026-10-28T09:31:00.000Z", status: "answered" }
      }
    }
    writeFileSync(inbox, JSON.stringify(old))
    const read = ReviewInbox.read(inbox)
    expect(Object.keys(read.comments)).toEqual(["c1", "c2"])
    expect(read.unsentComments).toEqual([])
    ReviewInbox.update(inbox, (box) => box.touchListening())
    const local = JSON.parse(readFileSync(inbox, "utf8"))
    expect(local).not.toHaveProperty("comments")
    expect(local).toMatchObject({ sent: old.sent, marks: { q1: { action: "approve" } } })
    const owen = JSON.parse(readFileSync(join(folder, "seo.comments.owen.json5"), "utf8"))
    // stamped the machine's person's:  they were this machine's
    expect(owen.comments).toMatchObject({ c1: { text: "Old words", by: "Owen" }, c2: { text: "Older", by: "Owen" } })
    expect(ReviewInbox.read(inbox).commentList.all.map(({ id, text }) => [id, text])).toEqual([
      ["c1", "Old words"],
      ["c2", "Older"]
    ])
  })

  test("everyone's comments, one list:  replies by time, a close only while nothing was said since, whose agent took it;  written back, each piece stays where it was said", () => {
    rmSync(folder, { recursive: true, force: true })
    writePage(doc)
    const ana = {
      version: 1,
      comments: {
        c1: {
          ...ON_O1,
          text: "Ana's question",
          by: "Ana",
          at: "2026-10-29T10:00:00.000Z",
          status: "new",
          replies: [{ by: "Ana", agent: "claude", at: "2026-10-29T10:05:00.000Z", html: "<p>Ana's Claude</p>" }],
          done: { how: "good", at: "2026-10-29T10:06:00.000Z", by: "Ana" }
        }
      },
      on: {}
    }
    const ben = {
      version: 1,
      comments: {},
      on: { c1: { replies: [{ by: "Ben", at: "2026-10-29T10:07:00.000Z", text: "Ben's word" }] } }
    }
    writeFileSync(join(folder, "seo.comments.ana.json5"), JSON.stringify(ana))
    writeFileSync(join(folder, "seo.comments.ben.json5"), JSON.stringify(ben))
    const [comment] = ReviewInbox.read(inbox).commentList.all
    expect(comment!.replies?.map((reply) => reply.by)).toEqual(["Ana", "Ben"])
    // Ben spoke after Ana closed it:  open again, Claude's turn, answered once Ana's Claude spoke
    expect([comment!.done, comment!.status]).toEqual([undefined, "answered"])
    // Owen, a third person, replies:  his words go in HIS file, under Ana's comment's id;  hers and Ben's untouched
    ReviewInbox.update(inbox, (box) => box.commentList.reply("c1", "Owen too", new Date("2026-10-29T10:08:00.000Z")))
    expect(JSON.parse(readFileSync(join(folder, "seo.comments.owen.json5"), "utf8"))).toEqual({
      version: 1,
      comments: {},
      on: { c1: { replies: [{ by: "Owen", at: "2026-10-29T10:08:00.000Z", text: "Owen too" }] } }
    })
    expect(JSON.parse(readFileSync(join(folder, "seo.comments.ana.json5"), "utf8"))).toEqual(ana)
    expect(JSON.parse(readFileSync(join(folder, "seo.comments.ben.json5"), "utf8"))).toEqual(ben)
    // only Ana changes or clears hers
    expect(() => ReviewInbox.update(inbox, (box) => box.commentList.clear("c1"))).toThrow(/C1 is Ana's/)
  })
})

////////////////
// ## Two people
////////////////

/** One person's machine:  their epic home (their name), and a checkout whose content repo clones the remote. */
function machine(name: string) {
  const main = join(TEMP, name.toLowerCase())
  const home = join(main, ".home")
  mkdirSync(join(main, ".epic"), { recursive: true })
  mkdirSync(home, { recursive: true })
  writeFileSync(join(home, "person.json5"), `{ name: "${name}" }\n`)
  git(main, "init", "-q", "-b", "main")
  writeFileSync(
    join(main, ".epic", "config.json5"),
    JSON.stringify({ contentFolder: "plans", contentRemote: REMOTE, sharedFolders: [] })
  )
  const dir = join(main, "plans")
  const shared = new Shared({ checkout: main, config: { main, dir, worktrees: [], links: [] } })
  const doc = join(dir, "epics", EPIC, `${EPIC}.plan.html`)
  return {
    name,
    main,
    home,
    dir,
    shared,
    doc,
    inbox: ReviewInbox.pathFor(doc),
    files: new PlanDocFiles({ root: main, content: dir })
  }
}

type Machine = ReturnType<typeof machine>

/** Run `work` at `who`'s keyboard:  their epic home, so everything written names them. */
function at<T>(who: Machine, work: () => T): T {
  process.env.SPELL_EPIC_HOME = who.home
  return work()
}

/** The page's comments as `who`'s page server answers them (`commentsOf()`, the comments route's GET). */
function pageComments(who: Machine) {
  return at(who, () => commentsOf(who.doc).all)
}

describe("two people, one content repo", () => {
  const ana = machine("Ana")
  const ben = machine("Ben")

  test("Ana comments and syncs:  her comments file is committed, her inbox never;  Ben's sync brings the thread to his page, not answered", async () => {
    git(TEMP, "init", "-q", "--bare", "-b", "main", REMOTE)
    await at(ana, async () => {
      ana.shared.init()
      expect(ana.shared.publish(REMOTE)).toBeUndefined()
      git(REMOTE, "symbolic-ref", "HEAD", `refs/heads/${git(ana.dir, "branch", "--show-current")}`)
      writePage(ana.doc)
      ReviewInbox.update(ana.inbox, (box) => {
        box.commentList.add(ON_O1, "Is this the right way?")
        box.markSent()
      })
      expect((await ana.shared.sync()).sync).toMatchObject({ result: "synced", pushed: true })
    })
    const tracked = git(ana.dir, "ls-files", `epics/${EPIC}`).split("\n")
    expect(tracked).toContain(`epics/${EPIC}/${EPIC}.comments.ana.json5`)
    expect(tracked).not.toContain(`epics/${EPIC}/${EPIC}.inbox.json5`)
    // nothing local waits to be committed:  the inbox file is ignored
    expect(existsSync(ana.inbox)).toBe(true)
    expect(git(ana.dir, "status", "--porcelain")).toBe("")
    expect(ben.shared.clone(REMOTE)).toBeUndefined()
    expect(pageComments(ben)).toMatchObject([{ id: "c1", by: "Ana", text: "Is this the right way?", status: "new" }])
  })

  test("Ana's agent takes it, Ben's doesn't:  each Send hands over only that person's own threads", () => {
    const benTook = at(ben, () => {
      let taken = null as ReturnType<ReviewInbox["takeWork"]>
      ReviewInbox.update(ben.inbox, (box) => {
        expect(box.commentList.waiting.map((each) => each.id)).toEqual(["c1"])
        box.markSent()
        taken = box.takeWork()
      })
      return taken
    })
    expect(benTook).toBeNull()
    const anaTook = at(ana, () => {
      let taken = null as ReturnType<ReviewInbox["takeWork"]>
      ReviewInbox.update(ana.inbox, (box) => {
        taken = box.takeWork()
        box.commentList.setWorking("c1", true)
      })
      return taken
    })
    expect(anaTook?.sent?.comments.map((each) => each.id)).toEqual(["c1"])
  })

  test("Ben sees whose agent took it, and replies on Ana's thread:  his words in his own file;  Ana's sync brings them, her turn to send", async () => {
    await at(ana, () => ana.shared.sync())
    await at(ben, () => ben.shared.sync())
    expect(pageComments(ben)[0]).toMatchObject({ working: expect.any(String), claim: { by: "Ana", agent: "claude" } })
    at(ben, () => ReviewInbox.update(ben.inbox, (box) => box.commentList.reply("c1", "And the table?")))
    expect(JSON.parse(readFileSync(join(ben.dir, "epics", EPIC, "seo.comments.ben.json5"), "utf8"))).toMatchObject({
      comments: {},
      on: { c1: { replies: [{ by: "Ben", text: "And the table?" }] } }
    })
    await at(ben, () => ben.shared.sync())
    await at(ana, () => ana.shared.sync())
    at(ana, () => ReviewInbox.update(ana.inbox, (box) => box.commentList.answer("c1", "<p>Yes, both.</p>")))
    const thread = pageComments(ana)[0]!
    expect(thread.replies?.map((reply) => [reply.by, reply.agent ?? "person"])).toEqual([
      ["Ben", "person"],
      ["Ana", "claude"]
    ])
    // Ana's file holds her Claude's answer;  Ben's reply stays only in his
    const anaFile = JSON.parse(readFileSync(join(ana.dir, "epics", EPIC, "seo.comments.ana.json5"), "utf8"))
    expect(anaFile.comments.c1.replies).toEqual([expect.objectContaining({ by: "Ana", agent: "claude" })])
  })

  test("both comment at once:  both make C2;  the second to sync gets C3, its revisit following;  then both see the same three", async () => {
    at(ana, () => ReviewInbox.update(ana.inbox, (box) => box.commentList.add(ON_O1, "Ana's second")))
    at(ben, () =>
      ReviewInbox.update(ben.inbox, (box) => {
        const id = box.commentList.add(ON_O1, "Ben's second")
        box.noteComment(id, ReviewInbox.itemIds(readFileSync(ben.doc, "utf8")))
      })
    )
    await at(ana, () => ana.shared.sync())
    const { sync } = await at(ben, () => ben.shared.sync())
    expect(sync).toMatchObject({ result: "synced", renumbered: [{ epic: EPIC, renames: { c2: "c3" } }] })
    expect(at(ben, () => ReviewInbox.read(ben.inbox).marks.o1)).toMatchObject({ comments: ["c3"], note: /C3/ })
    await at(ana, () => ana.shared.sync())
    const texts = (who: Machine) => pageComments(who).map(({ id, text }) => [id, text])
    expect(texts(ana)).toEqual([
      ["c1", "Is this the right way?"],
      ["c2", "Ana's second"],
      ["c3", "Ben's second"]
    ])
    expect(texts(ben)).toEqual(texts(ana))
  })

  test("Ana renames herself Ana Lima:  her file moves in one commit, and Ben's sync shows the same comments under the new name", async () => {
    const print = vi.spyOn(CLI, "out").mockImplementation(() => undefined)
    const head = git(ana.dir, "rev-parse", "HEAD")
    await at(ana, () => new PersonCommands({ content: ana.dir }).rename("Ana Lima"))
    print.mockRestore()
    const folder = join(ana.dir, "epics", EPIC)
    expect(existsSync(join(folder, "seo.comments.ana.json5"))).toBe(false)
    expect(existsSync(join(folder, "seo.comments.ana-lima.json5"))).toBe(true)
    expect(git(ana.dir, "rev-list", "--count", `${head}..HEAD`)).toBe("1")
    expect(git(ana.dir, "show", "--name-status", "--format=", "-M", "HEAD")).toMatch(
      /^R\d+\s+epics\/seo\/seo\.comments\.ana\.json5\s+epics\/seo\/seo\.comments\.ana-lima\.json5$/m
    )
    await at(ana, () => ana.shared.sync())
    await at(ben, () => ben.shared.sync())
    expect(pageComments(ben).map(({ id, by }) => [id, by])).toEqual([
      ["c1", "Ana Lima"],
      ["c2", "Ana Lima"],
      ["c3", "Ben"]
    ])
    // her claim follows the name too
    expect(pageComments(ben)[0]!.claim?.by).toBe("Ana Lima")
  })
})
