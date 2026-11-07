/**
 * Address patterns:  the ONE grammar for an address with parameters in it, e.g. `/films/:film`.
 * - The page server's router matches its routes with it (`SRV.compilePattern()`), and a running Spell site matches
 *   its pages' addresses with it (the core's `SiteBase`, epic `mockup` P2):  one matcher, so a pattern means the
 *   same thing in both.
 * - The grammar:
 *   - `/projects/list/:domainId` -- `:name` matches one segment
 *   - `/projects/file/:projectId/:filePath*` -- `:name*` matches the REST of the path, `/`s included
 *   - `*` (alone, or as the last segment) -- anything;  lands in `params["0"]`
 *   - case-insensitive, and a trailing `/` is optional, as in Express
 * - Browser-safe, and imports nothing:  taken by file, `spell/util/addressPattern`, in no barrel.
 */

/** What a matched address's parameters hold, by name:  `{ film: "42" }`. */
export type AddressParams = Record<string, string>

/**
 * A matcher for address `pattern`, e.g. `/projects/file/:projectId/:filePath*`:  the parameters if a path matches,
 * else `undefined`.
 * - Each parameter is percent-decoded.
 * - The matcher throws `URIError` when a parameter's encoding is bad:  the router turns that into a 400.
 */
export function compilePattern(pattern: string): (path: string) => AddressParams | undefined {
  const names: string[] = []
  let source = ""
  if (pattern === "*") {
    source = "(.*)"
    names.push("0")
  } else {
    for (const segment of withoutTrailingSlash(pattern).split("/").slice(1)) {
      const param = PARAM.exec(segment)
      if (param) {
        names.push(param[1]!)
        source += param[2] ? "/(.+)" : "/([^/]+)"
      } else if (segment === "*") {
        names.push("0")
        source += "(?:/(.*))?"
      } else source += `/${escaped(segment)}`
    }
  }
  const regex = new RegExp(`^${source}/?$`, "i")
  return (path) => {
    const match = regex.exec(path)
    if (!match) return undefined
    const params: AddressParams = {}
    names.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1] ?? "")))
    return params
  }
}

/**
 * `pattern` with its parameters filled from `params`, each encoded:  `/films/:film` and `{ film: "a b" }` =>
 * `/films/a%20b`.
 * - A `:name*` parameter keeps its `/`s:  each of its parts is encoded on its own.
 * - throws `TypeError`, naming it, when `params` has no value for one of its parameters
 */
export function filledPattern(
  pattern: string,
  params: Readonly<Record<string, string | number | boolean | null | undefined>> = {}
): string {
  return pattern
    .split("/")
    .map((segment) => {
      const param = PARAM.exec(segment)
      if (!param) return segment
      const value = params[param[1]!]
      if (value === undefined || value === null || value === "") {
        throw new TypeError(`filledPattern():  no value for \`:${param[1]}\` in \`${pattern}\`;  pass one`)
      }
      const text = String(value)
      return param[2] ? text.split("/").map(encodeURIComponent).join("/") : encodeURIComponent(text)
    })
    .join("/")
}

/** The parameters `pattern` names, in order:  `/films/:film/people/:person` => `film`, `person`. */
export function paramsOf(pattern: string): string[] {
  return pattern.split("/").flatMap((segment) => PARAM.exec(segment)?.[1] ?? [])
}

/** One segment that's a parameter, `:film` or `:rest*`:  its name, and whether it takes the rest. */
const PARAM = /^:([\p{L}\p{N}_-]+)(\*)?$/u

/** `path` without a trailing `/` (but `/` stays `""`). */
function withoutTrailingSlash(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) : path
}

/** `text` with every character a regex reads as syntax escaped. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
