import { Show, createEffect, createMemo, createSignal } from "solid-js"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { ErrorBoundary, MenuHeader, PanelMenu, Submenu, tracked } from "spell/app/app/solid"
import { LazyCodeMirror } from "./LazyCodeMirror"

import "./TreeViewer.css"

/****************
 * ### `<TreeRoot>`
 * Root element to show the `<TreeViewer/>` in `SpellEditor`:  the spell tree of the line the cursor is on.
 * - Follows the file, its text and `editor.selection` through `tracked()`.
 * - Asks the language service for the tree (`spell/lineTree`), the language worker where it parses:
 *   it never reads the page's parse (epic `solid-2-final` T36).
 *   - An effect and a signal, never an async memo:  that would hold the cursor's other writes till the answer.
 ****************/
export function TreeRoot(props: TreeRootProps) {
  const asked = tracked(() => {
    const { file, selection } = editor
    const line = selection?.head?.line
    if (!(file instanceof SP.SpellFile) || typeof line !== "number") return undefined
    return { file, text: file.contents, line }
  })
  const [tree, setTree] = createSignal<P.TreeNode>()
  let lastAsk = 0
  createEffect(asked, (at) => {
    const ask = ++lastAsk
    void treeOfLineAt(at)
      .then((answer) => {
        // the cursor moved on, or typing overtook it (no answer):  the tree stays till that one's answer
        if (ask === lastAsk && answer !== undefined) setTree(() => answer ?? undefined)
      })
      .catch((error: unknown) => editor.showError(error as Error))
  })
  return (
    <div class="TreeRoot">
      <Show when={props.showToolbar ?? true}>
        <TreeToolbar />
      </Show>
      <TreeViewer tree={tree()} showError={(error) => editor.showError(error)} />
    </div>
  )
}

/**
 * The spell tree of line `at.line`, asked of the language service.
 * - `null`:  no tree there.  `undefined`:  no answer about the text as it is, e.g. typing overtook it.
 */
async function treeOfLineAt(at: { file: SP.SpellFile; text?: string; line: number } | undefined) {
  if (at?.text === undefined) return null
  const { states } = (await LazyCodeMirror.load()).SpellCodeMirror
  return states.ask(at.file, "spell/lineTree", { line: at.line })
}

/** Props for `<TreeRoot>`. */
export type TreeRootProps = {
  /** Show `<TreeToolbar>` above viewer.  Default:  `true`. */
  showToolbar?: boolean
}

/****************
 * ### `<TreeToolbar>`
 * Toolbar above `<TreeViewer>`:  just a header today (no actions).
 ****************/
export function TreeToolbar() {
  return (
    <PanelMenu>
      <Submenu left spring>
        <MenuHeader>{appTexts.text("spellTree")}</MenuHeader>
      </Submenu>
    </PanelMenu>
  )
}

/****************
 * ### `<TreeViewer>`
 * The spell tree (`P.TreeWriter`) of the `line` in `match` at `offset`, drawn by `<ui-tree-diagram>`.
 * - `tree`, worked out already (`<TreeRoot>`'s), else worked out here from `match` and `offset`.
 * - A new tree on every cursor move:  only the line under the cursor, so it stays small.
 * - No line there (or nothing parsed yet):  a hint instead.
 * - Errors:  the tree is worked out in RENDER, so `<ErrorBoundary>` catches a throwing `getAST()`, tells
 *   `showError`, and heals on the next move.
 * - SEE:  its page in App UI's guide, `/components/app/tree-viewer`.
 ****************/
export function TreeViewer(props: TreeViewerProps) {
  const tree = createMemo(() => {
    if ("tree" in props) return props.tree
    const { match, offset } = props
    if (!match || typeof offset !== "number") return undefined
    const ast = SP.BlockLine.lineAt(match, offset)?.AST
    return P.TreeWriter.treeOf(ast)
  })
  return (
    <div class="TreeViewer">
      <ErrorBoundary onError={(error) => props.showError?.(error)}>
        <Show when={tree()} fallback={<p class="TreeViewer-hint">{appTexts.text("spellTreeHint")}</p>}>
          <ui-tree-diagram tree={tree()} />
        </Show>
      </ErrorBoundary>
    </div>
  )
}

/** Props for `<TreeViewer>`. */
export type TreeViewerProps = {
  /** The tree to draw, worked out already:  then `match` and `offset` aren't read. */
  tree?: P.TreeNode
  /** The file's whole match. */
  match?: P.Match
  /** The cursor's offset in the file. */
  offset?: number
  /** Called with a caught error. */
  showError?: (error: unknown) => void
}
