To get started
----------------
- Clone this repo
- `cd <repo location>`
- `npm install`


To compile code
----------------
- `cd <repo location>`
- `npm run watch`


To test
----------------
- `cd <repo location>`
- `npm test`

to run one test:

- `jest src/RuleSyntax.test.js`

for test coverage:

- `jest --coverage`



Parser operation
----------------

To parse English text

- parser.parse("a = 1")
	- returns the syntax tree, easiest for now to inspect it in the console

or

- parser.parse("expression", "a = 1")
	- parse "text" as a specific rule type


To "compile" text into javascript:

- parser.compile("a = 1")
- parser.parse("expression", "a = 1")


Rule
----
- `Rule`s match specific characters/logical structures in a `textStream`.
- Simple rules are composed into larger rules, for example:
	- `identifier` is a simple rule satisified with a regular expression,
	- `{literal-value}` is a rule satisfied with one alternative of a set of regular expressions, while
	- `{identifier} = {literal-value}` is a `statement` rule which uses the above as subrules.
- Rules come in various flavors:
	- `Keyword`s match a literal string.
	- `Pattern`s match a regular expression.
	- `Subrule`s match another rule, specified by rule name.
	- `Sequence`s match a sequence of named rules and/or keywords.
	- `Alternatives` match one or more of a set of alternative rules.
	- `List`s match a delmited list of items.
- You'll generally specify rules using our `RuleSyntax`, which is a human-friendly way
	of specifying a sequence of rules as a string, e.g.
	- `{identifier} = {literal-value}` creates a `sequence` of
		1. `identifier` subrule
		2. `=` keyword
		3. `literal-value` subrule

RuleSyntax
----------
- All rules are stored in the `src/rules` directory.
- Test files live next to the rule files they cover.
- To include a rule file in the browser
	- add it as an `import()` in `src/rules/all.js`

| Syntax		| Description |
|---------------|-------------|
| `{...}`		| Curly braces indicate that we should match a named subrule here. |
| `(...)`		| Parenthesis indicate a parenthesized expression, often a set of `Alternatives` or used to make a rule optional (see below). |
| `[...]`		| Indicates a `List` expresion. |
| `(...|...)`	| A vertical pipe, generally found inside parenthesis, indicates a set of `Alternatives`, any one of which will work.
| `...?`		| A question mark indicates that the preceding rule is optional. |
| `...*`		| An asterisk indicates that the preceding rule is optional, and may repeat one or more times. |
| `...+`		| A plus indicates that the preceding rule is required, and MAY be repeated. |
| whitespace	| Whitespace is used for nesting blocks and separating pattern/keyword rules, and is automatically consumed. **NOTE: Use `tab` characters for nesting.** |
| anything else	| Pretty much anything else indicates a keyword or symbol, which may be punctuation, e.g. `=`, or english words `is`, `not`, `play`, etc. |


License
-------
[MIT License](https://opensource.org/licenses/MIT)

Copyright &copy; 2017 Matthew Owen Williams
