# typescript-node

One of three parallel SkillPlus SDK examples — see [../README.md](../README.md)
for the map. All three do the same five steps; this is the typescript-node one.

## Run it

```bash
npm install
cp .env.example .env      # add SKILLPLUS_API_KEY
npm start -- https://www.skills.sh/vercel-labs/skills/find-skills
```

A GitHub URL works the same way, and `/tree/<branch>/<path>` picks one skill out
of a repo that holds many:

```bash
npm start -- https://github.com/anthropics/skills/tree/main/skills/brand-guidelines
```

## The five steps

| Step | File |
|---|---|
| 1. build a client | [`src/client.ts`](src/client.ts) |
| 2. `query` | [`src/lookup.ts`](src/lookup.ts) |
| 3. `scan` | [`src/lookup.ts`](src/lookup.ts) |
| 4. read the report | [`src/report.ts`](src/report.ts) |
| 5. `getReport` / badge | [`src/badge.ts`](src/badge.ts) |

`src/index.ts` wires them together.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | verdict is `safe` or `medium` |
| `1` | verdict is `high` or `unknown` |
| `2` | misconfigured, or the API could not be reached |

`2` is deliberately distinct from `1`: an outage is not a verdict, and code that
treats "could not check" as "clean" turns a SkillPlus incident into a silent
pass. That is the single most important line to copy out of this example.
