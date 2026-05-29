from __future__ import annotations

from enum import Enum
from typing import Type


def enum_values(enum_cls: Type[Enum]) -> list[str]:
    return [str(member.value) for member in enum_cls]

