import { E } from "spell-ui/core"
import {
  PAGE_MESSAGE,
  type PageMessage,
  type PageReply,
  type PageScheme,
  type PageLook,
  type TitlesAt
} from "./UIThemeEditor.types"

/****************
 * ### `PageBridge`
 * What the theme editor (`<ui-theme-editor>`) does INSIDE a page it shows in a frame:
 * lay its tuning over the page, scroll its section titles, and read what the page's sheets say about the tokens.
 * - Two ways in, the same functions:
 *   - a page beside the editor (same origin):  the editor calls them on the frame's document
 *   - the Spell editor app, on its own port (another origin):  the theme editor sends messages, and the app, in development,
 *     takes them with `listen()` (spell-app's `EditorTheme`), handing it what only it knows how to do
 *     (choose a theme, open the full view)
 * - Plain DOM, no Solid, no element:  so the editor imports it as a leaf, and it works on any document.
 * - Messages come only from this machine (`localhost`, `127.0.0.1`, any port), and say so (`PAGE_MESSAGE`):
 *   anything else is ignored.
 ****************/
export class PageBridge {
  ////////////////
  // ## The tuning
  ////////////////

  /**
   * Lay `css` over everything `doc` has:  its own `<style>`, last in `<head>`;  `""` takes it away.
   * - The theme editor writes its tokens on `:root` with `!important`, so they win over every theme's and page's sheet
   *   in any layer;  a token a page sets on an element of its own still wins there, as it would for a theme.
   */
  static applyCss(doc: Document, css: string): void {
    let style = doc.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!css) {
      style?.remove()
      return
    }
    if (!style) {
      style = doc.createElement("style")
      style.id = STYLE_ID
    }
    // always last:  a sheet the page adds later (its theme's) mustn't come after it
    if (style !== doc.head.lastElementChild) doc.head.append(style)
    if (style.textContent !== css) style.textContent = css
  }

  ////////////////
  // ## The scheme
  ////////////////

  /**
   * Show `doc` in `scheme`, and keep it so:  its `ui-light` / `ui-dark` class and `color-scheme` on `<html>`,
   * as a theme menu sets them (`ThemePreference.applyScheme()`), but never remembered.
   * - Why kept:  a light and a dark frame of the same page share the browser's storage, and each page follows a
   *   scheme stored by another (a `storage` event), so it'd take its neighbour's;  after each one, it's put back.
   * - SIDE EFFECT:  listens to `doc`'s window's `storage` events, once per window.
   */
  static pinScheme(doc: Document, scheme: "light" | "dark"): void {
    const win = doc.defaultView
    if (!win) return
    const isNew = !PINNED.has(win)
    PINNED.set(win, scheme)
    PageBridge.showScheme(doc, scheme)
    // after the page's own `storage` listener, which applied the stored scheme
    if (isNew) win.addEventListener("storage", () => E.soon(() => PageBridge.showScheme(doc, PINNED.get(win)!)))
  }

  /** Show `scheme` on `doc`'s `<html>`:  its class, the other one off, and the same `color-scheme`. */
  private static showScheme(doc: Document, scheme: "light" | "dark"): void {
    const root = doc.documentElement
    root.classList.remove(scheme === "dark" ? "ui-light" : "ui-dark")
    root.classList.add(`ui-${scheme}`)
    root.style.colorScheme = scheme
  }

  ////////////////
  // ## The section titles
  ////////////////

  /**
   * Scroll `doc` so its section titles (`ui-section[sticky]`, in shadow roots too) show `at` rest, or stuck.
   * - `rest`:  every box they scroll in back to its top, where the page's tabs and first titles are
   * - `stuck`:  into a section with a section inside it, so both titles stick, one under the other,
   *   with the page scrolling under them:  the first open one tall enough to scroll under, else a top-level one
   * - A page with none, or none open and tall enough (an epic page, its phases folded):  as `rest`.
   *   Opening one would change how the page was left, which it remembers.
   */
  static scrollTitles(doc: Document, at: TitlesAt): void {
    const sections = PageBridge.deepAll(doc, STICKY_SECTION)
    if (!sections.length) return
    const tall = sections.filter((section) => section.getBoundingClientRect().height > TALL_ENOUGH)
    const target = tall.find((section) => PageBridge.parentSection(section)) ?? tall[0]
    if (at === "rest" || !target) {
      for (const scroller of new Set(sections.map((section) => PageBridge.scrollerOf(section)))) scroller.scrollTop = 0
      return
    }
    const scroller = PageBridge.scrollerOf(target)
    const top = target.getBoundingClientRect().top - PageBridge.topOf(scroller) + scroller.scrollTop
    scroller.scrollTop = Math.max(0, top + SCROLL_INTO)
  }

  ////////////////
  // ## What the sheets say
  ////////////////

  /**
   * What `doc`'s sheets say about the tokens:  every token read, set, and set below `:root`;
   * and each of `tokens`' values on `<html>`.
   * - Every sheet:  the page's, those it adopted, and every shadow root's (adopted and `<style>`).
   * - Set below `:root` counts only where its rule matches an element there now
   *   (a `.ui-dark` rule on a page with no dark part doesn't).
   * - A sheet from another origin (a web font's) can't be read:  left out.
   */
  static look(doc: Document, tokens: readonly string[]): PageLook {
    const found: Found = { reads: new Set(), declares: new Set(), overrides: new Set() }
    for (const [sheet, roots] of PageBridge.sheetsOf(doc)) {
      try {
        PageBridge.collect(sheet.cssRules, found, roots)
      } catch {
        // another origin's sheet:  its rules can't be read
      }
    }
    const style = doc.defaultView?.getComputedStyle(doc.documentElement)
    return {
      reads: [...found.reads],
      declares: [...found.declares],
      overrides: [...found.overrides],
      values: Object.fromEntries(tokens.map((token) => [token, style?.getPropertyValue(token).trim() ?? ""]))
    }
  }

  /**
   * What `rules` read and set, into `found`:  into `@media`, `@layer`, `@supports` and nested rules too.
   * - Rules are told apart by shape, never `instanceof`:  a framed page's rules are its own window's classes.
   */
  private static collect(rules: CSSRuleList, found: Found, roots: readonly ParentNode[], isNested = false): void {
    for (const rule of rules) {
      if (isStyleRule(rule)) {
        for (const match of rule.style.cssText.matchAll(READ)) found.reads.add(match[1]!)
        const tokens = [...rule.style].filter((name) => name.startsWith("--"))
        for (const name of tokens) found.declares.add(name)
        if (tokens.length && !isNested && PageBridge.isBelowRoot(rule.selectorText, roots)) {
          for (const name of tokens) found.overrides.add(name)
        }
      }
      // a nested rule's selector is relative to its parent's:  read for what it says, never matched
      if ("cssRules" in rule) PageBridge.collect((rule as CSSGroupingRule).cssRules, found, roots, isStyleRule(rule))
    }
  }

  /** Whether `selectorText` matches an element below `:root` in one of `roots` now. */
  private static isBelowRoot(selectorText: string, roots: readonly ParentNode[]): boolean {
    const selectors = selectorText.split(",").filter((selector) => !ROOT_ONLY.test(selector.trim()))
    if (!selectors.length) return false
    return roots.some((root) => {
      try {
        return !!root.querySelector(selectors.join(","))
      } catch {
        // a selector `querySelector()` won't take (`::part()`, `:host`):  not a page's own element
        return false
      }
    })
  }

  ////////////////
  // ## Messages
  ////////////////

  /**
   * Take the theme editor's messages in this window, from now on;  returns the stop.
   * - Says `hello` to the window it's framed in, so the theme editor sends everything at once.
   * - Each message's parts, in order:  `theme`, `scheme`, `fullMonty` (each through `handlers`), `css`, `titles`;
   *   then the reply to an `ask`.
   * - NEVER throws:  a part that fails says so on the console, and the rest still runs.
   */
  static listen(handlers: BridgeHandlers): () => void {
    const onMessage = (event: MessageEvent) => {
      const message = event.data as PageMessage | undefined
      if (message?.type !== PAGE_MESSAGE || !LOCAL_ORIGIN.test(event.origin)) return
      void PageBridge.take(message, handlers).then((reply) => {
        if (reply) (event.source as Window | null)?.postMessage(reply, event.origin)
      })
    }
    window.addEventListener("message", onMessage)
    if (window.parent !== window)
      window.parent.postMessage({ type: PAGE_MESSAGE, hello: true } satisfies PageReply, "*")
    return () => window.removeEventListener("message", onMessage)
  }

  /** Do what `message` says, in this window;  the reply to its `ask`, if any. */
  private static async take(message: PageMessage, handlers: BridgeHandlers): Promise<PageReply | undefined> {
    const run = async (part: string, job: () => unknown) => {
      try {
        await job()
      } catch (error) {
        console.error(`PageBridge:  couldn't apply the theme editor's ${part}`, error)
      }
    }
    if (message.theme !== undefined) await run("theme", () => handlers.theme(message.theme!))
    if (message.scheme !== undefined) await run("scheme", () => handlers.scheme(message.scheme!))
    if (message.fullMonty) await run("full view", () => handlers.fullMonty?.())
    if (message.css !== undefined) await run("tuning", () => PageBridge.applyCss(document, message.css!))
    if (message.titles !== undefined) {
      // after the parts above have drawn
      await run("titles", () => E.after(LAYOUT_SECONDS, () => PageBridge.scrollTitles(document, message.titles!)))
    }
    if (!message.ask) return undefined
    return { type: PAGE_MESSAGE, reply: message.ask.id, look: PageBridge.look(document, message.ask.tokens) }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Every element under `root` matching `selector`, in shadow roots too, in document order (shadow roots after). */
  static deepAll(root: Document | ShadowRoot, selector: string): Element[] {
    const found = [...root.querySelectorAll(selector)]
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot) found.push(...PageBridge.deepAll(element.shadowRoot, selector))
    }
    return found
  }

  /** The sticky section `section` sits in, across shadow roots;  `undefined` for a top-level one. */
  private static parentSection(section: Element): Element | undefined {
    for (let node = PageBridge.up(section); node; node = PageBridge.up(node)) {
      if (node.matches(STICKY_SECTION)) return node
    }
    return undefined
  }

  /** The box `element` scrolls in:  its nearest ancestor that scrolls, across shadow roots;  else the page. */
  private static scrollerOf(element: Element): Element {
    const doc = element.ownerDocument
    for (let node = PageBridge.up(element); node; node = PageBridge.up(node)) {
      if (node === doc.documentElement || node === doc.body) break
      const { overflowY } = doc.defaultView!.getComputedStyle(node)
      if (SCROLLS.test(overflowY) && node.scrollHeight > node.clientHeight + 1) return node
    }
    return doc.scrollingElement ?? doc.documentElement
  }

  /** Where `scroller`'s box starts, px from the window's top:  the page's own scroller starts at 0. */
  private static topOf(scroller: Element): number {
    return scroller === scroller.ownerDocument.scrollingElement ? 0 : scroller.getBoundingClientRect().top
  }

  /** `node`'s parent element, or its shadow root's host. */
  private static up(node: Element): Element | undefined {
    if (node.parentElement) return node.parentElement
    const root = node.getRootNode()
    return root instanceof node.ownerDocument.defaultView!.ShadowRoot ? root.host : undefined
  }

  /** Every sheet of `doc`, its shadow roots' too, each with the roots that hold it. */
  private static sheetsOf(doc: Document): Map<CSSStyleSheet, ParentNode[]> {
    const sheets = new Map<CSSStyleSheet, ParentNode[]>()
    const add = (root: Document | ShadowRoot) => {
      for (const sheet of [...root.styleSheets, ...root.adoptedStyleSheets]) {
        const roots = sheets.get(sheet)
        if (roots) roots.push(root)
        else sheets.set(sheet, [root])
      }
    }
    add(doc)
    for (const element of PageBridge.deepAll(doc, "*")) if (element.shadowRoot) add(element.shadowRoot)
    return sheets
  }
}

/** What only the framed app knows how to do, handed to `listen()`. */
export type BridgeHandlers = {
  /** Wear theme `name`, as the app's menu would show it, but never remembered:  the app's own choice stays. */
  theme(name: string): unknown
  /** Show `scheme`, never remembered (`PageBridge.pinScheme()`):  a pair's two frames may share the storage. */
  scheme(scheme: PageScheme): unknown
  /** Open the app's full view (the editor:  Debug, every side bar, a part picked). */
  fullMonty?(): unknown
}

/** The scheme each framed window is pinned to (`pinScheme()`). */
const PINNED = new WeakMap<Window, "light" | "dark">()

/** Id of the `<style>` the theme being made goes in. */
const STYLE_ID = "ui-theme-editor-sheet"

/** A section whose title sticks. */
const STICKY_SECTION = "ui-section[sticky]"

/** A section tall enough to scroll under its title, px. */
const TALL_ENOUGH = 320

/** How far into a section `stuck` scrolls, past its top, px:  enough for both titles to stick. */
const SCROLL_INTO = 140

/** How long a page gets to draw a theme before its titles are scrolled, in seconds. */
const LAYOUT_SECONDS = 0.6

/** An `overflow-y` that scrolls. */
const SCROLLS = /auto|scroll|overlay/

/** A token read:  `var(--x`. */
const READ = /var\(\s*(--[\w-]+)/g

/** A selector that is `:root` alone, perhaps with classes or states on it (`:root.ui-dark`), or `html`. */
const ROOT_ONLY = /^(?::root|html)(?:[.:[][^\s>+~]*)?$/

/** Whether `rule` is a style rule (a selector and its declarations), from any window. */
function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return "selectorText" in rule && "style" in rule
}

/** What `collect()` gathers. */
type Found = { reads: Set<string>; declares: Set<string>; overrides: Set<string> }

/** This machine, any port:  where the theme editor runs. */
const LOCAL_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/
