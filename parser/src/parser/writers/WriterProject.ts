import { P } from "spell/parser/parser"
import { isCoreCall, unwrapped } from "./jsShapes"

/****************
 * ### `WriterProject`
 * What a javascript writer (`P.JSWriter`, `P.TSWriter`) must know about a whole project
 * BEFORE it writes any of it:
 * - what each value is
 * - which variables are set again
 * - which members move into their classes
 * - which lists become typed constants
 * - what values the program gives each member
 *
 * - Made once per compile, from every file's statements:
 *   `WriterProject.of(files)`, through `JSWriter.forProject()`.
 * - Both writers read what it knows of values, and move members into their classes;
 *   the typed constants are TypeScript's alone.
 * - Which functions wait, for every target:  `findWaiting()`.
 * - Plain facts, worked out from the tree alone:  no scope lookups, nothing written.
 * - An empty one (`new WriterProject()`) knows nothing, e.g. for `JSWriter.instance` writing one node.
 *   Then every new variable is `const`, and nothing moves.
 ****************/
export class WriterProject {
  /** Variables set AFTER they're declared, by spell's name, e.g. `state`:  `let`;  any other new variable is `const`. */
  readonly reassigned = new Set<string>()
  /**
   * Members written OUTSIDE a class the project declares, by the class's name, with the comments above each.
   * - They're written inside the class instead:  one class body per type.
   * - e.g. `the pile of a card`, set first in `Pile.spell` (an `ASTPatchedMember`, which spell itself never moves).
   */
  readonly movedMembers = new Map<string, Array<P.ASTClassMember | P.ASTComment | P.ASTBlankLine>>()
  /** Every statement moved into a class, so it's written nowhere else. */
  readonly moved = new Set<P.ASTNode>()
  /** Each list class's own item type, e.g. `Card` for `Pile`:  `Pile<Card>`, a list item's type -- see `itemTypeOf()`. */
  readonly itemTypes = new Map<string, string>()
  /** Each class's super-type, by name, e.g. `Pile` for `Tableau`. */
  readonly superTypes = new Map<string, string>()
  /**
   * What each class declares, by name:  its properties, getters and methods, by spell's names.
   * - Ours, an imported one's (`importedMembers`), and what it gets for TypeScript only (`undeclared`).
   * - See `isInherited()`.
   */
  readonly members = new Map<string, Set<string>>()
  /**
   * What each variable the files set at their top level is set to, by spell's name,
   * e.g. `all_piles` => `new List<Pile>(...)`.
   * - So the writer knows it's a list, even where it's read before it's set (in a class above it).
   */
  readonly moduleValues = new Map<string, P.ASTExpression>()
  /** Each class's lists of values written out, as `<Class>.<Static>`, e.g. `Deck.Suits`:  plain arrays. */
  readonly staticLists = new Set<string>()
  /** Each class's own getters, by spell's name:  see `getterOf()`. */
  readonly getterMethods = new Map<string, Map<string, P.ASTMethodDefinition>>()
  /** Each class's own properties, by name:  see `propertyOf()`. */
  readonly properties = new Map<string, Map<string, P.ASTReactiveProperty>>()
  /**
   * Each list a property's values come from, typed, by `<Class>.<Static>`:
   * e.g. `Card.Ranks`, type `Rank`.  See `TSList`.
   */
  readonly lists = new Map<string, TSList>()
  /**
   * Each value kind's class, by name, and the hoisted list its values come from, e.g. `Suit` => `Deck.Suits`'s.
   * - A value kind (`"suits" as one of ...` in a deck's body) is a class with the name its values' type would have:
   *   so that type is `(typeof SUITS)[number]` -- see `TSWriter.valueKindType()`.
   */
  readonly valueKinds = new Map<string, TSList>()
  /**
   * The kind of each property's values, by name, and where its list is, by `<Class>.<Static>`:
   * e.g. `CardSuit` => `Card.Suits`, from a card's `its "suit" is one of ...` (epic `spanish` P22).
   * - It has no class of its own (`P.ValueKind.property`):  a value of it is typed as one of its list's,
   *   see `TSWriter.typeFor()`.
   */
  readonly propertyKinds = new Map<string, string>()
  /**
   * Members a class gets for TypeScript only, by the class's name (Q25):
   * ones its program uses on it, or on a class below it, but never declares there.  See `TSUndeclared`.
   * - A value given when one is made, `a new foundation with symbol = "♣️"`:
   *   on the class shared by every class it's given to, e.g. `droppable` on `Pile`, given to each kind of pile.
   * - A method two or more classes define, that the class they share doesn't:
   *   `can_pick_up_$card` on `Pile`, defined by each kind of pile.
   */
  readonly undeclared = new Map<string, TSUndeclared[]>()
  /**
   * Each class the project imports, by its name here, and the members its own project declares:
   * e.g. `Pile` from `Cards`.  The end of a class chain, for `undeclared`.
   */
  readonly importedMembers = new Map<string, Set<string>>()
  /**
   * Each built-in runtime class, by its name in compiled code, e.g. `Thing`, and its type in the root scope.
   * - Its members are every class's below it, e.g. `id` (epic `people-and-orgs`):
   *   never one a class gets for TypeScript only.  See `isBuiltInMember()`.
   */
  readonly builtInTypes = new Map<string, P.TypeScope>()
  /**
   * Each `<Class>.<member>` that says which list of a family holds it (epic `python-target` P25),
   * e.g. `Card.pile` from `a card belongs to one pile`:  nothing while it's in none.
   * - An imported class's, from its declarations' `exclusive` properties;  our own are getters (`getterOf()`).
   */
  readonly owners = new Set<string>()
  /**
   * Every value the program gives a member, by the member's name, e.g. `name` => `"stock"`, `"discards"` ...
   * - What types a property whose type the program never says (Q54):  see `JSWriter.givenKind()`.
   * - Given when one is made:  `a new stock-pile with name = "stock"`.
   * - Set on one:  `set the name of the pile to ...`.
   */
  readonly givenValues = new Map<string, GivenValue[]>()
  /** The spell names of the functions and methods that wait -- see `findWaiting()`. */
  readonly waitingNames = new Set<string>()
  /** The functions that wait, as the tree holds them. */
  readonly waitingMethods = new WeakSet<P.ASTMethodDefinition>()
  /** The functions the program listens with, `on hit:` at its top level, by event. */
  readonly listeners = new Map<string, P.ASTMethodDefinition[]>()
  /**
   * The program's own top-level steps that wait, `solitaire.startANewGame()`:  written `core.holdWhile(...)`, which
   * doesn't hold the first draw, while people's actions wait for them.
   */
  readonly heldSteps = new WeakSet<P.ASTNode>()
  /** The calls written `await`:  each in a function that waits, of something that waits. */
  readonly awaited = new WeakSet<P.ASTNode>()
  /** Names of the getters that wait, or read one that does, by spell's name:  each read of one is an answer to wait for. */
  readonly waitingValues = new Set<string>()
  /** The getters that wait, and their names by spell's name. */
  readonly waitedGetters = new Map<P.ASTMethodDefinition, string>()
  /** A drawing's values that read what waits, with a spot of their own for a "…":  `Total: {the total}`. */
  readonly spotsThatWait = new WeakSet<P.ASTNode>()
  /** Drawings that read what waits somewhere with no spot for a "…", an `if` or an attribute:  held whole. */
  readonly heldDrawings = new WeakSet<P.ASTPropertyDefinition>()
  /** Has `findWaiting()` run?  With none, e.g. `JSWriter.instance` writing one node, only `core`'s own calls wait. */
  hasFoundWaiting = false

  /**
   * SIDE EFFECT:  notes which functions in `files` wait, for every target, and sets each `method.waiting`:
   * - any that waits itself (`method.waitsItself`), or is imported as one that does (`P.ScopeMethod.waits`)
   * - then, until nothing changes, any that calls one, by name
   * - by NAME:  every method of a name waits if one does, so a call needn't know which one it reaches
   *
   * - The places that can't simply wait:
   *   - a program's top level:  it isn't a function, and it mustn't hold the first draw.
   *     `core`'s own calls wait there, as they always have;  the program's own start and carry on.
   *   - a function inside another, e.g. a handler:  its own, waiting when it's called.
   *     But a loop's function runs right there:  if that waits, so does what holds it.
   *   - what `canWait` says no to:  javascript's drawings, `create()` and tests, which must answer at once
   *
   * - A getter that waits, and a read of one, by name:  `waitingValues`.
   *   - An action reading one waits for the answer.
   *   - A plain getter over one:  on Solid (`readsThroughSolid`), "not yet" passes through it, so it stays plain;
   *     anywhere else it waits too.
   *   - A drawing never waits:  see `noteDrawing()`.
   */
  findWaiting(
    files: P.ASTNode[][],
    scope: P.Scope | undefined,
    how: {
      /** May this function wait? */
      canWait: (name: string | undefined, isGetter: boolean) => boolean
      /** Does this call of `core` wait, given what's known so far? */
      coreCallWaits: (call: P.ASTScopedMethodInvocation) => boolean
      /** Does "not yet" pass through a plain getter over a value that waits? */
      readsThroughSolid: boolean
    }
  ): void {
    this.hasFoundWaiting = true
    this.noteImportedWaiting(scope)
    const named = new Map<P.ASTMethodDefinition, string | undefined>()
    const getters = new Set<P.ASTMethodDefinition>()
    forEachNode(files, (node) => {
      if (node instanceof P.ASTPropertyDefinition && node.method) named.set(node.method, node.property.value)
      else if (node instanceof P.ASTPropertyDefinition && node.get) {
        named.set(node.get, node.property.value)
        getters.add(node.get)
      } else if (node instanceof P.ASTStaticMethod) named.set(node.method, node.name)
      else if (node instanceof P.ASTMethodDefinition && !named.has(node)) named.set(node, node.methodName)
      else if (isCoreCall(node) && (node as P.ASTMethodInvocation).methodName === "on") this.noteListener(node)
    })
    const allowed = new Map<P.ASTMethodDefinition, boolean>()
    for (const [method, name] of named) {
      method.waiting = false
      allowed.set(method, how.canWait(name, getters.has(method)))
    }
    const callWaits = (node: P.ASTNode) => {
      if (!(node instanceof P.ASTMethodInvocation)) return false
      if (isCoreCall(node)) return how.coreCallWaits(node as P.ASTScopedMethodInvocation)
      return this.waitingNames.has(node.methodName)
    }
    const mark = (method: P.ASTMethodDefinition, name: string | undefined) => {
      this.waitingMethods.add(method)
      method.waiting = true
      if (name) this.waitingNames.add(name)
      if (name && getters.has(method)) {
        this.waitedGetters.set(method, name)
        this.waitingValues.add(name)
      }
    }
    const readWaits = (node: P.ASTNode) => this.readsWaitingValue(node)
    let changed = true
    while (changed) {
      changed = false
      for (const [method, name] of named) {
        if (this.waitingMethods.has(method) || !allowed.get(method)) continue
        const byName = !!name && this.waitingNames.has(name)
        if (byName || method.isAsync || this.callsWaiting(method, callWaits)) {
          mark(method, name)
          changed = true
        } else if (!DRAWING_NAME.test(name ?? "") && this.callsWaiting(method, readWaits)) {
          if (!getters.has(method) || !how.readsThroughSolid) {
            mark(method, name)
            changed = true
          } else if (name && !this.waitingValues.has(name)) {
            this.waitingValues.add(name)
            changed = true
          }
        }
      }
    }
    const callOrReadWaits = (node: P.ASTNode) => callWaits(node) || readWaits(node)
    for (const method of named.keys()) if (method.isAsync) this.noteAwaited(method.body, callOrReadWaits)
    for (const file of files) for (const statement of file) this.noteHeldSteps(statement, callWaits)
    // the top level:  only what `core` itself always waits for, and on Solid an answer read there
    this.noteAwaited(
      files,
      (node) =>
        (isCoreCall(node) && P.CORE_CALLS_THAT_WAIT.has((node as P.ASTMethodInvocation).methodName)) ||
        (how.readsThroughSolid && readWaits(node))
    )
    if (how.readsThroughSolid) {
      forEachNode(files, (node) => {
        if (node instanceof P.ASTPropertyDefinition && node.method && DRAWING_NAME.test(node.property.value)) {
          this.noteDrawing(node)
        }
      })
    }
  }

  /** SIDE EFFECT:  notes `statement`, of a file's top level, or those of its group, if it's a call that waits. */
  protected noteHeldSteps(statement: P.ASTNode, callWaits: (node: P.ASTNode) => boolean): void {
    if (statement.constructor === P.ASTStatementGroup) {
      for (const each of (statement as P.ASTStatementGroup).statements ?? []) this.noteHeldSteps(each, callWaits)
    } else if (!isCoreCall(statement) && callWaits(statement)) this.heldSteps.add(statement)
    else if (this.togetherWaits(statement, (run) => run.isAsync)) this.heldSteps.add(statement)
  }

  /** Is `node` a read of a value that waits, by name?  Not a type's own value, `Card.Suits`. */
  readsWaitingValue(node: P.ASTNode): boolean {
    if (!(node instanceof P.ASTPropertyExpression) || unwrapped(node.object) instanceof P.ASTTypeExpression)
      return false
    return this.waitingValues.has(node.property.value)
  }

  /**
   * SIDE EFFECT:  notes where drawing `definition` reads what waits:
   * - a child value alone:  its own "…", `spotsThatWait`
   * - anywhere else, an `if` or an attribute:  the whole thing is held, `heldDrawings`
   * - not in a function inside it, a click's handler:  that's its own, and it waits when it's called
   */
  protected noteDrawing(definition: P.ASTPropertyDefinition): void {
    const reads = (node: unknown): boolean => {
      if (Array.isArray(node)) return node.some(reads)
      if (!(node instanceof P.ASTNode) || node instanceof P.ASTMethodDefinition) return false
      if (this.readsWaitingValue(node)) return true
      return Object.entries(node).some(([key, value]) => key !== "match" && reads(value))
    }
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit)
      if (!(node instanceof P.ASTNode) || node instanceof P.ASTMethodDefinition) return
      if (this.readsWaitingValue(node)) {
        this.heldDrawings.add(definition)
        return
      }
      if (!(node instanceof P.ASTJSXElement)) {
        for (const [key, value] of Object.entries(node)) if (key !== "match") visit(value)
        return
      }
      visit(node.attrs)
      for (const child of node.childValues) {
        if (child instanceof P.ASTJSXLiveValue && reads(child.expression)) {
          this.spotsThatWait.add(child).add(child.expression)
        } else visit(child)
      }
    }
    visit(definition.method!.body)
  }

  /**
   * `this`'s members `method`, a getter that waits, reads, by name, not in a function inside it:
   * so the value follows them, even read after its first wait (`core.waitedValue()`'s `follows`).
   */
  ownReadsOf(method: P.ASTMethodDefinition): P.ASTPropertyExpression[] {
    const found = new Map<string, P.ASTPropertyExpression>()
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit)
      if (!(node instanceof P.ASTNode) || node instanceof P.ASTMethodDefinition) return
      if (node instanceof P.ASTPropertyExpression && !this.readsWaitingValue(node)) {
        if (unwrapped(node.object) instanceof P.ASTSelfLiteral) found.set(node.property.value, node)
      }
      for (const [key, value] of Object.entries(node)) if (key !== "match") visit(value)
    }
    visit(method.body)
    return [...found.values()]
  }

  /** Does a handler of event `eventName`, dashed, wait?  A thing's `on_hit`, by name, or a listener of the program's. */
  eventWaits(eventName: string): boolean {
    if (this.waitingNames.has(`on_${eventName.replace(/-/g, "_")}`)) return true
    return !!this.listeners.get(eventName)?.some((listener) => this.waitingMethods.has(listener))
  }

  /** SIDE EFFECT:  notes the function `on(...)`, `node`, listens with -- see `listeners`. */
  protected noteListener(node: P.ASTNode): void {
    const [event, listener] = (node as P.ASTScopedMethodInvocation).args.args ?? []
    const eventName = event && quotedText(event)
    if (!eventName || !(listener instanceof P.ASTMethodDefinition)) return
    this.listeners.set(eventName, [...(this.listeners.get(eventName) ?? []), listener])
  }

  /** SIDE EFFECT:  notes what the project IMPORTS that waits, from its declarations:  Klondike's `turn face up`, from Cards. */
  protected noteImportedWaiting(scope: P.Scope | undefined): void {
    const imports = scope?.parentScope
    if (!(imports instanceof P.ImportScope)) return
    const methods = [...imports.methods.get(), ...imports.types.get().flatMap((type) => type.methods.get())]
    for (const method of methods) if (method.waits) this.waitingNames.add(method.name)
  }

  /** Does `method`'s own body call a function that waits?  Not counting a function inside it, which is its own. */
  protected callsWaiting(method: P.ASTMethodDefinition, callWaits: (node: P.ASTNode) => boolean): boolean {
    let found = false
    const visit = (node: unknown) => {
      if (found || node === undefined) return
      if (Array.isArray(node)) return node.forEach(visit)
      if (!(node instanceof P.ASTNode)) return
      // a function inside it is its own, e.g. a click's handler:  it waits when it's called, not now
      if (node instanceof P.ASTMethodDefinition && node !== method) return
      // ...but a loop runs its function right there, and a `where` its condition
      const isWaiting = (callback: P.ASTMethodDefinition) => this.waitingMethods.has(callback)
      if (callWaits(node) || this.functionWaits(node, isWaiting) || this.togetherWaits(node, isWaiting)) {
        found = true
        return
      }
      for (const [key, value] of Object.entries(node)) if (key !== "match") visit(value)
    }
    visit(method.body)
    return found
  }

  /** Is `node` one of `core`'s loops, or a `where`, whose function `waits` says yes to? */
  protected functionWaits(node: P.ASTNode, waits: (callback: P.ASTMethodDefinition) => boolean): boolean {
    if (!isCoreCall(node)) return false
    const { methodName, args } = node as P.ASTScopedMethodInvocation
    if (!P.CORE_LOOPS.has(methodName) && methodName !== "filter") return false
    const arg = args.args?.[1]
    const callback = arg && unwrapped(arg)
    return callback instanceof P.ASTMethodDefinition && waits(callback)
  }

  /** Is `node` `at the same time:`, or its loop, with a function that `waits` says yes to? */
  togetherWaits(node: P.ASTNode, waits: (run: P.ASTMethodDefinition) => boolean): boolean {
    if (!isCoreCall(node)) return false
    const { methodName, args } = node as P.ASTScopedMethodInvocation
    if (!P.CORE_TOGETHER.has(methodName)) return false
    return !!args.args?.some((arg) => {
      const run = unwrapped(arg)
      return run instanceof P.ASTMethodDefinition && waits(run)
    })
  }

  /** Is `node` a loop or a `where` to run one by one?  Its function waits. */
  waitsInTurn(node: P.ASTNode): boolean {
    return this.functionWaits(node, (callback) => callback.isAsync)
  }

  /**
   * SIDE EFFECT:  notes each call in `body` to write `await`, not in a function inside it:
   * - what `callWaits` says, except what's already said `wait for`
   * - a loop or a `where` whose function waits
   */
  protected noteAwaited(body: unknown, callWaits: (node: P.ASTNode) => boolean): void {
    const visit = (node: unknown, saidAwait = false) => {
      if (Array.isArray(node)) return node.forEach((item) => visit(item))
      if (!(node instanceof P.ASTNode) || node instanceof P.ASTMethodDefinition) return
      if (node instanceof P.ASTAwaitExpression) return visit(unwrapped(node.expression), true)
      const waits = callWaits(node) || this.waitsInTurn(node) || this.togetherWaits(node, (run) => run.isAsync)
      if (!saidAwait && waits && !this.heldSteps.has(node)) this.awaited.add(node)
      for (const [key, value] of Object.entries(node)) if (key !== "match") visit(value)
    }
    visit(body)
  }

  /**
   * What `files`' statements say, and the import layer above `scope`, if any -- see the class docs.
   * - And what `scope`'s project says of its types, from their records.
   *   - For ONE file written alone (the editor's view of a file, `JSWriter.writeMatch()`):
   *     a type another of its files declares is known as an imported one is.
   */
  static of(files: P.ASTNode[][], scope?: P.Scope): WriterProject {
    const project = new WriterProject()
    const projectLayers: P.Scope[] = []
    for (let layer = scope; layer; layer = layer.parentScope) {
      if (layer instanceof P.ImportScope) project.noteTypes(layer)
      else if (layer instanceof P.ProjectScope || layer instanceof P.FileScope) projectLayers.push(layer)
      else if (layer instanceof P.RootScope) project.noteBuiltInTypes(layer)
    }
    const classes = new Map<string, P.ASTClassDeclaration>()
    for (const statements of files) {
      for (const statement of statements) {
        forEachNode(statement, (node) => {
          if (node instanceof P.ASTClassDeclaration) classes.set(node.type.name, node)
          else if (node instanceof P.ASTAssignmentStatement && !node.isNewVariable) {
            if (node.thing instanceof P.ASTVariableExpression) project.reassigned.add(node.thing.name)
          } else if (node instanceof P.ASTDestructuredAssignment && !node.isNewVariable) {
            for (const variable of node.variables) project.reassigned.add(variable.name)
          }
        })
      }
    }
    for (const layer of projectLayers) project.noteTypes(layer, classes)
    for (const statements of files) project.moveMembers(statements, classes)
    for (const declaration of classes.values()) project.noteClass(declaration, classes)
    project.noteGivenValues(files, { methods: [] })
    project.noteUndeclared(classes)
    for (const statements of files) project.noteModuleValues(statements)
    return project
  }

  /**
   * Does the built-in class `typeName` comes from have member `name`, e.g. `id` for `Person`, from `Thing`?
   * - Walks up to the first built-in class:  `Person` => `Thing`, `Pile` => `List`.
   */
  isBuiltInMember(typeName: string, name: string): boolean {
    for (let type: string | undefined = typeName; type; type = this.superTypes.get(type)) {
      const builtIn = this.builtInTypes.get(type)
      if (builtIn) return !!builtIn.getMember(name)
    }
    return false
  }

  /** Does a class ABOVE class `typeName` declare member `name`, e.g. a card's `color` getter, above a joker? */
  isInherited(typeName: string, name: string): boolean {
    for (let type = this.superTypes.get(typeName); type; type = this.superTypes.get(type)) {
      if (this.members.get(type)?.has(name)) return true
    }
    return false
  }

  /** Class `typeName`'s property `name`, its own or a super-type's -- `undefined` if it has none. */
  propertyOf(typeName: string | undefined, name: string): P.ASTReactiveProperty | undefined {
    for (let type = typeName; type; type = this.superTypes.get(type)) {
      const property = this.properties.get(type)?.get(name)
      if (property) return property
    }
    return undefined
  }

  /** Is class `typeName` a spell `List`, or one of its sub-classes, e.g. `Pile`, `Tableau`? */
  isListClass(typeName: string | undefined): boolean {
    return WriterProject.LIST_CLASSES.some((list) => this.isSubclassOf(typeName, list))
  }

  /** Spell's built-in list classes:  `List`, and `ViewableList`, a list drawn as its own element. */
  static LIST_CLASSES = ["List", "ViewableList"]

  /** Is class `typeName` class `ancestor`, or below it, e.g. a `DiscardPile` a `Pile`? */
  isSubclassOf(typeName: string | undefined, ancestor: string): boolean {
    for (let type = typeName; type; type = this.superTypes.get(type)) {
      if (type === ancestor) return true
    }
    return false
  }

  /** Class `typeName`'s getter `name`, its own or a super-type's -- `undefined` if it has none. */
  getterOf(typeName: string | undefined, name: string): P.ASTMethodDefinition | undefined {
    for (let type = typeName; type; type = this.superTypes.get(type)) {
      const getter = this.getterMethods.get(type)?.get(name)
      if (getter) return getter
    }
    return undefined
  }

  /** Is `typeName` a class the project declares or imports, e.g. `Tableau`? */
  isClass(typeName: string): boolean {
    return this.members.has(typeName) || this.importedMembers.has(typeName)
  }

  /** SIDE EFFECT:  notes each variable `statements` set at the top of a file, in `moduleValues`.  Looks inside groups. */
  private noteModuleValues(statements: P.ASTNode[]) {
    for (const statement of statements) {
      if (statement instanceof P.ASTStatementGroup && !(statement instanceof P.ASTTryCatchBlock)) {
        this.noteModuleValues(statement.statements ?? [])
      } else if (statement instanceof P.ASTAssignmentStatement && statement.isNewVariable) {
        if (statement.thing instanceof P.ASTVariableExpression)
          this.moduleValues.set(statement.thing.name, statement.value)
      }
    }
  }

  /** Class `typeName`'s item type, its own or a super-type's, e.g. `Card` for a `Tableau`, which is a `Pile`. */
  itemTypeOf(typeName: string | undefined): string | undefined {
    for (let type = typeName; type; type = this.superTypes.get(type)) {
      const itemType = this.itemTypes.get(type)
      if (itemType) return itemType
    }
    return undefined
  }

  /**
   * The list `oneOf` names, if it's one we hoist, e.g. `Card.Ranks` -- see `lists`.
   * - Or read when set, `() => Deck.Suits`:  for a list on a class further down.
   */
  listFor(oneOf: P.ASTExpression | undefined): TSList | undefined {
    const list = oneOf && listNamedBy(oneOf)
    if (!(list instanceof P.ASTPropertyExpression) || !(list.object instanceof P.ASTTypeExpression)) return undefined
    return this.lists.get(`${list.object.name}.${list.property.value}`)
  }

  ////////////////
  // ## Working it out
  ////////////////

  /** SIDE EFFECT:  notes each built-in runtime class's type in `root`, in `builtInTypes`. */
  private noteBuiltInTypes(root: P.RootScope) {
    for (const [datatype, className] of Object.entries(P.BUILT_IN_CLASS_NAMES)) {
      const type = root.types.get(datatype, "LOCAL_ONLY")
      if (type) this.builtInTypes.set(className, type)
    }
  }

  /**
   * SIDE EFFECT:  notes what the types `layer` declares say they have.
   * - Each type NOT in `written` (the classes the files declare), and not noted already, is noted as imported:
   *   its members in `importedMembers`, its super-type in `superTypes`.
   * - The kind of a property's values in `propertyKinds` instead:  it has no class.
   */
  private noteTypes(layer: P.Scope, written = new Map<string, P.ASTClassDeclaration>()) {
    for (const type of layer.types?.get() ?? []) {
      // a property's kind, e.g. `CardSuit`:  no class, only its list -- see `propertyKinds`
      const { valueKind } = type
      if (valueKind?.property) {
        this.propertyKinds.set(type.name, `${valueKind.listOn}.${valueKind.listName}`)
        continue
      }
      const members = new Set<string>()
      for (const method of type.methods?.get() ?? []) members.add(method.name)
      for (const variable of type.variables?.get() ?? []) {
        members.add(variable.name)
        if (variable.exclusive) this.owners.add(`${type.name}.${variable.name}`)
      }
      if (written.has(type.name) || this.importedMembers.has(type.name)) continue
      this.importedMembers.set(type.name, members)
      if (type.superType) this.superTypes.set(type.name, type.superType)
    }
  }

  /**
   * SIDE EFFECT:  notes each member in `statements` written outside a class in `classes`,
   * and the comments right above it, into `movedMembers` and `moved`.
   * - Looks inside groups, never inside a class or a method.
   */
  private moveMembers(statements: P.ASTNode[], classes: Map<string, P.ASTClassDeclaration>) {
    let comments: Array<P.ASTComment | P.ASTBlankLine> = []
    for (const statement of statements) {
      if (statement instanceof P.ASTComment) {
        comments.push(statement)
        continue
      }
      if (statement instanceof P.ASTBlankLine) {
        comments = []
        continue
      }
      const member = statement instanceof P.ASTPatchedMember ? statement.member : statement
      if (member instanceof P.ASTClassMember && classes.has(member.typeName)) {
        const moved = this.movedMembers.get(member.typeName) ?? []
        if (moved.length) moved.push(new P.ASTBlankLine(member.match))
        moved.push(...comments, member)
        this.movedMembers.set(member.typeName, moved)
        for (const comment of comments) this.moved.add(comment)
        this.moved.add(statement)
      } else if (statement instanceof P.ASTStatementGroup && statement.statements) {
        this.moveMembers(statement.statements, classes)
      }
      comments = []
    }
  }

  /** SIDE EFFECT:  notes `declaration`'s item type, and the lists its properties' values come from. */
  private noteClass(declaration: P.ASTClassDeclaration, classes: Map<string, P.ASTClassDeclaration>) {
    if (declaration.superType) this.superTypes.set(declaration.type.name, declaration.superType.name)
    const members = [...(declaration.members ?? []), ...(this.movedMembers.get(declaration.type.name) ?? [])]
    for (const member of members) {
      if (member instanceof P.ASTStaticDefinition && isListLiteral(member.value)) {
        this.staticLists.add(`${declaration.type.name}.${member.name}`)
      }
      if (member instanceof P.ASTStaticDefinition && member.name === "instanceType") {
        if (member.value instanceof P.ASTTypeExpression) this.itemTypes.set(declaration.type.name, member.value.name)
      }
      // read when made, for an item class further down:  `static get instanceType() { return Card }`
      if (member instanceof P.ASTStaticMethod && member.getter && member.name === "instanceType") {
        const returned = listNamedBy(member.method)
        if (returned instanceof P.ASTTypeExpression) this.itemTypes.set(declaration.type.name, returned.name)
      }
      if (member instanceof P.ASTPropertyDefinition && member.get) {
        const getters = this.getterMethods.get(declaration.type.name) ?? new Map()
        this.getterMethods.set(declaration.type.name, getters.set(member.property.value, member.get))
      }
      if (!(member instanceof P.ASTReactiveProperty)) continue
      const own = this.properties.get(declaration.type.name) ?? new Map()
      this.properties.set(declaration.type.name, own.set(member.property.value, member))
      const oneOf = member.check?.properties?.find(
        (property): property is P.ASTObjectLiteralProperty =>
          property instanceof P.ASTObjectLiteralProperty && property.property.value === "oneOf"
      )?.value
      this.noteList(oneOf, member, classes)
    }
  }

  /** SIDE EFFECT:  notes in `undeclared` what each class gets for TypeScript only -- see there. */
  private noteUndeclared(classes: Map<string, P.ASTClassDeclaration>) {
    // what each class declares itself, by name:  its properties, getters and methods
    const declared = this.members
    // each method name, and the classes defining it
    const definedBy = new Map<string, Array<{ type: string; method: P.ASTMethodDefinition }>>()
    for (const [type, declaration] of classes) {
      const names = new Set<string>()
      for (const member of [...(declaration.members ?? []), ...(this.movedMembers.get(type) ?? [])]) {
        if (!(member instanceof P.ASTReactiveProperty || member instanceof P.ASTPropertyDefinition)) continue
        names.add(member.property.value)
        if (member instanceof P.ASTPropertyDefinition && member.method) {
          const defining = definedBy.get(member.property.value) ?? []
          definedBy.set(member.property.value, [...defining, { type, method: member.method }])
        }
      }
      declared.set(type, names)
    }
    for (const [type, members] of this.importedMembers) declared.set(type, new Set(members))
    // a class's chain:  itself and the classes above it, ours, then an imported one, e.g. `Tableau`, `Pile`
    const chainOf = (type: string) => {
      const chain: string[] = []
      for (let it: string | undefined = type; it && declared.has(it); it = this.superTypes.get(it)) chain.push(it)
      return chain
    }
    const shared = (types: string[]) =>
      chainOf(types[0]!).find((it) => types.every((type) => chainOf(type).includes(it)))
    const isDeclaredAbove = (type: string, name: string) =>
      chainOf(type).some((it) => declared.get(it)?.has(name)) || this.isBuiltInMember(type, name)
    const add = (type: string, undeclared: TSUndeclared) => {
      this.undeclared.set(type, [...(this.undeclared.get(type) ?? []), undeclared])
      declared.get(type)!.add(undeclared.name)
    }

    // values given when one is made:  `new Foundation({ symbol: "♣️" })`
    for (const [name, given] of this.givenValues) {
      const made = new Set(given.flatMap((it) => (it.made && classes.has(it.made) ? [it.made] : [])))
      const type = made.size ? shared([...made]) : undefined
      if (type && !isDeclaredAbove(type, name)) add(type, { name, isValue: true })
    }

    // a method two or more classes define, which the class they share doesn't
    for (const [name, defining] of definedBy) {
      if (defining.length < 2) continue
      const type = shared(defining.map((it) => it.type))
      if (type && !isDeclaredAbove(type, name)) add(type, { name, method: defining[0]!.method, definitions: defining })
    }
  }

  /**
   * SIDE EFFECT:  notes in `givenValues` each value `node`, and everything under it, gives a member,
   * with `where` it's given:  in which class, inside which methods.
   */
  private noteGivenValues(node: unknown, where: ProgramPlace) {
    if (Array.isArray(node)) {
      for (const item of node) this.noteGivenValues(item, where)
      return
    }
    if (!(node instanceof P.ASTNode)) return
    if (node instanceof P.ASTClassDeclaration) where = { ...where, typeName: node.type.name }
    else if (node instanceof P.ASTClassMember) where = { ...where, typeName: node.typeName }
    else if (node instanceof P.ASTMethodDefinition) where = { ...where, methods: [...where.methods, node] }
    else if (node instanceof P.ASTNewInstanceExpression) {
      for (const property of node.props?.properties ?? []) {
        if (!(property instanceof P.ASTObjectLiteralProperty) || !property.value) continue
        this.noteGiven(property.property.value, { value: property.value, made: node.type.name, where })
      }
    } else if (node instanceof P.ASTAssignmentStatement && node.thing instanceof P.ASTPropertyExpression) {
      const { object, property } = node.thing
      this.noteGiven(property.value, { value: node.value, object, where })
    }
    for (const [key, value] of Object.entries(node)) {
      if (key !== "match") this.noteGivenValues(value, where)
    }
  }

  /** SIDE EFFECT:  notes `given`, a value the program gives member `name`, in `givenValues`. */
  private noteGiven(name: string, given: GivenValue) {
    this.givenValues.set(name, [...(this.givenValues.get(name) ?? []), given])
  }

  /**
   * SIDE EFFECT:  notes the list `oneOf` names in `lists`, if it's a list of values on a class of ours,
   * e.g. `Card.Ranks`, `static Ranks = ['ace', 2, ...]` -- named for `property`, the first that uses it.
   */
  private noteList(
    oneOf: P.ASTExpression | undefined,
    property: P.ASTReactiveProperty,
    classes: Map<string, P.ASTClassDeclaration>
  ) {
    const list = oneOf && listNamedBy(oneOf)
    if (!(list instanceof P.ASTPropertyExpression) || !(list.object instanceof P.ASTTypeExpression)) return
    const owner = list.object.name
    const key = `${owner}.${list.property.value}`
    if (this.lists.has(key)) return
    const ownerMembers = [...(classes.get(owner)?.members ?? []), ...(this.movedMembers.get(owner) ?? [])]
    const definition = ownerMembers.find(
      (member): member is P.ASTStaticDefinition =>
        member instanceof P.ASTStaticDefinition && member.name === list.property.value
    )
    if (!definition || !isListLiteral(definition.value)) return

    const taken = new Set([...classes.keys(), ...[...this.lists.values()].map((it) => it.type)])
    // read where it lives, in its class:  `Card.Directions` (Owen, epic page `outline-spell`, P26)
    const constant = `${owner}.${definition.name}`
    const type = typeCaseOf(property.property.value)
    const hoisted = { definition, owner, constant, type: taken.has(type) ? undefined : type }
    this.lists.set(key, hoisted)
    if (classes.has(type)) this.valueKinds.set(type, hoisted)
  }
}

/**
 * A list a property's values come from, typed where it lives, in its class:
 * ```
 * export type Rank = (typeof Card.Ranks)[number]
 * export class Card extends Thing {
 *   static Ranks = ["ace", 2, ...] as const
 *   @prop({ oneOf: () => Card.Ranks })
 * ```
 * - `oneOf` is read when a value is set:  a decorator's arguments run while its class is being made,
 *   so `@prop({ oneOf: Card.Ranks })` couldn't read `Card` yet.
 * - It was a constant above the class, `const RANKS`, until epic page `outline-spell` P26:
 *   Owen, "`DIRECTIONS` should only be defined as Card.Directions".
 */
export type TSList = {
  /** Its `static` in its class, e.g. `static Ranks = [...]`:  its values. */
  definition: P.ASTStaticDefinition
  /** The class it's in, e.g. `Card`. */
  owner: string
  /** Where it's read, e.g. `Card.Ranks`, in spell's names:  a writer names it its way, `TSWriter.listRef()`. */
  constant: string
  /** The type of one of its values, e.g. `Rank`;  none if that name's taken:  `(typeof Card.Ranks)[number]` instead. */
  type: string | undefined
}

/**
 * A member a class gets for TypeScript only:  see `WriterProject.undeclared`.  The javascript doesn't change.
 * - A value given when one is made:  `declare symbol: string` in its class.
 * - A method:  merged in after its class, `export interface Pile { canPickUpCard(card: Card): boolean }`.
 *   A `declare` property would clash with the classes below that define it as a method.
 */
export type TSUndeclared = {
  /** Its name, spell's. */
  name: string
  /** A value given when one is made:  typed by every value the program gives it -- see `WriterProject.givenValues`. */
  isValue?: boolean
  /** For a method:  one class's definition of it, typing its parameters. */
  method?: P.ASTMethodDefinition
  /** For a method:  each class defining it, with its definition there.  What they all return types it (Q54). */
  definitions?: Array<{ type: string; method: P.ASTMethodDefinition }>
}

/**
 * A value the program gives a member -- see `WriterProject.givenValues`.
 * - Given when one is made:  `a new stock-pile with name = "stock"`.
 * - Set on one:  `set the name of the pile to ...`.
 */
export type GivenValue = {
  /** The value given, e.g. `"stock"`. */
  value: P.ASTExpression
  /** Given when one is made:  the class made, e.g. `StockPile`. */
  made?: string
  /** Set on one:  what it's set on, e.g. `the pile`. */
  object?: P.ASTExpression
  /** Where it's given:  so the writer can tell what `object` and `value` are. */
  where: ProgramPlace
}

/** Where in a program something is:  in which class's members, if any, and inside which methods. */
export type ProgramPlace = {
  /** The class whose member it's in, e.g. `Tableau`:  what `this` is there. */
  typeName?: string
  /** The methods it's inside, outermost first:  their parameters are known there. */
  methods: P.ASTMethodDefinition[]
}

////////////////
// ## Helpers
////////////////

/**
 * Call `callback` for `node` and every AST node under it:  its fields, and arrays of them.
 * - Skips `match`, and anything that isn't an AST node, e.g. a scope record (`ASTVariableExpression.variable`).
 */
/** `node`'s text, when it's text written out:  a quoted name, e.g. an event's. */
/**
 * A drawing's name:  `draw`, a slot's `drawFront`, a list's `draw_each_item`.
 * - NOT an action that says draw:  `to draw a card` is `draw_card`, and may wait.
 */
export const DRAWING_NAME = /^draw(?:$|[A-Z]|_each_item$|_its_placeholder$)/

export function quotedText(node: P.ASTExpression): string | undefined {
  const inner = unwrapped(node)
  const literal = inner instanceof P.ASTQuotedExpression ? inner.expression : inner
  return literal instanceof P.ASTStringLiteral ? literal.value : undefined
}

export function forEachNode(node: unknown, callback: (node: P.ASTNode) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) forEachNode(item, callback)
    return
  }
  if (!(node instanceof P.ASTNode)) return
  callback(node)
  for (const [key, value] of Object.entries(node)) {
    if (key !== "match") forEachNode(value, callback)
  }
}

/**
 * The list a `oneOf` check names:  `value` itself, or what it returns when it's read when set, `() => Deck.Suits`.
 */
export function listNamedBy(value: P.ASTExpression): P.ASTExpression {
  if (!(value instanceof P.ASTMethodDefinition)) return value
  const [returned] = value.body.statements ?? []
  return returned instanceof P.ASTReturnStatement && returned.value ? returned.value : value
}

/** Is `value` a list written out, e.g. `['ace', 2, ...]`? */
function isListLiteral(value: P.ASTExpression): boolean {
  return value instanceof P.ASTArrayLiteral || value instanceof P.ASTEnumeration || value instanceof P.ASTListExpression
}

/** `Ranks` => `RANKS`, `Short_Names` => `SHORT_NAMES`, `ShortNames` => `SHORT_NAMES`. */
export function constantCaseOf(name: string): string {
  return name.replace(P.CAMEL_WORD_BOUNDARY, "_").replace(/[$_]+/g, "_").toUpperCase()
}

/** `rank` => `Rank`, `short_suit` => `ShortSuit`. */
export function typeCaseOf(name: string): string {
  const camel = camelCaseOf(name)
  return camel.charAt(0).toUpperCase() + camel.slice(1)
}

/**
 * Spell's `name` in camelCase, as javascript and TypeScript write every name (`JSWriter.nameOf()`):
 * `is_a_$suit` => `isASuit`, `turn_face_up` => `turnFaceUp`, `it_2` => `it2`.
 * - `$` marks where a value goes in a spell name:  dropped, as `_` is.
 * - A name with neither is as is, e.g. `play`, `Card`.
 */
export function camelCaseOf(name: string): string {
  if (!/[_$]/.test(name)) return name
  const [first = "", ...rest] = name.split(/[_$]+/).filter(Boolean)
  return first + rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("")
}
