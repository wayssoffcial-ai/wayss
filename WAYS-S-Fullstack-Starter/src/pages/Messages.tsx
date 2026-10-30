import { useCallback,useEffect,useRef,useState } from "react";
import { supabase } from "../lib/supabase";
import { Send,ImagePlus,Trash2,Phone,Video,ArrowLeft,CheckCheck } from "lucide-react";
import { uploadMedia } from "../lib/api";
import CallPanel from "../components/CallPanel";

type Person={id:string;username:string;display_name:string;avatar_url:string|null};
type Message={id:string;sender_id:string;receiver_id:string;body:string|null;media_url?:string|null;message_type?:string;read_at?:string|null;created_at:string};
export default function Messages({userId}:{userId:string}) {
 const [people,setPeople]=useState<Person[]>([]);const [selected,setSelected]=useState<Person|null>(null);const [messages,setMessages]=useState<Message[]>([]);const [body,setBody]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [notice,setNotice]=useState("");const [callType,setCallType]=useState<"voice"|"video"|null>(null);const file=useRef<HTMLInputElement>(null);
 const loadPeople=useCallback(async()=>{
  const {data}=await supabase.from("messages").select("sender_id,receiver_id").or("sender_id.eq."+userId+",receiver_id.eq."+userId).order("created_at",{ascending:false});
  const ids=[...new Set((data||[]).map(m=>m.sender_id===userId?m.receiver_id:m.sender_id))];
  const {data:f}=await supabase.from("follows").select("following:profiles!follows_following_id_fkey(id,username,display_name,avatar_url)").eq("follower_id",userId);
  const followed=(f||[]).map((x:any)=>x.following).filter(Boolean);
  const {data:profiles}=ids.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[] as any[]};
  const merged=new Map<string,Person>();[...(profiles||[]),...followed].forEach((p:any)=>{if(p?.id&&p.id!==userId)merged.set(p.id,p);});setPeople([...merged.values()]);
 },[userId]);
 const load=useCallback(async(person:Person)=>{
  setSelected(person);const {data,error}=await supabase.from("messages").select("*").or("and(sender_id.eq."+userId+",receiver_id.eq."+person.id+"),and(sender_id.eq."+person.id+",receiver_id.eq."+userId+")").order("created_at");
  if(error){setError(error.message);return;}setMessages((data||[]) as Message[]);
  const unread=(data||[]).filter(m=>m.receiver_id===userId&&!m.read_at).map(m=>m.id);
  if(unread.length)await supabase.from("messages").update({read_at:new Date().toISOString()}).in("id",unread);
 },[userId]);
 useEffect(()=>{loadPeople();const ch=supabase.channel("message-inbox-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>loadPeople()).subscribe();return()=>{supabase.removeChannel(ch);};},[userId,loadPeople]);
 useEffect(()=>{if(!selected)return;const ch=supabase.channel("chat-"+selected.id+"-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"messages"},payload=>{
  const m=(payload.new||payload.old) as Message;if(!m||!((m.sender_id===userId&&m.receiver_id===selected.id)||(m.sender_id===selected.id&&m.receiver_id===userId)))return;
  if(payload.eventType==="INSERT")setMessages(s=>s.some(x=>x.id===m.id)?s:[...s,m]);
  else if(payload.eventType==="UPDATE")setMessages(s=>s.map(x=>x.id===m.id?m:x));
  else if(payload.eventType==="DELETE")setMessages(s=>s.filter(x=>x.id!==m.id));
 }).subscribe();return()=>{supabase.removeChannel(ch);};},[selected,userId]);
 const send=async(media?:File)=>{if((!body.trim()&&!media)||!selected||busy)return;setBusy(true);setError("");try{
  let media_url:string|null=null;if(media)media_url=await uploadMedia(media,"posts");
  const {error}=await supabase.from("messages").insert({sender_id:userId,receiver_id:selected.id,body:body.trim()||" ",media_url,message_type:media?"image":"text"});
  if(error)throw error;setBody("");if(file.current)file.current.value="";
 }catch(e){setError(e instanceof Error?e.message:"Message could not be sent.");}finally{setBusy(false);}};
 const deleteConversation=async()=>{if(!selected||!confirm("Delete this conversation from your inbox?"))return;const ids=messages.map(m=>m.id);if(!ids.length){setSelected(null);return;}const {error}=await supabase.from("messages").update({deleted_for_sender:true,deleted_for_receiver:true}).in("id",ids);if(error)setError(error.message);else{setSelected(null);setMessages([]);await loadPeople();}};
 return <div className="page messages-page"><span className="eyebrow">PRIVATE CONVERSATIONS</span><h1>Msgs</h1><div className="messages-layout"><aside className={selected?"mobile-hidden":""}>{people.map(p=><button className={selected?.id===p.id?"person-row selected":"person-row"} key={p.id} onClick={()=>load(p)}><img className="avatar sm" src={p.avatar_url||"/avatar.svg"}/><b>{p.display_name||p.username}</b><small>@{p.username}</small></button>)}{people.length===0&&<p className="muted">Follow someone or open a conversation from their profile to start chatting.</p>}</aside><div className={"chat-panel "+(!selected?"mobile-hidden":"")}>{selected?<><div className="chat-title"><button className="chat-back" onClick={()=>setSelected(null)}><ArrowLeft/></button><img className="avatar sm" src={selected.avatar_url||"/avatar.svg"}/><span><b>{selected.display_name||selected.username}</b><small>@{selected.username}</small></span><div className="chat-title-actions"><button title="Voice call" onClick={()=>setCallType("voice")}><Phone/></button><button title="Video call" onClick={()=>setCallType("video")}><Video/></button><button title="Delete conversation" onClick={deleteConversation}><Trash2/></button></div></div>
 <div className="chat-messages">{messages.map(m=><div key={m.id} className={m.sender_id===userId?"bubble mine":"bubble"}>{m.media_url&&<img className="chat-image" src={m.media_url}/ >}{m.body&&m.body!==" "&&<span>{m.body}</span>}{m.sender_id===userId&&<small className="message-status">{m.read_at?<><CheckCheck size={12}/> Seen</>:"Sent"}</small>}</div>)}</div>
 <div className="chat-compose"><button className="chat-attach" onClick={()=>file.current?.click()} title="Share image"><ImagePlus/></button><input ref={file} hidden type="file" accept="image/*" onChange={e=>send(e.target.files?.[0])}/><input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Write a message..."/><button disabled={busy||!body.trim()} onClick={()=>send()}><Send/></button></div>
 </>:<div className="empty-state">Choose a conversation to begin.</div>}</div></div>{callType&&selected&&<CallPanel userId={userId} peer={selected} onClose={()=>setCallType(null)}/ >}{error&&<p className="form-error">{error}</p>}{notice&&<p className="muted">{notice}</p>}</div>;
}
