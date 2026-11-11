import { For, Show, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { $fetch, KnownFormat } from "spell/util"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { editor } from "spell/app/app/editor"
import {
  Actions,
  AppMark,
  AppMenu,
  SpellPage,
  Submenu,
  ThemeMenu,
  Inspector,
  Palette,
  openProject,
  trackProjectRoot,
  type ProjectRootState
} from "spell/app/app/solid"
import { siteEditorUrlFor } from "./pages.types"
import { EmptyCard, TileCard, type TileCardDrag } from "./TileCard"

import "./ProjectChooser.css"

/****************
 * ### `<ProjectChooser>`
 * The landing page:  a hero line over cards for the examples, the library's apps, the guides and your own projects.
 * - Laid out as the facelift boards' home (epic `debut` P4):  a hero with the first example a click away,
 *   then a grid of cards per group:  each card a picture of its app (else its letter), its title,
 *   and the first phrase of its description (`<ProjectCards>`).
 * - No empty columns:  a group with nothing in it says so in one quiet card;
 *   "create" buttons sit in their group's header.
 * - In dev, also the editor's own pieces (`@spell/editor`, epic `editor` P22).
 * - Not the test fixtures (`@spell/test`, epic `mockup` P18):  they're test data, opened from the project menu.
 * - A guide opens in the editor, as an example does:  its prose is the comments in its spell file (epic `debut` Q18).
 * - Every route the others don't take (`routes.tsx`).
 * - Its look follows the editor's theme:  the hero and cards are tokens (`ProjectChooser.css`).
 ****************/
export function ProjectChooser() {
  const { projects, examples, library, guides, editorPieces } = SPACES.SpellProjectRoot
  const exampleList = trackProjectRoot(() => examples)
  const guideList = trackProjectRoot(() => guides)
  // the browser's tab:  plain "Spell" here, a project's name on the editor's pages (`<AppMark>`)
  onSettled(() => {
    document.title = appTexts.text("appName")
  })

  return (
    <SpellPage id="ProjectChooser" fillWindow dark scrolling>
      <ChooserToolbar />
      <div class="Home">
        <Hero examples={exampleList()} guides={guideList()} />
        <StartCards />
        <ProjectCards
          id="examples"
          projectRoot={examples}
          line={appTexts.text("homeExamplesLine")}
          create={<Actions.createExample button appearance="basic" size="small" />}
        />
        <ProjectCards id="library" projectRoot={library} line={appTexts.text("homeLibraryLine")} hideWhenNone />
        <ProjectCards
          id="guides"
          projectRoot={guides}
          line={appTexts.text("homeGuidesLine")}
          empty={appTexts.text("homeNoGuides")}
          create={<Actions.createGuide button appearance="basic" size="small" />}
        />
        <ProjectCards
          id="projects"
          projectRoot={projects}
          line={appTexts.text("homeProjectsLine")}
          create={<Actions.createProject button appearance="basic" size="small" />}
        />
        {/* a dev-only root is there in every build -- just not listed outside dev */}
        <Show when={!!import.meta.env?.DEV || !editorPieces.devOnly}>
          <ProjectCards id="editor" projectRoot={editorPieces} line={appTexts.text("homeEditorLine")} small />
        </Show>
      </div>
    </SpellPage>
  )
}

/****************
 * ### `<Hero>`
 * The landing page's first box:  what Spell is, in a line, with buttons to the first example and the first guide,
 * beside a few lines of the Task List.
 ****************/
function Hero(props: { examples: ProjectRootState; guides: ProjectRootState }) {
  // the first in the home page's order, FizzBuzz
  const firstExample = () =>
    SPACES.inHomeOrder(SPACES.SpellProjectRoot.examples.path, props.examples.projects, homeOrder())[0]?.path
  // the first guide the home page shows a card for:  a project may stay off it (`"onHome": false`)
  const firstGuide = () => props.guides.projects.find((project) => project.onHome !== false)?.path
  return (
    <section class="Hero">
      <div class="pitch">
        <span class="eyebrow">{appTexts.text("homeEyebrow")}</span>
        <h1>{appTexts.text("homeTitle")}</h1>
        <p class="tagline">{appTexts.text("homeTagline")}</p>
        <p class="intro">{appTexts.text("homeIntro")}</p>
        <div class="buttons">
          <ui-button
            color="primary"
            size="large"
            icon={props.examples.icon ?? "lightbulb"}
            disabled={!firstExample()}
            onClick={() => firstExample() && openProject(firstExample()!)}
          >
            {appTexts.text("tryAnExample")}
          </ui-button>
          <ui-button
            appearance="basic"
            size="large"
            icon={props.guides.icon ?? "book open"}
            onClick={() => {
              if (firstGuide()) openProject(firstGuide()!)
              else document.getElementById("guides")?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            {appTexts.text("readFirstSpell")}
          </ui-button>
        </div>
      </div>
      <figure class="quote">
        <figcaption>{appTexts.text("homeQuoteTitle")}</figcaption>
        <blockquote>{appTexts.text("homeQuote")}</blockquote>
        <span class="note">
          <ui-icon name="magic" />
          {appTexts.text("homeQuoteNote")}
        </span>
      </figure>
    </section>
  )
}

/****************
 * ### `<StartCards>`
 * The ways to start making something, under the hero, in the group of cards the projects use:
 * - Blank:  an empty app, the palette open, so what it can hold shows at once
 * - a few tiny starters, each the person's own to change
 * - Solitaire:  a whole game to change something in, with an invitation to
 * - Import:  a project they exported, the way back after clearing a browser
 ****************/
function StartCards() {
  return (
    <section id="start" class="ProjectCards">
      <header>
        <h2>
          {appTexts.text("startTitle")}. <span class="line">{appTexts.text("startLine")}</span>
        </h2>
        <Actions.importApp button appearance="basic" size="small" />
      </header>
      <div class="cards">
        <StartCard
          name={appTexts.text("startBlank")}
          line={appTexts.text("startBlankLine")}
          start={() => {
            Palette.openOnArrival()
            Inspector.openQuietly()
            void editor.startFrom("blank", { codeClosed: true })
          }}
        />
        <StartCard
          name={appTexts.text("startCounter")}
          line={appTexts.text("startCounterLine")}
          start={() => void editor.startFrom("counter")}
        />
        <StartCard
          name={appTexts.text("startTaskList")}
          line={appTexts.text("startTaskListLine")}
          start={() => void editor.startFromCopy(TASK_LIST)}
        />
        <StartCard
          name={appTexts.text("startDice")}
          line={appTexts.text("startDiceLine")}
          start={() => void editor.startFrom("dice")}
        />
        <StartCard
          name={appTexts.text("startSolitaire")}
          line={appTexts.text("startSolitaireLine")}
          start={() => {
            Inspector.openQuietly()
            openProject(SOLITAIRE)
            editor.showNotice(appTexts.text("startSolitaireInvite"))
          }}
        />
      </div>
    </section>
  )
}

/** The example the to-do starter copies. */
const TASK_LIST = "@spell/examples/TaskList"

/** The example the whole-game way in opens. */
const SOLITAIRE = "@spell/examples/Solitaire"

/** One way to start:  a card like a project's. */
function StartCard(props: { name: string; line: string; start: () => void }) {
  return <TileCard title={props.name} line={props.line} hueFrom={props.name} onClick={() => props.start()} />
}

/****************
 * ### `<ProjectCards>`
 * One group of the landing page:  its title and line, its "create" button, then a card per project.
 * - A card:  a picture of its app running (its `__thumbnail.png`, epic `mockup` P18), else a coloured tile with the
 *   project's initial;  then its title, and the first phrase of its description.
 *   - In a row with any pictures, each card's picture (or tile) is a banner across its top.
 * - Clicking one opens it in the editor (`useRunner`:  in the runner).
 * - Nothing in it:  one quiet card saying so (`empty`, else "No examples yet!").
 * - Its projects with a category (the examples:  "First steps", "Games" ...) come under a quiet line per category,
 *   in `SPACES.EXAMPLE_CATEGORIES`' order (epic `mockup` P18);  those with none after them.
 * - Projects written in another language (Solitario, ListaDeTareas) come last, under a quiet line naming it,
 *   "En Español" (Owen, 2026-10-27):  each project's language is its files' (`SP.ProjectListEntry`).
 * - In the editor's order of each group, `SPACES.HOME_ORDER` (epic `mockup` P19);  one it doesn't list, last.
 *   - In dev, where the server says it may (`mayReorder`), a card is dragged among its run to reorder it:
 *     the group's new order is saved into that list at once (`saveHomeOrder()`).
 ****************/
export function ProjectCards(props: ProjectCardsProps) {
  const root = trackProjectRoot(() => props.projectRoot)
  // the page of a group's sites lists every site;  the home page's rows skip a project that says `"onHome": false`
  const listed = () =>
    SPACES.inHomeOrder(
      props.projectRoot.path,
      root().projects.filter((project) => (props.sitesOnly ? project.isSite : project.onHome !== false)),
      homeOrder()
    )
  onSettled(() => askMayReorder())
  // a card's drag among its run:  in dev, where the server lets this page reorder, never on a page of sites
  const dragFor = (project: CardProject, section: CardSection): TileCardDrag | undefined => {
    if (!mayReorder() || props.sitesOnly) return undefined
    // a drag from this run, onto another card of it
    const takes = () =>
      !!dragged() && dragged() !== project.path && section.projects.some((each) => each.path === dragged())
    return {
      dragging: dragged() === project.path,
      dropHere: dropOn() === project.path,
      onStart: (event) => {
        event.dataTransfer?.setData("text/plain", project.path)
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
        setDragged(project.path)
      },
      onOver: (event) => {
        if (!takes()) return
        event.preventDefault()
        setDropOn(project.path)
      },
      onLeave: () => {
        if (dropOn() === project.path) setDropOn(undefined)
      },
      onDrop: (event) => {
        event.preventDefault()
        if (takes()) saveHomeOrder(props.projectRoot.path, movedOnto(listed(), dragged()!, project.path))
        setDropOn(undefined)
      },
      onEnd: () => {
        setDragged(undefined)
        setDropOn(undefined)
      }
    }
  }
  // a row with pictures of its apps shows each big, across its card's top;  one without one, its letter as big
  const banner = () => listed().some((project) => project.hasThumbnail)
  return (
    <Show when={!props.hideWhenNone || listed().length > 0}>
      <section id={props.id} class={["ProjectCards", { small: !!props.small }]}>
        <header>
          <h2>
            {props.heading ?? root().words.title}. <span class="line">{props.line}</span>
          </h2>
          {props.create}
        </header>
        <div class="cards">
          <Show
            when={root().loaded}
            fallback={
              <EmptyCard>
                {root().failed ? appTexts.text("couldNotLoadGroup", root().words) : appTexts.text("loadingGroup")}
              </EmptyCard>
            }
          >
            <For
              each={sectionsOf(listed())}
              fallback={<EmptyCard>{props.empty ?? appTexts.text("nothingInGroup", root().words)}</EmptyCard>}
            >
              {(section) => (
                <>
                  <Show when={section.title}>
                    <h3 class="subhead">{section.title}</h3>
                  </Show>
                  <For each={section.projects}>
                    {(project) => (
                      <ProjectCard
                        project={project}
                        useRunner={props.useRunner}
                        sitesOnly={props.sitesOnly}
                        banner={banner()}
                        drag={dragFor(project, section)}
                      />
                    )}
                  </For>
                </>
              )}
            </For>
          </Show>
        </div>
      </section>
    </Show>
  )
}

/** One project's card:  its tile, its title, the first phrase of its description;  a click opens it. */
function ProjectCard(props: {
  project: CardProject
  useRunner?: boolean
  sitesOnly?: boolean
  banner?: boolean
  drag?: TileCardDrag
}) {
  const project = () => props.project
  return (
    <TileCard
      title={project().name}
      line={firstPhrase(project().description)}
      hueFrom={project().path}
      banner={props.banner}
      drag={props.drag}
      picture={
        project().hasThumbnail ? SP.SpellUrls.fileUrl(`${project().path}/${SPACES.PROJECT_THUMBNAIL}`) : undefined
      }
      href={props.sitesOnly ? siteEditorUrlFor(project().path) : project().path}
      onClick={(event) => {
        event.preventDefault()
        if (props.sitesOnly) editor.showSiteEditor(project().path)
        else openProject(project().path, props.useRunner)
      }}
    />
  )
}

/** One project, as a group's card shows it. */
type CardProject = ProjectRootState["projects"][number]

////////////////
// ## The home page's order:  dragged in dev
////////////////

/** Each group's order on the home page:  as saved (`SPACES.HOME_ORDER`), then as dragged since. */
const [homeOrder, setHomeOrder] = createSignal<Readonly<Record<string, readonly string[]>>>(SPACES.HOME_ORDER)

/** May this page drag cards to reorder them?  Only once the server has said so (`askMayReorder()`). */
const [mayReorder, setMayReorder] = createSignal(false)

/** The card being dragged, by its project's address;  the card it would drop on. */
const [dragged, setDragged] = createSignal<string>()
const [dropOn, setDropOn] = createSignal<string>()

/** Asked once already? */
let askedMayReorder = false

/**
 * Ask the server, once, whether this page may reorder the cards:  only in dev.
 * - NEVER throws:  where it may not (the house-network site, a build), it's refused, and the cards just don't drag.
 */
function askMayReorder(): void {
  if (askedMayReorder || !import.meta.env?.DEV) return
  askedMayReorder = true
  $fetch<SPACES.HomeOrderAnswer>({ url: SPACES.HOME_ORDER_URL, format: KnownFormat.json })
    .then((answer) => setMayReorder(answer.mayReorder))
    .catch(() => setMayReorder(false))
}

/**
 * `projects`' folder names with `from` moved onto `onto`'s place:  before it when dragged up the row, after it when
 * dragged down, as a list's drag reads.
 */
function movedOnto(projects: readonly CardProject[], from: string, onto: string): string[] {
  const paths = projects.map((project) => project.path)
  const fromIndex = paths.indexOf(from)
  const without = paths.filter((path) => path !== from)
  const ontoIndex = without.indexOf(onto)
  without.splice(fromIndex <= ontoIndex ? ontoIndex + 1 : ontoIndex, 0, from)
  return without.map(SPACES.folderNameOf)
}

/** Show group `group` in the order `names` at once, and save it into the editor's list;  a failure is shown. */
function saveHomeOrder(group: string, names: string[]): void {
  setHomeOrder({ ...homeOrder(), [group]: names })
  const change: SPACES.HomeOrderChange = { group, names }
  void $fetch({ url: SPACES.HOME_ORDER_URL, contents: change, requestFormat: KnownFormat.json }).catch((error) =>
    editor.showError(error)
  )
}

/** One run of a group's cards, under its quiet line:  a category's, or a language's. */
type CardSection = {
  /** Its line:  "Games", "En Español";  none for those with no category. */
  title?: string
  /** Its projects, in the group's order. */
  projects: ProjectRootState["projects"]
}

/**
 * `projects` in the runs the home page shows them in:
 * - those in English with a category, a run per category, in `SPACES.EXAMPLE_CATEGORIES`' order
 * - then those in English with none, with no line
 * - then those in another language, a run per language
 * - Runs with nothing in them are left out.
 */
function sectionsOf(projects: ProjectRootState["projects"]): CardSection[] {
  const english = projects.filter((project) => !project.language)
  const categories: readonly string[] = SPACES.EXAMPLE_CATEGORIES
  const sections: CardSection[] = [
    ...SPACES.EXAMPLE_CATEGORIES.map((category) => ({
      title: appTexts.text(`category.${category}`),
      projects: english.filter((project) => project.category === category)
    })),
    { projects: english.filter((project) => !categories.includes(project.category ?? "")) },
    ...languagesIn(projects).map((language) => ({
      title: languageTitle(language),
      projects: projects.filter((project) => project.language === language)
    }))
  ]
  return sections.filter((section) => section.projects.length > 0)
}

/** The languages other than English that `projects` are written in, in the order they come. */
function languagesIn(projects: ProjectRootState["projects"]): string[] {
  return [...new Set(projects.flatMap((project) => (project.language ? [project.language] : [])))]
}

/** The line over a language's projects:  "En Español", in that language;  else its name in English. */
function languageTitle(language: string): string {
  return language === "es" ? appTexts.text("homeInSpanish") : SP.Language.for(language).name
}

/** Props for `<ProjectCards>`. */
export type ProjectCardsProps = {
  /** The section's id:  a link target (`#examples`). */
  id: string
  /** The group whose projects to show. */
  projectRoot: SPACES.SpellProjectRoot
  /** Its title, in place of its group's own (the group's word for what it holds). */
  heading?: string
  /** The quiet line after its title, if any. */
  line?: string
  /** Its "create" button, in its header. */
  create?: JSX.Element
  /** What its one card says while it's empty;  default "No examples yet!". */
  empty?: string
  /** Open its projects in the runner, not the editor. */
  useRunner?: boolean
  /** Smaller cards, e.g. the test fixtures. */
  small?: boolean
  /** Only its projects that hold a site, each opening in the site editor (`<SiteGroupPage>`). */
  sitesOnly?: boolean
  /** Show nothing at all while it lists nothing, or hasn't loaded:  for a page of many groups (`<SitesHomePage>`). */
  hideWhenNone?: boolean
}

/**
 * The first phrase of a project's description, for its card:  up to its first `:`, `;` or sentence's end.
 * - `"A to-do list in the outline style:  each task ..."` => `"A to-do list in the outline style"`.
 */
function firstPhrase(description: string | undefined): string | undefined {
  return description?.split(/[:;]\s|\.\s/)[0]?.trim() || undefined
}

/****************
 * ### `<ChooserToolbar>`
 * Top menu of `<ProjectChooser>`:  two pills with a gap, as a Mac's toolbar has them (Owen, epic `editor` J8):
 * Spell's mark, then Home (lit:  this is it), the theme menu and the person.
 * - Also the theme editor's (`<ThemeEditorPage>`), with Home unlit (`isHome={false}`).
 ****************/
export function ChooserToolbar(props: { isHome?: boolean }) {
  return (
    <AppMenu>
      <Submenu left spring>
        <ui-menu appearance="capsule">
          <AppMark />
        </ui-menu>
      </Submenu>
      <Submenu right spring>
        <ui-menu appearance="capsule">
          <Actions.showProjectChooser iconOnly active={props.isHome ?? true} />
          <ThemeMenu />
          <Actions.you />
        </ui-menu>
      </Submenu>
    </AppMenu>
  )
}
