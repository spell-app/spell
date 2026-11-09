import { For, Show, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

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
import { EmptyCard, TileCard } from "./TileCard"

import "./ProjectChooser.css"

/****************
 * ### `<ProjectChooser>`
 * The landing page:  a hero line over cards for the examples, the guides and your own projects.
 * - Laid out as the facelift boards' home (epic `debut` P4):  a hero with the first example a click away,
 *   then a grid of cards per group, each card a project's title and the first phrase of its description.
 * - No empty columns:  a group with nothing in it says so in one quiet card;  "create" buttons sit in their
 *   group's header.
 * - In dev, also the editor's own pieces (`@spell/editor`, epic `editor` P22) and the test fixtures (`@spell/test`) -- open one to look at it, edit it, then
 *   `spell content check --bless`.  No "create" for those:  copy a project into `spaces/@spell/test/`.
 * - A guide opens in the editor, as an example does:  its prose is the comments in its spell file (epic `debut` Q18).
 * - Every route the others don't take (`routes.tsx`).
 * - Its look follows the editor's theme:  the hero and cards are tokens (`ProjectChooser.css`).
 ****************/
export function ProjectChooser() {
  const { projects, examples, guides, fixtures, editorPieces } = SPACES.SpellProjectRoot
  // a dev-only root is there in every build -- just not listed outside dev
  const showFixtures = !!import.meta.env?.DEV || !fixtures.devOnly
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
        <Show when={showFixtures}>
          <ProjectCards id="fixtures" projectRoot={fixtures} line={appTexts.text("homeFixturesLine")} small />
        </Show>
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
  const firstExample = () => props.examples.projects[0]?.path
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
 * - A card:  a coloured tile with the project's initial, its title, and the first phrase of its description.
 * - Clicking one opens it in the editor (`useRunner`:  in the runner).
 * - Nothing in it:  one quiet card saying so (`empty`, else "No examples yet!").
 * - Projects written in another language (Solitario, ListaDeTareas) come last, under a quiet line naming it,
 *   "En Español" (Owen, 2026-10-27):  each project's language is its files' (`SP.ProjectListEntry`).
 ****************/
export function ProjectCards(props: ProjectCardsProps) {
  const root = trackProjectRoot(() => props.projectRoot)
  // the page of a group's sites lists every site;  the home page's rows skip a project that says `"onHome": false`
  const listed = () =>
    root().projects.filter((project) => (props.sitesOnly ? project.isSite : project.onHome !== false))
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
              each={listed().filter((project) => !project.language)}
              fallback={<EmptyCard>{props.empty ?? appTexts.text("nothingInGroup", root().words)}</EmptyCard>}
            >
              {(project) => <ProjectCard project={project} useRunner={props.useRunner} sitesOnly={props.sitesOnly} />}
            </For>
            {/* those written in another language:  after the rest, under a quiet line naming it */}
            <For each={languagesIn(listed())}>
              {(language) => (
                <>
                  <h3 class="language">{languageTitle(language)}</h3>
                  <For each={listed().filter((project) => project.language === language)}>
                    {(project) => (
                      <ProjectCard project={project} useRunner={props.useRunner} sitesOnly={props.sitesOnly} />
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
  project: ProjectRootState["projects"][number]
  useRunner?: boolean
  sitesOnly?: boolean
}) {
  const project = () => props.project
  return (
    <TileCard
      title={project().name}
      line={firstPhrase(project().description)}
      hueFrom={project().path}
      href={props.sitesOnly ? siteEditorUrlFor(project().path) : project().path}
      onClick={(event) => {
        event.preventDefault()
        if (props.sitesOnly) editor.showSiteEditor(project().path)
        else openProject(project().path, props.useRunner)
      }}
    />
  )
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
