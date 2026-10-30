import { supabase } from "./supabase";

export async function uploadMedia(file: File, folder: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("ways-media").upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("ways-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function ensureProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const username = String(user.user_metadata?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`).toLowerCase().replace(/[^a-z0-9_]/g, "");
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return data;
  const { data: created, error } = await supabase.from("profiles").insert({
    id: user.id, username, display_name: String(user.user_metadata?.display_name || username)
  }).select().single();
  if (error) throw error;
  return created;
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function followUser(targetId: string, userId: string, following: boolean) {
  if (following) {
    const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("follows").insert({ follower_id: userId, following_id: targetId });
    if (error) throw error;
  }
}
export async function uploadChatMedia(file: File, senderId: string, receiverId: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${senderId}/${receiverId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("ways-chat").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function signChatMedia(path: string) {
  const { data, error } = await supabase.storage.from("ways-chat").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
