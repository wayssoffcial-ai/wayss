import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { House, Orbit, Plus, MessageCircle, UserRound, Image, Clapperboard, X } from "lucide-react";

const items = [
  { label: "Home", icon: House, path: "/" },
  { label: "Orbit", icon: Orbit, path: "/orbit" },
  { label: "Msgs", icon: MessageCircle, path: "/messages" },
  { label: "Profile", icon: UserRound, path: "/profile" },
];

export default function QuickCenter() {
  const [open, setOpen] = useState(false);
  const [create, setCreate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nav = useNavigate();
  const location = useLocation();

  const stop = () => { if (timer.current) clearTimeout(timer.current); };
  const foldSoon = () => {
    stop();
    timer.current = setTimeout(() => { setOpen(false); setCreate(false); }, 2800);
  };
  const close = () => { stop(); setOpen(false); setCreate(false); };
  const go = (path: string) => { stop(); nav(path); close(); };

  useEffect(() => {
    if (open) foldSoon();
    return stop;
  }, [open, location.pathname]);

  return (
    <div className={open ? "quick-center-shell expanded" : "quick-center-shell"}>
      {open ? (
        <>
          {create && (
            <div className="quick-create-popover">
              <div className="quick-create-heading">Create on WAYS<span>S</span></div>
              <div className="quick-create-actions">
                <button onClick={() => go("/create?type=post")}><i><Image /></i><b>Post</b></button>
                <button onClick={() => go("/create?type=image")}><i><Image /></i><b>Images</b></button>
                <button onClick={() => go("/create?type=flux")}><i><Clapperboard /></i><b>Flux</b></button>
              </div>
            </div>
          )}
          <nav className="quick-fullbar" aria-label="Quick navigation" onPointerMove={foldSoon}>
            {items.slice(0, 2).map(item => {
              const Icon = item.icon;
              return <button key={item.label} className={location.pathname === item.path ? "quick-nav-item active" : "quick-nav-item"} onClick={() => go(item.path)}><Icon /><span>{item.label}</span></button>;
            })}
            <button className={create ? "quick-nav-create active" : "quick-nav-create"} aria-label="Create" onClick={() => { setCreate(v => !v); foldSoon(); }}><Plus /></button>
            {items.slice(2).map(item => {
              const Icon = item.icon;
              return <button key={item.label} className={location.pathname === item.path ? "quick-nav-item active" : "quick-nav-item"} onClick={() => go(item.path)}><Icon /><span>{item.label}</span></button>;
            })}
            <button className="quick-nav-dismiss" aria-label="Close navigation" onClick={close}><X /></button>
          </nav>
        </>
      ) : (
        <button className="quick-logo" aria-label="Open WAYS S navigation" onClick={() => { setOpen(true); foldSoon(); }}><span>W</span></button>
      )}
    </div>
  );
}
