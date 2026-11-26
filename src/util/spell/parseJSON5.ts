import JSON5 from "json5"

import { parsedOrReported } from "./json"

/**
 * Parse JSON5, outputting a helpful error message (with surrounding lines) if it doesn't work.
 * - `context` is just a label for error output, e.g. filename `json5` came from.
 * - Re-throws `error` if encountered, unless `swallowError` is truthy, in which case returns `undefined`.
 * - Synchronous, so it brings the whole `json5` package into the caller's bundle:
 *   by file (`spell/util/spell/parseJSON5`), in no barrel, so a page that doesn't call it never loads it;
 *   a page reads JSON5 with `readJSON5()` (`spell/util`), which loads it on first use.
 */
export function parseJSON5(json5: string, context = "random text", swallowError?: boolean): unknown {
  return parsedOrReported(json5, context, swallowError, JSON5.parse)
}
