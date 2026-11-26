import { For, Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { waitUntil } from "spell/util/timing"
import type { DOMTourElement, TourControl } from "spell/ui/components/ui-tour"
import { editor } from "spell/app/app/editor"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"

import { Action } from "./Actions"
import { Design } from "./Design"
import { EditorMode } from "./EditorMode"
import { LazyPiece } from "./LazyPiece"

/****************
 * ### `EditorTours`
 * The editor's own tours (epic `editor` P40):  Design, Anatomy and Inspect app, each a Spell UI `<ui-tour>`.
 * - Listed in the Help menu, each a row that starts it, then Tours…, a popup of a card each, a tick on those taken
 *   (`openTours()`).
 * - Their steps point at the editor's parts by their `data-tour` names (`<ui-tour-step target="design">`):
 *   the Design tab, Design's picker, Anatomy's and Inspect app's switches, the app, the Inspector, the code.
 * - Each tour remembers it was taken with the person's account (`remember="on server"`), so a tour offered by itself
 *   (Design's, the first time the Gallery opens:  `<DesignStage>`) isn't offered again on another machine;
 *   the static build, which has no server, keeps it in the browser.
 * - Starting one goes where its steps are first (`prepare`):  Design's into Design, the others into Edit.
 * - A tour's own `when`s, as Owen asked for them ("when going into edit mode, stop the tour"):
 *   a tour stops when the editor goes to another mode (`<EditorToursLayer>`'s mode watch).
 * - STATIC and instance-free on purpose, as `Inspector` is:  one set of tours per page.
 * - Their elements, `<EditorToursLayer>`, are drawn the first time a tour starts or is offered:
 *   from `EditorToursView.tsx` (`EditorTours.views`, a `LazyPiece`), so neither it nor Spell UI's tour family
 *   loads with the editor.
 ****************/
export class EditorTours {
  /** The tours' elements, loaded the first time one starts or is offered:  see `LazyPiece`. */
  static views = new LazyPiece(() => import("./EditorToursView"), "waitTours")

  /** The editor's tours, in the Help menu's order. */
  static get all(): readonly EditorTour[] {
    return EDITOR_TOURS
  }

  /** The tour `id`'s element on the page, once `<EditorToursLayer>` has drawn it. */
  static elementFor(id: EditorTourId): DOMTourElement | undefined {
    return (document.getElementById(EditorTours.elementId(id)) as DOMTourElement | null) ?? undefined
  }

  /** Its element's `id`. */
  static elementId(id: EditorTourId): string {
    return `EditorTour-${id}`
  }

  /**
   * Start tour `id`:  go where its steps are first, then start it once its first target is drawn.
   * - NEVER throws:  a tour that can't start shows as the editor's error.
   */
  static start(id: EditorTourId): void {
    void EditorTours.ready(id)
      .then((tour) => tour?.start())
      .catch((error: unknown) => editor.showError(error))
  }

  /**
   * Offer tour `id`, as its `offer` says, unless it was taken before (`DOMTourElement.offerToStart()`).
   * - NEVER throws.
   */
  static offer(id: EditorTourId): void {
    void EditorTours.drawn(id)
      .then((tour) => tour?.offerToStart())
      .catch((error: unknown) => console.error(error))
  }

  /**
   * Draw every tour's element, the first time, and wait for them (at most 5s):  Tours… reads which were taken.
   * - Rejects when the tours' view can't load.
   */
  static async draw(): Promise<void> {
    setWanted(true)
    await EditorTours.views.load()
    await waitUntil(() => EDITOR_TOURS.every((tour) => EditorTours.elementFor(tour.id)), { timeout: WAIT_FOR_PLACE })
  }

  /** Draw the tours (`draw()`), then tour `id`'s element. */
  private static async drawn(id: EditorTourId): Promise<DOMTourElement | undefined> {
    await EditorTours.draw()
    return EditorTours.elementFor(id)
  }

  /** Go where tour `id`'s steps are, and wait until its first target is drawn (at most 5s);  its element. */
  private static async ready(id: EditorTourId): Promise<DOMTourElement | undefined> {
    const tour = EDITOR_TOURS.find((each) => each.id === id)!
    tour.prepare()
    const first = tour.steps[0]?.target
    if (first) await waitUntil(() => document.querySelector(`[data-tour="${first}"]`), { timeout: WAIT_FOR_PLACE })
    return EditorTours.drawn(id)
  }

  /** The mode a tour started in:  it stops when the editor leaves it. */
  static modeNow(): string {
    return editor.projectPage === "editor" ? (editor.isDesigning ? "design" : "edit") : editor.projectPage
  }
}

/** Has a tour started or been offered, so their elements are drawn (`<EditorToursLayer>`)? */
const [isWanted, setWanted] = createSignal(false)

/** The tours' elements, loaded on first use:  see `EditorToursView.tsx`. */
const EditorToursDrawn = EditorTours.views.view("EditorToursLayer")

/**
 * The editor's tours, drawn once in the page, the first time one starts or is offered:
 * `<EditorToursLayer>`, from `EditorToursView.tsx`.
 */
export function EditorToursLayer(): JSX.Element {
  return (
    <Show when={isWanted()}>
      <EditorToursDrawn />
    </Show>
  )
}

/****************
 * ### `<TourMenuItems>`
 * The Help menu's tours:  a row each, which starts it, then Tours…, the popup of them all.
 ****************/
export function TourMenuItems(): JSX.Element {
  return (
    <>
      <For each={EDITOR_TOURS}>
        {(tour) => (
          <Action menu icon={TOUR_ICON} title={appTexts.text(tour.menu)} onClick={() => EditorTours.start(tour.id)} />
        )}
      </For>
      <Action
        menu
        icon="th large"
        title={appTexts.text("toursMenu")}
        onClick={() =>
          void EditorTours.draw()
            .then(() => import("./modals/ToursDialog"))
            .then(({ openTours }) => openTours())
            .catch((error: unknown) => editor.showError(error))
        }
      />
    </>
  )
}

/** One of the editor's tours. */
export type EditorTour = {
  /** Its id:  its element's, `EditorTour-<id>` */
  id: EditorTourId
  /** Its name, in the Help menu's Tours… and at the top of each step */
  name: AppTextKey
  /** Its Help menu row's title */
  menu: AppTextKey
  /** One line about it, in Tours… and its offer */
  summary: AppTextKey
  /** Go where its steps are, before it starts */
  prepare: () => void
  /** Its steps, in order */
  steps: readonly EditorTourStep[]
}

/** One step of an editor tour:  `<ui-tour-step>`'s attributes, its text a key. */
export type EditorTourStep = {
  /** What it says */
  text: AppTextKey
  /** What it points at:  an editor part's `data-tour` name;  none:  under the top bar */
  target?: string
  /** An event on the target that moves the tour on:  `click` */
  waitFor?: string
  /** Which side of the target its box goes */
  placement?: "top" | "bottom" | "left" | "right"
  /** Darken the rest of the editor */
  dim?: boolean
}

/** The editor's tour ids. */
export type EditorTourId = "design" | "anatomy" | "inspect"

/** The Help menu's tour rows' icon. */
const TOUR_ICON = "map signs"

/** `remember`'s value that keeps a tour taken with the person's account. */
export const ON_SERVER = "on server"

/** How long a tour waits for the editor to draw its first target, in seconds. */
const WAIT_FOR_PLACE = 5

/**
 * The page's tour control, which Spell UI's tour family puts on the page as it loads (`UITour.control`).
 * - Read by its symbol, never imported:  this file is in the editor's first bundle, Spell UI loads later.
 */
export function pageTours(): TourControl | undefined {
  return (globalThis as Record<symbol, TourControl | undefined>)[Symbol.for("spell-ui:tours")]
}

/** Into Edit, from wherever the editor is. */
function intoEdit() {
  if (EditorTours.modeNow() !== "edit") EditorMode.show("edit")
}

/** The editor's tours (epic `editor` P40, Q12):  Design mode, Anatomy and Inspect app. */
export const EDITOR_TOURS: readonly EditorTour[] = [
  {
    id: "design",
    name: "tourDesign",
    menu: "tourDesignMenu",
    summary: "tourDesignSummary",
    prepare: () => {
      if (!Design.isShowing && Design.canShow) Design.show()
    },
    steps: [
      { target: "design", text: "tourDesign1" },
      { target: "design picker", text: "tourDesign2", placement: "right" },
      { target: "one or gallery", text: "tourDesign3" },
      { target: "save sample", text: "tourDesign4" },
      { target: "design sizes", text: "tourDesign5", placement: "right" },
      { text: "tourDesign6" }
    ]
  },
  {
    id: "anatomy",
    name: "tourAnatomy",
    menu: "tourAnatomyMenu",
    summary: "tourAnatomySummary",
    prepare: intoEdit,
    steps: [
      { target: "anatomy", text: "tourAnatomy1", waitFor: "click" },
      { target: "app", text: "tourAnatomy2", placement: "left" },
      { target: "app", text: "tourAnatomy3", placement: "left" },
      { target: "anatomy", text: "tourAnatomy4" }
    ]
  },
  {
    id: "inspect",
    name: "tourInspect",
    menu: "tourInspectMenu",
    summary: "tourInspectSummary",
    prepare: intoEdit,
    steps: [
      { target: "inspect app", text: "tourInspect1", waitFor: "click" },
      { target: "app", text: "tourInspect2", placement: "left" },
      { target: "inspector", text: "tourInspect3", placement: "left" },
      { target: ".EditorCode", text: "tourInspect4", placement: "right" },
      { target: "inspect app", text: "tourInspect5" }
    ]
  }
]
