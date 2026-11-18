"""Dates in the core (epic `language` P63):  a date's parts and names, said the person's way, how long ago, and working
with dates.  The JavaScript core says the same:  both read `dates.expected.json5`.
"""

import json
import re
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest

from spell_core import Core
from spell_core.calendar_settings import CalendarSettings

# What both cores must say:  each case's method, date, language, region and clock => its text or number.
EXPECTED: dict[str, Any] = json.loads(
    (Path(__file__).parents[3] / "core" / "dates.expected.json5").read_text(encoding="utf-8")
)

# The moment every case is run at.
NOW = datetime.fromisoformat(EXPECTED["now"])

# A Spanish program's messages, as its words file brings them:  the ones dates read.
SPANISH = {"language": "es", "duration-ago": "hace {time}", "duration-from-now": "dentro de {time}"}


def snake_case(name: str) -> str:
    """`name` as Python writes it:  `isAM` is `is_am`, `timeFromNow` `time_from_now`."""
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name).lower()


def argument(arg: object) -> object:
    """`{"date": "2026-11-17T21:05:07"}` in a case's arguments, as a date where it's read;  anything else as it is."""
    return datetime.fromisoformat(arg["date"]) if isinstance(arg, dict) else arg


def answer_of(answer: object) -> object:
    """A date answer as its local time, to the second:  `2026-11-17T21:05:07`;  anything else as it is."""
    return f"{answer:%Y-%m-%dT%H:%M:%S}" if isinstance(answer, datetime) else answer


@pytest.fixture
def program(core: Core, monkeypatch: pytest.MonkeyPatch) -> Core:
    """A core whose clock stopped at `NOW`."""
    monkeypatch.setattr(core, "now", lambda: NOW)
    return core


def speaking(core: Core, lang: str, **host: Any) -> None:
    """Run as a program in `lang`, its person in `host`'s region, on its clock."""
    core.use_messages(SPANISH if lang == "es" else None)
    CalendarSettings.use(**host)


@pytest.mark.parametrize(
    "case",
    EXPECTED["cases"],
    ids=[f"{it['method']}({json.dumps(it['args'])}) {it['lang']}-{it['region']}" for it in EXPECTED["cases"]],
)
def test_the_cases_both_cores_say_alike(program: Core, case: dict[str, Any]) -> None:
    speaking(program, case["lang"], region=case["region"], clock=case.get("clock"))
    run = getattr(program, snake_case(case["method"]))
    assert answer_of(run(*map(argument, case["args"]))) == case["expected"]


def test_their_regions_first_day_clock_and_weekend() -> None:
    CalendarSettings.use(region="US")
    assert (CalendarSettings.first_day(), CalendarSettings.uses_24_hour_clock(), CalendarSettings.weekend()) == (
        7,
        False,
        (6, 7),
    )
    CalendarSettings.use(region="ES")
    assert (CalendarSettings.first_day(), CalendarSettings.uses_24_hour_clock()) == (1, True)
    CalendarSettings.use(region="IL")
    assert CalendarSettings.weekend() == (5, 6)


def test_the_region_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("LC_ALL", "LC_TIME"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("LANG", "es_MX.UTF-8")
    assert (CalendarSettings.region(), CalendarSettings.language()) == ("MX", "es")
    monkeypatch.setenv("LANG", "C")
    assert (CalendarSettings.region(), CalendarSettings.language()) == ("US", "en")


def test_what_they_chose_wins_over_their_regions(program: Core) -> None:
    speaking(program, "en", region="US", first_day=1, clock="24")
    tuesday = datetime(2026, 11, 17, 21, 5, 7)
    assert (program.weekday_number_of(tuesday), program.short_time(tuesday)) == (2, "21:05")


def test_a_short_date_leaves_out_this_year_only(program: Core) -> None:
    speaking(program, "en", region="US")
    assert program.short_date(datetime(2026, 11, 7, 9)) == "11/7"
    assert program.short_date(datetime(2025, 11, 7, 9)) == "11/7/25"


def test_each_style_the_person_s_way(program: Core) -> None:
    speaking(program, "en", region="GB")
    morning = datetime(2025, 11, 7, 9, 5, 7)
    assert program.short_date(morning) == "07/11/25"
    assert program.long_date(morning) == "Friday, 7 November 2025"
    assert program.abbreviated_date(morning) == "Fri, 7 Nov 2025"
    assert program.date_as(morning, "date and time") == "7 Nov 2025, 9:05"
    speaking(program, "es", region="ES")
    assert program.abbreviated_date(morning) == "vie, 7 nov 2025"
    assert program.date_as(morning, "date and time") == "7 nov 2025, 9:05"
    speaking(program, "es", region="US")
    assert program.short_time(morning) == "9:05 a.m."
    speaking(program, "en", region="US", clock="24")
    assert program.long_time(morning) == "09:05:07"


def test_the_time_zone_three_ways(program: Core) -> None:
    speaking(program, "en", region="US")
    assert program.time_zone("city")
    assert re.fullmatch(r"[A-Z]{2,5}|GMT.*|UTC", program.time_zone("short"))
    assert len(program.time_zone("long")) >= 3


def test_how_long_ago_in_its_words(program: Core) -> None:
    speaking(program, "es", region="ES")
    assert program.time_from_now(datetime(2026, 11, 15, 21, 5, 7), "short") == "anteayer"
    assert program.time_from_now(datetime(2027, 1, 17, 21, 5, 7)) == "dentro de 2 meses"
    speaking(program, "en", region="US")
    assert program.time_from_now(datetime(2026, 11, 17, 21, 5, 0)) == "7 seconds ago"
    assert program.time_from_now(NOW) == "now"
    assert program.time_from_now(datetime(2028, 11, 17, 21, 5, 7)) == "in 2 years"
    assert program.duration_text(0) == ""
    assert program.duration_text(86_400 + 5, "long") == "1 day, 5 seconds"


def test_a_date_with_a_zone_or_alone(program: Core) -> None:
    speaking(program, "en", region="US")
    assert program.hour_of(date(2026, 11, 17)) == 0
    utc = datetime(2026, 11, 18, 2, 5, 7, tzinfo=UTC)
    assert program.seconds_between(utc, NOW) == (utc - NOW.astimezone()).total_seconds()
    assert program.is_same_day(utc, utc.astimezone().replace(tzinfo=None))
    assert program.date_from("2026-12-25T15:00:00Z") == datetime(2026, 12, 25, 15, tzinfo=UTC)


def test_nothing_or_what_isnt_a_date_stays_as_it_is(program: Core) -> None:
    assert [program.minute_of(None), program.month_of("x"), program.two_digits("x"), program.date_from("nope")] == [
        None,
        "x",
        "x",
        None,
    ]
    assert program.two_digits(True) is True
