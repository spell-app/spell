import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell-kit/test-helpers/ElementFixture"
import { expectAccessible } from "spell-kit/test-helpers/A11y"

import type { ThreadComment } from "spell-epic/comments"
import type { DOMThreadElement } from "spell-epic/components/epic-thread"

import "spell-ui/components/ui-button"
import "spell-ui/components/ui-icon"
import "spell-epic/components/epic-thread"

/** `element`'s shadow part `name`. */
function part(element: Element, name: string): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>(`[part~='${name}']`)!
}

/** A comment as the comments route answers it, on section `context`. */
function comment(fields: Partial<ThreadComment> = {}): ThreadComment {
  return {
    id: "m3",
    anchor: "context",
    kind: "section",
    label: "2. Context",
    excerpt: "",
    text: "Why asyncio?\n\nAnd `await`?",
    at: "2026-10-17T13:12:00.000Z",
    status: "new",
    turn: "claude",
    ...fields
  }
}

/** A thread for `data`, open or not, in the page. */
async function thread(data: ThreadComment, attributes = ""): Promise<DOMThreadElement> {
  const wrap = await ElementFixture.render(
    `<div><epic-thread id="comment-${data.id}" ${attributes}></epic-thread></div>`
  )
  const host = wrap.querySelector<DOMThreadElement & { comment: unknown }>("epic-thread")!
  host.comment = data
  await ElementFixture.settle(wrap)
  return host
}

/** Its messages, as drawn:  who, older / latest, and their words. */
function messages(host: Element) {
  return [...host.shadowRoot!.querySelectorAll("epic-thread-message")].map((each) => ({
    by: each.getAttribute("by"),
    older: each.hasAttribute("older"),
    latest: each.hasAttribute("latest"),
    words: each.textContent?.trim()
  }))
}

describe("<epic-thread>", () => {
  test("its header:  the bullhorn, its id `M3`, the first words it's on, the fold's tooltip the block in full", async () => {
    const host = await thread(comment())
    expect({
      id: part(host, "id").textContent,
      headline: part(host, "headline").textContent,
      tip: part(host, "fold").title,
      expanded: part(host, "fold").getAttribute("aria-expanded"),
      body: !!part(host, "body")
    }).toEqual({
      id: "M3",
      headline: "“2. Context”",
      tip: "Comment M3, on “2. Context”\n(Unfold this thread)",
      expanded: "false",
      body: false
    })
  })

  test("Claude's turn, his words new:  the pen and the trash, no answer pills;  open:  his words, in paragraphs", async () => {
    const host = await thread(comment(), "open")
    const shadow = host.shadowRoot!
    expect({
      pen: !!shadow.querySelector("ui-button.edit"),
      trash: !!shadow.querySelector("ui-button.delete"),
      pills: !!shadow.querySelector("epic-review"),
      messages: messages(host),
      paragraphs: shadow.querySelectorAll("epic-thread-message p").length,
      code: shadow.querySelector("epic-thread-message code")?.textContent
    }).toEqual({
      pen: true,
      trash: true,
      pills: false,
      messages: [{ by: "owen", older: false, latest: false, words: "Why asyncio?And await?" }],
      paragraphs: 2,
      code: "await"
    })
  })

  test("Owen's turn, orange:  the review pills (That's good, Reply, Skip it), Claude's latest stronger", async () => {
    const answered = comment({
      status: "answered",
      turn: "owen",
      replies: [{ by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>Because <code>await</code>.</p>" }]
    })
    const host = await thread(answered, "open unseen")
    const review = host.shadowRoot!.querySelector("epic-review")!
    await ElementFixture.settle(host)
    const acts = [...review.shadowRoot!.querySelectorAll("ui-button")].map((each) => each.getAttribute("data-act"))
    expect({
      buttons: review.getAttribute("buttons"),
      acts,
      pen: !!host.shadowRoot!.querySelector("ui-button.edit")
    }).toEqual({ buttons: "thread", acts: ["good", "reply", "skip"], pen: false })
    expect(messages(host)).toEqual([
      { by: "owen", older: true, latest: false, words: "Why asyncio?And await?" },
      { by: "claude", older: false, latest: true, words: "Because await." }
    ])
    const ivory = getComputedStyle(host).backgroundColor
    host.removeAttribute("unseen")
    await ElementFixture.settle(host)
    expect(getComputedStyle(host).backgroundColor).not.toBe(ivory)
  })

  test("thinking:  the stub last, in Claude's box;  done:  the Done line and Reopen, no stub", async () => {
    const thinking = await thread(comment({ working: "2026-10-17T14:00:00.000Z" }), "open")
    expect(messages(thinking).map((each) => [each.by, each.words])).toEqual([
      ["owen", "Why asyncio?And await?"],
      ["thinking", "thinking…"]
    ])
    const done = await thread(
      comment({
        status: "answered",
        turn: "done",
        replies: [{ by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>Fixed.</p>", commit: "a1b2c3d" }],
        done: { how: "good", at: "2026-10-18T09:00:00.000Z" }
      }),
      "open"
    )
    const review = done.shadowRoot!.querySelector("epic-review")!
    expect({
      last: messages(done).at(-1),
      buttons: review.getAttribute("buttons"),
      mark: done.shadowRoot!.querySelector(".mark")!.classList.contains("done")
    }).toEqual({
      last: { by: "done", older: false, latest: false, words: "That's good.  Built in a1b2c3d." },
      buttons: "closed",
      mark: true
    })
  })

  test("taken into an epic:  the line links the phase by its stable id", async () => {
    const host = await thread(
      comment({
        status: "taken",
        taken: { epic: "guide-changes", phase: 4, phaseId: "p-memory", title: "Memory", at: "2026-10-17T14:00:00.000Z" }
      }),
      "open"
    )
    const link = host.shadowRoot!.querySelector<HTMLAnchorElement>("epic-thread-message a")!
    expect([link.textContent, new URL(link.href).pathname + new URL(link.href).hash]).toEqual([
      "guide-changes · Memory",
      "/epics/guide-changes/guide-changes.plan.html#p-memory"
    ])
  })

  test("`boxed`:  his words in the box under it are left out;  the box is slotted, its floppy in the corner", async () => {
    const host = await thread(comment(), "open boxed=first saved='Saved 14:02 · waiting for Claude'")
    const box = document.createElement("textarea")
    host.append(box)
    await ElementFixture.settle(host)
    const floppy = host.shadowRoot!.querySelector<HTMLElement>(".floppy")!
    expect({
      messages: messages(host).length,
      slotted: !!box.assignedSlot,
      pen: !!host.shadowRoot!.querySelector("ui-button.edit"),
      floppy: floppy.title
    }).toEqual({ messages: 0, slotted: true, pen: false, floppy: "Saved 14:02 · waiting for Claude" })
  })

  test("a click on its header folds it and says so;  the pen, the trash and the pills say theirs, and don't fold", async () => {
    const host = await thread(comment())
    const heard: string[] = []
    for (const name of ["epic-thread-fold", "epic-thread-edit", "epic-thread-delete"])
      host.addEventListener(name, (event) => heard.push(`${name} ${JSON.stringify((event as CustomEvent).detail)}`))
    part(host, "headline").click()
    await ElementFixture.settle(host)
    expect(host.hasAttribute("open")).toBe(true)
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.edit")!.click()
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.delete")!.click()
    await ElementFixture.settle(host)
    expect({ open: host.hasAttribute("open"), heard }).toEqual({
      open: true,
      heard: ['epic-thread-fold {"open":true}', "epic-thread-edit {}", "epic-thread-delete {}"]
    })
  })

  test("the pills' answer crosses into the page:  `epic-thread-answer`, `{ act }`", async () => {
    const host = await thread(
      comment({
        status: "answered",
        turn: "owen",
        replies: [{ by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>x</p>" }]
      }),
      "open"
    )
    const acts: string[] = []
    host.addEventListener("epic-thread-answer", (event) => acts.push((event as CustomEvent).detail.act))
    const review = host.shadowRoot!.querySelector("epic-review")!
    await ElementFixture.settle(host)
    review.shadowRoot!.querySelector<HTMLElement>('ui-button[data-act="skip"]')!.click()
    expect({ acts, open: host.hasAttribute("open") }).toEqual({ acts: ["skip"], open: true })
  })

  test("the DOM API:  its header, the focus to its fold", async () => {
    const host = await thread(comment())
    expect(host.header).toBe(part(host, "header"))
    host.focusFold()
    expect([host.isFoldFocused, document.activeElement]).toEqual([true, host])
  })

  test("accessible in both schemes, on the ivory and on the orange of Owen's turn (axe, contrast included)", async () => {
    for (const scheme of ["light", "dark"])
      for (const unseen of ["", "unseen"]) {
        const wrap = await ElementFixture.render(
          `<div style="color-scheme: ${scheme}; background: ${scheme === "dark" ? "#1b1c1d" : "#fff"}"><epic-thread open ${unseen}></epic-thread></div>`
        )
        const host = wrap.querySelector<DOMThreadElement & { comment: unknown }>("epic-thread")!
        host.comment = comment({
          status: "answered",
          turn: "owen",
          replies: [{ by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>Answered.</p>" }]
        })
        await ElementFixture.settle(wrap)
        // its id chip (`M3`, 10px) included:  epic `epic-engine` I41
        await expectAccessible(host)
      }
  })
})

describe("<epic-threads>", () => {
  test("a column of threads, 6px apart", async () => {
    const box = await ElementFixture.render(
      `<epic-threads><epic-thread></epic-thread><epic-thread></epic-thread></epic-threads>`
    )
    const style = getComputedStyle(part(box, "base"))
    expect([style.display, style.rowGap]).toEqual(["grid", "6px"])
  })
})
