import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Lock, Globe, LogOut, ShieldCheck, ChevronRight } from "lucide-react";
export default function Settings({userId}:{userId:string}) {
 const [privateAccount,setPrivateAccount]=useState(false);const [busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;supabase.from("profiles").select("is_private").eq("id",userId).single().then(({data})=>{if(active)setPrivateAccount(!!data?.is_private);});return()=>{active=false;};},[userId]);
 const toggle=async()=>{setBusy(true);const next=!privateAccount;const {error}=await supabase.from("profiles").update({is_private:next}).eq("id",userId);if(!error)setPrivateAccount(next);setBusy(false);};
 return <div className="page narrow settings-page"><span className="eyebrow">MAKE IT YOURS</span><h1>Settings</h1>
  <div className="settings-group"><div className="settings-group-title"><ShieldCheck size={16}/> Privacy & security</div><div className="panel settings-row"><div className="settings-row-copy"><h3>Account privacy</h3><p className="muted">{privateAccount?"Only approved followers can see your private content.":"Anyone can view your public profile."}</p><small className="muted">{privateAccount?<><Lock size={14}/> Private account</>:<><Globe size={14}/> Public account</>}</small></div><button className={privateAccount?"secondary-btn":"primary-btn"} disabled={busy} onClick={toggle}>{busy?"Saving...":privateAccount?"Make public":"Make private"}</button></div></div>
  <div className="settings-group"><div className="settings-group-title"><LogOut size={16}/> Session</div><button className="panel settings-signout" onClick={()=>supabase.auth.signOut()}><span><b>Sign out</b><small>Sign out of this WAYS S account</small></span><ChevronRight size={18}/></button></div>
 </div>;
}