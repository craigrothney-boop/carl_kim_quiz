import { primaryClassToYear, targetYearPriority } from "@/lib/primary-year";
import { generateAndStoreQuestions } from "@/lib/ai-questions";
import { pickDiverseMathsQuestions } from "@/lib/maths-strand";
import { topicKeyFromQuestion } from "@/lib/question-topic";
import {
  createQuizAttemptWithGkSeen,
  getGkSeenIds,
  getQuestionsByIds,
  listQuestionsBySubject,
  listQuestionsBySubjectAndYear,
  type QuestionRow,
} from "@/lib/firestore-repo";
import type { PrimaryClass, Subject } from "@/types/app";

const QUIZ_LEN = 20;
const MATHS_COUNT = 5;
const GK_COUNT = 15;

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function pickMathsSlots(): number[] {
  const idx = Array.from({ length: QUIZ_LEN }, (_, i) => i);
  shuffleInPlace(idx);
  return idx.slice(0, MATHS_COUNT).sort((a, b) => a - b);
}

async function fetchGkPool(
  userId: string,
  yearPriority: number[],
): Promise<QuestionRow[]> {
  const seen = await getGkSeenIds(userId);
  const picked: QuestionRow[] = [];
  const pickedIds = new Set<string>();
  const usedTopics = new Set<string>();

  for (const y of yearPriority) {
    if (picked.length >= GK_COUNT) break;
    const exclude = new Set([...seen, ...pickedIds]);
    const batch = await listQuestionsBySubjectAndYear(
      "GENERAL_KNOWLEDGE",
      y,
      400,
    );
    const filtered = batch.filter(
      (q) =>
        !exclude.has(q.id) && !usedTopics.has(topicKeyFromQuestion(q)),
    );
    shuffleInPlace(filtered);
    for (const q of filtered) {
      if (picked.length >= GK_COUNT) break;
      picked.push(q);
      pickedIds.add(q.id);
      usedTopics.add(topicKeyFromQuestion(q));
    }
  }

  // Second pass: any target year, still excluding questions this pupil has already had.
  if (picked.length < GK_COUNT) {
    const exclude = new Set([...seen, ...pickedIds]);
    const broad = await listQuestionsBySubject("GENERAL_KNOWLEDGE", 4000);
    const filtered = broad.filter(
      (q) =>
        !exclude.has(q.id) && !usedTopics.has(topicKeyFromQuestion(q)),
    );
    shuffleInPlace(filtered);
    for (const q of filtered) {
      if (picked.length >= GK_COUNT) break;
      picked.push(q);
      pickedIds.add(q.id);
      usedTopics.add(topicKeyFromQuestion(q));
    }
  }

  return picked;
}

async function ensureGkCount(
  userId: string,
  yearPriority: number[],
  centerYear: number,
  existing: QuestionRow[],
): Promise<QuestionRow[]> {
  let pool = existing;
  const usedTopics = new Set(pool.map((q) => topicKeyFromQuestion(q)));
  let guard = 0;
  while (pool.length < GK_COUNT && guard < 8) {
    guard++;
    const targetYear =
      yearPriority[Math.min(guard - 1, yearPriority.length - 1)] ?? centerYear;
    try {
      const newIds = await generateAndStoreQuestions({
        subject: "GENERAL_KNOWLEDGE",
        targetYear,
        count: Math.min(GK_COUNT - pool.length + 2, 12),
        existingPromptsInQuiz: pool.map((q) => q.prompt),
        existingTopicsInQuiz: [...usedTopics],
      });
      const seen = await getGkSeenIds(userId);
      const have = new Set(pool.map((p) => p.id));
      const loaded = await getQuestionsByIds(newIds);
      for (const id of newIds) {
        if (pool.length >= GK_COUNT) break;
        if (seen.has(id) || have.has(id)) continue;
        const q = loaded.get(id);
        if (!q) continue;
        const tk = topicKeyFromQuestion(q);
        if (usedTopics.has(tk)) continue;
        pool.push(q);
        have.add(q.id);
        usedTopics.add(tk);
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Not enough unseen GK questions (${pool.length}/${GK_COUNT}) and top-up failed: ${detail}`,
      );
    }
  }

  if (pool.length < GK_COUNT) {
    throw new Error(
      `Could not assemble ${GK_COUNT} unseen general-knowledge questions for this pupil (${pool.length} available). Run scripts/seed-firestore.ts, or set GOOGLE_AI_API_KEY to generate more.`,
    );
  }

  return pool;
}

async function loadMathsCandidatePool(
  yearPriority: number[],
): Promise<QuestionRow[]> {
  const byId = new Map<string, QuestionRow>();
  for (const y of yearPriority) {
    const batch = await listQuestionsBySubjectAndYear("MATHS", y, 400);
    for (const row of batch) {
      if (!byId.has(row.id)) byId.set(row.id, row);
    }
  }
  return [...byId.values()];
}

async function pickMathsQuestions(
  yearPriority: number[],
  centerYear: number,
  /** GK prompts already in this quiz—maths generation should avoid overlapping topics. */
  gkPromptsInQuiz: string[],
  /** Topic keys from GK slots so maths questions do not repeat those themes. */
  gkTopicKeys: string[],
): Promise<QuestionRow[]> {
  const usedTopics = new Set<string>(gkTopicKeys);
  const usedIds = new Set<string>();

  let pool = await loadMathsCandidatePool(yearPriority);
  let picked = pickDiverseMathsQuestions(
    pool,
    MATHS_COUNT,
    centerYear,
    usedTopics,
  );
  for (const q of picked) {
    usedIds.add(q.id);
    usedTopics.add(topicKeyFromQuestion(q));
  }

  if (picked.length < MATHS_COUNT) {
    const broad = await listQuestionsBySubject("MATHS", 4000);
    const merged = new Map<string, QuestionRow>();
    for (const q of pool) merged.set(q.id, q);
    for (const q of broad) {
      if (!merged.has(q.id)) merged.set(q.id, q);
    }
    pool = [...merged.values()];
    const block = new Set(usedTopics);
    const more = pickDiverseMathsQuestions(
      pool.filter((q) => !usedIds.has(q.id)),
      MATHS_COUNT - picked.length,
      centerYear,
      block,
    );
    for (const q of more) {
      if (picked.length >= MATHS_COUNT) break;
      picked.push(q);
      usedIds.add(q.id);
      usedTopics.add(topicKeyFromQuestion(q));
    }
  }

  while (picked.length < MATHS_COUNT) {
    let q: QuestionRow | null = null;
    let genAttempts = 0;
    while (!q && genAttempts < 6) {
      genAttempts++;
      const newIds = await generateAndStoreQuestions({
        subject: "MATHS",
        targetYear: centerYear,
        count: 4,
        existingPromptsInQuiz: [
          ...gkPromptsInQuiz,
          ...picked.map((row) => row.prompt),
        ],
        existingTopicsInQuiz: [...usedTopics],
      });
      const loaded = await getQuestionsByIds(newIds);
      for (const id of newIds) {
        if (usedIds.has(id)) continue;
        const row = loaded.get(id);
        if (!row) continue;
        const tk = topicKeyFromQuestion(row);
        if (usedTopics.has(tk)) continue;
        q = row;
        break;
      }
    }
    if (!q) {
      throw new Error("Could not assemble five unique maths questions.");
    }
    usedIds.add(q.id);
    usedTopics.add(topicKeyFromQuestion(q));
    picked.push(q);
  }

  return picked;
}

export type QuizQuestionPublic = {
  id: string;
  subject: Subject;
  /** Which mascot matches this slot (from maths vs GK placement — authoritative for UI). */
  mascot: "carl" | "kim";
  /** Topic tag for mascot variant selection (may be empty on legacy rows). */
  topic: string;
  prompt: string;
  options: [string, string, string, string];
};

export async function buildQuizForUser(user: {
  id: string;
  schoolClass: PrimaryClass;
}): Promise<{ attemptId: string; questions: QuizQuestionPublic[] }> {
  const centerYear = primaryClassToYear(user.schoolClass);
  const yearPriority = targetYearPriority(centerYear);

  let gk = await fetchGkPool(user.id, yearPriority);
  gk = await ensureGkCount(user.id, yearPriority, centerYear, gk);

  const maths = await pickMathsQuestions(
    yearPriority,
    centerYear,
    gk.map((q) => q.prompt),
    gk.map((q) => topicKeyFromQuestion(q)),
  );
  const mathsSlots = pickMathsSlots();

  const ordered: QuestionRow[] = new Array(QUIZ_LEN);
  let mi = 0;
  let gi = 0;
  for (let pos = 0; pos < QUIZ_LEN; pos++) {
    if (mi < mathsSlots.length && mathsSlots[mi] === pos) {
      ordered[pos] = maths[mi]!;
      mi++;
    } else {
      ordered[pos] = gk[gi]!;
      gi++;
    }
  }

  const gkIds = gk.map((q) => q.id);
  const attemptId = await createQuizAttemptWithGkSeen({
    userId: user.id,
    orderedQuestionIds: ordered.map((q) => q.id),
    gkQuestionIds: gkIds,
  });

  const mathsSlotSet = new Set(mathsSlots);
  const questions: QuizQuestionPublic[] = ordered.map((q, pos) => ({
    id: q.id,
    subject: q.subject,
    mascot: mathsSlotSet.has(pos) ? "carl" : "kim",
    topic: q.topic ?? "",
    prompt: q.prompt,
    options: [q.optionA, q.optionB, q.optionC, q.optionD] as [
      string,
      string,
      string,
      string,
    ],
  }));

  return { attemptId, questions };
}
