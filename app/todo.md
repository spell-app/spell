-

- stream.head continuously is expensive -- memoize?
- start match is MUCH more efficient
	- define without start and then auto-add when using?

- convert Rule.String to Regex?


- combine regular expressions?
	http://stackoverflow.com/questions/9213237/combining-regular-expressions-in-javascript
	http://stackoverflow.com/questions/869809/combine-regexp

	- re.any and re.or
	- re.and, eg    combining keyword AND string


- result/argument processing is too squirrely

- instead of RuleSyntax doing a `Object.defineProperties`, compose a subclass???
	- `memoizedGetter` should be a lot smarter...

- normalize whitespace before parsing a line?  makes for simple regexes...

- remember which file each rule came from
	- global "RULE_FILE" in each file?
