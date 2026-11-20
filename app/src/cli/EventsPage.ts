import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

import { VocabularyFiles } from "spell/element-tools/VocabularyFiles"
import type { ComponentVocabulary, Dictionary } from "spell/element/vocabulary.types"
import { SRV } from "spell/server"

/****************
 * ### `EventsPage`
 * The events page's data (epic `language` P67, Q76):  every event a page can listen for, Spell's and Spell UI's, and
 * the Spell line that hears it, in English and Spanish.
 * - Made from the code, never by hand, so it can't fall behind:
 *   - Spell UI's events:  each component's vocabulary (`UI<Name>.en.ts`), its Spanish from Spell UI's dictionary
 *   - a view's element's own (a drag's, a file's):  its vocabulary (`SpellElement.en.ts`), its names in each language
 *     from the core's messages (`dragged-over-event` ...)
 *   - the program's own (`card-drop`) and its sounds' and videos':  the core's messages, and its media events
 *   - each Spell line:  `SPELL_LINES` below, each checked by the page's test to compile, in its language, to the
 *     handler the page calls (`EventsPage.test.ts`)
 * - Written to the epic repo, `guides/events/events.json5`, which the page beside it draws (`events.html`).
 * - `spell events write`, `spell events check`;  the test fails while the data is stale.
 * - Node only, in the app folder:  the one folder that sees Spell UI, the parser's core and the app's element.
 ****************/
export class EventsPage {
  /** Every row, in the page's groups' order. */
  static async rows(): Promise<EventRow[]> {
    return [...(await EventsPage.spellUIRows()), ...(await EventsPage.viewRows()), ...EventsPage.programRows()]
  }

  /** The data file's text:  plain JSON, which JSON5 reads too. */
  static async text(): Promise<string> {
    const rows = await EventsPage.rows()
    return `${JSON.stringify({ about: ABOUT, rows }, undefined, 2)}\n`
  }

  /**
   * Write the data file into the epic repo when it differs, or (`isCheck`) only say if it does:  is it stale?
   * - throws when there's no epic repo here (`dataFile()`)
   */
  static async write({ isCheck = false }: { isCheck?: boolean } = {}): Promise<boolean> {
    const file = EventsPage.dataFile()
    const text = await EventsPage.text()
    const isStale = EventsPage.readData() !== text
    if (isStale && !isCheck) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, text)
    }
    return isStale
  }

  /** `guides/events/events.json5`, in the epic repo of the checkout this runs in. */
  static dataFile(): string {
    const folder = SRV.contentFolderOf(process.cwd())
    if (!folder) throw new TypeError("EventsPage.dataFile():  no epic repo here;  run it in a checkout of the kit")
    return join(folder, DATA_FILE)
  }

  ////////////////
  // ## Spell UI's
  ////////////////

  /** Each Spell UI component's events, its Spanish from Spell UI's dictionary. */
  private static async spellUIRows(): Promise<EventRow[]> {
    const vocabularies = await VocabularyFiles.read(join(EventsPage.kitFolder(), "ui/src/components"))
    const { es } = (await import("spell/ui/components/components.es")) as { es: Dictionary }
    const rows: EventRow[] = []
    for (const { vocabulary } of vocabularies.sort((a, b) => a.vocabulary.tag.localeCompare(b.vocabulary.tag))) {
      for (const event of vocabulary.events) {
        rows.push({
          group: SPELL_UI,
          event: event.name,
          spanish: EventsPage.spanishOf(es, vocabulary.tag, event.name),
          sentBy: `<${vocabulary.tag}>`,
          detail: event.detail,
          cancelable: !!event.cancelable,
          description: event.description,
          ...SPELL_LINES[event.name]
        })
      }
    }
    return rows
  }

  /** `event`'s Spanish name on `tag`:  the tag's own, else the one every tag shares. */
  private static spanishOf(dictionary: Dictionary, tag: string, event: string): string | undefined {
    return dictionary.components?.[tag]?.events?.[event] ?? dictionary.events?.[event]
  }

  ////////////////
  // ## A view's element
  ////////////////

  /** A view's element's events, a drag's and a file's:  each named in the program's language by the core. */
  private static async viewRows(): Promise<EventRow[]> {
    const { spellElementVocabulary } = (await import("spell/app/app/runner/SpellElement.en")) as {
      spellElementVocabulary: ComponentVocabulary
    }
    const { CORE_MESSAGES } = await import("spell/parser/core/core.types")
    const { spanishMessages } = await import("spell/parser/spell/languages/es/messages")
    const messages = CORE_MESSAGES as Record<string, string>
    const spanish = spanishMessages as Record<string, string>
    return spellElementVocabulary.events.map((event) => {
      const key = Object.keys(messages).find((each) => each.endsWith("-event") && messages[each] === event.name)
      return {
        group: VIEWS,
        event: event.name,
        spanish: key ? spanish[key] : undefined,
        sentBy: "a view's element",
        detail: event.detail,
        cancelable: !!event.cancelable,
        description: event.description,
        ...SPELL_LINES[event.name]
      }
    })
  }

  ////////////////
  // ## The program's own
  ////////////////

  /** The program's own events:  a drop nobody's line took (`card-drop`), and each named sound's and video's. */
  private static programRows(): EventRow[] {
    return PROGRAM_EVENTS.map((row) => ({ group: PROGRAM, cancelable: false, ...row, ...SPELL_LINES[row.event] }))
  }

  ////////////////
  // ## Where things are
  ////////////////

  /** The kit's root, found through its package. */
  private static kitFolder(): string {
    return dirname(createRequire(import.meta.url).resolve("spell/package.json"))
  }

  /** The data file as it is in the epic repo, or `undefined` when there is none. */
  static readData(): string | undefined {
    try {
      return readFileSync(EventsPage.dataFile(), "utf8")
    } catch {
      return undefined
    }
  }
}

/** One event on the page. */
export type EventRow = {
  /** which group it's under:  Spell UI's, a view's element's, the program's own */
  group: string
  /** its name for `addEventListener()`, in English */
  event: string
  /** its name on a Spanish page, when it has its own */
  spanish?: string
  /** who sends it:  a tag, a view's element, the program */
  sentBy: string
  /** what its `detail` holds */
  detail?: string
  /** can a listener cancel it? */
  cancelable: boolean
  /** what it says, when */
  description: string
  /** the Spell line that hears it, in English */
  line?: string
  /** the same line in Spanish */
  lineEs?: string
  /** the method that line compiles to, which the page calls:  what the test checks */
  handler?: string
  /** the Spanish line's method, when it's named in the program's own words (`whenCartaDroppedOn`) */
  handlerEs?: string
}

/** A Spell line that hears an event, in both languages, and the method it compiles to. */
export type SpellLine = Required<Pick<EventRow, "line" | "lineEs" | "handler">> & Pick<EventRow, "handlerEs">

/**
 * Each event's Spell line, in a view's outline, by the event's English name.
 * - The page's test compiles each, in its language, and fails unless it makes `handler`:
 *   so a line here that stops reading, or reads as something else, can't stay on the page.
 */
export const SPELL_LINES: Readonly<Record<string, SpellLine>> = {
  "ui-dragged-over": {
    line: "when a card is dragged over it:",
    lineEs: "cuando una carta se arrastra sobre ella:",
    handler: "whenCardDraggedOver",
    handlerEs: "whenCartaDraggedOver"
  },
  "ui-dragged-out": {
    line: "when a card is dragged out of it:",
    lineEs: "cuando una carta se arrastra fuera de ella:",
    handler: "whenCardDraggedOutOf",
    handlerEs: "whenCartaDraggedOutOf"
  },
  "ui-dropped": {
    line: "when a card is dropped on it:",
    lineEs: "cuando una carta se suelta sobre ella:",
    handler: "whenCardDroppedOn",
    handlerEs: "whenCartaDroppedOn"
  },
  "ui-file-dragged-over": {
    line: "when a file is dragged over it:",
    lineEs: "cuando un archivo se arrastra sobre ella:",
    handler: "whenFileDraggedOver"
  },
  "ui-file-dragged-out": {
    line: "when a file is dragged out of it:",
    lineEs: "cuando un archivo se arrastra fuera de ella:",
    handler: "whenFileDraggedOutOf"
  },
  "ui-file-dropped": {
    line: "when a file is dropped on it:",
    lineEs: "cuando un archivo se suelta sobre ella:",
    handler: "whenFileDroppedOn"
  },
  "ui-folder-dropped": {
    line: "when a folder is dropped on it:",
    lineEs: "cuando una carpeta se suelta sobre ella:",
    handler: "whenFolderDroppedOn"
  },
  "ui-uploading": { line: "when uploading:", lineEs: "al subir:", handler: "onUploading" },
  "ui-uploaded": {
    line: "when a file is uploaded:",
    lineEs: "cuando un archivo se sube:",
    handler: "whenFileUploaded"
  },
  "ui-upload-failed": {
    line: "when a file fails to upload:",
    lineEs: "cuando un archivo no se puede subir:",
    handler: "whenFileFailsToUpload"
  },
  "{thing}-drop": {
    line: "on card drop with a card and a pile:",
    lineEs: "al soltar-carta con una carta y una pila:",
    handler: "onCardDrop",
    handlerEs: "onSoltarCarta"
  },
  "{name}-sound-ends": {
    line: 'when the "card slide" sound ends:',
    lineEs: 'cuando el sonido "card slide" termina:',
    handler: "onCardSlideSoundEnds"
  }
}

/** The program's own events:  the core's names for them. */
const PROGRAM_EVENTS: ReadonlyArray<Omit<EventRow, "group" | "cancelable">> = [
  {
    event: "{thing}-drop",
    spanish: "soltar-{thing}",
    sentBy: "the program, as a thing is dropped on a list with no `dropped on it` line",
    detail: "{ card, pile }:  the thing by its type, the list by each of its types",
    description:
      "A program hears it with `on card drop`;  nobody listening, the thing moves there, by the lists' rules."
  },
  {
    event: "{name}-sound-ends",
    sentBy: "the program, as a named sound or video plays",
    description:
      "A named sound or video ended:  also `-starts` and `-pauses`, and `-video-` for a video.  " +
      "The same name in every language."
  }
]

/** The groups, as the page titles them. */
const SPELL_UI = "Spell UI's components"
const VIEWS = "A view's element"
const PROGRAM = "The program's own"

/** The data file, in the epic repo. */
const DATA_FILE = "guides/events/events.json5"

/** What the data file says it is. */
const ABOUT =
  "Every event a page can listen for, and the Spell line that hears it:  GENERATED by `spell events write` " +
  "(the app folder's EventsPage), never edited by hand.  Drawn by events.html beside it."
