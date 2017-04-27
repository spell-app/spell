BUGS
> parser.parse("expression","the first item of myList is the foo of the bar of the baz").toSource()
> "spell.getItem((myList == spell.get(baz, 'bar.foo')), 1)"

> parser.parse("expression", "a is 1 and b is 2").toSource()
> "(a == (1 && (b == 2)))"


- compileStatements
	- complain if can't match the entire line!
	- parseStatements()
		- return sequence(?) of results?

- "a = 1" is not matching assignment???
	- because object_literal is taking `a = 1` as first object

TEST::::
parser.compile(`
define type Card
	property face as one of ["up", "down"]

	to turn_face_up: set my face to "up"
	to turn_face_down: set my face to "down"
	to turn_over
		if my face is "up":
			set my face to "down"
		else
			set my face to "up"

	property suit as one of ["clubs", "diamonds", "hearts", "spades"]
	get color:
		if my suit is one of ["diamonds", "hearts"] then return "red"
		else return "black"

	property rank as a number
	shared property rank_names = ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"]
	get rank_name: item (my rank) of my rank_names
`)


CLASS SEMANTICS
- constructor???
- shared property ranks as ["ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"]
- property rank as one of my ranks
	- todo: ace high?

- get rank_number: item my rank of my ranks
- get is_higher_than with other_card:
	return my rank_number is greater than the rank_number of the other_card

- get is_one_higher_than with other_card:


FUNCTIONS
- get x:			<= getter
- get x with y:		<= method w/param that returns a value
	- is the colon necessary?
- set x:			<= setter with implicit `value` argument
- set x with y		<= setter with explicit value argument `y`
- if we're doing _ between keywords, can we omit `with`?

`this` vs `my`
	- my requires "is" => "am" inversion
	- `I` ?
	- "the object is talking out loud to itself..."


"confirm {message:expression} (with {okButton:text} ((and|or) {cancelButton:text})? )?"
	- want result to flatten to `{ message, okButton, cancelButton }`

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
