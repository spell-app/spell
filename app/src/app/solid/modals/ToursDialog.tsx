import { For, Show } from "solid-js"
import { render } from "@solidjs/web"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { uiReady } from "spell/app/app/solid/loadUI"
import { EditorTours, type EditorTour } from "spell/app/app/solid/EditorTours"

import "./ToursDialog.css"

/****************
 * ### `<ToursDialog>`
 * Help › Tours… (epic `editor` P40, Q11):  the editor's tours, a card each, for when the Help menu's rows aren't enough.
 * - Each card:  the tour's name, its one line, how many steps, and a tick once it's been taken
 *   (finished, or closed:  `DOMTourElement.seen`).
 * - Its Start button closes the dialog, then starts the tour (`EditorTours.start()`):
 *   a tour can't point at the editor through an open dialog.
 * - Closes like every dialog:  its ✕, or Escape.
 * - Show one with `openTours()`, which mounts it and cleans up.
 ****************/
export function ToursDialog(props: { onClose: (start?: EditorTour) => void }) {
  let modal: HTMLElement & { close?: () => void } = undefined!
  let chosen: EditorTour | undefined
  const seen = (tour: EditorTour) => !!EditorTours.elementFor(tour.id)?.seen
  const steps = (tour: EditorTour) =>
    tour.steps.length === 1 ? appTexts.text("tourOneStep") : appTexts.text("tourSteps", { count: tour.steps.length })
  const start = (tour: EditorTour) => {
    chosen = tour
    modal.removeAttribute("visible")
  }
  return (
    <ui-modal
      class="ToursDialog"
      size="small"
      closedby="closerequest"
      closable=""
      heading={appTexts.text("toursTitle")}
      visible=""
      ref={(element: HTMLElement) => {
        modal = element
        element.addEventListener("ui-closed", () => props.onClose(chosen), { once: true })
      }}
    >
      <ui-cards class="ToursCards" columns="1">
        <For each={EditorTours.all}>
          {(tour) => (
            <ui-card class="TourCard" data-tour-id={tour.id}>
              <ui-content>
                <ui-header>
                  {appTexts.text(tour.name)}
                  <Show when={seen(tour)}>
                    <ui-icon class="TourTaken" name="check circle" color="green" label={appTexts.text("tourTaken")} />
                  </Show>
                </ui-header>
                <ui-meta>{steps(tour)}</ui-meta>
                <ui-description>{appTexts.text(tour.summary)}</ui-description>
              </ui-content>
              <ui-extra>
                <ui-button size="small" color="primary" icon="map signs" onClick={() => start(tour)}>
                  {appTexts.text("tourStart")}
                </ui-button>
              </ui-extra>
            </ui-card>
          )}
        </For>
      </ui-cards>
    </ui-modal>
  )
}

/**
 * Show Help › Tours…;  resolves once it has closed, after starting the tour picked, if one was.
 * - One at a time:  a second call while it shows does nothing.
 * - throws if Spell UI didn't load
 */
export async function openTours(): Promise<void> {
  if (document.querySelector(`.${ROOT_CLASS}`)) return
  // in the page at once, so a second call while Spell UI loads finds it
  const root = document.createElement("div")
  root.className = ROOT_CLASS
  document.body.append(root)
  try {
    await uiReady
  } catch (error) {
    root.remove()
    throw error
  }
  return new Promise<void>((resolve) => {
    const dispose = render(() => <ToursDialog onClose={finish} />, root)

    /** Unmount, start the tour picked, then resolve. */
    function finish(tour?: EditorTour) {
      dispose()
      root.remove()
      if (tour) EditorTours.start(tour.id)
      resolve()
    }
  })
}

/** What holds the dialog in `<body>`:  `openTours()` opens one at a time. */
const ROOT_CLASS = "ToursDialogRoot"
