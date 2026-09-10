import { createHash, randomBytes } from "node:crypto";

export function normalizeMemberJoinCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, "");
  return /^[A-Z0-9]{12,64}$/.test(normalized) ? normalized : null;
}

export function createMemberJoinCode() {
  const raw = randomBytes(12).toString("hex").toUpperCase();
  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

export function hashMemberJoinCode(value: string) {
  const normalized = normalizeMemberJoinCode(value);
  if (!normalized) throw new Error("Invalid member join code");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export function normalizeMemberName(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 2 && normalized.length <= 120 ? normalized : null;
}

export function normalizeMemberJoinSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) && normalized.length <= 80 ? normalized : null;
}
