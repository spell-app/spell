import { kebabCase, proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Wording } from "spell-parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement, type SpellStatementProps } from "spell-parser/spell/rules/Statement"
import { SubjectRule } from "spell-parser/spell/rules/types"
import { DynamicMethodRule } from "./DynamicMethodRule"
import { MethodInfixRule } from "./MethodInfixRule"
import { MethodPostfixRule } from "./MethodPostfixRule"
import type { MethodSignatureData } from "./methods.shared"

/**
 * Base for method-DEFINITION rules built on `method_signature`:
 * `to_do_something`, `create_animation` and `quoted_type_expression`.  See `to_do_something`.
 * - Turns a parsed signature into one of:
 *   - a loose function
 *   - an instance method, when a captured type is promoted via `inlineInitialType`
 *   - a postfix/infix expression (`quoted_type_expression` only)
 * - Also registers the generated call-site rule (`getRule()`) onto `scope.parser` (`mutateScope()`),
 *   so the new syntax is usable immediately after the definition.
 * - Generic pass-through:  each subclass has its own `signature` group typing,
 *   e.g. `ToDoSomething extends MethodDefinition<"asTest?|signature|body?">`.
 *   - `MethodDefinitionData` is ALWAYS added on top of whatever `MatchData` a subclass declares:
 *     its `signature` is the processed, cached result of `getSignature()`.
 */
export class MethodDefinition<
  Groups extends string | P.AnyGroups = P.AnyGroups,
  MatchData extends P.AnyMatchData = P.AnyMatchData
> extends SpellStatement<Groups, MatchData & MethodDefinitionData> {
  /**
   * `true` to promote the signature's FIRST captured type arg (e.g. `(a card)`)
   * into an instance-method receiver instead of a call argument:  see `processSignature()`.
   * - Defaults `false`;  `to_do_something` and `create_animation` turn it on.
   */
  declare inlineInitialType: boolean
  @proto static inlineInitialType = false
  /** TYPE-ONLY: props `parser.addRule()` accepts for this rule -- see `P.Rule`'s `Props`. */
  declare readonly Props: MethodDefinitionProps

  /**
   * Promote a captured type argument to an instance-method receiver (`thisArg`), when `inlineInitialType`.
   * - Only converts the FIRST type found that isn't `isSimple`:
   *   a real declared type, not a primitive like `text` / `number`.
   *   - So a typed parameter before it doesn't stop it (epic `output-targets`, Q24:  spell asks for that type):
   *     `to append (digit as text) to (a calculator)` is still `Calculator.append_$digit_to_calculator(digit)`.
   *   - It used to be the FIRST type, simple or not:  a free function, whose `its` read a `this` it hadn't got.
   * - The method's NAME drops the type, unless that leaves a little word dangling (epic `output-targets`, Q44).
   *   - Then it keeps the type's name:
   *     `to update the total of (a calculator)` => `update_the_total_of_calculator`, not `update_the_total_of`.
   *     See `isDangling()`:  the language's `danglingWords`.
   *   - Nothing dangles with the receiver first:  `to move (a card) to (a pile)` => `move_to_$pile`.
   *   - These are spell's names:  compiled javascript says them in camelCase, `moveToPile()` (`JSWriter.nameOf()`).
   * - SIDE EFFECT: mutates `signature` in place:
   *   - removes the type's arg / method / syntax bits, and replaces the syntax bit with `{thisArg:expression}`
   *   - adds an alias variable when the arg's own name differs from the type name,
   *     e.g. `to show (thing as a card)` aliases `thing` to `this`
   * - Also promotes to a `test` method when `asTest`:
   *   prefixes `test` onto the method name, and the word it was written with (`test`, `probar`) onto its syntax.
   * - In a type's outline body, a signature that names no type is the type's own:  see `takeSubject()`.
   */
  processSignature(groups: P.MatchGroups, signature: MethodSignatureData, scope: P.Scope): MethodSignatureData {
    const initialType = signature.types.find((type) => !type.isSimple)
    const subject = this.inlineInitialType && !initialType ? P.SubjectScope.of(scope)?.subjectType : undefined
    if (subject) {
      MethodDefinition.takeSubject(signature, subject, scope)
    } else if (this.inlineInitialType && initialType) {
      signature.instanceType = initialType.name
      // remove instance bits from args and method signature
      signature.args.splice(initialType.argIndex, 1)
      const wordBefore = signature.methodBits[initialType.methodIndex - 1]
      if (wordBefore && isDangling(wordBefore, scope)) {
        // keep the type's name in its place, as a word:  `of_calculator`, not `of_$calculator`
        signature.methodBits[initialType.methodIndex] = initialType.name.replace(/-/g, "_")
      } else {
        signature.methodBits.splice(initialType.methodIndex, 1)
      }
      // replace in syntax with `thisArg` and add a variable alias for `this`
      signature.syntaxBits[initialType.syntaxIndex] = "{thisArg:expression}"
      if (initialType.varName && initialType.varName !== initialType.name) {
        signature.extraVars.push({ name: initialType.varName, output: "this", type: "alias" })
      }
    }
    // `draw()` or `create()`, whatever the language's words for them:  see `hookOf()`
    const hook = signature.instanceType ? MethodDefinition.hookOf(signature.methodBits, scope) : undefined
    if (hook) signature.methodBits = [hook]
    const { asTest } = groups as { asTest?: P.Match }
    if (asTest) {
      // its name is spell's own, `test_...`;  its call says the language's word, as written:  `probar ...` in Spanish
      signature.methodBits.unshift("test")
      signature.syntaxBits.unshift(`${asTest.raw ?? asTest.value}`.toLowerCase())
    }
    return signature
  }

  /**
   * The hook a type's method is, by its words with its type taken out:  `draw` or `create`, else `undefined`.
   * - Then the method is the type's drawing, `draw()`, or what runs as one is made, `create()`,
   *   whatever the language's verb (epic `spanish` J84, J96).
   * - Spanish's sentence style:  `para dibujar una carta:` => `Carta.prototype.draw`, as `- para dibujarla:` is;
   *   `para crear un mazo:` and `- para crearlo:` => `create()`.
   *   Its words alone would make `dibujar()` or `crear()`, which nothing calls.
   * - Read by the `draw_method` and `create_method` word rules, the words then the language's word for `it`
   *   as an object (`dibujar eso`):  English's `draw` and `create` are the hooks' names already.
   */
  static hookOf(methodBits: string[], scope: P.Scope): Hook | undefined {
    const words = methodBits.join(" ")
    if (!words) return undefined
    const itWords = SP.Language.of(scope).words.itWords ?? []
    return HOOKS.find(({ ruleName, hook }) => {
      if (!scope.parser?.rules[ruleName]) return false
      return [...itWords].some((it) => Wording.reads(scope, ruleName, `${words} ${it}`, hook))
    })?.hook
  }

  /**
   * A method in a type's outline body that names no type is the type's own (epic page `outline-spell`, P20, I15).
   * - `- to debug it:` is `to debug a solitaire`:  `it` is where the receiver goes, `debug the solitaire`.
   *   - After a little word, the method's name keeps the type's:  `- to cheat at it:` => `cheat_at_solitaire`.
   * - `it` is the language's word for the subject, `subject_it`:  see `SubjectRule.reads()`.
   * - With no `it`, `- animation deal the cards:` takes its receiver after `of`:  `deal the cards of the solitaire`.
   *   - `of` is the language's word, the `receiver_of` word rule's syntax:  `(de|del)` in Spanish.
   *   - One word reads as a verb, so the receiver comes straight after:  `- to reset:` is `reset the solitaire`.
   *   - And inside the type's own methods, the words alone call it on this one:  `deal the cards`.
   *     So its receiver is optional:  `deal the cards (of {thisArg:expression})?`.
   * - SIDE EFFECT: mutates `signature` in place, as `processSignature()` does.
   */
  static takeSubject(signature: MethodSignatureData, subject: P.TypeScope, scope: P.Scope): void {
    // in the words a signature names a type with, `stock-pile`, as `(a stock pile)` gives
    const typeWords = kebabCase(subject.name).replace(/^-/, "")
    signature.instanceType = typeWords
    const isSubjectWord = (bit: string) =>
      !/^[{(]/.test(bit) && SubjectRule.reads(scope, "subject_it", scope.parser?.tokenize(bit)?.[0])
    MethodDefinition.splitFusedIt(signature, scope)
    const at = signature.syntaxBits.findIndex((bit) => bit === FUSED_IT || isSubjectWord(bit))
    const methodAt = signature.methodBits.findIndex((bit) => bit === FUSED_IT || isSubjectWord(bit))
    const isFused = signature.syntaxBits[at] === FUSED_IT
    if (at >= 0 && methodAt >= 0) {
      const wordBefore = signature.methodBits[methodAt - 1]
      if (wordBefore && isDangling(wordBefore, scope)) {
        signature.methodBits[methodAt] = typeWords.replace(/-/g, "_")
      } else {
        signature.methodBits.splice(methodAt, 1)
      }
      // fused, its receiver may be left out inside the type's own methods, as `subject_implied` leaves out `it`:
      // `voltear boca arriba` turns this one -- see `DynamicMethodRule.onThis()`
      signature.syntaxBits[at] = isFused ? "{thisArg:expression}?" : "{thisArg:expression}"
      return
    }
    // one word reads as a verb, `reset the solitaire`;  more, as a phrase, `deal the cards of the solitaire`
    // -- and left out, the call is on this one:  see `DynamicMethodRule.onThis()`
    if (signature.syntaxBits.length === 1) signature.syntaxBits.push("{thisArg:expression}?")
    else signature.syntaxBits.push(`(${scope.getRuleOrDie("receiver_of").syntax} {thisArg:expression})?`)
  }

  /**
   * A method's first word with `it` fused onto it (`SP.LanguageWords.fusedIt`), split in two:
   * the verb, then a marker where `it` was, which `takeSubject()` puts the receiver in place of.
   * - e.g. Spanish's `- para barajarla:` => `barajar`, then the receiver:  `barajar el mazo`
   * - e.g. `- para voltearla boca arriba:` => `voltear {thisArg:expression}? boca arriba`, as English's
   *   `- to turn it face up:`
   * - Only the FIRST word, the verb:  a later word ending so is a word (`perla`).
   * - SIDE EFFECT: mutates `signature` in place.
   */
  private static splitFusedIt(signature: MethodSignatureData, scope: P.Scope): void {
    const { fusedIt } = SP.Language.of(scope).words
    if (!fusedIt) return
    const [firstMethod] = signature.methodBits
    const [firstSyntax] = signature.syntaxBits
    if (!firstMethod || !firstSyntax || /^[{(]/.test(firstSyntax)) return
    const verb = fusedIt.exec(firstSyntax)?.[1]
    if (!verb) return
    signature.methodBits.splice(0, 1, verb.toLowerCase(), FUSED_IT)
    signature.syntaxBits.splice(0, 1, verb.toLowerCase(), FUSED_IT)
  }

  /**
   * Compute (and cache in `match.data.signature`) the processed method signature -- see `computeSignature()`.
   */
  getSignature(match: P.MatchFor<this>): MethodSignatureData | undefined {
    return (match.data.signature ??= this.computeSignature(match))
  }

  /**
   * Process the matched `signature` sub-match into a flattened `MethodSignatureData`:
   * runs `processSignature()`, then joins `methodBits` / `syntaxBits` into final `methodName` / `syntax` strings.
   * - Bails (`undefined`) if `signature` didn't match at all, e.g. a quoted-signature parse failed upstream.
   * - `signature` is a REQUIRED group on every `MethodDefinition` subclass
   *   (`to_do_something`, `create_animation`, `quoted_type_expression`),
   *   but `Groups` is generic here, so TS can't see that structurally:  cast once.
   * - SIDE EFFECT: mutates (and returns) the `method_signature` match's OWN `data` object in place:
   *   `processSignature()` splices its `args` / `methodBits` / `syntaxBits`.
   *   - So this must run exactly once per match.
   *   - `getSignature()`'s `??=` caching is what guarantees that.
   */
  private computeSignature(match: P.MatchFor<this>): MethodSignatureData | undefined {
    const signatureMatch = (match.groups as { signature?: P.Match }).signature
    if (!(signatureMatch instanceof P.Match)) return undefined
    const signature = this.processSignature(
      match.groups as P.MatchGroups,
      signatureMatch.data as MethodSignatureData,
      match.scope
    )
    signature.methodName = MethodDefinition.contractedName(signature.methodBits.join("_"), match.scope)
    signature.syntax = MethodDefinition.withContractions(signature.syntaxBits, match.scope).join(" ")
    return signature
  }

  /**
   * A method's name with each little word's pair contracted:  `dar_la_vuelta_a_el_mazo` => `dar_la_vuelta_al_mazo`,
   * so either way of writing it makes ONE method (`SP.LanguageWords.contractions`, epic `spanish` J96).
   */
  static contractedName(name: string, scope: P.Scope): string {
    const { contractions } = SP.Language.of(scope).words
    if (!contractions) return name
    return Object.entries(contractions).reduce(
      (named, [short, expanded]) =>
        named.replace(new RegExp(`(^|_)${expanded.replace(/ /g, "_")}(?=_|$)`, "giu"), `$1${short}`),
      name
    )
  }

  /**
   * A call's syntax bits, where each little word takes its contraction too (`SP.LanguageWords.contractions`):
   * so a method's words and its calls may say either (epic `spanish` J96).
   * - `al` => `(al|a el)`, and `a el` => `(a el|al)`:  `dar la vuelta al mazo` is called `dar la vuelta a el mazo`
   * - `a` before an argument => `(a|al)`:  `mover (una carta) a (una pila)` is called `mover la carta al montón`,
   *   as the argument then starts with its own `el`, `el montón`, which the call folds into `al`.
   * - A copy:  `bits` stay as they were, which `getRule()` and `callAhead()` both read through `syntax`.
   */
  static withContractions(bits: string[], scope: P.Scope): string[] {
    const { contractions } = SP.Language.of(scope).words
    if (!contractions) return bits
    const isSlot = (bit: string | undefined) => !!bit && /^[{(]/.test(bit)
    const result: string[] = []
    for (let index = 0; index < bits.length; index++) {
      const bit = bits[index]!
      const next = bits[index + 1]
      const word = bit.toLowerCase()
      const contracted = Object.entries(contractions).find(([, expanded]) => expanded === `${word} ${next}`)?.[0]
      const startsOne = Object.entries(contractions).find(([, expanded]) => expanded.startsWith(`${word} `))?.[0]
      if (contractions[word]) result.push(`(${bit}|${contractions[word]})`)
      else if (contracted) {
        result.push(`(${bit} ${next}|${contracted})`)
        index++
      } else if (startsOne && isSlot(next)) result.push(`(${bit}|${startsOne})`)
      else result.push(bit)
    }
    return result
  }

  /**
   * Build the `MethodScope` for the method body.
   * - Adds `args` as scope variables, each with its datatype.
   * - When `processSignature()` set `instanceType`, aliases `it` to `this` via `mapItTo`/`thisVar` --
   *   both of that type, e.g. `Card`.
   * - SIDE EFFECT: adds `extraVars` (e.g. a `with_props_arg`'s prop names, or the promoted type's own
   *   var-name alias) directly onto the new scope's `variables`.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { methodName, args, extraVars, instanceType, valueKindOf } = this.getSignature(match)!
    // Generic `Groups` keeps `MatchFor<this>` from narrowing to a plain `P.Match` -- cast once.
    const declaredBy = match as P.Match
    // a value kind's phrase:  `it` / `the rank` are its argument, the value -- see `MethodSignatureData.valueKindOf`
    if (valueKindOf && instanceType) {
      const datatype = SP.typeName(valueKindOf)
      return new P.MethodScope({
        parentScope: match.scope,
        name: methodName,
        args: [new P.ScopeVariable({ name: instanceType, datatype })],
        mapItTo: instanceType,
        itDatatype: datatype,
        declaredBy
      })
    }
    const methodScope = new P.MethodScope({
      parentScope: match.scope,
      name: methodName,
      // each keeps its type, e.g. `Pile` for `(a pile)`, `text` for `(x as text)`
      args: args.map((arg) => new P.ScopeVariable({ name: arg.name, datatype: MethodDefinition.argDatatype(arg) })),
      thisVar: instanceType,
      mapItTo: instanceType && "this",
      itDatatype: instanceType && SP.typeName(instanceType),
      declaredBy
    })

    // add other random variables
    if (extraVars.length) {
      methodScope.variables.add(
        ...extraVars.map((it) => (typeof it === "string" ? { name: it, declaredBy } : { ...it, declaredBy }))
      )
    }
    return methodScope
  }

  /**
   * The method `match` defines:  an instance method of `instanceType` if it has one, else a loose function.
   * - Reads the signature `getSignature()` cached while parsing -- pure, like `getAST()`.
   */
  getDeclaration(match: P.MatchFor<this>): P.Declaration | undefined {
    const signature = (match.data as Partial<MethodDefinitionData>).signature
    const nameMatch = (match.groups as { signature?: P.Match }).signature
    if (!signature || !nameMatch) return undefined
    return {
      kind: signature.instanceType ? "method" : "function",
      name: nameMatch.inputText.trimEnd(),
      nameMatch,
      of: signature.instanceType,
      detail: signature.methodName && `${P.JSWriter.instance.nameOf(signature.methodName)}()`
    }
  }

  /**
   * SIDE EFFECT: registers the generated call-site rule (`getRule()`) onto `scope.parser`,
   * making the new syntax immediately usable after this definition -- and its record (`addMethod()`).
   */
  mutateScope(match: P.MatchFor<this>): void {
    this.getRule(match)
    this.addMethod(match)
  }

  /**
   * SIDE EFFECT:  now our body has parsed, record what the method returns on its record --
   * `P.ScopeMethod.returns`, which a call's `datatype` is.  See `getReturnedDatatype()`.
   * - Journaled.  Returns it, so `BlockLine.reparseBody()` can tell when an edit changes it.
   */
  mutateScopeFromBody(match: P.Match): string | undefined {
    const method = (match.data as MethodDefinitionData).scopeMethod
    const returns = this.getReturnedDatatype(match)
    if (method && method.returns !== returns) P.ParseJournal.assign(match.scope.parser?.journal, method, { returns })
    return returns
  }

  /**
   * Record the method `match` defines as a `P.ScopeMethod`,
   * so a call knows what it returns, and editors what it takes:
   * - its words
   * - its parameters, with their types
   * - its owner
   * - A method of a type this project declares:  in that type's `methods`.
   * - Else in the project's `methods`, with `of` saying whose:
   *   a free function, or a method of a type from elsewhere, e.g. `Thing` or an import.
   *   - Why:  so the project's journal can take it back.
   *     A built-in or imported type's lists belong to every project using it.
   * - Through `ScopeList.add()`:  journaled, and noted as what `match` declared -- see `SP.SpellDeclarations`.
   */
  addMethod(match: P.MatchFor<this>): void {
    const { methodName } = this.getSignature(match)!
    if (!methodName) return
    // Generic `Groups` keeps `MatchFor<this>` from narrowing to a plain `P.Match` -- cast once.
    const declaredBy = match as P.Match
    const project = declaredBy.getScopeOfType(P.RootScope) as P.RootScope | undefined
    const { type, of, params } = this.getOwnerAndParams(match)
    const record: P.ScopeMethodProps = {
      name: methodName,
      asWritten: (match.groups as { signature?: P.Match }).signature?.inputText.trimEnd(),
      params,
      of,
      declaredBy
    }
    const [added] =
      type && type.parentScope === project ? type.methods.add(record) : (project?.methods.add(record) ?? [])
    match.data.scopeMethod = added
  }

  /**
   * What the method `match` defines takes -- what its `P.ScopeMethod` record and its call rule both hold:
   * - `type`, `of`:  the type it's ON -- its record, if known, and its name
   * - `params`:  its parameters, each with its datatype if the signature says
   * - A lookup:  call it from `mutateScope()`.
   */
  getOwnerAndParams(match: P.MatchFor<this>): { type?: P.TypeScope; of?: string; params: P.ScopeParam[] } {
    const { args, instanceType } = this.getSignature(match)!
    const type = instanceType ? match.scope.types?.get(instanceType) : undefined
    return {
      type,
      of: type?.name ?? (instanceType && P.typeCase(instanceType)),
      params: args.map((arg) => MethodDefinition.paramOf(arg))
    }
  }

  /**
   * Record of method `name`:  of the type `datatype` names (or a super-type), else a free function.
   * - `undefined` if none known.  See `addMethod()`.
   * - A lookup:  call it WHILE PARSING.
   */
  static findMethod(scope: P.Scope, name: string, datatype: P.Datatype | undefined): P.ScopeMethod | undefined {
    const type = scope.getType(datatype)
    if (type) {
      const member = type.getMember(name)
      if (member instanceof P.ScopeMethod) return member
      // a method of a type from elsewhere, recorded in the project -- see `addMethod()`
      const recorded = scope.methods?.get(name)
      return recorded?.of && type.isA(recorded.of) ? recorded : undefined
    }
    const recorded = datatype ? undefined : scope.methods?.get(name)
    return recorded && !recorded.of ? recorded : undefined
  }

  /**
   * Register the CALL SITE rule directly onto `match.scope.parser`, called by `mutateScope()`.
   * - This is what makes `notify 1`, `card.play()`, `card is a bug`, etc. parseable
   *   after their `to` / `animation` / quoted definitions.
   * - `asPostfixExpression` / `asInfixExpression` (set by `QuotedTypeExpression.processSignature()`)
   *   register a `MethodPostfixRule` / `MethodInfixRule`.
   * - Otherwise registers a `DynamicMethodRule`:
   *   aliased `"statement"` when `asTest` (so it can't be used as an expression), else `["statement", "expression"]`.
   * - Each is `specialize()`d with:
   *   - the generated method's name as `output`, which it works out the rest from
   *   - `alias`
   *   - the owner `of` and `params` it checks arguments against:  see `getOwnerAndParams()`
   *   - So the definition is just `{ syntax }`, as for every other spell rule,
   *     and a project's declarations can rebuild it elsewhere.
   * - Registers through `scope.addRule(RuleClass, definition)`:
   *   it puts the rule on the scope's parser, and records the class + definition on the scope itself.
   *   - These generated rules MUST keep their alias,
   *     so the parser finds them by category (`statement` / `expression` / `expression_suffix`) on the very next line.
   *   - The recorded pair is what lets a scope export the methods it defined.
   */
  getRule(match: P.MatchFor<this>): void {
    const { asTest } = match.groups as { asTest?: P.Match }
    const signature = this.getSignature(match)!
    const { methodName = "", syntax = "", asPostfixExpression, asInfixExpression, valueKindOf } = signature
    const { scope } = match
    // Generic `Groups` keeps `MatchFor<this>` from narrowing to a plain `P.Match` -- cast once.
    const declaredBy = match as P.Match

    const output = methodName
    const { of, params } = this.getOwnerAndParams(match)
    if (asPostfixExpression) {
      const declared = valueKindOf ? { output, of, staticOf: valueKindOf } : { output, of }
      scope.addRule(MethodPostfixRule.specialize(declared), { syntax }, declaredBy)
      return
    }
    if (asInfixExpression) {
      scope.addRule(MethodInfixRule.specialize({ output, of, params }), { syntax }, declaredBy)
      return
    }
    const alias = asTest ? "statement" : ["statement", "expression"]
    scope.addRule(DynamicMethodRule.specialize({ output, alias, of, params }), { syntax }, declaredBy)
  }

  /**
   * Make the method `match` defines callable AHEAD of its definition (epic page `outline-spell`, P22).
   * - e.g. `play the card` above `to play a card`
   * - `match` is its first line alone, parsed before the project's files are:
   *   see `SP.SpellParser.stubDeclaredMethods()`.
   * - Registers the same call rule `getRule()` will, marked `ahead`:  it steps aside once the definition has run.
   * - Added straight to the parser, journaled, so a rewind takes it back:
   *   NOT to the scope's rules, which a project's declarations export.
   * - Only a call:  not a quoted phrase (a postfix or infix expression).
   */
  callAhead(match: P.MatchFor<this>): void {
    const { asTest } = match.groups as { asTest?: P.Match }
    const signature = this.getSignature(match)
    if (!signature?.methodName || !signature.syntax) return
    if (signature.asPostfixExpression || signature.asInfixExpression) return
    const { of, params } = this.getOwnerAndParams(match)
    const alias = asTest ? "statement" : ["statement", "expression"]
    const rule = DynamicMethodRule.specialize({ output: signature.methodName, alias, of, params, ahead: true })
    match.scope.parser?.addRule(rule, { syntax: signature.syntax })
  }

  /** If `signature.props` return `DestructuredAssignment` to pull those props into scope. */
  getPropsAssignment(match: P.MatchFor<this>): P.ASTDestructuredAssignment | undefined {
    const { props } = this.getSignature(match)!
    if (!props) return undefined
    return new P.ASTDestructuredAssignment(match, {
      // `props` argument will be the last thing in args
      thing: new P.ASTVariableExpression(match, { name: "props" }),
      variables: props,
      isNewVariable: true
    })
  }

  /**
   * Build the AST for a method DEFINITION:  the `P.ASTMethodDefinition` itself, and one of
   * a `PropertyDefinition` on the type's prototype, or a loose function / `test(...)` wrapper.
   * - Which depends on `instanceType` / `asTest` / `asPostfixExpression`.
   * - `asTest`:  SIDE EFFECT
   *   - rewrites the body to `echoInTests`-wrap every top-level statement / expression (via `EchoInvocation`),
   *     so test output shows what ran, unless a node opts out with `echoInTests === false`
   *   - wraps the whole thing in a `test(...)` call instead of a bare function, when there's no `instanceType`
   * - `props`:  SIDE EFFECT -- unshifts a `DestructuredAssignment` (from `getPropsAssignment()`)
   *   onto the START of the body, so prop variables are in scope before the rest of the method runs.
   * - `asAnimation`:  SIDE EFFECT -- makes the method `async`, and wraps its body in
   *   `StartProcessInvocation` (`exclusive: true`) / `try { ... } finally { StopProcessInvocation }`.
   * - `instanceType` set:  emits a `PropertyDefinition` for `Type`,
   *   a getter when `asPostfixExpression`, else a method.
   * - No `instanceType`:  emits a loose function;
   *   when `asTest`, a loose function whose body is itself a `test(...)` call.
   */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { asTest, asAnimation } = match.groups as {
      asTest?: P.Match
      asAnimation?: P.Match
    }
    const signature = this.getSignature(match)!
    const { methodName = "", args, props, instanceType, asPostfixExpression } = signature
    // what it declared is said by its `/*! SPELL: DECLARES` comment -- see `SP.SpellDeclarations.commentFor()`
    const output: Array<P.ASTStatement | P.ASTExpression | P.ASTComment | P.ASTBlankLine> = []

    const method = new P.ASTMethodDefinition(match, {
      methodName,
      args,
      // body's `.AST` is generically typed `ASTNode`, but is always a
      // StatementBlock/Statement/Expression by construction of block / inline-statement parsing.
      body: this.getBody(match)?.AST as P.ASTStatementBlock | P.ASTStatement | P.ASTExpression | undefined
    })

    if (asTest) {
      // HACK: echo all non-console / non-expect lines inside the test so we can tell what's going on!
      const statements: Array<P.ASTStatement | P.ASTExpression | P.ASTComment | P.ASTBlankLine> = []
      method.body.statements?.forEach((line) => {
        // `echoInTests` is only declared on some AST node subclasses (e.g. `EchoInvocation`, `StatementGroup`),
        // not on the shared `Statement`/`Expression` base -- read it duck-typed here.
        const echoInTests = (line as unknown as { echoInTests?: boolean }).echoInTests
        if ((line instanceof P.ASTStatement || line instanceof P.ASTExpression) && echoInTests !== false) {
          statements.push(
            new P.ASTEchoInvocation(line.match, { methodName: "echoTestAction", expression: line.match.value })
          )
        }
        statements.push(line)
      })
      method.body.statements = statements
    }

    // Add props assignment to START of method body
    if (props) {
      const propsAssignment = this.getPropsAssignment(match)
      if (propsAssignment) (method.body.statements ??= []).unshift(propsAssignment)
    }

    if (asAnimation) {
      method.async = true
      method.body = new P.ASTStatementBlock(match, {
        statements: [
          new P.ASTStartProcessInvocation(match, { name: methodName, exclusive: true }),
          new P.ASTTryCatchBlock(match, {
            body: method.body || new P.ASTStatementBlock(match),
            finallyBlock: new P.ASTStopProcessInvocation(match, { name: methodName })
          })
        ]
      })
    }

    if (instanceType) {
      // a value kind's phrase:  its static method, given the value -- see `MethodSignatureData.valueKindOf`
      if (asPostfixExpression && signature.valueKindOf) {
        const value = new P.ASTVariableExpression(match, { name: instanceType })
        const { body } = method
        output.push(
          new P.ASTStaticMethod(match, {
            type: signature.valueKindOf,
            name: methodName,
            method: new P.ASTMethodDefinition(match, { args: [value], body, datatype: "choice" })
          })
        )
      } else if (asPostfixExpression) {
        // console.warn("APE:", method)
        output.push(
          new P.ASTPropertyDefinition(match, {
            type: P.typeCase(instanceType),
            property: methodName,
            get: method
          })
        )
      } else {
        output.push(
          new P.ASTPropertyDefinition(match, {
            type: P.typeCase(instanceType),
            property: methodName,
            method
          })
        )
      }
    }
    // No instance type: create as a loose function -- `export`ed at file level, so another project can import it.
    // NOTE: not a scope LOOKUP, just where it was written -- as `ASTAssignmentStatement.exportVar` decides.
    else if (asTest) {
      output.push(
        new P.ASTMethodDefinition(match, {
          methodName,
          exported: isTopLevel(match.scope),
          body: new P.ASTCoreMethodInvocation(match, {
            methodName: "test",
            args: [new P.ASTQuotedExpression(match, signature.methodBits.join(" ")), method]
          })
        })
      )
    } else {
      method.exported = isTopLevel(match.scope)
      output.push(method)
    }

    return new P.ASTStatementGroup(match, { statements: output })
  }

  /**
   * Datatype method argument `arg` was declared with, e.g. `Card` for `(a card)` -- `undefined` if none.
   * - `ASTNode.datatype` may be a `RegExp` constructor, for a regex literal:  never an argument's.
   */
  private static argDatatype(arg: P.ASTVariableExpression): P.Datatype | undefined {
    const { datatype } = arg
    return typeof datatype === "string" ? datatype : undefined
  }

  /** Parameter record for method argument `arg`:  its name, and its datatype if it was declared with one. */
  private static paramOf(arg: P.ASTVariableExpression): P.ScopeParam {
    const datatype = MethodDefinition.argDatatype(arg)
    return datatype ? { name: arg.name, datatype } : { name: arg.name }
  }
}

/**
 * Props bag accepted by `MethodDefinition`.
 * - `inlineInitialType`:  first arg's type is part of the method name, e.g. `to draw a card` => `Card.draw()`.
 */
export type MethodDefinitionProps = Prettify<SpellStatementProps & { inlineInitialType?: boolean }>

/** What `MethodDefinition` (and subclasses) stash in `match.data`, on top of whatever they declare via `MatchData`. */
type MethodDefinitionData = {
  /** Cached result of `getSignature()` -- see that method. */
  signature?: MethodSignatureData
  /** Record of the method it declared -- see `addMethod()`. */
  scopeMethod?: P.ScopeMethod
}

/** The hooks a type's method may be, and the word rule that says each:  see `MethodDefinition.hookOf()`. */
const HOOKS = [
  { ruleName: "draw_method", hook: "draw" },
  { ruleName: "create_method", hook: "create" }
] as const

/** A hook's name:  `draw` or `create`. */
type Hook = (typeof HOOKS)[number]["hook"]

/** Where a fused `it` was in a signature's bits, until `takeSubject()` puts the receiver there:  see `splitFusedIt()`. */
const FUSED_IT = "\u0000it"

/** Is `scope` a file's (or project's) top level, where a definition is `export`ed? */
function isTopLevel(scope: P.Scope): boolean {
  return scope instanceof P.FileScope || scope instanceof P.ProjectScope
}

/**
 * Is `word` one of the language's little words a method's name keeps its receiver's type after?
 * - e.g. `of`:  `to update the total of (a calculator)` => `update_the_total_of_calculator`
 * - `scope`'s language's (`SP.LanguageWords.danglingWords`), NOT the one in play:
 *   a method read ahead (`callAhead()`) works out its name out of a parse, where English is the fallback in play.
 *   So Spanish's `para dar la vuelta a una carta` and its call agree on `dar_la_vuelta_a_carta`.
 */
function isDangling(word: string, scope: P.Scope): boolean {
  return SP.Language.of(scope).words.danglingWords.has(word.toLowerCase())
}
