import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { FileLock } from "spell/server/FileLock"
import { BellSteps, type BellsValues } from "spell/epic/bells/BellSteps.ts"
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
 * - ONE writer, `set()` (epic `epic-engine` P86):  the developer's file only, under its lock;  the page server's
 *   `/api/epics/settings` and `epic settings <key> <value>` both call it.
 * - An EMPTY object in `BUILT_IN` is a MAP:  any key, each value `true` or `false` (`bells.burnFlips`).
 * - Node only:  NOT in the `spell-epic` barrel, imported by path (`spell/epic/config/LayeredSettings`).
 * - Its position:  node's own modules and the kit's `DataFile`, so plain `node` can load it.
 ****************/
export class LayeredSettings {
  /** Every layer's file name. */
  static readonly FILE = "epic_settings.json5"

  /** The values if the kit's own file can't be read;  and what says which keys there are, and their types. */
  static readonly BUILT_IN: LayeredValues = { away: { finishedPhaseDays: 3 }, bells: BellSteps.defaults() }

  /** The keys whose text must be one of a few words. */
  static readonly CHOICES: Readonly<Record<string, readonly string[]>> = { "bells.burn": BellSteps.BURN_LEVELS }

  /** The folder holding the developer's `.spell/`:  `$SPELL_SETTINGS_HOME` (the tests' scratch one), else your home. */
  static home(): string {
    return process.env.SPELL_SETTINGS_HOME ?? homedir()
  }

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
   * - `home`:  the folder holding `.spell/`:  a test's own;  default `home()`
   */
  static read(content: string | undefined, { home = LayeredSettings.home() }: { home?: string } = {}): LayeredSettings {
    return new LayeredSettings([
      { name: "default", file: LayeredSettings.DEFAULT_FILE },
      ...(content ? [{ name: "org" as const, file: join(content, LayeredSettings.FILE) }] : []),
      { name: "developer", file: join(home, ".spell", LayeredSettings.FILE) }
    ])
  }

  private constructor(layers: Pick<SettingsLayer, "name" | "file">[]) {
    this.layers = layers.map((layer) => this.apply(layer))
  }

  /**
   * Set `key` (dotted:  `bells.designReview`) to `value` in the DEVELOPER's file, `~/.spell/epic_settings.json5`,
   * under its lock;  returns the settings as they read now.
   * - a map (`bells.burnFlips`) takes a whole object of `true` / `false`, or one key of it (`bells.burnFlips.x`)
   * - `undefined` takes the key out of the file:  the layer below stands
   * - the file's comments kept (`DataFile.write()`)
   * - throws `TypeError` for a key no layer knows, or a value of the wrong type, saying what it takes
   * - SIDE EFFECT:  writes the developer's file (and its folder)
   */
  static set(key: string, value: unknown, options: LayeredSetOptions = {}): LayeredSettings {
    return LayeredSettings.setMany({ [key]: value }, options)
  }

  /**
   * `set()` for several keys at once, `{ "bells.burn": "low", ... }`:  one write, under one lock.
   * - every value checked first:  one wrong, nothing written
   */
  static setMany(changes: Record<string, unknown>, { content, home = LayeredSettings.home() }: LayeredSetOptions = {}) {
    for (const [key, value] of Object.entries(changes)) LayeredSettings.check(key, value)
    const file = join(home, ".spell", LayeredSettings.FILE)
    mkdirSync(dirname(file), { recursive: true })
    const label = `epic settings ${Object.keys(changes).join(", ")}`
    FileLock.run(file, () => DataFile.write(file, withChanges(DataFile.read<unknown>(file), changes)), { label })
    return LayeredSettings.read(content, { home })
  }

  /** Throw a `TypeError` unless `value` is fit for `key`. */
  private static check(key: string, value: unknown): void {
    const names = key.split(".")
    let wanted: unknown = LayeredSettings.BUILT_IN
    let inMap = false
    for (const name of names) {
      if (inMap) {
        wanted = false
        inMap = false
        continue
      }
      if (!isTree(wanted) || !(name in wanted)) throw new TypeError(`LayeredSettings.set():  no setting ${key}`)
      wanted = wanted[name]
      inMap = isMap(wanted)
    }
    if (value === undefined) return
    if (isMap(wanted)) {
      if (isBooleanMap(value)) return
      throw new TypeError(`LayeredSettings.set():  ${key} takes an object of true or false`)
    }
    if (isTree(wanted)) throw new TypeError(`LayeredSettings.set():  ${key} is a group;  set one of its keys`)
    if (!isValidValue(value, wanted) || !isChoice(key, value))
      throw new TypeError(
        `LayeredSettings.set():  ${key} takes ${describeValue(wanted, key)}, not ${JSON.stringify(value)}`
      )
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
        if (isTree(value) && !isMap(valueAt(LayeredSettings.BUILT_IN, key.split(".")))) walk(value, `${key}.`)
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
      if (isMap(wanted)) {
        if (isBooleanMap(given)) {
          values[name] = { ...given }
          this.sources.set(key, layer.name)
        } else this.problem(layer, `${key} should be an object of true or false`)
      } else if (isTree(wanted)) {
        if (isTree(given)) this.merge(values[name] as SettingsTree, given, wanted, `${key}.`, layer)
        else this.problem(layer, `${key} should be an object of settings`)
      } else if (isValidValue(given, wanted) && isChoice(key, given)) {
        values[name] = given
        this.sources.set(key, layer.name)
      } else {
        this.problem(layer, `${key}:  ${JSON.stringify(given)} isn't ${describeValue(wanted, key)}`)
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
  /** Bells & Whistles (epic `epic-engine` P86):  the steps' own switches, the Token burn slider and its flips */
  bells: BellsValues
}

/** `set()`'s options:  the folders `read()` takes. */
export type LayeredSetOptions = {
  /** the epic repo's folder, for the settings returned;  none:  no org layer */
  content?: string
  /** the folder holding `.spell/`:  a test's own */
  home?: string
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

/** What `wanted`'s type is, for a problem's words:  `a number, 0 or more`, `one of low, medium, high`. */
function describeValue(wanted: unknown, key: string): string {
  const choices = LayeredSettings.CHOICES[key]
  if (choices) return `one of ${choices.join(", ")}`
  return typeof wanted === "number" ? "a number, 0 or more" : `a ${typeof wanted}`
}

/** `raw` (a settings file's data) with each dotted key of `changes` set, or taken out for `undefined`. */
function withChanges(raw: unknown, changes: Record<string, unknown>): SettingsTree {
  const tree: SettingsTree = isTree(raw) ? raw : {}
  for (const [key, value] of Object.entries(changes)) {
    const names = key.split(".")
    let at = tree
    for (const name of names.slice(0, -1)) {
      if (!isTree(at[name])) at[name] = {}
      at = at[name] as SettingsTree
    }
    const last = names.at(-1)!
    if (value === undefined) delete at[last]
    else at[last] = value
  }
  return tree
}

/** Is `given` one of `key`'s words, when it has a few? */
function isChoice(key: string, given: unknown): boolean {
  const choices = LayeredSettings.CHOICES[key]
  return !choices || choices.includes(given as string)
}

/** An empty object in `BUILT_IN`:  a map of any keys. */
function isMap(wanted: unknown): boolean {
  return isTree(wanted) && Object.keys(wanted).length === 0
}

/** An object of `true` / `false`? */
function isBooleanMap(given: unknown): given is Record<string, boolean> {
  return isTree(given) && Object.values(given).every((value) => typeof value === "boolean")
}

/** The value at `names` in `tree`, or `undefined`. */
function valueAt(tree: unknown, names: string[]): unknown {
  let at = tree
  for (const name of names) at = isTree(at) ? at[name] : undefined
  return at
}
