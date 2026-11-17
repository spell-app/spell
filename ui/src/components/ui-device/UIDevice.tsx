import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import { deviceVocabulary } from "./UIDevice.en"

import deviceCSS from "./UIDevice.css?inline"

/****************
 * ### `<ui-device>`
 * The component behind `<ui-device>`:  a phone, tablet or desktop drawn round what it holds (epic `mockup` P25).
 *
 *     <div class="ui phone device" part="device">
 *       <div class="screen" part="screen">  <div class="display">  <slot>  </div>  </div>
 *       <div class="edge" part="buttons">   switch, Rotate, <slot name="buttons">   </div>
 *     </div>
 *
 * - What it holds is drawn at the device's screen size (`SCREENS`:  a phone's 390 by 844 ...),
 *   then scaled down to fit (`scale`), never up:  so an app inside lays itself out as it would on that device.
 *   - It fits the width it's given, and the window's height.
 * - The frame round it is drawn at its real size, whatever the scale:  a phone's rounded body with its camera island
 *   in the top edge (never over the screen), a tablet's thinner bezel, a laptop's lid and base.
 * - Its thick bottom edge holds its own buttons, then the page's (`slot="buttons"`), at their real size.
 *   - Its own:  the phone / tablet / desktop switch and Rotate, each one turned off by `controls`.
 *   - A person's change writes `device` / `orientation`, then sends `ui-changed`.
 * - `modal`:  it floats in a `<ui-modal appearance="basic">` of its own shadow root, over the dimmed page.
 *   - That modal does everything a modal does (Escape, the dimmer, the focus trap, the top layer):
 *     the device only shows and hides it, as its own `visible` says.
 *   - So it starts hidden, as a `<ui-modal>` does, unless the page writes `visible` or `hidden`.
 *   - The modal's events (`ui-opened`, `ui-closed` ...) come out of the device, as its own.
 *   - A `cancel` / `deny` (or `approve`) button in its bottom edge hides it, as one in a modal does.
 * - NOT a `<ui-modal>` subclass:  a device is as often on a page as in a dialog.
 ****************/
export class UIDevice extends E.UIComponent<typeof deviceVocabulary> {
  @E.proto static vocabulary = deviceVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { device: deviceCSS },
    cssStates: ["modal"]
  } satisfies Partial<E.ElementSetup>

  constructor(...args: ConstructorParameters<typeof E.UIComponent>) {
    super(...args)
    // a modal device starts hidden, as a `<ui-modal>` does, unless the page said
    const { domElement } = this
    if (this.modal && !domElement.hasAttribute("hidden") && !domElement.hasAttribute(VISIBLE)) domElement.hidden = true
  }

  ////////////////
  // ## The device and how it's held
  ////////////////

  /** Is it on its side?  A desktop always is. */
  get isLandscape(): boolean {
    return this.device === DESKTOP || this.orientation === LANDSCAPE
  }

  /** Its screen's size, in CSS pixels, as it's held:  what it holds is laid out at this size. */
  get screenSize(): Size {
    const { width, height } = SCREENS[this.device ?? PHONE]
    return this.isLandscape ? { width: Math.max(width, height), height: Math.min(width, height) } : { width, height }
  }

  /** Its frame round the screen, in CSS pixels, as it's held:  the bottom edge is measured (`edgeHeight`). */
  private get bezel(): Bezel {
    const device = this.device ?? PHONE
    return BEZELS[device === DESKTOP ? device : `${device} ${this.isLandscape ? LANDSCAPE : PORTRAIT}`]
  }

  /** Its states:  which device it is, and whether it's on its side. */
  protected cssStates() {
    const device = this.device ?? PHONE
    return {
      phone: device === PHONE,
      tablet: device === TABLET,
      desktop: device === DESKTOP,
      landscape: this.isLandscape
    }
  }

  /** Fomantic-style class words:  `ui phone landscape device`. */
  protected get extraClass(): string | undefined {
    return [this.device ?? PHONE, this.isLandscape ? LANDSCAPE : ""].join(" ").trim()
  }

  ////////////////
  // ## Its size
  ////////////////

  /** The room it has, in CSS pixels:  its own width (or the window's, as a modal), the window's height. */
  @E.state accessor room: Size = { width: 0, height: 0 }

  /** The bottom edge's height, as drawn:  it grows when its buttons wrap. */
  @E.state accessor edgeHeight = EDGE_HEIGHT

  /**
   * How much smaller than life its screen is drawn:  1 when it fits, never more.
   * - What's left of the room once the frame round the screen and the stage round the frame are taken out.
   */
  get scale(): number {
    const { room, bezel, screenSize } = this
    if (!room.width || !room.height) return 1
    const width = room.width - bezel.left - bezel.right - 2 * STAGE
    const height = room.height - bezel.top - this.edgeHeight - 2 * STAGE
    return Math.max(SMALLEST_SCALE, Math.min(1, width / screenSize.width, height / screenSize.height))
  }

  /** The screen's size on the page:  `screenSize` times `scale`, in whole pixels. */
  get shownSize(): Size {
    const { screenSize, scale } = this
    return { width: Math.round(screenSize.width * scale), height: Math.round(screenSize.height * scale) }
  }

  /** While connected:  measure the room again as its box, or the window, changes size. */
  @E.whileConnected
  protected watchRoom() {
    if (isServer) return
    const measure = () => this.measureRoom()
    const resized = new ResizeObserver(measure)
    resized.observe(this.domElement)
    window.addEventListener("resize", measure)
    measure()
    return () => {
      resized.disconnect()
      window.removeEventListener("resize", measure)
    }
  }

  /** Measure the room:  as a modal, the window's;  else its own width, and the window's height. */
  @E.untracked
  private measureRoom() {
    const { innerWidth, innerHeight } = window
    const width = this.modal ? innerWidth - 2 * MODAL_MARGIN : this.domElement.clientWidth
    const room = { width, height: innerHeight - 2 * MODAL_MARGIN }
    if (room.width !== this.room.width || room.height !== this.room.height) this.room = room
  }

  /** The bottom edge was drawn:  watch its height, which grows when its buttons wrap. */
  private edgeDrawn(edge: HTMLElement) {
    if (isServer) return
    if (!this.edgeWatch) {
      const watch = (this.edgeWatch = new ResizeObserver((entries) => {
        const height = (entries.at(-1)?.target as HTMLElement | undefined)?.offsetHeight
        if (height && height !== this.edgeHeight) this.edgeHeight = height
      }))
      this.domElement.addReleaseCallback(() => watch.disconnect())
    }
    this.edgeWatch.observe(edge)
  }

  /** What watches the bottom edge's height, once it's drawn. */
  private edgeWatch: ResizeObserver | undefined

  ////////////////
  // ## Its own buttons
  ////////////////

  /** Does it show the phone / tablet / desktop switch? */
  get showsSwitch(): boolean {
    return this.controls === ALL || this.controls === DEVICE
  }

  /** Does it show Rotate?  Never on a desktop, which is always wide. */
  get showsRotate(): boolean {
    return (this.controls === ALL || this.controls === ROTATE) && this.device !== DESKTOP
  }

  /** Rotate:  on its side, or upright again;  then `ui-changed`. */
  @E.untracked
  private readonly rotate = (event: MouseEvent) => {
    this.orientation = this.isLandscape ? PORTRAIT : LANDSCAPE
    this.sendChanged(event)
  }

  /** The switch:  another device;  then `ui-changed`. */
  @E.untracked
  private switchTo(device: DeviceName, event: MouseEvent) {
    if (device === this.device) return
    this.device = device
    this.sendChanged(event)
  }

  /** `ui-changed`, with the device and how it's held now. */
  private sendChanged(originalEvent: Event) {
    const device = this.device ?? PHONE
    const orientation = this.orientation === LANDSCAPE ? LANDSCAPE : PORTRAIT
    this.send("ui-changed", { device, orientation, originalEvent })
  }

  ////////////////
  // ## As a modal
  ////////////////

  /** The `<ui-modal>` it floats in, with `modal`. */
  private modalElement: (HTMLElement & { visible: boolean }) | undefined

  /** Is its modal shown, its entry transition over? */
  private isModalOpen = false

  /** The modal's own `ui-opened` / `ui-closed` (not one of the device's content's). */
  private readonly onModalShown = (event: Event) => {
    if (event.target !== this.modalElement) return
    this.isModalOpen = event.type === OPENED
    // closed by itself (Escape, the dimmer):  the device follows
    if (!this.isModalOpen && this.isVisible) this.domElement.hidden = true
  }

  /**
   * Shown or hidden:  as a modal, its modal shows and hides itself, following `isVisible` (`render()`);
   * a hide waits for it to be gone, so the device stays on screen (`:state(hiding)`) until then.
   */
  protected async onVisibleChange(visible: boolean, animation: E.ElementAnimation): Promise<void> {
    if (!this.modal) return super.onVisibleChange(visible, animation)
    const modal = this.modalElement
    if (visible || !modal || !this.isModalOpen) return
    await new Promise<void>((resolve) => {
      modal.addEventListener(CLOSED, () => resolve(), { once: true })
      void E.after(MOST_CLOSING_TIME, resolve)
    })
  }

  /** A click in its bottom edge on a `cancel` / `deny` or `approve` button:  a modal device hides. */
  @E.on("click")
  protected onClick(event: MouseEvent) {
    if (!this.modal || !this.isVisible) return
    for (const target of UIT.ModalActions.lightPath(event, this.domElement)) {
      if (!UIT.ModalActions.of(target)) continue
      this.domElement.hidden = true
      return
    }
  }

  /** An invoker command aimed at it, as at a modal:  `<button commandfor="id" command="--show">` (`--close`, `--toggle`). */
  @E.on("command")
  protected onCommand(event: Event) {
    if (!this.modal) return
    const action = UIT.ToggleCommands.action(event, this.isVisible)
    if (action === "show") this.domElement.hidden = false
    else if (action === "close") this.domElement.hidden = true
  }

  /** What a screen reader calls the modal:  the device's `aria-label`. */
  private get modalLabel(): string | undefined {
    return this.attributes["aria-label"] ?? undefined
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <Show when={this.modal} fallback={this.frame()}>
        <ui-modal
          ref={(element: HTMLElement) => {
            this.modalElement = element as HTMLElement & { visible: boolean }
            element.addEventListener(OPENED, this.onModalShown)
            element.addEventListener(CLOSED, this.onModalShown)
          }}
          part={this.partForName("modal")}
          appearance="basic"
          closedby={this.closedby ?? "any"}
          aria-label={this.modalLabel}
          visible={this.isVisible}
        >
          {this.frame()}
        </ui-modal>
      </Show>
    )
  }

  /** The device:  its screen, scaled to fit, then its bottom edge. */
  private frame(): JSX.Element {
    return (
      <div class="stage">
        <div class={this.rootClass} part={this.partForName("device")}>
          <div
            class="screen"
            part={this.partForName("screen")}
            style={{ width: `${this.shownSize.width}px`, height: `${this.shownSize.height}px` }}
          >
            <div
              class="display"
              style={{
                width: `${this.screenSize.width}px`,
                height: `${this.screenSize.height}px`,
                transform: this.scale === 1 ? undefined : `scale(${this.scale})`
              }}
            >
              <slot />
            </div>
          </div>
          <div class="edge" part={this.partForName("buttons")} ref={(edge: HTMLElement) => this.edgeDrawn(edge)}>
            {this.controlButtons()}
            <slot name="buttons" />
          </div>
        </div>
      </div>
    )
  }

  /** Its own buttons:  the switch, then Rotate. */
  private controlButtons(): JSX.Element {
    return (
      <>
        <Show when={this.showsSwitch}>
          <ui-buttons
            part={this.partForName("switch")}
            role="group"
            aria-label={this.translationForKey("switch")}
            size="small"
          >
            <For each={DEVICES}>
              {(device) => (
                <ui-button
                  icon={device === PHONE ? "mobile" : device}
                  inverted=""
                  appearance="basic"
                  selected={this.device === device ? "" : undefined}
                  aria-label={this.translationForKey(device)}
                  title={this.translationForKey(device)}
                  onClick={(event: MouseEvent) => this.switchTo(device, event)}
                />
              )}
            </For>
          </ui-buttons>
        </Show>
        <Show when={this.showsRotate}>
          <ui-button
            part={this.partForName("rotate")}
            icon="redo"
            size="small"
            inverted=""
            appearance="basic"
            aria-label={this.translationForKey("rotate")}
            title={this.translationForKey("rotate")}
            onClick={this.rotate}
          />
        </Show>
      </>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDevice extends E.AttributeValues<typeof deviceVocabulary> {}

/** A width and a height, in CSS pixels. */
export type Size = { width: number; height: number }

/** A device's name:  `phone`, `tablet` or `desktop`. */
export type DeviceName = (typeof DEVICES)[number]

/** The frame round a screen, each side in CSS pixels;  the bottom edge is the buttons' (`EDGE_HEIGHT`, measured). */
type Bezel = { top: number; right: number; left: number }

/** The devices, in the switch's order. */
const DEVICES = ["phone", "tablet", "desktop"] as const
const [PHONE, TABLET, DESKTOP] = DEVICES

/** How a device is held. */
const PORTRAIT = "portrait"
const LANDSCAPE = "landscape"

/** `controls`' words. */
const ALL = "all"
const ROTATE = "rotate"
const DEVICE = "device"

/** Each device's screen, upright, in CSS pixels:  an iPhone 14's, an iPad Air's, a 13" laptop's. */
const SCREENS: Record<DeviceName, Size> = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1280, height: 800 }
}

/**
 * The frame round each device's screen, as it's held:  MUST match `UIDevice.css`'s paddings.
 * - A phone's camera island is in its top edge, upright, or its left edge, on its side.
 */
const BEZELS: Record<string, Bezel> = {
  "phone portrait": { top: 40, right: 16, left: 16 },
  "phone landscape": { top: 16, right: 16, left: 40 },
  "tablet portrait": { top: 24, right: 24, left: 24 },
  "tablet landscape": { top: 24, right: 24, left: 24 },
  desktop: { top: 24, right: 16, left: 16 }
}

/** The bottom edge's height before it's measured:  `UIDevice.css`'s `--_ui-device-edge`. */
const EDGE_HEIGHT = 56

/** The room round the frame for its shadow (and a laptop's base):  `UIDevice.css`'s `.stage` padding. */
const STAGE = 16

/** The gap between a modal device and the window's edges. */
const MODAL_MARGIN = 16

/** Never drawn smaller than this, however little room there is:  the page scrolls instead. */
const SMALLEST_SCALE = 0.2

/** The longest a modal's close may take before the device hides anyway, in seconds. */
const MOST_CLOSING_TIME = 1

/** The shared `visible` attribute. */
const VISIBLE = "visible"

/** The modal's events the device follows. */
const OPENED = "ui-opened"
const CLOSED = "ui-closed"
