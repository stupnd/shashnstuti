"use client";

import { useRouter } from "next/navigation";
import { removePhoto } from "@/lib/actions/entries";
import type { PhotoWithUrl } from "@/lib/entries";
import { PhotoSwiper } from "./photo-swiper";

/** Entry-page viewer; wires the delete button to the server action for the author. */
export function EntryPhotos({ photos, alt, canEdit }: { photos: PhotoWithUrl[]; alt: string; canEdit: boolean }) {
  const router = useRouter();
  return (
    <PhotoSwiper
      photos={photos}
      alt={alt}
      onDelete={
        canEdit
          ? async (id) => {
              await removePhoto(id);
              router.refresh();
            }
          : undefined
      }
    />
  );
}
