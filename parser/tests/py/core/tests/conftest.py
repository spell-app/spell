"""What every test of spell_core shares:  a core of its own, so nothing one test does leaks into the next."""

from collections.abc import Iterator

import pytest

from spell_core import Core
from spell_core.calendar_settings import CalendarSettings


@pytest.fixture
def core() -> Core:
    """A new core:  its own console (writing to pytest's captured stdout / stderr), random seeded with 1."""
    return Core()


@pytest.fixture(autouse=True)
def calendar_as_usual() -> Iterator[None]:
    """The person's region, first day and clock as usual again after each test:  one may say them, `use()`."""
    yield
    CalendarSettings.use()
