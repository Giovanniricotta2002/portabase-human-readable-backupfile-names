import crypto from "node:crypto";
import path from "node:path";

/**
 * Signature of a backup download URL (`/api/files/backups`, served without a session):
 * HMAC with PROJECT_SECRET, which agents never hold, over the channel, the path and the expiry.
 */
export function signBackupToken(storageId: string, filePath: string, expiresAt: number, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`backups\n${storageId}\n${filePath}\n${expiresAt}`).digest("hex");
}

export type BackupTokenCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" };

export function verifyBackupToken(
  storageId: string,
  filePath: string,
  expires: string | null,
  token: string | null,
  secret: string,
): BackupTokenCheck {
  if (!token || !expires) {
    return { ok: false, reason: "missing" };
  }

  const expiresAt = parseInt(expires, 10);
  if (!Number.isFinite(expiresAt)) {
    return { ok: false, reason: "invalid" };
  }

  const expected = signBackupToken(storageId, filePath, expiresAt, secret);
  const given = Buffer.from(token);
  const want = Buffer.from(expected);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return { ok: false, reason: "invalid" };
  }

  if (Date.now() > expiresAt) {
    return { ok: false, reason: "expired" };
  }

  return { ok: true };
}

export function resolveWithin(base: string, target: string): string | null {
  const baseResolved = path.resolve(base);
  const full = path.resolve(baseResolved, target);
  if (full !== baseResolved && !full.startsWith(baseResolved + path.sep)) {
    return null;
  }
  return full;
}
