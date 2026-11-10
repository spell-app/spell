import { homedir } from "node:os"
import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { EngineFiles } from "spell/epic/config/EngineFiles.mjs"

/****************
 * ### `LayeredSettings`
 * How the epic tooling BEHAVES for you, from up to three files of the same name and shape, `epic_settings.json5`,
 * merged key by key, the later winning (epic `epic-engine` I235;  Owen, 2026-11-08:  "settable per developer"):
 *   1. the default:  the kit's own, `epic/epic_settings.json5`, every key with its value
 *   2. the org:  at the root of the epic repo (`EpicConfig.contentFolder`), checked in there;  optional
 *   3. the developer:  `~/.spell/epic_settings.json5`, in no repo;  optional
 *
 * ```ts
 * const settings = LayeredSettings.read(config.contentFolder)
 * settings.values.away.finishedPhaseDays               // => 3
 * settings.sourceOf("away.finishedPhaseDays")          // => "developer"
 * ```
 *
 * - NOT `.epic/config.json5` (`EpicConfig`), which says WHERE a repo keeps things, the same for everyone:
 *   this one says how things behave, and each person may differ.
 * - The keys and their shape:  `LayeredValues`;  `epic settings` prints what's in force and where each came from.
 * - NEVER throws:  an unreadable file or a bad value is logged once (stderr), kept in its layer's `problems`, and
 *   the layer below stands.
 *   - a key no layer knows is skipped silently, so an older checkout reads a newer file
 *   - the kit's own file unreadable:  `BUILT_IN`, the same values
 * - Read fresh by `read()`:  nothing is cached, so an edit to a file counts at once.
 * - Node only:  NOT in the `spell-epic` barrel, imported by path (`spell/epic/config/LayeredSettings`).
 * - Its position:  node's own modules and the kit's `DataFile`, so plain `node` can load it.
 ****************/
export class LayeredSettings {
  /** Every layer's file name. */
  static readonly FILE = "epic_settings.json5"

  /** The values if the kit's own file can't be read;  and what says which keys there are, and their types. */
  static readonly BUILT_IN: LayeredValues = { away: { finishedPhaseDays: 3 } }

  /** The kit's own file:  worked out when read, as `EpicConfig.ENGINE_VOICES` is. */
  static get DEFAULT_FILE(): string {
    return EngineFiles.path(LayeredSettings.FILE)
  }

  /** The layers, lowest first. */
  readonly layers: SettingsLayer[]

  /** The merged values. */
  readonly values: LayeredValues = structuredClone(LayeredSettings.BUILT_IN)

  /** Which layer set each key (`away.finishedPhaseDays`). */
  private readonly sources = new Map<string, SettingsSource>()

  /**
   * The settings in force, reading the three files now.
   * - `content`:  the epic repo's folder;  `undefined`:  no org layer
   * - `home`:  the folder holding `.spell/`:  a test's own
   */
  static read(content: string | undefined, { home = homedir() }: { home?: string } = {}): LayeredSettings {
    return new LayeredSettings([
      { name: "default", file: LayeredSettings.DEFAULT_FILE },
      ...(content ? [{ name: "org" as const, file: join(content, LayeredSettings.FILE) }] : []),
      { name: "developer", file: join(home, ".spell", LayeredSettings.FILE) }
    ])
  }

  private constructor(layers: Pick<SettingsLayer, "name" | "file">[]) {
    this.layers = layers.map((layer) => this.apply(layer))
  }

  /** Which layer set `key` (`away.finishedPhaseDays`);  `built-in` when the kit's own file couldn't say. */
  sourceOf(key: string): SettingsSource {
    return this.sources.get(key) ?? "built-in"
  }

  /** Every key in force, dotted, with its value and the layer it came from. */
  get entries(): SettingsEntry[] {
    const entries: SettingsEntry[] = []
    const walk = (values: SettingsTree, prefix: string) => {
      for (const [name, value] of Object.entries(values)) {
        const key = `${prefix}${name}`
        if (isTree(value)) walk(value, `${key}.`)
        else entries.push({ key, value, source: this.sourceOf(key) })
      }
    }
    walk(this.values, "")
    return entries
  }

  /** Read `layer`'s file and lay it over the values so far;  returns the layer, with what it found. */
  private apply({ name, file }: Pick<SettingsLayer, "name" | "file">): SettingsLayer {
    const layer: SettingsLayer = { name, file, found: false, problems: [] }
    let raw: unknown
    try {
      raw = DataFile.read<unknown>(file)
    } catch (error) {
      this.problem(layer, `can't read it:  ${(error as Error).message}`)
      return layer
    }
    if (raw === undefined) return layer
    layer.found = true
    if (isTree(raw)) this.merge(this.values, raw, LayeredSettings.BUILT_IN, "", layer)
    else this.problem(layer, "it isn't an object of settings")
    return layer
  }

  /** Lay `raw` over `values`, key by key, by the shape of `schema`;  a bad value leaves the one below. */
  private merge(values: SettingsTree, raw: SettingsTree, schema: SettingsTree, prefix: string, layer: SettingsLayer) {
    for (const [name, wanted] of Object.entries(schema)) {
      if (!(name in raw)) continue
      const key = `${prefix}${name}`
      const given = raw[name]
      if (isTree(wanted)) {
        if (isTree(given)) this.merge(values[name] as SettingsTree, given, wanted, `${key}.`, layer)
        else this.problem(layer, `${key} should be an object of settings`)
      } else if (isValidValue(given, wanted)) {
        values[name] = given
        this.sources.set(key, layer.name)
      } else {
        this.problem(layer, `${key}:  ${JSON.stringify(given)} isn't a ${describeValue(wanted)}`)
      }
    }
  }

  /** Note `problem` on `layer`, and say it on stderr once per process. */
  private problem(layer: SettingsLayer, problem: string): void {
    layer.problems.push(problem)
    const line = `${layer.file}:  ${problem};  using the setting below it`
    if (WARNED.has(line)) return
    WARNED.add(line)
    console.error(line)
  }
}

/** The settings, as they read once merged.  Add a key here, in `BUILT_IN` and in the kit's file. */
export type LayeredValues = {
  /** "0. While you were out" */
  away: {
    /** how many days a finished phase (done or dropped), and a bedtime run's summary line, stay listed */
    finishedPhaseDays: number
  }
}

/** A layer's name, lowest first. */
export type SettingsLayerName = "default" | "org" | "developer"

/** Where a value came from:  a layer, or `built-in` when the kit's own file couldn't say. */
export type SettingsSource = SettingsLayerName | "built-in"

/** One layer, as read. */
export type SettingsLayer = {
  /** which layer */
  name: SettingsLayerName
  /** its file, there or not */
  file: string
  /** does the file exist? */
  found: boolean
  /** what was wrong with it:  each left the value below standing */
  problems: string[]
}

/** One key in force. */
export type SettingsEntry = {
  /** dotted:  `away.finishedPhaseDays` */
  key: string
  /** its value */
  value: unknown
  /** the layer that set it */
  source: SettingsSource
}

/** A settings object, loosely:  what's walked and merged. */
type SettingsTree = Record<string, unknown>

/** What's been said on stderr by this process:  one line each, as a page edit reads the files every time. */
const WARNED = new Set<string>()

/** An object of settings, rather than a value? */
function isTree(value: unknown): value is SettingsTree {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Is `given` fit to stand in for `wanted`:  the same type, and a number finite and not negative? */
function isValidValue(given: unknown, wanted: unknown): boolean {
  if (typeof given !== typeof wanted) return false
  return typeof given !== "number" || (Number.isFinite(given) && given >= 0)
}

/** What `wanted`'s type is, for a problem's words. */
function describeValue(wanted: unknown): string {
  return typeof wanted === "number" ? "number, 0 or more" : typeof wanted
}
