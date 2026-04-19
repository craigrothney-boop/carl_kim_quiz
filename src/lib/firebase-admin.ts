import * as admin from "firebase-admin";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

/** Fix PEM from .env: escaped newlines, stray quotes, CRLF (avoids OpenSSL DECODER errors). */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
  return s;
}

/** Load .env from the app folder and the parent folder (common when .env sits next to the repo root). */
function loadEnvFiles(): void {
  const cwd = process.cwd();
  const paths = [
    resolve(cwd, ".env"),
    resolve(cwd, ".env.local"),
    resolve(cwd, "..", ".env"),
    resolve(cwd, "..", ".env.local"),
  ];
  for (const p of paths) {
    if (existsSync(p)) {
      loadDotenv({ path: p });
    }
  }
}

/** Resolve relative paths so `GOOGLE_APPLICATION_CREDENTIALS=./key.json` works from the project root. */
function absolutizeGoogleCredentialsEnv(): void {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!raw) return;
  if (!isAbsolute(raw)) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(process.cwd(), raw);
  }
}

function init(): void {
  if (admin.apps.length) return;

  loadEnvFiles();
  absolutizeGoogleCredentialsEnv();

  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gac && existsSync(gac)) {
    admin.initializeApp();
    return;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    const sa = JSON.parse(json) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: normalizePrivateKey(sa.private_key) ?? sa.private_key,
      }),
    });
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return;
  }

  throw new Error(
    "Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON), FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY.",
  );
}

export function getAdminApp(): admin.app.App {
  init();
  return admin.app();
}

export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

export function getAdminDb(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}
