import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { type DialogAttributes, type DialogEventName } from "./UIModal.types"

/****************
 * ### `DialogComponent`
 * The base of the components behind `<ui-modal>` and `<ui-flyout>`:
 * everything they do, on a shadow `<dialog class="ui … <noun>" part="<rootPart>">` shown with `showModal()`.
 * The browser gives it the focus trap, the `inert` page, the top layer and the `::backdrop` (the dimmer).
 * A subclass may be MODELESS (`isModeless`:  `<ui-flyout modeless>`):  `show()`, the page left usable;
 * a click on the page closes the dialog, and still lands where it went.
 *
 * - A subclass adds only its names and looks:
 *   `vocabulary`, `elementSetup.styleSheets` (and `animation`), `rootPart`, `overlayKind`, `shownClass`.
 *
 * - In the modal family, not `src/elements/`:  a flyout IS Fomantic's side modal
 *   (the same parts, buttons, events and dismissal), and nothing else shares it yet.
 *   A third, non-modal overlay would move it to `src/elements/` (`agents/CODE-DEBT.md`, `ui`).
 *
 * - Every dialog vocabulary MUST name (each family's tests check it;  types can't):
 *   - attributes `closable`, `closedby`, `heading`, `content`
 *   - events `ui-opening`, `ui-opened`, `ui-closing`, `ui-closed`, `ui-approving`, `ui-denying`
 *   - parts `rootPart`, `header`, `content`, `close`;  text `close`.
 *
 * - Shown by the shared `visible` / `hidden` (`UIComponent`, "Shown or hidden"), starting hidden
 *   (`elementSetup.visible`):  `<ui-modal visible>`, `modal.visible = true`.
 *   - Controlled (`isVisible`):  a person's `ui-opening` / `ui-closing` (with a `reason`) come first and can veto;
 *     `ui-opened` / `ui-closed` follow once the transition has finished.
 *   - The `<dialog>` opens with `showModal()` and closes with `close()` as `visible` changes (`onVisibleChange()`).
 *
 * - Dismissal, by `closedby` (read when it opens;  `closedBy` says what an absent one means):
 *   - Escape:  through `UI.overlays` (kind `overlayKind`:  scroll lock, keyboard scope, focus restore),
 *     so only the topmost overlay closes, and `ui-closing` can veto.
 *     The dialog's own `cancel` is always prevented.
 *   - A click on the `::backdrop`:  the browser's light dismiss (`<dialog closedby>`)
 *     when `UI.browser.supports.dialogClosedBy`, reported as `cancel`;
 *     else `UI.overlays`' outside click, which tells a backdrop click from one on the dialog by where the pointer is.
 *   - A close the browser forces anyway (a repeated Escape it won't let a page veto) is followed:
 *     a `ui-closing` that can't veto, then `visible` off.
 *
 * - Opening as a PERSON'S action, so `ui-opening` fires:
 *   an invoker command, `<button commandfor="id" command="--show">`
 *   (`ToggleCommands`;  `--close` closes, `--toggle` flips).
 *   Writing `visible` (or `hidden`) is the app's own decision, and fires nothing.
 *
 * - Buttons:  a click on an approve / deny element fires the cancelable `ui-approving` / `ui-denying`, then closes.
 *   - Those elements (`ModalActionSelectors`):
 *     Fomantic's `.approve` / `.deny` classes, `<ui-button color="positive">` / `"negative"` (and the old
 *     `<ui-button color="negative">`).
 *   - The `closable` icon closes (reason `close`).
 *
 * - `closable="false"` is Fomantic's `closable: false` AND `closeIcon: false`:
 *   no icon, and (unless `closedby` is set) `closedby="none"`, so Escape and the dimmer do nothing.
 *
 * - Its name:  the DOM element's `aria-label`, else the `heading` shorthand, else a slotted `<ui-header>`
 *   (by element reflection:  an idref can't reach into the light DOM from the shadow root).
 ****************/
export abstract class DialogComponent<
  V extends E.ComponentVocabulary = E.ComponentVocabulary
> extends E.UIComponent<V> {
  /** Starts hidden, unless the page writes `visible`. */
  @E.protoMerged static elementSetup: Partial<E.ElementSetup> = { visible: "hidden" }

  /** Part name of the `<dialog>`, e.g. `modal`. */
  declare rootPart: string

  /** `UI.overlays` kind:  `modal` or `flyout`. */
  declare overlayKind: E.OverlayKind

  /**
   * Hook:  shown without blocking the page (`show()`, not `showModal()`).
   * - No `::backdrop`, no scroll lock, no focus trap.
   * - A click on the page lands, and closes it (light dismiss, `closedby="any"`).
   * - Default `false`;  `<ui-flyout modeless>`.
   */
  protected get isModeless(): boolean {
    return false
  }

  // The dialog attributes this base reads (see the class docs):
  // each vocabulary's getters, declared here since `V` is unknown to this class.

  /** `closable`:  the close icon;  `false` (written) is also Fomantic's `closable: false`. */
  declare closable: boolean

  /** `closedby`:  what dismisses it, as written;  see `closedBy` for what it means. */
  declare closedby: DialogAttributes["closedby"] | undefined

  /** `heading`:  the heading shorthand (old name `header`). */
  declare heading: string | undefined

  /** `content`:  the content shorthand. */
  declare content: string | undefined

  /** The dialog. */
  protected dialog?: HTMLDialogElement

  /**
   * This element's `UI.overlays` entry;  its Escape / outside options follow `closedby` when it opens.
   * - `kind` is the subclass's `overlayKind`, set in the constructor (a prototype value TypeScript can't see here).
   */
  private readonly overlayEntry: E.OverlayEntry = {
    element: this.domElement,
    kind: "modal",
    onDismiss: (reason: E.DismissReason) => void this.requestClose(reason)
  }

  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    this.overlayEntry.kind = this.overlayKind
  }

  ////////////////
  // ## Shown or hidden
  ////////////////

  /** Fomantic's class word on the `<dialog>` while it shows:  `active` (a modal), `visible` (a flyout). */
  declare shownClass: string

  /** Bumped on every show / hide, so a late `ui-opened` / `ui-closed` of an earlier one is dropped. */
  private generation = 0

  /** Fomantic's shown class (`shownClass`), just before the noun while `visible`. */
  protected get extraClass(): string | undefined {
    return this.isVisible ? this.shownClass : undefined
  }

  /**
   * Shown or hidden, as `visible` (`isVisible`):  `ui-opening` / `ui-closing` first, `ui-opened` / `ui-closed` once
   * its transition ends (`onVisibleChange()`).
   */
  readonly disclosure = new E.Disclosure({
    component: this,
    member: "isVisible",
    detail: (visible, originalEvent): UIT.ModalOpenDetail | UIT.ModalCloseDetail =>
      visible ? { visible, originalEvent } : { visible, reason: this.closeReason, originalEvent },
    afterDetail: (visible): UIT.ModalOpenDetail => ({ visible })
  })

  /** Why the latest close was asked for:  `ui-closing`'s `reason`. */
  private closeReason: UIT.ModalCloseReason = "escape"

  /** Show, dispatching the cancelable `ui-opening` first;  true when applied. */
  requestOpen(originalEvent?: Event): boolean {
    return this.disclosure.open(originalEvent)
  }

  /** Hide for `reason`, dispatching the cancelable `ui-closing` first;  true when applied. */
  @E.untracked
  requestClose(reason: UIT.ModalCloseReason, originalEvent?: Event): boolean {
    if (!this.isVisible) return false
    this.isDismissing = true
    E.soon(() => (this.isDismissing = false))
    this.closeReason = reason
    return this.disclosure.close(originalEvent)
  }

  /**
   * `visible` changed (`UIComponent`'s hook):  open or close the `<dialog>`;
   * resolves once its transition has ended, with `ui-opened` / `ui-closed`.
   * - `animation`:
   *   - the family's own (`elementSetup.animation`):  the sheet's transition (`UIModal.css`, `UIFlyout.css`)
   *   - another one (the element's own `animation`):  run on the `<dialog>` through `UI.transitions`
   *   - `none`:  at once (motion off, or the element's first draw)
   * - `ui-closed` only when it was shown:  a modal that starts hidden fires nothing.
   */
  protected async onVisibleChange(visible: boolean, animation: UIT.Animation): Promise<void> {
    const dialog = this.dialog
    if (!dialog) return
    const keyframes = UIT.AnimationLookup.keyframesBeside(animation, this.elementSetup.animation)
    if (visible) {
      this.show()
      if (keyframes) await UI.transitions.animate({ element: dialog, name: keyframes, direction: UIT.IN })
      if ((await this.transitionsEnd()) && this.isVisible) this.disclosure.sendAfter(true)
      return
    }
    const wasShown = UI.overlays.isOpen(this.overlayEntry)
    if (keyframes && wasShown) await UI.transitions.animate({ element: dialog, name: keyframes, direction: UIT.OUT })
    // shown again while the keyframes ran
    if (this.isVisible) return
    this.hide()
    if (!wasShown || !(await this.transitionsEnd())) return
    if (!this.isVisible && this.domElement.isConnected) this.disclosure.sendAfter(false)
  }

  /**
   * Shown again when it comes back into the page while `visible`;  closed, quietly, when it leaves.
   * - Not on the first connect:  the dialog isn't drawn yet, and `onVisibleChange()` runs once it is.
   */
  @E.whileConnected
  protected watchPlacement() {
    if (this.isVisible && this.isReady) this.show()
    return () => this.hide()
  }

  /**
   * `showModal()` (`show()` when `isModeless`) and register with `UI.overlays`;  nothing when already open.
   * - Modeless:  the overlay entry isn't `modal` (no scroll lock), and the page stays usable.
   *   - A click on the page LIGHT-DISMISSES it (`any`, the default), through the overlay entry, never the browser's:
   *     the click still lands where it went.
   *   - Its opener (`commandfor`) and a click inside don't count.
   * - `closedby` is applied here:
   *   natively when supported (the browser's light dismiss), else by the overlay entry's outside-click handling.
   * - A `<dialog>` that other keyframes animated out (`hidden` on it) shows again first.
   */
  private show() {
    const dialog = this.dialog
    if (!dialog) return
    const isModeless = this.isModeless
    const closedBy = this.closedBy
    // modeless:  our own outside-click handling, which lets the click through (the browser's needs a backdrop)
    const isNative = UI.browser.supports.dialogClosedBy && !isModeless
    if (isNative) dialog.setAttribute("closedby", closedBy)
    else dialog.removeAttribute("closedby")
    this.overlayEntry.closeOnEscape = closedBy !== "none"
    this.overlayEntry.closeOnOutsideClick = !isNative && closedBy === "any"
    this.overlayEntry.modal = !isModeless
    UI.transitions.reveal(dialog)
    if (!dialog.open) {
      if (isModeless) dialog.show()
      else dialog.showModal()
      UI.focus.enter(dialog)
    }
    UI.overlays.open(this.overlayEntry)
  }

  /** `close()` the dialog, THEN leave `UI.overlays` (whose focus restore needs the page no longer `inert`). */
  private hide() {
    const dialog = this.dialog
    if (dialog?.open) dialog.close()
    UI.overlays.close(this.overlayEntry)
  }

  /** Once the dialog's own transitions end:  `true` unless another show / hide started meanwhile. */
  private async transitionsEnd(): Promise<boolean> {
    const generation = ++this.generation
    const animations = this.dialog?.getAnimations() ?? []
    await Promise.allSettled(animations.map((animation) => animation.finished))
    return generation === this.generation
  }

  /** `send()` one of the events every dialog vocabulary names (see the class docs). */
  private fire(name: DialogEventName, detail: object): boolean {
    return this.send(name as E.EventName<V>, detail)
  }

  /** An invoker command aimed at the DOM element (`UIT.ToggleCommands`). */
  @E.on("command")
  protected onCommand(event: Event) {
    const action = UIT.ToggleCommands.action(event, this.isVisible)
    if (action === "show") this.requestOpen(event)
    else if (action === "close") this.requestClose("close", event)
  }

  ////////////////
  // ## Dismissal
  ////////////////

  /** A dismissal was asked for in this task:  the dialog's own `cancel` for the same key press is ignored. */
  private isDismissing = false

  /** The last press started on the `::backdrop`. */
  private pressStartedOnBackdrop = false

  /**
   * What dismisses it:  an explicit `closedby` wins;
   * else `none` for `closable="false"` (Fomantic's `closable: false`), else `any`.
   * - NOTE: `closedby` has a vocabulary default, so whether it was written is read off the DOM element.
   * - Untracked.
   */
  @E.untracked
  private get closedBy(): NonNullable<DialogAttributes["closedby"]> {
    if (this.domElement.hasAttribute("closedby")) return this.closedby ?? "any"
    // NOTE: an absent boolean also converts to `false`, so `closable` must be present to mean "closable: false"
    const isOff = this.domElement.hasAttribute(CLOSABLE) && !this.closable
    return isOff ? "none" : "any"
  }

  /** Remember whether a press started on the `::backdrop` (the dialog itself, outside its box). */
  private readonly onPointerDown = (event: PointerEvent) => {
    const dialog = this.dialog
    if (!dialog || event.target !== dialog) return void (this.pressStartedOnBackdrop = false)
    const box = dialog.getBoundingClientRect()
    const { clientX: x, clientY: y } = event
    this.pressStartedOnBackdrop = x < box.left || x > box.right || y < box.top || y > box.bottom
  }

  /**
   * The dialog's `cancel`:  Escape the overlay didn't take, or the browser's light dismiss (`closedby`).
   * - Always prevented;  the element decides, by `closedby`, and `ui-closing` may veto.
   */
  private readonly onCancel = (event: Event) => {
    event.preventDefault()
    const reason = this.pressStartedOnBackdrop ? "outside" : "escape"
    this.pressStartedOnBackdrop = false
    if (this.isDismissing) return
    const closedBy = this.closedBy
    if (closedBy === "none" || (reason === "outside" && closedBy !== "any")) return
    this.requestClose(reason, event)
  }

  /**
   * The dialog closed while the element thinks it's open:  the browser forced it -- follow.
   * - `close` is queued as a task:
   *   one from an earlier close can arrive after a quick re-open, when the dialog is open again -- ignored.
   */
  @E.untracked
  private readonly onClose = (event: Event) => {
    if (this.dialog?.open || !this.domElement.isConnected) return
    this.closeReason = "escape"
    this.disclosure.adopt(false, event)
  }

  ////////////////
  // ## Buttons
  ////////////////

  /** The close icon, while `closable`. */
  readonly closeButton = new E.CloseButton({
    owner: this,
    shows: () => !!this.closable,
    label: () => this.closeText,
    part: this.dialogPart(UIT.CLOSE),
    onClick: (event) => this.onCloseIcon(event)
  })

  /**
   * The close icon's label (`translationForKey("close")`).
   * - Not a cast in the JSX, for the reason `dialogPart()` is a method.
   */
  private get closeText(): string {
    return this.translationForKey(UIT.CLOSE as E.TextKey<V>)
  }

  /** Close icon. */
  private readonly onCloseIcon = (event: MouseEvent) => {
    event.stopPropagation()
    this.requestClose("close", event)
  }

  /** A click inside:  an approve / deny element asks, then closes. */
  private readonly onDialogClick = (event: MouseEvent) => {
    const found = DialogComponent.actionFor(event, this.domElement)
    if (!found) return
    const [kind, action] = found
    const detail: UIT.ModalActionDetail = { action, originalEvent: event }
    if (!this.fire(kind === "approve" ? "ui-approving" : "ui-denying", detail)) return
    this.requestClose(kind, event)
  }

  ////////////////
  // ## The name
  ////////////////

  /** The DOM element's `aria-label`, forwarded to the dialog. */
  get ariaLabel(): string | undefined {
    return this.attributes["aria-label"] ?? undefined
  }

  /**
   * First slotted `<ui-header>` (any tag whose noun is `header`), which names the dialog.
   * - Read on the server too, NO `isServer` guard:
   *   the static render (`spell/ui/static`, on linkedom elements) names the dialog by it (`serverLabelledBy()`).
   */
  @E.state accessor slottedHeading: Element | undefined = this.findHeading()

  /** Id of the `heading` shorthand, from `UI.ids` once rendering. */
  private headerId = ""

  /** The light DOM's slotted children changed:  look for the heading again. */
  @E.on("slotchange", { target: "renderRoot" })
  protected onSlotChange() {
    this.slottedHeading = this.findHeading()
  }

  /** First child element whose definition's noun is `header` (a `<ui-header>`, or a translated one). */
  private findHeading(): Element | undefined {
    for (const child of this.domElement.children) {
      if (E.UIComponent.registry.definitions.get(child.localName)?.vocabulary.noun === UIT.HEADER) return child
    }
    return undefined
  }

  /** The dialog's name:  its `aria-label`, else `aria-labelledby` the `heading` shorthand, else the slotted heading. */
  @E.onChange("isReady", "ariaLabel", "heading", "slottedHeading")
  protected onNameChanged(
    _isReady: boolean,
    label: string | undefined,
    header: string | undefined,
    heading: Element | undefined
  ) {
    const dialog = this.dialog
    if (!dialog) return
    const hasHeader = !!header
    const reflected = dialog as unknown as { ariaLabelledByElements: Element[] | null }
    if (label) dialog.setAttribute("aria-label", label)
    else dialog.removeAttribute("aria-label")
    // NOTE: setting the reflected list (even to `null`, the platform's "none") rewrites the attribute,
    // so it goes first
    reflected.ariaLabelledByElements = !label && !hasHeader && heading ? [heading] : null
    if (!label && hasHeader) dialog.setAttribute("aria-labelledby", this.headerId)
  }

  /**
   * The dialog's `aria-labelledby` in a server render (`spell/ui/static`):
   * the `heading` shorthand's id, else the slotted heading's,
   * unless the DOM element has an `aria-label` (which the static output moves onto the dialog).
   * - Why:  on a server no effect applies and no element reflects.
   * - SIDE EFFECT:  gives the slotted heading (the render's parsed copy) an id if it has none.
   */
  private serverLabelledBy(): string | undefined {
    if (this.ariaLabel) return undefined
    if (this.heading) return this.headerId
    const heading = this.slottedHeading
    return heading ? UI.ids.ensure(heading, `ui-${this.elementDefinition.vocabulary.noun}-heading`) : undefined
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    this.headerId = UI.ids.next(`ui-${this.elementDefinition.vocabulary.noun}`)
    return (
      <dialog
        ref={(element) => (this.dialog = element)}
        class={this.rootClass}
        part={this.dialogPart(this.rootPart)}
        aria-labelledby={isServer ? this.serverLabelledBy() : undefined}
        onCancel={this.onCancel}
        onClose={this.onClose}
        onPointerDown={this.onPointerDown}
        onClick={this.onDialogClick}
      >
        <Show when={this.heading}>
          <div id={this.headerId} class={UIT.HEADER} part={this.dialogPart(UIT.HEADER)}>
            {this.heading}
          </div>
        </Show>
        <Show when={this.content}>
          <div class={UIT.CONTENT} part={this.dialogPart(UIT.CONTENT)}>
            {this.content}
          </div>
        </Show>
        <slot />
        {this.closeButton.draw()}
      </dialog>
    )
  }

  /**
   * `part` value of one of the parts every dialog vocabulary names (see the class docs).
   * - A method, not a cast in the JSX:
   *   Solid's SSR compile (`hoistProps`) hoists a `<Show>`'s children into a module-level constructor,
   *   and passes it every free identifier they use.
   *   That includes the type parameter `V` of a `PartName<V>` cast, as a VALUE ("V is not defined").
   */
  private dialogPart(name: string): string {
    return this.partForName(name as E.PartName<V>)
  }

  /**
   * The approve / deny element `event` activated, with which it is;  `undefined` for none.
   * - The innermost light-DOM element on its path (in `domElement`'s tree)
   *   matching `UIT.ModalActionSelectors`, up to `domElement` (`UIT.ModalActions`, the toast's walk too).
   */
  private static actionFor(event: Event, domElement: Element): [UIT.ModalAction, Element] | undefined {
    for (const target of UIT.ModalActions.lightPath(event, domElement)) {
      const action = UIT.ModalActions.of(target)
      if (action) return [action, target]
    }
    return undefined
  }
}

/** The attribute of the close icon (and of Fomantic's `closable: false`). */
const CLOSABLE = "closable"
