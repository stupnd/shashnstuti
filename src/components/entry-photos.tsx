"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { movePhotoToDate, removePhoto } from "@/lib/actions/entries";
import type { Neighbor, PhotoWithUrl } from "@/lib/entries";
import { PhotoPinButton } from "./home-pins";
import { PhotoSwiper } from "./photo-swiper";

/** Entry-page viewer; wires the delete button to the server action for the author. */
export function EntryPhotos({
  photos,
  alt,
  canEdit,
  older,
  newer,
  pinnedIds,
}: {
  photos: PhotoWithUrl[];
  alt: string;
  canEdit: boolean;
  older: Neighbor | null;
  newer: Neighbor | null;
  pinnedIds: string[];
}) {
  const router = useRouter();
  const [list, setList] = useState(photos);
  const [pinned, setPinned] = useState(() => new Set(pinnedIds));
  useEffect(() => setList(photos), [photos]);
  useEffect(() => setPinned(new Set(pinnedIds)), [pinnedIds]);

  const extraActions = (photo: PhotoWithUrl): ReactNode => (
    <PhotoPinButton
      photoId={photo.id}
      initiallyPinned={pinned.has(photo.id)}
      className="!shadow-[2px_2px_0_var(--ink)]"
    />
  );

  return (
    <PhotoSwiper
      photos={list}
      alt={alt}
      extraActions={extraActions}
      onEdge={
        older || newer
          ? (dir) => {
              const target = dir === "next" ? older : newer;
              if (target) router.push(`/entry/${target.id}`);
            }
          : undefined
      }
      onDelete={
        canEdit
          ? async (id) => {
              const { entryDeleted } = await removePhoto(id);
              if (entryDeleted) {
                router.push("/timeline");
                return;
              }
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
