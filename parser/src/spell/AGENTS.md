# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Codex, and others)
when working with code in this folder, `src/spell/` of the `spell-parser` package (`spell-parser/spell`).
- Code imports it as `spell-parser/spell`;  its namespace is `SP`.

**READ the repo root's `AGENTS.md` and [WWOD](../../agents/wwod/WWOD.md) FIRST:**
- the root's:  the repo's layout
- WWOD:  the house style every package shares
- Only what's local is below.
  A section named like a WWOD rule extends it.

## Overview

- This folder is the spell LANGUAGE, on the generic parser.
  It (namespace `SP`) holds:
  - spell's rules
  - `SpellParser`, `SpellProject` and friends
- The pieces around it are folders of their own, beside this one or in another repo:
  - [parser](../parser/AGENTS.md), `spell-parser/parser` (`P`):  the generic rule-based parser.
    [PARSING.md](PARSING.md), here, maps its pipeline.
  - [core](../core/AGENTS.md), `spell-parser/core` (`SC`):  the runtime compiled spell runs on.
  - [util](../../../src/util/AGENTS.md), `spell/util`:  utilities (the kit's `src/util/`).
  - [lsp](../../../spell-app/src/lsp/AGENTS.md), `spell-app/lsp` (`LSP`):  spell's language server.
    See "Language server" in [PARSING.md](PARSING.md).
  - `../../../spell-app/vscode`:  the VS Code extension that runs it.
    Its own yarn project, NOT a workspace.
  - [app](../../../spell-app/src/app/AGENTS.md), `spell-app/app`:  the web app.
    - Also the runner, and the `<spell-app>` / `<spell-editor>` elements.
    - `yarn start` is run THERE, at spell-app's root (epic `repo-split` P11).
  - [spaces](../../../spell-app/src/spaces/AGENTS.md), `spell-app/spaces`:
    where projects live, and the editor's server.
    - Spell's project groups (`@spell/examples`, `owen@spell` ...), their lists, and a project's file edits.
    - The built-in projects and the test projects, and reading and writing projects on disk.
    - This folder NEVER imports it (see "Projects live in spaces" below).
  - [cli](../../../spell-app/src/cli/AGENTS.md), `spell-app/cli`:  the `spell` command line's spell-app half.
    It runs this folder's SOURCE (and the others') through `tsx`.
- `rules/`:  spell's rule modules (see "Parser rules" below).
- Tests live in the repo's `tests/spell/`, at the same paths as the code they test:
  [SpellProject.ts](SpellProject.ts) => [SpellProject.test.ts](../../tests/spell/SpellProject.test.ts).
  - `yarn vp test run --project spell` runs them (the repo's `vitest.config.ts`).
    `yarn test` runs the whole repo's.
  - Their helpers stay here, in `test/` (`spell-parser/spell/test`).
  - They write the projects they parse inline:  `parseSpellProject()`, `runSpell()`.
  - The tests that compile a WHOLE frozen test project (`@spell/test`) are spell-app's, beside the projects:
    its `tests/spell/`, at the same paths they had here (epic `spanish` P18;  see "Projects live in spaces" below).
  - `tests/spell/parserTests/`:  parser tests that need the spell grammar.
    The generic ones are parser's, in `tests/parser/`.
- `node/` (`spell-parser/spell/node/...`) is NODE-ONLY:  the repo's `tsconfig.node.json` checks it.
  - Its files:
    - `packageVersion.node`
  - And for the targets beyond javascript:
    - `typecheck`:  `tsc` on the TypeScript target
      - Also the code folders compiled spell is checked against, `CODE_FOLDERS`:
        spell's folder, the repo's root, and `core`'s folder
    - `buildTsx`:  the TypeScript target's build
    - `pyright`:  pyright on the Python target
  - And the spell syntax table (see "Parser rules"):
    - `spellSyntax`
    - `writeSpellSyntax`, the script behind `yarn spell:gen:syntax`
  - Projects on disk are NOT here:  they're spaces' (`spell-app/spaces/server/node/...`).
  - The barrel NEVER exports it.
  - Other repos import these files by name, e.g. `spell-parser/spell/node/buildTsx`.
    Spaces, the language server and the `spell` command do.
  - Nothing reachable from `spell-parser/spell`'s barrel may import it (WWOD §8 › "Barrels").
- `translate/` (epic `spanish` P24-P29):  writing a project in another language, names first, then rule by rule
  (`spell parser translate`, its work in [the cli's translateProject.ts](../cli/translateProject.ts)).
  - `NamesGlossary`:  the language pack's shared glossary of names, `languages/<lang>/glossary.json5`:
    looked up before asking `claude`, each project's choices checked against it, grown by `--learn`
    - spell as a corpus of programs (Owen, 2026-10-23):  the same English name, the same name in every project
    - JSON5 read by node only:  nothing imports it, so it never reaches a browser
  - `NamesPass`:  every name the project declares and its lines lack, and the glossary doesn't have, by Claude:
    the types in one call, then the rest in up to 6 calls at once, each checked readable,
    the unreadable (and any word two calls both chose) asked for again once
    - each keeps its English name's form:  words stay words (`todos-app` => `gestor-de-tareas`), camelCase stays
      camelCase (`newTaskName` => `nombreNuevaTarea`);  a type's name never a plural, `tareas`
      (its first word says how many:  `gestor-tareas`, a manager of tasks, is one;  epic `spanish` P28)
  - `Translator`:  each line written again with its rule's twin in the other language's pack
    (the same class, registered in the same place), its slots filled with its children, translated the same way;
    it flags the lines whose word order may be wrong (`risky`);
    a type's creation hook (`- when created:`) in the other language's own words, `- al crearla:`
  - `ShapeCheck`:  each translated line compiled beside its source line, names and texts aside (`shapeOf()`):
    a line that compiles to a different program "means something else"
  - `FixUps`:  each line that fails lint, a test or the shape check, or the writer couldn't write or flagged,
    written again by Claude in context, one call a round;  an answer that isn't JSON, asked again in two halves
  - `ElementNames`:  the tags, attributes and values a project draws with, `<ui-*>` through Spell UI's names
    (handed in by spell-app:  spell-parser never imports Spell UI), in its JSX and its style sheets
    - a form control's `name` binds it to a property:  the property's name in the other language, as code names it
      (`name="newTaskName"` => `name="nombreNuevaTarea"`;  epic `spanish` P28)
  - `TranslationNames`:  the project's names dictionary, `<Project>.<lang>.names.json5`, with its nouns' genders;
    beneath it, the names of the projects it imports
  - `NamesSeeder`:  fills one from a translation a person made (`--seed`)
  - `claude` is always injected (`ClaudeRunner`):  every class here is pure, and tested with a fake.
    - The command's two (epic `spanish` P27):  the Claude API with `ANTHROPIC_API_KEY` set, else `claude -p`,
      in the cli's [claudeRunners.ts](../cli/claudeRunners.ts).
    - Each pass hands the runner its answer's JSON schema (`ClaudeOptions.schema`), so the answer can only be that,
      and the glossary as `context`, for the system prompt (the API caches it).
  - Imported by path, never through the barrel:  `spell-parser/spell/translate/Translator`.
- `highlight/`:  `SpellHighlighter`.
  - It colours a snippet without a project, for `<ui-code language="spell">`.
  - Call it as `SP.SpellHighlighter.spans(text)`.
  - The app's `<spell-code>` colours pages with it, from source, in a lazy chunk
    ([SpellLanguage](../../../spell-app/src/app/components/spell-code/SpellLanguage.ts)):
    nothing to regenerate after a grammar change.
- [targets.ts](targets.ts):  the TARGETS spell compiles to, `SP.TARGETS`.
  Each is a language, the runtime its code runs on, and the writer that writes it:
  - `js/solid`:  ALWAYS compiled, as the editor, the runners and `spell run` run it
  - `ts/solid`:  TypeScript on Solid, checked by `tsc`
  - `py`:  Python on `spell_core`, checked by pyright
    - on asyncio:  a function that waits is `async def`
    - with a words file of its own, by Python's names:  `<Project>.py.en.json5`
    - a program that draws also gets two more files:
      - its page file, `<Project>.elements.spell.js`:  its drawing half, in javascript
        - its suffix `elementsSuffix`, its writer `PY.ElementsWriter`
      - its web app on Quart, `<Project>.app.py`
        - Each compile rewrites it only while nobody has edited it.
        - `appSuffix`, and `spell-parser/py`'s [quartApp.ts](../py/quartApp.ts)
  - `ts/lib` (epic `people-and-orgs` P3):
    a LIBRARY, the project's classes alone, for the repo's code to import
    - `<Project>.lib.ts`, one file with its own types:
      no drawing, none of its top-level steps, the core with no Solid
    - checked by `tsc`, as `ts/solid` is
    - committed beside its source, and marked generated in spell-app's `.gitattributes`:
      a merge recompiles `@spell/library`
  - What a target builds goes in the project's build folder, `build/` at the repo root, never committed.
    - That's its compiled code, and the scope pack, `.scopes.js`:

      ```text
      <Project>.spell.js  .spell.tsx  .spell.py  .elements.spell.js  .scopes.js
      ```

    - The rest goes beside its source:  declarations, words, `.lib.ts`, `.app.py`.
    - See "Projects" in [PARSING.md](PARSING.md).
    - Built when needed:
      - the page server compiles `@spell/examples` and `@spell/library` as it starts
      - spaces' API compiles a project whose built file is missing
      - by hand:  `spell compile --stale`
  - A project lists the others it wants in `project.json`'s `"targets"`.
    `spell compile --target <name>` picks one for a single run.
  - The writers are `spell-parser/parser`'s:  "Compile" in [PARSING.md](PARSING.md).
- `test/` (`spell-parser/spell/test`):  the test helpers for projects a test writes inline,
  e.g. `parseSpellProject()`, `compiledSpellProject()`, `incrementalSpellProject()`, `runSpell()`, `solidSample()`.
  - The frozen test projects' own helpers are spell-app's, `spell-app/spaces/test` (below).
- Projects live in spaces, not here:  this folder reads and compiles them, but holds none.
  - Spell's project groups (`@spell/examples` ...) are spaces' `SPACES.PROJECT_GROUPS`.
    - Spell's registry, `SP.SpellSetup`, starts EMPTY:  loading spaces' groups registers them there.
    - So every program that reads a spell path loads them first, through `spell-app/spaces`,
      spaces' disk reader, or `spell-app/spaces/models/projectGroups` alone.
    - Spell NEVER imports spaces.
  - Where each group's projects are:
    - [spaces' built-ins](../../../spell-app/spaces/@spell/), committed:
      `@spell/examples`, `@spell/library`, `@spell/guides`
    - `@spell/test`:  the frozen test projects, beside them in
      [spaces' `@spell/test/`](../../../spell-app/spaces/@spell/test/), committed (spell-parser's `tests/spaces/` until epic `spanish` P18)
    - `owen@spell`:  Owen's own, in spell.spaces beside the main checkout, outside git
  - A project's URLs and folder come from ONE function, [SpellUrls](SpellUrls.ts) (`SP.SpellUrls`).
  - See "Projects" in [PARSING.md](PARSING.md).
  - Tests read the test projects:  frozen projects, which never change to follow an example.
    - Their group:  `@spell/test`, e.g. `@spell/test/fizzbuzz`, listed in the app in dev only.
    - They and the tests that compile them are spell-app's (Owen, 2026-10-22, epic `spanish` P18):
      every `@spell` group lives there, so a test project may import another, e.g. `counter-app` the frozen `counter`.
    - Two examples are tested as they are, Solitaire and Solitario (epic `spanish` P21):
      their snapshots are spell-app's, in its `tests/spell/__examples__/`, re-blessed when an example changes.
      - A lower repo's tests never read a higher one's:  spell-parser's own tests write their projects inline.
    - In spell-app's tests, read them with the helpers from `spell-app/spaces/test`:
      - `loadFixtureProject()`
      - `fixturePath()`
      - `fixtureProjectId()`
    - NEVER update a fixture to follow its example.
  - Each fixture's compiled output is checked against the snapshots beside it
    (spell-app's [fixtures.test.ts](../../../spell-app/tests/spell/test/fixtures.test.ts)):
    - `<Project>.snapshot.js`:  the javascript target
    - `<Project>.snapshot.declarations.json5`:  its declarations
    - `<Project>.<lang>.snapshot.js`:  its words (`SP.SpellWords`), one per language its files are in (`.en`, `.es`)
      - Its name ends as a snapshot's does, which keeps it out of the project's files.
    - `<Project>.snapshot.tsx`:  the TypeScript target
    - `<Project>.snapshot.tsc.txt`:  what `tsc` says of it ([typescript.test.ts](../../../spell-app/tests/spell/test/typescript.test.ts))
    - `<Project>.snapshot.py`:  the Python target
    - `<Project>.snapshot.pyright.txt`:  what pyright says of the Python ([python.test.ts](../../../spell-app/tests/spell/test/python.test.ts))
    - `<Project>.elements.snapshot.js`:  the Python targets' page file, for a fixture that draws
    - `<Project>.lib.snapshot.ts`:  the library target, for the fixtures in `LIBRARY_FIXTURES`
    - The Python ones only for the fixtures in `PYTHON_FIXTURES`:
      every fixture but `todos-form-based` and `cartas`, so far.
      The Python writer can't write its method's named arguments yet.
    - Add a fixture by copying a project in.
    - After a deliberate change, `yarn spell:test:fixtures:bless` at spell-app's root, and read the diff.
- [README-spell.md](../../README-spell.md), at the repo's root, is this folder's page for people;
  [the repo's README](../../README.md) is spell-parser's front page.
  - Other docs live in the content repo, their tooling in [spell-epic's tools](../../../spell-epic/src/tools/)
    (see "Creating docs").
- [The barrel](index.ts) is loaded in browsers AND the editor's server, in spaces (WWOD §8 › "Barrels").
  - It imports `spell-parser/core`'s TYPES only, never its code.

## How parsing works

- [PARSING.md](PARSING.md) is a compact map of the parse pipeline.
  - tokens, block / line / statement
  - when scope changes
  - how projects share a parser
  - Read it BEFORE digging into parser internals.
- MUST keep it up to date, in the same change, whenever the parsing mechanism changes:
  - the generic `Parser`, `SpellParser`, scopes
  - how a file becomes blocks, lines and statements:
    - `Block`
    - `BlockLine`
    - `SpellStatement`

## Creating docs

- Docs for people (design notes, research, references), for every package, live in the content repo, `spell.epics/`:
  `guides/` mostly.
  - Their tooling is [spell-epic's tools](../../../spell-epic/src/tools/), in `spell-epic`, its own repo.
- How to write one:  [spell-epic's AGENTS.md](../../../spell-epic/src/AGENTS.md), "Writing a page".

## Parser rules

- A rule is a CLASS (behaviour AND what the rule is), plus its `syntax` and `tests`.
  - Those two are passed when registering it:  `parser.addRule(RuleClass, { syntax, tests })`.
  - A rule's syntax is in ONE human language;  its class is every language's (epic `spanish`).
    - Each module's English registrations are its `<module>.en.ts`;  another language's, `<module>.<lang>.ts`.
    - So rule CODE never reads a word it matched (`operator.value === "is not"`):  it asks a WORD RULE (below).
  - Everything else goes ON THE CLASS, as `@proto static` (from `spell/util`).
    - e.g. `alias`, `priority`, `declares`, `highlightAs`, `datatype`, `tokenType`, `pattern` ...
    - e.g. `@proto static alias = "expression"`
    - Why:  the class is the rule, reusable by other languages' parsers with their own `syntax`.
    - As WWOD §12 › "`@proto static` defaults" (declared props only;  inherited), plus:
      - NOT inherited:  `syntax`, `tests` and `ruleName`.
      - Share syntax with a constant, e.g. `VARIABLE_SYNTAX`.
  - `priority` and `precedence` are different:
    - `priority` only breaks a tie between rules matching the SAME words.
      Its values:  the `Priority` table, in [rules.types.ts](rules/rules.types.ts).
    - `precedence` is how tightly an operator binds.
      Its values:  the `Precedence` table.
    - A new expression or operator:  [PARSING.md](PARSING.md), "Adding an expression rule".
  - Rule CLASSES are PascalCase;  rule NAMES are snake_case, worked out from the class name.
    - `P.Rule.ruleNameFor()` works it out, e.g.:
      - `class ListAddRelative` => `list_add_relative`
      - `class If` => `if`
    - The rule name is what everything else says:
      - `syntax`:  `{list_add_relative}`
      - `parser.rules`, declarations, error messages
      - the `__snapshots__`
    - A plain `static ruleName = "..."`, only where the class name doesn't give it:
      - `class BlockLine` => `"line"`
      - `class SpellJSXText` => `"jsxText"`
      - Also where the PascalCase name would hide a javascript or DOM global, or reads as a parser class.
        - Then:  a fuller class name, keeping the rule name,
          e.g. `class NumberLiteral` + `static ruleName = "number"`.
        - the globals:  `Number`, `Boolean`, `Text`, `Comment` ...
        - a parser class:  `Keyword`
    - So the prod build keeps class names:  [parser's AGENTS.md](../parser/AGENTS.md), `keepNames`.
    - [ruleNames.test.ts](../../tests/spell/rules/ruleNames.test.ts) pins every rule's name, module and
      registration order:  a renamed class that changes a rule's name fails it.
  - The SPELL SYNTAX TABLE, [spellSyntax.json](spellSyntax.json):  every rule class, by module, with
    - each syntax it's registered with
    - an example of each from its tests, compiled by the javascript, TypeScript and Python writers
      (comments left out)
    - its aliases
    - its docstring's first sentence
    - What [the spell syntax guide](../../../spell.epics/guides/spell-syntax/spell-syntax.html) draws.
    - One per language pack, the same shape:
      Spanish's is [spellSyntax.es.json](spellSyntax.es.json), its syntaxes and examples from the `<module>.es.ts`
      registrations.
    - Generated by `yarn spell:gen:syntax`:
      run it after adding, renaming or changing a rule, its class docstring or its tests.
      [spellSyntax.test.ts](../../tests/spell/node/spellSyntax.test.ts) fails until you do.
    - So a class docstring's first sentence says what the rule is FOR, in plain words:  it's the guide's Purpose.
  - ONE `syntax` per registration.
    - A rule with several calls `addRule()` once per syntax, each with the `tests` for that syntax.
      - e.g. `assignment` (`AssignmentStatement`)
    - Instances merge into a `P.Group`, under the rule's name.
  - Put a prop on a base class when EVERY subclass wants the same value.
    - e.g. `SpellExpression`'s `alias = "expression"`
    - e.g. `MethodDefinition`'s `inlineInitialType = false`
    - A subclass just states its own value, for an exception.
  - Constructor defaults also work, for what every rule of a base class has in common.
    - e.g. `super({ pattern, blacklist, ...props })`:  see `SpellIdentifier`
  - The finished shape:  [events/](rules/events/), one rule per file (see "Rule module layout" below).
    All the ways to make a rule:  the top docstring in [Rule.ts](../parser/rules/Rule.ts).
  - The methods that register a rule TYPE their definition as `{ syntax, tests }` only (`P.SyntaxAndTests`).
    - They're `SpellParser.addRule()` and `scope.addRule()`.
    - So a stray `alias` there is a compile error.
  - Rules built WHILE PARSING (`scope.addRule()`) are a named class, `specialize()`d with plain-data statics.
    - e.g. `DynamicMethodRule.specialize({ output: "play_fizzbuzz", alias })`
    - The definition is still just `{ syntax }`.
    - NEVER a closure class:  its behaviour reads ONLY its statics.
      So a project's declarations can rebuild it in another project.
      - Give its base class `@proto static importableAs = "<id>"`, e.g. `"quoted_property"`.
    - What it's `specialize()`d with is written out as is.
      - So an importable class overrides `specialize()` to take a MINIMAL set,
        named in `declare static readonly SpecializeWith`.
      - It works out the rest, for `super.specialize(statics, declared)`.
      - See `P.SpecializeWith`.
    - Its `static declarationProps(declared, syntax)` says what goes in the declaration:  tune output there.
  - A class or rule name is NOT a stable identifier (WWOD §3 › "Names aren't identifiers").
    - Here, the explicit property is e.g. `@proto static importableAs = "quoted_property"`.
  - WORD RULES hold a language's words for one thing, and what each form means (epic `spanish` P3):
    - [`Wording`](rules/expressions/Wording.ts):  forms in named groups, each group's name its meaning.
      - e.g. `list_end`, `((start:start|front|top)|(end:end|back|bottom))`
      - The rule asks which meaning it matched:  `Wording.meaningOf(match)`.
    - [`Negatable`](rules/expressions/Negatable.ts), the commonest:  one meaning, `negated`.
      - `{operator:is_or_is_not}` matches `is`, `is not`, `isn't` and `isnt`.
      - `Negatable.isNegated(operator)` says which.
      - Plain `is` matches just the word.
      - So far, besides the verbs' own in their modules:
        - `is_or_is_not`
        - `is_or_is_not_a` (`is a`, `are not a` ...)
        - `can_or_cannot`
        - `will_or_will_not`
        - `has_or_has_not`
      - The old names (`is`, `can`, `will`, `has`) stay as aliases:  declarations compiled before say them.
    - [`Synonyms`](rules/expressions/Synonyms.ts):  forms that all mean the same.
      - e.g. `is_or_are`, and the articles:  `indefinite_article`, `definite_article`
      - Which form a person wrote:  `Synonyms.formOf(match)`.
        - An article must agree with its noun:  a warning when it doesn't (`a apple`, `el carta`).
        - The language pack says what agrees, `SP.Language.agreement()`
          (epic `spanish` P8;  "Warnings" in [PARSING.md](PARSING.md)).
    - Code that meets a word OUTSIDE a parse of its rule (a lookahead, a person's quoted phrase):
      it asks `Wording.reads(scope, "is_or_is_not", word)`, never `word === "is"`.
    - A translation registers its own under the same names:

      ```ts
      expressions.addRule(Negatable.specialize({ ruleName: "is_or_is_not" }), { syntax: "(es|está|(negated:no es|no está))" })
      ```

- A rule which is a statement AND an expression,
  ending in a whole `{x:expression}` (a method call, `wait for`):
  - `@proto static operandInExpressions = true` makes that last slot an `operand` when used INSIDE an expression.
  - So:
    - `if double x is 4` => `double(x) == 4`
    - while the statement `notify x + y` keeps `notify(x + y)`
  - `SpellParser.addRule()` registers the statement and an expression twin:
    see "Expressions" in [PARSING.md](PARSING.md).
- A statement with a BODY (an inline statement, or an indented block under it)
  says so with a body keyword, at the END of its `syntax`.
  - e.g. `if {condition:expression} (then|:)? {statement_body}?`
  - `{statement_body}` ~== `({inline_statement}|{nested_statements})`
  - `{expression_body}` ~== `({inline_expression}|{nested_statements})`
  - the rest:  `BODY_KEYWORDS`, in `Statement.ts`
  - Read the parsed body with `this.getBody(match)`, NEVER `match.groups.body`.
    See `SpellStatement`.
- A statement that DECLARES something says so with `@proto static declares`, for editors' symbol lists.
  - something:  a type, property, method, variable, event handler
  - It names the groups that hold the name and the owning type,
    e.g. `@proto static declares = { kind: "property", name: "property", of: "type" }`.
  - Override `getDeclaration(match)` for what a spec can't say, e.g. when only SOME matches declare something.
  - NEVER make editor code switch on rule names:  see `Rule.getDeclaration()`.
- A rule whose matches hold words an editor should colour says how with `highlightAs`.
  - e.g. `@proto static highlightAs = "property"`;  see `P.HighlightKind`.
  - Base classes set it for their family, so most rules need nothing:
    - `SpellIdentifier` => `"variable"`
    - `Keyword` => `"keyword"`
- Rule module layout:  a module is a FOLDER, one rule class per file (epic `output-targets` P18).
  - The model:  [events/](rules/events/).
    Every module has this layout now:

    ```text
    rules/<module>/
      <module>.parser.ts    the module's parser
      <RuleClass>.ts        one rule class each:  what it does, in every language
      <module>.en.ts        its English:  every rule's syntax and tests, in tie-break order
      <module>.shared.ts    what several of its rule files share, if anything
      index.ts              exports every rule class

    tests/spell/rules/<module>/   (from the repo root)
      <module>.test.ts      its tests
      __snapshots__/        its group specs
    ```

  - `<module>.parser.ts`:  the module's parser, and nothing else.
    - `export const <module> = new SpellParser({ module: "<module>" })`
    - A file of its own, so each rule file can import it without importing its siblings.
  - `<RuleClass>.ts`:  ONE rule class, the file named for it, e.g. [Trigger.ts](rules/events/Trigger.ts).
    - Top to bottom:
      - imports:  `./<module>.parser`, peer files (a base class), `spell-parser/spell/rules/<other module>` for another's
      - constants the class reads:  a `const` isn't hoisted
      - docstring + `export class Trigger extends ... {}`, its `@proto static` props FIRST in the body
      - THEN the types and helpers only this rule uses (`type VariableMatchData`)
        - one its English tests use too is exported, for `<module>.en.ts` (`setupAssignmentStatement()`)
        - Types and function declarations are hoisted, so they can follow what uses them.
    - The class docstring's first line starts with the RULE name,
      so a search for `{list_add_relative}` finds it:
      - `` `list_add_relative` rule:  adds an item before or after another ``
      - then `- e.g. ...` bullets, from its own `tests`
    - Every rule class is exported:  one exported class per file (WWOD §8).
    - A base class shared by several rules (registered or not):  a file of its own, named for it.
  - `<module>.shared.ts`:  types, constants and helper functions SHARED by several of its rule files.
    - Only if there are any.
      What one rule alone uses stays in that rule's file.
    - e.g. `VARIABLE_SYNTAX`, in [variables.shared.ts](rules/variables/variables.shared.ts):
      two rule files read it.
    - Why `.shared`:  rule helpers build AST nodes (`new P.AST...`).
      A `.types.ts` file mustn't import values like those, so it isn't `.types`.
  - `<module>.en.ts`:  every `<module>.addRule(RuleClass, { syntax, tests })` of the module, in TIE-BREAK order.
    - When two rules tie on `priority` and length, the one registered FIRST wins (`Choice.getBestMatch()`).
    - [The rules' own index](rules/index.ts) loads each module's `.en.ts`, then assembles `spellParser`.
    - Another language's `<module>.<lang>.ts` registers the same classes, in the same order.
    - `spell parser packs check` says what a language's files lack against English;  `fix` writes stubs to translate
      ([packs.ts](languages/packs.ts), imported by path:  the barrel leaves it out).
  - `index.ts`:  `export * from` each file.
    - `./<module>.parser` first, then `./<module>.shared`, then the rule files.
    - A rule file that imports a peer (its base class) loads it first:
      fine as long as the base came first in the old order too.
    - Other modules and [the rules' own index](rules/index.ts) import the folder, as before:
      `spell-parser/spell/rules/<module>`, or `./<module>` from that index.
  - `<module>.test.ts`:  MUST call `unitTestModuleRules()`, or its tests never run.
    - The call:  `unitTestModuleRules(spellParser, "<module>", ...)`, from `spell-parser/spell/test`.
    - It lives in `tests/spell/rules/<module>/`, its `__snapshots__` (the group specs) beside it.
    - Blessing finds the module's source from there:  the same module's folder in [rules/](rules/).
- A rule's `tests`, each a `P.RuleTest`:
  - `{ input, js, ts }`, or a tuple `[input, js, ts?]`
  - `js`:  what the javascript writer writes;  `ts`:  what the TypeScript writer writes.
    Leave `ts` out where it's the same as `js`.
  - `input` is parsed ONCE, then written by both:  a change to either writer fails the rule's own tests.
  - A rule alone has no project around it, only its test's scope.
    So its `js` and `ts` show what the writers do without one, e.g. a type they can't know.
  - `yarn spell:test:rules:bless` writes each test's `js` and `ts` into the source.
    - It sets `BLESS_RULE_TESTS=1`, then runs `vp fmt`.
    - Read the diff after:  it's the review.
    - It finds each test by its `input` and old `js`;  one it can't place fails the run, saying why.
  - Test setup shared by a rule's registrations:  `setup<RuleClass>()`, returning `{ compileAs, beforeEach }`.
    - It's spread into each block:  `{ ...setupAssignmentStatement(), tests: [...] }`.
  - Tests need no type annotations there.
  - `yarn spell:test:rules` runs every rule module's tests, and `ruleNames.test.ts`.
- Type arguments:  `Rule<Props, Groups, MatchData>`, all defaulted.
  - So the bare classes work:  `P.Rule`, `P.Sequence`, `P.Match`.
  - Rule base classes fix `Props`.
    So authors write `SpellStatement<"type|property|specifier?", { ruleComment?: ... }>`.
  - `rule.matchGroup` is the name a rule's match goes under in `match.groups`.
    - e.g. `{thing:expression}`
    - It was `argument`.
  - `Groups` is a `P.GroupsFor` spec:
    - `name` required, `name?` optional, `name[]` array
    - Copy it from the module's `__snapshots__` file.
      It's computed from real `syntax` (`rule.groupSpec`).
    - Use an object type when `getGroupsForMatch()` derives non-`Match` values.
  - `MatchData` is what a rule stashes on its matches, read as `match.data.foo`.
  - Hooks take `match: P.MatchFor<this>`.
    To read another rule's match, narrow with `match.is(OtherRule)`.
- `match.groups` holds ONLY what the syntax matched (`Match | Match[]`).
  - Anything a rule works out for itself goes in `match.data`, typically via a caching method:
    `getBits(match) { return (match.data.bits ??= ...) }`.
  - NEVER override `getGroupsForMatch()` to add derived values.
- "Looked, not found" in `match.data` is `NONE`, from `spell/util`.
  - Use it rather than `null`.
  - Name scope lookups `scopeVar` / `scopeConstant` / `scopeType`.
- ONLY `mutateScope()` changes scope.
  - And `mutateScopeFromBody()`, for what a statement knows only once its BODY has parsed,
    e.g. what a method returns.
  - `mutateScopeFromBody()` returns what it recorded, so an edit changing it re-parses what follows.
  - `getAST()` MUST be pure:  NEVER change scope, NEVER look it up.
    - ASTs are built lazily, when scope may have moved on.
    - Look up what the AST needs WHILE PARSING, into `match.data`.
- What a statement's `mutateScope()` changes, for incremental parsing:  `@proto static changesScope`.
  - Or override `getScopeChanges(match)`, when only SOME matches change what later lines see.
  - It reads only `match.data`.
    - e.g. `AssignmentStatement` is `"global"` only when it auto-declared a property.
  - See "Incremental parsing" in `PARSING.md`.
- A slot NAMING a member (a property's declaration, a read of one) is `{property:member_words}`:
  several words, blacklisted ones too, up to a structural word.
  - A READ resolves them through its type in `parse()`, else rejects.
  - A single undeclared word is the loose `{property}`.
  - See "Members" in `PARSING.md`.
- A built-in type's members (`the length of the name`) are DATA in `SP.BUILT_IN_TYPE_TABLE`, NOT rules.
  - The table:  [builtinTypes.ts](builtinTypes.ts).
  - Add one there, with the real `core` method or javascript property its `readAs` names.
  - Then `yarn lsp:scopes --builtins`, in spell-app.
  - See "Built-in types" in `PARSING.md`.
- A `parse()` which understood a statement but mustn't take it REFUSES it, NOT returns `undefined`.
  - `return SpellStatement.refuse(match, "why")`:  the line's error then says why.
  - e.g. a property declared on a built-in type
  - "why" is a key in the language pack's `parserMessages`, never a sentence written in the rule:
    `SP.Language.of(scope).parserMessage("cant-save-built-in-inline", { type })`.
    The same for a warning (`SP.SpellWarnings.note()`) and a parse error ("Warnings" in `PARSING.md`).
- A rule built WHILE PARSING goes through `scope.addRule(RuleClass, definition, match)`.
  - Never `parser.addRule()` directly.
  - So the scope records the class + definition pair, and can hand on the rules it created.
- A `mutateScope()` that adds a scope record passes `declaredBy: match`,
  so editors can find where it was declared.
  - a record:  a variable, constant, type, rule or `ScopeMethod`
  - for `scope.addRule()`, it's the third argument
- What a rule's match IS:  `match.datatype`, in spell's words (see `P.Datatype`).
  - e.g. `text`, `Card`, `list of cards`
  - Set it with `@proto static datatype`, or override `getDatatype(match)`.
    That reads ONLY `match.data` and child matches.
  - A scope lookup it needs (a member, a list's item type) happens in `parse()`, into `match.data`.
  - Type names a user WRITES go through `SP.typeName()`.
  - See "Datatypes" in `PARSING.md`.
- Rules are IMMUTABLE (frozen on registration), and shared by every parse.
  - NEVER store per-parse state on a rule.
  - NEVER add ad hoc fields to a `Match`:  use `match.data`.
- Other modules reach a rule by NAME, through `syntax` / `parser.rules`.
  - By its CLASS only to subclass it, or to narrow a match with `match.is()`.
- A base rule class for a category of spell things is `Spell<Thing>`, paired with the lowercase rule it fathers.
  - `SpellConstant` / `constant`
  - `SpellType` / `type`
  - `SpellIdentifier` / `identifier`
- Name rules for what they MATCH, not just what they mean.
  - In [variables/](rules/variables/), `identifier` / `singular_identifier` / `plural_identifier` match a bare word.
  - `variable` / `known_variable` also allow a leading `the`.
  - A family sharing a prefix should share its shape.

## Decorators

As WWOD §12, plus:

- The toolchain's decorator pre-pass (`spell/toolchain/decorators`) is used by the repo's `vitest.config.ts`.

## Imports

- As WWOD §4:  our own files are `spell-parser/spell` (the barrel) and `spell-parser/spell/<path>`.
- It imports:
  - `spell-parser/parser` (`P`)
  - `spell-parser/core`, types only
  - `spell/util`
  - NEVER `spell-app/lsp`, `spell-app/spaces`, `spell-app/app` or `spell-parser/cli`.
- A rule module imports the generic parser's rule classes from `spell-parser/parser`,
  and registers on `SpellParser` here.

## Types / Exports

As WWOD §8, plus our self-namespace:

- `SP` ~== `spell-parser/spell`

The other namespaces live in their own packages:
- `P`:  `spell-parser/parser`
- `SC`:  `spell-parser/core`
- `LSP`:  `spell-app/lsp`
- `UI`:  `spell-app/app`
