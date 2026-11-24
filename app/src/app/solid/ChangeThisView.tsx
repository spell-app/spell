import { For, Match, Show, Switch } from "solid-js"
import type { JSX } from "@solidjs/web"

import type { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { on } from "./on"

import {
  setBoxWidth,
  setWords,
  ChangeThis,
  words,
  boxAt,
  request,
  pictures,
  stageOf,
  now,
  type BoxPlace,
  boxWidth,
  PICTURE_TYPES
} from "./ChangeThis"

/****************
 * ### `<ChangeThisBox>`
 * The small box next to what's selected:  a `<ui-popup>` there, with what to change, then how the request is getting on.
 * - A popup, not a panel:  it covers nothing but the place it's about.
 * - Its ✕, top right, closes it;  so does Esc.  A request under way goes on without it.
 * - Send, a small paper plane right of the words, at their foot, sends them;  so does Enter.  Shift+Enter starts a new line.
 * - A picture pasted or dropped into it goes with the words, a thumbnail under them, its ✕ taking it out (epic `editor` T62).
 * - Under way, a spinner, a short line of what Claude is doing, and the seconds since it was sent (epic `editor` I138):
 *   "Starting your agent…", "Reading your request…", "Editing Solitaire.spell…" (`statusOf()`);
 *   no Claude Code on this machine:  a link to install it, and the command to run by hand.
 * - `ChangeThis.open()` opens it.
 ****************/
export function ChangeThisBox(): JSX.Element {
  const send = () => void ChangeThis.send(words())
  return (
    <Show when={boxAt()}>
      {(where) => (
        <ui-popup
          at={leftEdgeOf(where())}
          open-on="manual"
          visible=""
          class="BarMenuPopup ChangeThisPopup"
          aria-label={appTexts.text("menuChangeThis")}
          ref={on("ui-closing", () => ChangeThis.close())}
        >
          <div
            class="ChangeThisBox"
            ref={(box: HTMLElement) => requestAnimationFrame(() => measureBox(box))}
            onPaste={(event: ClipboardEvent) => takePictures(event, event.clipboardData)}
            onDragOver={(event: DragEvent) => {
              // a file dragged over:  it may be dropped here
              if (event.dataTransfer?.types.includes("Files")) event.preventDefault()
            }}
            onDrop={(event: DragEvent) => takePictures(event, event.dataTransfer)}
          >
            <div class="ChangeThisTop">
              <label class="ChangeThisHeader">
                <ui-icon name={ChangeThis.icon} />
                {appTexts.text("changeThisHeader")}
              </label>
              <ui-button
                class="ChangeThisClose"
                appearance="circular basic"
                size="mini"
                icon="close"
                aria-label={appTexts.text("changeThisClose")}
                title={appTexts.text("changeThisClose")}
                onClick={() => ChangeThis.close()}
              />
            </div>
            <div class="ChangeThisField">
              <ui-textarea
                grow=""
                fluid=""
                rows="3"
                max-rows="6"
                autofocus=""
                readonly={!!request()}
                aria-label={appTexts.text("changeThisPrompt")}
                placeholder={appTexts.text("changeThisPrompt")}
                value={words()}
                ref={on<{ value: string }>("ui-typed", (event) => setWords(event.detail.value))}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key !== "Enter" || event.shiftKey || event.isComposing || request()) return
                  event.preventDefault()
                  send()
                }}
              />
              <ui-button
                class="ChangeThisSend"
                appearance="circular"
                size="mini"
                color="primary"
                icon={SEND_ICON}
                aria-label={appTexts.text("changeThisSend")}
                title={appTexts.text("changeThisSend")}
                disabled={request() || !words().trim() ? "" : undefined}
                onClick={send}
              />
            </div>
            <Show when={pictures().length}>
              <div class="ChangeThisPictures">
                <For each={pictures()}>
                  {(picture, index) => (
                    <span class="ChangeThisPicture">
                      <img src={picture.url} alt={appTexts.text("changeThisPicture")} />
                      <Show when={!request()}>
                        <ui-icon
                          name="close"
                          link=""
                          label={appTexts.text("changeThisRemovePicture")}
                          title={appTexts.text("changeThisRemovePicture")}
                          onClick={() => ChangeThis.removePictures(index())}
                        />
                      </Show>
                    </span>
                  )}
                </For>
              </div>
            </Show>
            <Switch>
              <Match when={isUnderWay(request())}>
                <p class="ChangeThisWorking">
                  <ui-loader visible="" inline="" size="small" />
                  <span class="ChangeThisStatus">{statusOf(request())}</span>
                  <span class="ChangeThisElapsed">
                    {appTexts.text("changeThisSeconds", { seconds: secondsSince(request()?.at) })}
                  </span>
                </p>
              </Match>
              <Match when={stageOf(request()) === "no claude"}>
                <p class="ChangeThisNoClaude">{appTexts.text("changeThisNoClaude")}</p>
                <a class="ChangeThisInstall" href={INSTALL_URL} target="_blank" rel="noopener">
                  {appTexts.text("changeThisInstall")}
                </a>
                <p>{appTexts.text("changeThisByHand")}</p>
                <ui-code language="sh">{LISTEN_COMMAND}</ui-code>
              </Match>
              <Match when={stageOf(request()) === "nobody"}>
                <p>{appTexts.text("changeThisNobody")}</p>
                <ui-button
                  class="ChangeThisStart"
                  size="small"
                  icon="play"
                  onClick={() => void ChangeThis.startClaude()}
                >
                  {appTexts.text("changeThisStart")}
                </ui-button>
                <ui-code language="sh">{LISTEN_COMMAND}</ui-code>
              </Match>
            </Switch>
          </div>
        </ui-popup>
      )}
    </Show>
  )
}

/**
 * What Claude is doing with `request`, as the box says it, in one short line:
 * - a session the page server started:  what its log says (`progress`), "Editing Solitaire.spell…"
 * - else "Starting your agent…" while none has taken it, then "Your agent is working on it…"
 */
function statusOf(request: SPACES.ChangeAnswer | undefined): string {
  const progress = request?.progress
  const file = progress?.file ?? ""
  if (progress?.step === "reading request") return appTexts.text("changeThisReadingRequest")
  if (progress?.step === "reading" && file) return appTexts.text("changeThisReadingFile", { file })
  if (progress?.step === "editing" && file) return appTexts.text("changeThisEditing", { file })
  if (progress?.step === "finishing") return appTexts.text("changeThisFinishing")
  return appTexts.text(stageOf(request) === "starting" ? "changeThisStarting" : "changeThisWorking")
}

/** Whole seconds from `at` (ISO) to `now()`:  the box's count, so it's visibly alive. */
function secondsSince(at: string | undefined): number {
  const since = at ? Date.parse(at) : NaN
  return Number.isNaN(since) ? 0 : Math.max(0, Math.round((now() - since) / 1000))
}

/**
 * The point `<ui-popup at>` takes, its box's top left:  a centred place moved left by half the box's width.
 * - The width is the box's as last drawn (`boxWidth`), else what its sheet sets.
 */
function leftEdgeOf(place: BoxPlace): BoxPlace {
  return place.isCentred ? { x: place.x - boxWidth() / 2, y: place.y } : place
}

/** Keep the drawn width of the popup round `box`, so a centred box stays centred. */
function measureBox(box: HTMLElement) {
  const width = box.parentElement?.getBoundingClientRect().width
  if (width) setBoxWidth(width)
}

/**
 * The box's paste or drop:  its pictures are taken, and nothing else of it happens;  words go in as ever.
 * - `data`:  the clipboard's, or the drop's
 */
function takePictures(event: Event, data: DataTransfer | null): void {
  const files = [...(data?.files ?? [])].filter((file) => PICTURE_TYPES.includes(file.type))
  if (!files.length) return
  event.preventDefault()
  void ChangeThis.addPictures(files).catch((error: unknown) => editor.showError(error as Error))
}

/** Send's icon:  Publish's paper plane (`EditorMode.tsx`). */
const SEND_ICON = "paper plane outline"

/** Where Claude Code's install is explained. */
const INSTALL_URL = "https://code.claude.com/docs/en/setup"

/** What a session runs to listen. */
const LISTEN_COMMAND = "spell app changes wait"

/** Is `request` under way:  a session started for it, or one on it? */
function isUnderWay(request: SPACES.ChangeAnswer | undefined): boolean {
  const stage = stageOf(request)
  return stage === "starting" || stage === "working"
}
