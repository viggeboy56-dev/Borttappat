import { normalizeInviteEmail } from "../admin/validation.ts";

export type StaffCandidate = { fullName: string; email: string };
export type ParsedStaffRow = StaffCandidate & { rowNumber: number; error: string | null };

export function normalizeSchoolSlug(value: unknown) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 ? slug : null;
}

export function normalizeSchoolName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 120 ? name : null;
}

export function validateStaffCandidates(value: unknown): { candidates: StaffCandidate[]; errors: string[] } {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return { candidates: [], errors: ["Listan måste innehålla 1–100 personer."] };
  const candidates: StaffCandidate[] = [];
  const errors: string[] = [];
  const emails = new Set<string>();
  value.forEach((entry, index) => {
    const row = index + 1;
    const raw = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const fullName = typeof raw.fullName === "string" ? raw.fullName.trim().replace(/\s+/g, " ") : "";
    const email = normalizeInviteEmail(raw.email);
    if (fullName.length < 2 || fullName.length > 120) errors.push(`Rad ${row}: ange ett giltigt namn.`);
    if (!email) errors.push(`Rad ${row}: ange en giltig e-postadress.`);
    if (email && emails.has(email)) errors.push(`Rad ${row}: e-postadressen finns flera gånger i listan.`);
    if (email) emails.add(email);
    candidates.push({ fullName, email: email ?? "" });
  });
  return { candidates, errors };
}

export function parseStaffList(input: string): ParsedStaffRow[] {
  const rawRows = input.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const seen = new Set<string>();
  return rawRows.map((row, index) => {
    const comma = row.indexOf(",");
    const fullName = comma >= 0 ? row.slice(0, comma).trim().replace(/\s+/g, " ") : "";
    const email = comma >= 0 ? normalizeInviteEmail(row.slice(comma + 1)) : null;
    let error: string | null = null;
    if (comma < 0) error = "Använd formatet Namn, e-postadress.";
    else if (fullName.length < 2 || fullName.length > 120) error = "Ange ett giltigt namn.";
    else if (!email) error = "Ange en giltig e-postadress.";
    else if (seen.has(email)) error = "E-postadressen finns flera gånger i listan.";
    if (email) seen.add(email);
    return { rowNumber: index + 1, fullName, email: email ?? "", error };
  });
}
