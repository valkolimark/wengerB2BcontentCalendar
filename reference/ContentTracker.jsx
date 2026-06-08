import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Send, Palette, X, Copy, Check, Lock, Users, Tag,
  Building2, Mail, Target, CalendarDays, Plus, Pencil, Trash2, ShieldCheck,
  Eye, ExternalLink, Layers, Search, ChevronRight as Arrow
} from "lucide-react";

/* ============================ color helpers ============================ */
const hx = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const tintOf = (dot) => mix(dot, "#ffffff", 0.86);
const textOf = (dot) => mix(dot, "#000000", 0.5);
const slug = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

const MEDIUM_MAP = { "email": "email", "email sponsorship": "email", "banner ads": "display", "search ads": "cpc", "webinar": "event", "social": "social", "newsletter": "email" };
const deriveMedium = (channel) => MEDIUM_MAP[(channel || "").toLowerCase()] || "referral";
const deriveSource = (vendor, channel) => {
  if (/owned|direct|n\/a/i.test(vendor || "")) return deriveMedium(channel) === "email" ? "email" : slug(channel);
  return slug(vendor);
};

/* ============================ seed data ============================ */
const SEED_BRANDS = [
  { id: "wenger", label: "Wenger", dot: "#1C3B66" },
  { id: "jrclancy", label: "JRClancy", dot: "#2E6B3E" },
  { id: "gearboss", label: "GearBoss", dot: "#B22234" },
  { id: "cc", label: "Creative Conners", dot: "#E0721F" },
  { id: "txscenic", label: "Texas Scenic", dot: "#3E5871" },
  { id: "lutefish", label: "Lutefish", dot: "#0E7C86" },
  { id: "corp", label: "Corporate", dot: "#4A5568" },
].map((b) => ({ ...b, tint: tintOf(b.dot), text: textOf(b.dot) }));

const SEED_INITIATIVES = [
  { id: "prop28", name: "Prop 28", owner: "Whitney Winkels", status: "In flight" },
  { id: "txfn", name: "TX Friday Night Ready", owner: "Mark Mireles", status: "Launching soon" },
  { id: "gbath", name: "GearBoss athletics push", owner: "Pete Veal", status: "On track" },
  { id: "jrcrig", name: "JRClancy rigging spotlight", owner: "Whitney Winkels", status: "In review" },
  { id: "ccspk", name: "Creative Conners Spikemark", owner: "Unassigned", status: "Planning" },
  { id: "pupn", name: "PUPN facilities feature", owner: "Mark Mireles", status: "On track" },
  { id: "txs", name: "Texas Scenic search", owner: "Mark Mireles", status: "On track" },
];

const SEED_CAMPAIGNS = [
  { id: "c-prop", initiativeId: "prop28", brand: "wenger", name: "Prop 28 — email waves", channel: "Email", vendor: "N/A (Owned)", segment: "Elementary; Secondary; Purchasing", owner: "Whitney Winkels", sf: "WEN-2026-PROP28", utm: { source: "email", medium: "email", content: "wave4-urgency" }, leads: 142, pipeline: 86000, events: [
    { type: "comp", date: "2026-05-08", label: "W1 comp" }, { type: "launch", date: "2026-05-13", label: "Prop 28 W1" },
    { type: "launch", date: "2026-05-20", label: "Prop 28 W2" }, { type: "launch", date: "2026-05-27", label: "Prop 28 W3" },
    { type: "comp", date: "2026-06-05", label: "W4 comp" }, { type: "launch", date: "2026-06-10", label: "Prop 28 W4" },
    { type: "launch", date: "2026-06-17", label: "Prop 28 W5" }, { type: "launch", date: "2026-06-24", label: "Prop 28 W6" },
    { type: "launch", date: "2026-07-01", label: "Prop 28 W7" }, { type: "launch", date: "2026-07-08", label: "Prop 28 W8" },
  ] },
  { id: "c-txfn", initiativeId: "txfn", brand: "corp", name: "TXFN — weekly email", channel: "Email", vendor: "N/A (Owned)", segment: "TX K-12 Athletics", owner: "Mark Mireles", sf: "CORP-2026-TXFN-EML", utm: { source: "email", medium: "email", content: "wave1-urgency" }, leads: 0, pipeline: 0, events: [
    { type: "comp", date: "2026-06-12", label: "TXFN review" }, { type: "launch", date: "2026-06-19", label: "TXFN wk1" },
    { type: "launch", date: "2026-06-26", label: "TXFN wk2" }, { type: "launch", date: "2026-07-03", label: "TXFN wk3" }, { type: "launch", date: "2026-07-10", label: "TXFN wk4" },
  ] },
  { id: "c-gb", initiativeId: "gbath", brand: "gearboss", name: "AirPro Elite banner", channel: "Banner Ads", vendor: "LinkedIn", segment: "Athletic Directors", owner: "Pete Veal", sf: "GB-2026-ATH", utm: { source: "linkedin", medium: "display", content: "airpro-elite" }, leads: 58, pipeline: 41000, events: [
    { type: "comp", date: "2026-06-10", label: "GB comp" }, { type: "launch", date: "2026-06-17", label: "GB banner" }, { type: "launch", date: "2026-07-15", label: "GB refresh" },
  ] },
  { id: "c-jrc", initiativeId: "jrcrig", brand: "jrclancy", name: "Rigging spotlight email", channel: "Email Sponsorship", vendor: "SBO", segment: "Theatre Facilities", owner: "Whitney Winkels", sf: "JRC-2026-RIG", utm: { source: "sbo", medium: "email", content: "rigging-spotlight" }, leads: 23, pipeline: 19000, events: [
    { type: "comp", date: "2026-06-18", label: "JRClancy comp" }, { type: "launch", date: "2026-06-24", label: "Rigging email" },
  ] },
  { id: "c-cc", initiativeId: "ccspk", brand: "cc", name: "Spikemark control demo", channel: "Webinar", vendor: "Direct", segment: "Production Managers", owner: "Unassigned", sf: "CCN-2026-SPK", utm: { source: "webinar", medium: "event", content: "spikemark-demo" }, leads: 0, pipeline: 0, events: [
    { type: "comp", date: "2026-06-13", label: "Spikemark comp" }, { type: "launch", date: "2026-06-22", label: "Spikemark" },
  ] },
  { id: "c-pupn-w", initiativeId: "pupn", brand: "wenger", name: "PUPN — Wenger feature", channel: "Email Sponsorship", vendor: "PUPN", segment: "Facilities Directors", owner: "Mark Mireles", sf: "WEN-2026-PUPN", utm: { source: "pupn", medium: "email", content: "facilities-wenger" }, leads: 19, pipeline: 14000, events: [
    { type: "comp", date: "2026-06-15", label: "PUPN-W comp" }, { type: "launch", date: "2026-06-29", label: "PUPN Wenger" },
  ] },
  { id: "c-pupn-g", initiativeId: "pupn", brand: "gearboss", name: "PUPN — GearBoss feature", channel: "Email Sponsorship", vendor: "PUPN", segment: "Athletic Facilities", owner: "Pete Veal", sf: "GB-2026-PUPN", utm: { source: "pupn", medium: "email", content: "facilities-gearboss" }, leads: 12, pipeline: 9000, events: [
    { type: "comp", date: "2026-06-16", label: "PUPN-G comp" }, { type: "launch", date: "2026-07-06", label: "PUPN GearBoss" },
  ] },
  { id: "c-txs", initiativeId: "txs", brand: "txscenic", name: "Stage systems search", channel: "Search Ads", vendor: "Google", segment: "Higher Ed Theatre", owner: "Mark Mireles", sf: "TXS-2026-SRCH", utm: { source: "google", medium: "cpc", content: "stage-systems" }, leads: 31, pipeline: 22000, events: [
    { type: "launch", date: "2026-05-21", label: "TXS search" }, { type: "launch", date: "2026-07-09", label: "TXS search" },
  ] },
];

const seed = () => ({ brands: SEED_BRANDS, initiatives: SEED_INITIATIVES, campaigns: SEED_CAMPAIGNS });
const STORE_KEY = "wct:data:v1";
const ensureBrands = (d) => { const have = new Set((d.brands || []).map((b) => b.id)); const missing = SEED_BRANDS.filter((b) => !have.has(b.id)); return missing.length ? { ...d, brands: [...d.brands, ...missing] } : d; };

/* ============================ date helpers ============================ */
const TODAY = new Date(2026, 5, 8);
const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => key(a) === key(b);
const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const prettyDate = (s) => { const d = parseISO(s); return `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`; };
const fmtMoney = (n) => !n ? "$0" : n >= 1e6 ? "$" + (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + "k" : "$" + n;
const STATUS = { "In flight": { bg: "#E9F0F9", fg: "#14305C" }, "Launching soon": { bg: "#FBEFD6", fg: "#8A5A0B" }, "On track": { bg: "#E7F1E6", fg: "#1E4A28" }, "In review": { bg: "#EEEDFB", fg: "#3C3489" }, "Planning": { bg: "#EEEEEA", fg: "#5F5E5A" }, "Complete": { bg: "#EEEEEA", fg: "#5F5E5A" } };
const STATUS_OPTS = Object.keys(STATUS);
const SWATCHES = ["#1C3B66", "#2E6B3E", "#B22234", "#E0721F", "#3E5871", "#4A5568", "#6B3FA0", "#0E7C86", "#A8326E"];
const uid = () => Math.random().toString(36).slice(2, 9);

/* ============================ root ============================ */
export default function ContentTracker() {
  const [data, setData] = useState(null);
  const [storeOk, setStoreOk] = useState(true);
  const [role, setRole] = useState("admin");
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(new Date(2026, 5, 8));
  const [off, setOff] = useState({});
  const [sel, setSel] = useState(null);          // { kind:'initiative'|'campaign', id }
  const [modal, setModal] = useState(null);        // { type, editId?, presetInitiative? }
  const [copied, setCopied] = useState(false);
  const [q, setQ] = useState("");

  /* load + persist */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await window.storage.get(STORE_KEY);
        const parsed = r && r.value ? JSON.parse(r.value) : seed();
        const next = ensureBrands(parsed);
        if (!live) return;
        setData(next);
        if (next !== parsed) { try { await window.storage.set(STORE_KEY, JSON.stringify(next)); } catch {} }
      } catch {
        try { await window.storage.set(STORE_KEY, JSON.stringify(seed())); if (live) setData(seed()); }
        catch { if (live) { setData(seed()); setStoreOk(false); } }
      }
    })();
    return () => { live = false; };
  }, []);

  const commit = (next) => { setData(next); (async () => { try { await window.storage.set(STORE_KEY, JSON.stringify(next)); } catch { setStoreOk(false); } })(); };

  const showLeads = role === "admin" || role === "viewer";
  const showMoney = role === "admin";

  const brandMap = useMemo(() => { const m = {}; (data?.brands || []).forEach((b) => (m[b.id] = b)); return m; }, [data]);
  const campsOf = (initId) => (data?.campaigns || []).filter((c) => c.initiativeId === initId);

  const eventsByDay = useMemo(() => {
    const map = {};
    (data?.campaigns || []).forEach((c) => { if (off[c.brand]) return; c.events.forEach((ev) => { (map[ev.date] = map[ev.date] || []).push({ ...ev, campaign: c }); }); });
    return map;
  }, [data, off]);

  const rollup = (init) => {
    const cs = campsOf(init.id);
    const brands = [...new Set(cs.map((c) => c.brand))];
    const launches = cs.flatMap((c) => c.events.filter((e) => e.type === "launch"));
    const sent = launches.filter((e) => parseISO(e.date) <= TODAY).length;
    const progress = launches.length ? sent / launches.length : 0;
    const all = cs.flatMap((c) => c.events).sort((a, b) => a.date.localeCompare(b.date));
    const next = all.find((e) => parseISO(e.date) >= TODAY);
    const leads = cs.reduce((s, c) => s + (c.leads || 0), 0);
    const pipeline = cs.reduce((s, c) => s + (c.pipeline || 0), 0);
    return { brands, progress, sent, total: launches.length, next, leads, pipeline, count: cs.length };
  };

  const initiativesSorted = useMemo(() => {
    if (!data) return [];
    const rank = (i) => { const n = rollup(i).next; return n ? parseISO(n.date).getTime() : 8e15; };
    return [...data.initiatives].sort((a, b) => rank(a) - rank(b));
  }, [data, off]);

  const move = (dir) => { const d = new Date(cursor); if (view === "month") d.setMonth(d.getMonth() + dir); else if (view === "week") d.setDate(d.getDate() + dir * 7); else d.setDate(d.getDate() + dir); setCursor(d); };
  const periodTitle = () => {
    if (view === "month") return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    if (view === "week") { const s = addDays(cursor, -cursor.getDay()), e = addDays(s, 6); const em = s.getMonth() === e.getMonth() ? "" : ` ${MONTHS[e.getMonth()].slice(0, 3)}`; return `Week of ${MONTHS[s.getMonth()].slice(0, 3)} ${s.getDate()} – ${em} ${e.getDate()}`; }
    return `${DOW[cursor.getDay()]}, ${MONTHS[cursor.getMonth()].slice(0, 3)} ${cursor.getDate()}`;
  };
  const utmString = (c) => `?utm_source=${c.utm.source}&utm_medium=${c.utm.medium}&utm_campaign=${c.sf}&utm_content=${c.utm.content}`;
  const doCopy = (t) => { try { navigator.clipboard.writeText(t); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1400); };

  if (!data) return <div className="root"><style>{CSS}</style><div className="page" style={{ padding: 60, textAlign: "center", color: "#A09E94" }}>Loading your campaigns…</div></div>;

  /* mutations */
  const saveBrand = (b) => { const ex = data.brands.some((x) => x.id === b.id); commit({ ...data, brands: ex ? data.brands.map((x) => x.id === b.id ? b : x) : [...data.brands, b] }); };
  const delBrand = (id) => { if (data.campaigns.some((c) => c.brand === id)) return; commit({ ...data, brands: data.brands.filter((b) => b.id !== id) }); };
  const saveInit = (i) => { const ex = data.initiatives.some((x) => x.id === i.id); commit({ ...data, initiatives: ex ? data.initiatives.map((x) => x.id === i.id ? i : x) : [...data.initiatives, i] }); };
  const attachToInit = (i, attachIds = []) => {
    const ex = data.initiatives.some((x) => x.id === i.id);
    const initiatives = ex ? data.initiatives.map((x) => x.id === i.id ? i : x) : [...data.initiatives, i];
    const campaigns = attachIds.length ? data.campaigns.map((c) => attachIds.includes(c.id) ? { ...c, initiativeId: i.id } : c) : data.campaigns;
    commit({ ...data, initiatives, campaigns });
  };
  const delInit = (id) => { commit({ ...data, initiatives: data.initiatives.filter((i) => i.id !== id), campaigns: data.campaigns.filter((c) => c.initiativeId !== id) }); setSel(null); };
  const saveCamp = (c) => { const ex = data.campaigns.some((x) => x.id === c.id); commit({ ...data, campaigns: ex ? data.campaigns.map((x) => x.id === c.id ? c : x) : [...data.campaigns, c] }); };
  const delCamp = (id) => { commit({ ...data, campaigns: data.campaigns.filter((c) => c.id !== id) }); setSel(null); };
  const resetAll = () => { if (confirm("Reset everything back to sample data?")) commit(seed()); };

  const Chip = ({ ev }) => { const b = brandMap[ev.campaign.brand]; const l = ev.type === "launch"; return (
    <button className="chip" onClick={() => setSel({ kind: "campaign", id: ev.campaign.id })} style={{ background: l ? b.tint : "transparent", color: b.text, border: l ? `0.5px solid ${b.dot}55` : `1px dashed ${b.dot}aa` }} title={`${ev.campaign.name} — ${l ? "launch" : "comp due"}`}>
      {l ? <Send size={11} /> : <Palette size={11} />}<span className="chip-t">{ev.label}</span></button>); };

  const MonthView = () => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const start = addDays(first, -first.getDay());
    const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
    return (<div><div className="dow-row">{DOW.map((d) => <div key={d} className="dow-cell">{d}</div>)}</div>
      <div className="grid">{cells.map((d, i) => { const out = d.getMonth() !== cursor.getMonth(); const today = sameDay(d, TODAY); const evs = eventsByDay[key(d)] || [];
        return (<div key={i} className={`cell${out ? " out" : ""}${today ? " today" : ""}`}>
          <div className="daynum">{d.getDate()}{today && <span className="today-pill">today</span>}</div>
          {evs.slice(0, 3).map((ev, j) => <Chip key={j} ev={ev} />)}{evs.length > 3 && <div className="more">+{evs.length - 3} more</div>}</div>); })}</div></div>);
  };
  const WeekView = () => { const start = addDays(cursor, -cursor.getDay()); const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (<div className="grid week">{days.map((d, i) => { const today = sameDay(d, TODAY); const evs = eventsByDay[key(d)] || [];
      return (<div key={i} className={`cell wk${today ? " today" : ""}`}><div className="daynum">{DOW[d.getDay()]} {d.getDate()}{today && <span className="today-pill">today</span>}</div>{evs.map((ev, j) => <Chip key={j} ev={ev} />)}</div>); })}</div>); };
  const DayView = () => { const evs = (eventsByDay[key(cursor)] || []).slice().sort((a, b) => a.type.localeCompare(b.type));
    if (!evs.length) return <div className="empty"><CalendarDays size={26} /><p>Nothing scheduled this day.</p></div>;
    return (<div className="agenda">{evs.map((ev, i) => { const b = brandMap[ev.campaign.brand]; return (
      <button key={i} className="agenda-row" onClick={() => setSel({ kind: "campaign", id: ev.campaign.id })}>
        <span className="agenda-bar" style={{ background: b.dot }} /><span className="agenda-ic" style={{ color: b.text, background: b.tint }}>{ev.type === "launch" ? <Send size={14} /> : <Palette size={14} />}</span>
        <span className="agenda-body"><span className="agenda-title">{ev.campaign.name}</span><span className="agenda-sub">{b.label} · {ev.type === "launch" ? "Launch" : "Comp review due"}</span></span></button>); })}</div>); };

  const metaLine = (r) => { const p = []; if (showLeads) p.push(`${r.leads} leads`); if (showMoney) p.push(fmtMoney(r.pipeline)); if (!p.length) p.push(`${r.count} campaign${r.count !== 1 ? "s" : ""}`); return p.join(" · "); };

  const ql = q.trim().toLowerCase();
  const campMatch = (c) => [c.name, c.brand, brandMap[c.brand]?.label, c.channel, c.vendor, c.segment, c.owner, c.sf, c.utm?.content].some((v) => (v || "").toLowerCase().includes(ql));
  const initMatch = (i) => [i.name, i.owner, i.status].some((v) => (v || "").toLowerCase().includes(ql)) || campsOf(i.id).some(campMatch);
  const visibleInits = ql ? initiativesSorted.filter(initMatch) : initiativesSorted;
  const matchedCamps = ql ? data.campaigns.filter(campMatch) : [];

  return (<div className="root"><style>{CSS}</style>
    <header className="appbar">
      <div className="brandmark"><span className="logo">W</span><div><div className="app-name">Content Tracker</div><div className="app-sub">Wenger B2B · 2026</div></div></div>
      <div className="role">
        <ShieldCheck size={15} />
        <select value={role} onChange={(e) => setRole(e.target.value)} title="Login is simulated here — real accounts come with Supabase">
          <option value="admin">Admin · Mark</option><option value="viewer">Viewer · internal</option><option value="jmc">JMC · external</option>
        </select>
      </div>
    </header>

    {role === "jmc" && <div className="banner"><Eye size={13} /> JMC external view — financial columns are hidden</div>}
    {!storeOk && <div className="banner warn"><Lock size={13} /> Saved changes aren't persisting in this environment — edits last for the session only</div>}

    <main className="page">
      <div className="toolbar">
        <div className="nav"><button className="iconbtn" onClick={() => move(-1)} aria-label="prev"><ChevronLeft size={18} /></button>
          <div className="period">{periodTitle()}</div><button className="iconbtn" onClick={() => move(1)} aria-label="next"><ChevronRight size={18} /></button>
          <button className="todaybtn" onClick={() => setCursor(new Date(2026, 5, 8))}>Today</button></div>
        <div className="seg">{["day", "week", "month"].map((v) => <button key={v} className={`seg-btn${view === v ? " on" : ""}`} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
      </div>

      <div className="legend">
        <div className="legend-brands">{data.brands.map((b) => <button key={b.id} className={`lchip${off[b.id] ? " off" : ""}`} onClick={() => setOff((o) => ({ ...o, [b.id]: !o[b.id] }))}><span className="sw" style={{ background: b.dot }} />{b.label}</button>)}
          <button className="lchip add" onClick={() => setModal({ type: "brand" })}><Plus size={13} /> Brand</button></div>
        <div className="legend-key"><span><Send size={12} /> launch</span><span><Palette size={12} /> comp due</span></div>
      </div>

      <section className="card calcard">{view === "month" && <MonthView />}{view === "week" && <WeekView />}{view === "day" && <DayView />}</section>

      <div className="sec-head"><h2 className="h2">Initiatives <span className="count">{data.initiatives.length}</span></h2>
        <div className="sec-actions">
          <button className="ghostbtn" onClick={() => setModal({ type: "campaign" })}><Plus size={14} /> Campaign</button>
          <button className="ghostbtn primary" onClick={() => setModal({ type: "initiative" })}><Plus size={14} /> Initiative</button>
        </div></div>

      <div className="searchbar"><Search size={15} className="search-ic" />
        <input className="searchin" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search initiatives and campaigns — name, brand, vendor, segment, SF code, UTM…" />
        {q && <button className="clearbtn" onClick={() => setQ("")} aria-label="clear"><X size={14} /></button>}
      </div>
      {ql && <div className="searchmeta">{visibleInits.length} initiative{visibleInits.length !== 1 ? "s" : ""} · {matchedCamps.length} campaign{matchedCamps.length !== 1 ? "s" : ""} match “{q.trim()}”</div>}

      {ql && matchedCamps.length > 0 && (<div className="matchstrip">
        {matchedCamps.slice(0, 6).map((c) => { const b = brandMap[c.brand]; const pi = data.initiatives.find((i) => i.id === c.initiativeId); return (
          <button key={c.id} className="match" onClick={() => setSel({ kind: "campaign", id: c.id })}>
            <span className="sw" style={{ background: b?.dot }} /><span className="match-name">{c.name}</span>
            <span className="match-sub">{pi?.name}</span><Arrow size={12} /></button>); })}
        {matchedCamps.length > 6 && <div className="match-more">+{matchedCamps.length - 6} more campaigns</div>}
      </div>)}

      <div className="cards">{visibleInits.map((init, i) => { const r = rollup(init); const st = STATUS[init.status] || STATUS.Planning; const bs = r.brands.map((id) => brandMap[id]).filter(Boolean);
        return (<button key={init.id} className="icard" style={{ animationDelay: `${i * 45}ms` }} onClick={() => setSel({ kind: "initiative", id: init.id })}>
          <span className="icard-bar">{(bs.length ? bs : [{ dot: "#D8D5CC" }]).map((b, k) => <span key={k} style={{ background: b.dot, flex: 1 }} />)}</span>
          <div className="icard-head"><span className="dots">{(bs.length ? bs : [{ dot: "#D8D5CC" }]).map((b, k) => <span key={k} className="sw" style={{ background: b.dot }} />)}</span>
            <span className="icard-name">{init.name}</span><span className="status" style={{ background: st.bg, color: st.fg }}>{init.status}</span></div>
          {bs.length > 1 && <div className="cobrand"><Layers size={11} /> co-branded · {bs.map((b) => b.label).join(" + ")}</div>}
          <div className="track"><span className="fill" style={{ width: `${Math.round(r.progress * 100)}%`, background: bs[0]?.dot || "#999" }} /></div>
          <div className="icard-foot"><div className="icard-meta"><div className="m1">{r.next ? `${r.next.label} · ${prettyDate(r.next.date)}` : "Complete"}</div>
            <div className="m2">{r.total ? `${r.sent} of ${r.total} sent · ` : ""}{metaLine(r)}</div></div>
            <span className="avi" title={init.owner}>{init.owner.split(" ").map((w) => w[0]).slice(0, 2).join("") || "—"}</span></div></button>); })}{!visibleInits.length && <div className="empty sm">No initiatives match “{q.trim()}”.</div>}</div>

      <div className="footer"><button className="linkbtn" onClick={resetAll}>Reset to sample data</button></div>
    </main>

    {/* ---------------- drawer ---------------- */}
    {sel && (() => {
      const init = sel.kind === "initiative" ? data.initiatives.find((i) => i.id === sel.id) : null;
      const camp = sel.kind === "campaign" ? data.campaigns.find((c) => c.id === sel.id) : null;
      if (!init && !camp) return null;
      const headBrand = camp ? brandMap[camp.brand] : null;
      const r = init ? rollup(init) : null;
      const st = STATUS[(init ? init.status : null)] || null;
      return (<div className="scrim" onClick={() => setSel(null)}><aside className="drawer" onClick={(e) => e.stopPropagation()}>
        {camp && (<>
          <div className="drawer-top" style={{ background: headBrand.tint }}>
            <div className="drawer-brand" style={{ color: headBrand.text }}><span className="sw" style={{ background: headBrand.dot }} />{headBrand.label}</div>
            <div className="dt-actions"><button className="iconbtn ghost" onClick={() => setModal({ type: "campaign", editId: camp.id })} aria-label="edit"><Pencil size={15} /></button>
              <button className="iconbtn ghost" onClick={() => { if (confirm(`Delete campaign “${camp.name}”?`)) delCamp(camp.id); }} aria-label="delete"><Trash2 size={15} /></button>
              <button className="iconbtn ghost" onClick={() => setSel(null)} aria-label="close"><X size={18} /></button></div></div>
          <div className="drawer-body">
            <button className="crumb" onClick={() => setSel({ kind: "initiative", id: camp.initiativeId })}><Arrow size={12} /> {data.initiatives.find((i) => i.id === camp.initiativeId)?.name}</button>
            <div className="drawer-name">{camp.name}</div>
            <div className="facts">
              <Fact ic={<Tag size={14} />} k="Channel" v={camp.channel} /><Fact ic={<Building2 size={14} />} k="Vendor" v={camp.vendor} />
              <Fact ic={<Users size={14} />} k="Segment" v={camp.segment} /><Fact ic={<Mail size={14} />} k="Owner" v={camp.owner} />
              <Fact ic={<Target size={14} />} k="SF code" v={camp.sf} mono />
              {showLeads && <Fact ic={<Users size={14} />} k="Leads" v={String(camp.leads || 0)} />}
              {showMoney && <Fact ic={<Target size={14} />} k="Pipeline" v={fmtMoney(camp.pipeline)} />}
            </div>
            <div className="sec-label">Timeline</div>
            <div className="timeline">{camp.events.slice().sort((a, b) => a.date.localeCompare(b.date)).map((ev, i) => (
              <div key={i} className="tl-row"><span className="tl-ic" style={{ color: headBrand.text, background: headBrand.tint }}>{ev.type === "launch" ? <Send size={12} /> : <Palette size={12} />}</span>
                <span className="tl-date">{ev.date}</span><span className="tl-type">{ev.type === "launch" ? "Launch" : "Comp review due"}</span></div>))}</div>
            <div className="sec-label">UTM query string <span className="auto">auto-assembled</span></div>
            <div className="utm"><code>{utmString(camp)}</code><button className="copybtn" onClick={() => doCopy(utmString(camp))}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button></div>
            <div className="utm-note"><Lock size={11} /> source · medium · campaign · content resolve from Vendor, Channel & SF code</div>
          </div></>)}
        {init && (<>
          <div className="drawer-top" style={{ background: "#F2F0EA" }}>
            <div className="drawer-brand"><span className="dots">{r.brands.map((id) => <span key={id} className="sw" style={{ background: brandMap[id]?.dot }} />)}</span>{r.brands.length > 1 ? "Co-branded initiative" : (brandMap[r.brands[0]]?.label || "Initiative")}</div>
            <div className="dt-actions"><button className="iconbtn ghost" onClick={() => setModal({ type: "initiative", editId: init.id })} aria-label="edit"><Pencil size={15} /></button>
              <button className="iconbtn ghost" onClick={() => { if (confirm(`Delete “${init.name}” and its ${r.count} campaign(s)?`)) delInit(init.id); }} aria-label="delete"><Trash2 size={15} /></button>
              <button className="iconbtn ghost" onClick={() => setSel(null)} aria-label="close"><X size={18} /></button></div></div>
          <div className="drawer-body">
            <div className="drawer-name">{init.name}</div>
            <span className="status" style={{ background: st.bg, color: st.fg }}>{init.status}</span>
            <div className="facts"><Fact ic={<Mail size={14} />} k="Owner" v={init.owner} />
              <Fact ic={<Send size={14} />} k="Progress" v={`${r.sent} of ${r.total} sent`} />
              {showLeads && <Fact ic={<Users size={14} />} k="Leads" v={String(r.leads)} />}
              {showMoney && <Fact ic={<Target size={14} />} k="Pipeline" v={fmtMoney(r.pipeline)} />}</div>
            <div className="sec-label">Campaigns <span className="auto" style={{ background: "#EEEDE7", color: "#6B6A63" }}>{r.count}</span>
              <button className="mini-add" onClick={() => setModal({ type: "campaign", presetInitiative: init.id })}><Plus size={12} /> add</button></div>
            <div className="childlist">{campsOf(init.id).map((c) => { const b = brandMap[c.brand]; return (
              <button key={c.id} className="child" onClick={() => setSel({ kind: "campaign", id: c.id })}>
                <span className="sw" style={{ background: b?.dot }} /><span className="child-name">{c.name}</span>
                <span className="child-sub">{c.channel}{showMoney ? ` · ${fmtMoney(c.pipeline)}` : ""}</span><Arrow size={13} /></button>); })}
              {!r.count && <div className="empty sm">No campaigns yet.</div>}</div>
          </div></>)}
      </aside></div>); })()}

    {/* ---------------- modals ---------------- */}
    {modal?.type === "brand" && <BrandModal data={data} onClose={() => setModal(null)} onSave={saveBrand} onDelete={delBrand} />}
    {modal?.type === "initiative" && <InitiativeModal init={modal.editId ? data.initiatives.find((i) => i.id === modal.editId) : null} data={data} onClose={() => setModal(null)} onSave={(i, attach) => { attachToInit(i, attach); setModal(null); }} />}
    {modal?.type === "campaign" && <CampaignModal data={data} camp={modal.editId ? data.campaigns.find((c) => c.id === modal.editId) : null} preset={modal.presetInitiative} onClose={() => setModal(null)} onSave={(c) => { saveCamp(c); setModal(null); }} />}
  </div>);
}

const Fact = ({ ic, k, v, mono }) => (<div className="fact"><span className="fact-ic">{ic}</span><span className="fact-k">{k}</span><span className={`fact-v${mono ? " mono" : ""}`}>{v}</span></div>);

/* ============================ modals ============================ */
function Modal({ title, children, onClose, footer }) {
  return (<div className="scrim center" onClick={onClose}><div className="modal" onClick={(e) => e.stopPropagation()}>
    <div className="modal-head"><span>{title}</span><button className="iconbtn ghost" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-body">{children}</div><div className="modal-foot">{footer}</div></div></div>);
}
const Field = ({ label, children }) => <label className="field"><span className="lbl">{label}</span>{children}</label>;

function BrandModal({ data, onClose, onSave, onDelete }) {
  const [label, setLabel] = useState(""); const [dot, setDot] = useState("#6B3FA0");
  const add = () => { if (!label.trim()) return; const id = slug(label) || uid(); onSave({ id, label: label.trim(), dot, tint: tintOf(dot), text: textOf(dot) }); setLabel(""); };
  return (<Modal title="Brands" onClose={onClose} footer={<><span /><button className="btn primary" onClick={add}>Add brand</button></>}>
    <Field label="Brand name"><input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Wenger Rental" /></Field>
    <Field label="Color"><div className="swatches">{SWATCHES.map((s) => <button key={s} className={`swbtn${dot === s ? " on" : ""}`} style={{ background: s }} onClick={() => setDot(s)} />)}
      <input type="color" value={dot} onChange={(e) => setDot(e.target.value)} className="colorin" /></div></Field>
    <div className="preview"><span className="chip" style={{ background: tintOf(dot), color: textOf(dot), border: `0.5px solid ${dot}55` }}><Send size={11} />{label || "Preview"}</span></div>
    <div className="sec-label" style={{ marginTop: 18 }}>Existing</div>
    <div className="brandlist">{data.brands.map((b) => { const used = data.campaigns.some((c) => c.brand === b.id); return (
      <div key={b.id} className="brow"><span className="sw" style={{ background: b.dot }} /><span style={{ flex: 1 }}>{b.label}</span>
        <button className="iconbtn ghost" disabled={used} title={used ? "In use by campaigns" : "Delete"} onClick={() => onDelete(b.id)}><Trash2 size={14} /></button></div>); })}</div>
  </Modal>);
}

function InitiativeModal({ init, data, onClose, onSave }) {
  const id = useMemo(() => init?.id || uid(), [init]);
  const [name, setName] = useState(init?.name || ""); const [owner, setOwner] = useState(init?.owner || ""); const [status, setStatus] = useState(init?.status || "Planning");
  const [cq, setCq] = useState(""); const [attach, setAttach] = useState([]);
  const bMap = useMemo(() => { const m = {}; data.brands.forEach((b) => (m[b.id] = b)); return m; }, [data]);
  const isOrphan = (c) => !data.initiatives.some((i) => i.id === c.initiativeId);
  const members = data.campaigns.filter((c) => c.initiativeId === id);
  const orphanCount = data.campaigns.filter(isOrphan).length;
  const cql = cq.trim().toLowerCase();
  const pool = data.campaigns.filter((c) => c.initiativeId !== id);
  const candidates = (cql
    ? pool.filter((c) => [c.name, bMap[c.brand]?.label, c.channel, c.vendor, c.sf].some((v) => (v || "").toLowerCase().includes(cql)))
    : pool.filter(isOrphan)
  ).sort((a, b) => (isOrphan(b) ? 1 : 0) - (isOrphan(a) ? 1 : 0));
  const toggle = (cid) => setAttach((a) => a.includes(cid) ? a.filter((x) => x !== cid) : [...a, cid]);
  const save = () => { if (!name.trim()) return; onSave({ id, name: name.trim(), owner: owner.trim() || "Unassigned", status }, attach); };
  return (<Modal title={init ? "Edit initiative" : "New initiative"} onClose={onClose} footer={<><span className="hint">{attach.length ? `${attach.length} campaign${attach.length !== 1 ? "s" : ""} will move here` : "Brand-agnostic · brands come from its campaigns"}</span><button className="btn primary" onClick={save}>{init ? "Save" : "Create"}</button></>}>
    <Field label="Initiative name"><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Back-to-School push" /></Field>
    <div className="grid2">
      <Field label="Owner"><input className="inp" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Whitney Winkels" /></Field>
      <Field label="Status"><select className="inp" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_OPTS.map((s) => <option key={s}>{s}</option>)}</select></Field>
    </div>
    {members.length > 0 && (<>
      <div className="sec-label" style={{ marginTop: 6 }}>Campaigns here <span className="auto" style={{ background: "#EEEDE7", color: "#6B6A63" }}>{members.length}</span></div>
      <div className="picklist">{members.map((c) => <div key={c.id} className="pickrow static"><span className="sw" style={{ background: bMap[c.brand]?.dot }} /><span className="pick-name">{c.name}</span></div>)}</div>
    </>)}
    <div className="sec-label">Find &amp; attach campaigns{orphanCount > 0 && <span className="auto" style={{ background: "#FBEFD6", color: "#8A5A0B" }}>{orphanCount} orphan{orphanCount !== 1 ? "s" : ""}</span>}</div>
    <div className="searchbar sm"><Search size={14} className="search-ic" /><input className="searchin" value={cq} onChange={(e) => setCq(e.target.value)} placeholder="Search campaigns to pull in…" />{cq && <button className="clearbtn" onClick={() => setCq("")} aria-label="clear"><X size={13} /></button>}</div>
    <div className="picklist scroll">{candidates.length === 0 && <div className="empty sm">{cql ? "No campaigns match." : "No orphan campaigns. Search to move one here."}</div>}
      {candidates.map((c) => { const on = attach.includes(c.id); const orph = isOrphan(c); const pi = data.initiatives.find((i) => i.id === c.initiativeId);
        return (<button key={c.id} className={`pickrow${on ? " on" : ""}`} onClick={() => toggle(c.id)}>
          <span className="sw" style={{ background: bMap[c.brand]?.dot }} /><span className="pick-name">{c.name}</span>
          {orph ? <span className="orphan-tag">orphan</span> : <span className="pick-sub">{pi?.name}</span>}
          <span className="pick-check">{on ? <Check size={14} /> : <Plus size={14} />}</span></button>); })}</div>
  </Modal>);
}

function CampaignModal({ data, camp, preset, onClose, onSave }) {
  const editing = !!camp;
  const [initiativeId, setInit] = useState(camp?.initiativeId || preset || data.initiatives[0]?.id || "");
  const [iq, setIq] = useState("");
  const [brand, setBrand] = useState(camp?.brand || data.brands[0]?.id || "");
  const [name, setName] = useState(camp?.name || ""); const [channel, setChannel] = useState(camp?.channel || "Email");
  const [vendor, setVendor] = useState(camp?.vendor || "N/A (Owned)"); const [segment, setSegment] = useState(camp?.segment || "");
  const [owner, setOwner] = useState(camp?.owner || ""); const [sf, setSf] = useState(camp?.sf || "");
  const [content, setContent] = useState(camp?.utm?.content || ""); const [launch, setLaunch] = useState("");
  const [autoComp, setAutoComp] = useState(true); const [comp, setComp] = useState("");
  const source = deriveSource(vendor, channel), medium = deriveMedium(channel);
  const compAuto = useMemo(() => { if (!launch) return ""; return key(addDays(parseISO(launch), -10)); }, [launch]);
  const compVal = autoComp ? compAuto : comp;
  const preview = `?utm_source=${source}&utm_medium=${medium}&utm_campaign=${sf || "SF-CODE"}&utm_content=${content || "content"}`;

  const save = () => {
    if (!name.trim() || !initiativeId || !brand) return;
    let events = camp?.events || [];
    if (!editing) { events = []; if (launch) events.push({ type: "launch", date: launch, label: name.trim().slice(0, 22) }); if (compVal) events.push({ type: "comp", date: compVal, label: name.trim().slice(0, 16) + " comp" }); }
    onSave({ id: camp?.id || uid(), initiativeId, brand, name: name.trim(), channel, vendor, segment: segment.trim(), owner: owner.trim() || "Unassigned", sf: sf.trim(), utm: { source, medium, content: content.trim() }, leads: camp?.leads || 0, pipeline: camp?.pipeline || 0, events });
  };
  return (<Modal title={editing ? "Edit campaign" : "New campaign"} onClose={onClose} footer={<><span className="hint">{editing ? "Sends stay as-is — edit dates in the grid step" : "Brand lives on the campaign"}</span><button className="btn primary" onClick={save}>{editing ? "Save" : "Create"}</button></>}>
    <Field label="Initiative">
      <div className="searchbar sm"><Search size={14} className="search-ic" /><input className="searchin" value={iq} onChange={(e) => setIq(e.target.value)} placeholder="Search initiatives…" />{iq && <button className="clearbtn" onClick={() => setIq("")} aria-label="clear"><X size={13} /></button>}</div>
      <div className="picklist scroll sm">{data.initiatives.filter((i) => !iq.trim() || [i.name, i.owner, i.status].some((v) => (v || "").toLowerCase().includes(iq.trim().toLowerCase()))).map((i) => (
        <button key={i.id} className={`pickrow${initiativeId === i.id ? " on" : ""}`} onClick={() => setInit(i.id)}><span className="pick-name">{i.name}</span><span className="pick-sub">{i.owner}</span><span className="pick-check">{initiativeId === i.id ? <Check size={14} /> : null}</span></button>))}
        {data.initiatives.filter((i) => !iq.trim() || [i.name, i.owner, i.status].some((v) => (v || "").toLowerCase().includes(iq.trim().toLowerCase()))).length === 0 && <div className="empty sm">No initiatives match.</div>}</div>
      <div className="pick-current">Selected: {data.initiatives.find((i) => i.id === initiativeId)?.name || "—"}</div>
    </Field>
    <Field label="Brand"><select className="inp" value={brand} onChange={(e) => setBrand(e.target.value)}>{data.brands.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}</select></Field>
    <Field label="Campaign name"><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PUPN — Wenger feature" /></Field>
    <div className="grid2">
      <Field label="Channel"><select className="inp" value={channel} onChange={(e) => setChannel(e.target.value)}>{["Email", "Email Sponsorship", "Banner Ads", "Search Ads", "Webinar", "Social", "Newsletter"].map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Vendor"><input className="inp" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="NAfME, LinkedIn, N/A (Owned)…" /></Field>
    </div>
    <div className="grid2"><Field label="Segment"><input className="inp" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="semicolon for multi" /></Field>
      <Field label="Owner"><input className="inp" value={owner} onChange={(e) => setOwner(e.target.value)} /></Field></div>
    <div className="grid2"><Field label="SF campaign code"><input className="inp mono" value={sf} onChange={(e) => setSf(e.target.value)} placeholder="WEN-2026-…" /></Field>
      <Field label="utm_content"><input className="inp mono" value={content} onChange={(e) => setContent(e.target.value)} placeholder="wave1-urgency" /></Field></div>
    {!editing && (<div className="grid2">
      <Field label="Launch date"><input type="date" className="inp" value={launch} onChange={(e) => setLaunch(e.target.value)} /></Field>
      <Field label={<span className="lblrow">Comp due <button className="toggle" onClick={() => setAutoComp((a) => !a)}>{autoComp ? "auto −10d" : "manual"}</button></span>}>
        {autoComp ? <input className="inp" value={compAuto} readOnly placeholder="set launch first" /> : <input type="date" className="inp" value={comp} onChange={(e) => setComp(e.target.value)} />}</Field></div>)}
    <div className="sec-label" style={{ marginTop: 6 }}>UTM preview <span className="auto">live</span></div>
    <div className="utm small"><code>{preview}</code></div>
  </Modal>);
}

/* ============================ styles ============================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; }
.root { font-family: 'Hanken Grotesk', system-ui, sans-serif; color: #1B1B19; background: #FAFAF7; min-height: 100vh; -webkit-font-smoothing: antialiased; }
.mono, code, .fact-v.mono, .inp.mono { font-family: 'IBM Plex Mono', monospace; }
.appbar { display: flex; align-items: center; justify-content: space-between; padding: 13px 22px; background: #fff; border-bottom: 1px solid #ECEAE3; position: sticky; top: 0; z-index: 6; }
.brandmark { display: flex; align-items: center; gap: 11px; }
.logo { width: 32px; height: 32px; border-radius: 8px; background: #1C3B66; color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.app-name { font-weight: 600; font-size: 15px; letter-spacing: -0.01em; } .app-sub { font-size: 11px; color: #8A887F; }
.role { display: flex; align-items: center; gap: 7px; color: #6B6A63; background: #F4F2EC; border: 1px solid #ECEAE3; border-radius: 9px; padding: 5px 10px; }
.role select { border: none; background: transparent; font: inherit; font-size: 13px; font-weight: 500; color: #1B1B19; cursor: pointer; outline: none; }
.banner { display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 12.5px; padding: 8px; background: #EEF3F9; color: #2A4A6B; border-bottom: 1px solid #DCE6F1; }
.banner.warn { background: #FBEFD6; color: #8A5A0B; border-color: #F0DDB0; }
.page { max-width: 1080px; margin: 0 auto; padding: 22px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
.nav { display: flex; align-items: center; gap: 8px; } .period { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; min-width: 150px; }
.iconbtn { width: 32px; height: 32px; border: 1px solid #E4E1D9; background: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4A4A45; transition: .15s; }
.iconbtn:hover { background: #F2F0EA; border-color: #D5D1C7; } .iconbtn.ghost { border: none; background: transparent; } .iconbtn:disabled { opacity: .3; cursor: default; }
.todaybtn { margin-left: 4px; padding: 6px 13px; border: 1px solid #E4E1D9; background: #fff; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; } .todaybtn:hover { background: #F2F0EA; }
.seg { display: inline-flex; background: #EEEDE7; border-radius: 9px; padding: 3px; }
.seg-btn { border: none; background: transparent; padding: 6px 15px; border-radius: 7px; font: inherit; font-size: 13px; font-weight: 500; color: #6B6A63; cursor: pointer; transition: .15s; }
.seg-btn.on { background: #fff; color: #1B1B19; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
.legend { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px; }
.legend-brands { display: flex; flex-wrap: wrap; gap: 7px; }
.lchip { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border: 1px solid #E4E1D9; background: #fff; border-radius: 20px; font: inherit; font-size: 12.5px; cursor: pointer; transition: .15s; }
.lchip:hover { border-color: #CFCBC0; } .lchip.off { opacity: .38; } .lchip.add { color: #6B6A63; border-style: dashed; }
.sw { width: 10px; height: 10px; border-radius: 3px; flex: none; }
.legend-key { display: flex; gap: 14px; font-size: 12px; color: #8A887F; } .legend-key span { display: inline-flex; align-items: center; gap: 5px; }
.card { background: #fff; border: 1px solid #ECEAE3; border-radius: 14px; padding: 16px; } .calcard { margin-bottom: 26px; }
.dow-row { display: grid; grid-template-columns: repeat(7,1fr); gap: 7px; margin-bottom: 8px; }
.dow-cell { font-size: 11.5px; font-weight: 500; color: #A09E94; text-align: center; text-transform: uppercase; letter-spacing: .04em; }
.grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 7px; } .grid.week { grid-auto-rows: minmax(120px,auto); }
.cell { border: 1px solid #F0EEE7; border-radius: 9px; padding: 6px; min-height: 92px; background: #fff; overflow: hidden; }
.cell.wk { min-height: 120px; } .cell.out { background: #FAF9F5; opacity: .55; } .cell.today { border-color: #1C3B66; box-shadow: inset 0 0 0 1px #1C3B66; }
.daynum { font-size: 12.5px; font-weight: 600; color: #6B6A63; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; } .today .daynum { color: #1C3B66; }
.today-pill { font-size: 9.5px; font-weight: 600; background: #1C3B66; color: #fff; padding: 1px 6px; border-radius: 10px; }
.chip { display: flex; align-items: center; gap: 4px; width: 100%; font: inherit; font-size: 11px; font-weight: 500; padding: 3px 6px; border-radius: 7px; margin-top: 4px; cursor: pointer; text-align: left; transition: .12s; }
.chip:hover { filter: brightness(.96); transform: translateX(1px); } .chip-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.more { font-size: 10.5px; color: #A09E94; margin-top: 4px; padding-left: 3px; }
.empty { text-align: center; color: #A09E94; padding: 36px 12px; } .empty.sm { padding: 16px; font-size: 13px; } .empty p { font-size: 13.5px; margin-top: 8px; }
.agenda { display: flex; flex-direction: column; }
.agenda-row { display: flex; align-items: center; gap: 12px; padding: 13px 6px; border: none; border-bottom: 1px solid #F0EEE7; background: transparent; font: inherit; cursor: pointer; text-align: left; transition: .12s; }
.agenda-row:hover { background: #FAF9F5; } .agenda-bar { width: 3px; align-self: stretch; border-radius: 3px; }
.agenda-ic { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex: none; }
.agenda-title { font-size: 14px; font-weight: 500; display: block; } .agenda-sub { font-size: 12px; color: #8A887F; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin: 0 0 12px; }
.h2 { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; margin: 0; display: flex; align-items: center; gap: 8px; }
.count { font-size: 12px; font-weight: 600; color: #8A887F; background: #EEEDE7; border-radius: 20px; padding: 1px 9px; }
.sec-actions { display: flex; gap: 8px; }
.ghostbtn { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #E4E1D9; background: #fff; border-radius: 9px; padding: 7px 13px; font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: .15s; }
.ghostbtn:hover { background: #F2F0EA; border-color: #D5D1C7; } .ghostbtn.primary { background: #1C3B66; color: #fff; border-color: #1C3B66; } .ghostbtn.primary:hover { background: #163052; }
.cards { display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 13px; }
.icard { position: relative; text-align: left; background: #fff; border: 1px solid #ECEAE3; border-radius: 14px; padding: 15px 16px 14px 19px; cursor: pointer; font: inherit; overflow: hidden; transition: .16s; opacity: 0; transform: translateY(6px); animation: rise .4s ease forwards; }
@keyframes rise { to { opacity: 1; transform: none; } }
.icard:hover { border-color: #D5D1C7; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.05); }
.icard-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; display: flex; flex-direction: column; }
.icard-head { display: flex; align-items: center; gap: 8px; } .dots { display: inline-flex; gap: 3px; }
.icard-name { font-size: 14px; font-weight: 600; flex: 1; letter-spacing: -0.01em; }
.status { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 7px; white-space: nowrap; }
.cobrand { font-size: 11px; color: #8A887F; display: flex; align-items: center; gap: 5px; margin-top: 7px; }
.track { height: 6px; border-radius: 4px; background: #EFEDE6; overflow: hidden; margin: 11px 0 10px; } .fill { display: block; height: 100%; border-radius: 4px; }
.icard-foot { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.m1 { font-size: 12.5px; color: #4A4A45; font-weight: 500; } .m2 { font-size: 12px; color: #A09E94; margin-top: 2px; }
.avi { width: 28px; height: 28px; border-radius: 50%; background: #F0EEE7; color: #6B6A63; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex: none; }
.footer { margin-top: 22px; text-align: center; } .linkbtn { border: none; background: none; color: #A09E94; font: inherit; font-size: 12.5px; cursor: pointer; text-decoration: underline; }
.scrim { position: fixed; inset: 0; background: rgba(20,18,14,.34); display: flex; justify-content: flex-end; z-index: 20; animation: fade .2s ease; } .scrim.center { align-items: center; justify-content: center; }
@keyframes fade { from { opacity: 0; } }
.drawer { width: 412px; max-width: 92vw; background: #fff; height: 100%; overflow-y: auto; animation: slide .24s cubic-bezier(.2,.7,.3,1); } @keyframes slide { from { transform: translateX(30px); opacity: .6; } }
.drawer-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; } .dt-actions { display: flex; gap: 2px; }
.drawer-brand { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.drawer-body { padding: 18px; }
.crumb { display: inline-flex; align-items: center; gap: 4px; border: none; background: none; color: #8A887F; font: inherit; font-size: 12px; cursor: pointer; padding: 0; margin-bottom: 8px; } .crumb:hover { color: #1C3B66; }
.drawer-name { font-size: 21px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 9px; }
.facts { margin: 18px 0 6px; display: flex; flex-direction: column; gap: 1px; }
.fact { display: grid; grid-template-columns: 22px 78px 1fr; align-items: center; gap: 8px; padding: 9px 0; border-bottom: 1px solid #F2F0EA; font-size: 13px; }
.fact-ic { color: #A09E94; } .fact-k { color: #8A887F; } .fact-v { font-weight: 500; } .fact-v.mono { font-size: 12.5px; }
.sec-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #A09E94; margin: 22px 0 10px; display: flex; align-items: center; }
.auto { text-transform: none; letter-spacing: 0; font-weight: 500; color: #2E6B3E; background: #E7F1E6; padding: 1px 7px; border-radius: 6px; margin-left: 6px; }
.mini-add { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #E4E1D9; background: #fff; border-radius: 7px; padding: 3px 8px; font: inherit; font-size: 11px; color: #4A4A45; cursor: pointer; text-transform: none; letter-spacing: 0; } .mini-add:hover { background: #F2F0EA; }
.timeline { display: flex; flex-direction: column; gap: 2px; } .tl-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 13px; }
.tl-ic { width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex: none; }
.tl-date { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #6B6A63; min-width: 92px; } .tl-type { color: #4A4A45; }
.childlist { display: flex; flex-direction: column; gap: 6px; }
.child { display: flex; align-items: center; gap: 9px; border: 1px solid #F0EEE7; background: #fff; border-radius: 10px; padding: 10px 12px; font: inherit; cursor: pointer; text-align: left; transition: .12s; }
.child:hover { border-color: #D5D1C7; background: #FAF9F5; } .child-name { font-size: 13px; font-weight: 500; flex: 1; } .child-sub { font-size: 11.5px; color: #A09E94; }
.utm { display: flex; align-items: center; gap: 8px; background: #F7F6F2; border: 1px solid #ECEAE3; border-radius: 10px; padding: 11px 12px; } .utm.small { padding: 9px 11px; }
.utm code { font-size: 11.5px; color: #3A3A35; word-break: break-all; flex: 1; line-height: 1.5; }
.copybtn { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #E4E1D9; background: #fff; border-radius: 8px; padding: 6px 10px; font: inherit; font-size: 12px; cursor: pointer; flex: none; } .copybtn:hover { background: #F2F0EA; }
.utm-note { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #A09E94; margin-top: 9px; }
.modal { width: 540px; max-width: 94vw; max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 16px; animation: pop .2s ease; } @keyframes pop { from { transform: scale(.97); opacity: .6; } }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #ECEAE3; font-size: 16px; font-weight: 600; }
.modal-body { padding: 18px; } .modal-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 18px; border-top: 1px solid #ECEAE3; }
.hint { font-size: 11.5px; color: #A09E94; }
.field { display: block; margin-bottom: 14px; } .lbl { display: block; font-size: 12px; font-weight: 500; color: #6B6A63; margin-bottom: 6px; } .lblrow { display: flex; align-items: center; gap: 8px; }
.inp { width: 100%; height: 38px; border: 1px solid #E4E1D9; border-radius: 9px; padding: 0 11px; font: inherit; font-size: 13.5px; background: #fff; outline: none; transition: .15s; }
.inp:focus { border-color: #1C3B66; box-shadow: 0 0 0 3px rgba(28,59,102,.1); } select.inp { cursor: pointer; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.btn { border: 1px solid #E4E1D9; background: #fff; border-radius: 9px; padding: 9px 16px; font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; } .btn.primary { background: #1C3B66; color: #fff; border-color: #1C3B66; } .btn.primary:hover { background: #163052; }
.swatches { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.swbtn { width: 26px; height: 26px; border-radius: 7px; border: 2px solid transparent; cursor: pointer; } .swbtn.on { border-color: #1B1B19; box-shadow: 0 0 0 2px #fff inset; }
.colorin { width: 36px; height: 30px; border: 1px solid #E4E1D9; border-radius: 7px; background: none; cursor: pointer; padding: 2px; }
.preview { margin-top: 12px; width: 160px; }
.brandlist { display: flex; flex-direction: column; gap: 4px; } .brow { display: flex; align-items: center; gap: 9px; font-size: 13.5px; padding: 5px 0; }
.toggle { border: 1px solid #E4E1D9; background: #F4F2EC; border-radius: 6px; font: inherit; font-size: 11px; color: #6B6A63; padding: 2px 8px; cursor: pointer; }
.searchbar { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #E4E1D9; border-radius: 11px; padding: 0 12px; height: 42px; margin-bottom: 10px; transition: .15s; }
.searchbar:focus-within { border-color: #1C3B66; box-shadow: 0 0 0 3px rgba(28,59,102,.1); }
.search-ic { color: #A09E94; flex: none; }
.searchin { flex: 1; border: none; background: none; outline: none; font: inherit; font-size: 14px; color: #1B1B19; }
.clearbtn { border: none; background: #EEEDE7; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B6A63; flex: none; } .clearbtn:hover { background: #E4E1D9; }
.searchmeta { font-size: 12px; color: #8A887F; margin-bottom: 12px; }
.matchstrip { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.match { display: flex; align-items: center; gap: 9px; border: 1px solid #F0EEE7; background: #FBFAF6; border-radius: 10px; padding: 9px 12px; font: inherit; cursor: pointer; text-align: left; transition: .12s; } .match:hover { border-color: #D5D1C7; background: #fff; }
.match-name { font-size: 13px; font-weight: 500; } .match-sub { font-size: 11.5px; color: #A09E94; margin-left: auto; }
.match-more { font-size: 11.5px; color: #A09E94; padding-left: 4px; }
.searchbar.sm { height: 36px; margin-bottom: 8px; border-radius: 9px; }
.picklist { display: flex; flex-direction: column; gap: 5px; }
.picklist.scroll { max-height: 170px; overflow-y: auto; padding-right: 2px; }
.picklist.scroll.sm { max-height: 134px; }
.pickrow { display: flex; align-items: center; gap: 9px; border: 1px solid #F0EEE7; background: #fff; border-radius: 9px; padding: 8px 11px; font: inherit; cursor: pointer; text-align: left; transition: .12s; width: 100%; }
.pickrow:hover { border-color: #D5D1C7; background: #FAF9F5; }
.pickrow.on { border-color: #1C3B66; background: #EEF3F9; }
.pickrow.static { cursor: default; background: #FBFAF6; }
.pick-name { font-size: 13px; font-weight: 500; flex: 1; }
.pick-sub { font-size: 11.5px; color: #A09E94; }
.pick-check { color: #1C3B66; display: flex; align-items: center; flex: none; min-width: 14px; }
.orphan-tag { font-size: 10.5px; font-weight: 600; color: #8A5A0B; background: #FBEFD6; border-radius: 6px; padding: 1px 7px; }
.pick-current { font-size: 11.5px; color: #8A887F; margin-top: 7px; }
`;
