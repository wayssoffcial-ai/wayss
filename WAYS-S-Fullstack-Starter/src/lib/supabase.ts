import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && key && !url.includes("YOUR_PROJECT"));
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export type Profile = {
  id: string; username: string; display_name: string; bio: string | null;
  avatar_url: string | null; cover_url: string | null; identity_line: string | null;
  is_private: boolean; website: string | null; is_verified: boolean; ways_verified: boolean; account_status?: "active" | "suspended"; created_at?: string;
};
export type Post = {
  id: string; user_id: string; caption: string | null; media_url: string | null;
  media_type: string; created_at: string; profiles?: Profile;
  likes?: { user_id: string }[]; comments?: { id: string }[];
};