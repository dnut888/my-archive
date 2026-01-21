import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  const [bgColor, setBgColor] = useState(() => localStorage.getItem("arch_bg") || "#f5f5f2");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("arch_text") || "#1a1a1a");
  const [lineSize, setLineSize] = useState(() => Number(localStorage.getItem("arch_size")) || 14);
  const [koreanFont, setKoreanFont] = useState(() => localStorage.getItem("arch_font") || "BookkMyungjo");
  const [fontLink, setFontLink] = useState(() => localStorage.getItem("arch_font_link") || "");
  const [night, setNight] = useState(() => localStorage.getItem("arch_night") === "true");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    // 1. 로컬 데이터 즉시 로드 (에러 방지)
    const local = localStorage.getItem("archive_full_backup");
    if (local) {
      try { setEntries(JSON.parse(local)); } catch(e) { console.error(e); }
    }

    // 2. 세션 체크 (에러 핸들링 추가)
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setUser(data.session.user);
          fetchDB(data.session.user);
        }
      } catch (e) { console.error("Session Check Error", e); }
    };
    checkSession();
  }, []);

  const fetchDB = async (currentUser: any) => {
    if (!currentUser || currentUser.id === 'guest') return;
    try {
      const { data, error } = await supabase.from("entries").select("*");
      if (!error && data) {
        const dbEntries = data.map((d: any) => ({ ...d.content, db_id: d.id }));
        setEntries(dbEntries);
        localStorage.setItem("archive_full_backup", JSON.stringify(dbEntries));
      }
    } catch (e) { console.error(e); }
  };

  const handleLogin = async () => {
    if (!email || !password) return alert("입력하세요.");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert("실패: " + error.message);
    if (data?.user) {
      setUser(data.user);
      fetchDB(data.user);
    }
  };

  const save = async () => {
    if (!work || !text) return alert("작품명과 본문은 필수입니다.");
    
    const payload = {
      work, date, time, character, text, comment,
      id: editingId || Date.now(),
      keywords: keywords ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      favorite: editingId ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    // [중요] 화면 즉시 업데이트
    const nextEntries = editingId ? entries.map(e => e.id === editingId ? payload : e) : [payload, ...entries];
    setEntries(nextEntries);
    localStorage.setItem("archive_full_backup", JSON.stringify(nextEntries));

    // DB 처리
    if (user && user.id !== 'guest') {
      try {
        if (editingId) {
          const target = entries.find(e => e.id === editingId);
          if (target?.db_id) await supabase.from("entries").update({ content: payload }).eq('id', target.db_id);
        } else {
          await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
        }
      } catch (err) { console.error("DB Error", err); }
    }

    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null); setMode("archive");
  };

  const handleBackup = (type: string) => {
    const content = JSON.stringify(entries, null, 2);
    const blob = (c: string, t: string) => URL.createObjectURL(new Blob([c], { type: t }));
    if (type === 'json') {
      const a = document.createElement('a'); a.href = blob(content, 'application/json'); a.download='archive.json'; a.click();
    } else if (type === 'txt') {
      const txt = entries.map(e => `[${e.work}]\n${e.date} | ${e.character}\n${e.text}\n\n`).join('');
      const a = document.createElement('a'); a.href = blob(txt, 'text/plain'); a.download='archive.txt'; a.click();
    } else if (type === 'html') {
      const html = `<html><body style="background:${activeBg};color:${activeText};padding:50px;font-family:serif;">${entries.map(e=>`<div><h2>${e.work}</h2><p>${e.date} | ${e.character}</p><p>${e.text}</p><hr/></div>`).join('')}</body></html>`;
      const a = document.createElement('a'); a.href = blob(html, 'text/html'); a.download='archive.html'; a.click();
    } else if (type === 'pdf') { window.print(); }
  };

  const grouped = useMemo(() => {
    let base = [...entries].sort((a, b) => b.id - a.id);
    if (onlyFavorite) base = base.filter(e => e.favorite);
    if (query) base = base.filter(e => [e.text, e.work, e.character].some(v => v?.toLowerCase().includes(query.toLowerCase())));
    return base.reduce((acc: any, cur) => { acc[cur.work] = acc[cur.work] || []; acc[cur.work].push(cur); return acc; }, {});
  }, [entries, query, onlyFavorite]);

  const activeBg = night ? "#1a1a1a" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  // ⚠️ 로그인 체크 (무조건 로그인창이 먼저 나오게 보장)
  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center font-en" style={{ background: activeBg, color: activeText }}>
        <div className="w-64 space-y-8 text-center p-4">
          <h1 className="text-4xl font-normal tracking-widest uppercase mb-10">Archive</h1>
          <div className="space-y-3">
            <input className="w-full bg-transparent border-b border-current/20 py-2 outline-none text-center" placeholder="EMAIL" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="w-full bg-transparent border-b border-current/20 py-2 outline-none text-center" type="password" placeholder="PASSWORD" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button onClick={handleLogin} className="w-full mt-6 border border-current rounded-full py-3 text-xs uppercase tracking-widest active:scale-95 transition-all">Login</button>
          <button onClick={() => setUser({id:'guest'})} className="text-[10px] opacity-40 underline mt-4">GUEST MODE</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400&display=swap');
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        .font-en { font-family: 'Crimson Text', serif !important; }
        * { letter-spacing: 0px !important; }
      `}</style>
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-current/10 pb-4">
          <h1 className="text-3xl tracking-tighter cursor-pointer font-en" onClick={() => setMode("write")}>Archive</h1>
          <nav className="flex gap-4 text-xs font-en uppercase tracking-widest">
            <button onClick={() => setMode("write")} className={mode === "write" ? "" : "opacity-30"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "" : "opacity-30"}>Read</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "" : "opacity-30"}>Set</button>
          </nav>
        </header>

        {mode === "write" && (
          <div className="space-y-4">
            <input placeholder="작품명" value={work} onChange={e => setWork(e.target.value)} className="w-full py-3 border-b bg-transparent font-bold text-xl outline-none" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input placeholder="날짜" value={date} onChange={e => setDate(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="시간" value={time} onChange={e => setTime(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="키워드" value={keywords} onChange={e => setKeywords(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="캐릭터" value={character} onChange={e => setCharacter(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm font-bold" />
            </div>
            <textarea placeholder="문장을 입력하세요" value={text} onChange={e => setText(e.target.value)} className="w-full h-64 py-3 bg-transparent leading-relaxed outline-none resize-none" style={{ fontSize: '14px' }} />
            <textarea placeholder="코멘트" value={comment} onChange={e => setComment(e.target.value)} className="w-full py-2 bg-transparent text-xs opacity-70 outline-none" />
            <div className="flex justify-end pt-4"><button onClick={save} className="px-12 py-3 border border-current rounded-full text-xs font-en uppercase">Save</button></div>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-4">
            <div className="flex gap-3 border-b border-current/5 pb-2">
              <input placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent py-1 outline-none text-sm" />
              <button onClick={() => setOnlyFavorite(!onlyFavorite)} className={onlyFavorite ? "text-yellow-500" : "opacity-20"}>★</button>
            </div>
            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-1">
                <button onClick={() => setOpenWork(openWork === title ? null : title)} className="flex items-baseline gap-2 font-bold border-b border-current/5 w-full text-left py-1">
                  <span>{title}</span><span className="text-[10px] opacity-40 font-en">({list.length})</span>
                </button>
                {openWork === title && list.map((e: any) => (
                  <div key={e.id} className="ml-1 pl-4 py-1">
                    <button onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)} className="w-full text-left text-[11px] opacity-70">
                      {e.date} · {e.character}
                    </button>
                    {openEntryId === e.id && (
                      <div className="pt-2">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 leading-relaxed cursor-pointer" onClick={() => setFocusEntry(e)} style={{ fontSize: lineSize }}>{e.text}</div>
                          <button onClick={() => { const n={...e, favorite:!e.favorite}; setEntries(p=>p.map(x=>x.id===e.id?n:x)); }} className={e.favorite ? "text-yellow-500" : "opacity-20"}>★</button>
                        </div>
                        <div className="flex gap-4 mt-3 text-[10px] opacity-40 font-bold font-en uppercase">
                          <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setTime(e.time||""); setKeywords(e.keywords.join(", ")); setCharacter(e.character); setText(e.text); setComment(e.comment||""); }}>Edit</button>
                          <button onClick={() => setEntries(p => p.filter(x => x.id !== e.id))} className="text-red-500">Delete</button>
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
          <div className="space-y-6 max-w-sm">
            <div className="space-y-1 font-en"><label className="text-[10px] uppercase font-bold opacity-50">Colors</label>
              <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none text-xs" />
              <input value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none text-xs" />
            </div>
            <div className="space-y-1 font-en"><label className="text-[10px] uppercase font-bold opacity-50">Typography</label>
              <input type="range" min="12" max="24" value={lineSize} onChange={e => setLineSize(Number(e.target.value))} className="w-full accent-current mb-2" />
              <input placeholder="Font Name" value={koreanFont} onChange={e => setKoreanFont(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 text-xs outline-none" />
              <input placeholder="Font URL" value={fontLink} onChange={e => setFontLink(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 text-xs outline-none" />
            </div>
            <div className="flex items-center justify-between py-2 border-b border-current/10 font-en">
              <span className="text-xs font-bold uppercase">Night Mode</span>
              <button onClick={() => setNight(!night)} className={`w-10 h-5 rounded-full relative ${night ? 'bg-blue-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${night ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            <div className="pt-4 space-y-2 border-t border-current/10 font-en">
              <label className="text-[10px] uppercase font-bold opacity-50">Backup</label>
              <div className="flex gap-2 text-[10px] font-bold uppercase">
                <button onClick={()=>handleBackup('txt')} className="px-2 py-1 border border-current/20 rounded">TXT</button>
                <button onClick={()=>handleBackup('html')} className="px-2 py-1 border border-current/20 rounded">HTML</button>
                <button onClick={()=>handleBackup('json')} className="px-2 py-1 border border-current/20 rounded">JSON</button>
                <button onClick={()=>handleBackup('pdf')} className="px-2 py-1 border border-current/20 rounded">PDF</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {focusEntry && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-10" style={{ backgroundColor: activeBg }} onClick={() => setFocusEntry(null)}>
          <div className="max-w-2xl w-full space-y-12 text-center" style={{ color: activeText, fontFamily: koreanFont }}>
            <div className="leading-relaxed whitespace-pre-wrap" style={{ fontSize: lineSize + 6 }}>{focusEntry.text}</div>
            <div className="text-sm opacity-50 font-en tracking-tight">{focusEntry.work} | {focusEntry.date} | {focusEntry.character}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
