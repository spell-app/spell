import { SRV } from "spell/server"

/****************
 * ### `PlaceKeys`
 * The keys a server side holds for its places, by name (epic `data` Q11):  a program names one, and only this knows it.
 *
 * ```ts
 * const keys = new PlaceKeys({ names: ["COOKBOOK_KEY"] })   // from the environment, else the secrets kept
 * new RestPlace({ url, keyNamed: "COOKBOOK_KEY", keyFrom: keys.keyNamed })
 * ```
 *
 * - `PlaceServer` runs every answer through `scrubbed()`, so a service that echoes a key can't send it on to a browser.
 * - A key not in the environment is read from the secrets you've typed in once (`SRV.Secrets`, `~/.spell/secrets/`).
 * - Never prints:  turned to JSON or a string, it's only the names.
 ****************/
export class PlaceKeys {
  /** Each key, by its name. */
  private readonly keys: Map<string, string>
  /** The names asked for, set or not:  for `missing()`. */
  private readonly names: readonly string[]

  constructor({ names = [], from = new SRV.Secrets().withEnvironment() }: PlaceKeysProps = {}) {
    const entries = names.flatMap((name) => {
      const key = from[name]
      return key ? [[name, key] as const] : []
    })
    this.keys = new Map(entries)
    this.names = names
  }

  /**
   * The names it was asked for that aren't set, in their order:  what the page server says as it starts.
   * - Only names:  never a value.
   */
  missing(): string[] {
    return this.names.filter((name) => !this.keys.has(name))
  }

  /** The key by this name;  `undefined` if it isn't set.  Handed to a place as `keyFrom`. */
  keyNamed = (name: string): string | undefined => this.keys.get(name)

  /**
   * Hold something made from a key, as secret as the key:  scrubbed from every answer from now on.
   * - Under one name there's only ever the latest:  a token that's replaced stops being worth anything.
   */
  hold(name: string, secret: string): void {
    this.keys.set(name, secret)
  }

  /** `text`, with every key in it replaced by its name:  `[the key COOKBOOK_KEY]` (`SRV.scrubbed()`). */
  scrubbed(text: string): string {
    return SRV.scrubbed(text, this.keys)
  }

  /** Only the names. */
  toJSON(): string[] {
    return [...this.keys.keys()]
  }

  /** Only the names. */
  toString(): string {
    return `PlaceKeys(${this.toJSON().join(", ")})`
  }

  /** Only the names, for `console.log()`. */
  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return this.toString()
  }
}

/** Constructor props of `PlaceKeys`. */
export type PlaceKeysProps = {
  /** The names of the keys to hold. */
  names?: readonly string[]
  /** Where they're found;  default the environment, else the secrets kept (`SRV.Secrets`). */
  from?: Readonly<Record<string, string | undefined>>
}
