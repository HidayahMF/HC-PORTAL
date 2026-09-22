export const MAX_FILE_BYTES = 16 * 1024 * 1024;

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "application/pdf",
]);

export function getFileKind(file) {
  if (!file) return null;
  const mime = file.type || "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "other";
}

export function isAllowedMime(mime) {
  return ALLOWED_MIME.has(mime);
}
