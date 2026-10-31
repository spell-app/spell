import { P } from "spell/parser/parser"
import { isCoreCall, objectText, unwrapped } from "./jsShapes"
import { forEachNode, type WriterProject } from "./WriterProject"

/** Spell UI's own tags:  it reads a thing it's handed by the names of its fields. */
const UI_TAG = /^ui-/

/** The attribute a form control names its field with. */
const FIELD_ATTRIBUTE = "name"

/** The form element, whose `value` its controls' names are fields of. */
const FORM_TAG = "ui-form"

/** An event handler's attribute:  `onClick`, `on-ui-change`.  It runs when it's called, not when it's drawn. */
const HANDLER_ATTRIBUTE = /^on[-A-Z]/

/** `core`'s calls that read a saved type from its place. */
const SAVED_READS = new Set(["savedThings", "savedThingAt"])

/** `core`'s calls whose first value is a list, and whose answer is a list of the same things. */
const SAME_ITEMS = new Set(["filter", "sortedBy", "firstFew", "reversed", "filterInTurn"])

/** `core`'s calls after which a thing's whole row must be here:  undo puts it back, or it's written again. */
const NEEDS_WHOLE_ROW = new Set(["removeSaved", "saveThing", "draftOf"])

/** `core`'s call that sends a thing, whole, to a place's named operation, and where in its arguments the thing is. */
const SENDS_WHOLE_ROW = { call: "callPlace", argument: 2 }

/** A thing's own name:  `core` reads it for a reference to it, `Foundation#clubs`, whatever a program does. */
const THINGS_NAME = "name"

/** A handler for a property's change, by its spell name:  `on_title_change`. */
const CHANGE_HANDLER = /^(?:on|when)_(.+)_change$/

/** The handler for someone else's change to a thing, by its spell name. */
const SOMEONE_ELSE_HANDLER = "on_someone_else_change"

/** What a list that draws its own way calls for each item. */
const DRAW_EACH_ITEM = "draw_each_item"

/** How deep to look through getters for what a value is. */
const MAX_LOOK = 8

/****************
 * ### `ReadGathering`
 * What a whole project reads from what it saves in places, worked out before any of it is written (epic `data` P12).
 * - A pass beside `WriterProject.findWaiting()`:  from the tree alone, no scope lookups, nothing written.
 * - By NAME, as the waiting pass is:  `the title of x` reads `title` of every type declaring one.
 *   - So `draw it` on a list of mixed types joins them, which fetches too much:  and too much is safe.
 * - It answers three things:
 *   - `selectFor()`:  which fields of a saved type anything reads, for a place that can leave the rest out.
 *   - `firstReads`:  which reads a first draw can reach, asked for together.
 *   - `placesReadBy()`:  which places a getter reads, whatever one run of it happens to read.
 * - What it can't prove widens to the whole thing, with a note for the author:  `notes`, reaching `SP.SpellWarnings`.
 *   What it can't see at all, a page running catches:  `core`'s `ProgramPlaces` asks the place again.
 * - An import is where it stops:  what a library's code reads isn't in its declarations, so calling one reads everything saved whole.
 *   Measured over the built-in projects:  one of them (`counter-app`) imports another, and none with a place.
 * - Knows nothing of `core`, of the places folder, or of the language it was written in.
 ****************/
export class ReadGathering {
  /** Each function in the project, by its spell name:  a getter, a method, a draw. */
  private readonly bodies = new Map<string, GatheredBody[]>()
  /** What each function reads anywhere, once worked out. */
  private readonly factsAnywhere = new Map<GatheredBody, BodyFacts>()
  /** What each function reads in a first draw, once worked out. */
  private readonly factsInDraw = new Map<GatheredBody, BodyFacts>()
  /** Every field name any code in the project reads. */
  readonly namesRead = new Set<string>()
  /** Every field name a first draw can reach. */
  readonly namesDrawn = new Set<string>()
  /** Types it can't prove the reads of, with why:  read whole. */
  readonly wholeTypes = new Map<string, WholeReason>()
  /** Something read in a way it can't follow, by type unknown:  every saved type is read whole. */
  wholeProject: WholeReason | undefined
  /** The saved reads a first draw can reach. */
  readonly firstReads: GatheredRead[] = []
  /** What to tell the author:  a match, and a message key the language words. */
  readonly notes: ReadNote[] = []
  /** The types declared saved, by name, and where. */
  readonly savedTypes = new Map<string, SavedType>()

  private constructor(
    private readonly project: WriterProject,
    /** The functions the project imports, by name:  what they read, it can't see. */
    private readonly importedFunctions: ReadonlySet<string>
  ) {}

  /**
   * What `files` read.
   * - `scope`:  the project's, for what it imports.
   * - `allTypes`:  count every type as saved, to measure how far the pass sees on a project with no place at all.
   * - Costs nothing to a project with no saved type:  `undefined`.
   */
  static of(
    files: P.ASTNode[][],
    project: WriterProject,
    { scope, allTypes = false }: { scope?: P.Scope | undefined; allTypes?: boolean } = {}
  ): ReadGathering | undefined {
    const imported = new Set<string>()
    const imports = scope?.parentScope
    if (imports instanceof P.ImportScope) {
      for (const method of imports.methods.get()) imported.add(method.name)
      for (const type of imports.types.get()) for (const method of type.methods.get()) imported.add(method.name)
    }
    const gathering = new ReadGathering(project, imported)
    gathering.noteSavedTypes(files)
    if (!allTypes && !gathering.savedTypes.size) return undefined
    gathering.noteBodies(files)
    gathering.walkAnywhere(files)
    gathering.walkFirstDraw()
    return gathering
  }

  ////////////////
  // ## What it says
  ////////////////

  /**
   * The fields of `typeName` to ask its place for, or `undefined` for all of them:
   * - it can't prove what's read, or a saved thing is put back whole (`wholeReasonFor()`)
   * - nothing would be left out
   */
  selectFor(typeName: string): string[] | undefined {
    if (this.wholeReasonFor(typeName) || this.comesFromALibrary(typeName)) return undefined
    const fields = this.fieldsOf(typeName)
    const read = fields.filter((field) => this.isRead(field) || !this.isTyped(typeName, field))
    return read.length < fields.length ? read : undefined
  }

  /** Is `typeName` below a type the project imports?  What that one's code reads, and what it holds, can't be seen. */
  private comesFromALibrary(typeName: string): boolean {
    for (let type: string | undefined = typeName; type; type = this.project.superTypes.get(type)) {
      if (this.project.importedMembers.has(type)) return true
    }
    return false
  }

  /** Does anything read `field`?  A thing's own name always counts. */
  private isRead(field: string): boolean {
    return this.namesRead.has(field) || field === THINGS_NAME
  }

  /** Does `field` say what it holds?  One that doesn't has no declaration to listen on, so it's never left out. */
  private isTyped(typeName: string, field: string): boolean {
    return !!this.project.propertyOf(typeName, field)?.check?.properties?.length
  }

  /** Why `typeName` is read whole, if it is. */
  wholeReasonFor(typeName: string): WholeReason | undefined {
    if (this.wholeProject) return this.wholeProject
    for (let type: string | undefined = typeName; type; type = this.project.superTypes.get(type)) {
      const reason = this.wholeTypes.get(type)
      if (reason) return reason
    }
    return undefined
  }

  /** Each field `typeName` declares, its own and what it inherits. */
  fieldsOf(typeName: string): string[] {
    const fields = new Set<string>()
    for (let type: string | undefined = typeName; type; type = this.project.superTypes.get(type)) {
      for (const field of this.project.properties.get(type)?.keys() ?? []) fields.add(field)
    }
    return [...fields]
  }

  /** The reads a first draw reaches on place `placeName`, once each:  what can be asked before the draw asks. */
  firstReadsOf(placeName: string): GatheredRead[] {
    return this.firstReads.filter((read) => this.savedTypes.get(read.typeName)?.place === placeName)
  }

  /**
   * The places getter `name` of `typeName` reads:  the ones it asks, and those its fields are saved in.
   * - Whatever one run of it would read:  a branch not taken counts, and so does a list with nothing in it.
   * - By name through what it calls, so it can say too much, never too little.
   */
  placesReadBy(typeName: string, name: string): string[] {
    const body = this.bodies.get(name)?.find((each) => each.typeName === typeName)
    if (!body) return []
    const places = new Set<string>()
    this.reachFrom([body], "anywhere", (facts, each) => {
      for (const read of facts.savedReads) places.add(this.savedTypes.get(read.typeName)?.place ?? "")
      if (!each.typeName) return
      const saved = this.savedTypeFor(each.typeName)
      const own = saved && this.fieldsOf(each.typeName)
      if (saved && own!.some((field) => facts.names.has(field))) places.add(saved.place)
      for (const [type, savedType] of this.savedTypes) {
        if (this.fieldsOf(type).some((field) => facts.typedReads.get(type)?.has(field))) places.add(savedType.place)
      }
    })
    places.delete("")
    return [...places]
  }

  /** The place `typeName`, or a type above it, is saved in. */
  savedTypeFor(typeName: string): SavedType | undefined {
    for (let type: string | undefined = typeName; type; type = this.project.superTypes.get(type)) {
      const saved = this.savedTypes.get(type)
      if (saved) return saved
    }
    return undefined
  }

  ////////////////
  // ## What's in the project
  ////////////////

  /** SIDE EFFECT:  notes each type `files` say is saved, from `Recipe.savedIn = { place, collection }`. */
  private noteSavedTypes(files: P.ASTNode[][]): void {
    forEachNode(files, (node) => {
      if (!(node instanceof P.ASTStaticDefinition) || node.name !== "savedIn") return
      if (!(node.value instanceof P.ASTObjectLiteral)) return
      const place = objectText(node.value, "place")
      const collection = objectText(node.value, "collection")
      if (place && collection) this.savedTypes.set(node.typeName, { place, collection })
    })
  }

  /** SIDE EFFECT:  notes each function in `files`, by name. */
  private noteBodies(files: P.ASTNode[][]): void {
    const add = (name: string | undefined, method: P.ASTMethodDefinition | undefined, typeName?: string) => {
      if (!name || !method) return
      const named = this.bodies.get(name) ?? []
      this.bodies.set(name, [...named, { name, method, ...(typeName && { typeName }) }])
    }
    const noted = new Set<P.ASTMethodDefinition>()
    forEachNode(files, (node) => {
      if (node instanceof P.ASTPropertyDefinition) {
        const method = node.get ?? node.method
        add(node.property.value, method, node.typeName)
        if (method) noted.add(method)
      } else if (node instanceof P.ASTMethodDefinition && node.methodName && !noted.has(node)) {
        add(node.methodName, node)
        noted.add(node)
      }
    })
  }

  /** SIDE EFFECT:  notes what ALL the project's code reads, top-level steps and handlers too. */
  private walkAnywhere(files: P.ASTNode[][]): void {
    const facts = emptyFacts()
    this.visit(files, facts, { mode: "anywhere", env: new Map(), form: undefined })
    for (const name of facts.names) this.namesRead.add(name)
    for (const [name, match] of facts.calls) {
      if (!this.bodies.has(name) && this.importedFunctions.has(name)) {
        this.widen(undefined, { kind: "library reads it", match })
      }
    }
    for (const type of facts.drawn) {
      if (this.project.importedMembers.has(type)) {
        this.widen(undefined, { kind: "library reads it", match: facts.firstMatch ?? this.anyMatch(files) })
      }
    }
  }

  /** A line to pin a note on, when nothing better's to hand. */
  private anyMatch(files: P.ASTNode[][]): P.AnyMatch {
    return files.flat()[0]!.match
  }

  /** SIDE EFFECT:  notes what a first draw can reach:  from each app's draw, or every draw when there's no app. */
  private walkFirstDraw(): void {
    const draws = this.bodies.get("draw") ?? []
    const apps = draws.filter((body) => body.typeName && this.isApp(body.typeName))
    const seen = new Map<string, GatheredRead>()
    this.reachFrom(apps.length ? apps : draws, "first draw", (facts) => {
      for (const name of facts.names) this.namesDrawn.add(name)
      for (const read of facts.savedReads) {
        const key = `${read.typeName}\n${read.queryText}`
        if (read.canAskFirst && !seen.has(key)) seen.set(key, read)
      }
    })
    this.firstReads.push(...seen.values())
  }

  /** Is `typeName` below `App`? */
  private isApp(typeName: string): boolean {
    return this.project.isSubclassOf(typeName, "App")
  }

  /**
   * Call `visit` with each function `roots` reach, and what it reads:
   * - a getter or a method named, by name
   * - a draw:  of the type it's known to be, and the types below;  else every draw
   */
  private reachFrom(
    roots: GatheredBody[],
    mode: WalkMode,
    visit: (facts: BodyFacts, body: GatheredBody) => void
  ): void {
    const seen = new Set<GatheredBody>()
    const toVisit = [...roots]
    for (let body = toVisit.pop(); body; body = toVisit.pop()) {
      if (seen.has(body)) continue
      seen.add(body)
      const facts = this.factsOf(body, mode)
      visit(facts, body)
      for (const name of [...facts.calls.keys(), ...facts.names]) toVisit.push(...(this.bodies.get(name) ?? []))
      if (facts.drawn.size || facts.drawsAnything) toVisit.push(...(this.bodies.get(DRAW_EACH_ITEM) ?? []))
      for (const type of facts.drawn) toVisit.push(...this.drawsOf(type))
      if (facts.drawsAnything) toVisit.push(...(this.bodies.get("draw") ?? []))
    }
  }

  /** The draws of `typeName` and the types below it. */
  private drawsOf(typeName: string): GatheredBody[] {
    const draws = this.bodies.get("draw") ?? []
    const own = draws.filter((body) => this.project.isSubclassOf(body.typeName, typeName))
    if (own.length) return own
    // it inherits its draw:  the nearest type above that has one
    for (let type = this.project.superTypes.get(typeName); type; type = this.project.superTypes.get(type)) {
      const inherited = draws.filter((body) => body.typeName === type)
      if (inherited.length) return inherited
    }
    return []
  }

  /** What `body` reads, once. */
  private factsOf(body: GatheredBody, mode: WalkMode): BodyFacts {
    const memo = mode === "anywhere" ? this.factsAnywhere : this.factsInDraw
    const known = memo.get(body)
    if (known) return known
    const facts = emptyFacts()
    memo.set(body, facts)
    const env: Env = new Map()
    this.visit(body.method.body, facts, { mode, env, form: undefined, ...(body.typeName && { self: body.typeName }) })
    return facts
  }

  ////////////////
  // ## Walking
  ////////////////

  /** SIDE EFFECT:  adds to `facts` what `node` reads. */
  private visit(node: unknown, facts: BodyFacts, at: WalkAt): void {
    if (Array.isArray(node)) {
      for (const item of node) this.visit(item, facts, at)
      return
    }
    if (!(node instanceof P.ASTNode)) return

    if (node instanceof P.ASTClassMember && node.typeName) at = { ...at, self: node.typeName }
    if (node instanceof P.ASTPropertyDefinition) this.noteChangeHandler(node, facts)
    if (node instanceof P.ASTJSXElement) {
      this.visitElement(node, facts, at)
      return
    }
    if (node instanceof P.ASTAssignmentStatement) this.noteAssignment(node, at)
    if (node instanceof P.ASTPropertyExpression && !(unwrapped(node.object) instanceof P.ASTTypeExpression)) {
      this.noteRead(node, facts, at)
    }
    if (node instanceof P.ASTMethodInvocation) this.noteCall(node, facts, at)

    for (const [key, value] of Object.entries(node)) {
      // what's assigned to isn't read, but what it's on is
      if (key === "match") continue
      if (node instanceof P.ASTAssignmentStatement && key === "thing" && value instanceof P.ASTPropertyExpression) {
        this.visit(value.object, facts, at)
        continue
      }
      this.visit(value, facts, at)
    }
  }

  /**
   * SIDE EFFECT:  `- when its title changes:` has to see it change, so it reads `title`, even with nothing else that does.
   * - `- when someone else changes it:` has to see any of them change:  its type is read whole.
   */
  private noteChangeHandler(node: P.ASTPropertyDefinition, facts: BodyFacts): void {
    const name = node.property.value
    const field = CHANGE_HANDLER.exec(name)?.[1]
    if (field) facts.names.add(field)
    if (name === SOMEONE_ELSE_HANDLER && node.typeName && !this.wholeTypes.has(node.typeName)) {
      this.wholeTypes.set(node.typeName, { kind: "hears every change", match: node.match })
    }
  }

  /** SIDE EFFECT:  notes a read of field `node` names. */
  private noteRead(node: P.ASTPropertyExpression, facts: BodyFacts, at: WalkAt): void {
    const name = node.property.value
    facts.names.add(name)
    const owner = this.typeOf(node.object, at, 0).type
    if (!owner) return
    const fields = facts.typedReads.get(owner) ?? new Set<string>()
    facts.typedReads.set(owner, fields.add(name))
  }

  /** SIDE EFFECT:  notes what a new variable holds, so what's read off it is known. */
  private noteAssignment(node: P.ASTAssignmentStatement, at: WalkAt): void {
    if (node.isNewVariable && node.thing instanceof P.ASTVariableExpression) {
      at.env.set(node.thing.name, this.typeOf(node.value, at, 0))
    }
  }

  /** SIDE EFFECT:  notes what call `node` does. */
  private noteCall(node: P.ASTMethodInvocation, facts: BodyFacts, at: WalkAt): void {
    const { methodName } = node
    if (!isCoreCall(node)) {
      facts.calls.set(methodName, node.match)
      return
    }
    const args = (node as P.ASTScopedMethodInvocation).args?.args ?? []
    if (methodName === "on") this.noteListener(args[0], node)
    if (SAVED_READS.has(methodName)) this.noteSavedRead(node, args, facts)
    else if (NEEDS_WHOLE_ROW.has(methodName)) this.noteWholeRow(node, args, at)
    else if (methodName === SENDS_WHOLE_ROW.call && args[SENDS_WHOLE_ROW.argument]) {
      this.noteWholeRow(node, args.slice(SENDS_WHOLE_ROW.argument), at)
    } else if (methodName === "drawThing") this.noteDraw(args[0], facts, at)
    this.noteCallbacks(args, at)
  }

  /** SIDE EFFECT:  `when a recipe changes:` at a file's top has to see any of a recipe's fields change:  it's read whole. */
  private noteListener(event: P.ASTNode | undefined, node: P.ASTNode): void {
    const said = event instanceof P.ASTQuotedExpression ? event.expression : undefined
    const words = said instanceof P.ASTStringLiteral ? said.value : ""
    const named = /^a-(.+)-change$/.exec(words)?.[1]?.replace(/-/g, "").toLowerCase()
    if (!named) return
    for (const type of this.savedTypes.keys()) {
      if (type.toLowerCase() === named && !this.wholeTypes.has(type)) {
        this.wholeTypes.set(type, { kind: "hears every change", match: node.match })
      }
    }
  }

  /** SIDE EFFECT:  notes a read of a saved type:  `core.savedThings(Recipe, { filter })`. */
  private noteSavedRead(node: P.ASTNode, args: readonly P.ASTNode[], facts: BodyFacts): void {
    const type = args[0] && unwrapped(args[0] as P.ASTExpression)
    if (!(type instanceof P.ASTTypeExpression)) return
    const query = args[1] instanceof P.ASTObjectLiteral && args[1].properties?.length ? args[1] : undefined
    // what it filters and sorts by:  a read's list keeps to them here too, as rows change under it
    if (query) for (const name of fieldsNamedBy(query)) facts.names.add(name)
    facts.savedReads.push({
      typeName: type.name,
      node,
      ...(query && { query }),
      queryText: query ? queryText(query) : "",
      canAskFirst: !query || isWrittenOut(query)
    })
  }

  /** SIDE EFFECT:  `node` needs a whole row:  a thing removed comes back whole on undo. */
  private noteWholeRow(node: P.ASTNode, args: readonly P.ASTNode[], at: WalkAt): void {
    const arg = args[0] && unwrapped(args[0] as P.ASTExpression)
    if (arg instanceof P.ASTNewInstanceExpression) return
    const { type } = arg ? this.typeOf(arg as P.ASTExpression, at, 0) : EMPTY
    const reason: WholeReason = { kind: "put back whole", match: node.match }
    if (type) {
      if (!this.wholeTypes.has(type)) this.wholeTypes.set(type, reason)
    } else this.wholeProject ??= reason
  }

  /** SIDE EFFECT:  `value` is drawn. */
  private noteDraw(value: P.ASTNode | undefined, facts: BodyFacts, at: WalkAt): void {
    const { type, item } = value ? this.typeOf(value as P.ASTExpression, at, 0) : EMPTY
    if (!type && !item) {
      facts.drawsAnything = true
      return
    }
    if (type) facts.drawn.add(type)
    if (value) facts.firstMatch ??= value.match
    // a list draws its items too
    const holds = item ?? this.project.itemTypeOf(type)
    if (holds) facts.drawn.add(holds)
  }

  /** SIDE EFFECT:  notes what each function handed to a loop or a filter is handed:  an item of the list it's given. */
  private noteCallbacks(args: readonly P.ASTNode[], at: WalkAt): void {
    const list = args[0]
    if (!list) return
    const { item, type } = this.typeOf(list as P.ASTExpression, at, 0)
    const holds = item ?? (type && this.project.itemTypeOf(type))
    if (!holds) return
    for (const arg of args.slice(1)) {
      const callback = unwrapped(arg as P.ASTExpression)
      const param = callback instanceof P.ASTMethodDefinition ? callback.args?.[0] : undefined
      if (param) at.env.set(param.name, { type: holds })
    }
  }

  /** SIDE EFFECT:  notes what an element reads:  the fields its controls name, and things handed to other elements. */
  private visitElement(node: P.ASTJSXElement, facts: BodyFacts, at: WalkAt): void {
    const value = attribute(node, "value")
    const isForm = node.tagName === FORM_TAG
    const inner: WalkAt = isForm && value ? { ...at, form: this.typeOf(value, at, 0).type ?? UNKNOWN_FORM } : at
    const isOurs = !node.tagName || !node.tagName.includes("-") || UI_TAG.test(node.tagName)

    for (const attr of node.attrs ?? []) {
      if (!(attr instanceof P.ASTJSXAttribute) || !attr.value) continue
      if (HANDLER_ATTRIBUTE.test(attr.name) && at.mode === "first draw") continue
      if (attr.name === FIELD_ATTRIBUTE) this.noteFieldName(attr, facts, at)
      else if (!(isForm && attr.name === "value")) this.noteHandedOver(node, attr, isOurs, at)
      this.visit(attr.value, facts, inner)
    }
    if (!isOurs) this.noteOwnElement(node, facts)
    this.visit(node.children, facts, inner)
  }

  /**
   * SIDE EFFECT:  an element names a field:  by a name written out, a read, in a form or not (`<ui-property name="title">`);
   * in a form, any other way, it can't tell.
   */
  private noteFieldName(attr: P.ASTJSXAttribute, facts: BodyFacts, at: WalkAt): void {
    const name = attr.value instanceof P.ASTStringLiteral && attr.value.quote ? attr.value.value : undefined
    if (name !== undefined) facts.names.add(name)
    else if (at.form) this.widen(at.form, { kind: "field named by a value", match: attr.match })
  }

  /** SIDE EFFECT:  a thing handed to an element is read by it, by names it can't see. */
  private noteHandedOver(node: P.ASTJSXElement, attr: P.ASTJSXAttribute, isOurs: boolean, at: WalkAt): void {
    if (!(attr.value instanceof P.ASTExpression)) return
    const held = unwrapped(attr.value)
    if (held instanceof P.ASTMethodDefinition) return
    const { type, item } = this.typeOf(held, at, 0)
    const handed = type ?? item
    if (!handed || !this.project.members.has(handed)) return
    if (isOurs || !this.ownElementType(node)) this.widen(handed, { kind: "element reads it", match: attr.match })
  }

  /** SIDE EFFECT:  a tag named for one of the project's types, `<solitaire-card>`, draws that type. */
  private noteOwnElement(node: P.ASTJSXElement, facts: BodyFacts): void {
    const type = this.ownElementType(node)
    if (type) facts.drawn.add(type)
  }

  /** The project's type a tag's last words name:  `<solitaire-card>` is a `Card`. */
  private ownElementType(node: P.ASTJSXElement): string | undefined {
    const words = node.tagName.split("-")
    for (let start = 0; start < words.length; start++) {
      const name = words
        .slice(start)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
      if (this.project.members.has(name)) return name
    }
    return undefined
  }

  /** SIDE EFFECT:  `type` is read whole, or with none known, everything saved is. */
  private widen(type: string | undefined, reason: WholeReason): void {
    if (!type || type === UNKNOWN_FORM) this.wholeProject ??= reason
    else if (!this.wholeTypes.has(type)) this.wholeTypes.set(type, reason)
    const isKnown = !!type && type !== UNKNOWN_FORM
    if (isKnown ? !this.savedTypeFor(type) : !this.savedTypes.size) return
    this.notes.push({ match: reason.match, kind: reason.kind, ...(isKnown && { typeName: type }) })
  }

  ////////////////
  // ## What a value is
  ////////////////

  /**
   * What `node` holds, as far as the tree says:  a thing of a type, or a list of them.
   * - From what it's made from:  `it`, a new one, a variable, a property's declared type, what a getter returns.
   * - Else spell's own datatype for it.
   */
  private typeOf(node: P.ASTNode | undefined, at: WalkAt, depth: number): Held {
    if (!node || depth > MAX_LOOK) return EMPTY
    const inner = unwrapped(node as P.ASTExpression)
    if (inner instanceof P.ASTSelfLiteral) return at.self ? { type: at.self } : EMPTY
    if (inner instanceof P.ASTNewInstanceExpression) return { type: inner.type.name }
    if (inner instanceof P.ASTMethodDefinition) {
      const returned = onlyReturned(inner)
      return returned ? this.typeOf(returned, at, depth + 1) : EMPTY
    }
    if (inner instanceof P.ASTVariableExpression && !(inner instanceof P.ASTCoreExpression)) {
      if (inner.name === "this") return at.self ? { type: at.self } : EMPTY
      const known = at.env.get(inner.name)
      if (known) return known
      const value = this.project.moduleValues.get(inner.name)
      if (value) return this.typeOf(value, at, depth + 1)
    }
    if (inner instanceof P.ASTPropertyExpression) {
      const owner = this.typeOf(inner.object, at, depth + 1).type
      if (owner) {
        const held = this.memberHolds(owner, inner.property.value, depth)
        if (held !== EMPTY) return held
      }
    }
    if (isCoreCall(inner)) {
      const { methodName, args } = inner as P.ASTScopedMethodInvocation
      const first = args?.args?.[0]
      if (methodName === "savedThings" || methodName === "everyThing") {
        const type = first && unwrapped(first)
        if (type instanceof P.ASTTypeExpression) return { item: type.name }
      }
      if (methodName === "savedThingAt" || methodName === "thingAtPlace") {
        const type = first && unwrapped(first)
        if (type instanceof P.ASTTypeExpression) return { type: type.name }
      }
      if (SAME_ITEMS.has(methodName)) return this.typeOf(first, at, depth + 1)
    }
    return heldByDatatype(inner.datatype ?? inner.match?.datatype)
  }

  /** What member `name` of `owner` holds. */
  private memberHolds(owner: string, name: string, depth: number): Held {
    const property = this.project.propertyOf(owner, name)
    if (property) return heldByProperty(property)
    const getter = this.project.getterOf(owner, name)
    const returned = getter && onlyReturned(getter)
    if (returned)
      return this.typeOf(returned, { mode: "anywhere", env: new Map(), form: undefined, self: owner }, depth + 1)
    return EMPTY
  }
}

/** A function in the project. */
type GatheredBody = {
  /** Its spell name. */
  name: string
  /** It, as the tree holds it. */
  method: P.ASTMethodDefinition
  /** The type it's in, if any. */
  typeName?: string
}

/** What a saved type says:  `Recipe.savedIn`. */
export type SavedType = {
  /** Its place's name. */
  place: string
  /** Its collection there. */
  collection: string
}

/** A read of a saved type a first draw can reach. */
export type GatheredRead = {
  /** The type read. */
  typeName: string
  /** The call. */
  node: P.ASTNode
  /** What it asks, if anything. */
  query?: P.ASTObjectLiteral
  /** What it asks, as text, for telling reads apart. */
  queryText: string
  /** Is what it asks written out, so it can be asked before anything's drawn? */
  canAskFirst: boolean
}

/** Why a type is read whole. */
export type WholeReason = {
  /** Which reason. */
  kind: "field named by a value" | "element reads it" | "put back whole" | "library reads it" | "hears every change"
  /** The line that made it so. */
  match: P.AnyMatch
}

/** What to tell the author:  `P.WriterOptions.noteReadWidened`. */
export type ReadNote = {
  /** The line. */
  match: P.AnyMatch
  /** Why. */
  kind: WholeReason["kind"]
  /** The type read whole.  Left out:  every saved type. */
  typeName?: string
}

/** What one function reads. */
type BodyFacts = {
  /** Fields and getters read, by name. */
  names: Set<string>
  /** Fields read where the owner's type is known. */
  typedReads: Map<string, Set<string>>
  /** Functions called, by name, and a line that calls each. */
  calls: Map<string, P.AnyMatch>
  /** Types it draws. */
  drawn: Set<string>
  /** The line of the first thing it draws. */
  firstMatch?: P.AnyMatch
  /** It draws something it can't tell the type of. */
  drawsAnything: boolean
  /** Saved reads it makes. */
  savedReads: GatheredRead[]
}

/** How much of a function a walk counts:  `first draw` leaves out what only runs later, an event's handler. */
type WalkMode = "anywhere" | "first draw"

/** What a variable is known to hold, by name. */
type Env = Map<string, Held>

/** Where a walk is. */
type WalkAt = {
  /** How much it counts. */
  mode: WalkMode
  /** What's known of the variables. */
  env: Env
  /** The type of the form it's in, if it's in one. */
  form: string | undefined
  /** What `it` is. */
  self?: string
}

/** What a value holds:  a thing of a type, or a list of them. */
type Held = {
  /** A thing of this type. */
  type?: string
  /** A list of things of this type. */
  item?: string
}

/** Knows nothing of what it holds. */
const EMPTY: Held = {}

/** A form whose value's type can't be told. */
const UNKNOWN_FORM = "?"

/** A fresh `BodyFacts`. */
function emptyFacts(): BodyFacts {
  return {
    names: new Set(),
    typedReads: new Map(),
    calls: new Map(),
    drawn: new Set(),
    drawsAnything: false,
    savedReads: []
  }
}

/** Element `node`'s attribute `name`. */
function attribute(node: P.ASTJSXElement, name: string): P.ASTExpression | undefined {
  for (const attr of node.attrs ?? []) {
    if (attr instanceof P.ASTJSXAttribute && attr.name === name) return attr.value as P.ASTExpression | undefined
  }
  return undefined
}

/** What a function does if it only returns something:  its value. */
function onlyReturned(method: P.ASTMethodDefinition): P.ASTExpression | undefined {
  const statements = method.body?.statements ?? []
  const last = statements.at(-1)
  return last instanceof P.ASTReturnStatement ? last.value : undefined
}

/** `query` as text:  literal values only, what tells two reads apart. */
function queryText(query: P.ASTObjectLiteral): string {
  const text = (written: unknown): string => {
    const node = written instanceof P.ASTExpression ? unwrapped(written) : written
    if (node instanceof P.ASTQuotedExpression) return text(node.expression)
    if (node instanceof P.ASTObjectLiteral) {
      const parts = (node.properties ?? []).map((property) =>
        property instanceof P.ASTObjectLiteralProperty ? `${property.property.value}:${text(property.value)}` : "?"
      )
      return `{${parts.join(",")}}`
    }
    if (node instanceof P.ASTArrayLiteral) return `[${(node.items ?? []).map(text).join(",")}]`
    if (node instanceof P.ASTLiteral) return `${(node as unknown as { value: unknown }).value}`
    return "?"
  }
  return text(query)
}

/** The fields `query` filters and sorts by. */
function fieldsNamedBy(query: P.ASTObjectLiteral): string[] {
  const names: string[] = []
  for (const part of query.properties ?? []) {
    if (!(part instanceof P.ASTObjectLiteralProperty)) continue
    const value = part.value && unwrapped(part.value)
    if (part.property.value === "filter" && value instanceof P.ASTObjectLiteral) {
      for (const filter of value.properties ?? []) {
        if (filter instanceof P.ASTObjectLiteralProperty) names.push(filter.property.value)
      }
    } else if (part.property.value === "sort" && value instanceof P.ASTArrayLiteral) {
      for (const item of value.items ?? []) {
        const field = item instanceof P.ASTObjectLiteral ? objectText(item, "field") : undefined
        if (field) names.push(field)
      }
    }
  }
  return names
}

/** Is every value in `query` written out, so it means the same before anything's drawn? */
function isWrittenOut(written: P.ASTNode): boolean {
  const query = unwrapped(written as P.ASTExpression)
  if (query instanceof P.ASTQuotedExpression) return isWrittenOut(query.expression)
  if (query instanceof P.ASTObjectLiteral) {
    return (query.properties ?? []).every(
      (property) => property instanceof P.ASTObjectLiteralProperty && !!property.value && isWrittenOut(property.value)
    )
  }
  if (query instanceof P.ASTArrayLiteral) return (query.items ?? []).every(isWrittenOut)
  return query instanceof P.ASTLiteral
}

/** What spell's own datatype for a value says it holds. */
function heldByDatatype(datatype: unknown): Held {
  if (typeof datatype !== "string") return EMPTY
  const item = P.itemTypeOf(datatype)
  if (item) return { item }
  return /^\p{Lu}/u.test(datatype) ? { type: datatype } : EMPTY
}

/** What a property holds, from its declaration. */
function heldByProperty(property: P.ASTReactiveProperty): Held {
  for (const part of property.check?.properties ?? []) {
    if (!(part instanceof P.ASTObjectLiteralProperty) || !(part.value instanceof P.ASTStringLiteral)) continue
    const key = part.property.value
    if (key === "itemType") return { item: part.value.value }
    if (key === "type" && /^\p{Lu}/u.test(part.value.value)) return { type: part.value.value }
  }
  const { initializer } = property
  if (initializer instanceof P.ASTNewInstanceExpression) {
    return initializer.type.name === "List" ? EMPTY : { type: initializer.type.name }
  }
  return EMPTY
}
