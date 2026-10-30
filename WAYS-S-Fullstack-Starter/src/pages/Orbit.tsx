import { useState } from "react";
import { Search, UserPlus, UserCheck } from "lucide-react";
import { supabase, Profile } from "../lib/supabase";
import { followUser } from "../lib/api";

export default function Orbit({userId}:{userId:string}) {
  const [query,setQuery]=useState(""); const [results,setResults]=useState<Profile[]>([]); const [following,setFollowing]=useState<string[]>([]); const [searched,setSearched]=useState(false);
  const search=async()=>{setSearched(true);if(!query.trim()){setResults([]);return;}const {data}=await supabase.from("profiles").select("*").or(`username.ilike.%${query}%,display_name.ilike.%${query}%`).neq("id",userId).limit(25);setResults(data||[]);
    const ids=(data||[]).map(p=>p.id);if(ids.length){const {data:f}=await supabase.from("follows").select("following_id").eq("follower_id",userId).in("following_id",ids);setFollowing((f||[]).map(x=>x.following_id));}};
  const toggle=async(id:string)=>{const yes=following.includes(id);await followUser(id,userId,yes);setFollowing(s=>yes?s.filter(x=>x!==id):[...s,id]);};
  return <div className="page"><span className="eyebrow">FIND YOUR PEOPLE</span><h1>Orbit</h1><div className="search-box"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} placeholder="Search people by name or username"/><button onClick={search}>Search</button></div>
    <div className="people-list">{results.map(p=><div className="person-row" key={p.id}><img className="avatar" src={p.avatar_url||"/avatar.svg"}/><div className="person-info"><b>{p.display_name}</b><small>@{p.username}</small>{p.identity_line&&<small>{p.identity_line}</small>}</div><button className={following.includes(p.id)?"secondary-btn mini":"primary-btn mini"} onClick={()=>toggle(p.id)}>{following.includes(p.id)?<><UserCheck/> Following</>:<><UserPlus/> Follow</>}</button></div>)}
    {searched&&results.length===0&&<p className="muted">No people found. Try another search.</p>}</div>
  </div>;
}