/**
 * JSON utilities.
 * - `readJSON5()` loads the `json5` package the first time it's called, so a page that reads no JSON5 at once
 *   (a cloud app's first files) doesn't download it.
 * - NEVER imports `json5` itself:  its browser build is CommonJS, which a bundler keeps whole wherever it's imported,
 *   used or not, so it rode in every page that loads `spell/util` (7.5 KB brotli of a cloud app's first files).
 *   Its synchronous twin, `parseJSON5()`, is a file of its own, by file and in no barrel, for node and the editor.
 */

/**
 * Parse JSON, outputting a helpful error message (with surrounding lines) if it doesn't work.
 * - `context` is just a label for error output, e.g. filename `json` came from.
 * - Re-throws `error` if encountered, unless `swallowError` is truthy, in which case returns `undefined`.
 */
export function parseJSON(json: string, context = "random text", swallowError?: boolean): unknown {
  return parsedOrReported(json, context, swallowError, JSON.parse)
}

/**
 * `parseJSON5()`, with the `json5` package loaded on first use:  what a page reads JSON5 with (`$fetch()`'s
 * `format: "json5"`, a site's theme file).
 * - the same errors as `parseJSON5()`
 */
export async function readJSON5(json5: string, context = "random text", swallowError?: boolean): Promise<unknown> {
  const { default: loaded } = await import("json5")
  return parsedOrReported(json5, context, swallowError, loaded.parse)
}

/**
 * `parse(text)`;  on a failure, the lines around where it failed logged with `context`, then the error rethrown,
 * or `undefined` with `swallowError`.
 * - `parseJSON()`'s, `readJSON5()`'s and `parseJSON5()`'s one way of saying where text failed to parse
 */
export function parsedOrReported(
  text: string,
  context: string,
  swallowError: boolean | undefined,
  parse: (text: string) => unknown
): unknown {
  try {
    return parse(text)
  } catch (error) {
    // Try to figure out the line number of the error
    const message = error instanceof Error ? error.message : String(error)
    const match = message.match(/at position (\d+)/)
    if (match) {
      const charIndex = parseInt(match[1], 10)
      const prefix = text.substring(0, charIndex)
      const lineNumber = Math.max(0, prefix.split("\n").length - 2)
      console.error(`Error parsing JSON near line ${lineNumber} of ${context}`)
      const start = Math.max(0, lineNumber - 3)
      const end = start + 6
      console.log(text.split("\n").slice(start, end).join("\n"))
    }
    if (!swallowError) throw error
    return undefined
  }
}
