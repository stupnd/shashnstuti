"use server";

import { fetchPhotosForPinning } from "@/lib/home-pins";

export async function loadMorePinPhotos(before: { date: string; created_at: string } | null) {
  return fetchPhotosForPinning({ before });
}
