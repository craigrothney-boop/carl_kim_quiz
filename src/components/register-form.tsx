"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { registerUser } from "@/app/actions/auth-actions";
import { normalizeUsername } from "@/lib/auth-utils";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { establishServerSession } from "@/lib/session-client";
import { usernameToEmail } from "@/lib/username-email";
import { PRIMARY_CLASSES } from "@/lib/primary-year";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 flex flex-col gap-4"
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const r = await registerUser(fd);
          if ("error" in r) {
            setError(r.error);
            return;
          }
          try {
            const raw = String(fd.get("username") ?? "");
            const password = String(fd.get("password") ?? "");
            const username = normalizeUsername(raw);
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
            setError(
              e instanceof Error
                ? e.message
                : "Account created but sign-in failed. Try logging in.",
            );
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
          minLength={2}
          maxLength={32}
          pattern="[a-zA-Z0-9_]+"
          title="Letters, numbers, and underscores only"
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-kim-navy">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          className="rounded-lg border border-kim-navy/25 px-3 py-2 text-base"
          required
          minLength={6}
          disabled={pending}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-kim-navy">
        Class
        <select
          name="schoolClass"
          className="rounded-lg border border-kim-navy/25 px-3 py-2 text-base"
          required
          defaultValue="P4"
          disabled={pending}
        >
          {PRIMARY_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-carl-green px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Creating…" : "Start playing"}
      </button>
    </form>
  );
}
