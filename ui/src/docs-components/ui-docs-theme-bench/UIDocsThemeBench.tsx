import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { BenchPages, EDITOR_REDIRECT, type BenchPageId } from "./BenchPages"
import { docsThemeBenchVocabulary } from "./UIDocsThemeBench.en"
import type { DocsThemeBenchVocabulary } from "./UIDocsThemeBench.types"

import benchCSS from "./UIDocsThemeBench.css?inline"

/****************
 * ### `UIDocsThemeBench`
 * The component behind `<ui-docs-theme-bench>`:  the theme editor (`<ui-theme-editor>`) full width, handed Spell's
 * four real pages to preview (`BenchPages`), for the theme work (epic `debut` P24).
 * - All it adds to the editor is the pages' addresses:
 *   - the page server's pages, under the bench's own site address (`siteRoot`):  a worktree's bench shows the
 *     worktree's pages
 *   - the editor app's, at the address the page server's `/editor` redirect leads to (`EDITOR_REDIRECT`), followed
 *     once
 * - Everything else is the editor's:  the bar, the frames, the Basics and the token tree.
 ****************/
export class UIDocsThemeBench extends E.UIComponent<DocsThemeBenchVocabulary> {
  @E.proto static vocabulary = docsThemeBenchVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "docs-theme-bench": benchCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The editor app's address;  `undefined` while it's found, `""` when it isn't running. */
  @E.state accessor editorBase: string | undefined = undefined

  /** Connected:  find the editor app, once. */
  @E.whileConnected
  protected watchEditor() {
    void this.findEditor()
  }

  /**
   * Follow the page server's `/editor` to the editor app's address, once:  under the bench's own site address first
   * (a worktree's, on the main checkout's server), then at the server's root.
   */
  @E.once
  private async findEditor(): Promise<void> {
    for (const address of new Set([this.siteRoot + EDITOR_REDIRECT, EDITOR_REDIRECT])) {
      try {
        const response = await fetch(address)
        if (response.ok && response.redirected) {
          this.editorBase = response.url.replace(/\/$/, "")
          return
        }
      } catch {
        // not there:  the next
      }
    }
    this.editorBase = ""
  }

  /**
   * Where the bench's site starts on its server:  `""` at the root, `/worktrees/debut` for a worktree's pages on the
   * main checkout's server.
   */
  @E.lazy
  private get siteRoot(): string {
    return isServer ? "" : location.pathname.replace(BENCH_PAGE_PATH, "")
  }

  /** The pages the editor previews, at their addresses now. */
  get pages() {
    return BenchPages.pages({
      siteRoot: this.siteRoot,
      editorBase: this.editorBase,
      labelOf: (id: BenchPageId) => this.text(id),
      noEditor: this.text("noEditor")
    })
  }

  /** The bench's text for `key`;  `""` until the runtime is in. */
  private text(key: DocsThemeBenchVocabulary["texts"][number]["key"]): string {
    return this.isReady ? this.translationForKey(key) : ""
  }

  render(): JSX.Element {
    return (
      <div class="theme-bench">
        <ui-theme-editor class="editor" part={this.partForName("editor")} pages={this.pages}></ui-theme-editor>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIDocsThemeBench extends E.AttributeValues<DocsThemeBenchVocabulary> {}

/** The bench's page, from its site's root:  what's before it is the site's address. */
const BENCH_PAGE_PATH = /\/components\/ui\/[^/]*$/
