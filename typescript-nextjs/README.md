# typescript-nextjs

One of three parallel SkillPlus SDK examples — see [../README.md](../README.md)
for the map. All three do the same five steps; this is the typescript-nextjs one.

## Run it

```bash
npm install
cp .env.example .env.local   # add SKILLPLUS_API_KEY
npm run dev
# then open /skill?url=https://www.skills.sh/vercel-labs/skills/find-skills
```

A GitHub URL works the same way, and `/tree/<branch>/<path>` picks one skill out
of a repo that holds many —
`?url=https://github.com/anthropics/skills/tree/main/skills/brand-guidelines`.

## The five steps

| Step | File |
|---|---|
| 1. build a client | [`lib/skillplus.ts`](lib/skillplus.ts) |
| 2. `query` | [`app/skill/page.tsx`](app/skill/page.tsx) |
| 3. `scan` | [`app/actions.ts`](app/actions.ts) — a Server Action |
| 4. read the report | [`app/components/report-view.tsx`](app/components/report-view.tsx) |
| 5. `getReport` / badge | [`app/components/report-view.tsx`](app/components/report-view.tsx) |

## The key cannot reach the browser — enforced, not remembered

`lib/skillplus.ts` starts with `import "server-only"`. Import it from a Client
Component and **the build fails**:

```
Failed to compile.
./lib/skillplus.ts
  x You're importing a component that needs "server-only".
```

A comment saying "don't use this on the client" works until someone is in a
hurry. This works always. Same reasoning behind `SKILLPLUS_API_KEY` rather than
`NEXT_PUBLIC_SKILLPLUS_API_KEY` — that prefix means "inline into client
bundles", which for a credential is exactly wrong.

The client is also built on first use, not at import, so `next build` succeeds
on a fresh clone before you have a key.

## Three states, all rendered

A page that only handles the happy path is the usual bug here. All three are in
`app/skill/page.tsx`:

| State | What the reader sees |
|---|---|
| report exists | verdict, findings, AI audit, agents, badge |
| `not_found` | "a scan is running" / "a scan has been queued" |
| `SkillPlusError` | "could not reach SkillPlus" — explicitly **not** a verdict |

If an API failure renders as an empty findings list, the page tells the reader a
skill is clean when nobody has checked it.

## Why the re-scan button does not wait

`app/actions.ts` calls `scan({ force: true })` without `wait`. Waiting would hold
the request open for the minutes an audit takes and time out. Fire-and-forget,
then let the page re-render and report progress.
