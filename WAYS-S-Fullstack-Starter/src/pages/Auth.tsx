import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { ensureProfile } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { Orbit, CheckCircle2, XCircle } from "lucide-react";

export default function Auth() {
 const [mode,setMode]=useState<"login"|"signup"|"forgot"|"reset">("login");
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [username,setUsername]=useState("");
 const [availability,setAvailability]=useState<"idle"|"checking"|"available"|"taken"|"invalid">("idle");
 const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [busy,setBusy]=useState(false);
 const nav=useNavigate();
 useEffect(()=>{
  if(mode!=="signup"){setAvailability("idle");return;}
  const value=username.trim().replace(/^@/,"").toLowerCase();
  if(!/^[a-z0-9_]{3,30}$/.test(value)){setAvailability(value?"invalid":"idle");return;}
  setAvailability("checking");
  const timer=setTimeout(async()=>{const {data,error}=await supabase.rpc("is_username_available",{candidate:value});setAvailability(error?"idle":data?"available":"taken");},350);
  return()=>clearTimeout(timer);
 },[username,mode]);
 useEffect(()=>{if(window.location.hash.includes("type=recovery"))setMode("reset");},[]);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setError("");setNotice("");setBusy(true);
  try{
   if(mode==="forgot"){
    const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
    if(error)throw error;setNotice("Password reset link sent. Check your email."); 
   }else if(mode==="reset"){
    if(password.length<8)throw new Error("Use at least 8 characters for your new password.");
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    setNotice("Password updated. You can continue using WAYS S.");setMode("login");
   }else if(mode==="signup"){
    if(availability!=="available")throw new Error("Please choose an available username.");
    const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username:username.trim().toLowerCase(),display_name:username.trim()}}});
    if(error)throw error;
    if(data.user&&data.session){await ensureProfile(data.user);nav("/");}
    else setNotice("Account created. Check your email to confirm, then sign in.");
   }else{
    const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
    if(data.user){await ensureProfile(data.user);nav("/");}
   }
  }catch(err){setError(err instanceof Error?err.message:"Something went wrong");}
  finally{setBusy(false);}
 };
 const google=async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});if(error)setError(error.message);};
 const title=mode==="login"?"Welcome back":mode==="signup"?"Find your orbit":mode==="forgot"?"Reset your password":"Choose a new password";
 return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
  <div className="brand-mark"><Orbit/><strong>WAYS<span>S</span></strong></div><p className="eyebrow">YOUR WORLD. YOUR ORBIT.</p><h1>{title}</h1>
  <p className="muted">{mode==="signup"?"Create your identity and join your orbit.":mode==="forgot"?"We'll email you a secure password reset link.":mode==="reset"?"Enter a new password for your account.":"A space to share what makes you, you."}</p>
  {mode!=="reset"&&<input required type={mode==="signup"?"text":"email"} value={mode==="signup"?username:email} onChange={e=>mode==="signup"?setUsername(e.target.value):setEmail(e.target.value)} placeholder={mode==="signup"?"Username":"Email address"} autoComplete={mode==="signup"?"username":"email"}/>}
  {mode==="signup"&&<div className={"username-live "+availability}>{availability==="checking"?"Checking username…":availability==="available"?"Username available":availability==="taken"?"Username already taken":availability==="invalid"?"Use 3–30 letters, numbers or underscores":""}{availability==="available"&&<CheckCircle2 size={15}/ >}{availability==="taken"&&<XCircle size={15}/>}</div>}
  {mode!=="forgot"&&<input required minLength={mode==="reset"?8:6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==="reset"?"New password":mode==="signup"?"Password (min. 6 characters)":"Password"} autoComplete={mode==="login"?"current-password":"new-password"}/>}
  {mode==="login"&&<button type="button" className="auth-text-link" onClick={()=>{setMode("forgot");setError("");}}>Forgot password?</button>}
  {error&&<p className="error">{error}</p>}{notice&&<p className="success">{notice}</p>}
  <button className="primary-btn" disabled={busy||(mode==="signup"&&availability!=="available")}>{busy?"Please wait…":mode==="login"?"Sign in":mode==="signup"?"Create account":mode==="forgot"?"Send reset link":"Update password"}</button>
  {mode==="login"&&<button type="button" className="secondary-btn" onClick={google}>Continue with Google</button>}
  {mode!=="forgot"&&mode!=="reset"?<p className="switch-auth">{mode==="login"?"New to WAYS S?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");setNotice("");}}>{mode==="login"?"Create account":"Sign in"}</button></p>:<p className="switch-auth"><button type="button" onClick={()=>{setMode("login");setError("");setNotice("");}}>Back to sign in</button></p>}
 </form></main>;
}
