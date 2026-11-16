import { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"

/****************
 * ### `AppAddresses`
 * How the app's code editors address files:  `spell:/<file.path>`, e.g. `spell:/@spell/examples/Solitaire/Solitaire.spell`.
 * - ONE rule for every editor of the app (Monaco's, the CodeMirror test's) and the scope explorer's packs,
 *   which point back at the files with it.
 * - Every file the app's Monaco shows has a model at this address (`SpellModels`).
 * - Only files we already know:  `fileFor()` looks in `SpellFile.registry`, it never makes one.
 * - Plain string work, no editor's URI class:  the path written as `encodeURI()` writes it, `#` and `?` escaped too,
 *   so it stays one path when parsed.
 *   - `pathOf()` reads it back from any spelling of it, Monaco's too (its `%40` for `@`).
 ****************/
export class AppAddresses implements LSP.FileAddresses {
  /** Address scheme for the app's files. */
  static SCHEME = "spell"

  /** Address of the file at `path`, of any kind:  `spell:/@spell/examples/Solitaire/Solitaire.spell`. */
  static uriOf(path: string): string {
    return `${AppAddresses.SCHEME}:/${encodeURI(path).replace(/[#?]/g, (char) => encodeURIComponent(char))}`
  }

  /**
   * `file.path` an address is for, or `undefined` if it isn't one of ours.
   * - `uri`:  an address as text, or an editor's parsed one (its `scheme` and `path`, as Monaco's `Uri` has them).
   * - A line after it (`#L12`) or a query isn't part of the path.
   */
  static pathOf(uri: string | { scheme: string; path: string }): string | undefined {
    if (typeof uri !== "string") return uri.scheme === AppAddresses.SCHEME ? uri.path.slice(1) : undefined
    const path = APP_ADDRESS.exec(uri)?.[1]
    if (path === undefined) return undefined
    try {
      return decodeURIComponent(path)
    } catch {
      return undefined
    }
  }

  fileFor(uri: string): SP.SpellFile | undefined {
    const path = AppAddresses.pathOf(uri)
    return path === undefined ? undefined : SP.SpellFile.registry.get(path)
  }

  uriFor(file: SP.SpellFile | SP.SpellJSFile | SP.SpellProject): string {
    return AppAddresses.uriOf(file.path)
  }
}

/** An app address, its path the match:  `spell:/<path>`, or `spell:///<path>` (an empty host), before any `?` or `#`. */
const APP_ADDRESS = /^spell:\/(?:\/\/)?([^?#]*)/
