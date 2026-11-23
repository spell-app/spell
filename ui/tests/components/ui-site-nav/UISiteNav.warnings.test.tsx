import { describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"

import "spell/ui/components/ui-site-nav"

/****************
 * Its own file:  Solid's dev build says each LOWERCASE_EVENT_ATTRIBUTE once per page, so a site nav drawn by an earlier
 * test in the same file would hide it.
 ****************/
describe("<ui-site-nav> in Solid's dev build", () => {
  it("draws with no LOWERCASE_EVENT_ATTRIBUTE:  its tree's events are heard by its own listeners", async () => {
    const warned = vi.spyOn(console, "warn")
    onTestFinished(() => warned.mockRestore())
    const host = await ElementFixture.render(`<ui-site-nav current="/a" style="width: 300px"></ui-site-nav>`)
    host.setAttribute(
      "pages",
      JSON.stringify([
        { title: "A", href: "/a" },
        { title: "B", pages: [{ title: "C", href: "/c" }] }
      ])
    )
    await ElementFixture.settle()
    expect(host.shadowRoot!.querySelectorAll("ui-tree-item").length).toBeGreaterThan(0)
    const said = warned.mock.calls.map((call) => call.map(String).join(" "))
    expect(said.filter((words) => words.includes("LOWERCASE_EVENT_ATTRIBUTE"))).toEqual([])
  })
})
