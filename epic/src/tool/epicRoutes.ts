/**
 * The Epics page's writes, on the page server:  a ROUTE MODULE (`spell/server/page`'s `RouteModule`).
 * - listed in the repo root's `package.json`, `"pageServer": { "routes": [...] }`
 *
 * NEW EPIC (epic `airplane` P7):
 * - Owen writes an idea down on the Epics page:  a title and the kickoff prompt.
 *   - its New epic button (`epics/index.html`), the docs runtime's "New epic"
 *   - no Claude needed, so it works on a plane
 * - It becomes a FUTURE epic at once, as `/epic future` makes one (`epic create <name> --future`):
 *   - the stub epic page with the prompt quoted, listed on the Epics list page with its seedling
 *   - its log says it came from the page (`FROM_PAGE`),
 *     which is how `/airplane land` finds the ones to offer (`AirplaneInbox`)
 * - `POST /api/epics/new` `{ title, prompt }` -- answers `{ name, page }`, the new epic page's URL path
 *   - `name`:  the title, lower-kebab-cased (`Docs Index` -> `docs-index`);  taken, `-2`, `-3` ...
 *   - 400:  no title, or nothing to name it by
 *
 * FAVORITES:  a card's star, clicked on the Epics page (the docs runtime's "Favorite epics").
 * - epic `airplane` P8, Owen 2026-10-10:
 *   "Add a "favorite" icon in the top-right of the epics cards.  Sort those first."
 * - `POST /api/epics/favorite` `{ name, favorite }` -- stars (`true`) or unstars epic `name`;
 *   answers `{ favorites }`, every starred epic's name, sorted
 *   - 400:  no name, or not an epic's name (lower-kebab-case);  `favorite` not a boolean
 * - stored in ONE shared file, `epics/favorites.json5` (`spell/epic/list/EpicCards` `FAVORITES_FILE`), a list:
 *   every checkout reads the same one, and the epic repo commits it after the turn
 * - each card goes in its group by it as the page server serves the Epics page (`spell/epic/list/RunningEpics`);
 *   `epic pages index` writes the stars and groups it says into the page
 * - no Claude needed:  it works on a plane
 *
 * A CARD'S MENU (epic `epic-engine` T103;  Owen:  "on the epic home page cards, add a `...` menu in the TR corner, with
 * Resume, Rename Epic..., Complete, Delete Epic..."):  each route a line or two, the work `EpicLifecycle`'s
 * - `GET /api/epics/manage?epic=<name>` -- what the card's dialogs say first (`EpicManageFacts`):  why it can't be
 *   renamed or deleted, what's left;  a read, no token
 * - `POST /api/epics/manage/resume` `{ name }` -- its session resumed in its own VS Code window (`epic window
 *   launch <name> --prompt "/epic resume <name>"`);  answers `{ said }`, what the launch said
 * - `POST /api/epics/manage/rename` `{ name, to }` -- answers `{ page }`, the new epic page's URL path
 * - `POST /api/epics/manage/complete` `{ name }` -- answers `{ dropped, canceled }`
 * - `POST /api/epics/manage/delete` `{ name }` -- answers `{}`
 * - each refusal an `HttpError` whose words the page shows as they are (400, 404, 409)
 *
 * Each write needs the page server's token (`x-server-token`) and its own origin (`SRV.Guard`).
 *
 * SEE ALSO (Owen, 2026-10-13:  "There is no easy way to get to a "decisions" or "details" pages from an epic"):  the
 * pages an epic made or leans on, which `<epic-page>` lists in its See Also box, above the Overview
 * - `GET /api/epics/pages?epic=<name>` -- answers `{ pages, saga }`:  each page `{ href, title, kind, updated }`
 *   (`SeeAlso`);  `saga`, the saga its epic page names (epic `epic-workflow` P15), `{ id, title, purpose, href }`
 *   (`sagaLinkOf()`), or `null`
 *   - its guide (`durable`), its own pages in `epics/<name>/details/` (`details`, `choices`), newest first,
 *     then every guide its epic page and part files link to (`guide`:  epic `epic-workflow` P13), newest first
 *   - `href` from the epic page's folder (`details/analysis.html`), `title` the page's `<title>`
 *   - gathered when asked:  a page made or linked a moment ago is there, one deleted is gone;  nothing to keep up
 *   - a read, so no token;  400 for a name that isn't an epic's, `{ pages: [] }` for one with no such folder
 *
 * A SAGA'S EPICS (epic `epic-workflow` P15):  the cards a saga page's Epics draws (`<epic-cards>`)
 * - `GET /api/epics/saga?saga=<id>` -- answers `{ saga, epics }` (`SagaEpicsAnswer`):  every epic whose page names
 *   the saga (`<epic-page saga>`), by title, each `{ name, title, href, summary, facts }` (`SagaEpics`)
 *   - `href` from the saga page's folder (`../../epics/x/x.plan.html`);  `facts` what its state is read from
 *   - gathered when asked, from the epic pages' skeletons:  nothing to keep up
 *   - a read, so no token;  400 for a malformed saga id, `{ epics: [] }` for one no epic names
 *
 * WAITING TO TEST (epic `epic-engine` P4):  the epics a test run steps through, "everything waiting to test"
 * - `GET /api/epics/tests` -- answers `[{ epic, title, saga, open, page, href }]` (`EpicTestCount`):  every epic with
 *   open tests, in Owen's saga order (`EpicTests.waiting()`)
 *   - `page`, its URL path (`/epics/x/x.plan.html`);  `href`, from another epic page's folder (`../x/x.plan.html`)
 *   - the run's summary card asks it for the next epic (`epic test --all`);  `epic test --all` lists the same
 *   - gathered when asked, from the epic pages' skeletons;  a read, so no token
 *   - from the epic folder the server serves (`ContentRouteContext`'s `content`, the epic server's), else `root`'s:
 *     so a demo server (`DemoServer`) answers from its copies (epic `epic-engine` I45)
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { slug } from "spell/util/string"
import { SRV } from "spell/server"
import type { RouteModule } from "spell/server/page"
import { EPIC_VERBS } from "spell/epic/command/command.types"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import type { ContentRouteContext } from "spell/epic/list/runningRoutes"

// the routes `<epic-cards>` and `<epic-card>` ask:  their families' types files (data only)
import { SAGA_EPICS_API } from "spell/epic/components/epic-cards/EpicCards.types"
import { MANAGE_API } from "spell/epic/components/epic-list/EpicList.types"

import { EpicLifecycle, editFavorites } from "./EpicLifecycle"
import { EpicTests, TESTS_API } from "./EpicTests"
import { PlanDocCommands } from "./PlanDocCommands"
import { PlanDocFiles } from "./PlanDocFiles"
import { SagaEpics } from "./SagaEpics"
import { Sagas } from "./Sagas"
import { SeeAlso } from "./SeeAlso"

/** Where the routes live. */
const API = "/api/epics/new"
const FAVORITE_API = "/api/epics/favorite"
const PAGES_API = "/api/epics/pages"

/** Biggest body accepted:  a kickoff prompt is a few paragraphs. */
const MAX_BODY = 64 * 1024

/** The log line of an epic made from the page:  `/airplane land` offers each one to start. */
export const FROM_PAGE = "Made from the Epics page (New epic)"

const epicRoutes: RouteModule = {
  name: "epics",
  setup({ root, router, guard, content }: ContentRouteContext) {
    router.post(API, guard.writeCheck, SRV.parseBodies({ limit: MAX_BODY }), async (request, reply) => {
      const { title, prompt } = (request.body ?? {}) as { title?: unknown; prompt?: unknown }
      if (typeof title !== "string" || !title.trim()) throw new SRV.HttpError(400, "no title")
      const name = await newEpic(root, title.trim(), typeof prompt === "string" ? prompt : "")
      reply.json({ name, page: `/epics/${name}/${name}.plan.html` })
    })
    router.post(FAVORITE_API, guard.writeCheck, SRV.parseBodies({ limit: MAX_BODY }), async (request, reply) => {
      const { name, favorite } = (request.body ?? {}) as { name?: unknown; favorite?: unknown }
      if (typeof name !== "string" || typeof favorite !== "boolean")
        throw new SRV.HttpError(400, "send { name, favorite }:  an epic's name, and true or false")
      reply.json({ favorites: await setFavorite(root, name, favorite) })
    })
    router.get(PAGES_API, (request, reply) => {
      const name = String(request.query.epic ?? "")
      if (!EPIC_NAME.test(name)) throw new SRV.HttpError(400, `not an epic's name:  "${name}"`)
      reply.noStore().json({ pages: new SeeAlso(root).linksOf(name), saga: sagaLinkOf(root, name) })
    })
    router.get(TESTS_API, (_request, reply) => {
      reply.noStore().json(new EpicTests(content ?? EpicConfig.contentOf(root)).waiting())
    })
    const lifecycle = () => new EpicLifecycle({ root, ...(content && { content }) })
    const body = SRV.parseBodies({ limit: MAX_BODY })
    router.get(MANAGE_API, (request, reply) => {
      reply.noStore().json(lifecycle().facts(String(request.query.epic ?? "")))
    })
    router.post(`${MANAGE_API}/resume`, guard.writeCheck, body, async (request, reply) => {
      reply.json({ said: await lifecycle().resume(nameIn(request.body)) })
    })
    router.post(`${MANAGE_API}/rename`, guard.writeCheck, body, async (request, reply) => {
      const to = (request.body as { to?: unknown } | undefined)?.to
      reply.json({ page: await lifecycle().rename(nameIn(request.body), typeof to === "string" ? to.trim() : "") })
    })
    router.post(`${MANAGE_API}/complete`, guard.writeCheck, body, async (request, reply) => {
      reply.json(await lifecycle().complete(nameIn(request.body)))
    })
    router.post(`${MANAGE_API}/delete`, guard.writeCheck, body, async (request, reply) => {
      await lifecycle().remove(nameIn(request.body))
      reply.json({})
    })
    router.get(SAGA_EPICS_API, (request, reply) => {
      const saga = String(request.query.saga ?? "")
      if (!Sagas.isId(saga)) throw new SRV.HttpError(400, `not a saga's id:  "${saga}"`)
      reply.noStore().json(new SagaEpics(root).of(saga))
    })
  }
}

export default epicRoutes

/**
 * Make a future epic called `title` in checkout `root`, `prompt` its kickoff prompt;  resolves to its name.
 * - SIDE EFFECT:  writes `epics/<name>/` and the Epics list page, as `epic create --future` does
 * - throws `HttpError(400)` when the title holds nothing to name it by, `500` when the tool fails
 */
export async function newEpic(root: string, title: string, prompt: string): Promise<string> {
  const files = new PlanDocFiles({ root })
  const name = freeName(files.epics, epicName(title))
  const commands = new PlanDocCommands({ files })
  // the tool prints what it wrote;  here that goes nowhere
  commands.print = () => {}
  for (const argv of [
    ["create", name, "--future", "--title", title, "--prompt", prompt],
    ["log", name, FROM_PAGE]
  ])
    if ((await commands.run(argv)) !== 0) throw new SRV.HttpError(500, `couldn't make epic ${name}`)
  return name
}

/**
 * `title` as `/epic` names an epic (`Docs Index` -> `docs-index`):  the kit's id rule, at most 40 characters.
 * - accents and apostrophes dropped:  `Café` -> `cafe`, `Owen's` -> `owens`
 */
export function epicName(title: string): string {
  const name = slug(title).slice(0, 40).replace(/-+$/, "")
  if (!name) throw new SRV.HttpError(400, `nothing to name an epic by in "${title}"`)
  return RESERVED.has(name) ? `${name}-epic` : name
}

/** The first words `/epic` takes as a verb, never an epic's name:  `EPIC_VERBS`, the one list. */
const RESERVED = new Set<string>(EPIC_VERBS)

/**
 * Star (`favorite`) or unstar epic `name` in checkout `root`'s favourites (`FAVORITES_FILE`, in its epic folder);
 * resolves to every starred epic's name after, sorted.
 * - SIDE EFFECT:  writes the file (`editFavorites()`:  under the page server's lock, a comment kept)
 * - throws `HttpError(400)` when `name` isn't an epic's name (lower-kebab-case, as `epicName()` makes them)
 */
export async function setFavorite(root: string, name: string, favorite: boolean): Promise<string[]> {
  if (!EPIC_NAME.test(name)) throw new SRV.HttpError(400, `not an epic's name:  "${name}"`)
  return editFavorites(EpicConfig.contentOf(root), (favorites) =>
    favorite ? favorites.add(name) : favorites.delete(name)
  )
}

/** The epic's name a card's menu sent (`{ name }`);  `""` for none, which `EpicLifecycle` refuses. */
function nameIn(body: unknown): string {
  const name = (body as { name?: unknown } | undefined)?.name
  return typeof name === "string" ? name : ""
}

/**
 * The saga epic `name`'s page names (`<epic-page saga>`), as `<epic-page>` links it:  `{ id, title, purpose, href }`,
 * `href` from the epic page's folder;  `null` with no page, no saga, or one that isn't in the list.
 * - reads the page's skeleton alone:  `<epic-page>` is there in a split page too
 */
export function sagaLinkOf(root: string, name: string): SagaLink | null {
  const file = PlanDocFiles.planDocIn(join(EpicConfig.contentOf(root), "epics", name), name)
  if (!file) return null
  const page = /<epic-page\b[^>]*>/.exec(readFileSync(file, "utf8"))?.[0] ?? ""
  const id = /\ssaga="([^"]+)"/.exec(page)?.[1]
  const saga = id ? new Sagas(root).find(id) : undefined
  if (!saga) return null
  return { id: saga.id, title: saga.title, purpose: saga.purpose, href: `/${Sagas.pageOf(saga.id)}` }
}

/** The saga `<epic-page>` links in its meta lines:  `sagaLinkOf()`'s answer (the element's own `SagaLink`). */
export type SagaLink = { id: string; title: string; purpose: string; href: string }

/** An epic's name:  lower-kebab-case, as `epicName()` makes them and the epics' folders are called. */
const EPIC_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `name`, or `name-2`, `name-3` ... when `epics/<name>/` is taken. */
function freeName(epics: string, name: string): string {
  let free = name
  for (let n = 2; existsSync(join(epics, free)); n++) free = `${name}-${n}`
  return free
}
