"""Numbers with units:  each kind of measure, a DIMENSION, with its units and how they convert (epic `language` P23).

- The twin of the JavaScript core's `dimensions.ts`:  the same table, `dimensions_generated.py`, compiled from the
  same `dimensions/dimensions.spell`, and the same rounding, so a measure prints the same in both.
- A measure stays a plain number in its stored unit:  the compiler hands its dimension and unit to
  `convert_measure()` / `measure_text()`.
"""

import math
from typing import Any

from spell_core.dimensions_generated import BUILT_IN_DIMENSIONS


class Dimension:
    """A kind of measure, e.g. `Length`:  its units, and converting between them.

    - Each unit a dict:  its `id`, its `names` (its name, then each `aka`), its `factor` and maybe `offset`,
      so `base = value * factor + offset`.
    """

    def __init__(self, name: str, units: list[dict[str, Any]] | None = None) -> None:
        self.name = name
        self.units: list[dict[str, Any]] = list(units or [])

    def unit(self, unit_id: str) -> dict[str, Any]:
        """Our unit `unit_id`:  raises `TypeError` if we have none, a bug in the compiled code."""
        for unit in self.units:
            if unit["id"] == unit_id:
                return unit
        raise TypeError(f'Dimension.unit():  {self.name} has no unit "{unit_id}"')

    def convert(self, value: float, from_unit: str, to_unit: str) -> float:
        """`value` of unit `from_unit`, in unit `to_unit`."""
        if from_unit == to_unit:
            return value
        source, target = self.unit(from_unit), self.unit(to_unit)
        base = value * source["factor"] + source.get("offset", 0)
        return (base - target.get("offset", 0)) / target["factor"]

    def text(self, value: float, from_unit: str, to: str | list[str] | None = None) -> str:
        """`value` of unit `from_unit`, written for people, in `to` (`from_unit`'s when left out):  `172 cm`.

        - Several units, largest first, write a mixed measure:  `5 ft 8 in`, the last part a whole number.
        - A single unit keeps three significant figures, at most two decimals:  `170 lb`, `2.54 cm`.
        """
        units = [to] if isinstance(to, str) else list(to or [from_unit])
        if len(units) == 1:
            amount = _round_for_people(self.convert(value, from_unit, units[0]))
            return f"{_number_text(amount)} {self.symbol_of(units[0])}"
        last = units[-1]
        rest = self.convert(value, from_unit, last)
        parts: list[float] = []
        for index, unit in enumerate(units):
            if index == len(units) - 1:
                parts.append(math.floor(rest + 0.5))
                continue
            size = self.convert(1, unit, last)
            whole = math.floor((rest + 0.5) / size)
            rest -= whole * size
            parts.append(whole)
        return " ".join(
            f"{_number_text(amount)} {self.symbol_of(unit)}" for amount, unit in zip(parts, units, strict=True)
        )

    def symbol_of(self, unit_id: str) -> str:
        """What unit `unit_id` is written as next to a number:  its first `aka`, else its name."""
        names = self.unit(unit_id)["names"]
        return names[1] if len(names) > 1 else names[0]


def _round_for_people(value: float) -> float:
    """Three significant figures, at most two decimals:  `169.76` => `170`, `2.5401` => `2.54`."""
    significant = float(f"{value:.3g}")
    return math.floor(significant * 100 + 0.5) / 100


def _number_text(value: float) -> str:
    """A number as JavaScript writes it:  `170`, `2.54`."""
    return str(int(value)) if float(value).is_integer() else repr(float(value))


# every dimension the running program knows, by name:  the built-in ones, then its own
_DIMENSIONS: dict[str, Dimension] = {}


class DimensionMethods:
    """`core`'s dimension methods:  `define_dimension()`, `define_unit()`, `convert_measure()`, `measure_text()`."""

    def define_dimension(self, name: str, units: list[dict[str, Any]] | None = None) -> Dimension:
        """Declare dimension `name`:  `data size is a dimension:` compiles to this.  Replaces one of the same name."""
        dimension = Dimension(name, units)
        _DIMENSIONS[name] = dimension
        return dimension

    def define_unit(self, dimension: str, unit: dict[str, Any]) -> None:
        """Add `unit` to dimension `dimension`, replacing one of the same id:  a unit line compiles to this."""
        units = self.dimension_named(dimension).units
        for index, each in enumerate(units):
            if each["id"] == unit["id"]:
                units[index] = unit
                return
        units.append(unit)

    def dimension_named(self, name: str) -> Dimension:
        """Dimension `name`, e.g. `Length`:  raises `TypeError` if there's none."""
        if name not in _DIMENSIONS:
            raise TypeError(f'core.dimension_named():  no dimension "{name}"')
        return _DIMENSIONS[name]

    def convert_measure(self, value: float, dimension: str, from_unit: str, to_unit: str) -> float:
        """`value` of dimension `dimension`'s unit `from_unit`, in unit `to_unit`:  `its height in feet`."""
        return self.dimension_named(dimension).convert(float(value), from_unit, to_unit)

    def measure_text(self, value: float, dimension: str, from_unit: str, to: str | list[str] | None = None) -> str:
        """`value` written for people, in `to`:  `its height in feet and inches` -- see `Dimension.text()`."""
        return self.dimension_named(dimension).text(float(value), from_unit, to)


for _dimension in BUILT_IN_DIMENSIONS:
    _DIMENSIONS[_dimension["name"]] = Dimension(_dimension["name"], _dimension["units"])
