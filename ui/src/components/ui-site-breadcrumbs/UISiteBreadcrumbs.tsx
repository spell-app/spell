import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { SitePages, type FollowedSiteNav, type SitePage } from "spell/ui/components/ui-site-nav/SitePages"
import { siteBreadcrumbsVocabulary } from "./UISiteBreadcrumbs.en"

import siteBreadcrumbsCSS from "./UISiteBreadcrumbs.css?inline"

/****************
 * ### `<ui-site-breadcrumbs>`
 * The component behind `<ui-site-breadcrumbs>`:  where you are in a site (epic `mockup` T39).
 * It takes the same `pages` and `current` as `<ui-site-nav>`, and draws the way down to the page shown as a
 * `<ui-breadcrumbs>` trail:
 *
 *     <ui-breadcrumbs part="breadcrumbs" aria-label="Where you are">
 *       <ui-breadcrumb>Hardware</ui-breadcrumb>                       (a group:  only a name)
 *       <ui-breadcrumb link="/films">Films</ui-breadcrumb>            (a page above the one shown:  a link)
 *       <ui-breadcrumb selected>Film</ui-breadcrumb>                  (the page shown)
 *     </ui-breadcrumbs>
 *
 * - The crumbs, top first:
 *   - a group (`band: "group"`), or a page with no `href` (it only holds pages):  plain text
 *   - each page above the one shown:  a real link, unless its address has a parameter (`/films/:film`)
 *   - the page shown, `selected`
 * - A page's second copy (`copyOf`, a favourite) is never the way down:  the original is.
 * - The page shown isn't in the pages (a not found page):  nothing draws, `:state(empty)`.
 * - Plain data in, no fetching:  `pages` and `current`, set on it by hand.
 * - Without `pages`, it follows the site navigation it's inside, as `<ui-site-tabs>` does
 *   (`SitePages.followNavAround()`):  a page of a Spell site writes a bare `<site-breadcrumbs/>`.
 * - A crumb's click is a link's:  a Spell site follows links to its own pages itself.
 ****************/
export class UISiteBreadcrumbs extends E.UIComponent<typeof siteBreadcrumbsVocabulary> {
  @E.proto static vocabulary = siteBreadcrumbsVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "site-breadcrumbs": siteBreadcrumbsCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The pages
  ////////////////

  /** `pages`, else the site navigation's, the well-formed ones:  each with a `title`, its pages checked the same way. */
  @E.derived
  get sitePages(): readonly SiteBreadcrumbsPage[] {
    return SitePages.wellFormed(this.isFollowing ? this.followed?.pages : this.pages)
  }

  /** Which page is shown:  `current`, else the site navigation's while following it, else the browser's address. */
  get currentKey(): string {
    const current = this.current ?? (this.isFollowing ? this.followed?.current : undefined)
    return current ?? (isServer ? "" : location.pathname)
  }

  ////////////////
  // ## Following the site navigation
  ////////////////

  /** The site navigation's `pages` and `current`, while it's inside one;  `undefined` outside any. */
  @E.state accessor followed: FollowedSiteNav | undefined = undefined

  /** It has no `pages` of its own, so it shows the site navigation's. */
  get isFollowing(): boolean {
    return this.pages === undefined
  }

  /**
   * While connected:  follow the site navigation around it (`SitePages.followNavAround()`).
   * - Nothing around it:  nothing to follow, and it draws only what it's given.
   */
  @E.whileConnected
  protected followSiteNav() {
    const stop = SitePages.followNavAround(this.domElement, (followed) => (this.followed = followed))
    return () => {
      stop?.()
      this.followed = undefined
    }
  }

  ////////////////
  // ## The crumbs
  ////////////////

  /** The pages from the top down to the page shown, it last;  empty when it isn't among them. */
  @E.derived
  get pathToShown(): readonly SiteBreadcrumbsPage[] {
    const key = this.currentKey
    const walk = (pages: readonly SiteBreadcrumbsPage[]): SiteBreadcrumbsPage[] | undefined => {
      for (const page of pages) {
        if (page.copyOf) continue
        if (SitePages.isShown(page, key)) return [page]
        const below = walk(page.pages ?? [])
        if (below) return [page, ...below]
      }
      return undefined
    }
    return walk(this.sitePages) ?? []
  }

  /**
   * The crumbs to draw, top first:  each a name, a link to a page above, or the page shown.
   * - Following a Spell site, the pages shown below the one its navigation marks, which it doesn't list (a page with
   *   a parameter), end the trail:  Datasets › Session.
   */
  @E.derived
  get crumbs(): readonly SiteCrumb[] {
    const path = this.pathToShown
    const below = path.length && this.isFollowing ? (this.followed?.shownBelow ?? []) : []
    const last = path.length + below.length - 1
    const listed = path.map((page, at): SiteCrumb => {
      if (at === last) return { title: page.title, isShown: true }
      const isLink = !!page.href && page.band !== GROUP && !SitePages.hasParameter(page)
      return isLink ? { title: page.title, link: page.href } : { title: page.title }
    })
    return [...listed, ...below.map((title, at): SiteCrumb => (path.length + at === last ? { title, isShown: true } : { title }))]
  }

  /** No crumbs to draw:  `:state(empty)`, which takes no room. */
  @E.cssState("empty")
  get isEmpty(): boolean {
    return !this.crumbs.length
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <Show when={this.crumbs.length}>
        <ui-breadcrumbs
          part={this.partForName("breadcrumbs")}
          aria-label={this.label ?? this.translationForKey("label")}
        >
          <For each={this.crumbs} keyed={false}>
            {(crumb) => (
              <ui-breadcrumb link={crumb().link} selected={crumb().isShown ? "" : undefined}>
                {crumb().title}
              </ui-breadcrumb>
            )}
          </For>
        </ui-breadcrumbs>
      </Show>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UISiteBreadcrumbs extends E.AttributeValues<typeof siteBreadcrumbsVocabulary> {}

/** One page of a site, as `<ui-site-breadcrumbs pages>` takes it:  the same list `<ui-site-nav>` takes. */
export type SiteBreadcrumbsPage = Omit<SitePage, "pages"> & {
  /** `group`:  a group's name over its pages, never a link */
  band?: string
  /** the `id` of the page this is a second copy of (a favourite):  never the way down */
  copyOf?: string
  /** the pages under it */
  pages?: readonly SiteBreadcrumbsPage[]
}

/** One crumb of the trail. */
type SiteCrumb = {
  /** what it says */
  title: string
  /** where it goes:  a page above the one shown, with an address a link can go to */
  link?: string
  /** it's the page shown */
  isShown?: boolean
}

/** The `band` of a group's name over its pages:  a Spell site's groups. */
const GROUP = "group"
