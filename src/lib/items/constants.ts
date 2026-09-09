export const ITEM_CATEGORIES = [
  "Kläder",
  "Elektronik",
  "Väskor",
  "Nycklar",
  "Accessoarer",
  "Skolmaterial",
  "Övrigt",
] as const;

export const ITEM_STATUSES = ["available", "claimed", "returned", "archived"] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  available: "Tillgängligt",
  claimed: "Reserverat för ägare",
  returned: "Utlämnat",
  archived: "Arkiverad",
};

export function isItemCategory(value: unknown): value is ItemCategory {
  return ITEM_CATEGORIES.includes(value as ItemCategory);
}

export function isItemStatus(value: unknown): value is ItemStatus {
  return ITEM_STATUSES.includes(value as ItemStatus);
}
