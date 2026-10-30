import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, UserRound, BadgeCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

type Person = { id:string; username:string; display_name:string; avatar_url:string|null; is_verified?:boolean; ways_verified?:boolean };
export default function FollowList({ userId, kind, onClose }: { userId:string; kind:"followers"|"following"; onClose:()=>void }) {
 const [people,setPeople]=useState<Person[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 const navigate=useNavigate();
 useEffect(()=>{let active=true;(async()=>{
  const column=kind==="followers"?"follower_id":"following_id";
  const relation=kind==="followers"?"follower:profiles!follows_follower_id_fkey(id,username,display_name,avatar_url,is_verified,ways_verified)":"following:profiles!follows_following_id_fkey(id,username,display_name,avatar_url,is_verified,ways_verified)";
  const {data,error}=await supabase.from("follows").select(relation).eq(kind==="followers"?"following_id":"follower_id",userId).order("created_at",{ascending:false});
  if(!active)return;
  if(error){setError(error.message);setPeople([]);}else setPeople((data||[]).map((row:any)=>row[kind==="followers"?"follower":"following"]).filter(Boolean));
  setLoading(false);
 })();return()=>{active=false;};},[userId,kind]);
 return <div className="modal-backdrop follow-list-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="modal follow-list-modal" role="dialog" aria-modal="true" aria-label={kind}>
   <header className="modal-head"><div><span className="eyebrow">YOUR COMMUNITY</span><h2>{kind==="followers"?"Followers":"Following"}</h2></div><button onClick={onClose} aria-label="Close"><X/></button></header>
   {loading?<p className="muted">Loading people...</p>:error?<p className="form-error">{error}</p>:people.length===0?<div className="empty-state"><UserRound/><p>No {kind} yet.</p></div>:<div className="follow-list-items">{people.map(person=><button className="follow-list-person" key={person.id} onClick={()=>{onClose();navigate(person.id===userId?"/":"/profile/"+person.id);}}>
    <img src={person.avatar_url||"/avatar.svg"} alt="" /><span className="follow-list-copy"><b>@{person.username}{person.is_verified&&<BadgeCheck className="verified-badge"/>}{person.ways_verified&&<span className="ways-verified-badge">W</span>}</b><small>{person.display_name}</small></span><span className="follow-list-open">View</span>
   </button>)}</div>}
  </section>
 </div>;
}
