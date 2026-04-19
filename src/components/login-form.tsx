"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { normalizeUsername } from "@/lib/auth-utils";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { establishServerSession } from "@/lib/session-client";
import { usernameToEmail } from "@/lib/username-email";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          try {
            const raw = String(fd.get("username") ?? "");
            const password = String(fd.get("password") ?? "");
            const username = normalizeUsername(raw);
            if (!username || !password) {
              setError("Enter your username and password.");
              return;
            }
            const cred = await signInWithEmailAndPassword(
              getFirebaseAuth(),
              usernameToEmail(username),
              password,
            );
            const idToken = await cred.user.getIdToken();
            await establishServerSession(idToken);
            router.push("/");
            router.refresh();
          } catch (e: unknown) {
            const code = (e as { code?: string })?.code;
            if (
              code === "auth/invalid-credential" ||
              code === "auth/wrong-password" ||
              code === "auth/user-not-found"
            ) {
              setError("That username or password is not correct.");
            } else {
              setError(
                e instanceof Error ? e.message : "Could not sign you in.",
              );
            }
          }
        });
      }}
    >
      {error ? (
        <p
          className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <label className="flex flex-col gap-1 text-sm font-medium text-kim-navy">
        Username
        <input
          name="username"
          autoComplete="username"
          className="rounded-lg border border-kim-navy/25 px-3 py-2 text-base"
          required
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-kim-navy">
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="rounded-lg border border-kim-navy/25 px-3 py-2 text-base"
          required
          disabled={pending}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-carl-green px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
