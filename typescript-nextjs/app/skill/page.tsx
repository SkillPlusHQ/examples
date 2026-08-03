import { SkillPlusError } from "skillplus";
import { getSkillPlus } from "@/lib/skillplus";
import { requestScan } from "@/app/actions";
import { ReportView } from "@/app/components/report-view";

export const dynamic = "force-dynamic";

/**
 * Steps 2, 4 and 5, rendered as a page.
 *
 *   /skill?url=https://www.skills.sh/vercel-labs/skills/find-skills
 *   /skill?url=https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
 *
 * The Node and Python examples run the same five steps as a CLI. This is the
 * same flow with a human waiting for it, which changes exactly one thing: the
 * page must never block on a scan.
 */
export default async function SkillPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  if (!url) return <Empty />;

  // ── 2. Query ──────────────────────────────────────────────────────────────
  // `scanIfMissing`, never `wait`. This returns immediately either way — with a
  // report, or with "nothing yet, and a scan is now running". `wait: true`
  // would hold the request open for the minutes an audit takes.
  //
  // Here scanIfMissing is right, unlike in the CLI examples: a page has no
  // later step that could call scan() itself, so one call doing both is exactly
  // what you want. The first visitor triggers the scan and sees progress;
  // everyone after gets the report.
  let result;
  try {
    result = await getSkillPlus().query({ repoUrl: url, scanIfMissing: true });
  } catch (err) {
    // An outage must not render as "this skill is fine". A blank findings list
    // tells the reader a skill is clean when nobody has checked it.
    const message = err instanceof SkillPlusError ? err.message : "Unexpected error";
    return (
      <main className="page">
        <h1>Skill security report</h1>
        <p className="error">Could not reach SkillPlus: {message}</p>
        <p className="muted">This is not a verdict — the skill has not been assessed.</p>
      </main>
    );
  }

  if (result.status === "not_found") {
    return (
      <main className="page">
        <h1>Skill security report</h1>
        <p className="muted">{url}</p>
        <p>
          {result.scanning
            ? "A scan is running. A full multi-agent audit takes a few minutes — reload shortly."
            : "No report yet. A scan has been queued."}
        </p>
      </main>
    );
  }

  // ── 4 and 5 ───────────────────────────────────────────────────────────────
  // ReportView renders every field, and fetches the per-agent detail with
  // getReport — see the comment there for why query alone is not enough.
  return (
    <main className="page">
      <ReportView report={result.report} />
      {/* Step 3, as a form: re-scan on demand via a Server Action. */}
      <form action={requestScan} className="rescan">
        <input type="hidden" name="url" value={url} />
        <button type="submit">Re-scan this skill</button>
        <span className="muted">
          Queues a fresh scan (force: true). Takes a few minutes — reload after.
        </span>
      </form>
    </main>
  );
}

function Empty() {
  // Both URL shapes the API accepts: a skills.sh listing, and a GitHub
  // /tree/<branch>/<path> URL that picks one skill out of a repo of many.
  const examples = [
    "https://www.skills.sh/vercel-labs/skills/find-skills",
    "https://www.skills.sh/obra/superpowers/test-driven-development",
    "https://github.com/anthropics/skills/tree/main/skills/brand-guidelines",
  ];
  return (
    <main className="page">
      <h1>Skill security report</h1>
      <p className="muted">Add a ?url= parameter:</p>
      <ul>
        {examples.map((u) => (
          <li key={u}>
            <a href={`/skill?url=${encodeURIComponent(u)}`}>{u}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
