Parser operation
----------------

- `TextStream` is a wrapper around a (long) string used to parse the text.
- `Token` is something that can be matched in the stream.
	- We don't distinguish here between `tokens` as keywords/etc and `tokens` as "rules".

To parse `text`
- Wrap `text` in a stream
- Go line by line
	- parse line as a `statement`



QUESTIONS
- are they `rules` or `tokens`???
- who accumulates matches?
- who eats whitespace?
- who deals with `repeat` and `optional`?
- how do we handle ambiguous alternatives?
