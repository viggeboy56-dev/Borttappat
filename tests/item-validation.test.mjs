import assert from "node:assert/strict";
import test from "node:test";
import { MAX_ITEM_IMAGE_SIZE, getImageExtension, validateItemFields, validateItemImage } from "../src/lib/items/validation.ts";

test("accepts JPEG, PNG and WebP images up to 5 MB", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(validateItemImage({ type, size: MAX_ITEM_IMAGE_SIZE }), null);
  }
});

test("rejects missing, invalid and oversized images", () => {
  assert.match(validateItemImage(null), /Välj en bild/);
  assert.match(validateItemImage({ type: "image/svg+xml", size: 100 }), /JPEG/);
  assert.match(validateItemImage({ type: "image/png", size: MAX_ITEM_IMAGE_SIZE + 1 }), /5 MB/);
});

test("maps only accepted image MIME types to extensions", () => {
  assert.equal(getImageExtension("image/jpeg"), "jpg");
  assert.equal(getImageExtension("image/png"), "png");
  assert.equal(getImageExtension("image/webp"), "webp");
  assert.equal(getImageExtension("image/gif"), null);
});

test("validates item fields and predefined categories", () => {
  const valid = new FormData();
  valid.set("title", "Svart Nike-hoodie");
  valid.set("category", "Kläder");
  valid.set("foundLocation", "Idrottshallen");
  valid.set("foundDate", "2026-09-09");
  assert.ok(validateItemFields(valid).data);

  valid.set("category", "Påhittad kategori");
  assert.match(validateItemFields(valid).error, /giltig kategori/);
});
