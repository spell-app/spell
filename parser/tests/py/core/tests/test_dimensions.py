"""Numbers with units (epic `language` P23):  Python's core converts and writes a measure as the JavaScript core does.

- The same numbers as the JavaScript core's tests, `tests/spell/Dimensions.test.ts`.
"""

import pytest

from spell_core import Core


@pytest.mark.parametrize(
    ("dimension", "value", "from_unit", "to_unit", "expected"),
    [
        ("Length", 172, "centimeter", "inch", 67.71653543),
        ("Weight", 77, "kilogram", "pound", 169.75594188),
        ("Temperature", 100, "celsius", "fahrenheit", 212),
        ("Temperature", 32, "fahrenheit", "celsius", 0),
        ("Temperature", 0, "celsius", "kelvin", 273.15),
        ("Length", 27.5, "inch", "centimeter", 69.85),
    ],
)
def test_converts(core: Core, dimension: str, value: float, from_unit: str, to_unit: str, expected: float) -> None:
    assert core.convert_measure(value, dimension, from_unit, to_unit) == pytest.approx(expected, abs=1e-6)


@pytest.mark.parametrize(
    ("value", "dimension", "from_unit", "to", "expected"),
    [
        (172, "Length", "centimeter", ["foot", "inch"], "5 ft 8 in"),
        (77, "Weight", "kilogram", "pound", "170 lb"),
        (2.54, "Length", "centimeter", None, "2.54 cm"),
        (182.88, "Length", "centimeter", ["foot", "inch"], "6 ft 0 in"),
    ],
)
def test_writes_for_people(
    core: Core, value: float, dimension: str, from_unit: str, to: str | list[str] | None, expected: str
) -> None:
    assert core.measure_text(value, dimension, from_unit, to) == expected


def test_a_programs_own_dimension(core: Core) -> None:
    core.define_dimension("DataSize")
    core.define_unit("DataSize", {"id": "byte", "names": ["byte", "B"], "factor": 1})
    core.define_unit("DataSize", {"id": "kilobyte", "names": ["kilobyte", "KB"], "factor": 1000})
    assert core.convert_measure(3, "DataSize", "kilobyte", "byte") == 3000
