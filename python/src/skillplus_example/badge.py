"""Step 5 — the remaining three methods: get_report, get_badge_url, get_badge."""

from __future__ import annotations

from skillplus import SkillPlus


def show_badge(client: SkillPlus, scan_id: str) -> None:
    # ── get_report ───────────────────────────────────────────────────────────
    # Fetch a report by id. Two reasons to use it rather than `query`:
    #
    #   1. You stored the scan_id and do not want to resolve the URL again.
    #   2. It returns MORE than query does. The per-agent breakdown of the
    #      multi-agent audit (`ai_report.agents`) is None on a query response
    #      and populated here — so if you want to show which specialist found
    #      what, this is the call that has it.
    again = client.get_report(scan_id)
    print(f"\n  Re-fetched by id: {again.skill_name} → {again.verdict}")

    agents = again.ai_report.agents if again.ai_report else None
    if agents:
        print(f"  Agents ({len(agents)}) — only available from get_report:")
        for run in agents:
            note = f" — {run.error_message}" if run.error_message else ""
            print(f"    {run.agent:<14} {run.status}, {len(run.findings)} finding(s){note}")

    # ── get_report_page_url ──────────────────────────────────────────────────
    # The report as a person reads it. This is NOT `report.report_url` — that
    # field is the API endpoint and answers with JSON. This is the link for a
    # Slack message, a PR comment, an <a href>.
    print(f"  Report page:      {client.get_report_page_url(scan_id)}")

    # ── get_badge_url ────────────────────────────────────────────────────────
    # Build the badge URL from a scan id without an HTTP call. Equivalent to
    # `report.badge_url` when you already hold a report; useful when all you
    # kept was the id.
    badge_url = client.get_badge_url(scan_id)
    print(f"  Badge URL:        {badge_url}")
    print(f"  Markdown:         ![SkillPlus]({badge_url})")

    # ── get_badge ────────────────────────────────────────────────────────────
    # Fetch the SVG itself, as text. For when you want to inline or cache it
    # rather than hot-link.
    svg = client.get_badge(scan_id)
    first = svg[:40].replace("\n", "")
    print(f'  Badge SVG:        {len(svg)} bytes, starts "{first}…"')

    # The badge is computed by the same pipeline as the report, so it can never
    # disagree with the report page. It is also live: a skill that was Safe when
    # you embedded the badge shows High Risk once a package it installs is found
    # compromised, with nothing on your side changing.
