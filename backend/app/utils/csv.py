import csv
import io
from collections.abc import AsyncIterator, Iterable
from typing import Any


async def stream_csv(
    *,
    header: list[str],
    rows: Iterable[list[Any]],
    chunk_size: int = 100,
) -> AsyncIterator[str]:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    yield buffer.getvalue()
    buffer.seek(0)
    buffer.truncate(0)

    count = 0
    for row in rows:
        writer.writerow(row)
        count += 1
        if count >= chunk_size:
            yield buffer.getvalue()
            buffer.seek(0)
            buffer.truncate(0)
            count = 0
    if count > 0:
        yield buffer.getvalue()


def anonymize_name(name: str, youth_id: str) -> str:
    parts = [p for p in name.split() if p]
    initials = "".join(p[0] for p in parts if p)[:3].upper() or "X"
    return f"{initials} · {youth_id[:8]}"
