import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";
import type { PrimaryClass } from "@/types/app";

export { SESSION_COOKIE_NAME };

export type AuthUser = {
  uid: string;
  username: string;
  schoolClass: PrimaryClass;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(raw, true);
    const db = getAdminDb();
    const doc = await db.collection("users").doc(decoded.uid).get();
    if (!doc.exists) return null;
    const d = doc.data()!;
    return {
      uid: decoded.uid,
      username: d.username as string,
      schoolClass: d.schoolClass as PrimaryClass,
    };
  } catch {
    return null;
  }
}

export async function requireAuthUser(): Promise<AuthUser> {
  const u = await getAuthUser();
  if (!u) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return u!;
}
