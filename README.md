<img src="https://skillplus.xyz/banner.png" alt="SkillPlus" width="100%">

# SkillPlus SDK examples

[SkillPlus](https://skillplus.xyz) tells you whether an AI agent skill is safe to
install: a rule engine, a five-agent AI audit, and a supply-chain graph, behind
one API. These are runnable examples of putting its SDK into a real project.

| Example | Stack | Run it |
|---|---|---|
| [`typescript-node`](typescript-node) | Node 20.12+ | `npm start -- <skill-url>` |
| [`typescript-nextjs`](typescript-nextjs) | Next.js App Router | `npm run dev` → `/skill?url=<skill-url>` |
| [`python`](python) | Python 3.10+ | `python -m skillplus_example <skill-url>` |

All three do the same five things: look up a skill's report, scan it if there is
none, print every field the report carries, fetch the badge, and turn the verdict
into an exit code. Pick the one closest to your stack and ignore the rest.

You need an API key: email **skillplus@proton.me**. Then copy `.env.example` to
`.env` and put the key in it. Running an example costs nothing — the default path
only reads an existing report.

## What each example shows

**A working integration, not a snippet.** Where the key lives, how the client is
configured, and how the pieces sit in a project you would actually ship —
including the Next.js `server-only` boundary that turns leaking your key into a
build error rather than a bad afternoon.

**Every SDK call in context**, with the part a type signature cannot tell you:
when to reach for it, and what it costs.

| Call | Reach for it when | Where |
|---|---|---|
| `new SkillPlus({ … })` | every option, shown with its default | `client` |
| `query` | you want the verdict — read-only, or read-and-queue | `lookup` |
| `scan` | there is no report yet and you want one made | `lookup` |
| every `ScanReport` field | you are deciding what to render | `report` |
| `getReport` | you kept a scan id, or you need the per-agent detail | `badge` |
| `getReportPageUrl`, `getBadgeUrl`, `getBadge` | you are linking or embedding | `badge` |
| `SkillPlusError` | always — an outage must never read as "safe" | entry point |

The three examples use the same five filenames for the same five steps, so you can
also read one against another. A drift check on our side asserts that every public
SDK method still appears here, so this table stays true as the SDK moves.

## What it prints

```
  Skill         find-skills
  Source        vercel-labs/skills · skills/find-skills
  Verdict       safe   (legacy rating: safe)
  Summary       3 issues — 0 high / 0 medium / 0 low · 1 files

  AI audit:
    status     completed   risk: LOW
    fail   EXTERNAL_DOWNLOADS (low, confidence 0.78)
           Unpinned skills CLI creates supply-chain risk at gateway position
           evidence: npm:skills — UNPINNED, resolves to latest at install time

  Supply chain: 1 dependencies · 2 endpoints
  Report page:  https://skillplus.xyz/report/cfd7bbde-…

OK — verdict is "safe"
```

## Documentation

- Docs: <https://docs.skillplus.xyz>
- TypeScript SDK: [`skillplus`](https://www.npmjs.com/package/skillplus) · [source](https://github.com/SkillPlusHQ/skillplus-typescript)
- Python SDK: [`skillplus`](https://pypi.org/project/skillplus/) · [source](https://github.com/SkillPlusHQ/skillplus-python)

---

MIT licensed — copy anything here into your own project.
