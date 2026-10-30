import { useEffect, useState } from "react";
import { supabase, Post } from "../lib/supabase";
import PostCard from "../components/PostCard";
import { useNavigate } from "react-router-dom";

export default function Home({ userId }: { userId:string }) {
  const [posts,setPosts] = useState<Post[]>([]); const [loading,setLoading] = useState(true); const nav=useNavigate();
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("posts").select("*, profiles(*), likes(user_id), comments(id)").order("created_at",{ascending:false}).limit(40);
    setPosts((data || []) as Post[]); setLoading(false);
  };
  useEffect(()=>{load();},[]);
  return <div className="page feed-page"><div className="page-heading"><div><span className="eyebrow">YOUR WORLD. YOUR ORBIT.</span><h1>Home</h1></div><button className="primary-btn compact" onClick={()=>nav("/create")}>＋ Create</button></div>
    {loading?<div className="empty-state">Finding your orbit...</div>:posts.length===0?<div className="empty-state"><div className="empty-orbit">◎</div><h2>Your feed starts here</h2><p>Follow people or share your first moment.</p><button className="primary-btn" onClick={()=>nav("/create")}>Create a post</button></div>:<div className="feed-list">{posts.map(p=><PostCard key={p.id} post={p} userId={userId} onChanged={load}/>)}</div>}
  </div>;
}