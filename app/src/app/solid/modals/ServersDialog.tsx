import { createSignal, onCleanup } from "solid-js"
import { render } from "@solidjs/web"

import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { uiReady } from "spell/app/app/solid/loadUI"

import "./ServersDialog.css"

/****************
 * ### `<ServersDialog>`
 * Help › Servers (epic `editor` T185):  the Spell Servers page, framed in a dialog.
 * - The page is the server keeper's own (`/servers/`, on its port):  each server up or down, how long it's been up,
 *   what it's building, its last log lines, Restart.
 *   - So it works while every page server is down, and Restart there is the keeper's, never the editor's.
 *   - Its address comes from the editor's page server (`ServersGlance.page`):  the page never guesses a port.
 * - Framed by Spell UI's `<ui-embed>`, loaded at once (`active`).
 *   - In a frame the page hides its own title, wears the scheme the editor shows (`?scheme=`), and says how tall
 *     it is (`spellServersHeight`):  the frame takes that height, up to `MOST_HEIGHT`, then scrolls inside.
 *   - The frame's page talks to the keeper alone:  this page reads nothing of it but its height.
 * - Closes like every dialog:  its ✕, or Escape (`closedby="closerequest"`).
 *   - It opens with the focus on its title, so Escape closes it;  once a click puts the focus inside the frame, Escape
 *     reaches the keeper's page instead, and only the ✕ closes it (a cross-origin frame's keys never reach us).
 * - Show one with `openServers()`, which mounts it and cleans up.
 ****************/
export function ServersDialog(props: ServersDialogProps) {
  const [height, setHeight] = createSignal(START_HEIGHT)
  const page = new URL(props.page)
  page.searchParams.set("scheme", props.scheme ?? ThemePreference.shownScheme())
  /** The page's height, as it says it:  only from the page framed here. */
  const onMessage = (event: MessageEvent) => {
    const told = (event.data as { spellServersHeight?: unknown } | undefined)?.spellServersHeight
    if (event.origin === page.origin && typeof told === "number" && told > 0) setHeight(told)
  }
  let title: HTMLElement | undefined
  window.addEventListener("message", onMessage)
  onCleanup(() => window.removeEventListener("message", onMessage))
  return (
    <ui-modal
      class="ServersDialog"
      closedby="closerequest"
      closable=""
      aria-label={appTexts.text("serversTitle")}
      visible=""
      ref={(element: HTMLElement) => {
        // the title takes the focus, not the frame:  Escape pressed inside the frame never reaches this page
        element.addEventListener("ui-opened", () => title?.focus(), { once: true })
        element.addEventListener("ui-closed", () => props.onClose(), { once: true })
      }}
    >
      <div class="ServersHeader">
        <h2 class="ServersTitle" tabindex="-1" ref={(element: HTMLElement) => (title = element)}>
          {appTexts.text("serversTitle")}
        </h2>
      </div>
      <div class="ServersBody">
        <ui-embed
          class="ServersFrame"
          url={page.href}
          active=""
          label={appTexts.text("serversTitle")}
          height={`${height()}px`}
          max-height={MOST_HEIGHT}
        />
      </div>
    </ui-modal>
  )
}

/** Props for `<ServersDialog>`. */
export type ServersDialogProps = {
  /** The Spell Servers page's address, on the keeper's own port. */
  page: string
  /** The scheme for the page to wear;  default the one the editor shows. */
  scheme?: "light" | "dark"
  /** Called once it has closed. */
  onClose: () => void
}

/**
 * Show the Servers dialog;  resolves once it has closed.
 * - Behind `editor.showServers()`:  Help › Servers.
 * - SIDE EFFECT:  a `<div class="ServersDialogRoot">` in `<body>` holding it, until it closes.
 * - One at a time:  asked again while it's open, it does nothing.
 * - Waits for `uiReady`:  `<ui-modal>` and `<ui-embed>` must be defined before it opens.
 */
export async function openServers(props: Omit<ServersDialogProps, "onClose">): Promise<void> {
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
    const dispose = render(() => <ServersDialog {...props} onClose={finish} />, root)

    /** Unmount, then resolve. */
    function finish() {
      dispose()
      root.remove()
      resolve()
    }
  })
}

/** What holds the dialog in `<body>`:  `openServers()` opens one at a time. */
const ROOT_CLASS = "ServersDialogRoot"

/** The frame's height until the page says its own:  about one server's card and the bar above them. */
const START_HEIGHT = 480

/** The tallest the frame grows:  past it, the page scrolls inside the frame. */
const MOST_HEIGHT = "72vh"
