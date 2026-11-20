import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { SourceHomes, type LiteralStyle } from "spell/app/lsp/SourceHomes"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { ClassSchemas } from "spell/app/app/ui/ClassSchemas"
import type { OwnView } from "./Palette"
import { wordsOfName } from "./ThingMembers"

/****************
 * ### `DesignSamples`
 * A view's samples, which Design's gallery draws side by side (epic `editor` P38;  Q61 A, Q62):
 * each a name and the settings of one thing of the view.
 * - Saved ones are in a file of their own beside the view's, as its property editor is:
 *   `Card.samples.spell` beside `Card.spell` (`SP.isSamplesName()`), never compiled.
 * - Written in Spell the language already reads, a type holding a member made new per sample
 *   (`"stock" is a new stock pile`, as an app's are):
 *
 *   ```text
 *   card samples is a thing
 *   	"queen of spades" is a new card whose rank is queen, suit is spades and direction is down
 *   ```
 * - A view with none saved gets samples made from its choices, one change at a time from a new one:
 *   each suit, face up and down (`made()`).
 * - Each save, rename and delete is one step of the editor's history, so Undo takes it back.
 * - Plain text work, no Solid:  read from the file's text as it is now, so a reader in a drawing follows it.
 ****************/
export class DesignSamples {
  /** The samples file's path for the view written in `viewPath`:  `.../Card.spell` => `.../Card.samples.spell`. */
  static pathFor(viewPath: string): string {
    return viewPath.replace(/(\.[a-z]{2}(?:-[A-Za-z]{2,4})?)?\.spell$/, `${SAMPLES_ENDING}$1.spell`)
  }

  /**
   * The samples file of the view written in `viewPath`, if the project has one;  read when first asked for.
   * - NEVER throws:  one that won't load is said on the console.
   */
  static fileFor(viewPath: string): SP.AnySpellFile | undefined {
    const path = DesignSamples.pathFor(viewPath)
    const file = editor.project?.files.find((each) => each.path === path)
    if (file && !file.isLoaded && !file.isLoading) {
      queueMicrotask(() => {
        if (file.isLoaded || file.isLoading) return
        file.load().catch((error: unknown) => console.error(`DesignSamples:  can't load ${file.path}`, error))
      })
    }
    return file
  }

  /**
   * The samples saved for `view`, written in `viewPath`, in the order written;  `[]` with none (reactive).
   * - `Class`:  the view's class in the running program, whose properties a sample's words name.
   * - A line it can't read is left out.
   */
  static saved(view: OwnView, viewPath: string, Class: Function): Sample[] {
    const text = DesignSamples.fileFor(viewPath)?.contents ?? ""
    const attributes = ClassSchemas.fromClass(Class).attributes
    const named = new Map(attributes.map((attribute) => [wordsOfName(attribute.name), attribute]))
    const typeWords = typeWordsOf(view)
    return text.split("\n").flatMap((line, at): Sample[] => {
      const match = SAMPLE_LINE.exec(line)
      if (!match || match[2]!.toLowerCase() !== typeWords) return []
      const settings: Record<string, unknown> = {}
      for (const [, words, written] of (match[3] ?? "").matchAll(SETTING)) {
        const attribute = named.get(words!.trim().toLowerCase())
        if (attribute) settings[attribute.name] = valueOf(written!.trim())
      }
      return [{ name: match[1]!, settings, line: at }]
    })
  }

  /**
   * Samples made from `Class`'s choices, when none are saved:  one made with `start`, named `startName`,
   * then one change at a time, each other value of each property with a few choices (each suit;  face up and down),
   * at most `MADE_AT_MOST`.
   * - A property with more choices than `FEW_CHOICES` (a card's thirteen ranks) is left as it starts.
   * - Each named for its change:  `suit spades`, `direction up`.
   */
  static made(
    Class: new (settings?: Record<string, unknown>) => object,
    start: Record<string, unknown> = {},
    startName = ""
  ): Sample[] {
    const first = new Class(start)
    const samples: Sample[] = [{ name: startName, settings: start }]
    for (const attribute of ClassSchemas.fromClass(Class).attributes) {
      const values = attribute.values
      if (!values || values.length > FEW_CHOICES || !isSettable(first, attribute.name)) continue
      for (const value of values) {
        if (samples.length >= MADE_AT_MOST) return samples
        // the one it starts with is the first sample already
        if (String((first as Record<string, unknown>)[attribute.name]) === value) continue
        const settings = { ...start, [attribute.name]: value }
        samples.push({ name: `${wordsOfName(attribute.name)} ${value}`, settings })
      }
    }
    return samples
  }

  /**
   * Save `thing`'s settings as sample `name` of `view`, written in `viewPath`:  its line at the end of the samples
   * file, which is made when the view has none, as one step of the editor's history.
   * - NEVER throws:  a failure shows in the error banner.
   */
  static async save(view: OwnView, viewPath: string, thing: object, name: string): Promise<void> {
    try {
      const file = DesignSamples.fileFor(viewPath) ?? (await DesignSamples.create(view, viewPath))
      if (!file.isLoaded) await file.load()
      const text = file.contents ?? ""
      const line = `\t${DesignSamples.spellFor(view, thing, name)}\n`
      const at = text.length
      editor.history.change(
        { file, at, before: "", after: text.endsWith("\n") || !text ? line : `\n${line}` },
        { title: appTexts.text("designSaveSampleStep", { name }) }
      )
    } catch (error) {
      editor.showError(error)
    }
  }

  /** Rename `sample` of the view written in `viewPath` to `name`:  one step of the editor's history. */
  static rename(viewPath: string, sample: Sample, name: string): void {
    DesignSamples.changeLine(viewPath, sample, (line) => line.replace(`"${sample.name}"`, `"${quoted(name)}"`), {
      title: appTexts.text("designRenameSampleStep", { name })
    })
  }

  /** Delete `sample` of the view written in `viewPath`:  one step of the editor's history. */
  static remove(viewPath: string, sample: Sample): void {
    DesignSamples.changeLine(viewPath, sample, () => undefined, {
      title: appTexts.text("designDeleteSampleStep", { name: sample.name })
    })
  }

  /**
   * The Spell a sample is saved as:  its name, and the making of a thing with `thing`'s settings.
   * - `"queen of spades" is a new card whose rank is queen, suit is spades and direction is down`
   * - Only its own settings with a plain value (a word, text, a number, yes or no), in its type's order.
   */
  static spellFor(view: OwnView, thing: object, name: string): string {
    const own = new Set((thing as { keys?: () => string[] }).keys?.() ?? [])
    const said = ClassSchemas.fromClass(thing.constructor)
      .attributes.filter((attribute) => own.has(attribute.name))
      .flatMap((attribute) => {
        const value = (thing as Record<string, unknown>)[attribute.name]
        if (value === null || value === undefined || typeof value === "object") return []
        const style: LiteralStyle =
          typeof value === "number"
            ? "number"
            : typeof value === "boolean"
              ? "boolean"
              : attribute.values
                ? "word"
                : "text"
        return [`${wordsOfName(attribute.name)} is ${SourceHomes.literalFor(value, style)}`]
      })
    const whose = said.length > 1 ? `${said.slice(0, -1).join(", ")} and ${said.at(-1)}` : said[0]
    return `"${quoted(name)}" is a new ${typeWordsOf(view)}${whose ? ` whose ${whose}` : ""}`
  }

  /** Make `view`'s samples file, beside `viewPath`:  its heading and its type's line, no sample yet. */
  private static async create(view: OwnView, viewPath: string): Promise<SP.AnySpellFile> {
    const project = editor.project
    if (!project) throw new TypeError("DesignSamples.create():  no project open")
    const path = DesignSamples.pathFor(viewPath)
    const filePath = path.slice(project.path.length + 1)
    const words = typeWordsOf(view)
    const contents =
      `# ${appTexts.text("designSamplesHeading", { view: view.name })}\n` +
      `${appTexts.text("designSamplesAbout", { view: words })}\n\n` +
      `${words} samples is a thing\n`
    return new SPACES.ProjectFiles(project).create(filePath, contents)
  }

  /** Change `sample`'s line with `change` (`undefined`:  take it out), as one step of the editor's history. */
  private static changeLine(
    viewPath: string,
    sample: Sample,
    change: (line: string) => string | undefined,
    step: { title: string }
  ): void {
    const file = DesignSamples.fileFor(viewPath)
    if (!file || sample.line === undefined) return
    const text = file.contents ?? ""
    const lines = text.split("\n")
    const line = lines[sample.line]
    if (line === undefined) return
    const at = lines.slice(0, sample.line).reduce((sum, each) => sum + each.length + 1, 0)
    const changed = change(line)
    const before = `${line}\n`
    editor.history.change({ file, at, before, after: changed === undefined ? "" : `${changed}\n` }, step)
  }
}

/** One sample:  its name, and the settings a thing is made with. */
export type Sample = {
  /** What it's called under its drawing:  `queen of spades`. */
  name: string
  /** What a thing is made with:  `{ rank: "queen", suit: "spades", direction: "down" }`. */
  settings: Record<string, unknown>
  /** A saved one's line in its file, from 0;  none for one made from the view's choices. */
  line?: number
}

/** What a samples file's name ends with, before its language and `.spell`. */
const SAMPLES_ENDING = ".samples"

/** A sample's line:  its name, its type's words, then what it's made with, if anything. */
const SAMPLE_LINE = /^\s+"((?:[^"\\]|\\.)*)" is an? new ([a-z][\w ]*?)(?: whose (.+?))?\s*$/i

/** One setting of a `whose`:  `rank is queen`, up to the next `,` or ` and `. */
const SETTING =
  /([a-z][\w ]*?) is ("(?:[^"\\]|\\.)*"|[^,"]+?)\s*(?=,|\s+and\s+[a-z][\w ]*? is |$)(?:,\s*(?:and\s+)?|\s+and\s+)?/gi

/** A property with more choices than this is left as it starts in the samples `made()`. */
const FEW_CHOICES = 6

/** The most samples `made()` makes. */
const MADE_AT_MOST = 12

/** `view`'s type in words, as Spell makes one:  `card`, `stock pile`. */
function typeWordsOf(view: OwnView): string {
  return view.snippet.replace(/^\{draw an? new (.*)\}$/, "$1")
}

/** A written value as the thing takes it:  text unquoted, a number, yes or no, else the word. */
function valueOf(written: string): unknown {
  if (written.startsWith('"')) return written.slice(1, -1).replace(/\\(.)/g, "$1")
  if (/^-?\d+(?:\.\d+)?$/.test(written)) return Number(written)
  if (written === "yes" || written === "no") return written === "yes"
  return written
}

/** `name` safe inside Spell's double quotes. */
function quoted(name: string): string {
  return name.replace(/["\\]/g, "\\$&")
}

/** Can `thing`'s property `name` be set, not worked out from others (a card's color)? */
function isSettable(thing: object, name: string): boolean {
  for (let at: object | null = thing; at; at = Object.getPrototypeOf(at) as object | null) {
    const described = Object.getOwnPropertyDescriptor(at, name)
    if (described) return !described.get || !!described.set
  }
  return true
}
