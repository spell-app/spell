"""How a person reads dates and times (epic `language` P63):  their region, first day of the week, clock and weekend.

```python
CalendarSettings.region()                # "US", from the environment's locale (`LANG=en_US.UTF-8`)
CalendarSettings.use(region="ES")        # a host, or a test, says it:  Monday, a 24-hour clock
CalendarSettings.use()                   # as usual again
```

- The twin of the kit's `CalendarSettings` (`spell/util/measures/CalendarSettings`), snake_cased.
  - Its getters are methods here:  `first_day()`, `weekend()`, `uses_24_hour_clock()`.
- Python has no browser and no `Intl`:
  - the region comes from the environment's locale (`LC_ALL`, `LC_TIME`, then `LANG`), else `US`
  - each region's week and clock come from a small table, `REGIONS`, copied from what `Intl.Locale` says
  - a region it doesn't know:  Monday, a 24-hour clock, Saturday and Sunday, as the JavaScript's fallback
- No choice of the person's own (the JavaScript's `chooseFirstDay()`, `chooseClock()`):  Python has no browser storage.
- Static only:  one per process, as the JavaScript's is one per page.
- NEVER throws.
"""

import os
import re
from dataclasses import dataclass
from typing import ClassVar, Literal

# The two clocks a person reads times on.
type ClockName = Literal["12", "24"]

# The region when nothing says one.
DEFAULT_REGION = "US"


@dataclass(frozen=True)
class RegionCalendar:
    """How a region reads dates:  what `Intl.Locale`'s week and clock info say of it."""

    # its first day of the week, ISO's way:  1 is Monday, 7 is Sunday
    first_day: int
    # its clock:  `12` or `24`
    clock: ClockName
    # the days of its weekend, ISO's way
    weekend: tuple[int, ...] = (6, 7)
    # English says the month first there, `11/17` (en-US), not the day, `17/11` (en-GB);  Spanish always the day
    month_first: bool = False


# Each region's week and clock, by its two-letter code, as `Intl.Locale` gives them (and en-<region>'s order).
REGIONS: dict[str, RegionCalendar] = {
    "US": RegionCalendar(7, "12", month_first=True),
    "CA": RegionCalendar(7, "12", month_first=True),
    "MX": RegionCalendar(7, "12", month_first=True),
    "BR": RegionCalendar(7, "24", month_first=True),
    "AR": RegionCalendar(1, "12", month_first=True),
    "CO": RegionCalendar(7, "12", month_first=True),
    "CL": RegionCalendar(1, "12", month_first=True),
    "PE": RegionCalendar(7, "12", month_first=True),
    "PH": RegionCalendar(7, "12", month_first=True),
    "JP": RegionCalendar(7, "24", month_first=True),
    "KR": RegionCalendar(7, "12", month_first=True),
    "CN": RegionCalendar(1, "24", month_first=True),
    "SA": RegionCalendar(7, "12", (5, 6), month_first=True),
    "IL": RegionCalendar(7, "24", (5, 6)),
    "AE": RegionCalendar(1, "12"),
    "IN": RegionCalendar(7, "12", (7,)),
    "ES": RegionCalendar(1, "24"),
    "GB": RegionCalendar(1, "24"),
    "IE": RegionCalendar(1, "24"),
    "DE": RegionCalendar(1, "24"),
    "FR": RegionCalendar(1, "24"),
    "IT": RegionCalendar(1, "24"),
    "NL": RegionCalendar(1, "24"),
    "AU": RegionCalendar(1, "12"),
    "NZ": RegionCalendar(1, "12"),
    "ZA": RegionCalendar(7, "24"),
}

# A region the table doesn't have:  the JavaScript's fallback, Monday, Saturday and Sunday;  a 24-hour clock.
UNKNOWN_REGION = RegionCalendar(1, "24")

# A locale's region in the environment:  `en_US.UTF-8`, `es-ES`
_LOCALE_REGION = re.compile(r"^[a-zA-Z]{2,3}[_-]([A-Za-z]{2})\b")


class CalendarSettings:
    """The person's region, first day of the week, clock and weekend:  see the module's docstring."""

    # what a host said, `use()`:  `region`, `first_day`, `clock`
    _host: ClassVar[dict[str, object]] = {}

    @staticmethod
    def region() -> str:
        """The person's region, `US`:  the host's, else the environment's locale's, else `US`."""
        region = CalendarSettings._host.get("region")
        if isinstance(region, str) and region:
            return region.upper()
        for name in ("LC_ALL", "LC_TIME", "LANG"):
            match = _LOCALE_REGION.match(os.environ.get(name, ""))
            if match:
                return match[1].upper()
        return DEFAULT_REGION

    @staticmethod
    def language() -> str:
        """The reader's own language, `en`:  the environment's locale's, else English."""
        for name in ("LC_ALL", "LC_TIME", "LANG"):
            match = re.match(r"^([a-zA-Z]{2,3})(?=[_.-]|$)", os.environ.get(name, ""))
            if match:
                return match[1].lower()
        return "en"

    @staticmethod
    def locale_for(lang: str) -> str:
        """The locale to say dates in:  the program's `lang`, the person's region, `es-US` for Spanish in the US."""
        return f"{lang}-{CalendarSettings.region()}"

    @staticmethod
    def calendar() -> RegionCalendar:
        """The person's region's week and clock, from `REGIONS`."""
        return REGIONS.get(CalendarSettings.region(), UNKNOWN_REGION)

    @staticmethod
    def first_day() -> int:
        """The person's first day of the week, 1 (Monday) to 7 (Sunday):  the host's, else their region's."""
        day = CalendarSettings._host.get("first_day")
        return day if isinstance(day, int) and 1 <= day <= 7 else CalendarSettings.calendar().first_day

    @staticmethod
    def weekend() -> tuple[int, ...]:
        """The days of the person's region's weekend, ISO's way:  `(6, 7)`, Saturday and Sunday, in most places."""
        return CalendarSettings.calendar().weekend

    @staticmethod
    def uses_24_hour_clock() -> bool:
        """Does the person read times on a 24-hour clock:  the host's, else their region's?"""
        clock = CalendarSettings._host.get("clock")
        return (clock if clock in ("12", "24") else CalendarSettings.region_clock()) == "24"

    @staticmethod
    def region_clock() -> ClockName:
        """The clock of the person's region:  `12` or `24`."""
        return CalendarSettings.calendar().clock

    @staticmethod
    def use(*, region: str | None = None, first_day: int | None = None, clock: ClockName | None = None) -> None:
        """Say a region, first day or clock for everything this process says (none:  as usual again):  a test."""
        host = {"region": region, "first_day": first_day, "clock": clock}
        CalendarSettings._host = {key: value for key, value in host.items() if value is not None}
