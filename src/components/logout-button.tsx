"use client";

import { signOut } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await signOut(getFirebaseAuth());
        } catch {
          /* ignore */
        }
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/login";
      }}
      className="rounded-lg border border-kim-navy/25 px-2 py-1 text-xs text-kim-navy hover:bg-kim-navy/5"
    >
      Sign out
    </button>
  );
}
