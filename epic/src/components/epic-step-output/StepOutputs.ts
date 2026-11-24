/****************
 * ### `StepOutputs`
 * Puts a paste box (`<epic-step-output>`) under each command of a manual test's steps (epic `epic-engine` T165):
 * read off the Step field's markup, so no test's text names them.
 * - A test's Step field:  `<epic-field label="Step">` in `<epic-item id="m3">`;  NOT one in its `<epic-original>` (an
 *   older version of the test).
 * - Its steps:  each `<li>` of its own lists, numbered as the person reads them (1 first, on through a second list);
 *   a field with no list is one step.
 * - A step with a command (a `<pre>` code block):  one box, last in the step.
 *   A step without one:  none.
 * - Each box is `data-spell-added`:  the live patch steps around it, comments anchor past it, and the field's taste
 *   leaves it out.
 * - `<epic-field>` keeps them in step with its text:  it watches `signature()`, and calls `place()` after the Solid
 *   update it hears of (`E.afterSolidUpdate()`), never inside an effect, where a box's `connectedCallback()` making its
 *   root would throw.
 * - Plain DOM, static, no Solid.
 * - Position in the import graph:  imports nothing;  `<epic-field>` (the `epic-phase` family) imports this file
 *   alone, never this family's barrel, so the box's family loads only when a box is on the page.
 ****************/
export class StepOutputs {
  /**
   * Where `field`'s boxes stand, as one string that changes when `place()` has work to do:  each step with a command,
   * `3+` with its box, `3-` without, then how many boxes no step wants;  `""` for a field that isn't a test's Step.
   */
  static signature(field: HTMLElement): string {
    if (!StepOutputs.isTestStep(field)) return ""
    const item = field.closest(ITEM)!.id.toLowerCase()
    const wanted = StepOutputs.wanted(field)
    const steps = [...wanted].map(([step, number]) => {
      const last = step.lastElementChild
      return `${number}${last?.matches(BOX) && StepOutputs.isFor(last, item, number) ? "+" : "-"}`
    })
    const placed = [...wanted.keys()].filter((step) => step.lastElementChild?.matches(BOX)).length
    return `${steps.join(" ")} | ${field.querySelectorAll(BOX).length - placed}`
  }

  /** Is `field` a manual test's Step field, not an older version's? */
  static isTestStep(field: Element): boolean {
    if (!field.matches(STEP_FIELD) || field.closest(ORIGINAL)) return false
    return TEST_ID.test(field.closest(ITEM)?.id ?? "")
  }

  /**
   * Put a box under each of `field`'s commands, each numbered for its step, and take away any box no step needs now.
   * - idempotent:  a second run changes nothing, so the observer's own mutations settle at once
   */
  static place(field: HTMLElement) {
    const item = field.closest(ITEM)?.id.toLowerCase() ?? ""
    const wanted = StepOutputs.wanted(field)
    for (const box of Array.from(field.querySelectorAll(BOX))) {
      const step = wanted.get(box.parentElement!)
      if (step === undefined || box !== box.parentElement!.lastElementChild || !StepOutputs.isFor(box, item, step))
        box.remove()
    }
    for (const [step, number] of wanted) {
      const last = step.lastElementChild
      if (last?.matches(BOX)) continue
      const box = document.createElement(BOX_TAG)
      box.setAttribute("item", item)
      box.setAttribute("step", String(number))
      box.setAttribute(ADDED_ATTRIBUTE, "")
      step.append(box)
    }
  }

  /** `field`'s steps with a command, each with its number (1 first). */
  private static wanted(field: Element): Map<Element, number> {
    const wanted = new Map<Element, number>()
    StepOutputs.stepsOf(field).forEach((step, index) => {
      if (StepOutputs.hasCommand(step)) wanted.set(step, index + 1)
    })
    return wanted
  }

  /** `field`'s steps:  its own lists' items, in order;  none:  the field itself, one step. */
  static stepsOf(field: Element): Element[] {
    const lists = Array.from(field.children).filter((child) => child.matches(LISTS))
    if (!lists.length) return [field]
    return lists.flatMap((list) => Array.from(list.children).filter((child) => child.localName === "li"))
  }

  /** Does `step` hold a command:  a code block of its own, not one the page added? */
  static hasCommand(step: Element): boolean {
    return Array.from(step.querySelectorAll(COMMAND)).some((block) => !block.closest(ADDED))
  }

  /** Is `box` its test's, for step `step`? */
  private static isFor(box: Element, item: string, step: number): boolean {
    return box.getAttribute("item") === item && box.getAttribute("step") === String(step)
  }
}

/** A Step field:  a labelled block, `Step`. */
const STEP_FIELD = 'epic-field[label="Step" i]'

/** Where an older version of an item is kept:  its fields get no boxes. */
const ORIGINAL = "epic-original"

/** An item. */
const ITEM = "epic-item"

/** A manual test's id (as `EpicSection.types.ts`'s `TEST_ID`). */
const TEST_ID = /^m\d+$/

/** A step list. */
const LISTS = "ol, ul"

/** A command:  a code block. */
const COMMAND = "pre"

/** The box's tag. */
const BOX_TAG = "epic-step-output"

/** A box. */
const BOX = BOX_TAG

/** What the page added:  the live patch, comments and a field's taste step around it. */
const ADDED_ATTRIBUTE = "data-spell-added"
const ADDED = `[${ADDED_ATTRIBUTE}]`
