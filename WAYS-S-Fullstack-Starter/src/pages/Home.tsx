import { useCallback,useEffect,useState } from "react";
import { supabase, Post } from "../lib/supabase";
import PostCard from "../components/PostCard";
import StoryBar from "../components/StoryBar";
import { useNavigate } from "react-router-dom";
import { Users, Sparkles } from "lucide-react";

export default function Home({ userId }: { userId:string }) {
 const [posts,setPosts]=useState<Post[]>([]);const [loading,setLoading]=useState(true);const [followingCount,setFollowingCount]=useState(0);const nav=useNavigate();
 const load=useCallback(async()=>{
  setLoading(true);
  const {data:follows,error:followError}=await supabase.from("follows").select("following_id").eq("follower_id",userId);
  if(followError){setPosts([]);setLoading(false);return;}
  const ids=[userId,...(follows||[]).map(x=>x.following_id)];
  setFollowingCount(ids.length-1);
  const {data,error}=await supabase.from("posts").select("*,profiles(*),likes(user_id),comments(id)").in("user_id",ids).order("created_at",{ascending:false}).limit(60);
  setPosts(error?[]:(data||[]) as Post[]);setLoading(false);
 },[userId]);
 useEffect(()=>{load();const ch=supabase.channel("home-feed-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"posts"},()=>load()).subscribe();return()=>{supabase.removeChannel(ch);};},[load,userId]);
 return <div className="page feed-page"><StoryBar userId={userId}/><div className="page-heading"><div><span className="eyebrow">YOUR WORLD. YOUR ORBIT.</span><h1>Home</h1><p className="muted">Moments from people you follow</p></div><button className="primary-btn compact" onClick={()=>nav("/create")}>＋ Create</button></div>
 {loading?<div className="empty-state">Finding your orbit...</div>:posts.length===0?<div className="empty-state"><div className="empty-orbit"><Sparkles/></div><h2>Your feed starts here</h2><p>{followingCount===0?"Follow people in Orbit to see their posts here.":"Your followed creators haven't posted yet."}</p><button className="primary-btn" onClick={()=>nav("/orbit")}><Users size={16}/> Discover people</button></div>:<div className="feed-list">{posts.map(p=><PostCard key={p.id} post={p} userId={userId} onChanged={load}/>)}</div>}
 </div>;
}
