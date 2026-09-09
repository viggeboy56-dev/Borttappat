import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { MAX_ITEM_IMAGE_SIZE, getImageExtension, validateItemFields, validateItemImage } from "@/lib/items/validation";

const STAFF_ROLES = new Set(["staff", "school_admin"]);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const auth = await getAuthState();
  if (auth.status === "unauthenticated") return errorResponse("Du behöver logga in igen.", 401);
  if (auth.status !== "authenticated" || !STAFF_ROLES.has(auth.profile.role)) {
    return errorResponse("Du har inte behörighet att registrera fynd.", 403);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_ITEM_IMAGE_SIZE + 1024 * 1024) {
    return errorResponse("Uppladdningen är för stor. Bilden får vara högst 5 MB.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Formuläret kunde inte läsas.", 400);
  }

  const fields = validateItemFields(formData);
  if (!fields.data) return errorResponse(fields.error, 400);

  const imageValue = formData.get("image");
  const image = imageValue instanceof File ? imageValue : null;
  const imageError = validateItemImage(image);
  if (imageError) return errorResponse(imageError, 400);
  if (!image) return errorResponse("Välj en bild av föremålet.", 400);

  const extension = getImageExtension(image.type);
  if (!extension) return errorResponse("Bildformatet stöds inte.", 400);

  const supabase = await createClient();
  const itemId = randomUUID();
  const imagePath = `${auth.profile.schoolId}/${itemId}/${randomUUID()}.${extension}`;

  const { error: insertError } = await supabase.from("items").insert({
    id: itemId,
    school_id: auth.profile.schoolId,
    created_by: auth.userId,
    title: fields.data.title,
    description: fields.data.description,
    category: fields.data.category,
    found_location: fields.data.foundLocation,
    found_date: fields.data.foundDate,
    status: "archived",
  });

  if (insertError) return errorResponse("Fyndet kunde inte sparas. Försök igen.", 500);

  const { error: uploadError } = await supabase.storage.from("item-images").upload(imagePath, image, {
    cacheControl: "3600",
    contentType: image.type,
    upsert: false,
  });

  if (uploadError) return errorResponse("Bilden kunde inte laddas upp. Försök med en annan bild.", 500);

  const { data: publishedItem, error: publishError } = await supabase
    .from("items")
    .update({ image_path: imagePath, status: "available" })
    .eq("id", itemId)
    .select("id")
    .single();

  if (publishError || !publishedItem) {
    await supabase.storage.from("item-images").remove([imagePath]);
    return errorResponse("Fyndet kunde inte publiceras. Försök igen.", 500);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/items");
  return NextResponse.json({ id: publishedItem.id }, { status: 201 });
}
