// Client-safe HEIC helpers. Only browser APIs here — imported by client
// components (MediaUploader, ProfilePhotoForm), never by server modules.

const HEIC_EXTENSION_RE = /\.(heic|heif)$/i;

/** True for HEIC/HEIF containers (the default iPhone photo format). */
export function isHeicFile(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    HEIC_EXTENSION_RE.test(file.name)
  );
}

/**
 * Convert an iPhone HEIC/HEIF photo to JPEG in the browser. libheif runs as
 * WASM via heic2any, so decoding works even where the OS cannot (Chrome,
 * Firefox, Edge). The resulting JPEG renders on every platform and survives
 * the Next.js image optimizer, which cannot decode HEIC. Returns the original
 * file unchanged for non-HEIC inputs.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    return new File([converted as Blob], file.name.replace(HEIC_EXTENSION_RE, ".jpg"), {
      type: "image/jpeg",
    });
  } catch (error) {
    console.error("HEIC conversion failed.", {
      name: file.name,
      type: file.type,
      size: file.size,
      error,
    });
    throw error;
  }
}
