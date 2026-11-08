/**
 * `spell place nerd <file> [--output foo.svg | foo.json] [--columns 3]`:  a place's NERD, as a file (epic `mockup` P14,
 * Owen's note on J40).
 * - Reads what `spell place ingest` wrote of the place, its `<Name>.api.json5`;  named by it, or by its `.api.spell`.
 * - `PlaceNerd` makes the NERD skill's spec;  `.json` writes that, `.svg` lays it out and draws it
 *   (util's `DiagramLayout` and `DiagramSVG`, the same drawing the site editor's Data tab shows and saves).
 * - No `--output`:  the spec, as JSON, printed.
 * - Node only:  it reads and writes files.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs"

import JSON5 from "json5"

import { DiagramLayout } from "spell/util/diagram/DiagramLayout"
import { DiagramSVG } from "spell/util/diagram/DiagramSVG"
import { CLI } from "spell/cli"
import { PlaceNerd } from "spell/parser/spell/ingest/PlaceNerd"
import type { PlaceDescriptionOnDisk } from "spell/parser/spell/ingest/ingest.types"

/** What `spell place nerd` takes. */
export type PlaceNerdOptions = {
  /** where to write it:  `.svg` draws it, `.json` the spec;  none prints the spec */
  output?: string
  /** its most columns, 3 unless it says */
  columns?: string
}

/**
 * Write the NERD of the place `file` describes.
 * - throws a `CLI.CliError` for a file it can't find or read, or an output that's neither `.svg` nor `.json`
 */
export function placeNerd(file: string, { output, columns }: PlaceNerdOptions): number {
  const description = readDescription(descriptionFileFor(file))
  const spec = PlaceNerd.of(description, columns ? { columns: Number(columns) } : {})
  if (!output) {
    process.stdout.write(`${JSON.stringify(spec, null, 2)}\n`)
    return 0
  }
  if (SVG_FILE.test(output)) writeFileSync(output, DiagramSVG.of(DiagramLayout.of(spec)))
  else if (JSON_FILE.test(output)) writeFileSync(output, `${JSON.stringify(spec, null, 2)}\n`)
  else throw new CLI.CliError(`spell place nerd:  --output must end in .svg or .json, not "${output}"`)
  process.stdout.write(`wrote ${output}\n`)
  return 0
}

/** The description beside `file`:  itself when it's one, else its `.api.json5` twin. */
function descriptionFileFor(file: string): string {
  const described = file.replace(SPELL_FILE, ".json5")
  if (!existsSync(described)) {
    throw new CLI.CliError(
      `spell place nerd:  no description at ${described};  run \`spell place ingest\` to write one`
    )
  }
  return described
}

/** The description in `file`, as the ingester wrote it. */
function readDescription(file: string): PlaceDescriptionOnDisk {
  try {
    return JSON5.parse(readFileSync(file, "utf8")) as PlaceDescriptionOnDisk
  } catch (error) {
    throw new CLI.CliError(`spell place nerd:  can't read ${file}:  ${(error as Error).message}`)
  }
}

/** A place's Spell file's ending, which its description shares but for `.json5`. */
const SPELL_FILE = /\.spell$/
/** An output that's a drawing. */
const SVG_FILE = /\.svg$/i
/** An output that's the spec. */
const JSON_FILE = /\.json$/i
