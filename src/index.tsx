import React, { useMemo, useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { createClient } from "@supabase/supabase-js";

// ⚠️ 여기에 본인의 정보를 넣으세요. 만약 틀려도 화면은 나옵니다.
const SUPABASE_URL = "https://dctinbgpmxsfyexnfvbi.supabase.co"; 
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdGluYmdwbXhzZnlleG5mdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMDU4NDQsImV4cCI6MjA4NDU4MTg0NH0.SPiNc-q-u6xHlb5H82EFvl8xBUmzuCIs8w6WS9tauyY"; 

// [안전 장치] 키가 없거나 틀리면 null로 처리해서 앱이 죽는 걸 방지함
let supabase: any = null;
try {
  if (SUPABASE_URL && SUPABASE_KEY && SUPABASE_KEY !== "여기에_본인의_ANON_KEY_입력") {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error("Supabase 연결 실패 (화면은 띄움):", e);
}

export default function App() {
  // --- [상태 관리] ---
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [mode, setMode] = useState<"write" | "archive" | "style">("write");
  const [bgColor, setBgColor] = useState("#f5f5f2");
  const [textColor, setTextColor] = useState("#3a3a3a");
  const [lineSize, setLineSize] = useState(16);
  const [work, setWork] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [character, setCharacter] = useState("");
  const [text, setText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [openEntryId, setOpenEntryId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- [데이터 로드 (안전 모드)] ---
  useEffect(() => {
    // Supabase가 연결되었을 때만 실행
    if (supabase) {
      supabase.auth.getSession().then(({ data }: any) => {
        setUser(data.session?.user ?? null);
        if (data.session?.user) fetchData();
      });
    } else {
      console.log("DB 연결 없이 디자인만 보여주는 모드입니다.");
    }
  }, []);

  const fetchData = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("entries").select("*");
    if (data) {
      setEntries(data.map((d: any) => ({ ...d.content, db_id: d.id, id: d.content.id || d.id })));
    }
  };

  const handleLogin = async () => {
    if (!supabase) { alert("Supabase 키를 코드에 입력해주세요."); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("로그인 실패");
    else { setUser(data.user); fetchData(); }
  };

  const save = async () => {
    if (!supabase || !user) { alert("DB 연결 또는 로그인이 필요합니다."); return; }
    const payload = { work, date, time, character, text, id: Date.now(), favorite: false };
    await supabase.from("entries").insert([{ content: payload, user_id: user.id }]);
    setWork(""); setText("");
    fetchData();
  };

  // --- [디자인 렌더링 (원본)] ---
  const activeBg = bgColor; 
  const activeText = textColor;

  // 1. Supabase 키가 없을 때 (화면 테스트용)
  if (!supabase) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 text-red-900 p-10 space-y-4">
        <h1 className="text-2xl font-bold">⚠️ 화면 복구 성공</h1>
        <p>현재 화면이 보인다면 코드는 정상입니다.</p>
        <p>하지만 <strong>Supabase KEY</strong>가 코드에 입력되지 않았습니다.</p>
        <p className="text-sm bg-white p-4 rounded border">const SUPABASE_KEY = "여기에_키를_넣으세요";</p>
      </div>
    );
  }

  // 2. 로그인 화면 (디자인 유지)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center font-serif" style={{ backgroundColor: activeBg, color: activeText }}>
        <div className="space-y-4 text-center w-64">
          <h1 className="text-3xl mb-6">ARCHIVE</h1>
          <input className="block w-full border-b border-black/20 bg-transparent py-2 outline-none text-center" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="block w-full border-b border-black/20 bg-transparent py-2 outline-none text-center" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button onClick={handleLogin} className="w-full py-2 mt-4 border border-black/20 rounded-full text-xs hover:bg-black hover:text-white transition-all">ENTER</button>
        </div>
      </div>
    );
  }

  // 3. 메인 화면 (원본 디자인)
  return (
    <div className="min-h-screen px-5 py-8" style={{ backgroundColor: activeBg, color: activeText }}>
       {/* 폰트/스타일 강제 주입 */}
      <style>{`
        @font-face { font-family: 'BookkMyungjo'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2') format('woff2'); }
        body { font-family: 'BookkMyungjo', serif; }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex justify-between items-baseline">
          <h1 className="text-3xl italic font-serif">Archive</h1>
          <div className="space-x-4 text-sm opacity-50">
            <button onClick={()=>setMode("write")} className={mode==="write"?"font-bold opacity-100":""}>Write</button>
            <button onClick={()=>setMode("archive")} className={mode==="archive"?"font-bold opacity-100":""}>List</button>
          </div>
        </header>

        {mode === "write" && (
          <div className="space-y-6 animate-in fade-in">
            <input placeholder="작품 제목" value={work} onChange={e=>setWork(e.target.value)} className="w-full text-xl border-b border-current/10 bg-transparent py-2 font-bold outline-none" />
            <div className="grid grid-cols-2 gap-4">
               <input placeholder="날짜" value={date} onChange={e=>setDate(e.target.value)} className="border-b border-current/10 bg-transparent py-2 outline-none" />
               <input placeholder="캐릭터" value={character} onChange={e=>setCharacter(e.target.value)} className="border-b border-current/10 bg-transparent py-2 outline-none font-bold" />
            </div>
            <textarea placeholder="내용을 입력하세요" value={text} onChange={e=>setText(e.target.value)} className="w-full h-40 resize-none border-none bg-transparent text-lg leading-relaxed outline-none" />
            <button onClick={save} className="rounded-full border border-current px-6 py-2 text-xs hover:bg-black hover:text-white transition-all">SAVE</button>
          </div>
        )}

        {mode === "archive" && (
          <div className="space-y-8 animate-in fade-in">
            {entries.length === 0 && <p className="opacity-40 italic">저장된 기록이 없습니다.</p>}
            {entries.map(e => (
               <div key={e.id} className="border-l-2 border-current/10 pl-4 py-2 hover:border-current transition-colors">
                  <p className="whitespace-pre-wrap leading-relaxed mb-2">{e.text}</p>
                  <p className="text-xs opacity-40">{e.work} · {e.character}</p>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
