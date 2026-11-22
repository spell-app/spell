/**
 * Loading a copy of `spell-runtime.js` of its own for each `<spell-viewer>` -- see `spellRuntime.ts`.
 * - A copy an app let go of is handed to the next (`RuntimeCopies`):  the browser never frees a module.
 * - The browser keeps one module per URL, so a copy needs a URL of its own:
 *   we fetch the runtime's text ONCE per page, then import it from a new `blob:` URL per copy.
 * - Its imports of the bundle's shared chunks, e.g. the page's Solid through `spell-solid-shared.js`, are relative,
 *   which a `blob:` URL can't resolve:  so they're made absolute first.
 *   Every copy then shares those chunks.
 * - So they MUST hold nothing a copy keeps of its own:  `core`, and the runner.
 *   Every build puts those in `spell-runtime.js` alone
 *   (the editor's:  `runtimeOwnCoreInBuild()`, in `vite.config.ts`).
 *   - In a shared chunk, every copy shared ONE `core`, and the last loaded took it over.
 *   - Pinned by `build.test.ts` and `element.build.test.ts`.
 */
import { $fetch } from "spell/util"

import type * as SpellRuntimeModule from "./spellRuntime"

/**
 * A copy of the runtime at `url` of its own, and the `blob:` URL it's loaded from -- the app's `@spell/core`.
 * - Call `release()` when done with it:  the copy goes back to the pool, for the next to take (`RuntimeCopies`).
 * - A copy from the pool once ran another app:  its app is taken down as it's released,
 *   and the next run starts its runtime afresh (`runCompiled()`), as a recompile of another program does.
 */
export function loadRuntime(url: string): Promise<LoadedRuntime> {
  return runtimeCopies.take(url, async () => {
    let source = sources.get(url)
    if (!source) sources.set(url, (source = fetchRuntime(url)))
    const coreUrl = URL.createObjectURL(new Blob([await source], { type: "text/javascript" }))
    const runtime = (await import(/* @vite-ignore */ coreUrl)) as SpellRuntime
    return { runtime, coreUrl }
  })
}

/** A copy of the runtime, as `loadRuntime()` answers it. */
export type LoadedRuntime = RuntimeCopy & {
  /** Hand the copy back, once the app's gone:  the next `loadRuntime()` of its URL takes it.  Once only. */
  release: () => void
}

/** A copy of the runtime, loaded:  what `RuntimeCopies` keeps. */
export type RuntimeCopy = {
  /** The copy's exports -- its own `core`, and `runApp()`. */
  runtime: SpellRuntime
  /** `blob:` URL it was loaded from -- what the app's `@spell/core` points at. */
  coreUrl: string
}

/**
 * The runtime copies no app runs on now, by the URL they're from:  the next app takes one, rather than load another
 * (epic `solid-2-final` P10, TLDR 42).
 * - A copy is a module, and the browser never lets go of a module:  a page that swaps its `<spell-viewer>`s,
 *   e.g. a guide's demos, loaded a copy per swap, each about 394 KB of code and its own memory, kept for good.
 *   Now it holds as many as were ever showing at once.
 * - Its `coreUrl` stays live:  the next app's program imports it.
 * - Not shared while in use:  each app still has a copy of its own (Q24, A).
 * - Plain:  no Solid, no DOM of its own.
 */
export class RuntimeCopies {
  /**
   * A copy from the pool, else a new one from `load()`;  its `release()` hands it back, taking its app down first.
   * - throws what `load()` throws
   */
  async take(url: string, load: () => Promise<RuntimeCopy>): Promise<LoadedRuntime> {
    const copy = this.idle.get(url)?.pop() ?? (await load())
    let isReleased = false
    return {
      ...copy,
      release: () => {
        if (isReleased) return
        isReleased = true
        try {
          copy.runtime.unmountApp()
        } catch (ignored) {
          // its app's own cleanup threw:  the next run resets the copy all the same
        }
        const idle = this.idle.get(url) ?? []
        idle.push(copy)
        this.idle.set(url, idle)
      }
    }
  }

  /** How many copies of `url` are waiting to be taken. */
  idleCount(url: string): number {
    return this.idle.get(url)?.length ?? 0
  }

  /** the copies waiting, by URL */
  private idle = new Map<string, RuntimeCopy[]>()
}

/** The page's runtime copies -- see `RuntimeCopies`. */
const runtimeCopies = new RuntimeCopies()

/** What `spell-runtime.js` exports -- see `spellRuntime.ts`. */
export type SpellRuntime = typeof SpellRuntimeModule

/**
 * `source` with its relative imports made absolute against `url`, so it runs from a `blob:` URL.
 * - e.g. `from "./spell-solid-shared.js"`, `import("./x.js")`, and the dev server's `from "/src/app/runner/x.ts"`
 * - `import.meta.url` is `url` too:  the places' chunk is loaded lazily, by its neighbours (epic `data` P11).
 * - Pure.
 */
export function absoluteImports(source: string, url: string): string {
  const absolute = source.replace(RELATIVE_IMPORT, (_whole, before: string, quote: string, specifier: string) => {
    return `${before}${quote}${new URL(specifier, url).href}${quote}`
  })
  // a `blob:` URL is no base for anything:  a lazy chunk's preload asks `import.meta.url` where its neighbours are
  return absolute.replaceAll("import.meta.url", JSON.stringify(url))
}

/**
 * A relative specifier in an `import`:  what's before it, its quote, then it.
 * - From the server's root too, `/src/app/...`:  the dev server writes its modules' imports so (`/@vite/client`),
 *   and a `blob:` URL can't resolve those either (the run page's copy in dev, epic `solid-2-final` P12).
 */
const RELATIVE_IMPORT = /(\bfrom\s*|\bimport\s*\(?\s*)(["'`])(\.{0,2}\/(?!\/)[^"'`]+)\2/g

/** Text of each runtime fetched, by URL -- fetched once per page. */
const sources = new Map<string, Promise<string>>()

/** Text of the runtime at `url`, its imports made absolute;  throws `$fetch()`'s error when it can't load. */
async function fetchRuntime(url: string): Promise<string> {
  return absoluteImports(await $fetch<string>({ url }), url)
}
