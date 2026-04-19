"use server";

import { FieldValue } from "firebase-admin/firestore";
import type { PrimaryClass } from "@/types/app";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { normalizeUsername } from "@/lib/auth-utils";
import { usernameToEmail } from "@/lib/username-email";

export async function registerUser(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const schoolClass = String(formData.get("schoolClass") ?? "") as PrimaryClass;

  if (username.length < 2 || username.length > 32) {
    return { error: "Username should be between 2 and 32 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return {
      error: "Username can use letters, numbers, and underscores only.",
    };
  }
  if (password.length < 6) {
    return { error: "Password should be at least 6 characters." };
  }
  const validClasses: PrimaryClass[] = [
    "P1",
    "P2",
    "P3",
    "P4",
    "P5",
    "P6",
    "P7",
  ];
  if (!validClasses.includes(schoolClass)) {
    return { error: "Please choose a class from P1 to P7." };
  }

  const db = getAdminDb();
  const nameTaken = await db.collection("usernames").doc(username).get();
  if (nameTaken.exists) {
    return { error: "That username is already taken." };
  }

  const auth = getAdminAuth();
  const email = usernameToEmail(username);

  let uid: string;
  try {
    const user = await auth.createUser({
      email,
      password,
      displayName: username,
    });
    uid = user.uid;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (
      code === "auth/email-already-exists" ||
      code === "auth/email-already-in-use"
    ) {
      return { error: "That username is already taken." };
    }
    if (code === "auth/weak-password") {
      return { error: "Choose a stronger password." };
    }
    return { error: "Could not create the account. Try a different username." };
  }

  try {
    await db.collection("usernames").doc(username).set({ uid });
    await db.collection("users").doc(uid).set({
      username,
      schoolClass,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    await auth.deleteUser(uid);
    return { error: "Could not finish sign-up. Please try again." };
  }

  return { ok: true };
}
