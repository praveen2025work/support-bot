import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.LOG_ENCRYPTION_KEY || "";
  if (!secret) return Buffer.alloc(0); // No encryption if key not set
  const SALT = process.env.LOG_ENCRYPTION_SALT || "chatbot-log-salt";
  return scryptSync(secret, SALT, 32);
}

export function encryptLogEntry(plaintext: string): string {
  const key = getEncryptionKey();
  if (key.length === 0) return plaintext; // Passthrough if no key configured

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + ciphertext)
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return `ENC:${combined.toString("base64")}`;
}

export function decryptLogEntry(entry: string): string {
  if (!entry.startsWith("ENC:")) return entry; // Not encrypted

  const key = getEncryptionKey();
  if (key.length === 0)
    throw new Error("LOG_ENCRYPTION_KEY required to decrypt logs");

  const combined = Buffer.from(entry.slice(4), "base64");
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}
