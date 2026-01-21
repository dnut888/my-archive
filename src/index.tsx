import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 Supabase 정보로 꼭 바꿔주세요!
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- States ---
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1a1a1a");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
  const [lineSize, setLineSize] = useState(16);
  const [night, setNight] = useState(false);

  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [keywords, setKeywords] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);

  // --- Database Sync ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchEntries();
    });
  }, []);

  const fetchEntries = async () => {
    const { data } = await supabase.from("entries").select("*");
    if (data) setEntries(data.map(d => ({ ...d.content, db_id: d.id, id: d.content.id || d.id })));
  };

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("접속 정보를 확인해주세요.");
    else { setUser(data.user); fetchEntries(); }
  };

  const save = async () => {
    if (!work || !date || !text) return;
    const payload = { work, date, time, character, text, comment, keywords: keywords.split(",").map(k => k.trim()).filter(Boolean) };
    if (editingId) {
      const target = entries.find(e => e.id === editingId);
      await supabase.from("entries").update({ content: { ...payload, favorite: target.favorite, id: editingId } }).eq('id', target.db_id);
    } else {
      await supabase.from("entries").insert([{ content: { ...payload, id: Date.now(), favorite: false }, user_id: user.id }]);
    }
    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment(""); setEditingId(null);
    fetchEntries();
  };

  const works = useMemo(() => Array.from(new Set(entries.map(e => e.work))).filter(Boolean), [entries]);
  const filtered = useMemo(() => {
    let base = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    if (onlyFavorite) base = base.filter(e => e.favorite);
    if (query) base = base.filter(e => [e.text, e.work].some(v => v?.toLowerCase().includes(query.toLowerCase())));
    return base;
  }, [entries, query, onlyFavorite]);

  const grouped = useMemo(() => filtered.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [filtered]);

  const activeBg = night ? "#111111" : bgColor;
  const activeText = night ? "#eeeeee" : textColor;

  // --- UI Components ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-8">
        <div className="w-full max-w-[340px] space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-light tracking-tighter" style={{ fontFamily: 'serif' }}>ARCHIVE</h1>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Private Collection</p>
          </div>
          <div className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent border-b border-gray-200 py-3 outline-none focus:border-black transition-colors" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent border-b border-gray-200 py-3 outline-none focus:border-black transition-colors" />
            <button onClick={handleLogin} className="w-full bg-black text-white py-4 rounded-full text-sm font-medium hover:bg-gray-800 transition-all mt-4">접속하기</button>
          </div>
        </div>
      </div>
    );
  }

  if (focusEntry) {
    return (
      <div onClick={() => setFocusEntry(null)} className="min-h-screen flex items-center justify-center p-12 cursor-zoom-out" style={{ background: activeBg, color: activeText, fontFamily: koreanFont }}>
        <div className="max-w-2xl text-center space-y-8">
          <p className="text-2xl md:text-3xl leading-relaxed font-light">{focusEntry.text}</p>
          <div className="text-xs opacity-40 tracking-widest uppercase">{focusEntry.work} — {focusEntry.character}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        body { margin: 0; -webkit-font-smoothing: antialiased; }
        input::placeholder, textarea::placeholder { opacity: 0.3; }
      `}</style>

      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <header className="flex justify-between items-end mb-16">
          <h1 className="text-4xl font-light tracking-tighter" style={{ fontFamily: 'serif' }}>ARCHIVE</h1>
          <nav className="flex gap-6 text-[11px] uppercase tracking-[0.2em] font-medium opacity-60">
            <button onClick={() => setMode("write")} className={mode === "write" ? "opacity-100 border-b border-current" : ""}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "opacity-100 border-b border-current" : ""}>List</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "opacity-100 border-b border-current" : ""}>Set</button>
          </nav>
        </header>

        {mode === "write" && (
          <div className="space-y-10 animate-in fade-in duration-700">
            <input list="works" placeholder="WORK TITLE" value={work} onChange={e => setWork(e.target.value)} className="w-full text-2xl bg-transparent border-none outline-none font-light border-b border-gray-100 pb-2 focus:border-gray-400 transition-all" />
            <datalist id="works">{works.map(w => <option key={w} value={w} />)}</datalist>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-40">Detail</label>
                <input placeholder="DATE / PAGE" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent border-b border-gray-100 py-1 outline-none text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest opacity-40">Character</label>
                <input placeholder="NAME" value={character} onChange={e => setCharacter(e.target.value)} className="w-full bg-transparent border-b border-gray-100 py-1 outline-none text-sm font-semibold" />
              </div>
            </div>

            <textarea placeholder="Write the sentence that moved you..." value={text} onChange={e => setText(e.target.value)} className="w-full h-40 bg-transparent border-none outline-none resize-none text-xl leading-relaxed" />
            
            <div className="pt-6">
              <button onClick={save} className="px-10 py-3 border border-current rounded-full text-xs uppercase tracking-widest hover:bg-current hover:text-white transition-all duration-300">Save Entry</button>
            </div>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex gap-4 border-b border-gray-100 pb-2">
              <input placeholder="Search archives..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm italic" />
              <button onClick={() => setOnlyFavorite(!onlyFavorite)} className="text-sm">{onlyFavorite ? "★" : "☆"}</button>
            </div>

            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-6">
                <h2 className="text-[10px] uppercase tracking-[0.3em] opacity-30 border-b border-gray-50 pb-2">{title}</h2>
                <div className="space-y-8">
                  {list.map((e: any) => (
                    <div key={e.id} className="group cursor-pointer">
                      <div className="flex justify-between items-start gap-4" onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)}>
                        <p className={`flex-1 text-lg leading-relaxed ${openEntryId === e.id ? "opacity-100" : "opacity-60 group-hover:opacity-100 transition-opacity"}`}>{e.text}</p>
                        <span className="text-[10px] opacity-20 pt-2">{e.date}</span>
                      </div>
                      {openEntryId === e.id && (
                        <div className="mt-4 flex gap-4 text-[10px] uppercase tracking-widest opacity-40 pt-2 animate-in slide-in-from-top-2">
                          <button onClick={() => setFocusEntry(e)}>Enlarge</button>
                          <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setCharacter(e.character); setText(e.text); }}>Edit</button>
                          <button onClick={async () => { if(confirm("Delete?")) { await supabase.from("entries").delete().eq('id', e.db_id); fetchEntries(); } }}>Remove</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {mode === "style" && (
          <div className="max-w-xs space-y-10 animate-in fade-in duration-700">
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40">Background</label>
              <div className="flex gap-3">
                {["#ffffff", "#f5f5f2", "#e8e8e8", "#111111"].map(c => (
                  <button key={c} onClick={() => {setBgColor(c); setNight(c==="#111111")}} className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40">Text Size</label>
              <input type="range" min="14" max="24" value={lineSize} onChange={e => setLineSize(+e.target.value)} className="w-full accent-black" />
            </div>
            <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="text-[10px] uppercase tracking-[0.2em] opacity-30 hover:opacity-100 transition-opacity">Sign Out</button>
          </div>
        )}
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
