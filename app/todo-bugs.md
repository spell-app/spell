BUGS
> parser.compile("expression","the first item of myList is the foo of the bar of the baz")
=> "spell.getItem((myList == spell.get(baz, 'bar.foo')), 1)"

> parser.compile("expression", "a is 1 and b is 2")
=> "(a == (1 && (b == 2)))"

> parser.compile("expression", "the face of the card is 'down'")
=> "(card == 'down').face"

> parser.compile("statement", "append 1 to the end of myList")
=> "spell.append(theList.end, 1)"

> parser.compile("statement", "add 1 to the front of myList")
=> "spell.append(myList.front, 1)"	-- should be "spell.prepend(myList, 1)"

> parser.compile("backwards_if", "get a if true else get b")
=> "if (true) { get a() } else { it = b }"

> parser.compile("expression", "(1 + 1) + 2")
=> error
