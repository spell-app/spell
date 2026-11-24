import { afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from "vite-plus/test"

import { UI } from "spell/ui/runtime"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMElement } from "spell/element"

import "spell/ui/components/ui-toast"
import "spell/ui/components/ui-message"

/**
 * Toasts and floating messages come IN with a slide and a fade, so a warning catches the eye (epic `editor` T154).
 * - In the `motion` project:  animations on, as a person without reduced motion sees them.
 */

beforeAll(() => UI.load())
afterEach(() => UI.overlays.closeAll("toast"))

/** An entrance `UI.transitions` ran:  the element, the animation's name, and the CSS keyframes it started. */
type Entrance = { element: HTMLElement; name: string; keyframes: string[] }

/**
 * Every `UI.transitions.animate()` IN from now on, with the CSS animations each started there and then.
 * - Read at once, inside the call:  a slow machine could see a short animation already over by the test's next look.
 */
function entrances(): Entrance[] {
  const seen: Entrance[] = []
  const animate = UI.transitions.animate.bind(UI.transitions)
  const spy = vi.spyOn(UI.transitions, "animate").mockImplementation((params) => {
    const running = animate(params)
    if (params.direction === "in") {
      const keyframes = params.element
        .getAnimations()
        .map((animation) => (animation as CSSAnimation).animationName)
        .filter(Boolean)
      seen.push({ element: params.element, name: params.name, keyframes })
    }
    return running
  })
  onTestFinished(() => spy.mockRestore())
  return seen
}

describe("<ui-toast> motion", () => {
  it("rises into a bottom corner:  `fade-up`, its keyframes running", async () => {
    const seen = entrances()
    const element = UI.toast({ message: "Saved", position: "bottom right", displayTime: 0 }).element as DOMElement
    await element.ready
    await vi.waitFor(() => expect(seen).toHaveLength(1))
    expect({ name: seen[0].name, keyframes: seen[0].keyframes }).toEqual({
      name: "fade-up",
      keyframes: ["ui-fade-up-in"]
    })
  })

  it("drops in at the top:  `fade-down`", async () => {
    const seen = entrances()
    const element = UI.toast({ message: "You must be online to do this.", position: "top center", displayTime: 0 })
      .element as DOMElement
    await element.ready
    await vi.waitFor(() => expect(seen).toHaveLength(1))
    expect({ name: seen[0].name, keyframes: seen[0].keyframes }).toEqual({
      name: "fade-down",
      keyframes: ["ui-fade-down-in"]
    })
  })
})

describe("<ui-message> motion", () => {
  it("`floating`:  drops in the first time it shows", async () => {
    const seen = entrances()
    const host = await ElementFixture.render(
      `<ui-message floating state="error" heading="You must be online to do this."></ui-message>`
    )
    await vi.waitFor(() => expect(seen).toHaveLength(1))
    const box = host.shadowRoot!.querySelector("[part~=message]")
    expect({ isBox: seen[0].element === box, name: seen[0].name, keyframes: seen[0].keyframes }).toEqual({
      isBox: true,
      name: "fade-down",
      keyframes: ["ui-fade-down-in"]
    })
  })

  it("in the page's flow:  stays still", async () => {
    const seen = entrances()
    await ElementFixture.render(`<ui-message state="info" heading="Just so you know"></ui-message>`)
    await ElementFixture.settle()
    expect(seen).toEqual([])
  })
})
