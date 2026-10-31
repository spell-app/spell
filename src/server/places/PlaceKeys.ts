/****************
 * ### `PlaceKeys`
 * The keys a server side holds for its places, by name (epic `data` Q11):  a program names one, and only this knows it.
 *
 * ```ts
 * const keys = new PlaceKeys({ names: ["COOKBOOK_KEY"] })   // from the environment
 * new RestPlace({ url, keyNamed: "COOKBOOK_KEY", keyFrom: keys.keyNamed })
 * ```
 *
 * - `PlaceServer` runs every answer through `scrubbed()`, so a service that echoes a key can't send it on to a browser.
 * - Never prints:  turned to JSON or a string, it's only the names.
 ****************/
export class PlaceKeys {
  /** Each key, by its name. */
  private readonly keys: Map<string, string>

  constructor({ names = [], from = process.env }: PlaceKeysProps = {}) {
    const entries = names.flatMap((name) => {
      const key = from[name]
      return key ? [[name, key] as const] : []
    })
    this.keys = new Map(entries)
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

  /**
   * `text`, with every key in it replaced by its name.
   * - As written in JSON too:  a key with a line end in it doesn't look like itself inside an answer.
   */
  scrubbed(text: string): string {
    let clean = text
    for (const [name, key] of this.keys) {
      const inJson = JSON.stringify(key).slice(1, -1)
      clean = clean.replaceAll(key, `[the key ${name}]`).replaceAll(inJson, `[the key ${name}]`)
    }
    return clean
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
  /** Where they're found;  default the environment. */
  from?: Readonly<Record<string, string | undefined>>
}
