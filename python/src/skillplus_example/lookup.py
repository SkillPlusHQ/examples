"""Steps 2 and 3 — get a report, scanning if there is not one yet.

These are the two calls that make something happen; everything else in the SDK
reads what they produced. Choosing between them is a question about who is
waiting.
"""

from __future__ import annotations

from skillplus import QueryResult, ScanAck, ScanReport, SkillPlus


def lookup(client: SkillPlus, repo_url: str) -> QueryResult:
    """Step 2 — ``query``: is there a report?

    The answer is binary. ``status`` is ``"found"`` (``report`` attached) or
    ``"not_found"`` (``report`` is None). There is no third state, and failures
    arrive as a raised ``SkillPlusError`` rather than as a status value — so a
    status check can never accidentally swallow an outage.
    """
    # 2a. Read only. Returns whatever exists right now and never triggers work.
    #     This is what the example uses, so that step 3 is visibly the thing
    #     that starts a scan.
    result = client.query(repo_url)

    # 2b. Read, and queue a scan if nothing exists. Still returns immediately:
    #     not_found with scanning=True, and the report is there next time.
    #
    #     Better default for a real detail page — one call instead of two. It is
    #     commented out here only because combining it with an explicit scan()
    #     would queue the same scan twice. Use ONE of the two, not both.
    #
    #   client.query(repo_url, scan_if_missing=True)

    # 2c. Read, scanning if needed, and BLOCK until a completed report exists.
    #     wait=True implies scan_if_missing. This runs a full multi-agent audit,
    #     so it takes MINUTES — fine in a batch job, never in a request handler.
    #
    #   waited = client.query(repo_url, wait=True)
    #   print(waited.report.verdict)

    return result


def start_scan(client: SkillPlus, repo_url: str) -> ScanAck:
    """Step 3a — ``scan``, fire-and-forget. Returns an ack, not a report.

    ``accepted=False`` is NOT an error — it means the request was deduplicated,
    because a scan is already running or a fresh report already exists.
    Treating it as a failure and retrying is the usual bug here; the correct
    reading is "nothing more for you to do".
    """
    return client.scan(  # type: ignore[return-value]
        repo_url,
        # Scan one skill inside a multi-skill repository.
        # skill_path="skills/my-skill",
        #
        # Re-scan even when a fresh report exists. Without this a repeat call is
        # deduplicated and comes back accepted=False.
        # force=True,
    )


def scan_and_wait(client: SkillPlus, repo_url: str) -> ScanReport:
    """Step 3b — scan and wait. Returns the report itself rather than an ack.

    Combined with ``force=True`` the SDK does something worth knowing about: it
    remembers the report that existed before and refuses to accept that same old
    report as the answer. Without it, a forced re-scan would return instantly
    with the stale report and look like it had worked.

    Minutes, not seconds. Never call this from a request handler.
    """
    return client.scan(  # type: ignore[return-value]
        repo_url,
        wait=True,
        wait_interval=5.0,   # seconds between polls (default 5.0)
        wait_timeout=600.0,  # give up and raise after this long (default 600.0)
    )
