import { For, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/element"
import { P } from "spell/parser/parser"
import { SourceMarks } from "spell/parser/parser/writers/SourceMarks"
import { editor, runtimeCore } from "spell/app/app/editor"
import { GROUP_ORDER, PropertyLayouts, PropertySchemas, type PropertyLayout } from "spell/ui/property"
import type { PropertyOrigin } from "spell/ui/components/ui-property-editor/UIPropertyEditor.types"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { ClassSchemas } from "spell/app/app/ui/ClassSchemas"
import { isEditable } from "spell/app/app/pages/editorHotkeys"
import {
  CodeCard,
  InspectorCard,
  WrittenCode,
  InspectorViews,
  NoCodeCard,
  TypeActionsCard,
  TypeEventsCard,
  TypeTestsCard,
  appParts
} from "./InspectorParts"
import { InspectorData } from "./InspectorData"
import { InspectorWrites, type NotWritten } from "./InspectorWrites"
import { on } from "./on"
import { rememberedSizes } from "./rememberedSizes"
import { ThingMembers, type MemberBand, type ThingMember } from "./ThingMembers"

import {
  sheetHeight,
  type InspectorCardId,
  INSPECTOR_PANELS,
  TYPE_PANES,
  Inspector,
  setSheetHeight,
  THING_ICON,
  type Inspected,
  wordsOfType,
  titleCase,
  isThing,
  notSaved,
  notSavedWords,
  SELF_CLOSING_TAG,
  type FieldSpec,
  itemsOf,
  type InspectorBand,
  POSITION_SUFFIX,
  SpellUIDocsButton,
  InspectAppButton
} from "./Inspector"

/****************
 * ### `<InspectorColumn>`
 * The Inspector, a tall column at the page's far right, while it's open (`Inspector.isOpen`):
 * its cards, one above the other, resizable (their sizes remembered, for each set of cards).
 *   - what's selected (`<PropertiesCard>`)
 *   - its code (`<CodeCard>`):  its events, then its actions, while one thing is selected;
 *     while nothing is, its bar alone, folded for good (`<NoCodeCard>`, T69)
 *   - All Cards' type's events, actions and tests, cards of their own (`TYPE_PANES`);
 *     a one of a kind's (the app) are its Code card, its Tests card only while it has tests (I186)
 *   - the app's views, things or templates (`<InspectorViews>`)
 * - Every card shows while the column does (epic `editor` T78:  no card hidden on its own);
 *   View › Inspector opens and closes the column, and the Inspector card's ✕ closes it (epic `editor` T83, I186).
 * - Each card folds to its header (`<InspectorCard>`):
 *   a folded card keeps its header's height, the others share the rest.
 * - A card is never taller than what it shows (I140):  the room it leaves goes to the others (`Inspector.css`).
 *   - except the last open card, which reaches the column's bottom, its body scrolling when it's long (I165):
 *     the column reads as one, with no empty page under it
 *   - whatever sizes were remembered:  a px the last open card kept becomes a share (`lastOpenCardGrows()`, I228)
 * - As the selection changes or a card folds, the cards glide to their new sizes (`CardGlide`, T69).
 * - Each is a card of its own, the page showing in the narrow seams between them, so they read as a set
 *   (Owen:  "separate panels ... we see background in the seams";  "less space between these panels").
 * - The cards' insides are the brand's Theme Creator inspector, in the Spell Brand theme whatever the editor
 *   wears:  that theme's tokens, re-declared on `.Inspector` (`UI.themes.scopedTokens()`, J63);
 *   their headers are the panes', in the editor's theme.
 * - The app's parts are walked here (`appParts()`), so what was selected comes back whichever cards show.
 * - On a phone, its pane is a sheet (`<InspectorPane>`):  a bar to drag or close it heads the cards
 *   (`<InspectorSheetBar>`), and Esc puts it away.
 ****************/
export function InspectorColumn(): JSX.Element {
  void loadBrandTokens()
  const rows = appParts()
  const shown = createMemo((): InspectorCardId[] => {
    const cards = INSPECTOR_PANELS.filter((panel) => panel !== "code" || hasCodeCard())
    const typePanes = TYPE_PANES.filter((pane) =>
      pane === "tests" ? Inspector.typeWithTests : Inspector.typeWithCards
    )
    // in the column's order:  what's selected, its Code card, its type's cards, then Views
    return [...cards.slice(0, -1), ...typePanes, cards.at(-1)!]
  })
  const layout = createMemo(() => cardsLayout(shown(), !Inspector.inspected))
  const cardSizes = rememberedSizes(layout)
  const glide = new CardGlide()
  onCleanup(() => glide.stop())
  // what's selected, or a card folded:  the sizes about to change glide
  createEffect(
    () => [layout(), Inspector.inspected],
    () => {
      glide.arm()
    }
  )
  // on a phone, Esc puts the sheet away while it's up
  createEffect(
    () => Inspector.isSheetUp,
    (isUp) => {
      if (!isUp) return
      const putAway = (event: KeyboardEvent) => {
        if (event.key === "Escape") Inspector.putSheetAway()
      }
      window.addEventListener("keydown", putAway)
      return () => window.removeEventListener("keydown", putAway)
    }
  )
  // Esc lets go of what's selected, when it isn't stopping a selection or putting the sheet away, nor typed in a field
  createEffect(
    () => !!Inspector.selected,
    (hasSelection) => {
      if (!hasSelection) return
      const letGo = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || event.defaultPrevented) return
        // read before this Esc's own writes land:  inspecting or a sheet up, this Esc is theirs
        if (Inspector.isInspecting || Inspector.isSheetUp || isEditable(event)) return
        Inspector.letGo()
      }
      window.addEventListener("keydown", letGo)
      return () => window.removeEventListener("keydown", letGo)
    }
  )
  return (
    <Show when={Inspector.isOpen}>
      <aside class="InspectorColumn" data-tour="inspector" aria-label={appTexts.text("inspector")}>
        <style>{brandTokens()}</style>
        <InspectorSheetBar />
        <ui-split-panel
          rows={lastOpenCardGrows(cardSizes.sizes(), layout().lastOpen)}
          resizable
          class="InspectorSplit"
          ref={[
            on("ui-changed", (event: Event) => {
              cardSizes.keep(event)
              if (event.target === event.currentTarget)
                foldSmallCards((event as CustomEvent).detail.panes, cardSizes.forget)
            }),
            (split: HTMLElement) => glide.watch(split)
          ]}
        >
          <div class="SplitPane">
            <PropertiesCard />
          </div>
          <Show when={hasCodeCard()}>
            <div class="SplitPane">
              <Show when={codeCardPart()} fallback={<NoCodeCard />}>
                {(part) => <CodeCard element={part().element} thing={part().thing} />}
              </Show>
            </div>
          </Show>
          <Show when={Inspector.typeWithCards} keyed>
            {(thing) => (
              <>
                <div class="SplitPane">
                  <TypeEventsCard thing={thing} />
                </div>
                <div class="SplitPane">
                  <TypeActionsCard thing={thing} />
                </div>
              </>
            )}
          </Show>
          <Show when={Inspector.typeWithTests} keyed>
            {(thing) => (
              <div class="SplitPane">
                <TypeTestsCard thing={thing} />
              </div>
            )}
          </Show>
          <div class="SplitPane">
            <InspectorViews rows={rows()} />
          </div>
        </ui-split-panel>
      </aside>
    </Show>
  )
}

/****************
 * ### `<InspectorPane>`
 * The Inspector's pane in the editor's page:  `<InspectorColumn>`, at the page's far right.
 * - On a phone, a SHEET over the page's lower part instead (`Inspector.css`;  Owen's pick, epic `debut` P17, Q6):
 *   - up while something's just been selected (`Inspector.isSheetUp`), the app its full size till then
 *   - as tall as it was last dragged (`Inspector.sheetHeight`), else its usual share of the screen
 * - The caller shows it while the Inspector's open (`Inspector.isOpen`).
 ****************/
export function InspectorPane(): JSX.Element {
  const height = () => (Inspector.sheetHeight ? `${Inspector.sheetHeight}px` : undefined)
  return (
    <div class={["InspectorPane", { up: Inspector.isSheetUp }]} style={{ "--InspectorPane-sheet-height": height() }}>
      <div class="SplitPane">
        <InspectorColumn />
      </div>
    </div>
  )
}

/****************
 * ### `<InspectorSheetBar>`
 * The top of the phone's sheet:  a handle, and Close at the right (`Inspector.putSheetAway()`).
 * - Drag it to make the sheet taller or shorter;  dragged under `SMALLEST_SHEET` px, the sheet goes away,
 *   keeping the height it had.
 * - Shown only on a phone (`Inspector.css`).
 ****************/
function InspectorSheetBar(): JSX.Element {
  /** While dragging:  the pointer's distance from the sheet's top, and the height the sheet had. */
  let drag: { grab: number; height: number } | undefined
  return (
    <div
      class="InspectorSheetBar"
      onPointerDown={startDrag}
      onPointerMove={dragTo}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span class="InspectorSheetHandle" title={appTexts.text("inspectorSheetHandle")} />
      <ui-icon
        name="close"
        link=""
        class="IconAction InspectorSheetClose"
        label={appTexts.text("inspectorSheetClose")}
        title={appTexts.text("inspectorSheetClose")}
        onClick={() => Inspector.putSheetAway()}
      />
    </div>
  )

  /** Start dragging the sheet by its bar (not by Close). */
  function startDrag(event: PointerEvent) {
    const bar = event.currentTarget as HTMLElement
    const sheet = bar.closest(".InspectorPane")
    if (!sheet || (event.target as Element).closest(".InspectorSheetClose")) return
    const box = sheet.getBoundingClientRect()
    drag = { grab: event.clientY - box.top, height: box.height }
    bar.setPointerCapture(event.pointerId)
  }

  /** The sheet's top follows the pointer, no taller than `TALLEST_SHEET` of the screen. */
  function dragTo(event: PointerEvent) {
    if (!drag) return
    setSheetHeight(Math.min(innerHeight * TALLEST_SHEET, innerHeight - (event.clientY - drag.grab)))
  }

  /** Remember the height dragged to;  too short, and the sheet goes away at the height it had. */
  function endDrag() {
    if (!drag) return
    const height = sheetHeight() ?? drag.height
    if (height < SMALLEST_SHEET) {
      Inspector.setSheetHeight(drag.height)
      Inspector.putSheetAway()
    } else Inspector.setSheetHeight(Math.round(height))
    drag = undefined
  }
}

/** The phone's sheet, dragged shorter than this (px), goes away. */
const SMALLEST_SHEET = 160
/** The most of the screen's height the phone's sheet takes. */
const TALLEST_SHEET = 0.9

/**
 * What the Code card shows:  the part selected, alone -- not several together, nor All Cards' type,
 * whose own cards say its code (`TYPE_PANES`);  `undefined`:  no Code card.
 * - A one of a kind (the app) has it, as a column does:  its type IS it (`Inspector.typeWithCards`, I186).
 * - `element`:  its events;  `thing`:  its actions, for a drawn thing (not a Spell UI element's layout).
 */
function codeCardPart(): { element: Element; thing?: object } | undefined {
  const part = Inspector.inspected
  if (!part?.element || part.together || Inspector.typeWithCards) return undefined
  return { element: part.element, thing: part.layout ? undefined : part.value }
}

/** Is the Code card in the column?  With what's selected (`codeCardPart()`), or folded for good while nothing is (T69). */
function hasCodeCard(): boolean {
  return !Inspector.inspected || !!codeCardPart()
}

/**
 * The column's sizes for the cards `shown`:  a folded card its header's height,
 * the others their usual shares of the rest.
 * - Nothing selected (`isEmpty`):  the top card only as tall as its tip, the others sharing the rest, so Views takes the
 *   column (Owen, 2026-11-14, I81).  Its own `id`, so a drag then is kept apart from the split you set while inspecting.
 *   - the top card needs no size of its own for that:  it's as tall as its tip, as any card is as tall as what it shows
 *   - the Code card its bar alone:  folded for good (`<NoCodeCard>`, T69)
 * - A share is the most a card takes:  one showing less is as tall as what it shows (`Inspector.css`, I140);
 *   the last open card takes what's left, to the column's bottom (I165).
 * - `id`:  the sizes remembered for this set of cards, as dragged (`rememberedSizes()`).
 * - `lastOpen`:  the last open card's place among `shown`, `-1` when every card is folded (`lastOpenCardGrows()`).
 */
function cardsLayout(
  shown: readonly InspectorCardId[],
  isEmpty: boolean
): { id: string; sizes: string; lastOpen: number } {
  const isFolded = (panel: InspectorCardId) => Inspector.isFolded(panel) || (isEmpty && panel === "code")
  const open = shown.filter((panel) => !isFolded(panel))
  const total = open.reduce((sum, panel) => sum + CARD_SHARES[panel], 0)
  const cards = shown.map((panel) => (isFolded(panel) ? `${panel}-folded` : panel)).join(",")
  return {
    id: `spellEditor-inspectorCards-${cards}${isEmpty ? "-nothingSelected" : ""}`,
    sizes: shown
      .map((panel) =>
        isFolded(panel) ? `${FOLDED_CARD_HEIGHT}px` : `${Math.round((CARD_SHARES[panel] / total) * 100)}%`
      )
      .join(","),
    lastOpen: shown.findLastIndex((panel) => !isFolded(panel))
  }
}

/**
 * The column's sizes (`sizes`, as remembered), with the last open card's (`lastOpen`) a share of the column,
 * so it always grows to the column's bottom (Owen, 2026-11-16, epic `editor` I228:
 * "Views pane got shorter -- should always pin to the bottom of the window"):
 * - a size remembered in px held that card at its height, and every other card at what it shows,
 *   with empty page under the column (a drag an older editor kept:  every card in px)
 * - so its px becomes a share of what's left (`*`);  the other cards keep their sizes, px too
 * - `Inspector.css` lets that share grow past what it shows (I165)
 */
function lastOpenCardGrows(sizes: string, lastOpen: number): string {
  const each = sizes.split(",")
  if (lastOpen < 0 || lastOpen >= each.length || each[lastOpen].trim().endsWith("%")) return sizes
  each[lastOpen] = SHARE_OF_THE_REST
  return each.join(",")
}

/** A `<ui-split-panel>` size that shares what the other panes leave (`lastOpenCardGrows()`). */
const SHARE_OF_THE_REST = "*"

/**
 * Fold each card dragged too small to show anything
 * (Owen, of the old Events card:  "should auto-collapse when it gets small"),
 * and forget the drag (`forgetSizes`), so unfolding it brings back its usual size.
 */
function foldSmallCards(panes: HTMLElement[], forgetSizes: () => void): void {
  for (const pane of panes) {
    const card = pane.querySelector<HTMLElement>(".InspectorCard")
    const panel = card?.dataset.panel as InspectorCardId | undefined
    if (!panel || Inspector.isFolded(panel) || card!.classList.contains("locked")) continue
    if (pane.getBoundingClientRect().height >= FOLDED_CARD_HEIGHT + SMALLEST_CARD_BODY) continue
    forgetSizes()
    Inspector.toggleFolded(panel)
  }
}

/** Each card's usual share of the column, among those open. */
const CARD_SHARES: Record<InspectorCardId, number> = {
  properties: 40,
  code: 25,
  events: 15,
  actions: 15,
  tests: 10,
  views: 30
}
/** A folded card's height:  its bar's (`<ui-panel appearance="pane">`). */
const FOLDED_CARD_HEIGHT = 40
/** The least a card's body may show, px:  dragged smaller, it folds. */
const SMALLEST_CARD_BODY = 32

/****************
 * ### `CardGlide`
 * The Inspector's cards GLIDE to their new heights, over `GLIDE_SECONDS`,
 * as the selection changes or a card folds (Owen, 2026-11-14, epic `editor` T69).
 * - Each card's last height is kept as the browser lays it out (a `ResizeObserver` on the panes).
 *   Once armed (`arm()`), the next change runs every pane from its old height to its new one, all together,
 *   so the column adds up on every frame;  what loads with it, just after, glides on from there.
 * - Not a CSS transition:  a card is as tall as what it shows (`max-height: max-content`, I140),
 *   and a change to what it shows changes no style, so there's nothing for a transition to run on.
 *   `interpolate-size` only helps a change between `auto` and a length, which these aren't.
 * - Only while armed:  a drag, the window resized, or code loading in a card just lays out.
 * - None for anyone who asks for less motion.
 ****************/
class CardGlide {
  /** Each pane's height, px, as last laid out. */
  private heights = new WeakMap<Element, number>()
  /** Until when a change glides, `performance.now()`;  `0`:  not armed. */
  private armedUntil = 0
  /** The glide running, if any:  the sizes it reports are its own frames, not new heights. */
  private running: Animation[] = []
  /** The column's split panel, and what watches its panes. */
  private split: HTMLElement | undefined
  private observer: ResizeObserver | undefined

  /** Watch `split`'s panes (its ref). */
  watch(split: HTMLElement): void {
    this.split = split
    this.observer ??= new ResizeObserver((entries) => this.resized(entries))
    this.observePanes()
  }

  /** The next change glides:  call it as the selection changes or a card folds. */
  arm(): void {
    this.observePanes()
    this.armedUntil = performance.now() + ARMED_WAIT_MS
  }

  /** Stop watching, and end any glide. */
  stop(): void {
    this.observer?.disconnect()
    for (const animation of this.running) animation.cancel()
  }

  /** The panes now:  the split panel's children. */
  private get panes(): HTMLElement[] {
    return this.split ? [...this.split.querySelectorAll<HTMLElement>(":scope > .SplitPane")] : []
  }

  /** Watch every pane, a card just shown too (watching one twice does nothing). */
  private observePanes() {
    for (const pane of this.panes) this.observer?.observe(pane)
  }

  /** The panes laid out again:  glide, if armed, from the heights kept to the new ones;  else keep them. */
  private resized(entries: ResizeObserverEntry[]) {
    if (this.running.length) return
    const panes = this.panes
    const known = panes.filter((pane) => this.heights.has(pane))
    const changed = entries.some((entry) => {
      const before = this.heights.get(entry.target)
      return before === undefined || Math.abs(before - heightOf(entry)) >= 1
    })
    if (changed && known.length && this.canGlide) {
      // a card just shown grows from nothing
      const glides = panes.map((pane) => ({ pane, from: this.heights.get(pane) ?? 0, to: pane.offsetHeight }))
      this.running = glides.map(({ pane, from, to }) =>
        pane.animate([pinnedAt(from), pinnedAt(to)], { duration: GLIDE_SECONDS * 1000, easing: "ease-out" })
      )
      // what it ends at is what shows;  a change made while it ran (code laid out) glides next, while still armed
      for (const { pane, to } of glides) this.heights.set(pane, to)
      this.armedUntil = performance.now() + ARMED_AFTER_MS
      void Promise.all(this.running.map((animation) => animation.finished))
        .catch(() => {}) // cancelled:  `stop()`
        .finally(() => (this.running = []))
      return
    }
    for (const entry of entries) this.heights.set(entry.target, heightOf(entry))
  }

  /** Armed, nothing being dragged, and motion's welcome. */
  private get canGlide(): boolean {
    return (
      performance.now() < this.armedUntil &&
      !this.split?.matches(":state(dragging)") &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  }
}

/** How long a card takes to glide to its new height (`CardGlide`). */
const GLIDE_SECONDS = 0.2
/**
 * How long a change may take to lay out once armed, ms, and still glide:
 * a part with much to show (Solitaire's properties and code) takes a second.
 */
const ARMED_WAIT_MS = 2000
/** How long after a glide starts what loads with the change (its code) glides too, ms. */
const ARMED_AFTER_MS = 400

/** A pane's height from its `ResizeObserver` entry, px. */
function heightOf(entry: ResizeObserverEntry): number {
  return entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height
}

/** A glide's frame:  a pane held at `height` px, whatever its share or its content. */
function pinnedAt(height: number): Keyframe {
  return { flexGrow: 0, flexShrink: 0, flexBasis: `${height}px`, minHeight: "0px", maxHeight: "none" }
}

/****************
 * ### `<PropertiesCard>`
 * What's selected:  in the card's header, what a change applies to, then a
 * `<ui-property-editor>` of every property it has, each in its vocabulary's place, set or not (I199)
 * (Owen:  "lose that [More]. Show all of the properties").
 * - Inspecting again:  Inspect app, in the card's header as in the top bar (`<InspectAppButton>`;
 *   Owen, 2026-11-15:  "Put the inspector crosshair back in this header", T78).
 * - Close, right of it:  hides the whole column (`Inspector.close()`, epic `editor` I186).
 *   View › Inspector, or the top bar's Inspect app, brings it back.
 * - Nothing selected:  the card is titled "Inspector", and says how to select.
 * - A thing whose type was written with its own `<property-editor>`:  that, in place of its bands
 *   (`<OwnEditor>`;  Owen:  "a property-editor for Card that I can edit").
 * - Its code is the Code card's, under it (`<CodeCard>`, epic `editor` I109).
 * - The header (Owen, 2026-11-16, epic `editor` I200:  "Don't need header like this, just \"Stock pile\" and
 *   \"All Stock Piles\""):
 *   - a thing:  only the choice of what a change applies to, `Stock pile | All Stock Piles` (`<ScopeSwitch>`)
 *   - the app, a one of a kind, or a Spell UI element:  only what it is, a file bar's tab, its icon (T95)
 *   - no trail of how it was reached (`Solitaire › Deck`):  another part is selected in the Views card,
 *     where every thing the app holds is a row (T96), or in the app
 ****************/
function PropertiesCard(): JSX.Element {
  // the same part, reached again:  its card isn't drawn again, so a field being typed in keeps the cursor
  // (a change to a thing kept in a place reworks what its trail goes through, e.g. a list that filters on it)
  const inspected = createMemo(() => Inspector.inspected, { equals: isSameInspected })
  return (
    <InspectorCard
      panel="properties"
      class="InspectorMain"
      label={appTexts.text("inspector")}
      bar={
        <Show when={inspected()} fallback={<span slot="title">{appTexts.text("inspector")}</span>}>
          {(part) => (
            <Show
              when={!hasScopeSwitch(part())}
              // a thing:  ONE segmented control, [Stock pile | All Stock Piles], and nothing more (I200)
              fallback={<ScopeSwitch part={part()} />}
            >
              {/* the app, or a Spell UI element:  what it is, a file bar's tab (T95) */}
              <ui-menu
                slot="title"
                appearance="segmented link header"
                class="InspectorTrail"
                ref={on("ui-choosing", (event) => event.preventDefault())}
              >
                <ui-item
                  class="InspectorPartTag"
                  icon={part().crumbs.length === 1 && part().element ? Inspector.iconFor(part().element!) : THING_ICON}
                  selected
                  title={
                    part().crumbs.length === 1 ? Inspector.writtenPlaceTitle(part().element) || undefined : undefined
                  }
                >
                  <span class="InspectorPartTagText">{part().label}</span>
                </ui-item>
              </ui-menu>
            </Show>
          )}
        </Show>
      }
      // Inspect app in the card's header, at its right (Owen, 2026-11-13, I60;  kept, 2026-11-15, T78),
      // then Close, which hides the column (I186):  the panel's ✕, as the file bar's is (T95, T145)
      actions={<InspectAppMenu slot="right" />}
      closeLabel={appTexts.text("inspectorClose")}
      onClose={() => Inspector.close()}
    >
      <Show
        when={inspected()}
        keyed
        fallback={
          <p class="InspectorTip">{appTexts.text(Inspector.isInspecting ? "inspectorInspecting" : "inspectorTip")}</p>
        }
      >
        {(part) => {
          // a change to data held as it's typed goes out as the part changes, or the card goes
          onCleanup(() => InspectorData.commitEdits())
          return (
            // compact:  an inspector's density, Spell UI's own (epic `debut` P31);  a changed value bold
            <ui-property-editor
              schema={part.schema}
              value={part.together?.map((each) => each.value) ?? part.value}
              origins={Inspector.originsOf(part)}
              unsaved={Inspector.unsavedTipOf(part)}
              // a value kept in a data place is held as it's typed, and sent on Enter or leaving the field
              writer={InspectorData.write}
              ref={[
                (form: HTMLElement) => {
                  form.addEventListener("focusout", () => InspectorData.commitEdits())
                  form.addEventListener("change", () => InspectorData.commitEdits())
                  form.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") InspectorData.commitEdits()
                  })
                },
                on<{ name?: string; value: unknown }>("ui-changed", (event) => {
                  // a field's own input says it changed too, with no name:  the field's own event follows
                  if (event.detail.name) Inspector.fieldWritten(part, event.detail.name, event.detail.value)
                }),
                on<{ name: string }>("ui-reset", (event) => Inspector.fieldReset(part, event.detail.name)),
                on<{ name: string }>("ui-show-code", (event) => Inspector.fieldCode(part, event.detail.name))
              ]}
              compact=""
              show-defaults=""
            >
              <NotSavedNote part={part} />
              <Show when={!part.layout && !part.together}>
                <DataSourceNote thing={part.value} names={Inspector.dataNamesOf(part.value)} />
              </Show>
              <Show
                when={
                  part.together &&
                  !part.layout &&
                  !(part.schema as { attributes: readonly unknown[] }).attributes.length
                }
              >
                <p class="InspectorTip">{appTexts.text("inspectorNothingShared")}</p>
              </Show>
              <Show when={part.layout}>
                {(layout) => (
                  <For each={sectionsFor(layout().fields, layout().hasText, layoutFileOf(part.element))}>
                    {(section) => (
                      <ui-property-group
                        label={appTexts.text(`inspectorGroup.${section.group}` as AppTextKey)}
                        collapsible=""
                        // `"false"` folds it;  a bare `false` is written as no attribute, which is open (the default)
                        open={Inspector.isGroupFolded(section.group) ? "false" : undefined}
                        ref={(group) => {
                          // its own folding only:  a select's menu inside it sends these too (I222)
                          on("ui-closing", (event) => {
                            if (event.target === group) Inspector.setGroupFolded(section.group, true)
                          })(group)
                          on("ui-opening", (event) => {
                            if (event.target === group) Inspector.setGroupFolded(section.group, false)
                          })(group)
                        }}
                      >
                        <Show when={section.hasText}>
                          <ui-property name="textContent" label={appTexts.text("inspectorText")} />
                        </Show>
                        <For each={section.rows}>
                          {(row) => (
                            <Show when={row.length > 1} fallback={<Field field={row[0]!} fields={section.fields} />}>
                              {/* a layout's row:  its fields side by side, each the same share (Spell UI's `:state(in-row)`) */}
                              <ui-fields>
                                <For each={row}>{(field) => <Field field={field} fields={row} />}</For>
                              </ui-fields>
                            </Show>
                          )}
                        </For>
                      </ui-property-group>
                    )}
                  </For>
                )}
              </Show>
              <Show when={!part.layout}>
                <Show
                  // All Cards edits the type's fields, never its own editor's (Q29)
                  when={!Inspector.typeEdited && Inspector.ownEditorOf(part.value)}
                  fallback={
                    <ThingBands
                      value={part.value}
                      schema={part.schema as ReturnType<typeof ClassSchemas.fromClass>}
                      isTogether={!!part.together}
                      isType={!!Inspector.typeEdited}
                    />
                  }
                >
                  {(markup) => <OwnEditor markup={markup()} />}
                </Show>
              </Show>
            </ui-property-editor>
          )
        }}
      </Show>
    </InspectorCard>
  )
}

// A change to the Inspector's views reloads the page, as its state's does (`Inspector.tsx`, epic `editor` I236)
import.meta.hot?.accept(() => location.reload())

/****************
 * ### `<ScopeSwitch>`
 * `Card | All Cards`:  the whole of the properties card's header for a thing,
 * so it costs no height (Q32;  epic `editor` I200).
 * - Says what a change to its fields applies to (`Inspector.scopeOf()`).
 * - Only for a thing:  a Spell UI element has no type of its own to change.
 * - Never for a one of a kind, the app among them (`InspectorWrites.isOneOfAKind()`):  its changes go to its type.
 * - Several things:  one switch for them all, the choice remembered for their type;  of several types, none.
 * - A plain pair of the row's own items, so it collapses with the row when the card is narrow.
 ****************/
function ScopeSwitch(props: { part: Inspected }): JSX.Element {
  const typeWords = () => wordsOfType(props.part.value)
  const scope = () => Inspector.scopeOf(props.part)
  const count = () => props.part.together?.length ?? 1
  // this one, by its type, as Owen wrote it:  `Stock pile`;  several, `These 3 Cards`
  const these = () =>
    count() > 1
      ? appTexts.text("inspectorScopeThese", { count: count(), Types: titleCase(P.pluralize(typeWords())) })
      : typeWords().charAt(0).toUpperCase() + typeWords().slice(1)
  const isWhole = () => props.part.crumbs.length === 1
  return (
    <Show when={hasScopeSwitch(props.part)}>
      <ui-item
        selected={scope() === "this"}
        class="InspectorScope"
        title={isWhole() ? Inspector.writtenPlaceTitle(props.part.element) || undefined : undefined}
        onClick={() => Inspector.setScope(props.part, "this")}
      >
        {these()}
      </ui-item>
      <ui-item
        selected={scope() === "all"}
        class="InspectorScope"
        onClick={() => Inspector.setScope(props.part, "all")}
      >
        {appTexts.text("inspectorScopeAll", { Types: titleCase(P.pluralize(typeWords())) })}
      </ui-item>
    </Show>
  )
}

/**
 * Does `part` get the This | All switch?  A thing, or several of one type:  a Spell UI element has no type to change.
 * - Never a one of a kind (`solitaire is an app`):  there's no "All Solitaires", only it (epic `editor` I183).
 */
function hasScopeSwitch(part: Inspected): boolean {
  const main = part.together?.[0]
  const isOneType = !main || part.together!.every((each) => each.value.constructor === main.value.constructor)
  return isThing(part.value) && isOneType && !InspectorWrites.isOneOfAKind(part.value)
}

/**
 * Is `next` the part `last` was, reached the same way:  the same thing, drawn by the same element, by the same trail,
 * with the same fields?
 */
function isSameInspected(last: Inspected | undefined, next: Inspected | undefined): boolean {
  if (last === next) return true
  if (!last || !next || last.together || next.together) return false
  return (
    last.value === next.value &&
    last.element === next.element &&
    last.layout === next.layout &&
    last.label === next.label &&
    // a live edit can change its type's fields:  then it's drawn again
    JSON.stringify(last.schema) === JSON.stringify(next.schema) &&
    last.crumbs.map((crumb) => crumb.label).join("\n") === next.crumbs.map((crumb) => crumb.label).join("\n")
  )
}

/****************
 * ### `<DataSourceNote>`
 * Says where a thing kept in a data place is kept, above its fields, and whether that's the real data (epic `editor` P26).
 * - Real data:  a warning colour, so nobody changes it unaware.
 * - Read only, or a sample in for it:  a calm line.
 * - Its switch puts a sample in for the place while designing, or the real place back (`InspectorData.showFrom()`).
 * - No row of its own for a thing kept in no place.
 ****************/
function DataSourceNote(props: { thing: object; names: string[] }): JSX.Element {
  const source = createMemo(() => InspectorData.sourceOf(props.thing, props.names))
  return (
    <Show when={source()}>
      {(shown) => (
        <div class={["InspectorDataSource", shown().kind.replace(" ", "-")]}>
          <ui-icon name="database" />
          <span class="InspectorDataSourceWords">{shown().words}</span>
          <ui-checkbox
            appearance="toggle"
            size="small"
            class="InspectorSampleSwitch"
            selected={shown().kind === "sample" ? "" : undefined}
            ref={on("ui-changed", (event: CustomEvent<{ selected: boolean }>) => {
              // its own change:  never a field's
              event.stopPropagation()
              void InspectorData.showFrom(shown().placeName, event.detail.selected ? "sample" : "real place")
            })}
          >
            {appTexts.text("inspectorDataUseSample")}
          </ui-checkbox>
        </div>
      )}
    </Show>
  )
}

/****************
 * ### `<NotSavedNote>`
 * Says, at the card's top, that the last change only changed the running app because the code works it out,
 * with a way to that code;  or that nothing of all of them can change.
 * - Any other change that can't be kept says so under its field (`Inspector.noteNotSaved()`, epic `editor` I244).
 * - No row of its own until then.
 ****************/
function NotSavedNote(props: { part: Inspected }): JSX.Element {
  // only for what's inspected now:  selecting something else lets go of it
  const why = (): NotWritten | undefined => {
    // a thing made in a loop says so on each field, its flask icon (`Inspector.unsavedTipOf()`)
    // All Cards edits the type's own fields (Q29):  no note that its values come from the code;
    // a one of a kind's type IS it, so a change it can't keep still says why (I183)
    const isOneOfAKind = InspectorWrites.isOneOfAKind(props.part.value)
    if (Inspector.typeEdited && !isOneOfAKind) return undefined
    // a one of a kind has no "each" to speak of
    const isAll = Inspector.scopeOf(props.part) === "all" && !isOneOfAKind
    if (isThing(props.part.value) && isAll && Inspector.isAllFromCode(props.part)) {
      return { reason: "allFromCode" }
    }
    // the rest are said under their field (`Inspector.noteNotSaved()`)
    const why = notSaved()?.part === props.part ? notSaved()?.why : undefined
    return why?.reason === "expression" ? why : undefined
  }
  const words = (reason: NotWritten["reason"]) => notSavedWords(reason, props.part)
  return (
    <Show when={why()}>
      {(note) => (
        <p class="InspectorTip InspectorNotSaved">
          {words(note().reason)}
          <Show when={note().reason === "expression"}>
            {" "}
            <a
              href="#"
              onClick={(event: MouseEvent) => {
                event.preventDefault()
                const home = note()
                if (home.reason === "expression") void Inspector.showCode(home)
              }}
            >
              {appTexts.text("inspectorShowCode")}
            </a>
          </Show>
        </p>
      )}
    </Show>
  )
}

/****************
 * ### `<OwnEditor>`
 * A type's own property editor, as its program wrote it (`<property-editor>`;  epic `debut` I86):
 * its `<ui-property-group>`s and `<ui-property>`s, inside the card's `<ui-property-editor>`, bound to the thing.
 * - The markup is the program's own, read from its source:  turned into elements as written,
 *   less any `<script>` and `on...` handler, which the Inspector never runs.
 * - An empty tag may close itself, `<ui-property name="rank" />`, as everywhere in spell.
 * - Drawn again when the markup changes.
 ****************/
function OwnEditor(props: { markup: string; places?: readonly string[] }): JSX.Element {
  const holder = document.createElement("div")
  holder.className = "InspectorOwnEditor"
  createEffect(
    () => props.markup,
    (markup) => {
      const template = document.createElement("template")
      // spell writes an empty tag `<ui-property name="rank" />`, as JSX does:  HTML would read it as left open
      template.innerHTML = markup.replace(SELF_CLOSING_TAG, "<$1$2></$1>")
      for (const script of template.content.querySelectorAll("script")) script.remove()
      for (const element of template.content.querySelectorAll("*")) {
        for (const attribute of [...element.attributes]) {
          if (/^on/i.test(attribute.name)) element.removeAttribute(attribute.name)
        }
      }
      // each element where it's written, in order:  a drop on one writes beside it (`<OwnEditorPage>`)
      const places = untrack(() => props.places)
      if (places) {
        template.content.querySelectorAll("*").forEach((element, at) => {
          if (places[at]) element.setAttribute(SourceMarks.PLACE_ATTRIBUTE, places[at])
        })
      }
      holder.replaceChildren(template.content)
    }
  )
  return holder
}

/****************
 * ### `<OwnEditorPage>`
 * The property editor a view's type was written with (`Card.editor.spell`), drawn for `thing`, which `element` draws,
 * as the Inspector draws it:  Design draws it large when it's picked, the view small beside it (`<DesignStage>`,
 * epic `editor` P37).
 * - A change in it is the Inspector's change, one step (`Inspector.fieldWritten()`).
 * - Its elements are marked where they're written (`Inspector.ownEditorPlacesOf()`):
 *   the palette's drops and clicks, moves and deletes write into its file.
 * - Drawn again as its file changes;  nothing when the type has no editor of its own.
 ****************/
export function OwnEditorPage(props: { element: Element; thing: object }): JSX.Element {
  const part = createMemo(() => Inspector.partFor(props.element, props.thing))
  const written = createMemo(() => {
    void editor.edits
    const thing = part()?.value
    return thing ? { markup: Inspector.ownEditorOf(thing), places: Inspector.ownEditorPlacesOf(thing) } : undefined
  })
  return (
    <Show when={part() && written()?.markup ? part() : undefined} keyed>
      {(shown) => (
        <ui-property-editor
          class="OwnEditorPage"
          schema={shown.schema}
          value={shown.value}
          ref={on<{ name?: string; value: unknown }>("ui-changed", (event) => {
            if (event.detail.name)
              Inspector.fieldWritten({ ...shown, crumbs: [] }, event.detail.name, event.detail.value)
          })}
        >
          <OwnEditor markup={written()!.markup} places={written()!.places} />
        </ui-property-editor>
      )}
    </Show>
  )
}

/**
 * A Spell UI element's fields in the Inspector's sections, as its tag's layout file lays them out
 * (`ui-action.editor.html`, `PropertyLayouts`;  epic `editor` T97):  its sections in order, each its rows.
 * - A field the file doesn't place still shows:  after its group's rows, or in a section of its own
 *   (`PropertyLayouts.place()`);  no file, the vocabulary's own order, a section per group.
 * - A field with no group goes in Appearance;  the element's own text (`hasText`) heads Content,
 *   a section of its own when the layout has none.
 * - A section with nothing in it isn't drawn.
 * - `layout` `null`:  its file is still loading (`layoutFileOf()`), so no section yet.
 */
function sectionsFor(
  fields: FieldSpec[],
  hasText: boolean,
  layout: PropertyLayout | null | undefined
): InspectorSection[] {
  // its layout file still loading:  nothing yet, so no field moves once it's in
  if (layout === null) return []
  const byName = new Map(fields.map((field) => [field.name, field]))
  const sections: InspectorSection[] = PropertyLayouts.place(layout, fields).map((placed) => {
    const rows = placed.rows.map((row) => row.map((name) => byName.get(name)!))
    return { group: placed.group ?? DEFAULT_GROUP, hasText: false, rows, fields: rows.flat() }
  })
  if (hasText) {
    const content = sections.find((section) => section.group === CONTENT_GROUP)
    if (content) content.hasText = true
    else {
      const at = sections.findIndex(
        (section) => GROUP_ORDER.indexOf(section.group) > GROUP_ORDER.indexOf(CONTENT_GROUP)
      )
      sections.splice(at < 0 ? sections.length : at, 0, { group: CONTENT_GROUP, hasText: true, rows: [], fields: [] })
    }
  }
  return sections
}

/** One of the Inspector's sections:  a group, its rows of fields (`fields`, every one), and whether the element's text heads it. */
type InspectorSection = { group: E.AttributeGroup; hasText: boolean; rows: FieldSpec[][]; fields: FieldSpec[] }

/** A field with no group is in this one;  the element's text heads that one. */
const DEFAULT_GROUP: E.AttributeGroup = "appearance"
const CONTENT_GROUP: E.AttributeGroup = "content"

/** Bumped as a tag's layout file comes in:  `layoutFileOf()` reads it, so the card lays out again. */
const [layoutFilesIn, setLayoutFilesIn] = createSignal(0)

/**
 * The layout file of `element`'s tag (its vocabulary's, so a translated element finds the English one), once it's in;
 * `undefined` for none;  `null` while it loads, the first time (then the card lays out again).
 * - SIDE EFFECT:  starts loading it, the first time.
 */
function layoutFileOf(element: Element | undefined): PropertyLayout | null | undefined {
  if (!element) return undefined
  void layoutFilesIn()
  const tag = (element as E.DOMElement).component?.vocabulary?.tag ?? element.localName
  const loaded = PropertyLayouts.loaded(tag)
  if (loaded !== undefined) return loaded ?? undefined
  if (!PropertyLayouts.tags.includes(tag)) return undefined
  void PropertyLayouts.load(tag)
    .then(() => setLayoutFilesIn((count) => count + 1))
    .catch((error) => console.error(error))
  return null
}

/****************
 * ### `<ThingBands>`
 * A thing's properties as the properties card lists them (epic `debut` P26):
 * in folding bands named by its file's groups and headings (`rank`, `suit`, `drawing`), in the file's order
 * (`ThingMembers.bandsOf()`);  then, for a list, how many items it has.
 * - Its own type's members under no group first, in a band with no title:  the card's header already names the type
 *   (Owen, 2026-11-16, epic `editor` I200:  "Solitaire blue header is not necessary").
 *   An inherited type's band (`pile`) keeps its title:  it says where those come from.
 * - A stored property:  a field to change it.
 * - NOT a stored property that holds another thing, nor a list's items:  they're its children, each a row of
 *   the Views card under it, drawn or not, to select it there (Owen, 2026-11-16, epic `editor` I205:
 *   "Ditch children in this panel -- we have the bottom pane to select them").
 * - A computed one (Value, Color, Picture, is a face card):
 *   its value, read only, live as the program changes it (`<ComputedField>`).
 * - Each by its words in the program (`is a face card`), when the words file has them.
 * - The built-in `id` last, in a band that starts folded.
 ****************/
function ThingBands(props: {
  value: object
  schema: ReturnType<typeof ClassSchemas.fromClass>
  /** Several are selected, `value` the last:  only the fields they share, no computed values or items. */
  isTogether: boolean
  /**
   * Its TYPE's fields (All Cards, Q29):  a field with a `one-of` lists its values as pills to change
   * (`<TypeChoicesField>`);  a worked-out one shows the Spell that works it out (`<TypeSpellField>`).
   */
  isType?: boolean
}): JSX.Element {
  const holds = (name: string) => (props.value as Record<string, unknown>)[name]
  const items = () => (props.isTogether ? [] : (itemsOf(props.value)?.filter(isThing) ?? []))
  const bands = createMemo(
    () => {
      const things = runtimeCore()?.things
      const properties = things && isThing(props.value) ? things.propertiesOf(props.value as never) : []
      const stored = props.schema.attributes.map((attribute) => attribute.name)
      // a stored property holding a thing is a child:  the Views card's (I205)
      const isChild = (member: ThingMember) => member.kind === "stored" && isThing(holds(member.name))
      const all = ThingMembers.bandsOf(props.value, { stored, properties, words: editor.programWords })
      return all
        .map((band) => ({
          ...band,
          members: band.members.filter(
            (member) =>
              !isChild(member) && (!props.isTogether || (member.kind === "stored" && stored.includes(member.name)))
          )
        }))
        .filter((band) => band.members.length)
    },
    // the same bands, the same rows:  a change of keys alone doesn't draw them again
    { equals: (a, b) => bandsKey(a) === bandsKey(b) }
  )
  return (
    <>
      <For each={bands()}>
        {(band) => {
          const fold: InspectorBand = band.isBuiltIn ? `thing:open:${band.key}` : `thing:${band.key}`
          const isFolded = () => Inspector.isGroupFolded(fold) !== !!band.isBuiltIn
          const setFolded = (folded: boolean) => Inspector.setGroupFolded(fold, folded !== !!band.isBuiltIn)
          return (
            <ui-property-group
              // its own type's members:  no title, as the header names the type (I200)
              class={{ InspectorUntitled: !!band.isOwnType }}
              label={band.isBuiltIn ? appTexts.text("inspectorBuiltIn") : band.isOwnType ? undefined : band.title}
              description={band.isOwnType ? undefined : band.description}
              collapsible={band.isOwnType ? undefined : ""}
              open={isFolded() && !band.isOwnType ? "false" : undefined}
              ref={(group) => {
                // its own folding only:  a select's menu inside it sends these too (I222)
                on("ui-closing", (event) => event.target === group && setFolded(true))(group)
                on("ui-opening", (event) => event.target === group && setFolded(false))(group)
              }}
            >
              <For each={band.members}>
                {(member) => (
                  <Show
                    when={!props.isType || !Inspector.propertyWritten(props.value, member.name)}
                    fallback={<TypeField thing={props.value} member={member} />}
                  >
                    <Show
                      when={member.kind === "stored"}
                      fallback={<ComputedField thing={props.value} member={member} />}
                    >
                      <ui-property name={member.name} label={memberLabel(member)} />
                    </Show>
                  </Show>
                )}
              </For>
            </ui-property-group>
          )
        }}
      </For>
      {/* its items are its children, in the Views tree under it, drawn or not (I205):  only how many here */}
      <Show when={items().length}>
        <div class="InspectorItems">
          <span class="InspectorItemsLabel">{appTexts.text("inspectorItems", { count: items().length })}</span>
        </div>
      </Show>
    </>
  )
}

/** What a thing's bands are, as text:  each band's key and its members' names, to tell a real change. */
function bandsKey(bands: MemberBand[]): string {
  return bands.map((band) => `${band.key}=${band.members.map((member) => member.name).join(",")}`).join(";")
}

/** A member's label:  its words in the program, first letter up (`Is a face card`), else from its name. */
function memberLabel(member: ThingMember): string {
  const words = member.words ?? PropertySchemas.labelOf({ name: member.name, kind: "string", description: "" })
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/****************
 * ### `<TypeField>`
 * One of a type's fields, as All Cards edits it (epic `editor` P23, Q29;  `Inspector.propertyWritten()`):
 * - worked out by Spell (`its "name" is its rank && "of" && its suit`):  that Spell, in the code editor on its
 *   lines of the file, to read and change there (Owen:  "For derived fields, you'd show the spell to calculate it")
 * - else a `one-of`:  its values as pills, to add, take away or type (Owen:  "rank should be a type-in field listing
 *   the values as pills"), written back into its `one-of` as one step (`Inspector.writeOneOf()`)
 * - else its field as This shows it:  a stored value, or a computed one's value
 ****************/
function TypeField(props: { thing: object; member: ThingMember }): JSX.Element {
  const written = () => Inspector.propertyWritten(props.thing, props.member.name)
  return (
    <Show
      when={written()?.spell}
      fallback={
        <Show
          when={written()?.oneOf}
          fallback={
            <Show
              when={props.member.kind === "stored"}
              fallback={<ComputedField thing={props.thing} member={props.member} />}
            >
              <ui-property name={props.member.name} label={memberLabel(props.member)} />
            </Show>
          }
        >
          {(oneOf) => <TypeChoicesField thing={props.thing} member={props.member} values={oneOf().values} />}
        </Show>
      }
    >
      {(spell) => (
        <ui-property name={props.member.name} label={memberLabel(props.member)} class="InspectorTypeSpell">
          <WrittenCode place={spell()} code="" />
        </ui-property>
      )}
    </Show>
  )
}

/** A type's field's values as pills, `ace`, `2 ... 10`, `jack`:  to add, take away or type, written into its `one-of`. */
function TypeChoicesField(props: { thing: object; member: ThingMember; values: string[] }): JSX.Element {
  /** its dropdown, set by its ref */
  let dropdown: (HTMLElement & { value?: unknown }) | undefined
  // a list, as the property:  the attribute splits at spaces too, and `2 ... 10` is one value;
  // made here, not in the ref:  a ref callback has no owner, so its effect would never be disposed (I338)
  createEffect(
    () => props.values,
    (values) =>
      queueMicrotask(() => {
        if (dropdown) dropdown.value = [...values]
      })
  )
  return (
    <ui-property name={props.member.name} label={memberLabel(props.member)} class="InspectorTypeChoices">
      <ui-dropdown
        multiple=""
        search=""
        allow-additions=""
        size="small"
        ref={(element: HTMLElement & { value?: unknown }) => {
          dropdown = element
          on<{ value: unknown }>("ui-changed", (event) => {
            // its own write:  never the field's, which would set the running thing's value
            event.stopPropagation()
            const { value } = event.detail
            const values = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(",") : []
            Inspector.writeOneOf(props.thing, props.member.name, values.map((each) => each.trim()).filter(Boolean))
          })(dropdown)
        }}
      >
        <For each={props.values}>{(value) => <ui-item value={value}>{value}</ui-item>}</For>
      </ui-dropdown>
    </ui-property>
  )
}

/****************
 * ### `<ComputedField>`
 * A thing's computed property (`value`, `color`, `picture`):  its value, read only, as text with no box,
 * so it doesn't look like a field to type in.
 * - Read live:  it follows what the getter reads, as a stored property's field does.
 * - A yes or no is a read-only toggle, dimmed (Spell UI's disabled look), so it doesn't look like one to press
 *   (Owen, 2026-11-16, epic `editor` I224:  "These should be read-only since they are getters");
 *   a thing, a link to it (`<ThingLink>`);  a list, its count.
 * - Short ones (a yes or no, a number, a few words) take half a row, two to a row:  a yes or no on its label's line,
 *   as a stored one is (`as="toggle"`);  a longer value, a whole row (I224, I225:  "These should go 2 per line").
 * - No "won't be saved" icon:  nothing here can be changed (Spell UI leaves it off a read-only property).
 * - One that throws shows its error, dimmed:  reading it ran the program's code.
 ****************/
function ComputedField(props: { thing: object; member: ThingMember }): JSX.Element {
  // worked out from what a data place holds:  its link says which (epic `editor` P26)
  const dataOrigin = createMemo(() => {
    const origin = InspectorData.originOf(props.thing, props.member.name)
    return origin && InspectorData.propertyOrigin(origin)
  })
  const read = createMemo((): { value?: unknown; error?: unknown } => {
    try {
      return { value: (props.thing as Record<string, unknown>)[props.member.name] }
    } catch (error) {
      return { error }
    }
  })
  return (
    <Show
      when={isThing(read().value)}
      fallback={
        <ui-property
          name={props.member.name}
          label={memberLabel(props.member)}
          readonly=""
          as={typeof read().value === "boolean" ? "toggle" : undefined}
          width={isShortComputed(read()) ? HALF_ROW : undefined}
          class={["InspectorComputed", { failed: "error" in read() }]}
        >
          <Show
            when={typeof read().value === "boolean"}
            fallback={<ui-input size="small" appearance="transparent" readonly="" value={computedText(read())} />}
          >
            <ui-checkbox
              appearance="toggle"
              padding="none"
              readonly=""
              disabled=""
              selected={read().value ? "" : undefined}
            />
          </Show>
        </ui-property>
      }
    >
      <ThingLink
        label={memberLabel(props.member)}
        thing={read().value as object}
        step={props.member.name}
        origin={dataOrigin()}
      />
    </Show>
  )
}

/**
 * A computed value short enough for half a row:  a yes or no, a number,
 * or text of 20 letters or fewer (`queen of diamonds`;  Owen, J191 C4:  "20 letters").
 */
function isShortComputed(read: { value?: unknown; error?: unknown }): boolean {
  if ("error" in read) return false
  const { value } = read
  if (typeof value === "boolean" || typeof value === "number") return true
  return typeof value === "string" && value.length <= SHORT_COMPUTED_LENGTH
}

/** The most letters a computed text value has to sit in half a row (`isShortComputed()`). */
const SHORT_COMPUTED_LENGTH = 20

/** What a computed property's field shows:  its value as text, a list's count, or its error's message. */
function computedText(read: { value?: unknown; error?: unknown }): string {
  if ("error" in read) return read.error instanceof Error ? read.error.message : String(read.error)
  const { value } = read
  if (value === undefined || value === null) return ""
  if (Array.isArray(value)) return appTexts.text("inspectorItems", { count: value.length })
  const items = typeof value === "object" ? itemsOf(value) : undefined
  if (items) return appTexts.text("inspectorItems", { count: items.length })
  if (typeof value === "object" || typeof value === "function") return JSON.stringify(value) ?? ""
  return String(value as string | number | boolean | bigint | symbol)
}

/** `text`'s letters and digits alone, lower case:  `Stock Pile "stock"` holds `Stock`. */
function lettersOf(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
}

/****************
 * ### `<ThingLink>`
 * A link to a thing a property (or a list) holds:  its title, then `›`;  a click inspects it.
 * - `label`:  the property's label, above it, as a field's;  none for a list's item.
 ****************/
function ThingLink(props: {
  thing: object
  step: string
  label?: string
  /** Where it comes from, when a data place holds it or it's worked out from one:  its mark, after the chip. */
  origin?: PropertyOrigin
}): JSX.Element {
  // its chip already names it (`Stock Pile "stock"` for Stock):  the label isn't said twice (Owen:  "Duplicated")
  const label = () => {
    const title = Inspector.thingLabel(props.thing, props.step)
    return props.label && !lettersOf(title).includes(lettersOf(props.label)) ? props.label : undefined
  }
  return (
    <div class={["InspectorThingLink", { item: !props.label }]}>
      <Show when={label()}>{(shown) => <span class="InspectorThingLabel">{shown()}</span>}</Show>
      <ThingChip label={Inspector.thingLabel(props.thing, props.step)} onClick={() => Inspector.inspect(props.step)} />
      <Show when={props.origin?.mark}>
        {(mark) => (
          <span class="InspectorDataMark" title={props.origin?.from}>
            {mark()}
          </span>
        )}
      </Show>
    </div>
  )
}

/****************
 * ### `<ThingChip>`
 * A thing made as the program runs, as a pill:  `Card "king of diamonds" ›`, the Inspector's link to it (`<ThingLink>`).
 * - Not in the Views tree:  its rows say a thing's name as plain words (Owen, 2026-11-16, epic `editor` I209:
 *   "Lose pill border around these items";  a pill there since "Full pill for items that are allocated objects").
 ****************/
function ThingChip(props: { label: string; onClick?: () => void }): JSX.Element {
  return (
    <ui-button
      appearance="basic"
      size="small"
      icon="angle right"
      icon-position="right"
      class="InspectorThingButton"
      onClick={props.onClick}
    >
      {props.label}
    </ui-button>
  )
}

/****************
 * ### `<Field>`
 * One of a Spell UI element's attributes, as the Inspector lays it out.
 * - Its editor is `compact`, so Spell UI lays it out:  a short choice (a size, a colour) half a row,
 *   a colour's choices with chips, a yes or no on one line.
 * - Only an attribute and the one that places it share a row by the Inspector's say:  `icon` and `icon-position`.
 * - Its info icon's tip is the attribute's description, shown after a 2s hover (`chrome.css`).
 ****************/
function Field(props: { field: FieldSpec; fields: FieldSpec[] }): JSX.Element {
  return (
    <ui-property
      name={props.field.name}
      width={isPositionPair(props.field, props.fields) ? HALF_ROW : undefined}
      description={tipFor(props.field)}
    />
  )
}

/** A field's info tip:  its vocabulary's description, its `code` marks dropped (the tip is plain text). */
function tipFor(field: FieldSpec): string | undefined {
  return field.description?.replace(/`/g, "")
}

/** It places the field beside it, or the one beside it places it:  `icon` and `icon-position`. */
function isPositionPair(field: FieldSpec, fields: FieldSpec[]): boolean {
  const index = fields.indexOf(field)
  const [before, after] = [fields[index - 1], fields[index + 1]]
  return (
    (!!before && field.name === `${before.name}${POSITION_SUFFIX}`) ||
    (!!after && after.name === `${field.name}${POSITION_SUFFIX}`)
  )
}

/** A field's `width` for half a row. */
const HALF_ROW = "1/2"

/****************
 * ### `<InspectAppMenu>`
 * The Inspector card's header buttons, at its right:  the file bar's look, a header's segmented menu, each an icon
 * in a soft round (`appearance="circular"`), as the top bar's are (epic `editor` T95:
 * "Make these tabs look like the ones in the file menu").
 * - Spell UI docs, while a Spell UI element is selected (`<SpellUIDocsButton>`)
 * - Inspect app (`<InspectAppButton>`)
 * - The card's Close is after it, the panel's own ✕, as the file bar's (`<ui-panel closable>`)
 * - Pressed, never chosen:  the menu's choosing is turned away.
 * - `slot`:  its place in the card's bar, `right`.
 ****************/
function InspectAppMenu(props: { slot: string }): JSX.Element {
  return (
    <ui-menu
      slot={props.slot}
      appearance="segmented link header"
      class="InspectAppMenu"
      ref={on("ui-choosing", (event) => event.preventDefault())}
    >
      <SpellUIDocsButton />
      <InspectAppButton />
    </ui-menu>
  )
}

/** The Spell Brand theme's tokens on `.Inspector`, once loaded. */
const [brandTokens, setBrandTokens] = createSignal("")

/**
 * Load the Spell Brand theme's tokens, scoped to the column, once.
 * - NEVER throws:  without them the column wears the editor's theme, and says so on the console.
 */
async function loadBrandTokens(): Promise<void> {
  // the flag, never the tokens:  this runs in the column's body, where a signal read isn't followed (I88)
  if (loadingBrandTokens) return
  loadingBrandTokens = true
  try {
    const { UI } = await import("spell/ui")
    await UI.load()
    setBrandTokens(await UI.themes.scopedTokens(BRAND_THEME, ".Inspector"))
  } catch (error) {
    console.error("InspectorColumn:  couldn't load the Spell theme's tokens", error)
  }
}

/** The theme the Inspector wears (Owen:  "in the brand's theme"). */
const BRAND_THEME = "spell"
/** A load of the brand's tokens has started. */

let loadingBrandTokens = false
