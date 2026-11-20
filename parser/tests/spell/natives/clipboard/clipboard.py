"""A made-up clipboard helper, the Python side of the Clipboard test project."""

import asyncio


async def copy_text(text: str) -> None:
    """Put `text` on the clipboard:  here, print it."""
    await asyncio.sleep(0)
    print(f"copied {text}")


def shout(text: str) -> str:
    """`text` in capitals."""
    return text.upper()
