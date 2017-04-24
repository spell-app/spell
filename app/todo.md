BUG
> parser.parse("expression","the first item of myList is the foo of the bar of the baz").toSource()
> "spell.getItem((myList == spell.get(baz, 'bar.foo')), 1)"


- better solution than `dontRecurse`
	- keep current rules in a stack and leftRecurse = check to see if we're already in that queue?
		- only a problem if we're recursing at the same point in the stream!
	- auto-detect when creating rules???
		- sequence where first rule is subrule w/same name as rule
		- note for expression we'll need to check on addExpression()

- draw sentence diagram of match
	- primary UI for parser testing
	- run tests in-browser (just checking output)
	- click on a test, see the output in sentence diagram form
	- drag to reorder nodes in the output diagram to rearrange the source text!


Rule.test()
- for complex rules (eg: ... if ... else), we have `rule.test()` which does a quick-and-dirty test to see if it's remotely possible that the rule will work.
- only implement a `rule.test()` if:
	- it's super quick (a single regular expression)
	- it's faster to do the `test()` than just evaluating the rule
- if there's no rule.test(), you'll have to evaluate the rule to see if it works.
- pretty much anything with a nested expression should have a `rule.test()`...



- combine Symbol and Keyword matches ?

- combine Alternatives w/Patterns into one
	- implies parser.optimize step???
	- only if no custom stuff?



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
