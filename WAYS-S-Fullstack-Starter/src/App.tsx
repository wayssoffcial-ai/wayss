import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { supabase, isConfigured } from "./lib/supabase";
import { ensureProfile } from "./lib/api";
import QuickCenter from "./components/QuickCenter";
import HelpCenter from "./pages/HelpCenter";
import IncomingCallListener from "./components/IncomingCallListener";
import Auth from "./pages/Auth";
import Home from "./pages/Home";
import Orbit from "./pages/Orbit";
import Create from "./pages/Create";
import Profile from "./pages/Profile";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import { Bell } from "lucide-react";

export default function App() {
 const [session,setSession]=useState<any>(null);const [ready,setReady]=useState(false);const [welcome,setWelcome]=useState(true);const [configError,setConfigError]=useState(false);const [unread,setUnread]=useState(0);
 useEffect(()=>{const timer=window.setTimeout(()=>setWelcome(false),1800);return()=>window.clearTimeout(timer);},[]);
 useEffect(()=>{if(!isConfigured){setConfigError(true);setReady(true);return;}
  supabase.auth.getSession().then(async({data})=>{setSession(data.session);if(data.session?.user){try{await ensureProfile(data.session.user);}catch(e){console.error(e);}}setReady(true);});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);});
  return()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{if(!session?.user?.id){setUnread(0);return;}const uid=session.user.id;const loadUnread=async()=>{const {count}=await supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",uid).eq("is_read",false);setUnread(count||0);};loadUnread();const channel=supabase.channel("app-unread-"+uid).on("postgres_changes",{event:"INSERT",schema:"public",table:"notifications",filter:"user_id=eq."+uid},()=>loadUnread()).subscribe();return()=>{supabase.removeChannel(channel);};},[session?.user?.id]);
 useEffect(()=>{let active=true;if(session?.user?.id){supabase.from("profiles").select("account_status").eq("id",session.user.id).maybeSingle().then(async({data})=>{if(active&&data?.account_status==="suspended"){await supabase.auth.signOut();setSession(null);}});}return()=>{active=false;};},[session?.user?.id]);
 if(welcome)return <div className="wayss-welcome" role="status" aria-label="Welcome to WAYSS"><div className="welcome-orbit"><span className="welcome-ring welcome-ring-a"/><span className="welcome-ring welcome-ring-b"/><span className="welcome-logo">W<span>S</span></span><i className="welcome-star star-a"/><i className="welcome-star star-b"/><i className="welcome-star star-c"/></div><div className="welcome-wordmark">WAYS<span>S</span></div><p>WELCOME TO YOUR ORBIT</p></div>;
 if(!ready)return <div className="loading-screen"><div className="brand-mark">WAYS<span>S</span></div><p>Entering your orbit...</p></div>;
 if(configError)return <div className="setup-screen"><div className="brand-mark">WAYS<span>S</span></div><h1>Connect your backend</h1><p>Add your Supabase project URL and anon key to <code>.env</code>. Follow the setup guide in README.md, then restart the dev server.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code></div>;
 if(!session)return <Auth/>;
 return <div className="app-shell"><header className="topbar"><Link to="/" className="wordmark">WAYS<span>S</span></Link><div className="top-actions"><Link to="/notifications" className="notification-nav" aria-label="Notifications"><Bell size={19}/><span>Notifications</span>{unread>0&&<i className="nav-unread-count">{unread>99?"99+":unread}</i>}</Link></div></header>
  <Routes>
   <Route path="/" element={<Home userId={session.user.id}/>}/>
   <Route path="/orbit" element={<Orbit userId={session.user.id}/>}/>
   <Route path="/create" element={<Create userId={session.user.id}/>}/>
   <Route path="/profile" element={<Profile userId={session.user.id}/>}/>
   <Route path="/profile/:id" element={<Profile userId={session.user.id}/>}/>
   <Route path="/messages" element={<Messages userId={session.user.id}/>}/>
   <Route path="/settings" element={<Settings userId={session.user.id}/>}/>
   <Route path="/help" element={<HelpCenter userId={session.user.id}/>}/>
   <Route path="/notifications" element={<Notifications userId={session.user.id}/>}/>
   <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes><IncomingCallListener userId={session.user.id}/><QuickCenter/>
 </div>;
}