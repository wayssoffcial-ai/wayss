import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { ensureProfile } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { Orbit, CheckCircle2, XCircle, Eye, EyeOff, ShieldCheck, ArrowLeft } from "lucide-react";

type Mode = "login"|"signup"|"forgot"|"reset"|"verify";
export default function Auth() {
 const [mode,setMode]=useState<Mode>("login");
 const [identifier,setIdentifier]=useState("");const [email,setEmail]=useState("");const [phone,setPhone]=useState("");
 const [fullName,setFullName]=useState("");const [password,setPassword]=useState("");const [confirm,setConfirm]=useState("");
 const [username,setUsername]=useState("");const [otp,setOtp]=useState("");const [showPassword,setShowPassword]=useState(false);
 const [terms,setTerms]=useState(false);const [remember,setRemember]=useState(true);
 const [availability,setAvailability]=useState<"idle"|"checking"|"available"|"taken"|"invalid">("idle");
 const [error,setError]=useState("");const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 const nav=useNavigate();
 useEffect(()=>{if(window.location.hash.includes("type=recovery"))setMode("reset");},[]);
 useEffect(()=>{
  if(mode!=="signup"){setAvailability("idle");return;}
  const value=username.trim().replace(/^@/,"").toLowerCase();
  if(!/^[a-z0-9_]{3,30}$/.test(value)){setAvailability(value?"invalid":"idle");return;}
  setAvailability("checking");
  const timer=window.setTimeout(async()=>{const {data,error}=await supabase.rpc("is_username_available",{candidate:value});setAvailability(error?"idle":data?"available":"taken");},350);
  return()=>window.clearTimeout(timer);
 },[username,mode]);
 const strength=useMemo(()=>{let n=0;if(password.length>=8)n++;if(/[A-Z]/.test(password)&&/[a-z]/.test(password))n++;if(/[0-9]/.test(password))n++;if(/[^A-Za-z0-9]/.test(password))n++;return n;},[password]);
 const clear=()=>{setError("");setNotice("");};
 const submit=async(e:FormEvent)=>{
  e.preventDefault();clear();setBusy(true);
  try{
   if(mode==="forgot"){
    const value=identifier.trim();
    if(!value.includes("@"))throw new Error("Enter your registered email address to reset your password.");
    const {error}=await supabase.auth.resetPasswordForEmail(value,{redirectTo:window.location.origin});
    if(error)throw error;setNotice("Password reset link sent. Check your email inbox and spam folder.");
   }else if(mode==="reset"){
    if(password.length<8)throw new Error("Password must be at least 8 characters long.");
    if(password!==confirm)throw new Error("Passwords do not match.");
    const {error}=await supabase.auth.updateUser({password});if(error)throw error;
    setNotice("Password updated successfully. You can now sign in.");setPassword("");setConfirm("");setMode("login");
   }else if(mode==="verify"){
    if(!/^\d{6}$/.test(otp))throw new Error("Enter the 6-digit verification code.");
    const {data,error}=await supabase.auth.verifyOtp({email:email.trim(),token:otp,type:"email"});
    if(error)throw error;
    if(data.user){await ensureProfile(data.user);nav("/");}
   }else if(mode==="signup"){
    if(!fullName.trim())throw new Error("Please enter your full name.");
    if(availability!=="available")throw new Error("Please choose an available username.");
    if(password.length<8)throw new Error("Password must be at least 8 characters long.");
    if(password!==confirm)throw new Error("Passwords do not match.");
    if(!terms)throw new Error("Please accept the Terms & Conditions to continue.");
    const normalizedPhone=phone.trim();
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:window.location.origin, data:{username:username.trim().toLowerCase(),display_name:fullName.trim(),full_name:fullName.trim(),phone:normalizedPhone||null}}});
    if(error)throw error;
    if(data.user&&data.session){await ensureProfile(data.user);nav("/");}
    else{setNotice("Confirmation link sent. Check your email to verify your account.");setMode("login");}
   }else{
    const value=identifier.trim();
    if(value.startsWith("+")||/^\d{8,}$/.test(value)){
      const {data,error}=await supabase.auth.signInWithPassword({phone:value,password});if(error)throw error;
      if(data.user){await ensureProfile(data.user);nav("/");}
    }else if(value.includes("@")){
      const {data,error}=await supabase.auth.signInWithPassword({email:value,password});if(error)throw error;
      if(data.user){await ensureProfile(data.user);nav("/");}
    }else{
      throw new Error("Sign in with your email address or verified phone number.");
    }
   }
  }catch(err){
   const raw=err instanceof Error?err.message:"Something went wrong";const lower=raw.toLowerCase();
   if(lower.includes("over_email_send_rate_limit")||lower.includes("email rate limit")||lower.includes("too many requests"))setError("Email sending limit reached. Please wait a moment and try again.");
   else if(lower.includes("user already registered"))setError("This email already has an account. Sign in or use Forgot password.");
   else if(lower.includes("invalid login credentials"))setError("The email/phone number or password is incorrect.");
   else setError(raw);
  }finally{setBusy(false);}
 };
 const google=async()=>{clear();const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin}});if(error)setError(error.message);};
 const title=mode==="login"?"Welcome back":mode==="signup"?"Create your account":mode==="forgot"?"Reset your password":mode==="reset"?"Choose a new password":"Verify your email";
 const changeMode=(next:Mode)=>{setMode(next);clear();setPassword("");setConfirm("");};
 return <main className="auth-page"><form className="auth-card auth-card-modern" onSubmit={submit}>
  <div className="brand-mark"><Orbit/><strong>WAYS<span>S</span></strong></div><p className="eyebrow">YOUR WORLD. YOUR ORBIT.</p><h1>{title}</h1>
  <p className="muted">{mode==="signup"?"Create your identity and join your orbit.":mode==="forgot"?"We'll send a secure password reset link to your registered email.":mode==="reset"?"Choose a strong new password for your account.":mode==="verify"?"Enter the 6-digit code sent to your email address.":"A space to share what makes you, you."}</p>
  {mode==="signup"&&<>
   <label className="auth-field-label">Full name<input required autoComplete="name" maxLength={60} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name"/></label>
   <label className="auth-field-label">Username<input required autoComplete="username" maxLength={30} value={username} onChange={e=>setUsername(e.target.value.replace(/\s/g,"").toLowerCase())} placeholder="Choose a username"/></label>
   <div className={"username-live "+availability}>{availability==="checking"?"Checking username…":availability==="available"?"Username available":availability==="taken"?"Username already taken":availability==="invalid"?"Use 3–30 letters, numbers or underscores":""}{availability==="available"&&<CheckCircle2 size={15}/ >}{availability==="taken"&&<XCircle size={15}/>}</div>
   <label className="auth-field-label">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
   <label className="auth-field-label">Phone number <small>Optional</small><input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"/></label>
  </>}
  {mode==="login"&&<label className="auth-field-label">Email or phone number<input required autoComplete="username" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="Email address or phone number"/></label>}
  {mode==="forgot"&&<label className="auth-field-label">Registered email<input required type="email" autoComplete="email" value={identifier} onChange={e=>setIdentifier(e.target.value)} placeholder="you@example.com"/></label>}
  {mode==="verify"&&<><label className="auth-field-label">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label className="auth-field-label">6-digit code<input required inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000"/></label></>}
  {(mode==="login"||mode==="signup"||mode==="reset")&&<label className="auth-field-label">{mode==="reset"?"New password":"Password"}<span className="auth-password-wrap"><input required minLength={8} type={showPassword?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}
  {(mode==="signup"||mode==="reset")&&<>
   <label className="auth-field-label">Confirm password<input required minLength={8} type={showPassword?"text":"password"} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Enter password again"/></label>
   <div className="password-strength"><div className="password-strength-bars">{[1,2,3,4].map(n=><i key={n} className={strength>=n?"filled":""}/>)}</div><small>{password.length===0?"Password strength":strength<=1?"Weak":strength===2?"Fair":strength===3?"Good":"Strong"}</small></div>
  </>}
  {mode==="signup"&&<label className="auth-check"><input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)}/> I agree to the Terms & Conditions and Privacy Policy.</label>}
  {mode==="login"&&<div className="auth-login-options"><label className="auth-check"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me</label><button type="button" className="auth-text-link" onClick={()=>{setIdentifier(identifier.includes("@")?identifier:"");changeMode("forgot");}}>Forgot password?</button></div>}
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="success" role="status">{notice}</p>}
  <button className="primary-btn" disabled={busy||(mode==="signup"&&(availability!=="available"||!terms))||(mode==="login"&&(!identifier.trim()||!password))}>{busy?"Please wait…":mode==="login"?"Sign in":mode==="signup"?"Create account":mode==="forgot"?"Send reset link":mode==="reset"?"Update password":"Verify code"}</button>
  {mode==="login"&&<><div className="auth-divider"><span>or</span></div><button type="button" className="secondary-btn" onClick={google}><ShieldCheck size={16}/> Continue with Google</button></>}
  {mode==="login"||mode==="signup"?<p className="switch-auth">{mode==="login"?"New to WAYS S?":"Already have an account?"} <button type="button" onClick={()=>changeMode(mode==="login"?"signup":"login")}>{mode==="login"?"Create account":"Sign in"}</button></p>:<p className="switch-auth"><button type="button" onClick={()=>changeMode("login")}><ArrowLeft size={13}/> Back to sign in</button></p>}
  {mode==="signup"&&<p className="auth-security-note"><ShieldCheck size={13}/> Your password is securely handled by Supabase Auth.</p>}
 </form></main>;
}