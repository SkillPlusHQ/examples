export default function Home() {
  // Both URL shapes the API accepts: a skills.sh listing, and a GitHub
  // /tree/<branch>/<path> URL that picks one skill out of a repo of many.
  const examples = [
    "https://www.skills.sh/vercel-labs/skills/find-skills",
    "https://www.skills.sh/obra/superpowers/test-driven-development",
    "https://github.com/anthropics/skills/tree/main/skills/brand-guidelines",
  ];
  return (
    <main className="page">
      <h1>SkillPlus SDK — Next.js example</h1>
      <p className="muted">
        The same five steps as the Node and Python examples, rendered as a page. The
        API key stays on the server — see <code>lib/skillplus.ts</code>.
      </p>
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
