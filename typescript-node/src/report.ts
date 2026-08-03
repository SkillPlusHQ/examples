import type { ScanReport } from "skillplus";

/**
 * Step 4 — everything a report contains.
 *
 * This prints the whole surface rather than the two or three fields a real
 * integration usually wants, because the point here is to show you what is
 * available. Copy the parts you need.
 */
export function printReport(report: ScanReport): void {
  // ── Identity ──────────────────────────────────────────────────────────────
  line("Skill", report.skillName);
  line("Source", `${report.source} · ${report.skillPath}`);
  // Content hash. Two scans with the same treeSha looked at identical bytes,
  // which is how you tell "re-scanned" from "the skill actually changed".
  line("Content hash", report.treeSha);
  line("Rule version", report.ruleVersion);
  line("Scanned at", `${report.scannedAt}${report.cached ? " (cached)" : ""}`);

  // ── The verdict ───────────────────────────────────────────────────────────
  // Prefer `verdict` over `rating`. `rating` is the legacy five-value field;
  // `verdict` folds it onto the current scale, so reports scanned before the
  // rating system changed still compare correctly against new ones.
  //
  // FOUR values, not three: safe | medium | high | unknown.
  // `unknown` means the content is not a valid skill. It is not a synonym for
  // safe, and code that only checks `=== "high"` will let it through.
  line("Verdict", `${report.verdict}   (legacy rating: ${report.rating})`);
  line("Valid skill", String(report.validSkill));

  // Set by an administrator, and they override the computed verdict — worth
  // surfacing so a reader knows why a verdict looks surprising.
  if (report.blacklisted) line("Blacklisted", "yes (admin)");
  if (report.whitelisted) line("Whitelisted", "yes (admin)");

  // ── Summary counts ────────────────────────────────────────────────────────
  const s = report.summary;
  line(
    "Summary",
    `${s.totalIssues} issues — ${s.danger} high / ${s.warning} medium / ${s.info} low` +
      ` · ${s.filesScanned} files · ${report.scanDurationMs}ms`,
  );
  if (Object.keys(s.byCategory ?? {}).length > 0) {
    line("By category", JSON.stringify(s.byCategory));
  }

  // ── Rule findings ─────────────────────────────────────────────────────────
  // Use `severityNormalized`, not `severity`. The raw field still carries
  // danger/warning/info on older reports; the normalized one is always
  // high | medium | low | safe, so sorting and filtering behave consistently
  // across report generations.
  console.log(`\n  Rule findings (${report.issues.length}):`);
  for (const issue of report.issues.slice(0, 5)) {
    const where = issue.file ? ` ${issue.file}${issue.line ? `:${issue.line}` : ""}` : "";
    console.log(`    [${issue.severityNormalized}] ${issue.ruleId} — ${issue.message}${where}`);
  }
  if (report.issues.length > 5) {
    console.log(`    … ${report.issues.length - 5} more`);
  }

  // ── AI audit ──────────────────────────────────────────────────────────────
  // Null when the skill has only been through the rule engine.
  if (report.aiReport) {
    const ai = report.aiReport;
    console.log("\n  AI audit:");
    console.log(`    status     ${ai.status}   risk: ${ai.riskLevel ?? "—"}`);
    if (ai.summary) console.log(`    summary    ${truncate(ai.summary, 300)}`);
    if (ai.tokensUsed) console.log(`    cost       ${ai.tokensUsed} tokens · ${ai.durationMs}ms`);

    // Findings the AI judged to be false positives. They stay visible in
    // `issues` — nothing is deleted — but the audit explains why it disagreed.
    for (const fp of ai.falsePositives) {
      console.log(`    dismissed  ${fp.ruleId} in ${fp.file}: ${fp.reason}`);
    }

    // The eight fixed categories. `status` is the pass/fail word and `severity`
    // grades a failure; `evidence` carries the file:line citations that make a
    // finding checkable rather than an assertion.
    for (const cat of ai.analysis) {
      console.log(
        `    ${cat.status.padEnd(6)} ${cat.category} (${cat.severity}, confidence ${cat.confidence})`,
      );
      if (cat.title) console.log(`           ${cat.title}`);
      for (const ev of cat.evidence.slice(0, 2)) console.log(`           evidence: ${ev}`);
    }

    // Per-agent breakdown. Null here on purpose: `query` returns the summary
    // view, and the agent detail only comes back from `getReport`. If you need
    // to show which specialist found what, fetch by id — see badge.ts.
    console.log(`    agents     ${ai.agents ? String(ai.agents.length) : "null (use getReport)"}`);

    // A refusal or model failure lands here. An error message with a `safe`
    // risk level does NOT mean the skill is safe — it means nobody looked.
    if (ai.errorMessage) console.log(`    error      ${ai.errorMessage}`);
  }

  // ── Supply chain ──────────────────────────────────────────────────────────
  // The reason a report can change without the skill changing. Every dependency
  // and endpoint is kept, so when a package is later found compromised, this
  // report starts reporting a hit — with nothing re-scanned.
  if (report.supplyChain) {
    const sc = report.supplyChain;
    console.log(
      `\n  Supply chain: ${sc.dependencyCount} dependencies · ${sc.endpointCount} endpoints`,
    );
    // A non-empty blacklistHits is the hardest signal in the whole report: a
    // package this skill installs is confirmed malicious. It floors the verdict
    // to `high` regardless of what anything else says.
    for (const hit of sc.blacklistHits) {
      console.log(
        `    MALICIOUS ${hit.ecosystem}:${hit.name}` +
          `${hit.matchedVersion ? `@${hit.matchedVersion}` : ""}` +
          ` (${hit.matchStrength}) — ${hit.reason}`,
      );
      if (hit.referenceUrl) console.log(`              ${hit.referenceUrl}`);
    }
  }

  // ── Where this skill is published ─────────────────────────────────────────
  for (const listing of report.platformListings) {
    line("Listed on", `${listing.platform} — ${listing.installs} installs — ${listing.url}`);
  }
  if (Object.keys(report.externalLinks ?? {}).length > 0) {
    line("Links", JSON.stringify(report.externalLinks));
  }

  // ── Shareable ─────────────────────────────────────────────────────────────
  // Absolute, ready to use — the SDK resolves it against the baseUrl you
  // configured, so it works from any origin.
  //
  // Read the name carefully: this is the API endpoint, and it returns the JSON
  // this function just printed. The page you send a PERSON to is a different
  // URL — client.getReportPageUrl(scanId), demonstrated in badge.ts.
  line("Report JSON", report.reportUrl);
}

function line(label: string, value: string): void {
  console.log(`  ${label.padEnd(14)}${value}`);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
