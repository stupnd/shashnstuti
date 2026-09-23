import type { Metadata } from "next";
import { Booth } from "./booth";
import { getSettings } from "@/lib/data";
import { dayOfUs } from "@/lib/dates";

export const metadata: Metadata = { title: "photobooth" };

export default async function BoothPage() {
  const settings = await getSettings();
  // Printed along the foot of the strip, like a real booth's date stamp.
  const caption = `day ${dayOfUs(settings.start_date).toLocaleString()} of us`;
  return <Booth caption={caption} />;
}
