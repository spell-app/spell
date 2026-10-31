/**
 * Pages running the frozen live room projects, on the recipe box's servers (epic `data` P13):  what `tests/spell/liveRoom.test.ts`
 * and `scripts/live-room-demo.ts` stand on.
 * - `@spell/test/live-room`, and its Spanish twin, `sala-en-vivo`, each compiled to the one file a page loads.
 * - Who's at a page is its address's `person`, handed on as its server would:  `window.SPELL_SERVER.person`.
 * - Node only;  a test helper.  `yarn build:element` first:  it serves that `<spell-viewer>`.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { SRV } from "spell/server"
import { startRecipeServers, type RecipeServers } from "spell/server/test/recipeDemo"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

import { fixturePath } from "./fixtures"

/** `yarn build:element`'s output. */
export const ELEMENT_DIR = resolve(import.meta.dirname, "../../../app/dist-element")

/** The token the demo's place server wants. */
const DEMO_TOKEN = "recipe-box-demo"

/** One of the frozen projects, in one language, and what it says. */
export type LiveRoomProgram = {
  /** Its file. */
  path: string
  /** Its source. */
  source: string
  /** What its handler says, up to the thing's title. */
  news: string
  /** What a recipe added is called. */
  added: string
}

/** Each language's. */
export const LIVE_ROOM_PROGRAMS = {
  english: {
    path: "/LiveRoom.spell",
    source: readFileSync(fixturePath("live-room", "LiveRoom.spell"), "utf8"),
    news: "Someone else changed ",
    added: "New"
  },
  spanish: {
    path: "/SalaEnVivo.es.spell",
    source: readFileSync(fixturePath("sala-en-vivo", "SalaEnVivo.es.spell"), "utf8"),
    news: "Otra persona cambió ",
    added: "Nueva"
  }
} satisfies Record<string, LiveRoomProgram>

/** What `startLiveRoomPages()` is told. */
export type LiveRoomPagesProps = {
  /** Where to listen:  `0`, any free port. */
  port: number
  /** Where the room's recipes are kept. */
  folder: string
}

/** The servers, and what they serve. */
export type LiveRoomPages = {
  /** The recipe box's servers. */
  servers: RecipeServers
  /** The page at this address runs `source` (left out:  the language's own), compiled:  answers its address. */
  serve(name: string, source?: string): string
}

/** Start them:  see the file's docs.  `servers.close()` stops them. */
export async function startLiveRoomPages({ port, folder }: LiveRoomPagesProps): Promise<LiveRoomPages> {
  const pages = new Map<string, string>()
  const element = SRV.folderRoute("/element/", ELEMENT_DIR)
  const servers = await startRecipeServers({
    port,
    folder,
    routes: (router) => {
      router.use((request, reply, next) => {
        const text = pages.get(request.path)
        if (text !== undefined) {
          const type = request.path.endsWith(".js") ? "text/javascript" : "text/html; charset=utf-8"
          return reply.type(type).send(text)
        }
        const found = element(request.path)
        if (found && "file" in found && found.file) return reply.sendFile(found.file)
        return next()
      })
    }
  })
  const serve = (name: string, source?: string) => {
    const program = (LIVE_ROOM_PROGRAMS as Record<string, LiveRoomProgram>)[name] ?? LIVE_ROOM_PROGRAMS.english
    pages.set(`/programs/${name}.js`, compiledProgram(program.path, source ?? program.source))
    pages.set(`/${name}.html`, pageFor(name))
    return `${servers.url}/${name}.html`
  }
  return { servers, serve }
}

/** A page:  `<spell-viewer>`, told who's at it by its address. */
function pageFor(name: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<script>
  const person = new URLSearchParams(location.search).get("person")
  window.SPELL_SERVER = { token: "${DEMO_TOKEN}", ...(person && { person }) }
</script>
<script type="module" src="/element/spell-viewer.js"></script>
</head><body><spell-viewer src="/programs/${name}.js"></spell-viewer></body></html>`
}

/** `source`, compiled to the one file a page loads.  - throws for parse errors */
function compiledProgram(path: string, source: string): string {
  const { scope, files } = parseSpellProject([{ path, contents: source }])
  const errors = files.flatMap((file) => file.errors)
  if (errors.length) throw new Error(`parse errors:\n${errors.join("\n")}`)
  const parts = files.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const header = SP.SpellProject.importHeaderFor(scope, P.JSWriter.instance)
  return SP.SpellDeclarations.stripComments(SP.SpellProject.combineCompiled(parts, P.JSWriter.instance, header, scope))
}
