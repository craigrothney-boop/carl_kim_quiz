import Link from "next/link";
import { getAuthUser } from "@/lib/auth-server";
import { LogoutButton } from "@/components/logout-button";

export async function SiteHeader() {
  const user = await getAuthUser();

  return (
    <header className="border-b border-kim-navy/15 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-kim-navy">
          Primary Quiz
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-kim-navy">
          {user ? (
            <>
              <Link href="/quiz" className="hover:underline">
                Quiz
              </Link>
              <Link href="/leaderboard" className="hover:underline">
                Scoreboards
              </Link>
              <span className="rounded-full bg-kim-navy/10 px-2 py-0.5 text-xs text-kim-navy">
                {user.schoolClass}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
