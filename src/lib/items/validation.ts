import { isItemCategory, type ItemCategory } from "./constants.ts";

export const MAX_ITEM_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_ITEM_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type ImageFileLike = { size: number; type: string };

export type ItemInput = {
  title: string;
  category: ItemCategory;
  foundLocation: string;
  foundDate: string;
  description: string | null;
};

export function validateItemImage(file: ImageFileLike | null) {
  if (!file || file.size === 0) return "Välj en bild av föremålet.";
  if (!ACCEPTED_ITEM_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_ITEM_IMAGE_TYPES)[number])) {
    return "Bilden måste vara i JPEG-, PNG- eller WebP-format.";
  }
  if (file.size > MAX_ITEM_IMAGE_SIZE) return "Bilden får vara högst 5 MB.";
  return null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateItemFields(formData: FormData):
  | { data: ItemInput; error: null }
  | { data: null; error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "");
  const foundLocation = String(formData.get("foundLocation") ?? "").trim();
  const foundDate = String(formData.get("foundDate") ?? "");
  const description = String(formData.get("description") ?? "").trim();

  if (title.length < 1 || title.length > 200) return { data: null, error: "Ange en rubrik på högst 200 tecken." };
  if (!isItemCategory(category)) return { data: null, error: "Välj en giltig kategori." };
  if (foundLocation.length < 1 || foundLocation.length > 200) return { data: null, error: "Ange var föremålet hittades." };
  if (!isValidDate(foundDate)) return { data: null, error: "Ange ett giltigt datum." };
  if (description.length > 2000) return { data: null, error: "Beskrivningen får vara högst 2 000 tecken." };

  return {
    data: {
      title,
      category,
      foundLocation,
      foundDate,
      description: description || null,
    },
    error: null,
  };
}

export function getImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}
