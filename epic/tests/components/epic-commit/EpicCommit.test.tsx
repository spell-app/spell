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
})
