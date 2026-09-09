export const CLAIM_STATUSES = ["pending", "approved", "rejected"] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Väntar på granskning",
  approved: "Godkänt",
  rejected: "Avslaget",
};

export function isClaimStatus(value: unknown): value is ClaimStatus {
  return CLAIM_STATUSES.includes(value as ClaimStatus);
}

export function validateClaimMessage(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return "Beskriv varför föremålet är ditt.";
  }

  if (value.trim().length > 2000) {
    return "Beskrivningen får vara högst 2 000 tecken.";
  }

  return null;
}
