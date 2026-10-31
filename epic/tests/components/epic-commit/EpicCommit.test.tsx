import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/epic/components/epic-commit"
import "spell/epic/components/epic-phase"

/** Commits under a box that shows them (`--epic-commits-display`), as the page's git toggle does. */
function shown(inner: string, repo = ""): string {
  return `<epic-page epic="demo" title="Demo"${repo}><div style="--epic-commits-display: block">${inner}</div></epic-page>`
}

describe("<epic-commit>", () => {
  test("its short sha links to the commit through the page's `repo`;  the first of a run carries `Commits:`", async () => {
    const root = await ElementFixture.render(
      shown(
        `<epic-commit sha="0123456789abcdef">First</epic-commit><epic-commit sha="fedcba9876543210">Second</epic-commit>`,
        ` repo="https://github.com/spell-app/spell-app/"`
      )
    )
    const [first, second] = root.querySelectorAll("epic-commit")
    const link = first!.shadowRoot!.querySelector<HTMLAnchorElement>('[part~="sha"]')!
    expect({ text: link.textContent, href: link.getAttribute("href"), target: link.target }).toEqual({
      text: "0123456",
      href: "https://github.com/spell-app/spell-app/commit/0123456789abcdef",
      target: "github"
    })
    const heading = (commit: Element) =>
      getComputedStyle(commit.shadowRoot!.querySelector('[part~="heading"]')!).display
    expect([heading(first!), heading(second!)]).toEqual(["grid", "none"])
    expect(first!.shadowRoot!.querySelector('[part~="heading"]')!.textContent).toBe("Commits:")
    await expectAccessible(first!)
  })

  test("a child repo's commit links through its OWN `repo`", async () => {
    const root = await ElementFixture.render(
      shown(
        `<epic-commit sha="0123456789abcdef" repo="https://github.com/spell-app/spell-parser">Lang</epic-commit>`,
        ` repo="https://github.com/spell-app/spell"`
      )
    )
    const link = root.querySelector("epic-commit")!.shadowRoot!.querySelector<HTMLAnchorElement>('[part~="sha"]')!
    expect(link.getAttribute("href")).toBe("https://github.com/spell-app/spell-parser/commit/0123456789abcdef")
  })

  test("without a `repo`:  the sha as code, no link;  hidden until something shows the commits", async () => {
    const commit = await ElementFixture.render(`<epic-commit sha="0123456789abcdef">Only</epic-commit>`)
    expect(commit.shadowRoot!.querySelector('[part~="sha"]')!.localName).toBe("code")
    expect(getComputedStyle(commit).display).toBe("none")
  })

  // epic `epic-engine` P52:  an entry of the Log
  test("with `at` and `refs`:  its time, the sha link, its sentence, a chip per phase and item;  a gone one plain text", async () => {
    const root = await ElementFixture.render(
      `<epic-page epic="demo" title="Demo" repo="https://github.com/spell-app/spell">` +
        `<epic-phase id="p-commit-log" status="active"><span slot="title">Commit Log</span></epic-phase>` +
        `<div style="--epic-commits-display: block"><epic-commit sha="0123456789abcdef" at="2026-10-29T11:46-04:00" ` +
        `refs="p-commit-log p-gone">built the Log</epic-commit></div></epic-page>`
    )
    const commit = root.querySelector("epic-commit")!
    const shadow = commit.shadowRoot!
    expect(shadow.querySelector('[part~="time"]')!.textContent).toBe("2026-10-29 11:46")
    expect(getComputedStyle(shadow.querySelector('[part~="heading"]')!).display).toBe("none")
    expect(shadow.querySelector<HTMLAnchorElement>('[part~="sha"]')!.getAttribute("href")).toBe(
      "https://github.com/spell-app/spell/commit/0123456789abcdef"
    )
    const chips = Array.from(shadow.querySelectorAll<HTMLElement>('[part~="ref"]'))
    expect(chips.map((chip) => [chip.localName, chip.textContent, chip.getAttribute("href")])).toEqual([
      ["a", "P1", "#p-commit-log"],
      ["span", "p-gone", null]
    ])
    expect(chips[0]!.title).toBe("Go to P1:  Commit Log")
    expect(chips[1]!.title).toBe("p-gone isn't on this page any more")
    await expectAccessible(commit)
  })

  test("an item's chip by its id;  no `at`:  as under a phase, no time and no chips", async () => {
    const root = await ElementFixture.render(
      `<epic-page epic="demo" title="Demo"><p id="q56">Q</p><div style="--epic-commits-display: block">` +
        `<epic-commit sha="0123456789abcdef" at="2026-10-29T11:46-04:00" refs="q56">fixed</epic-commit>` +
        `<epic-commit sha="fedcba9876543210">plain</epic-commit></div></epic-page>`
    )
    const [entry, plain] = root.querySelectorAll("epic-commit")
    const chip = entry!.shadowRoot!.querySelector('[part~="ref"]')!
    expect([chip.textContent, chip.getAttribute("href")]).toEqual(["Q56", "#q56"])
    expect(plain!.shadowRoot!.querySelector('[part~="time"]')).toBeNull()
    expect(plain!.shadowRoot!.querySelector('[part~="ref"]')).toBeNull()
  })

  // epic `epic-engine` J184:  a long sentence clamped to two lines, a click unfolds it
  describe("a long sentence", () => {
    const LONG =
      "the Log reads every commit of the kit and its child repos, newest first, with its time and a chip for each " +
      "phase and item its subject names, so a reader sees what went in and when without opening git at all"

    /** A Log entry `sentence` long, in a box `width` px wide. */
    async function entry(sentence: string, width = 320) {
      localStorage.removeItem(`spell-commit-folds:${location.pathname}`)
      const root = await ElementFixture.render(
        `<epic-page epic="demo" title="Demo" repo="https://github.com/spell-app/spell">` +
          `<div style="--epic-commits-display: block; width: ${width}px"><epic-commit sha="0123456789abcdef" ` +
          `at="2026-10-29T11:46-04:00">${sentence}</epic-commit></div></epic-page>`
      )
      const commit = root.querySelector("epic-commit")!
      await ElementFixture.settle()
      const shadow = commit.shadowRoot!
      const text = shadow.querySelector<HTMLElement>(".text")!
      const sentencePart = shadow.querySelector<HTMLElement>('[part~="sentence"]')!
      const lines = () =>
        Math.round(text.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(text).lineHeight))
      return { commit, shadow, text, sentence: sentencePart, lines }
    }

    test("clamped to two lines, a button;  a click on its text unfolds it, another folds it, remembered", async () => {
      const { text, sentence, lines } = await entry(LONG)
      expect([lines(), sentence.getAttribute("role"), sentence.getAttribute("aria-expanded")]).toEqual([
        2,
        "button",
        "false"
      ])
      expect(getComputedStyle(text).cursor).toBe("pointer")
      text.click()
      await ElementFixture.settle()
      expect(lines()).toBeGreaterThan(2)
      expect(sentence.getAttribute("aria-expanded")).toBe("true")
      expect(JSON.parse(localStorage.getItem(`spell-commit-folds:${location.pathname}`)!)).toEqual({
        "0123456789abcdef": true
      })
      sentence.click()
      await ElementFixture.settle()
      expect(lines()).toBe(2)
      expect(localStorage.getItem(`spell-commit-folds:${location.pathname}`)).toBeNull()
    })

    test("Enter on its sentence unfolds it;  a click on its sha doesn't", async () => {
      const { shadow, sentence, lines } = await entry(LONG)
      const sha = shadow.querySelector<HTMLAnchorElement>('[part~="sha"]')!
      sha.addEventListener("click", (event) => event.preventDefault())
      sha.click()
      await ElementFixture.settle()
      expect(lines()).toBe(2)
      sentence.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
      await ElementFixture.settle()
      expect(lines()).toBeGreaterThan(2)
    })

    test("a short one:  no button, no pointer, and a click changes nothing", async () => {
      const { text, sentence, lines, commit } = await entry("fixed a typo", 480)
      expect([lines(), sentence.getAttribute("role"), sentence.getAttribute("tabindex")]).toEqual([1, null, null])
      expect(getComputedStyle(text).cursor).not.toBe("pointer")
      text.click()
      await ElementFixture.settle()
      expect(localStorage.getItem(`spell-commit-folds:${location.pathname}`)).toBeNull()
      await expectAccessible(commit)
    })

    test("unfolded on an earlier load:  drawn whole", async () => {
      localStorage.setItem(`spell-commit-folds:${location.pathname}`, JSON.stringify({ "0123456789abcdef": true }))
      const root = await ElementFixture.render(
        `<div style="--epic-commits-display: block; width: 320px"><epic-commit sha="0123456789abcdef" ` +
          `at="2026-10-29T11:46-04:00">${LONG}</epic-commit></div>`
      )
      await ElementFixture.settle()
      const sentence = root.querySelector("epic-commit")!.shadowRoot!.querySelector('[part~="sentence"]')!
      expect(sentence.getAttribute("aria-expanded")).toBe("true")
      localStorage.removeItem(`spell-commit-folds:${location.pathname}`)
    })

    test("a long one under a phase (no `at`) clamps the same, and is accessible", async () => {
      const root = await ElementFixture.render(
        `<div style="--epic-commits-display: block; width: 320px"><epic-commit sha="0123456789abcdef">${LONG}</epic-commit></div>`
      )
      await ElementFixture.settle()
      const commit = root.querySelector("epic-commit")!
      const sentence = commit.shadowRoot!.querySelector('[part~="sentence"]')!
      expect(sentence.getAttribute("role")).toBe("button")
      await expectAccessible(commit)
    })
  })
})
