import Link from "next/link";
import { CarlAndKimBanner } from "@/components/carl-and-kim-banner";
import { HomeCornerStars } from "@/components/home-decorations";
import { getAuthUser } from "@/lib/auth-server";

export default async function Home() {
  const session = await getAuthUser();

  return (
    <div className="relative px-4 py-8 sm:py-10 md:py-14">
      <HomeCornerStars />

      <div className="relative z-10 mx-auto max-w-4xl">
        <div
          className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-xl shadow-kim-navy/10 ring-1 ring-kim-navy/[0.08] backdrop-blur-sm sm:p-8 md:p-10"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(45 90 39 / 0.07) 1px, transparent 0)`,
            backgroundSize: "20px 20px",
          }}
        >
          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-wider text-kim-navy/70">
              UK primary school quiz
            </p>
            <h1 className="mt-3 max-w-4xl text-5xl font-extrabold leading-[1.08] tracking-tight text-kim-navy sm:text-6xl md:text-7xl">
              Learn and play with short quizzes
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-kim-navy/90 sm:text-xl">
              Answer twenty questions at a time: a mix of maths and general
              knowledge matched to your class (P1–P7). Your class has its own
              scoreboard ranked by how accurate you are over time.
            </p>
          </div>

          <div className="mt-8 sm:mt-10">
            <div className="rounded-[1.75rem] border-2 border-kim-navy/10 bg-white p-3 shadow-inner sm:p-5 md:p-6">
              <CarlAndKimBanner showImageFrame={false} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 sm:mt-10">
            {session ? (
              <>
                <Link
                  href="/quiz"
                  className="rounded-xl bg-carl-green px-5 py-3 text-sm font-semibold text-white shadow-md shadow-carl-green/25 hover:brightness-95"
                >
                  Start a quiz
                </Link>
                <Link
                  href="/leaderboard"
                  className="rounded-xl border-2 border-kim-navy/20 bg-white/80 px-5 py-3 text-sm font-semibold text-kim-navy hover:bg-kim-navy/5"
                >
                  View scoreboards
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="rounded-xl bg-carl-green px-5 py-3 text-sm font-semibold text-white shadow-md shadow-carl-green/25 hover:brightness-95"
                >
                  Create an account
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border-2 border-kim-navy/20 bg-white/80 px-5 py-3 text-sm font-semibold text-kim-navy hover:bg-kim-navy/5"
                >
                  Log in
                </Link>
              </>
            )}
          </div>

          <section className="mt-10 rounded-2xl border-2 border-kim-navy/10 bg-gradient-to-br from-kim-navy/[0.04] to-carl-green/[0.06] p-6 sm:p-8">
            <h2 className="text-xl font-bold text-kim-navy">How it works</h2>
            <ul className="mt-4 list-inside list-disc space-y-3 text-sm leading-relaxed text-kim-navy/90 sm:text-base">
              <li>Register with a username and password—no email required.</li>
              <li>
                General knowledge questions you have already had will not come
                up again for you, so quizzes stay fresh. Maths questions may
                repeat.
              </li>
              <li>
                If the question bank runs low, new questions can be created
                automatically when an API key is configured.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
