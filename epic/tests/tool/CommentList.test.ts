/**
 * Tests of `CommentList`:  comments added, edited and deleted while they wait;  taken and answered by Claude;
 * and an epic page's review inbox holding them.
 */
import { describe, expect, test } from "vite-plus/test"

import { ThreadFacts } from "spell/epic/comments"
import { CommentList, CommentsError, type Comment } from "spell/epic/tool/CommentList"
import { GuideInbox } from "spell/epic/tool/GuideInbox"
import { ReviewInbox } from "spell/epic/tool/ReviewInbox"

/** A comment's place:  the second field of phase 3. */
const ON_FIELD = { anchor: "p3#field-2", kind: "field", label: "Notes", excerpt: "A note bubble" }

/** Who writes through the lists:  their name on every entry. */
const PERSON = "Owen"

/** When everything happens. */
const NOW = new Date("2026-10-10T14:02:00.000Z")

/** A time after agents' replies were marked (`ThreadFacts.AGENTS_MARKED`):  no name says who wrote it. */
const MARKED = new Date("2026-11-05T10:00:00.000Z")

describe("CommentList", () => {
  test("adds comments `c1`, `c2` ... (shown C1) (never a todo's `t1`);  a quote rides along with its offset", () => {
    const comments = new CommentList({}, { person: PERSON })
    expect(comments.add(ON_FIELD, "  Which file?  ", NOW)).toBe("c1")
    expect(comments.add({ ...ON_FIELD, quote: " the inbox file ", offset: 14 }, "This one?", NOW)).toBe("c2")
    expect(comments.all).toEqual([
      { id: "c1", ...ON_FIELD, text: "Which file?", by: PERSON, at: NOW.toISOString(), status: "new" },
      {
        id: "c2",
        ...ON_FIELD,
        quote: "the inbox file",
        offset: 14,
        text: "This one?",
        by: PERSON,
        at: NOW.toISOString(),
        status: "new"
      }
    ])
    expect([CommentList.isCommentId("c2"), CommentList.isCommentId("t2")]).toEqual([true, false])
  })

  test("Owen edits or deletes one only while it waits;  Claude takes it, or answers it", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "one", NOW)
    comments.edit(id, "one, better", NOW)
    expect(comments.comment(id)).toMatchObject({ text: "one, better", edited: NOW.toISOString() })
    comments.take(id, { epic: "guide-changes", phase: 4 }, NOW)
    expect(() => comments.edit(id, "x")).toThrow(expect.objectContaining({ status: 409 }))
    expect(() => comments.remove(id)).toThrow(CommentsError)
    comments.answer(id, "<p>Done.</p>", NOW)
    expect(comments.comment(id)).toMatchObject({
      status: "taken",
      taken: { epic: "guide-changes", phase: 4 },
      replies: [{ by: PERSON, agent: "claude", html: "<p>Done.</p>" }]
    })
    const other = comments.add(ON_FIELD, "two", NOW)
    comments.answer(other)
    expect([comments.comment(other).status, comments.waiting]).toEqual(["answered", []])
  })

  // epic `epic-engine` I16:  a phase's number moves when one goes in ahead of it;  its id never does
  test("taken into a phase by its id and title too:  its thread links by the id;  an older one by its number", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "one", NOW)
    const into = { epic: "guide-changes", phase: 4, phaseId: "p-memory", title: "Memory" }
    comments.take(id, into, NOW)
    expect(comments.comment(id).taken).toEqual({ ...into, at: NOW.toISOString() })
    expect(ThreadFacts.takenInto(comments.comment(id).taken!)).toEqual({
      hash: "p-memory",
      label: "guide-changes · Memory"
    })
    expect(ThreadFacts.takenInto({ epic: "guide-changes", phase: 4 })).toEqual({
      hash: "p4",
      label: "guide-changes P4"
    })
    // Undo keeps them;  an id that isn't a phase's is dropped
    const restored = comments.restore(id, { ...comments.comment(id) })
    expect(comments.comment(restored).taken).toMatchObject({ phaseId: "p-memory", title: "Memory" })
    const bad = { ...comments.comment(id), taken: { ...into, phaseId: "#nope", at: NOW.toISOString() } }
    expect(comments.comment(comments.restore("c9", bad)).taken).not.toHaveProperty("phaseId")
  })

  test("Undo:  a deleted or cleared comment comes back as it was, under its id unless a new one took it", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add({ ...ON_FIELD, quote: "the inbox file", offset: 14 }, "Which one?", NOW)
    comments.take(id, { epic: "guide-changes", phase: 4 }, NOW)
    comments.answer(id, "<p>That one.</p>", NOW)
    const before = comments.all[0]
    comments.clear(id)
    expect(comments.restore(id, before)).toBe(id)
    expect(comments.all).toEqual([before])
    // deleted, then a new comment took its id:  back under the next one
    comments.clear(id)
    expect(comments.add(ON_FIELD, "newer", NOW)).toBe(id)
    expect(comments.restore(id, before)).toBe("c2")
    const { id: _id, ...kept } = before
    expect(comments.comment("c2")).toEqual(kept)
    expect(comments.all.map(({ id: each, text }) => [each, text])).toEqual([
      ["c1", "newer"],
      ["c2", "Which one?"]
    ])
    expect(() => comments.restore("c9", { ...before, text: "  " })).toThrow(/needs some text/)
    expect(() => comments.restore("c9", { ...before, status: "gone" as "new" })).toThrow(/isn't a comment's status/)
    expect(() => comments.restore("c9", { ...before, anchor: "two words" })).toThrow(/isn't an anchor/)
  })

  test("any AGENT (epic `epic-friend` P10):  Bob's Codex's answer and claim stamped `agent: \"codex\"`, read when it answers", () => {
    let agent = "claude"
    const comments = new CommentList({}, { person: "Bob", agent: () => agent })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    agent = "codex"
    comments.setWorking(id, true, NOW)
    comments.answer(id, "<p>So.</p>", NOW)
    expect(comments.comment(id)).toMatchObject({
      claim: { by: "Bob", agent: "codex" },
      replies: [{ by: "Bob", agent: "codex", html: "<p>So.</p>" }]
    })
    expect(ThreadFacts.turnOf(comments.comment(id))).toBe("person")
    // nobody said:  Claude's, as before
    expect(new CommentList({}).agent).toBe("claude")
  })

  test("a THREAD:  Claude answers, Owen replies (saved as typed, one pending reply), Claude answers again", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "Why here?", NOW)
    expect([ThreadFacts.turnOf(comments.comment(id)), comments.waiting.length]).toEqual(["agent", 1])
    comments.answer(id, "<p>Because.</p>", NOW)
    expect([ThreadFacts.turnOf(comments.comment(id)), comments.waiting]).toEqual(["person", []])
    // typed in two goes:  the second save replaces the first
    const later = new Date("2026-10-10T14:05:00.000Z")
    comments.reply(id, "Not good enough", later)
    comments.reply(id, "  Not good enough:  say more.  ", later)
    expect(comments.comment(id).replies).toEqual([
      { by: PERSON, agent: "claude", at: NOW.toISOString(), html: "<p>Because.</p>" },
      { by: PERSON, at: later.toISOString(), text: "Not good enough:  say more.", edited: later.toISOString() }
    ])
    // a reply is new work, as a new comment is
    expect([ThreadFacts.turnOf(comments.comment(id)), comments.waiting.map((each) => each.id)]).toEqual(["agent", [id]])
    comments.answer(id, "<p>More.</p>", later, "8c7e1d3")
    expect(comments.comment(id).replies?.at(-1)).toMatchObject({
      by: PERSON,
      agent: "claude",
      html: "<p>More.</p>",
      commit: "8c7e1d3"
    })
    expect(() => comments.answer(id, "<p>x</p>", later, "not a sha")).toThrow(/isn't a commit/)
    // his next reply is a new entry, not an edit of the last one
    comments.reply(id, "Thanks", later)
    expect(comments.comment(id).replies).toHaveLength(4)
  })

  test("Owen's pending reply emptied goes;  none pending, a blank reply is refused", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    comments.answer(id, "<p>Because.</p>", NOW)
    expect(() => comments.reply(id, "  ")).toThrow(expect.objectContaining({ status: 400 }))
    comments.reply(id, "Hm", NOW)
    comments.reply(id, " ", NOW)
    expect([comments.comment(id).replies?.length, ThreadFacts.turnOf(comments.comment(id))]).toEqual([1, "person"])
    expect(() => comments.reply("c9", "x")).toThrow(expect.objectContaining({ status: 404 }))
  })

  test("that's good / skip it close a thread;  reopen, or a reply, opens it again", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    comments.answer(id, "<p>Because.</p>", NOW)
    comments.resolve(id, "good", NOW)
    expect([comments.comment(id).done, ThreadFacts.turnOf(comments.comment(id)), comments.waiting]).toEqual([
      { how: "good", at: NOW.toISOString(), by: PERSON },
      "done",
      []
    ])
    comments.reopen(id)
    expect(ThreadFacts.turnOf(comments.comment(id))).toBe("person")
    comments.resolve(id, "skip", NOW)
    expect(comments.comment(id).done?.how).toBe("skip")
    comments.reply(id, "One more thing", NOW)
    expect([comments.comment(id).done, ThreadFacts.turnOf(comments.comment(id))]).toEqual([undefined, "agent"])
    expect(() => comments.resolve(id, "maybe")).toThrow(expect.objectContaining({ status: 400 }))
  })

  test("a reply on a TAKEN comment waits until it's taken again;  an epic page's answered in the doc is Owen's turn", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "Fix it", NOW)
    comments.take(id, { epic: "guide-changes", phase: 4 }, NOW)
    expect([ThreadFacts.turnOf(comments.comment(id)), comments.waiting]).toEqual(["agent", []])
    const later = new Date("2026-10-10T15:00:00.000Z")
    comments.reply(id, "And the table too", later)
    expect(comments.waiting.map((each) => each.id)).toEqual([id])
    comments.take(id, { epic: "guide-changes", phase: 4 }, later)
    expect(comments.waiting).toEqual([])
    // answered in the epic page:  no words here, but Owen's turn;  a second answer adds nothing
    const doc = comments.add(ON_FIELD, "Epic page", NOW)
    comments.answer(doc)
    comments.answer(doc)
    expect([comments.comment(doc).replies, ThreadFacts.turnOf(comments.comment(doc))]).toEqual([
      [{ by: PERSON, agent: "claude", at: expect.any(String), html: "" }],
      "person"
    ])
    // before threads:  answered, no replies at all, is Owen's turn too
    expect(ThreadFacts.turnOf({ ...comments.comment(doc), replies: undefined })).toBe("person")
  })

  test("Undo keeps the whole thread:  Owen's replies, Claude's commits, done", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    comments.answer(id, "<p>Because.</p>", NOW, "abc1234")
    comments.reply(id, "Fine", NOW)
    comments.answer(id, "<p>Good.</p>", NOW)
    comments.resolve(id, "good", NOW)
    const before = comments.all[0]
    comments.clear(id)
    comments.restore(id, before)
    expect(comments.all).toEqual([before])
  })

  test("refuses a bad anchor or kind, blank text, a comment that isn't there", () => {
    const comments = new CommentList({}, { person: PERSON })
    expect(() => comments.add({ ...ON_FIELD, anchor: "two words" }, "x")).toThrow(/isn't an anchor/)
    expect(() => comments.add({ ...ON_FIELD, kind: "Field!" }, "x")).toThrow(/kind of block/)
    expect(() => comments.add(ON_FIELD, "   ")).toThrow(/needs some text/)
    expect(() => comments.remove("c9")).toThrow(expect.objectContaining({ status: 404 }))
  })

  test("NEVER an empty comment:  white space, or characters that draw nothing, are refused on add and edit", () => {
    const comments = new CommentList({}, { person: PERSON })
    for (const blank of ["", " \n\t ", " ", "​‍", " ⁠ ", undefined])
      expect(() => comments.add(ON_FIELD, blank as string)).toThrow(/needs some text/)
    const id = comments.add(ON_FIELD, "  kept  ", NOW)
    expect(() => comments.edit(id, " \n ")).toThrow(expect.objectContaining({ status: 400 }))
    expect(comments.comment(id).text).toBe("kept")
  })

  test("WORKING:  Claude thinking about it -- not waiting, his last reply read;  answer() turns it off", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
    comments.answer(id, "<p>Because.</p>", later(1))
    comments.reply(id, "Say more", later(2))
    expect(comments.waiting.map((each) => each.id)).toEqual([id])
    comments.setWorking(id, true, later(3))
    // set again:  the first time stays
    comments.setWorking(id, true, later(4))
    expect(comments.comment(id).working).toBe(later(3).toISOString())
    expect([comments.waiting, ThreadFacts.turnOf(comments.comment(id))]).toEqual([[], "agent"])
    // his reply is read:  more words go after it, as a new reply, and wait again
    comments.reply(id, "And the other one", later(5))
    expect(comments.comment(id).replies!.map((each) => each.text ?? each.html)).toEqual([
      "<p>Because.</p>",
      "Say more",
      "And the other one"
    ])
    expect(comments.waiting.map((each) => each.id)).toEqual([id])
    comments.answer(id, "<p>Both done.</p>", later(6))
    expect(comments.comment(id).working).toBeUndefined()
    comments.setWorking(id, true, later(7))
    comments.setWorking(id, false)
    expect(comments.comment(id).working).toBeUndefined()
    expect(() => comments.setWorking("c9", true)).toThrow(expect.objectContaining({ status: 404 }))
  })

  test("lastWordsAt:  when Owen last changed his words on the thread -- his comment, his replies, their edits", () => {
    const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000)
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "one", NOW)
    expect(ThreadFacts.lastWordsAt(comments.comment(id))).toBe(NOW.toISOString())
    comments.edit(id, "one, better", later(1))
    expect(ThreadFacts.lastWordsAt(comments.comment(id))).toBe(later(1).toISOString())
    comments.answer(id, "<p>Because.</p>", later(2))
    // Claude's words never count
    expect(ThreadFacts.lastWordsAt(comments.comment(id))).toBe(later(1).toISOString())
    comments.reply(id, "Say more", later(3))
    comments.reply(id, "Say more, please", later(4))
    expect(ThreadFacts.lastWordsAt(comments.comment(id))).toBe(later(4).toISOString())
  })
})

describe("ids:  shown C3, typed C3 / c3 / cm3, keyed c3;  an older file's cm3 read as c3 (epic `epic-workflow` P23, J178)", () => {
  /** A comment as a file holds it, with text `text`. */
  const held = (text: string): Comment => ({ ...ON_FIELD, text, at: NOW.toISOString(), status: "new" })

  test("idOf():  every way an id is typed, as the file keys it;  anything else as it is", () => {
    expect(["C3", "c3", "cm3", "CM3", "#C3", " c03 "].map(CommentList.idOf)).toEqual([
      "c3",
      "c3",
      "c3",
      "c3",
      "c3",
      "c3"
    ])
    expect(["j3", "t3", "m", "mm3", "p-epic-migrate"].map(CommentList.idOf)).toEqual([
      "j3",
      "t3",
      "m",
      "mm3",
      "p-epic-migrate"
    ])
  })

  test("label():  as Owen sees it, C3;  isCommentId():  every spelling, never a todo's or an item's", () => {
    expect(["cm3", "c3", "C3", "#cm12"].map(CommentList.label)).toEqual(["C3", "C3", "C3", "C12"])
    expect(CommentList.label("j3")).toBe("j3")
    expect(["C3", "c3", "cm3", "CM3"].every(CommentList.isCommentId)).toBe(true)
    expect(["t3", "j3", "q1", "mm3", "m"].some(CommentList.isCommentId)).toBe(false)
  })

  test("every method takes C3, c3 or the old cm3 for the comment the file keys c3", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "one", NOW)
    expect(id).toBe("c1")
    comments.edit("C1", "one, better", NOW)
    comments.setWorking("cm1", true, NOW)
    expect(comments.comment("C1")).toMatchObject({ text: "one, better", working: NOW.toISOString() })
    comments.answer("C1", "<p>Yes.</p>", NOW)
    comments.reply("cm1", "Thanks", NOW)
    comments.resolve("C1", "good", NOW)
    expect(Object.keys(comments.comments)).toEqual(["c1"])
    comments.clear("cm1")
    expect(comments.comments).toEqual({})
    expect(() => comments.comment("C9")).toThrow(/no comment C9 here/)
  })

  test("Undo under the old cm3 comes back keyed c3", () => {
    const comments = new CommentList({}, { person: PERSON })
    const id = comments.add(ON_FIELD, "one", NOW)
    const before = comments.all[0]!
    comments.remove(id)
    expect(comments.restore("cm1", before)).toBe("c1")
  })

  test("migrate():  an older file's cm3 is read as c3;  a clash (cm2 and c2:  an older checkout added one) takes the next number", () => {
    const record: Record<string, Comment> = { cm2: held("two"), c1: held("one"), c2: held("clash"), cm5: held("five") }
    const comments = new CommentList(record)
    expect(Object.keys(record)).toEqual(["c1", "c2", "c3", "c5"])
    expect(comments.comment("C3").text).toBe("two")
    expect(comments.comment("C2").text).toBe("clash")
    expect(comments.comment("C5").text).toBe("five")
    expect(comments.add(ON_FIELD, "next", NOW)).toBe("c6")
  })

  // epic `epic-engine` P44:  comments were `m3` ("M" for mark), and `M3` is a manual test's now
  test("migrate():  an older file's m3 is read as c3 too;  TYPED, M3 and m3 are a manual test's, never a comment's", () => {
    const record: Record<string, Comment> = { m2: held("two"), m1: held("one"), cm4: held("four") }
    const comments = new CommentList(record)
    expect(Object.keys(record)).toEqual(["c1", "c2", "c4"])
    expect(comments.comment("C2").text).toBe("two")
    expect(["M3", "m3", "#M3"].map(CommentList.idOf)).toEqual(["M3", "m3", "#M3"])
    expect(["M3", "m3"].some(CommentList.isCommentId)).toBe(false)
    expect(["m3", "cm3", "c3", "M3"].map(CommentList.keyOf)).toEqual(["c3", "c3", "c3", "c3"])
  })

  test("migrate():  a file keyed c3 already, or with no comments, is left as it is (the same object, same order)", () => {
    const record: Record<string, Comment> = { c2: held("two"), c1: held("one") }
    expect(Object.keys(CommentList.migrate(record))).toEqual(["c2", "c1"])
    expect(CommentList.migrate({})).toEqual({})
  })

  test("both inboxes read an older file's cm3 as c3, and write it so next time", () => {
    const review = new ReviewInbox({ comments: { cm1: held("on an epic page") } })
    expect(Object.keys(review.comments)).toEqual(["c1"])
    const guide = new GuideInbox({ comments: { cm4: held("on a guide") } })
    expect(Object.keys(guide.comments)).toEqual(["c4"])
    expect(guide.commentList.comment("C4").text).toBe("on a guide")
    expect(Object.keys(JSON.parse(JSON.stringify(guide)).comments)).toEqual(["c4"])
  })
})

describe("CommentList:  who wrote it (epic `epic-friend` P2)", () => {
  test("each entry names its person:  the comment and a reply by `by`;  Claude's answer `agent` too, `by` whose session", () => {
    const comments = new CommentList({}, { person: "Ana" })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    comments.answer(id, "<p>Because.</p>", NOW)
    comments.reply(id, "And then?", NOW)
    expect(comments.comment(id)).toMatchObject({
      by: "Ana",
      replies: [
        { by: "Ana", agent: "claude", html: "<p>Because.</p>" },
        { by: "Ana", text: "And then?" }
      ]
    })
    expect([ThreadFacts.turnOf(comments.comment(id)), comments.waiting.length]).toEqual(["agent", 1])
  })

  test("a person NAMED Claude replying is a person:  Claude's turn, the reply theirs to change", () => {
    const comments = new CommentList({}, { person: "Claude" })
    const id = comments.add(ON_FIELD, "Hello", MARKED)
    comments.answer(id, "<p>Hi.</p>", MARKED)
    comments.reply(id, "I'm a person", MARKED)
    expect([ThreadFacts.turnOf(comments.comment(id)), ThreadFacts.pendingOf(comments.comment(id))]).toEqual([
      "agent",
      "reply"
    ])
  })

  test("the person is asked only when something's written;  none given:  someone", () => {
    let asked = 0
    const comments = new CommentList({}, { person: () => (asked++, "Ben") })
    expect([comments.all, asked]).toEqual([[], 0])
    expect(comments.comment(comments.add(ON_FIELD, "Hm", NOW)).by).toBe("Ben")
    const plain = new CommentList({})
    expect(plain.comment(plain.add(ON_FIELD, "x", NOW)).by).toBe("someone")
  })

  test("migrate():  Claude's old answers marked his (`agent`), once;  a person's reply, and one dated since, left", () => {
    const record: Record<string, Comment> = {
      c1: {
        ...ON_FIELD,
        text: "Why?",
        at: NOW.toISOString(),
        status: "answered",
        replies: [
          { by: "Claude", at: "2026-10-12T08:00:00.000Z", html: "<p>Because.</p>" },
          { by: "Owen", at: "2026-10-12T09:00:00.000Z", text: "Hm" },
          { by: "Claude", at: "2026-11-05T09:00:00.000Z", text: "a person named Claude" }
        ]
      }
    }
    CommentList.migrate(record)
    expect(record.c1!.replies!.map((reply) => reply.agent)).toEqual(["claude", undefined, undefined])
    expect(CommentList.markAgents(record)).toBe(false)
  })

  test("restore():  each entry keeps who wrote it, and Claude's its marker", () => {
    const comments = new CommentList({}, { person: "Ana" })
    const id = comments.add(ON_FIELD, "Why?", NOW)
    comments.answer(id, "<p>Because.</p>", NOW)
    comments.reply(id, "Ok", NOW)
    const gone = structuredClone(comments.comment(id))
    comments.clear(id)
    comments.restore(id, gone)
    expect(comments.comment(id)).toEqual(gone)
  })
})

describe("ReviewInbox.commentList", () => {
  test("an epic page's comments live in its review inbox, which isn't empty while it holds one", () => {
    const inbox = new ReviewInbox()
    expect(inbox.isEmpty).toBe(true)
    inbox.commentList.add(ON_FIELD, "Which file?", NOW)
    expect([inbox.isEmpty, Object.keys(inbox.comments)]).toEqual([false, ["c1"]])
    expect(new ReviewInbox(JSON.parse(JSON.stringify(inbox))).commentList.waiting).toHaveLength(1)
  })
})
