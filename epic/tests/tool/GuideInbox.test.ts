/**
 * Tests of `GuideInbox`'s SEND (epic `epic-workflow` P13):  a docs page's comments wait for Owen's Send, as a plan
 * doc's do, and a waiting session takes each send once.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { GuideInbox } from "spell-epic/tool/GuideInbox"

const M1 = "2026-10-13T10:00:00.000Z"
const M2 = "2026-10-13T10:01:00.000Z"
const M3 = "2026-10-13T10:02:00.000Z"
const M4 = "2026-10-13T10:03:00.000Z"

const root = mkdtempSync(join(tmpdir(), "guide-inbox-"))

afterAll(() => rmSync(root, { recursive: true, force: true }))

test("a comment is unsent until Send;  a session takes the send once, until Owen speaks on the thread again", () => {
  const inbox = new GuideInbox()
  const id = inbox.commentList.add({ anchor: "summary", kind: "section" }, "Too long?", new Date(M1))
  expect(inbox.unsentComments.map((each) => each.id)).toEqual([id])
  expect([inbox.hasNewSend, inbox.takeSent()]).toEqual([false, null])
  inbox.markSent(M2)
  expect(inbox.unsentComments).toEqual([])
  expect(inbox.sentComments.map((each) => each.id)).toEqual([id])
  expect(inbox.takeSent()).toMatchObject({ at: M2, comments: [{ id, text: "Too long?" }] })
  // taken:  a second wait has nothing
  expect([inbox.hasNewSend, inbox.takeSent()]).toEqual([false, null])
  // a second Send with nothing new in it is taken quietly
  inbox.markSent(M3)
  expect(inbox.takeSent()).toBeNull()
  expect(inbox.hasNewSend).toBe(false)
  // Claude answers;  Owen replies:  waiting, unsent again, then sent and taken once more
  inbox.commentList.answer(id, "<p>Shorter now.</p>", new Date(M3))
  inbox.commentList.reply(id, "Still long", new Date(M4))
  expect(inbox.unsentComments.map((each) => each.id)).toEqual([id])
  inbox.markSent(new Date(Date.parse(M4) + 1000).toISOString())
  expect(inbox.takeSent()?.comments.map((each) => each.id)).toEqual([id])
})

test("the file keeps `sent` and `handedOver`;  with no comment left, it goes", () => {
  const file = join(root, "guide.inbox.json")
  GuideInbox.update(file, (comments, inbox) => {
    comments.add({ anchor: "page", kind: "page" }, "Hi", new Date(M1))
    inbox.markSent(M2)
  })
  expect(GuideInbox.read(file)).toMatchObject({ sent: M2, handedOver: null })
  expect(GuideInbox.update(file, (_comments, inbox) => inbox.takeSent())?.comments).toHaveLength(1)
  expect(GuideInbox.read(file)).toMatchObject({ sent: M2, handedOver: M2 })
  GuideInbox.update(file, (comments) => comments.clear("c1"))
  expect(existsSync(file)).toBe(false)
})
