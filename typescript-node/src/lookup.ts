import type { SkillPlus, QueryResult, ScanAck, ScanReport } from "skillplus";

/**
 * Steps 2 and 3 — get a report, scanning if there is not one yet.
 *
 * These are the two calls that make something happen; everything else in the SDK
 * reads what they produced. Choosing between them is a question about who is
 * waiting.
 */

/**
 * Step 2 — `query`: is there a report?
 *
 * The answer is binary. `status` is `"found"` (report attached) or
 * `"not_found"` (report is null). There is no third state to handle, and
 * failures arrive as thrown `SkillPlusError`s rather than as a status value —
 * so a `status` check can never accidentally swallow an outage.
 *
 * Three modes, in increasing order of how long they can take:
 */
export async function lookup(client: SkillPlus, repoUrl: string): Promise<QueryResult> {
  // 2a. Read only. Returns whatever exists right now and never triggers work.
  //     This is what the example uses, so that step 3 below is visibly the
  //     thing that starts a scan.
  const readOnly: QueryResult = await client.query({ repoUrl });

  // 2b. Read, and queue a scan if nothing exists. Still returns immediately:
  //     `not_found` with `scanning: true`, and the report is there next time.
  //
  //     This is the better default for a real detail page — one call instead of
  //     two, and the first visitor pays nothing. It is commented out here only
  //     because combining it with an explicit scan() below would queue the same
  //     scan twice and report a confusing "accepted, already in progress".
  //     Use ONE of the two, not both.
  //
  //   await client.query({ repoUrl, scanIfMissing: true });

  // 2c. Read, scanning if needed, and BLOCK until a completed report exists.
  //     `wait: true` implies scanIfMissing. This runs a full multi-agent audit,
  //     so it takes MINUTES — fine in CI or a batch job, never in a request
  //     handler.
  //
  //     The overload also narrows the type: with `wait: true` the result is
  //     `QueryFound`, so `.report` is non-null without a check.
  //
  //   const waited = await client.query({ repoUrl, wait: true });
  //   console.log(waited.report.verdict);  // no narrowing needed

  return readOnly;
}

/**
 * Step 3 — `scan`: ask for work to be done.
 *
 * Also two modes, and the return type differs between them.
 */
export async function startScan(client: SkillPlus, repoUrl: string): Promise<ScanAck> {
  // 3a. Fire-and-forget. Returns an acknowledgement, not a report.
  //
  //     `accepted: false` is NOT an error — it means the request was
  //     deduplicated, because a scan is already running or a fresh report
  //     already exists. Treating it as a failure and retrying is the usual bug
  //     here; the correct reading is "nothing more for you to do".
  const ack = await client.scan({
    repoUrl,

    // Scan a specific skill inside a multi-skill repository.
    // skillPath: "skills/my-skill",

    // Re-scan even when a fresh report exists. Without this, a repeat call is
    // deduplicated and returns accepted: false.
    // force: true,
  });

  return ack;
}

/**
 * 3b. Scan and wait — returns the ScanReport itself rather than an ack.
 *
 * Combined with `force: true`, the SDK does something worth knowing about: it
 * remembers the report that existed before, and will not accept that same old
 * report as the answer. Without that, a forced re-scan would return instantly
 * with the stale report and look like it had worked.
 *
 * Minutes, not seconds. Never call this from a request handler.
 */
export async function scanAndWait(client: SkillPlus, repoUrl: string): Promise<ScanReport> {
  return client.scan({
    repoUrl,
    wait: true,

    // How often to poll while waiting. Default 5_000.
    waitIntervalMs: 5_000,

    // Give up after this long and throw. Default 600_000 (10 minutes).
    waitTimeoutMs: 600_000,
  });
}
