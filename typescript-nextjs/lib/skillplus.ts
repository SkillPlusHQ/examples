import "server-only";
import { SkillPlus } from "skillplus";

/**
 * Step 1 of 5 — construct the client.
 *
 * The API key must never reach the browser, and the `server-only` import above
 * is what enforces that. Import this module from a Client Component and the
 * build fails with an explicit error, instead of succeeding and shipping your
 * key inside the JavaScript bundle. That is the difference between a rule you
 * have to remember and one the compiler keeps.
 *
 * Same reasoning behind the variable name: `SKILLPLUS_API_KEY`, not
 * `NEXT_PUBLIC_SKILLPLUS_API_KEY`. The `NEXT_PUBLIC_` prefix means "inline this
 * into client bundles", which for a credential is exactly wrong.
 *
 * The client is built on first use rather than at import, so `next build` works
 * on a fresh clone before anyone has a key to add. Missing configuration should
 * surface when you call the API, not when you compile.
 */
let client: SkillPlus | null = null;

export function getSkillPlus(): SkillPlus {
  if (client) return client;

  const apiKey = process.env.SKILLPLUS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SKILLPLUS_API_KEY is not set. Copy .env.example to .env.local and add your key.",
    );
  }

  client = new SkillPlus({
    apiKey,
    // Staging or self-hosted. Default: https://skillplus.xyz
    baseUrl: process.env.SKILLPLUS_BASE_URL ?? "https://skillplus.xyz",
    // Bounds ONE HTTP call. Not the ceiling for a `wait: true` operation —
    // that is many short calls governed by waitTimeoutMs. Default: 30_000
    timeoutMs: 30_000,
    // Retries on 429 / 502 / 503, honouring Retry-After. Default: 2
    maxRetries: 2,
  });
  return client;
}
