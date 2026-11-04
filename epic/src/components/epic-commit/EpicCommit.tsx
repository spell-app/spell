import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

// Import directly:  the persist barrel would bring the database and server places too
import { PrefStore } from "spell/util/persist/PrefStore"

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
 * - Hidden until its item's or phase's git icon shows it (`--epic-commits-display`, which they set), or it's in
 *   the Log, which shows every one (epic `epic-engine` P53:  the page-wide git toggle went, the Log lists them all).
 * - The repo is read as it connects:  a commit moved under another page takes that page's.
 * - An entry of the LOG (epic `epic-engine` P52, Owen's comment C5:  the Log is the epic's change log):
 *   - with `at`, its time first, the git icon in the icon column, and no `Commits:` heading
 *   - with `refs`, a chip per phase and item it names, after the sha and BEFORE its sentence (J184, Owen's "chips
 *     first"), so a long sentence folded to two lines never hides one, each a `#id` link the docs runtime lands
 *     on;  a phase's chip says its number today (`P52`), read from the page;  one the page no longer has, plain text
 *   - always shown, newest first:  the Log's section says so (`EpicSection.css`), never this element
 * - A LONG sentence is clamped to two lines, ending in "…" (epic `epic-engine` J184, Owen's pick B):
 *   - the clamp is the whole line's, chips first, so the "…" only ever cuts the sentence
 *   - only one that runs past two lines (`isLong`, measured as its box changes size) gets the "…", the pointer and
 *     the click;  a short one is drawn as before
 *   - a click on its text (never its sha or a chip, nor the end of a text selection) unfolds it, another folds it;
 *     the sentence is a button too, Enter or Space on it doing the same
 *   - unfolded ones remembered per page, in this browser (`CommitFolds`:  `spell-commit-folds:<path>`, by sha), so
 *     the same commit in the Log and under its phase folds as one
 ****************/
export class EpicCommit extends E.UIComponent<typeof epicCommitVocabulary> {
  @E.proto static vocabulary = epicCommitVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-commit": commitCSS },
    // a container:  a click on its text must not jump to the sha's link
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** Its sentence runs past two lines (measured):  clamped, with the "…", the pointer and the click. */
  @E.state accessor isLong = false

  /** Unfolded on this load, once the reader clicked it;  `undefined`:  as remembered (`CommitFolds`). */
  @E.state accessor isUnfoldedNow: boolean | undefined = undefined

  /** Showing its whole sentence:  the reader unfolded it, now or on an earlier load. */
  get isUnfolded(): boolean {
    return this.isUnfoldedNow ?? CommitFolds.isUnfolded(this.sha ?? "")
  }

  /** The box of its text (the time, the sha, the chips, the sentence), measured for `isLong`. */
  private textBox: HTMLElement | undefined

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
          <span
            class={[TEXT, { [CLAMPED]: !this.isUnfolded, [LONG]: this.isLong }]}
            ref={(box: HTMLElement) => (this.textBox = box)}
            onClick={(event: MouseEvent) => this.onTextClick(event)}
          >
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
            </Show>
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
            </For>{" "}
            <span
              class={SENTENCE}
              part={this.partForName("sentence")}
              role={this.isLong ? "button" : undefined}
              tabindex={this.isLong ? "0" : undefined}
              aria-expanded={this.isLong ? (this.isUnfolded ? "true" : "false") : undefined}
              title={this.isLong ? this.translationForKey(this.isUnfolded ? "foldTip" : "unfoldTip") : undefined}
              onKeyDown={(event: KeyboardEvent) => this.onSentenceKey(event)}
            >
              <slot />
            </span>
          </span>
        </div>
      </div>
    )
  }

  ////////////////
  // ## Folding a long sentence
  ////////////////

  /** Fold it to two lines, or unfold it;  remembered (`CommitFolds`). */
  @E.untracked
  toggle() {
    const isUnfolded = !this.isUnfolded
    this.isUnfoldedNow = isUnfolded
    CommitFolds.remember(this.sha ?? "", isUnfolded)
  }

  /** SIDE EFFECT:  while connected and drawn, measures its text as its box changes size;  the cleanup stops. */
  @E.onChange("isConnected", "isReady")
  protected watchTextSize(isConnected: boolean, isReady: boolean) {
    const box = this.textBox
    if (!isConnected || !isReady || !box) return undefined
    const resizes = new ResizeObserver(() => this.measure())
    resizes.observe(box)
    this.measure()
    return () => resizes.disconnect()
  }

  /**
   * Is its text longer than two lines?  Its whole height (`scrollHeight`, clamped or not) against the line height.
   * - half a line spare:  the chips stand a little taller than a line of text
   * - hidden (a phase's commits not shown), it measures 0:  not long, until it shows and its box changes size
   */
  private measure() {
    const box = this.textBox
    if (!box) return
    const lineHeight = Number.parseFloat(getComputedStyle(box).lineHeight)
    this.isLong = lineHeight > 0 && box.scrollHeight > lineHeight * (CLAMP_LINES + 0.5)
  }

  /** A click on a long one's text folds or unfolds it:  not on a link (the sha, a chip), nor ending a selection. */
  @E.untracked
  private onTextClick(event: MouseEvent) {
    if (!this.isLong) return
    if ((event.target as Element | null)?.closest?.("a")) return
    if (getSelection()?.toString()) return
    this.toggle()
  }

  /** Enter or Space on a long one's sentence:  as a click. */
  @E.untracked
  private onSentenceKey(event: KeyboardEvent) {
    if (!this.isLong || (event.key !== "Enter" && event.key !== " ")) return
    event.preventDefault()
    this.toggle()
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

/****************
 * ### `CommitFolds`
 * The long commits this page's reader unfolded, in this browser:  `spell-commit-folds:<path>`, `{ "<sha>": true }`.
 * - only the unfolded ones:  a long one starts folded
 * - by sha, so a commit drawn twice (the Log, its phase) folds as one
 * - read afresh each time:  another tab's folds, and no stale copy
 ****************/
class CommitFolds {
  /** Did the reader unfold the commit `sha`? */
  static isUnfolded(sha: string): boolean {
    return !!sha && CommitFolds.saved()[sha] === true
  }

  /** Remember the commit `sha` unfolded, or forget it (folded, the default). */
  static remember(sha: string, isUnfolded: boolean) {
    if (!sha) return
    const saved = CommitFolds.saved()
    if (isUnfolded) saved[sha] = true
    else delete saved[sha]
    PrefStore.setAt(CommitFolds.key, Object.keys(saved).length ? saved : undefined)
  }

  /** This page's unfolded commits. */
  private static saved(): Record<string, boolean> {
    const saved = PrefStore.getAt(CommitFolds.key)
    return saved && typeof saved === "object" ? { ...(saved as Record<string, boolean>) } : {}
  }

  /** This page's key. */
  private static get key(): string {
    return `${COMMIT_FOLDS_KEY_PREFIX}${location.pathname}`
  }
}

/** `localStorage` key prefix of a page's unfolded commits (`{ [sha]: true }`), then the page's path. */
const COMMIT_FOLDS_KEY_PREFIX = "spell-commit-folds:"

/** How many lines a long sentence shows, folded (the sheet's `-webkit-line-clamp` says the same). */
const CLAMP_LINES = 2

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
const SENTENCE = "sentence"
const CLAMPED = "clamped"
const LONG = "long"
const REF = "ref"
const REF_GONE = "gone"
