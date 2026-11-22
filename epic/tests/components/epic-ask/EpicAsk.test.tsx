import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { AnswerForm, type PageAnswer } from "spell/epic/answers"

import "spell/epic/components/epic-ask"
import "spell/epic/components/epic-choices"
import "spell/epic/components/epic-question"
// the boxes are `<ui-textarea grow>`s:  `<ui-root>` loads them on a page
import "spell/ui/components/ui-input"
// a compact question's select (`compact`, epic `epic-engine` T121)
import "spell/ui/components/ui-select"

////////////////
// ## Fixtures
////////////////

/** A question of three options, in its section (its key), pick one unless `flags` say otherwise. */
function question(flags = "", options = OPTIONS) {
  return (
    `<ui-section id="q1" label="Q1 · Which?"><epic-ask ${flags}><epic-question><p>Which one?</p></epic-question>` +
    `<epic-choices>${options}</epic-choices></epic-ask></ui-section>`
  )
}

const OPTIONS =
  `<epic-option letter="A" title="Blue" recommended><p>Calm.</p></epic-option>` +
  `<epic-option letter="B" title="Red"><p>Loud.</p></epic-option>` +
  `<epic-option letter="C" title="Green" done></epic-option>`

/** The page's form, fresh for each test (the elements make it on first use). */
function form(): AnswerForm {
  return AnswerForm.forPage()
}

afterEach(() => AnswerForm.adopt(undefined))

/** `host`'s shadow part `name`. */
function part<T extends HTMLElement = HTMLElement>(host: Element, name: string): T {
  return host.shadowRoot!.querySelector<T>(`[part~="${name}"]`)!
}

/** Option `letter` of the question under `root`. */
function option(root: Element, letter: string): Element {
  return root.querySelector(`epic-option[letter="${letter}"]`)!
}

/** Tick (or untick) option `letter`'s box, as a click does. */
async function tick(root: Element, letter: string) {
  part<HTMLInputElement>(option(root, letter), "tick").click()
  await ElementFixture.settle()
}

/** Is a Choose pill on (`aria-checked`)? */
function checked(pill: Element): boolean {
  return pill.getAttribute("aria-checked") === "true"
}

/** Press `key` where the focus is, as the keyboard does:  on the focused element, deep in its shadow roots. */
function press(key: string) {
  let focused = document.activeElement
  while (focused?.shadowRoot?.activeElement) focused = focused.shadowRoot.activeElement
  focused!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true, cancelable: true }))
}

/** What the page would send. */
function gathered(): PageAnswer {
  return form().gather()
}

////////////////
// ## Tests
////////////////

describe("<epic-ask> with a follow-up (a Feature Set's Priority)", () => {
  /** An item's pick, its Priority in its `then` slot;  Priority 2 picked to start with. */
  const ITEM =
    `<ui-section id="s1" label="S1 · Now"><epic-ask compact no-chip name="s1f1" label="S1F1 · Share a link"><epic-choices>` +
    `<epic-option letter="Y" title="Yes"></epic-option><epic-option letter="N" title="No"></epic-option></epic-choices>` +
    `<epic-ask slot="then" compact name="s1f1-priority" label="Priority" off-for="N"><epic-choices>` +
    `<epic-option selected letter="2" title="Priority 2"></epic-option></epic-choices></epic-ask></epic-ask></ui-section>`

  /** Pick `value` in question `ask`'s select, as a person does. */
  async function pick(ask: Element, value: string) {
    part(ask, "select").dispatchEvent(new CustomEvent("ui-changed", { detail: { value } }))
    await ElementFixture.settle()
  }

  test("no chip, and ONE comment box for the two;  it's one question, and leaves its section's state alone;  axe", async () => {
    const section = await ElementFixture.render(ITEM)
    await ElementFixture.settle()
    const [item, priority] = Array.from(section.querySelectorAll("epic-ask")) as [Element, Element]
    for (const ask of [item, priority]) expect(part(ask, "chip")).toBeNull()
    expect(part(item, "other").getAttribute("for")).toBe("s1f1")
    expect(part(priority, "other")).toBeNull()
    expect(form().decided).toEqual({ decided: 0, total: 1 })
    expect(section.hasAttribute("data-state")).toBe(false)
    expect(form().labels()["s1f1-priority"]).toBe("S1F1 · Share a link, Priority")
    await expectAccessible(item)
  })

  test("No greys the Priority out and KEEPS what was picked in it;  another pick gives it back", async () => {
    const section = await ElementFixture.render(ITEM)
    await ElementFixture.settle()
    const [item, priority] = Array.from(section.querySelectorAll("epic-ask")) as [Element, Element]
    await pick(item, "N")
    expect(priority.matches(":state(off)")).toBe(true)
    expect(part(priority, "select").hasAttribute("disabled")).toBe(true)
    // greyed, not hidden:  the rows don't jump
    expect(priority.getClientRects().length).toBeGreaterThan(0)
    expect(gathered().answers["s1f1-priority"]).toEqual({ picked: ["2"] })
    await pick(item, "Y")
    expect(priority.matches(":state(off)")).toBe(false)
    expect(part(priority, "select").hasAttribute("disabled")).toBe(false)
  })
})

describe("<epic-ask>", () => {
  test("its line:  a red chip (its section's key), Pick one;  its options a Choose pill each, a comment box, Other;  axe", async () => {
    const section = await ElementFixture.render(question())
    const ask = section.querySelector("epic-ask")!
    await ElementFixture.settle()
    expect(part(ask, "chip").textContent).toBe("Q1")
    const red = getComputedStyle(part(ask, "chip")).backgroundColor
    expect(red).not.toBe("rgba(0, 0, 0, 0)")
    expect(part(ask, "how").textContent).toBe("Pick one")
    // the epic page's Choose pill (epic `epic-engine` P50, Q55), a radio to a screen reader
    expect(part(option(section, "A"), "tick").getAttribute("role")).toBe("radio")
    expect(part(option(section, "A"), "tick").textContent).toBe("Choose")
    expect(part(option(section, "A"), "comment").getAttribute("for")).toBe("q1-A")
    expect(part(ask, "other").getAttribute("for")).toBe("q1")
    expect(section.getAttribute("data-state")).toBe("attention")
    expect(gathered().answers).toEqual({ q1: { picked: [] } })
    await expectAccessible(ask)
  })

  test("pick one:  a tick picks its option alone, framed green;  the chip turns green", async () => {
    const section = await ElementFixture.render(question())
    const ask = section.querySelector("epic-ask")!
    await ElementFixture.settle()
    const red = getComputedStyle(part(ask, "chip")).backgroundColor
    await tick(section, "A")
    await tick(section, "B")
    expect(gathered().answers.q1).toEqual({ picked: ["B"] })
    expect(checked(part<HTMLInputElement>(option(section, "A"), "tick"))).toBe(false)
    expect(option(section, "B").matches(":state(ticked)")).toBe(true)
    expect(ask.matches(":state(done)")).toBe(true)
    expect(section.getAttribute("data-state")).toBe("done")
    // green now, not the red it started
    expect(getComputedStyle(part(ask, "chip")).backgroundColor).not.toBe(red)
  })

  // I5:  each round tick box is a native radio in its option's own shadow root, which the browser never groups
  test("pick one:  ONE radio group to the keyboard -- one tab stop, the arrow keys move the pick and the focus", async () => {
    const section = await ElementFixture.render(question())
    const ask = section.querySelector("epic-ask")!
    await ElementFixture.settle()
    const group = part(section.querySelector("epic-choices")!, "base")
    expect([group.getAttribute("role"), group.getAttribute("aria-label")]).toEqual(["radiogroup", "Q1 · Which?"])
    const box = (letter: string) => part<HTMLInputElement>(option(section, letter), "tick")
    const stops = () => ["A", "B", "C"].map((letter) => box(letter).tabIndex)
    // nothing picked:  the first option is the stop
    expect(stops()).toEqual([0, -1, -1])
    await tick(section, "B")
    expect(stops()).toEqual([-1, 0, -1])
    box("B").focus()
    press("ArrowDown")
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: ["C"] })
    expect([checked(box("C")), checked(box("B")), option(section, "C").shadowRoot!.activeElement]).toEqual([
      true,
      false,
      box("C")
    ])
    expect(stops()).toEqual([-1, -1, 0])
    // round the end, and back
    press("ArrowRight")
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: ["A"] })
    press("ArrowUp")
    await ElementFixture.settle()
    expect([gathered().answers.q1, option(section, "C").shadowRoot!.activeElement]).toEqual([
      { picked: ["C"] },
      box("C")
    ])
    expect(ask.matches(":state(done)")).toBe(true)
    await expectAccessible(ask)
  })

  test("pick one:  the arrow keys skip the options Open hides;  in a comment box they move nothing", async () => {
    const section = await ElementFixture.render(question("filter"))
    await ElementFixture.settle()
    const box = (letter: string) => part<HTMLInputElement>(option(section, letter), "tick")
    box("B").focus()
    press("ArrowDown")
    await ElementFixture.settle()
    // C is `done`, hidden:  round to A
    expect(gathered().answers.q1).toEqual({ picked: ["A"] })
    const comment = part(option(section, "A"), "comment")
    comment.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: ["A"] })
  })

  test("pick several:  no radio group, every tick box a tab stop, the arrow keys pick nothing", async () => {
    const section = await ElementFixture.render(question("multiple"))
    await ElementFixture.settle()
    expect(part(section.querySelector("epic-choices")!, "base").hasAttribute("role")).toBe(false)
    const box = (letter: string) => part<HTMLInputElement>(option(section, letter), "tick")
    expect(["A", "B", "C"].map((letter) => box(letter).hasAttribute("tabindex"))).toEqual([false, false, false])
    box("A").focus()
    press("ArrowDown")
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: [] })
  })

  test("pick several, Select all / none over the options shown;  Open hides the `done` ones", async () => {
    const section = await ElementFixture.render(question("multiple select-all filter"))
    const ask = section.querySelector("epic-ask")!
    await ElementFixture.settle()
    expect(option(section, "C").matches(":state(filtered)")).toBe(true)
    const selectAll = part(ask, "tools").querySelector<HTMLElement>("ui-button")!
    expect(selectAll.textContent).toBe("Select all")
    selectAll.click()
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: ["A", "B"] })
    expect(selectAll.textContent).toBe("Select none")
    selectAll.click()
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: [] })
    // All:  the done one shows, and Select all takes it too
    part(ask, "tools").querySelectorAll<HTMLElement>("ui-button")[2]!.click()
    await ElementFixture.settle()
    expect(option(section, "C").matches(":state(filtered)")).toBe(false)
  })

  test("more details:  the (?) ticks its option and asks for more (`<key>-more`):  blue, Claude's to do", async () => {
    const section = await ElementFixture.render(question("multiple more-details"))
    const ask = section.querySelector("epic-ask")!
    part(option(section, "B"), "more").click()
    await ElementFixture.settle()
    expect(gathered().answers).toEqual({ q1: { picked: ["B"] }, "q1-more": { picked: ["B"] } })
    expect(part(option(section, "B"), "more").getAttribute("aria-pressed")).toBe("true")
    expect(ask.matches(":state(working)")).toBe(true)
  })

  test("only Other written:  blue;  its text goes with the picks", async () => {
    const section = await ElementFixture.render(question())
    const ask = section.querySelector("epic-ask")!
    const other = part(ask, "other").shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
    other.value = "neither"
    other.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: [], other: "neither" })
    expect(ask.matches(":state(working)")).toBe(true)
  })

  test("ticked to start with (`selected`), until Owen picks;  an answer sent comes back into it", async () => {
    const section = await ElementFixture.render(
      question(
        "multiple",
        `<epic-option letter="J1" title="One" selected></epic-option><epic-option letter="J2" title="Two"></epic-option>`
      )
    )
    await ElementFixture.settle()
    expect(gathered().answers.q1).toEqual({ picked: ["J1"] })
    const ask = section.querySelector("epic-ask")! as HTMLElement & { component: { showAnswer(answer: object): void } }
    ask.component.showAnswer({ answers: { q1: { picked: ["J2"] } }, comments: {}, notes: "" })
    await ElementFixture.settle()
    expect(checked(part<HTMLInputElement>(option(section, "J2"), "tick"))).toBe(true)
    expect(checked(part<HTMLInputElement>(option(section, "J1"), "tick"))).toBe(false)
  })

  test("its ids, for a draft (P18):  its key under its section's title, each option's under its own", async () => {
    await ElementFixture.render(question())
    await ElementFixture.settle()
    expect(form().labels()).toEqual({
      q1: "Q1 · Which?",
      "q1-A": "A · Blue",
      "q1-B": "B · Red",
      "q1-C": "C · Green"
    })
  })

  test("a draft comes back into it on load, over the answer;  rewritten without it, what was typed is kept", async () => {
    const draft = {
      page: "/pages/details/x.html",
      saved: "2026-10-14T05:00:00.000Z",
      answers: { q1: { picked: ["B"], other: "or both" } },
      comments: { "q1-B": "too loud?" },
      notes: "",
      labels: { q1: "Q1 · Which?", "q1-A": "A · Blue", "q1-B": "B · Red", "q1-C": "C · Green" }
    }
    const fetch = vi.fn(async (url: string) =>
      Response.json(url.startsWith("/api/docs/details/draft") ? { draft } : { answer: null })
    )
    const details = new AnswerForm({
      page: "/pages/details/x.html",
      server: { token: "t" },
      protocol: "http:",
      fetch: fetch as unknown as typeof globalThis.fetch
    })
    AnswerForm.adopt(details)
    const section = await ElementFixture.render(question())
    await ElementFixture.settle()
    await details.load()
    await ElementFixture.settle()
    expect(option(section, "B").matches(":state(ticked)")).toBe(true)
    expect(part<HTMLElement & { value: string }>(section.querySelector("epic-ask")!, "other").value).toBe("or both")
    expect(details.gather().comments).toEqual({ "q1-B": "too loud?" })
    expect(details.stateLine.text).toBe("Not sent")
    // an agent's rewrite takes the question off the page
    section.remove()
    await vi.waitFor(() => expect(details.kept).toHaveLength(2), { timeout: 2000 })
    expect(details.kept).toEqual([
      { id: "q1", label: "Q1 · Which?", text: "picked B · Red;  Other:  or both" },
      { id: "q1-B", label: "Q1 · Which?, B · Red", text: "too loud?" }
    ])
  })

  test("options quoted in an option's text are only text:  no tick box", async () => {
    const nested = `<epic-option letter="A" title="Quote"><epic-choices><epic-option letter="X" title="Inner"></epic-option></epic-choices></epic-option>`
    const section = await ElementFixture.render(question("", nested))
    await ElementFixture.settle()
    expect(option(section, "X").shadowRoot!.querySelector("[part~='tick']")).toBeNull()
    expect(option(section, "A").matches(":state(answering)")).toBe(true)
  })
})

////////////////
// ## Compact (epic `epic-engine` T121)
////////////////

/** The ROW of three options, Yes / No / Revisit, as solid-2-final's ranked page asks them. */
const PICKS =
  `<epic-option letter="Y" title="Yes" recommended><p>Do it.</p></epic-option>` +
  `<epic-option letter="N" title="No"><p>Don't.</p></epic-option>` +
  `<epic-option letter="R" title="Revisit"><p>Later.</p></epic-option>`

/** Its select's native `<select>`, two shadow roots down. */
function nativeSelect(ask: Element): HTMLSelectElement {
  return part(ask, "select").shadowRoot!.querySelector("select")!
}

/** Pick `letter` in its select, as a person does:  the native select's value, then its `change`. */
async function choose(ask: Element, letter: string) {
  const select = nativeSelect(ask)
  select.value = letter
  select.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
  await ElementFixture.settle()
}

/** Type `text` in its comment box. */
async function comment(ask: Element, text: string) {
  const box = part(ask, "other").shadowRoot!.querySelector("ui-textarea")!.shadowRoot!.querySelector("textarea")!
  box.value = text
  box.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }))
  await ElementFixture.settle()
}

/** How many lines `element`'s text takes. */
function lineCount(element: Element): number {
  const range = document.createRange()
  range.selectNodeContents(element)
  return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
}

/** The box `element`'s text takes. */
function textBox(element: Element): DOMRect {
  const range = document.createRange()
  range.selectNodeContents(element)
  return range.getBoundingClientRect()
}

describe("<epic-ask compact>", () => {
  test("one row:  its chip, ONE Spell UI select of its options' titles, a comment box;  no cards, no switch;  axe", async () => {
    const section = await ElementFixture.render(question("compact", PICKS))
    const ask = section.querySelector("epic-ask")!
    await ElementFixture.settle()
    const row = part(ask, "row")
    expect(row.querySelector('[part~="chip"]')!.textContent).toBe("Q1")
    expect(part(ask, "select").localName).toBe("ui-select")
    expect([...nativeSelect(ask).options].map((each) => [each.value, each.textContent])).toEqual([
      ["", "Pick one"],
      ["Y", "Yes (recommended)"],
      ["N", "No"],
      ["R", "Revisit"]
    ])
    expect(part(ask, "other").getAttribute("placeholder")).toBe("Comment (optional)")
    expect(part(ask, "how")).toBeNull()
    // the cards stay in the page, hidden:  the select lists them
    expect(getComputedStyle(section.querySelector("epic-choices")!).display).toBe("none")
    expect(section.getAttribute("data-state")).toBe("attention")
    await expectAccessible(ask)
  })

  test("its pick and comment go out with Send, as a card pick and Other do;  the chip turns green", async () => {
    const posts: { url: string; body: PageAnswer & { page: string } }[] = []
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") posts.push({ url, body: JSON.parse(init.body as string) })
      return Response.json(
        url.startsWith("/api/docs/details/answer") && init?.method === "POST"
          ? { ok: true, answered: "2026-11-20T00:00:00.000Z" }
          : { answer: null, draft: null }
      )
    })
    const details = new AnswerForm({
      page: "/pages/details/x.html",
      server: { token: "t" },
      protocol: "http:",
      fetch: fetch as unknown as typeof globalThis.fetch
    })
    AnswerForm.adopt(details)
    const section = await ElementFixture.render(question("compact", PICKS))
    const ask = section.querySelector("epic-ask")!
    await ElementFixture.settle()
    await choose(ask, "N")
    await comment(ask, "too big for now")
    expect(details.gather().answers).toEqual({ q1: { picked: ["N"], other: "too big for now" } })
    expect(ask.matches(":state(done)")).toBe(true)
    await details.send()
    const sent = posts.find((post) => post.url.startsWith("/api/docs/details/answer"))!
    expect(sent.body.answers).toEqual({ q1: { picked: ["N"], other: "too big for now" } })
    // the empty entry takes the pick back
    await choose(ask, "")
    expect(details.gather().answers.q1.picked).toEqual([])
  })

  test("in a narrow column its chip stays one line, never cut off:  the select gives way, or goes under", async () => {
    // epic `epic-engine` I371:  solid-2-final's ranked page, a 20%-wide table column at 1200px, `Q50 · a` wrapped
    // onto two lines inside its pill (squeezed to 37px of its 58)
    for (const width of [150, 170, 200, 260]) {
      const page = await ElementFixture.render(
        `<div style="width: ${width}px"><ui-section id="q50" label="50 · Pick it">` +
          `<epic-ask compact name="q50"><epic-choices>${PICKS}</epic-choices></epic-ask>` +
          `<epic-ask compact name="q50-priority"><epic-choices>${PICKS}</epic-choices></epic-ask></ui-section></div>`
      )
      await ElementFixture.settle()
      for (const ask of page.querySelectorAll("epic-ask")) {
        const chip = part<HTMLElement>(ask, "chip")
        expect(chip.textContent).toMatch(/^Q50 · [ab]$/)
        expect(lineCount(chip), `${width}px`).toBe(1)
        // the label inside its pill, its padding included:  never wider than the pill
        const label = textBox(chip)
        const pill = chip.getBoundingClientRect()
        expect(label.left).toBeGreaterThanOrEqual(pill.left)
        expect(label.right).toBeLessThanOrEqual(pill.right)
        // nothing in the row runs out of the column
        expect(part(ask, "row").getBoundingClientRect().right).toBeLessThanOrEqual(
          page.getBoundingClientRect().right + 1
        )
      }
      page.remove()
    }
  })

  test("an answer sent comes back into its select and comment box", async () => {
    const section = await ElementFixture.render(question("compact", PICKS))
    const ask = section.querySelector("epic-ask")! as HTMLElement & { component: { showAnswer(answer: object): void } }
    await ElementFixture.settle()
    const answer = { answers: { q1: { picked: ["R"], other: "after P3" } }, comments: {}, notes: "" }
    // the page's form shows it to every part:  the question its pick, its comment box (a part of its own) the text
    ask.component.showAnswer(answer)
    ;(part(ask, "other") as unknown as { component: { showAnswer(answer: object): void } }).component.showAnswer(answer)
    await ElementFixture.settle()
    expect(nativeSelect(ask).value).toBe("R")
    expect(part<HTMLElement & { value: string }>(ask, "other").value).toBe("after P3")
  })
})

////////////////
// ## Its chip's number (epic `epic-engine` I369)
////////////////

/** The chips of every question under `root`, in order. */
function chips(root: Element): string[] {
  return [...root.querySelectorAll("epic-ask")].map((ask) => part(ask, "chip").textContent ?? "")
}

/** A question of `PICKS`, `flags` on it. */
function ask(flags = "") {
  return `<epic-ask ${flags}><epic-choices>${PICKS}</epic-choices></epic-ask>`
}

describe("<epic-ask>'s chip", () => {
  test("two questions in one item share its number, a letter each;  never a count of every question on the page", async () => {
    const page = await ElementFixture.render(
      `<div>` +
        `<ui-section id="q1" label="1 · First">${ask('name="q1"')}${ask('name="q1-priority"')}</ui-section>` +
        `<ui-section id="q2" label="2 · Second">${ask('name="q2"')}${ask('name="q2-priority"')}</ui-section>` +
        `</div>`
    )
    await ElementFixture.settle()
    expect(chips(page)).toEqual(["Q1 · a", "Q1 · b", "Q2 · a", "Q2 · b"])
  })

  test("its section's number, else its section's place;  `chip` as written wins", async () => {
    const page = await ElementFixture.render(
      `<div>` +
        `<ui-section id="rename" label="12 · Rename it">${ask()}</ui-section>` +
        `<ui-section id="plain" label="Which colour?">${ask()}${ask()}</ui-section>` +
        `<ui-section id="mine" label="Mine">${ask('chip="R7"')}</ui-section>` +
        `</div>`
    )
    await ElementFixture.settle()
    expect(chips(page)).toEqual(["Q12", "Q2 · a", "Q2 · b", "R7"])
  })
})
