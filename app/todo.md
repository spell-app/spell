BUGS
> parser.parse("expression","the first item of myList is the foo of the bar of the baz").toSource()
> "spell.getItem((myList == spell.get(baz, 'bar.foo')), 1)"

> parser.parse("expression", "a is 1 and b is 2").toSource()
> "(a == (1 && (b == 2)))"


- addStatement() etc:
	- 3rd arg is object (props) or function (class)

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
	- only if no custom stuff (toSource, etc)?

- combine regular expressions?
	http://stackoverflow.com/questions/9213237/combining-regular-expressions-in-javascript
	http://stackoverflow.com/questions/869809/combine-regexp

	- re.any and re.or
	- re.and, eg    combining keyword AND string



- instead of RuleSyntax doing a `Object.defineProperties`, compose a subclass???
- `defineMemoized` as a property @modifier should be a lot smarter...

- remember which file each rule came from
	- global "RULE_FILE" in each file?

- stream.head continuously is expensive -- memoize?
