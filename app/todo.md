
- `rule.results` rather than `rule.args`  ?
- `rule` vs `result` (vs `tree node`???)

- better solution than `dontRecurse`
	- keep current rules in a stack and leftRecurse = check to see if we're already in that queue?
	- auto-detect when creating rules???


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
