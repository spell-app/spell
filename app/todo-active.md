

- Each parse file defines a "context"
	- name
	- priority (derived from load order)
	- types
	- rules
	- vars (global and scope-local)
	- imports (contexts we depend on)

	- getRule(name)
		=> looks at our own + parents for a big "alternative"
		=> higher priority rules will generally win

- Loading the above
	- let parser = Parser.withContext("name");
		- can re-define a context later (to add to base classes, etc)

	- parser.import("context", "context2")
	- parser.addRule() etc
	- parser.addType() etc


- Structures
	- "type" structure
		- name
		- collection name (plural)
		- properties:
			- { key : value | function }
		- methods:
			- { name:  signature, contents }

	- "scope" structure
		- types:
			- { name: type }
		- globals: map
		- locals: map
		- rules - local rules for this scope ???

	- structures are immutable
		- all maps are proto clones of parent maps
		- how to "proto clone" arrays?

		- parser.addRule("statement", ...)
			=> new parser.rules map
			=> new parser.rules.statement array ?

- Structure parsing
	- "structure" rules:
		- global
		- (define) type X
		- to / on / action / get / set
		- property definition
		- assume all must start a line (ignoring indent)

	- when parsing a file:
		- parse structure rules
		- add structure to file-specific "rules"
			- "define type" adds new type
			- "global" defines new global variable
			- "to x" adds new "statement" to local rules
		- then parse structure interiors

	- a file can augment an existing type
		- add properties
		- add methods / actions


	- Rule / parser changes:
		- "context" (parser?) has several sets of rules, one for each file
			- note: can use where rule is defined for precedence
		-

	- within a class/function
		- pick up assignments and other variable definitions for use when parsing the function

	- have separate structure rules, eg:
		- if.pattern	= "if {expression} (then|:) {statement}?"
		- if.structure	= "if {anything} (then|:) {statement}?"

	- paren nesting?

	- scan statements for structure
		- leading whitespace (changes)
		- if, loops, etc
		- and/or inside expressions?
		- define type
		- to/action/get/set
		- what else??

	- for structure to really work, there will be some mandatory blacklists for mutli-identifiers
		if, else, then, ":",

	- break up parsing into small sub-tasks
		- intuit structure
		- add structure to context.scope
		- parse bits

	- parse() takes `context` including:
		- parser
		- scope
			- app / type / method / block
			- any loose code (eg: in type def) gets added to constructor



- refactor
	- `Text` => `QuotedText`?
	- include whitespace in JSX parsing
		- change eg matchAttributes etc to use `matchWhitespace`
		- include whitespace in `attributes`, have getter which ignores this...

	- test tokenizer

	- tokenizer & bad input

	- conver parser to `[tokens, start, end]` pattern ala tokenizer?
	- tokenizer to similar `rule` pattern as parser?

	- how to go back to source for annotation w/stream/skip whitespace
		- assume whitespace in the token stream
		- rule.start, rule.nextStart allow you to map back into token stream
		- add characters...


# Scope/etc
- global "actions"
	- to turn a card over	<= global action with param `card` (ref as `the card` inside fn)
	- to start a game		<= global action with param `game`
	? to deal cards?		<= internal action, only available w/in `Game` class?

- Non-controller objects as simple as possible
	- eg: card knows it has a suit, but not what all "suits" are
	- eg: `the color of a card` is deck mechanics

- Default "game logic" to controller rather than spreading into subclasses
	- eg: game: `can play a card on a pile` as switch rather than method for each pile
	- easier for layperson to follow logic in one place
	- if necessary, give "pile" properties like "alternating" and "ascending" etc

- where actions are defined will help place scope
	- type Game
		property deck = new Card Deck
		- to start game
			- shuffle the deck	=> `the deck` is magic "look up in local scope" indicator

- event handlers
	- type Card Deck
		- to shuffle a deck					<= global typed action
			gather the cards into a pile	<= `the cards` = magic scope `the cards of the deck`
											<= `a pile` = create new pile, which will show at center of screen?
			randomize the cards				<= shuffle command
			turn the cards face down		<= implies `turn a card` takes an array of cards as
			play sound "shuffle deck"		<= autofind sound, returns a promise
			wait until the sound is done	<= `the sound` here is local variable from `play sound`


- component definition
	to draw
		<card rank suit direction>		<= properties of cards, === `rank={my.rank}`, etc
			<image name="front" url={card image of my deck with my rank and my suit}/>
			<image name="back" url={card back image of my deck}/>
		</card>

	styles
		// Make card "front" and "back" images overlap
		<card> <image>
			overlap				<- (eg: position absolute)

		// Flip "front" face of card over from back face
		<card> <image name="front">
			3D-angle = 180°		<- somehow express "flip in 3D"

		// Change card orientation when direction is up.  Automatically animates.
		<card direction="up">
			3D-angle = 180°		<- somehow express "flip in 3D"



- MobX
	- cleverly use mobX to cache lines, structures, etc?

-> push context:  { parser, stack, supers, method } into parsing
	- output doesn't require context...
	- "local class" winds
		- each class gets its own parser (or just rules?)
		- match {expression} in each super parser
		- level of parser in stack = specificity if 2 matches?
		- how does length of result jibe with this?

- subrule needs to take params
	- eg: "non-greedy"

- getMatchedSource()
	=> getMatched(context)





- parsing feedback
	- give an optional HTML element
	- break parsing up into steps
		- structure analysis
		- line by line
	- as process moves along, provide feedback into html element as react classes
		- "unknown" (grey) => <if> <keyword> etc (blue, etc)

	- parser.parse() needs to return a promise?
		-> global `parse()` to print to console for convenience

- parse result.tree
	=> nested tree of results for visualization, transform
	=> or is the tree just the matched array???



- Rule.Repeat
	- some default toSource()?
	- at least default toMatchedSource()?


- rule.number vs rule.integer => length rule should disambiguate...
- `if can play card on pile`	=> want to translate to:
		- `pile.can_play_card(card)`
		or
		- `can_play_card_on_pile(card, pile)
- `(a,b)` to create array rather than []
- `is one of "diamonds", "hearts" or "spades"`
- property X as list of Cards
- property names can be multi-word!!!!
	> get top card: return the last card of me
		=> get top_card()

	> get the top card of the pile
		=> it = pile.top_card


- `each {identifer} of {expression}` => iterate for each item in a list
	- move Card to Pile
	- move each card of some pile to another pile
	- the color of each card in the pile

- getResults(context, name, name, name)
	=> return results mapped over results.toSource(context)
- `{` lifter needs to go before comments... ?
- `the? {identifier}`?  Messes up, eg, `the first item...`
- line break with ¬ or \ or /
- numbers `one`, `two`, etc. Should return a `Rule.Number`
- parseStatements(): return sequence(?) of results?
- parser.addExpression("name", /pattern/, class), same for addKeyword, etc
- class constructor?
	- when creating
- add things to prototype rather than class...
- copy of <thing>




SPEEDUP
- alternatives/etc to one regex?
- parse structure first (statements only?)
- break statement parsing up into interruptable chunks w/ promise



BIG TICKETS
- use specificity of results to disambiguate rules?
	- CSS-like specificity heuristic for rules
	-

CLASSES AND MULTI-WORD STATEMENTS / METHODS
- need to gather the above in the parser for this class and all antecedents BEFORE parsing method text
- pre-flight code to pull these out and add them to parser before doing other things.
- for this we'll need nested parsers:
	- each class gets its own parser based on what's available to it...
	- madness???"


- define Pile:
	- can play a card on me
		=> "if can play (the) card on (the) pile"

`this` vs `my`
	- my requires "is" => "am" inversion
	- `I` ?
	- "the object is talking out loud to itself..."


"confirm {message:expression} (with {okButton:text} ((and|or) {cancelButton:text})? )?"
	- want result to flatten to `{ message, okButton, cancelButton }`
	- (^with...)	<= `^` says push results up into parent rule?

- sequence.parseInChunks
	- parse deterministic bits first, then fill in other bits

Rule.test()
- for complex rules (eg: ... if ... else), we have `rule.test()` which does a quick-and-dirty test to see if it's remotely possible that the rule will work.
- only implement a `rule.test()` if:
	- it's super quick (a single regular expression)
	- it's faster to do the `test()` than just evaluating the rule
- if there's no rule.test(), you'll have to evaluate the rule to see if it works.
- pretty much anything with a nested expression should have a `rule.test()`...


- Alternatives `getBestMatch([match, match, match])`
	- use this to do precedence rules w/ infix operator?

- `preference X (as Y) with default Z`
	- persistent preference, must cross over to cloud
	- `local preference` for this machine only?


- draw sentence diagram of match
	- primary UI for parser testing
	- run tests in-browser (just checking output)
	- click on a test, see the output in sentence diagram form
	- drag to reorder nodes in the output diagram to rearrange the source text!

- combine Alternatives w/Patterns into one
	- combine Symbol and Keyword matches ?
	- implies parser.optimize step???
	- only if no custom stuff (toSource, etc)?

	http://stackoverflow.com/questions/9213237/combining-regular-expressions-in-javascript
	http://stackoverflow.com/questions/869809/combine-regexp
		- re.any and re.or
		- re.and, eg    combining keyword AND string



- instead of RuleSyntax doing a `Object.defineProperties`, compose a subclass???


- `defineMemoized` as a property @modifier should be a lot smarter...

- remember which file each rule came from
	- global "RULE_FILE" in each file?

- stream.head continuously is expensive -- memoize?
