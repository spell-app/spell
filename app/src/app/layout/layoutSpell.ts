import { editor, runtimeUrl } from "spell/app/app/editor"
import { loadRuntime, type SpellRuntime } from "spell/app/app/runner/loadRuntime"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SP } from "spell/parser/spell"
import type { MenuItem } from "spell/parser/core"

/**
 * The editor's own layout pieces, written in Spell (`.spell`, epic `editor` P6, its first stage of turtles):
 * - The pieces are projects of the group `@spell/editor` (`app/spaces/@spell/editor/`, epic `editor` P22):
 *   a `.spell` file there is imported as its compiled javascript, as text:  `compiledSpell()`, in `vite.shared.ts`.
 * - It runs on the LAYOUT'S OWN copy of the runtime, never the one programs run on (`editor.loadRuntime()`):
 *   a program's run resets its runtime, lists every thing made on it in the Things tab, and writes on its console.
 *   - a build:  `loadRuntime()`, as each `<spell-viewer>` has its own
 *   - dev:  the same file with a query, which `runtimeCopyInDev()` (`vite.config.ts`) gives modules of its own:
 *     a `blob:` copy would still share them
 *   - every copy shares the page's one Solid and Spell UI
 * - NEVER imports `spell/parser/core` itself, the runtime's alone (`spellRuntime.ts`):  it'd be bundled here, a second copy.
 */

/** The query `runtimeCopyInDev()` follows, through the modules that hold a runtime's state. */
const DEV_COPY_QUERY = "?layout-copy"

/** The layout's copy of the runtime, and the URL compiled spell imports it by:  loaded once, as it's first asked for. */
function layoutRuntime(): Promise<{ runtime: SpellRuntime; coreUrl: string }> {
  loading ??= import.meta.env.DEV
    ? (import(/* @vite-ignore */ `${runtimeUrl()}${DEV_COPY_QUERY}`) as Promise<SpellRuntime>).then((runtime) => ({
        runtime,
        coreUrl: `${runtimeUrl()}${DEV_COPY_QUERY}`
      }))
    : loadRuntime(runtimeUrl())
  return loading
}
let loading: ReturnType<typeof layoutRuntime> | undefined

/** The group the editor's own pieces are projects of (epic `editor` P22). */
export const EDITOR_PIECES = "@spell/editor"

/**
 * Is this page the editor built from your DRAFTS of its pieces?  `?pieces=draft` in its address (epic `editor` P22):
 * what an editor piece's project shows in its app pane, a second editor in a frame, so the editor you're using never runs
 * a draft.
 */
export const isDraftEditor = new URLSearchParams(globalThis.location?.search ?? "").get("pieces") === "draft"

/**
 * What layout piece `compiled` exports, and how to draw one of its things.
 * - `piece`:  its project in `EDITOR_PIECES`, `editor-layout` ...:  in the draft editor (`isDraftEditor`), that project is
 *   compiled here, from your drafts, in place of `compiled`;  one that doesn't compile keeps `compiled`, and says why
 * - throws if the runtime or the piece can't load
 */
export async function loadLayoutPiece(compiled: string, piece?: string): Promise<LayoutPiece> {
  if (isDraftEditor && piece) compiled = (await draftOf(piece)) ?? compiled
  const { runtime, coreUrl } = await layoutRuntime()
  // The editor draws each piece where it belongs:  an app in one must not start itself, as a program's does
  runtime.core.appLayout = true
  return {
    exports: await runtime.importCompiled(compiled, coreUrl),
    draw: (thing) => runtime.core.drawThing(thing),
    menu: (thing, name) => runtime.core.menuOf(thing, name) ?? [],
    useTitles: (titles) => runtime.core.useTitles(titles)
  }
}

/**
 * Piece `piece`'s project compiled from your drafts, in the page;  `undefined` if it doesn't compile (said, as
 * `layoutPieceBroken()` says it).
 * - NEVER throws.
 */
async function draftOf(piece: string): Promise<string | undefined> {
  try {
    const project = new SP.SpellProject(`${EDITOR_PIECES}/${piece}`)
    await project.compile()
    if (project.compiled) return project.compiled
    layoutPieceBroken(piece, project.parseError ?? "")
  } catch (problem) {
    layoutPieceBroken(piece, problem instanceof Error ? problem.message : String(problem))
  }
  return undefined
}

/**
 * Say that the editor's piece `piece` (`editor-layout` ...) doesn't compile, so its last good compile is running:
 * the module the dev server writes for it calls this (`compiledSpell()`, `vite.shared.ts`;  epic `editor` P22).
 * - So a broken edit to the editor's own Spell never locks you out:  the editor still draws, and says why.
 * - NEVER throws.
 */
export function layoutPieceBroken(piece: string, problem: string): void {
  console.error(`The editor's piece ${piece} doesn't compile:`, problem)
  // once the page's first draw is under way, so the error shows where the editor shows errors
  queueMicrotask(() => editor.showError(appTexts.text("editorPieceBroken", { piece, problem })))
}

/** A layout piece, as `loadLayoutPiece()` answers it. */
export type LayoutPiece = {
  /** What its compiled javascript exports:  its classes, by their compiled names. */
  exports: Record<string, any>
  /** `thing`'s drawing, for Solid to insert. */
  draw: (thing: unknown) => unknown
  /** The items of `thing`'s menu `name`, in order. */
  menu: (thing: object, name: string) => MenuItem[]
  /** Show its titles in the page's language:  each English title's text in it (`appTexts.titles`). */
  useTitles: (titles: Record<string, string>) => void
}
