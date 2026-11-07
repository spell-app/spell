"""Text:  what spell's `as upper case`, `as lower case` and `as title case` compile to, where the value may be nothing.

```python
core.upper_case(core.get_item_at(self.rank, 0))   # "Q" for "queen";  "" for no rank
```

- Python's own `.upper()` is the word where the Python writer knows it has text.
- The twins of the JavaScript core's `string.ts`.
"""

import re

from spell_core.js_text import js_string

# A word's first letter, after the start or anything but a letter, digit, `_` or apostrophe (the twin of string.ts's)
_TITLE_CASE_WORD_START = re.compile(r"(^|[^\w'\u2019])([^\W\d_])")


class TextMethods:
    """`core`'s text words:  `upper_case()`, `lower_case()`, `title_case()`, `unicode()`."""

    def upper_case(self, text: object) -> str:
        """`text` as text, in UPPER CASE:  `{x} as upper case`.

        - `None` is `""`, as JavaScript's `${x ?? ""}`.
        - Anything else as JavaScript writes it:  `True` is `TRUE`.
        """
        return "" if text is None else js_string(text).upper()

    def lower_case(self, text: object) -> str:
        """`text` as text, in lower case:  `{x} as lower case`.

        - `None` is `""`.
        """
        return "" if text is None else js_string(text).lower()

    def title_case(self, text: object) -> str:
        """`text` as text, each word's first letter a capital:  `{x} as title case`.

        - `None` is `""`.
        - Only first letters change:  `"NASA rocket"` is `"NASA Rocket"`.
        - A word starts after anything but a letter, digit, `_` or apostrophe:  `"jean-luc's"` is `"Jean-Luc's"`.
        """
        if text is None:
            return ""
        return _TITLE_CASE_WORD_START.sub(lambda m: m.group(1) + m.group(2).upper(), js_string(text))

    def unicode(self, code: object) -> str:
        """The character with unicode code point `code`, e.g. `"🂠"` for `0x1F0A0`:  `unicode {number}`.

        - `""` for `None`, or what's no code point (not a whole number, or past `0x10FFFF`).
        - The twin of the JavaScript core's `unicode()`.
        """
        if code is None or isinstance(code, bool):
            return ""
        try:
            point = float(code)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return ""
        if not point.is_integer() or point < 0 or point > 0x10FFFF:
            return ""
        return chr(int(point))
