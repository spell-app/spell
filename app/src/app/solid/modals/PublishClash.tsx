import { For, Loading } from "solid-js"
import { render } from "@solidjs/web"

import { uiReady } from "spell/app/app/solid/loadUI"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { LazyMonaco } from "spell/app/app/solid/LazyMonaco"

import "./PublishClash.css"

/****************
 * ### `<PublishClash>`
 * What Publish shows when a published file changed since your draft of it began (epic `editor` P24, Q25):
 * each such file, theirs and yours side by side (`<DiffView>`), then three buttons.
 * - "Publish mine anyway":  your drafts go out over theirs
 * - "Start again from theirs":  your drafts of those files go, back to what's published
 * - Cancel or Escape:  nothing happens
 * - Show one with `openPublishClash()`, which mounts it and cleans up.
 ****************/
export function PublishClash(props: PublishClashProps) {
  let answer: PublishClashAnswer | undefined
  return (
    <ui-modal
      class="PublishClash"
      size="large"
      closedby="closerequest"
      heading={appTexts.text("publishClashHeading")}
      visible=""
      ref={(modal: HTMLElement) => modal.addEventListener("ui-closed", () => props.onAnswer(answer), { once: true })}
    >
      <ui-content>
        <p>{appTexts.text("publishClashMessage")}</p>
        <For each={props.clashes}>
          {(clash) => (
            <section>
              <h4>{clash.filePath}</h4>
              <Loading fallback={<LazyMonaco.Loading />}>
                <LazyMonaco.DiffView theirs={clash.theirs} mine={clash.mine} />
              </Loading>
            </section>
          )}
        </For>
      </ui-content>
      <ui-actions>
        <ui-button class="cancel">{appTexts.text("cancel")}</ui-button>
        <ui-button class="approve" onClick={() => (answer = "theirs")}>
          {appTexts.text("publishStartAgain")}
        </ui-button>
        <ui-button class="approve" color="primary" onClick={() => (answer = "mine")}>
          {appTexts.text("publishAnyway")}
        </ui-button>
      </ui-actions>
    </ui-modal>
  )
}

/** Which way a clash went:  your drafts out anyway, or start again from what's published. */
export type PublishClashAnswer = "mine" | "theirs"

/** A file whose published text changed since your draft began. */
export type PublishClashFile = {
  /** its file, from the project's folder, e.g. `/Counter.spell` */
  filePath: string
  /** the published text */
  theirs: string
  /** your draft */
  mine: string
}

/** Props for `<PublishClash>`. */
export type PublishClashProps = {
  /** the files that clash */
  clashes: PublishClashFile[]
  /** Called once with the answer, after the modal has hidden:  `undefined` for Cancel. */
  onAnswer: (answer: PublishClashAnswer | undefined) => void
}

/**
 * Show a `<PublishClash>` for `clashes`;  resolves with its answer (see `<PublishClash>`).
 * - SIDE EFFECT:  a `<div class="PublishClashRoot">` in `<body>` holding the modal, until it has hidden.
 */
export async function openPublishClash(clashes: PublishClashFile[]): Promise<PublishClashAnswer | undefined> {
  await uiReady
  const root = document.createElement("div")
  root.className = "PublishClashRoot"
  document.body.append(root)
  return new Promise((resolve) => {
    const dispose = render(() => <PublishClash clashes={clashes} onAnswer={finish} />, root)

    /** Unmount, then resolve. */
    function finish(answer: PublishClashAnswer | undefined) {
      dispose()
      root.remove()
      resolve(answer)
    }
  })
}
