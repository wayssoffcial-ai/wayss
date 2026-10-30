import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { supabase, isConfigured } from "./lib/supabase";
import { ensureProfile } from "./lib/api";
import QuickCenter from "./components/QuickCenter";
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
 const [session,setSession]=useState<any>(null);const [ready,setReady]=useState(false);const [configError,setConfigError]=useState(false);
 useEffect(()=>{if(!isConfigured){setConfigError(true);setReady(true);return;}
  supabase.auth.getSession().then(async({data})=>{setSession(data.session);if(data.session?.user){try{await ensureProfile(data.session.user);}catch(e){console.error(e);}}setReady(true);});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);});
  return()=>subscription.unsubscribe();
 },[]);
 if(!ready)return <div className="loading-screen"><div className="brand-mark">WAYS<span>S</span></div><p>Entering your orbit...</p></div>;
 if(configError)return <div className="setup-screen"><div className="brand-mark">WAYS<span>S</span></div><h1>Connect your backend</h1><p>Add your Supabase project URL and anon key to <code>.env</code>. Follow the setup guide in README.md, then restart the dev server.</p><code>VITE_SUPABASE_URL<br/>VITE_SUPABASE_ANON_KEY</code></div>;
 useEffect(()=>{let active=true;if(session?.user?.id){supabase.from("profiles").select("account_status").eq("id",session.user.id).maybeSingle().then(async({data})=>{if(active&&data?.account_status==="suspended"){await supabase.auth.signOut();setSession(null);}});}return()=>{active=false;};},[session?.user?.id]);
 if(!session)return <Auth/>;
 return <div className="app-shell"><header className="topbar"><Link to="/" className="wordmark">WAYS<span>S</span></Link><div className="top-actions"><Link to="/orbit">Discover</Link><Link to="/notifications" className="notification-nav" aria-label="Notifications"><Bell size={19}/><span>Notifications</span></Link></div></header>
  <Routes>
   <Route path="/" element={<Home userId={session.user.id}/>}/>
   <Route path="/orbit" element={<Orbit userId={session.user.id}/>}/>
   <Route path="/create" element={<Create userId={session.user.id}/>}/>
   <Route path="/profile" element={<Profile userId={session.user.id}/>}/>
   <Route path="/profile/:id" element={<Profile userId={session.user.id}/>}/>
   <Route path="/messages" element={<Messages userId={session.user.id}/>}/>
   <Route path="/settings" element={<Settings userId={session.user.id}/>}/>
   <Route path="/notifications" element={<Notifications userId={session.user.id}/>}/>
   <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes><IncomingCallListener userId={session.user.id}/><QuickCenter/>
 </div>;
}