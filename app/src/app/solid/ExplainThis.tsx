import { For, Show, createSignal } from "solid-js"
import { render } from "@solidjs/web"

import { KnownFormat, LoadableFile } from "spell/util"
import { within } from "spell/util/timing"
import type { SPACES } from "spell/app/spaces"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import { appTexts } from "spell/app/app/ui/AppTexts"
import type { ExplainedLine } from "spell/app/app/ui/ExplainedLines"
import { uiReady } from "./loadUI"

import "./ExplainThis.css"

/****************
 * ### `<ExplainThis>`
 * Explain This, on the code's right-click menu (epic `editor` P32, Q39, Q40):  a modal with the Spell on the left and
 * what it does, in plain words, on the right.  Nothing runs.
 * - The code is what was right-clicked:  the selection, a whole action from its head line, else the line
 *   (`CodeMirrorMenu`'s `explainedLines()`).
 * - Its words come two ways (Q40, "both"):
 *   - at once, line by line:  the editor's own words for each line, what its hover says in plain mode
 *     (`ExplainedLines`), offline and in the program's language
 *   - then, above them, a summary of the whole, from Claude Code on this machine (`POST /api/explain`, spaces'
 *     `ClaudeExplainer`), in the editor's language
 * - Owen:  "don't barf if claude is not available".  No Claude Code here, a failure, or no answer within
 *   `SUMMARY_WITHIN_SECONDS`:  the summary's quiet line goes, and the line-by-line words stand alone.  No error, no notice.
 * - Never in the public preview, which has no server (`isAvailable`).
 * - Open one with `ExplainThis.open()`, which mounts it and cleans up once it's closed.
 ****************/
export function ExplainThis(props: ExplainThisProps) {
  /** Claude's summary;  `undefined` while it's asked for, `""` when there's none. */
  const [summary, setSummary] = createSignal<string>()
  const code = () => props.lines.map((line) => line.text).join("\n")
  const explained = () => props.lines.filter((line) => line.words)
  void ExplainThis.summarize(code(), props.projectId).then(setSummary, () => setSummary(""))
  return (
    <ui-modal
      class="ExplainThis"
      size="large"
      closedby="any"
      closable=""
      heading={appTexts.text("explainThis")}
      visible=""
      ref={(modal: HTMLElement) => modal.addEventListener("ui-closed", () => props.onClose(), { once: true })}
    >
      <ui-content>
        <div class="sides">
          <section class="code">
            <h4>{appTexts.text("explainThisCode")}</h4>
            <ui-code language="spell">{code()}</ui-code>
          </section>
          <section class="words" aria-live="polite">
            <h4>{appTexts.text("explainThisWords")}</h4>
            <Show when={summary() === undefined}>
              <p class="asking">
                <ui-loader visible="" inline="" size="mini" /> {appTexts.text("explainThisAsking")}
              </p>
            </Show>
            <Show when={summary()}>{(it) => <ui-markdown class="summary">{it()}</ui-markdown>}</Show>
            <Show
              when={explained().length}
              fallback={
                <Show when={summary() === ""}>
                  <p class="quiet">{appTexts.text("explainThisNoWords")}</p>
                </Show>
              }
            >
              <h5>{appTexts.text("explainThisLineByLine")}</h5>
              <ol class="lines">
                <For each={explained()}>
                  {(line) => (
                    <li>
                      <code>{line.text.trim()}</code>
                      <ui-markdown>{line.words}</ui-markdown>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
          </section>
        </div>
      </ui-content>
      <ui-actions>
        <ui-button class="cancel">{appTexts.text("explainThisClose")}</ui-button>
      </ui-actions>
    </ui-modal>
  )
}

/** Props for `<ExplainThis>`. */
export type ExplainThisProps = {
  /** the code to explain, a line each, with the editor's own words for each */
  lines: readonly ExplainedLine[]
  /** the project it's from:  only its name goes with the question */
  projectId?: string
  /** called once the modal has closed */
  onClose: () => void
}

/** Can Spell be explained here?  Not in the public preview:  it asks this machine's server. */
ExplainThis.isAvailable = (): boolean => !isStaticBuild

/**
 * Open `<ExplainThis>` on `lines`.
 * - SIDE EFFECT:  a `<div class="ExplainThisRoot">` in `<body>` holding the modal, until it's closed.
 * - Waits for `uiReady`, and the `spell-code` family, which colours `<ui-code language="spell">` as the code pane does.
 * - NEVER throws:  Claude's summary failing leaves the modal as it is (`<ExplainThis>`).
 */
ExplainThis.open = async (lines: readonly ExplainedLine[], projectId?: string): Promise<void> => {
  if (!ExplainThis.isAvailable() || !lines.some((line) => line.text.trim())) return
  await Promise.all([uiReady, import("spell/app/app/components/spell-code")])
  const root = document.createElement("div")
  root.className = "ExplainThisRoot"
  document.body.append(root)
  const dispose = render(() => <ExplainThis lines={lines} projectId={projectId} onClose={close} />, root)

  /** Unmount once it's closed. */
  function close() {
    dispose()
    root.remove()
  }
}

/**
 * A summary of what `code` does, in plain words, in the editor's language:  this machine's server asks Claude Code
 * (`POST /api/explain`).
 * - `""` when no answer comes within `SUMMARY_WITHIN_SECONDS`
 * - throws what the server says no with:  409 with no Claude Code here, 502 when it failed
 */
ExplainThis.summarize = async (code: string, projectId?: string): Promise<string> => {
  const asked: SPACES.ExplainAsked = { code, language: appTexts.lang || "en", ...(projectId ? { projectId } : {}) }
  const asking = LoadableFile.fetch<SPACES.ExplainAnswer>({
    url: EXPLAIN_URL,
    contents: asked,
    requestFormat: KnownFormat.json,
    format: "json",
    cache: "no-store"
  })
  return (await within(asking, SUMMARY_WITHIN_SECONDS))?.explanation ?? ""
}

/** Where the server explains code. */
const EXPLAIN_URL = "/api/explain"

/** How long the summary is waited for, in seconds, before the line-by-line words stand alone. */
const SUMMARY_WITHIN_SECONDS = 30
