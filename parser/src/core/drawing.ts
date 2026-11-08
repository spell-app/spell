/**
 * Drawing with Solid:  what compiled spell's `draw` statements call -- `drawThing()`, `drawItems()`, `@drawn` --
 * and mounting an app (`mountApp()`).
 * - Compiled JSX is Solid's own `h()`, exported here as core's `h`, as a person writing Solid without JSX would:
 *   `h("span", { class: "suit" }, () => this.shortSuit)`.
 *   - Every value that can change is written as a function.
 *     Solid calls it, and again when what it read changes, updating only that node:  nothing redraws a whole board.
 *   - Since epic `output-targets` P20.
 *     Before it, compiled spell called `core.element()`:  gone since P22, with every example recompiled.
 * - Each drawn thing sits in its own error boundary (`drawInBoundary()`, on Solid's `<Errored>`):
 *   when its `draw()` throws, it shows a small stand-in, and the rest keeps drawing.
 *   ONE boundary, for both targets:
 *   - compiled JavaScript draws a thing with `core.drawThing(card)`, which puts its `draw()` in the boundary
 *   - compiled TypeScript (and hand-written code) writes `@drawn draw() { ... }`, which puts it there itself:
 *     it draws a child with `core.drawThing(card)` too, which calls a `@drawn` `draw()` straight
 *     (a bare `{card.draw()}` would skip a view's element -- epic `spanish` J100)
 *   - `h()` returns a THUNK, a function that makes the element:  the boundary makes it, once (`madeOnce()`)
 * - Solid comes from the PAGE, never a copy of its own:
 *   `spell-runtime.js` imports `solid-js`, `@solidjs/web` and `@solidjs/h` from the page's one shared Solid,
 *   `spell-solid.js`.
 *   - Spell state reaches Solid through the host's `bridgeSolid()` (`spell/util/reactive`).
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */

import h from "@solidjs/h"
import { createComponent, insert, render, type JSX } from "@solidjs/web"
import { Errored, createMemo, createRoot, getOwner, onCleanup, runWithOwner } from "solid-js"

import { Cell } from "spell/util"
import { untrackCells } from "spell/util/reactive"

import { core } from "./core"
import { defineCoreModule, type PartEdit } from "./core.types"
import { List } from "./classes/List"
import { ViewableList } from "./classes/ViewableList"
import { MOST_AT_ONCE, canDrawInWindows, drawnInWindow } from "./drawnWindow"
import { listenForTableEdits, listenForUndoKeys } from "./ui"
import { standInFor } from "./waiting"

/**
 * Solid's own `h()`, what compiled JavaScript draws with:  `import { h } from "@spell/core"`.
 * - The SAME copy core draws with, so the boundary knows its thunks (`isElementThunk()`).
 * - Epic `output-targets` P20, Q57.
 */
export { h }

/** What a drawing is:  a Solid node, or anything Solid can put on the page (text, a list of them, nothing). */
export type Drawing = JSX.Element

/** Anything that can draw itself, e.g. a `Thing` or a `List`. */
export type CanDraw = {
  /** Returns its drawing -- compiled from `to draw (a card)`. */
  draw(): Drawing
}

/** `core`'s drawing methods, on Solid. */
export const drawingMethods = defineCoreModule({
  ////////////////
  // ## Drawing things
  ////////////////

  /**
   * `drawable` drawn -- `null` if it can't draw (no `draw()`).
   * - Compiles from `draw the card` -- see `rules/draw/DrawThing.ts`.
   *   Takes ANYTHING, as it checks:
   *   compiled spell draws what TypeScript can't type, e.g. the last card of a pile.
   * - A VIEW (`a card is a view`) is its element, e.g. `<solitaire-card>`, the card set as its
   *   `thing`:  it draws itself in there, with `drawOwn()`.  When the page can define it -- see `elementFor()`.
   *   - A viewable LIST's items are its element's children, e.g. `<game-pile>` holding `<game-card>`s,
   *     shown in its drawing's `<slot>` (spell's `<children/>`).
   *   - An APP's whole drawing is its element's children, e.g. `<solitaire-app>` holding its board:
   *     its class `drawsInItsChildren`, so the project's styles still reach it (epic `elemental-spell` Q62).
   *   - A PAGE's too:  its sections are its element's children (epic `notebook` P3),
   *     so the editor's docs frame and its "On this page" list reach them.
   * - Anything else:  its own drawing, here -- see `drawOwn()`.
   */
  drawThing(drawable?: unknown): Drawing | null {
    const thing = drawable as Partial<CanDraw> | undefined
    if (typeof thing?.draw !== "function") return null
    const tag = core.elementFor(thing)
    if (tag) {
      // a viewable list's items, or an app's whole drawing, are its element's children:  shown in its `<slot>`
      const children = drawsInItsChildren(thing)
        ? [() => core.drawOwn(thing)]
        : thing instanceof ViewableList
          ? [() => core.drawItems(thing)]
          : []
      // an edit drawing it again:  its own element, its children bound to this drawing (`drawAgain()`)
      const kept = keptElementFor(thing, tag)
      if (kept) {
        for (const child of children) insert(kept, child, undefined, [...kept.childNodes] as unknown as JSX.Element)
        return kept as unknown as Drawing
      }
      // made NOW:  the thing is a plain value, set once
      return (h(tag, { "prop:thing": thing }, ...children) as unknown as () => Drawing)()
    }
    return core.drawOwn(thing)
  },

  /**
   * A PART of `thing`'s drawing, `make`'s, which an edit can draw again alone (epic `notebook` P4).
   * - What each example on a page compiles to:  `core.drawPart(this, () => h("spell-example", ...))`.
   * - Drawn in a memo of its own, inside the drawing around it:
   *   so a page of 76 examples, one of them edited, draws that one again, not the page (`drawAgain()`'s `parts`).
   * - Otherwise just `make()`'s drawing:  the drawing around it drawn again draws it again too.
   *   - Except for an edit that keeps it (`drawAgain()`, epic `notebook` I6):
   *     then it hands back what it drew, for the drawing around it to put in its new place.
   * - Found again by its code, `make`'s text (`Function.toString()`), which is what an edit names.
   * - Held by its drawing's boundary, not by the drawing around it, so drawing that again needn't tear this down.
   * - No `thing` (a drawing outside a type):  never drawn alone.
   */
  drawPart(thing: unknown, make: () => Drawing): Drawing {
    if (collectingParts) {
      collectingParts.push(make)
      // a section:  the parts it holds are found through it
      if (make.toString().includes(DRAW_PART_CALL)) make()
      return null
    }
    const kept = thing ? takeKeptPart(thing as object, make) : undefined
    if (kept) {
      kept.make = make
      letGoOfPartWithThisDrawing(kept)
      return kept.drawing
    }
    const type = (thing as object | undefined)?.constructor?.name
    const part: DrawnPart = { thing: thing as object, type, make, again: new Cell(), drawing: null, owner: partsOwner }
    const draw = () =>
      createMemo(() => {
        part.again.read()
        // its boundary holds what it draws, even drawn again alone:  the parts inside it stay keepable
        return withPartsOwner(part.owner, () => madeOnce(part.make()))
      }) as unknown as Drawing
    if (partsOwner) {
      runWithOwner(partsOwner, () =>
        createRoot((dispose) => {
          part.letGo = dispose
          part.drawing = draw()
        })
      )
    } else part.drawing = draw()
    if (type && thing) partsOfType(type).add(part)
    letGoOfPartWithThisDrawing(part)
    return part.drawing
  },

  /**
   * Draw the views of each of `types` again after an edit, keeping every element the page has (epic `editor`,
   * Edit Without Redraw):  each view that draws again finds the element each thing it holds already has.
   * - So a board drawn again keeps its 52 cards:  the same elements, with what they hold, moved to the new drawing.
   * - `everything`:  every view.
   * - `parts`:  each part of a drawing whose code changed (`drawPart()`),
   *   drawn again ALONE, from the new program's drawing (epic `notebook` P4).
   *   - One it can't find draws its type again, whole.
   *   - A part whose code changed only in where it's written (`drawsAgain: false`) is found again by its new code,
   *     and nothing draws.
   *   - One the edit marks `kept` (a part moved, epic `notebook` I6) is handed back to the drawing around it,
   *     which draws again:  its elements go where that drawing says, nothing else about them changes.
   * - Done by the time it returns.
   * - A drawing changing for any other reason makes its elements as usual:  this is only for an edit.
   */
  drawAgain(types: readonly string[] | "everything", parts: readonly PartEdit[] = []): void {
    keptElements = new Map()
    noteElementsIn(core.appElement())
    try {
      if (types === "everything") everyDrawing.changed()
      else {
        const wholeTypes = new Set(types)
        const drawings = new Map<object, Map<string, Array<() => Drawing>>>()
        keptParts = partsToKeep(parts.filter((edit) => edit.kept))
        for (const edit of parts) {
          if (edit.kept || (edit.drawsAgain && wholeTypes.has(edit.type))) continue
          if (!takePartEdit(edit, drawings) && edit.drawsAgain) wholeTypes.add(edit.type)
        }
        for (const type of wholeTypes) drawingOfType(type).changed()
      }
      core.flush()
    } finally {
      keptElements = undefined
      letGoOfUntakenParts()
    }
  },

  /**
   * `drawable`'s OWN drawing, in its own error boundary, never its element -- `null` if it can't draw (no `draw()`).
   * - What `drawThing()` draws for a thing with no element, and what a view's element draws inside.
   * - Its `draw()` re-runs when something it read OUTSIDE its live values changes,
   *   e.g. the `is face down` an `if` chose by:  the card's node is drawn again, nothing else.
   *   Its live values update on their own.
   * - The error boundary is `drawInBoundary()`'s.
   *   A thing whose `draw()` is `@drawn` brings its own:  it's called straight.
   */
  drawOwn(drawable?: unknown): Drawing | null {
    const thing = drawable as Partial<CanDraw> | undefined
    if (typeof thing?.draw !== "function") return null
    // a second boundary around `@drawn`'s own would catch nothing more
    if (isDrawn(thing.draw)) return thing.draw()
    return drawInBoundary(thing, () => (thing as CanDraw).draw())
  },

  /**
   * What a loop in a live value answered, as Solid can draw it:  a spell `List`'s items, or anything else as it is.
   * - e.g. `h("div", () => core.listDrawn(core.map(this.books, ...)))`:  Solid draws an array, never a `List`,
   *   so the loop's items would silently show nothing (epic `language`, r2).
   * - Reads its items, in the live value:  so it follows them.
   */
  listDrawn(value: unknown): Drawing {
    return (value instanceof List ? value.items : value) as Drawing
  },

  /**
   * Each item of `list`, drawn in its own error boundary -- `null` if `list` has no items to draw.
   * - Compiles from `draw each card in the deck` / `draw cards of the deck` -- see `rules/draw/DrawItems.ts`.
   *   And what a viewable list's element holds as its children -- see `drawThing()`.
   * - A list with its own `to draw each item` (`drawEachItem()`) draws each item with it, in a boundary of the list's:
   *   the wrapper each item is drawn in (epic `spanish` P20).
   *   - A viewable list's default draws the item itself, in the item's own boundary:  no second one around it.
   * - Any other list's item draws as itself (`drawThing()`).
   * - Kept by IDENTITY (`<For>`):  an item added, removed or moved changes only its own node.
   * - A long list draws what fits, and more as you scroll:  `drawnInWindow()`.
   */
  drawItems(list: unknown): Drawing | null {
    // NOT `list.items` here:  read in the caller's drawing, every change to the list would draw it all again
    if (!list || typeof list !== "object" || !("items" in list)) return null
    const { drawEachItem } = list as Partial<DrawsEachItem>
    const drawItem =
      typeof drawEachItem !== "function"
        ? (item: unknown) => core.drawThing(item)
        : drawEachItem === DEFAULT_DRAW_EACH_ITEM
          ? (item: unknown) => drawEachItem.call(list, item)
          : (item: unknown) => drawInBoundary(list, () => drawEachItem.call(list, item))
    return drawnInWindow({ items: () => (list as { items: unknown[] }).items, drawItem, key: () => list as object })
  },

  /**
   * A loop's drawing, one for each item of `list`:  what `for each ... draw` compiles to, in a drawing.
   * - Up to `MOST_AT_ONCE` items, or on a page that can't watch them come near the view:  `core.map()`, drawn together.
   * - A long list draws what fits, and more as you scroll, however the program wrote it:  `drawnInWindow()`.
   * - Reads the list here, as `core.map()` does:  what draws it follows it.
   * - A spell `List`'s drawings come back as an array:
   *   Solid can't draw a `List` (epic `data` P24, a Pokémon's kinds).
   */
  drawEach(list: unknown, each: (item: unknown, position: number, list: unknown) => Drawing): Drawing {
    const items = () => (Array.isArray(list) ? list : (list as { items?: unknown[] } | undefined)?.items)
    const all = items()
    if (!all || all.length <= MOST_AT_ONCE || !canDrawInWindows()) {
      return core.listDrawn(core.map(list as never, each as never))
    }
    return drawnInWindow({
      items: () => items() ?? [],
      key: () => list as object,
      drawItem: (item, position) => madeOnce(each(item, position(), list))
    })
  },

  ////////////////
  // ## Mounting
  ////////////////

  /**
   * Mount `view`'s drawing into `core.appElement()`, as the program's page:
   * what `App.start()` and `Page.start()` do (`start the game`, `start the counter notebook`).
   * - Creates a `core.REACT_APP_ROOT_ID` container `div` if there's none.
   * - On a page that defines elements, that's the view's element, `<solitaire-app>`, its drawing inside it.
   * - Starting again replaces what's drawn there.
   * - SIDE EFFECT: appends a `div` to `document.body` the first time it's called, if the host set no `appRoot`.
   * - With `core.appLayout` (a `<spell-viewer>` with markup inside it):  draws nothing, saying so on the console.
   * - With no page at all, e.g. a program run in node:  nothing, as an app starts by itself (`startedByItself()`).
   */
  startDrawing(view: CanDraw): void {
    if (typeof document === "undefined") return
    if (core.appLayout) {
      core.console.log(`${view.constructor.name}:  its page's markup draws it, not its \`to draw\``)
      return
    }
    let element = core.appElement()
    if (!element) {
      element = document.createElement("div")
      element.id = core.REACT_APP_ROOT_ID
      document.body.appendChild(element)
    }
    core.mountApp(view, element)
  },

  /**
   * Mount `app`'s drawing into `element` -- replacing what was there -- and return how to take it down again.
   * - What `App.start()` does, into `core.appElement()`.
   * - SIDE EFFECT:  `element.spellRoot` is the mounted app:
   *   so a runner can `unmount()` it before running a program again (`runCompiled()`).
   * - SIDE EFFECT:  `element` gives what's drawn inside it the program's widget defaults (`core.useDefaults()`).
   * - SIDE EFFECT:  ⌘Z and ⇧⌘Z undo and redo while it has the focus, until it's unmounted (`listenForUndoKeys()`).
   * - SIDE EFFECT:  a `<ui-table editable>` of its things writes them (`listenForTableEdits()`).
   */
  mountApp(app: CanDraw, element: HTMLElement): MountedApp {
    ;(element as AppElement).spellRoot?.unmount()
    // its widget defaults first, so its widgets draw with them (epic `language` P29)
    core.handDefaultsTo(element)
    // a root of its own:  `start the game` may run inside the host's drawing (a runner's effect),
    // whose owner would otherwise own the app's drawing -- and hold or re-run it with the host's
    const dispose = runWithOwner(null, () => render(() => core.drawThing(app), element))
    const stopUndoKeys = listenForUndoKeys(element)
    const stopTableEdits = listenForTableEdits(element)
    const mounted: MountedApp = {
      app,
      unmount() {
        dispose()
        stopUndoKeys()
        stopTableEdits()
        if ((element as AppElement).spellRoot === mounted) delete (element as AppElement).spellRoot
      }
    }
    ;(element as AppElement).spellRoot = mounted
    return mounted
  }
})
Object.assign(core, drawingMethods)

////////////////
// ## `@drawn`
////////////////

/**
 * `@drawn draw() { ... }`:  the drawing in its own error boundary, the same boundary `core.drawThing()` gives.
 * - So its drawing neither re-runs when the card's reads change, nor dies with the card's errors:
 *   the card's drawing re-runs by itself, inside its boundary.
 * - What compiled TypeScript (`ts/solid`) and hand-written classes write.
 *   - Both targets draw a thing with `core.drawThing(card)`:
 *     javascript's `draw()`, with no decorators, gets the same boundary there.
 *   - ONE boundary, `drawInBoundary()`, for both targets.
 * - SIDE EFFECT:  marks the method it returns (`isDrawn()`), so `drawThing()` calls it straight:
 *   no second boundary around it.
 * - A standard (TC39) method decorator, `@spell/core`'s like `@prop`.
 *   NOTE: lowered by esbuild (`vite.decorators.ts`), so it MUST start its line.
 */
export function drawn<This extends object, Draw extends (this: This) => Drawing>(
  draw: Draw,
  _context: ClassMethodDecoratorContext<This, Draw>
): Draw {
  const drawInItsBoundary = function (this: This): Drawing {
    return drawInBoundary(this, () => draw.call(this))
  }
  Object.defineProperty(drawInItsBoundary, DRAWN, { value: true })
  return drawInItsBoundary as Draw
}

/**
 * `draw()`'s drawing, for `thing`, in its own error boundary:
 * `drawThing()`'s and `@drawn`'s, the ONE boundary both targets draw in.
 * - Through `createComponent()`, as Solid's JSX does:  untracked, so what `draw()` reads is its own, not the caller's.
 * - `draw()` runs in a memo, inside the boundary:
 *   again only for what IT read, never because the boundary re-reads its children
 *   (it does, whenever anything under it changes:  a list grows, a card flips).
 * - When `draw()` (or a live value in it) throws:
 *   - one line on the program's console
 *   - a cancelable `ui-error` from the app's element (`{ error, thing }`)
 *   - a small stand-in, unless that event was cancelled:  made once, even as the drawing around it changes
 *     (`<Errored>` builds its fallback once since Solid rc.15;  `drawing.test.ts` pins it)
 *   - The rest of the drawing keeps working;  the boundary heals when the thing draws again.
 * - A thing whose class `drawsWaiting` holds its whole drawing in a "…" until a value it reads answers:
 *   an `if` or an attribute has no spot of its own for one, and with no `<Loading>` at all the program stays blank.
 *   Inside the boundary:  a `<Loading>` outside a view's element doesn't cover what's inside it (epic `language` P8).
 */
function drawInBoundary(thing: object, draw: () => Drawing): Drawing {
  return createComponent(Errored, {
    fallback: (error: () => unknown) => drawingFailed(thing, error()),
    get children() {
      const boundary = getOwner()
      const drawing = () =>
        createMemo(() => {
          // an edit to its type draws it again (`drawAgain()`)
          everyDrawing.read()
          drawingOfType(thing.constructor.name).read()
          return withPartsOwner(boundary, () => madeOnce(draw()))
        }) as unknown as Drawing
      if (!drawsWaiting(thing)) return drawing()
      if (drawsInItsChildren(thing)) warnOfWholeAppHeld(thing)
      return standInFor(drawing)
    }
  })
}

////////////////
// ## Drawing again after an edit (`core.drawAgain()`)
////////////////

/** Read by every drawing:  an edit that changes them all changes it. */
const everyDrawing = new Cell()

/** Read by each type's drawings, by the type's name:  it outlives the type's class, which an edit replaces. */
const DRAWINGS_OF_TYPES = new Map<string, Cell>()

/** The cell the drawings of type `name` read. */
function drawingOfType(name: string): Cell {
  let cell = DRAWINGS_OF_TYPES.get(name)
  if (!cell) DRAWINGS_OF_TYPES.set(name, (cell = new Cell()))
  return cell
}

/** One part of a drawing, `drawPart()`'s. */
type DrawnPart = {
  /** the thing whose drawing holds it */
  thing: object
  /** its thing's type's name;  none for a drawing outside a type */
  type: string | undefined
  /** what it draws with now */
  make: () => Drawing
  /** changed to draw it again */
  again: Cell
  /** what it drew:  a live value, handed to the drawing around it */
  drawing: Drawing
  /** ends its drawing;  `undefined` when its drawing is ended with the drawing around it, so it can't be kept */
  letGo?: () => void
  /** which drawing around it has it now:  see `letGoOfPartWithThisDrawing()` */
  drawnBy?: symbol
  /** the boundary holding it;  `null` if none */
  owner: ReturnType<typeof getOwner>
}

/** The parts drawn now, by their thing's type's name. */
const PARTS_OF_TYPES = new Map<string, Set<DrawnPart>>()

/** The parts drawn now of type `name`. */
function partsOfType(name: string): Set<DrawnPart> {
  let parts = PARTS_OF_TYPES.get(name)
  if (!parts) PARTS_OF_TYPES.set(name, (parts = new Set()))
  return parts
}

/** How a part inside a part's code calls `drawPart()`. */
const DRAW_PART_CALL = "core.drawPart("

/** While `partsDrawnBy()` runs a drawing:  each part's `make`, in order, collected and not drawn. */
let collectingParts: Array<() => Drawing> | undefined

/** While a drawing runs in its boundary:  that boundary, which holds its parts. */
let partsOwner: ReturnType<typeof getOwner> = null

/** Run `drawing` with `boundary` holding the parts it draws, then put back the one around it. */
function withPartsOwner<T>(boundary: ReturnType<typeof getOwner>, drawing: () => T): T {
  const around = partsOwner
  partsOwner = boundary
  try {
    return drawing()
  } finally {
    partsOwner = around
  }
}

/** While an edit draws a type again:  the parts it keeps. */
let keptParts: KeptParts | undefined

/** The parts an edit keeps, for the drawing it draws again to take. */
type KeptParts = {
  /** by their thing, then by their code in the new drawing */
  wanted: Map<object, Map<string, DrawnPart[]>>
  /** the ones not taken yet */
  waiting: Set<DrawnPart>
}

/** What `edits` keep:  each part drawn now with an edit's old code, for a drawing with its new code. */
function partsToKeep(edits: readonly PartEdit[]): KeptParts | undefined {
  if (!edits.length) return undefined
  const kept: KeptParts = { wanted: new Map(), waiting: new Set() }
  const drawnNow = new Map<string, DrawnPart[]>()
  for (const edit of edits) {
    const key = `${edit.type}\n${edit.was}`
    if (!drawnNow.has(key)) {
      const ofType = [...(PARTS_OF_TYPES.get(edit.type) ?? [])]
      drawnNow.set(
        key,
        ofType.filter((part) => part.letGo && part.make.toString() === edit.was)
      )
    }
    const part = drawnNow.get(key)!.shift()
    if (!part) continue
    let ofThing = kept.wanted.get(part.thing)
    if (!ofThing) kept.wanted.set(part.thing, (ofThing = new Map()))
    ofThing.set(edit.now, [...(ofThing.get(edit.now) ?? []), part])
    kept.waiting.add(part)
  }
  return kept
}

/** The part kept for a drawing of `thing` with code `make`, first drawn first:  it's taken, so the edit won't end it. */
function takeKeptPart(thing: object, make: () => Drawing): DrawnPart | undefined {
  const part = keptParts?.wanted.get(thing)?.get(make.toString())?.shift()
  if (part) keptParts!.waiting.delete(part)
  return part
}

/**
 * When the drawing around it now ends, `part` ends too, unless a drawing since has taken it.
 * - The drawing a kept part leaves ends only after the new one has run, so its cleanup can come after the taking.
 */
function letGoOfPartWithThisDrawing(part: DrawnPart): void {
  const drawnBy = (part.drawnBy = Symbol())
  onCleanup(() => {
    if (part.drawnBy === drawnBy) letGoOfPart(part)
  })
}

/** The drawing around `part` ended:  it ends too, unless an edit is keeping it for the new one. */
function letGoOfPart(part: DrawnPart): void {
  if (keptParts?.waiting.has(part)) return
  if (part.type) partsOfType(part.type).delete(part)
  part.letGo?.()
}

/** The edit's drawing is done:  whatever it kept and didn't take ends, as it would have. */
function letGoOfUntakenParts(): void {
  const left = keptParts?.waiting
  keptParts = undefined
  left?.forEach(letGoOfPart)
}

/**
 * Take `edit` to the parts drawn now:
 * each one drawn with its old code finds its new code in its thing's drawing, as the new program has it,
 * and draws again with it (or only keeps it:  `drawsAgain: false`).
 * - `drawings`:  each thing's drawings run so far, by member, so a drawing runs once for every part of it.
 * - `false` when no part was drawn with the old code, or the new drawing has none with the new.
 */
function takePartEdit(edit: PartEdit, drawings: Map<object, Map<string, Array<() => Drawing>>>): boolean {
  const parts = [...(PARTS_OF_TYPES.get(edit.type) ?? [])].filter((part) => part.make.toString() === edit.was)
  if (!parts.length) return false
  for (const part of parts) {
    let ofThing = drawings.get(part.thing)
    if (!ofThing) drawings.set(part.thing, (ofThing = new Map()))
    let made = ofThing.get(edit.member)
    if (!made) ofThing.set(edit.member, (made = partsDrawnBy(part.thing, edit.member)))
    const next = made.find((make) => make.toString() === edit.now)
    if (!next) return false
    part.make = next
    if (edit.drawsAgain) part.again.changed()
  }
  return true
}

/**
 * The parts `thing`'s drawing `member` draws, each part's `make`, from the code it has now.
 * - Nothing is drawn:  `drawPart()` only collects each `make`, while this runs.
 * - Runs the drawing in a root of its own, thrown away after:  anything else it makes is let go.
 * - `[]` when it can't run.
 */
function partsDrawnBy(thing: object, member: string): Array<() => Drawing> {
  const draw = (thing as Record<string, unknown>)[member]
  if (typeof draw !== "function") return []
  const collected: Array<() => Drawing> = []
  collectingParts = collected
  try {
    createRoot((dispose) => {
      try {
        untrackCells(() => draw.call(thing))
      } finally {
        dispose()
      }
    })
  } catch {
    // a drawing that throws now:  its type draws again whole, and shows the error in its own place
    return []
  } finally {
    collectingParts = undefined
  }
  return collected
}

/** While an edit draws again:  each element on the page drawing a thing, not yet taken by the new drawing. */
let keptElements: Map<object, HTMLElement[]> | undefined

/** Note what's in `root`, through shadow roots:  a card's element is in its pile's light DOM, a pile's in the app's. */
function noteElementsIn(root: Element | ShadowRoot | null | undefined): void {
  if (!root) return
  for (const element of root.children as HTMLCollectionOf<HTMLElement>) {
    const { thing } = element as HTMLElement & { thing?: unknown }
    if (thing && typeof thing === "object") {
      const elements = keptElements!.get(thing)
      if (elements) elements.push(element)
      else keptElements!.set(thing, [element])
    }
    noteElementsIn(element)
    noteElementsIn(element.shadowRoot)
  }
}

/** `thing`'s element with tag `tag`, as the page has it now, if an edit is drawing again and none has taken it. */
function keptElementFor(thing: object, tag: string): HTMLElement | undefined {
  const elements = keptElements?.get(thing)
  if (!elements) return undefined
  const at = elements.findIndex((element) => element.localName === tag)
  return at < 0 ? undefined : elements.splice(at, 1)[0]
}

/**
 * Does `thing`'s element show its drawing as its children, rather than in its shadow root?
 * - An app's and a page's do:  their classes say `drawsInItsChildren` (`App`, `Page`).
 */
function drawsInItsChildren(thing: object): boolean {
  return (thing.constructor as { drawsInItsChildren?: boolean }).drawsInItsChildren === true
}

/** Does `thing`'s class say its drawing reads what waits, somewhere with no spot of its own for a "…"? */
function drawsWaiting(thing: object): boolean {
  return (thing.constructor as { drawsWaiting?: boolean }).drawsWaiting === true
}

/**
 * SIDE EFFECT:  says on the program's console that `app`'s whole drawing (or a page's) stays hidden until it answers.
 */
function warnOfWholeAppHeld(app: object): void {
  const type = (app as { type?: string }).type ?? app.constructor?.name ?? "app"
  core.console.warn(
    `${type}:  its draw() reads a value that waits, so nothing shows until it answers:  read it in a small part instead`
  )
}

/** Is `draw` a method `@drawn` made, which draws in its own boundary? */
function isDrawn(draw: Function): boolean {
  return (draw as { [DRAWN]?: boolean })[DRAWN] === true
}

/** A mounted app, as `mountApp()` returns it and leaves on its element (`spellRoot`). */
export type MountedApp = {
  /** The app drawn, e.g. the game:  a recompile that keeps the program's things starts it again (`carryOver()`). */
  app: CanDraw
  /** Take the app's drawing down, emptying its element. */
  unmount(): void
}

/** The element an app is mounted into. */
export type AppElement = HTMLElement & { spellRoot?: MountedApp }

/** A list with its own way to draw each item:  a viewable list's `drawEachItem()`, spell's `to draw each item`. */
type DrawsEachItem = {
  /** `item` drawn as one of the list's -- see `ViewableList.drawEachItem()`. */
  drawEachItem(item: unknown): Drawing
}

/** A viewable list's own `drawEachItem()`:  `drawItems()` adds no boundary around it. */
const DEFAULT_DRAW_EACH_ITEM = ViewableList.prototype.drawEachItem

/** The DOM event a drawing that failed sends -- the same name as Spell UI's. */
const ERROR_EVENT = "ui-error"

/** Marks a method `@drawn` made -- see `isDrawn()`. */
const DRAWN = Symbol("drawn")

/**
 * `drawing` MADE, if it's `h()`'s thunk (a function that makes the element) -- else `drawing` as it is.
 * - Compiled JavaScript's `draw()` returns `h("div", ...)`, a thunk.  Made here, inside the boundary's memo:
 *   - ONCE:  left a thunk, Solid would make the element again each time the boundary re-reads its children, which it
 *     does whenever anything under it changes (a card added to a pile)
 *   - inside the boundary:  a tag or child that throws while it's made shows the stand-in
 *   - elements INSIDE it need nothing:  `h()` makes them as it makes their parent
 * - A fragment, `<>...</>`, is a list of them (`[h("a"), h("b")]`):  each made once, the same way.
 * - So is a loop among other drawn lines:  `core.map()` answers a spell `List`, which Solid can't put on a page.
 * - ONLY `h()`'s thunks:  any other function is a live value, which Solid calls itself, again when it changes.
 *   `h()` marks its thunks with a symbol it keeps to itself, so it's read off a thunk of our own, `H_THUNK`.
 */
function madeOnce(drawing: Drawing): Drawing {
  if (Array.isArray(drawing)) return drawing.map(madeOnce)
  if ((drawing as unknown) instanceof List) return (drawing as unknown as List<Drawing>).items.map(madeOnce)
  return isElementThunk(drawing) ? madeOnce(drawing()) : drawing
}

/** Is `value` a thunk core's `h()` made -- see `madeOnce()`? */
export function isElementThunk(value: unknown): value is () => Drawing {
  return typeof value === "function" && !!H_THUNK && (value as unknown as Record<symbol, unknown>)[H_THUNK] === true
}

/**
 * The symbol `h()` marks its thunks with (`$ELEMENT`, "hyper-element" in `@solidjs/h`).
 * - Not exported, so read off a thunk it made.
 *   `h("i")` only wraps its arguments:  nothing is made, and nothing touches the page.
 * - `undefined` if an `@solidjs/h` to come stops marking them:  `drawing.test.ts` pins it.
 */
const H_THUNK: symbol | undefined = Object.getOwnPropertySymbols(h("i"))[0]

/**
 * What a drawing that failed shows:  a stand-in naming the thing, after telling the program and the page.
 * - SIDE EFFECTS:  one line on the program's console;  a cancelable `ui-error` from the app's element.
 * - `null`, drawing nothing, when the page cancelled that event.
 * - `null`, and nothing said, for an `AbortError`:  a read of a link given up on (`follow()`), as nobody's waiting.
 */
function drawingFailed(thing: object, error: unknown): Drawing | null {
  // a read given up on as its drawing went away (scrolled off):  nothing failed, and nothing to show;
  // a drawing still waiting for it never sees this, as `follow()` asks again for whoever holds it
  if ((error as Error | undefined)?.name === "AbortError") return null
  const type = (thing as { type?: string }).type ?? thing.constructor?.name ?? "thing"
  core.console.error(`${type}:  draw() failed`, error)
  // the page a site shows:  its error page instead, in its place (epic `mockup` P2)
  const site = core.RUNTIME?.site as { pageFailed?(thing: object, error: unknown): boolean } | undefined
  if (site?.pageFailed?.(thing, error)) return null
  const event = new CustomEvent(ERROR_EVENT, {
    bubbles: true,
    composed: true,
    cancelable: true,
    detail: { error, thing }
  })
  const target = core.appElement()
  if (target && !target.dispatchEvent(event)) return null
  const message = error instanceof Error ? error.message : String(error)
  // made NOW, as `madeOnce()` makes a drawing:  the boundary shows the stand-in once, as it is
  const standIn = core.message("cant-draw", { type })
  return madeOnce(h("span.spell-draw-error", { title: message, role: "alert" }, standIn) as unknown as Drawing)
}
