export function isPreviewableImageStorageKey(storageKey: string): boolean {
  return (
    storageKey.startsWith("local-images/") ||
    storageKey.startsWith("supabase-images/")
  );
}
