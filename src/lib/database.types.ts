/**
 * Hand-written to match supabase/migrations/*.sql.
 * If the schema changes, update both. (Later you can swap this for
 * `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`.)
 */

export type DateSource = "exif" | "filename" | "mtime" | "manual";

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_emoji: string;
  created_at: string;
};

export type Settings = {
  id: number;
  start_date: string; // YYYY-MM-DD
  updated_at: string;
};

export type Entry = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string | null;
  note: string;
  place: string | null;
  place_lat: number | null;
  place_lng: number | null;
  author: string;
  mood: string | null;
  tags: string[];
  is_milestone: boolean;
  created_at: string;
  updated_at: string;
};

export type Photo = {
  id: string;
  entry_id: string;
  storage_path: string;
  width: number;
  height: number;
  taken_at: string | null;
  date_source: DateSource;
  source_hash: string | null;
  caption: string | null;
  sort_order: number;
  created_at: string;
};

export type Reaction = {
  id: string;
  entry_id: string;
  author: string;
  emoji: string;
  reply: string | null;
  created_at: string;
};

export type Letter = {
  id: string;
  title: string;
  body: string;
  author: string;
  recipient: string;
  unlock_at: string | null;
  opened_at: string | null;
  created_at: string;
};

export type WrappedCustom = {
  year: number;
  slot: number;
  label: string;
  value: string;
  updated_by: string | null;
  updated_at: string;
};

export type GameSession = {
  id: string;
  state: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
};

export type HomePin = {
  photo_id: string;
  pinned_by: string;
  pinned_at: string;
  sort_order: number;
};

export type LockedLetter = Pick<
  Letter,
  "id" | "title" | "author" | "unlock_at" | "created_at"
>;

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Optional<Profile, "avatar_emoji" | "created_at">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      settings: {
        Row: Settings;
        Insert: Optional<Settings, "id" | "updated_at">;
        Update: Partial<Settings>;
        Relationships: [];
      };
      entries: {
        Row: Entry;
        Insert: Optional<
          Entry,
          | "id"
          | "title"
          | "note"
          | "place"
          | "place_lat"
          | "place_lng"
          | "mood"
          | "tags"
          | "is_milestone"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<Entry>;
        Relationships: [
          {
            foreignKeyName: "entries_author_fkey";
            columns: ["author"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      photos: {
        Row: Photo;
        Insert: Optional<
          Photo,
          | "id"
          | "taken_at"
          | "date_source"
          | "source_hash"
          | "caption"
          | "sort_order"
          | "created_at"
        >;
        Update: Partial<Photo>;
        Relationships: [
          {
            foreignKeyName: "photos_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          }
        ];
      };
      reactions: {
        Row: Reaction;
        Insert: Optional<Reaction, "id" | "reply" | "created_at">;
        Update: Partial<Reaction>;
        Relationships: [
          {
            foreignKeyName: "reactions_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "entries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reactions_author_fkey";
            columns: ["author"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      letters: {
        Row: Letter;
        Insert: Optional<Letter, "id" | "unlock_at" | "opened_at" | "created_at">;
        Update: Partial<Letter>;
        Relationships: [
          {
            foreignKeyName: "letters_author_fkey";
            columns: ["author"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "letters_recipient_fkey";
            columns: ["recipient"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      wrapped_custom: {
        Row: WrappedCustom;
        Insert: Optional<WrappedCustom, "label" | "value" | "updated_by" | "updated_at">;
        Update: Partial<WrappedCustom>;
        Relationships: [];
      };
      game_sessions: {
        Row: GameSession;
        Insert: Optional<GameSession, "state" | "updated_at" | "updated_by">;
        Update: Partial<GameSession>;
        Relationships: [];
      };
      home_pins: {
        Row: HomePin;
        Insert: Optional<HomePin, "pinned_at" | "sort_order">;
        Update: Partial<HomePin>;
        Relationships: [
          {
            foreignKeyName: "home_pins_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: true;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "home_pins_pinned_by_fkey";
            columns: ["pinned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_member: { Args: Record<string, never>; Returns: boolean };
      owns_entry: { Args: { p_entry_id: string }; Returns: boolean };
      my_locked_letters: { Args: Record<string, never>; Returns: LockedLetter[] };
      open_letter: { Args: { p_id: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
