import { createHash, randomBytes } from "node:crypto";

/**
 * Generate a new API key. The plaintext is shown to the developer exactly once;
 * only the SHA-256 hash and a short prefix are stored.
 */
export function generateApiKey(environment: "TEST" | "LIVE") {
  const envPart = environment === "LIVE" ? "live" : "test";
  const raw = randomBytes(24).toString("base64url");
  const plaintext = `sk_${envPart}_${raw}`;
  return {
    plaintext,
    hashedKey: hashApiKey(plaintext),
    keyPrefix: plaintext.slice(0, 14), // e.g. sk_live_a1b2c3
  };
}

export function hashApiKey(plaintext: string) {
  return createHash("sha256").update(plaintext).digest("hex");
}
