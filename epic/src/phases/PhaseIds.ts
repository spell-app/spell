import { slug } from "spell/util/string.ts"

/****************
 * ### `PhaseIds`
 * A phase's ID, and the NUMBER people see and say (epic `epic-workflow` P15, I7 and J49).
 * - The id is STABLE:  made once from the phase's name when it's added, and kept for good.
 *   - `p-epic-migrate` for "Epic Migrate":  `p-`, then the name's slug (`slugOf()`);  a clash gets `-2`, `-3` ...
 *   - Renaming the phase changes its title, never its id;  inserting a phase before it changes nothing either.
 *   - So links (`#p-epic-migrate`), Owen's comments (`p-epic-migrate#field-1`), marks and part files
 *     (`parts/p-epic-migrate.html`) stay on their phase.
 * - The NUMBER is what people see and say:  "P7", worked out as the page draws (`numberOf()`).
 *   - never written:  "P7" is the 7th phase;  adding or moving one renumbers the phases after it, and the tool
 *     rewrites what names them (`PhaseNumbers`, in the tool)
 *   - P39 wrote DECIMAL phases (`<epic-phase number="11.1">`);  epic `epic-engine` I126 took them out (Owen,
 *     2026-10-25:  "ditch the 17.1 and just reorder"), the migration `whole-phase-numbers` making each one whole;
 *     one still on a page (not migrated yet) reads as before:  its own number, the rest counted without it
 * - Before P15 the id WAS the number (`p7`):  such OLD ids still read as phase ids, until the migration
 *   `stable-phase-ids` turns them into stable ones;  an old address (`#p7`) lands on the 7th phase (`landing()`).
 * - STATIC, pure, node-safe:  the elements, the epic tool and its migrations alike import it (`spell/epic/phases`).
 ****************/
export class PhaseIds {
  /** What every stable phase id starts with:  it keeps them clear of the section ids (`#log`, `#overview`). */
  static readonly PREFIX = "p-"

  /**
   * `title`'s slug:  lower case, its words joined by `-`, anything else dropped.
   * - `Epic Migrate` -> `epic-migrate`;  `Owen's <epic-link>` -> `owens-epic-link`;  `Café 2.0` -> `cafe-2-0`
   * - an apostrophe joins its word (`Owen's` -> `owens`);  any other run of non-letters, non-digits splits words
   * - accents dropped;  a title with no letters or digits at all:  `phase`
   * - the kit's id rule (`slug()`, moved there):  the ids are SAVED in epic pages, so it must never change
   */
  static slugOf(title: string): string {
    return slug(title, { fallback: "phase" })
  }

  /**
   * A new phase's id for `title`:  `p-<slug>`, or `p-<slug>-2`, `-3` ... when an id in `taken` has it.
   * - `taken`:  every id the page holds (`idsIn()`):  a phase id must clash with nothing a link may name
   */
  static make(title: string, taken: ReadonlySet<string>): string {
    const base = `${PhaseIds.PREFIX}${PhaseIds.slugOf(title)}`
    let id = base
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
    return id
  }

  /** Is `id` a STABLE phase id (`p-epic-migrate`)? */
  static isStable(id: string): boolean {
    return STABLE_ID.test(id)
  }

  /** The number an OLD phase id says (`p7` -> 7);  `undefined` for any other id. */
  static oldNumber(id: string): number | undefined {
    const match = OLD_ID.exec(id)
    return match ? Number(match[1]) : undefined
  }

  /** Is `id` a phase id, stable (`p-epic-migrate`) or old (`p7`)? */
  static isPhaseId(id: string): boolean {
    return PhaseIds.isStable(id) || OLD_ID.test(id)
  }

  /** Every id in `root`, for `make()`. */
  static idsIn(root: ParentNode): Set<string> {
    return new Set(Array.from(root.querySelectorAll("[id]"), (element) => element.id))
  }

  ////////////////
  // ## Numbers
  ////////////////

  /** The page's phases, in order:  each `<epic-phase>` of its Phases section. */
  static phasesIn(root: ParentNode): Element[] {
    return Array.from(root.querySelectorAll(PHASES))
  }

  /**
   * `phase`'s number, as people say it:  `"7"`;  `"0"` for a phase in no list;
   * `"11.1"` for an old decimal phase, not migrated yet
   * - an old decimal phase:  its own `number` (`<epic-phase number="11.1">`)
   * - any other:  its place among the WHOLE-numbered phases beside it, from 1
   */
  static numberOf(phase: Element): string {
    const own = PhaseIds.decimalOf(phase)
    if (own) return own
    const siblings = phase.parentElement ? Array.from(phase.parentElement.children) : []
    const phases = siblings.filter((each) => each.localName === "epic-phase")
    const at = phases.indexOf(phase)
    if (at < 0) return "0"
    return String(phases.slice(0, at + 1).filter((each) => !PhaseIds.decimalOf(each)).length)
  }

  /** `phase`'s label, as drawn and said:  `P7`, `P11.1`. */
  static labelOf(phase: Element): string {
    return `P${PhaseIds.numberOf(phase)}`
  }

  /** `phase`'s own OLD decimal number (`11.1`, P39), not migrated yet;  else `undefined`:  its number is its place. */
  static decimalOf(phase: Element): string | undefined {
    const number = phase.getAttribute("number")
    return number !== null && DECIMAL.test(number) ? number : undefined
  }

  /**
   * The phase of `phases` that `ref` names, as people name one;  `undefined` for none.
   * - its NUMBER:  `7`, `P7`, `p7` (`#p7` too), `11.1`, `P11.1`:  the phase numbered so (`numberOf()`)
   * - its id:  `p-epic-migrate`
   * - its name or its slug:  `Epic Migrate`, `epic-migrate`;  any case
   *   - by id first (the name it was added under), then by its title today (a renamed phase)
   */
  static find(phases: readonly Element[], ref: string | number): Element | undefined {
    const text = String(ref).trim().replace(/^#/, "")
    const number = NUMBER_REF.exec(text)
    if (number) return phases.find((phase) => PhaseIds.numberOf(phase) === number[1])
    const byId = phases.find((phase) => phase.id === text)
    if (byId) return byId
    const slug = PhaseIds.slugOf(text)
    return (
      phases.find((phase) => phase.id === `${PhaseIds.PREFIX}${slug}`) ??
      phases.find((phase) => PhaseIds.slugOf(PhaseIds.titleOf(phase)) === slug)
    )
  }

  /** `phase`'s title as text:  its `title`, else its `slot="title"` child's words. */
  static titleOf(phase: Element): string {
    const title = phase.getAttribute("title")
    if (title !== null) return title
    return (phase.querySelector(':scope > [slot="title"]')?.textContent ?? "").replace(/\s+/g, " ").trim()
  }

  /**
   * The id an address's `#id` lands on in `root` (a page):  `id` itself, unless it's an OLD phase id (`p7`) that no
   * element has, when it's P7's id;  so old links and bookmarks still land after `stable-phase-ids`.
   * - a number past the last phase:  `id` unchanged (nothing to land on)
   */
  static landing(root: Document, id: string): string {
    const n = PhaseIds.oldNumber(id)
    if (n === undefined || root.getElementById(id)) return id
    return PhaseIds.find(PhaseIds.phasesIn(root), n)?.id ?? id
  }
}

/** A stable phase id:  `p-`, then a slug. */
const STABLE_ID = /^p-[a-z0-9]+(?:-[a-z0-9]+)*$/

/** An OLD phase id, before P15:  `p7`. */
const OLD_ID = /^p(\d+)$/

/** A phase named by its number:  `7`, `P7`, `p7`, `11.1`, `P11.1`. */
const NUMBER_REF = /^[Pp]?(\d+(?:\.\d+)?)$/

/** An old decimal phase's number:  `11.1`. */
const DECIMAL = /^\d+\.[1-9]\d*$/

/** The phases of a page:  its Phases section's `<epic-phase>`s. */
const PHASES = 'epic-page > epic-section[kind="phases"] > epic-phase'
