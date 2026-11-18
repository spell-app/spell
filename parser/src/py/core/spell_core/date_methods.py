"""Dates and times in a running program (epic `language` P63):  a date's parts, a date said as text the person's way,
the time zone, how long ago or from now, and working with dates.

```python
core.month_of(core.now())                   # "November";  "noviembre" in a Spanish program
core.time_from_now(its_due)                 # "in 2 days, 3 hours"
core.add_to_date(core.now(), 2, "day")      # two days from now
```

- The twin of the JavaScript core's `dates.ts`;  both say `tests/core/dates.expected.json5`.
- Names follow the PROGRAM's language (`core.message("language")`):  `November`, Spanish `noviembre`.
- Formats follow the PERSON's region, first day of the week and clock (`CalendarSettings`):
  `11/17` in the US, `17/11` in Spain;  `9:05 PM` or `21:05`.
- Python has no `Intl`:  the words are here, in English and Spanish, as `Intl` says them.
  - Another language is said in English, in the person's region's order.
- A part is a NUMBER with no leading zero:  `the minute of 9:05` is 5;  `as two digits` makes it `05`.
- Anything that isn't a date stays as it is, so `None` stays `None`.
- A date is a `datetime`, or a `date` alone (its midnight);  each read in the local time, as javascript's are.
- A duration is a number of seconds here:  the compiler converts a measure in another unit first.
- What it reads of `core`:  `now()` (`text_methods.py`), so a test can stop the clock;  `message()`.
- NEVER imports `text_methods`:  it imports the words from here.
"""

import calendar
import math
import os
import re
import time
from datetime import date, datetime, timedelta
from typing import TYPE_CHECKING, Literal, TypeGuard

from spell_core.calendar_settings import CalendarSettings

# Seconds in each unit a duration is said in, biggest first.
PART_SECONDS: dict[str, int] = {"days": 86_400, "hours": 3600, "minutes": 60, "seconds": 1}

# The core's name for each duration unit (spell's `SP.CORE_TIME_UNITS`'s ids) => its seconds.
UNIT_SECONDS: dict[str, float] = {
    "millisecond": 0.001,
    "tick": 1 / 60,
    "second": 1,
    "minute": 60,
    "hour": 3600,
    "day": 86_400,
}

# A day alone, `2026-12-25`:  that day's midnight where it's read, not UTC's.
_DAY_ALONE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# How a duration is said:  its two biggest parts, one part rounded, or every part to the second.
type DurationStyle = Literal["normal", "short", "long"]

# How the time zone is said:  `New York`, `EST`, `Eastern Standard Time`.
type ZoneForm = Literal["city", "short", "long"]


class DateMethods:
    """`core`'s date methods:  what compiled code calls for a date's parts and words."""

    ################
    # ## Parts:  numbers
    ################

    def year_of(self, when: object) -> object:
        """A date's year, e.g. `2026`:  `the year of now`."""
        return local_time(when).year if is_date(when) else when

    def short_year_of(self, when: object) -> object:
        """A date's year in two digits' worth, e.g. `26`, `5` for 2005:  `the short year of now`."""
        return local_time(when).year % 100 if is_date(when) else when

    def month_number_of(self, when: object) -> object:
        """A date's month, counting January as 1:  `the month number of now`."""
        return local_time(when).month if is_date(when) else when

    def day_of(self, when: object) -> object:
        """A date's day of the month, 1 to 31:  `the day of now`."""
        return local_time(when).day if is_date(when) else when

    def hour_of(self, when: object) -> object:
        """A date's hour, 0 to 23, whatever clock the person reads:  `the hour of now`."""
        return local_time(when).hour if is_date(when) else when

    def minute_of(self, when: object) -> object:
        """A date's minute, 0 to 59:  `the minute of now`."""
        return local_time(when).minute if is_date(when) else when

    def second_of(self, when: object) -> object:
        """A date's second, 0 to 59:  `the second of now`."""
        return local_time(when).second if is_date(when) else when

    def week_of(self, when: object) -> object:
        """A date's week of the year, ISO's way, the same for everyone:  `the week of now`, 1 to 53."""
        return local_time(when).isocalendar().week if is_date(when) else when

    def weekday_number_of(self, when: object) -> object:
        """A date's day of the week as a number, 1 to 7, counted from the person's first day of the week.

        - `the weekday number of now`:  Tuesday is 3 in the US and 2 in Spain.
        """
        if not is_date(when):
            return when
        return (local_time(when).isoweekday() - CalendarSettings.first_day() + 7) % 7 + 1

    ################
    # ## Parts:  names
    ################

    def month_of(self, when: object) -> object:
        """A date's month, by name in the program's language:  `November`, `noviembre` -- `the month of now`."""
        return month_name(local_time(when), self._language(), "long") if is_date(when) else when

    def short_month_of(self, when: object) -> object:
        """A date's month, its name cut short:  `Nov`, `nov` -- `the short month of now`."""
        return month_name(local_time(when), self._language(), "short") if is_date(when) else when

    def weekday_of(self, when: object) -> object:
        """A date's day of the week, by name:  `Tuesday`, `martes` -- `the weekday of now`."""
        return weekday_name(local_time(when), self._language(), "long") if is_date(when) else when

    def short_weekday_of(self, when: object) -> object:
        """A date's day of the week, its name cut short:  `Tue`, `mar` -- `the short weekday of now`."""
        return weekday_name(local_time(when), self._language(), "short") if is_date(when) else when

    def meridiem_of(self, when: object) -> object:
        """Whether a date's time is before noon or after:  `the meridiem of now`.

        - `AM` or `PM`;  Spanish `a. m.`, `p. m.`
        """
        return meridiem(local_time(when), self._language()) if is_date(when) else when

    def is_am(self, when: object) -> bool:
        """Is a date's time before noon:  `if now is AM`."""
        return is_date(when) and local_time(when).hour < 12

    def is_pm(self, when: object) -> bool:
        """Is a date's time noon or after:  `if now is PM`."""
        return is_date(when) and local_time(when).hour >= 12

    ################
    # ## The time zone
    ################

    def time_zone(self, form: ZoneForm = "city") -> str:
        """The person's time zone, said one of three ways:

        - `city`:  `New York` -- `the time zone`
        - `short`:  `EST`, or `GMT-5` where the system has no letters for it -- `the short time zone`
        - `long`:  `Eastern Standard Time`, in the program's language -- `the long time zone`
          - Python has no names for zones:  a few common ones are here, else the short form.
        - This machine's, now:  best effort, from `TZ` or the system's own zone.
        """
        if form == "city":
            zone = _zone_id()
            return zone if zone == "UTC" or "/" not in zone else zone.split("/")[-1].replace("_", " ")
        short = _short_zone()
        if form == "short":
            return short
        return _ZONE_NAMES.get(short, {}).get(_words_of(self._language()), short)

    ################
    # ## Leading zeros
    ################

    def two_digits(self, number: object) -> object:
        """A whole number in at least two digits, as text:  `5` is `05`, `12` stays `12` -- `as two digits`.

        - A negative one keeps its sign in front:  `-5` is `-05`.
        - Anything that isn't a number stays as it is.
        """
        if not _is_number(number):
            return number
        digits = f"{math.trunc(abs(number)):02}"
        return f"-{digits}" if number < 0 else digits

    ################
    # ## How long ago, or from now
    ################

    def time_from_now(self, when: object, style: DurationStyle = "normal", unit: str | None = None) -> object:
        """`when` said as how long ago it was or how long until it is:  `<date> as a duration`.

        - `normal`:  its two biggest parts, `in 2 days, 3 hours`, `30 minutes ago`;  one part alone as `tomorrow`,
          `yesterday`, `in 2 days`
        - `short`:  rounded to the scale, one part:  `1 day ago` for 23 hours 46 minutes, `in 2 weeks`, `in 3 months`
        - `long`:  every part, exact to the second:  `23 hours, 46 minutes, 35 seconds ago`
        - `unit`:  in that unit, rounded:  `in 3 days`, `tomorrow` (a duration unit's id:  `day`, `hour` ...)
        - Weeks, months and years are only words here:  a month has no fixed length, so it's never a duration's unit.
        """
        if not is_date(when):
            return when
        lang = self._language()
        seconds = (instant(when) - instant(self.now())).total_seconds()
        if unit:
            return _relative_in(seconds, unit, lang)
        if style == "short" or abs(seconds) >= 26 * PART_SECONDS["days"]:
            return self._roughly_from_now(local_time(when), seconds)
        parts = parts_of(abs(seconds), 4 if style == "long" else 2)
        if len(parts) < 2:
            return self._roughly_from_now(local_time(when), seconds)
        key = "duration-ago" if seconds < 0 else "duration-from-now"
        return self.message(key, time=duration_words(parts, lang))

    def duration_text(self, seconds: object, style: DurationStyle = "normal", unit: str | None = None) -> object:
        """A duration said as text:  `(its due - now) as a duration`, `2 days, 3 hours`.

        - `seconds`:  how long, in seconds -- the compiler converts a measure in another unit first.
        - `normal`, its two biggest parts;  `short`, one part, rounded;  `long`, every part to the second;
          `unit`, in that unit (`in days`:  `3 days`).
        """
        if not _is_number(seconds):
            return seconds
        lang = self._language()
        sign = "-" if seconds < 0 else ""
        away = abs(seconds)
        if unit:
            part = f"{unit}s"
            amount = js_round(away / UNIT_SECONDS.get(unit, 1))
            return sign + duration_words([(part if part in PART_SECONDS else "seconds", amount)], lang)
        parts = parts_of(away, 4 if style == "long" else 1 if style == "short" else 2)
        return sign + duration_words(parts or [("seconds", 0)], lang)

    ################
    # ## Working with dates
    ################

    def add_to_date(self, when: object, amount: object, unit: str = "second") -> object:
        """`when` moved by `amount` of duration unit `unit`:  `now + 2 days`, `its due - 1 hour` (`amount` negative).

        - Days move the calendar, so a day is still a day across a change of clocks;  the rest move the time.
        - A date alone moves from its midnight.
        """
        if not is_date(when) or not _is_number(amount):
            return when
        moment = when if isinstance(when, datetime) else local_time(when)
        if unit == "day" and float(amount).is_integer():
            return moment + timedelta(days=int(amount))
        return moment + timedelta(seconds=amount * UNIT_SECONDS.get(unit, 1))

    def seconds_between(self, later: object, earlier: object) -> float | None:
        """How long from `earlier` to `later`, in seconds:  `the next weekend - now`, a duration."""
        if not is_date(later) or not is_date(earlier):
            return None
        return _whole_if_can((instant(later) - instant(earlier)).total_seconds())

    def duration_part_of(self, seconds: object, part: str) -> object:
        """One part of a duration of `seconds`, a whole number:  `the hours of its time left`.

        - `days`, all of them;  `hours`, 0 to 23;  `minutes` and `seconds`, 0 to 59.
        - A duration that's gone by (negative) gives parts below 0.
        """
        if not _is_number(seconds):
            return seconds
        whole = math.trunc(abs(seconds))
        value = whole // PART_SECONDS["days"] if part == "days" else _part_within(whole, part)
        return -value if seconds < 0 and value else value

    def is_weekend_day(self, when: object) -> bool:
        """Is `when` a day of the person's region's weekend:  `if now is a weekend day`."""
        return is_date(when) and local_time(when).isoweekday() in CalendarSettings.weekend()

    def next_weekend(self) -> datetime:
        """When the next weekend starts:  the midnight its first day begins, after today -- `the next weekend`.

        - On a weekend day it's the weekend after.
        """
        weekend = CalendarSettings.weekend()
        # the weekend's first day:  the one whose day before isn't a weekend day
        first = next((day for day in weekend if (day + 5) % 7 + 1 not in weekend), weekend[0] if weekend else 6)
        today = start_of(local_time(self.now()))
        for ahead in range(1, 8):
            day = today + timedelta(days=ahead)
            if day.isoweekday() == first:
                return day
        return today

    def is_before(self, when: object, other: object) -> bool:
        """Is `when` earlier than `other`:  `if its due is before now`."""
        return is_date(when) and is_date(other) and instant(when) < instant(other)

    def is_after(self, when: object, other: object) -> bool:
        """Is `when` later than `other`:  `if its due is after now`."""
        return is_date(when) and is_date(other) and instant(when) > instant(other)

    def is_same_day(self, when: object, other: object) -> bool:
        """Are `when` and `other` on the same day, whatever their times:  `if its due is the same day as now`."""
        return is_date(when) and is_date(other) and local_time(when).date() == local_time(other).date()

    def is_days_from_today(self, when: object, offset: int) -> bool:
        """Is `when` `offset` days from today:  `is today` (0), `is tomorrow` (1), `is yesterday` (-1)."""
        return is_date(when) and self._days_from_today(when) == offset

    def days_until(self, when: object) -> object:
        """How many days until `when`, counting midnights:  11 PM to 1 AM is 1 -- `the days until its due`."""
        return self._days_from_today(when) if is_date(when) else when

    def days_since(self, when: object) -> object:
        """How many days since `when`, counting midnights -- `the days since its added`."""
        return -self._days_from_today(when) if is_date(when) else when

    def start_of_day(self, when: object) -> object:
        """The midnight `when`'s day starts at:  `the start of the day of now`."""
        return start_of(local_time(when)) if is_date(when) else when

    def end_of_day(self, when: object) -> object:
        """The last moment of `when`'s day, 11:59:59.999 PM:  `the end of the day of now`."""
        if not is_date(when):
            return when
        return local_time(when).replace(hour=23, minute=59, second=59, microsecond=999_000)

    def days_in_month(self, when: object) -> object:
        """How many days `when`'s month has, 28 to 31:  `the days in the month of now`."""
        if not is_date(when):
            return when
        moment = local_time(when)
        return calendar.monthrange(moment.year, moment.month)[1]

    def date_from(self, text: object) -> datetime | None:
        """`text` read as a date:  `"2026-12-25" as a date`.

        - ISO 8601's forms:  `2026-12-25`, `2026-12-25T10:00`, `2026-12-25T15:00:00.000Z`;
          a number is milliseconds since 1970, as javascript's.
        - A day alone is that day's midnight where it's read, not UTC's (as a saved date is).
        - A date stays itself;  `None`, or text that isn't a date, is `None`.
        """
        if is_date(text):
            return local_time(text) if not isinstance(text, datetime) else text
        if _is_number(text):
            return datetime.fromtimestamp(text / 1000)
        if not isinstance(text, str):
            return None
        written = text.strip()
        try:
            return datetime.fromisoformat(f"{written}T00:00" if _DAY_ALONE.match(written) else written)
        except ValueError:
            return None

    ################
    # ## Formats
    ################

    def date_locale(self) -> str:
        """The locale dates are said in:  the program's language in the person's region, `en-US`, `es-ES`, `es-US`.

        - So names follow the program, and the order of day and month the person.
        """
        return CalendarSettings.locale_for(self._language())

    def clock_options(self) -> dict[str, str]:
        """`Intl`'s options for a time of day on the person's clock:  `hourCycle` `h23` for a 24-hour clock, else `h12`.

        - The JavaScript's own shape, for what reads it the same way.
        """
        return {"hourCycle": "h23" if CalendarSettings.uses_24_hour_clock() else "h12"}

    ################
    # ## Helpers
    ################

    def _language(self) -> str:
        """The program's language, `en`:  its messages'."""
        return self.message("language")

    def _days_from_today(self, when: date) -> int:
        """Whole days from today's midnight to `when`'s."""
        return days_between(start_of(local_time(self.now())), start_of(local_time(when)))

    def _roughly_from_now(self, when: datetime, seconds: float) -> str:
        """`when`, `seconds` from now, rounded to its scale, as Moment.js rounds.

        - under 45 seconds in seconds (`now`), under 45 minutes in minutes, under 22 hours in hours
        - then days by the calendar (`today`, `tomorrow`, `yesterday`)
        - then weeks under 26 days, months under 320, then years
        """
        lang = self._language()
        away = abs(seconds)
        if away < 45:
            return relative(js_round(seconds), "second", lang)
        if away < 45 * 60:
            return relative(js_round(seconds / 60), "minute", lang)
        if away < 22 * 3600:
            return relative(js_round(seconds / 3600), "hour", lang)
        days = self._days_from_today(when)
        if abs(days) < 7:
            return relative(days, "day", lang)
        if abs(days) < 26:
            return relative(js_round(days / 7), "week", lang)
        if abs(days) < 320:
            return relative(js_round(days / 30.44), "month", lang)
        return relative(js_round(days / 365.25), "year", lang)

    if TYPE_CHECKING:

        def now(self) -> datetime:
            """`TextMethods`'s:  this moment."""
            ...

        def message(self, key: str, **values: object) -> str:
            """`MessageMethods`'s:  message `key` in the program's language."""
            ...


################
# ## Reading dates
################


def is_date(value: object) -> TypeGuard[date]:
    """Is `value` a date:  a `datetime`, or a `date` alone."""
    return isinstance(value, date)


def local_time(when: object) -> datetime:
    """`when` in the local time, with no zone of its own:  a date alone is its midnight;  an aware one, converted."""
    if isinstance(when, datetime):
        return when.astimezone().replace(tzinfo=None) if when.tzinfo else when
    if isinstance(when, date):
        return datetime(when.year, when.month, when.day)
    raise TypeError(f"local_time():  {when!r} isn't a date;  check is_date() first")


def instant(when: object) -> datetime:
    """`when` as a moment, with its zone:  a date with none is in the local time.  To compare or subtract."""
    moment = local_time(when) if not isinstance(when, datetime) else when
    return moment if moment.tzinfo else moment.astimezone()


def start_of(when: datetime) -> datetime:
    """The midnight `when`'s day starts at."""
    return when.replace(hour=0, minute=0, second=0, microsecond=0)


def days_between(start: datetime, end: datetime) -> int:
    """Whole days from `start` to `end`, two local midnights."""
    return js_round((end - start).total_seconds() / 86_400)


def js_round(number: float) -> int:
    """`number` rounded as javascript's `Math.round()`:  halves up, `2.5` is 3 and `-2.5` is -2 (not Python's 2)."""
    return math.floor(number + 0.5)


def _is_number(value: object) -> TypeGuard[int | float]:
    """Is `value` a finite number, not a boolean:  javascript's `typeof value === "number"`, finite."""
    return isinstance(value, int | float) and not isinstance(value, bool) and math.isfinite(value)


def _whole_if_can(number: float) -> float:
    """`number`, an `int` when it's whole:  `3607`, not `3607.0`."""
    return int(number) if number.is_integer() else number


################
# ## Durations
################


def _part_within(whole: int, part: str) -> int:
    """Part `part` of `whole` seconds, within the part above it:  `hours` 0 to 23."""
    size = PART_SECONDS.get(part, 1)
    above = {"hours": PART_SECONDS["days"], "minutes": PART_SECONDS["hours"]}.get(part, PART_SECONDS["minutes"])
    return (whole % above) // size


def parts_of(seconds: float, count: int) -> list[tuple[str, int]]:
    """`seconds` cut into its biggest `count` parts, the last rounded:  2 parts of 95,000 seconds are `1 day, 2 hours`.

    - Parts that are 0 at the end are left out, but never one between two others.
    """
    units = list(PART_SECONDS)
    first = next((index for index, unit in enumerate(units) if seconds >= PART_SECONDS[unit]), -1)
    if first < 0:
        return []
    last = min(first + count - 1, len(units) - 1)
    smallest = PART_SECONDS[units[last]]
    left = js_round(seconds / smallest) * smallest
    # rounding up may reach the unit above:  23 hours 46 minutes, in one part, is `1 day`
    biggest = next(index for index, unit in enumerate(units) if left >= PART_SECONDS[unit])
    parts: list[tuple[str, int]] = []
    for unit in units[biggest : last + 1]:
        amount = left // PART_SECONDS[unit]
        left -= amount * PART_SECONDS[unit]
        parts.append((unit, amount))
    # what rounded away to nothing at the end isn't said:  `1 day`, not `1 day, 0 hours`
    while len(parts) > 1 and parts[-1][1] == 0:
        parts.pop()
    return parts


def duration_words(parts: list[tuple[str, int]], lang: str) -> str:
    """`parts` in words, in `lang`:  `1 day, 2 hours`, Spanish `1 día y 2 horas`, as `Intl.DurationFormat` says them.

    - A part that's 0 isn't said, as `Intl`'s isn't:  `2 days, 5 minutes`;  nothing at all is `""`.
    """
    words = _words_of(lang)
    said = [_amount_of(amount, unit[:-1], words) for unit, amount in parts if amount]
    if words == "es" and len(said) > 1:
        return f"{', '.join(said[:-1])} y {said[-1]}"
    return ", ".join(said)


################
# ## Words
################

# Each language's words:  months, days of the week (Monday first), units, the meridiem, how long ago or from now.
_WORDS: dict[str, dict[str, list[str]]] = {
    "en": {
        "months": [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ],
        "short months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "weekdays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        "short weekdays": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    "es": {
        "months": [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre",
        ],
        "short months": ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"],
        "weekdays": ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
        "short weekdays": ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"],
    },
}

# Each unit, one and many, by language.
_UNITS: dict[str, dict[str, tuple[str, str]]] = {
    "en": {
        "second": ("second", "seconds"),
        "minute": ("minute", "minutes"),
        "hour": ("hour", "hours"),
        "day": ("day", "days"),
        "week": ("week", "weeks"),
        "month": ("month", "months"),
        "year": ("year", "years"),
    },
    "es": {
        "second": ("segundo", "segundos"),
        "minute": ("minuto", "minutos"),
        "hour": ("hora", "horas"),
        "day": ("día", "días"),
        "week": ("semana", "semanas"),
        "month": ("mes", "meses"),
        "year": ("año", "años"),
    },
}

# What `Intl.RelativeTimeFormat` says, `numeric: "auto"`, for an amount it has a word for:  `tomorrow`, `ayer`.
_RELATIVE_WORDS: dict[str, dict[tuple[str, int], str]] = {
    "en": {
        ("second", 0): "now",
        ("minute", 0): "this minute",
        ("hour", 0): "this hour",
        ("day", -1): "yesterday",
        ("day", 0): "today",
        ("day", 1): "tomorrow",
        **{
            (unit, amount): f"{word} {unit}"
            for unit in ("week", "month", "year")
            for amount, word in ((-1, "last"), (0, "this"), (1, "next"))
        },
    },
    "es": {
        ("second", 0): "ahora",
        ("minute", 0): "este minuto",
        ("hour", 0): "esta hora",
        ("day", -2): "anteayer",
        ("day", -1): "ayer",
        ("day", 0): "hoy",
        ("day", 1): "mañana",
        ("day", 2): "pasado mañana",
        ("week", -1): "la semana pasada",
        ("week", 0): "esta semana",
        ("week", 1): "la próxima semana",
        ("month", -1): "el mes pasado",
        ("month", 0): "este mes",
        ("month", 1): "el próximo mes",
        ("year", -1): "el año pasado",
        ("year", 0): "este año",
        ("year", 1): "el próximo año",
    },
}

# Where a Spanish time says `a.m.`, as `Intl`'s `es-US` and `es-MX` do, not Spain's `a. m.`.
_SPANISH_CLOSE_MERIDIEM = {"US", "MX", "BR"}

# Where a 24-hour clock writes its hour in two digits, `09:05`:  English where the region's own clock is 12 hours,
# and these regions' Spanish
_SPANISH_TWO_DIGIT_HOURS = {"US", "MX", "AR", "CL", "PE"}


def _words_of(lang: str) -> str:
    """The words `lang` is said in:  `es` for Spanish, else `en`."""
    return "es" if lang.lower().startswith("es") else "en"


def month_name(when: datetime, lang: str, form: Literal["long", "short"]) -> str:
    """`when`'s month, by name in `lang`:  `November`, `Nov`, `noviembre`, `nov`."""
    return _WORDS[_words_of(lang)]["months" if form == "long" else "short months"][when.month - 1]


def weekday_name(when: datetime, lang: str, form: Literal["long", "short"]) -> str:
    """`when`'s day of the week, by name in `lang`:  `Tuesday`, `Tue`, `martes`, `mar`."""
    return _WORDS[_words_of(lang)]["weekdays" if form == "long" else "short weekdays"][when.weekday()]


def meridiem(when: datetime, lang: str) -> str:
    """`AM` or `PM` in `lang` and the person's region:  `AM`, `am` (English, day first), `a. m.`, `a.m.` (`es-US`)."""
    morning = when.hour < 12
    if _words_of(lang) == "es":
        close = CalendarSettings.region() in _SPANISH_CLOSE_MERIDIEM
        return ("a.m." if morning else "p.m.") if close else ("a. m." if morning else "p. m.")
    said = "AM" if morning else "PM"
    return said if CalendarSettings.calendar().month_first else said.lower()


def _count(amount: int, words: str) -> str:
    """`amount` as `Intl` writes it:  `1,234` in English;  `1234`, `12.345` in Spanish."""
    if words == "es":
        return f"{amount:,}".replace(",", ".") if abs(amount) >= 10_000 else str(amount)
    return f"{amount:,}"


def _amount_of(amount: int, unit: str, words: str) -> str:
    """`amount` of `unit`:  `1 day`, `2 días`."""
    one, many = _UNITS[words][unit]
    return f"{_count(amount, words)} {one if amount == 1 else many}"


def relative(amount: int, unit: str, lang: str) -> str:
    """`amount` of `unit` from now, in `lang`, as `Intl.RelativeTimeFormat` says it.

    - `in 2 days`, `tomorrow`, `hace 3 horas`
    """
    words = _words_of(lang)
    word = _RELATIVE_WORDS[words].get((unit, amount))
    if word:
        return word
    said = _amount_of(abs(amount), unit, words)
    if words == "es":
        return f"hace {said}" if amount < 0 else f"dentro de {said}"
    return f"{said} ago" if amount < 0 else f"in {said}"


def _relative_in(seconds: float, unit: str, lang: str) -> str:
    """`seconds` from now, in `unit`, rounded:  `in 3 days`, `tomorrow`."""
    size = UNIT_SECONDS.get(unit, 1)
    word = unit if unit in UNIT_SECONDS and unit not in ("millisecond", "tick") else "second"
    return relative(js_round(seconds / size), word, lang)


################
# ## Dates as text
################


def numeric_day(when: datetime, lang: str, *, with_year: bool) -> str:
    """`when`'s day in numbers, the person's region's order:  `11/17/25`, `17/11/25`, `07/11/25` (en-GB).

    - With no year:  `11/17`.
    """
    year = f"/{when:%y}" if with_year else ""
    if _words_of(lang) == "es":
        return f"{when.day}/{when.month}{year}"
    if CalendarSettings.calendar().month_first:
        return f"{when.month}/{when.day}{year}"
    return f"{when.day:02}/{when.month:02}{year}"


def day_words(
    when: datetime,
    lang: str,
    month: Literal["long", "short"],
    weekday: Literal["long", "short"] | None = None,
) -> str:
    """`when`'s day in words, the person's region's order, its month's name `month` and its weekday's `weekday`.

    - `November 17, 2026` (en-US), `17 November 2026` (en-GB), `17 de noviembre de 2026`
    - with its weekday:  `Tuesday, November 17, 2026`, `martes, 17 de noviembre de 2026`
    - its month cut short:  `Nov 17, 2026`, `17 nov 2026`
    """
    named = month_name(when, lang, month)
    if _words_of(lang) == "es":
        day = f"{when.day} de {named} de {when.year}" if month == "long" else f"{when.day} {named} {when.year}"
    elif CalendarSettings.calendar().month_first:
        day = f"{named} {when.day}, {when.year}"
    else:
        day = f"{when.day} {named} {when.year}"
    return f"{weekday_name(when, lang, weekday)}, {day}" if weekday else day


def clock_time(when: datetime, lang: str, *, seconds: bool) -> str:
    """`when`'s time on the person's clock:  `9:05 PM`, `21:05`;  `9:05:07 PM` with `seconds`."""
    rest = f":{when.minute:02}" + (f":{when.second:02}" if seconds else "")
    if not CalendarSettings.uses_24_hour_clock():
        return f"{when.hour % 12 or 12}{rest} {meridiem(when, lang)}"
    region = CalendarSettings.region()
    in_two_digits = CalendarSettings.region_clock() == "12" and (
        _words_of(lang) == "en" or region in _SPANISH_TWO_DIGIT_HOURS
    )
    return f"{when.hour:02}{rest}" if in_two_digits else f"{when.hour}{rest}"


################
# ## The time zone
################

# A few time zones' long names, by their short one, in each language:  Python has none of its own.
_ZONE_NAMES: dict[str, dict[str, str]] = {
    "EST": {"en": "Eastern Standard Time", "es": "hora estándar oriental"},
    "EDT": {"en": "Eastern Daylight Time", "es": "hora de verano oriental"},
    "CST": {"en": "Central Standard Time", "es": "hora estándar central"},
    "CDT": {"en": "Central Daylight Time", "es": "hora de verano central"},
    "MST": {"en": "Mountain Standard Time", "es": "hora estándar de las Montañas Rocosas"},
    "MDT": {"en": "Mountain Daylight Time", "es": "hora de verano de las Montañas Rocosas"},
    "PST": {"en": "Pacific Standard Time", "es": "hora estándar del Pacífico"},
    "PDT": {"en": "Pacific Daylight Time", "es": "hora de verano del Pacífico"},
    "GMT": {"en": "Greenwich Mean Time", "es": "hora del meridiano de Greenwich"},
    "UTC": {"en": "Coordinated Universal Time", "es": "tiempo universal coordinado"},
    "BST": {"en": "British Summer Time", "es": "hora de verano británica"},
    "CET": {"en": "Central European Standard Time", "es": "hora estándar de Europa central"},
    "CEST": {"en": "Central European Summer Time", "es": "hora de verano de Europa central"},
}


def _zone_id() -> str:
    """This machine's time zone's id, `America/New_York`.

    - `TZ`, else the system's (`/etc/localtime`), else its letters
    """
    zone = os.environ.get("TZ", "").lstrip(":")
    if "/" in zone or zone == "UTC":
        return zone
    linked = os.path.realpath("/etc/localtime")
    if "zoneinfo/" in linked:
        return linked.split("zoneinfo/", 1)[1]
    return time.tzname[0] or "UTC"


def _short_zone() -> str:
    """This machine's time zone now, in letters, `EST`;  `GMT-5` where it has none, as `Intl` says it."""
    moment = datetime.now().astimezone()
    letters = moment.tzname() or ""
    if re.fullmatch(r"[A-Z]{2,5}", letters):
        return letters
    offset = moment.utcoffset() or timedelta()
    minutes = round(offset.total_seconds() / 60)
    if not minutes:
        return "GMT"
    hours, within = divmod(abs(minutes), 60)
    return f"GMT{'-' if minutes < 0 else '+'}{hours}" + (f":{within:02}" if within else "")
