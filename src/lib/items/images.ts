import type { SupabaseClient } from "@supabase/supabase-js";

export async function createSignedImageMap(
  supabase: SupabaseClient,
  imagePaths: Array<string | null>,
) {
  const paths = [...new Set(imagePaths.filter((path): path is string => Boolean(path)))];
  const signedUrls = new Map<string, string>();
  if (paths.length === 0) return signedUrls;

  const { data, error } = await supabase.storage.from("item-images").createSignedUrls(paths, 60 * 60);
  if (error) return signedUrls;

  for (const result of data ?? []) {
    if (result.path && result.signedUrl) signedUrls.set(result.path, result.signedUrl);
  }

  return signedUrls;
}
