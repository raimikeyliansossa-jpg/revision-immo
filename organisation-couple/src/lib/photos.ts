"use client";
import { supabase } from "./supabase";

/** Convertit HEIC → JPEG si besoin, puis compresse (1600 px max). */
export async function prepareImage(file: File): Promise<Blob> {
  let input: Blob = file;
  const isHeic =
    /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (isHeic) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    input = Array.isArray(out) ? out[0] : out;
  }
  const imageCompression = (await import("browser-image-compression")).default;
  const asFile = input instanceof File ? input : new File([input], "photo.jpg", { type: "image/jpeg" });
  return imageCompression(asFile, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.2,
    fileType: "image/jpeg",
    initialQuality: 0.82,
    useWebWorker: true,
  });
}

/** Envoie la photo dans le dossier privé du couple et renvoie son chemin. */
export async function uploadPhoto(coupleId: string, kind: "outfits" | "souvenirs", file: File) {
  const blob = await prepareImage(file);
  const path = `${coupleId}/${kind}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase()
    .storage.from("photos")
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

// Cache des liens temporaires (valables 1 h)
const cache = new Map<string, { url: string; exp: number }>();
const pending = new Map<string, Promise<string | null>>();

export async function signedUrl(path: string): Promise<string | null> {
  const hit = cache.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  if (pending.has(path)) return pending.get(path)!;
  const p = supabase()
    .storage.from("photos")
    .createSignedUrl(path, 3600)
    .then(({ data }) => {
      pending.delete(path);
      if (!data?.signedUrl) return null;
      cache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
      return data.signedUrl;
    });
  pending.set(path, p);
  return p;
}

export async function deletePhoto(path: string) {
  await supabase().storage.from("photos").remove([path]);
  cache.delete(path);
}
