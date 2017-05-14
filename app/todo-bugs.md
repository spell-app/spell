BUGS
> parser.parse("expression","the first item of myList is the foo of the bar of the baz").toSource()
=> "spell.getItem((myList == spell.get(baz, 'bar.foo')), 1)"

> parser.parse("expression", "a is 1 and b is 2").toSource()
=> "(a == (1 && (b == 2)))"

> parser.parse("expression", "the face of the card is 'down'").toSource()
=> "(card == 'down').face"

> parser.parse("statement", "append 1 to the end of myList")
=> "spell.append(theList.end, 1)"

> parser.parse("statement", "add 1 to the front of myList")
=> "spell.append(myList.front, 1)"	-- should be "spell.prepend(myList, 1)"

> parser.parse("backwards_if", "get a if true else get b")
=> "if (true) { get a() } else { it = b }"
