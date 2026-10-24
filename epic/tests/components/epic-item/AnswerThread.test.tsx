import { afterEach, describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import { AnswerThread } from "spell-epic/components/epic-item/AnswerThread"

import "spell-epic/components/epic-item"
import "spell-epic/components/epic-answer"
import "spell-epic/components/epic-status"
import "spell-epic/components/epic-choices"

////////////////
// ## Fixtures
////////////////

/** elemental-spell's Q16, cut down:  a chosen Choices, its answer, Owen's reply, Claude's, then a Noted and its Done. */
const ANSWERED =
  `<epic-item id="q16" title="What are the tags called?" open answered>` +
  `<epic-status slot="status" state="noted" at="2026-10-24 15:21" done-at="2026-10-24 15:25">` +
  `<p>Recording your tag model.</p></epic-status>` +
  `<epic-status slot="status" state="done" at="2026-10-24 15:25" done-at="2026-10-24 15:25">` +
  `<p>Recording your tag model.</p><p slot="summary">template= recorded, with the tag model in a table</p>` +
  `</epic-status>` +
  `<epic-question><p>What are they called?</p></epic-question>` +
  `<epic-choices chosen="A"><epic-option letter="A" title="template="><p>As Owen wrote it.</p></epic-option>` +
  `<epic-option letter="B" title="is="><p>Like code spell.</p></epic-option></epic-choices>` +
  `<epic-answer title="template=, as Owen wrote it"></epic-answer>` +
  `<epic-reply from="Owen" at="2026-10-24 14:46" re="revisit soon"><p>Here is my tag model.</p></epic-reply>` +
  `<epic-reply from="Claude" at="2026-10-24 15:34"><p>Recorded:  here is the model in one table.</p></epic-reply>` +
  `</epic-item>`

/** The same, with a DRIVE-BY first:  a card taken at 14:02, before Owen's first reply (14:46). */
const WITH_DRIVE_BY = ANSWERED.replace(
  `open answered>`,
  `open answered><epic-status slot="status" state="done" at="2026-10-24 14:02" done-at="2026-10-24 14:05">` +
    `<p>Adding the alias example.</p></epic-status>`
)

/** An issue's answer:  no Choices, so its card stays. */
const ISSUE =
  `<epic-item id="i3" title="The fold jumps" open answered><p>It jumps.</p>` +
  `<epic-answer title="Animate it"><p>Height, in the section timing.</p></epic-answer></epic-item>`

/** `localStorage` key of the replies seen on this test page. */
const SEEN_KEY = `spell-item-read:${location.pathname}`

afterEach(() => localStorage.removeItem(SEEN_KEY))

/** Parse `html` into a detached element (no upgrade needed:  `AnswerThread` reads attributes). */
function parsed(html: string): Element {
  const box = document.createElement("template")
  box.innerHTML = html
  return box.content.firstElementChild!
}

/** `host`'s child of tag `tag` (the `index`th). */
function child(host: Element, tag: string, index = 0): HTMLElement {
  return host.querySelectorAll<HTMLElement>(`:scope > ${tag}`)[index]
}

/** The text a status line draws, its slotted words included, spaces folded. */
function lineText(status: HTMLElement): string {
  const base = status.shadowRoot!.querySelector<HTMLElement>("[part~='base']")!
  const own = [...base.querySelectorAll<HTMLElement>("[part~='steps'], [part~='earlier']")].map((x) => x.textContent)
  const summary = status.querySelector("[slot='summary']")?.textContent
  const words = summary ?? status.querySelector("p:not([slot])")?.textContent ?? ""
  return `${own.join("")} · ${words}`.replace(/\s+/g, " ").trim()
}

////////////////
// ## Tests
////////////////

describe("AnswerThread.of()", () => {
  test("the thread, in order:  Owen's reply, Claude's, then the status run's ONE line, last;  the Noted merged into the Done's", () => {
    const item = parsed(ANSWERED)
    const thread = AnswerThread.of(item)
    const [noted, done] = item.querySelectorAll("epic-status")
    const [owens, claudes] = item.querySelectorAll("epic-reply")
    expect({
      chosen: thread.chosen,
      owens: thread.placeOf(owens),
      claudes: thread.placeOf(claudes),
      done: thread.placeOf(done),
      noted: thread.lineOf(noted),
      line: thread.lineOf(done),
      newest: thread.newestReply === claudes,
      answer: thread.placeOf(item.querySelector("epic-answer")!)
    }).toEqual({
      chosen: true,
      owens: { start: true, end: false },
      claudes: { start: false, end: false },
      done: { start: false, end: true },
      noted: "merged",
      line: {
        where: "thread",
        steps: [
          { state: "noted", at: "2026-10-24 15:21" },
          { state: "done", at: "2026-10-24 15:25" }
        ]
      },
      newest: true,
      answer: undefined
    })
  })

  test("no reply of Owen's:  no drive-bys, every card is about what he marked, last in the thread", () => {
    const item = parsed(
      `<epic-item id="t2"><epic-status slot="status" state="noted" at="2026-10-19 12:36"></epic-status>` +
        `<epic-reply from="Claude" at="2026-10-19 13:40"><p>Done.</p></epic-reply></epic-item>`
    )
    const thread = AnswerThread.of(item)
    const status = item.querySelector("epic-status")!
    expect({ line: thread.lineOf(status), place: thread.placeOf(status) }).toEqual({
      line: { where: "thread", steps: [{ state: "noted", at: "2026-10-19 12:36" }] },
      place: { start: false, end: true }
    })
  })

  test("a DRIVE-BY (taken before Owen's first reply) is a line of its own, `drive-by`, out of the thread", () => {
    const item = parsed(WITH_DRIVE_BY)
    const thread = AnswerThread.of(item)
    const early = item.querySelector("epic-status")!
    expect({ line: thread.lineOf(early), place: thread.placeOf(early) }).toEqual({
      line: { where: "drive-by", steps: [{ state: "done", at: "2026-10-24 14:05" }] },
      place: undefined
    })
  })

  test("no NEW once Owen replied after Claude;  a card before his reply is a drive-by;  the said note then ends the thread", () => {
    const item = parsed(
      `<epic-item id="t1"><epic-status slot="status" state="noted" at="2026-10-19 12:36"></epic-status>` +
        `<epic-reply from="Claude" at="2026-10-19 13:05"><p>Done.</p></epic-reply>` +
        `<epic-reply from="Owen" at="2026-10-19 13:09"><p>Thanks.</p></epic-reply></epic-item>`
    )
    const thread = AnswerThread.of(item, { said: true })
    expect({
      line: thread.lineOf(item.querySelector("epic-status")!),
      newest: thread.newestReply,
      said: thread.said,
      chosen: thread.chosen
    }).toEqual({
      line: { where: "drive-by", steps: [{ state: "noted", at: "2026-10-19 12:36" }] },
      newest: undefined,
      said: { start: false, end: true },
      chosen: false
    })
  })
})

describe("<epic-item>'s thread, drawn", () => {
  test("no Answer strip when the Choices say Chosen;  the merged line `✓ Noted 10/24/26 15:21 → Done 15:25 · ...` LAST, after Claude's reply", async () => {
    const host = await ElementFixture.render(ANSWERED)
    await ElementFixture.settle()
    const [noted, done] = host.querySelectorAll<HTMLElement>("epic-status")
    const claudes = child(host, "epic-reply", 1)
    expect({
      answer: getComputedStyle(child(host, "epic-answer")).display,
      noted: getComputedStyle(noted).display,
      line: lineText(done),
      lastInThread: done.getBoundingClientRect().top >= claudes.getBoundingClientRect().bottom - 1,
      states: [done.matches(":state(line)"), done.matches(":state(in-thread)"), done.matches(":state(thread-end)")]
    }).toEqual({
      answer: "none",
      noted: "none",
      line: "Noted 10/24/26 15:21 → Done 15:25 · template= recorded, with the tag model in a table",
      lastInThread: true,
      states: [true, true, true]
    })
  })

  test("a drive-by's line goes ABOVE the Choices, `your earlier comment` after its steps", async () => {
    const host = await ElementFixture.render(WITH_DRIVE_BY)
    await ElementFixture.settle()
    const early = host.querySelector<HTMLElement>("epic-status")!
    expect({
      above: early.getBoundingClientRect().bottom <= child(host, "epic-choices").getBoundingClientRect().top,
      aboveQuestion: early.getBoundingClientRect().bottom <= child(host, "epic-question").getBoundingClientRect().top,
      line: lineText(early),
      driveBy: early.matches(":state(drive-by)")
    }).toEqual({
      above: true,
      aboveQuestion: true,
      line: "Done 10/24/26 14:05 · your earlier comment · Adding the alias example.",
      driveBy: true
    })
  })

  test("an answer with no Choices (an issue's) keeps its card and band", async () => {
    const host = await ElementFixture.render(ISSUE)
    await ElementFixture.settle()
    const answer = child(host, "epic-answer")
    expect({
      display: getComputedStyle(answer).display,
      band: answer.shadowRoot!.querySelector<HTMLElement>("[part~='header']")!.hidden,
      redundant: answer.matches(":state(redundant)")
    }).toEqual({ display: "block", band: false, redundant: false })
  })

  test("Claude's newest reply wears NEW and an orange edge;  Owen's doesn't;  gone once seen on screen (1.2s), and stays gone", async () => {
    const host = await ElementFixture.render(ANSWERED)
    await ElementFixture.settle()
    const [owens, claudes] = host.querySelectorAll<HTMLElement>("epic-reply")
    const tag = () => claudes.shadowRoot!.querySelector<HTMLElement>("[part~='new']")
    expect({
      owens: owens.matches(":state(new)"),
      claudes: claudes.matches(":state(new)"),
      tag: tag()?.textContent
    }).toEqual({ owens: false, claudes: true, tag: "NEW" })
    expect(getComputedStyle(claudes.shadowRoot!.querySelector("[part~='base']")!).borderLeftWidth).toBe("3px")
    claudes.scrollIntoView()
    await expect.poll(() => claudes.matches(":state(new)"), { timeout: 4000 }).toBe(false)
    expect(JSON.parse(localStorage.getItem(SEEN_KEY)!)).toEqual({ q16: "2026-10-24 15:34" })
    // drawn again:  remembered in this browser
    host.remove()
    const again = await ElementFixture.render(ANSWERED)
    await ElementFixture.settle()
    expect(again.querySelectorAll("epic-reply")[1].matches(":state(new)")).toBe(false)
  })
})

describe("<epic-item>'s request for More Details", () => {
  test("Owen's note asking for More Details sits ABOVE Claude's card, FOLDED, out of the thread;  a later reply is the thread", async () => {
    const host = await ElementFixture.render(
      `<epic-item id="j41" title="A call" open><p>The call.</p>` +
        `<epic-reply from="Owen" at="2026-10-11 11:13" re="revisit now"><p>Need more detail</p></epic-reply>` +
        `<epic-more><p>More about it.</p></epic-more>` +
        `<epic-reply from="Owen" at="2026-10-11 12:00" re="revisit soon"><p>Why?</p></epic-reply>` +
        `</epic-item>`
    )
    await ElementFixture.settle()
    const [request, later] = host.querySelectorAll<HTMLElement>("epic-reply")
    const more = child(host, "epic-more")
    const body = (reply: HTMLElement) => reply.shadowRoot!.querySelector<HTMLElement>("[part~='body']")!
    expect({
      above: request.getBoundingClientRect().bottom <= more.getBoundingClientRect().top,
      folded: body(request).getAttribute("hidden"),
      requestInThread: request.matches(":state(in-thread)"),
      laterOpen: body(later).getAttribute("hidden"),
      laterInThread: later.matches(":state(in-thread)")
    }).toEqual({ above: true, folded: "until-found", requestInThread: false, laterOpen: null, laterInThread: true })
  })
})
