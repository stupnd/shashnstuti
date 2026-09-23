"use client";

import { useEffect, useRef } from "react";
import { markSeen, type Section } from "@/lib/actions/seen";

/**
 * Clears this section's nav badge once the page is open. Runs once per mount
 * (the ref guards React's double-invoke in development).
 */
export function MarkSeen({ section }: { section: Section }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markSeen(section);
  }, [section]);
  return null;
}
