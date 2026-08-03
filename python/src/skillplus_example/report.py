"""Step 4 — everything a report contains.

This prints the whole surface rather than the two or three fields a real
integration usually wants, because the point here is to show what is available.
Copy the parts you need.
"""

from __future__ import annotations

import json

from skillplus import ScanReport


def _line(label: str, value: str) -> None:
    print(f"  {label:<14}{value}")


def _truncate(s: str, n: int) -> str:
    return f"{s[:n]}…" if len(s) > n else s


def print_report(report: ScanReport) -> None:
    # ── Identity ─────────────────────────────────────────────────────────────
    _line("Skill", report.skill_name)
    _line("Source", f"{report.source} · {report.skill_path}")
    # Content hash. Two scans with the same tree_sha looked at identical bytes,
    # which is how you tell "re-scanned" from "the skill actually changed".
    _line("Content hash", report.tree_sha)
    _line("Rule version", report.rule_version)
    _line("Scanned at", f"{report.scanned_at}{' (cached)' if report.cached else ''}")

    # ── The verdict ──────────────────────────────────────────────────────────
    # Prefer `verdict` over `rating`. `rating` is the legacy five-value field;
    # `verdict` folds it onto the current scale, so reports scanned before the
    # rating system changed still compare correctly against new ones.
    #
    # FOUR values, not three: safe | medium | high | unknown.
    # `unknown` means the content is not a valid skill. It is not a synonym for
    # safe, and code that only checks == "high" will let it through.
    _line("Verdict", f"{report.verdict}   (legacy rating: {report.rating})")
    _line("Valid skill", str(report.valid_skill))

    # Set by an administrator, and they override the computed verdict — worth
    # surfacing so a reader knows why a verdict looks surprising.
    if report.blacklisted:
        _line("Blacklisted", "yes (admin)")
    if report.whitelisted:
        _line("Whitelisted", "yes (admin)")

    # ── Summary counts ───────────────────────────────────────────────────────
    s = report.summary
    _line(
        "Summary",
        f"{s.total_issues} issues — {s.danger} high / {s.warning} medium / {s.info} low"
        f" · {s.files_scanned} files · {report.scan_duration_ms}ms",
    )
    if s.by_category:
        _line("By category", json.dumps(s.by_category))

    # ── Rule findings ────────────────────────────────────────────────────────
    # Use `severity_normalized`, not `severity`. The raw field still carries
    # danger/warning/info on older reports; the normalized one is always
    # high | medium | low | safe, so sorting and filtering behave consistently
    # across report generations.
    print(f"\n  Rule findings ({len(report.issues)}):")
    for issue in report.issues[:5]:
        where = f" {issue.file}:{issue.line}" if issue.file else ""
        print(f"    [{issue.severity_normalized}] {issue.rule_id} — {issue.message}{where}")
    if len(report.issues) > 5:
        print(f"    … {len(report.issues) - 5} more")

    # ── AI audit ─────────────────────────────────────────────────────────────
    # None when the skill has only been through the rule engine.
    if report.ai_report:
        ai = report.ai_report
        print("\n  AI audit:")
        print(f"    status     {ai.status}   risk: {ai.risk_level or '—'}")
        if ai.summary:
            print(f"    summary    {_truncate(ai.summary, 300)}")
        if ai.tokens_used:
            print(f"    cost       {ai.tokens_used} tokens · {ai.duration_ms}ms")

        # Findings the AI judged to be false positives. They stay visible in
        # `issues` — nothing is deleted — but the audit explains its reasoning.
        for fp in ai.false_positives:
            print(f"    dismissed  {fp.rule_id} in {fp.file}: {fp.reason}")

        # The eight fixed categories. `status` is the pass/fail word, `severity`
        # grades a failure, and `evidence` carries the file:line citations that
        # make a finding checkable rather than an assertion.
        for cat in ai.analysis:
            print(f"    {cat.status:<6} {cat.category} ({cat.severity}, confidence {cat.confidence})")
            if cat.title:
                print(f"           {cat.title}")
            for ev in cat.evidence[:2]:
                print(f"           evidence: {ev}")

        # Per-agent breakdown. None here on purpose: `query` returns the summary
        # view, and the agent detail only comes back from `get_report`. See
        # badge.py.
        print(f"    agents     {len(ai.agents) if ai.agents else 'None (use get_report)'}")

        # A refusal or model failure lands here. An error message alongside a
        # `safe` risk level does NOT mean the skill is safe — it means nobody
        # looked.
        if ai.error_message:
            print(f"    error      {ai.error_message}")

    # ── Supply chain ─────────────────────────────────────────────────────────
    # The reason a report can change without the skill changing. Every
    # dependency and endpoint is kept, so when a package is later found
    # compromised this report starts reporting a hit — with nothing re-scanned.
    if report.supply_chain:
        sc = report.supply_chain
        print(f"\n  Supply chain: {sc.dependency_count} dependencies · {sc.endpoint_count} endpoints")
        # A non-empty blacklist_hits is the hardest signal in the whole report:
        # a package this skill installs is confirmed malicious. It floors the
        # verdict to `high` regardless of what anything else says.
        for hit in sc.blacklist_hits:
            version = f"@{hit.matched_version}" if hit.matched_version else ""
            print(f"    MALICIOUS {hit.ecosystem}:{hit.name}{version} ({hit.match_strength}) — {hit.reason}")
            if hit.reference_url:
                print(f"              {hit.reference_url}")

    # ── Where this skill is published ────────────────────────────────────────
    for listing in report.platform_listings:
        _line("Listed on", f"{listing.platform} — {listing.installs} installs — {listing.url}")
    if report.external_links:
        _line("Links", json.dumps(report.external_links))

    # ── Shareable ────────────────────────────────────────────────────────────
    # Absolute, ready to use — the SDK resolves it against the base_url you
    # configured, so it works from any origin.
    #
    # Read the name carefully: this is the API endpoint, and it returns the JSON
    # this function just printed. The page you send a PERSON to is a different
    # URL — client.get_report_page_url(scan_id), demonstrated in badge.py.
    _line("Report JSON", report.report_url)
