import { createEffect, createMemo, createSignal, Errored, For, Loading, Show } from "solid-js"
import { useNavigate, type RouteSectionProps } from "@solidjs/router"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { SPACES } from "spell/app/spaces"
import { Actions, on, SpellPage } from "spell/app/app/solid"
import { GUIDES_PAGE, guideUrlFor } from "./pages.types"
import { readGuideBody, readGuideList, startHereLine, type Audience, type ShippedGuide } from "./GuideList"
import { ProjectCards } from "./ProjectChooser"

import "./GuidesPage.css"

/****************
 * ### `<GuidesPage>`
 * The guides that ship with Spell, read in the app (epic `epic-engine` P79):
 * `/guides` lists them, `/guides/<path>` shows one (`/guides/data/data.html`).
 * - The list:  "Start here" first, in its order (a chapter by its anchor:  Views, in The Spell Language);
 *   then a section per topic of the guides for people making things;
 *   then the programmers' guides, folded under their own heading, a section per topic;
 *   a search box over titles and descriptions above it all.
 * - Read from the INSTALLED `spell` package, through the app's server (`/api/guides/`, `appRoutes.ts`):
 *   its list, `guides.json5` (`epic guides index` writes it from each guide's head), and each page.
 * - One guide:  its page's body, shown in the app's own page and theme (`<GuideBody>`);  the epic pages' site header,
 *   comment button and editing are left out.
 * - The guides you open in the editor (Spell projects that teach by example, `@spell/guides`) are a topic of their
 *   own, after the makers' (`<ProjectCards>`, the home page's cards):  the home page shows only Start here.
 * - The epic plugin's guides are never here:  they ship with the plugin, in VS Code's Epic Docs tab.
 ****************/
export function GuidesPage(props: RouteSectionProps) {
  const path = () => (props.params.path as string | undefined)?.replace(/^\/+/, "") ?? ""
  return (
    <SpellPage id="GuidesPage" fillWindow scrolling>
      <div class="GuidesColumn">
        <Errored
          fallback={
            <ui-message class="GuidesMissing" state="negative">
              {appTexts.text("guidesMissing")}
            </ui-message>
          }
        >
          <Show when={path()} keyed fallback={<GuideIndex />}>
            {(shown) => <GuideBody path={shown} hash={props.location.hash} />}
          </Show>
        </Errored>
      </div>
    </SpellPage>
  )
}

/****************
 * ### `<GuideIndex>`
 * Every shipped guide:  Start here, the makers' topics, then the programmers' folded;  filtered by its search box.
 ****************/
function GuideIndex() {
  const list = createMemo(async () => readGuideList())
  const [search, setSearch] = createSignal("")
  const navigate = useNavigate()
  const shown = (guide: ShippedGuide) => matches(guide, search())
  const topicsOf = (audience: Audience) => topics(list().guides.filter((guide) => guide.audience === audience))
  onTitle(appTexts.text("guidesTitle"))
  return (
    <Loading fallback={<ui-loader />}>
      <h1>{appTexts.text("guidesTitle")}</h1>
      <p class="GuidesLede">{appTexts.text("guidesLede")}</p>
      <ui-input
        class="GuidesSearch"
        icon="search"
        icon-position="left"
        aria-label={appTexts.text("guidesSearch")}
        placeholder={appTexts.text("guidesSearch")}
        ref={on<{ value: string }>("ui-typed", (event) => setSearch(event.detail.value))}
      />
      <Show when={!search()}>
        <ui-section id="start-here" label={appTexts.text("guidesStartHere")} dividing="">
          <ui-icon slot="icon" name="flag" />
          <ui-cards class="GuideCards">
            <For each={list().startHere}>
              {(entry) => (
                <GuideCard
                  title={entry.title}
                  description={startHereLine(list(), entry)}
                  onOpen={() => navigate(guideUrlFor(entry.path, entry.anchor))}
                />
              )}
            </For>
          </ui-cards>
        </ui-section>
      </Show>
      <For each={topicsOf("makers")}>
        {(topic) => <TopicSection topic={topic} shown={shown} onOpen={(guide) => navigate(guideUrlFor(guide.path))} />}
      </For>
      <Show when={!search()}>
        <ProjectCards
          id="project-guides"
          projectRoot={SPACES.SpellProjectRoot.guides}
          language="en"
          heading={appTexts.text("guidesInTheEditor")}
          line={appTexts.text("homeGuidesLine")}
          empty={appTexts.text("homeNoGuides")}
          create={<Actions.createGuide button appearance="basic" size="small" />}
          hideWhenNone
        />
      </Show>
      <ui-section
        id="for-programmers"
        label={appTexts.text("guidesForProgrammers")}
        collapsible=""
        dividing=""
        open={search() ? true : "false"}
      >
        <ui-icon slot="icon" name="code" />
        <For each={topicsOf("programmers")}>
          {(topic) => (
            <TopicSection topic={topic} shown={shown} onOpen={(guide) => navigate(guideUrlFor(guide.path))} />
          )}
        </For>
      </ui-section>
    </Loading>
  )
}

/****************
 * ### `<TopicSection>`
 * One topic's guides, as cards;  none while the search hides them all.
 ****************/
function TopicSection(props: {
  topic: Topic
  shown: (guide: ShippedGuide) => boolean
  onOpen: (guide: ShippedGuide) => void
}) {
  const guides = () => props.topic.guides.filter(props.shown)
  return (
    <Show when={guides().length}>
      <ui-section label={props.topic.name} dividing="">
        <ui-cards class="GuideCards">
          <For each={guides()}>
            {(guide) => (
              <GuideCard title={guide.title} description={guide.description} onOpen={() => props.onOpen(guide)} />
            )}
          </For>
        </ui-cards>
      </ui-section>
    </Show>
  )
}

/****************
 * ### `<GuideCard>`
 * A guide's card:  its title and what it's about;  a click opens it.
 ****************/
function GuideCard(props: { title: string; description: string; onOpen: () => void }) {
  return (
    <ui-card class="GuideCard" link="" onClick={() => props.onOpen()}>
      <ui-content>
        <ui-header>{props.title}</ui-header>
        <ui-description>{props.description}</ui-description>
      </ui-content>
    </ui-card>
  )
}

/****************
 * ### `<GuideBody>`
 * One guide, its page's body in the app's page:  its title and sections, links between guides opening here, every
 * other link in a new tab;  `hash` (`#views`) scrolled to once it's drawn.
 ****************/
function GuideBody(props: { path: string; hash: string }) {
  const navigate = useNavigate()
  const body = createMemo(async () => {
    const read = await readGuideBody(props.path)
    document.title = `${read.title} • ${appTexts.text("appName")}`
    return read
  })
  let article: HTMLElement | undefined
  // once the body is in:  its chapter (`#views`) opened and scrolled to
  createEffect(
    () => body(),
    () => {
      if (article) scrollToHash(article, props.hash)
    }
  )
  return (
    <Loading fallback={<ui-loader />}>
      <ui-button
        class="GuidesBack"
        appearance="basic"
        size="small"
        icon="arrow left"
        onClick={() => navigate(GUIDES_PAGE)}
      >
        {appTexts.text("guidesAll")}
      </ui-button>
      <article
        class="GuideBody"
        innerHTML={body().html}
        ref={(element: HTMLElement) => (article = element)}
        onClick={(event) => followLink(event, navigate)}
      />
    </Loading>
  )
}

/** One topic's guides, in the list's order. */
type Topic = { name: string; guides: ShippedGuide[] }

/** Each topic's guides, topics in the order their first guide comes. */
function topics(guides: ShippedGuide[]): Topic[] {
  const byName = new Map<string, ShippedGuide[]>()
  for (const guide of guides) byName.set(guide.topic, [...(byName.get(guide.topic) ?? []), guide])
  return [...byName].map(([name, list]) => ({ name, guides: list }))
}

/** Whether `guide` matches what's typed in the search box:  every word in its title or description. */
function matches(guide: ShippedGuide, search: string): boolean {
  const text = `${guide.title} ${guide.description}`.toLowerCase()
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}

/** Set the window's title while the list shows. */
function onTitle(title: string): void {
  document.title = `${title} • ${appTexts.text("appName")}`
}

/**
 * A click in a guide:  a link to another shipped guide (`/guides/...`) opens it here;  a link within the page scrolls;
 * any other opens in a new tab.
 */
function followLink(event: MouseEvent, navigate: (url: string) => void): void {
  const link = (event.target as HTMLElement).closest("a")
  const href = link?.getAttribute("href")
  if (!link || !href) return
  if (href.startsWith("#")) {
    event.preventDefault()
    scrollToHash(link.closest("article")!, href)
  } else if (/^\/guides\/.+\.html(#.*)?$/.test(href)) {
    event.preventDefault()
    const [path, anchor] = href.slice(1).split("#")
    navigate(guideUrlFor(path!, anchor))
  } else link.setAttribute("target", "_blank")
}

/** Scroll `article`'s element with id `hash` (`#views`) into view, its folded section opened. */
function scrollToHash(article: HTMLElement, hash: string): void {
  const id = decodeURIComponent(hash.replace(/^#/, ""))
  if (!id) return
  const target = article.querySelector(`[id="${CSS.escape(id)}"]`)
  if (!target) return
  if (target.tagName === "UI-SECTION") target.setAttribute("open", "true")
  target.scrollIntoView({ block: "start" })
}
