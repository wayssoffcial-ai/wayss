import { useState } from "react";
import { Heart, MessageCircle, Send, MoreHorizontal } from "lucide-react";
import { supabase, Post } from "../lib/supabase";
import { toggleLike } from "../lib/api";

export default function PostCard({ post, userId, onChanged }: { post: Post; userId?: string; onChanged?: () => void }) {
  const initial = (post.likes || []).some(l => l.user_id === userId);
  const [liked, setLiked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [comment, setComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const name = post.profiles?.display_name || post.profiles?.username || "WAYS S member";
  const avatar = post.profiles?.avatar_url;
  const like = async () => {
    if (!userId || busy) return;
    setBusy(true); setLiked(!liked);
    try { await toggleLike(post.id, userId, liked); } catch { setLiked(liked); }
    setBusy(false); onChanged?.();
  };
  const loadComments = async () => {
    const { data } = await supabase.from("comments").select("*, profiles(username,display_name,avatar_url)").eq("post_id", post.id).order("created_at");
    setComments(data || []); setShowComments(v => !v);
  };
  const sendComment = async () => {
    if (!comment.trim() || !userId) return;
    const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: userId, body: comment.trim() });
    if (!error) { setComment(""); await loadComments(); }
  };
  return <article className="post-card">
    <header className="post-head"><img className="avatar sm" src={avatar || "/avatar.svg"}/><div><b>{name}</b><small>@{post.profiles?.username || "wayss_user"}</small></div><button className="icon-btn"><MoreHorizontal/></button></header>
    {post.media_url && (post.media_type === "video" ? <video className="post-media" src={post.media_url} controls /> : <img className="post-media" src={post.media_url} />)}
    {post.caption && <p className="post-caption">{post.caption}</p>}
    <div className="post-actions"><button onClick={like} className={liked ? "liked" : ""}><Heart fill={liked ? "currentColor" : "none"}/><span>{(post.likes?.length || 0) + (liked && !initial ? 1 : 0) - (!liked && initial ? 1 : 0)}</span></button><button onClick={loadComments}><MessageCircle/><span>{post.comments?.length || 0}</span></button><button><Send/></button></div>
    {showComments && <div className="comments"><div className="comment-list">{comments.map(c => <p key={c.id}><b>{c.profiles?.username || "user"}</b> {c.body}</p>)}</div><div className="comment-input"><input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..."/><button onClick={sendComment}>Send</button></div></div>}
  </article>;
}