- SimpleExpression and CompoundExpression

- Rule.String => Rule.Symbol
- combine Symbol and Keyword matches ?

- combine Alternatives w/Patterns into one
	- implies parser.optimize step???
	- only if no custom stuff?


- Matched Alternatives should return matched rule instead (w/custom stuff on it somehow)

- result/argument processing is too squirrely


- combine regular expressions?
	http://stackoverflow.com/questions/9213237/combining-regular-expressions-in-javascript
	http://stackoverflow.com/questions/869809/combine-regexp

	- re.any and re.or
	- re.and, eg    combining keyword AND string



- instead of RuleSyntax doing a `Object.defineProperties`, compose a subclass???
	- `memoizedGetter` should be a lot smarter...

- remember which file each rule came from
	- global "RULE_FILE" in each file?


- stream.head continuously is expensive -- memoize?
