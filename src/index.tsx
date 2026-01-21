import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 본인의 Supabase 정보를 입력하세요.
const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY";

let supabase: any = null;
try {
  if (SUPABASE_KEY && SUPABASE_KEY !== "여기에_본인의_ANON_KEY_입력") {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) { console.error(e); }

export default function App() {
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [openWork, setOpenWork] = useState<string | null>(null);
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [focusEntry, setFocusEntry] = useState<any | null>(null);

  // --- [Theme / Style] ---
  const [bgColor, setBgColor] = useState(() => localStorage.getItem("arch_bg") || "#f5f5f2");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("arch_text") || "#3a3a3a");
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");
  const [fontLink, setFontLink] = useState("");
  const [lineSize, setLineSize] = useState(() => Number(localStorage.getItem("arch_size")) || 16);
  const [night, setNight] = useState(false);

  // --- [Form] ---
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [keywords, setKeywords] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  // --- [UI Filters] ---
  const [query, setQuery] = useState("");
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [charFilter, setCharFilter] = useState<string>("");
  const [openCommentId, setOpenCommentId] = useState<number | null>(null);

  // 1. 초기 데이터 로드 & 스타일 유지
  useEffect(() => {
    const local = localStorage.getItem("archive_full_backup");
    if (local) setEntries(JSON.parse(local));
    
    // DB 동기화 (로그인 세션이 있을 경우)
    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        if (data.session?.user) fetchDB();
      });
    }
  }, []);

  // 스타일 변경 시마다 로컬에 즉시 저장
  useEffect(() => {
    localStorage.setItem("arch_bg", bgColor);
    localStorage.setItem("arch_text", textColor);
    localStorage.setItem("arch_size", lineSize.toString());
  }, [bgColor, textColor, lineSize]);

  const fetchDB = async () => {
    const { data } = await supabase.from("entries").select("*");
    if (data) {
      const dbEntries = data.map((d: any) => ({ ...d.content, db_id: d.id }));
      setEntries(dbEntries);
      localStorage.setItem("archive_full_backup", JSON.stringify(dbEntries));
    }
  };

  // 2. 모든 필드를 포함한 SAVE (로컬 선저장 + DB 후저장)
  const save = async () => {
    if (!work || !date || !text) return alert("필수 항목을 입력하세요.");

    const payload = {
      work, date, time, character, text, comment,
      id: editingId || Date.now(),
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      favorite: editingId ? (entries.find(e => e.id === editingId)?.favorite || false) : false
    };

    // 로컬 저장 (즉시 반영)
    let nextEntries;
    if (editingId) {
      nextEntries = entries.map((e) => (e.id === editingId ? payload : e));
    } else {
      nextEntries = [payload, ...entries];
    }
    setEntries(nextEntries);
    localStorage.setItem("archive_full_backup", JSON.stringify(nextEntries));

    // DB 저장 시도
    if (supabase) {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        if (editingId) {
          const target = entries.find(e => e.id === editingId);
          await supabase.from("entries").update({ content: payload }).eq('id', target.db_id);
        } else {
          await supabase.from("entries").insert([{ content: payload, user_id: session.session.user.id }]);
        }
        fetchDB();
      }
    }

    // 초기화
    setWork(""); setDate(""); setTime(""); setKeywords(""); setCharacter(""); setText(""); setComment("");
    setEditingId(null); setMode("archive");
  };

  // --- [기능 복구: 필터 & 그룹화] ---
  const works = useMemo(() => Array.from(new Set(entries.map((e) => e.work))).filter(Boolean), [entries]);
  const characters = useMemo(() => Array.from(new Set(entries.map((e) => e.character))).filter(Boolean), [entries]);

  const filtered = useMemo(() => {
    let base = [...entries].sort((a, b) => b.id - a.id);
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

  // --- [기능 복구: 내보내기] ---
  const exportFile = (type: "json" | "txt" | "pdf") => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `archive.${type}`;
    a.click();
  };

  const activeBg = night ? "#141414" : bgColor;
  const activeText = night ? "#e5e5e5" : textColor;

  if (focusEntry) {
    return (
      <div onClick={() => setFocusEntry(null)} className="min-h-screen flex items-center justify-center px-6" style={{ background: activeBg, color: activeText, fontFamily: koreanFont }}>
        <div className="text-center space-y-4 max-w-xl animate-in zoom-in duration-300">
          <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: lineSize }}>{focusEntry.text}</div>
          <div className="text-xs opacity-60">{focusEntry.work} · {focusEntry.date} · {focusEntry.character}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6 transition-all duration-300" style={{ backgroundColor: activeBg, color: activeText, fontFamily: koreanFont }}>
      <style>{`@font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }`}</style>
      {fontLink && <link rel="stylesheet" href={fontLink} />}

      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-current/10 pb-4 font-serif">
          <h1 className="text-3xl italic tracking-tighter cursor-pointer" onClick={() => setMode("write")}>ARCHIVE</h1>
          <nav className="flex gap-4 text-xs uppercase tracking-widest">
            <button onClick={() => setMode("write")} className={mode === "write" ? "font-bold" : "opacity-40"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "font-bold" : "opacity-40"}>Read</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "font-bold" : "opacity-40"}>Style</button>
          </nav>
        </header>

        {mode === "write" && (
          <div className="space-y-4 animate-in fade-in">
            <input list="works" placeholder="작품명" value={work} onChange={(e) => setWork(e.target.value)} className="w-full py-3 border-b bg-transparent font-bold text-xl outline-none" />
            <datalist id="works">{works.map(w => <option key={w} value={w} />)}</datalist>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <input placeholder="날짜 / 페이지" value={date} onChange={e => setDate(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="시간" value={time} onChange={e => setTime(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input placeholder="키워드 (쉼표 구분)" value={keywords} onChange={e => setKeywords(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm" />
              <input list="chars" placeholder="캐릭터" value={character} onChange={e => setCharacter(e.target.value)} className="border-b bg-transparent py-2 outline-none text-sm font-bold" />
            </div>
            <datalist id="chars">{characters.map(c => <option key={c} value={c} />)}</datalist>
            <textarea placeholder="대사 / 문장" value={text} onChange={e => setText(e.target.value)} className="w-full h-64 py-3 bg-transparent leading-relaxed outline-none resize-none" style={{ fontSize: lineSize }} />
            <textarea placeholder="코멘트 (선택)" value={comment} onChange={e => setComment(e.target.value)} className="w-full py-2 bg-transparent text-sm opacity-50 outline-none" />
            <div className="flex justify-end"><button onClick={save} className="px-10 py-3 border rounded-full text-xs hover:bg-current hover:text-[white] transition-all uppercase">{editingId ? "Update" : "Save"}</button></div>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-3 items-center border-b border-current/5 pb-2">
              <input placeholder="Search..." value={query} onChange={e => setQuery(e.target.value)} className="flex-1 bg-transparent py-1 outline-none text-sm" />
              <select value={charFilter} onChange={e => setCharFilter(e.target.value)} className="bg-transparent text-xs outline-none opacity-50">
                <option value="">All characters</option>
                {characters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => setOnlyFavorite(!onlyFavorite)} className={onlyFavorite ? "text-yellow-500" : "opacity-20"}>★</button>
            </div>
            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-2">
                <button onClick={() => setOpenWork(openWork === title ? null : title)} className="flex items-baseline gap-2 font-bold italic border-b border-current/5 w-full text-left pb-1">
                  <span>{title}</span><span className="text-[10px] opacity-30">({list.length})</span>
                </button>
                {openWork === title && list.map((e: any) => (
                  <div key={e.id} className="border-l border-current/10 pl-4 py-2 space-y-2">
                    <button onClick={() => setOpenEntryId(openEntryId === e.id ? null : e.id)} className="w-full text-left text-[11px] opacity-40 hover:opacity-100">
                      {e.date} {e.time && `· ${e.time}`} · {e.character} {e.keywords.length > 0 && `· ${e.keywords.join(", ")}`}
                    </button>
                    {openEntryId === e.id && (
                      <div className="animate-in slide-in-from-top-1">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 leading-relaxed cursor-pointer" onClick={() => setFocusEntry(e)} style={{ fontSize: lineSize }}>{e.text}</div>
                          <button onClick={() => {
                            const next = { ...e, favorite: !e.favorite };
                            setEntries(p => p.map(x => x.id === e.id ? next : x));
                          }} className={e.favorite ? "text-yellow-500" : "opacity-20"}>★</button>
                        </div>
                        {e.comment && (
                          <div className="mt-2 text-xs opacity-40 border-t border-current/5 pt-2 italic">{e.comment}</div>
                        )}
                        <div className="flex gap-4 mt-3 text-[10px] uppercase opacity-30">
                          <button onClick={() => { setMode("write"); setEditingId(e.id); setWork(e.work); setDate(e.date); setTime(e.time || ""); setKeywords(e.keywords.join(", ")); setCharacter(e.character); setText(e.text); setComment(e.comment || ""); }}>Edit</button>
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
          <div className="space-y-8 py-4 animate-in fade-in max-w-sm font-serif">
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Background Color</label>
              <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Text Color</label>
              <input value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Font Size ({lineSize}px)</label>
              <input type="range" min="12" max="24" value={lineSize} onChange={e => setLineSize(Number(e.target.value))} className="w-full accent-current" />
            </div>
            <div className="space-y-2">
              <h2 className="text-[10px] uppercase tracking-widest opacity-40">Export</h2>
              <div className="flex gap-3 text-xs opacity-60">
                <button onClick={() => exportFile("json")}>JSON</button>
                <button onClick={() => exportFile("txt")}>TXT</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
