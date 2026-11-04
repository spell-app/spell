/**
 * Sample records made from what a class declares, for a sample with no real place to copy from (epic `data` P9).
 *
 * ```ts
 * await useSample(places, "cookbook", { rowsFromType: (type) => rowsMadeFrom(things.classNamed(type)) })
 * ```
 *
 * - By file, `spell/parser/core/placeSamples`, in no barrel:  what a built app loads never imports it, so it can't ship.
 * - Only what's declared:  a class that declares nothing makes rows with nothing in them.
 * - A thing's type has no default to make up, so a property holding a thing is left out.
 * - Its `id` is left out too:  the sample gives each record one.
 */
import { schemaOf, type PropInfo, type Schema } from "spell/util"
import type { PlaceRow } from "spell/util/places/places.types"

import { kindOf } from "./checking"

/** How many rows it makes. */
const ROWS_MADE = 5

/**
 * A few made-up rows of `Class`, each with something in every property it declares.
 * - `undefined` for no class:  so a read naming no known type gets none.
 */
export function rowsMadeFrom(Class: Function | undefined, count = ROWS_MADE): PlaceRow[] | undefined {
  if (!Class) return undefined
  const declared = declaredProps(schemaOf(Class))
  return Array.from({ length: count }, (_row, index) => {
    const row: PlaceRow = {}
    for (const [name, info] of declared) {
      if (name === "id") continue
      const value = madeUpValue(name, info, index + 1)
      if (value !== undefined) row[name] = value
    }
    return row
  })
}

/** Everything `schema` declares, its parents' first. */
function declaredProps(schema: Schema): Map<string, PropInfo> {
  return new Map([...(schema.parent ? declaredProps(schema.parent) : []), ...schema.declared])
}

/** Something for `name` to hold, in row `number`:  `undefined` when there's nothing to make up. */
function madeUpValue(name: string, info: PropInfo, number: number): unknown {
  const made = kindOf(info)
  if ("oneOf" in made && made.oneOf?.length) return made.oneOf[(number - 1) % made.oneOf.length]
  switch (made.kind) {
    case "text":
      return `Sample ${name} ${number}`
    case "number":
      return number
    case "choice":
      return number % 2 === 1
    case "date":
      return new Date(Date.UTC(2026, 0, number)).toISOString()
    case "list":
      return []
    default:
      return undefined
  }
}
