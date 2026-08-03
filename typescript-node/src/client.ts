import { SkillPlus } from "skillplus";

/**
 * Step 1 of 5 — construct the client.
 *
 * `apiKey` is the only required option. The other four are shown here with
 * their defaults so you can see what exists; delete the ones you do not need.
 */
export function createClient(): SkillPlus {
  const apiKey = process.env.SKILLPLUS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "SKILLPLUS_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }

  return new SkillPlus({
    apiKey,

    // Point at a different deployment — staging, or self-hosted.
    // Default: https://skillplus.xyz
    baseUrl: process.env.SKILLPLUS_BASE_URL ?? "https://skillplus.xyz",

    // Per-request timeout. This bounds ONE HTTP call, not a `wait: true`
    // operation — waiting is many short calls in a loop, governed by
    // waitTimeoutMs instead. Setting this to 10 minutes to "allow for scans"
    // is a common mistake and does nothing useful.
    // Default: 30_000
    timeoutMs: 30_000,

    // Extra attempts on 429 / 502 / 503, network errors and timeouts, honouring
    // Retry-After. Applies per call, so a `wait: true` loop retries each poll.
    // Default: 2
    maxRetries: 2,

    // Bring your own fetch — a proxy-aware one, or a mock in tests.
    // Default: global fetch
    // fetch: myFetch,
  });
}
