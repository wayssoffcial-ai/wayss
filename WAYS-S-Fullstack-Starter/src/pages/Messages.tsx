import { useCallback,useEffect,useRef,useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Send,ImagePlus,Trash2,Phone,Video,ArrowLeft,CheckCheck,Check,X,MessageCircle } from "lucide-react";
import { uploadChatMedia,signChatMedia } from "../lib/api";
import CallPanel from "../components/CallPanel";

type Person={id:string;username:string;display_name:string;avatar_url:string|null};
type Message={id:string;sender_id:string;receiver_id:string;body:string|null;media_url?:string|null;message_type?:string;read_at?:string|null;created_at:string};
type RequestRow={id:string;sender_id:string;receiver_id:string;initial_message:string|null;status:string;created_at:string};
export default function Messages({userId}:{userId:string}) {
 const [params]=useSearchParams();
 const [people,setPeople]=useState<Person[]>([]);const [selected,setSelected]=useState<Person|null>(null);
 const [composePerson,setComposePerson]=useState<Person|null>(null);const [firstMessage,setFirstMessage]=useState("");
 const [requests,setRequests]=useState<{request:RequestRow;person:Person}[]>([]);const [activeRequest,setActiveRequest]=useState<{request:RequestRow;person:Person}|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);const [body,setBody]=useState("");const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [callType,setCallType]=useState<"voice"|"video"|null>(null);
 const [inboxTab,setInboxTab]=useState<"general"|"requests">(params.get("tab")==="requests"?"requests":"general");const file=useRef<HTMLInputElement>(null);
 const loadPeople=useCallback(async()=>{
  const {data:r}=await supabase.from("message_requests").select("sender_id,receiver_id").eq("status","accepted").or("sender_id.eq."+userId+",receiver_id.eq."+userId);
  const ids=[...new Set((r||[]).map(x=>x.sender_id===userId?x.receiver_id:x.sender_id))];
  const {data}=ids.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[] as any[]};
  setPeople((data||[]) as Person[]);
 },[userId]);
 const loadRequests=useCallback(async()=>{
  const {data:r,error}=await supabase.from("message_requests").select("id,sender_id,receiver_id,initial_message,status,created_at").eq("receiver_id",userId).eq("status","pending").order("created_at",{ascending:false});
  if(error){setError(error.message);return;}
  const ids=[...new Set((r||[]).map(x=>x.sender_id))];
  const {data:p}=ids.length?await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id",ids):{data:[] as any[]};
  const byId=new Map((p||[]).map((x:any)=>[x.id,x]));
  setRequests((r||[]).flatMap((request:any)=>{const person=byId.get(request.sender_id) as Person|undefined;return person?[{request,person}]:[];}));
 },[userId]);
 const resolveMedia=async(rows:Message[])=>Promise.all(rows.map(async m=>{if(!m.media_url)return m;try{return {...m,media_url:await signChatMedia(m.media_url)};}catch{return {...m,media_url:null};}}));
 const load=useCallback(async(person:Person)=>{
  setError("");setSelected(person);setActiveRequest(null);setComposePerson(null);
  const {data,error}=await supabase.from("messages").select("*").or("and(sender_id.eq."+userId+",receiver_id.eq."+person.id+"),and(sender_id.eq."+person.id+",receiver_id.eq."+userId+")").order("created_at");
  if(error){setError(error.message);return;}
  setMessages(await resolveMedia((data||[]) as Message[]));
  const unread=(data||[]).filter(m=>m.receiver_id===userId&&!m.read_at).map(m=>m.id);
  if(unread.length)await supabase.from("messages").update({read_at:new Date().toISOString()}).in("id",unread);
 },[userId]);
 const reviewRequest=async(item:{request:RequestRow;person:Person},accept:boolean)=>{
  setBusy(true);const {error}=await supabase.from("message_requests").update({status:accept?"accepted":"declined"}).eq("id",item.request.id).eq("receiver_id",userId).eq("status","pending");
  setBusy(false);if(error){setError(error.message);return;}
  setActiveRequest(null);await loadRequests();
  if(accept){await loadPeople();await load(item.person);setNotice("Request accepted. You can now chat and call.");}
  else setNotice("Message request declined.");
 };
 const sendFirst=async()=>{
  if(!composePerson||!firstMessage.trim()||busy)return;
  setBusy(true);setError("");
  const {data:existing,error:lookupError}=await supabase.from("message_requests").select("id,status").or("and(sender_id.eq."+userId+",receiver_id.eq."+composePerson.id+"),and(sender_id.eq."+composePerson.id+",receiver_id.eq."+userId+")").maybeSingle();
  if(lookupError){setError(lookupError.message);setBusy(false);return;}
  if(existing?.status==="accepted"){setBusy(false);await load(composePerson);return;}
  if(existing?.status==="pending"){setError("A message request is already waiting for this person.");setBusy(false);return;}
  if(existing?.status==="declined"){setError("This person previously declined the request. You cannot send another request right now.");setBusy(false);return;}
  const {error}=await supabase.from("message_requests").insert({sender_id:userId,receiver_id:composePerson.id,status:"pending",initial_message:firstMessage.trim()});
  setBusy(false);if(error){setError(error.message);return;}
  setFirstMessage("");setComposePerson(null);setInboxTab("general");setNotice("Your first message was sent as a request. You can send more after they accept.");
 };
 const send=async(media?:File)=>{
  if((!body.trim()&&!media)||!selected||busy)return;setBusy(true);setError("");
  try{let media_url:string|null=null;if(media){if(!media.type.startsWith("image/"))throw new Error("Only images can be shared in chat.");media_url=await uploadChatMedia(media,userId,selected.id);}
   const {error}=await supabase.from("messages").insert({sender_id:userId,receiver_id:selected.id,body:body.trim()||" ",media_url,message_type:media?"image":"text"});
   if(error)throw error;setBody("");if(file.current)file.current.value="";
  }catch(e){setError(e instanceof Error?e.message:"Message could not be sent.");}finally{setBusy(false);}
 };
 const deleteConversation=async()=>{
  if(!selected||!confirm("Delete this conversation from your inbox?"))return;
  const sent=messages.filter(m=>m.sender_id===userId).map(m=>m.id);const received=messages.filter(m=>m.sender_id!==userId).map(m=>m.id);let err:any=null;
  if(sent.length){const r=await supabase.from("messages").update({deleted_for_sender:true}).in("id",sent);err=r.error;}
  if(!err&&received.length){const r=await supabase.from("messages").update({deleted_for_receiver:true}).in("id",received);err=r.error;}
  if(err)setError(err.message);else{setSelected(null);setMessages([]);await loadPeople();}
 };
 useEffect(()=>{loadPeople();loadRequests();const ch=supabase.channel("message-inbox-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>loadPeople()).on("postgres_changes",{event:"*",schema:"public",table:"message_requests",filter:"receiver_id=eq."+userId},()=>{loadRequests();loadPeople();}).subscribe();return()=>{supabase.removeChannel(ch);};},[userId,loadPeople,loadRequests]);
 useEffect(()=>{if(!selected)return;const ch=supabase.channel("chat-"+selected.id+"-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"messages"},payload=>{
  const m=(payload.new||payload.old) as Message;if(!m||!((m.sender_id===userId&&m.receiver_id===selected.id)||(m.sender_id===selected.id&&m.receiver_id===userId)))return;
  if(payload.eventType==="INSERT")resolveMedia([m]).then(([signed])=>setMessages(s=>s.some(x=>x.id===m.id)?s:[...s,signed]));
  else if(payload.eventType==="UPDATE")setMessages(s=>s.map(x=>x.id===m.id?m:x));else if(payload.eventType==="DELETE")setMessages(s=>s.filter(x=>x.id!==m.id));
 }).subscribe();return()=>{supabase.removeChannel(ch);};},[selected,userId]);
 useEffect(()=>{const to=params.get("to");if(!to)return;let active=true;(async()=>{const {data}=await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id",to).maybeSingle();if(!active||!data)return;const person=data as Person;const {data:r}=await supabase.from("message_requests").select("status").or("and(sender_id.eq."+userId+",receiver_id.eq."+to+"),and(sender_id.eq."+to+",receiver_id.eq."+userId+")").maybeSingle();if(r?.status==="accepted")await load(person);else setComposePerson(person);})();return()=>{active=false;};},[params,userId,load]);
 const back=()=>{setSelected(null);setComposePerson(null);setActiveRequest(null);setMessages([]);};
 return <div className="page messages-page messages-fullscreen">
  <div className="messages-heading"><button className="chat-back" onClick={back} aria-label="Back"><ArrowLeft/></button><div><span className="eyebrow">WAYS S PRIVATE SPACE</span><h1>Msgs</h1></div></div>
  {notice&&<div className="message-notice"><Check size={15}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  {composePerson?<section className="message-request-compose"><div className="request-person-head"><img className="avatar xl" src={composePerson.avatar_url||"/avatar.svg"}/><div><h2>{composePerson.display_name||composePerson.username}</h2><small>@{composePerson.username}</small></div></div><div className="request-explainer"><MessageCircle/><div><b>Send a message request</b><p>Your first message will be delivered as a request. You can send more messages or call only after they accept.</p></div></div><textarea value={firstMessage} onChange={e=>setFirstMessage(e.target.value)} maxLength={1000} rows={5} placeholder="Write your first message..."/><div className="request-compose-footer"><small>{firstMessage.length}/1000</small><button className="primary-btn" disabled={busy||!firstMessage.trim()} onClick={sendFirst}>{busy?"Sending…":"Send request"} <Send size={16}/></button></div></section>
  :activeRequest?<section className="message-request-detail"><button className="secondary-btn" onClick={()=>setActiveRequest(null)}><ArrowLeft size={15}/> Requests</button><div className="request-person-head"><img className="avatar xl" src={activeRequest.person.avatar_url||"/avatar.svg"}/><div><h2>{activeRequest.person.display_name||activeRequest.person.username}</h2><small>@{activeRequest.person.username}</small></div></div><span className="eyebrow">MESSAGE REQUEST</span><div className="request-preview-bubble">{activeRequest.request.initial_message||"This person wants to start a conversation."}</div><p className="muted">Accept to move this conversation to General. Once accepted, both of you can message and start voice or video calls.</p><div className="request-decision"><button className="secondary-btn" disabled={busy} onClick={()=>reviewRequest(activeRequest,false)}>Decline</button><button className="primary-btn" disabled={busy} onClick={()=>reviewRequest(activeRequest,true)}>Accept and open chat</button></div></section>
  :<><div className="inbox-tabs"><button className={inboxTab==="general"?"active":""} onClick={()=>setInboxTab("general")}>General</button><button className={inboxTab==="requests"?"active":""} onClick={()=>setInboxTab("requests")}>Requests {requests.length>0&&<i>{requests.length}</i>}</button></div><div className="messages-layout"><aside className={selected?"mobile-hidden":""}>{inboxTab==="requests"?requests.map(item=><button className="person-row request-row request-card" key={item.request.id} onClick={()=>setActiveRequest(item)}><img className="avatar sm" src={item.person.avatar_url||"/avatar.svg"}/><span><b>{item.person.display_name||item.person.username}</b><small>@{item.person.username}</small><em>{item.request.initial_message||"Message request"}</em></span><strong>View</strong></button>):people.map(p=><button className={selected?.id===p.id?"person-row selected":"person-row"} key={p.id} onClick={()=>load(p)}><img className="avatar sm" src={p.avatar_url||"/avatar.svg"}/><span><b>{p.display_name||p.username}</b><small>@{p.username}</small></span></button>)}{(inboxTab==="requests"?requests.length:people.length)===0&&<div className="empty-state">{inboxTab==="requests"?"No message requests yet.":"Accepted conversations will appear here."}</div>}</aside>
  <div className={"chat-panel "+(!selected?"mobile-hidden":"")}>{selected?<><div className="chat-title"><button className="chat-back" onClick={()=>setSelected(null)}><ArrowLeft/></button><img className="avatar sm" src={selected.avatar_url||"/avatar.svg"}/><span><b>{selected.display_name||selected.username}</b><small>@{selected.username}</small></span><div className="chat-title-actions"><button title="Voice call" onClick={()=>setCallType("voice")}><Phone/></button><button title="Video call" onClick={()=>setCallType("video")}><Video/></button><button title="Delete conversation" onClick={deleteConversation}><Trash2/></button></div></div><div className="chat-messages">{messages.map(m=><div key={m.id} className={m.sender_id===userId?"bubble mine":"bubble"}>{m.media_url&&<img className="chat-image" src={m.media_url}/ >}{m.body&&m.body!==" "&&<span>{m.body}</span>}{m.sender_id===userId&&<small className="message-status">{m.read_at?<><CheckCheck size={12}/> Seen</>:"Sent"}</small>}</div>)}</div><div className="chat-compose"><button className="chat-attach" onClick={()=>file.current?.click()} title="Share image"><ImagePlus/></button><input ref={file} hidden type="file" accept="image/*" onChange={e=>send(e.target.files?.[0])}/><input value={body} onChange={e=>setBody(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Write a message..."/><button disabled={busy||!body.trim()} onClick={()=>send()}><Send/></button></div></>:<div className="empty-state">Choose an accepted conversation to begin.</div>}</div></div></>}
  {callType&&selected&&<CallPanel userId={userId} peer={selected} onClose={()=>setCallType(null)}/>}
 </div>;
}
