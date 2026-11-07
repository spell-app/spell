import { Show, createSignal, getOwner, onSettled, runWithOwner } from "solid-js"
import { render, type JSX } from "@solidjs/web"
import type { monaco } from "spell/app/app/ui/monaco"

import { setDebugGlobal } from "spell/util"
import { after } from "spell/element"
import { SourceMarks, type SourcePlace } from "spell/parser/parser/writers/SourceMarks"
import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"
import { ExampleCode } from "./ExampleCode"
import { NotebookController } from "./NotebookController"
import { NotebookDocs } from "./NotebookDocs"
import { showNotebook } from "./NotebookHeader"
import { SpellExample } from "./SpellExample"

// the docs site's look:  the section titles', the subtitle's and the tabs panel's, as a component page draws them
import "spell/ui/docs-components/docs-sections.css"
import "spell/ui/docs-components/docs-page.css"
import "./NotebookPage.css"

/****************
 * ### `<NotebookPage>`
 * The docs frame round a NOTEBOOK page the running program draws, in the app area (epic `notebook` P3, Q4):
 * a `.spellml` page with the `notebook` flag, `<spell-page "x" notebook>` or `<spell-notebook "x">`.
 * - The PROGRAM draws the page, in the app's mount point (`program`), as any app draws:  its title, its sections,
 *   sticky and foldable, and its examples, `<spell-example>`.  So drag and drop, the Inspector and the palette work
 *   on it as on any app, and an edit draws again only what changed (`LiveEdit`).
 *   - The page drawn is the open file's, not the one the project starts by itself (`editor.showOpenPage()`, J3).
 * - This adds what's the editor's, round the drawing:
 *   - the docs site's look, its text size and the page's gutter (`NotebookPage.css`)
 *   - "On this page" at the right where there's room, unless its Hide hid it, the site's own `<ui-toc>`;
 *     where it doesn't show, an icon at the pane's top right opens it as a flyout
 *   - each example's code editor, in its `source` slot (`<ExampleCode>`):  found by the place its `<spell-example>`
 *     is marked with (`SourceMarks.placeOfDrawn()`), made ONCE per example, and MOVED into the example the program
 *     draws again, its code pane kept open:  its text, cursor and focus stay as they were
 *   - a click selects the cell holding what was clicked:  the pane header's ⋯ menu acts on it
 *   - a link to another notebook of the project (its tab bar's) shows it through the app's router:  no reload;
 *     a link to a section (`#types`) scrolls to it within the page
 * - Its tools (the notebooks' menu, the lock, the ⋯ menu) are in the pane's header (`<NotebookHeader>`).
 * - SIDE EFFECT:  defines `<spell-example>`, the example frame the notebook's examples draw as;  and loads
 *   `<ui-toc>`, and `<ui-docs-api>`, which an `<html>` block may draw (`NotebookDocs`).
 ****************/
export function NotebookPage(props: {
  file: SP.SpellFile
  project: SP.SpellProject
  /** the app area:  the element holding the program's mount point (`#spell-app-root`) and its scroller */
  program: HTMLElement
  /** the id of the element that scrolls the program's drawing (`<AppRoot containerId>`) */
  scroller: string
  /** hears the page's controller once it's made, and `undefined` as the page goes:  the pane's header's tools */
  onController?: (controller: NotebookController | undefined) => void
}) {
  SpellExample.define()
  // Spell UI's `<ui-toc>` and `<ui-docs-api>`:  a chunk of their own, loaded once
  void NotebookDocs.load()
  const controller = new NotebookController(props.file, props.project)
  // DEBUG:  `notebook` at the devtools console
  setDebugGlobal({ notebook: controller })
  // the pane's header's tools:  once drawn (a write, never in the body)
  onSettled(() => {
    props.onController?.(controller)
    return () => props.onController?.(undefined)
  })
  // the open file's page, drawn by the program:  outside Solid's settling, as it mounts a root of its own
  onSettled(() => queueMicrotask(() => editor.showOpenPage()))

  const editors = new ExampleEditors(controller, getOwner())
  onSettled(() => editors.follow(props.program))

  // "On this page"'s column showing:  not hidden, and room for it
  const [isNarrow, setNarrow] = createSignal(false)
  onSettled(() => {
    const observer = new ResizeObserver(() => setNarrow(props.program.clientWidth <= NARROW_PANE))
    observer.observe(props.program)
    return () => observer.disconnect()
  })
  const isColumnShown = () => controller.contentsShown() && !isNarrow()
  const isFlyoutOpen = () => !isColumnShown() && controller.contentsOpen()

  // a click:  a link followed within the editor, the cell it's in selected;  a click elsewhere closes the flyout
  onSettled(() => {
    const onClick = (event: MouseEvent) => followLinks(event, controller)
    const onPointerDown = (event: PointerEvent) => selectClicked(event, controller)
    const closeOnOutside = (event: Event) => {
      const inside = event
        .composedPath()
        .some((node) => node instanceof Element && node.matches(".NotebookTocFlyout, .NotebookTocButton"))
      if (!inside) controller.setContentsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") controller.setContentsOpen(false)
    }
    props.program.addEventListener("click", onClick)
    props.program.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("pointerdown", closeOnOutside, true)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      props.program.removeEventListener("click", onClick)
      props.program.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointerdown", closeOnOutside, true)
      document.removeEventListener("keydown", closeOnEscape)
    }
  })

  const pageTitle = () => controller.model()?.cells.find((cell) => cell.title)?.title
  return (
    <>
      {/* drawn while hidden too:  it follows the scroll for the section tabs (`selectSectionTab()`) */}
      <aside class={["NotebookAside", { hidden: !isColumnShown() }]}>
        <Contents
          scroller={props.scroller}
          title={pageTitle()}
          onScrolledTo={(id) => selectSectionTab(props.program, id)}
        >
          <ui-icon
            slot="tools"
            name="eye slash outline"
            link=""
            class="IconAction NotebookTocHide"
            label={appTexts.text("notebookPageHideContents")}
            title={appTexts.text("notebookPageHideContents")}
            onClick={() => controller.toggleContents()}
          />
        </Contents>
      </aside>
      {/* where the column doesn't show:  an icon at the pane's top right, opening the same contents under it */}
      <Show when={!isColumnShown()}>
        <ui-icon
          name="list"
          link=""
          class="IconAction NotebookTocButton"
          label={appTexts.text("notebookPageContents")}
          title={appTexts.text("notebookPageContents")}
          onClick={() => controller.setContentsOpen(!controller.contentsOpen())}
        />
      </Show>
      <Show when={isFlyoutOpen()}>
        <div class="NotebookTocFlyout" role="dialog" aria-label={appTexts.text("notebookPageContents")}>
          <Contents scroller={props.scroller} title={pageTitle()} onPick={() => controller.setContentsOpen(false)}>
            <Show when={!isNarrow()}>
              <ui-icon
                slot="tools"
                name="columns"
                link=""
                class="IconAction NotebookTocShow"
                label={appTexts.text("notebookPageShowContents")}
                title={appTexts.text("notebookPageShowContents")}
                onClick={() => {
                  controller.setContentsOpen(false)
                  controller.toggleContents()
                }}
              />
            </Show>
          </Contents>
        </div>
      </Show>
    </>
  )
}

/**
 * "On this page":  Spell UI's `<ui-toc>`, as the docs site's, headed by the page's title, listing the sections the
 * program draws in its mount point (`#spell-app-root`) and following its scroller (`scroller`);
 * `children`, its own buttons in its header's row.
 * - A link scrolls its section into view within the page, never changing the editor's address;  `onPick` then.
 */
function Contents(props: {
  scroller: string
  title?: string
  onPick?: () => void
  /** hears the entry in view change:  its target's id */
  onScrolledTo?: (id: string) => void
  children?: JSX.Element
}) {
  return (
    <ui-toc
      class="NotebookToc"
      for={PROGRAM_MOUNT}
      scroller={props.scroller}
      heading={props.title}
      aria-label={appTexts.text("notebookPageContents")}
      onClick={(event: MouseEvent) => {
        if (scrollTo(event, document)) props.onPick?.()
      }}
      ref={(toc: HTMLElement) =>
        toc.addEventListener("ui-scrolled-to", (event) =>
          props.onScrolledTo?.((event as CustomEvent<{ value: string }>).detail.value)
        )
      }
    >
      {props.children}
    </ui-toc>
  )
}

/****************
 * ### `ExampleEditors`
 * Each example's code editor on a notebook page the program draws:  made once, and kept in its example.
 * - Watches the program's mount point;  as the program draws (at first, after an edit), each `<spell-example>` it
 *   marked as written in the page's file gets its example's editor, in its `source` slot (`<ExampleCode>`).
 * - An example drawn again is a NEW element:  its editor is moved into it, its code pane open as it was, and the
 *   focus put back if it was typed in.  So typing never loses the text, the cursor or the place.
 * - An editor whose example is gone for good (deleted, or moved, so its mark changed) is let go, unless it's typed in.
 * - By the example's place in the file, `line:column` from its mark:  typing inside an example never moves it.
 ****************/
class ExampleEditors {
  /** Each example's editor, by its place, `line:column`. */
  private readonly panels = new Map<string, ExamplePanel>()
  /** The panel being typed in, if any:  the one the focus last went into. */
  private typingIn: ExamplePanel | undefined

  constructor(
    private readonly controller: NotebookController,
    private readonly owner: ReturnType<typeof getOwner>
  ) {}

  /** Follow `program`'s drawing until the page goes:  returns what stops it. */
  follow(program: HTMLElement): () => void {
    const mount = program.querySelector<HTMLElement>(`#${PROGRAM_MOUNT}`) ?? program
    const observer = new MutationObserver(() => this.place(mount))
    observer.observe(mount, { childList: true, subtree: true })
    // what's drawn already:  after the page has settled, as an editor is drawn in a root of its own (`render()`)
    queueMicrotask(() => this.place(mount))
    const onFocusIn = (event: FocusEvent) => {
      const path = event.composedPath()
      this.typingIn = [...this.panels.values()].find((each) => path.includes(each.panel))
    }
    document.addEventListener("focusin", onFocusIn, true)
    return () => {
      observer.disconnect()
      document.removeEventListener("focusin", onFocusIn, true)
      for (const each of this.panels.values()) this.letGo(each)
      this.panels.clear()
    }
  }

  /** Put each example's editor in the example drawn in `mount`, making the ones it hasn't got. */
  private place(mount: HTMLElement) {
    const source = SP.SpellProject.sourceNameOf(this.controller.file.path)
    const seen = new Set<ExamplePanel>()
    for (const example of mount.querySelectorAll<HTMLElement>(EXAMPLE_TAG)) {
      const place = SourceMarks.placeOfDrawn(example)
      if (!place || place.path !== source) continue
      const key = `${place.line}:${place.column}`
      const panel = this.panels.get(key) ?? this.made(key, place)
      seen.add(panel)
      if (panel.panel.parentElement === example) continue
      // its code pane stays open as it was:  the example it was in is the old drawing's
      if (panel.panel.parentElement?.hasAttribute("code")) example.setAttribute("code", "")
      const wasTyping = this.typingIn === panel && !panel.panel.contains(deepActiveElement())
      example.append(panel.panel)
      // moving it let go of the focus:  back where it was, the cursor its model kept, once the example has drawn
      // its code pane round it
      if (wasTyping) void after(0, () => panel.editor?.focus()).catch(() => undefined)
    }
    for (const [key, panel] of this.panels) {
      if (seen.has(panel) || panel === this.typingIn) continue
      this.letGo(panel)
      this.panels.delete(key)
    }
  }

  /** The editor for the example written at `place`, made now. */
  private made(key: string, place: SourcePlace): ExamplePanel {
    const panel = document.createElement("div")
    panel.slot = "source"
    const made: ExamplePanel = { panel, dispose: () => undefined }
    made.dispose = runWithOwner(this.owner, () =>
      render(
        () => (
          <ExampleCode
            controller={this.controller}
            place={{ line: place.line, column: place.column }}
            onEditor={(instance) => (made.editor = instance)}
          />
        ),
        panel
      )
    )
    this.panels.set(key, made)
    return made
  }

  /** Take `panel` off the page, and let go of its editor. */
  private letGo(panel: ExamplePanel) {
    panel.dispose()
    panel.panel.remove()
    if (this.typingIn === panel) this.typingIn = undefined
  }
}

/** One example's editor:  its panel, what takes it down, and its Monaco editor once made. */
type ExamplePanel = { panel: HTMLElement; dispose: () => void; editor?: monaco.editor.IStandaloneCodeEditor }

/** What has the focus, through shadow roots. */
function deepActiveElement(): Element | null {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement
  return active
}

/**
 * Select the cell written round what `event` pressed on:  the first element on its way in that's marked as written
 * in the page's file.  Never from inside an example's code editor.
 */
function selectClicked(event: PointerEvent, controller: NotebookController) {
  const source = SP.SpellProject.sourceNameOf(controller.file.path)
  for (const node of event.composedPath()) {
    if (!(node instanceof Element)) continue
    if (node.matches(".NotebookExampleCode")) return
    const place = SourceMarks.placeOfDrawn(node)
    if (!place || place.path !== source) continue
    const offset = SourceEdits.offsetAt(controller.text(), { line: place.line, character: place.column })
    return controller.selectAt(offset)
  }
}

/**
 * A click on a link in the page:  another notebook of the project (the tab bar's) shown through the app's router,
 * never a reload;  a section of the page (the section tabs') scrolled to within the page.
 */
function followLinks(event: MouseEvent, controller: NotebookController) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
  if (scrollTo(event, event.currentTarget as HTMLElement)) return
  const link = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
  const notebook = link && notebookAt(link, controller)
  if (!notebook) return
  event.preventDefault()
  if (notebook.path !== controller.file.path) showNotebook(notebook.path)
}

/** How wide the app area is, px, at and under which "On this page" has no room for its column. */
const NARROW_PANE = 760

/** The program's mount point's id:  `<AppContainer>`'s, written out as it is there. */
const PROGRAM_MOUNT = "spell-app-root"

/** The tag a notebook's example draws as:  `example_block`'s. */
const EXAMPLE_TAG = "spell-example"

/**
 * Scroll the section a `#...` link names into view, within `within`:  the page scrolls, not the window,
 * and the editor's address keeps no hash.
 * - Returns whether it was such a link.
 */
function scrollTo(event: MouseEvent, within: ParentNode): boolean {
  const link = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement)
  const href = link?.getAttribute("href") ?? ""
  if (!href.startsWith("#")) return false
  const target = within.querySelector(`[id="${CSS.escape(href.slice(1))}"]`)
  event.preventDefault()
  target?.scrollIntoView({ behavior: "smooth", block: "start" })
  return true
}

/**
 * Select the section tab (`<ui-menu class="ui-docs-section-tabs">`, under the page's tabs) of the top-level section
 * holding `id`, the entry in view, as the docs site's section toolbar follows the scroll.
 * - SIDE EFFECT:  sets `selected` on what the program drew;  drawn again, they're set again on the next scroll
 */
function selectSectionTab(page: HTMLElement, id: string, tries = SECTION_TAB_TRIES) {
  const tabs = page.querySelector(SECTION_TABS)
  // the first entry in view is known before the program has drawn its tabs:  look again shortly
  if (!tabs) {
    if (tries > 0) after(0.1, () => selectSectionTab(page, id, tries - 1)).catch(() => undefined)
    return
  }
  let section = page.querySelector(`[id="${CSS.escape(id)}"]`)?.closest("ui-section")
  for (
    let outer = section?.parentElement?.closest("ui-section");
    outer;
    outer = outer.parentElement?.closest("ui-section")
  )
    section = outer
  if (!section?.id) return
  for (const item of tabs.querySelectorAll("ui-item[link]"))
    item.toggleAttribute("selected", item.getAttribute("link") === `#${section.id}`)
}

/** How many times, 0.1s apart, `selectSectionTab()` looks for the section tabs while they aren't drawn yet. */
const SECTION_TAB_TRIES = 30

/** The section tabs a notebook draws under its tabs (`docs-page.css`). */
const SECTION_TABS = "ui-menu.ui-docs-section-tabs"

/** The project's notebook `link` points at (`/edit/...`, `/run/...`), if it's one of `controller`'s project's. */
function notebookAt(link: HTMLAnchorElement, controller: NotebookController): SP.SpellFile | undefined {
  const url = new URL(link.href, location.href)
  if (url.origin !== location.origin) return undefined
  return NotebookController.notebooksIn(controller.project).find((file) => {
    const location = new SP.SpellLocation(file.path)
    return url.pathname === location.editorUrl || url.pathname === location.runnerUrl
  })
}
