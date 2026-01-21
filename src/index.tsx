import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 정보를 정확히 입력하세요.
const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";

let supabase: any = null;
try {
  if (SUPABASE_KEY && SUPABASE_KEY !== "여기에_본인의_ANON_KEY_입력") {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) { console.error("Supabase 연결 실패:", e); }

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  // --- [Style / Theme] ---
  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
  const [fontLink, setFontLink] = useState("");
  const [lineSize, setLineSize] = useState(16);
  const [night, setNight] = useState(false);

  // --- [Form State] ---
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [keywords, setKeywords] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- [UI State] ---
  const [query, setQuery] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [charFilter, setCharFilter] = useState<string>("");
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);

  // --- [Data Fetching & Sync] ---
  useEffect(() => {
    const local = localStorage.getItem("archive_backup");
    if (local) setEntries(JSON.parse(local));

    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        setUser(data.session?.user ?? null);
        if (data.session?.user) fetchDB();
      });
    }
  }, []);

  const fetchDB = async () => {
    const { data } = await supabase.from("entries").select("*").order('created_at', { ascending: false });
    if (data) {
      const syncData = data.map((d: any) => ({ ...d.content, db_id: d.id }));
      setEntries(syncData);
      localStorage.setItem("archive_backup", JSON.stringify(syncData));
    }
  };

  const handleLogin = async () => {
    if (!supabase) return alert("Key를 입력하세요.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패");
    else { setUser(data.user); fetchDB(); }
  };

  // --- [Core Logic: Save / Delete / Favorite] ---
  const save = async () => {
    if (!work || !date || !text) return;

    const payload = {
      work, date, time, character, text, comment,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      id: editingId || Date.now(),
      favorite: editingId ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    // 1. Local Update (즉시 반영)
    let newEntries;
    if (editingId) {
      newEntries = entries.map(e => e.id === editingId ? payload : e);
    } else {
      newEntries = [payload, ...entries];
    }
    setEntries(newEntries);
    localStorage.setItem("archive_backup", JSON.stringify(newEntries));

    // 2. DB Update
    if (supabase && user) {
      if (editingId) {
        const target = entries.find(e => e.id === editingId);
        await supabase.from("entries").update({ content: payload }).eq('id', target.db_id);
      } else {
        await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
      }
      fetchDB();
    }

    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null); setMode("archive");
  };

  const deleteEntry = async (e: any) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const filtered = entries.filter(x => x.id !== e.id);
    setEntries(filtered);
    localStorage.setItem("archive_backup", JSON.stringify(filtered));
    if (supabase && user && e.db_id) {
      await supabase.from("entries").delete().eq('id', e.db_id);
    }
  };

  const toggleFav = async (e: any) => {
    const next = { ...e, favorite: !e.favorite };
    setEntries(p => p.map(x => x.id === e.id ? next : x));
    if (supabase && user && e.db_id) {
      await supabase.from("entries").update({ content: next }).eq('id', e.db_id);
    }
  };

  // --- [Calculated Lists] ---
  const works = useMemo(() => Array.from(new Set(entries.map((e) => e.work))).filter(Boolean), [entries]);
  const characters = useMemo(() => Array.from(new Set(entries.map((e) => e.character))).filter(Boolean), [entries]);

  const filtered = useMemo(() => {
    let base = [...entries].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date); // 최신순
      return (b.time || "").localeCompare(a.time || "");
    });
    if (onlyFavorite) base = base.filter((e) => e.favorite);
    if (charFilter) base = base.filter((e) => e.character === charFilter);
    if (!query) return base;
    const q = query.toLowerCase();
    return base.filter((e) => [e.text, e.comment, e.character, e.keywords.join(" ")].some((v) => v?.toLowerCase().includes(q)));
  }, [entries, query, onlyFavorite, charFilter]);

  const grouped = useMemo(() => filtered.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [filtered]);

  // --- [Export] ---
  const exportFile = (type: "json" | "txt" | "html" | "pdf") => {
    const dateName = new Date().toISOString().slice(0, 10);
    if (type === "pdf") {
      const html = `<html><body style="font-family:${koreanFont};white-space:pre-wrap;">${entries.map(e => `${e.work}\n${e.date}\n${e.text}\n`).join("\n")}</body></html>`;
      const win = window.open("", "_blank");
      if (win) { win.document.write(html); win.document.close(); win.print(); }
      return;
    }
    let blob: Blob;
    if (type === "json") blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    else if (type === "html") {
      const html = `<html><body style="font-family:${koreanFont};">${entries.map(e => `<p>${e.text.replace(/\n/g, "<br/>")}</p>`).join("")}</body></html>`;
      blob = new Blob([html], { type: "text/html" });
    } else {
      const txt = entries.map(e => `${e.work}\n${e.text}`).join("\n\n");
      blob = new Blob([txt], { type: "text/plain" });
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${dateName}.${type}`;
    a.click();
  };

  const activeBg = night ? "#141414" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // --- [Login Screen] ---
  if (!user && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif" style={{ background: activeBg, color: activeText }}>
        <div className="w-64 space-y-4 text-center">
          <h1 className="text-3xl mb-8 italic">ARCHIVE</h1>
          <input className="w-full bg-transparent border-b border-current/20 py-2 outline-none text-center" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full bg-transparent border-b border-current/20 py-2 outline-none text-center" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={handleLogin} className="w-full mt-4 border border-current rounded-full py-2 text-xs">LOGIN</button>
          <button onClick={() => setUser({id:'guest'})} className="text-[10px] opacity-40 underline mt-4">로그인 없이 사용 (로컬저장)</button>
        </div>
      </div>
    );
  }

  // --- [Focus Mode] ---
  if (focusEntry) {
    return (
      <div onClick={() => setFocusEntry(null)} className="min-h-screen flex items-center justify-center px-6" style={{ background: activeBg, color: activeText, fontFamily: koreanFont }}>
        <div className="text-center space-y-4 max-w-xl animate-in zoom-in duration-300">
          <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: Math.max(14, lineSize - 2) }}>{focusEntry.text}</div>
          <div className="text-xs opacity-60">{focusEntry.work} · {focusEntry.date} · {focusEntry.character}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6 transition-colors duration-500" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        body { font-family: '${koreanFont}', serif; }
      `}</style>
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-current/5 pb-4">
          <h1 className="text-3xl font-serif italic" onClick={() => setMode("write")}>ARCHIVE</h1>
          <div className="flex gap-4 text-sm uppercase tracking-widest">
            <button onClick={() => setMode("write")} className={mode === "write" ? "font-bold" : "opacity-40"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "font-bold" : "opacity-40"}>Read</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "font-bold" : "opacity-40"}>Set</button>
          </div>
        </header>

        {mode === "write" && (
          <div className="space-y-4 animate-in fade-in">
            <input list="works" placeholder="작품명" value={work} onChange={(e) => setWork(e.target.value)} className="w-full py-3 border-b bg-transparent font-bold text-xl outline-none" />
            <datalist id="works">{works.map(w => <option key={w} value={w} />)}</datalist>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input placeholder="날짜 / 페이지" value={date} onChange={e => setDate(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="시간" value={time} onChange={e => setTime(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="키워드" value={keywords} onChange={e => setKeywords(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input list="chars" placeholder="캐릭터" value={character} onChange={e => setCharacter(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm font-bold" />
            </div>
            <datalist id="chars">{characters.map(c => <option key={c} value={c} />)}</datalist>
            <textarea placeholder="대사 / 문장" value={text} onChange={e => setText(e.target.value)} className="w-full h-64 py-3 bg-transparent leading-relaxed outline-none resize-none" style={{ fontSize: lineSize }} />
            <textarea placeholder="코멘트 (선택)" value={comment} onChange={e => setComment(e.target.value)} className="w-full py-2 bg-transparent text-sm opacity-50 outline-none" />
            <div className="flex justify-end"><button onClick={save} className="px-8 py-2 border rounded-full text-xs hover:bg-black hover:text-white transition-all uppercase tracking-tighter">{editingId ? "Update" : "Save"}</button></div>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-3 items-center border-b border-current/5 pb-2">
              <input placeholder="Search records..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent py-1 outline-none text-sm" />
              <select value={charFilter} onChange={e => setCharFilter(e.target.value)} className="bg-transparent text-xs outline-none opacity-50">
                <option value="">All</option>
                {characters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setOnlyFavorite(!onlyFavorite)} className={`text-sm ${onlyFavorite ? "text-yellow-500" : "opacity-20"}`}>★</button>
            </div>
            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-2">
                <button onClick={() => setOpenWork(openWork === title ? null : title)} className="flex items-baseline gap-2 font-bold italic">
                  <span>{title}</span><span className="text-[10px] opacity-30">({list.length})</span>
                </button>
                {openWork === title && list.map((e: any) => (
                  <div key={e.id} className="border-l border-current/10 pl-4 py-2 space-y-2">
                    <button onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)} className="w-full text-left text-[11px] opacity-40 hover:opacity-100 transition-opacity">
                      {e.date} {e.time && `· ${e.time}`} · {e.character}
                    </button>
                    {openEntryId === e.id && (
                      <div className="animate-in slide-in-from-top-1">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 leading-relaxed cursor-pointer" onClick={() => setFocusEntry(e)} style={{ fontSize: lineSize }}>{e.text}</div>
                          <button onClick={() => toggleFav(e)} className={e.favorite ? "text-yellow-500" : "opacity-20"}>★</button>
                        </div>
                        {e.comment && (
                          <div className="mt-2 text-xs opacity-40 border-t border-current/5 pt-2 italic">{e.comment}</div>
                        )}
                        <div className="flex gap-4 mt-3 text-[10px] uppercase opacity-30">
                          <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setTime(e.time || ""); setKeywords(e.keywords.join(", ")); setCharacter(e.character); setText(e.text); setComment(e.comment || ""); }}>Edit</button>
                          <button onClick={() => deleteEntry(e)} className="text-red-500">Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        {mode === "style" && (
          <div className="space-y-8 py-4 animate-in fade-in max-w-sm">
            <div className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest opacity-40">Colors</h2>
              <div className="flex gap-2">
                {["#f5f5f2", "#ffffff", "#141414"].map(c => <button key={c} onClick={() => setBgColor(c)} className="w-6 h-6 rounded-full border border-current/10" style={{background:c}} />)}
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest opacity-40">Typography ({lineSize}px)</h2>
              <input type="range" min="14" max="24" value={lineSize} onChange={e => setLineSize(+e.target.value)} className="w-full" />
              <input placeholder="Font Name" value={koreanFont} onChange={e => setKoreanFont(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 text-sm outline-none" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest opacity-40">Backup & Export</h2>
              <div className="flex gap-3 text-xs opacity-60">
                <button onClick={() => exportFile("json")}>JSON</button>
                <button onClick={() => exportFile("txt")}>TXT</button>
                <button onClick={() => exportFile("pdf")}>PDF</button>
              </div>
            </div>
            <button onClick={() => {supabase.auth.signOut(); setUser(null);}} className="text-[10px] opacity-20 hover:opacity-100">SIGN OUT</button>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
