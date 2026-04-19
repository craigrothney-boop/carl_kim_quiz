import type { QuestionRow } from "@/lib/firestore-repo";
import { normalizePrompt, topicKeyFromQuestion } from "@/lib/question-topic";

/** Broad numeracy “strand” for balancing maths picks in a quiz. */
export type MathsStrand =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fractions_ratio"
  | "geometry_measure"
  | "algebra_ratio"
  | "number_sense";

/**
 * Heuristic classification from prompt/topic. Used to avoid five near-identical
 * addition drills when the Firestore bank is skewed.
 */
export function inferMathsStrand(
  q: Pick<QuestionRow, "prompt" | "topic">,
): MathsStrand {
  const t = (q.topic ?? "").toLowerCase();
  const p = q.prompt.toLowerCase();
  const combined = `${t} ${p}`;

  if (t.includes("_drill_mul") || t.includes("_maths_mul")) {
    return "multiplication";
  }
  if (t.includes("_drill_div") || t.includes("_maths_div")) {
    return "division";
  }
  if (t.includes("_drill_sub")) return "subtraction";
  if (t.includes("_drill_add")) return "addition";
  if (t.includes("_drill_word_mul") || t.includes("context_mul")) {
    return "multiplication";
  }

  if (
    /\b(times|multiply|multiplication|each row|per day|each bag|×\s*\d|\d\s*×\s*)/.test(
      combined,
    ) ||
    /\*\s*\d|\d\s*\*/.test(p)
  ) {
    return "multiplication";
  }
  if (
    /\b(divide|divided|division|share equally|each gets|each child|÷|split)\b/.test(
      combined,
    ) ||
    /\d\s*÷\s*\d/.test(p)
  ) {
    return "division";
  }
  if (
    /\b(fraction|half of|quarter|third of|percent|%|decimal|0\.\d)\b/.test(
      combined,
    ) ||
    /\d+\s*\/\s*\d+/.test(p)
  ) {
    return "fractions_ratio";
  }
  if (
    /\b(ratio|proportion|negative|algebra|find x|missing number)\b/.test(
      combined,
    ) ||
    /\bx\s*=|\bx\s*\+\s*\d/.test(p)
  ) {
    return "algebra_ratio";
  }
  if (
    /\b(area|perimeter|rectangle|triangle|parallel|angle|degree|clock|minute hand|hour hand|centimetre|kilogram)\b/.test(
      combined,
    )
  ) {
    return "geometry_measure";
  }
  if (
    /\d\s*(\u2212|-)\s*\d|\bminus\b|\bsubtract\b|\btake away\b|\bfewer than\b|\bless than\b|\bhow many more\b|\bleft over\b/.test(
      combined,
    )
  ) {
    return "subtraction";
  }
  if (
    /\+|\bplus\b|\baltogether\b|\bin total\b|\bsum of\b|\badd(ed)?\b/.test(
      combined,
    )
  ) {
    return "addition";
  }
  if (
    /\b(which is bigger|which number is greater|put these in order|round to|estimate)\b/.test(
      combined,
    )
  ) {
    return "number_sense";
  }
  return "number_sense";
}

/** Prefer these strands first when choosing up to five maths questions for a class. */
export function strandPriorityForYear(centerYear: number): MathsStrand[] {
  const y = Math.min(7, Math.max(1, Math.round(centerYear)));
  switch (y) {
    case 1:
      return [
        "addition",
        "subtraction",
        "number_sense",
        "geometry_measure",
        "fractions_ratio",
        "multiplication",
        "division",
        "algebra_ratio",
      ];
    case 2:
      return [
        "subtraction",
        "addition",
        "number_sense",
        "multiplication",
        "geometry_measure",
        "fractions_ratio",
        "division",
        "algebra_ratio",
      ];
    case 3:
      return [
        "multiplication",
        "subtraction",
        "addition",
        "fractions_ratio",
        "division",
        "geometry_measure",
        "number_sense",
        "algebra_ratio",
      ];
    case 4:
      return [
        "multiplication",
        "division",
        "subtraction",
        "addition",
        "geometry_measure",
        "fractions_ratio",
        "algebra_ratio",
        "number_sense",
      ];
    case 5:
      return [
        "multiplication",
        "division",
        "fractions_ratio",
        "geometry_measure",
        "algebra_ratio",
        "subtraction",
        "addition",
        "number_sense",
      ];
    case 6:
    case 7:
      return [
        "algebra_ratio",
        "multiplication",
        "division",
        "fractions_ratio",
        "geometry_measure",
        "subtraction",
        "addition",
        "number_sense",
      ];
    default:
      return [
        "multiplication",
        "subtraction",
        "addition",
        "division",
        "fractions_ratio",
        "geometry_measure",
        "algebra_ratio",
        "number_sense",
      ];
  }
}

/**
 * Pick up to `count` maths questions, preferring distinct strands before
 * falling back to a uniform shuffle.
 */
export function pickDiverseMathsQuestions(
  candidates: QuestionRow[],
  count: number,
  centerYear: number,
  forbiddenTopicKeys: Set<string>,
  /** Prompt fingerprints already used in this quiz (e.g. from GK slots). */
  forbiddenFingerprints: Set<string>,
): QuestionRow[] {
  const usable = candidates.filter((q) => {
    if (forbiddenTopicKeys.has(topicKeyFromQuestion(q))) return false;
    if (forbiddenFingerprints.has(normalizePrompt(q.prompt))) return false;
    return true;
  });
  shuffleInPlace(usable);

  const byStrand = new Map<MathsStrand, QuestionRow[]>();
  for (const q of usable) {
    const s = inferMathsStrand(q);
    if (!byStrand.has(s)) byStrand.set(s, []);
    byStrand.get(s)!.push(q);
  }
  for (const arr of byStrand.values()) shuffleInPlace(arr);

  const order = strandPriorityForYear(centerYear);
  const picked: QuestionRow[] = [];
  const usedTopics = new Set<string>(forbiddenTopicKeys);
  const usedFingerprints = new Set<string>(forbiddenFingerprints);

  const takeFromStrand = (s: MathsStrand): boolean => {
    const pool = byStrand.get(s);
    if (!pool?.length) return false;
    while (pool.length) {
      const q = pool.shift()!;
      const tk = topicKeyFromQuestion(q);
      const fp = normalizePrompt(q.prompt);
      if (usedTopics.has(tk) || usedFingerprints.has(fp)) continue;
      picked.push(q);
      usedTopics.add(tk);
      usedFingerprints.add(fp);
      return true;
    }
    return false;
  };

  let stuck = 0;
  while (picked.length < count && stuck < order.length * 4) {
    let progress = false;
    for (const s of order) {
      if (picked.length >= count) break;
      if (takeFromStrand(s)) progress = true;
    }
    if (!progress) stuck++;
    else stuck = 0;
  }

  const remaining = usable.filter((q) => !picked.some((p) => p.id === q.id));
  shuffleInPlace(remaining);
  for (const q of remaining) {
    if (picked.length >= count) break;
    const tk = topicKeyFromQuestion(q);
    const fp = normalizePrompt(q.prompt);
    if (usedTopics.has(tk) || usedFingerprints.has(fp)) continue;
    picked.push(q);
    usedTopics.add(tk);
    usedFingerprints.add(fp);
  }

  return picked;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]!];
  }
}
