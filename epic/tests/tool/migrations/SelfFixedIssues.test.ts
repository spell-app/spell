import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { SelfFixedIssues } from "spell/epic/tool/migrations/SelfFixedIssues"

/** When the tests' migrations run. */
const NOW = new Date(2026, 10, 22, 10)

/** A fixed issue waiting for review, as a page from before T143 has one. */
const fixed = (id: string, marks = "", body = "") =>
  `<epic-item id="${id}" status="open" state="replied" changed="2026-11-20T20:16:03-05:00" fixed ${marks}>` +
  `<span slot="title">Title of ${id} <epic-update became="fixed"></epic-update></span>${body}</epic-item>`

/** An epic page whose Issues hold `items`. */
function pageWith(...items: string[]): Document {
  return parseHTML(
    `<html><body><epic-page epic="x"><epic-section kind="issues">${items.join("")}</epic-section>` +
      `<epic-section kind="log"><epic-event>I6 urgent (Owen, from its id chip)</epic-event></epic-section></epic-page></body></html>`
  ).document as unknown as Document
}

describe("SelfFixedIssues (`self-fixed-issues`, epic `epic-engine` T143)", () => {
  test("Claude's finds go grey, his words light orange, what he got to stays orange;  again:  nothing", () => {
    const document = pageWith(
      fixed("i1", "calm"),
      fixed("i2"),
      fixed("i3", "requested"),
      fixed("i4", "urgent"),
      fixed("i5"),
      fixed("i6"),
      fixed("i7", "", `<epic-status slot="status" state="underway"></epic-status>`),
      fixed("i8", "", `<epic-reply from="Owen" at="2026-11-20 10:00"><p>phones too</p></epic-reply>`),
      fixed("i9", "", `<epic-reply from="Owen" agent="claude" at="2026-11-20 10:00"><p>done</p></epic-reply>`),
      fixed("j1")
    )
    const notes: string[] = []
    const step = new SelfFixedIssues()
    const context = { now: NOW, actedOn: new Set(["i5"]), notes }
    expect(step.run(document, context)).toBe(true)

    const item = (id: string) => document.getElementById(id)!
    const states = ["i1", "i2", "i3", "i4", "i5", "i6", "i7", "i8", "i9", "j1"].map((id) => [
      item(id).getAttribute("status"),
      item(id).getAttribute("state")
    ])
    expect(states).toEqual([
      ["done", "handled"],
      ["done", "handled"],
      ["open", "requested"],
      ["open", "replied"],
      ["open", "replied"],
      ["open", "replied"],
      ["open", "replied"],
      ["open", "replied"],
      ["done", "handled"],
      ["open", "replied"]
    ])
    expect([item("i1").hasAttribute("self-fixed"), item("i1").hasAttribute("fixed")]).toEqual([true, false])
    expect(item("i1").querySelector('[slot="title"]')!.textContent!.trim()).toBe("Title of i1")
    expect(item("i1").getAttribute("changed")).toBe("2026-11-20T20:16:03-05:00")
    expect([item("i3").hasAttribute("fixed"), !!item("i3").querySelector("epic-update")]).toEqual([true, true])
    expect(notes).toEqual([
      "self-fixed-issues:  FIXED, grey:  I1, I2, I9",
      "self-fixed-issues:  from the person's words, light orange:  I3"
    ])

    const after = document.body.innerHTML
    expect(step.run(document, context)).toBe(false)
    expect(document.body.innerHTML).toBe(after)
  })

  test("run again later:  never one fixed for review under the rule, nor one the Log says he OK'd (I375)", () => {
    const document = pageWith(fixed("i1"), fixed("i2"), fixed("i3"))
    document.querySelector('epic-section[kind="log"]')!.innerHTML +=
      '<epic-event at="2026-11-22T10:56-05:00">I1 fixed, for review:  Title of i1</epic-event>' +
      '<epic-event at="2026-11-22T09:49-05:00">I2 to do:  fix it when an agent is free</epic-event>' +
      '<epic-event at="2026-11-20T20:16-05:00">I3 fixed, for review:  Title of i3</epic-event>'
    const notes: string[] = []
    expect(new SelfFixedIssues().run(document, { now: NOW, notes })).toBe(true)
    expect(["i1", "i2", "i3"].map((id) => document.getElementById(id)!.getAttribute("status"))).toEqual([
      "open",
      "open",
      "done"
    ])
    expect(notes).toEqual(["self-fixed-issues:  FIXED, grey:  I3"])
  })

  test("only on command:  it reads the inbox and closes items", () => {
    expect(new SelfFixedIssues().everyEdit).toBe(false)
  })
})
