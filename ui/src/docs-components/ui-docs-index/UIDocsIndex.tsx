import { For } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { SitePages, type SitePage } from "spell/ui/components/ui-site-nav/SitePages"
import type { SiteDataFile } from "spell/ui/docs-components/docs-components.types"
import { SiteDataLoad } from "spell/ui/docs-components/SiteDataLoad"
import { docsIndexVocabulary } from "./UIDocsIndex.en"

import sectionsCSS from "spell/ui/docs-components/docs-sections.css?inline"
import indexCSS from "./UIDocsIndex.css?inline"

/****************
 * ### `<ui-docs-index>`
 * The component behind `<ui-docs-index>`:  a site's index page, which keeps itself up to date (epic `mockup` P15).
 * - Its pages:  `pages`, else those of the `<ui-site-nav>` on the page, so a page of a site only has to write the tag.
 * - One `<ui-section>` per tag, each a `<ui-cards>` with a card per page (`SitePages.groupedByTag()`);
 *   a page with several tags shows under each.
 * - A card's words:  its page's title, and what the docs site's data says of it (`SiteData`), when it says anything.
 * - The search field above them is `<ui-docs-search>`, given the same pages.
 * - Groups in the order of the docs site's topics, then the rest.
 * - Links are plain:  a site that shows its pages without loading another takes them as it takes any link.
 * - A doc-only element (`src/docs-components/`):  its shadow DOM is built of other families' widgets,
 *   which its barrel imports.
 ****************/
export class UIDocsIndex extends E.UIComponent<typeof docsIndexVocabulary> {
  @E.proto static vocabulary = docsIndexVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "docs-sections": sectionsCSS, "docs-index": indexCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The docs site's data:  a card's words;  cards draw without it. */
  readonly data = new SiteDataLoad()

  /** The `<ui-site-nav>`'s list of pages, read when it's drawn and whenever it changes. */
  @E.state accessor navPages: unknown = undefined

  /** The pages to list. */
  @E.derived
  get sitePages(): readonly SitePage[] {
    return SitePages.wellFormed<SitePage>(this.pages ?? this.navPages)
  }

  /** The cards, by tag. */
  @E.derived
  get groups() {
    return SitePages.groupedByTag(this.sitePages, {
      order: this.data.value?.topics.map((topic) => topic.title) ?? [],
      untagged: this.translationForKey("other")
    })
  }

  /** What the search field is given:  JSON text, which the attribute takes. */
  @E.derived
  get pagesText(): string {
    return JSON.stringify(this.sitePages)
  }

  /** SIDE EFFECT:  once on the page, follows the `<ui-site-nav>`'s list. */
  @E.onChange("isReady")
  protected onDrawn(isReady: boolean) {
    if (!isReady || this.pages !== undefined) return
    const nav = UIDocsIndex.navNear(this.domElement)
    if (!nav) return
    const read = () => (this.navPages = UIDocsIndex.pagesOf(nav))
    read()
    // oxlint-disable-next-line spell-ui/no-mutation-observer -- watches the `<ui-site-nav>`, another element
    const watching = new MutationObserver(read)
    watching.observe(nav, { attributes: true, attributeFilter: [PAGES] })
    this.domElement.addReleaseCallback(() => watching.disconnect())
  }

  /** The `<ui-site-nav>` near `element`:  in its own root, or a root around it. */
  private static navNear(element: Element): Element | undefined {
    for (let root = element.getRootNode() as Document | ShadowRoot; ; root = root.host.getRootNode() as ShadowRoot) {
      const nav = root.querySelector(NAV)
      if (nav) return nav
      if (!(root instanceof ShadowRoot)) return undefined
    }
  }

  /** `nav`'s list:  JSON text, as a site hands it over;  `undefined` when it's unreadable. */
  private static pagesOf(nav: Element): unknown {
    try {
      return JSON.parse(nav.getAttribute(PAGES) ?? "null")
    } catch {
      return undefined
    }
  }

  /** What the docs site's data says of `page`:  by its family's title, else by its component's tag or name. */
  private wordsFor(page: SitePage): { meta?: string; description?: string } {
    const data = this.data.value
    if (!data) return {}
    const family = UIDocsIndex.familyFor(data, page)
    if (family) return { meta: `<${family.mainTag}>`, description: withoutTicks(family.summary) }
    const tag = data.components.find(
      (each) => each.tag === `ui-${page.href?.replace(/^\//, "")}` || each.name === page.title
    )
    return tag ? { meta: `<${tag.tag}>`, description: withoutTicks(tag.description) } : {}
  }

  /** The family titled as `page` is. */
  private static familyFor(data: SiteDataFile, page: SitePage) {
    return Object.values(data.families).find((family) => !family.docs && family.title === page.title)
  }

  /**
   * A result was picked:  taken as a click on a plain link, so a site showing its pages itself takes it,
   * and anywhere else the browser follows it.
   */
  private onNavigating(event: CustomEvent<{ href: string }>) {
    event.preventDefault()
    const { pathname, search, hash } = new URL(event.detail.href)
    const link = document.createElement("a")
    link.setAttribute("href", pathname + search + hash)
    link.hidden = true
    this.domElement.shadowRoot!.append(link)
    link.click()
    link.remove()
  }

  render(): JSX.Element {
    return (
      <div class={SECTIONS} part={this.partForName("index")}>
        <ui-docs-search
          class={SEARCH}
          part={this.partForName("search")}
          pages={this.pagesText}
          placeholder={this.translationForKey("search")}
          shortcuts="false"
          on-ui-navigating={(event: CustomEvent<{ href: string }>) => this.onNavigating(event)}
        />
        <For each={this.groups} keyed={(group) => group.tag}>
          {(group) => (
            <ui-section label={group().tag} sticky="stack" collapsible dividing level="2">
              <ui-cards>
                <For each={group().pages} keyed={(page) => page.href ?? page.title}>
                  {(page) => (
                    <ui-card
                      link={page().href}
                      heading={page().title}
                      meta={this.wordsFor(page()).meta}
                      description={this.wordsFor(page()).description}
                    />
                  )}
                </For>
              </ui-cards>
            </ui-section>
          )}
        </For>
      </div>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIDocsIndex extends E.AttributeValues<typeof docsIndexVocabulary> {}

/** What the `<ui-site-nav>` near it is. */
const NAV = "ui-site-nav"

/** The attribute a site hands its pages over in. */
const PAGES = "pages"

/** The class `docs-sections.css`'s look follows. */
const SECTIONS = "ui-docs-sections"

/** The search field's class. */
const SEARCH = "search"

/** `text` without the backticks its data marks code with. */
function withoutTicks(text: string | undefined): string | undefined {
  return text?.replaceAll("`", "")
}
