import { ITEM_STATUS_LABELS, isItemStatus } from "@/lib/items/constants";

export function formatFoundDate(value: string | null, includeYear = false) {
  if (!value) return "Datum saknas";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.valueOf())) return "Datum saknas";

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

export function getStatusLabel(value: string) {
  return isItemStatus(value) ? ITEM_STATUS_LABELS[value] : "Okänd status";
}
