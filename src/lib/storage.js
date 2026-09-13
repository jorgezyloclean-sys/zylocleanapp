// Fotos en buckets privados. En la base se guarda el path; para mostrar se
// pide una URL firmada (1 h) y se cachea.
import { supabase } from "./supabase";
import { MOCK } from "../dev/mock";

const cache = new Map(); // key → { url, exp }

export async function uploadPhoto(bucket, path, file) {
  if (MOCK) { cache.set(`${bucket}/${path}`, { url: URL.createObjectURL(file), exp: Infinity }); return path; }
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
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
