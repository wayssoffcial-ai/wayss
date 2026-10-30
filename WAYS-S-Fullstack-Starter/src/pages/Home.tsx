import { useCallback,useEffect,useRef,useState } from "react";
import { supabase, Post } from "../lib/supabase";
import PostCard from "../components/PostCard";
import StoryBar from "../components/StoryBar";
import { Sparkles } from "lucide-react";

export default function Home({ userId }: { userId:string }) {
 const [posts,setPosts]=useState<Post[]>([]);const [loading,setLoading]=useState(true);const [followingCount,setFollowingCount]=useState(0);const [pull,setPull]=useState(0);const [refreshing,setRefreshing]=useState(false);const touchStart=useRef(0);
 const load=useCallback(async(quiet=false)=>{
  if(!quiet)setLoading(true);
  const {data:follows,error:followError}=await supabase.from("follows").select("following_id").eq("follower_id",userId);
  if(followError){if(!quiet)setPosts([]);setLoading(false);return;}
  const ids=[userId,...(follows||[]).map(x=>x.following_id)];
  setFollowingCount(ids.length-1);
  const {data,error}=await supabase.from("posts").select("*,profiles(*),likes(user_id),comments(id)").in("user_id",ids).order("created_at",{ascending:false}).limit(60);
  if(!error)setPosts((data||[]) as Post[]);else if(!quiet)setPosts([]);setLoading(false);
 },[userId]);
 useEffect(()=>{load();const ch=supabase.channel("home-feed-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"posts"},()=>load()).subscribe();return()=>{supabase.removeChannel(ch);};},[load,userId]);
 const finishPull=async(endY:number)=>{const distance=endY-touchStart.current;if(distance>76&&!refreshing){setRefreshing(true);setPull(76);await load(true);setRefreshing(false);}setPull(0);touchStart.current=0;};
 return <div className="page feed-page feed-pull-zone" onTouchStart={e=>{if(window.scrollY<=2)touchStart.current=e.touches[0].clientY;}} onTouchMove={e=>{if(touchStart.current){const d=Math.max(0,Math.min(90,e.touches[0].clientY-touchStart.current));setPull(d);}}} onTouchEnd={e=>{if(touchStart.current)void finishPull(e.changedTouches[0].clientY);}}><div className={"pull-orbit-indicator "+(refreshing?"is-refreshing":"")} style={{height:Math.max(0,pull)}}><span className="pull-orbit-core"><i/><i/><i/></span><small>{refreshing?"Re-syncing your orbit…":pull>76?"Release to refresh":"Pull to refresh"}</small></div><StoryBar userId={userId}/>{loading?<div className="empty-state">Finding your orbit...</div>:posts.length===0?<div className="empty-state"><div className="empty-orbit"><Sparkles/></div><h2>Your feed starts here</h2><p>{followingCount===0?"Follow people in Orbit to see their posts here.":"Your followed creators haven't posted yet."}</p></div>:<div className="feed-list">{posts.map(p=><PostCard key={p.id} post={p} userId={userId} onChanged={load}/>)}</div>}
 </div>;
}
