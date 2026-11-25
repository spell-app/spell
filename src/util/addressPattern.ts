/**
 * Address patterns:  the ONE grammar for an address with parameters in it, e.g. `/films/:film`.
 * - The page server's router matches its routes with it (`SRV.compilePattern()`), and a running Spell site matches
 *   its pages' addresses with it (the core's `SiteBase`, epic `mockup` P2):  one matcher, so a pattern means the
 *   same thing in both.
 * - The grammar:
 *   - `/projects/list/:domainId` -- `:name` matches one segment
 *   - `/projects/file/:projectId/:filePath*` -- `:name*` matches the REST of the path, `/`s included
 *   - `/settings/:section?` -- `:name?` may be left out:  `/settings` matches too, with no `section`;  several may
 *     follow one another, `/library/:tab?/:view?`, each filled from the left, as Express does
 *   - `*` (alone, or as the last segment) -- anything;  lands in `params["0"]`
 *   - case-insensitive, and a trailing `/` is optional, as in Express
 * - Browser-safe, and imports nothing:  taken by file, `spell/util/addressPattern`, in no barrel.
 */

/** What a matched address's parameters hold, by name:  `{ film: "42" }`. */
export type AddressParams = Record<string, string>

/**
 * A matcher for address `pattern`, e.g. `/projects/file/:projectId/:filePath*`:
 * the parameters if a path matches, else `undefined`.
 * - Each parameter is percent-decoded.
 * - The matcher throws `URIError` when a parameter's encoding is bad:  the router turns that into a 400.
 */
export function compilePattern(pattern: string): (path: string) => AddressParams | undefined {
  const names: string[] = []
  const optional = new Set(optionalParamsOf(pattern))
  let source = ""
  if (pattern === "*") {
    source = "(.*)"
    names.push("0")
  } else {
    for (const segment of withoutTrailingSlash(pattern).split("/").slice(1)) {
      const param = PARAM.exec(segment)
      if (param) {
        names.push(param[1]!)
        source += param[2] === "*" ? "/(.+)" : param[2] === "?" ? "(?:/([^/]+))?" : "/([^/]+)"
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
    names.forEach((name, i) => {
      const part = match[i + 1]
      // a `:name?` left out has no value at all, as in Express;  `*` with nothing is `""`
      if (part !== undefined || !optional.has(name)) params[name] = decodeURIComponent(part ?? "")
    })
    return params
  }
}

/**
 * `pattern` with its parameters filled from `params`, each encoded:
 * `/films/:film` and `{ film: "a b" }` => `/films/a%20b`.
 * - A `:name*` parameter keeps its `/`s:  each of its parts is encoded on its own.
 * - A `:name?` parameter with no value is left out, its segment and all:  `/settings/:section?` => `/settings`.
 * - throws `TypeError`, naming it, when `params` has no value for one of its parameters that can't be left out,
 *   or for a `:name?` left out before one that's filled (`/library/:tab?/:view?` with a view and no tab):  the view
 *   would be read back as the tab
 */
export function filledPattern(
  pattern: string,
  params: Readonly<Record<string, string | number | boolean | null | undefined>> = {}
): string {
  let leftOut: string | undefined
  return (
    pattern
      .split("/")
      .flatMap((segment) => {
        const param = PARAM.exec(segment)
        if (!param) return [segment]
        const value = params[param[1]!]
        if (value === undefined || value === null || value === "") {
          if (param[2] === "?") {
            leftOut ??= param[1]
            return []
          }
          throw new TypeError(`filledPattern():  no value for \`:${param[1]}\` in \`${pattern}\`;  pass one`)
        }
        if (leftOut !== undefined)
          throw new TypeError(
            `filledPattern():  \`:${leftOut}\` left out before \`:${param[1]}\` in \`${pattern}\`;  give it a value`
          )
        const text = String(value)
        return [param[2] === "*" ? text.split("/").map(encodeURIComponent).join("/") : encodeURIComponent(text)]
      })
      .join("/") || "/"
  )
}

/** The parameters `pattern` names, in order:  `/films/:film/people/:person` => `film`, `person`. */
export function paramsOf(pattern: string): string[] {
  return pattern.split("/").flatMap((segment) => PARAM.exec(segment)?.[1] ?? [])
}

/** The parameters `pattern` may leave out, `:name?`, in order:  `/library/:tab?/:view?` => `tab`, `view`. */
export function optionalParamsOf(pattern: string): string[] {
  return pattern.split("/").flatMap((segment) => {
    const param = PARAM.exec(segment)
    return param?.[2] === "?" ? [param[1]!] : []
  })
}

/** The parameters `pattern` can't be left out without, in order:  `/films/:film/:tab?` => `film`. */
export function requiredParamsOf(pattern: string): string[] {
  return pattern.split("/").flatMap((segment) => {
    const param = PARAM.exec(segment)
    return param && param[2] !== "?" ? [param[1]!] : []
  })
}

/**
 * One segment that's a parameter, `:film`, `:rest*` or `:section?`:  its name, and whether it takes the rest (`*`) or
 * may be left out (`?`).
 */
const PARAM = /^:([\p{L}\p{N}_-]+)([*?])?$/u

/** `path` without a trailing `/` (but `/` stays `""`). */
function withoutTrailingSlash(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) : path
}

/** `text` with every character a regex reads as syntax escaped. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
