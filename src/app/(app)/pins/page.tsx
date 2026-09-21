import type { Metadata } from "next";
import { PinPicker } from "@/components/home-pins";
import { Page, PageHeader } from "@/components/ui";
import { fetchPhotosForPinning, fetchPinnedPhotoIds, MAX_HOME_PINS } from "@/lib/home-pins";

export const metadata: Metadata = { title: "pin to home" };

export default async function PinsPage() {
  const [page, pinnedIds] = await Promise.all([fetchPhotosForPinning({}), fetchPinnedPhotoIds()]);

  return (
    <Page>
      <main className="animate-fade-up">
        <PageHeader
          back="/"
          title="pin to home"
          caption={`pick up to ${MAX_HOME_PINS} favorites`}
          hl="var(--peach)"
        />
        <div className="mt-5">
          <PinPicker initial={page.photos} initialCursor={page.next} initialPinnedCount={pinnedIds.size} />
        </div>
      </main>
    </Page>
  );
}
