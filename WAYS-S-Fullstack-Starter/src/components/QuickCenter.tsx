import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { House, Orbit, Plus, MessageCircle, UserRound, Image, Clapperboard, X } from "lucide-react";

const items = [
  { label: "Home", icon: House, path: "/" },
  { label: "Orbit", icon: Orbit, path: "/orbit" },
  { label: "Msgs", icon: MessageCircle, path: "/messages" },
  { label: "Profile", icon: UserRound, path: "/profile" }
];

export default function QuickCenter() {
  const [open, setOpen] = useState(false);
  const [create, setCreate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nav = useNavigate();
  const location = useLocation();

  const collapseLater = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setOpen(false); setCreate(false); }, 2600);
  };
  const expand = () => { setOpen(true); setCreate(false); collapseLater(); };
  const go = (path: string) => { nav(path); setOpen(false); setCreate(false); if (timer.current) clearTimeout(timer.current); };

  useEffect(() => { if (open) collapseLater(); return () => { if (timer.current) clearTimeout(timer.current); }; }, [open, location.pathname]);
  return <div className="quick-wrap">
    {create && <div className="create-glass">
      <div className="create-title">Create on WAYS<span>S</span></div>
      <button onClick={() => go("/create?type=post")}><Image/><b>Post</b></button>
      <button onClick={() => go("/create?type=image")}><Image/><b>Images</b></button>
      <button onClick={() => go("/create?type=flux")}><Clapperboard/><b>Flux</b></button>
    </div>}
    {open ? <div className="quick-glass" onPointerDown={collapseLater}>
      {items.slice(0,2).map(i => <button className={location.pathname === i.path ? "active" : ""} key={i.label} onClick={() => go(i.path)}><i.icon/><small>{i.label}</small></button>)}
      <button className="quick-plus" onClick={() => { setCreate(v => !v); collapseLater(); }}>{create ? <X/> : <Plus/>}</button>
      {items.slice(2).map(i => <button className={location.pathname === i.path ? "active" : ""} key={i.label} onClick={() => go(i.path)}><i.icon/><small>{i.label}</small></button>)}
    </div> : <button className="quick-logo" aria-label="Open Quick Center" onClick={expand}><span>W</span></button>}
  </div>;
}