import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uploadMedia } from "../lib/api";

export default function Create({userId}:{userId:string}) {
  const [params]=useSearchParams(); const [type,setType]=useState(params.get("type")||"post");
  const [caption,setCaption]=useState(""); const [file,setFile]=useState<File|null>(null); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const nav=useNavigate();
  const submit=async(e:FormEvent)=>{e.preventDefault();setError("");setBusy(true);try{
    let media_url:string|null=null; if(file) media_url=await uploadMedia(file,"posts");
    const media_type=file?.type.startsWith("video/")?"video":"image";
    const {error}=await supabase.from("posts").insert({user_id:userId,caption:caption.trim(),media_url,media_type,post_type:type});
    if(error)throw error; nav("/");
  }catch(err){setError(err instanceof Error?err.message:"Upload failed");}setBusy(false);};
  return <div className="page narrow"><span className="eyebrow">SHARE A MOMENT</span><h1>Create</h1><form className="panel form-stack" onSubmit={submit}>
    <label>Content type</label><div className="segmented">{["post","image","flux"].map(t=><button type="button" className={type===t?"selected":""} onClick={()=>setType(t)} key={t}>{t==="flux"?"Flux":t==="image"?"Images":"Post"}</button>)}</div>
    <label>Media</label><input type="file" accept={type==="flux"?"video/*":"image/*,video/*"} onChange={e=>setFile(e.target.files?.[0]||null)}/>
    {file&&<p className="muted">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p>}
    <label>Caption</label><textarea rows={4} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="What's happening in your orbit?"/>
    {error&&<p className="error">{error}</p>}<button className="primary-btn" disabled={busy}>{busy?"Uploading...":"Share"}</button>
  </form></div>;
}