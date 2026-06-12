/**
 * Encrypted credential store for SQL connector passwords.
 * Uses AES-256-GCM with a key derived from the SQL_CREDENTIAL_KEY env var.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";
import { promises as fs } from "fs";
import { paths } from "@/lib/env-config";
import { logger } from "@/lib/logger";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT = process.env.CREDENTIAL_SALT || "chatbot-sql-connector-salt";

function getEncryptionKey(): Buffer {
  const envKey = process.env.SQL_CREDENTIAL_KEY;
  if (!envKey) {
    throw new Error(
      "SQL_CREDENTIAL_KEY environment variable is required for credential encryption",
    );
  }
  return scryptSync(envKey, SALT, KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertext] = encryptedText.split(":");
  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error("Invalid encrypted format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

interface CredentialEntry {
  connectorId: string;
  encryptedPassword: string;
  updatedAt: string;
}

async function readCredentials(): Promise<CredentialEntry[]> {
  try {
    const raw = await fs.readFile(paths.connectors.credentials, "utf-8");
    return JSON.parse(raw) as CredentialEntry[];
  } catch {
    return [];
  }
}

async function writeCredentials(entries: CredentialEntry[]): Promise<void> {
  await fs.mkdir(paths.connectors.dir, { recursive: true });
  await fs.writeFile(
    paths.connectors.credentials,
    JSON.stringify(entries, null, 2),
    "utf-8",
  );
}

export async function storePassword(
  connectorId: string,
  password: string,
): Promise<string> {
  const encrypted = encrypt(password);
  const entries = await readCredentials();
  const idx = entries.findIndex((e) => e.connectorId === connectorId);
  const entry: CredentialEntry = {
    connectorId,
    encryptedPassword: encrypted,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  await writeCredentials(entries);
  logger.info({ connectorId }, "Stored encrypted credential");
  return encrypted;
}

export async function getPassword(connectorId: string): Promise<string | null> {
  const entries = await readCredentials();
  const entry = entries.find((e) => e.connectorId === connectorId);
  if (!entry) return null;
  try {
    return decrypt(entry.encryptedPassword);
  } catch (err) {
    logger.error({ err, connectorId }, "Failed to decrypt credential");
    return null;
  }
}

export async function removePassword(connectorId: string): Promise<void> {
  const entries = await readCredentials();
  const filtered = entries.filter((e) => e.connectorId !== connectorId);
  await writeCredentials(filtered);
  logger.info({ connectorId }, "Removed credential");
}
