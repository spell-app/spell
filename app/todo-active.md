
TODO:
- getMatchedSource()
	=> getMatched(context)

- comments
	- add to all statements
	- add to results
	- others?
	- auto-output as part of `statements`?
		- eg: comments not important unless part of statement block
	- TODO: preserve whitespace in between comment symbol and text
	- TODO: preserve whitespace BEFORE comment?  very unlikely this will line up...
	- TODO: automagic comment indent preserver

- Rule.Boolean etc:  add pattern/etc to class: we're only creating one anyway.

- parse result.tree
	=> nested tree of results for visualization, transform
	=> or is the tree just the matched array???

- Rule.Statements
	- move multiline parsing logic into statements.parse
	- returns an instance which can be toSource()'d

- Structure parsing
	- have separate structure rules, eg:
		- if.pattern	= "if {expression} (then|:) {statement}?"
		- if.structure	= "if {anything} (then|:) {statement}?"

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

- Rule.Repeat
	- some default toSource()?
	- at least default toMatchedSource()?


- `if can play card on pile`	=> want to translate to `pile.can_play_card(card)`
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
- tokenize & match words/symbols using === rather than regex
	- make a `word trie`?
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
