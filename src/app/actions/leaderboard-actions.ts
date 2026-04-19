"use server";

import type { PrimaryClass } from "@/types/app";
import { getAnswersForClass } from "@/lib/firestore-repo";

export type LeaderRow = {
  username: string;
  correct: number;
  total: number;
  accuracy: number;
};

export async function getLeaderboard(
  schoolClass: PrimaryClass,
): Promise<LeaderRow[]> {
  const answers = await getAnswersForClass(schoolClass);

  const map = new Map<
    string,
    { username: string; correct: number; total: number }
  >();

  for (const a of answers) {
    const cur = map.get(a.userId) ?? {
      username: a.username,
      correct: 0,
      total: 0,
    };
    cur.total++;
    if (a.isCorrect) cur.correct++;
    map.set(a.userId, cur);
  }

  const rows: LeaderRow[] = [...map.values()].map((r) => ({
    username: r.username,
    correct: r.correct,
    total: r.total,
    accuracy: r.total ? r.correct / r.total : 0,
  }));

  rows.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (b.correct !== a.correct) return b.correct - a.correct;
    return a.username.localeCompare(b.username);
  });

  return rows;
}
