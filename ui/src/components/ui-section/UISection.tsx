import { Show } from "solid-js"
import { Dynamic, isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { sectionVocabulary } from "./UISection.en"
import { UISections } from "./UISections"
import { FoldIconPlace, type SectionVocabulary } from "./UISection.types"

import sectionCSS from "./UISection.css?inline"

/****************
 * ### `UISection`
 * The component behind `<ui-section>`:  a titled block of content that can fold away,
 * and keep its title in view while you scroll through it.
 *
 * - Its shadow DOM:  `<section class="ui … section" part="section">` holding
 *   - a 1px sentinel, which tells when the title has stuck
 *   - the title bar, `<header class="title">`:
 *     the heading (`<hN>`) around the toggle (fold chevron, icon, label),
 *     then the badge, the actions, a chevron at the end, and the description's tip
 *   - the hint, then `<div class="content">` around the default slot.
 * - A wrapper that would be empty (icon, badge, actions, hint, tip) isn't drawn:
 *   `SlotContent` watches the light children.
 *
 * - *Level*:  `level`, else the enclosing section's level + 1 (at most `h6`), else 2.
 *   - The enclosing section is found through `PartContext` with no barriers,
 *     so a section in a segment in a section still nests.
 *   - `parent="<id>"`:  written outside the section (or group) it belongs in, it moves in (`ParentLink`).
 *   - Its level, depth and sticky stack are read from the enclosing section's component,
 *     so they follow its attributes, and a move to another section.
 *
 * - *Folding* (`collapsible`):  the toggle becomes a `<button>`;  its `disclosure` (the kit's `Disclosure`) folds.
 *   - Its accessible name is the label;  its `title` (the `fold` / `unfold` text) is only a tooltip.
 *   - Click, Enter and Space send the cancelable `ui-opening` / `ui-closing`,
 *     then flip `open` (controlled, like the accordion's).
 *   - Once it has folded or unfolded, by any route:  `ui-closed` / `ui-opened`.
 *   - Folded content is `hidden="until-found"`, so find-in-page can reveal a match:
 *     `beforematch` unfolds it, and announces `ui-opening` after the fact (not cancelable).
 *   - Not collapsible:  `open` is ignored.
 * - `fold-icon="end"` moves the chevron out of the button, to the far end of the title bar.
 *   - It stays `aria-hidden` (the button is still the control), and a click on it folds as the button does.
 *   - A subclass moves the default with `defaultFoldIcon` (`<ui-panel>`:  `end`).
 * - *Groups*:  without its own `collapsible` attribute,
 *   a section folds when its nearest `<ui-sections>` is `collapsing`
 *   (around it, or around an enclosing section).
 *   - The group owns `section` parts too, so `enclosingSection` climbs through it.
 *
 * - `description` / `slot="description"`:  a CSS tooltip under the title bar (`role="tooltip"`).
 *   - Shown while the pointer is on the heading or the end chevron, or the fold button has keyboard focus.
 *   - It describes the fold button (`aria-describedby`), else the heading.
 *
 * - *Sticky*:  the title bar is `position: sticky` inside the section's box,
 *   at the top-level `offset`, or just below the enclosing sticky titles:  so nested titles stack.
 *   - A `scrolling` / `height` section's content is its own scroll box:  a fresh stack starts there.
 *   - `StickyWatch` sets `:state(stuck)`, and reserves the title's room for Page Down, as `<ui-sticky>` does.
 *
 * - *Stack* (`sticky="stack"`, or `sticky` right inside a stacked section, plain wrappers aside):  the titles read as one stack of rounded bars
 *   (`:state(stacked)`), the look is the sheet's;  what it needs to know of its neighbours, the component works out:
 *   - `tucked`:  the first thing in its enclosing section (nothing drawn before it, wrappers aside), so its title sits
 *     right under that section's, square on top;  the enclosing one `tucks`
 *   - `after-closed`:  right after a closed section, nothing between;  closed too, `joins-above`;  the closed one
 *     before it, `joins-below`:  closed sections one after another are ONE group, round only at its ends
 *   - a section knows what's before it;  what's after it (and its first nested one) it hears from them:
 *     `isFollowedByClosed`, `hasTuckedFirst`, which they set
 *   - Its neighbours are found in the enclosing section's light DOM, past any wrappers (a notebook's cells):
 *     `stackPlaces`, recomputed as that DOM changes.  A top-level section's neighbour is its element sibling.
 *
 * - *Source* (`source`, `select`):  the content comes from a file the first time the section unfolds, by any route:
 *   - a click
 *   - the page setting `open` (a `#id` link)
 *   - starting unfolded (then at once)
 *   - `LoadableBody` fetches it (`UI.sources`),
 *     and puts its `<body>` in the LIGHT DOM, in place of the placeholder (the children without a `slot`).
 *   - While it's on its way, the content box stays hidden (`isVeiled`) for at most `SOURCE_BODY_HOLD_MS`,
 *     then shows the `loading` look over the placeholder.
 *     So an unfold shows the body, not the placeholder.
 *   - The DOM element (`DOMLoadableBodyElement`) has `load()` / `reload()`, and states `loaded` and `error`.
 *   - In the class, not the vocabulary:  a subclass (`<ui-panel>`) gets it with the vocabulary it reuses.
 *
 * - `disabled`:  unusable, the base class's way (`elementSetup.disabled`):
 *   - faded, everything in it inert (its fold button too), `aria-disabled`
 *   - `toggle()` does nothing
 *
 * - SIDE EFFECTS:
 *   - with `sticky`:  a `ResizeObserver` keeps the title's height (`titleHeight`) for the stack,
 *     and `StickyWatch` writes the scroll container's inline `scroll-padding-top` while stuck
 *   - with `source`:  replaces its own light children (the placeholder) with the file's body.
 *
 * - Its words match `<ui-field>`'s (epic `property-editor` P10, decision Q12):  `label` / `hint` / `description`,
 *   `ui-opening` / `ui-closing`.  The old ones (`header`, `subhead`, `info`, `ui-opening` ...) went in epic
 *   `repo-split` P14 (Q45).
 ****************/
export class UISection extends E.UIComponent<SectionVocabulary> {
  @E.proto static vocabulary = sectionVocabulary
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = {
    styleSheets: { section: sectionCSS },
    cssStates: ["inverted"],
    DOMElement: E.DOMLoadableBodyElement,
    // a container:  a click on its text must not jump to the fold button or a link inside
    delegatesFocus: false,
    // `loading`:  Fomantic's veil
    loading: "its own"
  }
  @E.proto static defaultFoldIcon: FoldIconPlace = FoldIconPlace.start

  /** Where the fold chevron sits without a `fold-icon` attribute:  `start`;  a subclass may move it. */
  declare defaultFoldIcon: FoldIconPlace

  ////////////////
  // ## Nesting
  ////////////////

  /** Enclosing section, when nested (`:state(nested)`);  climbs through any other component. */
  readonly context = new E.PartContext({
    domElement: this.domElement,
    noun: this.vocabulary.noun,
    barrier: E.PartContext.noBarrier
  })

  /**
   * Enclosing section's component, or `undefined` at the top (or before it has one).
   * - Climbs through `<ui-sections>` groups (owners of `section` parts too):
   *   a section in a group in a section is still nested.
   */
  @E.derived
  get enclosingSection(): UISection | undefined {
    let owner = this.context.ownerComponent<UISection | UISections>()
    while (owner instanceof UISections) owner = owner.context.ownerComponent<UISection | UISections>()
    return owner instanceof UISection ? owner : undefined
  }

  /** Nearest `<ui-sections>` group's component, directly or through enclosing sections, or `undefined`. */
  get group(): UISections | undefined {
    const owner = this.context.ownerComponent<UISection | UISections>()
    if (owner instanceof UISections) return owner
    return owner instanceof UISection ? owner.group : undefined
  }

  /** Inside another section, through any group (`:state(nested)`;  the part's own `in-section` counts only a direct one). */
  @E.cssState("nested")
  get isNested(): boolean {
    return !!this.enclosingSection
  }

  /** Directly in a `<ui-sections>` group (`:state(in-group)`;  also the part's own `in-sections`). */
  @E.cssState("in-group")
  get isInGroup(): boolean {
    return this.context.ownerComponent<UISection | UISections>() instanceof UISections
  }

  /** Heading level, 1 ... 6. */
  get headingLevel(): number {
    const own = Number(this.level)
    if (Number.isInteger(own) && own >= 1 && own <= MAX_LEVEL) return own
    const parent = this.enclosingSection
    return parent ? Math.min(parent.headingLevel + 1, MAX_LEVEL) : TOP_LEVEL
  }

  /** Nesting depth:  0 at the top. */
  get depth(): number {
    const parent = this.enclosingSection
    return parent ? parent.depth + 1 : 0
  }

  ////////////////
  // ## Folding
  ////////////////

  /**
   * `open`:  the DOM element's (a boolean is always the DOM element's, see `@controlled`);  `false` folds it.
   * - Folds only `isCollapsible`.
   * - Its old name was `collapsed`, turned round (epic `ui-gaps` J13).
   */
  @E.controlled("open") accessor isMarkedOpen = true

  /**
   * Can it fold?
   * - The DOM element's own `collapsible` when written (`collapsible="false"` opts out),
   *   else the nearest group's `collapsing`.
   * - Reads the attribute raw:  its getter reads absent and `"false"` alike (false),
   *   but only absent takes the group's default.
   * - NOTE: a PROPERTY write of `false` removes the attribute (booleans never reflect as `"false"`),
   *   which brings the group's default back.
   *   Opt out from code with `setAttribute("collapsible", "false")`.
   */
  get isCollapsible(): boolean {
    const own = this.attributes.collapsible
    if (own !== null) return E.Converters.boolean(own, this.elementDefinition.attribute("collapsible").attribute)
    return !!this.collapsible || !!this.group?.collapsing
  }

  /** Folded:  `isCollapsible`, and `open` turned off. */
  @E.cssState("collapsed")
  get isFolded(): boolean {
    return this.isCollapsible && !this.isMarkedOpen
  }

  /** Glyph of the fold button, while `isCollapsible`. */
  readonly foldGlyph = new E.IconGlyph({ owner: this, name: () => (this.isCollapsible ? FOLD_ICON : undefined) })

  /** The fold chevron sits at the far end of the title bar:  `fold-icon`, else the class's `defaultFoldIcon`. */
  get foldIconIsAtEnd(): boolean {
    return (this.foldIcon ?? this.defaultFoldIcon) === FoldIconPlace.end
  }

  /**
   * Open unless folded, on `open` (`isMarkedOpen`):
   * the cancelable `ui-opening` / `ui-closing`, then `ui-opened` / `ui-closed` (`onFoldedChanged()`);
   * the toggle's `aria-expanded`;  find-in-page opening the folded content.
   * - Folds only `isCollapsible`, and never while `disabled`.
   */
  readonly disclosure = new E.Disclosure({
    component: this,
    member: "isMarkedOpen",
    isOpen: () => !this.isFolded,
    canChange: () => this.isCollapsible && !this.isDisabled,
    detail: (open, originalEvent): UIT.SectionToggleDetail => ({ open, section: this.domElement, originalEvent }),
    afterDetail: (open): UIT.SectionToggleDetail => ({ open, section: this.domElement })
  })

  /**
   * Fold or unfold as a person would:
   * the cancelable `ui-opening` / `ui-closing` first, then `open`.
   * - True when applied.
   * - Does nothing unless `collapsible`, or while `disabled`.
   */
  toggle(originalEvent?: Event): boolean {
    return this.disclosure.toggle(originalEvent)
  }

  /** A click on the toggle (Enter / Space on the button click it too). */
  private readonly onToggleClick = (event: MouseEvent) => {
    // a link or control inside a rich `slot="label"` title acts on its own, as in an accordion's title
    if (E.OwnControls.isClicked(event, { before: TOGGLE_BUTTON })) return
    this.toggle(event)
  }

  /** A click on the END chevron, outside the button:  folds as the button does. */
  private readonly onFoldIconClick = (event: MouseEvent) => {
    this.toggle(event)
  }

  /** Folded or unfolded, by any route:  `ui-closed` / `ui-opened` -- not at the start. */
  @E.onChange("isFolded", { defer: true })
  protected onFoldedChanged(isFolded: boolean) {
    this.disclosure.sendAfter(!isFolded)
  }

  ////////////////
  // ## The sticky title
  ////////////////

  /** Title bar's height in pixels, while `sticky` (for the stack below it). */
  @E.state accessor titleHeight = 0

  /** Title bar is stuck. */
  @E.state accessor isStuck = false

  /** Stuck, and `sticky`. */
  @E.cssState("stuck")
  get titleIsStuck(): boolean {
    return !!this.sticky && this.isStuck
  }

  /** The title bar. */
  private title?: HTMLElement

  /** Sentinel where the title bar's top would be, unstuck. */
  private sentinel?: HTMLDivElement

  /** Observes the stuck title and reserves its room. */
  private readonly stickyWatch = new E.StickyWatch(({ edge }) => (this.isStuck = edge !== undefined))

  /** Pixels from the scroll container's top where the title sticks:  `offset` at the top, else the stack above. */
  get stickTop(): number {
    const parent = this.enclosingSection
    return parent ? parent.innerStackTop : (this.offset ?? 0)
  }

  /** Bottom of the stack of stuck titles, through this one, in pixels. */
  get stackBottom(): number {
    return this.stickTop + (this.sticky ? this.titleHeight : 0)
  }

  /** Where nested titles stick:  below the stack, or 0 in this section's own scroll box (`scrolling` / `height`). */
  get innerStackTop(): number {
    return this.contentScrolls ? 0 : this.stackBottom
  }

  /** Is the content its own scroll box? */
  get contentScrolls(): boolean {
    return !!this.scrolling || !!this.height
  }

  ////////////////
  // ## The stack (`sticky="stack"`)
  ////////////////

  /**
   * Its title a bar of a stack:  `sticky="stack"`, or a plain `sticky` right inside a stacked section, plain
   * wrappers aside (a notebook's cells).
   * - Not through another element (an example, a segment):  a sticky section shown inside one keeps the plain look.
   */
  @E.cssState("stacked")
  get isStacked(): boolean {
    if (this.sticky === STACK) return true
    const parent = this.enclosingSection
    return !!this.sticky && !!parent?.isStacked && isRightInside(this.domElement, parent.domElement)
  }

  /**
   * The sections nested in this one, in page order, each with where it stands among them:
   * first in this one (nothing drawn before it), and the one right before it (nothing drawn between).
   * - Read from the light DOM, past wrappers;  again whenever it changes.
   */
  @E.watches({ childList: true, subtree: true, equals: isSameStack })
  get stackPlaces(): StackPlace[] {
    return stackPlacesIn(this.domElement)
  }

  /** Where it stands among its enclosing section's nested ones;  a top-level one, by its element sibling. */
  get stackPlace(): StackPlace | undefined {
    const parent = this.enclosingSection
    if (parent) return parent.stackPlaces.find((place) => place.element === this.domElement)
    const sibling = this.domElement.previousElementSibling
    return {
      element: this.domElement,
      isFirst: false,
      previous: sibling?.localName === this.domElement.localName ? sibling : undefined
    }
  }

  /** The stacked section right before it, nothing drawn between. */
  get previousInStack(): UISection | undefined {
    const previous = (this.stackPlace?.previous as E.DOMElement | undefined)?.component
    return previous instanceof UISection && previous.isStacked ? previous : undefined
  }

  /** Stacked, and the first thing in its enclosing section:  its title tucked under that one's. */
  @E.cssState("tucked")
  get isTucked(): boolean {
    return this.isStacked && !!this.stackPlace?.isFirst
  }

  /** Stacked, its first nested section tucked under its title:  its content has no room on top. */
  @E.cssState("tucks")
  get tucksFirst(): boolean {
    return this.isStacked && !this.contentScrolls && this.hasTuckedFirst
  }

  /** Its first nested section is tucked under its title:  that section says so (`onTuckedChanged()`). */
  @E.state accessor hasTuckedFirst = false

  /** The section right after it is closed:  that section says so (`onNeighbourChanged()`). */
  @E.state accessor isFollowedByClosed = false

  /** Tell the enclosing section whether this one is tucked under its title (`tucks`). */
  @E.onChange("isTucked", "enclosingSection", "isConnected")
  protected onTuckedChanged(isTucked: boolean, parent: UISection | undefined, isConnected: boolean) {
    if (!isTucked || !parent || !isConnected) return undefined
    parent.hasTuckedFirst = true
    return () => {
      parent.hasTuckedFirst = false
    }
  }

  /** Tell the section right before this one whether this one is closed (`joins-below`). */
  @E.onChange("previousInStack", "isFolded", "isConnected")
  protected onNeighbourChanged(previous: UISection | undefined, isFolded: boolean, isConnected: boolean) {
    if (!previous || !isConnected) return undefined
    previous.isFollowedByClosed = isFolded
    return () => {
      previous.isFollowedByClosed = false
    }
  }

  /** Stacked, right after a closed section:  no room above it. */
  @E.cssState("after-closed")
  get isAfterClosed(): boolean {
    return this.isStacked && !!this.previousInStack?.isFolded
  }

  /** Closed, right after a closed one:  in its group, square on top. */
  @E.cssState("joins-above")
  get joinsAbove(): boolean {
    return this.isAfterClosed && this.isFolded
  }

  /** Closed, right before a closed one:  in its group, square below. */
  @E.cssState("joins-below")
  get joinsBelow(): boolean {
    return this.isStacked && this.isFolded && this.isFollowedByClosed
  }

  /**
   * The title's inline tokens:  stick offset and nesting depth.
   */
  private get titleStyle(): Record<string, string> {
    return { [STICK_TOP_PROPERTY]: `${this.stickTop}px`, [DEPTH_PROPERTY]: String(this.depth) }
  }

  /**
   * Once drawn (`isReady`), while connected and `sticky`:  measure the title (for the stack) and watch it stick.
   * - Again whenever its `top` changes;  unstuck otherwise.
   * - Returns its stop.
   */
  @E.onChange("isReady", "isConnected", "sticky", "stickTop")
  protected onStickingChanged(
    isReady: boolean,
    isConnected: boolean,
    sticky: boolean | typeof STACK | undefined,
    offset: number
  ) {
    if (!isReady) return undefined
    const { title, sentinel } = this
    if (!isConnected || !sticky || !title || !sentinel) {
      this.stickyWatch.reset()
      return undefined
    }
    const resizes = new ResizeObserver(() => (this.titleHeight = title.getBoundingClientRect().height))
    resizes.observe(title)
    const unwatch = this.stickyWatch.observe({ domElement: this.domElement, top: sentinel, box: title }, { offset })
    return () => {
      resizes.disconnect()
      unwatch()
    }
  }

  ////////////////
  // ## Title bar pieces
  ////////////////

  /** Which named slots have light-DOM content:  icon, badge, hint, actions. */
  readonly slots = new E.SlotContent(this.domElement)

  /** Glyph of the `icon` shorthand. */
  readonly iconGlyph = new E.IconGlyph({ owner: this, name: () => this.icon })

  /** Has an icon (shorthand or `icon` slot)? */
  get hasIcon(): boolean {
    return !!this.icon || this.slots.hasContent(this.slotForName("icon"))
  }

  /** Has a badge (shorthand or `badge` slot)? */
  get hasBadge(): boolean {
    return !!this.badge || this.slots.hasContent(this.slotForName("badge"))
  }

  /** Title text:  `label`. */
  get titleText(): string | undefined {
    return this.label ?? undefined
  }

  /** Hint text:  `hint`. */
  get hintText(): string | undefined {
    return this.hint ?? undefined
  }

  /** Tip text:  `description`. */
  get descriptionText(): string | undefined {
    return this.description ?? undefined
  }

  /** Has a hint (shorthand, or the `hint` slot)? */
  get hasHint(): boolean {
    return !!this.hintText || this.slots.hasContent(this.slotForName("hint"))
  }

  /** Has actions (`actions` slot)? */
  get hasActions(): boolean {
    return this.slots.hasContent(this.slotForName("actions"))
  }

  /** Has a description's tip (`description`, or `slot="description"`)? */
  get hasDescription(): boolean {
    return !!this.descriptionText || this.slots.hasContent(this.slotForName("description"))
  }

  ////////////////
  // ## Source (`DOMLoadableBodyElement`)
  ////////////////

  /** The content from `source`, loaded on first unfold;  into the DOM element's light DOM. */
  readonly body = new E.LoadableBody({
    domElement: this.domElement,
    source: () => this.source || undefined,
    select: () => this.selector || undefined,
    target: () => this.domElement,
    send: (name, detail) => this.send(name as never, detail)
  })

  /** Content box held closed while the `source` body is on its way (never in a server render:  nothing loads). */
  get isVeiled(): boolean {
    return !isServer && !!this.source && this.body.isVeiled
  }

  /** Busy:  `loading`, or a `source` body slow to arrive. */
  @E.cssState("loading")
  get isLoading(): boolean {
    return !!this.loading || this.body.isBusy
  }

  /** The `source` body arrived. */
  @E.cssState("loaded")
  get bodyIsLoaded(): boolean {
    return this.body.loadStatus === E.SourceStatus.loaded
  }

  /** The `source` body failed. */
  @E.cssState("error")
  get bodyFailed(): boolean {
    return this.body.loadStatus === E.SourceStatus.error
  }

  /** The error line's text, when the `source` body failed;  else `undefined`. */
  get bodyFailureText(): string | undefined {
    const failure = this.body.loadError
    if (!failure) return undefined
    const key = E.SOURCE_FAILURE_KEYS[failure.kind] ?? E.SOURCE_FAILURE_KEYS.load
    return this.translationForKey(key as never, { source: this.source ?? "" })
  }

  /**
   * Load the `source` body whenever the section is unfolded, connected and has one.
   * - `LoadableBody.load()` loads once per `source` + `select`.
   * - An effect, not in `render()`:  a subclass drawing its own markup still loads its body.
   */
  @E.onChange("source", "selector", "isFolded", "isConnected")
  protected onBodyWanted(
    source: string | undefined,
    _select: string | undefined,
    isFolded: boolean,
    isConnected: boolean
  ) {
    if (source && !isFolded && isConnected) this.body.load().catch(() => undefined)
  }

  /** Fetch and insert the `source` body now, folded or not;  once per `source` + `select`. */
  loadBody(): Promise<void> {
    return this.body.load()
  }

  /** Fetch the `source` body again past the cache, and replace it. */
  reloadBody(): Promise<void> {
    return this.body.reload()
  }

  ////////////////
  // ## Looks
  ////////////////

  /** Transitions the fold:  styled, in a browser that animates to `auto` heights. */
  @E.cssState("animated")
  get isAnimated(): boolean {
    return this.isReady && UI.browser.supports.interpolateSize
  }

  /**
   * Words before the noun:
   * - `scrolling` for `height` without it (`height` implies it)
   * - `loading` while a `source` body is slow to arrive (the `loading` look, over the placeholder)
   */
  protected get extraClass(): string | undefined {
    const scrolling = this.height && !this.scrolling ? SCROLLING : undefined
    const loading = !this.loading && this.body.isBusy ? LOADING : undefined
    return [scrolling, loading].filter(Boolean).join(" ") || undefined
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <section
        class={this.rootClass}
        part={this.partForName("section")}
        aria-busy={this.isLoading ? "true" : undefined}
      >
        <div ref={(element) => (this.sentinel = element)} class={SENTINEL} aria-hidden="true" />
        {this.titleBar()}
        <Show when={this.hasHint}>
          <div class={SUBHEAD} part={this.partForName("subhead")}>
            <slot name={this.slotForName("hint")}>{this.hintText}</slot>
          </div>
        </Show>
        <div
          ref={this.disclosure.revealOnMatch}
          id={CONTENT_ID}
          class={UIT.CONTENT}
          part={this.partForName("content")}
          hidden={this.isFolded || this.isVeiled ? "until-found" : undefined}
          tabindex={this.contentScrolls ? 0 : undefined}
          style={this.height ? { [HEIGHT_PROPERTY]: this.height } : undefined}
        >
          <Show when={this.bodyFailureText}>
            <p class={SOURCE_ERROR} part={this.partForName("error")} role="alert">
              {this.bodyFailureText}
            </p>
          </Show>
          {this.contentStart()}
          <slot />
        </div>
        <Show when={this.isLoading}>
          <span class={UIT.VISUALLY_HIDDEN} role="status">
            {this.translationForKey("loading")}
          </span>
        </Show>
      </section>
    )
  }

  /** Drawn at the end of the title bar, after the actions:  for a subclass (a property group's output);  nothing here. */
  protected titleBarEnd(): JSX.Element {
    return undefined
  }

  /** Drawn first in the content, before the slot:  for a subclass (a property group's error);  nothing here. */
  protected contentStart(): JSX.Element {
    return undefined
  }

  /** `<header class="title">`:  the heading around the toggle, then the badge and actions. */
  private titleBar(): JSX.Element {
    return (
      <header
        ref={(element) => (this.title = element)}
        class={UIT.TITLE}
        part={this.partForName("title")}
        style={this.titleStyle}
      >
        <Dynamic
          component={`h${this.headingLevel}`}
          class={HEADING}
          part={this.partForName("heading")}
          aria-describedby={this.hasDescription && !this.isCollapsible ? TIP_ID : undefined}
        >
          <Dynamic
            component={this.isCollapsible ? "button" : "span"}
            type={this.isCollapsible ? "button" : undefined}
            class={TOGGLE}
            part={this.partForName("toggle")}
            aria-expanded={this.isCollapsible ? this.disclosure.ariaExpanded : undefined}
            aria-controls={this.isCollapsible ? CONTENT_ID : undefined}
            title={
              this.isCollapsible ? this.translationForKey(this.isFolded ? "openSection" : "closeSection") : undefined
            }
            disabled={this.isCollapsible && this.disabled ? true : undefined}
            aria-describedby={this.hasDescription && this.isCollapsible ? TIP_ID : undefined}
            onClick={this.onToggleClick}
          >
            <Show when={this.isCollapsible && !this.foldIconIsAtEnd}>{this.foldChevron()}</Show>
            <Show when={this.hasIcon}>
              <span class={UIT.ICON} part={this.partForName("icon")}>
                <slot name={this.slotForName("icon")}>{this.iconGlyph.svg}</slot>
              </span>
            </Show>
            <span class={UIT.HEADER} part={this.partForName("header")}>
              <slot name={this.slotForName("label")}>{this.titleText}</slot>
            </span>
          </Dynamic>
        </Dynamic>
        <Show when={this.hasBadge}>
          <span class={BADGE} part={this.partForName("badge")}>
            <slot name={this.slotForName("badge")}>{this.badge}</slot>
          </span>
        </Show>
        <Show when={this.hasActions}>
          <span class={ACTIONS} part={this.partForName("actions")}>
            <slot name={this.slotForName("actions")} />
          </span>
        </Show>
        {this.titleBarEnd()}
        <Show when={this.isCollapsible && this.foldIconIsAtEnd}>{this.foldChevron(this.onFoldIconClick)}</Show>
        <Show when={this.hasDescription}>
          <span id={TIP_ID} class={TIP} part={this.partForName("tip")} role="tooltip">
            <slot name={this.slotForName("description")}>{this.descriptionText}</slot>
          </span>
        </Show>
      </header>
    )
  }

  /**
   * The fold chevron, `aria-hidden` (the button is the control):
   * in the button, or at the bar's end with `onClick`, where it takes the button's tooltip too.
   */
  private foldChevron(onClick?: (event: MouseEvent) => void): JSX.Element {
    return (
      <span
        class={FOLD_ICON_CLASS}
        part={this.partForName("fold-icon")}
        aria-hidden="true"
        title={onClick ? this.translationForKey(this.isFolded ? "openSection" : "closeSection") : undefined}
        onClick={onClick}
      >
        {this.foldGlyph.svg}
      </span>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UISection extends E.AttributeValues<SectionVocabulary> {}

/** Where a nested section stands among its enclosing section's (`stackPlaces`). */
type StackPlace = {
  /** the nested section's DOM element */
  element: Element
  /** nothing drawn before it in its enclosing section */
  isFirst: boolean
  /** the nested section right before it, nothing drawn between */
  previous: Element | undefined
}

/** Do `a` and `b` say the same of the same sections? */
function isSameStack(a: StackPlace[], b: StackPlace[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (place, index) =>
        place.element === b[index]!.element &&
        place.isFirst === b[index]!.isFirst &&
        place.previous === b[index]!.previous
    )
  )
}

/** The sections nested directly in `host` (its own tag, none between), each with where it stands. */
function stackPlacesIn(host: Element): StackPlace[] {
  const tag = host.localName
  const nested = [...host.querySelectorAll(tag)].filter((element) => element.parentElement?.closest(tag) === host)
  return nested.map((element, index) => {
    const before = nested[index - 1]
    return {
      element,
      isFirst: isDrawnFirst(element, host),
      previous: before && isRightAfter(element, before, host) ? before : undefined
    }
  })
}

/** Is `element` inside `outer` with no other element of a set (a tag with a `-`) between them? */
function isRightInside(element: Element, outer: Element): boolean {
  for (let node = element.parentElement; node && node !== outer; node = node.parentElement)
    if (node.localName.includes("-")) return false
  return true
}

/** Is nothing drawn before `element` in `host`?  Named slots (a title's actions) and empty wrappers draw nothing. */
function isDrawnFirst(element: Element, host: Element): boolean {
  for (let node: Element | null = element; node && node !== host; node = node.parentElement)
    for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling)
      if (!drawsNothing(sibling)) return false
  return true
}

/** Is `element` right after `before` in `host`, nothing drawn between them? */
function isRightAfter(element: Element, before: Element, host: Element): boolean {
  for (let node: Element | null = element; node && node !== host; node = node.parentElement)
    for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
      if (sibling === before || sibling.contains(before)) return isDrawnLast(before, sibling)
      if (!drawsNothing(sibling)) return false
    }
  return false
}

/** Is nothing drawn after `element` inside `outer` (`element` itself, or an element holding it)? */
function isDrawnLast(element: Element, outer: Node): boolean {
  for (let node: Element | null = element; node && node !== outer; node = node.parentElement)
    for (let sibling = node.nextSibling; sibling; sibling = sibling.nextSibling)
      if (!drawsNothing(sibling)) return false
  return true
}

/** Does `node` draw nothing:  white space, a comment, an element in a named slot, or one with nothing in it? */
function drawsNothing(node: Node): boolean {
  if (node.nodeType === COMMENT_NODE) return true
  if (node.nodeType === TEXT_NODE) return !node.textContent?.trim()
  const element = node as Element
  if (element.hasAttribute("slot")) return true
  return !element.firstElementChild && !element.textContent?.trim()
}

/** Node types, by number:  a server render has no `Node`. */
const TEXT_NODE = 3
const COMMENT_NODE = 8

/** `sticky`'s value that stacks its titles as bars:  `sticky="stack"`. */
const STACK = "stack"

/** Glyph of the fold button (rotated by CSS while folded). */
const FOLD_ICON = "chevron down"

/** Class word of the 1px sentinel before the title, which `StickyWatch` observes with `sticky`. */
const SENTINEL = "sentinel"

/** The fold button, in the shadow root:  where a click's path stops counting as one on a control in the title. */
const TOGGLE_BUTTON = "button.toggle"

/** Private custom property of a title's nesting depth (0 at the top), inline:  deeper titles slide under. */
const DEPTH_PROPERTY = "--_ui-section-depth"

/** Class words of the line saying a `source` body failed (`part="error"`, inside the content box). */
const SOURCE_ERROR = "source error"

/** Class word before the noun while a `source` body is slow to arrive:  the `loading` look. */
const LOADING = "loading"

/** Heading level of a top-level section:  under the page's `h1`. */
const TOP_LEVEL = 2

/** Deepest heading level:  `h6`. */
const MAX_LEVEL = 6

/** Class word and part of the heading (`<hN>`). */
const HEADING = "heading"

/** Class word and part of the toggle:  the fold button, or a plain box when the section can't fold. */
const TOGGLE = "toggle"

/** Class words of the fold chevron. */
const FOLD_ICON_CLASS = "fold icon"

/** Class word and part of the badge pill. */
const BADGE = "badge"

/** Class word and part of the actions box. */
const ACTIONS = "actions"

/** Class word and part of the hint (its old name, kept as the CSS hook). */
const SUBHEAD = "subhead"

/** Class word and part of the description's tip. */
const TIP = "tip"

/** Class word `height` adds before the noun when `scrolling` isn't set:  `height` implies scrolling. */
const SCROLLING = "scrolling"

/** `id` of the description's tip, which the fold button (else the heading) is described by. */
const TIP_ID = "tip"

/** `id` of the content box, which the fold button's `aria-controls` names. */
const CONTENT_ID = "content"

/**
 * Private custom property the content box reads for `height`:
 * inline, so the attribute wins over the page's `--ui-section-scrolling-height`.
 */
const HEIGHT_PROPERTY = "--_ui-section-height"

/**
 * Private custom property the sticky title reads for its `top`, inline:
 * the top-level `offset`, or the stack of enclosing sticky titles above it, in pixels.
 */
const STICK_TOP_PROPERTY = "--_ui-section-top"
