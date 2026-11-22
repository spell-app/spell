import { For, Show, createEffect, createMemo, createSignal, onSettled, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor, runtimeCore } from "spell/app/app/editor"
import { runSite } from "spell/app/app/pages/RunSite"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { EDITOR_FRAME, EDITOR_OWN } from "spell/app/app/ui/ui.types"
import { SpellElement } from "spell/app/app/runner/SpellElement"
import { MenuHeader } from "./chrome"
import { DesignSamples, type Sample } from "./DesignSamples"
import { DESIGNED, Inspector, OwnEditorPage, SCALED_UP } from "./Inspector"
import { EditorTours } from "./EditorTours"
import { on } from "./on"
import { MenuPopup } from "./Palette"

import {
  setChosenSample,
  Design,
  TWO_SIDED,
  chosenSample,
  type DesignSize,
  FIT,
  type DesignBit,
  EDITOR_BIT
} from "./Design"

/****************
 * ### `<DesignStage>`
 * Design, in the app pane:  its picker down the left, the bit picked drawn large beside it.
 * - A drawing:  one thing of the view, drawn on its own, large, scaled to fit (`<FitInside>`), face up for its
 *   front and down for its back (Q59 A).
 * - The property editor:  drawn large, as the Inspector draws it (`<OwnEditorPage>`), the thing drawn small beside it,
 *   drawn again as it changes (Q58 C).
 * - A site's page:  the app itself, showing that page, as its own links would (`runSite`;  Q64 A);
 *   a page whose address takes a value shows the first one, `/films/1` for `/films/:film`.
 * - Drawn on the programs' runtime, as the editor's zones are (`runtimeCore()`):  a live edit draws it again in place,
 *   and the Inspector's changes to its thing redraw it.
 * - Its thing:  a new one, made with the settings of the one selected in the app, else with its starting values;
 *   never added to the app, so the game never sees it.  A new one again when the app restarts.
 * - The thing is selected in the Inspector as it's drawn, so its settings can be changed there.
 * - Its own drawing and its editor's elements are the Inspector's parts (`DESIGNED`, `<OwnEditorPage>`):
 *   the palette's drops and clicks, moves, cut, copy and paste write into the view's file and its editor's.
 * - `program`:  the app's own drawing, hidden while a view's bit shows, and none of the Inspector's parts (`EDITOR_OWN`).
 ****************/
export function DesignStage(props: { program: () => HTMLElement | undefined }): JSX.Element {
  const picked = createMemo(() => (Design.isShowing ? Design.picked : undefined))
  const showsView = createMemo(() => Design.isShowing && picked()?.kind !== "page")
  createEffect(showsView, (isHidden) => {
    const program = props.program()
    program?.toggleAttribute(EDITOR_OWN, isHidden)
    // drawn only while Design shows (`Design.tsx`):  so it leaves the app as it found it
    return () => program?.removeAttribute(EDITOR_OWN)
  })
  // a page's size is the app's own width (Q65):  a device's, or the width typed
  const pageWidth = createMemo(() => (Design.isShowing && !showsView() ? Design.widthOf(Design.size) : undefined))
  createEffect(pageWidth, (width) => {
    const program = props.program()
    if (!program) return
    program.style.maxWidth = width ? `${width}px` : ""
    program.style.marginInline = width ? "auto" : ""
    return () => {
      program.style.maxWidth = ""
      program.style.marginInline = ""
    }
  })
  // the code's cursor moving into a drawing picks it (Q63 B)
  const atCursor = createMemo(() => (Design.isShowing ? Design.atCursor?.key : undefined))
  createEffect(atCursor, (key) => {
    const bit = key && untrack(() => Design.drawings.find((each) => each.key === key))
    if (bit) Design.pick(bit)
  })
  // a page picked:  the running site shows it, as its own links would (Q64 A)
  const pageAddress = createMemo(() => {
    const bit = picked()
    if (bit?.kind !== "page" || !bit.address || !editor.isRunningSite) return undefined
    return `${addressToShow(bit.address)}#${editor.programRuns}`
  })
  createEffect(pageAddress, (shown) => {
    if (shown) runSite.heard(shown.replace(/#\d+$/, ""))
  })
  const viewClass = createMemo(() => {
    void editor.programRuns
    const view = showsView() ? Design.view : undefined
    return view && (runtimeCore()?.things.classNamed(view.classNames[0]!) as ViewClass | undefined)
  })
  // the gallery's samples (P38, Q61):  the saved ones, else made from the view's choices
  const samples = createMemo((): Sample[] => {
    const view = Design.view
    const Class = viewClass()
    const path = editor.file?.path
    if (!view || !Class || !path) return []
    const saved = DesignSamples.saved(view, path, Class)
    // a two sided view's made ones start face up:  each suit shows
    const start = view.classNames.includes(TWO_SIDED) ? { direction: "up" } : {}
    return saved.length
      ? saved
      : DesignSamples.made(Class, start, appTexts.text("designSampleStart", { view: view.name.toLowerCase() }))
  })
  const chosen = createMemo(() => {
    const sample = chosenSample()
    return sample?.path === editor.file?.path ? samples().find((each) => each.name === sample?.name) : undefined
  })
  // a new one for each frame (`showing`, `size`):  a drawing moved to another box is drawn afresh there
  const thing = createMemo(() => {
    const Class = viewClass()
    // the property editor's card, beside it, face up too (Q59 A)
    const side = picked()?.side ?? (Design.view?.classNames.includes(TWO_SIDED) ? "front" : undefined)
    const settings = chosen()?.settings
    void Design.showing
    void Design.size
    return Class ? untrack(() => thingFor(Class, side, settings)) : undefined
  })
  const drawn = createMemo(() => {
    const shown = thing()
    const core = runtimeCore()
    if (!shown || !core) return undefined
    const element = untrack(() => core.drawThing(shown)) as unknown as Element | null
    element?.setAttribute(DESIGNED, "")
    return element ?? undefined
  })
  const hasEditor = createMemo(() => {
    void editor.edits
    const shown = thing()
    return !!shown && !!Inspector.ownEditorOf(shown)
  })
  const isEditorPicked = () => picked()?.kind === "editor" && hasEditor()
  const isGallery = () => Design.showing === "gallery" && !isEditorPicked()
  // the Design tour offers itself the first time the Gallery opens (epic `editor` P40), unless taken before
  createEffect(isGallery, (gallery) => {
    if (gallery) EditorTours.offer("design")
  })
  // selected as it's drawn:  the Inspector changes its thing
  createEffect(
    () => (isGallery() ? undefined : drawn()),
    (element) => {
      if (element) requestAnimationFrame(() => element.isConnected && Inspector.select(element))
    }
  )
  return (
    <Show when={Design.isShowing}>
      <div class={["DesignStage", { page: !showsView() }]}>
        <div class="DesignSide" {...{ [EDITOR_OWN]: "" }}>
          <DesignPicker picked={picked()} hasEditor={hasEditor()} />
          <DesignSizes />
        </div>
        <Show when={showsView()}>
          <div class="DesignMain">
            <Show when={Design.view && viewClass() && !isEditorPicked()}>
              <DesignBar
                saveable={() => selectedOf(viewClass()) ?? thing()}
                onSaved={(name) => setChosenSample({ path: editor.file!.path, name })}
              />
            </Show>
            <div class={["DesignCanvas", { editing: isEditorPicked(), gallery: isGallery() }]}>
              <Show
                when={Design.view && (isGallery() ? viewClass() : drawn())}
                fallback={<p class="DesignWaiting">{appTexts.text(Design.view ? "designWaiting" : "designNothing")}</p>}
              >
                <Show
                  when={isGallery()}
                  fallback={
                    <>
                      <Show when={isEditorPicked()}>
                        <div class="DesignEditor">
                          <OwnEditorPage element={drawn()!} thing={thing()!} />
                        </div>
                      </Show>
                      <div class="DesignDrawing">
                        <SizedFrame scalesUp>
                          <div class="DesignView">{drawn()}</div>
                        </SizedFrame>
                      </div>
                    </>
                  }
                >
                  <SizedFrame scalesUp={false}>
                    <DesignGallery
                      samples={samples()}
                      Class={viewClass()!}
                      chosen={chosen()?.name}
                      onChosen={(name) => setChosenSample({ path: editor.file!.path, name })}
                    />
                  </SizedFrame>
                </Show>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  )
}

/** A view's class in the running program:  made new with its settings. */
type ViewClass = new (settings?: Record<string, unknown>) => object

/** The thing of `Class` selected in the app, the gallery or Design's canvas, if one is:  what Save Sample saves. */
function selectedOf(Class: ViewClass | undefined): object | undefined {
  if (!Class) return undefined
  return Inspector.allSelected
    .map((part) => part.element && part.element.isConnected && SpellElement.thingOf(part.element))
    .find((value): value is object => !!value && value instanceof Class)
}

/****************
 * ### `<SizedFrame>`
 * What Design draws, at the size picked (`Design.size`, Q65 C):
 * - Fit:  as large as the pane holds (`<FitInside>`) when it `scalesUp`, one drawing;  the gallery as it is
 * - a phone, tablet or desktop:  in Spell UI's `<ui-device>`, at its screen's size, its own Rotate turning it
 * - a width typed:  in a box that wide, the pane's height
 ****************/
function SizedFrame(props: { scalesUp: boolean; children: JSX.Element }): JSX.Element {
  const size = () => Design.size
  return (
    <Show
      when={size().device !== "fit" ? size() : undefined}
      fallback={
        <Show when={size().width} fallback={props.scalesUp ? <FitInside>{props.children}</FitInside> : props.children}>
          {(width) => (
            <div class="DesignWidth" style={{ width: `${width()}px` }}>
              {props.children}
            </div>
          )}
        </Show>
      }
    >
      {(device) => (
        <ui-device
          class="DesignDevice"
          device={device().device as "phone" | "tablet" | "desktop"}
          orientation={device().isLandscape ? "landscape" : "portrait"}
          controls="rotate"
          {...{ [EDITOR_FRAME]: "" }}
          ref={on<{ orientation: string }>("ui-changed", (event) =>
            Design.setSize({ ...untrack(size), isLandscape: event.detail.orientation === "landscape" })
          )}
        >
          <div class="DesignScreen">{props.children}</div>
        </ui-device>
      )}
    </Show>
  )
}

/****************
 * ### `<DesignBar>`
 * Over a view's drawing:  One | Gallery, how it shows (Q62), then Save Sample.
 * - Save Sample asks for a name, then saves the selected one's settings as a sample (`DesignSamples.save()`):
 *   one step of the editor's history, so Undo takes it back.
 * - `saveable()`:  what Save Sample saves;  `onSaved`:  told the new sample's name, once written.
 ****************/
function DesignBar(props: { saveable: () => object | undefined; onSaved: (name: string) => void }): JSX.Element {
  const save = async () => {
    const view = Design.view
    const path = editor.file?.path
    const thing = props.saveable()
    if (!view || !path || !thing) return
    const name = await editor.prompt({
      header: appTexts.text("designSaveSample"),
      message: appTexts.text("designSampleNameAsk"),
      defaultValue: (thing as { name?: unknown }).name?.toString() ?? ""
    })
    if (!name?.trim()) return
    await DesignSamples.save(view, path, thing, name.trim())
    props.onSaved(name.trim())
  }
  return (
    <div class="DesignBar" {...{ [EDITOR_OWN]: "" }}>
      <ui-menu
        appearance="segmented"
        size="small"
        class="DesignShowing"
        data-tour="one or gallery"
        aria-label={appTexts.text("designShowingLabel")}
      >
        <ui-item selected={Design.showing === "one"} onClick={() => Design.setShowing("one")}>
          {appTexts.text("designOne")}
        </ui-item>
        <ui-item selected={Design.showing === "gallery"} onClick={() => Design.setShowing("gallery")}>
          {appTexts.text("designGallery")}
        </ui-item>
      </ui-menu>
      <ui-button
        size="small"
        appearance="basic"
        icon="save outline"
        class="DesignSaveSample"
        data-tour="save sample"
        title={appTexts.text("designSaveSampleTip")}
        onClick={() => void save().catch(editor.showError)}
      >
        {appTexts.text("designSaveSample")}
      </ui-button>
    </div>
  )
}

/****************
 * ### `<DesignSizes>`
 * Under the picker:  the size Design draws at (Q65 C), remembered for the file.
 * - Fit, Phone, Tablet, Desktop;  a device's Rotate is its own, in its bottom edge.
 * - Then a width of your own, px, to see where a layout changes:  drawn to fit, at that width.
 * - A site's page:  the app itself, at that width.
 ****************/
function DesignSizes(): JSX.Element {
  const pick = (device: DesignSize["device"]) => Design.setSize(device === "fit" ? FIT : { device })
  return (
    <div class="DesignSizes" data-tour="design sizes">
      <div class="DesignSizesHeading">{appTexts.text("designSizeLabel")}</div>
      <ui-menu
        direction="vertical"
        appearance="secondary pointing"
        size="small"
        class="DesignSizeMenu"
        aria-label={appTexts.text("designSizeLabel")}
      >
        <For each={SIZE_ROWS}>
          {(row) => (
            <ui-item
              icon={row.icon}
              data-size={row.device}
              selected={Design.size.device === row.device && !(row.device === "fit" && Design.size.width)}
              onClick={() => pick(row.device)}
            >
              {appTexts.text(row.text)}
            </ui-item>
          )}
        </For>
      </ui-menu>
      <ui-input
        type="number"
        size="small"
        labeled="right"
        label="px"
        min="120"
        max="4000"
        class="DesignWidthField"
        placeholder={appTexts.text("designWidth")}
        aria-label={appTexts.text("designWidth")}
        title={appTexts.text("designWidthTip")}
        value={Design.size.device === "fit" && Design.size.width ? String(Design.size.width) : ""}
        ref={on<{ value: string }>("ui-changed", (event) => {
          const width = Math.round(Number(event.detail.value))
          Design.setSize(width >= MIN_WIDTH ? { device: "fit", width } : FIT)
        })}
      />
    </div>
  )
}

/** The size picker's rows:  each device, its icon (Fomantic's) and its name's text key. */
const SIZE_ROWS = [
  { device: "fit", icon: "expand", text: "designSizeFit" },
  { device: "phone", icon: "mobile alternate", text: "designSizePhone" },
  { device: "tablet", icon: "tablet alternate", text: "designSizeTablet" },
  { device: "desktop", icon: "desktop", text: "designSizeDesktop" }
] as const

/** The narrowest width typed that's taken, px:  less goes back to fitting the pane. */
const MIN_WIDTH = 120

/****************
 * ### `<DesignGallery>`
 * The view's samples side by side (P38, Q61, Q62), each drawn on its own, its name under it.
 * - A click on one selects it, for the Inspector to change, and one drawing shows it too (`onChosen`).
 * - A saved one's right-click menu:  Rename…, Delete, each one step of the editor's history.
 * - Each is a new thing made with its settings, never one in the app;  drawn again when the program runs again.
 ****************/
function DesignGallery(props: {
  samples: readonly Sample[]
  Class: ViewClass
  chosen: string | undefined
  onChosen: (name: string) => void
}): JSX.Element {
  const [menu, setMenu] = createSignal<{ x: number; y: number; sample: Sample }>()
  // the sample the menu is for, kept as it closes:  a row chosen closes the menu before its click runs
  let menuSample: Sample | undefined
  return (
    <div class="DesignGallery">
      <For each={props.samples} keyed={(sample) => `${sample.name}:${JSON.stringify(sample.settings)}`}>
        {(sample) => {
          const element = createMemo(() => {
            void editor.programRuns
            const core = runtimeCore()
            if (!core) return undefined
            const made = untrack(() => core.drawThing(new props.Class(sample().settings))) as unknown as Element | null
            made?.setAttribute(DESIGNED, "")
            return made ?? undefined
          })
          const choose = () => {
            const drawnSample = element()
            if (drawnSample) Inspector.select(drawnSample)
            props.onChosen(sample().name)
          }
          return (
            <figure
              class={["DesignSample", { chosen: props.chosen === sample().name }]}
              data-sample={sample().name}
              onClick={choose}
              onContextMenu={(event: MouseEvent) => {
                if (sample().line === undefined) return
                event.preventDefault()
                menuSample = sample()
                setMenu({ x: event.clientX, y: event.clientY, sample: sample() })
              }}
            >
              <div class="DesignSampleDrawing">
                <FitInside>{element()}</FitInside>
              </div>
              <figcaption {...{ [EDITOR_OWN]: "" }}>{sample().name}</figcaption>
            </figure>
          )
        }}
      </For>
      {/* the editor's own:  the Inspector never takes a click on its rows for a part */}
      <Show when={menu()}>
        {(open) => (
          <div class="DesignSampleMenu" {...{ [EDITOR_OWN]: "" }}>
            <MenuPopup at={open()} label={open().sample.name} onClose={() => setMenu(undefined)}>
              <ui-item icon="pencil" onClick={() => menuSample && void renameSample(menuSample)}>
                {appTexts.text("designRenameSample")}
              </ui-item>
              <ui-item icon="trash alternate outline" onClick={() => menuSample && deleteSample(menuSample)}>
                {appTexts.text("designDeleteSample")}
              </ui-item>
            </MenuPopup>
          </div>
        )}
      </Show>
    </div>
  )
}

/** Ask for `sample`'s new name, then rename it.  NEVER throws:  a failure shows in the error banner. */
async function renameSample(sample: Sample): Promise<void> {
  try {
    const path = editor.file?.path
    const name = await editor.prompt({
      header: appTexts.text("designRenameSample"),
      message: appTexts.text("designSampleNameAsk"),
      defaultValue: sample.name
    })
    if (path && name?.trim() && name.trim() !== sample.name) DesignSamples.rename(path, sample, name.trim())
  } catch (error) {
    editor.showError(error)
  }
}

/** Delete `sample`:  Undo brings it back. */
function deleteSample(sample: Sample): void {
  const path = editor.file?.path
  if (path) DesignSamples.remove(path, sample)
}

/**
 * The address to show a page at:  its own, each value it takes filled with `1`, its first record's in most places.
 * - `/films/:film` => `/films/1`
 */
function addressToShow(address: string): string {
  return address.replace(/:[^/]+/g, "1")
}

/**
 * A thing of `Class` for Design to draw:  a new one, made with `settings` (a sample's), else with the settings of the
 * one selected in the app, else its starting values;  put in nothing, so the game never sees it.
 * - `side`:  a two sided view's, `front` face up, `back` face down.
 */
function thingFor(Class: ViewClass, side: string | undefined, settings?: Record<string, unknown>): object {
  const selected = settings ? undefined : selectedOf(Class)
  const made = { ...(settings ?? (selected ? settingsOf(selected) : {})) }
  if (side === "front") made.direction = "up"
  else if (side === "back") made.direction = "down"
  return new Class(made)
}

/** `thing`'s settings, each of its own keys and its value:  `{ rank: "queen", suit: "spades", direction: "down" }`. */
function settingsOf(thing: object): Record<string, unknown> {
  const keys = (thing as { keys?: () => string[] }).keys?.() ?? []
  return Object.fromEntries(keys.map((key) => [key, (thing as Record<string, unknown>)[key]]))
}

/****************
 * ### `<DesignPicker>`
 * Design's list of what can be designed, down the left of the app pane:  the bit showing is chosen.
 * - The open view's:  its drawings, then its property editor, when it has one (`hasEditor`).
 * - A site's pages;  the project's other views.
 * - In the editor's own column (`EDITOR_OWN`):  none of the Inspector's parts, so a click on a row picks it,
 *   inspecting or not.
 ****************/
function DesignPicker(props: { picked: DesignBit | undefined; hasEditor: boolean }): JSX.Element {
  const viewBits = createMemo((): DesignBit[] => {
    const drawings = Design.drawings
    if (!drawings.length || !props.hasEditor) return drawings
    return [...drawings, { ...EDITOR_BIT, label: appTexts.text("designPropertyEditor") }]
  })
  const others = createMemo((): DesignBit[] =>
    Design.otherViews.map((view) => ({
      kind: "view",
      key: `view:${view.classNames[0]}`,
      label: view.name,
      name: view.classNames[0]
    }))
  )
  return (
    <ui-menu
      direction="vertical"
      appearance="secondary pointing"
      size="small"
      class="DesignPicker"
      data-tour="design picker"
      aria-label={appTexts.text("designPickerLabel")}
    >
      <Show when={Design.view}>
        {(view) => (
          <>
            <MenuHeader>{view().name}</MenuHeader>
            <PickerRows bits={viewBits()} picked={props.picked} />
          </>
        )}
      </Show>
      <Show when={Design.pages.length}>
        <MenuHeader>{appTexts.text("designPages")}</MenuHeader>
        <PickerRows bits={Design.pages} picked={props.picked} />
      </Show>
      <Show when={others().length}>
        <MenuHeader>{appTexts.text(Design.view ? "designOtherViews" : "designViews")}</MenuHeader>
        <PickerRows bits={others()} picked={props.picked} />
      </Show>
    </ui-menu>
  )
}

/** A group of the picker's rows:  a click shows its bit. */
function PickerRows(props: { bits: readonly DesignBit[]; picked: DesignBit | undefined }): JSX.Element {
  return (
    <For each={props.bits} keyed={(bit) => bit.key}>
      {(bit) => (
        <ui-item
          class="DesignBitRow"
          data-bit={bit().key}
          selected={props.picked?.key === bit().key}
          title={bit().written}
          onClick={() => Design.pick(bit())}
        >
          {bit().label}
        </ui-item>
      )}
    </For>
  )
}

/****************
 * ### `<FitInside>`
 * What it holds, scaled up to fit the box it's in, never smaller than it is:  a card one letter high drawn large.
 * - Measured as it's drawn and each time it or its box changes size.
 * - A CSS `scale`, not `zoom`:  with `zoom`, the Inspector's ants round a turned card were drawn half size in its
 *   corner;  a drop finds the parts under the pointer either way.
 * - Marked `SCALED_UP`, so the ants are a box of their own, not a ring the scale would thicken.
 ****************/
function FitInside(props: { children: JSX.Element }): JSX.Element {
  let box: HTMLDivElement | undefined
  let content: HTMLDivElement | undefined
  onSettled(() => {
    let frame = 0
    const fit = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!box || !content) return
        // its own size, as laid out:  a transform leaves it as it was
        const width = content.offsetWidth
        const height = content.offsetHeight
        if (!width || !height) return
        const room = box.getBoundingClientRect()
        const fits = Math.min((room.width - FIT_MARGIN) / width, (room.height - FIT_MARGIN) / height)
        const scale = Math.max(1, Math.min(MAX_SCALE, Math.floor(fits * 4) / 4))
        content.style.scale = String(scale)
      })
    }
    const watcher = new ResizeObserver(fit)
    watcher.observe(box!)
    watcher.observe(content!)
    return () => {
      cancelAnimationFrame(frame)
      watcher.disconnect()
    }
  })
  return (
    <div class="DesignFit" ref={(element: HTMLDivElement) => (box = element)}>
      <div class="DesignFitContent" {...{ [SCALED_UP]: "" }} ref={(element: HTMLDivElement) => (content = element)}>
        {props.children}
      </div>
    </div>
  )
}

/** The room `<FitInside>` leaves round what it holds, px. */
const FIT_MARGIN = 64

/** The most `<FitInside>` scales up. */
const MAX_SCALE = 12
