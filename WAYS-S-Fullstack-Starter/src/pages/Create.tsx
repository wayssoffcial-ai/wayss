import { FormEvent, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uploadMedia } from "../lib/api";
import { ImagePlus, Video, X, UploadCloud, Settings as SettingsIcon, ArrowLeft } from "lucide-react";

export default function Create({userId}:{userId:string}) {
  const [params]=useSearchParams();
  const [type,setType]=useState(params.get("type")==="image"?"image":params.get("type")==="flux"?"flux":"post");
  const [caption,setCaption]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);
  const nav=useNavigate();
  const accept=type==="flux"?"video/*":"image/*,video/*";
  const chooseFile=(next:File|null)=>{
    setError("");
    if(!next){setFile(null);setPreview("");return;}
    const isVideo=next.type.startsWith("video/");
    if(type==="flux"&&!isVideo){setError("Flux ke liye video select karo.");return;}
    if(type!=="flux"&&!next.type.startsWith("image/")&&!isVideo){setError("Sirf image ya video file select kar sakte ho.");return;}
    if(next.size>50*1024*1024){setError("File 50 MB se chhoti honi chahiye.");return;}
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };
  const submit=async(e:FormEvent)=>{
    e.preventDefault();setError("");
    if(!file){setError(type==="flux"?"Flux video choose karo.":"Share karne se pehle media choose karo.");return;}
    setBusy(true);
    try{
      const media_url=await uploadMedia(file,"posts");
      const media_type=file.type.startsWith("video/")?"video":"image";
      const {error}=await supabase.from("posts").insert({user_id:userId,caption:caption.trim(),media_url,media_type,post_type:type});
      if(error)throw error;
      nav("/");
    }catch(err){setError(err instanceof Error?err.message:"Upload failed. Please try again.");}
    finally{setBusy(false);}
  };
  return <div className="page narrow create-page">
    <div className="create-page-top"><Link to="/" className="create-back"><ArrowLeft size={17}/> Back</Link><Link to="/settings" className="create-settings" aria-label="Open settings"><SettingsIcon size={18}/><span>Settings</span></Link></div>
    <span className="eyebrow">SHARE A MOMENT</span><h1>Create</h1>
    <form className="panel form-stack create-form" onSubmit={submit}>
      <label>Content type</label>
      <div className="segmented create-type-tabs">{["post","image","flux"].map(t=><button type="button" className={type===t?"selected":""} onClick={()=>{setType(t);setError("");if(t==="flux"&&file&&!file.type.startsWith("video/"))chooseFile(null);}} key={t}>{t==="flux"?"Flux":t==="image"?"Images":"Post"}</button>)}</div>
      <div className="create-media-heading"><label>Media</label><small>{type==="flux"?"Video · up to 50 MB":"Images or videos · up to 50 MB"}</small></div>
      <input ref={inputRef} className="create-file-input" type="file" accept={accept} onChange={e=>{chooseFile(e.target.files?.[0]||null);e.currentTarget.value="";}}/>
      {!file?<button type="button" className="media-dropzone" onClick={()=>inputRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("drag-active");}} onDragLeave={e=>e.currentTarget.classList.remove("drag-active")} onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove("drag-active");chooseFile(e.dataTransfer.files?.[0]||null);}}>
        <span className="media-drop-icon"><UploadCloud size={27}/></span><b>Choose a file to upload</b><span>Drag & drop here, or <em>browse files</em></span><small>{type==="flux"?"MP4, MOV and other video formats":"JPG, PNG, WEBP, MP4 and MOV"}</small>
      </button>:<div className="create-file-preview">
        {file.type.startsWith("video/")?<video src={preview} controls/>:<img src={preview} alt="Selected media preview"/>}
        <div className="create-file-details"><span className="create-file-kind">{file.type.startsWith("video/")?<Video size={15}/>:<ImagePlus size={15}/>} {file.type.startsWith("video/")?"Video":"Image"}</span><b title={file.name}>{file.name}</b><small>{(file.size/1024/1024).toFixed(1)} MB · Ready to share</small></div>
        <button type="button" className="remove-media" aria-label="Remove selected media" onClick={()=>{chooseFile(null);if(inputRef.current)inputRef.current.value="";}}><X size={17}/></button>
      </div>}
      <label htmlFor="create-caption">Caption</label><textarea id="create-caption" rows={4} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="What's happening in your orbit?"/>
      {error&&<p className="error create-error" role="alert">{error}</p>}
      <button className="primary-btn create-share-btn" disabled={busy}>{busy?"Uploading...":"Share"}</button>
    </form>
  </div>;
}