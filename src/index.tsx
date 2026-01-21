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
} catch (e) { console.error(e); }

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");

  // --- [스타일 저장 기능 강화] ---
  const [bgColor, setBgColor] = useState(() => localStorage.getItem("arch_bg") || "#f5f5f2");
  const [textColor, setTextColor] = useState(() => localStorage.getItem("arch_text") || "#3a3a3a");
  const [lineSize, setLineSize] = useState(() => Number(localStorage.getItem("arch_size")) || 16);
  const [koreanFont, setKoreanFont] = useState("BookkMyungjo");

  // --- [입력 필드] ---
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const [character, setCharacter] = useState("");

  // 스타일 변경 시 즉시 로컬 스토리지 저장
  useEffect(() => {
    localStorage.setItem("arch_bg", bgColor);
    localStorage.setItem("arch_text", textColor);
    localStorage.setItem("arch_size", lineSize.toString());
  }, [bgColor, textColor, lineSize]);

  useEffect(() => {
    const local = localStorage.getItem("archive_backup");
    if (local) setEntries(JSON.parse(local));
    
    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        setUser(data.session?.user ?? { id: 'guest' }); // 세션 없어도 게스트로 시작
        if (data.session?.user) fetchDB();
      });
    } else {
      setUser({ id: 'guest' });
    }
  }, []);

  const fetchDB = async () => {
    if (!supabase || !user || user.id === 'guest') return;
    const { data } = await supabase.from("entries").select("*").order('created_at', { ascending: false });
    if (data) {
      const syncData = data.map((d: any) => ({ ...d.content, db_id: d.id }));
      setEntries(syncData);
      localStorage.setItem("archive_backup", JSON.stringify(syncData));
    }
  };

  // --- [핵심: 무조건 저장 로직] ---
  const save = async () => {
    if (!work || !text) return alert("작품명과 내용을 입력하세요.");

    const payload = {
      id: Date.now(),
      work, date, text, character,
      favorite: false,
      keywords: []
    };

    // 1. [로컬 저장] - DB 상관없이 즉시 실행 (절대 안 날아감)
    const updated = [payload, ...entries];
    setEntries(updated);
    localStorage.setItem("archive_backup", JSON.stringify(updated));

    // 2. [DB 저장 시도] - 실패해도 에러 안 띄우고 조용히 처리
    if (supabase && user && user.id !== 'guest') {
      await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
    }

    setWork(""); setText(""); setDate(""); setCharacter("");
    setMode("archive");
    alert("기록이 브라우저에 저장되었습니다.");
  };

  const grouped = useMemo(() => entries.reduce((acc: any, cur) => {
    acc[cur.work] = acc[cur.work] || [];
    acc[cur.work].push(cur);
    return acc;
  }, {}), [entries]);

  return (
    <div className="min-h-screen px-6 py-10" style={{ backgroundColor: bgColor, color: textColor, fontFamily: koreanFont }}>
      <style>{`@font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }`}</style>
      
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex justify-between items-center border-b border-current/10 pb-4">
          <h1 className="text-3xl italic font-serif">ARCHIVE</h1>
          <nav className="flex gap-4 text-xs uppercase tracking-widest">
            <button onClick={() => setMode("write")} className={mode === "write" ? "font-bold" : "opacity-40"}>Write</button>
            <button onClick={() => setMode("archive")} className={mode === "archive" ? "font-bold" : "opacity-40"}>Archive</button>
            <button onClick={() => setMode("style")} className={mode === "style" ? "font-bold" : "opacity-40"}>Style</button>
          </nav>
        </header>

        {mode === "write" && (
          <div className="space-y-6">
            <input placeholder="Work Title" value={work} onChange={e => setWork(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-2 text-2xl font-bold outline-none" />
            <div className="grid grid-cols-2 gap-4">
              <input placeholder="Date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent border-b border-current/20 py-2 outline-none" />
              <input placeholder="Character" value={character} onChange={e => setCharacter(e.target.value)} className="bg-transparent border-b border-current/20 py-2 outline-none font-bold" />
            </div>
            <textarea placeholder="Text..." value={text} onChange={e => setText(e.target.value)} className="w-full h-64 bg-transparent outline-none resize-none leading-relaxed" style={{ fontSize: lineSize }} />
            <button onClick={save} className="w-full py-4 border border-current rounded-full text-xs font-bold hover:bg-current hover:text-[white] transition-all">SAVE RECORD</button>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-10">
            {Object.keys(grouped).length === 0 && <p className="opacity-30 italic text-center py-20">No records yet.</p>}
            {Object.entries(grouped).map(([title, list]: any) => (
              <section key={title} className="space-y-4">
                <h2 className="text-sm opacity-30 border-b border-current/10 pb-1 italic">{title}</h2>
                {list.map((e: any) => (
                  <div key={e.id} className="group border-l-2 border-current/5 pl-6 py-2">
                    <p className="leading-relaxed opacity-80" style={{ fontSize: lineSize }}>{e.text}</p>
                    <p className="text-[10px] opacity-30 mt-2 uppercase tracking-tighter">{e.date} · {e.character}</p>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}

        {mode === "style" && (
          <div className="max-w-xs space-y-6 animate-in fade-in">
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Background Color Code</label>
              <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Text Color Code</label>
              <input value={textColor} onChange={e => setTextColor(e.target.value)} className="w-full bg-transparent border-b border-current/20 py-1 outline-none font-mono" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase opacity-40">Font Size ({lineSize}px)</label>
              <input type="range" min="12" max="24" value={lineSize} onChange={e => setLineSize(Number(e.target.value))} className="w-full accent-current" />
            </div>
            <div className="pt-4 border-t border-current/10">
              <button onClick={() => { localStorage.clear(); location.reload(); }} className="text-[10px] text-red-500 opacity-50">RESET ALL DATA</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
