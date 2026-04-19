"use server";

import { getAuthUser } from "@/lib/auth-server";
import { buildQuizForUser } from "@/lib/quiz-builder";
import {
  batchWriteAnswersAndDeleteAttempt,
  getQuestionsByIds,
  getQuizAttempt,
} from "@/lib/firestore-repo";
import { redirect } from "next/navigation";

const ATTEMPT_MAX_MS = 2 * 60 * 60 * 1000;

export async function startQuiz() {
  const session = await getAuthUser();
  if (!session) {
    redirect("/login");
  }

  return buildQuizForUser({
    id: session.uid,
    schoolClass: session.schoolClass,
  });
}

export async function submitQuiz(
  attemptId: string,
  answers: number[],
): Promise<{
  correct: number;
  total: number;
  results: { questionId: string; correct: boolean }[];
}> {
  const session = await getAuthUser();
  if (!session) {
    redirect("/login");
  }

  const attempt = await getQuizAttempt(attemptId, session.uid);
  if (!attempt) {
    throw new Error("Quiz not found.");
  }

  if (Date.now() - attempt.createdAt.getTime() > ATTEMPT_MAX_MS) {
    const { deleteQuizAttempt } = await import("@/lib/firestore-repo");
    await deleteQuizAttempt(attemptId);
    throw new Error("This quiz has expired. Start a new one.");
  }

  const orderedIds = attempt.questionIds;
  if (answers.length !== orderedIds.length) {
    throw new Error("Answer count does not match this quiz.");
  }

  const byId = await getQuestionsByIds(orderedIds);

  const results: { questionId: string; correct: boolean }[] = [];
  let correct = 0;
  const rows: { questionId: string; isCorrect: boolean }[] = [];

  for (let i = 0; i < orderedIds.length; i++) {
    const qid = orderedIds[i]!;
    const q = byId.get(qid);
    if (!q) continue;
    const picked = answers[i];
    const isCorrect = typeof picked === "number" && picked === q.correctIndex;
    if (isCorrect) correct++;
    results.push({ questionId: qid, correct: isCorrect });
    rows.push({ questionId: qid, isCorrect });
  }

  await batchWriteAnswersAndDeleteAttempt({
    attemptId,
    userId: session.uid,
    schoolClass: session.schoolClass,
    rows,
  });

  return { correct, total: orderedIds.length, results };
}
