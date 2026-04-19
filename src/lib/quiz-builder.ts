import { primaryClassToYear, targetYearPriority } from "@/lib/primary-year";
import { generateAndStoreQuestions } from "@/lib/ai-questions";
import { pickDiverseMathsQuestions } from "@/lib/maths-strand";
import { normalizePrompt, topicKeyFromQuestion } from "@/lib/question-topic";
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

/** Re-export: unified prompt fingerprint (lowercase alphanumeric only) for this quiz run. */
export { normalizePrompt };

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

/** Keep first occurrence of each prompt fingerprint; drops duplicate-text rows. */
function dedupeByFingerprintKeepFirst(rows: QuestionRow[]): QuestionRow[] {
  const seen = new Set<string>();
  const out: QuestionRow[] = [];
  for (const q of rows) {
    const fp = normalizePrompt(q.prompt);
    if (seen.has(fp)) continue;
    seen.add(fp);
    out.push(q);
  }
  return out;
}

function syncFingerprintsFromRows(rows: QuestionRow[], fingerprints: Set<string>): void {
  fingerprints.clear();
  for (const q of rows) {
    fingerprints.add(normalizePrompt(q.prompt));
  }
}

async function fetchGkPool(
  userId: string,
  yearPriority: number[],
  fingerprints: Set<string>,
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
    const filtered = batch.filter((q) => {
      if (exclude.has(q.id) || usedTopics.has(topicKeyFromQuestion(q))) {
        return false;
      }
      const fp = normalizePrompt(q.prompt);
      if (fingerprints.has(fp)) return false;
      return true;
    });
    shuffleInPlace(filtered);
    for (const q of filtered) {
      if (picked.length >= GK_COUNT) break;
      picked.push(q);
      pickedIds.add(q.id);
      usedTopics.add(topicKeyFromQuestion(q));
      fingerprints.add(normalizePrompt(q.prompt));
    }
  }

  if (picked.length < GK_COUNT) {
    const exclude = new Set([...seen, ...pickedIds]);
    const broad = await listQuestionsBySubject("GENERAL_KNOWLEDGE", 4000);
    const filtered = broad.filter((q) => {
      if (exclude.has(q.id) || usedTopics.has(topicKeyFromQuestion(q))) {
        return false;
      }
      const fp = normalizePrompt(q.prompt);
      if (fingerprints.has(fp)) return false;
      return true;
    });
    shuffleInPlace(filtered);
    for (const q of filtered) {
      if (picked.length >= GK_COUNT) break;
      picked.push(q);
      pickedIds.add(q.id);
      usedTopics.add(topicKeyFromQuestion(q));
      fingerprints.add(normalizePrompt(q.prompt));
    }
  }

  return picked;
}

async function ensureGkCount(
  userId: string,
  yearPriority: number[],
  centerYear: number,
  existing: QuestionRow[],
  fingerprints: Set<string>,
): Promise<QuestionRow[]> {
  let pool = dedupeByFingerprintKeepFirst(existing);
  syncFingerprintsFromRows(pool, fingerprints);

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
        existingPromptFingerprints: [...fingerprints],
      });
      const seen = await getGkSeenIds(userId);
      const have = new Set(pool.map((p) => p.id));
      const loaded = await getQuestionsByIds(newIds);
      for (const id of newIds) {
        if (pool.length >= GK_COUNT) break;
        if (seen.has(id) || have.has(id)) continue;
        const q = loaded.get(id);
        if (!q) continue;
        const fp = normalizePrompt(q.prompt);
        if (fingerprints.has(fp)) continue;
        const tk = topicKeyFromQuestion(q);
        if (usedTopics.has(tk)) continue;
        pool.push(q);
        have.add(q.id);
        usedTopics.add(tk);
        fingerprints.add(fp);
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
  gkPromptsInQuiz: string[],
  gkTopicKeys: string[],
  fingerprints: Set<string>,
): Promise<QuestionRow[]> {
  const usedTopics = new Set<string>(gkTopicKeys);
  const usedIds = new Set<string>();

  let pool = await loadMathsCandidatePool(yearPriority);
  let picked = pickDiverseMathsQuestions(
    pool,
    MATHS_COUNT,
    centerYear,
    usedTopics,
    fingerprints,
  );
  for (const q of picked) {
    usedIds.add(q.id);
    usedTopics.add(topicKeyFromQuestion(q));
    fingerprints.add(normalizePrompt(q.prompt));
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
      fingerprints,
    );
    for (const q of more) {
      if (picked.length >= MATHS_COUNT) break;
      picked.push(q);
      usedIds.add(q.id);
      usedTopics.add(topicKeyFromQuestion(q));
      fingerprints.add(normalizePrompt(q.prompt));
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
        existingPromptFingerprints: [...fingerprints],
      });
      const loaded = await getQuestionsByIds(newIds);
      for (const id of newIds) {
        if (usedIds.has(id)) continue;
        const row = loaded.get(id);
        if (!row) continue;
        const fp = normalizePrompt(row.prompt);
        if (fingerprints.has(fp)) continue;
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
    fingerprints.add(normalizePrompt(q.prompt));
    picked.push(q);
  }

  return picked;
}

/**
 * Last-resort AI fill when fingerprint deduplication left the quiz short or non-unique.
 */
async function finalGapFillWithAi(params: {
  userId: string;
  centerYear: number;
  yearPriority: number[];
  gk: QuestionRow[];
  maths: QuestionRow[];
  fingerprints: Set<string>;
}): Promise<{ gk: QuestionRow[]; maths: QuestionRow[] }> {
  const { userId, centerYear, yearPriority, fingerprints } = params;
  let gk = [...params.gk];
  let maths = [...params.maths];
  const seen = await getGkSeenIds(userId);

  const combinedTopics = () =>
    new Set([...gk, ...maths].map((q) => topicKeyFromQuestion(q)));

  let rounds = 0;
  const maxRounds = 24;

  while (
    rounds < maxRounds &&
    (gk.length < GK_COUNT ||
      maths.length < MATHS_COUNT ||
      new Set([...gk, ...maths].map((q) => normalizePrompt(q.prompt))).size <
        QUIZ_LEN)
  ) {
    rounds++;
    const topicsUsed = combinedTopics();

    if (gk.length < GK_COUNT) {
      const targetYear =
        yearPriority[Math.min(rounds - 1, yearPriority.length - 1)] ??
        centerYear;
      const newIds = await generateAndStoreQuestions({
        subject: "GENERAL_KNOWLEDGE",
        targetYear,
        count: Math.min(GK_COUNT - gk.length + 4, 14),
        existingPromptsInQuiz: [...gk, ...maths].map((q) => q.prompt),
        existingTopicsInQuiz: [...topicsUsed],
        existingPromptFingerprints: [...fingerprints],
      });
      const loaded = await getQuestionsByIds(newIds);
      for (const id of newIds) {
        if (gk.length >= GK_COUNT) break;
        if (seen.has(id)) continue;
        const q = loaded.get(id);
        if (!q) continue;
        const fp = normalizePrompt(q.prompt);
        if (fingerprints.has(fp)) continue;
        const tk = topicKeyFromQuestion(q);
        if (topicsUsed.has(tk)) continue;
        gk.push(q);
        topicsUsed.add(tk);
        fingerprints.add(fp);
      }
    }

    if (maths.length < MATHS_COUNT) {
      const topicsUsed2 = combinedTopics();
      const newIds = await generateAndStoreQuestions({
        subject: "MATHS",
        targetYear: centerYear,
        count: Math.min(MATHS_COUNT - maths.length + 4, 10),
        existingPromptsInQuiz: [...gk, ...maths].map((q) => q.prompt),
        existingTopicsInQuiz: [...topicsUsed2],
        existingPromptFingerprints: [...fingerprints],
      });
      const loaded = await getQuestionsByIds(newIds);
      for (const id of newIds) {
        if (maths.length >= MATHS_COUNT) break;
        const row = loaded.get(id);
        if (!row) continue;
        const fp = normalizePrompt(row.prompt);
        if (fingerprints.has(fp)) continue;
        const tk = topicKeyFromQuestion(row);
        if (topicsUsed2.has(tk)) continue;
        maths.push(row);
        topicsUsed2.add(tk);
        fingerprints.add(fp);
      }
    }

    if (
      gk.length >= GK_COUNT &&
      maths.length >= MATHS_COUNT &&
      new Set([...gk, ...maths].map((q) => normalizePrompt(q.prompt))).size >=
        QUIZ_LEN
    ) {
      break;
    }
  }

  syncFingerprintsFromRows([...gk, ...maths], fingerprints);

  if (
    gk.length < GK_COUNT ||
    maths.length < MATHS_COUNT ||
    new Set([...gk, ...maths].map((q) => normalizePrompt(q.prompt))).size <
      QUIZ_LEN
  ) {
    throw new Error(
      "Could not assemble 20 unique questions after fingerprint filtering and final AI gap-fill.",
    );
  }

  return { gk, maths };
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

  const fingerprints = new Set<string>();

  let gk = await fetchGkPool(user.id, yearPriority, fingerprints);
  gk = await ensureGkCount(user.id, yearPriority, centerYear, gk, fingerprints);

  gk = dedupeByFingerprintKeepFirst(gk);
  syncFingerprintsFromRows(gk, fingerprints);

  let maths = await pickMathsQuestions(
    yearPriority,
    centerYear,
    gk.map((q) => q.prompt),
    gk.map((q) => topicKeyFromQuestion(q)),
    fingerprints,
  );

  maths = dedupeByFingerprintKeepFirst(maths);
  syncFingerprintsFromRows([...gk, ...maths], fingerprints);

  const uniqueCombined = new Set(
    [...gk, ...maths].map((q) => normalizePrompt(q.prompt)),
  );
  if (
    gk.length < GK_COUNT ||
    maths.length < MATHS_COUNT ||
    uniqueCombined.size < QUIZ_LEN
  ) {
    const filled = await finalGapFillWithAi({
      userId: user.id,
      centerYear,
      yearPriority,
      gk,
      maths,
      fingerprints,
    });
    gk = filled.gk;
    maths = filled.maths;
  }

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

  const finalFp = new Set(ordered.map((q) => normalizePrompt(q.prompt)));
  if (finalFp.size !== QUIZ_LEN) {
    throw new Error(
      "Quiz assembly failed: duplicate prompt fingerprints in final ordering.",
    );
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
