import { For, Show, createMemo, onCleanup, untrack } from "solid-js"
import { render, type JSX } from "@solidjs/web"

import { kebabCase, schemaOf, type Schema } from "spell/util"
import { editor, runtimeCore } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
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
 * - What the editor draws in a view's place for it (a pane, the Spell menu's projects) is a stand-in naming it.
 * - A modal (About Spell, Versions) waits behind a Show button:  open, it would cover the page.
 * - A zone whose drawing throws shows its error, and the others go on drawing.
 ****************/
export function EditorZones(): JSX.Element {
  // each run, as one afresh makes the app's views anew (`editor.programRuns`)
  const zones = createMemo(() => {
    void editor.programRuns
    return zonesOf(runtimeCore())
  })
  onCleanup(closeZoneModals)
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
  const isModal = drawsAModal(view)
  return (
    <section class="EditorZone">
      <header class="EditorZoneTitle">{name}</header>
      <div class="EditorZoneBody">
        <ErrorBoundary fallback={(error) => <p class="EditorZoneError">{error.message}</p>}>
          {isModal ? (
            <ui-button size="small" icon="window maximize outline" onClick={() => showModal(view, core)}>
              {appTexts.text("editorZonesShow")}
            </ui-button>
          ) : (
            (core.drawThing(view) as JSX.Element)
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
 * Make the program's editor parts draw as stand-ins, each naming the place it's in:  `The editor's own:  spell menu`.
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
      const standIn = document.createElement("span")
      standIn.className = "EditorZoneStandIn"
      standIn.style.cssText = STAND_IN_STYLE
      standIn.textContent = appTexts.text("editorZonesStandIn", { part: placeOf(this, core) })
      return standIn
    }
  })
}

/**
 * A stand-in's look:  a dashed grey chip.  Written on it, as it's drawn inside its view's element,
 * where the page's sheets don't reach;  the theme's colours still do.
 */
const STAND_IN_STYLE =
  "display: inline-flex; align-items: center; min-height: 24px; padding: 2px 8px; " +
  "border: 1px dashed var(--ui-border-color); border-radius: 6px; font-size: 12px; white-space: nowrap; " +
  "color: var(--ui-text-muted, var(--ui-muted-color))"

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
 * Open `view`'s modal over the page, filled with sample words where the editor fills them (`sampleFill()`),
 * and take it away once it closes, as the editor's own About and Versions do.
 */
function showModal(view: object, core: ZoneCore): void {
  sampleFill(view, core)
  const host = document.createElement("div")
  host.className = "EditorZoneModal"
  document.body.append(host)
  const dispose = render(() => core.drawOwn(view) as JSX.Element, host)
  host.addEventListener(
    "ui-closed",
    () => {
      dispose()
      host.remove()
    },
    { once: true }
  )
}

/**
 * Fill `view`'s text with sample words where the editor fills them as it opens one:
 * its version (About Spell), a Versions box's words and two versions.
 * - Only what's still empty:  what the program set stays.
 */
function sampleFill(view: object, core: ZoneCore): void {
  const fields = view as Record<string, unknown>
  const words: Record<string, string> = {
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

/** Take away any of the zones' modals still open:  they go with the pane. */
function closeZoneModals(): void {
  for (const host of document.querySelectorAll(".EditorZoneModal")) host.remove()
}
