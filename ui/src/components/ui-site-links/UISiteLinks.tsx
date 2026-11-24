import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { SitePages, type FollowedSiteNav, type SitePage } from "spell/ui/components/ui-site-nav/SitePages"
import { siteLinksVocabulary } from "./UISiteLinks.en"

import siteLinksCSS from "./UISiteLinks.css?inline"

/****************
 * ### `<ui-site-links>`
 * The component behind `<ui-site-links>`:  the page shown's own links, for an app menu's end (epic `mockup` T55).
 * It takes the same `pages` and `current` as `<ui-site-nav>`, and draws a row of small icon buttons:
 *
 *     <div class="links" part="links">
 *       <ui-button part="original" icon="up right from square" link="https://fomantic-ui.com/..." target="_blank">
 *       <ui-button part="report" icon="bug" link="https://github.com/.../issues/new?title=Button" target="_blank">
 *     </div>
 *
 * - The original:  the real page the page shown stands for, its `live` link, else the nearest page above it with one
 *   (Owen, 2026-11-17:  Spell UI's pages link Fomantic's, as its docs site's do).
 * - The report:  `report`, with `{title}` standing for the title of the page at the top of the family shown
 *   (`Button` on Button's API page), as a link's text:  none without `report`.
 * - Both open in a new tab.  Nothing to show:  nothing draws, `:state(empty)`.
 * - Plain data in, no fetching:  `pages` and `current`, set on it by hand.
 * - Without `pages`, it follows the site navigation it's inside, as `<ui-site-breadcrumbs>` does
 *   (`SitePages.followNavAround()`):  a Spell site's layout writes a bare `<site-links report="..."/>`.
 ****************/
export class UISiteLinks extends E.UIComponent<typeof siteLinksVocabulary> {
  @E.proto static vocabulary = siteLinksVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "site-links": siteLinksCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The pages
  ////////////////

  /** `pages`, else the site navigation's, the well-formed ones:  each with a `title`, its pages checked the same way. */
  @E.derived
  get sitePages(): readonly SiteLinksPage[] {
    return SitePages.wellFormed(this.isFollowing ? this.followed?.pages : this.pages)
  }

  /** Which page is shown:  `current`, else the site navigation's while following it, else the browser's address. */
  get currentKey(): string {
    const current = this.current ?? (this.isFollowing ? this.followed?.current : undefined)
    return current ?? (isServer ? "" : location.pathname)
  }

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

  /** The pages from the top down to the page shown, it last;  empty when it isn't among them. */
  @E.derived
  get pathToShown(): readonly SiteLinksPage[] {
    const key = this.currentKey
    const walk = (pages: readonly SiteLinksPage[]): SiteLinksPage[] | undefined => {
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

  ////////////////
  // ## The links
  ////////////////

  /** The real page the page shown stands for:  its own `live`, else the nearest page's above it. */
  get originalLink(): string | undefined {
    return this.pathToShown.findLast((page) => page.live)?.live
  }

  /**
   * Where to report a problem with the page shown:  `report`, its `{title}` the family's top page's title;
   * none without `report`, or with no page shown.
   * - The family's top:  the first page in the path that's a page, not a group's name.
   */
  get reportLink(): string | undefined {
    const top = this.pathToShown.find((page) => page.band !== GROUP)
    if (!this.report || !top) return undefined
    return this.report.replaceAll(TITLE_MARK, encodeURIComponent(top.title))
  }

  /** No link to draw:  `:state(empty)`, which takes no room. */
  @E.cssState("empty")
  get isEmpty(): boolean {
    return !this.originalLink && !this.reportLink
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={LINKS} part={this.partForName("links")}>
        <Show when={this.originalLink}>{(link) => this.button("original", ORIGINAL_ICON, link)}</Show>
        <Show when={this.reportLink}>{(link) => this.button("report", REPORT_ICON, link)}</Show>
      </div>
    )
  }

  /**
   * One link:  a small tertiary icon button opening `link` in a new tab, named by its words.
   * - `link` stays an accessor, read in the JSX:  read in `<Show>`'s callback it wouldn't follow a change.
   */
  private button(name: "original" | "report", icon: string, link: () => string): JSX.Element {
    const words = this.translationForKey(name)
    return (
      <ui-button
        part={this.partForName(name)}
        icon={icon}
        appearance={TERTIARY}
        size={SMALL}
        link={link()}
        target={NEW_TAB}
        aria-label={words}
        title={words}
      />
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UISiteLinks extends E.AttributeValues<typeof siteLinksVocabulary> {}

/** One page of a site, as `<ui-site-links pages>` takes it:  the same list `<ui-site-nav>` takes. */
export type SiteLinksPage = Omit<SitePage, "pages"> & {
  /** the real page it stands for:  `https://fomantic-ui.com/elements/button.html` */
  live?: string
  /** `group`:  a group's name over its pages */
  band?: string
  /** the `id` of the page this is a second copy of (a favourite):  never the way down */
  copyOf?: string
  /** the pages under it */
  pages?: readonly SiteLinksPage[]
}

/** The `band` of a group's name over its pages:  a Spell site's groups. */
const GROUP = "group"

/** What `report` writes for the family's title. */
const TITLE_MARK = "{title}"

/** Its box's class word. */
const LINKS = "links"

/** Its links' icons:  the docs site's own. */
const ORIGINAL_ICON = "up right from square"
const REPORT_ICON = "bug"

/** Its links' look:  an app menu's end buttons'. */
const TERTIARY = "tertiary"
const SMALL = "small"

/** A link's `target`:  a new tab. */
const NEW_TAB = "_blank"
