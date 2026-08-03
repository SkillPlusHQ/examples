"""Every SkillPlus SDK call, in the order you would meet them.

    python -m skillplus_example https://www.skills.sh/vercel-labs/skills/find-skills
    python -m skillplus_example https://github.com/anthropics/skills/tree/main/skills/brand-guidelines

The Node and Next.js examples in this repository do exactly the same five steps,
so you can read whichever one matches your stack and get the same picture.

    1. build a client              client.py
    2. query — is there a report?  lookup.py
    3. scan — make one if not      lookup.py
    4. read everything in it       report.py
    5. fetch by id, and the badge  badge.py
"""

from __future__ import annotations

import sys

from skillplus import SkillPlusError

from .badge import show_badge
from .client import create_client
from .lookup import lookup, start_scan
from .report import print_report

# A skills.sh URL, which is how most skills are published. A GitHub URL works
# the same way, and a /tree/<branch>/<path> URL picks one skill out of a repo
# that holds many:
#
#   https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
#
DEFAULT_URL = "https://www.skills.sh/vercel-labs/skills/find-skills"


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    repo_url = argv[0] if argv else DEFAULT_URL

    try:
        # `with` closes the client's HTTP connection pool on the way out, and is
        # the same thing as calling client.close() in a finally block. Leaking a
        # pool is harmless in a script this short and is not in a long-running
        # process — the habit costs less than the bug.
        with create_client() as client:
            print(f"\nChecking {repo_url}\n{'─' * 60}")

            # ── 2. Query ─────────────────────────────────────────────────────
            result = lookup(client, repo_url)

            if result.status == "not_found" or result.report is None:
                # `scanning` distinguishes "a scan is running right now" from
                # "nothing is happening" — the difference between "come back in
                # a minute" and "you need to ask for one".
                print(
                    "No report yet — a scan is already running. This takes a few minutes."
                    if result.scanning
                    else "No report yet — asking for one."
                )

                # ── 3. Scan ──────────────────────────────────────────────────
                ack = start_scan(client, repo_url)
                print(f"  accepted: {ack.accepted}   scanning: {ack.scanning}")
                print(f"  {ack.message}")
                if not ack.accepted:
                    # Deduplicated, not failed. Nothing to retry.
                    print("  (deduplicated — a scan was already in flight or a fresh report exists)")
                print("\nRe-run this command once the scan finishes to see the full report.")
                return 0

            # ── 4. Read the report ───────────────────────────────────────────
            report = result.report
            print()
            print_report(report)

            # ── 5. Fetch by id, and the badge ────────────────────────────────
            show_badge(client, report.scan_id)

            # A natural place to turn a verdict into an outcome. `unknown` is
            # grouped with `high` on purpose — it means "not a valid skill",
            # which is a reason to stop rather than a mild result.
            #
            # `medium` passes here. That is a POLICY choice, not a fact about
            # the skill: it means "something is worth a human look", and most
            # skills that legitimately run commands land there. Blocking on it
            # in CI is defensible — add it to the tuple — but decide it
            # deliberately rather than inheriting it from an example.
            blocked = report.verdict in ("high", "unknown")
            print(f'\n{"BLOCKED" if blocked else "OK"} — verdict is "{report.verdict}"')
            return 1 if blocked else 0

    except SkillPlusError as exc:
        # Errors always arrive on the exception channel, never as a status
        # value. Neither this nor an unexpected error is a verdict — an outage
        # must never read as "safe".
        print(f"\nSkillPlus API error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
