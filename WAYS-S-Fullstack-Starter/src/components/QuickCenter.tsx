import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { House, Orbit, Plus, MessageCircle, UserRound, Image, Clapperboard, X, Sparkles, ArrowUpRight } from "lucide-react";
const items=[{label:"Home",hint:"Your personal feed",icon:House,path:"/"},{label:"Orbit",hint:"Find your people",icon:Orbit,path:"/orbit"},{label:"Msgs",hint:"Conversations",icon:MessageCircle,path:"/messages"},{label:"Profile",hint:"Your identity",icon:UserRound,path:"/profile"}];
export default function QuickCenter(){
 const [open,setOpen]=useState(false),[create,setCreate]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),nav=useNavigate(),location=useLocation();
 const stop=()=>{if(timer.current)clearTimeout(timer.current);};
 const collapseLater=()=>{stop();timer.current=setTimeout(()=>{setOpen(false);setCreate(false);},2800);};
 const go=(path:string)=>{stop();nav(path);setOpen(false);setCreate(false);};
 const expand=()=>{setOpen(true);setCreate(false);collapseLater();};
 useEffect(()=>{if(open)collapseLater();return stop;},[open,location.pathname]);
 return <div className={open?"quick-wrap is-open":"quick-wrap"}>{open?<div className="quick-screen" role="dialog" aria-modal="true" aria-label="WAYS S Quick Center" onPointerMove={collapseLater}>
  <div className="quick-screen-glow quick-glow-one"/><div className="quick-screen-glow quick-glow-two"/>
  <button className="quick-close" aria-label="Close Quick Center" onClick={()=>{stop();setOpen(false);setCreate(false);}}><X/></button>
  <div className="quick-screen-content"><div className="quick-kicker"><Sparkles size={14}/> YOUR SPACE, YOUR ORBIT</div><div className="quick-brand">WAYS<span>S</span><small>Quick Center</small></div><p className="quick-intro">Where do you want to go?</p>
   <div className="quick-destinations">{items.map((item,index)=><button key={item.label} className={location.pathname===item.path?"quick-destination active":"quick-destination"} style={{animationDelay:`${index*75}ms`}} onClick={()=>go(item.path)}><span className="quick-destination-icon"><item.icon/></span><span className="quick-destination-copy"><b>{item.label}</b><small>{item.hint}</small></span><ArrowUpRight className="quick-arrow"/></button>)}
   <button className={create?"quick-destination create-destination active":"quick-destination create-destination"} onClick={()=>{setCreate(v=>!v);collapseLater();}}><span className="quick-destination-icon plus-icon">{create?<X/>:<Plus/>}</span><span className="quick-destination-copy"><b>Create something</b><small>Post, image or Flux</small></span><ArrowUpRight className="quick-arrow"/></button></div>
   {create&&<div className="quick-create-options"><button onClick={()=>go("/create?type=post")}><Image/> Post</button><button onClick={()=>go("/create?type=image")}><Image/> Image</button><button onClick={()=>go("/create?type=flux")}><Clapperboard/> Flux</button></div>}
   <div className="quick-auto-close"><span/> Auto folds in a moment · Tap any destination</div>
  </div></div>:<button className="quick-logo" aria-label="Open Quick Center" onClick={expand}><span>W</span><i/></button>}</div>;
}