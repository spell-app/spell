"""Text:  what spell's `as upper case`, `as lower case` and `as title case` compile to, where the value may be nothing;
and dates said as text, `&` and `&&`.

```python
core.upper_case(core.get_item_at(self.rank, 0))   # "Q" for "queen";  "" for no rank
```

- Python's own `.upper()` is the word where the Python writer knows it has text.
- The twins of the JavaScript core's `string.ts`.
"""

import re
from collections.abc import Callable
from datetime import UTC, date, datetime

from spell_core.js_text import js_string

# A word's first letter, after the start or anything but a letter, digit, `_` or apostrophe (the twin of string.ts's)
_TITLE_CASE_WORD_START = re.compile(r"(^|[^\w'\u2019])([^\W\d_])")


class TextMethods:
    """`core`'s text words:  `upper_case()`, `lower_case()`, `title_case()`, `unicode()`, and dates as text."""

    # how the program shows a date it draws or joins to text:  `show_dates_as()`
    _shown_dates: str = "plain"

    def date_shown(self, date_value: object) -> object:
        """A date for people to read, as the program shows dates:  `November 7, 2026` unless it says otherwise.

        - Anything that isn't a date stays as it is.
        """
        return self.date_as(date_value, self._shown_dates)

    def show_dates_as(self, style: str) -> None:
        """Show every date the program draws or joins to text as `style`:  `dates are shown as short dates`."""
        self._shown_dates = style if style in _DATE_STYLES else "plain"

    def date_as(self, date_value: object, style: str) -> object:
        """`date_value` said as `style`, e.g. `11/7/26` for `short`:  the twin of string.ts's `dateAs()`.

        - Anything that isn't a date stays as it is;  a style it doesn't know is `plain`.
        """
        if not isinstance(date_value, datetime | date):
            return date_value
        return _DATE_STYLES.get(style, _DATE_STYLES["plain"])(date_value)

    def now(self) -> datetime:
        """This moment, as a date:  what spell's `now` compiles to."""
        return datetime.now()

    def joined(self, left: object, right: object, separator: str = "") -> str:
        """`left` and `right` joined into one text, `separator` between:  `&` and `&&` (HyperTalk's).

        - Each said as a drawing says it:  a date as the program shows dates, `None` as `""`.
        """
        return f"{self._joinable(left)}{separator}{self._joinable(right)}"

    def _joinable(self, value: object) -> str:
        """`value` as `joined()` puts it in text."""
        return "" if value is None else js_string(self.date_shown(value))

    def short_date(self, date_value: object) -> object:
        """A date's day, short:  `11/7/26` -- HyperTalk's `the short date`."""
        return self.date_as(date_value, "short")

    def long_date(self, date_value: object) -> object:
        """A date's day, in full:  `Saturday, November 7, 2026` -- HyperTalk's `the long date`."""
        return self.date_as(date_value, "long")

    def abbreviated_date(self, date_value: object) -> object:
        """A date's day, its names cut short:  `Sat, Nov 7, 2026` -- HyperTalk's `the abbreviated date`."""
        return self.date_as(date_value, "abbreviated")

    def short_time(self, date_value: object) -> object:
        """A date's time of day:  `9:14 AM` -- HyperTalk's `the short time`.  A day alone is midnight."""
        return self.date_as(date_value, "short time")

    def long_time(self, date_value: object) -> object:
        """A date's time of day, to the second:  `9:14:42 AM` -- HyperTalk's `the long time`."""
        return self.date_as(date_value, "long time")

    def timestamp(self, date_value: object) -> object:
        """A date as an ISO 8601 timestamp, in UTC:  `2026-11-07T17:14:42.000Z`."""
        return self.date_as(date_value, "timestamp")

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


def _clock_time(when: date, *, seconds: bool) -> str:
    """`when`'s time on a 12-hour clock, `9:14 AM` (`9:14:42 AM` with `seconds`):  a day alone is midnight.

    - The twin of string.ts's `clockTime()`.
    """
    hour, minute, second = (when.hour, when.minute, when.second) if isinstance(when, datetime) else (0, 0, 0)
    shown = f"{hour % 12 or 12}:{minute:02}" + (f":{second:02}" if seconds else "")
    return f"{shown} {'AM' if hour < 12 else 'PM'}"


def _timestamp(when: date) -> str:
    """`when` as ISO 8601 in UTC, to the millisecond, as JavaScript's `toISOString()`.

    - A day alone is its midnight here.
    """
    moment = when if isinstance(when, datetime) else datetime(when.year, when.month, when.day)
    utc = moment.astimezone(UTC)
    return f"{utc:%Y-%m-%dT%H:%M:%S}.{utc.microsecond // 1000:03}Z"


# How a date says itself in each style:  the twin of string.ts's `DATE_STYLES`
_DATE_STYLES: dict[str, Callable[[date], str]] = {
    "plain": lambda when: f"{when:%B} {when.day}, {when.year}",
    "short": lambda when: f"{when.month}/{when.day}/{when:%y}",
    "long": lambda when: f"{when:%A}, {when:%B} {when.day}, {when.year}",
    "abbreviated": lambda when: f"{when:%a}, {when:%b} {when.day}, {when.year}",
    "short time": lambda when: _clock_time(when, seconds=False),
    "long time": lambda when: _clock_time(when, seconds=True),
    "timestamp": _timestamp,
    "reader": lambda when: f"{when:%x}",
}
