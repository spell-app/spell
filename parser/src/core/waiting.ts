/**
 * A value that takes a while:  what a compiled getter that waits stands on, and how a drawing and an action read it.
 * - `its "total" is:` with a pause or a slow call in it compiles to `core.waitedValue()`:
 *   - A drawing reads it as any getter:  "not yet" passes up through plain getters to the nearest `<Loading>`,
 *     and Solid runs the read again when the answer lands.
 *   - It's Solid's `createDeferred()`, never an async `createMemo()`:
 *     a memo holds the drawing back until its answer lands, which freezes a deal that changes what it read
 *     (epic `language` P8:  the counter froze at 28, then jumped to 56).
 *     `lazy`, so a value nobody reads runs no slow work again.
 * - `core.whileWaiting()`:  the "…" around one read in a drawing.  A whole thing held has one too (`drawInBoundary()`).
 * - `core.drawLooking()`:  how what waits inside an element looks meanwhile, `<card loading="skeleton">`;
 *   a site's for every page, `galaxy guide is a site with loading "skeleton"` (`WaitingLook`).
 * - `core.answerOf()`:  what an action reads it with, waiting for the answer.
 *   - Solid's own `resolve()` gives the OLD answer just after a write, so it's not used:
 *     it brings the writes in, reads, then waits for the latest promise (P8).
 * - Loads Solid:  NEVER imported by `core/model`.  A library's getter is a plain async getter (`LibraryWriter`).
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */

import h from "@solidjs/h"
import { createComponent } from "@solidjs/web"
import {
  Errored,
  Loading,
  createContext,
  createDeferred,
  createRoot,
  getObserver,
  getOwner,
  onCleanup,
  runWithOwner,
  useContext
} from "solid-js"

import { core } from "./core"
import { defineCoreModule } from "./core.types"
import type { Drawing } from "./drawing"
import { SKELETON_TAGS, SkeletonShapes, type SkeletonShape } from "spell/element/SkeletonShapes"
import type { SkeletonSpec } from "spell/element/vocabulary.types"
import { lookSaid, type WaitingLook } from "./looks"

/** One getter's value on one thing. */
type WaitedValue = {
  /** Its value now:  throws Solid's "not yet" before its first answer. */
  read: () => unknown
  /** The promise its last run started:  what an action waits for. */
  latest?: Promise<unknown>
  /** Works it out afresh. */
  compute: () => Promise<unknown>
  /** Has a drawing or a memo read it?  Then Solid runs it again when what it read changes;  until then, nothing does. */
  isFollowed?: boolean
}

/** One `answerOf()` reading:  the answers it has, and the values it found it still needs. */
type Answering = {
  answers: Map<WaitedValue, unknown>
  needed: WaitedValue[]
}

/** Each thing's waited values, by name. */
const WAITED_VALUES = new WeakMap<object, Map<string, WaitedValue>>()

/** What `waitedValueKeyFor()` handed out, by what it was handed. */
const WAITED_VALUE_KEYS = new WeakMap<object, Map<unknown, object>>()

/**
 * What owns every waited value:  never disposed, as each lives with its thing, not with what first read it.
 * - Made here, as a read may come from anywhere, even an effect's apply, where a new root with no owner is refused.
 */
const WAITING_OWNER = createRoot(() => getOwner())

/** Stops a read inside `answerOf()` at a value it has no answer for yet. */
const NOT_ANSWERED = Symbol("not answered")

/** The `answerOf()` reading right now. */
let answering: Answering | undefined

/** `core`'s methods for a value that takes a while. */
export const waitingMethods = defineCoreModule({
  /**
   * The value of `thing`'s getter `name`, worked out by `compute`, which waits:  what a getter that waits compiles to.
   * - Before its first answer it throws Solid's "not yet", which a `<Loading>` above catches.
   * - After that, its old answer until a new one lands:  the rest of the page moves on meanwhile.
   * - `follows`:  reads what `compute` reads after its first wait, which Solid wouldn't see, so they're followed too.
   * - ONE value per thing and name, made on first read.
   */
  waitedValue<Value>(thing: object, name: string, compute: () => Promise<Value>, follows?: () => unknown): Value {
    let values = WAITED_VALUES.get(thing)
    if (!values) WAITED_VALUES.set(thing, (values = new Map()))
    let value = values.get(name)
    if (!value) {
      value = newWaitedValue(compute, follows)
      values.set(name, value)
    }
    if (!answering) {
      if (getObserver()) value.isFollowed = true
      return value.read() as Value
    }
    if (answering.answers.has(value)) return answering.answers.get(value) as Value
    answering.needed.push(value)
    throw NOT_ANSWERED
  },

  /**
   * ONE object for `thing` and each of `parts`, the `thing` of a `waitedValue()` with a loop's item in it:
   * `rows={every review where its film is film}` is another read for each film, in the same words.
   * - The same object every time it's asked, so each read keeps its one value.
   * - A part may be a text or a number, as a loop's item may.
   */
  waitedValueKeyFor(thing: object, ...parts: unknown[]): object {
    let key = thing
    for (const part of parts) {
      let byPart = WAITED_VALUE_KEYS.get(key)
      if (!byPart) WAITED_VALUE_KEYS.set(key, (byPart = new Map()))
      let next = byPart.get(part)
      if (!next) byPart.set(part, (next = {}))
      key = next
    }
    return key
  },

  /**
   * `read`'s drawing, or a "…" until its first answer:  a value in a drawing that waits, `{the total}`.
   * - Failed:  a small "⚠" in its place, saying why when pointed at;  the drawing around it stays
   *   (one failed read once took the whole page down to the site's error page).
   */
  whileWaiting(read: () => Drawing): Drawing {
    return createComponent(Errored, {
      fallback: (error: () => unknown) => valueFailed(error()),
      get children() {
        return standInFor(read)
      }
    })
  },

  /**
   * `draw`, with what waits inside it looking as `said` says meanwhile:  an element's `loading="..."`, taken by
   * Spell when its value is quoted (`SpellJSX`), never handed to the element.
   * - `said`:  `"skeleton"`, `"spinner"`, `"none"`, or the words a spinner says, as `<for loading>` takes them
   *   (`lookSaid()`);  a skeleton with its own shape comes compiled (`lookOfWords()`).  Words alone keep the look
   *   around:  a skeleton announces them.
   * - `ownsState`:  the element has a loading state of its own (Spell UI's segment, card, section, tab, form,
   *   popup):  with a spinner, that state turns on while anything inside waits, instead of a second spinner inside it.
   * - Every loader inside reads it (`waitingLoader()`), nearest first;  none:  the site's, else a spinner.
   * - `riders`:  its `<loading>` and `<failed>`, what shows while what's inside waits, or once it failed
   *   (`the error` its words);  in its `loading` / `error` slots where it has them (`riders.slots`, Spell UI's panes),
   *   else in place of what waits, as a list's riders show.
   * - With a state of its own, a failure inside turns its `error` on, its words the error's (`OwnLoadingState`),
   *   and its Try again (`ui-retry`) reads again.
   */
  drawLooking(said: string, draw: () => Drawing, ownsState?: boolean, riders?: LookRiders): Drawing {
    const here = lookHere()
    const named = said ? lookSaid(said) : undefined
    // no look of its own, or words alone:  the look around, saying them;  a skeleton announces them
    const look: WaitingLook =
      !named || named.text ? { look: here.look, skeleton: here.skeleton, text: named?.text ?? here.text } : named
    const own = ownsState ? new OwnLoadingState(!!riders?.slots) : undefined
    const value: WaitingLook = { ...look, ...(own && { own }), ...(riders && { riders }) }
    return createComponent(
      WAITING_LOOK as never,
      {
        value,
        get children() {
          const drawing = draw()
          if (!own) return drawing
          const element = madeElement(drawing)
          if (element) own.element = element
          return (element ?? drawing) as Drawing
        }
      } as never
    ) as unknown as Drawing
  },

  /**
   * The answer of `thing`'s member `name`, once it has one:  what an action writes for reading what waits.
   * - The newest answer:  writes before the read count, and a change while it waits starts the wait again.
   * - A getter over one that waits works too:  it's read again with the answers.
   * - throws what the getter throws.
   */
  async answerOf(thing: unknown, name: string): Promise<any> {
    // in another waited value's work Solid is following the reads:  a flush there would be refused
    if (!getObserver()) core.flush()
    const answers = new Map<WaitedValue, unknown>()
    for (;;) {
      const { value, needed } = readWith(answers, thing, name)
      if (!needed.length) return value
      for (const each of needed) answers.set(each, await latestAnswer(each))
    }
  }
})
Object.assign(core, waitingMethods)

/** Forget `thing`'s value `name`:  the next read works it out afresh, as a value nobody's waiting for any more. */
export function forgetWaitedValue(thing: object, name: string): void {
  WAITED_VALUES.get(thing)?.delete(name)
}

/**
 * `read`'s drawing, or a stand-in until its first answer:  the "…" a value shows, unless `shows` makes another.
 * - `shows`:  made each time the stand-in shows, e.g. `waitingLoader`, for a part of a page that waits.
 */
export function standInFor(read: () => Drawing, shows?: () => Drawing): Drawing {
  return createComponent(Loading, {
    get fallback() {
      return shows ? shows() : core.message("waiting")
    },
    get children() {
      return read()
    }
  })
}

/** The look nearest:  `core.drawLooking()`'s, or a site's.  `null`:  none set. */
const WAITING_LOOK = createContext<WaitingLook | null>(null)

/** The look here:  read only with an owner (`useContext` needs one);  none set, a plain spinner. */
function lookHere(): WaitingLook {
  // oxlint-disable-next-line react-hooks/rules-of-hooks -- Solid's `useContext()` is no React hook:  any owner reads it
  const nearest = getOwner() ? useContext(WAITING_LOOK) : null
  return nearest ?? siteLook ?? { look: "spinner" }
}

/**
 * The running site's look (`drawnWithLook()`), for a loader no context reaches:  inside a view's own element, which
 * draws in a root of its own, so the site's context stops at its edge.
 */
let siteLook: WaitingLook | undefined

/**
 * A site's look for all it draws, `galaxy guide is a site with loading "skeleton"` (`SiteBase.draw()`).
 * - `said` is read each time a loader shows, so changing the site's line changes the next one.
 */
export function drawnWithLook(said: () => unknown, draw: () => Drawing): Drawing {
  const value = {
    get look() {
      return lookSaid(said()).look
    },
    get text() {
      return lookSaid(said()).text
    },
    get skeleton() {
      return lookSaid(said()).skeleton
    }
  } as WaitingLook
  siteLook = value
  onCleanup(() => {
    if (siteLook === value) siteLook = undefined
  })
  return createComponent(
    WAITING_LOOK as never,
    {
      value,
      get children() {
        return draw()
      }
    } as never
  ) as unknown as Drawing
}

/**
 * An element's own loading state (`core.drawLooking()`'s `ownsState`):  on while any loader inside it shows.
 * - Its `loading` attribute, Spell UI's:  set and taken off here, so it dims under its own spinner (`aria-busy` too).
 */
class OwnLoadingState {
  /** The element, once it's made:  a loader inside may show while it's being made. */
  private made?: Element
  /** How many loaders inside it show. */
  private showing = 0
  /** The failures inside it, newest last:  its `error` says the newest's words. */
  private readonly failures: string[] = []
  /** What's in its `loading` and `error` slots, by slot, while they show. */
  private readonly slotted = new Map<string, Element>()

  /** `hasSlots`:  it has `loading` and `error` slots (Spell UI's panes), which stand in for its content. */
  constructor(readonly hasSlots: boolean) {}

  set element(element: Element) {
    this.made = element
    // Try again, in its error pane:  read again
    element.addEventListener(RETRY_EVENT, () => void core.reloadSaved())
    // filled while it was being made
    for (const box of this.slotted.values()) if (box.parentNode !== element) element.append(box)
    this.apply()
  }

  /**
   * One more loader shows, until its owner goes:  the element's state on meanwhile;  `drawing`, if any, in its
   * `loading` slot (a skeleton, its `<loading>`).
   */
  hold(drawing?: () => Drawing): void {
    this.showing++
    const slotted = drawing && this.hasSlots ? this.slot(LOADING, drawing) : undefined
    this.apply()
    onCleanup(() => {
      this.showing--
      slotted?.remove()
      this.apply()
    })
  }

  /**
   * A failure inside it, until its owner goes:  its `error` on, saying `words`;  `drawing`, if any, in its `error`
   * slot (its `<failed>`).
   */
  fail(words: string, drawing?: () => Drawing): void {
    this.failures.push(words)
    const slotted = drawing && this.hasSlots ? this.slot(ERROR, drawing) : undefined
    this.apply()
    onCleanup(() => {
      this.failures.splice(this.failures.lastIndexOf(words), 1)
      slotted?.remove()
      this.apply()
    })
  }

  /** `drawing`, made and put in its slot `name`;  taken out again with `remove()`. */
  private slot(name: string, drawing: () => Drawing): { remove(): void } {
    const box = madeElement(h("div", { slot: name, style: "display: contents" }, drawing))!
    this.slotted.set(name, box)
    this.made?.append(box)
    return {
      remove: () => {
        box.remove()
        if (this.slotted.get(name) === box) this.slotted.delete(name)
      }
    }
  }

  /** Its states:  loading while anything inside waits, its error while anything failed. */
  private apply(): void {
    const element = this.made
    if (!element) return
    if (this.showing) element.setAttribute(LOADING, "")
    else element.removeAttribute(LOADING)
    const failure = this.failures.at(-1)
    if (failure !== undefined) element.setAttribute(ERROR, failure)
    else element.removeAttribute(ERROR)
  }
}

/**
 * An element's `<loading>` and `<failed>`, as Spell compiles them (`core.drawLooking()`).
 * - `slots`:  it has `loading` and `error` slots (Spell UI's panes), which they fill.
 */
export type LookRiders = {
  waiting?: () => Drawing
  failed?: (error: string) => Drawing
  slots?: boolean
}

/** What a failure inside an element whose look said shows (`drawRead()`'s default):  `undefined`, a list's own. */
export function failedHere(error: unknown, why: string): Drawing | undefined {
  // a read given up on as its drawing went away:  no failure of its element's
  if ((error as Error | undefined)?.name === "AbortError") return undefined
  const here = lookHere()
  const failed = here.riders?.failed as ((error: string) => Drawing) | undefined
  if (here.own) {
    here.own.fail(why, failed && (() => failed(why)))
    // in its error slot, or its own error look:  nothing here
    if (here.own.hasSlots || !failed) return null as unknown as Drawing
  }
  return failed ? failed(why) : undefined
}

/** Spell UI's error state, on an element that has one (the shared `error`). */
const ERROR = "error"

/** What an element's Try again dispatches (Spell UI's `StatePanes`). */
const RETRY_EVENT = "ui-retry"

/** Spell UI's loading state, on an element that has one. */
const LOADING = "loading"

/**
 * The shape of what's coming, which a skeleton takes when nothing gave it one:  `lines` (a list, a card's facts, a
 * tree), `image` (a picture, a chart, a graph), `page` (a heading over paragraphs).
 */
export type WaitingShape = "lines" | "image" | "page"

/** Each `WaitingShape`'s skeleton, in `SkeletonText`'s terms. */
const SHAPES: Readonly<Record<WaitingShape, SkeletonSpec>> = {
  lines: { parts: [{ shape: "paragraph" }] },
  image: { parts: [{ shape: "image" }] },
  page: { parts: [{ shape: "header" }, { shape: "paragraph", lines: 4 }, { shape: "paragraph" }] }
}

/** Tags that draw a picture, whose vocabulary may say no skeleton of its own:  an image's. */
const PICTURE_TAGS = new Set(["img", "picture", "svg", "canvas", "video"])

/**
 * What an element whose attributes wait stands in with (`core.drawWaiting()`):
 * - itself, empty, in its own loading state, when it has one and the look here is a spinner (`ownsState`)
 * - else the loader here:  a skeleton is `skeleton`, its vocabulary's (`<ui-root display="skeleton">`'s), given as
 *   it compiled, else an image's for a picture, else lines
 */
export function elementWaitingLoader(tag: string | undefined, ownsState?: boolean, skeleton?: SkeletonSpec): Drawing {
  const here = lookHere()
  if (ownsState && tag && here.look === "spinner" && !here.own)
    return h(tag, { [LOADING]: true, "aria-label": here.text }) as unknown as Drawing
  return waitingLoader(tag && PICTURE_TAGS.has(tag) ? "image" : "lines", undefined, skeleton)
}

/**
 * What a part of a drawing shows while it waits, as the look here says (`WaitingLook`):  Spell UI's spinner, in
 * the text's flow, by default.
 * - A list's (`<for>` with no `loading`), an element whose attributes wait, a view whose whole drawing waits.
 * - `shape`:  what's coming, for a skeleton;  `text`:  this loader's own words (`<for loading="...">`);
 *   `skeleton`:  the element's own skeleton, when the look here names none.
 * - In an element whose own loading state stands in (`WaitingLook.own`):  nothing here, that state on meanwhile.
 */
export function waitingLoader(shape: WaitingShape = "lines", text?: string, skeleton?: SkeletonSpec): Drawing {
  const here = lookHere()
  const said = text ?? here.text
  if (here.look === "none") return null as unknown as Drawing
  const rider = here.riders?.waiting as (() => Drawing) | undefined
  const skeletonLook = () => skeletonOf(here.skeleton ?? skeleton ?? SHAPES[shape], said)
  const drawn = rider ?? (here.look === "skeleton" ? skeletonLook : undefined)
  if (here.own && (here.own.hasSlots || !drawn)) {
    // its own loading state, and what it said in its loading slot
    here.own.hold(drawn)
    return null as unknown as Drawing
  }
  return drawn ? drawn() : spinner(said)
}

/** Spell UI's spinner, in the text's flow, saying `text` if there is one. */
function spinner(text: string | undefined): Drawing {
  return (text
    ? h("ui-loader", { visible: true, inline: true, text: true }, text)
    : h("ui-loader", { visible: true, inline: true })) as unknown as Drawing
}

/**
 * `spec` drawn:  Spell UI's `<ui-placeholder>`, as wide as its room, its shapes `SkeletonShapes`' (as
 * `<ui-root display="skeleton">` draws them).
 * - The placeholder is hidden from a screen reader:  the box around it says it's busy, and `text` if there is one.
 */
function skeletonOf(spec: SkeletonSpec, text: string | undefined): Drawing {
  const made = (shape: SkeletonShape): unknown =>
    h(
      shape.tag,
      {
        ...shape.attributes,
        ...(shape.style && {
          style: Object.entries(shape.style)
            .map(([name, value]) => `${name}: ${value}`)
            .join("; ")
        })
      },
      ...(shape.children ?? []).map(made)
    )
  const box = spec.width ? { fluid: false, style: `--ui-placeholder-max-width: ${spec.width}` } : { fluid: true }
  return h(
    "div",
    { class: "spell-waiting-skeleton", role: "status", "aria-busy": "true", "aria-label": text },
    h(SKELETON_TAGS.placeholder, box, ...SkeletonShapes.of(spec).map(made))
  ) as unknown as Drawing
}

/**
 * What a page shows while its whole drawing waits, under its layout's menus, which drew at once:  a bigger spinner
 * in the middle of the page's room, or the page's skeleton when the look here is one.
 */
export function pageWaitingLoader(): Drawing {
  const here = lookHere()
  if (here.look !== "spinner") return waitingLoader("page")
  return h(
    "div",
    { class: "spell-page-waiting", role: "presentation" },
    here.text
      ? h("ui-loader", { visible: true, inline: true, align: "center", size: "large", text: true }, here.text)
      : h("ui-loader", { visible: true, inline: true, align: "center", size: "large" })
  ) as unknown as Drawing
}

/** The element a drawing made, if it's one:  `h()` hands back a function that makes it. */
function madeElement(drawing: unknown): Element | undefined {
  let value = drawing
  while (typeof value === "function") value = (value as () => unknown)()
  return value instanceof Element ? value : undefined
}

/**
 * What a value that failed shows, `whileWaiting()`'s:  "⚠", why in its tooltip, and on the program's console.
 * - Nothing for an `AbortError`:  a read given up on as its drawing went away, as `drawingFailed()` says.
 */
function valueFailed(error: unknown): Drawing {
  if ((error as Error | undefined)?.name === "AbortError") return null as unknown as Drawing
  const why = error instanceof Error ? error.message : String(error)
  core.console.error("A value couldn't be read:", error)
  return h(
    "span",
    { class: "spell-draw-error", title: why, role: "alert" },
    core.message("value-failed")
  ) as unknown as Drawing
}

/** A new value, owned for good:  see `WAITING_OWNER`. */
function newWaitedValue<Value>(compute: () => Promise<Value>, follows?: () => unknown): WaitedValue {
  const value: WaitedValue = { read: () => undefined, compute }
  value.read = runWithOwner(WAITING_OWNER, () =>
    createRoot(() =>
      createDeferred(
        () => {
          try {
            follows?.()
          } catch (ignored) {
            // only to be followed:  `compute` says what's wrong when it reads it
          }
          return (value.latest = compute())
        },
        { lazy: true }
      )
    )
  ) as () => unknown
  return value
}

/** `thing`'s member `name`, read with `answers`:  its value, or the values it still needs to be read. */
function readWith(answers: Map<WaitedValue, unknown>, thing: unknown, name: string) {
  const outer = answering
  const needed: WaitedValue[] = []
  answering = { answers, needed }
  try {
    return { value: (thing as Record<string, unknown> | undefined)?.[name], needed }
  } catch (error) {
    if (error !== NOT_ANSWERED) throw error
    return { value: undefined, needed }
  } finally {
    answering = outer
  }
}

/** `value`'s newest answer:  started by a read, if nothing has run it yet, and again if a change starts another. */
async function latestAnswer(value: WaitedValue): Promise<unknown> {
  // `lazy`:  nothing draws it, so nothing runs it again, and its old answer stays:  an action asks for itself (epic `data` P11)
  if (!value.isFollowed) return value.compute()
  try {
    value.read()
  } catch (ignored) {
    // Solid's "not yet":  it's started
  }
  for (;;) {
    const latest = value.latest
    const answer = await latest
    if (value.latest === latest) return answer
  }
}
