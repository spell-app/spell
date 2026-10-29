import { inTestOrder } from "spell/epic/review"

import { TEST_ID, TEST_ITEMS } from "./EpicSection.types"

/****************
 * ### `TestQueue`
 * The Manual tests section's tests, as Owen goes through them ON the page (epic `epic-engine` P51, Q53):  which are
 * open, in which order, which he hasn't answered yet, and opening one.
 * - Owen, 2026-10-29:  "Transform the 'manual test' thinger to something I do inline within the epic doc, rather
 *   than its own page."
 * - Plain DOM reads, static:  `<epic-section kind="tests">` calls them from its memos (which follow its children and
 *   the inbox), and from its button's click.
 * - Answered:  any mark of Owen's on it (Approve, a note, the x), until Claude applies it.
 * - Its order is the tool's too (`inTestOrder()`):  the prepared ones by their place, then page order, deferred last.
 ****************/
export class TestQueue {
  /** `section`'s open tests, by id, in Owen's order. */
  static openIds(section: ParentNode): string[] {
    const open = Array.from(section.querySelectorAll(TEST_ITEMS)).filter(
      (item) => TEST_ID.test(item.id) && (item.getAttribute("status") ?? "open") === "open"
    )
    const tests = open.map((item) => ({
      id: item.id,
      prepared: item.getAttribute("prepared"),
      deferred: item.getAttribute("deferred")
    }))
    return inTestOrder(tests).map((test) => test.id)
  }

  /** Has Start testing written out every open test (`prepared`)?  None open:  no. */
  static isPrepared(section: ParentNode): boolean {
    const ids = TestQueue.openIds(section)
    return ids.length > 0 && ids.every((id) => section.querySelector(`#${CSS.escape(id)}`)?.hasAttribute(PREPARED))
  }

  /** The open tests Owen hasn't answered yet (`isAnswered`:  a mark of his), in his order. */
  static leftIds(section: ParentNode, isAnswered: (id: string) => boolean): string[] {
    return TestQueue.openIds(section).filter((id) => !isAnswered(id))
  }

  /**
   * The test to open next:  the first one left after `current` in Owen's order, round to the start;  none left, the
   * first open one;  `undefined` with none open.
   */
  static nextId(section: ParentNode, isAnswered: (id: string) => boolean, current?: string): string | undefined {
    const open = TestQueue.openIds(section)
    const left = open.filter((id) => !isAnswered(id))
    if (!left.length) return open[0]
    const at = current ? open.indexOf(current) : -1
    return left.find((id) => open.indexOf(id) > at) ?? left[0]
  }

  /**
   * Open test `id` on the page:  the address becomes `#m3` (replaced, never pushed:  a reload comes back to it), and
   * the docs runtime lands there as for a link, unfolding the Manual tests section and opening the test.
   * - SIDE EFFECT:  rewrites the address's hash, and fires `hashchange`
   */
  static open(id: string) {
    const oldURL = location.href
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${id}`)
    dispatchEvent(new HashChangeEvent("hashchange", { oldURL, newURL: location.href }))
  }

  /** Is Owen typing in a field (the focus in a text box, at any shadow depth)?  Then a test doesn't open under him. */
  static isTyping(): boolean {
    let active = document.activeElement
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
    return !!active && (active.matches(TYPING) || (active as HTMLElement).isContentEditable)
  }
}

/** A test Start testing wrote out (`<epic-item prepared>`). */
const PREPARED = "prepared"

/** What takes typing:  a text field. */
const TYPING = "textarea, input:not([type=button], [type=checkbox], [type=radio], [type=submit], [type=file])"
