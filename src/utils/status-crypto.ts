import crypto from "node:crypto";

/**
 * Minimum agent version (its own CARGO_PKG_VERSION) that understands the
 * encrypted storages envelope. Older agents receive no storages (never sent
 * in plaintext).
 */
export const MIN_AGENT_VERSION_STORAGE_ENC = "1.17.0";

/**
 * Minimum agent version that understands the encrypted database-config
 * envelope (config_ciphertext / config_encrypted). Older agents receive no
 * config at all (config always carries secrets, never sent in plaintext).
 */
export const MIN_AGENT_VERSION_DB_CONFIG = "1.19.0";

/**
 * Minimum agent version that signs its requests (X-Agent-Timestamp /
 * X-Agent-Signature). Once an agent has reported this version through a
 * signed request, unsigned requests for it are rejected.
 */
export const MIN_AGENT_VERSION_SIGNED_REQUESTS = "1.24.0";

const AGENT_SIGNATURE_MAX_SKEW_SECONDS = 300;

/**
 * Agent-reported version safe to print in logs: the value may come from an
 * unauthenticated request body (no newlines, escapes or oversized strings).
 */
export function displayVersion(version: string | null | undefined): string {
  return version && /^[\w.+-]{1,32}$/.test(version) ? version : "unknown";
}

/**
 * Signature of an agent request. The key is derived from the master key and
 * the agent id, the signed payload binds method, path, timestamp and body:
 * hex( HMAC(HMAC(masterKey, "portabase-agent-auth:v1:" + agentId),
 *           METHOD \n PATH \n TIMESTAMP \n hex(sha256(body))) ).
 */
export function signAgentRequest(
  masterKey: Buffer,
  agentId: string,
  method: string,
  path: string,
  timestamp: string,
  body: Uint8Array,
): string {
  const agentKey = crypto
    .createHmac("sha256", masterKey)
    .update(`portabase-agent-auth:v1:${agentId}`)
    .digest();
  const bodyHash = crypto.createHash("sha256").update(body).digest("hex");
  return crypto
    .createHmac("sha256", agentKey)
    .update(`${method}\n${path}\n${timestamp}\n${bodyHash}`)
    .digest("hex");
}

export function verifyAgentSignature(
  masterKey: Buffer,
  agentId: string,
  method: string,
  path: string,
  timestamp: string | null,
  signature: string | null,
  body: Uint8Array,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): "ok" | "skew" | "invalid" {
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return "invalid";
  if (Math.abs(nowSeconds - Number(timestamp)) > AGENT_SIGNATURE_MAX_SKEW_SECONDS) return "skew";

  const given = Buffer.from(signature);
  const want = Buffer.from(signAgentRequest(masterKey, agentId, method, path, timestamp, body));
  return given.length === want.length && crypto.timingSafeEqual(given, want) ? "ok" : "invalid";
}

/**
 * Encrypt any JSON-serializable value with AES-256-GCM using the raw 32-byte
 * master key. Wire layout: base64( iv(12) ‖ ciphertext ‖ authTag(16) ).
 */
export function encryptJsonGcm(value: unknown, masterKey: Buffer): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf-8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, tag]).toString("base64");
}

/**
 * Encrypt the storages payload with AES-256-GCM using the raw 32-byte master
 * key. Wire layout: base64( iv(12) ‖ ciphertext ‖ authTag(16) ).
 */
export function encryptStorages(storages: unknown, masterKey: Buffer): string {
  return encryptJsonGcm(storages, masterKey);
}

/**
 * Numeric major.minor.patch comparison. Returns false when either version is
 * missing or cannot be parsed as three non-negative integers (fail safe).
 */
export function isAgentVersionAtLeast(
  reported: string | undefined,
  min: string,
): boolean {
  const parse = (v: string): [number, number, number] | null => {
    const core = v.trim().split(/[-+]/)[0];
    const parts = core.split(".");
    if (parts.length !== 3) return null;
    if (!parts.every((p) => /^\d+$/.test(p))) return null;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isInteger(n) || n < 0)) return null;
    return [nums[0], nums[1], nums[2]];
  };

  if (!reported) return false;
  const a = parse(reported);
  const b = parse(min);
  if (!a || !b) return false;

  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}
