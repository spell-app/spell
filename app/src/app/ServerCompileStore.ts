import { SP } from "spell/parser/spell"

/****************
 * ### `ServerCompileStore`
 * Where the editor keeps what its projects compiled to:  the page server's compile cache, `/api/compiles`
 * (on disk in `~/.spell/cache/compiles`;  epic `language` P27) -- see `SP.CompileCache`.
 * - So a reload of the editor doesn't compile a project that hasn't changed since it last did:
 *   it takes what that compile wrote.
 * - Every entry is filed under the compiler's version, which the server works out from the compiler's code
 *   (its `/version`, asked once):  the compiler this page loaded.
 *   A newer compiler on the server takes no entry of ours, and has none of its own yet.
 * - Not in the static build:  it has no page server.
 ****************/
export class ServerCompileStore implements SP.CompileCacheStore {
  /** Where the page server answers, `/api/compiles`. */
  readonly base: string
  /** The compiler's version, as the server said it when we first asked. */
  private version: Promise<string> | undefined

  constructor(base = COMPILES_API) {
    this.base = base
  }

  /** Install a compile cache on this store, for every project's `compile()`;  returns it. */
  static install(): SP.CompileCache {
    const cache = new SP.CompileCache(new ServerCompileStore())
    SP.SpellProject.compileCache = cache
    return cache
  }

  /** Entry `key`'s text, or `undefined` if the server has none. */
  async get(key: string): Promise<string | undefined> {
    const response = await fetch(`${this.base}/${await this.versionNow()}/${key}`)
    if (response.status === 404) return undefined
    if (!response.ok) throw new Error(`ServerCompileStore.get():  ${response.status} for ${key}`)
    return await response.text()
  }

  /** Keep `text` as entry `key`.  A 409 (the server's compiler moved on) keeps nothing, quietly. */
  async put(key: string, text: string): Promise<void> {
    const response = await fetch(`${this.base}/${await this.versionNow()}/${key}`, {
      method: "PUT",
      headers: { "content-type": "text/plain" },
      body: text
    })
    if (!response.ok && response.status !== 409) {
      throw new Error(`ServerCompileStore.put():  ${response.status} for ${key}`)
    }
  }

  /** The compiler's version, asked of the server the first time. */
  private versionNow(): Promise<string> {
    this.version ??= fetch(`${this.base}/version`).then(async (response) => {
      if (!response.ok) throw new Error(`ServerCompileStore:  no compiler version (${response.status})`)
      return ((await response.json()) as { version: string }).version
    })
    // asked again next time, if it failed
    this.version.catch(() => (this.version = undefined))
    return this.version
  }
}

/** The page server's compile cache. */
const COMPILES_API = "/api/compiles"
