import Link from "next/link";
import { redirect } from "next/navigation";
import carlKimHighfive from "@/assets/carl_kim_highfive.png";
import { ConfettiCelebration } from "@/components/confetti-celebration";
import { ResultsHighfiveHero } from "@/components/results-highfive-hero";

type Props = {
  searchParams: Promise<{ correct?: string; total?: string }>;
};

function parseScore(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export default async function QuizResultsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const correct = parseScore(sp.correct);
  const total = parseScore(sp.total);

  if (
    correct === null ||
    total === null ||
    total < 1 ||
    total > 20 ||
    correct < 0 ||
    correct > total
  ) {
    redirect("/quiz");
  }

  const pct = Math.round((correct / total) * 100);

  return (
    <div className="w-full">
      <ConfettiCelebration />
      <section className="w-full bg-gradient-to-b from-carl-green/[0.12] via-white to-kim-navy/[0.06] pb-16 pt-6 sm:pb-20 sm:pt-8">
        <div className="mx-auto w-full max-w-4xl px-4">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-kim-navy/70">
            Quiz complete
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold text-kim-navy sm:text-3xl">
            What a brilliant effort!
          </h1>

          <ResultsHighfiveHero
            src={carlKimHighfive}
            alt="Carl and Kim celebrating with a high five"
          />

          <div className="mt-10 rounded-2xl border border-kim-navy/10 bg-kim-navy/5 px-6 py-8 text-center shadow-sm sm:px-10 sm:py-10">
            <p className="text-lg font-medium text-kim-navy/90">
              Carl and Kim are so proud of you!
            </p>
            <p
              className="mt-4 font-mono text-5xl font-bold tabular-nums text-carl-green sm:text-6xl"
              aria-live="polite"
            >
              {correct}
              <span className="text-kim-navy/40">/</span>
              {total}
            </p>
            <p className="mt-2 text-sm text-kim-navy/70">{pct}% correct</p>
            <p className="mt-6 text-sm text-kim-navy/80">
              Your score is saved for your class scoreboard.
            </p>
          </div>

          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/quiz"
              className="inline-flex justify-center rounded-xl bg-carl-green px-6 py-3 text-sm font-semibold text-white shadow hover:brightness-95"
            >
              Play again
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex justify-center rounded-xl border border-kim-navy/25 px-6 py-3 text-sm font-semibold text-kim-navy hover:bg-kim-navy/5"
            >
              View scoreboards
            </Link>
            <Link
              href="/"
              className="inline-flex justify-center rounded-xl border border-transparent px-6 py-3 text-sm font-semibold text-kim-navy/80 underline-offset-4 hover:text-kim-navy hover:underline"
            >
              Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
