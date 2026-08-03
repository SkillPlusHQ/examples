"use server";

import { revalidatePath } from "next/cache";
import { SkillPlusError } from "skillplus";
import { getSkillPlus } from "@/lib/skillplus";

/**
 * Step 3 — `scan`, from a form.
 *
 * A Server Action is the right home for this: it runs on the server, so the API
 * key stays there, and it needs no API route of your own.
 *
 * Note what this does NOT do: `scan({ wait: true })`. Waiting blocks for the
 * minutes a multi-agent audit takes, which would hold the request open and time
 * out. Fire-and-forget, then let the page re-render and report progress.
 */
export async function requestScan(formData: FormData): Promise<void> {
  const url = String(formData.get("url") ?? "");
  if (!url) return;

  try {
    // `force: true` re-scans even when a fresh report exists — that is what
    // makes this button meaningful rather than a no-op on an already-scanned
    // skill.
    await getSkillPlus().scan({ repoUrl: url, force: true });
  } catch (err) {
    // Swallowing this would leave the user pressing a button that silently
    // does nothing. Logging it server-side is the minimum; a real app would
    // surface it with useActionState.
    console.error("scan failed:", err instanceof SkillPlusError ? err.message : err);
  }

  revalidatePath("/skill");
}
