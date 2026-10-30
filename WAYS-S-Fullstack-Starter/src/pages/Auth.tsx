import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";
import { ensureProfile } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { Orbit } from "lucide-react";

export default function Auth() {
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [username,setUsername] = useState(""); const [error,setError] = useState(""); const [busy,setBusy] = useState(false);
  const nav = useNavigate();
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (mode === "signup") {
        const { data,error } = await supabase.auth.signUp({ email,password,options:{ data:{ username,display_name:username } } });
        if (error) throw error;
        if (data.user && data.session) { await ensureProfile(data.user); nav("/"); }
        else setError("Account created. Check your email to confirm, then sign in.");
      } else {
        const { data,error } = await supabase.auth.signInWithPassword({ email,password });
        if (error) throw error;
        if (data.user) { await ensureProfile(data.user); nav("/"); }
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong"); }
    setBusy(false);
  };
  const google = async () => { const { error } = await supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo:window.location.origin } }); if(error) setError(error.message); };
  return <main className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand-mark"><Orbit/> <strong>WAYS<span>S</span></strong></div>
    <p className="eyebrow">YOUR WORLD. YOUR ORBIT.</p><h1>{mode==="login"?"Welcome back":"Find your orbit"}</h1><p className="muted">A space to share what makes you, you.</p>
    {mode==="signup" && <input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username"/>}
    <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address"/>
    <input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (min. 6 characters)"/>
    {error && <p className="error">{error}</p>}
    <button className="primary-btn" disabled={busy}>{busy?"Please wait...":mode==="login"?"Sign in":"Create account"}</button>
    <button type="button" className="secondary-btn" onClick={google}>Continue with Google</button>
    <p className="switch-auth">{mode==="login"?"New to WAYS S?":"Already have an account?"} <button type="button" onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}>{mode==="login"?"Create account":"Sign in"}</button></p>
  </form></main>;
}