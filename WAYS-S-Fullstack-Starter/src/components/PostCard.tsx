import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, BadgeCheck, Flag } from "lucide-react";
import { supabase, Post } from "../lib/supabase";
import { toggleLike } from "../lib/api";

export default function PostCard({ post, userId, onChanged }: { post: Post; userId?: string; onChanged?: () => void }) {
 const initial=(post.likes||[]).some(l=>l.user_id===userId);const [liked,setLiked]=useState(initial);const [busy,setBusy]=useState(false);const [comment,setComment]=useState("");const [showComments,setShowComments]=useState(false);const [comments,setComments]=useState<any[]>([]);const [menu,setMenu]=useState(false);
 const name=post.profiles?.display_name||post.profiles?.username||"WAYS S member";const avatar=post.profiles?.avatar_url;const own=!!userId&&post.user_id===userId;
 const like=async()=>{if(!userId||busy)return;setBusy(true);setLiked(!liked);try{await toggleLike(post.id,userId,liked);}catch{setLiked(liked);}setBusy(false);onChanged?.();};
 const loadComments=async()=>{const {data}=await supabase.from("comments").select("*, profiles(username,display_name,avatar_url)").eq("post_id",post.id).order("created_at");setComments(data||[]);setShowComments(v=>!v);};
 const sendComment=async()=>{if(!comment.trim()||!userId)return;const {error}=await supabase.from("comments").insert({post_id:post.id,user_id:userId,body:comment.trim()});if(!error){setComment("");const {data}=await supabase.from("comments").select("*, profiles(username,display_name,avatar_url)").eq("post_id",post.id).order("created_at");setComments(data||[]);setShowComments(true);onChanged?.();}};
 const reportPost=async()=>{const reason=window.prompt("Why are you reporting this post?");if(!reason?.trim())return;const {error}=await supabase.from("post_reports").insert({reporter_id:userId,post_id:post.id,reason:reason.trim()});setMenu(false);if(error)alert(error.message);else alert("Report submitted for review.");};
 const deletePost=async()=>{if(!confirm("Delete this post permanently?"))return;setBusy(true);const {error}=await supabase.from("posts").delete().eq("id",post.id).eq("user_id",userId);setBusy(false);setMenu(false);if(error)alert(error.message);else onChanged?.();};
 return <article className="post-card">
  <header className="post-head"><Link to={own?"/":"/profile/"+post.user_id} className="post-author-link"><img className="avatar sm" src={avatar||"/avatar.svg"} alt=""/><span><b>{name} {post.profiles?.is_verified&&<BadgeCheck className="verified-badge"/>}{post.profiles?.ways_verified&&<span className="ways-verified-badge">W</span>}</b><small>@{post.profiles?.username||"wayss_user"}</small></span></Link>
   <div className="post-menu-wrap"><button className="icon-btn" aria-label="Post options" onClick={()=>setMenu(v=>!v)}><MoreHorizontal/></button>{menu&&<div className="post-menu">{own?<button disabled={busy} onClick={deletePost}><Trash2 size={15}/> Delete post</button>:<><button onClick={reportPost}><Flag size={15}/> Report post</button><button onClick={()=>{navigator.clipboard?.writeText(window.location.origin+"/profile/"+post.user_id);setMenu(false);}}>Copy profile link</button></>}</div>}</div>
  </header>
  {post.media_url&&(post.media_type==="video"?<video className="post-media" src={post.media_url} controls/>:<img className="post-media" src={post.media_url} alt="Post media"/>)}
  {post.caption&&<p className="post-caption">{post.caption}</p>}
  <div className="post-actions"><button onClick={like} className={liked?"liked":""}><Heart fill={liked?"currentColor":"none"}/><span>{(post.likes?.length||0)+(liked&&!initial?1:0)-(!liked&&initial?1:0)}</span></button><button onClick={loadComments}><MessageCircle/><span>{post.comments?.length||0}</span></button><button onClick={()=>{navigator.clipboard?.writeText(window.location.origin+"/profile/"+post.user_id);}} aria-label="Share profile"><Send/></button></div>
  {showComments&&<div className="comments"><div className="comment-list">{comments.map(c=><p key={c.id}><b>{c.profiles?.username||"user"}</b> {c.body}</p>)}</div><div className="comment-input"><input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Write a comment..."/><button onClick={sendComment}>Send</button></div></div>}
 </article>;
}
