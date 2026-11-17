import { For, Show, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import { editor } from "spell/app/app/editor"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import {
  Actions,
  AppMark,
  AppMenu,
  SpellPage,
  Submenu,
  ThemeMenu,
  Inspector,
  MoreMenu,
  Palette,
  openProject,
  trackProjectRoot,
  type ProjectRootState
} from "spell/app/app/solid"
import { siteEditorUrlFor } from "./pages.types"
import { EditableText } from "./EditableText"
import { HomeArrangement } from "./HomeArrangement"
import { EmptyCard, TileCard, type TileCardDrag, type TileCardEdit } from "./TileCard"

import "./ProjectChooser.css"

/****************
 * ### `<ProjectChooser>`
 * The landing page:  a hero line over cards for your own projects, the ways to start, the examples and the guides.
 * - The examples and guides written in Spanish are a section of their own, "En español", after the English ones
 *   (Owen, epic `mockup` I46:  "Split the english and Spanish into two sections");  `<LanguageCards>`.
 * - Its sections in Spell's own order, `SPACES.homeSections()`:
 *   your own projects first, under the hero, and only while you have some (epic `mockup` I40).
 * - "Rearrange Home Screen", at its foot, turns on a mode where everything moves, and its words change
 *   (epic `mockup` T51, `HomeArrangement`):  cards drag among their section's, sections by their headers;
 *   a card's title and tagline, a section's header and line, are typed in where they are.
 *   - `@spell`'s people change everyone's;  anyone else, their own, with "Reset to Default".
 * - Each of your own projects' cards has a "..." menu, 12px in from its top left:
 *   run it, rename, duplicate, its versions, export, its picture, delete (`<CardMenu>`, epic `mockup` T47).
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
  const sections = () => SPACES.homeSections(inOrg, HomeArrangement.layout.order)
  const isAboveHero = (section: SPACES.HomeSection) => inOrg && SPACES.HOME_ORG_FIRST.includes(section)
  // the browser's tab:  plain "Spell" here, a project's name on the editor's pages (`<AppMark>`)
  onSettled(() => {
    document.title = appTexts.text("appName")
    HomeArrangement.load()
  })

  return (
    <SpellPage id="ProjectChooser" fillWindow dark scrolling>
      <ChooserToolbar />
      <div class={["Home", { rearranging: HomeArrangement.isRearranging }]}>
        <RearrangeBar />
        <For each={sections().filter(isAboveHero)}>{(section) => sectionFor(section)}</For>
        <Hero examples={exampleList()} guides={guideList()} />
        <For each={sections().filter((section) => !isAboveHero(section))}>{(section) => sectionFor(section)}</For>
        <RearrangeButton />
      </div>
    </SpellPage>
  )

  /** One section of the page, by its id:  the org's is one per group of theirs. */
  function sectionFor(section: SPACES.HomeSection): JSX.Element {
    // read where it's used:  sections drag while the page is rearranged
    const drag = () => (inOrg ? undefined : sectionDragFor(section))
    switch (section) {
      case "start":
        return <StartCards drag={drag()} />
      case "examples":
        return (
          <ProjectCards
            id="examples"
            projectRoot={examples}
            language={ENGLISH}
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
            language={ENGLISH}
            line={appTexts.text("homeGuidesLine")}
            empty={appTexts.text("homeNoGuides")}
            create={<Actions.createGuide button appearance="basic" size="small" />}
            sectionDrag={drag()}
          />
        )
      case "spanish":
        return (
          <LanguageCards
            id="spanish"
            language={SPANISH}
            heading={appTexts.text("homeSpanishTitle")}
            line={appTexts.text("homeSpanishLine")}
            groups={[
              { projectRoot: examples, title: appTexts.text("homeSpanishExamples") },
              { projectRoot: guides, title: appTexts.text("homeSpanishGuides") }
            ]}
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
            cardMenu
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
  // the first English example the home page shows a card for, the Calculator
  const firstExample = () =>
    cardsOf({ projectRoot: SPACES.SpellProjectRoot.examples, language: ENGLISH }, props.examples)[0]?.path
  // the first English guide the home page shows a card for
  const firstGuide = () =>
    cardsOf({ projectRoot: SPACES.SpellProjectRoot.guides, language: ENGLISH }, props.guides)[0]?.path
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
 * - a few tiny starters, each the person's own to change:  Counter, the to-do list (Task List's copy), Converter
 *   (Owen, epic `mockup` I40:  no Roll a Six, Site or Solitaire here any more;
 *   T50:  "Put counter first", its program counters you name, step, reset and total)
 * - Blank, last:  an empty app, the palette open, so what it can hold shows at once
 *   (Owen, epic `mockup` T44:  "adding things in the editor doesn't work that great yet, so don't lead with that")
 * - Import:  a project they exported, the way back after clearing a browser
 * - `drag`:  moving the whole section by its header, among the page's, while it's rearranged
 * - Its cards in the layout's order (`SPACES.HOME_START_KEY`), dragged among themselves while it's rearranged,
 *   their words changed per language (`START_CARDS`).
 ****************/
function StartCards(props: { drag?: TileCardDrag }) {
  const ids = () => inOrderOf(SPACES.HOME_START_KEY, SPACES.HOME_START_CARDS)
  return (
    <HomeSection
      id="start"
      heading={appTexts.text("startTitle")}
      line={appTexts.text("startLine")}
      actions={<Actions.importApp button appearance="basic" size="small" />}
      drag={props.drag}
    >
      <For each={ids()}>
        {(id) => (
          <StartCard
            id={id}
            drag={cardDragFor(
              id,
              ids,
              (run) => HomeArrangement.saveOrder(SPACES.HOME_START_KEY, run)
            )}
          />
        )}
      </For>
    </HomeSection>
  )
}

/** The example the to-do starter copies. */
const TASK_LIST = "@spell/examples/TaskList"

/**
 * Each start card's words and what it does, by id (`SPACES.HOME_START_CARDS`), in no order:  the layout's.
 * - Counter first (Owen, epic `mockup` T50);  Blank last, its palette open on arrival (T44).
 */
const START_CARDS: Record<SPACES.HomeStartCard, { name: AppTextKey; line: AppTextKey; start: () => void }> = {
  counter: { name: "startCounter", line: "startCounterLine", start: () => void editor.startFrom("counter") },
  todo: { name: "startTaskList", line: "startTaskListLine", start: () => void editor.startFromCopy(TASK_LIST) },
  converter: { name: "startConverter", line: "startConverterLine", start: () => void editor.startFrom("converter") },
  blank: {
    name: "startBlank",
    line: "startBlankLine",
    start: () => {
      Palette.openOnArrival()
      Inspector.openQuietly()
      void editor.startFrom("blank", { codeClosed: true })
    }
  }
}

/** One way to start:  a card like a project's, its words as changed in this language (`HomeArrangement`). */
function StartCard(props: { id: SPACES.HomeStartCard; drag?: TileCardDrag }) {
  const card = () => START_CARDS[props.id]
  const key = () => SPACES.homeTextKey({ start: props.id, lang: appTexts.lang })
  const title = () => HomeArrangement.textFor(key()).title ?? appTexts.text(card().name)
  const line = () => HomeArrangement.textFor(key()).line ?? appTexts.text(card().line)
  return (
    <Show
      when={HomeArrangement.isRearranging}
      fallback={<TileCard title={title()} line={line()} hueFrom={title()} onClick={() => card().start()} />}
    >
      <TileCard
        title={title()}
        line={line()}
        hueFrom={title()}
        drag={props.drag}
        edit={cardEditFor(key, SPACES.CARD_LINE_LENGTH)}
      />
    </Show>
  )
}

/****************
 * ### `<HomeSection>`
 * One section of the landing page:  its title and quiet line, its buttons on the right, then its cards in a grid.
 * - `drag`:  moving the whole section by its header, among the page's, while it's rearranged;
 *   none:  it stays put.
 * - Its header and line as changed in this language (`HomeArrangement`), typed in where they are while it's rearranged.
 * - The shape every section shares:  the ways to start, a group's cards, a language's.
 ****************/
function HomeSection(props: {
  id: string
  heading: string
  line?: string
  actions?: JSX.Element
  small?: boolean
  drag?: TileCardDrag
  children: JSX.Element
}) {
  const key = () => SPACES.homeTextKey({ section: props.id, lang: appTexts.lang })
  const heading = () => HomeArrangement.textFor(key()).title ?? props.heading
  const line = () => HomeArrangement.textFor(key()).line ?? props.line ?? ""
  return (
    <section
      id={props.id}
      class={["ProjectCards", { small: !!props.small }, sectionDragClasses(props.drag)]}
      {...sectionDropHandlers(() => props.drag)}
    >
      <header
        draggable={props.drag && !HomeArrangement.isEditingText ? "true" : undefined}
        {...sectionGrabHandlers(() => props.drag)}
      >
        <Show
          when={HomeArrangement.isRearranging}
          fallback={
            <h2>
              {heading()}. <span class="line">{line()}</span>
            </h2>
          }
        >
          <h2>
            <EditableText
              value={heading()}
              label={appTexts.text("homeSectionHeader")}
              onSave={(text) => HomeArrangement.saveText(key(), { title: text })}
            />
            .{" "}
            <EditableText
              class="line"
              value={line()}
              label={appTexts.text("homeSectionLine")}
              placeholder={appTexts.text("homeSectionLine")}
              onSave={(text) => HomeArrangement.saveText(key(), { line: text })}
            />
          </h2>
        </Show>
        {props.actions}
      </header>
      <div class="cards">{props.children}</div>
    </section>
  )
}

/****************
 * ### `<ProjectCards>`
 * One group of the landing page:  its title and line, its "create" button, then a card per project.
 * - A card:  a picture of its app running (its `__thumbnail.png`, epic `mockup` P18), else a coloured tile with the
 *   project's initial;  then its title, and the first phrase of its description.
 *   - In a row with any pictures, each card's picture (or tile) is a banner across its top.
 * - Clicking one opens it in the editor (`useRunner`:  in the runner).
 * - Nothing in it:  one quiet card saying so (`empty`, else "No examples yet!").
 * - Its projects in ONE set, no line over them (Owen, epic `mockup` I48:  "Merge the examples into one set").
 * - `language`:  only its projects written in that language (`languageOf()`);
 *   the examples and guides show their English ones, and the Spanish ones are `<LanguageCards>`' (epic `mockup` I46).
 * - In the editor's order of each group, `SPACES.HOME_ORDER` (epic `mockup` P19);  one it doesn't list, last.
 *   - Not those it hides, nor a project that says `"onHome": false` (`onHomeIn()`).
 *   - While the page is rearranged, a card is dragged among the set's to reorder it:
 *     the group's new order is saved at once (`HomeArrangement.saveOrder()`).
 *   - Only Spell's own groups and your own:  an org's group (`SPACES.orgGroups`) never drags its cards.
 * - `sectionDrag`:  moving the whole section by its header, among the page's (`<ProjectChooser>`).
 ****************/
export function ProjectCards(props: ProjectCardsProps) {
  const root = trackProjectRoot(() => props.projectRoot)
  return (
    <Show when={!props.hideWhenNone || cardsOf(props, root()).length > 0}>
      <HomeSection
        id={props.id}
        heading={props.heading ?? root().words.title}
        line={props.line}
        actions={props.create}
        small={props.small}
        drag={props.sectionDrag}
      >
        <GroupCards
          projectRoot={props.projectRoot}
          root={root()}
          language={props.language}
          useRunner={props.useRunner}
          sitesOnly={props.sitesOnly}
          cardMenu={props.cardMenu}
          empty={props.empty ?? appTexts.text("nothingInGroup", root().words)}
        />
      </HomeSection>
    </Show>
  )
}

/****************
 * ### `<LanguageCards>`
 * The section of the projects written in one language other than English:
 * "En español", its examples then its guides (Owen, epic `mockup` I46:  "Split the english and Spanish into two sections").
 * - Each group's cards under a quiet line in that language, "Ejemplos", "Guías";  a group with none in it, no line.
 * - Not there at all once every group has loaded with none.
 * - Cards drag among their own group's, as in `<ProjectCards>`;  the section by its header.
 ****************/
function LanguageCards(props: {
  /** The section's id:  a link target (`#spanish`) and its place in Spell's order (`SPACES.HOME_SECTIONS`). */
  id: string
  /** Its projects' language, `es`:  `languageOf()`. */
  language: string
  /** Its title and quiet line, in that language. */
  heading: string
  line: string
  /** The groups it shows that language's projects of, in order, each with the line over its cards. */
  groups: { projectRoot: SPACES.SpellProjectRoot; title: string }[]
  /** Moving the whole section by its header, among the home page's. */
  sectionDrag?: TileCardDrag
}) {
  const groups = props.groups.map((group) => ({ ...group, root: trackProjectRoot(() => group.projectRoot) }))
  const hasAny = () =>
    groups.some((group) => !group.root().loaded || cardsOf({ ...group, language: props.language }, group.root()).length)
  return (
    <Show when={hasAny()}>
      <HomeSection id={props.id} heading={props.heading} line={props.line} drag={props.sectionDrag}>
        <For each={groups}>
          {(group) => (
            <GroupCards
              projectRoot={group.projectRoot}
              root={group.root()}
              language={props.language}
              title={group.title}
            />
          )}
        </For>
      </HomeSection>
    </Show>
  )
}

/**
 * One group's cards, in the grid of the section they're in:  `<ProjectCards>`' one group, `<LanguageCards>`' each.
 * - `title`:  one quiet line over them all, while there are any;  none:  no line.
 * - `empty`:  what its one card says while it has none;  none:  nothing at all.
 * - Still loading, or it failed:  one quiet card saying so.
 */
function GroupCards(props: {
  projectRoot: SPACES.SpellProjectRoot
  root: ProjectRootState
  language?: string
  useRunner?: boolean
  sitesOnly?: boolean
  cardMenu?: boolean
  title?: string
  empty?: string
}) {
  const listed = () => cardsOf(props, props.root)
  // a card's drag among the group's, while the page is rearranged:  never on a page of sites, nor an org's group
  const dragFor = (project: CardProject): TileCardDrag | undefined => {
    if (props.sitesOnly || !isSpellsOwn(props.projectRoot.path)) return undefined
    return cardDragFor(
      project.path,
      () => listed().map((each) => each.path),
      (run) => {
        // the group's whole order, the projects the row doesn't show keeping their places
        const group = props.projectRoot.path
        const order = HomeArrangement.layout.order
        const all = SPACES.inHomeOrder(group, props.root.projects, order).map((each) => each.path)
        HomeArrangement.saveOrder(group, SPACES.withRunReordered(all, run).map(SPACES.folderNameOf))
      }
    )
  }
  // a row with pictures of its apps shows each big, across its card's top;  one without one, its letter as big
  const banner = () => listed().some((project) => project.hasThumbnail)
  return (
    <Show
      when={props.root.loaded}
      fallback={
        <EmptyCard>
          {props.root.failed ? appTexts.text("couldNotLoadGroup", props.root.words) : appTexts.text("loadingGroup")}
        </EmptyCard>
      }
    >
      <Show
        when={listed().length > 0}
        fallback={props.empty === undefined ? undefined : <EmptyCard>{props.empty}</EmptyCard>}
      >
        <Show when={props.title}>
          <h3 class="subhead">{props.title}</h3>
        </Show>
        <For each={listed()}>
          {(project) => (
            <ProjectCard
              project={project}
              useRunner={props.useRunner}
              sitesOnly={props.sitesOnly}
              banner={banner()}
              drag={dragFor(project)}
              menu={props.cardMenu ? <CardMenu projectRoot={props.projectRoot} project={project} /> : undefined}
            />
          )}
        </For>
      </Show>
    </Show>
  )
}

/**
 * One project's card:  its tile, its title, the first phrase of its description;  a click opens it.
 * - Its title and line as changed on the home page (`HomeArrangement`), over the project's own:
 *   typed in where they are while it's rearranged, when it can be dragged.
 */
function ProjectCard(props: {
  project: CardProject
  useRunner?: boolean
  sitesOnly?: boolean
  banner?: boolean
  drag?: TileCardDrag
  menu?: JSX.Element
}) {
  const project = () => props.project
  const key = () => SPACES.homeTextKey({ project: project().path })
  const title = () => (props.sitesOnly ? undefined : HomeArrangement.textFor(key()).title) ?? project().name
  const line = () =>
    (props.sitesOnly ? undefined : HomeArrangement.textFor(key()).line) ?? SPACES.cardLineOf(project().description)
  return (
    <Show
      when={HomeArrangement.isRearranging && props.drag}
      fallback={
        <TileCard
          title={title()}
          line={line()}
          hueFrom={project().path}
          banner={props.banner}
          drag={props.drag}
          menu={props.menu}
          picture={pictureOf(project())}
          href={props.sitesOnly ? siteEditorUrlFor(project().path) : project().path}
          onClick={(event) => {
            event.preventDefault()
            if (props.sitesOnly) editor.showSiteEditor(project().path)
            else openProject(project().path, props.useRunner)
          }}
        />
      }
    >
      <TileCard
        title={title()}
        line={line()}
        hueFrom={project().path}
        banner={props.banner}
        drag={props.drag}
        picture={pictureOf(project())}
        edit={cardEditFor(key, SPACES.CARD_LINE_LENGTH)}
      />
    </Show>
  )
}

/** A card's words, typed in where they are, kept under `key()` (`SPACES.homeTextKey()`);  past `lineLimit`, marked. */
function cardEditFor(key: () => string, lineLimit: number): TileCardEdit {
  return {
    onTitle: (text) => HomeArrangement.saveText(key(), { title: text }),
    onLine: (text) => HomeArrangement.saveText(key(), { line: text }),
    titleLabel: appTexts.text("homeCardTitle"),
    lineLabel: appTexts.text("homeCardTagline"),
    lineLimit
  }
}

/** One project, as a group's card shows it. */
type CardProject = ProjectRootState["projects"][number]

/**
 * A card's picture:  its project's `__thumbnail.png`, if it has one.
 * - Updated since the page opened (`CardMenu`'s Update App Snapshot…):  asked for afresh, past the browser's copy.
 */
function pictureOf(project: CardProject): string | undefined {
  if (!project.hasThumbnail) return undefined
  const url = SP.SpellUrls.fileUrl(`${project.path}/${SPACES.PROJECT_THUMBNAIL}`)
  const taken = snapshotAt()[project.path]
  return taken ? `${url}?taken=${taken}` : url
}

////////////////
// ## A card's "..." menu:  your own projects' (epic `mockup` T47)
////////////////

/****************
 * ### `<CardMenu>`
 * The "..." menu over the top left corner of each card of yours (the `projects` section), 12px in:
 * what you can do with that project without opening it (Owen, epic `mockup` T47).
 * - Its items are ONE list, `CARD_ACTIONS`, in their order:  add one there.
 * - Each acts on THIS card's project:  the editor's own flows, handed it (`editor.renameApp({ project })` ...).
 *   - a rename or a copy shows in the list at once, the card in its place;  a delete asks first, then the card goes
 * - A click on it, or on an item, never opens the project:  it's the card's sibling (`<TileCard>`'s `menu`).
 * - A button of its own on the keyboard, named "Project actions".
 ****************/
function CardMenu(props: { projectRoot: SPACES.SpellProjectRoot; project: CardProject }) {
  // the project's model, from its group:  what the editor's flows take
  const projectFor = () => props.projectRoot.getProject(props.project.path)
  const run = (action: CardAction) => {
    const project = projectFor()
    if (project) void action.run(project)
  }
  return (
    <MoreMenu
      item={false}
      class="CardMenu"
      size="small"
      aria-label={appTexts.text("cardMenu")}
      title={appTexts.text("cardMenu")}
    >
      <For each={CARD_ACTIONS.filter((action) => action === "divider" || !(action.needsServer && isStaticBuild))}>
        {(action) =>
          action === "divider" ? (
            <ui-item kind="divider" />
          ) : (
            <ui-item value={action.words} icon={action.icon} onClick={() => run(action)}>
              {appTexts.text(action.words)}
            </ui-item>
          )
        }
      </For>
    </MoreMenu>
  )
}

/** One of a card's menu's items. */
type CardAction = {
  /** its words, a key of the editor's:  `renameProject` */
  words: AppTextKey
  /** its icon, Fomantic's name */
  icon: string
  /** what it does to the card's project */
  run: (project: SP.SpellProject) => unknown
  /** only where there's a server (not the static build):  versions, pictures */
  needsServer?: boolean
}

/**
 * A card's menu's items, in order, `"divider"` a line between (Owen, epic `mockup` T47):
 * Run App in a New Tab;  Rename, Duplicate, Versions, Export, Update App Snapshot;  Delete.
 */
const CARD_ACTIONS: readonly (CardAction | "divider")[] = [
  { words: "cardRunApp", icon: "external alternate", run: (project) => editor.runInNewTab({ project }) },
  "divider",
  { words: "renameProject", icon: "edit outline", run: (project) => editor.renameApp({ project }) },
  { words: "duplicateProject", icon: "clone outline", run: (project) => editor.duplicateApp({ project }) },
  { words: "cardVersions", icon: "history", run: (project) => editor.showVersions({ project }), needsServer: true },
  { words: "cardExport", icon: "download", run: (project) => editor.exportApp({ project }) },
  {
    words: "cardSnapshot",
    icon: "camera",
    run: async (project) => {
      if (await editor.updateSnapshot({ project })) setSnapshotAt({ ...snapshotAt(), [project.path]: Date.now() })
    },
    needsServer: true
  },
  "divider",
  { words: "deleteProject", icon: "trash alternate outline", run: (project) => editor.deleteApp({ project }) }
]

/** When each card's picture was last updated, by its project's address:  its picture asked for afresh (`pictureOf()`). */
const [snapshotAt, setSnapshotAt] = createSignal<Readonly<Record<string, number>>>({})

/**
 * `projectRoot`'s projects the home page shows a card for, in its order:
 * - not one its order hides (`SPACES.HOME_HIDDEN_KEY`:  FizzBuzz, the org apps ...;  epic `mockup` I40)
 * - nor one whose project file says `"onHome": false` (a library with no app of its own, the Spell UI site)
 */
function onHomeIn(projectRoot: SPACES.SpellProjectRoot, root: ProjectRootState): CardProject[] {
  const shown = root.projects.filter(
    (project) => project.onHome !== false && SPACES.isOnHome(project.path, HomeArrangement.layout.order)
  )
  return SPACES.inHomeOrder(projectRoot.path, shown, HomeArrangement.layout.order)
}

/**
 * The cards a row of `group` shows, in the home page's order:
 * - a page of a group's sites (`sitesOnly`):  every site of it
 * - else those the home page shows (`onHomeIn()`), only those written in `language` when it says
 */
function cardsOf(
  group: { projectRoot: SPACES.SpellProjectRoot; language?: string; sitesOnly?: boolean },
  root: ProjectRootState
): CardProject[] {
  if (group.sitesOnly) {
    const sites = root.projects.filter((project) => project.isSite)
    return SPACES.inHomeOrder(group.projectRoot.path, sites, HomeArrangement.layout.order)
  }
  const shown = onHomeIn(group.projectRoot, root)
  return group.language ? shown.filter((project) => languageOf(project) === group.language) : shown
}

/**
 * The language a project is written in:  its files', by their names (`SP.ProjectListEntry`'s `language`:
 * `es` for Solitario's `Carta.es.spell` ...), else English.
 * - The ONE rule for which of the home page's sections a project's card is in (epic `mockup` I46).
 */
function languageOf(project: CardProject): string {
  return project.language ?? ENGLISH
}

/** English's code, `en`:  a project's language when its files name none. */
const ENGLISH = "en"

/** Spanish's code, `es`:  the language of the home page's `spanish` section, "En español". */
const SPANISH = "es"

////////////////
// ## Rearranging:  cards and sections dragged, while the page is rearranged (epic `mockup` T51)
////////////////

/** The card being dragged, by its id (a project's address, a start card's id);  the card it would drop on. */
const [dragged, setDragged] = createSignal<string>()
const [dropOn, setDropOn] = createSignal<string>()

/**
 * Card `id`'s drag among `row()` (the ids of the cards beside it, in order), while the page is rearranged:
 * dropped on another of them, `save()` gets the row's new order.
 * - Not rearranging:  none, so the card is a plain link.
 */
function cardDragFor(id: string, row: () => readonly string[], save: (run: string[]) => void): TileCardDrag | undefined {
  if (!HomeArrangement.isRearranging) return undefined
  // a drag from this row's cards, onto another of them
  const takes = () => !!dragged() && dragged() !== id && row().includes(dragged()!)
  return {
    get dragging() {
      return dragged() === id
    },
    get dropHere() {
      return dropOn() === id
    },
    onStart: (event) => {
      event.dataTransfer?.setData("text/plain", id)
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
      setDragged(id)
    },
    onOver: (event) => {
      if (!takes()) return
      event.preventDefault()
      setDropOn(id)
    },
    onLeave: () => {
      if (dropOn() === id) setDropOn(undefined)
    },
    onDrop: (event) => {
      event.preventDefault()
      if (takes()) save(movedOnto(row(), dragged()!, id))
      setDropOn(undefined)
    },
    onEnd: () => {
      setDragged(undefined)
      setDropOn(undefined)
    }
  }
}

/** `all`, in the layout's order under `key`:  those it lists first, then the rest as `all` has them. */
function inOrderOf<Id extends string>(key: string, all: readonly Id[]): Id[] {
  const listed = (HomeArrangement.layout.order[key] ?? []).filter((id): id is Id => all.includes(id as Id))
  return [...new Set([...listed, ...all])]
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

/** Is `group` one of Spell's own groups, or your own, whose order is kept:  never an org's (`SPACES.orgGroups`). */
function isSpellsOwn(group: string): boolean {
  return SPACES.PROJECT_GROUPS.some((each) => each.path === group)
}

////////////////
// ## The sections' order:  dragged by their headers, while the page is rearranged (epic `repo-split` P28, `mockup` T51)
////////////////

/** The section being dragged, by its id;  the section it would drop on. */
const [draggedSection, setDraggedSection] = createSignal<SPACES.HomeSection>()
const [dropOnSection, setDropOnSection] = createSignal<SPACES.HomeSection>()

/**
 * Section `section`'s drag among the page's, by its header, while the page is rearranged.
 * - Its new place is saved at once, the whole list of sections (`HomeArrangement.saveOrder()`, `SPACES.HOME_SECTIONS_KEY`).
 * - The caller leaves it off an org's app:  its order is made from Spell's (`SPACES.homeSections()`), not saved.
 */
function sectionDragFor(section: SPACES.HomeSection): TileCardDrag | undefined {
  if (!HomeArrangement.isRearranging) return undefined
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
      const order = HomeArrangement.layout.order
      const run = movedOnto(SPACES.homeSections(false, order), draggedSection()!, section)
      // every section's place, the hidden ones' kept
      const saved = (order[SPACES.HOME_SECTIONS_KEY] ?? []).filter(SPACES.isHomeSection)
      const all = [...new Set([...saved, ...SPACES.HOME_SECTIONS])]
      HomeArrangement.saveOrder(SPACES.HOME_SECTIONS_KEY, SPACES.withRunReordered(all, run))
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

/** Props for `<ProjectCards>`. */
export type ProjectCardsProps = {
  /** The section's id:  a link target (`#examples`). */
  id: string
  /** The group whose projects to show. */
  projectRoot: SPACES.SpellProjectRoot
  /** Only its projects written in this language (`languageOf()`:  `en`, `es`);  none:  all of them. */
  language?: string
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
  /** Each card with a "..." menu of what you can do with its project (`<CardMenu>`):  your own projects'. */
  cardMenu?: boolean
}

/****************
 * ### `<RearrangeBar>`
 * While the home page is rearranged:  a bar along its top saying how, and whose the changes are,
 * with Done (and, for a person's own changes, Reset to Default) on its right (epic `mockup` T51).
 ****************/
function RearrangeBar() {
  return (
    <Show when={HomeArrangement.isRearranging}>
      <div class="RearrangeBar" role="status">
        <ui-icon name="arrows alternate" />
        <span class="how">
          {appTexts.text(HomeArrangement.setsDefaults ? "homeRearrangeEveryone" : "homeRearrangeYours")}
        </span>
        <Show when={!HomeArrangement.setsDefaults && HomeArrangement.hasOwnChanges}>
          <ui-button appearance="basic" size="small" icon="undo" onClick={() => HomeArrangement.reset()}>
            {appTexts.text("homeRearrangeReset")}
          </ui-button>
        </Show>
        <ui-button color="primary" size="small" onClick={() => HomeArrangement.rearrange(false)}>
          {appTexts.text("homeRearrangeDone")}
        </ui-button>
      </div>
    </Show>
  )
}

/**
 * At the home page's foot, quiet:  "Rearrange Home Screen", which turns the mode on (epic `mockup` T51).
 * - Not while it's on:  the bar's Done turns it off.
 */
function RearrangeButton() {
  return (
    <Show when={!HomeArrangement.isRearranging}>
      <div class="RearrangeFoot">
        <ui-button
          appearance="basic"
          size="small"
          icon="arrows alternate"
          onClick={() => HomeArrangement.rearrange(true)}
        >
          {appTexts.text("homeRearrange")}
        </ui-button>
      </div>
    </Show>
  )
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
