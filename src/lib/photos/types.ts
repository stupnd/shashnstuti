import type { DateSource } from "@/lib/database.types";

export type PhotoMeta = {
  /** Calendar day the photo was taken (YYYY-MM-DD). */
  date: string;
  /** Full timestamp if EXIF had one. */
  takenAt: Date | null;
  dateSource: DateSource;
  lat: number | null;
  lng: number | null;
};
