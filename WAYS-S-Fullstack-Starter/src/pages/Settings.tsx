import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Lock, Globe, LogOut } from "lucide-react";
export default function Settings({userId}:{userId:string}) {
 const [privateAccount,setPrivateAccount]=useState(false);const [busy,setBusy]=useState(false);
 useEffect(()=>{supabase.from("profiles").select("is_private").eq("id",userId).single().then(({data})=>setPrivateAccount(!!data?.is_private));},[userId]);
 const toggle=async()=>{setBusy(true);const next=!privateAccount;const {error}=await supabase.from("profiles").update({is_private:next}).eq("id",userId);if(!error)setPrivateAccount(next);setBusy(false);};
 return <div className="page narrow"><span className="eyebrow">MAKE IT YOURS</span><h1>Settings</h1><div className="panel settings-row"><div><h3>Account privacy</h3><p className="muted">{privateAccount?"Only approved followers can see your private content.":"Anyone can view your public profile."}</p><small className="muted">{privateAccount?<><Lock size={14}/> Private account</>:<><Globe size={14}/> Public account</>}</small></div><button className={privateAccount?"secondary-btn":"primary-btn"} disabled={busy} onClick={toggle}>{privateAccount?"Make public":"Make private"}</button></div><button className="danger-btn logout-btn" onClick={()=>supabase.auth.signOut()}><LogOut/> Sign out</button></div>;
}