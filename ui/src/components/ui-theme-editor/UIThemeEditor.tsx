import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

// Import directly:  in `core`'s util barrel the pref store cost every page 1.9 kB
import { PrefStore } from "spell/util/persist/PrefStore"
import { E, UI, UIT } from "spell/ui/core"
// Import directly:  the `spell/ui/styles` barrel carries every foundation sheet as text, which the editor never needs
import { ThemeFile } from "spell/ui/styles/ThemeFile"
import type { ThemeData } from "spell/ui/styles/styles.types"
import { ThemePreference } from "spell/ui/components/ui-theme-menu/ThemePreference"
// Import directly:  the theme menu's barrel would define the menu
import { HueDropdown } from "spell/ui/components/ui-theme-menu/HueDropdown"
import { BenchAddress, type BenchView } from "./BenchAddress"
import { PageBridge } from "./PageBridge"
import { SavedTheme, type MyTheme } from "./SavedTheme"
import { ThemeDraft } from "./ThemeDraft"
import { ThemeTokens, type TokenGroup, type TokenSource } from "./ThemeTokens"
import { TokenColor } from "./TokenColor"
import { TokenTree, type TokenTreeNode } from "./TokenTree"
import { themeEditorVocabulary } from "./UIThemeEditor.en"
import {
  DEFAULT_BASE,
  EDITS_SHEET,
  GLASS_THEMES,
  PAGE_MESSAGE,
  PHONE_WIDTH,
  TEXT_SIZES,
  type FrameKey,
  type PageDevice,
  type PageLook,
  type PageMessage,
  type PageReply,
  type PageSchemes,
  type PageSlot,
  type PreviewPage,
  type ThemeEditorTextKey,
  type ThemeEditorVocabulary,
  type TokenRow,
  type TokenValue,
  type TokenEdit,
  type TokenEdits,
  type TokenKind
} from "./UIThemeEditor.types"

import themeEditorCSS from "./UIThemeEditor.css?inline"

/****************
 * ### `DOMThemeEditorElement`
 * The DOM element of `<ui-theme-editor>`:  it adds the theme it shows (`theme`), its sheet (`css`) and its theme
 * file (`changes`).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMThemeEditorElement extends E.DOMElement<UIThemeEditor> {
  /** Every choice it shows now;  `undefined` until it's drawn. */
  @E.untracked
  get theme(): UIT.ThemeChoices | undefined {
    return this.component?.theme
  }

  /** The theme as a sheet worn over its base;  `undefined` until it's drawn, `""` until the theme files load. */
  @E.untracked
  get css(): string | undefined {
    return this.component?.draft.css
  }

  /** The theme as a theme file's JSON5, as Copy changes copies it;  `undefined` until it's drawn. */
  @E.untracked
  get changes(): string | undefined {
    return this.component?.draft.changes
  }
}

/****************
 * ### `UIThemeEditor`
 * The component behind `<ui-theme-editor>`:  Spell's ONE theme tool (epic `debut` P24).
 * It makes a theme on an existing one, and shows it live on real pages.
 *
 * - Its shadow DOM:
 *   - the BAR, one line (Owen:  "dont' wrap"):  the title (its lede in its tooltip), then the theme it builds on, one
 *     click each, then Light / Dark / Both (⇄ its last segment while Both shows), and at the far right the pages, each
 *     on or off, then Phone;  too narrow, the line scrolls sideways.  Every control's words are its tooltip too.
 *   - its state is in the page's ADDRESS too (`BenchAddress`), so a copied link opens the same view
 *   - the PREVIEW:  the `pages` it's handed and turned on, real pages in frames, laid out to fit:  two a row, an odd
 *     last one the row's width (App and Epic page on top, Spell UI and Notebook below, as the docs' theme bench hands
 *     them), each drawn at a desk's width and scaled to its cell
 *     - each in light and dark side by side, a pair of frames;  a row's two pairs mirror each other, so its two darks
 *       sit side by side (⇄ swaps every pair);  or once, in the scheme picked
 *     - given no pages, a sample app of real elements, light and dark, and the PAGE itself wears the theme
 *   - the SIDE COLUMN:
 *     - Start over;  Stop using, while a theme is kept in this browser from before
 *     - the BASICS:  name, the theme it builds on, a row of colours per role, fonts and text size, corners, depth,
 *       glass;  each sets many tokens (`ThemeDraft.basicsData`)
 *     - EVERY TOKEN, in the theme file's groups as a tree (`ThemeTokens`, `TokenTree`), the theme's own first:
 *       light and dark controls side by side, which pages read each one, a filter, expand / collapse all;
 *       a token set here wins over the Basics
 *     - its section titles stick as it scrolls, each under the one above (the Basics' head or the tree's, then a
 *       group's, then its branches'), as the docs pages' nested section titles do
 *     - the CHANGES:  the theme file's JSON5, colours in hex, and Copy changes
 * - The theme is `ThemeDraft`'s, a theme FILE:  its base as `extends`, the Basics' values, the tokens set by hand.
 *   `ThemeFile` writes every sheet from it:  the frames', the page's, what's kept.
 * - Where its sheet goes:
 *   - with pages:  into each frame (`PageBridge`), with the base theme and the frame's scheme;  the editor's own chrome
 *     wears Fruity meanwhile (`CHROME_THEME`, Q40), so only the pages change
 *   - without:  the WHOLE PAGE wears it (`SavedTheme.wear()`), as tokens set on one element don't reach those the page
 *     works out at `:root`;  on disconnect, its theme and sheet go back to what they were
 * - How it reaches each page (`PreviewPage.reach`):  directly, through the frame's document, on the same origin;
 *   through messages to another origin (the Spell editor app, which takes them in development:  `PageBridge.listen()`)
 * - It starts from (`theme`):  `value`, else the theme being made in this browser, else the one kept (`SavedTheme`),
 *   else `base` as it is, else the page's theme, else `fruity`.
 *   - What's being made is kept in this browser as it changes (`DRAFT_KEY`), so a reload carries on.
 * - A theme kept in this browser from before (`SavedTheme`;  Owen deleted its Use this theme button, epic `debut`):
 *   Stop using forgets it.
 * - Events:  `ui-changed` on every change, `ui-copied` from Copy changes, `ui-saved` from Stop using.
 *   - The events of the elements it's built of stop at its shadow root:  their `ui-changed`'s detail isn't ours.
 * - SIDE EFFECTS:  the page's theme (without pages), or the chrome's (`ThemePreference.wear()`);  each framed page's
 *   remembered theme, as its own menu would;  `window`'s messages while connected.
 * - Its families (panel, property editor, select, slider, menu, section, code, theme menu ...) are imported by its barrel.
 ****************/
export class UIThemeEditor extends E.UIComponent<ThemeEditorVocabulary> {
  @E.proto static vocabulary = themeEditorVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "theme-editor": themeEditorCSS, "hue-dropdown": HueDropdown.css },
    DOMElement: DOMThemeEditorElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The theme
  ////////////////

  /**
   * What this page's address says of the view (`BenchAddress`), as the editor was made:  it wins over what's
   * remembered, for this visit.  Declared first:  the view's fields start from it.
   */
  private readonly addressed: BenchView = isServer ? {} : BenchAddress.read()

  /** The choices made in the editor;  `undefined` until the first. */
  @E.state accessor edited: UIT.ThemeChoices | undefined = undefined

  /** The theme being made in this browser, as the editor was made:  where it starts. */
  private readonly keptAtStart = isServer ? undefined : (PrefStore.getAt(DRAFT_KEY) as UIT.ThemeChoices | undefined)

  /** Every choice it shows now:  the edits, else where it started. */
  get theme(): UIT.ThemeChoices {
    return this.edited ?? this.startingTheme
  }

  /**
   * Where it starts:  `value`, else the theme being made or kept, else the base as it is (see the class doc);
   * the address's `?theme=` its base, whatever it is.
   */
  private get startingTheme(): UIT.ThemeChoices {
    const given = this.value as Partial<UIT.ThemeChoices> | undefined
    const addressed = this.addressed.theme
    const base = addressed ?? this.base ?? (this.isReady ? UI.themes.current : undefined) ?? DEFAULT_BASE
    if (given && typeof given === "object") {
      return { ...given, name: given.name ?? this.text("defaultName"), base: addressed ?? given.base ?? base }
    }
    const kept = typeof this.keptAtStart?.base === "string" ? this.keptAtStart : undefined
    return kept ? { ...kept, base: addressed ?? kept.base } : { name: this.text("defaultName"), base }
  }

  /** The theme files, once loaded:  every token, and every theme's value for it. */
  @E.state accessor files: ThemeTokens | undefined = undefined

  /** Why the theme files didn't load. */
  @E.state accessor filesError: string | undefined = undefined

  /** Load the theme files, once. */
  @E.once
  private async loadFiles(): Promise<void> {
    try {
      this.files = await ThemeTokens.load()
    } catch (error) {
      this.filesError = String(error)
    }
  }

  /** The theme as a theme file, and every sheet of it (`ThemeDraft`). */
  @E.derived
  get draft(): ThemeDraft {
    return new ThemeDraft({ choices: this.theme, files: this.files, text: this.text, ownPrefixes: this.ownPrefixes })
  }

  /** `:state(changed)`:  a Basic, or a token set by hand. */
  @E.cssState("changed")
  get isChanged(): boolean {
    return this.draft.hasChanges
  }

  /**
   * Make `changes`:  `undefined` takes a choice back to the base's own.  Keeps it in this browser;  sends `ui-changed`.
   * - The page or the frames follow (`onDraftChanged()`).
   */
  @E.untracked
  choose(changes: Partial<UIT.ThemeChoices>): void {
    const next: Record<string, unknown> = { ...this.theme, ...changes }
    for (const [key, value] of Object.entries(changes)) if (value === undefined) delete next[key]
    this.keepDraft(next as UIT.ThemeChoices)
  }

  /** Drop every change but the name and the base.  Sends `ui-changed`. */
  @E.untracked
  startOver(): void {
    const { name, base } = this.theme
    this.keepDraft({ name, base })
  }

  /** Make `choices` the theme being made, keep it in this browser, and say so. */
  private keepDraft(choices: UIT.ThemeChoices): void {
    this.edited = choices
    PrefStore.setAt(DRAFT_KEY, choices)
    this.send("ui-changed", { value: choices, css: this.draft.css })
  }

  ////////////////
  // ## Tokens set by hand
  ////////////////

  /** The tokens set by hand. */
  get tokenEdits(): TokenEdits {
    return this.theme.tokens ?? {}
  }

  /**
   * Set `token` to `value`:  for `scheme` alone, or for both (`undefined`).
   * - By default:  the scheme shown when `token` shows light and dark apart (`isSplit()`), else both.
   */
  @E.untracked
  tune(token: string, value: string, scheme: Scheme | undefined = this.isSplit(token) ? this.scheme : undefined): void {
    const before = this.tokenEdits[token]
    const edit: TokenEdit = !scheme
      ? { both: value }
      : { ...(before && !("both" in before) ? before : {}), [scheme]: value }
    this.choose({ tokens: { ...this.tokenEdits, [token]: edit } })
  }

  /** Give `token` a light and a dark value of its own, each starting as it is now. */
  @E.untracked
  split(token: string): void {
    const edit: TokenEdit = { light: this.valueOf(token, "light"), dark: this.valueOf(token, "dark") }
    this.choose({ tokens: { ...this.tokenEdits, [token]: edit } })
  }

  /** Put `token` back to the theme's own (and the Basics');  every token, when none is given. */
  @E.untracked
  reset(token?: string): void {
    if (token === undefined) return this.choose({ tokens: undefined })
    const { [token]: _dropped, ...kept } = this.tokenEdits
    this.choose({ tokens: Object.keys(kept).length ? kept : undefined })
  }

  /**
   * Whether `token` shows light and dark apart, each with its own control:  set per scheme,
   * or (not set) its value differs between them now.
   */
  isSplit(token: string): boolean {
    const edit = this.tokenEdits[token]
    if (edit) return !("both" in edit)
    const value = this.nowOf(token)
    return ThemeTokens.forScheme(value, "light") !== ThemeTokens.forScheme(value, "dark")
  }

  ////////////////
  // ## On the page
  ////////////////

  /**
   * While connected:  load the theme files;  with no pages, remember the page's theme and edits sheet, and put them
   * back on disconnect.
   * - Declared before `onDraftChanged()`, so it sees the page as it was.
   */
  @E.onChange("isConnected", "isReady", "hasPages")
  protected onShown(isConnected: boolean, isReady: boolean, hasPages: boolean) {
    if (!isConnected || !isReady) return
    void this.loadFiles()
    if (hasPages) {
      // the editor's own chrome wears Fruity, whatever the pages wear (Q40)
      void ThemePreference.wear(CHROME_THEME)
      return () => void ThemePreference.wear(undefined)
    }
    const themeBefore = UI.themes.current
    const sheet = UI.styles.sheet(EDITS_SHEET)
    const sheetBefore = sheet ? [...sheet.cssRules].map((rule) => rule.cssText).join("\n") : ""
    return () => {
      SavedTheme.putOnPage(sheetBefore)
      if (UI.themes.current === themeBefore) return
      UI.themes.apply(themeBefore).catch((error: unknown) => {
        E.Warnings.warn("<ui-theme-editor>", `can't put the page's theme \`${themeBefore}\` back`, error)
      })
    }
  }

  /** A new sheet:  the page wears it (no pages), or every frame does. */
  @E.onChange("draft", "isConnected", "isReady", "hasPages")
  protected onDraftChanged(draft: ThemeDraft, isConnected: boolean, isReady: boolean, hasPages: boolean) {
    if (!isConnected || !isReady) return
    if (!hasPages) {
      SavedTheme.wear(draft.choices.base, draft.css).catch((error: unknown) => {
        E.Warnings.warn("<ui-theme-editor>", `can't apply the theme on \`${draft.choices.base}\``, error)
      })
      return
    }
    for (const key of this.frameKeys) void this.dress(key, { css: true, look: true })
  }

  /** A new base or scheme:  every frame wears it, and says again what its sheets read. */
  @E.onChange("baseTheme", "scheme", { defer: true })
  protected onBaseChanged() {
    for (const key of this.frameKeys) void this.dress(key, { theme: true, scheme: true, css: true, look: true })
  }

  /** The theme it builds on. */
  get baseTheme(): string {
    return this.theme.base
  }

  ////////////////
  // ## My themes:  save, open, delete, export, import (epic `debut` P25)
  ////////////////

  /** The themes saved by name (`SavedTheme.list`), read again after each change here. */
  @E.state accessor myThemes: readonly MyTheme[] = isServer ? [] : SavedTheme.list

  /**
   * The one of My themes being changed in place, by its id:  Save writes it back;  `undefined`:  a new theme, which
   * Save adds.  Kept in this browser with the draft.
   */
  @E.state accessor editingId: string | undefined = isServer
    ? undefined
    : (PrefStore.getAt(EDITING_KEY) as string | undefined)

  /** The one of My themes being changed in place (`editingId`);  `undefined`:  a new one, or deleted since. */
  get editing(): MyTheme | undefined {
    return this.myThemes.find((theme) => theme.id === this.editingId)
  }

  /**
   * Save the theme by its name:  the one being changed (`editingId`) written back, its id kept (a rename is its name
   * changed, then Save);  else a new one of My themes.  Sends `ui-saved`.
   * - No name:  `My theme`, or the first free one after it (`My theme 2`).
   */
  @E.untracked
  save(): MyTheme {
    const id = this.editing?.id
    const name = this.theme.name.trim() || SavedTheme.freeName(this.text("defaultName"))
    return this.keep(SavedTheme.save({ id, name, choices: { ...this.theme, name }, css: this.draft.css }))
  }

  /** Save the theme as a NEW one of My themes, a free name, the one opened left as it was.  Sends `ui-saved`. */
  @E.untracked
  saveAsNew(): MyTheme {
    const name = SavedTheme.freeName(this.theme.name.trim() || this.text("defaultName"))
    return this.keep(SavedTheme.save({ name, choices: { ...this.theme, name }, css: this.draft.css }))
  }

  /**
   * Delete the one of My themes being changed, after asking (`UI.modals`);  the editor goes on with it as a new,
   * unsaved theme.  Sends `ui-saved` with no `value`.
   */
  @E.untracked
  async remove(): Promise<void> {
    const theme = this.editing
    if (!theme) return
    const isSure = await UI.modals.confirm(this.text("removeAsk", { name: theme.name }))
    if (!isSure) return
    SavedTheme.remove(theme.id)
    this.myThemes = SavedTheme.list
    this.setEditing(undefined)
    this.send("ui-saved", { css: "" })
  }

  /** Open one of My themes, `id`, to change in place:  Save writes it back. */
  @E.untracked
  open(id: string): void {
    const theme = SavedTheme.get(id)
    if (!theme) return
    this.setEditing(id)
    this.keepDraft({ ...theme.choices, name: theme.name })
  }

  /**
   * Start from one of My themes, `id`:  a COPY of it, a new theme not saved yet (Owen's C8:  "pick an existing theme
   * to start with");  the original stays as it was.
   */
  @E.untracked
  startFrom(id: string): void {
    const theme = SavedTheme.get(id)
    if (!theme) return
    this.setEditing(undefined)
    this.keepDraft({ ...theme.choices, name: SavedTheme.freeName(theme.name) })
  }

  /** The theme as a file to export:  a theme file, `<name>.theme.json5`, as Spell's own are;  `""` while files load. */
  get exportText(): string {
    const data = this.draft.data
    if (!data) return ""
    return `// ${this.draft.fileName}:  ${this.text("fileMade", { base: this.baseTheme })}\n${JSON.stringify(data, undefined, 2)}\n`
  }

  /** Export's link:  the file, as a `blob:` address, made again as the theme changes;  `""` while files load. */
  @E.derived
  get exportHref(): string {
    if (this.exportUrl) URL.revokeObjectURL(this.exportUrl)
    const text = this.exportText
    this.exportUrl = text && !isServer ? URL.createObjectURL(new Blob([text], { type: "text/plain" })) : undefined
    return this.exportUrl ?? ""
  }

  /** The `blob:` address `exportHref` made last:  let go of when another's made. */
  private exportUrl: string | undefined

  /** Why the last import was refused;  `undefined`:  none. */
  @E.state accessor importError: string | undefined = undefined

  /**
   * Import theme file `file` (`.theme.json5`) as a new one of My themes, a name already there taking " 2", and open
   * it.  A file that isn't a theme (`ThemeFile`'s own check):  says so, and adds nothing.
   * - Every value it sets becomes a token set by hand, so its sheet is the file's.
   * - NEVER throws.
   */
  @E.untracked
  async importFile(file: File): Promise<void> {
    this.importError = undefined
    try {
      const files = this.files ?? (await ThemeTokens.load())
      const { default: JSON5 } = await import("json5")
      const data = JSON5.parse(await file.text()) as ThemeData
      const slug = file.name.replace(/\.theme\.json5$|\.json5?$/, "")
      const values = new ThemeFile({ name: slug, data, themes: files.themes, palettes: files.palettes }).declarations()
      const base =
        typeof data.extends === "string" && UI.themes.own.includes(data.extends) ? data.extends : DEFAULT_BASE
      const name = SavedTheme.freeName(typeof data.title === "string" && data.title ? data.title : slug)
      const tokens = Object.fromEntries(values.map(([token, value]) => [token, { both: value }]))
      const choices: UIT.ThemeChoices = { name, base, tokens }
      const css = new ThemeDraft({ choices, files, text: this.text }).css
      const saved = this.keep(SavedTheme.save({ name, choices, css }))
      this.keepDraft(saved.choices)
    } catch (error) {
      this.importError = this.text("importBad", { file: file.name, problem: String((error as Error).message ?? error) })
    }
  }

  /** Make `theme` the one being changed, read My themes again, and send `ui-saved`.  Returns it. */
  private keep(theme: MyTheme): MyTheme {
    this.myThemes = SavedTheme.list
    this.setEditing(theme.id)
    this.edited = { ...this.theme, name: theme.name }
    PrefStore.setAt(DRAFT_KEY, this.edited)
    this.send("ui-saved", { value: theme.choices, css: theme.css, id: theme.id })
    return theme
  }

  /** Change in place the one of My themes `id`;  `undefined`:  a new theme.  Kept in this browser. */
  private setEditing(id: string | undefined): void {
    this.editingId = id
    PrefStore.setAt(EDITING_KEY, id)
  }

  ////////////////
  // ## Save into Spell UI (a Spell admin's, epic `debut` P25)
  ////////////////

  /** The page server says this person may save into Spell UI:  a Spell admin, on the page server. */
  @E.state accessor canSaveIntoSpellUi = false

  /** What saving into Spell UI said last:  done, or why not;  `undefined`:  nothing yet. */
  @E.state accessor spellUiNote: string | undefined = undefined

  /**
   * Ask the page server, once connected, whether this person may save into Spell UI (`GET SPELL_UI_THEMES_API`).
   * - A published site, a page with no app on its server, anyone not a Spell admin:  no.  NEVER throws.
   */
  @E.whileConnected
  protected askSpellUi() {
    if (isServer || location.protocol === "file:") return
    void fetch(SPELL_UI_THEMES_API)
      .then(async (answer) => (answer.ok ? ((await answer.json()) as { allowed?: boolean }) : {}))
      .then(({ allowed }) => (this.canSaveIntoSpellUi = allowed === true))
      .catch(() => (this.canSaveIntoSpellUi = false))
  }

  /**
   * Write the theme into Spell UI as one of Spell's own (`POST SPELL_UI_THEMES_API`):  its theme file and sheet in
   * Spell UI's themes folder, its name in the theme list;  a name already there asks first.
   * - NEVER throws:  what went wrong is said (`spellUiNote`).
   */
  @E.untracked
  async saveIntoSpellUi(overwrite = false): Promise<void> {
    const body = { name: this.draft.slug, text: this.exportText, overwrite }
    try {
      const answer = await fetch(SPELL_UI_THEMES_API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      })
      const reply = (await answer.json().catch(() => ({}))) as { file?: string; error?: string }
      if (answer.status === 409 && !overwrite) {
        if (await UI.modals.confirm(this.text("intoSpellUiAsk", { name: this.draft.slug })))
          return this.saveIntoSpellUi(true)
        return
      }
      this.spellUiNote = answer.ok
        ? this.text("intoSpellUiDone", { file: reply.file ?? this.draft.fileName })
        : (reply.error ?? `${answer.status} ${answer.statusText}`)
    } catch (error) {
      this.spellUiNote = String(error)
    }
  }

  /** Copy changes' copy:  the button says so for a moment after. */
  readonly clipboard = new E.ClipboardCopy({ seconds: COPIED_SECONDS })

  /**
   * Put the theme file's JSON5 on the clipboard, and say so.  Sends `ui-copied`.
   * - NEVER throws:  a clipboard that refuses, even its fallback, warns.
   */
  @E.untracked
  async copy(): Promise<void> {
    const text = this.draft.changes
    if (!(await this.clipboard.copy(text))) {
      E.Warnings.warn("<ui-theme-editor>", "the clipboard refused the theme file")
      return
    }
    this.send("ui-copied", { text })
  }

  ////////////////
  // ## The pages
  ////////////////

  /** The pages it previews, as handed in (`pages`);  none:  the sample app. */
  get pageList(): readonly PreviewPage[] {
    const pages = this.pages as unknown
    return Array.isArray(pages) ? (pages as PreviewPage[]) : []
  }

  /** It previews real pages. */
  get hasPages(): boolean {
    return this.pageList.length > 0
  }

  /** The pages' ids, in order. */
  get pageIds(): string[] {
    return this.pageList.map((page) => page.id)
  }

  /** Page `id`. */
  private pageOf(id: string): PreviewPage | undefined {
    return this.pageList.find((page) => page.id === id)
  }

  /** The start of each page's own tokens (`--spell-`). */
  private get ownPrefixes(): string[] {
    return [...new Set(this.pageList.flatMap((page) => (page.ownPrefix ? [page.ownPrefix] : [])))]
  }

  /** While connected:  take the pages' messages. */
  @E.whileConnected
  protected listenToPages() {
    const onMessage = (event: MessageEvent) => this.onPageMessage(event)
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }

  /** The schemes shown, light first:  frames, samples and token values alike. */
  get shownSchemes(): readonly Scheme[] {
    return this.schemes === "both" ? PAIR : [this.schemes]
  }

  /**
   * The scheme a single value is read in:  dark when Dark alone shows, else light.
   * - Which frame each page's look is read from, and what a token's one control sets.
   */
  get scheme(): Scheme {
    return this.schemes === "dark" ? "dark" : "light"
  }

  /**
   * The pages turned off in the bar, by id (Owen:  "on/off states");  kept in this browser.
   * - The ones OFF, so a page added later shows until it's turned off.
   */
  @E.state accessor hiddenPages: readonly string[] = isServer
    ? []
    : ((PrefStore.getAt(HIDDEN_PAGES_KEY) as string[] | undefined) ?? [])

  /**
   * The pages' order in the grid, by id, as dragged (Owen:  "drag the \"app\" panes to change order");  kept in this
   * browser.  A page it doesn't name comes after, in `pages`' order.
   */
  @E.state accessor pageOrder: readonly string[] = isServer
    ? []
    : ((PrefStore.getAt(PAGE_ORDER_KEY) as string[] | undefined) ?? [])

  /** The pages the address shows, in its order (`?pages=epic,app`), until one is turned on or off, or moved. */
  @E.state accessor addressedPages: readonly string[] | undefined = this.addressed.pages

  /** Every page, in the grid's order:  the address's first, then as dragged, then as handed in. */
  get orderedPageIds(): string[] {
    const known = (ids: readonly string[]) => ids.filter((id) => this.pageIds.includes(id))
    return [...new Set([...known(this.addressedPages ?? []), ...known(this.pageOrder), ...this.pageIds])]
  }

  /** The pages shown, in the grid's order:  the address's, else every page not turned off;  all, should none be on. */
  get shownPageIds(): string[] {
    const addressed = this.addressedPages
    const isShown = (id: string) => (addressed ? addressed.includes(id) : !this.hiddenPages.includes(id))
    const shown = this.orderedPageIds.filter(isShown)
    return shown.length ? shown : this.orderedPageIds
  }

  /**
   * Show the pages `shown`, in `order`:  kept in this browser, and the address's own list dropped (the bar's
   * toggles and dragging go through here).
   */
  private showPages(order: readonly string[], shown: readonly string[]): void {
    const hidden = order.filter((id) => !shown.includes(id))
    this.addressedPages = undefined
    this.pageOrder = order
    this.hiddenPages = hidden
    PrefStore.setAt(PAGE_ORDER_KEY, [...order])
    PrefStore.setAt(HIDDEN_PAGES_KEY, hidden.length ? hidden : undefined)
  }

  /** Move page `id` to `side` of page `target` in the grid (a drop, or Alt+arrow);  kept. */
  @E.untracked
  movePage(id: string, target: string, side: "before" | "after"): void {
    if (id === target) return
    const order = this.orderedPageIds.filter((each) => each !== id)
    order.splice(order.indexOf(target) + (side === "after" ? 1 : 0), 0, id)
    this.showPages(order, this.shownPageIds)
  }

  /** Move page `id` one place along the pages shown:  `-1` back, `1` on (Alt+← / Alt+→ on its title row). */
  @E.untracked
  movePageBy(id: string, step: -1 | 1): void {
    const shown = this.shownPageIds
    const target = shown[shown.indexOf(id) + step]
    if (target) this.movePage(id, target, step < 0 ? "before" : "after")
  }

  /** Whether page `id` shows. */
  isPageShown(id: string): boolean {
    return this.shownPageIds.includes(id)
  }

  /** Whether page `id` takes a whole row:  it shows alone, or it's the odd last one. */
  isPageWide(id: string): boolean {
    const shown = this.shownPageIds
    const index = shown.indexOf(id)
    return shown.length === 1 || (shown.length % 2 === 1 && index === shown.length - 1)
  }

  /** Which schemes show:  Light, Dark or Both side by side (Owen), pages and token values alike;  kept. */
  @E.state accessor schemes: PageSchemes = isServer
    ? "both"
    : (this.addressed.schemes ?? (PrefStore.getAt(SCHEMES_KEY) as PageSchemes | undefined) ?? "both")

  /** Show `schemes`, and keep it. */
  @E.untracked
  showSchemes(schemes: PageSchemes): void {
    this.schemes = schemes
    PrefStore.setAt(SCHEMES_KEY, schemes === "both" ? undefined : schemes)
  }

  /** Where the pages are drawn:  at their desk width, or a phone's (Owen:  "mobile mode for all examples"). */
  @E.state accessor device: PageDevice = this.addressed.device ?? "desk"

  /**
   * A row's two pairs mirror each other, so its two darks sit side by side in the middle (Owen:  "light dark dark
   * light so I can compare the darks against each other");  swapped, its two lights.  Kept in this browser.
   */
  @E.state accessor isSwapped: boolean = isServer
    ? false
    : (this.addressed.isSwapped ?? PrefStore.getAt(SWAP_KEY) === true)

  /** Swap every pair's light and dark sides (the bar's ⇄, beside Both). */
  @E.untracked
  swap(): void {
    this.isSwapped = !this.isSwapped
    PrefStore.setAt(SWAP_KEY, this.isSwapped || undefined)
  }

  /**
   * Whether page `id`'s pair shows its dark side first:  the right-hand page of each row of the grid, unless swapped;
   * a page a row's width, only when swapped.
   * - By the frames' order on screen, never in the DOM:  a frame moved in the DOM loads its page again.
   */
  isDarkFirst(id: string): boolean {
    const isRight = !this.isPageWide(id) && this.shownPageIds.indexOf(id) % 2 === 1
    return isRight !== this.isSwapped
  }

  /**
   * The view changed:  put it in the page's address (`BenchAddress`), so a copied link opens the same view.
   * - Only with pages:  the full-page bench (the docs' theme bench, the Spell editor's Theme page), never an editor
   *   shown in a page of other things.
   */
  @E.onChange("hasPages", "isConnected", "baseTheme", "schemes", "isSwapped", "shownPageIds", "device")
  protected onViewChanged(
    hasPages: boolean,
    isConnected: boolean,
    theme: string,
    schemes: PageSchemes,
    isSwapped: boolean,
    pages: string[],
    device: PageDevice
  ) {
    if (!hasPages || !isConnected) return
    BenchAddress.write({ theme, schemes, isSwapped, pages, device })
  }

  /** Each page's frames:  one per scheme shown. */
  get slots(): readonly PageSlot[] {
    return this.shownSchemes
  }

  /** Every frame shown, by key:  each page's slots, in the grid's order (the order they load in). */
  get frameKeys(): FrameKey[] {
    return this.orderedPageIds.flatMap((id) => this.slots.map((slot) => frameKey(id, slot)))
  }

  /** The scheme frame `slot` shows. */
  private schemeOf(slot: PageSlot): Scheme {
    return slot
  }

  /** What each page's sheets read, set and hold, as it last said:  from its frame in the scheme picked. */
  @E.state accessor looks: Readonly<Record<string, PageLook>> = {}

  /** Which frames are dressed and drawn:  until then, a loading line covers each one. */
  @E.state accessor loaded: Readonly<Partial<Record<FrameKey, boolean>>> = {}

  /**
   * Whether frame `key` may start loading:  it already has, or it's shown and every shown frame before it is drawn,
   * or can't be (no address).
   * - One at a time, in the grid's order:  the Spell editor's dev server sends each frame ~800 modules, and four at
   *   once is more than a browser holds open (headless Chromium's `ERR_INSUFFICIENT_RESOURCES`).
   * - A frame once started stays:  reloading one page (its ↻) marks its frames not drawn, and must never take the
   *   frames after it off the page, which would load them again too (Owen:  "should only reload that one").
   */
  private isTurnOf(key: FrameKey): boolean {
    if (this.begun.has(key)) return true
    if (!this.isPageShown(splitKey(key)[0])) return false
    for (const each of this.frameKeys) {
      if (!this.isPageShown(splitKey(each)[0])) continue
      if (each === key) return true
      if (!this.loaded[each] && this.urlOf(each)) return false
    }
    return true
  }

  /** Mark frame `key` loaded, or not. */
  private markLoaded(key: FrameKey, isLoaded: boolean): void {
    if (!!this.loaded[key] !== isLoaded) this.loaded = { ...this.loaded, [key]: isLoaded }
  }

  /** Each frame's cell, as big as it's drawn. */
  @E.state accessor cells: Readonly<Partial<Record<FrameKey, CellSize>>> = {}

  /** The tokens each page's sheets read, and those they set below `:root`, as sets. */
  @E.derived
  get readers(): Readonly<Record<string, { reads: ReadonlySet<string>; overrides: ReadonlySet<string> }>> {
    return Object.fromEntries(
      Object.entries(this.looks).map(([id, look]) => [
        id,
        { reads: new Set(look.reads), overrides: new Set(look.overrides) }
      ])
    )
  }

  /** Each frame, by key. */
  private readonly frames = new Map<FrameKey, HTMLIFrameElement>()

  /** The frames given their page:  each keeps it from then on (`isTurnOf()`). */
  private readonly begun = new Set<FrameKey>()

  /** Asks sent, so each reply finds its page. */
  private asked = 0

  /**
   * Frame `key`'s address;  `undefined` while its page's is found, `""` when it can't be reached.
   * - A pair's dark half of a page reached by messages is at this machine's OTHER name (`127.0.0.1` for
   *   `localhost`):  another origin, so it keeps its own scheme where the light one keeps its own.
   */
  private urlOf(key: FrameKey): string | undefined {
    const [id, slot] = splitKey(key)
    const page = this.pageOf(id)
    if (!page?.url) return page?.url
    return page.reach === "messages" && slot === "dark" ? otherLoopback(page.url) : page.url
  }

  /**
   * A frame loaded (again):  a same-origin page, dress it all;  another origin says hello once its app is up.
   * - Shown after `LOADED_ANYWAY_SECONDS` whatever happens, so a page that never answers still shows.
   */
  @E.untracked
  private onPageLoaded(key: FrameKey): void {
    if (this.pageOf(splitKey(key)[0])?.reach === "same origin") {
      void this.dress(key, ALL_PARTS).then(() => this.markLoaded(key, true))
    }
    void E.after(LOADED_ANYWAY_SECONDS, () => this.markLoaded(key, true))
  }

  /** A frame's message:  it's listening (dress it all), or it answered an ask. */
  @E.untracked
  private onPageMessage(event: MessageEvent): void {
    const reply = event.data as PageReply | undefined
    if (reply?.type !== PAGE_MESSAGE) return
    const key = this.frameKeys.find((each) => this.frames.get(each)?.contentWindow === event.source)
    if (!key) return
    if (reply.hello) void this.dress(key, ALL_PARTS)
    if (reply.look) this.took(key, reply.look)
  }

  /**
   * Frame `key` said what its page's sheets say:  keep it, when it's the frame its page is read from (its frame in
   * the scheme picked);  a page's own tokens new to the editor, ask again for them.
   */
  private took(key: FrameKey, look: PageLook): void {
    const [id, slot] = splitKey(key)
    const page = this.pageOf(id)
    if (page?.reach === "messages") this.markLoaded(key, true)
    if (this.schemeOf(slot) !== this.scheme) return
    const known = new Set(this.tokenList)
    this.looks = { ...this.looks, [id]: look }
    const prefix = page?.ownPrefix
    const isNew = !!prefix && look.declares.some((token) => token.startsWith(prefix) && !known.has(token))
    if (isNew) void this.dress(key, { look: true })
  }

  /**
   * Make frame `key` wear what `parts` says:  the base theme, its scheme, the theme being made;
   * then ask what its sheets say (`look`).
   * - A same-origin frame keeps its scheme pinned (`PageBridge.pinScheme()`):  a pair's two halves share the
   *   browser's storage, where each page follows the scheme the other stores.
   * - NEVER throws:  a page that can't be reached (not loaded, gone) warns.
   */
  private async dress(key: FrameKey, parts: DressParts): Promise<void> {
    const [id, slot] = splitKey(key)
    const page = this.pageOf(id)
    const frame = this.frames.get(key)
    if (!page || !frame?.contentWindow) return
    if (page.reach === "messages") return this.post(key, page, frame.contentWindow, parts)
    const win = frame.contentWindow as FrameWindow
    const doc = frame.contentDocument
    if (!doc?.documentElement) return
    try {
      if (parts.theme) {
        const runtime = await UIThemeEditor.runtimeOf(win)
        await runtime?.themes.apply(this.baseTheme)
      }
      if (parts.scheme) PageBridge.pinScheme(doc, this.schemeOf(slot))
      if (parts.css) PageBridge.applyCss(doc, this.draft.frameCss)
      if (parts.look) this.took(key, PageBridge.look(doc, this.tokenList))
    } catch (error) {
      E.Warnings.warn("<ui-theme-editor>", `can't dress the ${key} page`, error)
    }
  }

  /** `dress()` for another origin:  a message to its frame, `win`;  `look` asks, and its reply comes as a message. */
  private post(key: FrameKey, page: PreviewPage, win: Window, parts: DressParts): void {
    const url = this.urlOf(key)
    if (!url || UIThemeEditor.isBlank(win)) return
    const slot = splitKey(key)[1]
    const message: PageMessage = { type: PAGE_MESSAGE }
    if (parts.theme) message.theme = this.baseTheme
    if (parts.scheme) message.scheme = this.schemeOf(slot)
    if (parts.css) message.css = this.draft.frameCss
    if (parts.fullMonty && page.fullView) message.fullMonty = true
    if (parts.look) message.ask = { id: ++this.asked, tokens: this.tokenList }
    win.postMessage(message, new URL(url, location.href).origin)
  }

  /** Reload page `id`'s frames (its title row's ↻), and no other page's. */
  @E.untracked
  reload(id: string): void {
    for (const key of this.frameKeys) {
      if (splitKey(key)[0] !== id) continue
      this.markLoaded(key, false)
      this.frames.get(key)?.contentWindow?.location.reload()
    }
  }

  /**
   * Whether frame window `win` is still on its blank start page:  its page hasn't come yet.
   * - A page of another origin can't be read:  reading its address throws, so it has come.
   */
  private static isBlank(win: Window): boolean {
    try {
      return win.location.href === BLANK
    } catch {
      return false
    }
  }

  /** Page `win`'s Spell UI runtime, once it's on the page and loaded;  `undefined` after 5s without one. */
  private static async runtimeOf(win: FrameWindow): Promise<typeof UI | undefined> {
    for (let tries = 0; tries < RUNTIME_TRIES; tries++) {
      // the docs site's bundle puts the runtime on the page;  the epic pages' only share Spell UI's core by name
      const runtime = win.UI ?? win.SpellUI?.packModules?.[CORE_MODULE]?.UI
      if (runtime?.load) {
        await runtime.load()
        return runtime
      }
      await E.after(RUNTIME_WAIT_SECONDS, () => undefined)
    }
    return undefined
  }

  /** Watch frame `key`'s cell, `cell`, for its size:  its frame is scaled to it. */
  private watchCell(key: FrameKey, cell: HTMLElement): void {
    if (isServer) return
    cell.dataset.frame = key
    this.resizer.observe(cell)
  }

  /**
   * Where the side column's section titles stick, px from the column's top (`<ui-section offset>`):
   * - `basics`, `tokens`:  under the Basics' head, under the token tree's head, which stick first
   * - `top`:  the column's very top, as the heads stick (above its padding)
   * - Each section's nested titles stack under its own (`sticky`), as the docs pages' do (Owen:  "make section
   *   headers in the sidebar stack").
   */
  @E.state accessor headBottom: Readonly<Record<SideHead | "top", number>> = { basics: 0, tokens: 0, top: 0 }

  /** The side column's heads, by name, once drawn. */
  private readonly heads = new Map<SideHead, HTMLElement>()

  /** Watch side head `name`, `head`, for its height:  the titles under it stick below it. */
  private watchHead(name: SideHead, head: HTMLElement): void {
    this.heads.set(name, head)
    if (isServer) return
    head.dataset.head = name
    this.resizer.observe(head)
  }

  /** Say where each side head ends, as it sticks:  its sticky `top` (the column's padding, negative) plus its height. */
  private measureHeads(): void {
    const bottom = { ...this.headBottom }
    for (const [name, head] of this.heads) {
      const top = parseFloat(getComputedStyle(head).top) || 0
      bottom[name] = Math.round(top + head.offsetHeight)
      bottom.top = Math.round(top)
    }
    const isSame = (Object.keys(bottom) as (keyof typeof bottom)[]).every((key) => bottom[key] === this.headBottom[key])
    if (!isSame) this.headBottom = bottom
  }

  /** One observer of every cell's size, the bar's row's and the side heads'. */
  @E.lazy
  private get resizer(): ResizeObserver {
    return new ResizeObserver((entries) => {
      const cells = { ...this.cells }
      for (const entry of entries) {
        if (entry.target === this.toolsBox) {
          this.measureTools()
          continue
        }
        if ((entry.target as HTMLElement).dataset.head) {
          this.measureHeads()
          continue
        }
        const key = (entry.target as HTMLElement).dataset.frame as FrameKey
        cells[key] = { width: entry.contentRect.width, height: entry.contentRect.height }
      }
      this.cells = cells
    })
  }

  /**
   * Frame `key`'s size:  its page's desk width (Phone:  a phone's), as tall as its cell, scaled to fit the cell's width;
   * a phone never scaled up, but centred.
   */
  private frameStyle(key: FrameKey): string {
    const page = this.pageOf(splitKey(key)[0])
    const width = this.device === "phone" ? PHONE_WIDTH : (page?.width ?? PHONE_WIDTH)
    const cell = this.cells[key]
    if (!cell?.width) return `width: ${width}px; height: 100%`
    const scale = Math.min(cell.width / width, this.device === "phone" ? 1 : Infinity)
    const left = Math.max(0, (cell.width - width * scale) / 2)
    return `left: ${left}px; width: ${width}px; height: ${Math.round(cell.height / scale)}px; transform: scale(${scale})`
  }

  ////////////////
  // ## The tokens
  ////////////////

  /** The text in the filter:  only tokens whose name has it show. */
  @E.state accessor filter = ""

  /** Each page's own tokens it declared (`ownPrefix`), by its id. */
  private get pageTokens(): Record<string, string[]> {
    const tokens: Record<string, string[]> = {}
    for (const page of this.pageList) {
      const prefix = page.ownPrefix
      const declares = this.looks[page.id]?.declares
      if (prefix && declares) tokens[page.id] = declares.filter((token) => token.startsWith(prefix))
    }
    return tokens
  }

  /** The groups for the theme shown, each its tokens, the filter applied:  to the CSS name, or the path in the tree. */
  get groups(): TokenGroup[] {
    const files = this.files
    const groups = files?.groupsFor(this.baseTheme, this.pageTokens) ?? []
    const filter = this.filter.trim().toLowerCase()
    const shown = this.isSetHereOnly
      ? groups
          .map((group) => ({ ...group, tokens: group.tokens.filter((token) => this.isSetHere(token)) }))
          .filter((group) => group.tokens.length)
      : groups
    if (!filter || !files) return shown
    const matches = (token: string, place: string) =>
      token.includes(filter) || [place, ...files.pathOf(token, place)].join(" ").includes(filter)
    return shown
      .map((group) => ({ ...group, tokens: group.tokens.filter((token) => matches(token, group.place)) }))
      .filter((group) => group.tokens.length)
  }

  /** The groups as a tree, the way a theme file nests them (Owen:  "can we show this as a tree?"). */
  @E.derived
  get tree(): TokenTree {
    const files = this.files
    return new TokenTree({
      groups: this.groups,
      pathOf: (token, place) => files?.pathOf(token, place) ?? [token],
      labelOf: (place) => this.groupLabel(place)
    })
  }

  /** Group `place`'s title:  `own` => The theme's own;  a page's own (`page.editor`) => The Editor's own. */
  private groupLabel(place: string): string {
    if (place.startsWith(PAGE_GROUP)) {
      return this.text("pageOwn", { page: this.pageOf(place.slice(PAGE_GROUP.length))?.label ?? place })
    }
    return this.text(GROUP_TEXTS[place] ?? "groupOwn")
  }

  /** Each branch's fold, by its id:  open or not;  kept in this browser (a branch never folded keeps its default). */
  @E.state accessor folds: Readonly<Record<string, boolean>> = isServer
    ? {}
    : ((PrefStore.getAt(FOLDS_KEY) as Record<string, boolean> | undefined) ?? {})

  /** Each branch's section, by its id:  so a fold is kept by the branch it's on. */
  private readonly branchSections = new Map<string, Element>()

  /** While filtering:  every matching branch folded by Collapse all (they all open otherwise). */
  @E.state accessor isFilterFolded = false

  /**
   * Whether branch `id` is open:  every matching one while filtering (unless all were collapsed);  else as folded.
   * - Never folded:  the theme's own group open, every other group and branch closed (the tree is long).
   */
  private isBranchOpen(id: string): boolean {
    if (this.filter.trim()) return !this.isFilterFolded
    return this.folds[id] ?? id === OWN_GROUP
  }

  /** Every branch of the tree shown (the filter applied), groups included. */
  private get branchIds(): string[] {
    const ids: string[] = []
    const walk = (node: TokenTreeNode, isGroup: boolean) => {
      if (!isGroup && !node.children.length) return
      ids.push(node.id)
      for (const child of node.children) walk(child, false)
    }
    for (const root of this.tree.roots) walk(root, true)
    return ids
  }

  /** Every branch shown is open. */
  get isAllOpen(): boolean {
    return this.branchIds.every((id) => this.isBranchOpen(id))
  }

  /**
   * Expand every branch shown, or collapse them all once they're all open:  `<ui-toc>`'s double chevron.
   * Kept, as a fold by hand is;  while filtering, the matching branches.
   */
  @E.untracked
  toggleAll(): void {
    const open = !this.isAllOpen
    if (this.filter.trim()) this.isFilterFolded = !open
    this.folds = { ...this.folds, ...Object.fromEntries(this.branchIds.map((id) => [id, open])) }
    PrefStore.setAt(FOLDS_KEY, this.folds)
  }

  /** Branch `id` folded or unfolded, by its title or find-in-page:  kept, unless it's the filter that opened it. */
  private onBranchFolded(event: CustomEvent<{ open: boolean; section: Element }>, id: string): void {
    // a branch inside it sends its own, which bubbles here:  each keeps only its own section's
    if (event.detail.section !== this.branchSections.get(id) || this.filter.trim()) return
    if (this.folds[id] === event.detail.open) return
    this.folds = { ...this.folds, [id]: event.detail.open }
    PrefStore.setAt(FOLDS_KEY, this.folds)
  }

  /** Every token the groups hold, filtered or not:  what the pages are asked about. */
  private get tokenList(): string[] {
    return (this.files?.groupsFor(this.baseTheme, this.pageTokens) ?? []).flatMap((group) => group.tokens)
  }

  ////////////////
  // ## Where a value comes from
  ////////////////

  /** Only the tokens set here:  the theme as a diff of what it builds on (the filter's chip). */
  @E.state accessor isSetHereOnly = false

  /** Where each token's value comes from, for the theme shown, in the scheme shown (`ThemeTokens.sourceOf()`). */
  @E.derived
  get sources(): ReadonlyMap<string, TokenSource> {
    const files = this.files
    if (!files) return new Map()
    return new Map(this.tokenList.map((token) => [token, files.sourceOf(this.baseTheme, token, this.scheme)]))
  }

  /** Where `token`'s value comes from. */
  private sourceOf(token: string): TokenSource {
    return this.sources.get(token) ?? NO_SOURCE
  }

  /** Whether this theme sets `token`:  its file, a Basic, or by hand (●);  else it's from what it builds on (○). */
  isSetHere(token: string): boolean {
    return this.draft.sets(token) || this.sourceOf(token).setBy === this.baseTheme
  }

  /** The theme the one shown builds on (its `extends`);  `undefined`:  Spell UI's own foundation. */
  get parentTheme(): string | undefined {
    return this.files?.themes[this.baseTheme]?.extends
  }

  /** What the theme shown builds on, for people:  `Glass`, else `Spell UI`. */
  private get parentTitle(): string {
    return this.parentTheme ? UIT.ThemeNames.titleOf(this.parentTheme) : this.text("foundation")
  }

  /** Each place a token points at (`own.matrix-page`) => the tokens pointing at it. */
  @E.derived
  get pointedAt(): ReadonlyMap<string, string[]> {
    const users = new Map<string, string[]>()
    for (const [token, source] of this.sources) {
      if (!source.pointer) continue
      users.set(source.pointer, [...(users.get(source.pointer) ?? []), token])
    }
    return users
  }

  /** `token`'s name's tooltip:  its CSS name and place;  for a colour others point at, who uses it. */
  private nameTip(token: string): string {
    const place = this.files?.placeOf(token) ?? ""
    const users = this.pointedAt.get(place)
    const usedBy = users?.length ? `\n${this.text("usedBy", { tokens: users.join(", ") })}` : ""
    return `${token}  ·  ${place}${usedBy}`
  }

  /** Set `token` here, as it is now:  its value in each scheme (a colour as hex), no longer from what it builds on. */
  @E.untracked
  setHere(token: string): void {
    const now = (scheme: Scheme) =>
      this.kindOf(token, scheme) === "color" || this.sourceOf(token).kind !== "plain"
        ? TokenColor.join(this.colorOf(token, scheme).hex, this.colorOf(token, scheme).opacity)
        : this.valueOf(token, scheme)
    const [light, dark] = [now("light"), now("dark")]
    this.choose({ tokens: { ...this.tokenEdits, [token]: light === dark ? { both: light } : { light, dark } } })
  }

  /** Put `token` back to what the theme builds on gives it:  its own file's value overridden by that one. */
  @E.untracked
  backToParent(token: string): void {
    const files = this.files
    const parent = this.parentTheme
    if (!files || !parent) return
    const [light, dark] = SCHEMES.map((scheme) => files.sourceOf(parent, token, scheme).written ?? "")
    if (!light && !dark) return
    this.choose({ tokens: { ...this.tokenEdits, [token]: light === dark ? { both: light } : { light, dark } } })
  }

  ////////////////
  // ## A token's values
  ////////////////

  /** The boxes colours are probed in, one per scheme, so a `light-dark()` resolves as that scheme shows it. */
  private readonly probes: Partial<Record<Scheme, HTMLElement>> = {}

  /**
   * `token`'s value as the pages show it now:  a page's own from that page, the rest from same-origin pages first;
   * with no pages, from this page, which wears the theme.
   */
  private nowOf(token: string): string {
    if (!this.hasPages) {
      if (isServer || !this.isReady) return ""
      void this.draft
      return getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    }
    const fromPages = this.pagesValueOf(token)
    if (fromPages) return fromPages
    // set at no page's root (a family's own token, which only the family reads):  the theme file's value, its
    // pointers worked out from the pages, so its field is never blank
    const written = this.files?.valueIn(this.baseTheme, token)
    return written ? written.replace(VAR, (whole, name: string) => this.pagesValueOf(name) || whole) : ""
  }

  /** `token`'s value as the pages hold it at their root:  a page's own from that page first, the rest same origin first. */
  private pagesValueOf(token: string): string {
    const owner = this.pageList.find((page) => page.ownPrefix && token.startsWith(page.ownPrefix))
    const order = [
      ...(owner ? [owner] : []),
      ...this.pageList.filter((page) => page.reach === "same origin"),
      ...this.pageList
    ]
    for (const page of order) {
      const value = this.looks[page.id]?.values[token]
      if (value) return value
    }
    return ""
  }

  /** `token`'s value in `scheme` (the one shown by default):  set by hand, else as the pages show it now. */
  private valueOf(token: string, scheme: Scheme = this.scheme): string {
    const edit = this.tokenEdits[token]
    const tuned = edit && ("both" in edit ? edit.both : edit[scheme])
    return tuned ?? ThemeTokens.forScheme(this.nowOf(token), scheme)
  }

  /** What control `token` gets, from its value in `scheme`. */
  private kindOf(token: string, scheme: Scheme = this.scheme): TokenKind {
    const value = this.valueOf(token, scheme)
    if (TokenColor.isColor(value)) return "color"
    if (PIXELS.test(value)) return "length"
    return "text"
  }

  /** `token`'s colour in `scheme` (the one shown by default), as the picker and the opacity take it. */
  private colorOf(token: string, scheme: Scheme = this.scheme): { hex: string; opacity: number } {
    return (
      (this.probes[scheme] && TokenColor.split(this.valueOf(token, scheme), this.probes[scheme])) || {
        hex: FALLBACK_HEX,
        opacity: FULL
      }
    )
  }

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * The editor's text for `key` (`translationForKey()`), as a function `ThemeDraft` can hold.
   * - `""` until the runtime is in (`isReady`):  the words aren't, and the first page's effects read `draft` before.
   */
  private readonly text = (key: ThemeEditorTextKey, params?: Record<string, string | number>): string =>
    this.isReady ? this.translationForKey(key, params) : ""

  render(): JSX.Element {
    return (
      <div class={["ui theme-editor", { paged: this.hasPages }]} part={this.partForName("editor")} ref={stopInner}>
        {this.bar()}
        <div class="body">
          <Show when={this.hasPages} fallback={this.samples()}>
            <div
              class={["pages", { grid: this.shownPageIds.length > 1, dragging: !!this.draggedPage }]}
              part={this.partForName("pages")}
            >
              <For each={this.pageIds}>{(id) => this.page(id)}</For>
            </div>
          </Show>
          {this.side()}
        </div>
        <div class="probe ui-light" ref={(box) => (this.probes.light = box)} aria-hidden="true" />
        <div class="probe ui-dark" ref={(box) => (this.probes.dark = box)} aria-hidden="true" />
      </div>
    )
  }

  ////////////////
  // ## The bar
  ////////////////

  /**
   * The bar, ONE line (Owen:  "dont' wrap"):  the title (its lede in its tooltip), the theme row, Light / Dark / Both
   * with ⇄, then at the far right the pages' toggles and Phone;  too narrow, the row scrolls sideways, never onto a
   * second line.
   * - Owen:  "Put visible panes then \"mobile\" button to the far right";  "Swap theme choice & light/dark".
   */
  private bar(): JSX.Element {
    const t = this.text
    return (
      <header class="bar" part={this.partForName("bar")}>
        <div class="title" title={t("lede")}>
          <ui-icon name="swatchbook" aria-hidden="true"></ui-icon>
          <h1>{t("label")}</h1>
        </div>
        <div class={["tools-wrap", { "more-start": this.barMore.start, "more-end": this.barMore.end }]}>
          {this.edgeButton("start")}
          <div class="tools" ref={(tools) => this.watchTools(tools)} onScroll={() => this.measureTools()}>
            {this.menu("theme", this.bases, this.baseTheme, (base) => this.choose({ base }), {
              labelOf: UIT.ThemeNames.titleOf,
              tipOf: (base) => t("themeTip", { theme: UIT.ThemeNames.titleOf(base) })
            })}
            {this.schemesGroup()}
            <Show when={this.hasPages}>
              {this.pageToggles()}
              <ui-button
                class="bar-toggle phone"
                size="small"
                icon="mobile alternate"
                aria-pressed={this.device === "phone" ? "true" : "false"}
                aria-label={t("phone")}
                title={t("phoneTip")}
                onClick={() => (this.device = this.device === "phone" ? "desk" : "phone")}
              ></ui-button>
            </Show>
          </div>
          {this.edgeButton("end")}
        </div>
      </header>
    )
  }

  /**
   * Light / Dark / Both, and ⇄ as the group's last segment while Both shows (with pages:  it swaps their pairs):
   * a toggle, pressed in while swapped (Owen:  "part of the group, with \"depressed\" aesthetic").
   */
  private schemesGroup(): JSX.Element {
    const t = this.text
    const onChoosing = (event: CustomEvent<{ value: string }>) => {
      const { value } = event.detail
      if (value !== SWAP) return this.showSchemes(value as PageSchemes)
      // a toggle, never the group's choice:  Both stays picked
      event.preventDefault()
      this.swap()
    }
    return (
      <ui-menu
        class="schemes-group"
        appearance="segmented link"
        size="small"
        aria-label={t("schemes")}
        on-ui-choosing={onChoosing}
      >
        <For each={SCHEME_CHOICES}>
          {(value) => (
            <ui-item value={value} selected={this.schemes === value ? "" : undefined} title={t(`${value}Tip`)}>
              {t(value)}
            </ui-item>
          )}
        </For>
        <Show when={this.hasPages && this.schemes === "both"}>
          <ui-item
            class={["toggle", { on: this.isSwapped }]}
            value={SWAP}
            icon="exchange alternate"
            aria-label={t("swap")}
            aria-pressed={this.isSwapped ? "true" : "false"}
            title={t(this.isSwapped ? "swappedTip" : "swapTip")}
          ></ui-item>
        </Show>
      </ui-menu>
    )
  }

  /**
   * The pages, each a toggle in one pill group (`<ui-menu choose="many">`), as the bar's other groups:  a page shown
   * is pressed in (Owen:  "feel like the other pills, but with a \"depressed\" aesthetic"), one hidden flat;
   * any number on at once, and one always:  the only one on, turned off, turns on the next (the menu does it).
   */
  private pageToggles(): JSX.Element {
    const t = this.text
    return (
      <ui-menu
        class="page-toggles"
        appearance="segmented link"
        choose="many"
        size="small"
        aria-label={t("pages")}
        on-ui-changed={(event: CustomEvent<{ value?: string; values?: string[] }>) =>
          this.showPages(this.orderedPageIds, event.detail.values ?? [])
        }
      >
        <For each={this.orderedPageIds}>
          {(id) => {
            const label = () => this.pageOf(id)?.label ?? id
            const isShown = () => this.isPageShown(id)
            return (
              <ui-item
                value={id}
                icon={this.pageOf(id)?.icon ?? "file"}
                selected={isShown() ? "" : undefined}
                title={t(isShown() ? "hidePageTip" : "showPageTip", { page: label() })}
              >
                {label()}
              </ui-item>
            )
          }}
        </For>
      </ui-menu>
    )
  }

  /** The bar's ‹ or ›, at `edge`, while there's more of the row that way:  scrolls it a step. */
  private edgeButton(edge: "start" | "end"): JSX.Element {
    const label = () => this.text(edge === "start" ? "scrollBack" : "scrollOn")
    return (
      <button
        type="button"
        class={["edge", edge]}
        hidden={!this.barMore[edge]}
        aria-label={label()}
        title={label()}
        onClick={() => this.toolsBox?.scrollBy({ left: (edge === "start" ? -1 : 1) * EDGE_STEP, behavior: "smooth" })}
      >
        <ui-icon name={edge === "start" ? "chevron left" : "chevron right"} aria-hidden="true"></ui-icon>
      </button>
    )
  }

  /** Whether the bar's row has more out of sight, at its start and its end. */
  @E.state accessor barMore: { start: boolean; end: boolean } = { start: false, end: false }

  /** The bar's row, once drawn. */
  private toolsBox: HTMLElement | undefined

  /** Watch the bar's row, `tools`, for its size:  what's out of sight changes with it. */
  private watchTools(tools: HTMLElement): void {
    this.toolsBox = tools
    if (!isServer) this.resizer.observe(tools)
  }

  /** Say what of the bar's row is out of sight, at each end. */
  private measureTools(): void {
    const tools = this.toolsBox
    if (!tools) return
    const start = tools.scrollLeft > 1
    const end = tools.scrollLeft + tools.clientWidth < tools.scrollWidth - 1
    if (start !== this.barMore.start || end !== this.barMore.end) this.barMore = { start, end }
  }

  /**
   * A segmented menu of the bar, named `name`:  `values`, `chosen` picked, each called `labelOf(value)`, its
   * tooltip `tipOf(value)`.
   */
  private menu(
    name: ThemeEditorTextKey,
    values: readonly string[],
    chosen: string,
    choose: (value: string) => void,
    {
      labelOf = (value) => this.text(value as ThemeEditorTextKey),
      tipOf
    }: { labelOf?: (value: string) => string; tipOf: (value: string) => string }
  ): JSX.Element {
    return (
      <ui-menu
        appearance="segmented link"
        size="small"
        aria-label={this.text(name)}
        on-ui-choosing={(event: CustomEvent<{ value: string }>) => choose(event.detail.value)}
      >
        <For each={values}>
          {(value) => (
            <ui-item value={value} selected={chosen === value ? "" : undefined} title={tipOf(value)}>
              {labelOf(value)}
            </ui-item>
          )}
        </For>
      </ui-menu>
    )
  }

  /**
   * The themes it can build on, one click each in the bar (Owen:  "Spread themes out in the top bar like \"all
   * four\""):  Spell UI's own (`UI.themes.own`, so a new one shows by itself), and the theme's own base, if another.
   */
  private get bases(): string[] {
    if (!this.isReady) return [this.baseTheme]
    const own = [...UI.themes.own]
    return own.includes(this.baseTheme) ? own : [...own, this.baseTheme]
  }

  ////////////////
  // ## The pages
  ////////////////

  /**
   * Page `id`:  its title row, then its frames (a light and dark pair, or one), each scaled into its cell.
   * - Its ↗ opens the page as its first frame on screen shows it:  the theme it builds on and that frame's scheme in
   *   its address (`?theme=`, `?scheme=`, `ThemePreference.addressWith()`);  the edits aren't carried.
   */
  private page(id: string): JSX.Element {
    const t = this.text
    const page = () => this.pageOf(id)
    const firstScheme = (): Scheme =>
      this.schemes === "both" ? (this.isDarkFirst(id) ? "dark" : "light") : this.shownSchemes[0]!
    const url = () => this.urlOf(frameKey(id, firstScheme()))
    const popout = () => {
      const address = url()
      return address ? ThemePreference.addressWith(address, { theme: this.baseTheme, scheme: firstScheme() }) : ""
    }
    return (
      <figure
        class={[
          "page",
          {
            wide: this.isPageWide(id),
            "drop-before": this.dropAt?.id === id && this.dropAt.side === "before",
            "drop-after": this.dropAt?.id === id && this.dropAt.side === "after"
          }
        ]}
        part={this.partForName("page")}
        hidden={!this.isPageShown(id)}
        style={`order: ${this.shownPageIds.indexOf(id)}`}
        onDragOver={(event) => this.onPageDragOver(event, id)}
        onDrop={(event) => this.onPageDrop(event, id)}
      >
        <figcaption
          class="page-head"
          draggable="true"
          tabindex="0"
          title={t("moveTip")}
          onDragStart={(event) => this.onPageDragStart(event, id)}
          onDragEnd={() => this.endDrag()}
          onKeyDown={(event) => this.onPageHeadKey(event, id)}
        >
          <ui-icon class="page-icon" name={page()?.icon ?? "file"} aria-hidden="true"></ui-icon>
          <span class="page-title">{page()?.label}</span>
          <code class="page-path" title={url() ?? ""}>
            {url() ? new URL(url()!, isServer ? "http://localhost" : location.href).pathname : ""}
          </code>
          <ui-icon
            class="page-tool"
            name="redo"
            link=""
            appearance="link"
            label={t("reload")}
            title={t("reloadTip")}
            onClick={() => this.reload(id)}
          ></ui-icon>
          <Show when={url()}>
            <a class="page-tool" href={popout()} target="_blank" title={t("openTip")} aria-label={t("open")}>
              <ui-icon name="external alternate" appearance="link" aria-hidden="true"></ui-icon>
            </a>
          </Show>
        </figcaption>
        <div class={["frames", this.schemes, { "dark-first": this.schemes === "both" && this.isDarkFirst(id) }]}>
          <For each={this.slots}>{(slot) => this.frame(frameKey(id, slot))}</For>
        </div>
      </figure>
    )
  }

  ////////////////
  // ## Moving the pages
  ////////////////

  /** The page being dragged by its title row;  `undefined`:  none. */
  @E.state accessor draggedPage: string | undefined = undefined

  /** Where the dragged page would drop:  beside which page, and which side;  `undefined`:  nowhere. */
  @E.state accessor dropAt: { id: string; side: "before" | "after" } | undefined = undefined

  /** A page's title row starts a drag:  that page moves. */
  private onPageDragStart(event: DragEvent, id: string): void {
    this.draggedPage = id
    event.dataTransfer?.setData("text/plain", id)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  /** The drag passes over page `id`:  the drop marker on its nearer side. */
  private onPageDragOver(event: DragEvent, id: string): void {
    const dragged = this.draggedPage
    if (!dragged) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const side = event.clientX < box.left + box.width / 2 ? "before" : "after"
    const isSame = this.dropAt?.id === id && this.dropAt.side === side
    if (!isSame) this.dropAt = id === dragged ? undefined : { id, side }
  }

  /** Dropped on page `id`:  the dragged page moves beside it. */
  private onPageDrop(event: DragEvent, id: string): void {
    const dragged = this.draggedPage
    const drop = this.dropAt
    event.preventDefault()
    this.endDrag()
    if (dragged && drop?.id === id) this.movePage(dragged, id, drop.side)
  }

  /** The drag is over, dropped or not. */
  private endDrag(): void {
    this.draggedPage = undefined
    this.dropAt = undefined
  }

  /** Alt+← / Alt+→ on a page's title row:  move it back or on (the drag's keyboard way). */
  private onPageHeadKey(event: KeyboardEvent, id: string): void {
    if (!event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    this.movePageBy(id, event.key === "ArrowLeft" ? -1 : 1)
  }

  /** Frame `key`:  a pair's half named for its scheme, over its cell, the page scaled into it. */
  private frame(key: FrameKey): JSX.Element {
    const t = this.text
    const [id, slot] = splitKey(key)
    const url = () => (this.isTurnOf(key) ? this.urlOf(key) : undefined)
    const label = () => this.pageOf(id)?.label ?? id
    const note = () => (this.urlOf(key) === "" ? (this.pageOf(id)?.note ?? t("unreachable")) : t("loadingPage"))
    return (
      <div class={["frame", slot]}>
        <div
          class={["viewport", { loaded: !!this.loaded[key], phone: this.device === "phone" }]}
          ref={(cell) => this.watchCell(key, cell)}
        >
          <Show when={url()} fallback={<p class="note">{note()}</p>}>
            <iframe
              src={url()}
              title={`${label()}, ${t(slot)}`}
              style={this.frameStyle(key)}
              ref={(frame) => {
                this.frames.set(key, frame)
                this.begun.add(key)
              }}
              onLoad={() => this.onPageLoaded(key)}
            ></iframe>
            <Show when={!this.loaded[key]}>
              <p class="note loading">{t("loadingPage")}</p>
            </Show>
          </Show>
        </div>
      </div>
    )
  }

  /** No pages:  the sample app, light and dark (or the scheme picked);  the page itself wears the theme. */
  private samples(): JSX.Element {
    return (
      <div class="previews" part={this.partForName("preview")}>
        {this.sampleApp("light")}
        {this.sampleApp("dark")}
      </div>
    )
  }

  /** The sample app in one scheme:  real elements, nothing but the theme's tokens styling them. */
  private sampleApp(scheme: Scheme): JSX.Element {
    const t = this.text
    return (
      <div class={["sample", `ui-${scheme}`]} hidden={!this.shownSchemes.includes(scheme)}>
        <div class="sample-head">
          <div>
            <div class="sample-scheme">{t(scheme)}</div>
            <div class="sample-title">{t("appTitle")}</div>
          </div>
          <span class="sample-badge">
            <ui-icon name="seedling" aria-hidden="true"></ui-icon>
          </span>
        </div>
        <ui-card fluid="">
          <ui-content>
            <ui-header>{t("today")}</ui-header>
            <div class="habits">
              <ui-checkbox selected="">{t("habitWater")}</ui-checkbox>
              <ui-checkbox>{t("habitRead")}</ui-checkbox>
              <ui-checkbox>{t("habitMove")}</ui-checkbox>
            </div>
            <div class="add">
              <ui-input placeholder={t("newHabit")} aria-label={t("newHabit")}></ui-input>
              <ui-button icon="plus" color="primary">
                {t("add")}
              </ui-button>
            </div>
          </ui-content>
        </ui-card>
        <div class="sample-row">
          <ui-button size="small" color="secondary">
            {t("secondary")}
          </ui-button>
          <ui-button size="small" appearance="basic">
            {t("basicButton")}
          </ui-button>
          <ui-label size="small" color="primary">
            {t("live")}
          </ui-label>
          <ui-checkbox appearance="toggle" selected="">
            {t("remind")}
          </ui-checkbox>
        </div>
        <ui-message color="primary">
          <ui-icon slot="icon" name="bolt"></ui-icon>
          <b>{t("streak")}</b> {t("streakMore")}
        </ui-message>
        <ui-progress value="66" aria-label={t("progress")}></ui-progress>
      </div>
    )
  }

  ////////////////
  // ## The side column
  ////////////////

  /** The side column:  the actions, the Basics, every token, the changes. */
  private side(): JSX.Element {
    return (
      <aside class="side">
        {this.actions()}
        {this.basics()}
        {this.tokens()}
        {this.changesSection()}
      </aside>
    )
  }

  /**
   * Start over, Save, Save as new, Delete (one of My themes open), Export, Import, Open one of My themes, and for a
   * Spell admin Save into Spell UI;  what's open, and what an import or a save into Spell UI said, under them.
   */
  private actions(): JSX.Element {
    const t = this.text
    return (
      <div class="actions">
        <ui-button
          size="small"
          icon={UNDO_ICON}
          title={t("startOverTip")}
          onClick={() => this.startOver()}
          appearance="basic"
        >
          {t("startOver")}
        </ui-button>
        <ui-button size="small" icon="save" color="primary" title={t("saveTip")} onClick={() => this.save()}>
          {t("save")}
        </ui-button>
        <ui-button
          size="small"
          icon="copy outline"
          title={t("saveAsTip")}
          onClick={() => this.saveAsNew()}
          appearance="basic"
        >
          {t("saveAs")}
        </ui-button>
        <Show when={this.editing}>
          <ui-button
            size="small"
            icon="trash alternate outline"
            title={t("removeTip")}
            onClick={() => void this.remove()}
            appearance="basic"
          >
            {t("remove")}
          </ui-button>
        </Show>
        <ui-button
          size="small"
          icon="download"
          appearance="basic"
          link={this.exportHref || undefined}
          download={this.draft.fileName}
          title={t("exportTip", { file: this.draft.fileName })}
        >
          {t("exportTheme")}
        </ui-button>
        <ui-button
          size="small"
          icon="upload"
          appearance="basic"
          title={t("importTip")}
          onClick={(event: MouseEvent) =>
            ((event.currentTarget as HTMLElement).nextElementSibling as HTMLInputElement | null)?.click()
          }
        >
          {t("importTheme")}
        </ui-button>
        <input
          type="file"
          class="import-file"
          accept=".json5,.json"
          hidden
          aria-label={t("importTheme")}
          onChange={(event) => {
            const input = event.currentTarget
            const file = input.files?.[0]
            input.value = ""
            if (file) void this.importFile(file)
          }}
        />
        <Show when={this.myThemes.length}>
          <ui-select
            size="small"
            value={this.editingId ?? ""}
            placeholder={t("openMine")}
            aria-label={t("openMine")}
            on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => {
              const id = String(event.detail.value)
              if (id && id !== this.editingId) this.open(id)
            }}
          >
            <For each={this.myThemes}>{(theme) => <ui-item value={theme.id}>{theme.name}</ui-item>}</For>
          </ui-select>
        </Show>
        <Show when={this.canSaveIntoSpellUi}>
          <ui-button
            size="small"
            icon="upload"
            title={t("intoSpellUiTip")}
            onClick={() => void this.saveIntoSpellUi()}
            appearance="basic"
          >
            {t("intoSpellUi")}
          </ui-button>
        </Show>
        <Show when={this.editing}>{(theme) => <p class="note">{t("editing", { name: theme().name })}</p>}</Show>
        <Show when={this.importError}>{(error) => <p class="note error">{error()}</p>}</Show>
        <Show when={this.spellUiNote}>{(note) => <p class="note">{note()}</p>}</Show>
      </div>
    )
  }

  /**
   * The Basics, drawn as the token tree is (Owen:  "one editor"):  a head, then folds of the same look:
   * the theme (its name, what it builds on), Color, Type and Shape, one field a choice.
   * - Each choice says what the theme's own is while it's untouched:  its colour, font, size, corners.
   */
  private basics(): JSX.Element {
    const t = this.text
    return (
      <section class="basics" part={this.partForName("basics")} aria-label={t("basics")}>
        <div class="side-head" ref={(head) => this.watchHead("basics", head)}>
          <header class="tokens-bar">
            <h2 class="tokens-title" title={t("basicsTip")}>
              {t("basics")}
            </h2>
          </header>
        </div>
        {this.basicsGroup(
          "theme",
          t("theme"),
          <>
            <ui-property name="name" label={t("name")} description={t("nameTip")} width="1/2">
              <ui-input
                value={this.theme.name}
                placeholder={t("defaultName")}
                aria-label={t("name")}
                size="small"
                fluid=""
                on-ui-typed={(event: CustomEvent<{ value: string }>) => this.choose({ name: event.detail.value })}
              ></ui-input>
            </ui-property>
            <ui-property name="base" label={t("base")} description={t("baseTip")} width="1/2" default={DEFAULT_BASE}>
              <ui-select
                value={this.baseTheme}
                aria-label={t("base")}
                size="small"
                fluid=""
                on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => {
                  const value = String(event.detail.value)
                  if (value.startsWith(SavedTheme.PREFIX)) this.startFrom(value.slice(SavedTheme.PREFIX.length))
                  else this.choose({ base: value })
                }}
              >
                <For each={this.bases}>{(base) => <ui-item value={base}>{UIT.ThemeNames.titleOf(base)}</ui-item>}</For>
                <Show when={this.myThemes.length}>
                  <ui-item kind="header">{t("myThemes")}</ui-item>
                  <For each={this.myThemes}>
                    {(theme) => <ui-item value={SavedTheme.pickName(theme)}>{theme.name}</ui-item>}
                  </For>
                </Show>
              </ui-select>
            </ui-property>
          </>
        )}
        {this.basicsGroup(
          "color",
          t("color"),
          <>
            {this.hueProperty("primary")}
            {this.hueProperty("secondary")}
            {this.hueProperty("background")}
          </>
        )}
        {this.basicsGroup(
          "type",
          t("type"),
          <>
            {this.fontProperty("headingFont")}
            {this.fontProperty("bodyFont")}
            {this.sizeProperty()}
          </>
        )}
        {this.basicsGroup(
          "shape",
          t("shape"),
          <>
            {this.segmentedProperty("corners", UIT.ThemeCorners)}
            {this.segmentedProperty("depth", UIT.ThemeDepths)}
            <Show when={this.hasGlass}>{this.segmentedProperty("glass", UIT.ThemeGlasses)}</Show>
          </>
        )}
      </section>
    )
  }

  /**
   * One fold of the Basics, `id`:  a group of the token tree's look, its fields in a property editor.
   * - Open until folded;  its fold kept with the tree's (`basics.<id>`).
   */
  private basicsGroup(id: string, label: string, fields: JSX.Element): JSX.Element {
    const key = `${BASICS_GROUP}${id}`
    const onFolded = (event: CustomEvent<{ open: boolean; section: Element }>) => {
      if (event.detail.section !== this.branchSections.get(key) || this.folds[key] === event.detail.open) return
      this.folds = { ...this.folds, [key]: event.detail.open }
      PrefStore.setAt(FOLDS_KEY, this.folds)
    }
    return (
      <ui-section
        ref={(section) => this.branchSections.set(key, section)}
        class="group"
        label={label}
        collapsible=""
        level="3"
        sticky=""
        offset={this.headBottom.basics}
        open={(this.folds[key] ?? true) ? "" : "false"}
        on-ui-opened={onFolded}
        on-ui-closed={onFolded}
      >
        <ui-property-editor class="properties" compact="" show-defaults="">
          {fields}
        </ui-property-editor>
      </ui-section>
    )
  }

  /** The base has glass of its own (a glass theme's), which the Glass choice changes. */
  private get hasGlass(): boolean {
    return GLASS_THEMES.includes(this.baseTheme)
  }

  ////////////////
  // ## The theme's own
  ////////////////

  /**
   * The theme's OWN value of `token` in `scheme`, whatever the Basics chose:  its files' (pointers followed), else as
   * the pages show it under the theme, else as this page does.
   */
  private ownValue(token: string, scheme: Scheme, depth = 0): string {
    const text = this.files?.valueIn(this.baseTheme, token) ?? this.pagesValueOf(token)
    if (!text) return ""
    const followed = text.replace(VAR, (whole, name: string) =>
      depth > MAX_HOPS ? whole : this.ownValue(name, scheme, depth + 1) || whole
    )
    return ThemeTokens.forScheme(followed, scheme)
  }

  /** The theme's own colour of `token`, in each scheme shown:  its hex, as a picker takes it. */
  private ownColors(token: string): { scheme: Scheme; hex: string }[] {
    return this.shownSchemes.map((scheme) => {
      const probe = this.probes[scheme]
      const value = this.ownValue(token, scheme)
      return { scheme, hex: (probe && value && TokenColor.split(value, probe)?.hex) || FALLBACK_HEX }
    })
  }

  /** The theme's own font of `token`:  its stack, and its name (one of the Basics' fonts, else its first face). */
  private ownFont(token: string): { stack: string; name: string } {
    const stack = this.ownValue(token, this.scheme)
    const font = UIT.ThemeFonts.find((each) => {
      const own = ThemeDraft.fontStack(each).replace(
        VAR,
        (whole, name: string) => this.ownValue(name, "light") || whole
      )
      return own.replace(/\s+/g, "") === stack.replace(/\s+/g, "")
    })
    const first = stack.split(",")[0]?.trim().replace(/["']/g, "") ?? ""
    return { stack, name: font ? this.text(font) : SYSTEM_FACES.test(first) ? this.text("system") : first }
  }

  /** "Theme's own · <value>":  what an untouched choice says. */
  private ownLabel(value: string): string {
    return value ? `${this.text("own")} · ${value}` : this.text("own")
  }

  /** The Shape choice the theme's own is, if it's one of them;  else its own words (`ownShapeText()`). */
  private ownShape(key: SegmentedKey): UIT.ThemeCorner | UIT.ThemeDepth | UIT.ThemeGlass | undefined {
    const files = this.files
    if (!files) return undefined
    const raw = (token: string) => files.valueIn(this.baseTheme, token)
    if (key === "corners")
      return ThemeDraft.cornersOf({ s: raw("--ui-radius-s"), m: raw("--ui-radius-m"), l: raw("--ui-radius-l") })
    if (key === "depth") return ThemeDraft.depthOf(raw("--ui-shadow-raised"), raw("--ui-shadow-floating"))
    return ThemeDraft.glassOf(raw("--glass-surface"), raw("--glass-surface-strong"), raw("--glass-blur"))
  }

  /** The theme's own Shape value in words, when it's none of the choices:  its corner's radius;  else nothing. */
  private ownShapeText(key: SegmentedKey): string {
    return key === "corners" ? this.ownValue("--ui-radius", this.scheme) : ""
  }

  ////////////////
  // ## The Basics' fields
  ////////////////

  /**
   * A colour choice:  ONE dropdown of Spell UI's colours, each a dot and its name, the theme's own first,
   * its colour shown and its hex said (`HueDropdown`, the theme menu's Tint too).
   * - A row of round swatches until epic `debut` I94 (`<ui-hue-swatches>`);  now a dropdown, as the font rows'
   *   selects beside it.
   */
  private hueProperty(key: HueKey): JSX.Element {
    const t = this.text
    const chosen = () => this.theme[key]
    const own = () => this.ownColors(ROLE_TOKENS[key])
    const ownText = () =>
      own()
        .map((color) => color.hex)
        .join(" / ")
    return (
      // no `output`:  the dropdown says the choice, as the font rows' selects do;  None (the theme's own) is plain
      <ui-property name={key} label={t(key)} description={t(`${key}Tip`)} default={HueDropdown.noneValue}>
        {HueDropdown.draw({
          size: HUE_SIZE,
          value: chosen,
          hues: () => UIT.ThemeHues,
          nameFor: (hue) => t(hue),
          noneLabel: () => this.ownLabel(ownText()),
          noneColors: () => own().map((color) => color.hex),
          label: () => t(key),
          onPick: (hue) => this.choose({ [key]: hue })
        })}
      </ui-property>
    )
  }

  /** A font choice:  a select, each font shown in itself, the theme's own first:  "Theme's own · Palatino". */
  private fontProperty(key: FontKey): JSX.Element {
    const t = this.text
    const chosen = () => this.theme[key]
    const own = () => this.ownFont(FONT_TOKENS[key])
    return (
      // Headings beside Body;  the theme's own is plain
      <ui-property name={key} label={t(key)} description={t(`${key}Tip`)} width="1/2" default={OWN}>
        <ui-select
          value={chosen() ?? OWN}
          aria-label={t(key)}
          size="small"
          fluid=""
          on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => {
            const value = String(event.detail.value)
            this.choose({ [key]: value === OWN ? undefined : (value as UIT.ThemeFont) })
          }}
        >
          <ui-item value={OWN} style={own().stack ? `font-family: ${own().stack}` : undefined}>
            {this.ownLabel(own().name)}
          </ui-item>
          <For each={UIT.ThemeFonts}>
            {(font) => (
              <ui-item value={font} style={`font-family: ${ThemeDraft.fontStack(font)}`}>
                {t(font)}
              </ui-item>
            )}
          </For>
        </ui-select>
      </ui-property>
    )
  }

  /** The text size:  a slider from the theme's own size, said as its own while untouched;  its own Reset. */
  private sizeProperty(): JSX.Element {
    const t = this.text
    const size = () => this.theme.textSize ?? this.baseTextSize
    return (
      <ui-property
        name="textSize"
        label={t("textSize")}
        description={t("textSizeTip")}
        default={String(this.baseTextSize)}
        output={this.theme.textSize !== undefined ? `${size()}px` : this.ownLabel(`${size()}px`)}
      >
        <Show when={this.theme.textSize !== undefined}>
          {this.resetButton(() => this.choose({ textSize: undefined }))}
        </Show>
        <ui-slider
          min={TEXT_SIZES.min}
          max={TEXT_SIZES.max}
          step={TEXT_SIZES.step}
          value={size()}
          aria-label={t("textSize")}
          on-ui-moved={(event: CustomEvent<{ value: number }>) => this.choose({ textSize: event.detail.value })}
        ></ui-slider>
      </ui-property>
    )
  }

  /** The base theme's text size, in px:  its theme file's, else 16. */
  private get baseTextSize(): number {
    const size = parseFloat(this.files?.valueIn(this.baseTheme, TEXT_SIZE_TOKEN) ?? "")
    return Number.isFinite(size) ? Math.round(size) : DEFAULT_TEXT_SIZE
  }

  /**
   * A choice of a few words:  a segmented menu.  Untouched, the theme's own is picked:  the choice it is, said as its
   * own;  or, when it's none of them, a first "Theme's own · 14px" segment.
   */
  private segmentedProperty<K extends SegmentedKey>(key: K, values: readonly NonNullable<UIT.ThemeChoices[K]>[]) {
    const t = this.text
    const chosen = () => this.theme[key]
    const own = () => this.ownShape(key)
    const shown = () => (own() ? [...values] : [OWN, ...values])
    const picked = () => chosen() ?? own() ?? OWN
    const labelOf = (value: string) =>
      value === OWN ? this.ownLabel(this.ownShapeText(key)) : t(value as ThemeEditorTextKey)
    return (
      <ui-property
        name={key}
        label={t(key)}
        description={t(`${key}Tip`)}
        default={own() ?? OWN}
        output={chosen() ? t(chosen()!) : own() ? this.ownLabel(t(own() as ThemeEditorTextKey)) : undefined}
      >
        <Show when={chosen() !== undefined}>{this.resetButton(() => this.choose({ [key]: undefined }))}</Show>
        <ui-menu
          // named, so its property reads its choice (`:state(set)`):  the editor around it binds nothing
          name={key}
          value={picked()}
          appearance="segmented link"
          align="fluid"
          equal={own() ? "" : undefined}
          size="small"
          aria-label={t(key)}
          on-ui-choosing={(event: CustomEvent<{ value: string }>) => {
            const value = event.detail.value
            this.choose({ [key]: value === OWN ? undefined : value })
          }}
        >
          <For each={shown()}>
            {(value) => (
              <ui-item value={value} selected={picked() === value ? "" : undefined}>
                {labelOf(value)}
              </ui-item>
            )}
          </For>
        </ui-menu>
      </ui-property>
    )
  }

  /** A field's Reset, in its actions:  `reset` puts the base's own back. */
  private resetButton(reset: () => void): JSX.Element {
    return (
      <ui-button
        slot="actions"
        size="mini"
        icon={UNDO_ICON}
        aria-label={this.text("reset")}
        title={this.text("reset")}
        onClick={() => reset()}
        appearance="circular basic"
      ></ui-button>
    )
  }

  /** Every token:  the filter and the readers' legend, stuck over the tree as it scrolls;  then every group. */
  private tokens(): JSX.Element {
    const t = this.text
    return (
      <section class="tokens" part={this.partForName("tokens")} aria-label={t("tokens")}>
        <div class="side-head tokens-head" ref={(head) => this.watchHead("tokens", head)}>
          <header class="tokens-bar">
            <h2 class="tokens-title" title={t("tokensTip")}>
              {t("themeTitle", { theme: UIT.ThemeNames.titleOf(this.baseTheme) })}
            </h2>
            {this.headButton("search", "search", t("searchTip"))}
            {this.toggleAllButton()}
            {this.headButton("info", "info circle", t("infoTip"))}
          </header>
          <Show when={this.openRows.search}>
            <div class="find-row">
              <ui-input
                class="find"
                size="small"
                icon="search"
                fluid=""
                placeholder={t("find")}
                aria-label={t("find")}
                value={this.filter}
                ref={(input) => (this.findInput = input)}
                on-ui-typed={(event: CustomEvent<{ value: string }>) => {
                  this.filter = event.detail.value
                  this.isFilterFolded = false
                }}
              ></ui-input>
              <ui-button
                class="chip"
                size="mini"
                appearance="basic"
                aria-pressed={this.isSetHereOnly ? "true" : "false"}
                title={t("setHereOnlyTip", { base: this.parentTitle })}
                onClick={() => (this.isSetHereOnly = !this.isSetHereOnly)}
              >
                {SET_MARK} {t("setHereOnly")}
              </ui-button>
            </div>
          </Show>
          <Show when={this.openRows.info && this.files}>
            <div class="info-pane">
              <Show when={this.hasPages}>{this.readersLegend()}</Show>
              <p class="marks-legend">
                {t("buildsOn")} <b>{this.parentTitle}</b>
                {" · "}
                <span class="mark set">{SET_MARK}</span> {t("setHere")} <span class="mark from">{FROM_MARK}</span>{" "}
                {t("fromBase", { base: this.parentTitle })} <span class="source-mark">{POINTER_MARK}</span>{" "}
                {t("pointsAt")} <span class="source-mark">{DERIVED_MARK}</span> {t("derived")}
              </p>
            </div>
          </Show>
        </div>
        <Show
          when={this.files}
          fallback={<p class="note">{this.filesError ? t("failed", { error: this.filesError }) : t("loading")}</p>}
        >
          <For each={this.tree.roots.map((node) => node.id)}>{(id) => this.branch(id, true)}</For>
        </Show>
      </section>
    )
  }

  /**
   * Branch `id` of the tree, folding:  its own token first when it's one too, then what's under it, drawn only while
   * it's open.
   * - By its id, never the node object:  each page's report makes a new tree, and a new object would draw the whole
   *   branch again (its fold, and the read-by icon under the pointer with its tooltip, lost).
   */
  private branch(id: string, isGroup = false): JSX.Element {
    const node = () => this.tree.nodes.get(id)
    const isOpen = () => this.isBranchOpen(id)
    const onFolded = (event: CustomEvent<{ open: boolean; section: Element }>) => this.onBranchFolded(event, id)
    return (
      <ui-section
        ref={(section) => this.branchSections.set(id, section)}
        class={isGroup ? "group" : "branch"}
        label={node()?.name ?? ""}
        collapsible=""
        level={isGroup ? "3" : "4"}
        sticky=""
        offset={isGroup ? this.headBottom.tokens : undefined}
        open={isOpen() ? "" : "false"}
        on-ui-opened={onFolded}
        on-ui-closed={onFolded}
      >
        <Show when={isGroup && !id.startsWith(PAGE_GROUP)}>
          <span slot="actions" class="group-count" title={id}>
            {this.groupCount(id)}
          </span>
        </Show>
        <Show when={isOpen()}>
          <Show when={node()?.token}>{this.leaf(id)}</Show>
          <For each={node()?.children.map((child) => child.id) ?? []}>
            {(childId) => (this.tree.nodes.get(childId)?.children.length ? this.branch(childId) : this.leaf(childId))}
          </For>
        </Show>
      </ui-section>
    )
  }

  /** Group `place`'s count, on its title band:  "3 set here · 12 from Glass" (the filter applied). */
  private groupCount(place: string): string {
    const tokens = this.groups.find((group) => group.place === place)?.tokens ?? []
    const set = tokens.filter((token) => this.isSetHere(token)).length
    return this.text("groupCount", { set, from: tokens.length - set, base: this.parentTitle })
  }

  /** Node `id`'s token, by its short name in the tree. */
  private leaf(id: string): JSX.Element {
    const node = (): TokenTreeNode | undefined => this.tree.nodes.get(id)
    const token = node()?.token
    if (!token) return undefined
    return (
      <ui-theme-token
        row={this.rowOf(token, node()?.name ?? token)}
        on-ui-changed={(event: CustomEvent<{ token: string; value: string; scheme?: Scheme }>) =>
          this.onRowChanged(event)
        }
        on-ui-command={(event: CustomEvent<{ token: string; command: string; place?: string }>) =>
          this.onRowCommand(event)
        }
      ></ui-theme-token>
    )
  }

  /** One of the tree head's toggles, `row`:  a plain icon, pressed while its row is open;  its words its tooltip. */
  private headButton(row: HeadRow, icon: string, tip: string): JSX.Element {
    return (
      <ui-button
        class="head-tool"
        size="mini"
        icon={icon}
        aria-label={tip}
        title={tip}
        aria-pressed={this.openRows[row] ? "true" : "false"}
        onClick={() => this.openRow(row, !this.openRows[row])}
      ></ui-button>
    )
  }

  /** Which of the tree head's rows are open:  the search row, the info pane;  kept in this browser. */
  @E.state accessor openRows: Readonly<Record<HeadRow, boolean>> = isServer
    ? { search: false, info: false }
    : { search: false, info: false, ...(PrefStore.getAt(HEAD_ROWS_KEY) as Record<HeadRow, boolean> | undefined) }

  /** The search row's field, once drawn:  focused as the row opens. */
  private findInput: HTMLElement | undefined

  /**
   * Open or close the tree head's row `row`, and keep it so.
   * - The search row:  focused as it opens;  closing it clears the filter (the chip too).
   */
  @E.untracked
  openRow(row: HeadRow, open: boolean): void {
    if (this.openRows[row] === open) return
    this.openRows = { ...this.openRows, [row]: open }
    PrefStore.setAt(HEAD_ROWS_KEY, this.openRows)
    if (row !== "search") return
    if (open) E.afterSolidUpdate(() => this.findInput?.focus())
    else {
      this.filter = ""
      this.isSetHereOnly = false
    }
  }

  /**
   * The ONE expand all / collapse all button (`toggleAll()`):  `<ui-toc>`'s double chevron,
   * pointing down while it would open everything, up once everything is open.
   */
  private toggleAllButton(): JSX.Element {
    const label = () => this.text(this.isAllOpen ? "collapseAll" : "expandAll")
    return (
      <button
        type="button"
        class="toggle-all"
        aria-label={label()}
        title={label()}
        aria-pressed={this.isAllOpen ? "true" : "false"}
        onClick={() => this.toggleAll()}
      >
        <svg class="chevrons" viewBox="0 0 16 16" aria-hidden="true">
          <path d={this.isAllOpen ? COLLAPSE_ALL_PATH : EXPAND_ALL_PATH} />
        </svg>
      </button>
    )
  }

  /** Show only `token`:  the filter set to its name, every match open, the search row open. */
  @E.untracked
  showOnly(token: string): void {
    this.filter = token
    this.isFilterFolded = false
    this.isSetHereOnly = false
    this.openRow("search", true)
  }

  /**
   * `token`'s row, as `<ui-theme-token>` draws it:  where its value comes from, its value in each scheme shown
   * (a mix's parts, a pointer's target), who reads it, and, while its drawer is open, what it may be set to.
   */
  rowOf(token: string, label: string): TokenRow {
    const t = this.text
    const isTuned = this.tokenEdits[token] !== undefined
    const isHere = this.isSetHere(token)
    const isFileSet = !isTuned && this.sourceOf(token).setBy === this.baseTheme && !this.draft.sets(token)
    const pointerPlace = POINTER_ALONE.exec(this.writtenNow(token, this.scheme))?.[1]
    const isOpen = this.openToken === token
    const valueIn = (scheme: Scheme): TokenValue => {
      const kind = this.kindOf(token, scheme)
      const color = kind === "color" ? this.colorOf(token, scheme) : undefined
      return { text: this.valueOf(token, scheme), kind, ...color, mix: this.mixOf(token, scheme) }
    }
    return {
      token,
      label,
      nameTip: this.nameTip(token),
      schemes: this.shownSchemes,
      values: { light: valueIn("light"), dark: valueIn("dark") },
      isHere,
      isTuned,
      isSplit: this.isSplit(token),
      isOpen,
      markTip: isHere ? t("setHereMark") : t("fromMark", { base: this.parentTitle }),
      resetLabel: isTuned
        ? t("reset")
        : isFileSet && this.parentTheme
          ? t("backToBase", { base: this.parentTitle })
          : undefined,
      pointer: pointerPlace ? { place: pointerPlace, token: this.files?.tokenAt(pointerPlace) } : undefined,
      readers: this.pageIds
        .filter((id) => this.readers[id]?.reads.has(token))
        .map((id) => {
          const overrides = !!this.readers[id]?.overrides.has(token)
          const tip = t(overrides ? "overridesTip" : "readsTip", { place: this.pageOf(id)?.label ?? id })
          return { id, icon: this.pageOf(id)?.icon ?? "file", tip, overrides }
        }),
      options: isOpen ? this.colorPlaces : undefined
    }
  }

  /** `token`'s value in `scheme` as written:  set by hand, else as its file writes it. */
  private writtenNow(token: string, scheme: Scheme): string {
    const edit = this.tokenEdits[token]
    if (edit) return ("both" in edit ? edit.both : edit[scheme]) ?? ""
    if (this.draft.sets(token)) return ""
    const source = scheme === this.scheme ? this.sourceOf(token) : this.files?.sourceOf(this.baseTheme, token, scheme)
    return source?.written ?? ""
  }

  /** `token`'s mix in `scheme`, if it's one (`color-mix()`):  what's mixed in, how much, over what. */
  private mixOf(token: string, scheme: Scheme): TokenValue["mix"] {
    const mix = MIX.exec(this.writtenNow(token, scheme))
    if (!mix) return undefined
    const [, mixin, amount, base] = mix
    const placeOf = (text: string) => {
      const trimmed = text.trim()
      const pointer = POINTER_ALONE.exec(trimmed)?.[1]
      if (pointer) return pointer
      const variable = VAR_ALONE.exec(trimmed)?.[1]
      return variable ? (this.files?.placeOf(variable) ?? trimmed) : trimmed
    }
    const colorAt = (place: string) => {
      const other = this.files?.tokenAt(place)
      return other ? this.valueOf(other, scheme) : place
    }
    const [mixinPlace, basePlace] = [placeOf(mixin!), placeOf(base!)]
    return {
      mixin: mixinPlace,
      mixinColor: colorAt(mixinPlace),
      base: basePlace,
      baseColor: colorAt(basePlace),
      amount: amount === undefined ? HALF : Number(amount)
    }
  }

  /** The theme's colour tokens, by place:  what a mix's colours and a pointer may be (an open drawer's choices). */
  private get colorPlaces(): { place: string; label: string }[] {
    const files = this.files
    if (!files) return []
    return this.tokenList
      .filter((token) => this.kindOf(token) === "color")
      .map((token) => files.placeOf(token))
      .filter((place) => !ThemeTokens.halfOf(place))
      .map((place) => ({ place, label: place }))
  }

  /** The token whose drawer is open;  `undefined`:  none. */
  @E.state accessor openToken: string | undefined = undefined

  /** A row's command (`<ui-theme-token>`'s `ui-command`):  its drawer, its buttons, its links. */
  @E.untracked
  private onRowCommand(event: CustomEvent<{ token: string; command: string; place?: string }>): void {
    const { token, command, place } = event.detail
    if (command === "open") this.openToken = this.openToken === token ? undefined : token
    else if (command === "set here") this.setHere(token)
    else if (command === "split") this.split(token)
    else if (command === "show" && place) this.showOnly(this.files?.tokenAt(place) ?? place)
    else if (command === "reset") {
      if (this.tokenEdits[token]) this.reset(token)
      else this.backToParent(token)
    }
  }

  /** A row's drawer set a value (`ui-changed`):  for its scheme alone, or for both. */
  @E.untracked
  private onRowChanged(event: CustomEvent<{ token: string; value: string; scheme?: Scheme }>): void {
    const { token, value, scheme } = event.detail
    const before = this.tokenEdits[token]
    const edit: TokenEdit = scheme
      ? { ...(before && !("both" in before) ? before : {}), [scheme]: value }
      : { both: value }
    this.choose({ tokens: { ...this.tokenEdits, [token]: edit } })
  }

  /** Which icon is which page, once, in the tree's head:  the pages, then the half dot's meaning. */
  private readersLegend(): JSX.Element {
    const t = this.text
    return (
      <div class="legend" aria-hidden="true">
        <span class="legend-label">{t("readBy")}</span>
        <For each={this.pageIds}>
          {(id) => (
            <span class="legend-item">
              <ui-icon name={this.pageOf(id)?.icon ?? "file"}></ui-icon>
              {this.pageOf(id)?.label}
            </span>
          )}
        </For>
        <span class="legend-item overrides" title={t("overridesLegendTip")}>
          <span class="half-dot" />
          {t("overridesLegend")}
        </span>
      </div>
    )
  }

  /** The changes:  the theme file's JSON5, Copy changes. */
  private changesSection(): JSX.Element {
    const t = this.text
    return (
      <ui-section
        class="group changes"
        part={this.partForName("changes")}
        label={t("changes")}
        collapsible=""
        level="2"
        sticky=""
        offset={this.headBottom.top}
      >
        <span slot="actions" class="file">
          {this.draft.fileName}
        </span>
        <ui-button
          slot="actions"
          class="copy"
          size="mini"
          icon={this.clipboard.isCopied ? CHECK_ICON : COPY_ICON}
          disabled={this.draft.changes ? undefined : ""}
          aria-label={this.clipboard.isCopied ? t("copied") : t("copy")}
          title={this.clipboard.isCopied ? t("copied") : t("copy")}
          onClick={() => void this.copy()}
        ></ui-button>
        <Show
          when={this.isChanged}
          fallback={<p class="note">{t("noChanges", { base: UIT.ThemeNames.titleOf(this.baseTheme) })}</p>}
        >
          <ui-code language="javascript" wrap="">
            {this.draft.changes}
          </ui-code>
        </Show>
      </ui-section>
    )
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIThemeEditor extends E.AttributeValues<ThemeEditorVocabulary> {}

/** A scheme a page or a token can show. */
type Scheme = "light" | "dark"

/** The colour choices, each a dropdown of colours (`HueDropdown`). */
type HueKey = "primary" | "secondary" | "background"

/** The choices drawn as font selects. */
type FontKey = "headingFont" | "bodyFont"

/** The choices drawn as segmented menus. */
type SegmentedKey = "corners" | "depth" | "glass"

/** The side column's heads that stick:  the Basics', the token tree's. */
type SideHead = "basics" | "tokens"

/** A cell's size, px. */
type CellSize = { width: number; height: number }

/** What `dress()` makes a page wear. */
type DressParts = {
  theme?: boolean
  scheme?: boolean
  css?: boolean
  fullMonty?: boolean
  look?: boolean
}

/** A frame's window, with its page's Spell UI runtime, if any:  its own, or in the core its packs share. */
type FrameWindow = Window & {
  UI?: typeof UI
  SpellUI?: { packModules?: Record<string, { UI?: typeof UI } | undefined> }
}

/** The module name a page shares Spell UI's core by (`SpellUI.packModules`). */
const CORE_MODULE = "spell/ui/core"

/** Everything, for a page just loaded (or listening). */
const ALL_PARTS: DressParts = { theme: true, scheme: true, css: true, fullMonty: true, look: true }

/**
 * The theme the editor's own bar and column wear while it shows pages, whatever they wear
 * (Owen, epic `debut` Q40:  "Make outer theme \"fruity\"").
 */
const CHROME_THEME = "fruity"

/** Where the theme being made is kept in this browser, as it changes. */
const DRAFT_KEY = "spell-ui:theme-draft"

/** Where the id of the one of My themes being changed in place is kept, beside the draft. */
const EDITING_KEY = "spell-ui:theme-editing"

/** The page server's route for saving into Spell UI:  spell-app's (`themesRoutes.ts`), a Spell admin's only. */
const SPELL_UI_THEMES_API = "/api/themes/spell-ui"

/** Where the tree's folds are kept. */
const FOLDS_KEY = "spell-ui:theme-editor-folds"

/** Where the pages turned off are kept. */
const HIDDEN_PAGES_KEY = "spell-ui:theme-editor-hidden-pages"

/** Where the pages' order is kept. */
const PAGE_ORDER_KEY = "spell-ui:theme-editor-page-order"

/** The schemes group's ⇄:  a segment that toggles, never a scheme. */
const SWAP = "swap"

/** Where ⇄ is kept. */
const SWAP_KEY = "spell-ui:theme-editor-swapped"

/** The schemes' choices, in the menu's order (Owen:  "Light" "Dark" "Both"). */
const SCHEME_CHOICES: readonly PageSchemes[] = ["light", "dark", "both"]

/** A page's frames:  a pair, or its one in the scheme picked. */
const PAIR: readonly PageSlot[] = ["light", "dark"]

/** Where Light / Dark / Both is kept. */
const SCHEMES_KEY = "spell-ui:theme-editor-schemes"

/** Frame key of page `id`'s `slot`. */
function frameKey(id: string, slot: PageSlot): FrameKey {
  return `${id}:${slot}`
}

/** A frame key's page and slot. */
function splitKey(key: FrameKey): [string, PageSlot] {
  const at = key.lastIndexOf(":")
  return [key.slice(0, at), key.slice(at + 1) as PageSlot]
}

/**
 * `address` at this machine's other name:  `localhost` <=> `127.0.0.1`;  the same server, another origin,
 * so its own browser storage.
 */
function otherLoopback(address: string): string {
  const url = new URL(address, location.href)
  url.hostname = url.hostname === LOCALHOST ? LOOPBACK_IP : LOCALHOST
  return url.href
}

/** A frame's address before its page comes. */
const BLANK = "about:blank"

/** This machine's two names. */
const LOCALHOST = "localhost"
const LOOPBACK_IP = "127.0.0.1"

/** The group of the theme's own tokens:  open until folded. */
const OWN_GROUP = "own"

/** A page's own tokens' group starts so:  `page.editor`. */
const PAGE_GROUP = "page."

/** Each group's title. */
const GROUP_TEXTS: Readonly<Record<string, ThemeEditorTextKey>> = {
  own: "groupOwn",
  typography: "groupTypography",
  sizes: "groupSizes",
  spacing: "groupSpacing",
  radii: "groupRadii",
  text: "groupText",
  surfaces: "groupSurfaces",
  borders: "groupBorders",
  brand: "groupBrand",
  semantic: "groupSemantic",
  hues: "groupHues",
  shadows: "groupShadows",
  code: "groupCode",
  motion: "groupMotion",
  components: "groupComponents"
}

/** A `var()` with no nested brackets in its fallback:  its token. */
const VAR = /var\(\s*(--[\w-]+)\s*(?:,[^()]*)?\)/g

/** The expand all toggle's double chevron, pointing down (SEE:  `<ui-toc>`'s, the same). */
const EXPAND_ALL_PATH = "M4 3.5 8 7.5 12 3.5M4 7.5 8 11.5 12 7.5"

/** ... pointing up:  collapse all. */
const COLLAPSE_ALL_PATH = "M4 8.5 8 4.5 12 8.5M4 12.5 8 8.5 12 12.5"

/** Owen's marks of where a token's value comes from:  set here, from what it builds on, a pointer, a formula. */
const SET_MARK = "●"
const FROM_MARK = "○"
const POINTER_MARK = "↳"
const DERIVED_MARK = "ƒ"

/** A token no theme file sets:  Spell UI's own foundation gives it. */
const NO_SOURCE: TokenSource = { kind: "plain" }

/** Both schemes, light first. */
const SCHEMES: readonly Scheme[] = ["light", "dark"]

/** A `color-mix()` of two colours:  the first, its amount (if written), the second. */
const MIX = /^color-mix\(in [\w-]+(?:\s+[\w-]+)?,\s*(.+?)(?:\s+([\d.]+)%)?\s*,\s*(.+?)(?:\s+[\d.]+%)?\s*\)$/

/** A pointer alone, `{group.name}`:  its place. */
const POINTER_ALONE = /^\{([\w.-]+)\}$/

/** A `var()` alone:  its token. */
const VAR_ALONE = /^var\((--[\w-]+)\)$/

/** The token each colour choice sets:  what its "Theme's own" option shows. */
const ROLE_TOKENS: Readonly<Record<HueKey, string>> = {
  primary: "--ui-primary",
  secondary: "--ui-secondary",
  background: "--ui-background"
}

/** The token each font choice sets. */
const FONT_TOKENS: Readonly<Record<FontKey, string>> = {
  headingFont: "--ui-font-family-heading",
  bodyFont: "--ui-font-family"
}

/** The Basics' folds, in the tree's folds:  `basics.color`. */
const BASICS_GROUP = "basics."

/** The platform's own face, by any of its names:  the System font. */
const SYSTEM_FACES = /^(?:system-ui|-apple-system|BlinkMacSystemFont)$/i

/** How deep a theme's own value's pointers are followed. */
const MAX_HOPS = 8

/** The tree head's rows that open:  the search row, the info pane. */
type HeadRow = "search" | "info"

/** Where the tree head's open rows are kept. */
const HEAD_ROWS_KEY = "spell-ui:theme-editor-head"

/** A mix's amount where it writes none. */
const HALF = 50

/** How far the bar's ‹ › scroll its row, px. */
const EDGE_STEP = 240

/** A length the slider takes:  px. */
const PIXELS = /^-?\d+(?:\.\d+)?px$/

/** Fully opaque, in the opacity slider's units. */
const FULL = 100

/** The picker's colour while a value can't be painted. */
const FALLBACK_HEX = "#000000"

/** The value of the base's-own choice, in a font select;  never stored. */
const OWN = "own"

/** `size` of a colour row's dropdown:  the font rows' selects' size. */
const HUE_SIZE = "small" as const

/** The text size token, read from the base's file. */
const TEXT_SIZE_TOKEN = "--ui-font-size"

/** The text size where the base doesn't say. */
const DEFAULT_TEXT_SIZE = 16

/** How long Copy changes says Copied, in seconds. */
const COPIED_SECONDS = 1.5

/** How long after its frame loads a page shows, dressed or not, in seconds. */
const LOADED_ANYWAY_SECONDS = 12

/** How often, and how many times, a page is checked for its runtime:  5s in all. */
const RUNTIME_WAIT_SECONDS = 0.1
const RUNTIME_TRIES = 50

/** Icons (`fomantic` pack). */
const CHECK_ICON = "check"
const COPY_ICON = "copy outline"
const UNDO_ICON = "undo"

/**
 * The events of the elements it's built of, stopped at its shadow root:  `ui-changed` from its select isn't its own.
 * - Its own handlers sit on those elements, so they run first.
 */
const INNER_EVENTS = [
  "ui-changed",
  "ui-typed",
  "ui-moved",
  "ui-choosing",
  "ui-copied",
  "ui-saved",
  "ui-opening",
  "ui-closing",
  "ui-opened",
  "ui-closed"
]

/** A ref stopping `INNER_EVENTS` on the editor's box. */
function stopInner(box: HTMLElement): void {
  for (const type of INNER_EVENTS) box.addEventListener(type, (event) => event.stopPropagation())
}
