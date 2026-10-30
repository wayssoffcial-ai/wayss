import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, Profile as ProfileType, Post } from "../lib/supabase";
import { uploadMedia, followUser } from "../lib/api";
import PostCard from "../components/PostCard";
import { MoreHorizontal, MapPin, Plus, Settings, Share2, Flag, Lock, Pencil } from "lucide-react";

type Section={id:string;title:string;description:string;color:string;links:any[]};
export default function Profile({userId}:{userId:string}) {
  const params=useParams(); const target=params.id||userId; const own=target===userId;
  const [profile,setProfile]=useState<ProfileType|null>(null); const [sections,setSections]=useState<Section[]>([]); const [posts,setPosts]=useState<Post[]>([]);
  const [followers,setFollowers]=useState(0);const [following,setFollowing]=useState(0);const [isFollowing,setIsFollowing]=useState(false);
  const [editing,setEditing]=useState(false);const [sectionOpen,setSectionOpen]=useState(false);const [menu,setMenu]=useState(false);const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [color,setColor]=useState("#F32950");const [links,setLinks]=useState("");const [editId,setEditId]=useState<string|null>(null);
  const [display,setDisplay]=useState("");const [username,setUsername]=useState("");const [bio,setBio]=useState("");const [identity,setIdentity]=useState("");const [website,setWebsite]=useState("");const [busy,setBusy]=useState(false);
  const load=async()=>{const {data:p}=await supabase.from("profiles").select("*").eq("id",target).maybeSingle();if(!p)return;setProfile(p);setDisplay(p.display_name);setUsername(p.username);setBio(p.bio||"");setIdentity(p.identity_line||"");setWebsite(p.website||"");
    const [{data:s},{data:po},{count:fc},{count:gc},{data:f}]=await Promise.all([
      supabase.from("profile_sections").select("*").eq("user_id",target).order("sort_order"),
      supabase.from("posts").select("*,profiles(*),likes(user_id),comments(id)").eq("user_id",target).order("created_at",{ascending:false}).limit(30),
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("following_id",target),
      supabase.from("follows").select("*",{count:"exact",head:true}).eq("follower_id",target),
      supabase.from("follows").select("id").eq("follower_id",userId).eq("following_id",target).maybeSingle()
    ]);setSections((s||[]) as Section[]);setPosts((po||[]) as Post[]);setFollowers(fc||0);setFollowing(gc||0);setIsFollowing(!!f);
  };
  useEffect(()=>{load();},[target]);
  const saveProfile=async(e:FormEvent)=>{e.preventDefault();setBusy(true);const {error}=await supabase.from("profiles").update({display_name:display,username,bio,identity_line:identity,website}).eq("id",userId);setBusy(false);if(!error){setEditing(false);load();}};
  const changeImage=async(file:File|null,field:"avatar_url"|"cover_url")=>{if(!file)return;const url=await uploadMedia(file,"profiles");await supabase.from("profiles").update({[field]:url}).eq("id",userId);load();};
  const saveSection=async(e:FormEvent)=>{e.preventDefault();const parsed=links.split("\n").filter(Boolean).map(line=>{const [label,url]=line.split("|");return {label:(label||url||"Link").trim(),url:(url||label||"").trim()};});
    const payload={user_id:userId,title,description,color,links:parsed};const result=editId?await supabase.from("profile_sections").update(payload).eq("id",editId):await supabase.from("profile_sections").insert(payload);
    if(!result.error){setSectionOpen(false);setTitle("");setDescription("");setLinks("");setEditId(null);load();}};
  const startEdit=(s:Section)=>{setEditId(s.id);setTitle(s.title);setDescription(s.description);setColor(s.color);setLinks((s.links||[]).map(l=>`${l.label}|${l.url}`).join("\n"));setSectionOpen(true);};
  const removeSection=async(id:string)=>{if(confirm("Delete this section?")){await supabase.from("profile_sections").delete().eq("id",id);load();}};
  const toggleFollow=async()=>{await followUser(target,userId,isFollowing);setIsFollowing(!isFollowing);setFollowers(n=>n+(isFollowing?-1:1));};
  if(!profile)return <div className="page">Loading profile...</div>;
  const locked=profile.is_private&&!own&&!isFollowing;
  return <div className="page profile-page">
    <div className="profile-cover" style={{backgroundImage:`linear-gradient(0deg,#08090D 0%,transparent 70%),url(${profile.cover_url||""})`}}>
      {own&&<label className="cover-edit">Change cover<input type="file" accept="image/*" onChange={e=>changeImage(e.target.files?.[0]||null,"cover_url")}/></label>}
      <button className="menu-trigger" onClick={()=>setMenu(!menu)}><MoreHorizontal/></button>
      {menu&&<div className="profile-menu">{own?<><button onClick={()=>setEditing(true)}><Pencil/> Edit profile</button><button onClick={()=>setSectionOpen(true)}><Plus/> Add bio / custom section</button><button><Settings/> Settings</button></>:<><button onClick={()=>navigator.clipboard.writeText(location.href)}><Share2/> Share profile</button><button><Flag/> Report</button><button><Lock/> Block / unblock</button></>}</div>}
    </div>
    <div className="profile-main">
      <div className="profile-top"><div className="avatar-wrap"><img className="avatar xl" src={profile.avatar_url||"/avatar.svg"}/>{own&&<label className="avatar-edit"><Pencil size={14}/><input type="file" accept="image/*" onChange={e=>changeImage(e.target.files?.[0]||null,"avatar_url")}/></label>}</div>
        <div className="profile-actions">{own?<button className="secondary-btn" onClick={()=>setEditing(true)}>Edit profile</button>:<><button className="primary-btn" onClick={toggleFollow}>{isFollowing?"Following":"Follow"}</button><button className="secondary-btn">Message</button></>}</div>
      </div>
      <h1>{profile.display_name}</h1><p className="muted">@{profile.username}</p>
      {profile.identity_line&&<p className="identity">{profile.identity_line}</p>}{profile.bio&&<p className="profile-bio">{profile.bio}</p>}
      <div className="stats"><div><b>{posts.length}</b><small>Posts</small></div><div><b>{followers}</b><small>Followers</small></div><div><b>{following}</b><small>Following</small></div></div>
      {profile.website&&<a className="external-link" href={profile.website.startsWith("http")?profile.website:`https://${profile.website}`} target="_blank" rel="noreferrer">{profile.website}</a>}
    </div>
    {editing&&<div className="modal-backdrop"><form className="modal form-stack" onSubmit={saveProfile}><div className="modal-head"><h2>Edit profile</h2><button type="button" onClick={()=>setEditing(false)}>✕</button></div><label>Display name</label><input value={display} onChange={e=>setDisplay(e.target.value)}/><label>Username</label><input value={username} onChange={e=>setUsername(e.target.value)}/><label>Identity line</label><input value={identity} onChange={e=>setIdentity(e.target.value)} placeholder="Developer • Designer • Creator"/><label>Bio</label><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4}/><label>Website</label><input value={website} onChange={e=>setWebsite(e.target.value)}/><button className="primary-btn" disabled={busy}>{busy?"Saving...":"Save changes"}</button></form></div>}
    {sectionOpen&&<div className="modal-backdrop"><form className="modal form-stack" onSubmit={saveSection}><div className="modal-head"><h2>{editId?"Edit section":"New custom section"}</h2><button type="button" onClick={()=>{setSectionOpen(false);setEditId(null);}}>✕</button></div><label>Section title</label><input required maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} placeholder="My journey"/><label>Description</label><textarea rows={5} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell your story..."/><label>Section accent</label><div className="color-row">{["#F32950","#10263B","#55AAFF","#A78BFA","#22C58B","#F5B942"].map(c=><button type="button" key={c} className={color===c?"swatch selected": "swatch"} style={{background:c}} onClick={()=>setColor(c)}/>) }<input aria-label="Custom hex colour" className="hex-input" value={color} onChange={e=>setColor(e.target.value)} /></div><label>Links (one per line: title | URL)</label><textarea rows={3} value={links} onChange={e=>setLinks(e.target.value)} placeholder={"GitHub | https://github.com/username\nPortfolio | https://example.com"}/><div className="section-preview" style={{borderColor:color}}><b>{title||"Section preview"}</b><p>{description||"Your description will appear here."}</p></div><button className="primary-btn">Save section</button>{editId&&<button type="button" className="danger-btn" onClick={()=>removeSection(editId)}>Delete section</button>}</form></div>}
    {locked?<div className="private-state"><Lock/><h2>This account is private</h2><p>Follow this account to see their posts and profile sections.</p></div>:<>
      <div className="section-list">{sections.map(s=><section className="custom-section" style={{borderLeftColor:s.color}} key={s.id}><div className="section-title"><h2>{s.title}</h2>{own&&<div><button onClick={()=>startEdit(s)}><Pencil size={15}/></button><button onClick={()=>removeSection(s.id)}>×</button></div>}</div><p>{s.description}</p>{(s.links||[]).map((l:any,i:number)=><a className="pin-link" key={i} href={l.url} target="_blank" rel="noreferrer"><MapPin size={14}/>{l.label} ↗</a>)}</section>)}
      {own&&<button className="add-section" onClick={()=>setSectionOpen(true)}><Plus/> Add custom section</button>}
      <h2 className="subheading">Posts & creations</h2><div className="feed-list">{posts.map(p=><PostCard key={p.id} post={p} userId={userId}/>)}</div>
    </div></>}
  </div>;
}