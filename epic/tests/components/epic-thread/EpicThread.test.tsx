import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import type { ThreadComment } from "spell/epic/comments"
import type { DOMThreadElement } from "spell/epic/components/epic-thread"

import "spell/ui/components/ui-button"
import "spell/ui/components/ui-icon"
import "spell/epic/components/epic-thread"

/** `element`'s shadow part `name`. */
function part(element: Element, name: string): HTMLElement {
  return element.shadowRoot!.querySelector<HTMLElement>(`[part~='${name}']`)!
}

/** A comment as the comments route answers it, on section `context`. */
function comment(fields: Partial<ThreadComment> = {}): ThreadComment {
  return {
    id: "c3",
    anchor: "context",
    kind: "section",
    label: "2. Context",
    excerpt: "",
    text: "Why asyncio?\n\nAnd `await`?",
    at: "2026-10-17T13:12:00.000Z",
    status: "new",
    turn: "agent",
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

/** The page server's word on who's reading (`window.SPELL_SERVER.person`):  set for `run`, then put back. */
async function asViewer<T>(person: string, run: () => Promise<T>): Promise<T> {
  const holder = globalThis as { SPELL_SERVER?: unknown }
  const before = holder.SPELL_SERVER
  holder.SPELL_SERVER = { person }
  try {
    return await run()
  } finally {
    holder.SPELL_SERVER = before
  }
}

describe("<epic-thread>", () => {
  test("its header:  the bullhorn, its id `C3`, the first words it's on, the fold's tooltip the block in full", async () => {
    const host = await thread(comment())
    expect({
      id: part(host, "id").textContent,
      headline: part(host, "headline").textContent,
      tip: part(host, "fold").title,
      expanded: part(host, "fold").getAttribute("aria-expanded"),
      body: !!part(host, "body")
    }).toEqual({
      id: "C3",
      headline: "“Why asyncio? And `await`?”",
      tip: "Comment C3, on “2. Context”\n(Open this thread)",
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
      messages: [{ by: "person", older: false, latest: false, words: "Why asyncio?And await?" }],
      paragraphs: 2,
      code: "await"
    })
  })

  test("Owen's turn, orange:  the review pills (That's good, Reply, Skip it), Claude's latest stronger", async () => {
    const answered = comment({
      status: "answered",
      turn: "person",
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
      { by: "person", older: true, latest: false, words: "Why asyncio?And await?" },
      { by: "agent", older: false, latest: true, words: "Because await." }
    ])
    const ivory = getComputedStyle(host).backgroundColor
    host.removeAttribute("unseen")
    await ElementFixture.settle(host)
    expect(getComputedStyle(host).backgroundColor).not.toBe(ivory)
  })

  test("thinking:  the stub last, in Claude's box;  done:  the Done line and Reopen, no stub", async () => {
    const thinking = await thread(comment({ working: "2026-10-17T14:00:00.000Z" }), "open")
    expect(messages(thinking).map((each) => [each.by, each.words])).toEqual([
      ["person", "Why asyncio?And await?"],
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

  test("thinking is the page's BLUE (Claude at work on it), not his voice's violet;  `Claude:` in the ink", async () => {
    for (const scheme of ["light", "dark"]) {
      const host = await thread(comment({ working: "2026-10-17T14:00:00.000Z" }), "open")
      const page = host.parentElement!
      page.style.colorScheme = scheme
      // the colours as the page's tokens give them, read the same way:  the blue a phase's spinner and Underway take
      const probe = (color: string) => {
        const span = document.createElement("span")
        span.style.color = color
        page.append(span)
        const read = getComputedStyle(span).color
        span.remove()
        return read
      }
      const stub = host.shadowRoot!.querySelector("epic-thread-message[by='thinking']")!
      const words = stub.shadowRoot!.querySelector(".words")!
      const who = stub.shadowRoot!.querySelector(".who")!
      const blue = probe("var(--ui-blue-text, var(--ui-blue, #1a67e0))")
      expect({
        scheme,
        words: getComputedStyle(words).color,
        violet: getComputedStyle(words).color === probe("var(--ui-violet, #6435c9)"),
        whoIsBlue: getComputedStyle(who).color === blue,
        ring: getComputedStyle(stub).boxShadow.includes("0px 0px 0px 1px")
      }).toEqual({ scheme, words: blue, violet: false, whoIsBlue: false, ring: true })
    }
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
    for (const name of ["epic-thread-opened", "epic-thread-closed", "epic-thread-editing", "epic-thread-removing"])
      host.addEventListener(name, (event) => heard.push(`${name} ${JSON.stringify((event as CustomEvent).detail)}`))
    part(host, "headline").click()
    await ElementFixture.settle(host)
    expect(host.hasAttribute("open")).toBe(true)
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.edit")!.click()
    host.shadowRoot!.querySelector<HTMLElement>("ui-button.delete")!.click()
    await ElementFixture.settle(host)
    expect({ open: host.hasAttribute("open"), heard }).toEqual({
      open: true,
      heard: ['epic-thread-opened {"open":true}', "epic-thread-editing {}", "epic-thread-removing {}"]
    })
  })

  test("the pills' answer crosses into the page:  `epic-thread-answered`, `{ act }`", async () => {
    const host = await thread(
      comment({
        status: "answered",
        turn: "person",
        replies: [{ by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>x</p>" }]
      }),
      "open"
    )
    const acts: string[] = []
    host.addEventListener("epic-thread-answered", (event) => acts.push((event as CustomEvent).detail.act))
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
          turn: "person",
          replies: [{ by: "Claude", at: "2026-10-18T08:05:00.000Z", html: "<p>Answered.</p>" }]
        })
        await ElementFixture.settle(wrap)
        // its id chip (`C3`, 10px) included:  epic `epic-engine` I41
        await expectAccessible(host)
      }
  })
  test("who, to a reader named Ana:  her words `You:`, Ben's `Ben:`, her Claude `Claude:`, Ben's `Claude (Ben):`;  an old comment with no `by` is the reader's own", async () => {
    const said = comment({
      by: "Ana",
      status: "answered",
      turn: "person",
      replies: [
        { by: "Ana", agent: "claude", at: "2026-11-02T10:00:00.000Z", html: "<p>Mine.</p>" },
        { by: "Ben", at: "2026-11-02T10:01:00.000Z", text: "Hm." },
        { by: "Ben", agent: "claude", at: "2026-11-02T10:02:00.000Z", html: "<p>His.</p>" },
        { by: "Claude", at: "2026-11-05T10:00:00.000Z", text: "A person named Claude." }
      ]
    })
    const whoOf = (host: Element) =>
      [...host.shadowRoot!.querySelectorAll("epic-thread-message")].map((each) => [
        each.getAttribute("by"),
        each.shadowRoot!.querySelector(".who")?.textContent
      ])
    const [named, old] = await asViewer("Ana", async () => [
      whoOf(await thread(said, "open")),
      whoOf(await thread(comment(), "open"))
    ])
    expect(named).toEqual([
      ["person", "You:"],
      ["agent", "Claude:"],
      ["person", "Ben:"],
      ["agent", "Claude (Ben):"],
      ["person", "Claude:"]
    ])
    expect(old).toEqual([["person", "You:"]])
  })

  test("any agent by its name (epic `epic-friend` P10):  Bob's Codex `Codex (Bob):`, Ana's own `Codex:`, thinking too", async () => {
    const said = comment({
      by: "Ana",
      status: "answered",
      turn: "agent",
      replies: [
        { by: "Bob", agent: "codex", at: "2026-11-02T10:00:00.000Z", html: "<p>Bob's.</p>" },
        { by: "Ana", agent: "codex", at: "2026-11-02T10:01:00.000Z", html: "<p>Mine.</p>" },
        { by: "Ana", at: "2026-11-02T10:02:00.000Z", text: "And?" }
      ],
      working: "2026-11-02T10:03:00.000Z",
      claim: { by: "Bob", agent: "gemini", at: "2026-11-02T10:03:00.000Z" }
    })
    const whoOf = (host: Element) =>
      [...host.shadowRoot!.querySelectorAll("epic-thread-message")]
        .slice(1)
        .map((each) => [each.getAttribute("by"), each.shadowRoot!.querySelector(".who")?.textContent])
    expect(await asViewer("Ana", async () => whoOf(await thread(said, "open")))).toEqual([
      ["agent", "Codex (Bob):"],
      ["agent", "Codex:"],
      ["person", "You:"],
      ["thinking", "Gemini (Bob):"]
    ])
  })

  test("colours (epic `epic-friend` P10, Q16):  an agent's box in the agent's voice;  a speaker's own colour from the settings", async () => {
    const said = comment({
      by: "Ana",
      status: "answered",
      turn: "person",
      replies: [
        { by: "Ana", agent: "claude", at: "2026-11-02T10:00:00.000Z", html: "<p>Claude's.</p>" },
        { by: "Bob", agent: "codex", at: "2026-11-02T10:01:00.000Z", html: "<p>Codex's.</p>" }
      ]
    })
    const looks = async (server: Record<string, unknown>) => {
      const holder = globalThis as { SPELL_SERVER?: unknown }
      const before = holder.SPELL_SERVER
      holder.SPELL_SERVER = server
      try {
        const host = await thread(said, "open")
        return [...host.shadowRoot!.querySelectorAll("epic-thread-message")].map((each) => ({
          voice: (each as HTMLElement).style.getPropertyValue("--_epic-voice") || undefined,
          ring: getComputedStyle(each).boxShadow,
          who: getComputedStyle(each.shadowRoot!.querySelector(".who")!).color
        }))
      } finally {
        holder.SPELL_SERVER = before
      }
    }
    const plain = await looks({ person: "Ana" })
    // no colours set:  no token's fallback, so every agent's box is the shared agent voice (terracotta, not violet)
    expect(plain.map((each) => each.voice)).toEqual([
      "var(--epic-voice-person-ana)",
      "var(--epic-voice-agent-claude)",
      "var(--epic-voice-agent-codex)"
    ])
    expect(plain[1]!.ring).toBe(plain[2]!.ring)
    // terracotta, #c96442, 16% (`EpicThreadMessage.css`)
    expect(plain[1]!.ring).toContain("color(srgb 0.788235 0.392157 0.258824 / 0.16)")
    const colored = await looks({
      person: "Ana",
      colors: { people: { ana: "rgb(0, 128, 0)" }, agents: { codex: "rgb(0, 0, 255)" } }
    })
    expect(colored.map((each) => each.voice)).toEqual([
      "var(--epic-voice-person-ana, rgb(0, 128, 0))",
      "var(--epic-voice-agent-claude)",
      "var(--epic-voice-agent-codex, rgb(0, 0, 255))"
    ])
    expect([colored[0]!.who, colored[1]!.ring === plain[1]!.ring, colored[2]!.ring]).toEqual([
      "rgb(0, 128, 0)",
      true,
      expect.stringContaining("color(srgb 0 0 1 / 0.16)")
    ])
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
