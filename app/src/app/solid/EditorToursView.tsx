import { createEffect, For } from "solid-js"
import type { JSX } from "@solidjs/web"

import { appTexts } from "spell/app/app/ui/AppTexts"
import { isStaticBuild } from "spell/app/app/static/staticBuild"

import { EditorTours, pageTours, EDITOR_TOURS, ON_SERVER } from "./EditorTours"

/****************
 * ### `<EditorToursLayer>`
 * The editor's tours, drawn once in the page:  nothing shows until one starts.
 * - Their steps' text in the editor's language (`appTexts`).
 * - Each step with no target shows under the top bar (`--ui-tour-top`, measured as a tour starts).
 * - A running tour stops when the editor goes to another mode.
 ****************/
export function EditorToursLayer(): JSX.Element {
  let startedIn: string | undefined
  const started = (event: Event) => {
    startedIn = EditorTours.modeNow()
    const bar = document.querySelector(".EditorBarPlace")?.getBoundingClientRect().bottom
    if (bar) (event.currentTarget as HTMLElement).style.setProperty("--ui-tour-top", `${Math.round(bar) + 12}px`)
  }
  createEffect(
    () => EditorTours.modeNow(),
    (mode) => {
      if (!startedIn || mode === startedIn) return
      startedIn = undefined
      pageTours()?.stop()
    }
  )
  return (
    <div class="EditorTours">
      <For each={EDITOR_TOURS}>
        {(tour) => (
          <ui-tour
            id={EditorTours.elementId(tour.id)}
            name={appTexts.text(tour.name)}
            summary={appTexts.text(tour.summary)}
            remember={isStaticBuild ? "" : ON_SERVER}
            ref={(element: HTMLElement) => element.addEventListener("ui-starting", started)}
          >
            <For each={tour.steps}>
              {(step) => (
                <ui-tour-step
                  target={step.target}
                  wait-for={step.waitFor}
                  placement={step.placement}
                  dim={step.dim ? "" : undefined}
                >
                  {appTexts.text(step.text)}
                </ui-tour-step>
              )}
            </For>
          </ui-tour>
        )}
      </For>
    </div>
  )
}
