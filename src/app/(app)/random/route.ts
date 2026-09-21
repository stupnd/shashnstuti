import { NextResponse, type NextRequest } from "next/server";
import { fetchRandomEntryId } from "@/lib/entries";

export const dynamic = "force-dynamic";

/** The "random memory" button: bounce to a random entry. */
export async function GET(request: NextRequest) {
  const id = await fetchRandomEntryId();
  const url = new URL(id ? `/entry/${id}` : "/timeline", request.url);
  return NextResponse.redirect(url);
}
