import { useEffect,useState } from "react";
import { Check, X, UserRound, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
type RequestRow={id:string;requester_id:string;requester:{id:string;username:string;display_name:string;avatar_url:string|null}};
export default function FollowRequests({userId,onClose}:{userId:string;onClose:()=>void}){
 const [rows,setRows]=useState<RequestRow[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [busy,setBusy]=useState("");
 const nav=useNavigate();
 const load=async()=>{const {data,error}=await supabase.from("follow_requests").select("id,requester_id,requester:profiles!follow_requests_requester_id_fkey(id,username,display_name,avatar_url)").eq("requested_id",userId).eq("status","pending").order("created_at",{ascending:false});if(error)setError(error.message);else setRows((data||[]) as unknown as RequestRow[]);setLoading(false);};
 useEffect(()=>{load();const ch=supabase.channel("follow-requests-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"follow_requests",filter:"requested_id=eq."+userId},load).subscribe();return()=>{supabase.removeChannel(ch);};},[userId]);
 const act=async(row:RequestRow,accept:boolean)=>{setBusy(row.id);setError("");if(accept){const {error}=await supabase.from("follows").insert({follower_id:row.requester_id,following_id:userId});if(error){setError(error.message);setBusy("");return;}}
 const {error}=await supabase.from("follow_requests").update({status:accept?"accepted":"declined",updated_at:new Date().toISOString()}).eq("id",row.id);if(error)setError(error.message);else await load();setBusy("");};
 return <div className="modal-backdrop follow-list-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal follow-list-modal" role="dialog" aria-modal="true"><header className="modal-head"><div><span className="eyebrow">PRIVATE ACCOUNT</span><h2>Follow requests</h2></div><button onClick={onClose} aria-label="Close"><X/></button></header>
 {loading?<p className="muted">Loading requests…</p>:rows.length===0?<div className="empty-state"><Inbox/><p>No pending requests.</p></div>:<div className="follow-list-items">{rows.map(row=><div className="follow-list-person" key={row.id}><img src={row.requester.avatar_url||"/avatar.svg"}/><button className="follow-list-copy" onClick={()=>{onClose();nav("/profile/"+row.requester.id);}}><b>@{row.requester.username}</b><small>{row.requester.display_name}</small></button><button className="primary-btn compact" disabled={!!busy} onClick={()=>act(row,true)}><Check size={14}/> Accept</button><button className="secondary-btn compact" disabled={!!busy} onClick={()=>act(row,false)}><X size={14}/> Decline</button></div>)}</div>}
 {error&&<p className="form-error">{error}</p>}</section></div>;
}
