# How parsing works

A compact map of the parse pipeline, so agents don't have to work it out again.
The overview, for people:  [README-parser](../../README-parser.md) and [README-spell](../../README-spell.md).
- MUST be kept up to date when any of these change (see [AGENTS.md](AGENTS.md)):
  - `Parser`, `SpellParser`, scopes
  - how a file becomes blocks, lines and statements:
    - `Block`
    - `BlockLine`
    - `SpellStatement`
- File references (`path:line`) are as of 2026-09-27:  trust the code if they drift.

## Text => tokens

- [`Parser.parse(input, ruleName, scope)`](../parser/Parser.ts) tokenizes,
  then calls `scope.getRuleOrDie(ruleName).parse()`.
- [`SpellParser.tokenize()`](SpellParser.ts) calls `Tokenizer.tokenize()`.
  - Its `tokenizer` by the parser's `form`:  spell's own (`spellTokenizer`), or a page file's,
    `SP.PageTokenizer`, for a whole file (the `"block"` rule) only;  see "Pages", below.
  - For the `"block"` rule, it then calls [`breakIntoIndentedBlocks()`](../parser/tokenizer/Tokenizer.ts).
  - The result is ONE root `BlockToken`:  its lines (`LineToken`s), and nested blocks of the same kind.
  - indent ~== count of leading whitespace chars (tab === space === 1)
    - except 1-3 spaces right before a tab, which the tab swallows:  ` \t` is as deep as `\t`, as an editor shows it
      (`indentWidth()`, epic `spanish`:  a stray space nested a card's `- its "value" ...` under the line above)
  - each extra level pushes a `BlockToken`
  - a blank line takes the indent of the NEXT non-blank line, so it doesn't break a nested block (lookahead)
  - a comment is a single `CommentToken`, to the end of the line:
    - `//` or `--`
    - or a heading's run of `#`s:  a markdown-style level (see `Block.getDocComments()`)
- Some tokens span lines.
  Each is ONE token inside ONE `LineToken`:
  - a JSX element, e.g. a whole `return <div>...</div>` body
  - a JSX FRAGMENT, `<>...</>`:  elements side by side, with no element around them (`P.JSXFragmentToken`)
    - Elements one after another are ONE implicit fragment, as if wrapped in `<>...</>`:
      on the same line, or the next, indented at least as far as the first one's line
      ([`Tokenizer.matchJSXElements()`](../parser/tokenizer/Tokenizer.ts)).
      So `return <ui-container>...</ui-container>` with `<ui-grid>...</ui-grid>` below it draws both.
    - The `jsxFragment` rule;  javascript draws it as a list, `[h("a"), h("b")]`, TypeScript as `<>...</>`.
  - a string with `\n`
  - JSX `{...}` contents are re-tokenized later, from a collapsed copy.
- Every token has an absolute `start`.
  - From it, `Tokenizer.setPositions()` works out each token's line and character, tokens nested in JSX included.
    - They're its `line` / `ch`.
    - It does so through `getLineStarts()` + `positionForOffset()`,
      in [tokenizer.types.ts](../parser/tokenizer/tokenizer.types.ts).
  - NOTE: `LineToken` and `BlockToken` copy their line from their first token.
  - JSX `{...}` contents are parsed later, from a trimmed, newline-collapsed copy of the same length.
    - So the JSX rules shift those tokens to their file positions:
      [`SpellJSXContent.placeInFile()`](rules/JSX/SpellJSXContent.ts).
    - They hang them on the `JSXExpressionToken`, as `innerTokens`.
    - There `Tokenizer.forEachToken()` reaches them, and so does `moveTokens()`.
  - Any other token holding tokens of its own lists them as `nested` (a page's tag head:  its name, values and
    phrase), and `forEachToken()` reaches those too.
- A token's or match's two ends:
  - `end`:  where its TEXT stops
  - `next`:  where the next token starts, i.e. `end` plus the trailing whitespace
    (tokens carry the whitespace after them)
  - Ranges a user sees use `end`.
  - "Which match is the cursor in" (`matchForOffset()`) uses `next`.

## Rules and matching

- A rule is two methods:
  - `test()`:  a cheap "could this match at `start`?"
  - `parse()`:  builds a `Match`, or returns `undefined`
- [`Choice.parse()`](../parser/rules/Choice.ts) parses every alternative that can start with the line's first word
  (see "Which alternatives a line tries", below), then picks one with `getBestMatch()`:
  - highest `priority`, then longest match, then EARLIEST rule
  - `priority` answers ONLY "several rules match the SAME words:  which wins?" (`Rule.priority`, default 0)
  - how tightly an operator binds is spell's `precedence` (see "Expressions")
- Which alternatives a line tries (epic `language` P37):
  - A `Choice` of 4 or more keeps a table from a line's first word to the alternatives worth trying
    ([`FirstWordIndex`](../parser/rules/Choice.ts)):  the rules that must start with that word, plus every rule that
    can start with anything, in the list's order, so ties still go to the earliest rule.
  - A `Sequence` is filed under a word only when its syntax demands it:  its required first word (`leadingWord`, read
    by `firstWords`), unless that word is matched in any case (`/i`).
  - A rule filed under a word MUST read that word:  its `parse()` and `test()` start with its syntax.
    - [firstWords.test.ts](../../tests/spell/rules/firstWords.test.ts) fails for a filed rule whose `parse()` skips
      `super.parse()`, or whose `test()` skips `super.test()`.
    - A rule that reads the line by hand starts with a slot, as `CompoundExpression` does, so it's never filed.
  - Expecting mode (editor completion) tries every alternative:  a line being typed may not have its first word yet.
  - One table per list of rules, shared by every `clone()` of the `Choice` (so scopes share it), and built the first
    time it's asked for;  `addChoice()`, how a rule added while parsing arrives, makes a new one.
  - `Choice.USE_FIRST_WORD_INDEX = false` tries every alternative, as tests do to compare the two.
- [`Sequence.parse()`](../parser/rules/Sequence.ts) first runs `Sequence.test()`:
  - fixed words, symbols and patterns are checked where they must fall;  subrules are skipped
    - except a ZERO-WIDTH rule's (`Rule.zeroWidth`), which takes no tokens:
      the test stays where it is, if the rule's own `test()` says it could match here at all
    - e.g. spell's `subject_implied`, the subject an outline line leaves out (see "Outline bodies")
    - a subrule knows the rule it names is zero-width as soon as it's made (`Subrule.zeroWidthRule`)
      - so a zero-width rule is registered BEFORE any syntax naming it:  `Parser.addRule()` throws otherwise
    - a sequence STARTING with one asks it first (`Sequence.leadingZeroWidth`):
      a line it can't be fails at once
  - it rejects ~92% of attempts before any child parses
  - then each child is parsed at the head of the remaining tokens
  - GIVE-BACK:  a required word failing right after a required `{slot}` re-parses the slot shorter.
    - It cuts the slot just before each place the word is (last first), and goes on from there.
    - e.g. `remove the card of the pile`, for `remove {thisArg:expression} of {callArgs:expression}`
    - only on the way to failing, NEVER in expecting mode
- `Subrule` looks its rule up BY NAME, through `scope.getRuleOrDie()`, at call time.
  - So rules added mid-parse are visible to later lines.
- The single-token rules are cheap:  they compare one token, with `===` or a regex.
  - `Literal`, `Literals`, `Pattern`, `TokenType`
- Spacing (`rule.spacing`, `P.Spacing`):  what may sit between the previous token and a rule's first.
  - `none`:  touching
  - `one`:  one space
  - `some`:  spaces or tabs
  - unset:  anything
  - It's read from the previous token's trailing `whitespace`.
    So it works only with a policy that drops inline whitespace onto tokens (`LEADING_ONLY`, spell's).
  - It's checked by the HOLDER, which can see the previous token:
    - `Sequence`, before each part:  a miss is no match (an optional part is skipped)
    - `Literals`, per literal (`LiteralMatcher.spacing`)
    - `Repeat`, between copies (`itemSpacing`) and before its delimiter
  - Rulex sets it from how the syntax is spaced (see [the Rulex guide](../../../spell.epics/guides/rulex/rulex.html)):
    - parts written touching must touch (`isn't`, `\[{x}\]`);  spaced ones may space
    - `{space}` / `{spaces}` set the next part's
    - a symbol touching its flag repeats as a run (`#+`)
- Cost, warm:
  - Measured by a `BENCH=1` run of [the project tests](../../../app/tests/spell/SpellProject.test.ts) (spell-app's), 2026-10-04,
    after P3 of precedence-and-types halved it.
  - Card.spell (121 lines) ~12ms;  Solitaire.spell (259 lines) ~32ms;  the whole Solitaire project ~55ms
  - the whole project, after later phases:
    - ~60ms after P5 (typed calls, return types)
    - ~59ms after P6 (members)
    - 57.4ms after P8 (exclusive lists:  no change)
    - 65.9ms after P10 (membership, guards), against 68.5ms just before it
  - Compiling is <1ms per file, and tokenizing about the same:  parsing is the whole cost.
  - `parser.rules` rebuilds after mid-parse `addRule()`s:
    - 35 per project parse (38 before P6:  no rule per enumeration)
    - ~1ms in all:  not worth optimizing
  - The whole Solitaire project (5 files, 530 lines), processor time, warm, a busy machine (2026-11-09, epic `language` P37):
    - 310ms before P37, 236ms with the first-word table and no per-match type checks (-24%)
    - PublicServers (1,334 lines):  680ms before, 497ms after (-27%)
    - A compiled engine (WebAssembly, ...) is rejected for now:  why, and when to look again, in `Choice`'s docstring.
    - Next places to look, if more is wanted:  the scope name lookups (9%), and the declaration scan's tokenizing (4.3%).
  - `Match.DEBUG_MATCH_INITIALIZATION` (type checks on every match) is off outside tests;  each parse paid about 4%.
- "What can come NEXT?", for editor completion:  `parser.expectedAfter(input, ruleName, scope)`.
  - It parses a half-typed line in EXPECTING mode (`P.Expectations`).
  - Where rules ran out of tokens, they record what they were waiting for:
    - `Sequence`:  the child it hadn't got to, and any optional ones after it
    - `Repeat`:  another item
    - `Subrule` / `Choice`:  themselves
  - A `Sequence` failing after a child ran out of tokens INSIDE itself records that child as `within`.
    - That's partway through it, e.g. an argument being typed:  for signature help.
    - Completion skips these.
  - Each is a `P.Expectation`:
    - the rule
    - the `Sequence` and index it sits at, e.g. for the rest of a method's syntax
    - depth
    - `continues`:  it only EXTENDS something complete, e.g. an operator after `x`.
      A `Choice` marks what its other alternatives recorded, once one matched every token.
  - `Sequence.test()` lets a rule through whose words fit but ran short.
    - That's `allowRunOut`, a module flag:  the test walk is too hot for an argument.
  - `Subrule` parses are memoized for the one call (`Expectations.memoized()`), or it's ~40x slower.
  - Normal parsing pays ~1%:  one static read per hook.

## Rule modules and rule names

- Spell's rules are in modules:  `events`, `lists`, `methods` ...
  - A module's parser (`new SpellParser({ module })`) holds its rules.
  - [The rules' index](rules/index.ts) combines them all into `spellParser`.
  - How a module's files are laid out:  "Parser rules" in [AGENTS.md](AGENTS.md).
- A module is a FOLDER, one rule class per file (epic `output-targets` P18), e.g. [events/](rules/events/).
  - A rule registers itself as its file loads:  `events.addRule(Trigger, { syntax, tests })`.
  - So the order of the folder's `index.ts` is the order rules are registered:  the TIE-BREAK order.
    - When a `Choice` ties on `priority` and length, the EARLIEST registered rule wins.
      See `getBestMatch()`.
- A rule's NAME is snake_case, and it's what everything else calls it:
  - `syntax`:  `{list_add_relative}`
  - `parser.rules`, declarations and errors
  - It's worked out from its PascalCase class, by `P.Rule.ruleNameFor()` (called by `Rule.instantiate()`):
    - `ListAddRelative` => `list_add_relative`
    - `If` => `if`
  - A class whose name doesn't give its rule name sets `static ruleName`.
    - e.g. `BlockLine` => `line`
  - [ruleNames.test.ts](../../tests/spell/rules/ruleNames.test.ts) pins every rule's name, module and order.
- A rule's tests, `{ input, js, ts }`, parse the input once and write it with the javascript and TypeScript writers:
  - `js`:  what `P.JSWriter` writes
  - `ts`:  what `P.TSWriter` writes, left out where it's the same
  - The Python writers are tested by their own tests, and by the fixtures' snapshots ("Testing a whole project").
  - [`unitTestModuleRules()`](../parser/test/unitTestModuleRules.ts) runs them.
  - `yarn spell:test:rules:bless` writes each test's `js` and `ts` into the source.
  - `Parser.testRules()`, which the speed test times, checks `js` only.

## Expressions

- `expression` is ONE rule, [`CompoundExpression`](rules/expressions/CompoundExpression.ts).
  - Its syntax:  `{lhs:operand} {rhsChain:expression_suffix}*`
  - It reads an `operand`, then each suffix binding tighter than its `bound` (0:  all).
  - no suffix:  the operand's own match, as is, so `match.is(KnownVariable)` still works
- An `operand` is what an operator acts on:  one expression with no operator at its TOP.
  - e.g. `5`, `the deck`, `(x + 1)`
  - e.g. `the first card of the deck` (it nests), `the cards in the deck where ...`
  - Every rule aliased `expression`, but `CompoundExpression`, is registered as an operand instead.
    That's `SpellParser.getNamesForRule()`.
  - That also throws for an operand whose syntax STARTS with an expression:  it would recurse forever.
  - Something after an expression is an `expression_suffix`, e.g. `list_membership_test`.
- Three slot kinds:
  - `{x:expression}`:  everything
    - statements, and slots closed by a word (`position of {x} in`)
    - method-call arguments (but see "a statement and an operand" below)
  - `{x:arithmetic_expression}`:  `+ - * /` only, stopping before a comparison
    - e.g. `absolute value`, `round`
    - bound `Precedence.takesSum`
  - `{x:operand}`:
    - a prefix's LAST slot (`the first card of {list:operand}`)
    - every suffix's right side
- `precedence` (how tightly an operator binds) is set on suffix rules ONLY.
  - They're `InfixOperatorSuffix` and `PostfixOperatorSuffix`.
  - It comes from the `Precedence` table:  `*` before `+` before `is` before `and` before `or`.
  - The constructor throws without one:  a silent default is how `ends with` went wrong.
  - It's read ONLY by the loop:
    - the loop stops at its `bound`
    - `getAST()`'s shunting-yard groups the flat chain by it
    - a postfix pops like an infix, so `x + y is empty` => `isEmpty(x + y)`
  - It's NOT `priority`, which only breaks a `Choice`'s tie (see "Rules and matching").
    - e.g. a user's quoted alias (`Priority.userDeclared`) beats a built-in suffix matching the same words
- A statement and an operand:  a rule aliased both `statement` and `expression`.
  - It says `@proto static operandInExpressions = true` (on `SpellStatement`).
  - `SpellParser.addRule()` registers it TWICE (`addStatementAndOperand()`):
    - as the statement, its syntax as is
    - as an `operand`:  a twin whose LAST expression slot is `{x:operand}` instead
      - Its `statementRule` points back.
  - Method calls and the retired `wait for` do:
    - the statement `notify x + y` => `notify(x + y)`
    - `if double x is 4` => `double(x) == 4`
    - the statement `wait for x is 1` => `await (x == 1)`
    - `if wait for x is 1` => `await x == 1`
  - `scope.addRule()` records only the statement rule, so a project's declarations write ONE rule.
    Loading it registers both again.
  - Editors map a twin back with `SpellStatement.statementRuleOf()`.
- `implied_it` ([ImpliedIt.ts](rules/variables/ImpliedIt.ts)):  `it` LEFT OUT before `is`, where a language drops
  its subject (epic `spanish` J96).
  - e.g. Spanish's `si es un trébol` in a card's method, `rojo si es diamantes o corazones` in a suit's getter
  - An operand taking no tokens, so the verb is its suffix:  `CompoundExpression` takes it only with one after it.
  - Only where `it` is a variable;  its `syntax` is the words it comes before, none in English.
  - `Priority.preferred`, so `no es ...` isn't `no` (false) compared with something.
- `which` after a list, its subject the item (epic `language` T133):  `the cards in the deck which are face up`
  ~== `... where it is face up`, in every rule a `where` starts the condition of:  `(where:where|which|that|who)`.
  - Its words:  English's `which`, `that`, `who`;  Spanish's `que`, beside `where` and `donde`.
  - Written out in each syntax, not `{where_or_which}`:  a word the line must have (`Sequence.requiredWords`) turns a
    line without one away at once, and a list's slot that read past it gives it back (`giveBack()`).
    The word rule `where_or_which` says which of them means `which` (`Wording.reads()`).
  - `SpellStatement.withWhichSubject()` reads the condition with its subject put back, before it parses:
    English's `it` (the language's `whichClause`), on no text just after `which`, and a first plural verb made singular
    (`are` => `is`);  Spanish leaves the subject out after `donde` too, so `que` reads as it is (`implied_it`).
  - Each later clause too (J173):  a plural verb just after `and` / `or` (`whichClause.joins`) is made singular,
    its own `it` put back before it:  `which are face up and are in the stock` ~== `where it is face up and it is in
    the stock`.
  - With an apostrophe:  Spell's words split `aren't` into `aren`, `'`, `t`, so `aren` becomes `isn`
    (`SpellStatement.singularVerbAt()`);  `don't` => `doesn't`, `haven't` => `hasn't`.
  - The changed words are added to the line's words the quick test keeps (`Sequence.addLineWords()`):
    it keeps them by the line's last token, which the changed tokens share.
  - The loop's own:  `for each card in the deck which is not in the stock` (`list_iteration_where`), its item, list and
    condition one `each_item_where`, a `list_filter` of one item's word, never an expression alone.
- A bare word after `and` / `or` in a filter carries the condition's verb (epic `language` I152,
  `SpellStatement.withVerbCarried()`):  `which are face up and red` ~== `... and it is red`.
  - Only when the condition starts with the item and its verb (`it is`, Spanish's bare `es`), and the clause is ONE word
    that names nothing in scope.
  - Not a negated verb after `or`:  `it isn't red or it isn't black` would always be true.
  - Without it, `red` was a text, always true:  every face-up card passed.
- A list of lists, read by its items' word (epic `language` I152;  T130 began it for `where` and `the number of`):
  - `cards in the columns` (`list_items_in`) => `core.mergeLists(core.everyThing(Column))`:
    every column's cards, together, in the columns' order;  `the cards in the discard pile` is the pile itself
  - the same in `the first card in ...` (`ordinal_position_expression`), `a random card in ...`, `card 3 of ...`
    (`ListItemExpression`), `the first card in ... where` (`ordinal_where_expression`),
    `a random card in ... where` (`random_item_where`), and a loop's item (`for each card in the columns`,
    `turn each card in the columns face down`)
  - the word naming the lists themselves reads them as before:  `the piles in the columns`, `for each pile in the columns`
  - a word naming neither, both known, is refused:  `the columns in the deck` says what the deck holds
    (`refuseIfNamesNoItems()`, [lists.shared.ts](rules/lists/lists.shared.ts))
  - `spell repl` and `spell parse` say "Don't understand" for words left at a line's end, as a file does:
    they printed the part they read, and dropped the rest
- `and` / `or` between VALUES (epic `language` T146, J226;  [`JoinedValues`](rules/expressions/JoinedValues.ts)):
  - two questions:  a question, as always
  - two values of one kind:  `or` the first that's there (`discardPile.lastItem || stock.firstItem`, the datatype a card),
    `and` both, in a list (`[stock, discardPile]`;  `A and B and C` one list);  what reads the list says which items it
    means, by its item word (`for each card in the stock and the discard pile`:  both piles' cards)
  - in a condition (`if`, `X if C otherwise Y`, `when enabled`, a `where`):  a value is a test of whether it's there, as always
  - refused, asked when the errors are gathered (`CompoundExpression.refuseIfJoinedWrong()`):  a question and a value
    outside a condition, two kinds, `and` and `or` between values with no parentheses, `and <a word>` (`and red`), and in
    a `where` a question then a thing
  - `CompoundExpression` reads its datatype through `JoinedValues.of()`, the same shunting-yard as `getAST()`
  - words that say ITEMS join as their items, into one flat list (epic `language` T152):
    `cards in the stock and cards in the discard pile` => `core.mergeLists([stock, discardPile], List)`;
    one item beside them joins as itself (`[stock.lastItem]`);  a named list beside them (`the stock and cards in ...`)
    is refused, saying `cards in the stock`
    - which words say items:  `SpellExpression.saysItems` (`list_filter`, `list_items_in`, `item_of_each`, the ranges,
      `random_items_expression`) and `saysItemsOf()` per match (`the shorthand of each card`, `property_expression`)
- One item of EACH thing, as one list (epic `language` T152;  [`ItemOfEach`](rules/lists/ItemOfEach.ts),
  `item_of_each`):  `the last card of each column` => `core.pickFromEach(core.everyThing(Column), (column) => column.lastItem)`
  - any pick of one list's item by its place:  `the first`, `the second`, `a random`;  `each column in <list>` too
  - read by hand:  the pick, with the thing in place of `each column` (`the last card of column`), read by the rule that
    picks one item of one list, in a scope where `column` is each thing;  a thing with nothing to pick adds nothing
  - `where the card ...` / `where it ...` filters each thing's items before the pick;  `where the column ...` the things
  - a pick that asks an action (`where it can play the card`) is refused:  it would play cards while making the list
  - `set x to ... each column in the columns` and `return ...` are this list, never `each_in_statement`'s loop
    (`EachInStatement.isInOneValue()`);  `add the last card of each column in the columns to the stock` is still the loop
- `can <action>`, `can_do` ([CanDo.ts](rules/lists/CanDo.ts), T146, J228):  `where it can play the card`, `it` optional,
  RUNS the action and reads its yes or no;  `the first card in ... where` with one asks one item at a time and stops at the
  first yes (`core.itemWhere()`, `core.itemWhereInTurn()` when it waits).
- A number word is a name where it can't be a number (J96):
  - the target of `set` / `poner` tries `{variable}` first:  `set three to 3`
  - a variable of the name in scope wins over the number (`NumberAsString.parse()`)
- Give-back (`Sequence`, see "Rules and matching") lets a full `{x:expression}` slot before a word work:
  - `remove {thisArg:expression} of {callArgs:expression}`, on `remove the card of the pile`
- Expecting mode:  out of tokens after the operand or a suffix,
  the loop records `expression_suffix` as only CONTINUING it.
  - `expression` used to be a Choice, which worked this out.
- `expressions.test.ts`, "priority and precedence", snapshots:
  - every built-in rule's non-default `priority`
  - every suffix's `precedence`

## Datatypes:  what an expression IS

- `match.datatype` says what an expression is, in spell's words.
  - its type:  `P.Datatype`, in [parser.types.ts](../parser/parser.types.ts)
  - `text`, `number`, `integer`, `letter`, `choice`, `date`
  - `list`, `thing`, `app`, `nothing`, `list of cards`
  - and a user's type, by its `TypeScope` name:  `Card`
  - `undefined` ~== unknown, compatible with everything:  nothing stops parsing for it
- ONE normaliser, `SP.typeName()`, turns what a user WRITES into those words.
  - e.g. `string`, `boolean`, `yes or no`, `array`, `fraction`, `char`, plurals
    - NOT `character`, since epic `language` Q17:  a program may name its own type that
  - `SpellType.mapValue()` uses it too, keeping classes Type_Case for compiled code (`List`).
  - The vocabulary is spell's, [`SP.TYPE_WORDS`](builtinTypes.ts), handed to the parser's `P.typeName()`.
    - The parser knows only each datatype's own name, so a translation brings its own words.
- `match.datatype` memoizes `rule.getDatatype(match)`.
  - Its default is the rule's `@proto static datatype`.
- About a dozen rules override it, reading ONLY `match.data` and child matches' datatypes:
  - a variable, `SpellIdentifier`:  the datatype of its `scopeVar`
  - a member read (see "Members"):  the member it read (`data.member`)
    - e.g. `the X of Y`, `its X`
    - a built-in's comes from its table entry, e.g. `the length of the name` is a `number`
    - an enumeration's values:  `list`
  - `DynamicMethodRule`:  what its method returns, as the parser infers it (see "Return types" below)
    - read from its record:  `data.method.returns`
  - `new_thing` / `create_thing` / `new_list`:  the type made
  - list rules:  the item type (`data.itemType`), the list's type, or `number`
  - `CompoundExpression`:  `getAST()`'s shunting-yard again, over datatypes
    - each suffix's `getResultDatatype(match, lhs, rhs)`, by default its `datatype`:
    - `choice` for every suffix but the ones below
    - `+ - * /`:  `number`
    - `+` of text:  `text`
    - `as upper case`:  `text`
    - `as a <type>`, `X if C otherwise Y`
  - `parenthesized_expression`:  what's inside
- A rule needing a LOOKUP for it does it in `parse()`, into `match.data`:
  - what it looks up:  a member of a type, a list type's item type, a method's record
  - how:
    - `scope.getType(datatype)`
    - `scope.getItemType(datatype)`
    - `TypeScope.getMember(words)`
  - never in `getDatatype()`, which may run later
- Sinks:  where a datatype is kept, so later lines know it.
  - a new variable:  the value's datatype, on its `ScopeVariable`
    - from `set`, `X is Y` or `get` (and its `it`)
  - method arguments:  `(a card)` / `(x as text)`
  - `this` / `it` in a method or getter:  its owner type (`MethodScope.itDatatype`)
  - a loop's item and `it`, and a `where`'s:  the list's item type
  - `on ... with a card`'s `card`
  - `a deck is a list of cards`:  `Card`
    - kept as the deck type's `itemType`, on its `TypeScope`
- First datatype wins:  a record's datatype is set when it's declared, never widened.
  - The one exception:  a getter's property, and a method's `returns`, are set once the BODY has parsed.
    See "Return types".
- Return types are set once a statement's body has parsed, inline or nested.
  - `commitStatement()` then runs `rule.mutateScopeFromBody()`.
  - `MethodDefinition` sets its record's `returns`.
  - `property_value_getter` sets its property's `datatype`, if it declared it and nothing gave it one.
  - Each is journaled (`P.ParseJournal.assign()`), from `SpellStatement.getReturnedDatatype()`:
    - an inline EXPRESSION body (`the value of a card is its rank`):  that expression's datatype
    - else every `return` in the body, inside `if`s too
      - each `ReturnStatement`'s `getReturnValue()`
      - but NOT in a body with a `MethodScope` of its own, e.g. a loop's:  that compiles to a callback
      - all the same:  that;  none, or a mix:  unknown
      - a bare `return` is `nothing`
  - A call's datatype reads it lazily:  `data.method.returns`.
    - A recursive call, parsed before its body ends, is unknown.
- Typed calls:  a call rule is `specialize()`d with its method's types.
  - `DynamicMethodRule`, `MethodInfixRule`
  - The types are its record's owner (`of`) and `params`.
  - It keeps them as statics:  `thisType`, `paramTypes`.
  - Its `parse()` rejects a match whose argument's datatype is KNOWN and can't be the parameter's.
    - That's `scope.couldBeA()`:  neither is the other or a sub-type of it, no stubs.
    - Unknown always fits.
    - `put the chip on the pot` finds Chip's `put`.
    - `add the card to the deck` falls past a user's `to add a card to a pile`,
      to the built-in `core.append(deck, card)`.
  - `MethodInfixRule` checks only its right side:  a suffix can't see its left while parsing.
  - A `MethodPostfixRule` checks nothing.
  - Declarations need nothing new:  `of` / `params` are the method record's, in the same comment.
    Loading hands `specialize()` the whole of it.
- Probe ledger ([grammar.probes.test.ts](../../../app/tests/spell/grammar.probes.test.ts), spell-app's), "datatypes":
  what a set of expressions and sinks are.

## Adding an expression rule

- An OPERAND stands alone:  a literal, `the X of Y`, `the first card of ...`.
  - It `extends SpellExpression`:  aliased `expression`, so it's registered as an operand.
  - A slot at its END takes `{name:operand}`:  `the first card of {list:operand}` stops before any operator.
  - Math that should take a sum (`the absolute value of x + 1`):  `{name:arithmetic_expression}`.
  - A slot closed by a required word (`of`, `in`, `to`) stays `{name:expression}`, like a paren.
- An OPERATOR follows an expression.
  - `x OP y`:  it `extends InfixOperatorSuffix`
  - `x is empty`:  it `extends PostfixOperatorSuffix`
  - Its right side is `{expression:operand}`.
  - It MUST set `@proto static precedence` from `Precedence`:  the constructor throws without it.
  - Build its output in `compileASTExpression()`.
  - Not a test?  Set its `datatype`, or override `getResultDatatype()`.
    - The default is `choice`.
- `priority` only settles a tie between rules matching the SAME words.
  - Leave it unset unless a probe shows a tie going wrong.
  - Then set it from the `Priority` table ([rules.types.ts](rules/rules.types.ts)), with a one-line why.
- Always NAME a slot, so `match.groups` keeps its key.
- Add one mixed-operator line to the probe ledger, spell-app's [grammar.probes.test.ts](../../../app/tests/spell/grammar.probes.test.ts).

## Type names:  `a bank account aka account is a thing`

- A type's name may be one word or several, and it may have a short name.
  - one word:  `card`, `bank-account`
  - several:  `bank account`
  - `a bank account aka account is a thing`:  ONE type, compiled `Bank_Account`, as `bank-account` would be.
  - Afterwards `bank account(s)` and `account(s)` both name it.
- A name of several words is made singular or plural by its language:  Spanish's only up to a linking word,
  `pilas de descartes` => `pila de descartes`, in PascalCase too (`PilaDeDescartes`).
- A DECLARATION's name is [`type_words`](rules/types/TypeWords.ts):  every word up to a blacklisted one or `aka`.
  - Or blacklisted words too, when the whole name runs up to `is` or `aka` (epic `spanish` P14):
    `a card in play is a thing`, `una carta de juego es una cosa`.
  - In quotes, the same:  `a "card in play" is a thing` ([`quoted_type`](rules/types/QuotedType.ts)).
  - Its rules:  `create_type` and `create_list_type`.
    Their syntax:  `(a|an) {type:type_words} (aka {aka:singular_type})? is ...`
  - Both declare through `TypeDeclaration.declareType()`.
  - Both refuse a name another type already goes by (`refuseTakenNames()`).
    - e.g. `an account is a thing`, after the line above
- A MENTION is any [`SpellType`](rules/types/SpellType.ts) rule, and it takes:
  - first the LONGEST run of 2 to `MAX_NAME_WORDS` words that names a type in scope, joined with dashes to look up
  - else one word, as ever
  - So only DECLARED names take several words:  `a big card` stays a card, unless someone declared a `big card`.
  - A declared name holding a grammar word is found whole, before the blacklist ends it:  `a new card in play`.
    - Its plural is its FIRST word's:  `a list of cards in play`, `cartas de juego`.
    - `namesWithGrammarWords()` ([rules.types.ts](rules/rules.types.ts)) lists them, cached per scope list.
  - A type has to be declared before a mention of several words can find it:  no stubs for those.
  - Those rules:  `type`, `known_type`, `singular_type` ...
- Spell's own two-word types are built in (epic `drawable-thing`, P2):
  - `view`
  - `viewable list`
  - Their datatypes are `view` and `viewable list`.
    `SP.TYPE_WORDS` maps the ways to write them.
  - Their classes are ONE word each, not Type_Case:  `View` and `ViewableList`.
    - They're listed in `P.BUILT_IN_CLASS_NAMES`.
    - `P.classCase()` names every class, and keys `scope.types`.
  - `a pile is a viewable list of cards` is `create_viewable_list_type`.
    It's `create_list_type`, extending `ViewableList`.
- The short name is `TypeScope.aka`.
  - `scope.types` finds a type by it too (the list's `aliasProp`), after every type's own name in that scope.
  - A mention by the short name compiles as the type's own name:  `account` => `Bank_Account`.
  - Project declarations carry it (`aka`), so an importing project knows the short name too.

## Members:  `the short rank of the card`

- A member's NAME is [`member_words`](rules/properties/MemberWords.ts):  1..N words, up to the first structural one.
  - The language's stop words, `SP.LanguageWords.memberStopWords` ([English's](languages/en/words.ts)):
    `of the a an is has have in to and or if where as with whose for from then else otherwise not ...`
  - It's NOT the identifier blacklist, so `short` is fine.
  - A member declared with a stop word in its name, in quotes, is read whole, longest first (epic `spanish` P14).
    - e.g. `its "side of play" is a number`, then `the side of play of the card`
    - in Spanish:  `su fecha de nacimiento`
    - Any type's:  `the X of Y` takes its words before Y's type is known.
    - Without quotes, a declaration's name still stops at the stop word.
  - Its two spellings:
    - `value`:  its compiled name, `short_rank`
    - `raw`:  its words, `short rank`
  - Either spelling, or `short-rank`, finds the same record:  scope lists normalize keys (`snakeCase`).
- Declarations take `{property:member_words}`, keeping the group name:
  - `the short rank of a card is:`
  - `a card has short rank as text` (article optional)
  - `a cards color is`
  - `its {property}` in a quoted formula
  - object literals
  - each records the property with `TypeScope.declareProperty(name, declaredBy, { words, datatype, auto })`
- Reads come two ways (epic page D5), worked out in `parse()`:
  - RESOLVED:  the words name a PROPERTY that the type of what's read declares
    (`getMember()`, up its super-types).
    - An enumeration's instance twin compiles to its class variable:  `the suits of the card` => `Card.Suits`.
  - LOOSE:  ONE word, which nothing need declare, blacklisted words out:  `the is-set-up of it`.
    - Several undeclared words are NOT a property read, so `the first card of the deck` stays the ordinal rule's.
    - `the first of its authors` is an item too, not a property named `first`:
      [`ordinal_of_expression`](rules/lists/OrdinalOfExpression.ts), for a list or something of unknown type
      (never a property the owner declares, nor `the top of its card`).
  - EACH ITEM'S, of a list of things (epic `language` I155):  a list, `core.mapToList(deck, (card) => card.shorthand)`.
    - `the shorthand of each card in the deck`, and with a condition, `... in the deck where it is face up`
      (its `each_item_where`, as a loop's).
    - `the shorthand of the cards in the deck`:  its words name the items, so the items' member comes first,
      before the deck's own `shorthand`.
    - `the names of the people`:  the list has no `names`, its items have a `name`;  a plural word reads the singular.
    - An enumeration's twin is each item's value here:  `the suit of each card` is no `Card.Suits`.
    - As a statement's `each`, `add the shorthand of each card in the deck to names` is still the loop's
      (`each_in_statement`):  one add per card.
    - Into text, the list reads as any list does:  `deck: A♣↓, 2♣↓, ...`, joined by `", "`.
  - `the X of Y` is ONE rule doing both, `property_expression`:  two would parse every operand twice.
    - its syntax:
      `the {property:member_words} of ((each:each) ({expression:each_item_where}|{arg:singular_identifier} in {expression:operand})|{expression:operand})`
    - `Priority.preferred`:  a declared `last card` beats the ordinal `the last card of`
    - but NOT `the position of` / `the number of` (`Priority.mostSpecific`)
  - `its X` is two rules:
    - `its_known_property` (resolved, `Priority.preferred`) takes the LONGEST run that `it`'s type declares
      - it re-parses with fewer tokens to find it (`declaredPrefix()`, in `rules.types.ts`)
      - e.g. `its short rank + its short suit`
    - `its_property`:  the loose word, at `Priority.normal`
      - so `its last card` stays `its_ordinal`'s
  - `the X` inside an action is [`the_own_property`](rules/properties/TheOwnProperty.ts) (epic `language` P2):
    - it reads the thing the action runs on (`P.MethodScope.withThing()`, through loops), never `it`
    - the article is required, in the language's own word (`{definite_article}`), so a bare word never reads a property
    - it steps aside for a variable of that name, never a constant:  no `the` reads one
    - `set the X to` writes it (P3):  `Variable` steps aside, so `AssignmentStatement` takes its expression branch
      - a variable of that name is assigned instead;  `set X to`, with no article, still makes a local
      - `the X is V` has a syntax of its own, since that form takes only a variable
      - a rule taking only `{variable}` can't say it with `the`:  `the score 1 to 3 of ...`
    - the longest run its type declares, or a scan found further down (`P.TypeScope.knowsPropertyAhead()`)
    - `the_things` (`the cards`) steps aside for a property of that name, by the same walk
  - `the character's name` is [`possessive_property`](rules/properties/PossessiveProperty.ts) (epic `language` P16), English only:
    - its syntax:  `{expression:possessive_owner} {possessive_mark} {property:member_words}`
    - `possessive_owner` is any operand ending at an `'s`, parsed on the tokens cut there, the last `'s` first:
      so a chain reads left to right, and the rule is never its own first operand
    - `possessive_mark`:  an apostrophe (`'` or `’`) and `s`, touching each other and the owner
      - or a plural's apostrophe alone (T23):  touching an owner WORD, a space after, `the cards' names`;
        an owner not ending in `s` (`the card' name`) is read, and refused (`possessive-needs-s`);
        a word touching it after (`doesn't`), or a lone `s` (`the card' s`), isn't one
    - it reads as `the X of Y` does:  the longest run declared (`Priority.mostSpecific`), else one loose word
      (`Priority.preferred`, so `the deck's first card` stays `possessive_ordinal`'s, at `Priority.specific`)
    - after an `of` (`SpellExpression.ofObject()`), the types say whose `'s` it is:
      the nearest name's when its type has the member or isn't known, else the whole phrase's when its type has it;
      both:  the nearest, and the `of` phrase warns (`PossessiveProperty.warnIfEitherReading()`)
    - never after a call:  `double the card's rank` doubles the rank
    - a translation writes it as `the X of Y`:  the rule's `writtenAs`
  - A possessive DECLARATION (T24), `a card's color is red if ...`, is `the color of a card is ...`:
    `property_value_getter` (registered last, so a translation finds Spanish's `el color de una carta es` first)
    and `type_property` (`the_property_of_a_thing`) each have a syntax with `{possessive_mark}`;
    a misspelled one is refused (`PossessiveProperty.refuseIfDeclarationMisspelled()`)
    - with no article (T26), a PLURAL known type, `cards' color is ...`:  the same declaration, warning to write
      `a card's color` (`PossessiveProperty.warnIfNoArticle()`);  a singular one, `card's color is`, isn't read;
      a translation writes it as one (the type match's `namesOne`)
- A type's class members:  ONE static rule, [`class_member`](rules/classes/ClassMember.ts).
  - its syntax:  `{type:known_type} {member:member_words}`
  - it takes the longest run that's a class variable of the type, e.g. `deck suits includes x` => `Deck.Suits`
  - it was a rule per enumeration (`EnumerationRule`)
  - A property's own list, `card suits`, is its KIND's plural:  `kind_values` reads it
    (see "The kind of a property's values").  Spanish's `palos de carta`, either.
  - `the number of card suits` counts:  `list_count` takes any operand whose datatype is a list

## Built-in types:  `the length of the name`

- `SP.BUILT_IN_TYPE_TABLE` ([builtinTypes.ts](builtinTypes.ts)) is DATA:
  one entry per built-in type with anything to say.
  - the types:  `thing`, `list`, `app`, `text`, `date`
  - each entry:
    - its docs
    - `itemType`, e.g. `text` holds `letter`s
    - `members`, each a `SP.BuiltInMember`
  - not a `.spell` file, not statics on runtime classes (epic page D25)
  - A type's NAME and super-type stay those of `P.BUILT_IN_TYPES`:  the parser's vocabulary.
    The entry's `superType` must agree (a test checks).
- `SpellParser.rootScope` loads it into the root's type scopes (`loadBuiltInTypes()`):
  - each `itemType`
  - each member with a `readAs` template, as a `P.ScopeVariable`
    - It holds `readAs` and `docstring`.
  - So member reads resolve it like any declared property (see "Members"), up the super-type chain:
    a `Deck` finds `List`'s `length`.
- `readAs` is how a read compiles;  `{it}` in it is what it's read from.
  - It's ONE of three forms (`parseReadAsTemplate()`):
    - `{it}.length`
    - `{it}.getFullYear()`
    - `core.itemCountOf({it})`
  - `MemberReadExpression.getMemberAST()` builds it.
  - So the same words compile per type:
    - `the length of the name` => `name.length`
    - `the length of the deck` => `core.itemCountOf(deck)`
  - Its datatype is the member's.
  - An unknown type still reads loose:  `x.length`.
- A `stored` member is a property the runtime class KEEPS:
  `id`, on `thing` and `list`, and a list's `name` (epic `spanish` P15).
  - Loaded into scope with no template, so it reads and sets like a declared property:
    - `the id of the person` => `person.id`
    - a set is allowed, unlike a `readAs` member's:  `set the id of the person to "owen"` => `person.id = "owen"`
  - In another language's words, its record's `output` is the member's name, so both still compile to it:
    Spanish's `el nombre de la pila` => `pila.name`, `poner el nombre de la pila a "mazo"` => `pila.name = "mazo"`.
  - No type may declare its own, e.g. `a person has an id as text` is refused.
    - That's `SpellStatement.refuseBuiltInType()`, through `SP.builtInStoredMember()`:
      the built-in type a type comes from says what it has, so a card may declare a `name`, a pile not an `id`.
  - EXCEPT a `declarable` one, with its own datatype or none:  `a pile has a name as text` is fine,
    `a pile has a name as number` is refused.
    - Its declaration compiles to the member's name, in any language's words:
      `una pila tiene un nombre como texto` declares `name`.
  - See "Ids and saving" below.
- A member with only `rules` (no `readAs`) is DOCS, for what built-in rules already spell.
  - e.g. `shuffle (a list)` => `list_shuffle`
  - Their rules compile it, and it's NOT loaded into scope:
    a `ScopeMethod` record there would change which method a call finds (P5's typed calls).
- A project's own declaration wins:  its type is first in the chain, e.g. `the size of a pile is: 52`.
- Spell's own types refuse changes, with a parse error saying why (see "Refused statements" below).
  - Why:  the root scope is shared by every project, and no journal records it.
  - refused:  declaring a property on a built-in type (`the length of a text is:`, `things have a tag`)
  - refused:  setting a built-in member (`set the length of the deck to 3`)
  - fine:  a METHOD of a built-in type.  Its record goes in the project's `methods`.
- Editors:
  - hover shows a member's `docstring`, and a built-in rule's member (`builtInMembersOfRule()`)
  - completion offers them with their docs
  - the Type Explorer lists the table's types and members, and its rules' syntax from the live grammar
  - `core`'s [`core.scopes.js`](../core/core.scopes.js) is the same, for pages with no parser.
    - It's GENERATED from the table:  `yarn lsp:scopes --builtins` in spell-app.
    - A test fails until you do.
- Adding a member:  ONE table entry, plus the `core` method or javascript property its `readAs` names.
  - [builtinTypes.test.ts](../../tests/spell/builtinTypes.test.ts) reads each one off a sample value, so it must be real.
  - Then `yarn lsp:scopes --builtins`, in spell-app.
- Adding a TYPE:  its name in `P.BUILT_IN_TYPES` first, then its entry.

## Dimensions:  `its "height" is a length in cm`

Numbers with units (epic `language` P23):  a DIMENSION is a type whose record holds its units (`P.TypeScope.units`).
- `length is a dimension:` declares one (`define_dimension`);  each line under it a unit, `- its base is "meter", aka "m"`
  (`dimension_base`) and `- one "inch", aka "in", is 2.54 cm` (`dimension_unit`), journaled (`declareUnit()`).
  - Each unit is worked out in base units as it parses:  `factor`, and `offset` for one `starting at` somewhere else.
  - They compile to `core.defineDimension("Length")` and a `core.defineUnit()` each, in the core's
    [dimensions.ts](../core/dimensions.ts) and Python's `spell_core/dimensions.py`.
- The built-in seven come from the core's `dimensions/dimensions.spell` and `dimensions.es.spell`, compiled ONCE by
  `yarn core:gen:templates` ([builtInDimensionFiles.ts](node/builtInDimensionFiles.ts)) into two tables:
  the kit's `spell/util/measures/dimensions.generated.ts`, every language's words, which each root loads
  (`SP.loadBuiltInDimensions()`), the JavaScript core and Spell UI's `<ui-dimension>` convert by;  and Python's.
- SHOWN in the reader's units (P24):  a measure printed, put in text (`[its height]`) or drawn (`{its height}`)
  compiles to `core.measureShown()` (`SP.shownMeasureAST()`);  `<ui-dimension value={its height}>` is handed
  `dimension` and `unit` (`SpellJSX.withMeasure()`).  The reader's system is the kit's `MeasureSystem`.
  - The Spanish twin pairs with the English line by line, so `pulgada` is the inch's id.
- A DURATION (T140):  the built-in dimension of how long, its units millisecond (`ms`, `msec`), second, a tick (1/60 of a
  second, HyperCard's), minute, hour and day.  `pause for 300 msec` and a place's `check it every 5 minutes` read one
  (`SP.durationUnitOf()`):  a measure written out, anything that measures one (`pause for the delay`), or a number then a
  duration's unit (`pause for (10 + 10) sec`);  a pause compiles to the core's name for its unit, `SP.CORE_TIME_UNITS`.
- A property that measures:  `its "height" is a length in cm` (`outline_specifier_measure`) holds a `number`, and its
  record says what it measures, `P.ScopeVariable.measure`.
- A PERCENT (P34):  the built-in proportion dimension (`SP.PROPORTION`), its measures KEPT as their fraction, its base
  unit (`SP.measureKeptIn()`):  `18%` compiles to `0.18`, so `the bill * the tip` works.
  - `its "tip" is a percent` (`outline_specifier_percent`, before `a {type}`) and `a proportion in percent` both hold one.
  - Shown by `MeasureSystem.shown()` in Intl's percent style, whatever the reader's system.
- `unit_words` reads the longest unit name at a place, of any dimension in scope (`SP.unitAt()`):  a name, an `aka`, a
  plural;  tokens touching read as one name (`°C`), tokens apart as words (`fl oz`).
- `measure_literal`, an operand:  `172 cm`, `5 ft 8 in`, `2' 3 1/2"`, `18%`, its value worked out in its last part's unit.
  - The tokenizer reads a `"` straight after a digit as a mark (`marksAfterDigits`), not text.
  - `in`, an inch, only after another part:  `3 in the list` stays a number.
- `measure_in`, a suffix binding tightest (`Precedence.measure`):  only after a measure (`SP.measureOf()`, off the
  member read's `data.member` or the literal's `data.measure`), so `x in ...` reads as it did everywhere else.
  A unit of another dimension is refused (`SpellWarnings.refuseIf()`).
- A project's declarations carry a dimension's `units` and a property's `measure` (T34):  an importer reads a library's
  own dimension as its own.

## Dates and times:  `the minute of now as two digits` (epic `language` P63)

- A date's PARTS and NAMES are members of the built-in `date` type (`datePart()` in [builtinTypes.ts](builtinTypes.ts)),
  each read through the core, `core.minuteOf({it})`:
  - numbers, no leading zero:  `year`, `short year`, `month number`, `day`, `hour` (0-23 always), `minute`, `second`,
    `week` (ISO's), `weekday number` (1-7 from the person's first day of the week)
  - names, in the program's language:  `month`, `short month`, `weekday`, `short weekday`, `AM or PM`
  - aliases, each its own member:  the plurals (`the seconds of now`), `day of the week`, `AMPM`, `meridiem`, `meridian`;
    member words are read in any case
  - Spanish's words:  its `builtInMembers` (`el número del mes`, `el día de la semana`)
  - On a date the type is known, so `the second of now` is its second;  `the second of the deck` is still an item.
- Rules in [expressions/](rules/expressions/):
  - suffixes:  `as two digits` / `with a leading zero` (`as_two_digits`), `is PM` (`is_meridiem`), `as a duration`
    (`as_a_duration`, its `short` / `long` and `in <unit>`), `is a weekend day`, `is before` / `is after`,
    `is the same day as`, `is today` / `is tomorrow` / `is yesterday`
  - `as a duration in months and days` (J253):  its units are `duration_unit`'s words, a list joined by `and` or
    commas, said biggest first whatever their order;  years, months, weeks, days, hours, minutes, seconds
  - `is in the morning`, `is at night`, `is this afternoon` (`is_day_part`, J252):  `day_part`'s words, Owen's hours in
    core's `DAY_PARTS`
    - Spanish's part needs its `la` or `por`:  `es la mañana`, `es por la mañana`;  `es mañana` is tomorrow
  - times today (J252):  `noon`, `midnight` (`time_of_day`);  `9am`, `9:30 PM` (`time_literal`, its own `parse()`:
    the `:` touches its numbers);  Spanish's `21:30` too
  - operands:  `the next weekend`, `the days until` / `since`, `the start of the day of`, `the days in the month of`,
    `the hours of <a duration>` (`duration_part`:  only of a measured duration)
  - `the time zone`, `the short time zone`, `the long time zone`:  `the_date`'s
  - `"2026-12-25" as a date`, `the weekday of now as a number`:  `as_a_type`'s
- Date arithmetic is `+` and `-`'s ([dateMath.ts](rules/math/dateMath.ts)):  a date and a MEASURED duration move the date,
  `core.addToDate(date, 2, "day")`;  a date minus a date is the seconds between them.
- A date minus a date MEASURES a duration (`SP.SECONDS`), so its parts and `as a duration` know it:
  - `SP.measureOf()` asks a rule's `getMeasure()` when the match has none of its own:  a chain of one precedence asks its
    last suffix (`resultMeasure()`), parentheses and variables pass theirs on
  - a variable `set` to one, and a property whose inline value is one (`its "time left" is the next weekend - now`),
    keep it
- What they compile to, and the region's formats:  core's [dates.ts](../core/dates.ts), "Overview" in
  [core's AGENTS.md](../core/AGENTS.md).

## Membership:  `a card belongs to one pile`

- [`belongs_to_one`](rules/classes/BelongsToOne.ts):  `a card belongs to one pile`.
  - A card is in at most ONE list of the pile FAMILY at a time.
  - The family:  `Pile` and its sub-types (`a tableau is a pile`).
  - `a deck is a list of cards` is outside it (epic page D7):  a card can be in the deck AND one pile.
  - The list types stay plain:  `a pile is a list of cards`.
  - `can_belong_to_many`, `a card can belong to many piles`, is the opposite.
    That's what lists do anyway, so it does nothing.
- Both types MUST be declared ABOVE it:  it compiles to code which needs both classes.
  - `parse()` refuses a stub, saying what to write.
  - So the live examples say it in `Pile.spell`, just under `a pile is a list of cards`.
  - Refused too:  a list type of spell's own (`one list`), or a type that isn't a list.
- Scope:  the item type gains a read-only member naming the list type (`TypeScope.declareOwnerMember()`).
  - e.g. `pile` on `Card`:
    - its `datatype`:  `Pile`
    - `exclusive: true`
    - its `declaredBy`:  the membership line
  - So `the pile of the card` / `its pile` resolve as any member does (see "Members"),
    and go-to-definition lands on that line.
  - It REPLACES a `pile` another statement declared, e.g. auto-declared by an earlier `set`.
  - NOT for a built-in item type (`a thing belongs to one bag`):  the root scope is shared.
  - Nothing goes on the list type's `TypeScope`:  the member is the whole record.
- `set the pile of the card to ...` is refused (`AssignmentStatement.parse()`):  move the card instead.
- It compiles to two patched members, the member first:  each in its class's body when the project declares the class,
  else patched on where the line is, after both classes.

  ```js
  Object.defineProperty(Card.prototype, 'pile', { get() { return Pile.ownerOf(this) }, configurable: true })
  Pile.exclusive = true
  ```

  - They're `P.ASTPatchedMember`s:  the member must win over any accessor an earlier statement gave it.
  - Moved into `Card`, the member takes the line's docstring and `SPELL: DECLARES` with it
    (`P.WriterProject.moveMembers()`):  so its declaration's code is the getter, and a Type Explorer finds it (I91).
- Declarations:  the member itself, `{ property: "pile", of: "Card", datatype: "Pile", exclusive: true }`.
  - Loading adds it as written (`SpellDeclarations.loadVariables()`):  no other record needed.
  - Picking `Card` brings `Pile`, as any property's datatype does.
- Runtime:  `core`'s `List` keeps the owners.
  See [core's AGENTS.md](../core/AGENTS.md), "Membership and guards".

## Ids and saving:  `a person is saved in its own file`

Every thing and list has an `id`, built in, and is saved INSIDE what holds it (epic `people-and-orgs`, decision Q42):
written whole the first time, a reference after.
A kind that says so is saved in a file of its own.
- The `id` is a `stored` built-in member (see "Built-in types"):
  - nobody declares it, and declaring one is refused
  - the runtime makes one up on first read, e.g. `person-k3x9q2mf`, unless it was set first
- A list says what it holds, so saving knows before it holds anything:
  - `a person has dates as a new list of dated-events`
  - or in its outline body, `- its "dates" is a list of dated-events` ([`outline_specifier_list`](rules/classes/OutlineSpecifierList.ts))
  - both compile to `this.declareProp("dates", { itemType: "DatedEvent", init: () => new List(...) })`
- [`saved_in_file`](rules/classes/SavedInFile.ts):  a person gets a file (an entry) of their own.
  - e.g. `a person is saved in its own file`, or `- it is saved in its own file` in its outline body
  - What holds one saves a reference to it.
  - It compiles to `Person.savedInFile = true`, after the class:  `Thing` says `false`.
  - Refused for a built-in type.
- [`saved_inline`](rules/classes/SavedInline.ts):  says the default, e.g. `a dated-event is saved inline`.
  - It compiles to `DatedEvent.savedInline = true`, which changes nothing.
- [`published_as`](rules/classes/PublishedAs.ts):  a type's records are for other apps too, as a Lexicon (epic `atmosphere` P10).
  - e.g. `- it is published as "xyz.statusphere.status"`, or `- it is published`, named by its project's address
  - It compiles to `Status.publishedAs = "xyz.statusphere.status"` (or `true`), after the class.
  - Its `mutateScope()` marks the type (`P.TypeScope.declarePublished()`), so its round-trip warnings follow:
    - a decimal number, named at this line
      (worded when the warnings are gathered:  `SpellWarnings.noteIf()` with a wording function)
    - a rename, at its version line
  - Refused for a built-in type, and for a name that isn't an NSID.
- Versions (P6):  the core reads them as it loads an older file ([core's AGENTS.md](../core/AGENTS.md)).
  - [`version_step`](rules/classes/VersionStep.ts):  a rename or a drop
    - e.g. `a person version 2 renames name to names`
    - e.g. `a person version 3 drops nickname`
  - [`upgrade_method`](rules/classes/UpgradeMethod.ts):  anything else, e.g. `to upgrade (a person) to version 4: ...`
- Nothing goes in scope:  the class says it when the code runs.

## One thing by name or place:  `tableau T1`, `the first tableau`

- Two expression rules name ONE of the program's things (epic `drawable-thing` P19), in [classes/](rules/classes/):
  - [`named_thing`](rules/classes/NamedThing.ts), by its name:
    - e.g. `tableau T1`, `foundation "clubs"`
    - compiles to `core.thingNamed(Tableau, "T1")`
    - the name:  one word starting with a capital (`thing_name`), or text in quotes
    - a sub-type's thing too:  `pile T1` finds a tableau
  - [`thing_at_place`](rules/classes/ThingAtPlace.ts), by its place, in the order the program made them:
    - e.g. `the first tableau`, `the last tableau`
    - compiles to `core.thingAtPlace(Tableau, 1)`
  - Both are core's thing references, `Tableau#T1` and `Tableau#1`:  [references.ts](../core/references.ts).
  - The writers read off either with `?.`:  the program may not have made it (`ProgramWriter.ITEM_READS`).
- And EVERY one of a type (epic `outline-spell` P16):  [`every_thing`](rules/classes/EveryThing.ts).
  - Some of them, its short form of `list_filter`:  [`every_thing_where`](rules/classes/EveryThingWhere.ts),
    `every recipe where its title includes the search` (epic `data` P10).
    - Any `where`, `recipes where they are the cook` ~== `recipes where its cook is them`:  there, [`where_field`](rules/places/WhereField.ts)
      reads `the cook` as the thing's own, only after [`they_are`](rules/places/TheyAre.ts) (epic `data` T66).
  - Or by its fields' values:  [`every_thing_with`](rules/classes/EveryThingWith.ts) (epic `data` P32, Q29).
    - `every favourite with the same address and name "blah"` ~== `every favourite where its address is address and its name is "blah"`
    - `the same <field>` matches the value of that name where the line is;  `<field> <value>` says the value
    - a `where` after, for anything else;  `the saved favourites with ...` too
    - `remove saved favourites with the same address` takes each from its place:  [`list_remove_with`](rules/lists/ListRemoveWith.ts)
    - NOT `with the address`:  in a new thing, `a new card with the suit` sets its suit to `the suit` (Q30)
  - In order, any list:  [`list_sorted_by`](rules/lists/ListSortedBy.ts), a suffix, `every recipe, sorted by its title`.
    - It's left alone inside a predicate or a key (`isItemScope()`):  the comma after a `where` belongs to the list.
    - Backwards:  `..., newest first` (`highest first` ...,  any key `reversed` or `z-a`;  Spanish `al revés`, `z-a`, `de mayor a menor`), after the key,
      [`sort_key_order`](rules/lists/SortKeyOrder.ts), a suffix only a key takes:  `core.descending(key)`,
      which `core.sortedBy()` reads largest first, an item with no key still last (epic `atmosphere` T48).
  - e.g. `every pile`:  every pile the program made, sub-types included, in the order made
  - compiles to `core.everyThing(Pile)`, a scratch list:  it takes none of them from the lists holding them
  - its datatype:  `list of piles`
  - Only the program's things:  NOT a thing made in a test, nor a scratch list (made `quietly()`).
  - By its plural too (P23):  `the foundations` is `every foundation`.
    - Its rule:  [`the_things`](rules/classes/TheThings.ts).
    - Unless a variable, a constant, or the method's own thing's member goes by that word.
- `named_thing` has its own quick `test()`:  a name near its start.
  - Near:  within `SpellType.MAX_NAME_WORDS` words.
  - Without it, `{type}` is a subrule, so the plain test would pass any line with text in quotes on it.
- It warns when two things are given the name it reads, in so many words:
  `set a to a new tableau with name = "T1"` twice.
  - `assignment` and `get` count each such name, as they change scope.
    - The code:  `NewThing.noteNameGiven()`, called from their `mutateScope()`.
    - Kept per type and each super-type the project declares, journaled.
    - A name worked out as the program runs, `"T" + the number`, isn't counted.
  - The warning is noted with `SpellWarnings.noteIf()`:  asked again once the whole project has parsed,
    so a reference written above the things it names warns too.

## Guards:  `a tableau can take a card when: ...`

- [`list_guard`](rules/classes/ListGuard.ts):
  what a list type takes, or gives up, when something MOVES (epic page Q23 - Q25).
  - `a tableau can (add|take) a card when: ...`
  - `a stock-pile can (release|remove|give up|let go of) a card when: ...`
  - the old `if:` still reads one release, with a warning (epic `debut` P27, Q42)
  - its short forms (Q47), each also giving its ability:
    `- its cards are draggable when the card is face up` (`itemsDraggable`),
    `- droppable when ...` (`droppable`, the card the list's own item)
  - `a foundation can never (release|remove|give up|let go of) a card`:  always no
  - Its body answers yes or no, inline or indented.
    - Its last line asks, even one that reads as a statement:
      `the card is the last item of the card's pile` is `card === ...`, not `card = ...` (`answersYesOrNo()`,
      `readsAsQuestion`;  epic `language` T135).
    - A last line that asks only up to a point is that question, and an error for the words after it, as on one line:
      `the card is on top of its pile`, with only `is on top` defined, says "Don't understand `of its pile`"
      (`lastLineValue()`;  epic `language` I101).
    - A line ABOVE it of that shape still sets:  a warning says so, and how to ask, end it with `and`
      (`AssignmentStatement`'s `warnIfSetsInsteadOfAsking()`, `sets-instead-of-asking`;  epic `language` T137).
  - In the body:
    - `the card` is the card
    - `it`, `its` and `the tableau` are the list
    - so is each kind up its chain, `the pile` in a foundation's, unless a blank or variable has that name
      (`P.MethodScope`, epic `language` J188:  in every type's rules and actions)
- It compiles to a method of the list's class, overriding `List`'s yes.
  - `canTake(card) {...}` or `canGiveUp(card) {...}`
  - It's hoisted into the class like any member.
  - A sub-type inherits it.
  - No scope record and no declaration:  it's the class's own method, which an importer gets with it.
- [`list_move`](rules/lists/ListMove.ts):  moves a thing from one list to another.
  - e.g. `move the card to the tableau` => `core.move(card, tableau)`
  - It's a statement, or a yes / no (`operandInExpressions`):  `if move the card to the tableau then ...`.
  - It asks the list of the card's family holding it to give it up, then the target to take it.
  - Refused:  nothing changes.
  - A card that belongs to no family:  only the target is asked.
  - `Priority.overridable`:  a project's own `to move (a card) to (a pile)` wins, e.g. the frozen Solitaire's.
- Only `move` asks.
  - The other list statements never do:  they're for dealing, gathering cards back, shuffling.
  - They're `add`, `remove` and `empty`.
- Asking without moving:  two `Negatable` suffixes, `can_take` and `can_give_up`.
  - `the tableau can take the card` => `core.canTake(tableau, card)`
  - `cannot give up` negates
- Probe ledger:  `probeMembership()`, probes `X1` ... `X9`.
  - It uses the frozen `Card` and `Deck`.
    Its `Pile.spell` is the probe's own.
  - Compiled and RUN:  [membership.test.ts](../../tests/spell/parserTests/membership.test.ts).

## File => block => line => statement

- [`Block.parse()`](rules/Block.ts) first joins a condition said over several lines into ONE line
  ([`JoinedLines`](rules/JoinedLines.ts), epic `language` P55, Q53):
  - a line ending in `and` / `or` (the `and_or` word rule) takes the line indented under it, however deep;
    what's under THAT is the joined line's body
    - and the lines after that one at its indent, while each line before ends in `and` / `or` (epic `language` T135)
  - so does a line with lines indented under it STARTING with `and` / `or` (`and its value is ...`), any number of
    them (T135, Owen's form);  the bubbly look draws them in the head line (`SP.BubblyLayout`), not its body
  - a line of just `and` / `or` joins the lines either side, each in parentheses of no width
  - a line under it starting with `or`:  what follows the `or` in parentheses of no width, one alternative, its `where`
    its own;  the first line's `where` ends at it (`SpellStatement.beforeAlternatives()`;  epic `language` T146, J227)
  - a line under it starting with `and` then a VALUE ends the `where` above it the same way, one more item of the list
    (`and the last card of each column`);  `and` then a condition goes on with it (`and it is red`)
    (`SpellStatement.conditionBeforeAlternatives()`;  epic `language` T152)
  - the tokens stay the lines' own:  every rule reads the joined line as one written whole
  - the editors indent the line after one as it's typed (`LSP.SpellKeywords.CONTINUES_LINE`)
- Then it loops over the root `BlockToken`'s items:
  - a `LineToken` => `parser.parse(items, "line", scope)`
    - it passes ALL remaining items, so a statement can take the indented block after it
  - a nested `BlockToken` nobody claimed => parsed recursively, in the SAME scope
  - `items.splice(0, match.length)`:  a header + its nested block is one item of length 2
- [`BlockLine.parse()`](rules/BlockLine.ts), in order:
  1. a blank line => `blank_line`
     - a page's head or tag line is read as its code-spell twin from here on (`SP.PageTwin`;  "Pages", below),
       and what the page tokenizer found wrong on it is the line's error
  2. pop the trailing comments:  usually one
  3. parse the rest as `"statement"`;  leftovers become a `parse_error`
     - a statement its rule REFUSED is a `parse_error` already, saying why (`SpellStatement.refuse()`):
       the line's error, never committed
  4. `commitStatement()`:  the ONLY place a parsed statement changes scope, and only for the line's winner
     - `mutateScope()` on the statement, then on each inline statement inside it, outermost first
     - if the rule takes a nested body and the next item is a `BlockToken` => `parseNestedBlock()`
     - `mutateScopeFromBody()` on the statement, e.g. a method records what it returns:
       its result is kept as the line's `data.fromBody`
- [`SpellStatement`](rules/Statement.ts):
  - A body keyword ending a rule's syntax, or a choice of them, is taken OUT of `rules` at construction.
    It goes into `rule.bodySpec`.
    - the keywords:  `{statement_body}`, `{expression_body}`, etc (see `BODY_KEYWORDS`)
    - A body is parsed in `match.nestedScope`, which needs the statement's match to exist first.
  - A `leadIn` keyword, `{with_nested_statements}`, is ALSO a registered rule.
    It matches words on the line, e.g. `where:`.
    - It stays in `rules`.
    - The statement takes a nested body only when it matched (`takesNestedBody()`).
  - Inline body:  after its sequence matches, `parse()` parses the rest of the line in `nestedScope`.
    - It does NOT change scope:  this runs for every candidate, winners AND losers.
    - A comma works as `:` does after a block opener (epic `language` J269):  its syntax says `(:|,)?`,
      `if the result is ok, set the name of the baby to it`.
      - Only before a `{statement_body}`:  never after a definition (`... is :? {expression_body}`)
        or a list's header (`where:`), where a comma still means a list.
      - A line that read with words left over, holding a comma, is read again at each comma, left to right
        (`parseAtComma()`):  the words up to it whole as the opener, the rest whole as its statement.
        So `if its rank is one of 1, 2, 3, print it` keeps its list, though the list first read on over `print`.
  - The inline statement OR nested block is recorded as `match.data.body`.
    - Read it with `rule.getBody(match)`, NEVER by group name.
  - Anything that parses a `"statement"` on its own, and keeps it, MUST commit it:
    - with [`commitStatement()`](rules/Statement.ts), e.g. JSX's `on...` handlers
    - or generically with `parser.commit(match)`, e.g. rule unit tests
      - `unitTestModuleRules`, `Parser.testRules()`
  - `parseNestedBlock()` parses a `{nested_statements}` as a block.
    - in `statement.nestedScope`
    - It sets `data.enclose`.
    - A `{nested_expression}` (e.g. `return`) accepts a single-line block only.
  - `nestedScope` comes from `rule.getNestedScopeForMatch()`:
    - default:  the same scope
    - `if` / `else` => a new `BlockScope`
    - methods, events, property getters, list loops => a new `MethodScope`
- Errors are never thrown.
  - `parse_error` matches roll up into `match.data.errors`, on line and block matches.
    See `Block.getParseErrors()`.
  - They compile to `/* PARSE ERROR: ... */`.
- Every message for the person writing a program is in the program's language (epic `spanish` P17):
  a warning, a refusal, a parse error, a long form.
  - A key in the language pack's `parserMessages` ([English's](languages/en/parserMessages.ts),
    [Spanish's](languages/es/parserMessages.ts)), read with `SP.Language.of(scope).parserMessage(key, params)`.
  - Its examples are the language's spell:  `poner X a una nueva lista de texto`.
  - A key a pack lacks reads English;  `spell translate check` reports it.
  - Rule code never writes a sentence of its own:  `noEnglishInRules.test.ts` checks.
- Refused statements:  a `parse()` which understood a statement, but mustn't take it.
  - It returns `SpellStatement.refuse(match, message)`.
  - NOT `undefined`, which would say only "Don't understand ...".
  - It's a `parse_error` match over its tokens, with `message`.
    `BlockLine` reports it.
  - It competes with the REFUSING rule's priority (`P.Match.priority`),
    so a plainer rule matching the same words can't take the line instead.
    - Refuse only what the rule matched to the line's end, or it beats a longer match.
  - Used by the property declarations (`SpellStatement.refuseBuiltInType()`) and `AssignmentStatement`:
    see "Built-in types".
  - Errors inside JSX `{...}` live in the JSX rules' `match.data`, not `matched`.
    - `BlockLine` gathers them from anywhere in its statement into `data.errors` too.
      That's `SpellJSX.parseErrorsIn()`.
    - And from an indented body that's ONE expression, not a `block`:
      `return` alone, its markup on the lines below.
    - They're reported, but compiled in place.
- Warnings:  what a program should say, but which doesn't stop it, e.g. a type (epic `output-targets`, Q24).
  - `a calculator has an input` => `Say what "input" is, e.g. "a calculator has an input as text"`
  - A rule notes one on its OWN match while parsing:  `SP.SpellWarnings.note(match, message, at?)`.
    - In `parse()`, or in `mutateScope()` for what only it knows.
      - e.g. `assignment`'s:  a new variable's `[]`, or a property a set declared
  - They're NOT rolled up like errors.
    - `SP.SpellWarnings.in(file.match)` walks the file's matches as they are now.
      - `matched`, and matches in `data`
    - So an incremental parse needs nothing of its own.
    - Only those about the file's own tokens:
      a match parsed from a string (`quoted_method_signature`) sits at the string's offsets,
      so its rule notes them again, about its quoted text.
  - What a LATER line or file may settle:  `SP.SpellWarnings.noteIf(match, message, stillHolds, at?)`.
    - `in()` reports it only while `stillHolds()`.
    - It's asked then, with what the whole project declares by then.
  - What only a whole-project pass can say, while compiling (epic `data` P12):  `P.WriterOptions.noteForAuthor`, which
    `SP.SpellProject.combineCompiled()` hands every writer.
    - A writer words nothing:  it knows no language.  `SP.SpellWarnings.noteRead()` words it, and notes it on the line it's about,
      so it joins the same list.
    - It's there once a compile has run, not after a parse alone.
  - So far:
    - a property with no type, or a list of nothing said (`define_property_has`)
    - a parameter with no type (`var_method_arg`)
    - a new variable set to a list of nothing said (`set state to []`),
      or a property a set declares from a value that doesn't say (`assignment`)
    - a local, argument or loop variable hiding a property of the action's thing (epic `language`, Q2)
      - e.g. `set score to 3` in a game => `Here "score" hides the property "score" ...`
      - Noted where a local is made (`assignment`), and where `the X` reads one (`variable`), never on a bare read:
        `MemberReadExpression.warnIfHidesProperty()`, `noteIf()`, so a property declared further down counts.
      - In a text's `[the score]`, whose tokens aren't the file's, the text notes it again:
        `SP.SpellWarnings.noteAgain()`.
    - a LOOSE member read its type never declares (Q45)
      - its rules:  `property_expression`, `its_property`
      - e.g. `the name of the pile` => `A pile never says it has a name:  declare it, e.g. "a pile has a name as text"`
      - Only on a type the project declares, all of whose super-types are its own or spell's:
        an imported type's importer may give it anything (`MemberReadExpression.warnIfUndeclared()`, `noteIf()`).
    - an article that doesn't agree with its noun (epic `spanish` P8), the ONE warning no rule notes:
      - e.g. `a apple` => `Did you mean "an apple"?`
      - Spanish's:  `el carta` => `¿Querías decir "la carta"?`
      - `BlockLine` notes it on each line's statement, once committed (`SP.SpellWarnings.noteArticles()`),
        so a type the line declares already has its gender.
      - An article is a form of the language's `indefinite_article` / `definite_article` word rule:
        `Synonyms.matchAt()`, `Synonyms.formOf()`.
      - Its noun:  the words after it, up to a structural word.
      - Its wording is the pack's `did-you-mean` message.
      - What agrees is the language pack's, `SP.Language.agreement(article, noun, type)`:
        each pack's own, [English's](languages/en/agreement.ts) and [Spanish's](languages/es/agreement.ts).
        - English:  `a` / `an` by the noun's first sound;  needs no type.
        - Spanish:  gender and number, only for a noun naming a type.
          - A type's gender is read off its declaration's article, and kept in its declarations:
            `TypeDeclaration.genderOf()`, `P.TypeScope.gender`.
          - The built-in types' are in the Spanish pack.
  - Editors show them as `DiagnosticSeverity.Warning` (`SpellLanguageService.diagnostics()`).
  - `spell compile` lists them after its errors, never counting them:  see "Language server".

### What's indented under a line

- While `BlockLine.parse()` reads a line's statement, `SpellStatement.below` is the block indented under it
  (epic `language` P48):  so a line with no colon at its end can say whether it takes that block as its body.
  - `reopen_type`:  `a pile`, with code under it, re-opens the type.
  - `property_value_getter`:  `its "color" is one of red, black`, with value lines under it, is worked out (T93).
  - Rules read it through `SpellStatement.blockBelow()` / `hasCodeBelow()`, which note that they did:
    the line's `data.readsBelow`, so `BlockLine.reparseBody()` re-parses the line whole when its body changes.

## A property's list of values:  `- it is locked` (epic `language` P39)

A property with a list of values keeps it on its record, `P.ScopeVariable.listedValues`, however it got one:
a line of the built-in types table, a built-in template, or a project's own `one of`.

- The list is in its language:  Spanish's `candado` lists `bloqueado`, and `valueOutputs` says what each compiles to.
- Each word is a constant the language knows, so `its lock is locked` needs no quotes.
- `P.TypeScope.propertiesListing(word)` finds the properties that list a word, own or inherited, singular or plural.
- Three things read the list:
  - `it_is_value`, a line in a type's body:  `- it is locked`, `- it is a queen`, Spanish's `- está bloqueada`
    - starts with its literal words, so it's filed under them and no other line tries it
    - the same getter as naming the property;  it outranks setting a variable named `it`
    - a word on no list, or on two properties' lists, is a parse error;  a variable or property of that name isn't ours
  - `is_equal` and `is_listed_value`, comparing:  `if it is clubs`, `if it is a queen`
    - `is_listed_value` only when the word names no type:  a known type's `is_a` wins
  - the check on a plain quoted value, `SpellConstant.wrongValueMessage()`:
    - a line giving it a value, or a `set`, is refused:  `- its lock is "banana"`
    - a comparison, a new thing or a drawing's tag warns:  `<card suit="banana"/>`
    - a value from a variable or with a `[fill-in]` isn't checked:  that's for the run-time check

## Outline bodies:  `a card is a thing where:`

- The OUTLINE style (epic `outline-spell`):  a type's heading, then indented lines all about that type.
  In them, `it` / `its` mean that type, e.g.

  ```spell
  a card is a thing
  	it has a name as text
  	its "suit" is one of clubs, diamonds, hearts or spades
  	it "is a (suit)" for its suits
  	its "color" is red if its suit is either diamonds or hearts otherwise it is black
  	it belongs to a pile
  ```

  - It compiles EXACTLY as the same lines in the sentence style do (`a card has a name as text` ...).
  - [outline.test.ts](../../tests/spell/parserTests/outline.test.ts) pins it.
- `create_type` / `create_list_type` share [`TypeDeclaration`](rules/classes/TypeDeclaration.ts).
  - A syntax ending `{with_nested_statements}?` takes the body.
    - That's `where:`, `with:`, `:`, or `where` alone.
    - Or nothing at all (P10):  the indented block under a type's heading is its body anyway.
      - e.g. `a stock-pile is a pile`, then `- can give up a card when: ...` under it
      - `TypeDeclaration.takesNestedBody()`
  - With nothing indented under it, the same syntax declares the type alone.
  - The body's scope is a [`P.SubjectScope`](../parser/scope/SubjectScope.ts):
    - it owns nothing, so what its lines declare lands where the same lines at the top level would
    - `subject` names the type
  - `flatBody` (`SpellStatement`):  the body is NOT `enclose`d.
    - `Block.getAST()` splices its statements in after the type's.
    - So `SP.hoistClassMembers()` moves its members into the class as usual.
- Re-opening a type (P11):  `a game:`, then a body, adds to a type declared elsewhere, in the same file or a later one.
  - Its rule:  [`reopen_type`](rules/classes/ReopenType.ts), a `TypeDeclaration` with no class of its own.
    Its body's lines compile beside it, as the sentence style's would.
  - Its colon may be left out when code is indented under it (epic `language` P48):  `a game`, then its lines.
    A lone `a game`, nothing under it, is a fragment.
  - A type nobody declares is refused, saying how to declare it.
  - A type declared a SECOND time is refused, naming the first and saying to write `a game:` (issue I13).
    That's `TypeDeclaration.refuseTakenNames()`.
  - So a place's fields can stay in one file, and what's drawn in another beside it (epic `data` T76).
- `subject_it` / `subject_its`:  `it` / `its` as a line's SUBJECT.
  - Their class:  `SubjectRule`, in `types/`.
  - Each is a `SpellType` match for the type:
    - `value`:  its name
    - `raw`:  its instance name
    - `data.scopeType`
  - Only directly in a `SubjectScope`.
    Inside a getter or method in the body, `it` is the instance, as anywhere.
  - Each member rule gets a second syntax, with `{type:subject_it}` where it says `(a|an) {type}`:
    - `define_property_has`, `property_value_getter`, `belongs_to_one`
    - `quoted_type_expression`, `quoted_property_formula`
    - `its_quoted_property` (a `type_property` for `property_value_either`)
    - `saved_inline`, `saved_in_file`, `published_as`, and `list_guard`'s three (`- it can take a card when: ...`)
- A property's RULES (epic `property-editor` P9):  what its value must be, beyond its type.
  - The words after `must`:  [`must_rule`](rules/classes/MustRule.ts).
    - e.g. `not be empty`, `match "^\d+$"`, `be between 1 and 5`
    - then, if it likes, what to say when it's broken:  `with suggestion "..."` (`rule_suggestion`)
  - A pattern is read exactly as typed (`pattern_text`):  `[a-z]` is a set of letters, not a fill-in as in text.
  - Three places:
    - a line of its own, `- its title must not be empty`:  [`property_must`](rules/classes/PropertyMust.ts)
    - the property's own line, `- it has a title as text, which must not be empty`
    - indented under it, `- it must not be empty`:  `property_body_must`
  - The last is the property's own BODY:  `{nested_statements}?`, at the end of `define_property_has`'s syntaxes.
    - Its scope is a `P.SubjectScope` the property statement declared.
      `property_body_must` takes a line only there.
    - The body compiles to nothing itself:  `DefinePropertyHas.rulesOf()` reads its lines.
  - Each rule lands on the property's record, so the declarations write them (`rules`).
    - `P.TypeScope.addPropertyRules()` keeps them by statement, journaled.
    - From its body:  in `mutateScopeFromBody()`.
    - From a line of its own:  in its `mutateScope()`, if the property is declared above it (else a warning).
  - And in the compiled class:
    - with the property:  `declareProp("title", { type: "text", rules: [...] })`
    - for a line of its own, `P.ASTPropertyRules`:  `Card.declareRules(...)` after the class
- `subject_implied`:  the subject LEFT OUT (P8).
  - e.g. `- has a name as text`, `- "suit" is a suit`
  - A `SubjectRule` taking NO tokens (`zeroWidth`, see "Rules and matching").
    Its match is the same as `it`'s, so the rule using it can't tell the difference.
  - Each syntax above with `it` or `its` has a twin with the subject left out, `{type:subject_implied}`.
  - Only where the line then starts with a quoted name, or a verb:
    - `has`, `belongs`, `is saved`, `can`
  - Or a BARE name (P9):  `- rank is a number`, `- color is red if ...`
    - Its rule:  [`body_member_words`](rules/properties/BodyMemberWords.ts).
      That's `member_words`, but never starting with `it` / `its`, or any word a statement starts with.
    - So `- return x is 1` stays a `return`.
    - Those words come from the `statement` rules themselves:  each one's first fixed word.
    - A property named so keeps its quotes:  `- "type" is ...`
  - `is` or `are`:  `- piles are a list of piles`
  - A subject-less getter is a declaration (`Priority.declaration`), once its body parsed:
    so `- score is 0` is the card's getter, not a variable (it warns:  "score is always 0 ...").
    Inside a getter or method there, `total is 0` still sets a local.
  - Without a subject, `- "x" is ...` is a property, as `its "x" is ...` is.
    - The alias's twin has no `is`.
    - `QuotedTypeExpression.isPropertyWithoutSubject()` steps aside for it:
      the alias's higher priority would otherwise take the quoted name alone.
  - Outside a type's body, nothing changes:  `"rank" is a number` at the top level is an error.
- Quoted names:  "quotes teach a new word".
  - `quoted_type`:  `a "card" is a thing`, in any type declaration
  - `quoted_member`:  `its "short rank" is ...`, in a body
  - After `its "x" is` comes an `outline_specifier`.
    It's a type specifier without the `as` word.
    - e.g. `one of ...`, `a number`, `yes or no`, `a list of people`
  - A declaration names them without quotes:  `Rule.declaredText()`.
    - `SubjectRule` also overrides it:  `card`, not `it`.
- An ABILITY may be a word before the template, on the type's own line (epic `language` P48):
  `a "card" is a draggable two sided view`, `a "pile" is a viewable, droppable list of cards`.
  - The same flag as `it is draggable` in its body:  `static draggable = true`, first among its body's statements
    (`TypeDeclaration.abilitiesOf()`, which `Block.getAST()` asks for).
  - `[ability:{draggable_or_droppable} ,?]`, so several, a comma between them optional:
    `a clickable selectable thing`, `a draggable, clickable two sided view` (epic `language` I112).
    - An optional delimiter may be left out, and is never taken last:  `P.Repeat`.
  - A viewable list's go before `viewable` or after it:  `a viewable, droppable list of cards`,
    `a droppable viewable list of cards`.
  - Spanish's come after the template, as its adjectives do:  `una "carta" es una vista reversible arrastrable`,
    `una "pila" es una lista visible, soltable de cartas`, a comma before each optional.
- A type's line may say its short name last (P48, Q6):  `a "playing card" is a thing, aka "card"`
  (Spanish `, alias "carta"`);  a property's start and default too:  `its score is a number, starting at -1`,
  `its direction is one of up or down, with default down` (Spanish `, empezando en`, `, por defecto`).
- Bullets:  on ANY line, a starting `- ` is dropped before the statement is read.
  - That's `BlockLine.isBullet()`.
  - The `-` stays a token of the line's match, so editors see it.
- Editors:  hovering an outline line shows **Reads as**, the sentence style's words for it.
  - That's each rule's `SpellStatement.getLongForm()`.
  - default:  the subject spelled out, `it has a deck` => `a card has a deck`
    - the type's words as its declaration wrote them, `a stock pile`, never its name run together
    - its first line only:  a body stays as written, `a stock pile can take a card if:`
  - `define_property_has`, `belongs_to_one` and `quoted_property_formula` say their own
  - Compiling the long forms gives the same javascript as the outline (`outline.test.ts`).
- A line starting `it` / `its` OUTSIDE a type's body says so.
  See `BlockLine.isOutlineLineOutsideBody()`.
- A property's quotes are optional:  `- its rank is a number` (epic page Q4).
  - Quoted names work in the sentence style too:  `a card has a "suit" as ...` (J3, option C).
  - `- it "rank" is ...` is refused, saying to write `its`.
    See `QuotedTypeExpression.isPropertySlip()`.
- An alias and nothing more is refused, saying to add a body (`QuotedTypeExpression.isBodiless()`, epic page I6).
  - e.g. `- it "can move"` or `a card "can fly"`
  - It has no `if`, `is` or `:`.
  - Why:  it'd compile to an empty method.
  - A dangling `if` is fine:  its body may be the indented lines below.
  - An alias true for every one of the type says so:  `- it "can move" always`.
    - `always` / `never` are constants, read as its body.

- More an outline can say (epic `elemental-spell` P5):
  - A TEST in a template's outline, `- to test card setup:`, tests the template.
    - `MethodDefinition.processSignature()` marks it `testOf`, not a method of the type.
    - It compiles as a test written at the top level does, exported, so the program runs it as it loads;
      its body starts with `const it = new Card()`, a real variable, so a `get` in it declares `it2`.
    - Its lines run on that `it`, as an action's run on `this` (epic `language` T86):
      `the total`, `set the total`, a bare `add the input` are `it.total`, `it.addTheInput()`.
      Its scope is a `MethodScope` whose `thingName` is `it`;  the rules that write the thing read it while parsing.
  - An ACTION's description, indented under it:  `- shortcut meta+T`, `- enabled when ...`, `- selected when ...`,
    `- undoable as "..."`, `- icon "..."`, `- titled "..."` (P18 of epic `language`:  a fill-in makes a getter, `titleFrom`).
    - Or on its head line, its name quoted (epic `language` P48, Q6):
      `to "deal the cards" with title "Deal", icon "card", shortcut "meta+N"`, and `undoable` or `undoable as "..."`.
      Each is an [`action_modifier`](rules/methods/ActionModifier.ts), after `with`, a comma or `and` between.
      - Or after a comma, its name quoted or not (Owen):  `to put a card on a pile, undoable as "Move Card"`.
        Not `with` after a name unquoted:  its words would read `with` as one of its own.
      `ActionDetail.detailsOf()` reads them first, then the body's lines.
      Its declaration names it without its quotes (`ToDoSomething.getDeclaration()`).
    - Its title, said nowhere, is its words in title case (P48, J156):  `to auto play` is `Auto Play`,
      `to put (a card) on (a pile)` is `Put Card on Pile`, written into `core.describeAction()`.
      - Each blank is its kind with no article, or its own name when its kind is built in (`Append Digit to Calculator`);
        never its default (J179);  the language's little words in lower case (`titleSmallWords`).
      - The core's own fallback, for an action or menu described with nothing, is its method's name in Initial Caps
        (`wordsOf()`, `initialCaps()` from `spell/util`).
    - Every action is ONE undo step by itself, named by its title (epic `language` P55, Q60):
      `to_do_something`'s methods on a type (`undoableByDefault`) are described `undoneAs` with nothing said.
      - A top-level one, outside any type, too (epic `language` J149):  no class to describe it on,
        so its function runs its body through the core, `core.asAction({ undoneAs: "..." }, () => ...)`
        (`P.ASTMethodDefinition.action`);  one with no steps stays a plain function.
      - `can't be undone` (`no se puede deshacer`), on its head line or under it:  `cantBeUndone: "keeps history"`.
      - Not a question (`?`, or it gives back yes or no), a hook (`draw()`, `create()`), a drawing or a test.
      - Written outside its class (`to play a card` in an app's outline), the method still moves into it,
        its description after the class (`SP.hoistClassMembers()`).
    - Each is an [`action_detail`](rules/methods/ActionDetail.ts) line, taken only in a template's action's body:
      its `parse()` asks the `MethodScope` it's in for the statement that made it (`MethodScope.declaredBy`).
    - The line compiles to nothing;  the action's definition gathers them (`ActionDetail.detailsOf()`) and writes,
      after the class, a getter per condition and `core.describeAction(...)` (`P.ASTTypeDescription`).
    - `- disabled when ...` (`inactiva cuando`) is `- enabled when` turned round (epic `language` T132):
      the same `<name>IsEnabled` getter, giving back `not` of its condition.
      - An action says one or the other:  a `disabled when` beside an `enabled when` is refused while both are there
        (`SP.SpellWarnings.refuseIf()`, `ActionDetail.saysBoth()`).
    - `shortcut_keys` reads a key as typed, its tokens joined up to the first space:  `meta+shift+Z`.
  - A HANDLER, `- on mouse down:`, is a method of the template's things, `on_mouse_down`, `it` the thing (`On`).
    - `- when flipped:` is the same (`On`'s `when` registrations);  `- when creating a deck:` (and `- when created:`)
      stays the creation hook, which wins on the same words by its `priority`.
    - Inside one, the handler's `event` argument is a variable of kind `argument`:
      that's how `pass event`, `cancel event`, `target`, `sender` and `the original target`
      know they're in a handler (`inHandler()`), and refuse to parse elsewhere.
  - A WHILE handler, `- while the mouse is down:` (`while_handler`), is a method too, `whileMouseDown()`:
    the page starts it and puts back what it set, through core's `startWhile()` / `endWhile()`.
  - A TIMER, `every second` and its steps under it (`every_timer`, [EveryTimer](rules/async/EveryTimer.ts);
    epic `language` T159):  each thing of the type runs them while the program runs, adding no undo step.
    - How often is a duration, as a place's `check it every` reads one:  `every 5 minutes`, or a unit alone, `every day`.
    - Then, if it likes, when it stops:  `until its end` (a moment, read again before each run), or `10 times`.
    - Spanish:  `cada segundo`, `cada 5 minutos hasta su fin`, `cada segundo 10 veces`.
    - A method named by its words in English, whatever the language (`everySecond()`, `everySecond10Times()`),
      an `until` getter (`everySecondUntil`), and after the class `core.addTimer(Clock, "everySecond", { seconds: 1 })`
      (`P.ASTTypeDescription`, `describes: "timer"`):  core's [timers.ts](../core/timers.ts) starts each thing's
      once it's made, and stops them when the program ends.
    - A Python program's page draws with no timer:  Python runs them (`PY.ElementsWriter`).
  - `send flipped` (`Send`) inside a template's method sends from `this`, and to `this` when it names no target:
    `parse()` finds the method's scope (`mapItTo === "this"`) into `match.data`.
    - An event whose name is still happening, by the language's `ongoingEventName`
      (`-ing`;  Spanish `-ando`, `-iendo`), is awaited and its `canceled` checked:
      `if ((await send(...)).canceled) return`.
  - An EVENT its things send, `- it sends "flipped" with side as a direction` (`declare_event`):
    `core.describeEvent(...)` after the class.

## Value kinds:  `"suits" as one of clubs, diamonds, hearts or spades`

- In a type's outline body, [`value_kind`](rules/classes/ValueKind.ts)
  makes a list of values a KIND of thing, `Suit`.
  - The body's type keeps its list:  the class variable `Deck.Suits`, and its instance twin.
  - Each value is a constant.
  - The kind gets a `P.TypeScope` with a `valueKind`.
    It holds `{ values, listOn, listName }`.
  - The name must be quoted.
  - It compiles to `Deck.Suits = [...]` + `export class Suit {}`, where the line is.
  - Values stay plain text and numbers when the code runs (epic page Q10).
- A property of a kind:  `its "suit" is a suit`, or `a suit of its deck`.
  - `define_property_has` notes the kind, in `data.valueList`.
  - Its setter checks `{ oneOf: () => Deck.Suits }`, a FUNCTION.
    `core`'s `checkProp()` does the check.
  - Why a function:  the deck's class names the card's (`static instanceType = Card`),
    so one of them is defined second.
- A kind's property, `the "color" of a suit is:` + an indented body.
  - Its rule:  `property_value_getter`, with `data.valueKind`.
  - It compiles a STATIC method, `static color(suit) {...}` (`P.ASTStaticMethod`).
  - `it` / `the suit` is its argument.
  - It records the property's `readAs` as `Suit.color({it})`.
  - So `the color of its suit` compiles to `Suit.color(this.suit)`.
    `MemberReadExpression` does it, with `SP.parseReadAsTemplate()`'s static form.
- A value-per-line body ([ValueIf.ts](rules/if/ValueIf.ts), at `Priority.overridable`):
  - `value_if`:  `red if it is diamonds or hearts` => `if (...) { return 'red' }`
    - it may name the other value too:  `... otherwise it is black` => then `return 'black'`
    - inside an expression too, `"↑" if it is face up otherwise it is "↓"` (`backwards_if`):
      `it is` there is never a comparison (epic `spanish` I8;  Spanish's `de lo contrario es`)
  - `value_otherwise`:  `black otherwise` => `return 'black'`
  - The same ladder under a `return`, in any action or method (epic `language` I96):
    `return` + indented `- 10 if ...` / `- 0 otherwise` => `if (...) return 10` ... `return 0`.
    - Its lines are these same two rules, with or without a `- `:  `return_statement`'s `parseNestedBlock()`
      takes the indented block as its body when every line is one of them.
    - A property's ladder takes no `- `:  its bulleted lines are its members, `- it "is (color)"`.
  - `return_otherwise`, [ReturnOtherwise.ts](rules/if/ReturnOtherwise.ts):  `return 0 otherwise` => `return 0`,
    the last of a run of `return ... if ...` lines (`statement_if`s);  Spanish's `devolver 0 de lo contrario`.
    - Anywhere else it's refused, when the errors are gathered (`SP.SpellWarnings.refuseIf()`).
    - It reads the line above with `data.statementAbove()`:  `Block.assembleBlock()` sets it on each line's
      statement, the nearest statement above it in its block, comment lines aside.
      A function, so what walks a match's `data` (its warnings) never reaches the line above.
    - Only `return`:  any other statement would need an `else`.
  - Only in a getter's or method's body:  anywhere else, an error saying where it belongs (epic page I9).
    Outside a function, its `return` would make a program that won't load.
  - `property_value_either` is a getter whose inline body is ONE line like these (T6).
    - e.g. `the color of a card is red if ... otherwise it is black`
    - Its body keyword:  `{inline_value_if}` (`BODY_KEYWORDS`).
    - Its own quick `test()` looks for the `if`:
      `Sequence.test()` can't, as the body is parsed apart.
- A choice of values is `is_in` with [`value_choices`](rules/lists/ValueChoices.ts).
  - e.g. `it is diamonds or hearts`, `is jack, queen or king`
  - two or more KNOWN constants or numbers joined by `or` => `core.includes([...], it)`
  - It was `(it == 'diamonds') || 'hearts'`.
- Ranges in a list of values:  `2 ... 10`.
  - Its rule:  `number_range`, spread by `identifier_list`.
- A kind's list is a `list of suits` (its class variable and instance twin, issue I14):
  so `for each rank in its ranks` knows each is a rank, and a member a rank doesn't have warns.
  - A member read of an enumeration reports that datatype, else a plain `list` (`MemberReadExpression.getDatatype()`).
- `the position of` a kind's value finds it in the kind's own list (P12), with no `in ...`.
  - e.g. `the position of its rank` => `spellPosition(positionOf(Deck.Ranks, this.rank))`
  - `list_position`'s second syntax keeps the kind's record (`data.kindType`), and reads its list when compiling.
  - A stub which never becomes a kind warns once the project has parsed, and compiles to an empty list.
  - A property with its OWN list (`its "rank" is one of ace, 2 ... king`) finds it in that list too:
    `Card.Ranks` (`data.ownList`, from the read's `data.member`;  epic `spanish`).
- A value kind may be used ABOVE its declaration, e.g. the card above the deck (issue I3):
  - `SpellParser.declaredTypes()` finds `"suits" as one of ...` lines too.
    - Its pattern for them:  `VALUE_KIND_DECLARATION`
    - So `Suit` is a stub before the project parses.
  - What depends on it reads the kind's RECORD when compiling, as a call reads `data.method.returns`:
    - `define_property_has`'s `data.valueType.valueKind` (its `oneOf`)
    - a member read's `data.ownerType.valueKind`
      - e.g. `the color of its suit` => `Suit.color(...)`.
        That works though `color` wasn't declared yet when it parsed.
- A list type whose item type is declared BELOW it (a stub when it parses) reads it when used:
  `static get instanceType() { return Card }` (`create_list_type`).
- A property or an alias on a type nobody declares is refused, as is reopening one (`SpellStatement.refuseUnknownType()`).

### The kind of a property's values:  `its "suit" is a card suit`

- A property's own list of values is a kind too (epic `spanish` P22):
  a card's `its "suit" is one of clubs, ...` (or `has a suit as one of ...`) declares `card suit`.
  - `define_property_has` declares it beside the list:  `DefinePropertyHas.declareKind()`.
  - Its name is the language's word order, `SP.Language.propertyKindName()`:
    English's `{type} {property}`, `card suit`;  Spanish's `{property} de {type}`, `palo de carta`.
    - Its type's name, `CardSuit`, `PaloDeCarta`:  `SP.Language.propertyKindType()`.
    - Its plural is any name's of several words:  `card suits`;  `palos de carta`, up to the `de`.
  - A `P.TypeScope` whose `valueKind` names its `property`:  `{ values, listOn: "Card", listName: "Suits", property: "suit" }`.
  - Its list's class variable (and instance twin) is a list of it, `list of card-suits` (`P.listOf()`):
    so a loop over `card suits` knows each is a card suit.
- What it gives another type, and the program:
  - `its "suit" is a card suit`:  `{ oneOf: () => Card.Suits }`, as for a value kind.
    TypeScript types it as the card's own suit is, `Suit` (`TSWriter.propertyKindType()`);  Python as `Any`.
  - `card suits` alone is its list:  [`kind_values`](rules/classes/KindValues.ts), `Card.Suits`.
    - Once `card suit` is a type, `card suits` is ONE name, which `class_member` can no longer split.
  - `every card suit` (`every_thing`):  the list too, for any value kind.
  - `a random card suit`:  [`random_kind_value`](rules/classes/RandomKindValue.ts), `core.randomItemOf(Card.Suits)`.
  - `for each card rank in card ranks`:  a loop's item named for the kind, [`kind_name`](rules/types/KindName.ts);
    its variable is its words, `card_rank`, read as `card rank`.
  - `the position of its suit`:  the kind's list, as for a value kind (`list_position`).
- It has NO class of its own:
  - Nothing compiles for it, and its project neither exports it (`provides`) nor writes it in its declarations.
  - An importer makes it again, from the property's declaration (`SpellDeclarations.loadPropertyKind()`), named in
    the language that declaration was written in;  picking a type with a property of the kind brings the type
    listing it.
  - So a property or alias ON it is refused (`SpellStatement.refusePropertyKind()`):  `the "value" of a card rank is ...`.
    A member read off one warns, saying the same (`MemberReadExpression.warnIfUndeclared()`).
  - The scope explorer leaves it out:  its values show on the type listing them.
- A type declared with its name keeps it (`TypeDeclaration.declareType()`):  `a card suit is a thing` claims the record.
  A kind's declaration never takes a name another type already has.
- Used ABOVE the type listing it (the foundation above the card):  `SpellParser.declaredTypes()` stubs it,
  from the body lines `declaredPropertyKinds()` finds (the language's `propertyListDeclaration`):
  only lists with `one of` / `either`.

## Inferred aliases:  `- it "is a (suit)"`

- A `quoted_property_formula` with no `for its ...` INFERS what each blank reads.
  - In its `parse()`:  `inferPlaceholders()`.
  - The rule's syntax here:  an outline body's `{type:subject_it} {alias:text}`, the whole line.
  - A blank is a word in parens.
    - It names, by its singular, a property of the type with a list of values.
    - The list is its own (`as one of`), or a value kind's.
    - e.g. `is the (rank) of (suits)`:  sources `rank`, `suit`
    - Where the alias is USED, a blank takes any of its values, singular or plural, numbers as they are
      (`placeholderForms()`, epic `spanish`):  `(suit)` reads `the 2 of clubs` and `the queen of spade`.
  - A bare word is always just a word (epic page J9).
  - More after the alias:  not ours, so `it "is face up" if ...` stays a `quoted_type_expression`.
  - REFUSED, saying why:
    - no parens:  `it "is a suit"`
    - a blank naming no such property:  `it "is a (color)"`
  - A refused match competes with its rule's priority (`P.Match.priority`, read by `Choice.getBestMatch()`).
    So `quoted_type_expression` can't take the line as an empty method instead.
- A value kind declared FURTHER DOWN (a stub here, e.g. the card above the deck):
  - its placeholder's syntax is `(expression:{constant}|{number})`
  - `QuotedPropertyRule` is specialized with `kinds: { suit: "Suit" }`
  - its `parse()` checks the word against the kind's values WHERE THE ALIAS IS USED
    - That's `kindValue()`, into `data.kindArgs`.
- An alias ON a value kind:  `a rank "is a face card" if ...`.
  - `QuotedTypeExpression.processSignature()` sets `signature.valueKindOf`.
  - It compiles to the kind's static method:  `static is_a_face_card(rank)`.
  - Its `MethodPostfixRule` compiles to `Rank.is_a_face_card(card.rank)`.
    See its `staticOf`.
  - Postfix aliases only.
- An alias on a SUB-type of another of the project's types (a joker's `it "is the (color) joker"`)
  is a STATIC method of its type, checking the type first (`QuotedPropertyFormulaBits.staticArg`, epic `spanish`):
  - `static isTheColorJoker(card, color) { return card instanceof Joker && card.color === color }`
  - every use calls it so, safe on any card:  `the card is the red joker` => `Joker.isTheColorJoker(card, "red")`
  - Why:  it's used on the super-type's values, which have no such instance method.
  - A built-in super-type (`a card is a view`) doesn't count:  that alias stays an instance method.
- A thing compared to one of its OWN listed values compares the property that lists it (`is_equal`, epic `spanish`):
  - `it is clubs`, in a card with `its "suit" is one of clubs ...` => `this.suit == "clubs"`
  - only when its type is known, the word is no variable, and ONE property lists it (`IsEqual.listedPropertyFor()`)
- A user's alias checks WHOSE it is.
  - `CompoundExpression` tells the first suffix after an operand what that operand is.
    - That's [`SuffixLeft`](rules/expressions/expressions.shared.ts):
      a side channel, set while that suffix parses, restored after.
  - These refuse an operand KNOWN not to be their owner (`scope.couldBeA()`):
    - `MethodPostfixRule`, `MethodInfixRule` and `QuotedPropertyRule`
    - each specialized with its owner (`of`), as `thisType`
    - e.g. a deck's `a rank "is a face card"` on `the card is a face card`, where the card has its own
  - Unknown:  anything fits.
  - A suffix after `and` / `or` is told the operand after it (epic page I7).
    - e.g. `the game`, in `... and the game is red`
  - After anything else, it isn't:  what it follows is the chain so far, e.g. a sum.
- [`draw_it`](rules/classes/DrawIt.ts):  how a type draws, by what its words mean (the `draw_method` word rule).
  - `- to "draw it":` + one line of markup => `draw() { return ... }`;  unquoted, a method's body.
  - A list's `- to draw each item:` => `drawEachItem(item) {...}`, the item as `item` or its type's name.
  - English's unquoted `to draw it:` stays `to_do_something`'s, the same `draw()`;
    Spanish's `para dibujarlo:` is this rule's, as the fused `-lo` makes no method name.
- A method's HOOK, by what its words mean (`MethodDefinition.hookOf()`, epic `spanish` J96):
  - `draw` (the `draw_method` word rule) or `create` (`create_method`):  what runs as a thing is made.
  - English's words are the hooks' names already, `- to create it:`;
    Spanish's `- para crearlo:` and `para crear un mazo:` are `create()` too.
  - Or a type's outline says it with words of their own, [`create_hook`](rules/methods/CreateHook.ts) (epic `spanish` P28),
    naming its type (epic `language`):  `- when creating a task (with title as text):`,
    `- al crear una tarea (con título como texto):`.
    - Another type there is refused, naming the one to write:  `when creating a card` in a deck's outline.
    - A one of a kind's says `it`, as there's only ever one:  `- when creating it:`, `- al crearlo:`.
    - The older forms still read:  `- when created:`, `- al crearla:`;  the translator writes the new ones.
    - Every built-in project says it so;  `to create it` still reads, as any method does.
    - Core hands `create()` the props the thing was made with, so its `(with ...)` reads them;
      a caller just makes one, `create a new task with title = "Shop"`.
    - Spanish's `al ...` is also an event's handler:  the hook takes only its own words, `create_hook_words`,
      and beats the handler on them (`Priority.specific`).
- `it` FUSED into a Spanish verb (`SP.LanguageWords.fusedIt`):  `- para barajarla:`, `- para voltearla boca arriba:`.
  - `MethodDefinition.splitFusedIt()` splits the method's FIRST word into the verb and where `it` was,
    so it reads as English's `- to shuffle it:`:  `barajar {thisArg:expression}?`.
  - Its receiver is optional, as `subject_implied` leaves out `it`:
    in the type's own methods, `voltear boca arriba` turns this one.
- `al` is `a el`, `del` is `de el` (`SP.LanguageWords.contractions`):  a method's words and its calls say either.
  - Its call syntax takes both (`MethodDefinition.withContractions()`):  `dar la vuelta (al|a el) mazo`,
    and `(a|al)` before an argument, `mover la carta al montón`.
  - Its name says the short one (`contractedName()`):  either way of writing it makes one method.
  - ONE drawing per thing:  the front / back sides (`draw_side`) are gone (epic `spanish` P20).
    Its SLOTS are named drawings it places instead (below).
- A one-line indented body (a `{nested_expression}`) parses in the statement's `nestedScope`.
  - e.g. `return` + markup, or `draw_it`'s
  - As an inline body does (`SpellStatement.parseNestedBlock()`).

## Property bodies, slots and drawn lines (epic `elemental-spell` P5)

Lines a type's body says beyond its plain properties and actions:  P5 added them, so all of it could be said in
plain Spell.

- A property's own ALIASES, indented under it (Q13):  `- its "suit" is one of ...`, then `- it "is a (suit)"` under it.
  - `define_property_has`'s body (`{nested_statements}`) parses its lines in a `P.SubjectScope` of the type, as the
    outline body does, so each alias is committed there.
  - `DefinePropertyHas.getAST()` compiles every body line but its rules (`property_body_must`) after the property,
    as if written after it.  A line that's neither a rule nor an alias warns (`not-a-property-body-line`), and compiles
    the same.
  - The property's comment lists its body lines (`ProgramWriter.spellOf()`), for its list of values too.
- A stored property's line said with `its` that stops short of its line isn't one (epic `data` I1):
  `- its "high cards" is cards in its cards where ...` reads `is cards` as well as a getter would, and outranks it.
  So `define_property_has` turns it down, and `property_value_getter` takes the whole line.
- A worked-out value from a list of ITS OWN:  `its "color" is one of red, black`, then its value lines.
  - `property_value_getter` with a `{specifier:outline_specifier_enum}`;  at `Priority.declaration`,
    so it beats `define_property_has`, which would read all but the colon.
  - Its colon may be left out (epic `language` T93, P48):  then the line is worked out only when VALUE lines are
    indented under it (`red if ...`, not a member's `it ...` line, not comments alone), and it outranks the stored
    property's line, which reads the same words (`Priority.aboveDeclaration`).
    - It asks `SpellStatement.blockBelow()` -- see "What's indented under a line", below.
  - Its list is declared as a stored property's (`DefinePropertyHas.declareEnumeration()`):  the class variable,
    the kind, the constants.  `static Colors = [...]`, then the getter.
  - Its BULLETED lines are its members, not its body:  `PropertyValueGetter.parseNestedBlock()` splits the block,
    the value lines as the getter's body, the bullets parsed after it in a `P.SubjectScope` of the type
    (`data.members`, compiled after the getter).  Any getter's body may have them.
  - Sentence style too (Q20):  `the color of a card is one of red, black:`.
- SLOTS (Q55, Q56;  "parts" until P27):  a view's named drawings, which it places.
  - `- it has slots "front" and "back"`:  [`has_slots`](rules/classes/HasSlots.ts) =>
    `static slots = ["front", "back"]`, and `P.TypeScope.declareSlot()` (journaled;  `hasSlot()` walks the chain).
    - Spanish:  `- tiene las ranuras "frente" y "dorso"`.
    - The old word, `has parts` (`partes`), still reads:  an error over just the word, naming `slots`, whose
      `data.replacement` `spell lint --fix` writes (the language's `retiredWords`, `SpellType.noteRetiredLiterals()`).
  - `- to draw its front:` / `to "draw its front":`:  `draw_it`'s slot drawing => `drawFront()`, declaring the slot too.
    - Unquoted, `to draw its {slot:member_words}`;  quoted, the `draw_its_slot` word rule's lead (`draw its`,
      `dibujar su`) then the name.
    - NOT a list's `draw its placeholder` (`draw_method`'s):  `DrawIt.readsAsDrawMethod()` steps aside, so the
      first-line pre-pass still makes it callable.
  - `draw its front`:  [`draw_slot`](rules/classes/DrawSlot.ts), only in a drawing =>
    `<slot name="front">{this.drawFront()}</slot>`, the web's own slot holding the slot's drawing.
    `Priority.specific`, over `draw_thing`;  a name that's the view's property, not a slot, is left to `draw_thing`.
    - In the view's element (its shadow root), what the page puts in it, `slot="front"`, replaces the drawing for
      that one element (P27);  unfilled, its own drawing shows, a sub-type's if it draws it again.
  - FILLED from outside (P27):  `<card><text slot="front">Ace</text></card>`, by `slot=` or spell's own `in=`.
    - A drawing's bare view, `<carta>`, names its children's slots as they compile (`SpellJSX.withSlotNames()`):
      a Spanish two sided view's `slot="frente"` fills its `front`.
  - A slot's markup carries its name as a CSS part (J6):  `part="front"`, added to any it says (`DrawIt.withPart()`).
- A DRAWN LINE (Q14):  in a drawing, a line of markup, or a slot placed, IS the drawing.
  - [`drawn_markup`](rules/classes/DrawnMarkup.ts):  `{markup:jsxElement}`, `{markup:jsxFragment}` or
    `{markup:draw_slot}` => `return ...`, at `Priority.specific`.
    - An action's button and a right-click menu have their own (`{markup:action_button}`,
      `{markup:context_menu_block}`), registered before `jsxElement`:  else a drawing that is only one of them
      draws a plain tag (epic `language` I78).
  - Only in a drawing:  `DrawIt.drawingIn()` finds the nearest method, a `draw_it`'s, or one named `draw`.
    A loop's body counts as the drawing around it (`SpellStatement.loops`:  `for each`, `repeat`).
  - SEVERAL drawn lines (C28):  [`DrawnLines.gather()`](rules/classes/DrawnLines.ts),
    from `draw_it`'s and `to_do_something`'s `getAST()`, makes them ONE `return [ ... ]`, in order:
    - markup lines one after another are one fragment already (the tokenizer's), spread into the list
    - a loop with drawn lines is its `core.map(list, (item) => ...)`, its body gathered the same way
    - an `if` chain among them is `cond ? a : b` (`null` when no branch is picked);  alone, it stays an `if`, each
      branch returning its own
    - a line that draws nothing after a drawn one runs before the drawing;  an `if` branch that does more than draw
      draws nothing, with a parse error comment
- A BUILT-IN TEMPLATE written in spell:  `a card is a two sided view` (J8;  compiled once since Q71).
  - Its source is spell, in the core:  [TwoSidedView.spell](../core/templates/TwoSidedView.spell), and each other
    language's twin, [TwoSidedView.es.spell](../core/templates/TwoSidedView.es.spell).
  - Compiled ONCE by `yarn core:gen:templates` ([builtInTemplateFiles.ts](node/builtInTemplateFiles.ts)), in a root
    without it (`SP.Language.bareRootScope()`):
    - its class into the core, `TwoSidedView` ([classes/TwoSidedView.ts](../core/classes/TwoSidedView.ts)), and
      Python's (`spell_core/two_sided_view.py`)
    - its declarations, every language's, into [builtInTemplates.generated.ts](builtInTemplates.generated.ts)
    - [builtInTemplateFiles.test.ts](../../tests/spell/node/builtInTemplateFiles.test.ts) fails while either is stale
  - Each language's root loads its declarations (`SP.loadBuiltInTemplates()`, from `Language.rootScope`):  the
    type, its property, its phrases, its methods' rules, its slots -- as an import layer loads a project's.
    - Its datatype is still a type word (`two sided view`, `vista reversible`) and a class name
      (`P.BUILT_IN_CLASS_NAMES`), but NOT one of `P.BUILT_IN_TYPES`:  its type comes from its declarations.
    - Its rules go on the root's own clone of the language's parser.
  - So `a card is a two sided view` compiles to just the card's own members, `extends TwoSidedView`.
  - Another language's words name the ONE English class's members:  the generator pairs the twin's statements with
    the English, so `dirección` reads `.direction` (a property's `output`), `frente` draws `drawFront()`
    (`P.TypeScope.slotOutputs`) and `está boca arriba` is `isFaceDirection("up")` (a phrase's `valueOutputs`).
    - NOT its values as constants:  a root's constants are every program's, so a Spanish file sets a direction by
      the template's words (`voltearla boca arriba`), not `poner su dirección a arriba`.
  - A two sided view's:  its slots front and back, `its "direction" is down or up` (a new one starts face down, J36),
    `it "is face (direction)"`, `turn it face up / down`, `turn it over`, and `to draw it` drawing both slots,
    back to back, its own `<css>` turning it over in 3D (a view type's style sheet, `static css`).


## Pages:  `"button api" is a notebook page` (epic `language` P45, P47)

A PAGE FILE holds a page's head, a line of plain Spell, and its body indented under it:
prose, `##` headings, markup, examples, and the few tags it draws with.
Spell's own rules read it:  each tag line reads as its plain-Spell TWIN, so a page compiles to exactly what its twin
would.

- Spell has ONE written form since epic `language` P47.
  The tag-shaped form before it (epic `elemental-spell` P6) is gone:  a file of tags no longer reads.
- Everything outside a page is plain Spell, read as any plain file is:  each line at the file's left edge that
  isn't a page's head.

### Which form a file is

- What it says (`SP.formOfText()`, `SpellFile.form`):  `"page"` when a line at its left edge, outside a comment, is a
  page's head;  else `"spell"`.
- A page file's parser is the language's, cloned for that form:  `SpellParser.twinFor(language, "page")`.
  - It tokenizes a whole file (the `"block"` rule) with [`SP.PageTokenizer`](PageTokenizer.ts),
    and everything else (a line, an expression) with spell's own.
    So plain Spell's tokenizer and speed are untouched.
- A file whose form changes as it's edited is parsed whole, in a new scope:
  incremental parsing never carries lines from one form to the other (`SpellProject.updatedContentsFor()`).
- A page alone in its file is named by its head (`SP.alonePageName()`).

### The head

- The page's quoted name, then `is a`, its flags, and `page`:  `"button api" is a notebook page`;
  Spanish's `"api del botón" es una página cuaderno`.
  - Each language's pattern is its `SP.PageWords.plainPage`, its groups `name` and `flags`.
  - Its flags are bare words before `page`, in the language's words:  `notebook` and `locked`
    (Spanish's `cuaderno`, `bloqueado` or `bloqueada`).
    Any other word, and the line isn't a page's head.
  - `notebook` only turns on the editor's in-place page;  `locked` adds `- its lock is locked` to the twin.
- Only at a file's left edge;  another line there ends the page before it.
- Its indentation closes it:  no closer, and none is missing.
- A page's OWN VIEWS are plain Spell, written ABOVE its head in the same file:  `a "counter" is a view:` ...
  - Named as written, as any type is:  `<counter/>` in the page finds it.
  - Until P47 they were `<view>` tags inside the page, named for it.

### Its tokens

[`PageTokenizer`](PageTokenizer.ts) is spell's tokenizer, plus four tokens ([PageTokens.ts](PageTokens.ts)):
- a page's head, or a tag its body draws with:  ONE `SP.PageTagToken`, its lines and all
  - What it says is its `tag`:  category, kind (in English), name, attributes, phrase.
  - Its name's, values' and phrase's own spell tokens are `nested`, at their places in the file.
- a closer, `</>` or `</if>`:  a `SP.PageCloserToken`
- a line of prose in a page's body:  a `SP.PageProseToken`, a comment as code spell writes it
  - A fenced code block in prose (` ``` ` or `~~~`):  every line of it prose, to its closing fence,
    so a tag at a line's start there is shown, never read (`openFence`;  epic `language` T80).
- a comment on lines of its own, `<!-- ... -->`:  a `SP.PageCommentToken` a line (below)
- The rest is spell's own tokens:  plain Spell, a drawing's markup, the spell in `{...}`.

- So a tag line and its indented body are a line and its block, as an outline item and its body are:
  `breakIntoIndentedBlocks()` needs nothing new.
- Tags nest by indent;  a closer is checked, never needed to find where a body ends.
  It keeps a stack of open tags to check what it can see:
  - a closer that closes nothing, or closes another tag
  - a tag never closed (one still open at the file's end too)
  - an `<otherwise>` with no `<if>`, or after a `</>` closed its `<if>`
  - a body line indented less than its tag's
  - a `<for>` head's mistakes:  a flag before its attributes, a table with no cells
  - Each goes on its token (`SP.addPageError()`, read back with `SP.pageErrorOf()`), never thrown, in the file's
    language (the `page-*` messages);  `BlockLine` reports it on its line (`SP.PageTwin.errorsIn()`).
- Which tags are its own where (`isTagHere()`):
  - only in a page's body, or a drawing's lines (`tokenizeDrawingLines()`, below):  outside one, it's plain Spell
  - a `<spell>` block only right in a page's body;  an `<html>` block anywhere in it
  - a loop's slots, `<empty>`, `<loading>`, `<failed>`, only right inside its `<for>`
  - inside a block of code, none:  it's that code's
- A run of markup stops at a line a page's tag starts (`nextElementStart()`, the parser tokenizer's hook):
  else `<toolbar />` would take the `<for each ...>` under it into one JSX fragment.
- Read a line at a time (`tokenizeLine()`, with the tags open before it):  the editor's colouring.
- A tag left half typed stays on its line (epic `language` I92), so the rest of the file still reads:
  - a quoted word left open, `<action "`, is no word:  as an attribute's value, it may not run past a line a tag starts
  - a start tag with no `>`, `<text`, has no children
  - its own end tag half typed at the end of its line, `</tex`, ends it there (I94;  `isHalfTypedEndTag()`)

### The tags a page's body draws with

- An IF-CHAIN, `<if ...>`, `<otherwise if ...>`, `<otherwise>`:  `if ...`, `otherwise if ...`, `otherwise`.
- A LOOP, `<for film in its films>`:  `for film in its films`.
  - Its head is a phrase to its `>`:  a `>` inside quotes, parens or braces is the phrase's.
  - Its attributes come after the phrase:  `title`, `loading`, `empty`, `hide-empty`, `failed`, `paging`,
    `page-size`, `as`.
    - Each is a line of code spell at the top of its body, a RIDER (`forLines()`):  `loading="Wait"` is
      `while waiting :`, written under the loop after its body.
    - Any other goes on what's around its items:  `<for films as="cards" columns="4" />`.
  - Its slots, `<loading>`, `<empty>`, `<failed>`:  `while waiting :`, `if there are none :`, `if that fails :`.
- An `<html>` block (epic `elemental-spell` P16):  markup as written, the drawing's own lines.
  - `breakIntoIndentedBlocks()` takes its tag line out and puts its body's lines in its place (`unwrapCode()`).
  - Its closer stays, and compiles to nothing.
  - Its JSX is code spell's:  `<div>` the web's, never a pack's component (`SP.markCodeSpell()`, J83).
  - A view of the file's chunks keeps it whole (`unwrapsHtml`).
- A `<spell>` block (`<encanto>` in Spanish;  epic `elemental-spell` P12):  plain Spell as written,
  unwrapped the same way, so its lines parse at the level the block is at.
- A tag body on the head's own line, `<if it is done>✓</>`:  closed by the closer ending the line.
  - A comment may follow that closer, as on any line of spell:  `<if it is done>✓</>   // done`.

### The twin

[`PageTwin`](PageTwin.ts), from `BlockLine.parse()`:  a page's head or tag line, rewritten as its twin's tokens.
- The twin's words are the LANGUAGE's, in its words file (`language.words.page.twins`, `SP.PageTwinWords`),
  with slots:  `{words} is a page :`, `if {phrase}`, `for {phrase}`.
  - A slot takes the tag's own tokens, so a name or phrase keeps its place in the file.
  - The twin's own words are new tokens at the tag's start, marked `synthetic` (`PageTwin.isSynthetic()`).
- Then the twin parses with the ordinary rules:  the SAME match, AST and code as the code-spell line.
- A tag body on the head's own line is the twin's inline body;  an indented one, its nested block.
- Closers parse as `page_closer` ([PageCloser.ts](rules/statements/PageCloser.ts)), which compiles to nothing.
- A PAGE'S HEAD (`drawnPage()`):  `counter notebook is a page :`, its body its drawing, `- to draw it :`, in order:
  - markup as written, `<section>`, `<example "one counter">`
  - each run of prose a `<markdown>` element, a new one at each `##`
  - each run of markup lines joined into one implicit fragment (`joinMarkup()`);
    a comment between them is skipped over, as blank text is
  - its tags, as their twins
  - Its SECTIONS draw as the docs pages' do, sticky and foldable, so the program draws the docs look
    (epic `notebook` P3, J1;  the words, `SP.PageTwinWords.pageSection`):
    - each `##` heading's run is a `<section label="..." sticky="stack" collapsible dividing level="2">`
      the twin makes (`sectionFor()`), the rest of the run its `<markdown>` child, its heading only its label
    - `gatherSections()` moves the markup after it inside, up to the next section, a line of code or a block;
      markup lines run together are one line, split there
    - each `<section label="...">` written at the top gets each of those attributes it doesn't say
      (`withSectionLook()`)
    - the twin's own tokens stand at the heading;  each child keeps its own, its source mark
  - So the page's element draws in its children, as an app's does (`Page.drawsInItsChildren`):
    the editor's docs frame and its "On this page" list reach the sections.
  - A drawing that's only prose is one `<markdown>` block, alone:  in a method, `markdown_description` leaves it to
    the drawing's `markdown_block`.
  - It starts by itself, as any app or page does (`SpellProject.startedByItself()`):  nothing is added to start it.
- A page's body only draws:  it declares nothing.
- Spanish reads the same way, with its own twin words (`si {phrase}`, `para cada {phrase}`).

### The scan before parsing

- The pre-pass that finds every type and method a file declares (`declaredTypes`, `declaredMethods`) reads a page
  file's SKELETON (`SP.PageTwin.skeletonOf()`):
  - each page's head as its twin, `counter notebook is a page :`, its body left out
  - every other line as written:  the plain Spell around the pages, its views too

### A `<for>` inside an element, in a plain file too

- Its text is read again as a drawing's own lines (`PageTokenizer.tokenizeDrawingLines()`), and parsed in place, its
  loop drawn as one of the element's children (`SpellJSX.parseLoop()`;  epic `language` I19).
- Its AST is the loop itself, `core.drawEach(...)` or `core.drawRead(...)`;  an element's children put it in braces
  (`SpellJSX.childAST()`).
  So a `<for>` on a drawing's own line, or after `return`, is the drawing's loop, as `for` lines are
  (epic `language` I73).
- Its head is a phrase to its `>`, as a chain tag's is (`Tokenizer.phraseHeadTags`, `for` and `para`;  epic `data`
  I93):  read as attributes, a quote, a paren or an apostrophe in it ended the head early, and its body never
  joined it.
- In a plain file (epic `language` P45) its lines are read through the page form's twin parser
  (`SpellParser.twinFor(language, "page")`).
  `BlockLine` twins a line that tokenizer read as a tag (a `SP.PageTagToken` or closer at its start), whatever the
  scope's parser.

### Comments

- `<!-- ... -->` (Owen, 2026-10-26), starting a line anywhere in a page file:  a `SP.PageCommentToken` per line,
  each a `CommentToken` as its `//` twin line is (`commentSymbol` `//`, its text without the marks).
  - One over several lines keeps reading lines as the comment to its `-->` (`openComment`), and `breakIntoLines()`
    puts each of its lines at its first line's indent, so they never make a block of their own.
  - It ends the tags open deeper, as a `//` line does, but is never itself wrong where it sits.
  - One never closed is `page-unclosed-comment`, on its first line.
- Inside markup it's the markup's own, a `P.JSXCommentToken`, in either form ("Markup in a drawing", below).

### The chunk tree

- A page file's CHUNK TREE is built from these same tokens, for the editor, the notebook and agents:
  no rules, nothing compiled (epic `elemental-spell` J30).
  - `PG.PageView.read(text)` makes a `PG.PageFile`;  its `.pages`, each page's head.
  - It's the folder `spell/parser/page` (namespace `PG`;  its [AGENTS.md](../page/AGENTS.md)).
- Its tests:  the parser folder's `tests/page/`;  the page form's own, [PlainPages.test.ts](../../tests/spell/PlainPages.test.ts).

### What uses it

- `spell translate` leaves page files out:  the translator writes plain Spell, line by line.
- `spell place ingest` writes plain Spell only.

## Markup in a drawing

- A tag in a thing's own drawing (`to draw it`) may DECLARE the member it draws (epic `language` P55, Q52):
  - a view's tag with a quoted word naming no member:  `<column "C1" suit=clubs/>` ~== `"C1" is a new column with
    suit = clubs` (`SpellJSX.viewDeclaredBy()`)
  - a value's type as a tag:  `<number "score"/>` ~== `"score" is a number`, drawn as `{the score}`
    (`valueDeclaredBy()`;  Spanish's `<número "puntuación"/>`)
  - `DrawnMarkup.mutateScope()` declares them on the thing;  the drawing compiles them beside it, as their own lines
    would (`DrawnMarkup.membersDeclared()`)
  - the scan before parsing knows them ahead (`SpellParser.drawnMembers()`), so an action above the drawing reads
    `the stock`, and a `set the score` there doesn't declare it again
  - a member said on a line of its own wins:  the tag only draws it
  - no space is needed after the quoted word:  `<deck "deck"hidden />` reads as `<deck "deck" hidden/>` (T125;
    the tag's attributes start right after it, `Tokenizer.matchJSXAttribute()`)
  - a line that declares changes what the rest of the program reads (`getScopeChanges()`):  an edit to it is a
    full re-parse

What a drawing's markup may say, a page's or a plain file's (epic `elemental-spell` P7;  plain Spell's since epic
`language` P45, Q4 A).

- `</>` closes any element there (`Tokenizer.emptyEndTagCloses`, on for both of spell's tokenizers), and a tag's
  name may hold any letter (`<botón>`, `<área-texto>`;  epic `language` P46, `Tokenizer.JSX_TAG_START`),
  so Spanish names Spell UI's components bare too.
- A name with a dash is a pack's too, when it has one (`<tree-diagram>` is `<ui-tree-diagram>`);  else it's left as written.
- A BARE name is a component's (`SpellJSX.componentTagFor()`):  one of the project's own views first (`<card>`, by
  its element's name), then the first of its packs that has it (`SP.ComponentPacks`;  the project file's `packs`,
  carried on its parser as `SpellParser.packs`).  Spell UI's pack is spell-app's to register:  spell-parser never
  imports Spell UI.
  - In a page, a bare name nobody has is `page-unknown-component`;  a handler inside an element,
    `page-tag-in-markup` (C29).
  - In plain Spell a bare name nobody has is the web's own element, as written (`<div>`, `<p>`, `<br>`):
    plain drawings wrote those before they took the shortcuts.
  - Never in a page's `<spell>` or `<html>` block, code spell as written (J83):  there `<button>` is the web's.
- A tag's head may be named by a quoted name after its word, `<example "one counter">`:
  the parser's tokenizer reads it as `name="..."` (`quotedNameTags`);  `<tree-node "If">` as `label="If"`.
- A VIEW'S QUOTED WORD is its `id` (Owen, 2026-11-12):  `<tableau "T1"/>` ~== `<tableau id="T1"/>`, the tableau
  whose name, or chosen id, is T1 (`core.thingNamed()`).
  - The tokenizer keeps a quoted word on any tag it doesn't list below (`Tokenizer.keepsQuotedWords`,
    `JSXElementToken.quotedWord`):  only the tag's parse knows the project's views (`SpellJSX.attributesOf()`).
  - On a tag that's no view it's unreadable, as before.
  - A view declared further down is a stub as the drawing parses:  it's taken as a view once its line says so,
    when it compiles (`laterView`, `SpellJSX.isLaterView()`).  A line a scan found that never parsed counts as one,
    as an editor's parse keeps what it last compiled.
    With a quoted word, such a type wins over a pack's component of its name:
    Solitario's `<columna "C1"/>` is its column, `<columna/>` the grid's.
  - Any language's tags alike:  it's the tag being a view that counts.
  - A member made new takes its name as its thing's `id` (`DefinePropertyHas.withMemberId()`):
    `"T1" is a new tableau` is `new Tableau({ id: "T1" })`, so the drawing names it with no `with name "T1"`.
    - Several words are joined by dashes, each as written (epic `language` T147):  `"discard pile" is a new discard pile`
      is `{ id: "discard-pile" }`, and `<discard-pile "discard pile"/>` draws `id="discard-pile"`;  `discard pile` still
      finds it (`core.thingNamed()`).
- WHAT COMES AND GOES IS NAMED BY ITS QUOTED WORD (epic `language` P61;  Owen, 2026-11-17):  `<modal "you won">` ~==
  `<modal id="you-won" heading="you won">`, so `show "you won"` shows it and `hide "you won"` hides it.
  - A modal, a menu and a popup only (`NAMED_TAGS`, [SpellJSX.ts](rules/JSX/SpellJSX.ts);  Owen:  "Don't need it on
    everything"):  `<menu "game menu">` is `id="game-menu"`;  `<popup "a hint">` is its id and its heading too.
  - Its id is its words joined by dashes, as a view's;  a heading the word as written, unless the tag says its own.
  - Only on a tag that's none of the project's views, in any language:  Spanish's `<modal "ganaste">` is
    `<es-modal id="ganaste" encabezado="ganaste">`, the heading's name the pack's (`SP.ComponentPacks.attributeNameFor()`).
  - On any other tag a quoted word is still unreadable.
  - A MODAL'S DRAWING (T155;  `SpellJSX.markDialog()`;  Owen:  "only for buttons in the modal's actions section"):
    - An `<action "...">` in its ACTIONS, `<actions>` (Spanish's `<acciones>`, Spell UI's `<ui-actions>`), closes it once
      its click has run the action, as a dialog's own buttons do (`in-dialog`:  the core closes it, `closeDialogOf()`);
      `keep-open` (Spanish's `mantener-abierto`, `LanguageWords.keepOpenAttribute`) leaves it open.
    - Anywhere else in it (its content, a menu's row), an action runs and the modal stays.
    - A modal naming none of its parts is ALWAYS laid out for you (`dialogChildren()`;  epic `language` J245):  what it
      holds in `<ui-content>`, the `<action>`s at its top after it in `<ui-actions>`, so they're its actions and close it.
      `<modal transparent>` (Spanish's `transparente`) keeps its drawing as written, see-through, with no box or padding
      (StarWars' crawl places its words over the modal itself).
    - A button's ANSWER, a bare word on it (`LanguageWords.answerWords`):  `<action ok />`, `<action "save the thing" ok />`,
      `<action cancel />` (Spanish's `aceptar`, `cancelar`), compiled as the core's `answer="ok"`.
      - With no quoted word, the word names the action:  the program's `ok` if it has one;  if not, the button just
        closes, labelled OK / Cancel in the program's language (`dialog-ok`), and is never refused.
      - A modal's button with neither word answers its action's name as written:  `answer="save the thing"`.
    - `<statement> without closing`, `... without closing the modal` (`without_closing`, Spanish's `sin cerrar`,
      `sin cerrar el modal`):  `core.keepOpen()`, then the statement, so the modal stays open after this run.
      Only a call, as `without_waiting` takes.
  - `show "you won"`, `hide "you won"` (`show_drawn`, [ShowDrawn.ts](rules/UI/ShowDrawn.ts)):  a quoted name, nothing
    else;  Spanish's `mostrar "ganaste"`, `ocultar "ganaste"`.
    - Compiled to `await core.showDrawn("you won")`, `core.hideDrawn(...)`:  the element with that id, in the app's page
      or inside a view's shadow root, its `visible` set.  Python's `core.show_drawn()` asks its page to (`page.ts`).
    - `show` waits until a modal closes, as `alert` does (T155);  `show "you won" without waiting` doesn't
      (`without_waiting`);  `hide` never waits.
    - `the result` (`the_result`, Spanish's `el resultado`):  what closed the last dialog, `core.result()`:
      a button's answer, `cancel` for Escape and the dimmer;  `ok` after `alert`, `ok` / `cancel` after `confirm` and
      `prompt` (epic `language` P64).
      - `the result is ok` compiles to `core.resultIs("ok")` (`is_equal`):  `ok` / `cancel` (`aceptar` / `cancelar`)
        read as its answers, unquoted, and text compares with no regard to case.
      - Any other bare word is a button's own answer, `the result is discard` (P64;  `answer_word`, [AnswerWord.ts](rules/UI/AnswerWord.ts)),
        unless it's a variable.
      - What an action gives back, run as a statement (`deal the cards` on its own line, or as an inline body):
        `core.answered(this.dealTheCards())` (`SpellStatement.noteRunAsStatement()`, `DynamicMethodRule`;  Q70).
        Used as a value, or as its action's last line, it isn't:  `the result` stays as it was.
    - `prompt "Name?"` (P64):  the text typed is a NEW `it`, as `get` makes, `const it = await core.prompt("Name?")`;
      empty text after a cancel.  `confirm` leaves `it` alone.
    - `show "edit card" with the card` (`show_drawn_with`, Spanish's `mostrar ... con ...`;  P64):
      `const it = this.card`, then `await core.showDrawn("edit card", it)`.
      - Inside `<modal "edit card">`, `it` is what it's shown with, the thing itself (`SpellJSX.shownInScope()`):
        a modal whose contents read `it` compiles them as `core.drawShown("edit card", this, (it) => [...])`,
        `it` the drawing's own thing until it's shown with one.
      - Its own rule, as it declares an `it`:  so it can't go `without waiting`.
    - A button's own answer, `<action discard title="Discard your changes" />` (P64):  a bare word, FIRST on an
      `<action>` with no quoted word, not `keep-open` / `icon-only` nor a word Spell UI's button takes bare
      (`ActionButton.answerOf()`);  it just closes, labelled by its title, else `Discard`.
      - A program's own `result` wins:  a variable of those words, or a property of the action's thing.
    - A program's own `to show (word as text)` still wins:  its method's rule reads `show "fizz"` first.
- A TAG'S QUOTED WORD (epic `language` P38):  on the tags below, it's the tag's contents, or what names it:
  `<header "Hardware" size="large"/>` draws exactly what `<header size="large">Hardware</header>` draws.
  - As contents (`P.QUOTED_CONTENTS`), the tokenizer makes it the tag's first children:
    `{its name}` in it is a hole, other contents follow it, and it's a child even on a tag closed with `/>`.
  - Each language's spellings are listed:  `<encabezado "...">`, `<es-encabezado "...">`.
    A word two languages spell alike but read differently is the language's own (`Language.quotedNameTags`).

  | Tag | The quoted word is |
  | --- | --- |
  | `header`, `button`, `item`, `label`, `title`, `link`, `breadcrumb`, `checkbox`, `radio` | its contents |
  | `tab`, `panel` | its `label` |
  | `example` | its `name` |
  | `tree-node` | its `label` |
  | `device` | which device it is, its `device` (`<device "phone" modal>`;  Spanish `<dispositivo "tableta">`, its `aparato`) |
  | `cell` | its column (`data-column`) |

  | Left out | Why |
  | --- | --- |
  | `text`, `description` | often long, or text mixed with values |
  | `td`, `th` | the web's own table tags |
  | `segment`, `column`, `content`, `stack` | they hold layouts;  their short text is mostly in demos |
  | `author`, `date` | common only in Spell UI's feed and comment demos |
- AN ACTION'S BUTTON, `<action "auto play"/>` (`action_button`, [ActionButton.ts](rules/JSX/ActionButton.ts);
  Owen, 2026-11-13):  a `<ui-button>` for ONE of the program's actions, named by its quoted word as it's declared.
  - Its word is a tag word (`spell_jsx_tag`, meaning `action`):  Spanish's `<acción "jugar solo"/>`.
    Only with a quoted word:  a bare `<action>` is Spell UI's `<ui-action>`, as before.
  - The action is the drawing's type's (or a super-type's), else any type's the program knows, as any may be up the
    thing's chain when it draws;  the app's `undo` and `redo` by their words (`appActions`).
    Found nowhere once the whole program has parsed:  refused, `unknown-action` (`SpellWarnings.refuseIf()`).
  - Compiles to `core.drawAction(this, "autoPlay", { ...its other attributes }, ...its children)`
    (`P.ASTJSXElement.action`);  TypeScript writes the same call, in braces inside its parent's JSX;
    Python `core.draw_action(self, "auto_play", {...})`.
  - The core gives the button the action's title (its text), icon, key tip (`Auto Play (A)`) and disabled, LIVE,
    and a click runs it as a menu item's does (`core.actionOf()`, `core.runAction()`).
    What the tag says wins;  `icon-only` is its own:  no text, the title its `aria-label`.
  - In another language, Spell UI's names in that language, as its `ui-*` tags take them (epic `language` P53):
    `<acción "deshacer" solo-icono tamano="pequeño"/>` compiles to the same call as
    `<action "undo" icon-only size="small"/>`.
    - `solo-icono` is the language's word for `icon-only` (`LanguageWords.iconOnlyAttribute`), accents or not.
    - The rest are read through the component pack's dictionary as it parses (`ComponentPacks.readAttribute()`,
      Spell UI's `SpellUIDefaults.readAttribute()`), since the core draws English's `<ui-button>`;
      one the pack doesn't know (`class`, `aria-label`) or a `{...}` value stays as written.
  - Inside a Spell UI menu, `<menu>` (`ui-menu`) or `<toolbar>` (`ui-toolbar`), it's a menu's ROW, not a button
    (epic `editor` P29):
    `SpellJSX.markMenuRows()` marks each it holds, an `<if ...>`'s too, and it compiles with the core's own
    `in-menu`, `core.drawAction(this, "save", { "in-menu": true })`.
    - The core draws a `<ui-action>` handed the action itself, which reads its title, icon and key, greyed and
      ticked, live;  its key in Spell UI's words (`meta+S` => `mod+S`).
    - A `<divider/>` the menu holds is a row too, `<ui-action kind="divider">` (`menuDivider`).
    - Not inside another element in it:  a `<buttons>` in a menu keeps its buttons.
  - The editor offers it, `<context-menu>` and `<divider/>` as a tag is typed, in the file's language
    (`SP.spellTagsIn()`, read off the `spell_jsx_tag` word rule), and the program's actions inside its quotes
    (`ActionButton.actionsIn()`):  the drawing's type's first, then the app's `undo` and `redo`, then every other
    type's;  an action takes nothing and gives nothing back, so a question, a drawing, a creation hook or a test
    is none.
- A RIGHT-CLICK MENU WRITTEN IN A DRAWING, `<context-menu>` inside the element whose right click shows it
  (`context_menu_block`, [ContextMenuBlock.ts](rules/JSX/ContextMenuBlock.ts);  Owen, 2026-11-13):
  - Its words are tag words too (`context_menu`, `divider`):  Spanish's `<menú-contextual>`, `<divisor/>`.
    A tag word may hold dashes, so the word rule reads `context-menu` whole;  each word is read once per rule
    (`webWordFor()`'s cache).
  - It holds only `<action "name"/>` items (read as an action's button is, so named and refused the same way) and
    `<divider/>`s;  anything else is `context-menu-item`.  No sub-menus yet.
  - Compiles to `core.drawContextMenu(this, ["autoPlay", "-", "undo"])`:  a hidden `<spell-context-menu>`, which
    the app's `ActionMenus.showContextMenu()` finds on the right click's path, before a `context-menu="name"`.
  - A `<divider/>` anywhere else keeps its word:  Spell UI's divider;  in a `<menu>`, a menu's line (above).
  - REUSING A MENU BY ITS NAME (epic `language` T156;  Owen, 2026-11-17), either shape:
    - `<context-menu "game menu" />` inside the element:  the menu of that name's items, drawn (`<menu "game menu">`)
      or a template's, as they show when the right click comes;  compiled as one more item,
      `core.drawContextMenu(this, [{ menu: "game menu" }])` (`P.ASTContextMenuItem`, `core.menuItemsOf()`).
      - It may hold its own items too, no `<menu>` around them:  they come FIRST, then the menu's, with no line
        between unless it writes one.
    - `context-menu="game menu"` on the element (Spanish's `menú-contextual="..."`, written as the web's
      `context-menu`):  as before, the page finds it by name (`core.menuOf()`):  a template's menu, else, new, the
      drawn one (`drawnMenuItemsOf()`, core's `ui.ts`).
    - Either refused, once the whole program has parsed, when no menu, drawn or a template's, has that name
      (`unknown-menu`, `unknown-menu-attribute`).  The names are kept per project as they parse (`noteMenuName()`,
      `hasMenuNamed()`, `JSX.shared.ts`), so a menu renamed in an editor counts by its old name until a fresh parse;
      and a template's menu in an imported project isn't known there, so naming one is refused.
  - `<separator/>` is `<divider/>` (T156;  Owen:  "make `<separator/>` an alias"), wherever it's written:  a word of
    `spell_jsx_tag` meaning `divider` (Spanish's `<separador/>`), so a menu's, a toolbar's and a context menu's line;
    anywhere else Spell UI's divider, named by the language's first word for it (`SpellJSX.dividerWordFor()`), unless the
    project has a type of that name.
- COMMENTS INSIDE MARKUP (`Tokenizer.markupComments`, on for spell;  Owen, 2026-10-26):
  `<!-- ... -->` among an element's children, over any number of lines, and a line of its own starting `//`:
  each ONE `P.JSXCommentToken`, which `jsxComment` ([SpellJSXComment.ts](rules/JSX/SpellJSXComment.ts)) parses to
  nothing.
  - Not in a raw-text tag (`<markdown>`, `<css>`):  their `<!--` and `//` are their text.
  - `//` inside a line stays text (`http://...`).
  - Between an if-chain's branches, and between a page's runs of markup (`PageTwin.joinMarkup()`), a comment
    is skipped over, as blank text is.
- An IF-CHAIN INSIDE MARKUP (epic `elemental-spell`, Owen 2026-10-25):
  `<text><if it is done>✓<otherwise>{its title}</></text>`.
  - The JSX tokenizer reads it (`Tokenizer.chainTags`, every language's words, `SP.CHAIN_TAGS`):  each branch a
    `JSXElementToken` with its `chain` kind and its `phrase` (a `JSXExpressionToken`, as if written `{...}`);
    a branch ends where the next starts, and ONE closer, `</>` or `</if>`, ends the chain.
  - `SpellJSX` keeps every branch on the page, each branch hidden while it isn't the one (`childASTs()`):
    - the web's own elements, and each run of text and holes (in a `<span>` of its own):  `hidden="until-found"`
    - a custom element (`<ui-label>`):  plain `hidden`, which Spell UI hides by (its host has no box of its own)
  - At a drawing's top level an `<if>` still picks what the drawing returns, rebuilt as it changes:  a page's tag
    line, plain Spell's `if` lines.  A branch in no element is `chain-outside-markup`.
  - A page's `<spell>` block's drawings are plain Spell's (J83):  the tokenizer marks its JSX as it unwraps the
    block (`SP.markCodeSpell()`), and `SpellJSX` reads a marked element, and everything inside it, `{...}` too, as
    code spell.

## Sounds and videos:  `play the "intro" video in a new window` (epic `language` P65)

- A NAME, given on a page or the app, either way round, or by a drawing's tag:
  - `sound "card slide" is at "sounds/slide.mp3"` (`define_media`, in a type's outline body:  `subject_implied`)
  - `its "intro" is a video at "intro.mp4"` (`outline_specifier_media`, which `DefinePropertyHas` names, `madeAs()`)
  - `<sound "boing" source="boing.mp3" />`, `<video "intro" source="..." />` (`SpellJSX.mediaDrawnBy()`, declared as a
    drawn member, `DrawnDeclaration.media`, by `DrawnMarkup`);  `<video "intro" />` with no source only draws it
  - Each is a property, starting as `core.media("sound", "sounds/slide.mp3", "card slide")`, made with its thing
    (`P.ASTReactiveProperty.early`), so the core finds it by its name at once.
  - Each notes its name for its project (`noteMediaName()`, `UI.shared.ts`), as menus' names are.
- A sound or video BY ITS NAME, `media_named`:  `sound "card slide"`, `the "intro" video`, Spanish `el vídeo "intro"`,
  `el vídeo llamado "intro"`;  compiled `core.mediaNamed("intro", "video")`, found while its page or app is there.
  - Without quotes (`media_name_words`, its own `parse()`):  the words of a name noted by then, the longest that fits;
    or the words before `sound` / `video` that, with it, are no property of the thing it's in, for a name given
    further down (a drawing below the action);  the longest reading wins, so `the card slide sound` beats the member
    read `the card slide`, then `sound`.
  - A quoted or bare name nobody gives is refused once the program has parsed (`unknown-media`).
- `play_sound` reads, after what it plays, each optional in this order:  `media_speed` (`at 1.5x`, `at half speed`),
  `from` + `media_time` (`0:30`, its own `parse()`:  the `:` touches its numbers;  only here, so `9:30` elsewhere stays
  a `time_literal`), `media_volume` (a percent, kept as its fraction), `media_loop`, `media_place`, `and wait`:
  one options object, `core.play(x, { speed: 1.5, from: 30, where: "window" })`, awaited for `and wait`.
- `stop_all_media`, `media_call` (`pause` / `resume`, a named one only:  `pause for 2 seconds` stays a pause),
  `media_is` (`is playing`, `is done`), `media_length` (a duration, `SP.SECONDS`).
- `when_media` (events, on `On`):  `when the "intro" video ends`, its event `intro-video-ends`, the name's words, the
  kind and what happened, dashed, the same in every language (`mediaEventName()`, a copy of the core's).
- What they compile to runs on the core's `media.ts`.

## Fill-ins:  `"images/[rank]-of-[suit].png"`

- `[x]` inside text ALWAYS fills in (epic page Q2).
  - [`parseFillIns()`](rules/core/TextLiteral.ts) splits the text into plain pieces and fill-ins.
  - Each fill-in is parsed as an expression, where the text is.
  - It reads `the x`, in the file's language, when `x` is a property of the thing the action runs on.
    So `[rank]` in a card's getter is the card's, and in a loop it's still the card's, never the item's;
    `[its rank]` is the item's.
  - A local, argument or loop variable called `x` comes first, with no warning on the read.
  - A real bracket:  `[[` or `\[`, and `]]` (Q15).
- Three places use it:
  - the `text` rule
  - a markup attribute's text value (`SpellJSXAttribute`)
  - markup text (`SpellJSXText`, as one `{...}` child)
  - Each keeps the parts in `data.fillIns`.
  - Each compiles them to a javascript template string, `P.ASTTemplateString`:
    `` `images/${this.rank}-of-${this.suit}.png` ``.
- A fill-in that doesn't parse:  the text doesn't match ("Don't understand"), or the attribute is a parse error.
- A fill-in's warnings go on the text or markup it's in (`noteFillInWarnings()`).
- Each fill-in parses on its own, so its tokens don't map back onto the file:
  no hover or go-to inside one yet.

## What reads wrong on purpose:  warnings and refusals (epic `language`, r2)

- A line in an element that reads whole as a loop or a draw warns, as it only shows as text:  [`SpellJSXText`](rules/JSX/SpellJSXText.ts).
  A sentence that starts the same way doesn't.
- `it is empty`, where `it` is a type that holds no items, warns:  it can never be true ([`IsEmpty`](rules/expressions/IsEmpty.ts)).
- Types whose `a new ...` properties make each other are refused, naming the circle:
  `DefinePropertyHas.refuseCircle()`, asked when errors are gathered, as the other half may be in another file.
- `- to it:` names no action, and is refused:  `MethodDefinition.getRule()`.
- `where the person is the cook` and `where they are the cook` read the item's own field, in both languages:
  [`TheyAre`](rules/places/TheyAre.ts), and a field it hasn't got says so.

## Scope:  what's stored where

- All scope collections are [`ScopeList`s](../parser/scope/ScopeList.ts):
  - only `get`, `add` and `replace`:  no remove
  - `get()` checks its own items, then falls through to the parent list
  - Changes are journaled:  see "Incremental parsing".
- `Scope` owns nothing:  it forwards these to its `parentScope`.
  - `variables`, `types`, `constants`, `rules` and `parser`
  - It resolves a datatype to its type:
    - `getType()`
    - `getItemType()`:  of a `list of cards`, or a `Deck`'s `itemType`
- `BlockScope` owns `variables` + `methods`.
  - Methods are `P.ScopeMethod` records, holding:
    - words
    - `params`, with datatypes
    - `returns`
    - `of`
  - `FileScope` is a `BlockScope`, so a file owns only variables.
    - Not a one-of-a-kind's:  `pokedex` for `pokedex is an app` is the PROJECT's, so every file names it (epic `data` I44).
- `RootScope` adds `types`, `constants`, `rules`.
  - `ProjectScope` is a `RootScope`, and holds the records of the project's free functions.
  - Each language pack has ONE root, shared by every project in it:  `SP.Language.rootScope`.
    `SpellParser.rootScope` is the default's, English's.
    A project mixing languages has a root of its own (see "Projects").
  - A root holds (see "Built-in types"):
    - spell's classes:  `Thing`, `List`, `App`, `Object`
    - every built-in type's NAME, with super-types (`P.BUILT_IN_TYPES`)
      - e.g. `text`, `number` ...
      - e.g. `integer` is a `number`
    - their members, from `SP.BUILT_IN_TYPE_TABLE`
    - spell's built-in templates written in spell, e.g. `two sided view`:  each one's type and members, from its
      compiled declarations (`SP.loadBuiltInTemplates()`;  "Property bodies, slots and drawn lines", above)
      - NOT in a bare root (`SP.Language.bareRootScope()`), where they compile themselves
- `MethodScope` adds args, plus `this` / `it` alias variables, of type `itDatatype`.
- `SubjectScope` owns nothing, and names the type its lines are about:  see "Outline bodies".
- `TypeScope` holds:
  - instance + class variables
  - instance methods' records
  - a list type's `itemType`
  - member lookup, up its super-type chain:
    - `chain()`, `isA()`
    - `getMember(words)`:  a property, else a method

## Scope:  who changes it, and when

- Changes happen ONLY in `mutateScope()`, run by `commitStatement()` (step 4 above).
  `getAST()` is pure:  see below.
  - variables:  `AssignmentStatement`, `get` ([assignment/](rules/assignment/))
    - into `match.scope`, so inside a body they stay local
  - `get` / `set it to` ALWAYS declare a new `it` (`declareIt()`):
    - plain `it`, then `it_2`, `it_3`...
    - numbered from the visible `it`'s `output`, skipping names in use
    - so callbacks keep the `it` they captured
  - each new variable holds its value's `datatype`:  see "Datatypes"
  - both also count a name a new thing is given in so many words, `set t1 to a new tableau with name = "T1"`:
    see "One thing by name or place"
  - types:
    - [`create_type`](rules/classes/CreateType.ts)
    - [`create_list_type`](rules/classes/CreateListType.ts), which sets `itemType` too
    - `belongs_to_one` gives the item type its owner member:  see "Membership"
    - a type mentioned before its own line is a `stub`,
      which its real declaration later claims (`TypeScope.claim()`, journaled)
  - BEFORE a project's files parse, every type they declare is stubbed (`parser.stubDeclaredTypes()`).
    - So a line can name a type declared further down, or in a later file.
    - The types come from `SpellParser.declaredTypes()`.
      It scans for lines starting `a card is`, `create a type called hand`.
      - a name of several words too:  `a stock pile is a pile` (P15)
        - only before `is a/an` or `aka`
      - a one-of-a-kind app, with no article:  `solitaire is an app` (P21)
    - Each stub knows what it's a kind of, when the scan can tell (`SpellParser.declaredSuperTypes()`;
      epic `language` J177):  `Pile` for `a "stock pile" is a pile with layout "stacked"`.
      - So a line above it knows its family:  Solitaire's `if the card is in the stock` asks the card's own pile,
        `this.pile === solitaire.stock`, not a search of the stock.
      - Its abilities and a comment after it are left out:  `TwoSidedView` for `a "card" is a draggable two sided view`.
      - None for a list type (`a deck is a list of cards`) or a value's (`a "score" is a number`):
        its line says what it is when it parses.
      - Its real line still `claim()`s it, with the super-type it parsed;  an edit to that line re-parses everything
        (`changesTypeKinds()`).
    - `P.IncrementalProject` and `parseSpellProject()` both do it.
    - An edit which changes WHICH types a file declares stubs that file again, and parses it again whole;
      other files are kept if what they looked up finds the same ("Incremental parsing", below).
    - Each file's parser stubs its own, in play (`inPlay()`):  a name is made singular by its own language,
      and the stub notes it (`P.TypeScope.lang`).
- A type's name in ANOTHER language's grammar (epic `spanish` J89):  `cards` in a Spanish file, for an English `Card`.
  - Spanish reads `cards` as one word (`mes`, `as`), so its own singular finds no type.
  - Then each other language's singular is tried, for a type DECLARED in that language:
    `SP.typeInItsOwnLanguage()`, `SP.languageOfType()`.
  - `SpellType` names the type it found, and `singular_type` / `plural_type` / a `where`'s item count as that
    language does.
  - Then every ONE-OF-A-KIND's variable is known ahead, in the project's scope (epic `data` I44,
    `parser.stubDeclaredVariables()`):  `pokedex` for `pokedex is an app`, `klondike` for `klondike is a card game`.
    - So any file can say `the hearing of the pokedex`, in a file before the app's too.
    - Each is `ahead` (`P.ScopeVariable.ahead`) until `create_one_of_a_kind` replaces it with the real one.
    - A line that runs as the program starts, reading one still ahead, is refused:  it isn't made yet
      (`not-made-yet`, `SpellIdentifier.refuseIfNotMadeYet()`).
      - That's a line at a file's top, or in a loop there:  above the app's line, or in a file before it.
      - An action's, a drawing's, an event's or a type's body runs later, once every file has.
    - Every other top-level variable stays its file's own.
    - Several words, declared in a later file, read through `of` too:  `the picked kind of the pokedex`
      (`property_expression`, `P.TypeScope.knowsPropertyAhead()`).
  - Then every METHOD they define is made callable ahead of its definition (P22, `parser.stubDeclaredMethods()`).
    - So a line can call a method defined further down, or in a later file:  `play test-card` above `to play a card`.
    - A page file is scanned as its skeleton, each page's head as its twin line WITH its `:`, its body left out
      (`SP.PageTwin.skeletonOf()`;  "Pages", above).
    - `SpellParser.declaredMethods()` scans for their first lines, without parsing:
      - at a file's top:  `to ...`, and old source's `animation ...`
      - in a type's outline body:  `- to ...`, later parsed in a `P.SubjectScope` of that type
      - a type's QUESTION, either place (epic `language` I154):  `- it "can go up" if`, `a card "can go up" if`,
        up to its `if`, its body left out (the language's `questionLine`)
        - So an action above it asks it:  `where it can go up`, and T146's `or` lines.
      - A type's line may end in a comment, `a card  -- what auto play asks of a card` (`subjectOf()`):
        its body's methods are scanned too.
    - Each first line, parsed alone, registers its call rule early, marked `ahead` (`MethodDefinition.callAhead()`).
      It steps aside once the real definition has run (`DynamicMethodRule.test()`).
      - A question's rule is its own, `MethodPostfixRule` / `MethodInfixRule`, stepping aside in `parse()`.
      - Not a value kind's question (`a rank "is a face card"`):  it calls its kind's static method,
        and a type the scan knows no kind of may be a value kind.
    - Straight onto the parser, journaled:  not the scope's rules, so a project's declarations never export one.
    - An edit which adds or deletes a method re-parses the whole project (`parser.changesMethods()`):
      every call registered ahead of its definition reads again (epic `editor` I170).
      With `keepLastGood`, one whose first line is being edited keeps its early call until the next full parse:
      only an edit of that one line, so a rename of its head and every call re-parses (epic `editor` I170).
    - Not yet:  an alias, `a card "is the (rank) of (suits)"`, used above its definition.
  - Then every PROPERTY they declare is known ahead by name (epic `language` P2, `parser.stubDeclaredProperties()`).
    - So an action can read `the X`, or `its X` (P17), above the line declaring it, or in a later file.
    - `SpellParser.declaredProperties()` scans:  a body's `it has a deck`, `its "suit" is ...`, `deck is a deck`,
      one tab in, bare or bulleted (`- its "suit" is ...`;  bare since epic `language` P46);
      a top line's `a card has a suit`, `cards have a suit`, `the short rank of a card is ...`.
    - Only names, on the type (`P.TypeScope.propertiesAhead`, journaled):  the real declaration still records it.
    - An edit which adds or deletes a property stubs and parses that file again (`parser.changesProperties()`),
      as for a type, above.
      With `keepLastGood`, a name being typed doesn't count.
    - Not yet:  a member `belongs to` declares.
  - An edit which changes a type's line, `a "tableau" is a pile`, stubs and parses that file again too
    (`parser.changesTypeKinds()`):  a drawing above it decided by it whether `<tableau "T1"/>` is a view.
    With `keepLastGood`, only a type line added or deleted counts.
  - And after a rewind, what each type IS as parsed (`typeKinds()`):  changed, the whole project re-parses too (I93).
    A type line the scan still sees may no longer parse as one, taken in by a tag never closed above it,
    and a line above it kept its reading of that type (`the cards in the foundations`).
  - A PAGE ALONE IN ITS FILE (epic `notebook` P10, Q11):  a file whose only top-level thing is one page's head,
    comments aside (`SP.alonePageName()`, read from its lines, before anything parses).
    - The project knows only its head (`SP.AlonePage`):  its name and its properties, declared in the project's scope.
      That's what a site's page lines and `go to the film page` read.
    - It parses in a small `P.ProjectScope` of its own under the project's, with its own copy of the parser and its own
      journal (`P.IncrementalProject`, "a file ALONE"):  what it declares is its own, so nothing later can be affected.
    - Typing in it re-parses it alone;  changing its name or a property re-reads the rest of the project.
    - The editor compiles the rest plus the pages it's showing (`SpellProject.pagesInPlay`).
      Every other compile combines every file, its output byte for byte what it was.
    - Any other file is simply not alone:  no error, and it compiles as ever.
  - `is a <type>` (`is_a`) names a KNOWN type:  built in, imported, declared or stubbed earlier.
    - Else it's a parse error, e.g. `is a crad`.
    - A type first mentioned in an `is a` above its own declaration is one too.
  - properties:  every property statement records the property in its type's `variables`
    - with `declaredBy` and its datatype (`TypeScope.declareProperty()`)
    - read by `the X of Y` / `its X` for their datatype, and by editors
      - through `getMember()`
    - a getter's datatype is what it returns, set once its body has parsed (see "Datatypes", "Return types")
      - so a getter changes scope as any declaration does:  editing its line re-parses what follows
    - an enumerated one (`define_property_has`) also adds:
      - constants for each value
      - a plural `classVariables` entry, e.g. `Suits`
        - with an instance twin in `variables`
      - ONE static rule, `class_member`, reads that for any type:  no rule per enumeration (see "Members")
  - auto-declared properties:  `set the X of Y to V` declares `X` on `Y`'s type.
    - That's `AssignmentStatement.declareProperty()`.
    - It's `autoDeclared`, holding `V`'s datatype, so it's reactive.
    - Only where `Y`'s type is one the PROJECT declares (not a stub, an import or a built-in),
      and `X` isn't on it.
    - `data.autoDeclared` makes that set `"global"`.
      See `getScopeChanges(match)` under "Incremental parsing".
    - Its FILE compiles the declaration:  see "Compile".
- Every record a `mutateScope()` adds carries `declaredBy`:  the match which declared it, for go-to-definition etc.
  - The records:  `ScopeVariable`, `ScopeConstant`, `TypeScope`, `ScopeMethod`, `ScopeRule`.
  - A `ScopeRule` also carries its built `instances`.
    So a call site's `match.rule` maps back to its definition.
  - `MethodScope` stamps its `declaredBy` on the argument and alias variables it makes.
  - `ScopeList.add()` also notes each such record on its declaring match, as `match.data.declared`.
    - That's `ScopeList.noteDeclared()`;  `TypeScope.claim()` does it too.
    - So COMPILING a statement can say what it declared, without looking up scope.
      See `SP.SpellDeclarations.commentFor()`.
  - A re-parsed statement takes back a record an earlier parse of itself left:
    same rule, line and file (`TypeScope.sameStatement()`).
    - Why:  journal replay can resurrect one, declared by a match that's gone.
- What a statement declares, for editors' symbol lists, comes from its rule:
  - `@proto static declares`
  - or a `getDeclaration()` override, e.g.:
    - `assignment` counts only NEW variables
    - `MethodDefinition` reads its signature
- How editors colour a match's OWN tokens comes from its rule's `highlightAs`, e.g. `property`.
  - Defaults are on `Keyword(s)`, `Symbol(s)`, `SpellIdentifier`, `SpellType` and `SpellConstant`;
    else on the rule class.
  - `SpellLanguageService` refines it from `match.data`.
    - e.g. an argument's `variable` becomes `parameter`
- Rules a statement adds while parsing:
  - a quoted alias, e.g. `a card "is face up" if ...`
    - [`quoted_type_expression`](rules/methods/QuotedTypeExpression.ts) adds an `expression_suffix` rule.
      It's a `MethodPostfixRule` or a `MethodInfixRule`.
  - a quoted formula, e.g. `a card "is the (rank) of (suits)" for its ranks and its suits`
    - [`quoted_property_formula`](rules/classes/QuotedPropertyFormula.ts) adds a `QuotedPropertyRule`.
  - methods (`to turn a card over` ~== `to turn (a card) over`):
    - a signature's `a|an <KNOWN type>` is a typed parameter, as `(a card)` is
      - its rule:  `bare_type_arg`
    - a word that isn't a type, or anything after `the`, stays words
      - e.g. `to make a mess`, `to reset the stock pile`
    - its compiled NAME drops the receiver's type (`turn_over`), unless that leaves a little word dangling (Q44)
      - then it keeps the type's name:  `to update the total of (a calculator)` => `update_the_total_of_calculator`
      - `MethodDefinition.processSignature()`, the language's `danglingWords`
    - in a type's outline body, a signature that names no type takes the body's subject (P20, I15)
      - `- to debug it:` ~== `to debug a solitaire`
        - `it` is where the receiver goes
      - with no `it`, the receiver is optional:  `deal the cards (of {thisArg:expression})?`
        - or straight after a one-word name:  `- to reset:`
      - left out, the call is on `this`, and only inside the type's own methods:  `DynamicMethodRule.onThis()`
        - or anywhere, on a one-of-a-kind app's one instance (P21)
      - `MethodDefinition.takeSubject()`
    - [`MethodDefinition`](rules/methods/MethodDefinition.ts) adds a rule for its call site,
      AND a `P.ScopeMethod` record
      - by `addMethod()`
      - the record goes in its type's `methods`, if this project declares the type
      - else in the project's, with `of`:  a free function, or a method of a built-in or imported type,
        whose lists every project shares
    - a call (`DynamicMethodRule`) finds its record while parsing (`MethodDefinition.findMethod()`)
- Types, constants and rules ALWAYS go to the project, from any depth.
- [`scope.addRule()`](../parser/scope/Scope.ts) => `parser.addRule()` on the PROJECT's parser.
  It adds a record in `ProjectScope.rules` too.
  - `Parser.addRule()` brings the `rules` map up to date for that one name (`updateRule()`):
    its own rule first, then its imports', as the whole merge would (epic `language` P22).
    - A scope's parser with no rules of its own yet shares its import's map, copied only when it adds one.
    - Before P22 each added rule cleared the map, and the next read merged the whole language again.
  - `mergeRule()` is copy-on-write:  existing `Group`s are cloned, never mutated.
    A new name shares the rule it's given, a group too.
  - A `Sequence` that starts with a word it can't do without checks that one token first (`leadingWord`),
    before its full quick test:  most of a group's rules are turned away there.
  - There is NO `removeRule`.
    But `parser.journal` can undo an `addRule()`:  see "Incremental parsing".
  - Generated rules are NAMED classes, `specialize()`d with plain-data statics, never closures.
    - The classes:
      - [`QuotedPropertyRule`](rules/classes/QuotedPropertyRule.ts)
      - [`DynamicMethodRule`](rules/methods/DynamicMethodRule.ts)
      - [`MethodPostfixRule`](rules/methods/MethodPostfixRule.ts)
      - [`MethodInfixRule`](rules/methods/MethodInfixRule.ts)
    - Why:  so `SP.SpellDeclarations` can write a project's rules out as data, and another project can rebuild them.
    - Each base class says `@proto static importableAs = "<id>"`.
      That registers it for `P.Rule.importableRule(name)` (`Rule.protoDefined()`).
  - Each overrides `specialize()` to take a MINIMAL set, e.g. `{ output: "play_fizzbuzz", alias }`.
    - It works out `ruleName`, `methodName` etc itself.
    - That set is what `specializedWith` remembers.
    - Its `static declarationProps(declared, syntax)` says what of it, plus `syntax`, gets written out.
  - A quoted method's negatable word becomes its `Negatable` rule.
    - e.g. `is` => `{operator:is}`, matching `is not` / `isn't` too
    - `InfixOperatorSuffix.shouldNegateOutput()` asks `Negatable.isNegated(operator)`.
- Lookups record misses as `NONE` in `match.data`.
  - in `scopeVar`, `scopeType` or `scopeConstant`
  - `known_variable`, `known_type` and `known_constant` reject `NONE`.
- A variable's name of several words (P26):  `set start pile to ...` declares it (`words_assignment`), and
  `known_words_variable` reads it, `start pile`, `the start pile`.
  - `words_identifier`:  2 to 4 plain words, up to a structural one (`to`, `of`, `with` ...);
    the longest run a variable in scope goes by, else the whole run.
  - The same variable as its dashed name:  `start pile` and `start-pile` are both `start_pile`.
  - A name holding a structural word (epic `spanish` P14):  declared with dashes, then read either way, longest first.
    - e.g. `set way-to-go to 3`, then `way to go`
    - Its first word can't be one:  `no more` reads `no`, then `more`.
  - Its quick test looks the words up first:  it's an expression, tried at almost every word.
  - An event's name of several words too, `on card click`, `fire event card click` (`event_words`):
    the same event as `card-click`.
    - A linking word may sit between two of its words (word rule `event_name_link`, epic `spanish` I11):
      `al clic en carta con una carta` is `clic-en-carta`, its name ending at `con`.
    - A one-line event with no colon (epic `debut` P27, Q47):  `on drag cancelled show "Not there"`.
      Its name is the FEWEST words whose rest parses as a whole statement, read in a throwaway handler scope
      (`it` the thing);  a line with a colon keeps the longest name, as before.
    - A passive `when` names the thing's own event by meaning (`passive_event`):  `when clicked` is `on click`.
    - A property's CHANGE (epic `debut` P30):  `when its score changes`, `on score change` are event `score-change`,
      the handler `onScoreChange()`.
      - `changed_property` reads the property by its template's declared names, longest first (inherited ones too);
        words that name none stay the event they always were.
      - Its `on` is `preferred`, so `on its score change` names the property, not event `its-score-change`.
      - The core sends it each time the property changes, just after the change lands (`noteSetting()`, `sending.ts`).
- `getAST()` NEVER changes scope or looks it up.
  - ASTs are built lazily, e.g. at compile, when scope may have moved on.
  - What an AST needs from scope is looked up WHILE PARSING, into `match.data`:
    - `SpellIdentifier` / `variable` => `scopeVar`
    - `SpellConstant` => `scopeConstant`
    - `its_*` => `itVar`
    - `SpellType` => `scopeType`
  - A statement which declares something it also uses records it on that match, e.g. `property_value_either`.
- What waits is worked out for the whole project, before any of it is written (`P.WriterProject.findWaiting()`):
  - Nothing in the source says so.  The old words (`animation`, `wait for`, `await`, the old tag form's `animated`) are retired:
    each still reads, as an error over just the word, which `spell lint --fix` rewrites or takes out
    (the language's `retiredWords`, `SpellType.noteRetiredLiterals()`).
  - It starts from what waits by itself (`core`'s calls in `P.CORE_CALLS_THAT_WAIT`, and old source's `wait for`),
    then adds every function that calls one, by name, until nothing changes.
  - A `notify` is the one slow thing nothing waits for, unless it says `and wait`.
  - `meanwhile deal` and `deal without waiting` are a function of their own, so what holds them doesn't wait because of them.
  - It sets `method.waiting` on every compile, and the calls to write `await` in `project.awaited`:
    `method.isAsync` then says `async`, and the project's declarations carry the same answer.
  - Rules don't say which:  a pause is a plain call of `core`, and a loop a plain `core.map()`, written one by one
    when its function turns out to wait.
  - It stops at a program's top level, a function inside a function, and what a writer's `canWait()` refuses.
    - A top-level step that waits is held instead (`heldSteps`, `core.holdWhile()`):  the first draw comes at once,
      and people's actions wait for it.
    - So is one in a `create()` that can't wait, javascript's:  `when creating it` dealing Solitaire's cards.
  - A getter that waits is a value on Solid, `core.waitedValue()`, and each read of one, by name, follows it
    (`waitingValues`):
    - In a function that waits it's `await core.answerOf(thing, "total")`, the answer after any writes (`project.awaited`).
    - A plain getter over one stays plain on Solid, since "not yet" passes through it, and is never `@derived`, which
      would stay wrong for good.
      Python's and a library's wait too (`readsThroughSolid`).
    - In a drawing:  a child value alone, `core.whileWaiting()` (`spotsThatWait`);  anywhere else, the class says
      `drawsWaiting`, and its boundary holds the whole thing (`heldDrawings`, `drawInBoundary()`).
      A loop's function, `core.drawEach()`'s and `core.drawRead()`'s, is part of the drawing (`drawnLoopFunctions`):  it never waits.
    - `createDeferred()`, never an async `createMemo()`, which freezes what else draws;  `lazy`, so nobody's slow work
      runs unread.
    - `pause`, and old source's `wait for`, in a drawing are parse errors (`refuseWaitInDraw()`);
      a getter reading another thing's member after a wait warns (`reads-after-wait`).
  - Two rules say not to wait, each by running functions of its own:
    - `meanwhile`, or `... without waiting` at a line's end, `core.meanwhile(() => ...)`:  a function inside a function, so its caller doesn't wait.
    - `at the same time:`, `core.together(() => ..., () => ...)`:  waits if a line does (`togetherWaits()`);
      a loop right in it is `core.eachTogether()`, never written one by one.
  See `ASTMethodDefinition.isAsync`.

## Places

What a program's lines about where data lives compile to, and what reads the rest (the `places` rule module, epic `data` P11).

- `family cookbook is a web server at "..."` (`create_place`) declares a type and its one instance, as `solitaire is an app` does.
  - Its kind is a word (`place_kind`), or a type made from `place`, which is how a library adds one.
  - Compiled:  its class, then `core.place(new FamilyCookbook(), { name, kind, at, ...what the lines under it say })`.
  - The lines under it compile to nothing by themselves (`PlaceDetail`):  `create_place` gathers them, walking its body.
- `- it is saved in the family cookbook` (`saved_in_place`) marks the type's RECORD (`P.TypeScope.declareSaved()`, journaled).
  - Compiled:  `static savedIn = { place, collection }`.
  - The project's declarations say it too (epic `data` I19):  `savedIn` on the type, `place` on the place's type,
    so in a project importing the type the words below read the place as well (`SP.SpellDeclarations.load()`).
    - A project can't yet name an imported place on its own type's line:  the place's one instance isn't imported.
- The words people already know read the record when the project compiles, in `getAST()`, off the record a type match found
  while parsing (`data.scopeType`), as a kind's list is read:  so a line above the type's line means the place too.
  - `every recipe`, `the recipes`:  `core.savedThings(Recipe)`, `EveryThing.savedAST()`.
  - `where`:  each part that says `its X is <a value>`, joined by `and`, goes to the place as a filter (`handedFilterOf()`).
    Anything else stays `core.filter()`, over everything the place holds, with a third argument that checks the ceiling, and a warning.
  - `sorted by`, with a plain field for a key, on a read of a place:  the query's `sort`;  `newest first` says `descending`.
  - `add`, `remove`:  `core.saveThing()`, `core.removeSaved()`, with no list.
  - By its plural alone (`recipes`, `all recipes`, `recipes where ...`;  epic `data` P15):  the same read, the plural looked up first as what the program has by that name (`ownListOf()`):
    - its variable reads as a variable;  a property, the word alone reads it, as no other rule does
    - `caja de recetas` stays a name of several words:  `property_expression` takes no bare plural, `isBare`
  - `there are less than 2 recipes where ...` (`there_are_things`):  a count of that same read, or of the program's own list, with no type needed.
    - The rider `if there are none:` is a statement with no noun, under a read:  `none` is never a type, so one never reads as the other.
  - A drawing can't wait, so a question about a read in one is a waited value (`readableInDrawing()`):  it holds the whole thing, or draws "…", until its answer.
    - So is a read written right in an element, an attribute's or a child value, `<table rows={every review}/>` (epic `mockup` I4).
    - One that names a loop's item is a value per item, `core.waitedValueKeyFor(this, film)`:  the same words are another read for each film.
- `core.savedThings` is in `P.CORE_CALLS_THAT_WAIT`:  so a getter over one is a value that waits, and the waiting pass does the rest.
- What a project reads from its places is worked out as it's compiled too (`P.ReadGathering`, beside the waiting pass):  by name,
  into `select` on a type's `savedIn`, `firstReads` on a place's line, and `declaredAt` and `readsFrom` on what declares them.
  A project with no saved type compiles as it did.
- A loop in a drawing over a saved type, or with a rider under it, is `core.drawRead(() => list, (item) => ..., { riders })` (`DrawnLines.asRead()`).
  - A rider (`while waiting:`, `if there are none:`, `if that fails:`) compiles alone to `core.readRider()`, and the gathering of
    a drawing's lines takes each into the read above it, as an `otherwise` follows its `if`.
  - In an action, `if that fails:` compiles to a `try` around the line above it, at `Block.getAST()` (`IfThatFails.catchesLineAbove()`).
  - Its read function is named `drawRead`, which `P.DRAWING_NAME` knows:  a drawing never waits, it shows what it has.
- What can't be, a line elsewhere may settle:  `SP.SpellWarnings.refuseIf()`, `noteIf()` for what won't compile.
  `SP.Block.getParseErrors()` reports it among the parse errors, worked out when it's asked.
  - What the compiler knows of a kind is `PLACE_KIND_ABILITIES`, its one table.
  - A sheet is read only at a plain address, and takes writes at a place server's (`isReadOnlyPlace()`):  no word for it, the address says.
  - An atmosphere account (epic `data` P16) warns at its line of what no referee can promise (`CreatePlace.warnOfNoReferee()`, `hasNoReferee`):  it's public, each person
    changes only their own, `where` happens in the browser.  An address, an account or a collection the protocol can't read won't compile.
    `a recipe version 2 renames ...` on one warns too (`VersionStep`):  old records keep their old names, and it only changes how they read here.
- A target that says `places: false` (a library) refuses a project that names one;  one that lists the kinds it keeps
  (Python's:  a database on this device, a data folder, a sheet, an Excel file, an atmosphere account;  `PY.PLACE_KINDS`, epic `data` P40, P46)
  refuses a place of any other kind, by its word:  a web server is "not in Python yet" (`SpellProject.placeKindRefusedBy()`).

## Sites

What a site's lines compile to (the `sites` rule module, epic `mockup` P1):  its pages, at their addresses, and the dialogs and
sidebars any of them opens.

- `galaxy guide is a site:` (`create_site`) is `create_one_of_a_kind`'s line for a SITE, spell's built-in template
  ([Site.spell](../core/templates/Site.spell), an app):  a type and its one instance.
  - Where it lives, if its line says:  `at "owen@spell/galaxy"`, or `in the cloud`.
  - Its own values for a site's properties, after that, as a type's line has them (`create_type`'s `defaults`,
    epic `mockup` I30):  `galaxy guide is a site with theme "mockup"`;  Spanish `con tema "mockup"`.
- The lines under it compile to nothing by themselves;  `create_site` gathers them, walking its body (`CreateSite.partsOf()`):
  - `- it has a film page at "/films/:film", named "Film"` (`site_page`):  a page, at its address;  the lines under it, its pages
  - `- it has a settings dialog`, `- it has a film sidebar` (`site_overlay`):  by its last word, the language's
    `site_dialog` and `site_sidebar` (Spanish's first:  `diálogo de ajustes`)
  - Only in a site's body (`siteOf()`, its subject a site):  anywhere else, `it has a ...` is a property.
  - A part's name is `site_part_words` (`SitePartWords`, epic `mockup` P3, T5):  a member's words joined by the language's
    `of`, so Spanish's `- tiene una página de película en "/peliculas/:película"` needs no quotes;  `de la` ends it.
- The SITE holds each page's address and name;  the page file holds only what it shows and does.
  - A parameter, `:film`, is one of the page's own properties (`- it has a film`):  its type is the page's, never written twice.
  - Refused at the line:  a name that isn't a page, an address without `/`, a parameter the page has no property for, and an
    address another page has (`P.TypeScope.declareSitePage()`, journaled).
- Compiled:  `static pages` (nested as written), `static dialogs`, `static sidebars`, `static livesAt`, `static mainLayout`,
  on its class.
- Its not found and error pages (epic `mockup` P2):  `- it has a not found page`, `- it has an error page`
  (`site_overlay`, by the wordings `site_not_found_page`, `site_error_page`):  `static notFoundPage`, `static errorPage`.
- Its PAGE LAYOUTS (epic `mockup` T39):  what stays on screen around its pages, so going between them redraws only the
  page.
  - A layout is one of a kind, made from spell's built-in template `page layout`
    ([PageLayout.spell](../core/templates/PageLayout.spell), a view;  Spanish `diseño`, as `diseño de página`'s `de`
    is a grammar word):  `main layout is a page layout`, `create_one_of_a_kind` (`isOneOfAKindType()`).
    - Its slots, each its own drawing:  `to draw its app menu` (the top bar), `page menu` (a row under it, the
      shown page's family as tabs by default), `drawer` (the site's navigation unless it draws it), `left sidebar`,
      `right sidebar`, `footer`.
    - A layout builds on another as any one of a kind does:  `wide layout is a main layout`.
  - A PAGE picks its layout on its own line (`create_one_of_a_kind`'s `layout` / `no_layout`):
    `systems is a page, in the bare layout` => `static layout = "BareLayout"`;  `, no layout` => `static layout = false`.
    - Refused on anything but a page;  a layout the project doesn't declare is refused once it has parsed.
  - Every other page is in the site's MAIN layout, the page layout whose words read as `site_main_layout`
    (`main layout`, Spanish `diseño principal`):  `static mainLayout`, by `mainLayoutOf()`.
    - None:  the site draws its built-in frame, the navigation and the page.
  - A page may draw a slot itself, `to draw its right sidebar` (`draw_it`'s slot drawing):  its own wins while it's shown.
  - `- it has a top bar` and `, no top bar` (T35) are RETIRED:  they compile to nothing, with a warning saying where
    each goes now (`site-top-bar-retired`, `site-no-top-bar-retired`).
- Going between its pages (P2), naming the PAGE, never its address:
  - `go to the film page for this film`, `show the settings dialog` (`show_site_part`, a statement and an expression, for a
    handler):  `core.showSitePart("film page", film)`
  - `close the review dialog` (`show_site_part` too, its `close` group, epic `mockup` P8):  `core.closeSitePart(...)`
  - `the address of the film page for this film` (`site_address_of`):  `core.siteAddressOf(...)`, for a link;
    `""` while the film isn't read yet (`SiteBase.linkTo()`)
  - Read without the site:  a page declared further down the file is taken by its word `page`, by `go to`, `show` and
    `the address of` alike (`namesSitePage()`).
  - Checked against what the site really lists once the project has parsed (`refuseUnlistedPart()`, epic `mockup` P3, T6):
    a part no site names won't compile, its error at the line, naming the parts the site has (`P.TypeScope.sitePages`,
    `siteOverlays`);  a program with no site isn't checked.
- Running:  the template's class extends the core's hand-written `SiteBase` (`HAND_WRITTEN_BASES`, in
  `builtInTemplateFiles.ts`), which shows the page an address names;  a program with a site starts its site, not its first
  page (`SpellProject.startedByItself()`).
- Its theme (epic `mockup` P8, I30):  the template's `theme` property, on its line, `galaxy guide is a site with theme "mockup"`,
  or in its body, `its "theme" is "mockup"`;  no words of its own;  the running site asks its host for that theme's tokens and wears them on its frame
  alone (`SiteHost.themeTokens()`, the editor's `RunSite`).
- A page's stories (epic `mockup` P6) are the page's own, `<stories>` in its outline:  "Markdown" below.

## Projects

- Projects come in GROUPS (project roots), and the groups are spaces', not spell's:
  `SPACES.PROJECT_GROUPS`, in [projectGroups.ts](../../../app/src/spaces/models/projectGroups.ts).
  - Spell's registry, `SpellSetup`, starts empty:  loading spaces' groups registers them there.
  - So every program that reads a spell path loads them first, through one of:
    - `spell/app/spaces`
    - spaces' disk reader
    - `spell/app/spaces/models/projectGroups` alone, as `<spell-viewer>` does
  - Spell never imports spaces.
- Everything is named by its ADDRESS (epic `people-and-orgs` P4, [SpellLocation](SpellLocation.ts)):
  - a group, e.g. `@spell/examples`
    - spell's own:  `@spell/examples`, `@spell/library`, `@spell/guides`, `@spell/test`
    - `owen@spell`, this machine's person's own space (`SPACES.localPerson`;  `alice@acme` at work)
  - a project:  its group's, a slash, its name, ONE part, lower-kebab (decision Q39)
    - e.g. `@spell/examples/solitaire`, `owen@spell/errors`
  - a file in it:  a slash, then the file, whose name has a dot (decision Q41)
    - e.g. `@spell/examples/solitaire/Card.spell`
    - a folder ends in a slash, `@spell/examples/drawable-solitaire/assets/`
  - a page of a running app:  more after the project, no dot in its last part
    - e.g. `owen@spell/solitaire/rules`
    - the app's `/run/` URLs;  apps have no pages yet
  - A `@local/<folder>` group is added at runtime for a folder an editor opened.
  - No other form is read:  not `@system:examples:Solitaire`, not `@examples/Solitaire` (decision Q30).
- On disk, by address ([SpellUrls](SpellUrls.ts)'s `folderFor()`, then `serverPathForRoot()` in spaces'
  [project-utils.ts](../../../app/src/spaces/server/node/projects/project-utils.ts)):
  - spaces' built-ins, committed:
    - `@spell/examples/...`, `@spell/library/...`
    - in spell-app's `spaces/@spell/<group>/<Project>/`
  - the test projects, committed and frozen, beside them:
    - `@spell/test/...`
    - in spell-app's `spaces/@spell/test/<Project>/` (spell-parser's `tests/spaces/` until epic `spanish` P18)
  - Owen's own, in spell.spaces, outside git:
    - `owen@spell/...`
    - in `<main checkout>/../spell.spaces/@spell/owen@/<project>/`
    - One folder for main and every worktree;  `SPELL_SPACES_DIR` sets it.
    - A person's space is inside their org's, so `@` says what each folder is.
  - A `@local/<folder>` group says where itself, with its `serverPath`.
  - The folders are spaces' `environment` ([environment.ts](../../../app/src/spaces/server/node/environment.ts)), its `spaceFolders`:
    - `builtins` and `spaces`
    - Tests point them at temporary folders, with environment variables:

      ```sh
      SPELL_BUILTINS_DIR  SPELL_SPACES_DIR
      ```

  - A project's folder is its name, e.g. spell-app's `spaces/@spell/examples/drawable-solitaire/` (decision Q39).
    The editor shows its title, `Drawable Solitaire` (`SpellProject.title`).
  - A group with `devOnly` is listed in the app's UI in dev only.
- A group's projects are its folder's sub-folders, less spaces' own `__` names.
  - Spaces' list:  `SPACES.SPACE_NAMES` (`isSpaceName()`).
    - e.g. `__members/`, `__project.json5` ...
  - Known by that list, never by the `__` alone:  `__init__.py` and `__snapshots__/` are a project's files.
- A project's file, `__project.json5` (`SP.PROJECT_FILE`), imports:
  - another project by its address, `{ "path": "@spell/library/people" }`
  - its own files by their paths in it, `{ "path": "/Card.spell" }`
  - `SpellLocation.isAddress()` tells them apart:  only an address has an `@` in its first part.
  - An old `project.json` is read too.
- Compiled output is never one of a project's own files.
  - The server's index lists only spell, CSS and javascript files, and property editor pages:  see `isManifestFile()`.
    - `.spell`, `.css`, `.js`, `.jsx` and `.editor.html` (`SP.EDITOR_PAGE_SUFFIX`)
    - A property editors file, `Card.editor.spell` or `Solitaire.editors.spell` (`SP.isPropertyEditorsName()`,
      epic `editor` P25) lists as one of its own:  a text file, never compiled, which the Inspector reads.
    - So no other target's output, e.g. `<Project>.spell.py`, is ever listed.
  - Of those, it leaves out:
    - a project's `<Project>.spell.js`, and a fixture's `<Project>.snapshot.js`
    - its scope pack, `<Project>.scopes.js`
    - its words, `<Project>.en.js`
      - and ANY project's, whatever its name:  `calculator.en.js`, left in a copy of the project named `calc2`
      - Known by its name and its first line (`SP.SpellWords.isWordsScript()`), so a helper like `socket.io.js` lists.
      - Left on disk, never deleted:  compiling writes the new name's.
    - a Python program's page file, `<Project>.elements.spell.js`
    - the same files by their names before epic `people-and-orgs` P11, e.g. `<Project>.compiled.js`:
      an old copy left in a checkout
  - Else the index would add them to the project file.
  - The list:  `GENERATED_SUFFIXES`, beside `isManifestFile()`.
- A file's kind is the END of its name (`SpellProject.getFileForPath()`):
  `helpers.min.js` is javascript, and only what ends in none of `.css`, `.js`, `.jsx`, `.editor.html` is parsed as spell;
  a property editors file, `Card.editor.spell`, is text, never parsed.
- What spell BUILDS for a project goes in its build folder, not beside its source (epic `people-and-orgs` P11).
  - That's `build/` at spell-app's root, never committed, each checkout its own.
    It mirrors the project's path:
    - under spell-app:  `spaces/@spell/examples/drawable-solitaire` => `build/spaces/@spell/examples/drawable-solitaire`
      - the frozen test projects too:  `spaces/@spell/test/fizzbuzz` => `build/spaces/@spell/test/fizzbuzz`
    - in spell.spaces:  `@spell/owen@/errors` => `build/spell-spaces/@spell/owen@/errors`
    - The table, and `SPELL_BUILD_DIR`:  [spaces' AGENTS.md](../../../app/src/spaces/AGENTS.md), "Projects".
  - The files:  its compiled code, its scope pack, its declarations and its words, in every language.

    ```text
    <Project>.spell.js  .spell.tsx  .spell.py  .elements.spell.js  .scopes.js
    <Project>.declarations.json5  .en.js  .es.js  .py.en.json5
    ```

    - Its declarations and words were committed beside the source until epic `elemental-spell` P4:
      every compile rewrote them, so test and README runs left changed files in every checkout.
  - Committed beside the source:  only code others import or edit.

    ```text
    <Project>.lib.ts  .app.py
    ```

  - Every reader asks for a file by project and name, as for any file.
    - ONE mapping decides where it is on disk:  the server's `serverPath`.
    - It's `isBuiltFile()` and `buildFolderFor()`, in spaces' [project-utils.ts](../../../app/src/spaces/server/node/projects/project-utils.ts).
  - A project anywhere else keeps them beside its source:
    a temp `@local/<folder>` group, a VS Code workspace elsewhere.
  - Built when needed, so a fresh checkout or worktree needs nothing run by hand:
    - the page server, as it starts:  the built-in projects that are out of date, in the background
      - `@spell/examples` and `@spell/library`
      - `spell compile --stale --all @spell/examples @spell/library`
    - spaces' routes:  a request for a built file that isn't there compiles its project first, then serves it
      - e.g. `/spaces/<project>/<project>.spell.js`, `.scopes.js`, `.declarations.json5` ...
      - one compile per project at a time, a request waits at most a minute
    - Both are `ProjectBuild`, in the editor's server ([ProjectBuild.ts](../../../app/src/spaces/server/node/routes/ProjectBuild.ts)),
      running the checkout's own `spell compile` as a child.
    - The `spell` command:  a project it parses compiles first each import with no `.spell.js` or declarations
      (`CliSession.compileImports()`).
    - By hand:  `spell compile --all <root>`.
    - Add `--stale` for only what's out of date (`CLI.staleBecause()`).
      Out of date means something is newer than its build, or a built file is missing:
      - one of the project's files, or its project file
      - an import's declarations
      - spell's compiler
  - Renaming a project deletes its build folder, and duplicating one doesn't copy it:
    its files are named for the old project, so the next compile writes the new one's (`renameApp()`, `duplicateApp()`).
    Deleting a project deletes it too.
  - A Python program's web app names its program's folder inside the checkout's `build/` (epic `people-and-orgs` J33).
    - The app:  `<Project>.app.py`
    - The folder:  the project index's `buildFolder`, e.g. `spaces/@spell/examples/solitaire`
      - It's what `PY.QuartAppSpec.outputs` holds.
    - `spell_quart.built_folder()` finds that checkout's.
- [`SpellProject`](SpellProject.ts):  files in its project file's order, e.g. Card → Deck → Pile → Solitaire.
- `SpellProject` and each `SpellFile` load over HTTP, with `$fetch()`.
  Their URLs come from ONE function, [SpellUrls](SpellUrls.ts) (`SP.SpellUrls`):
  - a file is READ at `/spaces/<project>/<file>`, e.g. `/spaces/@spell/examples/solitaire/Card.spell`
  - and SAVED by `POST /api/projects/file/<project>/<file>`
  - a project's index:  `/api/projects/index/<project>`
  - a group's projects:  `/api/projects/list/<group>`, e.g. `/api/projects/list/owen@spell`
  - What spell builds is read as a file too:  the server finds a built one in the build folder.
    - e.g. `/spaces/@spell/examples/solitaire/solitaire.spell.js`
    - and its `.scopes.js`, `.declarations.json5`, `.en.js`
  - Where the project ends:  its group's address, then ONE part (`SpellUrls.split()`).
    The file follows, its name with a dot (decision Q41).
    - each part is encoded and decoded on its own, never the whole address
    - every URL starts `/spaces/` or `/api/`, and is written whole, never relative
  - They go through `LoadableFile.fetch`.
    A node host swaps that for spaces' disk reader, to answer the same URLs from disk:
    [`diskFetch()`](../../../app/src/spaces/server/node/projects/disk-fetch.ts), by `installDiskFetch()`.
- A project's FILE create, copy, rename and delete are spaces', not `SpellProject`'s (decision Q20):
  `SPACES.ProjectFiles`, which the editor calls.
  - `SpellProject` reads, compiles and saves.
  - A group's list, and its projects' create, copy, rename and delete:  `SPACES.SpellProjectRoot`.
- Each project parse or compile builds a FRESH `ProjectScope`, with `parser.clone()`.
  - The clone has empty own rules, and imports the base spell parser.
  - Every file gets a `FileScope` under it, and SHARES that parser.
- So one file's types, constants and rules are visible to every later file.
- A FILE's name says its language (epic `spanish` P19):  `Carta.es.spell` is Spanish, a plain `Card.spell` English.
  - `SP.Language.forFile()`;  `SpellFile.language`, `SpellProject.languages`.
  - One project may mix them:
    - Its root:  `SP.Language.rootScopeFor(languages)`.
      One language:  that language's own root, so its project parses as it always has.
      Several:  a root of their own, its built-in types' members in each one's words (`length` and `largo`).
    - Its project parser is its first language's.
      A file in another parses with that parser's TWIN in its language, `SpellParser.twinFor()`, set on its `FileScope`:
      - the language's own rules, plus a copy of every rule the project's layers added (imports', then its own)
      - every rule one twin adds, the others add too (`SpellParser.addOwnRule()`), into the same journal
      - so a Spanish file calls a method an English file defines by its English words, and the other way round
    - Types, variables and methods live in the scopes, as ever:  every file sees every other's.
    - `P.IncrementalProject` takes each file's parser, and stubs each file's declarations by it.
  - The program speaks ONE language to the person running it (its runtime messages):
    its app's file's, else its first file's (`SpellDeclarations.speakingFirst()`).
  - A words file per language (`<Project>.en.js`, `<Project>.es.js`), each with the members its own files declare
    (`SP.SpellWords.of(declarations, writer, lang)`), the declarations naming them all (`languages`).
    A runner reads them as one.
- Another project can come in WITHOUT its sources, as its declarations (`SP.SpellDeclarations`).
  - They're in `<Project>.declarations.json5` (epic `output-targets` P5), in its build folder (epic `elemental-spell` P4).
  - Before that they were inline in the compiled JS, and `fromComments()` still reads those.
  - While compiling, `Block.getAST()` puts a MARKER right on each declaring statement's code.
    - It's a `/*! SPELL: DECLARES {...} */` comment.
    - It goes below any docstring.
    - For a class member, it's indented in its class's body (`commentFor()`).
    - It's ONE flat JS object literal, 3-8 lines, merging the scope records it added (`declarationFor()`):
      e.g. `{ property: "suit", classVariable: "Suits", of: "Card", enumeration: [...] }`.
  - `SpellProject`'s "Combining output" `split()`s the markers back OUT.
    - The compiled JS is just code.
    - Each marker's object goes in the declarations, with `codeLines`:
      the line (from 0) its statement's code starts on.
    - A file's own `compiled`, and the language server's, strip them (`stripComments()`).
    - `rule` is the `importableAs` of the class its rule was `specialize()`d from.
      - What that took sits beside it, e.g. `output`.
      - Loading passes the whole object to `specialize()`, which picks out its own.
      - Loading SKIPS `rule: "enumeration"`, which a compiler from before P6 of precedence-and-types
        wrote for each enumeration (`LEGACY_ENUMERATION_RULE`):  no version bump (epic page D37).
    - An auto-declared property's marker (`auto: true`) sits on its declaration at its file's top, NOT on its `set`.
      See "Compile".
    - It leaves out what loading works out, e.g. an enumeration's constants, or a rule's owner (`of`, else `output`).
    - `defined: "/Card.spell:222-283"`:  where the statement is, as its character offsets, project-relative.
    - NO source line numbers.
      - A page with no sources matches the code to a scope pack's entry by what it declares,
        e.g. `property: "suit", of: "Card"` for `.../type:Card/property:suit`.
      - It finds the code by `codeLines`:  see `ScopesSource`, in [lsp's source](../../../app/src/lsp/).
    - `kind` + `name`:  what its rule's `getDeclaration()` says, for editors.
      - e.g. `name: "draw (a card)"`
      - Unless a key already says, e.g. `type`.
    - `group`:  the group of its template's members a member is under (epic `debut` P26).
      - `Block.getAST()` hands each line the last group opened above it in its block:
        a `- group "rank"`, or a heading, `## turning it over`.
      - Its first member's says its description too, `groupDescription: "Ace is low"`:
        the comment on the group's line, else the comment lines just above it.
      - The group's own line has no marker:  it would leave a line behind in the compiled code.
      - The words file lists each type's members by group from them (`SP.SpellWords.groupsOf()`):
        the Inspector's bands.
    - only what's known:
      - a method's `params` and `returns`
        - e.g. `params: [{ name: "pile", datatype: "Pile" }]`
      - a list type's `itemType`
      - an owner member's `exclusive`
      - Loading rebuilds the `P.ScopeMethod` record.
        A key an older compiler didn't write loads as unknown.
    - NOT whether a property is DERIVED (`the short rank of a card is: ...`) or stored:
      each writer names every member the same way, so an importer needn't know (Q56).
      - javascript and TypeScript:  camelCase
      - Python:  snake_case
  - The declarations also hold the project's versions, and what it `provides`.
  - `read(json)` reads them back, never running anything.
  - `importScope(root, imports)` => a `P.ImportScope` holding them.
    - The project's scope goes UNDER it, with a clone of its parser.
    - So imports are a base layer the `journal` never records.
    - Its records have no `declaredBy`.
      Editors read these instead:
      - `declaredAt` on its types, variables and constants:  a `P.DeclaredAt`
        - full file path + offsets, from `defined`
      - `declared` on its rules:
        - owner, what `getDeclaration()` said, and `declaredAt`
  - `SpellProject.projectImports`:  the entries of `imports` that name a project.
    They're in its project file.
    - e.g. `@spell/library/people` ~== `@spell/library/people`
    - Its "Loading" task reads each one's `<Project>.declarations.json5`.
      - That's `SpellProject.declarationsOf()`.
      - It then builds the `ImportScope` our scope goes under.
    - `source: true` instead parses that project's `.spell` files ahead of ours.
      See `sourceImportFiles`.
  - `import: ["Card:Playingcard", "*"]` loads `Card` as `Playingcard`.
    - That's `SpellDeclarations.picked()` / `renamed()`.
    - Every loaded record naming it says `Playingcard`.
      - in `type`, `superType`, `of`, `datatype`
    - Rules built from them follow, e.g. `playingcard suits`.
    - Compiled JS imports `Card as Playingcard`.
    - Its `TypeScope` keeps `runtimeName: "Card"`.
      - Runtime type checks compile to that (`ASTTypeExpression.runtimeName`):
        the class is still `Card` when the code runs.
    - Types only, and compiled imports only.
  - After parsing, a type the project declares AND imports is a `parseError` (`checkImportClashes()`).
    - `create_type` declares an imported type again, just so it's seen.
    - Rule names may repeat:  they merge.
- Compiled spell uses NO globals:  it `import`s what it didn't declare (`SpellProject.importHeader()`).
  - `import { core, Thing, List, App } from "@spell/core"` (`SC.SPELL_CORE_MODULE`)
  - `import { Card, Deck } from "@spell/project/<projectId>"`, for each compiled import (`ImportScope.modules`)
  - and it exports what it declares:
    - types:  `export class`
    - top-level functions:  `export function`
    - top-level vars:  `export let`
  - see "Classes" under Compile, for what goes in a class's body
  - NO import map:  every runner (the app, VS Code's, `<spell-viewer>`) runs compiled code from a `blob:` URL.
    - Its specifiers are rewritten (`runCompiled()` / `linkModule()`, in [the app's runner](../../../app/src/app/runner/)):
      - `@spell/core` => the runtime it runs on (`spellRuntime.ts`)
      - `@spell/project/<projectId>` => that project's compiled JS, fetched and linked the same way, afresh each run
    - The app, parser and forms NEVER load `core` themselves.
- ALL files parse first, then ALL compile, so lazy compile-time lookups see the whole project.
- The editor's code editor calls `project.takeText(file, text)` on every keystroke, and parses once the typing pauses
  (`project.parseWaitingText()`, 200 msec after the last key:
  `FileStates`, in [the app's CodeMirror folder](../../../app/src/app/ui/codemirror/)).
  - So no keystroke waits on a parse:  a parse of Solitaire's game took 50 msec a key (2026-11-12).
  - What needs the new parse sooner asks for it:  the language features, a click or focus elsewhere, `compile()`, `parse()`.
  - Everything else calls `project.updateText(file, text)`, which takes the text and parses it at once
    (`onInputChanged`, in [the app's editor](../../../app/src/app/editor.ts);  the language server).
  - Either way it calls `updatedContentsFor(file)`.
  - `project.incremental.update()` re-parses what changed, and hands changed files their new match.
  - If that couldn't cope, it parses from scratch straight away.
  - After 2s:  it compiles, saves `<Project>.spell.js` and runs it.
- A crash while parsing (a rule threw, NOT an error in the spell) is left in `project.parseError`.
- `SpellProject`'s parse task list keeps its scope + `incremental` while they're good.
  See `needsFullParse`.
  - Else it starts over:  a new project scope, and `parseImports()` builds a new `IncrementalProject`.

## Incremental parsing

- [`P.IncrementalProject`](../parser/IncrementalProject.ts):  a project's spell files, in order,
  sharing ONE project scope + parser.
  - `update(path, text)` => the files whose match changed.
  - `SpellProject` owns it.
- `P.ParseJournal` (`parser.journal`):  every change parsing makes to shared state, undoable + redoable.
  - recorded by:
    - `ScopeList.add()` / `.replace()`, which swap in a NEW items array
    - `Parser.addRule()`, for `#ownRules`
    - `P.ParseJournal.assign()`, for fields set on a record that's there already (a type's `claim()`, a method's `returns`)
    - a few of their own:  a type's names ahead (`declarePropertyAhead()`), the names its things are given
  - `mark()` a point
  - `rewindTo(mark)` undoes everything after it
  - `replay()` puts it back, marks included
  - Each change is an OPERATION, redone onto the state as it is THEN (epic `language` P59):
    - a record added to a list goes on the end of the list's items as they are now;  a rule merges into the rules there now
    - an `assign()` sets its fields again, whatever's there
    - So after an earlier file parsed again, a later file's changes go back onto the earlier file's NEW records.
      Before, a redo swapped back whole lists:  the earlier file's OLD records with them.
  - And says what it changed (`P.JournalChange.change`):  a list and its records, a record and its fields, a rule,
    a note on a type.  So two parses of a file can be compared (`P.ParseDiff`, below).
  - only state existing AT the mark needs recording:  anything newer is re-parsed, or replayed back the same
- [`P.IncrementalParse`](../parser/IncrementalParse.ts), one per file:
  - It parses TOP-LEVEL items one by one (`parser.parseItem()`), with a journal mark before each.
    - An item match covers a line, or a header line + its indented body:
      a `line` match's `tokens` === `[LineToken, BlockToken]`.
  - `update(text)` diffs old vs new top-level items (source text + indent), then:
    - ONE item's indented body changed => `"body"`:
      - rewind to `parser.getBodyMark()`, which `commitStatement()` took just before the body parsed
      - `SpellParser.reparseBody()` => `BlockLine.reparseBody()`
      - then replay every later entry:  later items + files are kept
      - Kept tokens after it are moved (`Tokenizer.moveTokens()`).
      - Only if:
        - nothing in the old or new body `changesGlobalScope()`
        - the body's nested scope isn't the header's
        - its statement's `mutateScopeFromBody()` records the same as before, in `data.fromBody`
          - e.g. the method still returns a `number`:  later lines may read it
      - First, deeper (epic `language` P58):  the innermost body that changed INSIDE it, when only one did
        (`SpellParser.reparseInnerBody()` => `BlockLine.reparseInnerBody()`).
        - e.g. one action's steps, in a type's outline:  the type, its other members, later items and files are kept.
          Before, a type's body declares its members, so an edit to any step in it re-parsed every file after it.
        - It goes down one body at a time, while only one body under it changed and the text around it is the same.
        - A body it goes through:  read as a plain block, recording nothing once parsed (`mutateScopeFromBody()`),
          no line reading what's under it (`readsBelow`) or joined (`JoinedLines`):  a type's outline, an event's steps.
        - The body it re-parses:  the deepest one `reparseBody()` will take, under its same rules.
          The steps of an `if` share their action's scope, so the action's.
        - Rewinds to that body's `bodyMark`, and replays from its `bodyEndMark`:  the mark `commitStatement()` takes
          after the body and its `mutateScopeFromBody()`.
        - Each body around it is built again from its kept lines (`Block.assembleBlock()`), its statement a clone
          that keeps the old one's nested scope.
      - A re-bodied statement is a clone (`Match.clone()`):  the old one's `replacedBy` is the clone.
        - Scope records still name the statement first parsed (`declaredBy`):
          what reads its BODY reads `declaredBy.current`, e.g. whether a method waits (`waits: true` in its declaration),
          an action's title, a getter's reads.
        - That was the incremental parse losing an action's `waits: true` after an edit inside it.
    - anything else:  rewind to the item holding the first change, and re-parse from there.
      - Or to the one BEFORE it, if the change starts with an indented block that item may now take.
      - Once back in step with the unchanged items at the end, `canKeepFrom()`:
        - no `"global"` changes in the old or new region, AND the same file-variable names after it
          (each item records them) => `"region"`
          - replay everything after, later files too, and move its tokens
        - else => `"rewound"`:  re-parse the rest of the file
          - That took back every LATER file too:  `IncrementalProject` keeps each one whose lookups find the same,
            and re-parses the rest ("Keeping later files", below).
  - `keepLastGood`:  opt-in, and `SpellProject` turns it on.
    - Each item that ISN'T broken records its journal entries as `lastGood`.
      - Broken (`parser.isBrokenItem()`):  didn't parse, or has parse errors.
    - Editing one item into a BROKEN state (same number of root tokens) undoes what it changed,
      and replays its `lastGood` instead.
      - So later lines still see e.g. the method it declared.
      - Its broken match stays, so its error shows.
    - `canKeepFrom()` then keeps everything after it:  same `lastGood` => same changes.
    - Deliberately NOT what a full parse gives.
    - NOTE: a header broken so badly it no longer takes its indented body changes size => not kept.
  - The file match is rebuilt with `parser.assembleFile()` => `Block.assembleBlock()`.
- `rule.getScopeChanges(match)`:  the rule's `@proto static changesScope`, if set.
  - Else, with no `mutateScope()`:  `undefined`.
  - Else `"global"`:  it has one, so assume the worst.
  - `get` says `"internal"`.
    Its `it` goes in its own `match.scope`.
  - A rule may say PER MATCH, reading only `match.data`.
    - `assignment` is `"internal"` (a variable), unless it auto-declared a property.
      Then it's `"global"` (`data.autoDeclared`).
    - So a plain `set x to 1` stays cheap.
    - A line that may declare a bare word as a value (`its rank should be queen`, `red if ...`, `return black
      otherwise`) is `"global"` only when it did:  the word was new (`SpellConstant.valueScopeChanges()`).
      A word the project knew already, e.g. one of a card's ranks, changes nothing.
    - `if` is `"global"` only when its condition's subject took an `it` name (`data.subjectIt`).
- Keeping later files (epic `language` P59):  when a file parses again from part way, or whole, each file after it
  is KEPT if what it looked up finds the same, else it parses again.
  - Each file's `P.Outline`:  what its parse looked up, noted as it parses (`P.ScopeList.outline`):
    - each list it asked for a key (`ScopeList.get()`), at each list the lookup falls through to, and what it found
    - a test, when it looked through every item for some (`ScopeList.scan(test)`, `ScopeList.some(test)`):
      a property listing a word, a member with a stop word in its name, a type with a property
    - a note it asked of a type:  a name ahead (`knowsPropertyAhead()`), a name given (`NewThing.namesGiven()`)
    - `get()` with no key notes every item:  any change to the list re-parses it.
  - `P.ParseDiff`:  what the files that parsed again changed, their journal entries then against now:
    - a record in a list is the same as the one in its place, by key, if it holds the same
      (its fields, written out:  a match is just "a match", another record of the same parse its key)
    - a field set on a record that outlives the parse (a type's `claim()`), by its last value
    - a rule, by its class and what it was made with;  a note, by its value
    - unknown entries (no `change`):  nothing is kept
  - A file is kept when (`P.ParseDiff.keepPlan()`):
    - no key it looked up changed, no test of its passes a record that changed, no record it found changed
    - a rule that changed can't match it:  a sequence one of whose required words its text doesn't have
      (`P.Sequence.requiredWords`), e.g. a new phrase
      - NOT a new question or action:  it's a method added, so every file parses again (`changesMethods()`, above;
        a question since it's read ahead, epic `language` I154)
    - none of its entries sets fields on a record a file that parsed again set too
    - nothing under its lines points at a record or match that's gone, with none in its place
  - Kept:  each field under its lines pointing at an old record points at its new one, then its entries are put back.
  - Not kept:  it parses again, and what IT changed counts for the files after it.
  - A file that declares something else (`changesProperties()`, types, type lines;  not methods, above) goes
    through it too (`reparseDeclaring()`):
    - rewinds to before the stubs, puts back every other file's stubs as they were (`stubMarks`, a run per kind
      and file), stubs that file again from its new text, then keeps or re-parses each file in order
    - its type stubs are the same records again where they say the same (`stubDeclaredTypes()`'s `reuse`):
      what later lines point at stays
    - not when its types are another file's too:  only the first file's stub stands, so it parses everything again
- If an `update()` throws (a rule crashed committing a line), `IncrementalProject.isBroken`:
  the next update re-parses every file from scratch.
- Cost, Solitaire, against a full parse of ~110ms (a smaller grammar, a quieter machine:  a warm parse today, "Rules and matching"):
  - body edit:  ~10ms
    - a step in a type's outline, its first file's (Card.spell, epic `language` P58):  ~5-11ms, was ~165-230ms,
      every file after it parsed again
  - comment, blank line or top-level statement, anywhere:  ~1-2ms
  - declaration edit near the END:  ~1ms
  - declaration edit near the START of the first file:  ~110ms (~= a full parse)
  - a member or a kind added, in Card.spell (epic `language` P59):  ~45-75ms, was ~250-410ms:
    Card.spell parses again whole, the files after it kept
    - a file reading a measure or a `pause for` looks through the types only for dimensions (`dimensionsIn()`):
      a new kind with no units keeps it
    - a member renamed that no later file reads (`picture`):  the same;  one they read (`short name`, `rank`):
      those files parse again too
    - in Pile.spell or Deck.spell:  ~30-75ms, was ~160-570ms (a busy machine, best of 3)
- spell-app's [IncrementalProject.test.ts](../../../app/tests/spell/parserTests/IncrementalProject.test.ts) edits lines of every Solitaire
  file, on ONE project.
  - Over projects written inline:  spell-parser's own [IncrementalProject.test.ts](../../tests/spell/parserTests/IncrementalProject.test.ts).
  - every line, with `INCREMENTAL_FULL=1`
  - After each edit, and after undoing it, it checks output, errors and token positions against a full parse.
- spell-app's [IncrementalEdits.test.ts](../../../app/tests/spell/parserTests/IncrementalEdits.test.ts) does every example
  and library project, against its imports (epic `language` P58).
  - In each file:  a step changed and one added deep in a body, a member renamed, added and removed, a new kind,
    a new phrase, each then undone.
  - It checks each file's output, errors and warnings, and the whole project's code for every target.
  - Each project's first file;  every file with `INCREMENTAL_FULL=1`.
- spell-app's [ParseJournal.test.ts](../../../app/tests/spell/parserTests/ParseJournal.test.ts) checks a whole project's rewind / replay.

## Compile

- `Match.compile()` => `match.AST?.compile()`.
  - `Match.AST` is memoized;  `ASTNode.compile()` is not.
- The AST classes hold what was parsed;  a WRITER writes them out ([the writers](../parser/writers/)).
  - Each TARGET a project compiles to has its own writer ([targets.ts](targets.ts), `SP.TARGETS`):
    - `js/solid`, by `P.JSWriter`:  ALWAYS compiled, as it's what runs
    - `ts/solid`, by `P.TSWriter`:  checked by `tsc`
    - `py`, by `PY.PyWriter`:  Python on asyncio, checked by pyright
      - with a words file of its own, by Python's names:  `<Project>.py.en.json5`
    - `ts/lib`, by `P.LibraryWriter` (epic `people-and-orgs` P3):
      a LIBRARY, the project's classes alone, for other code to import
      - one TypeScript file, `<Project>.lib.ts`, its own types, checked by `tsc`
      - no drawing, none of its top-level steps, the core with no Solid (`spell/parser/core/model`)
  - Each writes a file of its own, e.g. `Solitaire.spell.py`:  see each target's `suffix`.
  - A project lists the others it wants in its project file, e.g. `"targets": ["ts/solid", "py"]`.
  - What every program's writer shares is `P.ProgramWriter`, which the javascript and Python writers extend.
    - `forProject()` reads the whole project first, so it knows what each value is.
  - A project's files are written TOGETHER, once a target (`SP.SpellProject.combineCompiled()`).
    - A file's code on its own (`SP.SpellFile.compiled`, the editor's output pane) is written only when it's read,
      never by every compile (epic `language` P57).
  - `ASTNode.compile()` is `P.JSWriter.instance.write(node)`.
  - Each writer has one method per AST class, named for it:  `ASTIfStatement(node)`.
  - NEVER write output in an AST class.
- Each javascript-family target (`js/solid`, `ts/solid`, `ts/lib`) gets a SOURCE MAP (epic `elemental-spell` P14):
  `<Project>.spell.js.map` in the build folder, beside its code, which ends `//# sourceMappingURL=<file>.map`.
  - Made as the code is written:  inside `P.SourceMarks.during()`, `P.Writer.write()` puts an inline mark at the end
    of each statement's first code line (`SP.SpellProject.sourcePlaceOf()`:  its file, line and column).
  - `SpellDeclarations.split()` and the writer's `module()` run with the marks in;
    `extract()` takes them out again, so the code is EXACTLY what it is with no map,
    and each marked line becomes a mapping.
    spell-app's `sourceMaps.test.ts` checks that for every fixture, both targets.
  - A writer that lays a line out by its length measures it without marks (`P.SourceMarks.widthOf()`).
  - The map names each file by its name in the project (`Card.spell`) and carries its text (`sourcesContent`).
  - Code run from somewhere the map file can't be reached (the editor's `blob:` URL, `spell run`'s temp file)
    carries it inline:  `P.SourceMarks.inline()`.
  - A `.spell` file's positions are its own (Q69), so its map points at its `.spell` lines.
  - What's drawn and made has marks too (epic `editor` P7):  each drawn tag and each `a new card`, its place
    (`SP.SpellProject.partPlaceOf()`) listed in the map's `x_spellPlaces`.
    - The code stays EXACTLY the same.
    - The editor stamps them into the copy it runs (`P.SourceMarks.stamped()`), so a part of the running app says
      where it's written:  `data-spell-at="Card.spell:12:4"` on an element, `Symbol.for("spell.madeAt")` on a thing.
    - All of a list's rows point at their one tag, and all of a loop's things at their one statement.
  - Where each declaration is written goes in the map too (epic `editor` P23), as `x_spellDeclarations`:
    every type, property, method, event and ability, its file, lines and type (`SP.SpellDeclarationPlaces`).
    - Read from the parse:  a statement's rule says what it declares (`getDeclaration()`, or `isAbility`), the scope its
      body opens says which type it's about.
    - The editor's side bar reads them, so it finds every event and action by its declaration, never its words.
    - Each type lists the project's other types it names (`uses`):  its supertype, its items', its members' types.
  - Read back by `P.SourceMapLines` (epic `editor`):  which source line a compiled line came from, and the reverse,
    by statement, so an editor's panes can follow each other.
  - A compile writes no map for the Python target.
    `SP.SpellProject.codeWithMapFor()` makes one on asking, for any target, Python's too:  its writer takes the same marks.
- A file's classes come before its running code (P15):  `SP.hoistClassDeclarations()`, from `Block.getAST()`.
  - So a line can make a thing of a type declared further down:
    `set the stock to a new stock pile` above `a stock pile is a pile`.
  - Only a class declared below the file's first running code moves, up above it, keeping its order.
  - Banners, headings' calls and the code under them stay where they are.
  - A patch onto another file's class doesn't count as running code.
  - A one-of-a-kind app IS running code (P21, `create_one_of_a_kind`), e.g. `solitaire is an app where:`.
- What a project makes as it loads has its classes before it, whichever file each is in (epic `data` I59):
  `SP.hoistClassesMadeAsItLoads()`, from `SP.SpellProject.combineCompiled()`.
  - So an app can make a thing of a type in a file listed after it:  `- its "library" is a new open library page`.
  - Only a class that's made then, by a top-level `new` or by what making one makes, and declared later, moves:
    every other program compiles as it did.
    Its line compiles to its class, then `export const solitaire = new Solitaire()`.
    - So every class declared below it moves above it, and its properties' starting values can make them.
    - Its variable is of kind `only` (`P.ScopeVariable.kind`), in the project's scope (epic `data` I44).
      So a call of its body's methods with no receiver works anywhere, on it:  `DynamicMethodRule.theOnlyOne()`.
- Every file sets itself up before any file's steps run (epic `mockup`):
  `SP.runningCodeLast()`, from `SP.SpellProject.combineCompiled()`.
  - So the order a project file lists its files in never changes what the program does.
    FizzBuzz's `play fizzbuzz`, in the file listed first, sends its events once `Console.spell` listens
    and `Explainer.spell`'s page is made, though both are listed after it.
    (A person reorders a project's files by dragging the editor's tabs, which rewrites its project file.)
  - Each file is cut where its running code starts:  a call of its steps, a `print`, a loop, an `if`, a `trigger`,
    a `set` of a variable, a start.
    Its lines above that set it up:  types, actions, listeners, new variables, the things made as it loads.
  - The program is every file's setting up, in file order, then every file's running code, in file order.
    - Each file's own lines keep their order.
    - Its running code starts with the last heading's call above it again, for the Thing Explorer.
  - When no file after the first running code sets anything up, nothing moves:
    a one-file program, or one whose steps are in its last files, compiles as it did.
  - A line it can't tell is running code counts as setting up, so it runs where it always did.
- A program runs its own tests the first time it loads (P17):
  `SpellProject.combineCompiled()` ends with a call of each `to test ...` method its files declare.
  - e.g. `if (!core.isCarryingOver) testCardSetup()`
  - Never on a hot reload (`core.isCarryingOver`), and not one the program calls at its start already.
  - `spell test` counts those runs, and doesn't run them again.
- A block compiles as its statements joined with `\n`.
  - Nesting indents by re-joining with `\n` + 2 spaces (`P.jsText.INDENT`, NEVER a tab).
    Python's is 4 spaces (`P.pyText.INDENT`).
  - So a statement's output doesn't depend on its depth.
- A DECLARATION's docstring compiles as one `/** ... */`, in place of its `//` lines.
  - See `getDocComments()`, in [Block.ts](rules/Block.ts).
  - Its description is the first line under it, when that's a comment (epic `language` P48):
    `its "state" is`, then `// Its short name`, then its lines.
    - Its body's first line:  `SpellStatement.parseNestedBlock()` marks the body `describes`, and its `getAST()`
      leaves that line out, as it's written above the declaration.
    - Else the first line of a block indented under it that no line took:  a line with its body on it
      (`its "name" is its rank && "of" && its suit`), or one that takes none (`its "hint" is text`, `group "Names"`).
      A block of comments alone under a line with an inline body is its description, never a second body
      (`commitStatement()`).
    - A group's description too (`groupOpenedBy()`), which its first member's declaration carries.
  - Else, as before:  the comment-only lines directly above it, else the comments on its own line
    (one in code spell).  So a file written before still compiles as it did.
  - It goes above the `SPELL: DECLARES` comment:  after any `/* SPELL: added rule ... */` notes the statement makes.
  - A `##` heading is part of it only if DIRECTLY above.
    One followed by a regular comment compiles as a `// ## heading` banner.
  - It's worked out from the block's lines when asked, never stored while parsing:
    an edited comment line re-parses on its own.
  - The language server shows the same docstring on hover and in completion.
- A heading at a FILE's top level also compiles to `core.heading("set up all piles")`, just above its own lines.
  - It's a `P.ASTHeadingInvocation`.
  - Why:  as the program runs, the Thing Explorer knows which heading's code made each thing.
  - NOT in a plain block, e.g. a rule test's.
  - NOT for a heading with no text, e.g. `##########`.
- A line of the program's START, at a FILE's top level, runs only when the program starts afresh
  (epic `drawable-thing` P17):  `if (!core.isCarryingOver) game.start()`.
  - Its lines:
    - calling one of its tests:  `test card setup`
    - starting its app:  `start the game`
    - Each rule says so:  `SpellStatement.startsTheProgram()`.
  - [`Block`](rules/Block.ts) wraps the line's code in a `P.ASTProgramStart`:  an if statement.
  - Why:  when an edit keeps the last run's things, the runner loads the program with its start skipped,
    so its tests don't print again, and the game in progress isn't started again.
  - NOT in a method, nor in a plain block, e.g. a rule test's.
  - A program whose own code never calls `start` needs no such line:  its app or page starts by itself, the one in the
    file named for the project, else the first (`SpellProject.startedByItself()`, epic `editor`).
- Classes compile as a hand-written class would:  each MEMBER in its class's body, wherever it was declared.
  - A member is a `P.ASTClassMember`.
    It knows its class (`typeName`), and compiles two ways:
    - in its class's body (`compileAsMember()`)
      - e.g. `get title() {...}`, `draw() {...}`, `static Suits = [...]`
    - patched on from outside (`compile()`), e.g. `Card.prototype.play = function () {...}`
      - when its class isn't compiled with it:  a rule test compiles the statement alone, or a type imported under
        another name (`Card:Playingcard`)
  - Members a project adds to an IMPORTED type make a class of its own, extending the imported one (epic `language`
    P26), so the library's class is never changed:
    - `export class Card extends CardsCard {...}`, the library's `Card` imported as `CardsCard`
      (`SP.subclassImportedTypes()`, at the top of the first file, then `SP.hoistClassMembers()` as for any class)
    - Its declarations say so (`subclasses`), and an importer of both gets ITS `Card`:  one chain, in import order,
      Solitaire's card extends jokers' card extends the library's.
    - A library's own `a new card`, for a type its project file `exports`:  `new (core.classToMake(Card))()`,
      the running program's card;  the subclass registers when it's defined (`core.registerClass()`).
  - A property is a getter / setter pair over the instance's reactive props (spell cells, `P.ASTReactiveProperty`).
    - `this.getProp("title")` / `this.setProp("title", value)`
    - NEVER a class field:  that would shadow the accessor, and nothing would redraw.
    - What it's checked against, and its default, go in the class's SCHEMA, declared once:
      - in the class:  `static { this.declareProp("title", { type: "text" }) }`
      - from outside:  `Todo.declareProp(...)`
      - a default made per instance:  `{ init: () => new List() }`
      - The same runtime shape as a hand-written class's `@prop({ type: 'text' }) accessor title`.
      - Older output's `setProp(name, value, check)` still runs.
  - `Block.getAST()` makes each declaring line ONE `P.ASTStatementGroup`.
    It holds the docstring, the `SPELL: DECLARES` comment and the code.
    - Then `SP.hoistClassMembers()` moves each member into its class's body, if that's in the block.
    - Comments directly above a member go with it, e.g. a `## properties` banner.
      - They go past a heading's `core.heading()` call, which stays put.
    - Everything else stays put too.
  - A project then does the same across ALL its files (`SpellProject.combineCompiled()`).
    - So `Card.move_to_$pile` from `Pile.spell` ends up in `Card.spell`'s class.
    - So does `compiledFixture()`, spell-app's (`spell/app/spaces/test`).
    - It NEVER mutates an AST:  a class which gets members is a NEW `P.ASTClassDeclaration` (`withMembers()`).
  - An AUTO-declared property (see "Scope:  who changes it") compiles ONCE,
    in the file of the `set` that declared it.
    - It's `Card.declareProp("pile", { type: "Pile" })`, then `Object.defineProperty(Card.prototype, ...)`.
    - at its top, or just after its type's declaration if that's in the same file
      (a class isn't defined above its own line)
    - under that `set`'s `SPELL: DECLARES` comment
      - See `Block.autoDeclarations()`, `autoDeclarationAST()`.
    - a `P.ASTPatchedMember`, NOT a class member, so hoisting never moves it:  it can't change another file's output
    - Why not on the `set` line:  that may be in a method's body, whose AST is memoized.
      - An edit above it which only moves it would leave its `defined` offsets stale.
      - A file's AST is built afresh.

## Language server

- [lsp's source](../../../app/src/lsp/) (`LSP`) runs as `yarn lsp:start`, in spell-app.
  - Or from the VS Code extension, in spell-app's [vscode/](../../../app/vscode/).
  - The extension spawns the repo's own `tsx` on [the server's entry](../../../app/src/lsp/server.ts).
  - `stdioGuard.ts` sends `console.*` to stderr first:  stdout is the protocol.
- It hosts the SAME `SpellProject` / `SpellFile` the app uses, and takes everything from them:
  - `project.spellFiles`, `file.isActive`, `project.parseError`
  - edits go through `project.updateText()`, exactly as the app's editor does
  - All `SpellLanguageService` adds is `LSP.FileAddresses`:  the editor's URI for each file.
- It's used twice:
  - by VS Code, over stdio
  - IN-PROCESS, by the app's CodeMirror editor ([the app's CodeMirror folder](../../../app/src/app/ui/codemirror/))
    - its `FileStates` keep one CodeMirror state per file in step with `file.contents`.
      Edits go through `takeText()`, parsed once the typing pauses (`parseWaitingText()`).
    - its `CodeMirrorLanguage` calls the service, and converts its answers with `LspToCodeMirror`
  - The app shows one project at a time.
    `<spell-editor>`s on a page show one each:
    each `use()`s its project's states (`SpellCodeMirror.states`), so another's don't replace them.
- `SpellDiskWorkspace` is the stdio server's:
  - it loads from disk, via `LoadableFile.fetch` (above)
  - it maps a `.spell` file to its project (the nearest `project.json`)
  - it parses the project on first sight, and reacts to disk changes
  - It's node-only, so it's NOT in the `spell/app/lsp` barrel, which MUST stay browser-safe
    ([barrel.test.ts](../../../app/tests/lsp/barrel.test.ts)).
- `SpellLanguageService` answers from each file's current `match`, never re-parsing:
  - diagnostics:  its parse errors, then its warnings (`SP.SpellWarnings.in()`) as `DiagnosticSeverity.Warning`
  - positions from match / token OFFSETS, never `token.line` / `ch`:
    `P.positionForOffset()` and `P.offsetForPosition()`, in [tokenizer.types.ts](../parser/tokenizer/tokenizer.types.ts)
  - what a rule can start with (completion's words and kinds), and every rule inside one (the keyword list),
    by the parser's two walks:  `P.leadingRules()` and `rule.childRules`, in [ruleWalks.ts](../parser/rules/ruleWalks.ts)
  - symbols from `rule.getDeclaration()`, colours from `rule.highlightAs`
  - definition / references from the scope record a word resolved to while parsing (`data.scopeVar` etc),
    and that record's `declaredBy`
    - method calls from `ScopeRule.instances`
    - properties from their type's `variables` (`TypeScope.getMember()`), else by name
  - hover says what a variable holds, its `datatype`, e.g. `variable **card**: Card · argument`
    - a member by its words as written (`ScopeVariable.asWritten`), e.g. `property **short rank** of Card`
  - completion offers properties where a member's words can come, e.g. after `the `:  every visible type's, as written
    - the Type Explorer lists them so too:
      `ScopeEntry.name`, when it differs from the path's name (as compiled)
  - a built-in type's member:  its docs from `SP.BUILT_IN_TYPE_TABLE` (its record's `docstring`),
    in hover and completion (see "Built-in types")
    - hovering a built-in rule shows the member it spells
    - the Type Explorer's built-in types come from the table too (`ScopeExplorer.addBuiltIns()`)
- A type's `<css>` blocks are CSS, not spell ([SpellCSS.ts](../../../app/src/lsp/SpellCSS.ts)):
  - found in the text, line by line:  `<css>` alone on a line opens one, `</css>` closes it
  - completion, hover and errors inside one come from VS Code's own CSS service, `vscode-css-languageservice`
    - each block is checked as a CSS document of the whole file, everything else blanked to spaces,
      so lines and characters match
  - spell's rule for it is `css_block`, in [CSSBlock.ts](rules/classes/CSSBlock.ts)
    - only in a view type's outline
    - compiled to the class's `static css`
    - The tokenizer reads a `<css>` element's contents as raw text (`P.Tokenizer.rawTextTags`),
      so the CSS is never read as spell.
  - spell's own colouring skips the block
  - editors colour it as CSS themselves:
    VS Code through the grammar's embedded CSS;  the app's CodeMirror editor not yet
- A `<json>` element's text is JSON, not spell:  read as raw text too (`rawTextTags`), so its `{` and `[` stay as written.
- A `<markdown>` block is markdown, not spell:  read as raw text too (`rawTextTags`), its common indent taken off.
  - in a drawing:  [`markdown_block`](rules/JSX/MarkdownBlock.ts)
    - drawn by Spell UI's `<ui-markdown>`, the markdown as its text
    - a `{hole}` is a spell expression, live
    - code in the markdown keeps its braces, and `\{` is a brace
    - a hole that doesn't read is a parse error, reported as JSX's are (`SpellJSX.parseErrorsIn()`)
  - in a type's outline:  [`markdown_description`](rules/classes/MarkdownDescription.ts), the type's description
    - compiled to the class's `static description`
    - hover and the Type Explorer show it when the type has no comment docstring (`SpellLanguageService.docsOf()`)
  - a page's STORIES, `<stories>` in its outline (epic `mockup` P6):  `markdown_description` too, compiled to `static stories`
    - what the page must let people do, one `<story "S1" done>` tag each (epic `mockup` P17):  anything else in the
      block is refused;  nothing draws them
    - Spanish writes it `<historias>`
    - two raw-text blocks on consecutive lines are read as one fragment, which no rule takes:  a blank line between
      a `<stories>` and a `<markdown>` keeps them apart
  - in a `<spell-viewer>` layout:  the app's `LayoutSpell`
    - it splits holes as `markdown_block` does
  - no diagnostics inside
  - editors colour it as markdown themselves:
    VS Code through the grammar's embedded markdown;  the app's CodeMirror editor not yet
- Formatting is `P.TokenFormatter` ([the tokenizer folder](../parser/tokenizer/)):
  whitespace only, from the tokens, indenting with TABS always.
  - No pretty-printer:  the AST is a javascript tree.
  - Indent LEVELS come from indent widths, not the tokenizer's blocks (which nest one per whitespace character).
  - It re-tokenizes its result, and gives up if anything but whitespace changed.
  - NOTE: a blank line takes the indent of the line AFTER it, unless it has its own.
    So dropping the tab on a blank line can move that blank line in the compiled javascript, never the code.
- Completion mid-statement is `expectedNext()`:
  the line up to the cursor, through `parser.expectedAfter()` (see "Rules and matching").
  - Each expectation offers:
    - the rest of a method call, as a snippet
    - the names that fit it:  by the `highlightAs` of the rules it can start with (`firstKinds()`), never rule names
    - its words
  - What only `continues` something complete, e.g. operators:  only when the word being typed starts it.
- A method's parameters come from its `P.ScopeMethod` record,
  never from parens in its name, which a paren-free signature hasn't got.
  - `SpellLanguageService.slotNames()`:  the receiver by its type, the rest by `params`
  - signature help's parameter ranges are where its `method_signature` found each argument (`data.argMatches`)
- Signature help is `signatureHelp()`, from the same parse.
  - It shows the INNERMOST call to one of the project's methods that anything was waiting in (next, or `within`).
  - Its arguments are its call rule's `{subrules}`.
  - The active one is counted from where it was waiting.
- Quick fix (`codeActions()`):  words that didn't parse get "Define `to <phrase>`".
  - The phrase:  a whole line, or a statement that parsed (an inline body's too) PLUS the words left over after it:
    `shuffle the deck 3 times`.
  - Its words become a signature:
    - each longest run that parses as an expression is a parameter
    - a type's name, paren-free:  `to shuffle a deck (number) times`
  - It's inserted above its top-level statement, as a method is only visible AFTER it.
  - Once defined, the longest match wins, so the line parses as the new method.
  - NOT for a phrase that's just unfinished (`expectedAfter()` again):  `set x to`.
- No code lenses (Owen, 2026-10-13:  "turn off codelens entirely"):  the "N references" line above each type and
  method is gone, from VS Code and the app alike;  Find All References and Peek References still work.
- Semantic tokens come as DELTAS too (`semanticTokensDelta()`), from one kept `SemanticTokensBuilder` per file.
  - NOTE: a builder keeps what was pushed until `previousResult()` starts afresh.  `build()` doesn't.

## Testing a whole project

- Helpers parse + compile a project headlessly, exactly as `SpellProject` does:
  - [`parseSpellProject()`](test/parseSpellProject.ts), a project written in the test
  - `summarize()`:  the "same as a full parse" reference
  - spell-app's `loadFixtureProject()` (`spell/app/spaces/test`):  a frozen test project's files
- spell-app's [SpellProject.test.ts](../../../app/tests/spell/SpellProject.test.ts) snapshots Solitaire's compiled output + errors,
  and benchmarks with `BENCH=1`.
- Every fixture project compiles to every target it can, against the snapshots beside it, in spell-app:
  the "Projects live in spaces" bullet in [AGENTS.md](AGENTS.md) lists them, and how to refresh them.
