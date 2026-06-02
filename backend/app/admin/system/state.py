"""In-memory system flags. v1 — process-local only.

Replace with a persisted store (DB or Redis) when running multi-instance.
"""

from dataclasses import dataclass


@dataclass
class SystemState:
    maintenance_mode: bool = False
    maintenance_message: str | None = None


_state = SystemState()


def get_state() -> SystemState:
    return _state
