import { CLAIM_STATUS_LABELS, isClaimStatus } from "@/lib/claims/constants";

export function getClaimStatusLabel(value: string) {
  return isClaimStatus(value) ? CLAIM_STATUS_LABELS[value] : "Okänd status";
}

export function formatClaimDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Okänt datum";

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
