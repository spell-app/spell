import { expect, test } from "vite-plus/test"

/**
 * When an epic page's toolbar gets its section icons, the docs runtime driving the page as it does when served.
 * - epic `epic-engine` I408:  a family loads when one of its elements is made (epic `solid-2-final` P7),
 *   so `<epic-phase>`'s never loads on a page with no phase;
 *   the runtime waited for it anyway, and the icons came 5 seconds late
 * - the runtime runs as it's imported, so the page is set up first, and this file holds one test
 */

/** The epic page's tags, as the docs bundle defines them early. */
const TAGS = ["epic-page", "epic-overview", "epic-section", "epic-phase"]

/** An epic page with no phases yet, as one in its Overview stage has none. */
const NO_PHASES_PAGE =
  `<main class="spell-doc-main"><epic-page stage="overview">` +
  `<epic-overview id="overview"><p>What it's for.</p></epic-overview>` +
  `<epic-section id="questions" kind="questions"><epic-item id="q1"></epic-item></epic-section>` +
  `</epic-page></main>`

/** Sooner than the runtime gives up waiting for the epic elements (`EPIC_WAIT_MS`, 5 seconds). */
const ICONS_WITHIN_MS = 2000

/** A stand-in for an epic element, whose family loads only when one is on the page. */
class FakeEpicElement extends HTMLElement {
  static whenAttached(tag: string) {
    return document.querySelector(tag) ? Promise.resolve() : new Promise<void>(() => {})
  }
  readonly ready = Promise.resolve()
  get contentsEntry() {
    return { label: this.id, icon: "circle" }
  }
}

test("an epic page with NO phase gets its section icons as it draws, never waiting for the phases", async () => {
  for (const tag of TAGS) customElements.define(tag, class extends FakeEpicElement {})
  document.body.className = "spell-doc-page plan-doc"
  document.body.innerHTML = NO_PHASES_PAGE

  // Dynamic import:  the runtime wires whatever page is there when it's first imported
  await import("spell/epic/tools/_assets/spell-doc-runtime.js")

  await expect
    .poll(() => Array.from(document.querySelectorAll<HTMLElement>("[data-rail]"), (entry) => entry.dataset.rail), {
      timeout: ICONS_WITHIN_MS
    })
    .toEqual(["overview", "questions"])
})
