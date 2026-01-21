import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Supabase 연결 설정 (본인의 정보를 입력하세요)
const supabase = createClient(
  "https://dctinbgpmxsfyexnfvbi.supabase.co", 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"
);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- 기존 상태 유지 ---
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1d1d1f");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
  const [lineSize, setLineSize] = useState(17);
  const [night, setNight] = useState(false);

  // --- 입력 폼 ---
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [keywords, setKeywords] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // --- UI 필터 ---
  const [query, setQuery] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);

  // --- 데이터 동기화 로직 ---
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
    if (query) base = base.filter(e => e.text.toLowerCase().includes(query.toLowerCase()) || e.work.toLowerCase().includes(query.toLowerCase()));
    return base;
  }, [entries, query, onlyFavorite]);

  const grouped = useMemo(() => filtered.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [filtered]);

  const activeBg = night ? "#000000" : bgColor;
  const activeText = night ? "#f5f5f7" : textColor;

  // --- 로그인 화면 (트렌디한 카드 스타일) ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] p-6">
        <div className="w-full max-w-[360px] bg-white rounded-3xl p-10 shadow-sm text-center">
          <h1 className="text-4xl font-serif italic mb-2">Archive</h1>
          <p className="text-gray-400 text-xs tracking-widest uppercase mb-8 font-light">Your private space</p>
          <div className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#f5f5f7] border-none rounded-xl px-4 py-3 outline-none text-sm" />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#f5f5f7] border-none rounded-xl px-4 py-3 outline-none text-sm" />
            <button onClick={handleLogin} className="w-full bg-[#1d1d1f] text-white py-3 rounded-xl text-sm font-medium mt-4 active:scale-95 transition-transform">접속하기</button>
          </div>
        </div>
      </div>
    );
  }

  // --- 몰입 모드 (문장 크게 보기) ---
  if (focusEntry) {
    return (
      <div onClick={() => setFocusEntry(null)} className="min-h-screen flex flex-col items-center justify-center p-10 cursor-pointer animate-in fade-in duration-500" style={{ background: activeBg, color: activeText }}>
        <p className="max-w-3xl text-center leading-relaxed font-light mb-8" style={{ fontSize: lineSize + 10, fontFamily: koreanFont }}>{focusEntry.text}</p>
        <div className="text-[10px] uppercase tracking-[0.3em] opacity-40">{focusEntry.work} — {focusEntry.character}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-700" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        body { margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 0px; }
      `}</style>

      <div className="max-w-2xl mx-auto px-6 py-16 md:py-24">
        {/* 상단 네비게이션 */}
        <header className="flex justify-between items-center mb-20">
          <button onClick={() => setMode("write")} className="text-2xl font-serif italic tracking-tighter">Archive</button>
          <nav className="flex gap-8 text-[11px] font-medium tracking-widest uppercase opacity-40">
            <button onClick={() => setMode("write")} className={mode === "write" ? "opacity-100 border-b border-current" : "hover:opacity-100 transition-opacity"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "opacity-100 border-b border-current" : "hover:opacity-100 transition-opacity"}>Collection</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "opacity-100 border-b border-current" : "hover:opacity-100 transition-opacity"}>Style</button>
          </nav>
        </header>

        {/* 쓰기 모드 */}
        {mode === "write" && (
          <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-1 border-b border-gray-100 dark:border-zinc-800 pb-2">
              <label className="text-[10px] uppercase tracking-widest opacity-30">Work Title</label>
              <input list="works" placeholder="무엇을 읽었나요?" value={work} onChange={e => setWork(e.target.value)} className="w-full bg-transparent border-none outline-none text-2xl font-light p-0" />
              <datalist id="works">{works.map(w => <option key={w} value={w} />)}</datalist>
            </div>
            
            <div className="grid grid-cols-2 gap-10">
              <div className="space-y-1 border-b border-gray-100 dark:border-zinc-800 pb-2">
                <label className="text-[10px] uppercase tracking-widest opacity-30">Details</label>
                <input placeholder="DATE / PAGE" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm p-0" />
              </div>
              <div className="space-y-1 border-b border-gray-100 dark:border-zinc-800 pb-2">
                <label className="text-[10px] uppercase tracking-widest opacity-30">Person</label>
                <input placeholder="CHARACTER" value={character} onChange={e => setCharacter(e.target.value)} className="w-full bg-transparent border-none outline-none text-sm p-0" />
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <textarea placeholder="마음을 울린 문장을 기록하세요..." value={text} onChange={e => setText(e.target.value)} className="w-full h-48 bg-transparent border-none outline-none text-xl font-light leading-relaxed resize-none p-0" />
            </div>

            <div className="flex justify-end pt-4">
              <button onClick={save} className="bg-[#1d1d1f] text-white px-8 py-3 rounded-full text-xs font-medium tracking-widest uppercase hover:scale-105 transition-transform active:scale-95 shadow-lg">Save Entry</button>
            </div>
          </div>
        )}

        {/* 목록 모드 */}
        {mode === "archive" && (
          <div className="space-y-16 animate-in fade-in duration-700">
            <div className="flex items-center gap-4 border-b border-gray-100 dark:border-zinc-800 pb-3">
              <input placeholder="Search keywords..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm italic font-light p-0" />
              <button onClick={() => setOnlyFavorite(!onlyFavorite)} className="text-sm opacity-40 hover:opacity-100 transition-opacity">{onlyFavorite ? "★" : "☆"}</button>
            </div>

            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-8">
                <h2 className="text-[10px] uppercase tracking-[0.4em] opacity-30 border-b border-gray-50 dark:border-zinc-900 pb-2">{title}</h2>
                <div className="space-y-10">
                  {list.map((e: any) => (
                    <div key={e.id} className="group flex justify-between items-start gap-6 cursor-pointer" onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)}>
                      <div className="flex-1">
                        <p className={`text-lg leading-relaxed font-light mb-2 transition-opacity ${openEntryId === e.id ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>{e.text}</p>
                        {openEntryId === e.id && (
                          <div className="flex gap-4 text-[10px] uppercase tracking-widest opacity-40 pt-2 animate-in slide-in-from-top-1">
                            <button onClick={() => setFocusEntry(e)} className="hover:text-black dark:hover:text-white">Full View</button>
                            <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setCharacter(e.character); setText(e.text); }} className="hover:text-black dark:hover:text-white">Edit</button>
                            <button onClick={async () => { if(confirm("Delete?")) { await supabase.from("entries").delete().eq('id', e.db_id); fetchEntries(); } }} className="hover:text-red-500">Remove</button>
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] opacity-20 whitespace-nowrap pt-2 font-mono">{e.date}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* 스타일 모드 */}
        {mode === "style" && (
          <div className="space-y-12 animate-in fade-in duration-700 max-w-xs">
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest opacity-30">Theme</label>
              <div className="flex gap-4">
                {[["#ffffff", "Light"], ["#f5f5f7", "Soft"], ["#1d1d1f", "Dark"]].map(([c, name]) => (
                  <button key={c} onClick={() => {setBgColor(c); setNight(c === "#1d1d1f")}} className="w-8 h-8 rounded-full border border-gray-100 dark:border-zinc-800" style={{ backgroundColor: c }} title={name} />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest opacity-30">Text Size</label>
              <input type="range" min="14" max="24" value={lineSize} onChange={e => setLineSize(+e.target.value)} className="w-full accent-black dark:accent-white" />
            </div>
            <div className="pt-10">
              <button onClick={() => { supabase.auth.signOut(); setUser(null); }} className="text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity underline underline-offset-8">Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);
