import type { SkillPlus } from "skillplus";

/**
 * Step 5 — the remaining three methods: getReport, getBadgeUrl, getBadge.
 */
export async function showBadge(client: SkillPlus, scanId: string): Promise<void> {
  // ── getReport ─────────────────────────────────────────────────────────────
  // Fetch a report by id. Two reasons to use it rather than `query`:
  //
  //   1. You stored the scanId and do not want to resolve the URL again.
  //   2. It returns MORE than query does. The per-agent breakdown of the
  //      multi-agent audit (`aiReport.agents`) is null on a query response and
  //      populated here — so if you want to show which specialist found what,
  //      this is the call that has it.
  const again = await client.getReport(scanId);
  console.log(`\n  Re-fetched by id: ${again.skillName} → ${again.verdict}`);

  const agents = again.aiReport?.agents;
  if (agents) {
    console.log(`  Agents (${agents.length}) — only available from getReport:`);
    for (const run of agents) {
      const note = run.errorMessage ? ` — ${run.errorMessage}` : "";
      console.log(`    ${run.agent.padEnd(14)} ${run.status}, ${run.findings.length} finding(s)${note}`);
    }
  }

  // ── getReportPageUrl ──────────────────────────────────────────────────────
  // The report as a person reads it. This is NOT `report.reportUrl` — that
  // field is the API endpoint and answers with JSON. This is the link for a
  // Slack message, a PR comment, an <a href>.
  console.log(`  Report page:      ${client.getReportPageUrl(scanId)}`);

  // ── getBadgeUrl ───────────────────────────────────────────────────────────
  // Build the badge URL from a scan id without an HTTP call. Equivalent to
  // `report.badgeUrl` when you already hold a report; useful when all you kept
  // was the id.
  const badgeUrl = client.getBadgeUrl(scanId);
  console.log(`  Badge URL:        ${badgeUrl}`);
  console.log(`  Markdown:         ![SkillPlus](${badgeUrl})`);

  // ── getBadge ──────────────────────────────────────────────────────────────
  // Fetch the SVG itself, as text. For when you want to inline or cache it
  // rather than hot-link.
  const svg = await client.getBadge(scanId);
  console.log(`  Badge SVG:        ${svg.length} bytes, starts "${svg.slice(0, 40).replace(/\n/g, "")}…"`);

  // The badge is computed by the same pipeline as the report, so it can never
  // disagree with the report page. It is also live: a skill that was Safe when
  // you embedded the badge will show High Risk once a package it installs is
  // found compromised, with nothing on your side changing.
}
