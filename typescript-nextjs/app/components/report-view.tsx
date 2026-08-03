import type { ScanReport, SeverityNormalized, Verdict } from "skillplus";
import { getSkillPlus } from "@/lib/skillplus";

/**
 * Steps 4 and 5 — every field a report carries, rendered.
 *
 * A Server Component, so it can call the SDK directly. That is the whole reason
 * the per-agent detail below is reachable without an API route of your own.
 */
export async function ReportView({ report }: { report: ScanReport }) {
  // ── Step 5: getReport ─────────────────────────────────────────────────────
  // `query` returns the summary view, in which `aiReport.agents` is null. The
  // per-agent breakdown of the multi-agent audit only comes back from
  // getReport, so fetching by id is what makes the Agents section below
  // possible. If you do not need it, skip this call.
  const detailed = await getSkillPlus().getReport(report.scanId);
  const agents = detailed.aiReport?.agents ?? null;

  // Absolute straight off the report — the SDK resolves it against the
  // configured baseUrl, so it renders correctly from your domain.
  const badgeUrl = report.badgeUrl;

  // NOT report.reportUrl. That field is the API endpoint and answers with JSON,
  // so linking a reader to it drops them on a wall of braces. This is the page.
  const pageUrl = getSkillPlus().getReportPageUrl(report.scanId);

  const sc = report.supplyChain;

  return (
    <>
      <header className="head">
        <div>
          <h1>{report.skillName}</h1>
          <p className="muted">
            {report.source} · {report.skillPath}
          </p>
        </div>
        {/* Four values, not three. `unknown` means the content is not a valid
            skill — rendering it neutral-grey rather than green matters, because
            a reader who sees no colour reads "fine". */}
        <span className={`verdict verdict-${report.verdict}`}>
          {VERDICT_LABEL[report.verdict]}
        </span>
      </header>

      {/* A confirmed-malicious dependency outranks everything else on the page,
          so it renders above the metrics. It also floors the verdict to `high`
          server-side, whatever the rest of the analysis said. */}
      {sc && sc.blacklistHits.length > 0 && (
        <section className="danger">
          <h2>Confirmed-malicious dependency</h2>
          <ul>
            {sc.blacklistHits.map((hit, i) => (
              <li key={i}>
                <code>
                  {hit.ecosystem}:{hit.name}
                  {hit.matchedVersion ? `@${hit.matchedVersion}` : ""}
                </code>{" "}
                <span className="muted">({hit.matchStrength})</span> — {hit.reason}
                {hit.referenceUrl && (
                  <>
                    {" "}
                    <a href={hit.referenceUrl} target="_blank" rel="noreferrer">
                      advisory
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tiles">
        <Tile label="Total issues" value={report.summary.totalIssues} />
        <Tile label="High" value={report.summary.danger} />
        <Tile label="Medium" value={report.summary.warning} />
        <Tile label="Low" value={report.summary.info} />
        <Tile label="Files" value={report.summary.filesScanned} />
        {sc && <Tile label="Dependencies" value={sc.dependencyCount} />}
        {sc && <Tile label="Endpoints" value={sc.endpointCount} />}
      </section>

      {report.aiReport && (
        <section>
          <h2>AI audit</h2>
          <p className="muted mono">
            {report.aiReport.status} · risk {report.aiReport.riskLevel ?? "—"}
            {report.aiReport.tokensUsed ? ` · ${report.aiReport.tokensUsed} tokens` : ""}
          </p>
          {report.aiReport.summary && <p>{report.aiReport.summary}</p>}

          {/* The eight fixed categories, each with file:line evidence — what
              makes a finding checkable rather than an assertion. */}
          <ul className="cats">
            {report.aiReport.analysis.map((cat, i) => (
              <li key={i}>
                <span className={`sev sev-${cat.severity}`}>{cat.status}</span>
                <div>
                  <strong>{cat.category}</strong>
                  {cat.title && <p>{cat.title}</p>}
                  {cat.evidence.slice(0, 2).map((ev, j) => (
                    <p key={j} className="muted mono">
                      {ev}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          {/* Findings the AI judged false positives. They stay visible in
              `issues` — nothing is deleted — but the reasoning is shown. */}
          {report.aiReport.falsePositives.length > 0 && (
            <>
              <h2>Dismissed by the AI audit</h2>
              <ul className="cats">
                {report.aiReport.falsePositives.map((fp, i) => (
                  <li key={i}>
                    <span className="sev sev-safe">FP</span>
                    <div>
                      <strong>{fp.ruleId}</strong>
                      <p className="muted mono">{fp.file}</p>
                      <p>{fp.reason}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {agents && (
        <section>
          <h2>Agents ({agents.length})</h2>
          <p className="muted">
            Only available from <code>getReport</code> — a <code>query</code> response
            leaves this null.
          </p>
          <ul className="cats">
            {agents.map((run, i) => (
              <li key={i}>
                <span className={`sev sev-${run.status === "completed" ? "safe" : "high"}`}>
                  {run.status}
                </span>
                <div>
                  <strong>{run.agent}</strong>
                  <p className="muted">
                    {run.findings.length} finding(s)
                    {run.errorMessage ? ` — ${run.errorMessage}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Findings issues={report.issues} />

      <footer className="foot">
        {/* The badge is live: it re-renders with the current verdict every time
            it loads. A skill that was Safe when you embedded it shows High Risk
            once a package it installs is found compromised — with nothing on
            your side changing. */}
        <img src={badgeUrl} alt={`SkillPlus verdict: ${report.verdict}`} />
        <a href={pageUrl} target="_blank" rel="noreferrer">
          Full report on skillplus.xyz →
        </a>
      </footer>
    </>
  );
}

const VERDICT_LABEL: Record<Verdict, string> = {
  safe: "Safe",
  medium: "Caution",
  high: "High Risk",
  unknown: "Unrated",
};

// Typed as the full union: the scale also carries `safe`, for a check that
// passed. Leaving it out compiles only until a report contains one.
const SEV_ORDER: Record<SeverityNormalized, number> = { high: 0, medium: 1, low: 2, safe: 3 };

function Findings({ issues }: { issues: ScanReport["issues"] }) {
  if (issues.length === 0) return null;

  // Sort on `severityNormalized`, not `severity`: reports scanned before the
  // current rating system carry danger/warning/info, and sorting on the raw
  // field interleaves them arbitrarily with newer ones.
  const sorted = [...issues].sort(
    (a, b) => SEV_ORDER[a.severityNormalized] - SEV_ORDER[b.severityNormalized],
  );

  return (
    <section>
      <h2>Rule findings ({issues.length})</h2>
      <ul className="cats">
        {sorted.slice(0, 20).map((issue, i) => (
          <li key={i}>
            <span className={`sev sev-${issue.severityNormalized}`}>
              {issue.severityNormalized}
            </span>
            <div>
              <strong>{issue.ruleId}</strong>
              <p>{issue.message}</p>
              {issue.file && (
                <p className="muted mono">
                  {issue.file}
                  {issue.line ? `:${issue.line}` : ""}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {issues.length > 20 && <p className="muted">… {issues.length - 20} more</p>}
    </section>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="tile">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
