import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { PageNotices } from "spell/epic/review"

// Owen, 2026-10-29:  "'Sent 2 marks to Claude' toast looks good.  'Comment removed (undo)' does not ... Make the
// latter look like the former, but green, and put it in the same toast stack"
describe("PageNotices", () => {
  afterEach(() => {
    vi.useRealTimers()
    document.querySelector("[data-spell-notices]")?.remove()
  })

  const notices = () =>
    Array.from(
      document.querySelector("[data-spell-notices]")!.shadowRoot!.querySelectorAll<HTMLElement>(".notice"),
      (notice) => [notice.dataset.tone, notice.querySelector("p")!.textContent]
    )

  test("ONE stack at the window's bottom:  a plain notice replaces the plain one;  a green one stacks under it", () => {
    PageNotices.show("Sent 2 marks to Claude")
    PageNotices.show("Sent 3 marks to Claude")
    PageNotices.show("Comment deleted", { tone: "success", actions: [{ text: "Undo", click: () => {} }] })
    expect(document.querySelectorAll("[data-spell-notices]")).toHaveLength(1)
    expect(notices()).toEqual([
      ["plain", "Sent 3 marks to Claude"],
      ["success", "Comment deleted"]
    ])
    const host = document.querySelector<HTMLElement>("[data-spell-notices]")!
    expect([host.getAttribute("role"), getComputedStyle(host).position]).toEqual(["status", "fixed"])
    const [plain, green] = host.shadowRoot!.querySelectorAll<HTMLElement>(".notice")
    // the same pill, green
    expect(getComputedStyle(green!).borderRadius).toBe(getComputedStyle(plain!).borderRadius)
    expect(getComputedStyle(green!).backgroundColor).not.toBe(getComputedStyle(plain!).backgroundColor)
  })

  test("its button runs its action and takes the notice away;  left alone, it goes after its time", () => {
    vi.useFakeTimers()
    let undone = 0
    PageNotices.show("Comment deleted", {
      tone: "success",
      ms: 6000,
      actions: [{ text: "Undo", click: () => undone++ }]
    })
    PageNotices.show("Done:  that's good", { tone: "success", ms: 6000 })
    const host = document.querySelector("[data-spell-notices]")!.shadowRoot!
    host.querySelector<HTMLElement>("ui-button")!.click()
    expect([undone, notices()]).toEqual([1, [["success", "Done:  that's good"]]])
    vi.advanceTimersByTime(6000)
    expect(notices()).toEqual([])
  })
})
