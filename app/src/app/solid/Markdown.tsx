import { Loading, createMemo } from "solid-js"

import type { MD } from "spell/parser/markdown"

/****************
 * ### `<Markdown>`
 * `text` as markdown, e.g. a docstring, drawn by `MD.toHTML()` (GitHub-flavoured, plain HTML tags).
 * - `spell/parser/markdown` (and the parser under it) loads LAZILY, on the first `<Markdown>`:  the runners show docstrings
 *   too (Type / Thing Explorer), and a runner page carries no parser otherwise.  Until it's in, the plain text.
 * - Its links go to `onOpen`, NOT the page -- e.g. `file:///…/Card.spell#L12`, for the editor to open.
 * - NOTE: raw HTML in `text` is rendered as is, bar GFM's tagfilter (`<script>` ... escaped):  only give it text
 *   we made.
 * - SEE:  its page in App UI's guide, `/components/app/markdown`.
 ****************/
export function Markdown(props: MarkdownProps) {
  // `text` read before the `await`:  read after it, a new text wouldn't draw again (`UNTRACKED_READ_AFTER_AWAIT`)
  const html = createMemo(async () => {
    const text = props.text
    return (await loadMarkdown()).toHTML(text)
  })
  return (
    <Loading fallback={<div class={["Markdown", props.class]}>{props.text}</div>}>
      <div class={["Markdown", props.class]} innerHTML={html()} onClick={(event) => open(event)} />
    </Loading>
  )

  /** Hand a clicked link to `onOpen`. */
  function open(event: MouseEvent) {
    const href = (event.target as HTMLElement).closest("a")?.getAttribute("href")
    if (!href) return
    event.preventDefault()
    props.onOpen(href)
  }
}

/** Props for `<Markdown>`. */
export type MarkdownProps = {
  /** Markdown to show. */
  text: string
  /** Extra class. */
  class?: string
  /** Link `href` clicked. */
  onOpen: (href: string) => void
}

/** `spell/parser/markdown`'s `MD`, imported once, on first use. */
let markdown: Promise<typeof MD> | undefined

/** Load `spell/parser/markdown` (once), with HTML's entity table (`P.HTMLEntities.load()`). */
function loadMarkdown() {
  markdown ??= Promise.all([
    import("spell/parser/markdown"),
    import("spell/parser/parser").then((module) => module.P.HTMLEntities.load())
  ]).then(([module]) => module.MD)
  return markdown
}
