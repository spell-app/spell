import { createSignal, onSettled, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { ServerRestarts } from "spell/app/app/ServerRestarts"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { FLOATING_MESSAGE_STYLE } from "./ErrorNotice"

/****************
 * ### `<ServerRestarting>`
 * A small notice at the top of the editor while Spell restarts (epic `editor` T177, from Q92's B):
 * "Spell is restarting…", a spinner beside it, and that your changes are kept;  then "Spell is back." for a moment
 * once it answers.
 * - Only after `SHOW_AFTER_MSEC` away:  a blip never flashes it.
 * - "Back" only after it said it was restarting.
 * - Where `<Notice>` floats, as an info `<ui-message>`;  it can't be closed:  it goes by itself.
 * - What it waits on:  the live channel's `spell-server:down` / `up`, as `ServerRestarts` does.
 ****************/
export function ServerRestarting(): JSX.Element {
  const [shown, setShown] = createSignal<"restarting" | "back" | undefined>(undefined)
  onSettled(() => {
    ServerRestarts.follow()
    let timer: ReturnType<typeof setTimeout> | undefined
    const down = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setShown("restarting"), SHOW_AFTER_MSEC)
    }
    const up = () => {
      clearTimeout(timer)
      if (shown() !== "restarting") return setShown(undefined)
      setShown("back")
      timer = setTimeout(() => setShown(undefined), BACK_FOR_MSEC)
    }
    addEventListener("spell-server:down", down)
    addEventListener("spell-server:up", up)
    return () => {
      clearTimeout(timer)
      removeEventListener("spell-server:down", down)
      removeEventListener("spell-server:up", up)
    }
  })
  return (
    <Show when={shown()}>
      {(state) => (
        <div class="ServerRestarting" role="status" style={RESTARTING_STYLE}>
          <Show
            when={state() === "restarting"}
            fallback={<ui-message state="success" floating="" heading={appTexts.text("serverBack")} />}
          >
            <ui-message state="info" floating="" heading={appTexts.text("serverRestarting")}>
              <ui-loader slot="icon" visible="" inline="" size="small" />
              <p>{appTexts.text("serverRestartingKept")}</p>
            </ui-message>
          </Show>
        </div>
      )}
    </Show>
  )
}

/** How long the server must be away before `<ServerRestarting>` shows, in msec. */
const SHOW_AFTER_MSEC = 1000
/** How long "Spell is back." shows, in msec. */
const BACK_FOR_MSEC = 2500

/** Where `<ServerRestarting>` sits:  where `<Notice>` floats, as wide as its words. */
const RESTARTING_STYLE: JSX.CSSProperties = {
  ...FLOATING_MESSAGE_STYLE,
  width: "max-content",
  "max-width": "calc(100vw - 32px)"
}
