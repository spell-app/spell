import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/epic/components/epic-answer"

/** `element`'s shadow part `name`. */
function part(element: Element, name: string): HTMLElement | null {
  return element.shadowRoot!.querySelector<HTMLElement>(`[part~='${name}']`)
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

describe("<epic-answer>", () => {
  test("a card headed `Answer · <title>`, its body slotted;  passes axe", async () => {
    const host = await ElementFixture.render(`<epic-answer title="Named palette"><p>Why</p></epic-answer>`)
    expect(part(host, "header")!.textContent).toBe("Answer · Named palette")
    expect(host.querySelector("p")!.assignedSlot).not.toBeNull()
    expect(part(host, "body")!.classList.contains("empty")).toBe(false)
    await expectAccessible(host)
  })

  test("keeps an old decision's id:  headed `D7 · ...`, and `#d7` lands on it;  no body:  the heading alone", async () => {
    const host = await ElementFixture.render(`<epic-answer id="d7" title="Chrome"></epic-answer>`)
    expect(part(host, "header")!.textContent).toBe("D7 · Chrome")
    expect(document.getElementById("d7")).toBe(host)
    expect(part(host, "body")!.classList.contains("empty")).toBe(true)
  })

  test("a title with markup comes through its `title` slot (T12);  the body's first child keeps its place", async () => {
    const host = await ElementFixture.render(
      `<epic-answer><span slot="title">The <code>x</code> API</span><p>Why</p></epic-answer>`
    )
    const slot = part(host, "title")!.querySelector<HTMLSlotElement>("slot")!
    expect([part(host, "header")!.textContent, slot.assignedElements()[0].textContent]).toEqual([
      "Answer · ",
      "The x API"
    ])
    expect(host.querySelector("p")!.assignedSlot!.name).toBe("")
    await expectAccessible(host)
  })
})

describe("<epic-reply>", () => {
  test("headed `<from> · re: <re>`, the date `10/6/26 23:55` at the right;  a person's in the person look (`person`), an agent's apart;  both pass axe", async () => {
    const claude = await ElementFixture.render(
      `<epic-reply from="Claude" at="2026-10-06 23:55" re="as built"><p>Done</p></epic-reply>`
    )
    const owen = await ElementFixture.render(`<epic-reply from="Owen" at="2026-10-06 10:42"><p>Why?</p></epic-reply>`)
    expect([claude, owen].map((host) => [part(host, "who")!.textContent, part(host, "date")!.textContent])).toEqual([
      ["Claude · re: as built", "10/6/26 23:55"],
      ["Owen", "10/6/26 10:42"]
    ])
    expect(part(claude, "date")!.getAttribute("datetime")).toBe("2026-10-06 23:55")
    expect([part(claude, "base")!.className, part(owen, "base")!.className]).toEqual(["reply", "person reply"])
    await expectAccessible(claude)
    await expectAccessible(owen)
  })

  test("no `at`:  no date;  nothing to head it:  no band", async () => {
    const undated = await ElementFixture.render(`<epic-reply from="Claude"><p>Done</p></epic-reply>`)
    const bare = await ElementFixture.render(`<epic-reply><p>Done</p></epic-reply>`)
    expect([part(undated, "date"), part(undated, "header")!.hidden, part(bare, "header")!.hidden]).toEqual([
      null,
      false,
      true
    ])
  })

  test("the date stays at the RIGHT of the TOP line, however long the heading, in the side bar's ~320px", async () => {
    const re = "Hmm, can't we put this in JSON? And while we're at it, every pack template, the catalog and the docs"
    const sideBar = await ElementFixture.render(
      `<div style="width: 320px"><epic-reply from="Claude" at="2026-10-07 10:50" re="${re}"><p>Done</p></epic-reply></div>`
    )
    const host = sideBar.querySelector("epic-reply")!
    const [header, who, date] = ["header", "who", "date"].map((name) => part(host, name)!.getBoundingClientRect())
    // the heading wraps (several lines), the date doesn't:  one line, beside the heading's first
    expect(who.height).toBeGreaterThan(date.height * 1.5)
    expect(Math.abs(date.top - who.top)).toBeLessThan(4)
    expect([date.right <= header.right, date.left >= who.right, part(host, "date")!.textContent]).toEqual([
      true,
      true,
      "10/7/26 10:50"
    ])
    // the fold chevron first, before who, on the same top line (Owen, 2026-10-08)
    const toggle = part(host, "toggle")!.getBoundingClientRect()
    expect([toggle.right <= who.left, Math.abs(toggle.top - who.top) < 4]).toEqual([true, true])
  })

  test("Owen's and Claude's replies fold by their band:  the reply hidden until-found;  who and the date stay", async () => {
    const host = await ElementFixture.render(
      `<epic-reply from="Owen" at="2026-10-07 10:42" re="revisit soon"><p>Why not reuse it?</p></epic-reply>`
    )
    part(host, "toggle")!.click()
    await ElementFixture.tick()
    expect([
      part(host, "body")!.getAttribute("hidden"),
      part(host, "who")!.textContent,
      part(host, "date")!.textContent,
      part(host, "toggle")!.getAttribute("aria-expanded")
    ]).toEqual(["until-found", "Owen · re: revisit soon", "10/7/26 10:42", "false"])
  })
  test("WHO wrote it, to a reader named Ana:  her own `You`, Ben's `Ben`, her Claude `Claude`, Ben's `Claude (Ben)`, an old one `Claude`;  a person named Claude after the marker is a PERSON", async () => {
    const replies = [
      `<epic-reply from="Ana" at="2026-11-02 10:00"><p>a</p></epic-reply>`,
      `<epic-reply from="Ben" at="2026-11-02 10:01"><p>b</p></epic-reply>`,
      `<epic-reply from="Ana" agent="claude" at="2026-11-02 10:02"><p>c</p></epic-reply>`,
      `<epic-reply from="Ben" agent="claude" at="2026-11-02 10:03"><p>d</p></epic-reply>`,
      `<epic-reply from="Claude" at="2026-10-06 23:55"><p>e</p></epic-reply>`,
      `<epic-reply from="Claude" at="2026-11-05 10:00"><p>f</p></epic-reply>`
    ]
    const drawn = await asViewer("Ana", async () => {
      const hosts = []
      for (const html of replies) hosts.push(await ElementFixture.render(html))
      return hosts.map((host) => [
        part(host, "who")!.textContent,
        part(host, "who")!.dataset.initial,
        part(host, "base")!.classList.contains("person")
      ])
    })
    expect(drawn).toEqual([
      ["You", "A", true],
      ["Ben", "B", true],
      ["Claude", "C", false],
      ["Claude (Ben)", "C", false],
      ["Claude", "C", false],
      ["Claude", "C", true]
    ])
  })

  test("any agent by its name (epic `epic-friend` P10):  Bob's Codex `Codex (Bob)`, Ana's own `Codex`, one `from` Codex itself `Codex`", async () => {
    const replies = [
      `<epic-reply from="Bob" agent="codex" at="2026-11-02 10:00"><p>a</p></epic-reply>`,
      `<epic-reply from="Ana" agent="codex" at="2026-11-02 10:01"><p>b</p></epic-reply>`,
      `<epic-reply from="Codex" agent="codex" at="2026-11-02 10:02"><p>c</p></epic-reply>`
    ]
    const drawn = await asViewer("Ana", async () => {
      const hosts = []
      for (const html of replies) hosts.push(await ElementFixture.render(html))
      return hosts.map((host) => [part(host, "who")!.textContent, part(host, "who")!.dataset.initial])
    })
    expect(drawn).toEqual([
      ["Codex (Bob)", "C"],
      ["Codex", "C"],
      ["Codex", "C"]
    ])
  })
})

describe("<epic-reply>'s voices (epic `epic-friend` T11)", () => {
  /** The colour of a reply's round mark, before its name (`.who::before`). */
  function markOf(reply: Element): string {
    return getComputedStyle(part(reply, "who")!, "::before").backgroundColor
  }

  test("the theme's `--epic-voice-*` tokens colour them:  the agent's mark, the person's mark and card;  none set:  today's terracotta and violet", async () => {
    const replies = `<epic-reply from="Claude" agent="claude"><p>Done</p></epic-reply><epic-reply from="Ana"><p>Why?</p></epic-reply>`
    const plain = await ElementFixture.render(`<div>${replies}</div>`)
    const [claude, ana] = Array.from(plain.children)
    expect(markOf(claude)).toBe("rgb(201, 100, 66)")
    expect(markOf(ana)).not.toBe(markOf(claude))

    const themed = await ElementFixture.render(
      `<div style="--epic-voice-agent: rgb(0, 128, 128); --epic-voice-person: rgb(10, 20, 30); --epic-voice-person-fill: rgb(1, 2, 3)">${replies}</div>`
    )
    const [agent, person] = Array.from(themed.children)
    expect([markOf(agent), markOf(person), getComputedStyle(part(person, "base")!).backgroundColor]).toEqual([
      "rgb(0, 128, 128)",
      "rgb(10, 20, 30)",
      "rgb(1, 2, 3)"
    ])
  })

  test("a colour per person and per agent from the repo's settings (`SPELL_SERVER.colors`, epic `epic-friend` P10):  Ana's mark and card in hers, Codex's mark in its;  anyone else as before", async () => {
    const replies =
      `<epic-reply from="Ana"><p>Why?</p></epic-reply>` +
      `<epic-reply from="Bob" agent="codex"><p>Done</p></epic-reply>` +
      `<epic-reply from="Ben"><p>Hm</p></epic-reply>` +
      `<epic-reply from="Ana" agent="claude"><p>So</p></epic-reply>`
    // the shared person voice, as a reply with no colour of its own draws it
    const shared = markOf(
      (await ElementFixture.render(`<div><epic-reply from="Ben"><p>Hm</p></epic-reply></div>`)).children[0]!
    )
    const holder = globalThis as { SPELL_SERVER?: unknown }
    const before = holder.SPELL_SERVER
    holder.SPELL_SERVER = { colors: { people: { ana: "rgb(0, 128, 0)" }, agents: { codex: "rgb(0, 0, 255)" } } }
    try {
      const page = await ElementFixture.render(`<div>${replies}</div>`)
      const [ana, codex, ben, claude] = Array.from(page.children)
      expect([
        markOf(ana),
        getComputedStyle(part(ana, "base")!).backgroundColor,
        markOf(codex),
        markOf(ben),
        markOf(claude)
      ]).toEqual([
        "rgb(0, 128, 0)",
        expect.stringMatching(/^(oklab|color|rgb)/),
        "rgb(0, 0, 255)",
        shared,
        "rgb(201, 100, 66)"
      ])
      // Ana's card fill mixed from her green, not the shared violet's
      expect(getComputedStyle(part(ana, "base")!).backgroundColor).not.toBe(
        getComputedStyle(part(ben, "base")!).backgroundColor
      )
      // a theme may still set the token over the settings' colour
      ;(page as HTMLElement).style.setProperty("--epic-voice-agent-codex", "rgb(9, 9, 9)")
      expect(markOf(codex)).toBe("rgb(9, 9, 9)")
    } finally {
      holder.SPELL_SERVER = before
    }
  })
})

describe("<epic-more>", () => {
  test("a card headed More Details, open to start with;  its heading folds it;  passes axe", async () => {
    const host = await ElementFixture.render(`<epic-more><p>More</p></epic-more>`)
    const toggle = part(host, "toggle")!
    expect([toggle.textContent, host.matches(":state(open)"), part(host, "body")!.hasAttribute("hidden")]).toEqual([
      "More Details",
      true,
      false
    ])
    await expectAccessible(host)
    toggle.click()
    await ElementFixture.tick()
    expect([host.matches(":state(open)"), part(host, "body")!.getAttribute("hidden")]).toEqual([false, "until-found"])
  })
})
