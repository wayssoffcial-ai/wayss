import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { uploadMedia } from "../lib/api";
import { ArrowLeft, Camera, LifeBuoy, Send, X } from "lucide-react";

export default function HelpCenter({userId}:{userId:string}){
 const [issue,setIssue]=useState("");const [file,setFile]=useState<File|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const submit=async(e:FormEvent)=>{e.preventDefault();if(issue.trim().length<8){setError("Please describe the issue in a little more detail.");return;}setBusy(true);setError("");setMessage("");try{
  let screenshot_url:string|null=null;if(file){if(!file.type.startsWith("image/"))throw new Error("Please attach an image screenshot.");if(file.size>8*1024*1024)throw new Error("Screenshot must be smaller than 8 MB.");screenshot_url=await uploadMedia(file,"help-center");}
  const {data,error:insertError}=await supabase.from("support_tickets").insert({user_id:userId,description:issue.trim(),screenshot_url}).select("id").single();if(insertError)throw insertError;
  const {error:mailError}=await supabase.functions.invoke("send-support-ticket",{body:{ticket_id:data.id}});if(mailError)throw new Error("Your issue was saved, but email delivery is not configured yet. Please try again later or contact support through the app.");
  setIssue("");setFile(null);setMessage("Your issue has been sent to WAYS S Support."); 
 }catch(err){setError(err instanceof Error?err.message:"Could not submit your issue.");}finally{setBusy(false);}};
 return <main className="page narrow help-page"><Link className="secondary-btn compact" to="/settings"><ArrowLeft size={15}/> Settings</Link><div className="help-heading"><span className="help-icon"><LifeBuoy/></span><span className="eyebrow">WAYS S SUPPORT</span><h1>Help Center</h1><p className="muted">Tell us what went wrong. You can attach a screenshot to help us understand the issue.</p></div>
 {message&&<div className="profile-notice">{message}</div>}{error&&<div className="profile-error">{error}</div>}
 <form className="panel form-stack help-form" onSubmit={submit}><label htmlFor="help-issue">Describe your issue</label><textarea id="help-issue" rows={7} maxLength={5000} value={issue} onChange={e=>setIssue(e.target.value)} placeholder="Type your issue here..." required/><div className="help-upload"><Camera/><div><b>Attach screenshot (optional)</b><small className="muted">PNG, JPG or WEBP · up to 8 MB</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)}/></div></div>{file&&<div className="help-file-name">{file.name}<button type="button" onClick={()=>setFile(null)} aria-label="Remove screenshot"><X size={15}/></button></div>}<button className="primary-btn" disabled={busy||issue.trim().length<8}><Send size={16}/>{busy?"Sending...":"Send to support"}</button></form>
 </main>;
}
