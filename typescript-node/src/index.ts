#!/usr/bin/env node
import { SkillPlusError } from "skillplus";
import { createClient } from "./client.js";
import { lookup, startScan } from "./lookup.js";
import { printReport } from "./report.js";
import { showBadge } from "./badge.js";

/**
 * Every SkillPlus SDK call, in the order you would meet them.
 *
 *   npm start -- https://www.skills.sh/vercel-labs/skills/find-skills
 *   npm start -- https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
 *
 * The Next.js and Python examples in this repository do exactly the same five
 * steps, so you can read whichever one matches your stack and get the same
 * picture.
 *
 *   1. build a client            client.ts
 *   2. query — is there a report?  lookup.ts
 *   3. scan — make one if not      lookup.ts
 *   4. read everything in it       report.ts
 *   5. fetch by id, and the badge  badge.ts
 */

// A skills.sh URL, which is how most skills are published. A GitHub URL works
// the same way, and a /tree/<branch>/<path> URL picks one skill out of a repo
// that holds many:
//
//   https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
//
const repoUrl = process.argv[2] ?? "https://www.skills.sh/vercel-labs/skills/find-skills";

async function main() {
  const client = createClient();
  console.log(`\nChecking ${repoUrl}\n${"─".repeat(60)}`);

  // ── 2. Query ──────────────────────────────────────────────────────────────
  const result = await lookup(client, repoUrl);

  if (result.status === "not_found") {
    // `scanning` distinguishes "a scan is running right now" from "nothing is
    // happening" — the difference between "come back in a minute" and "you
    // need to ask for one".
    console.log(
      result.scanning
        ? "No report yet — a scan is already running. This takes a few minutes."
        : "No report yet — asking for one.",
    );

    // ── 3. Scan ─────────────────────────────────────────────────────────────
    const ack = await startScan(client, repoUrl);
    console.log(`  accepted: ${ack.accepted}   scanning: ${ack.scanning}`);
    console.log(`  ${ack.message}`);
    if (!ack.accepted) {
      // Deduplicated, not failed. Nothing to retry.
      console.log("  (deduplicated — a scan was already in flight or a fresh report exists)");
    }
    console.log("\nRe-run this command once the scan finishes to see the full report.");
    return;
  }

  // ── 4. Read the report ────────────────────────────────────────────────────
  const report = result.report;
  console.log();
  printReport(report);

  // ── 5. Fetch by id, and the badge ─────────────────────────────────────────
  await showBadge(client, report.scanId);

  // A natural place to turn a verdict into an outcome. `unknown` is grouped
  // with `high` on purpose — it means "not a valid skill", which is a reason to
  // stop rather than a mild result.
  //
  // `medium` passes here. That is a POLICY choice, not a fact about the skill:
  // it means "something is worth a human look", and most skills that legitimately
  // run commands land there. Blocking on it in CI is defensible — add
  // `|| report.verdict === "medium"` — but decide it deliberately rather than
  // inheriting it from an example.
  const blocked = report.verdict === "high" || report.verdict === "unknown";
  console.log(`\n${blocked ? "BLOCKED" : "OK"} — verdict is "${report.verdict}"`);
  process.exitCode = blocked ? 1 : 0;
}

main().catch((err) => {
  // Errors always arrive on the exception channel, never as a status value.
  // SkillPlusError carries the API's own message; anything else is a bug or a
  // network failure. Neither is a verdict — an outage must never read as "safe".
  if (err instanceof SkillPlusError) {
    console.error(`\nSkillPlus API error: ${err.message}`);
  } else {
    console.error(`\nUnexpected error:`, err);
  }
  process.exitCode = 2;
});
