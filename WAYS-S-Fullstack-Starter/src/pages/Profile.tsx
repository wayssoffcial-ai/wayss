import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, Profile as ProfileType, Post } from "../lib/supabase";
import { uploadMedia } from "../lib/api";
import PostCard from "../components/PostCard";
import FollowList from "../components/FollowList";
import FollowRequests from "../components/FollowRequests";
import {
  MoreHorizontal, MapPin, Plus, Settings as SettingsIcon, Share2, Flag, Lock,
  Pencil, Trash2, Globe, Check, X, ExternalLink, ImagePlus, UserRound, Link2,
  ShieldCheck, UserX, FileText
} from "lucide-react";

type SectionLink = { label: string; url: string };
type Section = { id: string; title: string; description: string; color: string; links: SectionLink[]; sort_order?: number };
const PALETTE = ["#F32950", "#10263B", "#55AAFF", "#A78BFA", "#22C58B", "#F5B942", "#F5F5F7"];
const validUrl = (value: string) => {
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; }
  catch { return false; }
};

export default function Profile({ userId }: { userId: string }) {
  const params = useParams();
  const navigate = useNavigate();
  const target = params.id || userId;
  const own = target === userId;
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followList, setFollowList] = useState<"followers"|"following"|null>(null);
  const [requestsOpen,setRequestsOpen]=useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [display, setDisplay] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [identity, setIdentity] = useState("");
  const [website, setWebsite] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#F32950");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sectionLinks, setSectionLinks] = useState<SectionLink[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setError("");
    const { data: p, error: profileError } = await supabase.from("profiles").select("*").eq("id", target).maybeSingle();
    if (profileError) { setError(profileError.message); return; }
    if (!p) { setProfile(null); return; }
    setProfile(p);
    setDisplay(p.display_name || "");
    setUsername(p.username || "");
    setBio(p.bio || "");
    setIdentity(p.identity_line || "");
    setWebsite(p.website || "");

    const [{ data: s }, { data: po }, { count: fc }, { count: gc }, { data: f }, { data: req }, { data: block }] = await Promise.all([
      supabase.from("profile_sections").select("*").eq("user_id", target).order("sort_order"),
      supabase.from("posts").select("*,profiles(*),likes(user_id),comments(id)").eq("user_id", target).order("created_at", { ascending: false }).limit(30),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", target),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", target),
      supabase.from("follows").select("id").eq("follower_id", userId).eq("following_id", target).maybeSingle(),
      supabase.from("follow_requests").select("id,status").eq("requester_id", userId).eq("requested_id", target).eq("status", "pending").maybeSingle(),
      supabase.from("profile_blocks").select("id").eq("blocker_id", userId).eq("blocked_id", target).maybeSingle()
    ]);
    setSections((s || []) as Section[]);
    setPosts((po || []) as Post[]);
    setFollowers(fc || 0);
    setFollowing(gc || 0);
    setIsFollowing(!!f);
    setRequestPending(!!req);
    setBlocked(!!block);
  };

  useEffect(() => { setProfile(null); setMenu(false); load(); }, [target, userId]);
  const locked = !!profile?.is_private && !own && !isFollowing;
  const initials = useMemo(() => (profile?.display_name || "W").slice(0, 1).toUpperCase(), [profile?.display_name]);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    if (!display.trim() || !username.trim()) { setError("Display name and username are required."); setBusy(false); return; }
    if (website.trim() && !validUrl(website.startsWith("http") ? website : "https://" + website)) { setError("Enter a valid website URL."); setBusy(false); return; }
    const { error: saveError } = await supabase.from("profiles").update({
      display_name: display.trim(), username: username.trim().replace(/^@/, "").toLowerCase(),
      bio: bio.trim(), identity_line: identity.trim(), website: website.trim()
    }).eq("id", userId);
    setBusy(false);
    if (saveError) { setError(saveError.message); return; }
    setEditing(false); setNotice("Profile updated."); load();
  };

  const changeImage = async (file: File | null, field: "avatar_url" | "cover_url") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Image must be smaller than 10 MB."); return; }
    setBusy(true); setError("");
    try {
      const url = await uploadMedia(file, "profiles");
      const { error: updateError } = await supabase.from("profiles").update({ [field]: url }).eq("id", userId);
      if (updateError) throw updateError;
      setNotice(field === "avatar_url" ? "Profile photo updated." : "Cover photo updated.");
      await load();
    } catch (e: any) { setError(e.message || "Could not upload image."); }
    finally { setBusy(false); }
  };

  const resetSectionForm = () => {
    setEditId(null); setTitle(""); setDescription(""); setColor("#F32950");
    setSectionLinks([]); setLinkTitle(""); setLinkUrl(""); setError("");
  };
  const startEdit = (s: Section) => {
    setEditId(s.id); setTitle(s.title); setDescription(s.description || "");
    setColor(s.color || "#F32950"); setSectionLinks(Array.isArray(s.links) ? s.links : []);
    setLinkTitle(""); setLinkUrl(""); setSectionOpen(true);
  };
  const addLink = () => {
    const label = linkTitle.trim();
    const url = linkUrl.trim();
    if (!label || !url) { setError("Add both a link title and URL."); return; }
    const normalized = url.startsWith("http://") || url.startsWith("https://") ? url : "https://" + url;
    if (!validUrl(normalized)) { setError("Enter a valid http or https link."); return; }
    setSectionLinks((items) => [...items, { label, url: normalized }]);
    setLinkTitle(""); setLinkUrl(""); setError("");
  };
  const saveSection = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    if (!title.trim()) { setError("Section title is required."); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { setError("Use a valid 6-digit hex colour."); return; }
    setBusy(true);
    const payload = { user_id: userId, title: title.trim(), description: description.trim(), color, links: sectionLinks };
    const result = editId
      ? await supabase.from("profile_sections").update(payload).eq("id", editId).eq("user_id", userId)
      : await supabase.from("profile_sections").insert(payload);
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setSectionOpen(false); resetSectionForm(); setNotice("Your profile section was saved."); load();
  };
  const removeSection = async (id: string) => {
    if (!confirm("Delete this profile section? This cannot be undone.")) return;
    const { error: deleteError } = await supabase.from("profile_sections").delete().eq("id", id).eq("user_id", userId);
    if (deleteError) setError(deleteError.message);
    else { setNotice("Section deleted."); setSectionOpen(false); resetSectionForm(); load(); }
  };

  const toggleFollow = async () => {
    setBusy(true); setError("");
    if (isFollowing) {
      const { error: e } = await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", target);
      if (e) setError(e.message); else { setIsFollowing(false); setFollowers((n) => Math.max(0, n - 1)); setNotice("You unfollowed this account."); }
    } else if (profile?.is_private) {
      const { error: e } = await supabase.from("follow_requests").upsert({ requester_id: userId, requested_id: target, status: "pending" }, { onConflict: "requester_id,requested_id" });
      if (e) setError(e.message); else { setRequestPending(true); setNotice("Follow request sent."); }
    } else {
      const { error: e } = await supabase.from("follows").insert({ follower_id: userId, following_id: target });
      if (e) setError(e.message); else { setIsFollowing(true); setFollowers((n) => n + 1); setNotice("You are now following this account."); }
    }
    setBusy(false);
  };

  const shareProfile = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setNotice("Profile link copied."); }
    catch { setNotice(window.location.href); }
    setMenu(false);
  };
  const reportProfile = async () => {
    const reason = prompt("Tell us why you are reporting this profile:");
    if (!reason?.trim()) return;
    const { error: e } = await supabase.from("profile_reports").insert({ reporter_id: userId, reported_id: target, reason: reason.trim() });
    if (e) setError(e.message); else setNotice("Report submitted for review.");
    setMenu(false);
  };
  const blockProfile = async () => {
    if (!confirm("Block this account? You will no longer see each other's profile activity.")) return;
    const { error: e } = await supabase.from("profile_blocks").insert({ blocker_id: userId, blocked_id: target });
    if (e) setError(e.message); else { setBlocked(true); setNotice("Account blocked."); }
    setMenu(false);
  };

  if (!profile) return <div className="page profile-page"><div className="empty-state"><UserRound size={34}/><h2>{error ? "Profile unavailable" : "Loading profile..."}</h2><p>{error || "Please wait a moment."}</p></div></div>;

  return <div className="page profile-page">
    {notice && <div className="profile-notice" role="status"><Check size={15}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={14}/></button></div>}
    {error && <div className="profile-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
    <div className="profile-cover" style={{ backgroundImage: `linear-gradient(0deg,#08090D 0%,#08090D33 58%,#08090D22 100%),url(${profile.cover_url || ""})` }}>
      {own && <label className="cover-edit"><ImagePlus size={14}/><span>Update cover</span><input type="file" accept="image/*" onChange={(e) => { changeImage(e.target.files?.[0] || null, "cover_url"); e.currentTarget.value = ""; }}/></label>}
      <button className="menu-trigger" aria-label="Profile menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal/></button>
      {menu && <div className="profile-menu">
        <button onClick={() => { setMenu(false); document.getElementById("profile-posts")?.scrollIntoView({ behavior: "smooth" }); }}><FileText/> View posts</button>
        {own ? <>
          <button onClick={() => { setMenu(false); setEditing(true); }}><Pencil/> Edit profile</button>
          <button onClick={() => { setMenu(false); resetSectionForm(); setSectionOpen(true); }}><Plus/> Add bio / custom section</button>
          <button onClick={() => { setMenu(false); setRequestsOpen(true); }}><UserRound/> Follow requests</button>
          <button onClick={() => { setMenu(false); navigate("/settings"); }}><SettingsIcon/> Settings</button>
          <button onClick={() => { setMenu(false); setAboutOpen(true); }}><ShieldCheck/> About this account</button>
          <button onClick={shareProfile}><Share2/> Share profile</button>
        </> : <>
          <button onClick={shareProfile}><Share2/> Share profile</button>
          <button onClick={() => { setMenu(false); setAboutOpen(true); }}><ShieldCheck/> About this account</button>
          <button onClick={reportProfile}><Flag/> Report</button>
          <button onClick={blockProfile}><UserX/> Block account</button>
        </>}
      </div>}
    </div>

    <div className="profile-main">
      <div className="profile-top">
        <div className="avatar-wrap">
          {profile.avatar_url ? <img className="avatar xl" src={profile.avatar_url} alt={profile.display_name}/> : <div className="avatar xl avatar-fallback">{initials}</div>}
          {own && <label className="avatar-edit" title="Change profile photo"><ImagePlus size={14}/><input type="file" accept="image/*" onChange={(e) => { changeImage(e.target.files?.[0] || null, "avatar_url"); e.currentTarget.value = ""; }}/></label>}
        </div>
        <div className="profile-actions">
          {own ? null : <>
            <button className={isFollowing ? "secondary-btn" : "primary-btn"} disabled={busy || requestPending || blocked} onClick={toggleFollow}>
              {blocked ? "Unavailable" : isFollowing ? "Following" : requestPending ? "Requested" : profile.is_private ? "Request to follow" : "Follow"}
            </button>
            <button className="secondary-btn" onClick={() => setNotice("Messaging will be connected from the profile action.")}>Message</button>
          </>}
        </div>
      </div>
      <h1>{profile.display_name} {profile.is_verified && <ShieldCheck className="verified-badge profile-verified" aria-label="Verified account"/>} {profile.ways_verified && <span className="ways-verified-badge profile-ways-badge">W</span>}</h1>
      <p className="muted profile-handle">@{profile.username} {profile.is_verified && <ShieldCheck className="verified-badge" aria-label="Verified"/>} {profile.ways_verified && <span className="ways-verified-badge">W</span>}</p>
      {profile.identity_line && <p className="identity">{profile.identity_line}</p>}
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}
      <div className="stats">
        <div><b>{posts.length}</b><small>Posts</small></div>
        <button type="button" onClick={() => setFollowList("followers")}><b>{followers}</b><small>Followers</small></button>
        <button type="button" onClick={() => setFollowList("following")}><b>{following}</b><small>Following</small></button>
      </div>
      {profile.website && <a className="external-link" href={validUrl(profile.website) ? profile.website : "https://" + profile.website} target="_blank" rel="noopener noreferrer"><Link2 size={14}/>{profile.website}<ExternalLink size={12}/></a>}
      <div className="profile-privacy-label">{profile.is_private ? <><Lock size={13}/> Private account</> : <><Globe size={13}/> Public account</>}</div>
    </div>

    {requestsOpen && <FollowRequests userId={userId} onClose={() => setRequestsOpen(false)}/>}
    {followList && <FollowList userId={target} kind={followList} onClose={() => setFollowList(null)}/>}

    {editing && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setEditing(false); }}>
      <form className="modal form-stack profile-editor" onSubmit={saveProfile}>
        <div className="modal-head"><div><span className="eyebrow">YOUR IDENTITY</span><h2>Edit profile</h2></div><button type="button" onClick={() => setEditing(false)} aria-label="Close"><X/></button></div>\n        <div className="profile-media-tools"><label className="media-upload-card"><span className="media-upload-preview">{profile.avatar_url ? <img src={profile.avatar_url} alt="Current profile"/> : <UserRound/>}</span><span><b>Profile photo</b><small>Square image · up to 10 MB</small><em>Choose photo</em></span><input type="file" accept="image/*" onChange={(e) => { changeImage(e.target.files?.[0] || null, "avatar_url"); e.currentTarget.value = ""; }}/></label><label className="media-upload-card"><span className="media-upload-preview cover-preview">{profile.cover_url ? <img src={profile.cover_url} alt="Current cover"/> : <ImagePlus/>}</span><span><b>Cover image</b><small>Wide image · up to 10 MB</small><em>Choose cover</em></span><input type="file" accept="image/*" onChange={(e) => { changeImage(e.target.files?.[0] || null, "cover_url"); e.currentTarget.value = ""; }}/></label></div>
        <label>Display name</label><input required maxLength={60} value={display} onChange={(e) => setDisplay(e.target.value)}/>
        <label>Username</label><input required maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)}/>
        <label>Identity line <small>Optional</small></label><input maxLength={90} value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="Developer • Designer • Creator"/>
        <label>Bio</label><textarea maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="A little about you..."/>
        <label>Website</label><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourwebsite.com"/>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
      </form>
    </div>}

    {sectionOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) { setSectionOpen(false); resetSectionForm(); } }}>
      <form className="modal form-stack profile-editor" onSubmit={saveSection}>
        <div className="modal-head"><div><span className="eyebrow">MAKE IT PERSONAL</span><h2>{editId ? "Edit section" : "Create a section"}</h2></div><button type="button" onClick={() => { setSectionOpen(false); resetSectionForm(); }} aria-label="Close"><X/></button></div>
        <label>Section title</label><input required maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My journey"/>
        <label>Description</label><textarea rows={5} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell your story..."/>
        <label>Choose colour</label>
        <div className="color-row">{PALETTE.map((c) => <button type="button" key={c} aria-label={`Choose ${c}`} aria-pressed={color === c} className={color === c ? "swatch selected" : "swatch"} style={{ background: c }} onClick={() => setColor(c)}/>)}
          <label className="color-picker-label" title="Pick a custom colour"><input type="color" value={/^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#F32950"} onChange={(e) => setColor(e.target.value)}/><span>Custom</span></label>
          <input aria-label="Hex colour" className="hex-input" value={color} maxLength={7} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="link-editor">
          <label>Profile links</label>
          <div className="link-input-row"><input aria-label="Link title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="GitHub"/><input aria-label="Link URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://github.com/you"/><button type="button" className="secondary-btn" onClick={addLink}><Plus size={15}/></button></div>
          {sectionLinks.map((l, i) => <div className="link-edit-item" key={i}><span><MapPin size={13}/>{l.label}</span><small>{l.url}</small><button type="button" aria-label="Edit link" onClick={() => { setLinkTitle(l.label); setLinkUrl(l.url); setSectionLinks((items) => items.filter((_, index) => index !== i)); }}><Pencil size={13}/></button><button type="button" aria-label="Remove link" onClick={() => setSectionLinks((items) => items.filter((_, index) => index !== i))}><Trash2 size={14}/></button></div>)}
        </div>
        <div className="section-preview" style={{ borderColor: color, borderLeftColor: color }}><b>{title || "Your section title"}</b><p>{description || "Your story preview will appear here."}</p>{sectionLinks.map((l, i) => <span className="pin-link" key={i}><MapPin size={13}/>{l.label} ↗</span>)}</div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-btn" disabled={busy}>{busy ? "Saving..." : "Save section"}</button>
        {editId && <button type="button" className="danger-btn" onClick={() => removeSection(editId)}><Trash2 size={15}/> Delete section</button>}
      </form>
    </div>}

    {aboutOpen && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setAboutOpen(false); }}><div className="modal form-stack">
      <div className="modal-head"><h2>About this account</h2><button onClick={() => setAboutOpen(false)} aria-label="Close"><X/></button></div>
      <div className="about-account-mark"><ShieldCheck/></div><p><b>@{profile.username}</b></p><p className="muted">Joined WAYS S {new Date(profile.created_at || new Date().toISOString()).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</p><p className="muted">Account visibility: {profile.is_private ? "Private" : "Public"}</p>
      <button className="secondary-btn" onClick={() => setAboutOpen(false)}>Close</button>
    </div></div>}

    {blocked ? <div className="private-state"><UserX/><h2>You blocked this account</h2><p>Unblock them to view their profile.</p><button className="secondary-btn" onClick={async () => { const { error: e } = await supabase.from("profile_blocks").delete().eq("blocker_id", userId).eq("blocked_id", target); if (e) setError(e.message); else { setBlocked(false); setNotice("Account unblocked."); } }}>Unblock</button></div>
    : locked ? <div className="private-state"><Lock/><h2>This account is private</h2><p>Send a follow request to see their posts and profile sections.</p>{requestPending && <span className="request-status"><Check size={14}/> Follow request pending</span>}</div>
    : <>
      <div className="section-list">
        {sections.map((s) => <section className="custom-section" style={{ borderLeftColor: s.color }} key={s.id}>
          <div className="section-title"><h2>{s.title}</h2>{own && <div className="section-controls"><button aria-label="Edit section" onClick={() => startEdit(s)}><Pencil size={15}/></button><button aria-label="Delete section" onClick={() => removeSection(s.id)}><Trash2 size={15}/></button></div>}</div>
          {s.description && <p>{s.description}</p>}
          {(Array.isArray(s.links) ? s.links : []).map((l, i) => <a className="pin-link" key={i} href={validUrl(l.url) ? l.url : "#"} target="_blank" rel="noopener noreferrer"><MapPin size={14}/>{l.label} <ExternalLink size={12}/></a>)}
        </section>)}
        {own && <button className="add-section" onClick={() => { resetSectionForm(); setSectionOpen(true); }}><Plus/> Add custom section</button>}
      </div>
      <div id="profile-posts"><h2 className="subheading">Posts & creations</h2><div className="feed-list">{posts.length ? posts.map((p) => <PostCard key={p.id} post={p} userId={userId}/>) : <div className="empty-state"><FileText size={28}/><h2>No posts yet</h2><p>When this user shares something, it will appear here.</p></div>}</div></div>
    </>}
  </div>;
}
