import { For, Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { PlaceReferenceSource, type ReferenceTextKey } from "./PlaceReferenceSource"
import { spellReferencePageVocabulary } from "./SpellReferencePage.en"
import type {
  Reference,
  ReferenceEditDetail,
  ReferenceItem,
  ReferenceSection,
  ReferenceSource,
  ReferenceState,
  ReferenceTable,
  ReferenceWords
} from "./SpellReferencePage.types"

import referenceCSS from "./SpellReferencePage.css?inline"

/** The event a person's changed words are saved through:  `ReferenceEditDetail`. */
export const REFERENCE_EDIT_EVENT = "spell-reference-edit"

/****************
 * ### `SpellReferencePage`
 * The component behind `<spell-reference-page>`:  a reference page, made from its source each time it's shown
 * (epic `data` P53, Q98), with a person's words about each thing.
 * - Its source:  `src`, a place's description, read through `PlaceReferenceSource`;
 *   or one handed to its `source` property, which the language and app references will be.
 * - What it draws, each part a tag of its own, so a page can style it (`::part(section)` ...):
 *   - its line at the top:  the title, the facts, the counts
 *   - `<spell-reference-section>`:  each folded section, drawing what's in it only once it's first opened
 *   - `<spell-reference-item>`:  a field, a change
 *   - `<spell-reference-state>`:  how trying something went, as a label;  the ingest's marks too ("New since ...")
 * - A person's WORDS (`ReferenceWords`) are kept apart from what was found, by key:  an edit redraws them alone, and
 *   every fold stays as it was.
 * - With `editable`:  an option-click on something opens its words in a box (Q101);  ⌘-Enter or Save keeps them,
 *   Escape or Cancel doesn't.
 *   - Kept by the page around it, through `spell-reference-edit` (`ReferenceEditDetail`):  in the editor,
 *     `<PlaceReferencePage>` saves them into the place's Spell file.
 *   - Nothing saves them:  it says so, and keeps them as they were.
 * - Its labels are in the reader's language (its texts);  the words in the file's (Q103).
 * - NEVER imports the editor (`spell/app/app/solid`, `editor`):  it's an element any page can hold.
 * - SEE:  its App UI components page, `app/docs/spell-reference-page.html` (`/components/app/spell-reference-page.html`).
 ****************/
export class SpellReferencePage extends E.UIComponent<typeof spellReferencePageVocabulary> {
  @E.proto static vocabulary = spellReferencePageVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "spell-reference-page": referenceCSS },
    // a page of text and folds:  a click on its words must not jump to its first fold
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    // the page language's texts, before it says anything
    void appTexts.load()
  }

  ////////////////
  // ## Its source
  ////////////////

  /** What it draws:  `undefined` while it's read, `null` when there's nothing at `src`. */
  @E.state accessor source: ReferenceSource | null | undefined = undefined

  /** A person's words, by key, as its source's file has them now. */
  @E.state accessor words: Record<string, ReferenceWords> = {}

  /** Read `src` again whenever it changes. */
  @E.onChange("src")
  protected onSrcChanged(src: string | undefined) {
    if (!src) return
    this.source = undefined
    void PlaceReferenceSource.at(src, this.say).then((source) => {
      if (this.src !== src) return
      this.source = source ?? null
      this.words = source?.words() ?? {}
    })
  }

  /** A label, in the reader's language. */
  readonly say = (key: ReferenceTextKey, params?: Record<string, string>): string =>
    appTexts.inLanguage(() => this.translationForKey(key, params))

  ////////////////
  // ## Editing words
  ////////////////

  /** The key of the words open to be made clearer:  `undefined`, none. */
  @E.state accessor editing: string | undefined = undefined

  /** Why the last words weren't saved:  `undefined`, they were, or none were tried. */
  @E.state accessor saveError: string | undefined = undefined

  /** `:state(editing)`:  some words are open. */
  protected cssStates() {
    return { editing: this.editing !== undefined }
  }

  /** Can words be edited here:  `editable`, and a file to keep them in. */
  get canEdit(): boolean {
    return !!this.editable && !!this.source?.wordsFile
  }

  /** An option-click on something with words:  open them. */
  readonly onOptionClick = (key: string | undefined, event: MouseEvent): void => {
    if (!key || !event.altKey || !this.canEdit) return
    event.preventDefault()
    event.stopPropagation()
    this.saveError = undefined
    this.editing = key
  }

  /**
   * Keep `words` as the words of `key`:  the page around saves them (`spell-reference-edit`), then they show.
   * - Nobody saves them, or it fails:  they stay as they were, and it says why.
   * - NEVER throws.
   */
  async save(key: string, words: string): Promise<void> {
    const source = this.source
    if (!source?.wordsFile) return
    let saving: Promise<string> | undefined
    const detail: ReferenceEditDetail = {
      file: source.wordsFile,
      key,
      words,
      editIn: (text) => source.editIn(text, key, words),
      waitUntil: (promise) => void (saving = promise)
    }
    this.domElement.dispatchEvent(new CustomEvent(REFERENCE_EDIT_EVENT, { detail, bubbles: true, composed: true }))
    if (!saving) {
      this.saveError = this.say("notSaved")
      return
    }
    try {
      source.take(await saving)
      this.editing = undefined
      this.saveError = undefined
      this.words = source.words()
    } catch (error) {
      this.saveError = this.say("saveFailed", { error: error instanceof Error ? error.message : String(error) })
    }
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <article class="SpellReferencePage" part={this.partForName("base")}>
        <Show when={this.source !== undefined} fallback={<p class={["quiet", "loading"]}>{this.say("loading")}</p>}>
          <Show
            when={this.source}
            keyed
            fallback={<p class="quiet">{this.say("notFound", { path: this.src ?? "" })}</p>}
          >
            {(source) => this.drawReference(source.reference)}
          </Show>
        </Show>
      </article>
    )
  }

  /** A reference:  its line, its own words, its sections. */
  private drawReference(reference: Reference): JSX.Element {
    return (
      <>
        <header class="line" part={this.partForName("header")}>
          <h1>{reference.title}</h1>
          <p>
            <For each={reference.facts}>
              {(fact) =>
                fact.isCode ? <code title={fact.title}>{fact.text}</code> : <span title={fact.title}>{fact.text}</span>
              }
            </For>
          </p>
          <div class="counts">
            <For each={reference.counts}>
              {(count) => (
                <ui-label size="small" color={count.color} detail={String(count.count)} title={count.title}>
                  {count.label}
                </ui-label>
              )}
            </For>
          </div>
        </header>
        {this.drawWords(reference.wordsKey, reference.title, "lede")}
        <For each={reference.sections}>{(section) => this.drawSection(section, "3")}</For>
      </>
    )
  }

  /** One folded section, `<spell-reference-section>`:  what's in it drawn once it's first opened. */
  private drawSection(section: ReferenceSection, level: "3" | "4" | "5"): JSX.Element {
    const inner = level === "3" ? "4" : "5"
    return (
      <spell-reference-section part={this.partForName("section")} data-id={section.id}>
        <Fold
          label={section.label}
          level={level}
          hint={section.hint}
          badge={section.state ? undefined : section.badge}
          badgeLabel={section.state ? this.drawState(section.state, "badge") : undefined}
          isList={!!section.hint}
          title={this.canEdit && section.wordsKey ? this.say("editTip") : undefined}
          onClick={(event) => this.onOptionClick(section.wordsKey, event)}
        >
          {this.drawWords(section.wordsKey, section.label)}
          <For each={section.lines ?? []}>
            {(line) => (
              <p class="quiet" title={line.title}>
                {line.text}
              </p>
            )}
          </For>
          {section.empty && <p class="quiet">{section.empty}</p>}
          {section.table && this.drawTable(section.table)}
          {section.items?.length ? (
            <div class="items">
              <For each={section.items}>{(item) => this.drawItem(item)}</For>
            </div>
          ) : undefined}
          {section.notes?.length ? (
            <ul class="notes">
              <For each={section.notes}>{(note) => <li>{note}</li>}</For>
            </ul>
          ) : undefined}
          <For each={section.sections ?? []}>{(inside) => this.drawSection(inside, inner)}</For>
        </Fold>
      </spell-reference-section>
    )
  }

  /**
   * A section's small table, in `<ui-table>`:  a native table, so a cell can be in the code face.
   * - Never squeezed:  on a phone it scrolls sideways.
   */
  private drawTable(table: ReferenceTable): JSX.Element {
    const rows = table.rows.map((row) => row.map((text, at) => ({ text, isCode: !!table.codeColumns?.includes(at) })))
    return (
      <ui-table class="ReferenceTable" celled="" unstackable="" size="small">
        <table>
          <thead>
            <tr>
              <For each={table.columns}>{(column) => <th>{column}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For each={rows}>
              {(row) => (
                <tr>
                  <For each={row}>
                    {(cell) =>
                      cell.isCode ? (
                        <td class={["single", "line"]}>
                          <code>{cell.text}</code>
                        </td>
                      ) : (
                        <td>{cell.text}</td>
                      )
                    }
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </ui-table>
    )
  }

  /** One field or change, `<spell-reference-item>`:  its name, what it is, its state, its words. */
  private drawItem(item: ReferenceItem): JSX.Element {
    return (
      <spell-reference-item
        part={this.partForName("item")}
        data-id={item.id}
        title={this.canEdit && item.wordsKey ? this.say("editTip") : undefined}
        onClick={(event: MouseEvent) => this.onOptionClick(item.wordsKey, event)}
      >
        <div class="head">
          <code class="name">{item.name}</code>
          {item.code && <code class="address">{item.code}</code>}
          <span class="says">{item.says.join(" · ")}</span>
          {item.state && this.drawState(item.state)}
          <For each={item.wordsKey ? (this.words[item.wordsKey]?.marks ?? []) : []}>
            {(mark) => this.drawState(this.markState(mark))}
          </For>
        </div>
        {this.drawWords(item.wordsKey, item.name)}
      </spell-reference-item>
    )
  }

  /** A state, `<spell-reference-state>`:  a mini label, its words and colour, why in its tooltip. */
  private drawState(state: ReferenceState, slot?: "badge"): JSX.Element {
    return (
      <spell-reference-state part={this.partForName("state")} slot={slot}>
        <ui-label size="tiny" color={state.color} title={state.title}>
          {state.label}
        </ui-label>
      </spell-reference-state>
    )
  }

  /** One of the ingest's marks, as a state:  `New since Nov 18, 2026`. */
  private markState(mark: ReferenceWords["marks"][number]): ReferenceState {
    const date = mark.date
    return mark.is === "new"
      ? { label: this.say("markNew", { date }), color: "blue", title: this.say("markNewWhy", { date }) }
      : { label: this.say("markGone", { date }), color: "orange", title: this.say("markGoneWhy", { date }) }
  }

  /**
   * A person's words about something:  shown when there are some;  while they're being made clearer, the box.
   * - A section's and the page's own marks show here too;  an item's show on its line.
   */
  private drawWords(key: string | undefined, name: string, look?: "lede"): JSX.Element {
    if (!key) return undefined
    const words = () => this.words[key]
    return (
      <Show
        when={this.editing === key}
        fallback={
          <>
            <Show when={look === "lede" || !key.startsWith("field:") ? words()?.marks.length : 0}>
              <div class="marks">
                <For each={words()?.marks ?? []}>{(mark) => this.drawState(this.markState(mark))}</For>
              </div>
            </Show>
            <Show when={words()?.text}>
              {(text) => (
                <div
                  class={["words", look]}
                  part={this.partForName("words")}
                  title={this.canEdit ? this.say("editTip") : undefined}
                  onClick={(event) => this.onOptionClick(key, event)}
                >
                  {text()}
                </div>
              )}
            </Show>
          </>
        }
      >
        <WordsBox
          words={words()?.text ?? ""}
          label={this.say("editLabel", { name })}
          part={this.partForName("edit")}
          texts={{ save: this.say("save"), cancel: this.say("cancel"), keys: this.say("editKeys") }}
          error={this.saveError}
          onSave={(text) => void this.save(key, text)}
          onCancel={() => {
            this.editing = undefined
            this.saveError = undefined
          }}
        />
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface SpellReferencePage extends E.AttributeValues<typeof spellReferencePageVocabulary> {}

/****************
 * ### `<Fold>`
 * A section of a reference page:  a `<ui-section>`, folded to start with, what's in it drawn only once it's first
 * opened.
 * - So a place with hundreds of lists draws only their titles until one is opened.
 ****************/
function Fold(props: FoldProps) {
  const [opened, setOpened] = createSignal(false)
  return (
    <ui-section
      class={["Fold", { stated: !!props.badgeLabel, list: props.isList }]}
      collapsible=""
      open="false"
      level={props.level}
      label={props.label}
      hint={props.hint}
      badge={props.badge}
      title={props.title}
      onClick={props.onClick}
      ref={(section: HTMLElement) =>
        section.addEventListener("ui-opened", (event) => {
          if (event.target === event.currentTarget) setOpened(true)
        })
      }
    >
      {props.badgeLabel}
      <Show when={opened()}>{props.children}</Show>
    </ui-section>
  )
}

/** What `<Fold>` is handed. */
type FoldProps = {
  /** Its title. */
  label: string
  /** Its heading's level. */
  level: "3" | "4" | "5"
  /** A line under its title. */
  hint?: string
  /** A count after its title. */
  badge?: string
  /** A label after its title, in its badge's place. */
  badgeLabel?: JSX.Element
  /** A list's fold:  its hint, its address, in the code face. */
  isList?: boolean
  /** Its tooltip. */
  title?: string
  /** A click on it:  an option-click opens its words. */
  onClick?: (event: MouseEvent) => void
  /** What's in it:  drawn once it's first opened. */
  children: JSX.Element
}

/****************
 * ### `<WordsBox>`
 * The box a person makes some words clearer in:  a text box growing with its words, Save and Cancel under it.
 * - ⌘-Enter (Ctrl-Enter elsewhere) saves, Escape cancels, as the Type Explorer's description does.
 * - Its words are the box's own until saved:  it starts from the words as they were (which don't change while it's
 *   open), and what's typed is read from the box itself as it's saved, never through a signal a key press could read
 *   stale.
 ****************/
function WordsBox(props: WordsBoxProps) {
  let box: HTMLTextAreaElement | undefined
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.stopPropagation()
      props.onCancel()
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      props.onSave(box!.value)
    }
  }
  return (
    <div class="WordsBox" part={props.part} onClick={(event) => event.stopPropagation()}>
      <textarea
        aria-label={props.label}
        value={props.words}
        onKeyDown={onKeyDown}
        ref={(element: HTMLTextAreaElement) => {
          box = element
          E.afterSolidUpdate(() => element.focus())
        }}
      />
      <Show when={props.error}>{(error) => <p class={["quiet", "error"]}>{error()}</p>}</Show>
      <div class="actions">
        <ui-button size="small" color="primary" onClick={() => props.onSave(box!.value)}>
          {props.texts.save}
        </ui-button>
        <ui-button size="small" onClick={() => props.onCancel()}>
          {props.texts.cancel}
        </ui-button>
        <span class="quiet">{props.texts.keys}</span>
      </div>
    </div>
  )
}

/** What `<WordsBox>` is handed. */
type WordsBoxProps = {
  /** The words as they are. */
  words: string
  /** Its name, for a screen reader. */
  label: string
  /** Its `part`. */
  part: string
  /** Its buttons' words and its keys' line. */
  texts: { save: string; cancel: string; keys: string }
  /** Why the last save failed. */
  error?: string
  /** Keep `words`. */
  onSave: (words: string) => void
  /** Close it, keeping nothing. */
  onCancel: () => void
}
