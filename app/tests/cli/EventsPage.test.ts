import { describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { parseSpellProject } from "spell/parser/spell/test"
import { EventsPage, SPELL_LINES } from "spell/app/cli/EventsPage"

/**
 * The events page's data (epic `language` P67, Q76):  made from the code, so it can't fall behind it.
 * - Each Spell line it shows compiles, in its language, to the handler the page calls.
 * - The data in the epic repo is the code's:  a new event, or one renamed, fails until `spell events write`.
 */
describe("EventsPage", () => {
  describe("each Spell line on the page compiles, in its language, to the handler the page calls", () => {
    for (const [event, { line, lineEs, handler, handlerEs = handler }] of Object.entries(SPELL_LINES)) {
      test(`${event}:  ${line} / ${lineEs}`, () => {
        expect(compiled(line, "en")).toMatch(new RegExp(`\\b${handler}\\(`))
        expect(compiled(lineEs, "es")).toMatch(new RegExp(`\\b${handlerEs}\\(`))
      })
    }
  })

  test("every view's event and the uploader's have a Spell line;  each row says who sends it", async () => {
    const rows = await EventsPage.rows()
    const views = rows.filter((row) => row.group === "A view's element")
    expect(views.map((row) => row.event)).toEqual([
      "ui-dragged-over",
      "ui-dragged-out",
      "ui-dropped",
      "ui-file-dragged-over",
      "ui-file-dragged-out",
      "ui-file-dropped",
      "ui-folder-dropped"
    ])
    for (const row of views) expect(row.line, row.event).toBeTruthy()
    expect(views.find((row) => row.event === "ui-dropped")?.spanish).toBe("soltado")
    const uploading = rows.find((row) => row.event === "ui-uploading")
    expect(uploading).toMatchObject({ sentBy: "<ui-uploader>", spanish: "subiendo", cancelable: true })
    expect(rows.find((row) => row.event === "ui-selected" && row.sentBy === "<ui-button>")).toBeDefined()
    expect(rows.find((row) => row.event === "{thing}-drop")).toMatchObject({ spanish: "soltar-{thing}" })
    // every vocabulary file, read in node:  slow under a full run
  }, 60_000)

  test.skipIf(!SRV.contentFolderOf(process.cwd()))(
    "the epic repo's events.json5 is up to date:  if not, run `spell events write`",
    async () => {
      expect(EventsPage.readData()).toBe(await EventsPage.text())
    }
  )
})

/** A named sound, for a sound's line. */
const SOUND = 'sound "card slide" is at "sounds/slide.mp3"'
const SOUND_ES = 'sonido "card slide" está en "sonidos/slide.mp3"'

/** `line` in a view's outline (a pile of cards, a box), in `language`:  its compiled code;  throws on a parse error. */
function compiled(line: string, language: "en" | "es"): string {
  const contents =
    language === "es"
      ? `una carta es una vista\nuna pila es una lista visible de cartas:\n\t${SOUND_ES}\n\t${line}\n\t\timprimir 1`
      : `a card is a view\na pile is a viewable list of cards where:\n\t${SOUND}\n\t${line}\n\t\tprint 1`
  const { files } = parseSpellProject([{ path: language === "es" ? "/juego.es.spell" : "/game.spell", contents }])
  const errors = files[0]!.errors.map((error) => JSON.stringify(error))
  if (errors.length) throw new Error(`${line}:\n${errors.join("\n")}`)
  return files[0]!.compiled
}
