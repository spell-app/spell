/****************
 * ### `PagePatch`
 * ONE page patcher for every page runtime (epic `epic-engine` P40):  an edit to a page's file shows in the open page
 * without a reload, and only what changed redraws.
 * - It compares the page's source as it LOADED with the new source, and works out a list of small STEPS
 *   (`PatchStep`):  set an attribute, set a text, replace, remove, insert, move.
 *   A separate runner applies them to the live page (`run()`).
 * - The planner (`PagePatch.plan()`) works over ANY keyed tree, through a small adapter (`PatchTree`):
 *   each node's key, kind, attributes, text and children.
 *   - the DOM is one adapter (`PagePatch.domTree()`);  a Spell notebook's chunk tree is another (elemental-spell P16)
 *   - so the server could work the same list out later, for multiplayer Spell, with no change to the page
 * - Each runtime hands it its rules (`PatchRules`), laid over ONE shared set (`PagePatch.SHARED`):
 *   - what's never replaced:  an open editor (Monaco in a cell), the field being typed in
 *   - what reader state is kept:  folds, open panels, typed text, the scroll, the selection
 *   - spell-epic's docs runtime adds the epic pages' (`spell-doc-runtime.js`), Spell UI's site its own (`SitePatch`)
 * - Plain DOM, NO imports:  any page's bundle can take it.
 *
 * How a node is matched (Owen, comment M1 on P40):
 * - a node with a KEY (an element's `id`;  a notebook's chunk path) matches the node with that key, wherever it moved
 * - a node with none is matched by its PLACE:  its kind and its index among its same-kind siblings
 *   - same-kind siblings that didn't change are lined up first (the longest run in common), then the rest by place:
 *     so a paragraph added at the top of a section is one insert, not every paragraph's text moving down
 * - every step names its node by an ADDRESS from the OLD tree, xpath-ish, from its nearest keyed ancestor:
 *   `#p-x/ui-section[2]/p[3]/text()[1]`;  `/` is the root itself (`/p[1]`, under it)
 *   - indexes count every same-kind sibling (keyed or not), from 1;  a text node's kind is `text()`
 *   - keys are URI-encoded in addresses, so a `/` in one can't split it
 ****************/
export class PagePatch {
  /** this runtime's rules, laid over the shared ones (`PagePatch.SHARED`) */
  readonly rules: PatchRules

  constructor(rules: PatchRules = {}) {
    this.rules = PagePatch.merge(PagePatch.SHARED, rules)
  }

  ////////////////
  // ## The planner:  any keyed tree
  ////////////////

  /**
   * The steps that turn tree `before` into tree `after`, as `tree` reads them.
   * - pure:  reads the trees, changes nothing
   * - `before` itself changed past patching (another kind, a node replaced whole):  ONE step, replacing `/`
   * - NEVER throws for trees `tree` can read
   */
  static plan<N extends object>(before: N, after: N, tree: PatchTree<N>, rules: PlanRules<N> = {}): PatchStep<N>[] {
    return new Planner(tree, rules).plan(before, after)
  }

  /**
   * The DOM as a `PatchTree`:  an element's key is its `id`, its kind its tag;  its children its elements and text
   * nodes, but never a comment, a text of only white space, or a live extra (`rules.skip`).
   * - text is compared with its white space squashed:  a reformat that re-wraps lines changes nothing
   * - `rules.slotsOnly`:  an element whose other children aren't the page's (a body loaded from a file):
   *   only its slotted children count
   */
  static domTree(rules: PatchRules = {}): PatchTree<Node> {
    const signatures = new WeakMap<Node, string>()
    return {
      key: (node) => (isElement(node) && node.id ? node.id : undefined),
      kind: kindOf,
      attributes: (node) => (isElement(node) ? Array.from(node.attributes, (at) => [at.name, at.value]) : []),
      text: (node) => (node.nodeType === TEXT_NODE ? (node as Text).data : ""),
      children: (node) => sourceChildren(node, rules),
      same: (a, b) => signatureOf(a) === signatureOf(b)
    }

    /** `node`'s markup, white space squashed, cached */
    function signatureOf(node: Node): string {
      let value = signatures.get(node)
      if (value === undefined) {
        const markup = isElement(node) ? node.outerHTML : (node.textContent ?? "")
        value = squash(markup)
        signatures.set(node, value)
      }
      return value
    }
  }

  ////////////////
  // ## The DOM:  plan, run, a whole page
  ////////////////

  /** The steps that turn source element `before` into source element `after` (parsed, not live), by these rules. */
  plan(before: Element, after: Element): PatchStep<Node>[] {
    const rules = this.rules
    const kept = new Set(rules.keptAttributes)
    return PagePatch.plan<Node>(before, after, PagePatch.domTree(rules), {
      keptAttributes: kept,
      replacedWhole: (node) => isElement(node) && !!rules.replacedWhole && node.matches(rules.replacedWhole),
      mustReplace: (was, now) => isElement(was) && isElement(now) && !!rules.mustReplace?.(was, now)
    })
  }

  /**
   * Apply `steps` (from `plan()`) to `root`, the live element the old tree stands for.
   * - every address is found FIRST, in the live tree as it is, so the steps' order doesn't matter;
   *   one that isn't there (or a text that isn't what the old tree had) throws a `PatchError`, before anything changes
   * - never touched (`PatchRun.skipped` counts them):
   *   - inside an open editor (`rules.fixed`), nor the editor replaced, moved or removed
   *   - the field being typed in, or anything holding it, replaced, moved or removed
   * - a new or replacing node is a COPY of the source's, given its reader state (`rules.prepare()`) BEFORE it goes
   *   in the page, so it draws that way first:  nothing animates
   * - a text set in place keeps the selection on it, its offsets clamped
   * - returns what changed (`PatchRun`)
   */
  run(steps: readonly PatchStep<Node>[], root: Element): PatchRun {
    const rules = this.rules
    const found = new Map<string, Node>()
    const at = (address: string): Node => {
      let node = found.get(address)
      if (!node) {
        node = resolveAddress(root, address, rules)
        found.set(address, node)
      }
      return node
    }
    for (const step of steps) {
      const node = at("target" in step ? step.target : step.parent)
      if (step.op === "text" && (node.nodeType !== TEXT_NODE || squash((node as Text).data) !== squash(step.from)))
        throw new PatchError(`PagePatch.run():  the text at ${step.target} isn't the page's as loaded;  reload it`)
      if (step.op === "move" && !isElement(at(step.parent)))
        throw new PatchError(`PagePatch.run():  ${step.parent} isn't an element;  reload the page`)
    }
    const editors = rules.fixed ? Array.from(root.querySelectorAll(rules.fixed)) : []
    const typing = typingIn(root)
    const inEditor = (node: Node) => editors.some((editor) => editor !== node && editor.contains(node))
    const holds = (node: Node) => editors.some((editor) => node.contains(editor)) || (!!typing && node.contains(typing))
    const result: PatchRun = { changed: [], skipped: 0 }
    const changed = new Set<Element>()
    const placements = new Map<Element, { index: number; node: Node }[]>()
    const detach: Node[] = []
    const place = (parent: Element, index: number, node: Node) => {
      const list = placements.get(parent) ?? []
      list.push({ index, node })
      placements.set(parent, list)
    }
    for (const step of steps) {
      const node = at("target" in step ? step.target : step.parent)
      // an insert's node is its parent:  never into an editor either
      const intoEditor = step.op === "insert" && editors.some((editor) => editor.contains(node))
      const movesInto = step.op === "move" && editors.some((editor) => editor.contains(at(step.parent)))
      const takesAway = (step.op === "replace" || step.op === "remove" || step.op === "move") && holds(node)
      if (inEditor(node) || intoEditor || movesInto || takesAway) {
        result.skipped++
        continue
      }
      if (step.op === "attribute") {
        const element = node as Element
        if (step.value === null) element.removeAttribute(step.name)
        else element.setAttribute(step.name, step.value)
        changed.add(element)
      } else if (step.op === "text") {
        setText(node as Text, step.text)
        if (node.parentElement) changed.add(node.parentElement)
      } else if (step.op === "replace") {
        const copy = this.copyOf(step.node, isElement(node) ? node : null)
        ;(node as ChildNode).replaceWith(copy)
        if (isElement(copy)) changed.add(copy)
        else if (copy.parentElement) changed.add(copy.parentElement)
      } else if (step.op === "remove") detach.push(node)
      else if (step.op === "move") {
        detach.push(node)
        place(at(step.parent) as Element, step.index, node)
      } else {
        const copy = this.copyOf(step.node, null)
        place(node as Element, step.index, copy)
        if (isElement(copy)) changed.add(copy)
        else changed.add(node as Element)
      }
    }
    for (const node of detach) (node as ChildNode).remove()
    for (const [parent, list] of placements) {
      list.sort((a, b) => a.index - b.index)
      for (const { index, node } of list) placeChild(parent, index, node, rules)
    }
    result.changed = Array.from(changed).filter((element) => element.isConnected)
    return result
  }

  /**
   * Patch the live page from source document `before` to source document `after` (parsed, e.g. `DOMParser`):
   * the page's `main` (`mainOf()`), `<body>`'s attributes and the `<title>`;  null when it can't be done safely.
   * - null when:
   *   - what the page loads changed:  its stylesheets or scripts (not what the page server injects, nor inert data
   *     blocks), or anything in `<body>` outside `main`
   *   - either has no `main`, or `main` itself would be replaced
   *   - more than half of `main` would be replaced or added (`PageEdit.weight`):  a reload is as quick
   *   - the live page doesn't line up with the old source (`PatchError`)
   * - plans everything first, so nothing changes when it's refused
   * - keeps the line being read where it is (`readingAnchor()`), whatever changed above it;
   *   `top()`:  how far down the window the stuck titles end, ABOVE which nothing counts as read
   * - `<body>`'s attributes are patched too, but never its `class` (runtimes add their own)
   */
  page({ before, after, live, mainOf, top = () => 0 }: PageEdit): PageRun | null {
    const was = mainOf(before)
    const now = mainOf(after)
    if (!was || !now || headKey(before) !== headKey(after) || shellKey(before, mainOf) !== shellKey(after, mainOf))
      return null
    const steps = this.plan(was, now)
    if (steps.some((step) => "target" in step && step.target === ROOT && step.op !== "attribute")) return null
    const weight = steps.reduce(
      (sum, step) => sum + (step.op === "replace" || step.op === "insert" ? sizeOf(step.node) : 0),
      0
    )
    if (weight > now.outerHTML.length / 2) return null
    const anchor = PagePatch.readingAnchor(live, top())
    let run: PatchRun
    try {
      run = this.run(steps, live)
    } catch (error) {
      if (error instanceof PatchError) return null
      throw error
    }
    patchBodyAttributes(before.body, after.body, live.ownerDocument.body)
    if (after.title !== before.title) live.ownerDocument.title = after.title
    PagePatch.keepAnchor(anchor)
    return { ...run, steps, weight }
  }

  ////////////////
  // ## The reading position
  ////////////////

  /**
   * What the reader is looking at in `root`:  the element mid-column, just below `top` (px from the window's top),
   * and its top;  null when none is.
   */
  static readingAnchor(root: Element, top = 0): ReadingAnchor | null {
    const box = root.getBoundingClientRect()
    const element = document.elementFromPoint(box.left + box.width / 2, Math.min(innerHeight - 1, top + 8))
    return element && root.contains(element) ? { element, top: element.getBoundingClientRect().top } : null
  }

  /** Scroll so `anchor` (`readingAnchor()`) is where it was, if it's still in the page. */
  static keepAnchor(anchor: ReadingAnchor | null): void {
    if (!anchor?.element.isConnected) return
    const moved = anchor.element.getBoundingClientRect().top - anchor.top
    if (Math.abs(moved) >= 1) scrollBy({ top: moved, behavior: "instant" })
  }

  ////////////////
  // ## Rules
  ////////////////

  /**
   * The rules every runtime shares, laid under its own (`new PagePatch(rules)`):
   * - kept:  `collapsed` and `open`, the folds and open panels the reader set
   * - replaced whole when they change:  what draws its children itself, or holds text that isn't plain
   *   (code, a highlighted `<pre>`, an include, a script)
   * - never touched:  an open editor (Monaco's, or anything marked `data-spell-editor`)
   * - a copy brought in keeps the reader's typed text (fields with an `id`) and open accordion panels
   *   (`keepReaderState()`)
   */
  static readonly SHARED: PatchRules = {
    keptAttributes: ["collapsed", "open"],
    replacedWhole: "pre, ui-code, ui-markdown, ui-include, script, style, template, svg",
    fixed: ".monaco-editor, [data-spell-editor]",
    prepare: (copy, live) => {
      if (live) keepReaderState(live, copy)
    }
  }

  /** Rules `a` with `b` laid over them:  lists joined, selectors and predicates OR'd, `prepare()`s in turn. */
  static merge(a: PatchRules, b: PatchRules): PatchRules {
    const either = (x?: string, y?: string) => (x && y ? `${x}, ${y}` : x || y)
    return {
      skip: either(a.skip, b.skip),
      keptAttributes: [...(a.keptAttributes ?? []), ...(b.keptAttributes ?? [])],
      replacedWhole: either(a.replacedWhole, b.replacedWhole),
      fixed: either(a.fixed, b.fixed),
      slotsOnly:
        a.slotsOnly || b.slotsOnly ? (element) => !!a.slotsOnly?.(element) || !!b.slotsOnly?.(element) : undefined,
      mustReplace:
        a.mustReplace || b.mustReplace
          ? (was, now) => !!a.mustReplace?.(was, now) || !!b.mustReplace?.(was, now)
          : undefined,
      prepare:
        a.prepare || b.prepare
          ? (copy, live) => {
              a.prepare?.(copy, live)
              b.prepare?.(copy, live)
            }
          : undefined
    }
  }

  ////////////////
  // ## Helpers runtimes share
  ////////////////

  /** Carry the reader's typed text and open accordion panels from `live` to `copy`, its replacement. */
  static readonly keepReaderState = keepReaderState

  /** `root` (when it matches `selector`) and every element under it that does, in document order. */
  static readonly withSelf = withSelf

  /** Is `script` a data block the browser never runs (`type="text/plain"`, JSON ...)? */
  static readonly isInert = isInert

  /** Markup with every run of white space one space, and none between tags. */
  static readonly squash = squash

  /**
   * A copy of source node `source`, brought into this document, then given its reader state (`rules.prepare()`)
   * before it's put in the page:  so it draws that way first, and a runtime keyed by the copy itself (Spell UI's
   * examples) finds the node that goes in
   */
  private copyOf(source: Node, live: Element | null): Node {
    const copy = document.importNode(source, true)
    if (isElement(copy)) this.rules.prepare?.(copy, live)
    return copy
  }
}

/** Thrown by `PagePatch.run()` when the live page doesn't line up with the old source:  the page should reload. */
export class PatchError extends Error {}
PatchError.prototype.name = "PatchError"

////////////////
// ## Types
////////////////

/**
 * A tree the planner reads (`PagePatch.plan()`):  how to see one node.
 * - `key()`:  its key, when it has one (an element's `id`, a chunk's path):  matched wherever it moved
 *   - a key twice in a tree is no key there
 * - `kind()`:  what it is:  a tag (`p`), or `TEXT_KIND` for text;  only nodes of one kind match
 * - `attributes()`:  its attributes, `[name, value]`
 * - `text()`:  a text node's text
 * - `children()`:  its children, in order:  only those that count (no comments, no white space between tags)
 * - `same()`:  are two nodes the same, children and all?  Default:  by kind, attributes, text and children
 */
export type PatchTree<N> = {
  key(node: N): string | undefined
  kind(node: N): string
  attributes(node: N): Iterable<readonly [string, string]>
  text(node: N): string
  children(node: N): readonly N[]
  same?(a: N, b: N): boolean
}

/** The kind of a text node, in `PatchTree.kind()` and addresses (`text()[1]`). */
export const TEXT_KIND = "text()"

/**
 * One step of a patch, its nodes named by addresses in the OLD tree (see the class).
 * - `attribute`:  set `name` to `value`;  `null` removes it
 * - `text`:  a text node's text, in place;  `from`, the text it had, so a runner can check it's the one
 * - `replace`:  the node, by a copy of new node `node`
 * - `remove`:  the node
 * - `insert`:  a copy of new node `node`, as child number `index` (from 0, counting what `children()` counts) of
 *   `parent` once the patch is done
 * - `move`:  the node (kept, as it is) to child number `index` of `parent`
 */
export type PatchStep<N> =
  | { op: "attribute"; target: string; name: string; value: string | null }
  | { op: "text"; target: string; text: string; from: string }
  | { op: "replace"; target: string; node: N }
  | { op: "remove"; target: string }
  | { op: "insert"; parent: string; index: number; node: N }
  | { op: "move"; target: string; parent: string; index: number }

/**
 * What the planner is told about a tree's nodes (`PagePatch.plan()`).
 * - `keptAttributes`:  the reader's:  never set or removed
 * - `replacedWhole()`:  a node replaced whole when it changes, never patched inside
 * - `mustReplace()`:  a node to replace though its kind stayed (a body from another file)
 */
export type PlanRules<N> = {
  keptAttributes?: ReadonlySet<string>
  replacedWhole?(node: N): boolean
  mustReplace?(before: N, after: N): boolean
}

/**
 * A page runtime's rules for the DOM patcher (`new PagePatch(rules)`), laid over `PagePatch.SHARED`.
 * - `skip`:  live elements the page's source doesn't have, which the runtime added:  stepped around, never touched
 * - `keptAttributes`:  attributes the reader's state lives in:  never set or removed by a patch
 * - `replacedWhole`:  elements that manage their children (tabs, accordions, selects ...):  replaced whole when they
 *   change, their reader state carried over by `prepare()`
 * - `fixed`:  live elements never replaced, moved or removed, and never patched inside:  an open editor
 * - `slotsOnly()`:  an element whose only children from the page are its slotted ones (a body loaded from a file)
 * - `mustReplace()`:  a source element to replace though its tag stayed (another body file)
 * - `prepare()`:  give `copy` (in this document, not yet in the page) the reader's state:  from `live`, the element
 *   it replaces, or null for a new one
 */
export type PatchRules = {
  skip?: string
  keptAttributes?: readonly string[]
  replacedWhole?: string
  fixed?: string
  slotsOnly?(element: Element): boolean
  mustReplace?(before: Element, after: Element): boolean
  prepare?(copy: Element, live: Element | null): void
}

/** What `PagePatch.run()` did:  the elements added, replaced or changed, and how many steps it left alone. */
export type PatchRun = { changed: Element[]; skipped: number }

/** What `PagePatch.page()` did:  the run, its steps, and how much it replaced or added (`outerHTML` length). */
export type PageRun = PatchRun & { steps: PatchStep<Node>[]; weight: number }

/**
 * `PagePatch.page()`'s input.
 * - `before` / `after`:  the page's source as it loaded, and the new one, parsed
 * - `live`:  the live page's `main`
 * - `mainOf()`:  a document's `main`, as the runtime finds it
 * - `top()`:  px from the window's top where the stuck titles end
 */
export type PageEdit = {
  before: Document
  after: Document
  live: Element
  mainOf(root: ParentNode): Element | null
  top?(): number
}

/** What the reader is looking at:  an element and its top, px from the window's (`PagePatch.readingAnchor()`). */
export type ReadingAnchor = { element: Element; top: number }

////////////////
// ## The planner
////////////////

/** The address of the root of a tree. */
const ROOT = "/"

/**
 * One matched pair's children, as the planner lines them up:  `match[i]`, the old child new child `i` is (an index
 * into `was`), else -1 (new);  `from[i]`, the address of an old node from ANOTHER parent it moved from.
 */
type Lineup<N> = {
  parent: string
  was: readonly N[]
  now: readonly N[]
  addresses: string[]
  match: number[]
  from: (string | undefined)[]
  taken: Set<number>
}

/** Works out one patch (`PagePatch.plan()`):  first every match, then the steps. */
class Planner<N extends object> {
  private readonly tree: PatchTree<N>
  private readonly rules: PlanRules<N>
  private readonly steps: PatchStep<N>[] = []
  private readonly lineups: Lineup<N>[] = []
  /** the keys found once in each tree:  only those match by key */
  private keys = new Set<string>()
  /** the old tree's keys found once:  their nodes are addressed by key */
  private oldKeys = new Set<string>()
  private readonly signatures = new WeakMap<N, string>()

  constructor(tree: PatchTree<N>, rules: PlanRules<N>) {
    this.tree = tree
    this.rules = rules
  }

  plan(before: N, after: N): PatchStep<N>[] {
    this.oldKeys = onceKeys(before, this.tree)
    const newKeys = onceKeys(after, this.tree)
    this.keys = new Set([...this.oldKeys].filter((key) => newKeys.has(key)))
    this.morph(before, after, ROOT)
    this.joinMoves()
    this.placeSteps()
    return this.steps
  }

  /** Plan old `was` (at `address`) becoming new `now`:  nothing, replaced, its text, or its attributes and children. */
  private morph(was: N, now: N, address: string): void {
    const { tree, rules } = this
    if (this.same(was, now)) return
    const kind = tree.kind(now)
    if (
      kind !== tree.kind(was) ||
      rules.replacedWhole?.(was) ||
      rules.replacedWhole?.(now) ||
      rules.mustReplace?.(was, now)
    ) {
      this.steps.push({ op: "replace", target: address, node: now })
      return
    }
    if (kind === TEXT_KIND) {
      this.steps.push({ op: "text", target: address, text: tree.text(now), from: tree.text(was) })
      return
    }
    this.attributes(was, now, address)
    this.lineUp(was, now, address)
  }

  /** Plan the attributes that changed from `was` to `now`, but the kept ones. */
  private attributes(was: N, now: N, address: string): void {
    const before = new Map(this.tree.attributes(was))
    const after = new Map(this.tree.attributes(now))
    for (const name of new Set([...before.keys(), ...after.keys()])) {
      if (this.rules.keptAttributes?.has(name)) continue
      const value = after.get(name) ?? null
      if (value !== (before.get(name) ?? null)) this.steps.push({ op: "attribute", target: address, name, value })
    }
  }

  /**
   * Match `now`'s children to `was`'s, and morph each pair:  keyed ones by key, then the rest of each kind by place
   * (`alignByPlace()`).  What's left over is placed later (`placeSteps()`), maybe moved in from elsewhere first
   * (`joinMoves()`).
   */
  private lineUp(was: N, now: N, address: string): void {
    const { tree } = this
    const old = tree.children(was)
    const kids = tree.children(now)
    const lineup: Lineup<N> = {
      parent: address,
      was: old,
      now: kids,
      addresses: this.addresses(old, address),
      match: kids.map(() => -1),
      from: kids.map(() => undefined),
      taken: new Set()
    }
    const byKey = new Map<string, number>()
    old.forEach((kid, at) => {
      const key = this.keyOf(kid)
      if (key !== undefined) byKey.set(key, at)
    })
    kids.forEach((kid, at) => {
      const key = this.keyOf(kid)
      const match = key === undefined ? undefined : byKey.get(key)
      // by key whatever its kind:  one that changed its tag is REPLACED where it is (never a remove and an insert,
      // which would leave a copy beside one the reader is typing in)
      if (match === undefined) return
      lineup.match[at] = match
      lineup.taken.add(match)
    })
    const kinds = new Set(kids.map((kid) => tree.kind(kid)))
    for (const kind of kinds) {
      const olds = old.flatMap((kid, at) =>
        !lineup.taken.has(at) && this.keyOf(kid) === undefined && tree.kind(kid) === kind ? [at] : []
      )
      const news = kids.flatMap((kid, at) =>
        lineup.match[at] === -1 && this.keyOf(kid) === undefined && tree.kind(kid) === kind ? [at] : []
      )
      for (const [o, n] of this.alignByPlace(olds, news, old, kids)) {
        lineup.match[n] = o
        lineup.taken.add(o)
      }
    }
    this.lineups.push(lineup)
    kids.forEach((kid, at) => {
      const match = lineup.match[at]!
      if (match >= 0) this.morph(old[match]!, kid, lineup.addresses[match]!)
    })
  }

  /**
   * Pair old children `olds` with new children `news` (indexes, one kind, no keys):  the longest run of unchanged
   * ones first, then the rest between them by place.  Returns `[old, new]` pairs.
   * - very long lists (over `ALIGN_LIMIT` pairs to compare):  by place alone
   */
  private alignByPlace(olds: number[], news: number[], old: readonly N[], kids: readonly N[]): [number, number][] {
    const pairs: [number, number][] = []
    const anchors: [number, number][] = []
    if (olds.length * news.length <= ALIGN_LIMIT) {
      const lengths = olds.map(() => Array.from({ length: news.length + 1 }, () => 0))
      lengths.push(Array.from({ length: news.length + 1 }, () => 0))
      for (let i = olds.length - 1; i >= 0; i--)
        for (let j = news.length - 1; j >= 0; j--)
          lengths[i]![j] = this.same(old[olds[i]!]!, kids[news[j]!]!)
            ? lengths[i + 1]![j + 1]! + 1
            : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
      let i = 0
      let j = 0
      while (i < olds.length && j < news.length) {
        if (this.same(old[olds[i]!]!, kids[news[j]!]!)) anchors.push([i++, j++])
        else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) i++
        else j++
      }
    }
    // between two unchanged ones (and before the first, after the last):  the rest, by place
    let i = 0
    let j = 0
    for (const [ai, aj] of [...anchors, [olds.length, news.length] as const]) {
      for (let k = 0; i + k < ai && j + k < aj; k++) pairs.push([olds[i + k]!, news[j + k]!])
      if (ai < olds.length) pairs.push([olds[ai]!, news[aj]!])
      i = ai + 1
      j = aj + 1
    }
    return pairs
  }

  /**
   * A keyed node gone from one parent and new under another is the same node, MOVED:  morphed in place of the
   * remove and the insert.  Repeats until no more are found (a moved node's own children may hold more).
   */
  private joinMoves(): void {
    for (let joined = true; joined;) {
      joined = false
      const gone = new Map<string, { lineup: Lineup<N>; at: number }>()
      for (const lineup of this.lineups)
        lineup.was.forEach((kid, at) => {
          const key = this.keyOf(kid)
          if (key !== undefined && !lineup.taken.has(at)) gone.set(key, { lineup, at })
        })
      for (const lineup of [...this.lineups])
        lineup.now.forEach((kid, at) => {
          const key = this.keyOf(kid)
          const old = key === undefined || lineup.match[at] !== -1 || lineup.from[at] ? undefined : gone.get(key)
          if (!old || this.tree.kind(old.lineup.was[old.at]!) !== this.tree.kind(kid)) return
          old.lineup.taken.add(old.at)
          gone.delete(key!)
          const address = old.lineup.addresses[old.at]!
          lineup.from[at] = address
          this.morph(old.lineup.was[old.at]!, kid, address)
          joined = true
        })
    }
  }

  /**
   * The steps that put each parent's children in their new order:  removes for old children nothing took, then
   * inserts for new ones, moves for ones from elsewhere, and moves for kept ones now out of order.
   * - out of order:  a kept child whose old place comes before the one kept before it
   */
  private placeSteps(): void {
    for (const lineup of this.lineups)
      lineup.was.forEach((_kid, at) => {
        if (!lineup.taken.has(at)) this.steps.push({ op: "remove", target: lineup.addresses[at]! })
      })
    for (const lineup of this.lineups) {
      let last = -1
      lineup.now.forEach((kid, index) => {
        const match = lineup.match[index]!
        const from = lineup.from[index]
        if (from) this.steps.push({ op: "move", target: from, parent: lineup.parent, index })
        else if (match < 0) this.steps.push({ op: "insert", parent: lineup.parent, index, node: kid })
        else if (match < last)
          this.steps.push({ op: "move", target: lineup.addresses[match]!, parent: lineup.parent, index })
        else last = match
      })
    }
  }

  /** Each of `kids`' address:  `#key` for one keyed in the old tree, else `parent`'s plus `kind[n]`. */
  private addresses(kids: readonly N[], parent: string): string[] {
    const counts = new Map<string, number>()
    return kids.map((kid) => {
      const kind = this.tree.kind(kid)
      const n = (counts.get(kind) ?? 0) + 1
      counts.set(kind, n)
      const key = this.tree.key(kid)
      if (key !== undefined && this.oldKeys.has(key)) return `#${encodeURIComponent(key)}`
      return `${parent === ROOT ? "" : parent}/${kind}[${n}]`
    })
  }

  /** `node`'s key, when it matches by it:  once in each tree. */
  private keyOf(node: N): string | undefined {
    const key = this.tree.key(node)
    return key !== undefined && this.keys.has(key) ? key : undefined
  }

  /** Are `a` and `b` the same, children and all? */
  private same(a: N, b: N): boolean {
    return this.tree.same ? this.tree.same(a, b) : this.signature(a) === this.signature(b)
  }

  /** `node` as one string:  its kind, attributes, text and children's, cached. */
  private signature(node: N): string {
    let value = this.signatures.get(node)
    if (value === undefined) {
      const { tree } = this
      const attributes = Array.from(tree.attributes(node), ([name, at]) => `${name}=${JSON.stringify(at)}`).sort()
      const kids = tree.children(node).map((kid) => this.signature(kid))
      value = `${tree.kind(node)}[${attributes.join(" ")}]${JSON.stringify(tree.text(node))}(${kids.join(",")})`
      this.signatures.set(node, value)
    }
    return value
  }
}

/** The most old-by-new same-kind pairs one parent's children are compared in, to line up unchanged ones. */
const ALIGN_LIMIT = 250_000

/** The keys found exactly once in `root`'s tree. */
function onceKeys<N>(root: N, tree: PatchTree<N>): Set<string> {
  const counts = new Map<string, number>()
  const walk = (node: N) => {
    const key = tree.key(node)
    if (key !== undefined) counts.set(key, (counts.get(key) ?? 0) + 1)
    for (const kid of tree.children(node)) walk(kid)
  }
  walk(root)
  return new Set([...counts].filter(([, count]) => count === 1).map(([key]) => key))
}

////////////////
// ## The DOM
////////////////

/** `Node.TEXT_NODE` and `Node.ELEMENT_NODE`, spelled out:  read where `Node` may not be a global (node's tests). */
const TEXT_NODE = 3
const ELEMENT_NODE = 1

/** Is `node` an element?  By its type, not `instanceof`:  linkedom's nodes (node's tests) are no `Element`. */
function isElement(node: Node): node is Element {
  return node.nodeType === ELEMENT_NODE
}

/** A DOM node's kind:  its tag, or `TEXT_KIND`. */
function kindOf(node: Node): string {
  return node.nodeType === TEXT_NODE ? TEXT_KIND : (node as Element).localName
}

/**
 * The children of `node` that count, in order:  elements but the runtime's extras (`rules.skip`), and text nodes
 * with more than white space;  only slotted ones under a `rules.slotsOnly()` element.
 */
function sourceChildren(node: Node, rules: PatchRules): Node[] {
  const slots = node.nodeType === ELEMENT_NODE && !!rules.slotsOnly?.(node as Element)
  return Array.from(node.childNodes).filter((kid) => {
    if (kid.nodeType === TEXT_NODE) return !slots && (kid as Text).data.trim() !== ""
    if (kid.nodeType !== ELEMENT_NODE) return false
    const element = kid as Element
    if (rules.skip && element.matches(rules.skip)) return false
    return !slots || element.hasAttribute("slot")
  })
}

/** The live node at `address` under `root`;  throws a `PatchError` when there's none. */
function resolveAddress(root: Element, address: string, rules: PatchRules): Node {
  const parts = address.split("/")
  let node: Node | null = root
  const first = parts.shift()!
  if (first.startsWith("#")) {
    const key = decodeURIComponent(first.slice(1))
    node = root.id === key ? root : root.querySelector(`[id="${CSS.escape(key)}"]`)
  } else if (first !== "") node = null
  for (const part of parts) {
    if (!node || part === "") continue
    const step = /^(.+)\[(\d+)\]$/.exec(part)
    if (!step) {
      node = null
      break
    }
    const [, kind, n] = step
    node = sourceChildren(node, rules).filter((kid) => kindOf(kid) === kind)[Number(n) - 1] ?? null
  }
  if (!node) throw new PatchError(`PagePatch.run():  nothing at ${address} in the live page;  reload it`)
  return node
}

/**
 * Put `node` as child number `index` (counting what `sourceChildren()` counts) of `parent`:
 * right after the child before that place, else before the first, else at the end.
 */
function placeChild(parent: Element, index: number, node: Node, rules: PatchRules): void {
  const kids = sourceChildren(parent, rules).filter((kid) => kid !== node)
  if (index > 0 && kids[index - 1]) (kids[index - 1] as ChildNode).after(node)
  else if (kids[0]) (kids[0] as ChildNode).before(node)
  else parent.append(node)
}

/** Set `text`'s text in place, keeping a selection on it where it was (clamped to the new length). */
function setText(text: Text, value: string): void {
  const selection = getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined
  const keep =
    range && (range.startContainer === text || range.endContainer === text)
      ? {
          start: range.startContainer === text ? range.startOffset : undefined,
          end: range.endContainer === text ? range.endOffset : undefined,
          range: range.cloneRange()
        }
      : undefined
  text.data = value
  if (!keep || !selection) return
  const clamp = (offset: number) => Math.min(offset, value.length)
  try {
    const { range: was } = keep
    selection.setBaseAndExtent(
      keep.start === undefined ? was.startContainer : text,
      keep.start === undefined ? was.startOffset : clamp(keep.start),
      keep.end === undefined ? was.endContainer : text,
      keep.end === undefined ? was.endOffset : clamp(keep.end)
    )
  } catch {
    // the other end left the page:  the selection goes, as the browser left it
  }
}

/**
 * The element in `root` that holds the field being typed in (a text field, a `<select>`, editable text), through
 * shadow roots:  the field itself, or the host whose shadow root holds it;  null when none is.
 */
function typingIn(root: Element): Element | null {
  const active: Element | null = document.activeElement
  let deepest = active
  while (deepest?.shadowRoot?.activeElement) deepest = deepest.shadowRoot.activeElement
  if (!deepest || !isField(deepest)) return null
  return active && root.contains(active) ? active : null
}

/** Is `element` a field the reader types or picks in? */
function isField(element: Element): boolean {
  return (
    element.matches(
      "input:not([type=button], [type=submit], [type=reset], [type=checkbox], [type=radio]), textarea, select"
    ) || (element as HTMLElement).isContentEditable
  )
}

/**
 * Carry the reader's state from `live` to `copy`, its replacement (not yet in the page):
 * - typed text:  fields with an `id`
 * - open panels:  each accordion's, matched by its nearest ancestor with an `id` and its order under it
 */
function keepReaderState(live: Element, copy: Element): void {
  const panels = accordionsOf(live)
  for (const [key, accordion] of accordionsOf(copy)) {
    const old = panels.get(key)
    if (!old) continue
    // its `open` PROPERTY (the panels open now), or its attribute before it upgraded
    const open = String((old as Element & { open?: string | number }).open ?? old.getAttribute("open") ?? "")
      .split(/[\s,]+/)
      .filter((word) => /^\d+$/.test(word))
      .join(" ")
    if (open) accordion.setAttribute("open", open)
    else accordion.removeAttribute("open")
  }
  for (const field of withSelf(copy, "textarea[id], input[id]")) {
    const old = live.ownerDocument.getElementById(field.id) as HTMLInputElement | null
    if (!old || !live.contains(old) || old.value === undefined) continue
    if (field.localName === "textarea") field.textContent = old.value
    else field.setAttribute("value", old.value)
  }
}

/** `root`'s accordions (itself included), by `<owner id>:<n>`:  the nearest ancestor with an `id` inside `root`. */
function accordionsOf(root: Element): Map<string, Element> {
  const byKey = new Map<string, Element>()
  const counts = new Map<string, number>()
  for (const accordion of withSelf(root, "ui-accordion")) {
    let owner = accordion === root ? null : accordion.parentElement
    while (owner && owner !== root && !owner.id) owner = owner.parentElement
    const name = accordion === root ? "" : (owner?.id ?? "")
    const n = counts.get(name) ?? 0
    counts.set(name, n + 1)
    byKey.set(`${name}:${n}`, accordion)
  }
  return byKey
}

/** `root` (when it matches `selector`) and every element under it that does, in document order. */
function withSelf(root: Element, selector: string): Element[] {
  return [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)]
}

/** How much a step brings in:  its node's markup length. */
function sizeOf(node: Node): number {
  return isElement(node) ? node.outerHTML.length : (node.textContent ?? "").length
}

/** Markup with every run of white space one space, and none between tags. */
function squash(html: string): string {
  return html.replace(/\s+/g, " ").replace(/> </g, "><").trim()
}

/**
 * What a page loads:  its stylesheets and scripts, one line each;  not what the page server injects
 * (`/api/server/...`, the inline `SPELL_SERVER`), nor inert data blocks (`isInert()`).
 */
function headKey(doc: Document): string {
  const parts = Array.from(
    doc.querySelectorAll('link[rel~="stylesheet"]'),
    (link) => `css ${link.getAttribute("href")}`
  )
  for (const script of doc.querySelectorAll("script")) {
    const src = script.getAttribute("src")
    if (src?.startsWith("/api/server/") || (!src && script.textContent.includes("SPELL_SERVER"))) continue
    if (!src && isInert(script)) continue
    // one the page server adds to every page (`PageServer.withPageScripts()`):  not the page's own, and the copy sent
    // with a change may lack it;  counted, every epic page reloaded on every edit (2026-10-25)
    if (script.hasAttribute("data-spell-page-script")) continue
    parts.push(src ? `js ${src}` : `inline ${squash(script.textContent)}`)
  }
  return parts.join("\n")
}

/**
 * Is `script` INERT:  a data block the browser never runs (`type="text/plain"`, JSON ...), not JavaScript or a
 * module?
 */
function isInert(script: Element): boolean {
  const type = (script.getAttribute("type") ?? "").trim().toLowerCase()
  return type !== "" && type !== "module" && !/^(text|application)\/(x-)?(java|ecma)script$/.test(type)
}

/**
 * Everything in a page's `<body>` but `main`'s content, the scripts and `<body>`'s attributes (but its `class`:
 * runtimes add their own), white space squashed.
 */
function shellKey(doc: Document, mainOf: (root: ParentNode) => Element | null): string {
  const body = doc.body.cloneNode(true) as HTMLElement
  mainOf(body)?.replaceChildren()
  for (const script of body.querySelectorAll("script")) script.remove()
  for (const name of body.getAttributeNames()) if (name !== "class") body.removeAttribute(name)
  return squash(body.outerHTML)
}

/** Set the `<body>` attributes whose source changed from `before` to `after` on `live`;  never `class`. */
function patchBodyAttributes(before: HTMLElement, after: HTMLElement, live: HTMLElement): void {
  for (const name of new Set([...before.getAttributeNames(), ...after.getAttributeNames()])) {
    const value = after.getAttribute(name)
    if (name === "class" || value === before.getAttribute(name)) continue
    if (value === null) live.removeAttribute(name)
    else live.setAttribute(name, value)
  }
}
