"""Step 1 of 5 — construct the client."""

from __future__ import annotations

import os

from skillplus import SkillPlus


def create_client() -> SkillPlus:
    """``api_key`` is the only required argument.

    The rest are shown with their defaults so you can see what exists; drop the
    ones you do not need.

    The client holds an ``httpx`` connection pool, so close it when you are
    done. It supports the context-manager protocol, which is the idiomatic way
    and what ``__main__`` uses::

        with create_client() as client:
            client.query(url)

    ``client.close()`` is there for when a ``with`` block does not fit your
    control flow — a client held for the lifetime of a web server, say.
    """
    api_key = os.environ.get("SKILLPLUS_API_KEY")
    if not api_key:
        raise SystemExit(
            "SKILLPLUS_API_KEY is not set. Copy .env.example to .env and add your key."
        )

    return SkillPlus(
        api_key,
        # Point at a different deployment — staging, or self-hosted.
        # Default: https://skillplus.xyz
        base_url=os.environ.get("SKILLPLUS_BASE_URL", "https://skillplus.xyz"),
        # Per-request timeout, in seconds. This bounds ONE HTTP call, not a
        # ``wait=True`` operation — waiting is many short calls in a loop,
        # governed by ``wait_timeout`` instead. Raising this to 600 "to allow
        # for scans" is a common mistake and does nothing useful.
        # Default: 30.0
        timeout=30.0,
        # Extra attempts on 429 / 502 / 503, network errors and timeouts,
        # honouring Retry-After. Applies per call, so a waiting loop retries
        # each poll.
        # Default: 2
        max_retries=2,
    )
