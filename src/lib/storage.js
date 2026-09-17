// Fotos en buckets privados. En la base se guarda el path; para mostrar se
// pide una URL firmada (1 h) y se cachea.
import { supabase } from "./supabase";
import { MOCK } from "../dev/mock";

const cache = new Map(); // key → { url, exp }

// Compresión en el dispositivo antes de subir. Una foto de teléfono pesa 3-5 MB; a 1600 px y
// JPEG 82 % queda en 150-300 KB, suficiente para "así quedó la cocina" y 10× menos storage y
// transferencia (el plan free de Supabase da 1 GB / 5 GB al mes). Si algo falla, sube el original.
const MAX_SIDE = 1600, QUALITY = 0.82, SKIP_UNDER = 350 * 1024;

export async function compressImage(file) {
  if (!file?.type?.startsWith("image/") || file.type === "image/gif" || file.size < SKIP_UNDER) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h); bmp.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch { return file; }
}

export async function uploadPhoto(bucket, path, file) {
  const out = await compressImage(file);
  if (out !== file) path = path.replace(/\.[^./]+$/, "") + ".jpg";
  if (MOCK) { cache.set(`${bucket}/${path}`, { url: URL.createObjectURL(out), exp: Infinity }); return path; }
  const { error } = await supabase.storage.from(bucket).upload(path, out, { upsert: false, contentType: out.type });
  if (error) throw error;
  return path;
}

export async function removePhoto(bucket, path) {
  if (MOCK) return;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}

export async function signedUrl(bucket, path, ttl = 3600) {
  if (!path) return null;
  // Compatibilidad: si quedó una URL absoluta vieja, se devuelve tal cual.
  if (/^https?:\/\//.test(path)) return path;
  const key = `${bucket}/${path}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.url;
  if (MOCK) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);
  if (error) return null;
  cache.set(key, { url: data.signedUrl, exp: Date.now() + (ttl - 60) * 1000 });
  return data.signedUrl;
}

export function photoPath(prefix, file) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}
