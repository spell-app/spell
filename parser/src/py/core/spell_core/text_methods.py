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
from typing import TYPE_CHECKING

from spell_core.calendar_settings import CalendarSettings
from spell_core.date_methods import clock_time, day_words, local_time, numeric_day
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

        - Said in the program's language, the order of its parts the person's region's, its time on their clock:
          Spain's `7/11/26`, `9:14`, `sábado, 7 de noviembre de 2026` (`date_methods.py`, epic `language` P63).
        - In the local time, as javascript's:  a date alone is its midnight.
        - Anything that isn't a date stays as it is;  a style it doesn't know is `plain`.
        """
        if not isinstance(date_value, datetime | date):
            return date_value
        if style == "timestamp":
            return _timestamp(date_value)
        said = _DATE_STYLES.get(style, _DATE_STYLES["plain"])
        return said(local_time(date_value), self.message("language"), local_time(self.now()))

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
        """A date's day, short:  `11/7/25`, `11/7` this year, Spain's `7/11/25` -- HyperTalk's `the short date`."""
        return self.date_as(date_value, "short")

    def long_date(self, date_value: object) -> object:
        """A date's day, in full:  `Saturday, November 7, 2026` -- HyperTalk's `the long date`."""
        return self.date_as(date_value, "long")

    def abbreviated_date(self, date_value: object) -> object:
        """A date's day, its names cut short:  `Sat, Nov 7, 2026` -- HyperTalk's `the abbreviated date`."""
        return self.date_as(date_value, "abbreviated")

    def short_time(self, date_value: object) -> object:
        """A date's time of day:  `9:14 AM`, or `9:14` on a 24-hour clock -- HyperTalk's `the short time`.

        - A day alone is midnight.
        """
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

    if TYPE_CHECKING:

        def message(self, key: str, **values: object) -> str:
            """`MessageMethods`'s:  message `key` in the program's language."""
            ...


def _timestamp(when: date) -> str:
    """`when` as ISO 8601 in UTC, to the millisecond, as JavaScript's `toISOString()`.

    - A day alone is its midnight here.
    """
    moment = when if isinstance(when, datetime) else datetime(when.year, when.month, when.day)
    utc = moment.astimezone(UTC)
    return f"{utc:%Y-%m-%dT%H:%M:%S}.{utc.microsecond // 1000:03}Z"


# How a date says itself in each style, given it in the local time, the program's language and now:
# the twin of string.ts's `DATE_STYLES`
# - Each in the program's language, the person's region and their clock (`date_methods.py`, epic `language` P63):
#   `11/17` in the US, `17/11` in Spain;  `9:05 PM`, or `21:05` on a 24-hour clock.
# - `timestamp`, in UTC, is `_timestamp()`:  `date_as()` says it before reading the date as local time.
_DATE_STYLES: dict[str, Callable[[datetime, str, datetime], str]] = {
    "plain": lambda when, lang, now: day_words(when, lang, "long"),
    # the year only when it isn't this year
    "short": lambda when, lang, now: numeric_day(when, lang, with_year=when.year != now.year),
    "long": lambda when, lang, now: day_words(when, lang, "long", "long"),
    "abbreviated": lambda when, lang, now: day_words(when, lang, "short", "short"),
    "short time": lambda when, lang, now: clock_time(when, lang, seconds=False),
    "long time": lambda when, lang, now: clock_time(when, lang, seconds=True),
    "date and time": lambda when, lang, now: (
        f"{day_words(when, lang, 'short')}, {clock_time(when, lang, seconds=False)}"
    ),
    "timestamp": lambda when, lang, now: _timestamp(when),
    # as the reader's own language says a date:  `Nov 7, 2026` in the US, `7 nov 2026` in Spain
    "reader": lambda when, lang, now: day_words(when, CalendarSettings.language(), "short"),
}
