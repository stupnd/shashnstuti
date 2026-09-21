"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPerson } from "@/lib/people";

export type LoginState = { error?: string; person?: string };

/**
 * The password you both type is APP_PASSWORD. Each person also has a hidden
 * Supabase account; its password is derived from AUTH_SECRET so it's long and
 * random, and never has to be typed by anyone.
 */
function internalPassword(email: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set (16+ random characters) in .env.local");
  }
  return createHmac("sha256", secret).update(email).digest("base64url");
}

function passwordMatches(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) throw new Error("APP_PASSWORD is not set in .env.local");
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const personKey = String(formData.get("person") ?? "");
  const password = String(formData.get("password") ?? "");
  const person = findPerson(personKey);

  if (!person) return { error: "Pick who you are first." };

  if (!passwordMatches(password)) {
    await sleep(800); // gently discourage guessing
    return { person: personKey, error: "That's not it." };
  }

  const supabase = await createClient();
  const credentials = { email: person.email, password: internalPassword(person.email) };

  let { error } = await supabase.auth.signInWithPassword(credentials);

  // First ever sign-in for this person: create their hidden Supabase user.
  if (error && /invalid login credentials/i.test(error.message)) {
    const admin = createAdminClient();
    const { error: createError } = await admin.auth.admin.createUser({
      ...credentials,
      email_confirm: true,
    });
    if (createError) {
      return { person: personKey, error: `Couldn't set up your account: ${createError.message}` };
    }
    ({ error } = await supabase.auth.signInWithPassword(credentials));
  }

  if (error) return { person: personKey, error: error.message };

  redirect("/");
}
