"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { movePhotoToDate, removePhoto } from "@/lib/actions/entries";
import type { PhotoWithUrl } from "@/lib/entries";
import { PhotoSwiper } from "./photo-swiper";

/** Entry-page viewer; wires the delete button to the server action for the author. */
export function EntryPhotos({ photos, alt, canEdit }: { photos: PhotoWithUrl[]; alt: string; canEdit: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(photos);
  useEffect(() => setList(photos), [photos]);
  return (
    <PhotoSwiper
      photos={list}
      alt={alt}
      onDelete={
        canEdit
          ? async (id) => {
              await removePhoto(id);
              setList((l) => l.filter((p) => p.id !== id));
              router.refresh();
            }
          : undefined
      }
      onMove={
        canEdit
          ? async (id, date) => {
              const { entryId } = await movePhotoToDate(id, date);
              setList((l) => l.filter((p) => p.id !== id));
              if (list.length <= 1) router.push(`/entry/${entryId}`);
              else router.refresh();
            }
          : undefined
      }
    />
  );
}
