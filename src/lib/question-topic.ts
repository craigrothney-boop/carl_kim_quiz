import type { QuestionRow } from "@/lib/firestore-repo";

/** Normalise a topic tag for stable Set comparisons (lowercase snake_case). */
export function normalizeTopicTag(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "";
  return s
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64) || "topic";
}

/**
 * Dedup key for a question: stored `topic` when present, else a per-id legacy key
 * so old Firestore rows without `topic` still behave sensibly.
 */
export function topicKeyFromQuestion(
  q: Pick<QuestionRow, "id" | "topic">,
): string {
  if (q.topic?.trim()) {
    const n = normalizeTopicTag(q.topic);
    if (n) return n;
  }
  const idPart = q.id.replace(/[^a-z0-9]+/gi, "").slice(0, 32).toLowerCase();
  return `legacy_${idPart || "q"}`;
}

/** Derive a topic tag from prompt text (seed / migration). */
export function defaultTopicFromPrompt(prompt: string): string {
  const words = prompt
    .replace(/[?!.,'"`]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 14);
  let t = normalizeTopicTag(words.join("_"));
  if (t.length < 6) {
    t = normalizeTopicTag(`${prompt.slice(0, 40)}_${prompt.length}`);
  }
  return t || "question";
}
