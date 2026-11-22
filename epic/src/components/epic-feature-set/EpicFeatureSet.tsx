import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { Dragging } from "spell/util/Dragging"
import { E, UIT } from "spell/ui/core"

import {
  AnswerForm,
  ORDER_KEY,
  orderKeyFor,
  type AnswerPart,
  type AskState,
  type PageAnswer,
  type PartLabels,
  type SentAnswer
} from "spell/epic/answers"
import { isSourceFileLink } from "spell/epic/links"

import { epicFeatureSetVocabulary } from "./EpicFeatureSet.en"

import featureSetCSS from "./EpicFeatureSet.css?inline"

/****************
 * ### `EpicFeatureSet`
 * The component behind `<epic-feature-set>`:  a details page that's a ranked list to pick from (epic `epic-engine`
 * P80;  the tool's `FeatureSet` writes the page).
 * - Reordering:  ONE dialog, for the sections (its own button) or a section's items (that section's
 *   `<ui-button data-feature-reorder>`).
 *   - a row is dragged by its dots, or moved by its arrows or the arrow keys;  Save moves them on the page
 *   - Cancel, the ✕ and Escape change nothing
 *   - the names STAY with what they name (Owen's Q83):  `s2` is still S2, wherever it is
 *   - elements move whole, so picks and comments go with their item
 *   - the order is part of the answer (`AnswerPart`):  under `order` and `order-<section>`, when it isn't as written
 * - Links in the page's text:  another site's opens a new tab, the rest this window.
 *   (Back putting the reader where they were is the docs runtime's, `spell-doc-back.js`.)
 * - Each section's state (`data-state`), from its questions:  red till every one's decided.
 * - SIDE EFFECT:  moves the page's sections and rows, writes their `data-state` and their links' `target`.
 * - NEVER wraps the sections:  they're the page's top-level ones, which its toolbar and landing read.
 ****************/
export class EpicFeatureSet extends E.UIComponent<typeof epicFeatureSetVocabulary> implements AnswerPart {
  @E.proto static vocabulary = epicFeatureSetVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-feature-set": featureSetCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Connected
  ////////////////

  /** The page's form, while it's registered there. */
  private form: AnswerForm | undefined

  /** How many sections the list has:  under two, no Reorder sections. */
  @E.state accessor sectionCount = 0

  /** While connected:  its part of the answer, the page's links and buttons, its sections' states;  returns the undo. */
  @E.whileConnected
  protected joinPage() {
    this.readPage()
    const form = AnswerForm.forPage()
    this.form = form
    const leave = form.add(this)
    const unfollow = form.subscribe(() => this.markSectionsSoon())
    const listeners = new AbortController()
    const { signal } = listeners
    document.addEventListener("click", (event) => this.onPageClick(event), { signal })
    window.addEventListener(PAGE_UPDATED, () => this.onPageUpdated(), { signal })
    this.markSectionsSoon()
    return () => {
      listeners.abort()
      unfollow()
      leave()
      this.form = undefined
    }
  }

  /** The page's main column:  where its sections and its links are. */
  private get main(): HTMLElement {
    return this.domElement.closest("main") ?? document.body
  }

  /** The list's sections, in their order now. */
  private get sections(): HTMLElement[] {
    return Array.from(this.main.querySelectorAll<HTMLElement>(SECTION))
  }

  /** The lists that can be reordered:  the sections, then each section's items, as `ReorderList`s. */
  private get lists(): ReorderList[] {
    const sections = this.sections
    return [
      { key: ORDER_KEY, elements: sections },
      ...sections.map((section) => ({
        key: orderKeyFor(section.id),
        elements: Array.from(section.querySelectorAll<HTMLElement>(ITEM))
      }))
    ]
  }

  /** Read what the page has:  each list's order as written, and aim its links. */
  private readPage() {
    const lists = this.lists
    for (const { key, elements } of lists) {
      const ids = elements.map((element) => element.id)
      // as written the first time;  an edit to the page since adds and drops, a move of the person's doesn't count
      const before = this.written.get(key)
      this.written.set(key, before ? mergedOrder(before, ids) : ids)
    }
    this.sectionCount = lists[0]!.elements.length
    for (const link of this.main.querySelectorAll<HTMLAnchorElement>("a[href]")) EpicFeatureSet.aimLink(link)
  }

  /** The page's file changed and was patched in:  read it again, and keep the person's order over it. */
  private onPageUpdated() {
    this.readPage()
    for (const key of this.wanted.keys()) this.putInOrder(key)
    this.markSectionsSoon()
  }

  /** A click in the page:  a section's Reorder opens the dialog;  a link is aimed before the browser follows it. */
  private onPageClick(event: MouseEvent) {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue
      if (node.hasAttribute(REORDER)) return this.startSorting(orderKeyFor(node.getAttribute(REORDER)!))
      if (node instanceof HTMLAnchorElement && node.hasAttribute("href") && event.composedPath().includes(this.main))
        return EpicFeatureSet.aimLink(node)
    }
  }

  ////////////////
  // ## The order
  ////////////////

  /** Each list's order as the page was written, by its key. */
  private readonly written = new Map<string, string[]>()

  /** Each list's order as the person wants it, by its key:  none for one left as written. */
  private readonly wanted = new Map<string, string[]>()

  /** List `key`'s order:  the person's, else as written. */
  private orderOf(key: string): string[] {
    const written = this.written.get(key) ?? []
    const wanted = this.wanted.get(key)
    return wanted ? mergedOrder(wanted, written) : written
  }

  /**
   * Move list `key`'s elements into `orderOf(key)`;  nothing when they are.
   * - with `moveBefore()` where the browser has it, so nothing in them starts again
   * - SIDE EFFECT:  moves elements, and tells the page's toolbar
   */
  private putInOrder(key: string) {
    const elements = this.lists.find((list) => list.key === key)?.elements ?? []
    const last = elements.at(-1)
    const parent = last?.parentNode as MovableParent | null | undefined
    if (!parent) return
    const ids = this.orderOf(key)
    const sorted = [...elements].sort((one, other) => ids.indexOf(one.id) - ids.indexOf(other.id))
    if (sorted.every((element, i) => element === elements[i])) return
    const after = last!.nextSibling
    for (const element of sorted) {
      if (parent.moveBefore && element.parentNode === parent) parent.moveBefore(element, after)
      else parent.insertBefore(element, after)
    }
    this.tellPage()
  }

  /** Tell the docs runtime its sections changed (order, state):  it draws the toolbar again. */
  private tellPage() {
    this.domElement.dispatchEvent(new Event(SECTIONS_CHANGED, { bubbles: true }))
  }

  ////////////////
  // ## The dialog
  ////////////////

  /** The dialog is shown. */
  @E.state accessor isSorting = false

  /** What the dialog sorts;  kept as it closes, so it doesn't empty while it fades. */
  @E.state accessor sorting: Sorting | undefined = undefined

  /** What's said as a row moves, for screen readers. */
  @E.state accessor said = ""

  /** The id of the row being dragged. */
  @E.state accessor draggedId: string | undefined = undefined

  /** Open the dialog on list `key`, as it is now. */
  @E.untracked
  private startSorting(key: string) {
    const list = this.lists.find((each) => each.key === key)
    if (!list?.elements.length) return
    const isSections = key === ORDER_KEY
    this.sorting = {
      key,
      heading: isSections
        ? this.translationForKey("sectionsHeading")
        : this.translationForKey("itemsHeading", { title: this.sectionTitle(key) }),
      example: entryOf(list.elements[0]!).name,
      entries: list.elements.map(entryOf)
    }
    this.said = ""
    this.isSorting = true
  }

  /** The title of the section whose items list `key` orders:  `S2 · Next`. */
  private sectionTitle(key: string): string {
    const id = key.slice(ORDER_KEY.length + 1)
    return this.sections.find((section) => section.id === id)?.getAttribute("label") ?? id.toUpperCase()
  }

  /** Move the row of `id` to place `to` (from 0) in the dialog's list. */
  @E.untracked
  private moveEntry(id: string, to: number) {
    const sorting = this.sorting
    if (!sorting) return
    const entries = [...sorting.entries]
    const from = entries.findIndex((entry) => entry.id === id)
    if (from < 0 || to < 0 || to >= entries.length || from === to) return
    const [entry] = entries.splice(from, 1) as [SortEntry]
    entries.splice(to, 0, entry)
    this.sorting = { ...sorting, entries }
    const place = { title: titleOf(entry), place: String(to + 1), count: String(entries.length) }
    this.said = this.translationForKey("placed", place)
  }

  /** Move the row of `id` one place, `step` -1 up or 1 down, and keep the focus on it. */
  @E.untracked
  private stepEntry(id: string, step: number, row: HTMLElement) {
    const at = this.sorting?.entries.findIndex((entry) => entry.id === id) ?? -1
    this.moveEntry(id, at + step)
    // an arrow greys at the list's end, and would drop the focus out of the list
    E.afterSolidUpdate(() => row.querySelector<HTMLElement>(`.${GRIP}`)?.focus())
  }

  /** The dialog's list, as drawn. */
  private listBox: HTMLElement | undefined

  /** A press on row `id`'s dots:  a drag once it moves, its row going where the pointer is;  Escape puts it back. */
  @E.untracked
  private startDrag(id: string, event: PointerEvent) {
    const row = (event.currentTarget as HTMLElement).closest<HTMLElement>(`.${ENTRY}`)
    const before = this.sorting
    if (event.button !== 0 || !row || !before) return
    new Dragging(row, event, {
      carried: [row],
      follows: false,
      placing: (_x, y) => {
        this.draggedId = id
        const others = Array.from(this.listBox?.children ?? []).filter((each) => each !== row)
        const above = others.filter((each) => {
          const { top, height } = each.getBoundingClientRect()
          return top + height / 2 < y
        })
        this.moveEntry(id, above.length)
      },
      onDrop: () => (this.draggedId = undefined),
      onCancel: () => {
        this.draggedId = undefined
        this.sorting = before
        this.said = ""
      }
    })
  }

  /** An arrow key on row `id` moves it. */
  private onEntryKey(id: string, event: KeyboardEvent) {
    const step = event.key === UIT.Key.arrowUp ? -1 : event.key === UIT.Key.arrowDown ? 1 : 0
    if (!step || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    this.stepEntry(id, step, event.currentTarget as HTMLElement)
  }

  /** Save order:  the page's elements move, and the change waits for Send. */
  @E.untracked
  private saveOrder() {
    const sorting = this.sorting
    this.isSorting = false
    if (!sorting) return
    const { key, entries } = sorting
    const ids = entries.map((entry) => entry.id)
    if (sameOrder(ids, this.orderOf(key))) return
    if (sameOrder(ids, this.written.get(key) ?? [])) this.wanted.delete(key)
    else this.wanted.set(key, ids)
    this.putInOrder(key)
    this.form?.edited()
  }

  /** The dialog closed itself (its ✕, Escape):  nothing changes. */
  private readonly onModalClosed = (event: Event) => {
    if (event.target === event.currentTarget) this.isSorting = false
  }

  ////////////////
  // ## Its sections' states
  ////////////////

  /** A look at the states is coming (`markSectionsSoon()`). */
  private isMarking = false

  /** `markSections()` once the change is drawn, once however often it's asked. */
  private markSectionsSoon() {
    if (this.isMarking) return
    this.isMarking = true
    E.afterSolidUpdate(() => {
      this.isMarking = false
      this.markSections()
    })
  }

  /**
   * Each section's state, from its questions:  one undecided is red, one Claude has more to do on blue, else green.
   * - SIDE EFFECT:  writes `data-state`, and tells the page's toolbar of a change
   */
  @E.untracked
  private markSections() {
    if (!this.form) return
    const states = new Map<Element, AskState[]>()
    for (const ask of this.form.asks) {
      const section = ask.domElement.closest(SECTION)
      if (section) states.set(section, [...(states.get(section) ?? []), ask.askState])
    }
    let isChanged = false
    for (const [section, found] of states) {
      const state = STATES_BY_URGENCY.find((each) => found.includes(each))!
      if (section.getAttribute(STATE) === state) continue
      section.setAttribute(STATE, state)
      isChanged = true
    }
    if (isChanged) this.tellPage()
  }

  ////////////////
  // ## Its part of the answer
  ////////////////

  /** Each list's order the person changed, as that key's picks. */
  gatherInto(page: PageAnswer) {
    for (const key of this.wanted.keys()) {
      const ids = this.orderOf(key)
      if (!sameOrder(ids, this.written.get(key) ?? [])) page.answers[key] = { picked: [...ids] }
    }
  }

  /** Its keys, and each id in them, named for people:  a draft keeps them. */
  labelsInto(labels: PartLabels) {
    for (const [key, ids] of this.written) {
      labels[key] =
        key === ORDER_KEY ? "Order of the sections" : `Order in ${key.slice(ORDER_KEY.length + 1).toUpperCase()}`
      for (const id of ids) labels[`${key}-${id}`] = id.toUpperCase()
    }
  }

  /**
   * Show `answer`'s order:  the form reads it straight back (`gatherInto()`), so it's taken at once, and the elements
   * move once Solid is done (this can run inside an effect, where a move mustn't happen).
   */
  showAnswer(answer: SentAnswer) {
    for (const key of this.written.keys()) {
      const picked = answer.answers?.[key]?.picked
      if (!picked?.length && !this.wanted.has(key)) continue
      if (picked?.length) this.wanted.set(key, [...picked])
      else this.wanted.delete(key)
      E.afterSolidUpdate(() => this.putInOrder(key))
    }
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <Show when={this.sectionCount > 1}>
          <ui-button
            class={REORDER_SECTIONS}
            part={this.partForName("reorder")}
            size="small"
            appearance="basic circular"
            icon="arrows up down"
            onClick={() => this.startSorting(ORDER_KEY)}
          >
            {this.translationForKey("reorderSections")}
          </ui-button>
        </Show>
        {this.renderDialog()}
      </div>
    )
  }

  /** The one dialog:  its title, how it works, the list, Cancel and Save order. */
  private renderDialog(): JSX.Element {
    return (
      <ui-modal
        part={this.partForName("dialog")}
        size="small"
        closable=""
        closedby="closerequest"
        heading={this.sorting?.heading}
        visible={this.isSorting ? "" : undefined}
        on-ui-closed={this.onModalClosed}
      >
        <ui-content class={DIALOG_BODY}>
          <div class={HOW_TO}>
            <p>{this.translationForKey("howTo")}</p>
            <p>{this.translationForKey("namesStay", { name: this.sorting?.example ?? "" })}</p>
            <p>{this.translationForKey("sendAfter")}</p>
          </div>
          <ol ref={(list: HTMLElement) => (this.listBox = list)} class={LIST} part={this.partForName("list")}>
            <For each={this.sorting?.entries ?? []} keyed={(entry) => entry.id}>
              {(entry, index) => this.renderEntry(entry, index)}
            </For>
          </ol>
          <p class={SAID} aria-live="polite">
            {this.said}
          </p>
        </ui-content>
        <ui-actions>
          <ui-button part={this.partForName("cancel")} appearance="basic" onClick={() => (this.isSorting = false)}>
            {this.translationForKey("cancel")}
          </ui-button>
          <ui-button part={this.partForName("save")} color="primary" onClick={() => this.saveOrder()}>
            {this.translationForKey("save")}
          </ui-button>
        </ui-actions>
      </ui-modal>
    )
  }

  /** One row of the dialog's list:  its dots, name and title, its arrows. */
  private renderEntry(entry: () => SortEntry, index: () => number): JSX.Element {
    const title = () => ({ title: titleOf(entry()) })
    const step = (by: number, event: MouseEvent) =>
      this.stepEntry(entry().id, by, (event.currentTarget as HTMLElement).closest<HTMLElement>(`.${ENTRY}`)!)
    return (
      <li
        class={[ENTRY, { dragged: this.draggedId === entry().id }]}
        part={this.partForName("entry")}
        onKeyDown={(event) => this.onEntryKey(entry().id, event)}
      >
        <ui-button
          class={GRIP}
          size="small"
          appearance="basic circular"
          icon="grip vertical"
          aria-label={this.translationForKey("grip", title())}
          onPointerDown={(event: PointerEvent) => this.startDrag(entry().id, event)}
        />
        <span class={NAME}>{entry().name}</span>
        <span class={TITLE}>{entry().title}</span>
        <ui-button
          size="small"
          appearance="basic circular"
          icon="arrow up"
          disabled={index() === 0 ? "" : undefined}
          aria-label={this.translationForKey("moveUp", title())}
          onClick={(event: MouseEvent) => step(-1, event)}
        />
        <ui-button
          size="small"
          appearance="basic circular"
          icon="arrow down"
          disabled={index() === (this.sorting?.entries.length ?? 0) - 1 ? "" : undefined}
          aria-label={this.translationForKey("moveDown", title())}
          onClick={(event: MouseEvent) => step(1, event)}
        />
      </li>
    )
  }

  ////////////////
  // ## Statics
  ////////////////

  /**
   * Where `link` opens:  another site's in a new tab, the rest in this window.
   * - left alone:  not http(s) (`mailto:`, a short address not worked out yet), and a source file's `src-` target,
   *   which is how the side bar knows to open it in the editor
   */
  static aimLink(link: HTMLAnchorElement) {
    if (!/^https?:$/.test(link.protocol)) return
    if (link.origin !== location.origin) {
      link.target = "_blank"
      link.rel = "noopener"
      return
    }
    if (isSourceFileLink(link.target, link.pathname)) return
    if (link.target) link.target = "_self"
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicFeatureSet extends E.AttributeValues<typeof epicFeatureSetVocabulary> {}

/** A row of the dialog, from a section or an item `element`:  its id, its name, its title. */
function entryOf(element: HTMLElement): SortEntry {
  const label = element.getAttribute("label")
  if (label !== null) return { id: element.id, name: element.id.toUpperCase(), title: label.replace(/^S\d+ · /, "") }
  return {
    id: element.id,
    name: element.querySelector(".spell-feature-name")?.textContent?.trim() ?? element.id.toUpperCase(),
    title: element.querySelector(".spell-feature-title > b")?.textContent?.trim() ?? ""
  }
}

/** An entry, as a sentence names it:  `F3 · Share a link`. */
function titleOf({ name, title }: SortEntry): string {
  return `${name} · ${title}`
}

/** `ids` in the order `first` has them, then those it doesn't name, as they are;  none that `ids` hasn't. */
function mergedOrder(first: readonly string[], ids: readonly string[]): string[] {
  return [...first.filter((id) => ids.includes(id)), ...ids.filter((id) => !first.includes(id))]
}

/** The same ids in the same order? */
function sameOrder(one: readonly string[], other: readonly string[]): boolean {
  return one.length === other.length && one.every((id, i) => id === other[i])
}

/** A list that can be reordered:  its answer key and its elements, in their order now. */
type ReorderList = { key: string; elements: HTMLElement[] }

/** What the dialog sorts:  the list's key, the dialog's title, a name to explain with, its rows as they'd be saved. */
type Sorting = { key: string; heading: string; example: string; entries: SortEntry[] }

/** A row of the dialog:  the element's id, its name (`S2`, `F3`), its title. */
type SortEntry = { id: string; name: string; title: string }

/** A parent that may move a child without disconnecting it (`moveBefore()`, not in every browser yet). */
type MovableParent = Element & { moveBefore?: (node: Element, child: Node | null) => void }

/** The list's sections, and an item's row in one (the tool's `FeatureSet` writes both). */
const SECTION = "ui-section[data-feature-section]"
const ITEM = "tr[data-feature-item]"

/** A section's Reorder button's attribute:  the section's id its value. */
const REORDER = "data-feature-reorder"

/** The docs runtime's attribute for a section's state, which its toolbar shows. */
const STATE = "data-state"

/** A section's states, the one that wins first. */
const STATES_BY_URGENCY: readonly AskState[] = ["attention", "working", "done"]

/** The docs runtime's events:  it patched the page's file in;  a page's blocks changed, so draw the toolbar again. */
const PAGE_UPDATED = "spell-doc:updated"
const SECTIONS_CHANGED = "epic-count-changed"

/** Classes of the shadow markup. */
const REORDER_SECTIONS = "reorder-sections"
const DIALOG_BODY = "dialog-body"
const HOW_TO = "how-to"
const LIST = "list"
const ENTRY = "entry"
const GRIP = "grip"
const NAME = "name"
const TITLE = "title"
const SAID = "said"
