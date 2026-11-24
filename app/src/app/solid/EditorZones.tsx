import { For, Show, createMemo, onCleanup, untrack } from "solid-js"
import { render, type JSX } from "@solidjs/web"

import { kebabCase, schemaOf, type Schema } from "spell/util"
import { editor, runtimeCore } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import type { EditorMemberName } from "spell/app/app/layout/editorNames"
import { ErrorBoundary } from "./ErrorBoundary"

import "./EditorZones.css"

/****************
 * ### `<EditorZones>`
 * The app pane of the editor's own Spell (`@spell/editor/spell-editor`, epic `editor` T63):
 * each view its app holds, drawn in a zone of its own, as the code is typed.
 * - Not a second editor in a frame (P22's draft editor):  that loaded a whole editor again on every keystroke,
 *   and locked the page up (I122).
 * - Drawn by the program the app pane runs, on the programs' copy of the runtime (`runtimeCore()`), never the copy
 *   the editor runs on:  run as a layout, its app never starts itself (`editor.isEditorPiece()`), and a live edit
 *   draws each zone again where it is.
 * - The zones are the app's views, in the order the app lists them, found as it runs:  a view added shows by itself.
 * - Each view drawn in place, as the editor draws it (`EditorSpell.drawInPlace()`), so the editor's own sheets reach
 *   it and a menu looks as it does in the bar;  a view with a `<css>` of its own draws as its element, as the file
 *   tab bar does in the editor.
 * - What the editor draws in a view's place for it (a pane, the Spell menu's projects) is a stand-in:  its name in a
 *   tag pill, `⟨spell menu⟩` (T141).
 * - Every row a menu can show shows, whatever the editor would hide or grey here (`showEveryRow()`, T142).
 * - A modal (About Spell, Versions) shows inline, its box in the zone, never over the page (`InlineDialog`, T143).
 * - A zone whose drawing throws shows its error, and the others go on drawing.
 ****************/
export function EditorZones(): JSX.Element {
  // each run, as one afresh makes the app's views anew (`editor.programRuns`)
  const zones = createMemo(() => {
    void editor.programRuns
    return zonesOf(runtimeCore())
  })
  return (
    <div class="EditorZones">
      <Show when={zones().length} fallback={<p class="EditorZonesWaiting">{appTexts.text("editorZonesWaiting")}</p>}>
        <For each={zones()} keyed={(zone) => zone.view}>
          {(zone) => <EditorZone zone={zone()} />}
        </For>
      </Show>
    </div>
  )
}

/** One zone:  its view's name, then its drawing, or a Show button for a modal. */
function EditorZone(props: { zone: Zone }): JSX.Element {
  const { view, name, core } = untrack(() => props.zone)
  standInsFor(view, core)
  showEveryRow(core)
  const isModal = drawsAModal(view)
  return (
    // its view's name (`editor bar`):  a test finds the zone by it
    <section class="EditorZone" data-zone={name}>
      <header class="EditorZoneTitle">{name}</header>
      <div class="EditorZoneBody">
        <ErrorBoundary fallback={(error) => <p class="EditorZoneError">{error.message}</p>}>
          {isModal ? (
            <InlineDialog view={view} core={core} />
          ) : hasOwnCss(view) ? (
            (core.drawThing(view) as JSX.Element)
          ) : (
            (core.drawOwn(view) as JSX.Element)
          )}
        </ErrorBoundary>
      </div>
    </section>
  )
}

/** The running program's core, as far as the zones use it. */
type ZoneCore = NonNullable<ReturnType<typeof runtimeCore>>

/** One view of the app, in its zone. */
type Zone = {
  /** the view itself, a thing that draws */
  view: object
  /** its name in words:  `editor bar` */
  name: string
  /** the core that runs it */
  core: ZoneCore
}

/**
 * The views the running app holds, in its order:  none until a program runs.
 * - Reads the registry's `topLevel()`, so it's worked out again as the program's things come and go.
 */
function zonesOf(core: ZoneCore | undefined): Zone[] {
  if (!core) return []
  return core.things
    .topLevel()
    .flatMap(({ thing }) =>
      membersOf(thing).flatMap(([key, member]) =>
        isView(member) && !isEditorPart(member, core) ? [{ view: member, name: wordsOf(key), core }] : []
      )
    )
}

/**
 * `thing`'s members as its type declares them, in its order, with what each holds now:  untracked, so a menu's
 * state changing doesn't work the zones out again.
 * - A thing's members are its type's getters (its cells), so they're read off its class, not the object.
 * - One that throws as it's read is left out.
 */
function membersOf(thing: object): [string, unknown][] {
  const type = Object.getPrototypeOf(thing) as object
  const names = Object.getOwnPropertyNames(type).filter((name) => Object.getOwnPropertyDescriptor(type, name)?.get)
  return untrack(() =>
    names.flatMap((name): [string, unknown][] => {
      try {
        return [[name, (thing as Record<string, unknown>)[name]]]
      } catch {
        return []
      }
    })
  )
}

/** A member's name as the Spell writes it:  `editorBar` => `editor bar`. */
function wordsOf(key: string): string {
  return kebabCase(key).replaceAll("-", " ")
}

/**
 * Does `view`'s type have a `<css>` of its own (`static css`, `spell/parser/core`'s `css`)?
 * - Its sheet reaches only its element's shadow root:  so it draws as its element, the page's sheets left outside.
 */
function hasOwnCss(view: object): boolean {
  return Object.hasOwn(view.constructor, "css")
}

/** Does `member` draw itself, a view?  A thing with a `draw()` of its own type's. */
function isView(member: unknown): member is object {
  return typeof member === "object" && member !== null && typeof (member as { draw?: unknown }).draw === "function"
}

/** Is `member` one of the Spell's editor parts (`an "editor part" is a thing`):  what the editor draws itself? */
function isEditorPart(member: unknown, core: ZoneCore): member is object {
  const EditorPart = programExports(core).EditorPart as (abstract new () => object) | undefined
  return !!EditorPart && member instanceof EditorPart
}

/** What the running program exports:  its classes and top-level things. */
function programExports(core: ZoneCore): Record<string, unknown> {
  return (core.things as unknown as { exports: Record<string, unknown> }).exports ?? {}
}

/**
 * Give each place for an editor part in `view` a stand-in naming it:  in the editor, the editor draws its own there
 * (`EditorSpell.parts()`), and run as a program they're empty.
 * - Which members are editor parts:  what `view`'s type declares them (`schemaOf()`).
 * - Each empty one gets a plain editor part, which draws as a stand-in (`drawStandIns()`).
 * - SIDE EFFECT:  sets each empty one, once;  a live edit carries them over.
 */
function standInsFor(view: object, core: ZoneCore): void {
  const EditorPart = programExports(core).EditorPart as (new () => object) | undefined
  if (!EditorPart) return
  drawStandIns(EditorPart, core)
  const fields = view as Record<string, unknown>
  for (const [key, member] of membersOf(view)) {
    if (member === undefined && EDITOR_PART_TYPE.test(declaredTypeOf(view, key) ?? "")) fields[key] = new EditorPart()
  }
}

/**
 * Make the program's editor parts draw as stand-ins, each naming the place it's in in a tag pill:  `⟨spell menu⟩`,
 * as the code pane draws a tag (Owen, T141).
 * - On the type, not each part:  a live edit carries a part over as a new one, which keeps no `draw` of its own.
 * - SIDE EFFECT:  replaces `EditorPart.prototype.draw`, once per compile of the Spell (a new class each time).
 */
function drawStandIns(EditorPart: new () => object, core: ZoneCore): void {
  if (STANDING_IN.has(EditorPart)) return
  STANDING_IN.add(EditorPart)
  Object.defineProperty(EditorPart.prototype, "draw", {
    configurable: true,
    writable: true,
    value: function drawStandIn(this: object) {
      defineStandIn()
      const standIn = document.createElement(STAND_IN_TAG)
      standIn.className = "EditorZoneStandIn"
      const [open, close] = [ANGLE_OPEN, ANGLE_CLOSE].map((angle) => {
        const mark = document.createElement("span")
        mark.style.cssText = ANGLE_STYLE
        mark.textContent = angle
        return mark
      })
      standIn.append(open, placeOf(this, core), close)
      return standIn
    }
  })
}

/****************
 * ### `<editor-stand-in>`
 * What the editor draws in place of one of its own parts, in the zones:  a tag pill naming it, `⟨tools⟩`.
 * - Looks as where it lands asks, decided as it's added to the page (epic `editor` I327, T146):
 *   - in a row (the top bar, a menu):  a pill 24px tall, centred on the row, as every other pill in it
 *   - a pane of a split panel (`editor layout`):  filling its pane, so `⟨app⟩` is as tall as code and the
 *     Program panel together, as the editor lays them out
 * - An element of its own, not a `<span>`:  only on being added does it know which, and a span can't hear that.
 * - Its look is written on it, not in `EditorZones.css`:  a view with a `<css>` of its own draws inside its element
 *   (`hasOwnCss()`), where the page's sheets don't reach.
 ****************/
class EditorStandIn extends HTMLElement {
  connectedCallback(): void {
    this.style.cssText = STAND_IN_STYLE + (this.parentElement?.localName === "ui-split-panel" ? IN_PANE : IN_ROW)
  }
}

/** A stand-in's tag. */
const STAND_IN_TAG = "editor-stand-in"

/** Define `<editor-stand-in>`, once per page. */
function defineStandIn(): void {
  if (!customElements.get(STAND_IN_TAG)) customElements.define(STAND_IN_TAG, EditorStandIn)
}

/**
 * A stand-in's look:  the code pane's tag pill (`bubbly.css`, `.bubbly-tag-pill`), in a view's purple, its ends cut
 * to points, its name bold between steep angle brackets.
 */
const STAND_IN_STYLE =
  "display: inline-flex; align-items: center; justify-content: center; gap: 3px; box-sizing: border-box; " +
  "margin: 2px; padding: 0 9px; " +
  "border-radius: 7px / 12px; corner-shape: bevel; white-space: nowrap; font-size: 13px; font-weight: 650; " +
  "color: light-dark(#1f1f26, #f6f5fb); " +
  "background: light-dark(color-mix(in srgb, #7c5cd6 20%, white), color-mix(in srgb, #7c5cd6 34%, #1c1b22)); "

/**
 * ... in a row:  24px, centred on the row.
 * - Centred, not stretched:  a row stretches its items, and a pill pinned at 24px in it sat at the row's top,
 *   while one inside a capsule (`⟨tools⟩`) sat at its centre, 6px lower (I327).
 */
const IN_ROW = "flex: none; align-self: center; height: 24px"

/**
 * ... a pane of a split panel:  filling it, never less than a pill.
 * - The split panel sizes its panes along its length (their `flex`);  across, the pane stretches.
 * - Its least height kept:  the panel shrinks its panes to nothing (`min-height: 0`), which squeezed a pill away.
 */
const IN_PANE = "align-self: stretch; min-height: 24px; min-width: 24px"

/** A stand-in's angle brackets:  faint, heavy, as the code pane draws a tag's. */
const ANGLE_STYLE = "font-weight: 800; opacity: 0.45"

/** The brackets round a stand-in's name:  math's angle brackets, as the code pane draws a tag's `<` and `>`. */
const [ANGLE_OPEN, ANGLE_CLOSE] = ["\u27E8", "\u27E9"]

/** The editor part classes drawing as stand-ins:  `drawStandIns()`. */
const STANDING_IN = new WeakSet<object>()

/** The name of the place `part` is in, among the app's views:  `spell menu`;  `part` if it's in none. */
function placeOf(part: object, core: ZoneCore): string {
  for (const { view } of zonesOf(core)) {
    const found = membersOf(view).find(([, member]) => member === part)
    if (found) return wordsOf(found[0])
  }
  return "part"
}

/** The type `view`'s class (or one it extends) declares for `key`, as the runtime names it. */
function declaredTypeOf(view: object, key: string): string | undefined {
  for (let schema: Schema | undefined = schemaOf(view.constructor); schema; schema = schema.parent) {
    const type = schema.declared.get(key)?.type
    if (type) return type
  }
  return undefined
}

/** The type of an editor part, as a schema names it:  `EditorPart`, or in words. */
const EDITOR_PART_TYPE = /^editor ?part$/i

/**
 * Does `view`'s drawing open a modal (`<modal>`, `<flyout>`)?  Read off its compiled drawing, never drawn to find out:
 * a modal drawn on the page opens, and covers it.
 * - Spell UI's own tags, as the editor's Spell (English) compiles them:  `h("ui-modal", ...)`.
 */
function drawsAModal(view: object): boolean {
  const draw = (view as { draw?: unknown }).draw
  return typeof draw === "function" && MODAL_DRAWING.test(String(draw))
}

/** A compiled drawing that opens over the page:  its first tag a modal or a flyout. */
const MODAL_DRAWING = /\bh\("ui-(modal|flyout)"/

/**
 * `view`'s modal drawn inline, in its zone:  its box, title, words and buttons, as the page shows it, never over the
 * page (Owen, T143).
 * - Filled with sample words where the editor fills them as it opens one (`sampleFill()`).
 * - Drawn first into a box off the page, and put in the zone only once its dialog is made and its `visible` taken off:
 *   shown, it would open in the top layer, over everything, and make the page inert.
 *   - The drawing makes its elements a moment after `render()` returns (its error boundary's memo), so it waits for
 *     the dialog to appear (`MutationObserver`), not a fixed time.
 * - Its closed `<dialog>` shown as a box in the zone's flow, through its `modal` part (`EditorZones.css`).
 */
function InlineDialog(props: { view: object; core: ZoneCore }): JSX.Element {
  const { view, core } = untrack(() => props)
  sampleFill(view, core)
  const zone = document.createElement("div")
  zone.className = "EditorZoneDialog"
  const offPage = document.createElement("div")
  const dispose = render(() => core.drawOwn(view) as JSX.Element, offPage)
  const putInZone = (): boolean => {
    const dialogs = offPage.querySelectorAll(DIALOG_TAGS)
    if (!dialogs.length) return false
    for (const dialog of dialogs) dialog.removeAttribute("visible")
    zone.append(offPage)
    return true
  }
  if (!putInZone()) {
    const watching = new MutationObserver(() => putInZone() && watching.disconnect())
    watching.observe(offPage, { childList: true, subtree: true })
    onCleanup(() => watching.disconnect())
  }
  onCleanup(dispose)
  return zone as unknown as JSX.Element
}

/** The dialogs a modal view draws, shown inline:  Spell UI's modal and flyout. */
const DIALOG_TAGS = "ui-modal, ui-flyout"

/**
 * Fill `view`'s text with sample words where the editor fills them as it opens one:
 * its version (About Spell), a Versions box's words and two versions.
 * - Only what's still empty:  what the program set stays.
 */
function sampleFill(view: object, core: ZoneCore): void {
  const fields = view as Record<string, unknown>
  const words: Partial<
    Record<EditorMemberName<"AboutBox", "value"> | EditorMemberName<"VersionsBox", "value">, string>
  > = {
    version: __PACKAGE_VERSION__,
    heading: appTexts.text("versions"),
    message: appTexts.text("versionsMessage"),
    emptyWords: appTexts.text("noVersions"),
    keepWords: appTexts.text("saveCurrentChanges"),
    cancelWords: appTexts.text("editorZonesCancel"),
    restoreWords: appTexts.text("restoreVersion")
  }
  for (const [key, text] of Object.entries(words)) if (key in fields && !fields[key]) fields[key] = text
  const list = fields.versions as { items?: unknown[]; getValues?: () => unknown[] } | undefined
  const Version = programExports(core).Version as (new () => Record<string, unknown>) | undefined
  if (list && Version && !list.getValues?.().length) {
    list.items = SAMPLE_VERSIONS.map((when, index) =>
      Object.assign(new Version(), { name: `sample-${index}.zip`, when, place: index ? "other" : "chosen" })
    )
    if ("listing" in fields) fields.listing = "listed"
  }
}

/** Two versions a Versions box shows in its zone:  when each was kept. */
const SAMPLE_VERSIONS = ["Nov 14, 2026, 9:15:02 AM", "Nov 3, 2026, 4:40:31 PM"]

/**
 * Show every row the app's menus can show, and title the ones the editor titles (Owen, T142:  "show all of the
 * optional bits in the menu, even if hidden"):  what's behind an `if` here is what the editor hides or greys, by
 * where it runs and what it may do.
 * - On the app the zones run, the programs' copy (`runtimeCore()`), never the editor's own:  the bar's menus are
 *   unchanged.
 * - Its titles in the page's language, for a sample project, as the editor words them for the project open.
 * - SIDE EFFECT:  writes them on the app, each time a zone draws;  a live edit makes the app anew.
 */
function showEveryRow(core: ZoneCore): void {
  const app = core.things.topLevel().find(({ thing }) => membersOf(thing).some(([, member]) => isView(member)))?.thing
  if (!app) return
  const project = { project: SAMPLE_PROJECT }
  const shown: Partial<Record<EditorMemberName<"SpellEditor", "value">, unknown>> = {
    onAServer: true,
    newFilesAllowed: true,
    draftsAllowed: true,
    projectChangesAllowed: true,
    resetAllowed: true,
    fileChanged: true,
    drafted: true,
    readyToPublish: true,
    revertWords: appTexts.text("revertChanges"),
    renameWords: appTexts.text("renameProject", project),
    deleteWords: appTexts.text("deleteProject", project),
    duplicateWords: appTexts.text("duplicateProject", project)
  }
  const fields = app as unknown as Record<string, unknown>
  for (const [key, value] of Object.entries(shown)) if (key in fields) fields[key] = value
}

/** The project a menu's titles name in a zone. */
const SAMPLE_PROJECT = "Counter"
