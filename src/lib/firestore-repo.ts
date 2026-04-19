import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { PrimaryClass, Subject } from "@/types/app";

export type QuestionDoc = {
  subject: Subject;
  /** Short snake_case tag for topic deduplication within a quiz (e.g. roman_britain). */
  topic?: string;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctIndex: number;
  targetYear: number;
  source: string;
};

export type QuestionRow = QuestionDoc & { id: string };

const db = () => getAdminDb();

export async function getGkSeenIds(userId: string): Promise<Set<string>> {
  const snap = await db().collection("users").doc(userId).collection("gkSeen").get();
  return new Set(snap.docs.map((d) => d.id));
}

export async function listQuestionsBySubjectAndYear(
  subject: Subject,
  targetYear: number,
  limit = 400,
): Promise<QuestionRow[]> {
  const snap = await db()
    .collection("questions")
    .where("subject", "==", subject)
    .where("targetYear", "==", targetYear)
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuestionDoc) }));
}

/** All questions for a subject (any year). Used to fill the quiz when a single year runs low. */
export async function listQuestionsBySubject(
  subject: Subject,
  limit = 3000,
): Promise<QuestionRow[]> {
  const snap = await db()
    .collection("questions")
    .where("subject", "==", subject)
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuestionDoc) }));
}

export async function getQuestionsByIds(ids: string[]): Promise<Map<string, QuestionRow>> {
  const map = new Map<string, QuestionRow>();
  if (ids.length === 0) return map;

  const refs = ids.map((id) => db().collection("questions").doc(id));
  const snaps = await db().getAll(...refs);
  for (const s of snaps) {
    if (s.exists) {
      map.set(s.id, { id: s.id, ...(s.data() as QuestionDoc) });
    }
  }
  return map;
}

export async function createQuestion(data: QuestionDoc): Promise<string> {
  const ref = await db().collection("questions").add({
    ...data,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function createQuizAttemptWithGkSeen(params: {
  userId: string;
  orderedQuestionIds: string[];
  gkQuestionIds: string[];
}): Promise<string> {
  const batch = db().batch();
  const attemptRef = db().collection("quizAttempts").doc();
  batch.set(attemptRef, {
    userId: params.userId,
    questionIds: params.orderedQuestionIds,
    createdAt: FieldValue.serverTimestamp(),
  });

  const seenCol = db().collection("users").doc(params.userId).collection("gkSeen");
  for (const qid of params.gkQuestionIds) {
    batch.set(seenCol.doc(qid), { at: FieldValue.serverTimestamp() });
  }

  await batch.commit();
  return attemptRef.id;
}

export async function getQuizAttempt(
  attemptId: string,
  userId: string,
): Promise<{ questionIds: string[]; createdAt: Date } | null> {
  const snap = await db().collection("quizAttempts").doc(attemptId).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  if (d.userId !== userId) return null;
  const createdAt = d.createdAt?.toDate?.() ?? new Date(0);
  return {
    questionIds: d.questionIds as string[],
    createdAt,
  };
}

export async function deleteQuizAttempt(attemptId: string): Promise<void> {
  await db().collection("quizAttempts").doc(attemptId).delete();
}

export async function batchWriteAnswersAndDeleteAttempt(params: {
  attemptId: string;
  userId: string;
  schoolClass: PrimaryClass;
  rows: { questionId: string; isCorrect: boolean }[];
}): Promise<void> {
  const batch = db().batch();
  const col = db().collection("answers");
  for (const r of params.rows) {
    const ref = col.doc();
    batch.set(ref, {
      userId: params.userId,
      schoolClass: params.schoolClass,
      questionId: r.questionId,
      isCorrect: r.isCorrect,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  batch.delete(db().collection("quizAttempts").doc(params.attemptId));
  await batch.commit();
}

export async function getAnswersForClass(
  schoolClass: PrimaryClass,
): Promise<
  { userId: string; isCorrect: boolean; username: string }[]
> {
  const snap = await db()
    .collection("answers")
    .where("schoolClass", "==", schoolClass)
    .limit(20000)
    .get();

  const userIds = [...new Set(snap.docs.map((d) => d.data().userId as string))];
  const usersMap = new Map<string, string>();

  const chunkSize = 300;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const refs = chunk.map((uid) => db().collection("users").doc(uid));
    const userSnaps = await db().getAll(...refs);
    for (const us of userSnaps) {
      if (us.exists) {
        usersMap.set(us.id, (us.data() as { username: string }).username);
      }
    }
  }

  return snap.docs.map((d) => {
    const x = d.data();
    return {
      userId: x.userId as string,
      isCorrect: x.isCorrect as boolean,
      username: usersMap.get(x.userId as string) ?? "unknown",
    };
  });
}
