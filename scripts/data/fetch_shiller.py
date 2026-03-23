#!/usr/bin/env python3
"""Legacy helper for the Node-based Shiller refresh script."""

from __future__ import annotations

from pathlib import Path


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    print(
        "Use `npm run data:fetch:shiller` from the project root to refresh "
        "the normalized Shiller dataset."
    )


if __name__ == "__main__":
    main()
