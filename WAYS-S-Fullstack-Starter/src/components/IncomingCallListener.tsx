import { useEffect,useState } from "react";
import { supabase } from "../lib/supabase";
import CallPanel from "./CallPanel";
type Peer={id:string;username:string;display_name:string;avatar_url:string|null};
export default function IncomingCallListener({userId}:{userId:string}){
 const [peer,setPeer]=useState<Peer|null>(null);
 const find=async(callerId:string)=>{const {data}=await supabase.from("profiles").select("id,username,display_name,avatar_url").eq("id",callerId).maybeSingle();if(data)setPeer(data as Peer);};
 useEffect(()=>{let active=true;(async()=>{const {data}=await supabase.from("voice_video_calls").select("caller_id").eq("callee_id",userId).eq("status","ringing").order("created_at",{ascending:false}).limit(1).maybeSingle();if(active&&data)await find(data.caller_id);})();
 const channel=supabase.channel("wayss-global-incoming-"+userId).on("postgres_changes",{event:"INSERT",schema:"public",table:"voice_video_calls",filter:"callee_id=eq."+userId},payload=>{const c=payload.new as any;if(c.status==="ringing")find(c.caller_id);}).on("postgres_changes",{event:"UPDATE",schema:"public",table:"voice_video_calls",filter:"callee_id=eq."+userId},payload=>{const c=payload.new as any;if(["ended","rejected","missed","failed"].includes(c.status))setPeer(null);}).subscribe();
 return()=>{active=false;supabase.removeChannel(channel);};},[userId]);
 return peer?<CallPanel userId={userId} peer={peer} incomingOnly onClose={()=>setPeer(null)}/>:null;
}
