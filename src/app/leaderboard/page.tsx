import Link from "next/link";
import type { PrimaryClass } from "@/types/app";
import { getLeaderboard } from "@/app/actions/leaderboard-actions";
import { PRIMARY_CLASSES } from "@/lib/primary-year";
import { getAuthUser } from "@/lib/auth-server";

type Props = { searchParams?: Promise<{ class?: string }> };

export default async function LeaderboardPage({ searchParams }: Props) {
  const user = await getAuthUser();
  const sp = (await searchParams) ?? {};
  const raw = sp.class ?? user?.schoolClass ?? "P4";
  const selected = (PRIMARY_CLASSES.includes(raw as PrimaryClass)
    ? raw
    : "P4") as PrimaryClass;

  const rows = await getLeaderboard(selected);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-kim-navy">Class scoreboards</h1>
      <p className="mt-2 text-sm text-kim-navy/80">
        Rankings use accuracy: correct answers divided by total answers recorded.
        Pupils with the same accuracy are ordered by how many questions they
        have answered correctly overall.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {PRIMARY_CLASSES.map((c) => (
          <Link
            key={c}
            href={`/leaderboard?class=${c}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              c === selected
                ? "bg-kim-navy text-white"
                : "bg-kim-navy/10 text-kim-navy hover:bg-kim-navy/20"
            }`}
          >
            {c}
          </Link>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-kim-navy/15 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-kim-navy/5 text-kim-navy">
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Correct</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-kim-navy/70"
                >
                  No scores for this class yet. Play a quiz to appear here.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={`${r.username}-${i}`} className="border-t border-kim-navy/10">
                  <td className="px-4 py-3 text-kim-navy/80">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-kim-navy">
                    {r.username}
                  </td>
                  <td className="px-4 py-3">{r.correct}</td>
                  <td className="px-4 py-3">{r.total}</td>
                  <td className="px-4 py-3">
                    {Math.round(r.accuracy * 1000) / 10}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
