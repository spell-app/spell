import { createSignal, For, Loading, onSettled } from "solid-js"
import { render } from "@solidjs/web"

import { UI } from "spell/ui/core"
import { uiReady } from "spell/app/app/solid/loadUI"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { LazyCodeMirror } from "spell/app/app/solid/LazyCodeMirror"
import type { CodeMirrorMerge } from "spell/app/app/ui/codemirror"
import { fileIconFor } from "spell/app/app/solid/chrome"
import { confirm } from "./dialogs"

import "./PublishClash.css"

/****************
 * ### `<PublishClash>`
 * What Publish shows when a published file changed since your draft of it began (epic `editor` P24, Q25):
 * each such file, yours and the published version side by side (`<DiffView>`), then three buttons.
 * - The files are tabs, as the code's file tabs are (Owen, epic `editor` T101):  one shows at a time;
 *   too many for the row, they scroll with arrows (the toolbar's `scroll-first`).
 * - "Your Changes" heads the left side, "Current Published Version" the right (T101;  T75 had them the other way).
 * - The left side is what you'll publish:  an arrow in the centre column takes that change from theirs;
 *   taken, it's an undo icon, which puts yours back.  You can type in it too.
 * - ⌘Z and ⇧⌘Z undo and redo in the file showing, wherever the focus is (I218):
 *   the takes, the put-backs and what you typed, never the editor behind.
 * - "Use Their Changes", at the left, red:  after an "Are you sure?", your drafts of those files go,
 *   back to what's published
 * - Cancel, the ✕ or Escape:  nothing happens, your draft as it was
 * - "Publish My Changes":  the left side of each file goes out, over theirs
 * - Show one with `openPublishClash()`, which mounts it and cleans up.
 ****************/
export function PublishClash(props: PublishClashProps) {
  let answer: PublishClashAnswer | undefined
  let modal!: HTMLElement & { visible: boolean }
  // each file's left side, as it is now:  your draft, with what you took from theirs
  const merged = new Map(props.clashes.map(({ filePath, mine }) => [filePath, mine]))
  // each file's merge view, once it's made:  the keys' undo and redo
  const merges = new Map<string, CodeMirrorMerge>()
  const [shown, setShown] = createSignal(props.clashes[0]?.filePath)
  let isAsking = false

  const words = { take: appTexts.text("publishClashTake"), putBack: appTexts.text("publishClashPutBack") }

  /** Show `filePath`'s diff:  measured again, as it was drawn hidden. */
  const show = (filePath: string) => {
    setShown(filePath)
    requestAnimationFrame(() => merges.get(filePath)?.requestMeasure())
  }

  /** "Use Their Changes":  asked first, as it throws your changes away. */
  const takeTheirs = async () => {
    isAsking = true
    try {
      const isSure = await confirm({
        header: appTexts.text("publishUseTheirsHeading"),
        message: appTexts.text("publishUseTheirsConfirm"),
        ok: appTexts.text("publishUseTheirs"),
        danger: true
      })
      if (!isSure) return
      answer = { choice: "theirs" }
      modal.visible = false
    } finally {
      isAsking = false
    }
  }

  // ⌘Z and ⇧⌘Z while it's open:  the file showing's, wherever the focus is (I218);
  // the modal's own scope shuts out the page's, so without these the key went nowhere
  onSettled(() => {
    const stops = UNDO_KEYS.flatMap(({ shortcut, action }) =>
      [true, false].map((isApple) =>
        UI.keyboard.register({
          chord: UI.keyboard.chord(shortcut, { isApple }),
          global: true,
          handler: () => {
            const merge = merges.get(shown() ?? "")
            if (isAsking || !modal.visible || !merge) return false
            merge.undo(action)
            return undefined
          }
        })
      )
    )
    return () => stops.forEach((stop) => stop())
  })

  return (
    <ui-modal
      class="PublishClash"
      size="large"
      closable=""
      closedby="closerequest"
      heading={appTexts.text("publishClashHeading")}
      visible=""
      ref={(element: HTMLElement) => {
        modal = element as HTMLElement & { visible: boolean }
        element.addEventListener("ui-closed", () => props.onAnswer(answer), { once: true })
      }}
    >
      <ui-content>
        <p>{appTexts.text("publishClashMessage")}</p>
        <ui-panel class="PublishClashFiles" appearance="pane" label={appTexts.text("publishClashFiles")}>
          <ui-toolbar
            slot="actions"
            appearance="segmented link header"
            tabs=""
            shrinkable=""
            scroll-first=""
            label={appTexts.text("publishClashFiles")}
          >
            <For each={props.clashes}>
              {(clash) => (
                <ui-item
                  icon={fileIconFor(fileName(clash.filePath))}
                  value={clash.filePath}
                  title={clash.filePath}
                  selected={shown() === clash.filePath}
                  onClick={() => show(clash.filePath)}
                >
                  {fileName(clash.filePath)}
                </ui-item>
              )}
            </For>
          </ui-toolbar>
          <div class="PublishClashSides">
            <h5>{appTexts.text("publishClashMine")}</h5>
            <h5>{appTexts.text("publishClashTheirs")}</h5>
          </div>
          <For each={props.clashes}>
            {(clash) => (
              <section class="PublishClashFile" hidden={shown() !== clash.filePath}>
                <Loading fallback={<LazyCodeMirror.Loading />}>
                  <LazyCodeMirror.DiffView
                    theirs={clash.theirs}
                    mine={clash.mine}
                    words={words}
                    onChange={(text) => merged.set(clash.filePath, text)}
                    onMerge={(merge) => merges.set(clash.filePath, merge)}
                  />
                </Loading>
              </section>
            )}
          </For>
        </ui-panel>
      </ui-content>
      <ui-actions>
        <ui-button class="UseTheirs" color="red" onClick={() => void takeTheirs()}>
          {appTexts.text("publishUseTheirs")}
        </ui-button>
        <ui-button class="cancel">{appTexts.text("cancel")}</ui-button>
        <ui-button class="approve" color="primary" onClick={() => (answer = { choice: "mine", merged })}>
          {appTexts.text("publishMine")}
        </ui-button>
      </ui-actions>
    </ui-modal>
  )
}

/** The keys the dialog undoes and redoes with, in Spell UI's words. */
const UNDO_KEYS = [
  { shortcut: "mod+Z", action: "undo" },
  { shortcut: "shift+mod+Z", action: "redo" }
] as const

/** A file's name, from its path:  `/Dashboard.site.spell` => `Dashboard.site.spell`. */
function fileName(filePath: string): string {
  return filePath.split("/").at(-1) ?? filePath
}

/**
 * Which way a clash went:
 * - `mine`:  publish each file's left side, `merged` (by file path):  your draft, with what you took from theirs
 * - `theirs`:  start again from what's published
 */
export type PublishClashAnswer = { choice: "mine"; merged: Map<string, string> } | { choice: "theirs" }

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
