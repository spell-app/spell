import { ACTION_LINK, TESTS_SELECTOR, TEST_ID, type TestFields } from "./EpicTestRun.types"

/****************
 * ### `TestRun`
 * What a test run reads from its page (epic `epic-engine` P4):  which tests, in which order, and each one's fields.
 * - Plain DOM reads, no Solid:  `<epic-test-run>` calls them from its memos, which follow the page's `layout`.
 * - The doc is never touched:  the fields are COPIES of the item's light DOM.
 ****************/
export class TestRun {
  /**
   * The open tests of `page`, by id, in the run's ORDER:  page order, the deferred ones (`deferred`, a Not now of an
   * earlier run) last.
   */
  static openIds(page: ParentNode): string[] {
    const open = Array.from(page.querySelectorAll(TESTS_SELECTOR)).filter(
      (item) => TEST_ID.test(item.id) && (item.getAttribute("status") ?? "open") === "open"
    )
    const now = open.filter((item) => !item.hasAttribute(DEFERRED))
    const later = open.filter((item) => item.hasAttribute(DEFERRED))
    return [...now, ...later].map((item) => item.id)
  }

  /** Test `id` on `page`, if it's there. */
  static itemOf(page: ParentNode, id: string): Element | undefined {
    return Array.from(page.querySelectorAll(TESTS_SELECTOR)).find((item) => item.id === id)
  }

  /**
   * Test `item`'s fields, as the run shows them:  its `<epic-field label="Step">`, `Should`, `Example`, `If not`;
   * an older test's prose (every child but its slotted ones and its commits) as the Step.
   * - the Step's action links (`a.epic-test-action`) come out as buttons;  the Example's images as thumbnails
   * - `loading` while its part file hasn't arrived:  a `source` and no `:state(loaded)` yet
   */
  static fieldsOf(item: Element): TestFields {
    const fieldOf = (label: string) =>
      Array.from(item.children).find(
        (child) => child.localName === FIELD && child.getAttribute("label")?.toLowerCase() === label
      )
    const step = fieldOf("step")
    const should = fieldOf("should")
    const example = fieldOf("example")
    const ifNot = fieldOf("if not")
    const loading = item.hasAttribute("source") && !TestRun.isLoaded(item)
    const steps = TestRun.takeOut(step || should ? TestRun.copyOf(step) : TestRun.prose(item), ACTION_LINK)
    const examples = TestRun.takeOut(TestRun.copyOf(example), "img")
    return {
      step: steps.kept,
      actions: steps.taken.map((link) => ({
        href: link.getAttribute("href") ?? "",
        text: (link.textContent ?? "").trim(),
        target: link.getAttribute("target") ?? ACTION_TARGET
      })),
      should: TestRun.copyOf(should),
      example: examples.kept,
      shots: examples.taken.map((image) => ({
        src: image.getAttribute("src") ?? "",
        alt: image.getAttribute("alt") ?? ""
      })),
      ifNot: TestRun.copyOf(ifNot),
      loading
    }
  }

  /** `field`'s children, copied;  none without one. */
  private static copyOf(field: Element | undefined): Node[] {
    return field ? Array.from(field.childNodes, (node) => node.cloneNode(true)) : []
  }

  /** An older test's prose:  its children but its slotted ones (title, status cards) and its commits, copied. */
  private static prose(item: Element): Node[] {
    return Array.from(item.childNodes)
      .filter((node) => !(node instanceof Element) || (!node.hasAttribute("slot") && !NOT_PROSE.has(node.localName)))
      .map((node) => node.cloneNode(true))
  }

  /**
   * Take every element matching `selector` out of `nodes` (copies):  what's `kept`, and what was `taken`.
   * - a paragraph left empty by it goes too (a Step whose paragraph held only its action link)
   * - nothing but blank text kept:  none
   */
  private static takeOut(nodes: Node[], selector: string): { kept: Node[]; taken: Element[] } {
    const taken: Element[] = []
    const kept = nodes.filter((node) => {
      if (!(node instanceof Element)) return true
      if (node.matches(selector)) return !taken.push(node)
      const inner = Array.from(node.querySelectorAll(selector))
      for (const element of inner) element.remove()
      taken.push(...inner)
      return !(inner.length && node.localName === "p" && !node.textContent?.trim() && !node.children.length)
    })
    const blank = kept.every((node) => !(node instanceof Element) && !node.textContent?.trim())
    return { kept: blank ? [] : kept, taken }
  }

  /** Has `item`'s part arrived (`LoadableBody`'s `:state(loaded)`)?  A browser without custom states:  its children. */
  private static isLoaded(item: Element): boolean {
    try {
      return item.matches(":state(loaded)")
    } catch {
      return Array.from(item.children).some((child) => !child.hasAttribute("slot"))
    }
  }
}

/** A field's tag. */
const FIELD = "epic-field"

/** A test put off by an earlier run's Not now (the tool's `deferred`, a date):  last in the order. */
const DEFERRED = "deferred"

/** Where an action link opens without a `target` of its own:  a tab of its own, so the run stays. */
const ACTION_TARGET = "_blank"

/** An item's children that are never its prose. */
const NOT_PROSE = new Set(["epic-commit", "epic-status"])
