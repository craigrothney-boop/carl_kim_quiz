import { normalizeUsername } from "@/lib/auth-utils";

/** Synthetic email for Firebase Auth (username-only accounts). Client and server must use the same domain. */
export function usernameToEmail(username: string): string {
  const domain =
    process.env.NEXT_PUBLIC_USERNAME_EMAIL_DOMAIN?.trim() || "quiz.invalid";
  return `${normalizeUsername(username)}@${domain}`;
}
