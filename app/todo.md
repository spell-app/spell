if {expression} then {statement}?
	- find "if" ... "(then|:)" ...
	- parse {expression} and {statement} in interstitial bits

	- sequence.parse():
		-



Rule.test()
- for complex rules (eg: ... if ... else), we have `rule.test()` which does a quick-and-dirty test to see if it's remotely possible that the rule will work.
- only implement a `rule.test()` if:
	- it's super quick (a single regular expression)
	- it's faster to do the `test()` than just evaluating the rule
- if there's no rule.test(), you'll have to evaluate the rule to see if it works.
- pretty much anything with a nested expression should have a `rule.test()`...



- SimpleExpression vs CompoundExpression?
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
