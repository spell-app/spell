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
 * The landing page:  a hero line over cards for your own projects, the ways to start, the examples and the guides.
 * - Its sections in Spell's own order, `SPACES.homeSections()`, dragged by their headers in dev (epic `repo-split` P28):
 *   your own projects first, under the hero, and only while you have some (epic `mockup` I40).
 * - Spell's own order also leaves some out, sections and projects (`SPACES.HOME_HIDDEN_KEY`, epic `mockup` I40):
 *   the library, the editor's pieces, the examples that need a sign-in ...
 * - In an app made for an org (`"spell": { "org": "acme" }` in its `package.json`):
 *   your own projects and each of the org's groups first, above the hero;  no library.
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
  // an app made for an org:  its person's projects and the org's groups first, above the hero;  no library
  // (`SPACES.homeSections()`;  Owen, 2026-11-16:  "AT THE TOP")
  const inOrg = SPACES.localPerson.org !== SPACES.SPELL_ORG
  const sections = () => SPACES.homeSections(inOrg, homeOrder())
  const isAboveHero = (section: SPACES.HomeSection) => inOrg && SPACES.HOME_ORG_FIRST.includes(section)
  // the browser's tab:  plain "Spell" here, a project's name on the editor's pages (`<AppMark>`)
  onSettled(() => {
    document.title = appTexts.text("appName")
  })

  return (
    <SpellPage id="ProjectChooser" fillWindow dark scrolling>
      <ChooserToolbar />
      <div class="Home">
        <For each={sections().filter(isAboveHero)}>{(section) => sectionFor(section)}</For>
        <Hero examples={exampleList()} guides={guideList()} />
        <For each={sections().filter((section) => !isAboveHero(section))}>{(section) => sectionFor(section)}</For>
      </div>
    </SpellPage>
  )

  /** One section of the page, by its id:  the org's is one per group of theirs. */
  function sectionFor(section: SPACES.HomeSection): JSX.Element {
    // read where it's used:  dragging turns on once the server has said it may (`mayReorder`)
    const drag = () => (inOrg ? undefined : sectionDragFor(section))
    switch (section) {
      case "start":
        return <StartCards drag={drag()} />
      case "examples":
        return (
          <ProjectCards
            id="examples"
            projectRoot={examples}
            line={appTexts.text("homeExamplesLine")}
            create={<Actions.createExample button appearance="basic" size="small" />}
            sectionDrag={drag()}
          />
        )
      case "library":
        return (
          <ProjectCards
            id="library"
            projectRoot={library}
            line={appTexts.text("homeLibraryLine")}
            hideWhenNone
            sectionDrag={drag()}
          />
        )
      case "guides":
        return (
          <ProjectCards
            id="guides"
            projectRoot={guides}
            line={appTexts.text("homeGuidesLine")}
            empty={appTexts.text("homeNoGuides")}
            create={<Actions.createGuide button appearance="basic" size="small" />}
            sectionDrag={drag()}
          />
        )
      case "projects":
        return (
          <ProjectCards
            id="projects"
            projectRoot={projects}
            line={appTexts.text("homeProjectsLine")}
            create={<Actions.createProject button appearance="basic" size="small" />}
            hideWhenNone
            sectionDrag={drag()}
          />
        )
      case "org":
        return <OrgGroups drag={drag()} />
      case "editor":
        // a dev-only root is there in every build -- just not listed outside dev
        return (
          <Show when={!!import.meta.env?.DEV || !editorPieces.devOnly}>
            <ProjectCards
              id="editor"
              projectRoot={editorPieces}
              line={appTexts.text("homeEditorLine")}
              small
              sectionDrag={drag()}
            />
          </Show>
        )
    }
  }
}

/****************
 * ### `<OrgGroups>`
 * The org's own groups, a section each (epic `repo-split` P28):  `@acme/tools`, as the server found them in
 * spell.spaces (`SPACES.orgGroups`).
 * - None in Spell's own org.
 * - Each group's cards by folder name:  Spell's own order never names an org's projects.
 ****************/
function OrgGroups(props: { drag?: TileCardDrag }) {
  const org = SPACES.localPerson.org
  return (
    <For each={SPACES.orgGroups}>
      {(path) => {
        const group = new SPACES.SpellProjectRoot(path)
        // the group's own title, `Tools` for `@acme/tools`:  its projects' word ("Apps") would name every org group alike
        return (
          <ProjectCards
            id={`org-${SPACES.folderNameOf(path)}`}
            projectRoot={group}
            heading={group.title}
            line={appTexts.text("homeOrgLine", { org })}
            sectionDrag={props.drag}
          />
        )
      }}
    </For>
  )
}

/****************
 * ### `<Hero>`
 * The landing page's first box:  what Spell is, in a line, with buttons to the first example and the first guide,
 * beside a few lines of the Task List.
 ****************/
function Hero(props: { examples: ProjectRootState; guides: ProjectRootState }) {
  // the first in the home page's order it shows a card for, the Calculator
  const firstExample = () => onHomeIn(SPACES.SpellProjectRoot.examples, props.examples)[0]?.path
  // the first guide the home page shows a card for
  const firstGuide = () => onHomeIn(SPACES.SpellProjectRoot.guides, props.guides)[0]?.path
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
 * - a few tiny starters, each the person's own to change:  Counter, Task List
 *   (Owen, epic `mockup` I40:  no Roll a Six, Site or Solitaire here any more)
 * - Import:  a project they exported, the way back after clearing a browser
 * - `drag`:  moving the whole section by its header, among the page's (in dev, in Spell's own checkout)
 ****************/
function StartCards(props: { drag?: TileCardDrag }) {
  return (
    <section
      id="start"
      class={["ProjectCards", sectionDragClasses(props.drag)]}
      {...sectionDropHandlers(() => props.drag)}
    >
      <header draggable={props.drag ? "true" : undefined} {...sectionGrabHandlers(() => props.drag)}>
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
      </div>
    </section>
  )
}

/** The example the to-do starter copies. */
const TASK_LIST = "@spell/examples/TaskList"

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
 *   - Not those it hides, nor a project that says `"onHome": false` (`onHomeIn()`).
 *   - In dev, where the server says it may (`mayReorder`), a card is dragged among its run to reorder it:
 *     the group's new order is saved into that list at once (`saveHomeOrder()`).
 *   - Only Spell's own groups:  an org's group (`SPACES.orgGroups`) never drags its cards.
 * - `sectionDrag`:  moving the whole section by its header, among the page's (`<ProjectChooser>`).
 ****************/
export function ProjectCards(props: ProjectCardsProps) {
  const root = trackProjectRoot(() => props.projectRoot)
  // the page of a group's sites lists every site;  the home page's rows, those it shows a card for
  const listed = () =>
    props.sitesOnly
      ? SPACES.inHomeOrder(
          props.projectRoot.path,
          root().projects.filter((project) => project.isSite),
          homeOrder()
        )
      : onHomeIn(props.projectRoot, root())
  onSettled(() => askMayReorder())
  // a card's drag among its run:  in dev, where the server lets this page reorder, never on a page of sites
  const dragFor = (project: CardProject, section: CardSection): TileCardDrag | undefined => {
    if (!mayReorder() || props.sitesOnly || !isSpellsOwn(props.projectRoot.path)) return undefined
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
        if (takes()) {
          const run = movedOnto(
            listed().map((each) => each.path),
            dragged()!,
            project.path
          )
          // the group's whole order, the projects the row doesn't show keeping their places
          const group = props.projectRoot.path
          const all = SPACES.inHomeOrder(group, root().projects, homeOrder()).map((each) => each.path)
          saveHomeOrder(group, SPACES.withRunReordered(all, run).map(SPACES.folderNameOf))
        }
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
      <section
        id={props.id}
        class={["ProjectCards", { small: !!props.small }, sectionDragClasses(props.sectionDrag)]}
        {...sectionDropHandlers(() => props.sectionDrag)}
      >
        <header draggable={props.sectionDrag ? "true" : undefined} {...sectionGrabHandlers(() => props.sectionDrag)}>
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

/**
 * `projectRoot`'s projects the home page shows a card for, in its order:
 * - not one its order hides (`SPACES.HOME_HIDDEN_KEY`:  FizzBuzz, the org apps ...;  epic `mockup` I40)
 * - nor one whose project file says `"onHome": false` (a library with no app of its own, the Spell UI site)
 */
function onHomeIn(projectRoot: SPACES.SpellProjectRoot, root: ProjectRootState): CardProject[] {
  const shown = root.projects.filter(
    (project) => project.onHome !== false && SPACES.isOnHome(project.path, homeOrder())
  )
  return SPACES.inHomeOrder(projectRoot.path, shown, homeOrder())
}

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
 * `names` with `from` moved onto `onto`'s place:  after it when dragged down the list, before it when dragged up,
 * as a list's drag reads.
 * - A card's run (projects' addresses), or the page's sections (their ids).
 */
function movedOnto<Name extends string>(names: readonly Name[], from: Name, onto: Name): Name[] {
  const fromIndex = names.indexOf(from)
  const without = names.filter((name) => name !== from)
  const ontoIndex = without.indexOf(onto)
  without.splice(fromIndex <= ontoIndex ? ontoIndex + 1 : ontoIndex, 0, from)
  return without
}

/** Is `group` one of Spell's own groups, whose order Spell keeps:  never an org's (`SPACES.orgGroups`). */
function isSpellsOwn(group: string): boolean {
  return SPACES.PROJECT_GROUPS.some((each) => each.path === group)
}

/** Show group `group` in the order `names` at once, and save it into the editor's list;  a failure is shown. */
function saveHomeOrder(group: string, names: string[]): void {
  setHomeOrder({ ...homeOrder(), [group]: names })
  const change: SPACES.HomeOrderChange = { group, names }
  void $fetch({ url: SPACES.HOME_ORDER_URL, contents: change, requestFormat: KnownFormat.json }).catch((error) =>
    editor.showError(error)
  )
}

////////////////
// ## The sections' order:  dragged by their headers, in dev (epic `repo-split` P28)
////////////////

/** The section being dragged, by its id;  the section it would drop on. */
const [draggedSection, setDraggedSection] = createSignal<SPACES.HomeSection>()
const [dropOnSection, setDropOnSection] = createSignal<SPACES.HomeSection>()

/**
 * Section `section`'s drag among the page's, by its header:  in dev, where the server lets this page reorder.
 * - Its new place is saved at once, the whole list of sections (`saveHomeOrder()`, `SPACES.HOME_SECTIONS_KEY`).
 * - The caller leaves it off an org's app:  its order is made from Spell's (`SPACES.homeSections()`), not saved.
 */
function sectionDragFor(section: SPACES.HomeSection): TileCardDrag | undefined {
  if (!mayReorder()) return undefined
  // a section's drag, onto another section
  const takes = () => !!draggedSection() && draggedSection() !== section
  return {
    get dragging() {
      return draggedSection() === section
    },
    get dropHere() {
      return dropOnSection() === section
    },
    onStart: (event) => {
      event.dataTransfer?.setData("text/plain", section)
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
      setDraggedSection(section)
    },
    onOver: (event) => {
      if (!takes()) return
      event.preventDefault()
      setDropOnSection(section)
    },
    onLeave: () => {
      if (dropOnSection() === section) setDropOnSection(undefined)
    },
    onDrop: (event) => {
      if (!takes()) return
      event.preventDefault()
      const run = movedOnto(SPACES.homeSections(false, homeOrder()), draggedSection()!, section)
      // every section's place, the hidden ones' kept
      const saved = (homeOrder()[SPACES.HOME_SECTIONS_KEY] ?? []).filter(SPACES.isHomeSection)
      const all = [...new Set([...saved, ...SPACES.HOME_SECTIONS])]
      saveHomeOrder(SPACES.HOME_SECTIONS_KEY, SPACES.withRunReordered(all, run))
      setDropOnSection(undefined)
    },
    onEnd: () => {
      setDraggedSection(undefined)
      setDropOnSection(undefined)
    }
  }
}

/** A section's look while sections drag:  `grabbable` by its header;  the one moving faint, where it'd land marked. */
function sectionDragClasses(drag: TileCardDrag | undefined) {
  return { grabbable: !!drag, dragging: !!drag?.dragging, "drop-here": !!drag?.dropHere }
}

/** A section's own handlers:  it takes another section's drop.  `drag` is read as each event comes. */
function sectionDropHandlers(drag: () => TileCardDrag | undefined) {
  return {
    onDragOver: (event: DragEvent) => drag()?.onOver(event),
    onDragLeave: (event: DragEvent) => drag()?.onLeave(event),
    onDrop: (event: DragEvent) => drag()?.onDrop(event)
  }
}

/** A section's header's handlers, the header being what's dragged:  `drag` is read as each event comes. */
function sectionGrabHandlers(drag: () => TileCardDrag | undefined) {
  return {
    onDragStart: (event: DragEvent) => drag()?.onStart(event),
    onDragEnd: (event: DragEvent) => drag()?.onEnd(event)
  }
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
  /** Moving the whole section by its header, among the home page's (`<ProjectChooser>`);  none:  it stays put. */
  sectionDrag?: TileCardDrag
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
      <Submenu slot="start" left spring>
        <ui-menu appearance="capsule">
          <AppMark />
        </ui-menu>
      </Submenu>
      <Submenu slot="end" right spring>
        <ui-menu appearance="capsule">
          <Actions.showProjectChooser iconOnly active={props.isHome ?? true} />
          <ThemeMenu />
          <Actions.you />
        </ui-menu>
      </Submenu>
    </AppMenu>
  )
}
