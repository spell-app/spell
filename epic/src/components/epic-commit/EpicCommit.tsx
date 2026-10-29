import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { EpicAddress, PageTargets } from "spell/epic/links"

import { epicCommitVocabulary } from "./EpicCommit.en"

import commitCSS from "./EpicCommit.css?inline"
import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"

/****************
 * ### `EpicCommit`
 * The component behind `<epic-commit>`:  one commit of a phase or an item -- its short sha (a link to the commit,
 * made from its own `repo`, a child repo's, else the page's `<epic-page repo>`), then what it did (its children).
 * - The first of a run of commits carries the run's heading, `Commits:` with the git icon (`:host(:first-of-type)`
 *   in its sheet);  the lines sit under the heading's text.
 * - Hidden until the page's git toggle shows every commit (`--epic-commits-display`, from `<epic-page>`), or an
 *   item shows its own (the item sets the same property).
 * - The repo is read as it connects:  a commit moved under another page takes that page's.
 * - An entry of the LOG (epic `epic-engine` P52, Owen's comment C5:  the Log is the epic's change log):
 *   - with `at`, its time first, the git icon in the icon column, and no `Commits:` heading
 *   - with `refs`, a chip after its sentence per phase and item it names, each a `#id` link the docs runtime lands
 *     on;  a phase's chip says its number today (`P52`), read from the page;  one the page no longer has, plain text
 *   - always shown, newest first:  the Log's section says so (`EpicSection.css`), never this element
 ****************/
export class EpicCommit extends E.UIComponent<typeof epicCommitVocabulary> {
  @E.proto static vocabulary = epicCommitVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-commit": commitCSS },
    // a container:  a click on its text must not jump to the sha's link
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The heading's icon. */
  readonly glyph = new E.IconGlyph({ owner: this, name: () => "code branch" })

  /** Its link, from its own `repo`, else the page's;  `undefined` without one. */
  get href(): string | undefined {
    const repo = this.repo || (this.isConnected ? this.domElement.closest(PAGE_TAG)?.getAttribute("repo") : undefined)
    return repo && this.sha ? `${repo.replace(/\/$/, "")}/commit/${this.sha}` : undefined
  }

  /** `at`, as shown:  `2026-10-29T11:46-04:00` => `2026-10-29 11:46`. */
  get shownTime(): string {
    const at = this.at ?? ""
    const match = SHOWN_TIME.exec(at)
    return match ? [match[1], match[2]].filter(Boolean).join(" ") : at
  }

  /**
   * A chip per id in `refs`, as the page has it now:  its label (`P52`, `Q56`), its `#id` link and its title;  no
   * link for one the page no longer has.
   * - a phase by its lasting id (`p-commit-log`), its number read from the page (`PageTargets`)
   */
  get refChips(): RefChip[] {
    const refs = (this.refs ?? "").split(/\s+/).filter(Boolean)
    const targets = isServer || !this.isConnected ? undefined : new PageTargets(this.domElement.ownerDocument)
    return refs.map((ref) => {
      const isPhase = PHASE_REF.test(ref)
      let landing
      try {
        landing = targets?.find(new EpicAddress(isPhase ? { phase: ref } : { item: ref }))
      } catch {
        landing = undefined
      }
      const label = isPhase ? (landing?.number ? `P${landing.number}` : ref) : ref.toUpperCase()
      if (!landing) return { label, tip: this.translationForKey("refGone", { ref: label }) }
      const tip = this.translationForKey("refTip", { ref: label, title: landing.title ?? "" })
      return { label, href: `#${landing.id}`, tip }
    })
  }

  /** The sha, as shown. */
  get shortSha(): string {
    return (this.sha ?? "").slice(0, SHORT_SHA)
  }

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("base")}>
        <div class={HEADING} part={this.partForName("heading")}>
          <span class={ICON} aria-hidden="true">
            {this.glyph.svg}
          </span>
          <b>{this.translationForKey("heading")}</b>
        </div>
        <div class={LINE} part={this.partForName("line")}>
          <Show when={this.at}>
            <span class={ENTRY_ICON} aria-hidden="true">
              {this.glyph.svg}
            </span>
          </Show>
          <span class={TEXT}>
            <Show when={this.at}>
              <time class={TIME} part={this.partForName("time")} datetime={this.at}>
                {this.shownTime}
              </time>{" "}
            </Show>
            <Show
              when={this.href}
              fallback={
                <code class={SHA} part={this.partForName("sha")}>
                  {this.shortSha}
                </code>
              }
            >
              <a
                class={SHA}
                part={this.partForName("sha")}
                href={this.href}
                target={LINK_TARGET}
                title={this.translationForKey("open", { sha: this.shortSha })}
              >
                {this.shortSha}
              </a>
            </Show>{" "}
            <slot />
            <For each={this.refChips}>
              {(chip) => (
                <>
                  {" "}
                  <Show
                    when={chip.href}
                    fallback={
                      <span class={`${REF} ${REF_GONE}`} part={this.partForName("ref")} title={chip.tip}>
                        {chip.label}
                      </span>
                    }
                  >
                    <a class={REF} part={this.partForName("ref")} href={chip.href} title={chip.tip}>
                      {chip.label}
                    </a>
                  </Show>
                </>
              )}
            </For>
          </span>
        </div>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicCommit extends E.AttributeValues<typeof epicCommitVocabulary> {}

/** One of `refs`' chips:  its label, its link (none:  the page no longer has it) and its tooltip. */
type RefChip = { label: string; href?: string; tip: string }

/** A ref that is a phase's lasting id (`p-commit-log`), not an item's (`q56`). */
const PHASE_REF = /^p-/

/** An `at` time as shown:  `2026-10-29T11:46-04:00` => `2026-10-29 11:46` (`<epic-event>`'s rule). */
const SHOWN_TIME = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/

/** How many of the sha's digits show. */
const SHORT_SHA = 7

/** Where a sha's link opens:  one GitHub tab, as today's links. */
const LINK_TARGET = "github"

/** The page around a commit, whose `repo` its link is made from. */
const PAGE_TAG = "epic-page"

/** Classes of the shadow markup. */
const HEADING = "heading"
const LINE = "line"
const SHA = "sha"
const ICON = "icon"
const ENTRY_ICON = "entry-icon"
const TIME = "time"
const TEXT = "text"
const REF = "ref"
const REF_GONE = "gone"
