"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { fetchEntry, type EntryCard } from "@/lib/entries";

const Answer = z.object({
  answer: z.string().describe("A warm one- or two-sentence answer, written like a friend who knows the couple."),
  entry_ids: z.array(z.string()).describe("IDs of the matching moments, best match first. Empty if nothing fits."),
});

export type AskResult = { answer: string; entries: EntryCard[] } | { error: string };

/**
 * "Ask the book": Claude reads a compact index of every moment (dates, notes,
 * places, tags, photo captions) and points at the ones that answer the question.
 */
export async function askBook(question: string): Promise<AskResult> {
  const q = question.trim().slice(0, 300);
  if (!q) return { error: "Ask me something." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "ANTHROPIC_API_KEY isn't set on the server." };

  await getCurrentProfile();
  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("entries")
    .select("id, date, title, note, place, tags, mood, is_milestone, photos(caption)")
    .order("date");

  const index = (entries ?? [])
    .map((e) => {
      const caps = (e.photos ?? []).map((p) => p.caption).filter(Boolean).slice(0, 8).join("; ");
      return [
        `id=${e.id}`,
        `date=${e.date}`,
        e.title && `title=${e.title}`,
        e.note && `note=${e.note.slice(0, 200)}`,
        e.place && `place=${e.place}`,
        e.tags.length && `tags=${e.tags.join(",")}`,
        e.mood && `mood=${e.mood}`,
        e.is_milestone && "milestone",
        caps && `photos=${caps}`,
      ].filter(Boolean).join(" | ");
    })
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);
  const client = new Anthropic();
  try {
    const res = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 2000,
      output_config: { format: zodOutputFormat(Answer), effort: "low" },
      system: [
        {
          type: "text",
          text: `You are the memory of a couple's private scrapbook (Stuti and Shash). Today is ${today}. Below is every moment in the book, one per line. Answer the question using only this data. Pick the moments that best fit — usually 1 to 6, up to 12 for broad questions. If the question is about a time ("a year ago", "last summer"), do the date maths. If nothing matches, say so kindly and return no ids.\n\n${index}`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: q }],
    });
    const parsed = res.parsed_output;
    if (!parsed) return { error: "I couldn't make sense of that one — try rephrasing." };
    const cards = await Promise.all(parsed.entry_ids.slice(0, 12).map((id) => fetchEntry(id)));
    return { answer: parsed.answer, entries: cards.filter((c): c is EntryCard => Boolean(c)) };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { error: "The Anthropic API key is invalid." };
    if (e instanceof Anthropic.RateLimitError) return { error: "Too many questions at once — try again in a moment." };
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
